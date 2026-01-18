import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs } from '@reduxjs/toolkit/query';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

import { API_BASE, env } from '@/config/env';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

type HeadersLike = Headers & { toJSON?: () => Record<string, string> };
const hasClientDocument = () => typeof document !== 'undefined';
const resolveApiUrl = (path: string): string => {
  if (API_BASE.startsWith('/')) {
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : env.NEXT_PUBLIC_SITE_URL;
    return `${origin}${API_BASE}${path}`;
  }

  return `${API_BASE}${path}`;
};

const ensureHeaders = (candidate: FetchArgs['headers']): HeadersLike => {
  if (candidate instanceof Headers) {
    return candidate as HeadersLike;
  }

  if (!candidate) {
    return new Headers() as HeadersLike;
  }

  if (Array.isArray(candidate)) {
    const entries = candidate.map((entry) => {
      const [rawKey, rawValue] = entry;
      return [String(rawKey ?? ''), String(rawValue ?? '')] as [string, string];
    });

    return new Headers(entries) as HeadersLike;
  }

  const record = candidate as Record<string, string | undefined>;
  const normalized = Object.entries(record).map(([key, value]) => [key, value ?? '']);
  return new Headers(normalized as Array<[string, string]>) as HeadersLike;
};

const attachServerContext = async (headers: HeadersLike, method: string) => {
  if (typeof window !== 'undefined') {
    return;
  }

  try {
    const { cookies: serverCookies, headers: serverHeaders } = await import('next/headers');
    const requestHeaders = await serverHeaders();
    const cookieHeader = requestHeaders.get('cookie');

    if (cookieHeader && !headers.has('Cookie')) {
      headers.set('Cookie', cookieHeader);
    }

    if (SAFE_METHODS.has(method)) {
      return;
    }

    const csrfFromHeader = requestHeaders.get('x-csrf-token');
    const csrfFromCookie = (await serverCookies()).get(env.CSRF_COOKIE_NAME)?.value;
    const csrfToken = csrfFromHeader ?? csrfFromCookie;

    if (csrfToken && !headers.has('X-CSRF-Token')) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[api] Failed to attach server context to request headers', error);
    }
  }
};

function getClientCookie(name: string): string | null {
  if (!hasClientDocument()) {
    return null;
  }

  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');
    if (key === name) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

export interface ApiError {
  status: number | 'FETCH_ERROR' | 'PARSING_ERROR' | 'CUSTOM_ERROR';
  message: string;
  data?: unknown;
  originalStatus?: number;
}

export const normalizeApiError = (error: FetchBaseQueryError): ApiError => {
  if (typeof error.status === 'number') {
    const data = error.data;
    const message =
      (typeof data === 'object' && data !== null && 'error' in data && typeof (data as any).error === 'string'
        ? (data as any).error
        : typeof data === 'object' && data !== null && 'message' in data && typeof (data as any).message === 'string'
          ? (data as any).message
          : undefined) ?? `Request failed with status ${error.status}`;

    return {
      status: error.status,
      originalStatus: error.status,
      data,
      message,
    };
  }

  if (error.status === 'FETCH_ERROR') {
    return {
      status: 'FETCH_ERROR',
      message: typeof error.error === 'string' ? error.error : 'Network request failed',
    };
  }

  if (error.status === 'PARSING_ERROR') {
    return {
      status: 'PARSING_ERROR',
      data: error.data,
      message: 'Failed to parse server response',
    };
  }

  return {
    status: 'CUSTOM_ERROR',
    message: 'Unexpected API error',
  };
};

export const isApiError = (value: unknown): value is ApiError =>
  typeof value === 'object' &&
  value !== null &&
  'message' in value &&
  'status' in value;

type ClearUserActionCreator = typeof import('@/store/user.slice')['clearUser'];
let cachedClearUser: ClearUserActionCreator | null = null;

const getClearUserAction = async (): Promise<ClearUserActionCreator> => {
  if (!cachedClearUser) {
    const module = await import('@/store/user.slice');
    cachedClearUser = module.clearUser;
  }

  if (!cachedClearUser) {
    throw new Error('Unable to resolve clearUser action creator');
  }

  return cachedClearUser;
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '',
  credentials: 'include',
  prepareHeaders: (headers) => {
    headers.set('Accept', 'application/json');
    return headers;
  },
});

const attachClientCsrf = (headers: HeadersLike, method: string) => {
  if (SAFE_METHODS.has(method)) {
    return;
  }

  const csrfToken = getClientCookie(env.CSRF_COOKIE_NAME);
  if (csrfToken) {
    headers.set('X-CSRF-Token', csrfToken);
  }
};

const hasActiveSession = (headers: HeadersLike): boolean => {
  if (hasClientDocument()) {
    return document.cookie.split('; ').some((entry) => entry.startsWith(`${env.AUTH_SESSION_COOKIE_NAME}=`));
  }

  const cookieHeader = headers.get('Cookie');
  return cookieHeader ? cookieHeader.includes(`${env.AUTH_SESSION_COOKIE_NAME}=active`) : false;
};

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, ApiError> = async (
  args,
  api,
  extraOptions
) => {
  const normalizedArgs: FetchArgs = typeof args === 'string' ? { url: args } : { ...args };
  const method = (normalizedArgs.method ?? 'GET').toUpperCase();
  const headers = ensureHeaders(normalizedArgs.headers);

  attachClientCsrf(headers, method);
  await attachServerContext(headers, method);

  normalizedArgs.headers = headers;

  let result = await rawBaseQuery(normalizedArgs, api, extraOptions);

  if (result.error && result.error.status === 401) {
    if (!hasActiveSession(headers)) {
      const clearUserAction = await getClearUserAction();
      api.dispatch(clearUserAction());
      return { error: normalizeApiError(result.error) };
    }

    const refreshResult = await rawBaseQuery(
      {
        url: '/api/auth/refresh',
        method: 'POST',
      },
      api,
      extraOptions
    );

    if (!refreshResult.error) {
      result = await rawBaseQuery(normalizedArgs, api, extraOptions);
    } else {
      const clearUserAction = await getClearUserAction();
      api.dispatch(clearUserAction());
      return { error: normalizeApiError(refreshResult.error) };
    }
  }

  if (result.error) {
    return { error: normalizeApiError(result.error) };
  }

  return result as { data: unknown };
};

export const apiService = createApi({
  reducerPath: 'apiService',
  baseQuery: retry(baseQueryWithReauth, { maxRetries: 3 }),
  tagTypes: ['Auth', 'Courses', 'Course'],
  endpoints: () => ({}),
});

export type ApiService = typeof apiService;

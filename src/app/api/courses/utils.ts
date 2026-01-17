import { env } from '@/config/env';

export interface ProxyResponse<T = unknown> {
  response: Response;
  data: T | null;
  rawBody: string | null;
}

const parseJsonSafely = (payload: string | null): unknown => {
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload) as unknown;
  } catch {
    return null;
  }
};

export const extractErrorMessage = (payload: unknown, fallback: string): string => {
  if (typeof payload === 'string' && payload.trim().length > 0) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const candidate = payload as Record<string, unknown>;
    const message = candidate.error ?? candidate.message ?? candidate.detail;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
};

const resolveApiBase = (origin?: string): string => {
  const base = env.NEXT_PUBLIC_API_BASE;

  if (base.startsWith('/')) {
    if (!origin) {
      throw new Error('NEXT_PUBLIC_API_BASE is relative; provide request origin to resolve it.');
    }
    return new URL(base, origin).toString();
  }

  return base;
};

export async function callCoursesApi<T = unknown>(
  path: string,
  init: RequestInit,
  accessToken?: string | null,
  origin?: string
): Promise<ProxyResponse<T>> {
  const headers = new Headers(init.headers ?? {});

  headers.set('Accept', 'application/json');

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const apiBase = resolveApiBase(origin);
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  const rawBody = await response.text();
  const data = parseJsonSafely(rawBody) as T | null;

  return {
    response,
    data,
    rawBody,
  };
}

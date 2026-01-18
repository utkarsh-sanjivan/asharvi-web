import { NextRequest, NextResponse } from 'next/server';

import { env } from '@/config/env';

interface RateLimitRecord {
  count: number;
  expiresAt: number;
}

const globalScope = globalThis as typeof globalThis & {
  __RATE_LIMIT_MAP?: Map<string, RateLimitRecord>;
};

const rateLimitStore = globalScope.__RATE_LIMIT_MAP || new Map<string, RateLimitRecord>();
if (!globalScope.__RATE_LIMIT_MAP) {
  globalScope.__RATE_LIMIT_MAP = rateLimitStore;
}

const PROTECTED_ROUTE_PATTERNS: RegExp[] = [
  /^\/course(?:\/.*)?$/,
  /^\/learn(?:\/.*)?$/,
  /^\/child(?:\/.*)?$/,
  /^\/dashboard(?:\/.*)?$/,
  /^\/account(?:\/.*)?$/,
  /^\/profile(?:\/.*)?$/,
];

const AUTH_ROUTE_PATTERNS: RegExp[] = [/^\/auth(?:\/.*)?$/];

const PUBLIC_FILE = /\.(.*)$/;

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-XSS-Protection': '1; mode=block',
};

const CONNECT_SRC = ["'self'", 'https://*'];

const addConnectSrcOrigin = (value: string) => {
  try {
    const url = new URL(value);
    CONNECT_SRC.push(url.origin);
  } catch (error) {
    // Ignore relative URLs or invalid values.
  }
};

if (env.NODE_ENV !== 'production') {
  CONNECT_SRC.push('http://localhost:8080', 'http://127.0.0.1:8080');
}

if (env.APP_ENV === 'staging') {
  addConnectSrcOrigin(env.NEXT_PUBLIC_API_BASE);
}

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://*",
  "media-src 'self' https://storage.googleapis.com https://download.blender.org https://assets.mixkit.co",
  `connect-src ${CONNECT_SRC.join(' ')}`,
  "frame-ancestors 'none'",
].join('; ');

function getClientKey(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'anonymous'
  );
}

function enforceRateLimit(request: NextRequest): NextResponse | null {
  const key = `${getClientKey(request)}:${request.nextUrl.pathname}`;
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || record.expiresAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      expiresAt: now + env.API_RATE_LIMIT_WINDOW_MS,
    });
    return null;
  }

  if (record.count >= env.API_RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((record.expiresAt - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': `${retryAfter}`,
        },
      }
    );
  }

  record.count += 1;
  rateLimitStore.set(key, record);
  return null;
}

function ensureCsrfCookie(request: NextRequest, response: NextResponse) {
  if (request.cookies.get(env.CSRF_COOKIE_NAME)) {
    return;
  }

  const token = crypto.randomUUID();
  response.cookies.set(env.CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    path: '/',
  });
  response.headers.set('x-csrf-token', token);
}

function validateCsrf(request: NextRequest): NextResponse | null {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  const method = request.method.toUpperCase();

  if (safeMethods.includes(method)) {
    return null;
  }

  const csrfCookie = request.cookies.get(env.CSRF_COOKIE_NAME);
  const csrfHeader = request.headers.get('x-csrf-token');

  if (!csrfCookie || !csrfHeader || csrfCookie.value !== csrfHeader) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  return null;
}

function isProtectedPath(pathname: string) {
  return PROTECTED_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

function isAuthPath(pathname: string) {
  return AUTH_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

function isPublicAsset(pathname: string) {
  return PUBLIC_FILE.test(pathname);
}

function encodePreloadedState(state: unknown) {
  return encodeURIComponent(JSON.stringify(state));
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  if (env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
}

function logRequest(request: NextRequest, response: NextResponse, context: { isAuthenticated: boolean }) {
  const method = request.method;
  const { pathname } = request.nextUrl;
  const status = response.status;
  const client = getClientKey(request);

  console.info(
    `[middleware] ${method} ${pathname} -> ${status} (auth=${context.isAuthenticated ? 'yes' : 'no'}, ip=${client})`
  );
}

function handleRouteProtection(request: NextRequest, isAuthenticated: boolean) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || isPublicAsset(pathname)) {
    return null;
  }

  if (!isAuthenticated && isProtectedPath(pathname)) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && isAuthPath(pathname)) {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return null;
}

interface NormalizedUserState {
  id: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isAuthenticated: boolean;
}

function parseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function normalizeUserFromCookie(rawValue: string | undefined): NormalizedUserState | null {
  if (!rawValue) {
    return null;
  }

  const directParse = parseJson(rawValue);
  const decoded = (() => {
    try {
      return decodeURIComponent(rawValue);
    } catch (error) {
      return rawValue;
    }
  })();
  const parsed = directParse ?? parseJson(decoded);

  if (!parsed) {
    console.warn('[middleware] Failed to parse session cookie payload');
    return null;
  }

  return {
    id: parsed?.id ?? null,
    name: parsed?.name ?? null,
    email: parsed?.email ?? null,
    role: parsed?.role ?? null,
    createdAt: parsed?.createdAt ?? null,
    updatedAt: parsed?.updatedAt ?? null,
    isAuthenticated: true,
  };
}

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const sessionCookie = request.cookies.get('session');
  const sessionUser = normalizeUserFromCookie(sessionCookie?.value);
  const hasActiveSession = request.cookies.get(env.AUTH_SESSION_COOKIE_NAME)?.value === 'active';
  const isAuthenticated = Boolean(hasActiveSession && sessionUser);

  const anonymousUser: NormalizedUserState = {
    id: null,
    name: null,
    email: null,
    role: null,
    createdAt: null,
    updatedAt: null,
    isAuthenticated: false,
  };

  const userState = sessionUser
    ? { ...sessionUser, isAuthenticated }
    : anonymousUser;

  const requestId = crypto.randomUUID();

  requestHeaders.set('x-authenticated', isAuthenticated ? 'true' : 'false');
  requestHeaders.set('x-redux-preload', encodePreloadedState({ user: userState }));
  requestHeaders.set('x-request-id', requestId);

  const guardResponse = handleRouteProtection(request, isAuthenticated);
  if (guardResponse) {
    guardResponse.headers.set('x-request-id', requestId);
    applySecurityHeaders(guardResponse);
    logRequest(request, guardResponse, { isAuthenticated });
    return guardResponse;
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('x-request-id', requestId);

  ensureCsrfCookie(request, response);

  if (request.nextUrl.pathname.startsWith('/api')) {
    const rateLimitViolation = enforceRateLimit(request);
    if (rateLimitViolation) {
      rateLimitViolation.headers.set('x-request-id', requestId);
      applySecurityHeaders(rateLimitViolation);
      logRequest(request, rateLimitViolation, { isAuthenticated });
      return rateLimitViolation;
    }

    const csrfFailure = validateCsrf(request);
    if (csrfFailure) {
      csrfFailure.headers.set('x-request-id', requestId);
      applySecurityHeaders(csrfFailure);
      logRequest(request, csrfFailure, { isAuthenticated });
      return csrfFailure;
    }
  }

  applySecurityHeaders(response);
  logRequest(request, response, { isAuthenticated });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

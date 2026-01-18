import { NextRequest, NextResponse } from 'next/server';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
]);

const RESPONSE_STRIP_HEADERS = new Set([
  ...HOP_BY_HOP_HEADERS,
  'content-length',
  'content-encoding',
]);

const DEFAULT_TIMEOUT_MS = 8000;

function getProxyTimeoutMs(): number {
  const raw = process.env.PROXY_TIMEOUT_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isNaN(parsed) ? DEFAULT_TIMEOUT_MS : parsed;
}

function buildUpstreamUrl(
  req: NextRequest,
  internalBase: string,
  pathSegments: string[] | undefined
): string {
  // Always prefix with /api/v1 on the backend
  const apiPrefix = '/api/v1';

  const suffix =
    pathSegments && pathSegments.length > 0
      ? `/${pathSegments.join('/')}`
      : '';

  const url = new URL(internalBase);
  url.pathname = `${apiPrefix}${suffix}`;
  url.search = req.nextUrl.search; // preserve query string

  return url.toString();
}

function buildUpstreamHeaders(req: NextRequest): Headers {
  const headers = new Headers();

  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (!RESPONSE_STRIP_HEADERS.has(lower)) {
      headers.set(key, value);
    }
  });

  return headers;
}

async function proxy(
  req: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  try {
    const internalBase = process.env.INTERNAL_API_BASE?.trim().replace(/\/+$/, '');
    if (!internalBase) {
      const errorMessage = 'INTERNAL_API_BASE is not set for the API proxy route.';
      console.error(errorMessage);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    const { path } = await context.params;
    const upstreamUrl = buildUpstreamUrl(req, internalBase, path);
    const headers = buildUpstreamHeaders(req);
    const method = req.method;

    const controller = new AbortController();
    const timeoutMs = getProxyTimeoutMs();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const init: RequestInit = {
      method,
      headers,
      redirect: 'manual',
      signal: controller.signal,
    };

    // Only pass a body for non-GET / non-HEAD
    if (method !== 'GET' && method !== 'HEAD') {
      // NextRequest.body is a ReadableStream; clone via req.text or req.arrayBuffer
      const body = await req.text();
      init.body = body;
    }

    const upstreamRes = await fetch(upstreamUrl, init);
    clearTimeout(timeoutId);

    // Copy response headers, stripping hop-by-hop and encoding/length
    const respHeaders = new Headers();
    upstreamRes.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (!RESPONSE_STRIP_HEADERS.has(lower)) {
        respHeaders.set(key, value);
      }
    });

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: respHeaders,
    });
  } catch (err: any) {
    console.error('API proxy error:', err);

    const message = err?.message ?? 'Upstream request failed in API proxy.';

    return NextResponse.json(
      { ok: false, error: message },
      { status: 502 },
    );
  }
}

// Wire all HTTP methods to the same proxy handler
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return proxy(req, ctx);
}
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return proxy(req, ctx);
}
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return proxy(req, ctx);
}
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return proxy(req, ctx);
}
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return proxy(req, ctx);
}
export async function HEAD(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return proxy(req, ctx);
}
export async function OPTIONS(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return proxy(req, ctx);
}

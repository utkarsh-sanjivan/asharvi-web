import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

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

const REQUEST_STRIP_HEADERS = new Set<string>([
  ...HOP_BY_HOP_HEADERS,
  'accept-encoding',
  'content-length',
]);

const getProxyTimeoutMs = (): number => {
  const timeoutMs = Number.parseInt(process.env.PROXY_TIMEOUT_MS ?? '', 10);
  return Number.isNaN(timeoutMs) ? 8000 : timeoutMs;
};

const assertStagingOnly = (): void => {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV;
  if (appEnv !== 'staging') {
    throw new Error(
      `API proxy route is intended for staging only (got APP_ENV=${appEnv ?? 'undefined'}).`,
    );
  }
};

const getInternalApiBase = (): string => {
  const internalApiBase = process.env.INTERNAL_API_BASE;
  if (!internalApiBase) {
    throw new Error('INTERNAL_API_BASE is not set for the API proxy route.');
  }
  return internalApiBase;
};

// Make sure this is always dynamic and not cached by Next
export const dynamic = 'force-dynamic';

type RouteParams = {
  params: Promise<{
    path?: string[];
  }>;
};

async function proxy(request: NextRequest, { params }: RouteParams) {
  try {
    // 1) Safety: staging only
    assertStagingOnly();

    // 2) Build upstream URL
    const internalBase = getInternalApiBase(); // e.g. http://43.204.229.198:3000
    const resolvedParams = await params;
    const segments = resolvedParams.path ?? [];
    const path = segments.join('/');
    const upstreamUrl = new URL(path ? `/${path}` : '/', internalBase);

    // Preserve query string
    upstreamUrl.search = request.nextUrl.search || '';

    // 3) Prepare headers (strip hop-by-hop + length/encoding)
    const reqHeaders = new Headers(request.headers);
    for (const h of REQUEST_STRIP_HEADERS) {
      reqHeaders.delete(h);
    }

    // 4) Prepare body (only for non-GET/HEAD)
    let body: BodyInit | null | undefined;
    if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
      // For JSON / form posts this is fine
      const buf = await request.arrayBuffer();
      body = buf.byteLength > 0 ? buf : undefined;
    }

    // 5) Timeout handling
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      getProxyTimeoutMs(),
    );

    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      method: request.method,
      headers: reqHeaders,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // 6) Copy upstream headers back, minus hop-by-hop
    const resHeaders = new Headers(upstreamResponse.headers);
    for (const h of HOP_BY_HOP_HEADERS) {
      resHeaders.delete(h);
    }

    // Stream body + status back to client
    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: resHeaders,
    });
  } catch (err: unknown) {
    console.error('Staging API proxy error:', err);

    const isAbort =
      err instanceof Error && (err.name === 'AbortError' || err.message?.includes('aborted'));

    const status = isAbort ? 504 : 502;

    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Unknown error in staging API proxy',
      },
      { status },
    );
  }
}

// Wire this handler to all HTTP methods you care about
export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
  proxy as OPTIONS,
};

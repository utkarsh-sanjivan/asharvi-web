import { NextRequest } from 'next/server';

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

const REQUEST_STRIP_HEADERS = new Set([
  ...HOP_BY_HOP_HEADERS,
  'accept-encoding',
  'content-length',
]);

const getProxyTimeoutMs = (): number => {
  const timeoutMs = Number.parseInt(process.env.PROXY_TIMEOUT_MS ?? '', 10);
  return Number.isNaN(timeoutMs) ? 8000 : timeoutMs;
};

const assertStagingOnly = (): void => {
  if (process.env.NEXT_PUBLIC_APP_ENV !== 'staging') {
    throw new Error('API proxy route is intended for staging only.');
  }
};

const getInternalApiBase = (): string => {
  const internalApiBase = process.env.INTERNAL_API_BASE;
  if (!internalApiBase) {
    throw new Error('INTERNAL_API_BASE is not set for the API proxy route.');
  }
  return internalApiBase;
};

const buildUpstreamUrl = (request: NextRequest, pathSegments: string[]): URL => {
  assertStagingOnly();
  const base = getInternalApiBase();
  const upstreamUrl = new URL(`/api/v1/${pathSegments.join('/')}`, base);
  upstreamUrl.search = request.nextUrl.search;
  return upstreamUrl;
};

const getForwardHeaders = (request: NextRequest): Headers => {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!REQUEST_STRIP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
};

const getResponseHeaders = (upstreamHeaders: Headers): Headers => {
  const headers = new Headers(upstreamHeaders);
  HOP_BY_HOP_HEADERS.forEach((header) => headers.delete(header));
  return headers;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Unknown error';
};

const handler = async (
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> => {
  const { path = [] } = await context.params;
  const upstreamUrl = buildUpstreamUrl(request, path);
  const headers = getForwardHeaders(request);
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error('Upstream request timed out'));
  }, getProxyTimeoutMs());

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      signal: controller.signal,
    });

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: getResponseHeaders(upstreamResponse.headers),
    });
  } catch (error) {
    const message = getErrorMessage(error);
    return new Response(
      JSON.stringify({ error: 'Upstream request failed', message }),
      {
        status: 502,
        headers: { 'content-type': 'application/json' },
      },
    );
  } finally {
    clearTimeout(timeoutId);
  }
};

export { handler as DELETE, handler as GET, handler as HEAD, handler as OPTIONS, handler as PATCH, handler as POST, handler as PUT };

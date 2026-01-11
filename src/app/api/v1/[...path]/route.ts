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

const getInternalApiBase = (): string => {
  const internalApiBase = process.env.INTERNAL_API_BASE;
  if (!internalApiBase) {
    throw new Error('INTERNAL_API_BASE is not set for the API proxy route.');
  }
  return internalApiBase;
};

const buildUpstreamUrl = (request: NextRequest, pathSegments: string[]): URL => {
  const base = getInternalApiBase();
  const upstreamUrl = new URL(`/api/v1/${pathSegments.join('/')}`, base);
  upstreamUrl.search = request.nextUrl.search;
  return upstreamUrl;
};

const getForwardHeaders = (request: NextRequest): Headers => {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
};

const handler = async (
  request: NextRequest,
  { params }: { params: { path: string[] } },
): Promise<Response> => {
  const upstreamUrl = buildUpstreamUrl(request, params.path ?? []);
  const headers = getForwardHeaders(request);
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
  });

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: upstreamResponse.headers,
  });
};

export { handler as DELETE, handler as GET, handler as HEAD, handler as OPTIONS, handler as PATCH, handler as POST, handler as PUT };

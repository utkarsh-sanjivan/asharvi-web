import { NextRequest, NextResponse } from 'next/server';

import { getAccessTokenFromCookies } from '@/lib/auth-cookies';

import { callCoursesApi, extractErrorMessage } from '@/app/api/courses/utils';

interface RouteParams {
  parentId: string;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  const { parentId } = await context.params;

  if (!parentId) {
    return NextResponse.json({ error: 'Parent identifier is required' }, { status: 400 });
  }

  try {
    const accessToken = await getAccessTokenFromCookies();

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const rawBody = await request.text();
    const contentType = request.headers.get('content-type') ?? undefined;
    const headers: HeadersInit | undefined = contentType ? { 'Content-Type': contentType } : undefined;

    const { response, data, rawBody: upstreamBody } = await callCoursesApi(
      `/parents/${parentId}/wishlist`,
      {
        method: 'POST',
        body: rawBody && rawBody.length > 0 ? rawBody : undefined,
        headers,
      },
      accessToken
    );

    if (!response.ok) {
      const message = extractErrorMessage(data ?? upstreamBody, 'Failed to update wishlist');
      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json(data ?? {}, { status: response.status });
  } catch (error) {
    console.error(`[api/parents/${parentId}/wishlist] Failed to add course to wishlist`, error);
    return NextResponse.json({ error: 'Failed to update wishlist' }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  const { parentId } = await context.params;

  if (!parentId) {
    return NextResponse.json({ error: 'Parent identifier is required' }, { status: 400 });
  }

  try {
    const accessToken = await getAccessTokenFromCookies();

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { response, data, rawBody } = await callCoursesApi(
      `/parents/${parentId}/wishlist`,
      { method: 'GET' },
      accessToken
    );

    if (!response.ok) {
      const message = extractErrorMessage(data ?? rawBody, 'Failed to fetch wishlist');
      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json(data ?? {}, { status: response.status });
  } catch (error) {
    console.error(`[api/parents/${parentId}/wishlist] Failed to fetch wishlist`, error);
    return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 });
  }
}

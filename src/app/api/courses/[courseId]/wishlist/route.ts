import { NextRequest, NextResponse } from 'next/server';

import { getAccessTokenFromCookies } from '@/lib/auth-cookies';

import { callCoursesApi, extractErrorMessage } from '@/app/api/courses/utils';

interface RouteParams {
  courseId: string;
}

async function forwardWishlistRequest(
  request: NextRequest,
  courseId: string,
  method: 'POST' | 'DELETE'
) {
  const accessToken = await getAccessTokenFromCookies();

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const search = request.nextUrl.search ?? '';
  const body = method === 'POST' ? await request.text() : undefined;
  const contentType = request.headers.get('content-type') ?? undefined;

  const headers: HeadersInit | undefined = contentType ? { 'Content-Type': contentType } : undefined;

  const { response, data, rawBody } = await callCoursesApi(
    `/courses/${courseId}/wishlist${search}`,
    {
      method,
      body: body && body.length > 0 ? body : undefined,
      headers,
    },
    accessToken,
    request.nextUrl.origin
  );

  if (!response.ok) {
    const message = extractErrorMessage(data ?? rawBody, 'Failed to update wishlist');
    return NextResponse.json({ error: message }, { status: response.status });
  }

  return NextResponse.json(data ?? {}, { status: response.status });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  const { courseId } = await context.params;

  if (!courseId) {
    return NextResponse.json({ error: 'Course identifier is required' }, { status: 400 });
  }

  try {
    return await forwardWishlistRequest(request, courseId, 'POST');
  } catch (error) {
    console.error(`[api/courses/${courseId}/wishlist] Failed to add course to wishlist`, error);
    return NextResponse.json({ error: 'Failed to update wishlist' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  const { courseId } = await context.params;

  if (!courseId) {
    return NextResponse.json({ error: 'Course identifier is required' }, { status: 400 });
  }

  try {
    return await forwardWishlistRequest(request, courseId, 'DELETE');
  } catch (error) {
    console.error(`[api/courses/${courseId || 'unknown'}/wishlist] Failed to remove course from wishlist`, error);
    return NextResponse.json({ error: 'Failed to update wishlist' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

import { getAccessTokenFromCookies } from '@/lib/auth-cookies';

import { callCoursesApi, extractErrorMessage } from '@/app/api/courses/utils';

interface RouteParams {
  parentId: string;
  courseId: string;
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  const { parentId, courseId } = await context.params;

  if (!parentId || !courseId) {
    return NextResponse.json({ error: 'Parent and course identifiers are required' }, { status: 400 });
  }

  try {
    const accessToken = await getAccessTokenFromCookies();

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { response, data, rawBody } = await callCoursesApi(
      `/parents/${parentId}/wishlist/${courseId}`,
      { method: 'DELETE' },
      accessToken,
      _request.nextUrl.origin
    );

    if (!response.ok) {
      const message = extractErrorMessage(data ?? rawBody, 'Failed to update wishlist');
      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json(data ?? {}, { status: response.status });
  } catch (error) {
    console.error(
      `[api/parents/${parentId || 'unknown'}/wishlist/${courseId || 'unknown'}] Failed to remove course from wishlist`,
      error
    );
    return NextResponse.json({ error: 'Failed to update wishlist' }, { status: 500 });
  }
}

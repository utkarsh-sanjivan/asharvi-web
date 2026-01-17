import { NextRequest, NextResponse } from 'next/server';

import { getAccessTokenFromCookies } from '@/lib/auth-cookies';

import { callCoursesApi, extractErrorMessage } from './utils';

export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessTokenFromCookies();
    const search = request.nextUrl.search ?? '';
    const { response, data, rawBody } = await callCoursesApi(
      `/courses${search}`,
      { method: 'GET' },
      accessToken,
      request.nextUrl.origin
    );

    if (!response.ok) {
      const message = extractErrorMessage(data ?? rawBody, 'Failed to fetch courses');
      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json(data ?? {}, { status: response.status });
  } catch (error) {
    console.error('[api/courses] Failed to fetch course listing', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

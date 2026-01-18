import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { resolveApiUrl } from '@/lib/api-base';
import { clearAuthCookies, getRefreshTokenFromCookies, setAuthCookies } from '@/lib/auth-cookies';

function normalizeAuthResponse(response: any) {
  const accessToken =
    response?.data?.accessToken ||
    response?.accessToken ||
    response?.token ||
    response?.data?.token;

  const refreshToken =
    response?.data?.refreshToken ||
    response?.refreshToken;

  const userPayload = response?.data?.user ?? response?.user;
  const user = userPayload && typeof userPayload === 'object' ? userPayload : undefined;

  return { accessToken, refreshToken, user };
}

export async function POST() {
  try {
    const refreshTokenFromCookie = await getRefreshTokenFromCookies();

    if (!refreshTokenFromCookie) {
      await clearAuthCookies();
      return NextResponse.json({ error: 'Refresh token missing' }, { status: 401 });
    }

    const upstreamResponse = await fetch(resolveApiUrl('/auth/refresh'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify({ refreshToken: refreshTokenFromCookie }),
    });

    const result = await upstreamResponse.json().catch(() => null);

    if (!upstreamResponse.ok) {
      await clearAuthCookies();
      const message = result?.message || result?.error || 'Failed to refresh session';
      return NextResponse.json({ error: message }, { status: upstreamResponse.status });
    }

    const { accessToken, refreshToken, user } = normalizeAuthResponse(result);
    const cookieStore = await cookies();
    const previousSession = cookieStore.get('session');
    const previousUser = (() => {
      if (!previousSession?.value) {
        return undefined;
      }

      try {
        return JSON.parse(previousSession.value) as unknown;
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[api/auth/refresh] Failed to parse existing session cookie', error);
        }
        return undefined;
      }
    })();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Refresh response did not include an access token' },
        { status: 502 }
      );
    }

    await setAuthCookies({
      accessToken,
      refreshToken,
      user,
    });

    return NextResponse.json({
      success: true,
      user: user ?? previousUser ?? null,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    await clearAuthCookies();
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to refresh session' },
      { status: 500 }
    );
  }
}

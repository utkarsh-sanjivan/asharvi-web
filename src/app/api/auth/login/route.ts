import { NextRequest, NextResponse } from 'next/server';
import { resolveApiUrl } from '@/lib/api-base';
import { setAuthCookies } from '@/lib/auth-cookies';

interface LoginRequestBody {
  email: string;
  password: string;
  rememberMe?: boolean;
}

function normalizeAuthResponse(response: any) {
  const parent = response?.data?.parent || response?.parent;
  const accessToken =
    response?.data?.accessToken ||
    response?.accessToken ||
    response?.token ||
    response?.data?.token;

  const refreshToken =
    response?.data?.refreshToken ||
    response?.refreshToken;

  const user =
    response?.data?.user ||
    response?.user ||
    (parent
      ? {
          id: parent.id ?? '',
          name: parent.name ?? '',
          email: parent.email ?? '',
          role: parent.role ?? 'parent',
          createdAt: parent.createdAt,
          updatedAt: parent.updatedAt,
        }
      : {
          id: '',
          name: '',
          email: '',
          role: 'user',
        });

  return { accessToken, refreshToken, user };
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequestBody = await request.json();

    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const upstreamResponse = await fetch(resolveApiUrl('/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: body.email, password: body.password }),
      cache: 'no-store',
    });

    const result = await upstreamResponse.json().catch(() => null);

    if (!upstreamResponse.ok) {
      const message = result?.message || result?.error || 'Failed to login';
      return NextResponse.json({ error: message }, { status: upstreamResponse.status });
    }

    const { accessToken, refreshToken, user } = normalizeAuthResponse(result);

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Login response did not include an access token' },
        { status: 502 }
      );
    }

    await setAuthCookies({
      accessToken,
      refreshToken,
      user,
      remember: body.rememberMe,
    });

    return NextResponse.json({
      success: true,
      user,
      message: result?.message || 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to login' },
      { status: 500 }
    );
  }
}

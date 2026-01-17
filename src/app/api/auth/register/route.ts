import { NextRequest, NextResponse } from 'next/server';

import { API_BASE } from '@/config/env';
import { setAuthCookies } from '@/lib/auth-cookies';

interface RegisterRequestBody {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  occupation?: string;
  city?: string;
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
    const body: RegisterRequestBody = await request.json();

    const upstreamResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify(body),
    });

    const result = await upstreamResponse.json().catch(() => null);

    if (!upstreamResponse.ok) {
      const message = result?.message || result?.error || 'Failed to register';
      return NextResponse.json({ error: message }, { status: upstreamResponse.status });
    }

    const { accessToken, refreshToken, user } = normalizeAuthResponse(result);

    if (accessToken) {
      await setAuthCookies({
        accessToken,
        refreshToken,
        user,
      });
    }

    return NextResponse.json({
      success: true,
      message: result?.message ?? 'Registration successful',
      user,
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to register' },
      { status: 500 }
    );
  }
}

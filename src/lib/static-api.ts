import { NextResponse } from 'next/server';

export const isStaticExportBuild = process.env.NEXT_STATIC_EXPORT === 'true';

export const apiRouteDynamicMode: 'force-static' | 'force-dynamic' = isStaticExportBuild
  ? 'force-static'
  : 'force-dynamic';

export const respondApiUnavailable = () =>
  NextResponse.json(
    { error: 'API routes are unavailable in static export builds.' },
    { status: 404 }
  );

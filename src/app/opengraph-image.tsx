import { ImageResponse } from 'next/og';

import { getMiddlewarePreloadedState, initializeServerStore } from '@/lib/redux-ssr';
import { selectMetadataSnapshot } from '@/store/selectors/metadata.selectors';

export const runtime = 'nodejs';

const WIDTH = 1200;
const HEIGHT = 630;

type Variant = 'guest' | 'member';

const gradientForVariant = (variant: Variant) =>
  variant === 'member'
    ? 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 50%, #38bdf8 100%)'
    : 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 60%, #93c5fd 100%)';

const overlayColor = (variant: Variant) =>
  variant === 'member' ? 'rgba(148, 163, 184, 0.85)' : 'rgba(226, 232, 240, 0.9)';

const normalizeParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function Image({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const middlewareState = await getMiddlewarePreloadedState();
  const store = initializeServerStore(middlewareState);
  const snapshot = selectMetadataSnapshot(store.getState());

  const requestedVariant = normalizeParam(searchParams.variant);
  const variant: Variant =
    requestedVariant === 'member' ? 'member' : requestedVariant === 'guest' ? 'guest' : snapshot.variant;
  const headline = normalizeParam(searchParams.headline) ?? snapshot.headline;
  const subheading = normalizeParam(searchParams.subheading) ?? snapshot.cta;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          backgroundImage: gradientForVariant(variant),
          color: '#f8fafc',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.2 }}>{headline}</div>
        <div
          style={{
            fontSize: 28,
            lineHeight: 1.4,
            maxWidth: '80%',
            color: overlayColor(variant),
            fontWeight: 500,
          }}
        >
          {subheading}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 24,
            fontWeight: 600,
            color: 'rgba(248, 250, 252, 0.9)',
          }}
        >
          <span>Ashravi Parenting Platform</span>
          <span>ashravi.com</span>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
    }
  );
}

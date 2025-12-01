import type { Metadata } from 'next';
import Providers from './providers';
import { env } from '@/config/env';
import {
  consumeServerPreloadedState,
  getMiddlewarePreloadedState,
  initializeServerStore,
  mergeHydrationStates,
  serializeHydratableState,
} from '@/lib/redux-ssr';
import { selectMetadataSnapshot } from '@/store/selectors/metadata.selectors';
import '@/styles/globals.css';

const SITE_NAME = 'Ashravi';
const DEFAULT_TITLE = 'Ashravi - Empowering Parents to Build Positive Child Behaviors';

export async function generateMetadata(): Promise<Metadata> {
  const middlewareState = await getMiddlewarePreloadedState();
  const store = initializeServerStore(middlewareState);
  const snapshot = selectMetadataSnapshot(store.getState());
  let metadataBase: URL | undefined;
  try {
    metadataBase = new URL(env.NEXT_PUBLIC_SITE_URL);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[metadata] Invalid NEXT_PUBLIC_SITE_URL provided. Falling back to default metadata base.', error);
    }
  }
  const title = snapshot.variant === 'member' ? `${snapshot.headline} | ${SITE_NAME}` : DEFAULT_TITLE;
  const imageParams = new URLSearchParams({
    headline: snapshot.headline,
    subheading: snapshot.cta,
    variant: snapshot.variant,
  });
  const imagePath = `/opengraph-image?${imageParams.toString()}`;

  const metadata: Metadata = {
    title,
    description: snapshot.description,
    keywords: snapshot.keywords,
    openGraph: {
      title,
      description: snapshot.description,
      url: metadataBase?.toString() ?? env.NEXT_PUBLIC_SITE_URL,
      siteName: SITE_NAME,
      images: [
        {
          url: imagePath,
          width: 1200,
          height: 630,
          alt: snapshot.headline,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: snapshot.description,
      images: [imagePath],
    },
  };

  if (metadataBase) {
    metadata.metadataBase = metadataBase;
  }

  return metadata;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerState = await getMiddlewarePreloadedState();
  const resolvedChildren = await Promise.resolve(children);
  const stagedState = await consumeServerPreloadedState();
  const merged = mergeHydrationStates(headerState, stagedState);
  const preloadedState = serializeHydratableState(merged);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Ashravi',
              description: 'Evidence-based parenting platform for child behavior',
              url: 'https://ashravi.com',
              logo: 'https://ashravi.com/logo.png',
              sameAs: [
                'https://facebook.com/ashravi',
                'https://twitter.com/ashravi',
                'https://linkedin.com/company/ashravi',
              ],
            }),
          }}
        />
      </head>
      <body>
        <Providers preloadedState={preloadedState}>{resolvedChildren}</Providers>
      </body>
    </html>
  );
}

import { headers } from 'next/headers';
import type { Metadata } from 'next';

import { isAuthenticated } from '@/lib/auth';
import RootPageWrapper from '@/components/pages/RootPageWrapper';

export const metadata: Metadata = {
  title: 'Asharvi - Empowering Parents',
  description: 'Discover evidence-based parenting strategies designed by child behavior experts',
};

export default async function RootPage() {
  const headerList = await headers();
  const preverified = headerList.get('x-authenticated') === 'true';
  const authenticated = preverified ? true : await isAuthenticated();

  console.log('🔐 Server-side authentication check:', authenticated);

  return <RootPageWrapper serverAuthenticated={authenticated} />;
}

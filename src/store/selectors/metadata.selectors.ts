import { createSelector } from '@reduxjs/toolkit';

import type { RootState } from '@/store';

const BASE_KEYWORDS = [
  'parenting courses',
  'child behavior',
  'positive parenting',
  'parent training',
  'family coaching',
];

const selectUserState = (state: RootState) => state.user;

export interface MetadataSnapshot {
  headline: string;
  description: string;
  keywords: string[];
  cta: string;
  variant: 'guest' | 'member';
}

export const selectMetadataSnapshot = createSelector(selectUserState, (user): MetadataSnapshot => {
  const isAuthenticated = Boolean(user?.isAuthenticated);
  const firstName = user?.name?.split(' ')[0];
  const variant: MetadataSnapshot['variant'] = isAuthenticated ? 'member' : 'guest';

  const headline = isAuthenticated
    ? `Welcome back, ${firstName ?? 'Parent'}!`
    : 'Empowering Parents with Evidence-based Guidance';

  const description = isAuthenticated
    ? `Continue your personalised Asharvi journey${user?.name ? `, ${user.name}` : ''} with curated parenting insights and courses.`
    : 'Discover evidence-based parenting strategies and courses crafted by behavior experts to build positive child behaviours.';

  const cta = isAuthenticated
    ? 'Resume your recommended course plan today.'
    : 'Join thousands of parents strengthening family bonds.';

  const keywords = Array.from(
    new Set(
      [
        ...BASE_KEYWORDS,
        isAuthenticated ? 'personalized parent dashboard' : 'online parenting programs',
        user?.role ? `${user.role} parenting resources` : undefined,
      ].filter(Boolean) as string[]
    )
  );

  return { headline, description, keywords, cta, variant };
});

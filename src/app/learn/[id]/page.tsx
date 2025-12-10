import type { Metadata } from 'next';
import type { AnyAction } from '@reduxjs/toolkit';

import LearningPage from '@/components/pages/LearningPage';
import {
  awaitServerQueries,
  getMiddlewarePreloadedState,
  initializeServerStore,
  stageServerPreloadedState,
} from '@/lib/redux-ssr';
import { coursesApi } from '@/store/api/courses.api';

interface LearningParams {
  id: string;
}

const SITE_NAME = 'Asharvi Web';

export async function generateMetadata({
  params,
}: {
  params: Promise<LearningParams>;
}): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Learning Session | ${SITE_NAME}`,
    description: 'Continue your learning journey with lessons, resources, and progress tracking.',
    openGraph: {
      title: `Learning Session | ${SITE_NAME}`,
      description: 'Immerse yourself in interactive lessons with resources, notes, and Q&A.',
      type: 'article',
      url: `/learn/${id}`,
    },
  };
}

export default async function LearningRoute({
  params,
}: {
  params: Promise<LearningParams>;
}) {
  const { id } = await params;
  const middlewareState = await getMiddlewarePreloadedState();
  const store = initializeServerStore(middlewareState);

  store.dispatch(
    coursesApi.endpoints.detail.initiate(id) as unknown as AnyAction
  );

  await awaitServerQueries(store);
  await stageServerPreloadedState(store);

  return <LearningPage courseId={id} />;
}

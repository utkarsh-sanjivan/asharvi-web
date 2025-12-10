import type { Metadata } from 'next';
import type { AnyAction } from '@reduxjs/toolkit';

import CourseDetailPage from '@/components/pages/CourseDetailPage';
import {
  awaitServerQueries,
  getMiddlewarePreloadedState,
  initializeServerStore,
  stageServerPreloadedState,
} from '@/lib/redux-ssr';
import { coursesApi } from '@/store/api/courses.api';

interface CourseDetailParams {
  id: string;
}

const SITE_NAME = 'Asharvi Web';

export async function generateMetadata({
  params,
}: {
  params: Promise<CourseDetailParams>;
}): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Course Details | ${SITE_NAME}`,
    description: 'Explore in-depth insights, curriculum, and instructor information for this course.',
    openGraph: {
      title: `Course Details | ${SITE_NAME}`,
      description: 'Explore in-depth insights, curriculum, and instructor information for this course.',
      type: 'article',
      url: `/course/${id}`,
    },
  };
}

export default async function CourseDetailRoute({
  params,
}: {
  params: Promise<CourseDetailParams>;
}) {
  const { id } = await params;
  const middlewareState = await getMiddlewarePreloadedState();
  const store = initializeServerStore(middlewareState);

  store.dispatch(
    coursesApi.endpoints.detail.initiate(id) as unknown as AnyAction
  );

  await awaitServerQueries(store);
  await stageServerPreloadedState(store);

  return <CourseDetailPage courseId={id} />;
}

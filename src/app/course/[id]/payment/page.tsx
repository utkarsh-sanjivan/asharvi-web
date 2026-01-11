import type { Metadata } from 'next';
import type { AnyAction } from '@reduxjs/toolkit';

import CoursePaymentPage from '@/components/pages/CoursePaymentPage/CoursePaymentPage';
import {
  awaitServerQueries,
  getMiddlewarePreloadedState,
  initializeServerStore,
  stageServerPreloadedState,
} from '@/lib/redux-ssr';
import { coursesApi } from '@/store/api/courses.api';

interface CoursePaymentParams {
  id: string;
}

const SITE_NAME = 'Asharvi Web';

export async function generateMetadata({
  params,
}: {
  params: Promise<CoursePaymentParams>;
}): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Course Payment | ${SITE_NAME}`,
    description: 'Complete your course purchase with a secure payment flow.',
    openGraph: {
      title: `Course Payment | ${SITE_NAME}`,
      description: 'Review course details and continue to payment.',
      type: 'article',
      url: `/course/${id}/payment`,
    },
  };
}

export default async function CoursePaymentRoute({
  params,
}: {
  params: Promise<CoursePaymentParams>;
}) {
  const { id } = await params;
  const middlewareState = await getMiddlewarePreloadedState();
  const store = initializeServerStore(middlewareState);

  store.dispatch(
    coursesApi.endpoints.detail.initiate(id) as unknown as AnyAction
  );

  await awaitServerQueries(store);
  await stageServerPreloadedState(store);

  return <CoursePaymentPage courseId={id} />;
}

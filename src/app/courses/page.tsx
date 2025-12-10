import type { Metadata } from 'next';
import type { AnyAction } from '@reduxjs/toolkit';

import CourseListingPage from '@/components/pages/CourseListingPage';
import {
  awaitServerQueries,
  getMiddlewarePreloadedState,
  initializeServerStore,
  stageServerPreloadedState,
} from '@/lib/redux-ssr';
import { coursesApi } from '@/store/api/courses.api';
import { setCurrentPage, setFilters as setCourseFilters } from '@/store/courses.slice';
import type { FilterState } from '@/types';
import type { CourseListRequest } from '@/types/api/courses';

export const metadata: Metadata = {
  title: 'Browse Courses | Asharvi Web',
  description: 'Discover the perfect parenting education course. Filter by price, duration, level, and rating to find courses that match your needs.',
  openGraph: {
    title: 'Browse Courses | Asharvi Web',
    description: 'Explore our comprehensive catalog of parenting education courses',
    type: 'website',
  },
};

const DEFAULT_FILTERS: FilterState = {
  priceRange: [0, 200],
  isFree: false,
  duration: [],
  level: [],
  rating: null,
};

const ITEMS_PER_PAGE = 20;

const cloneDefaultFilters = (): FilterState => ({
  priceRange: [...DEFAULT_FILTERS.priceRange] as [number, number],
  isFree: DEFAULT_FILTERS.isFree,
  duration: [...DEFAULT_FILTERS.duration],
  level: [...DEFAULT_FILTERS.level],
  rating: DEFAULT_FILTERS.rating,
});

const parseSearchParams = (
  searchParams?: Record<string, string | string[] | undefined>
): {
  filters: FilterState;
  queryArgs: CourseListRequest;
  searchText: string;
  page: number;
} => {
  const rawSearch = searchParams?.q;
  const normalizedSearch = Array.isArray(rawSearch) ? rawSearch[0] : rawSearch;
  const searchText = normalizedSearch?.trim() ?? '';

  const rawPage = searchParams?.page;
  const normalizedPage = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  const page = Number.parseInt(normalizedPage ?? '1', 10);
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;

  const queryArgs: CourseListRequest = {
    page: safePage,
    limit: ITEMS_PER_PAGE,
    search: searchText ? searchText : undefined,
  };

  return {
    filters: cloneDefaultFilters(),
    queryArgs,
    searchText,
    page: safePage,
  };
};

interface CoursesPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const baseState = await getMiddlewarePreloadedState();
  const store = initializeServerStore(baseState);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { filters, queryArgs, searchText, page } = parseSearchParams(resolvedSearchParams);

  store.dispatch(
    setCourseFilters({
      search: searchText ? searchText : undefined,
      level: filters.level,
    })
  );
  store.dispatch(setCurrentPage(page));
  store.dispatch(
    coursesApi.endpoints.list.initiate(queryArgs) as unknown as AnyAction
  );

  await awaitServerQueries(store);
  await stageServerPreloadedState(store);

  return <CourseListingPage initialFilters={filters} initialSearch={searchText} />;
}

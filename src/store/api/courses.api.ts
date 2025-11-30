import { env } from '@/config/env';
import { transformCourse, transformCourses, transformFiltersToQuery } from '@/lib/courseAdapter';
import { apiService } from '@/services/api.service';
import { addToWishlist, removeFromWishlist, markWishlistPending, clearWishlistPending } from '@/store/wishlist.slice';
import { selectWishlistCourseIds } from '@/store/selectors/wishlist.selectors';
import type { RootState } from '@/store';
import type {
  CourseDetailResponse,
  CourseListRequest,
  CourseListResponse,
} from '@/types/api/courses';

const buildQueryString = (params: CourseListRequest): string => {
  const query = transformFiltersToQuery({
    ...params,
    level: params.level,
  });

  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach((entry) => searchParams.append(key, String(entry)));
      } else {
        searchParams.set(key, String(value));
      }
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

const normalizeListResponse = (payload: any): CourseListResponse => {
  const rawCourses =
    payload?.data?.courses ??
    payload?.courses ??
    payload?.data ??
    payload ?? [];

  const paginationPayload = payload?.data?.pagination ?? payload?.pagination ?? {};

  const courses = transformCourses(rawCourses);

  return {
    data: courses,
    pagination: {
      currentPage: Number(paginationPayload.currentPage ?? paginationPayload.page ?? 1),
      totalPages: Number(paginationPayload.totalPages ?? paginationPayload.pages ?? 1),
      totalItems: Number(paginationPayload.totalItems ?? paginationPayload.total ?? courses.length ?? 0),
    },
  };
};

const normalizeDetailResponse = (payload: any): CourseDetailResponse => ({
  data: transformCourse(
    payload?.data?.course ?? payload?.data ?? payload
  ),
});

const resolveInternalApiUrl = (path: string) => {
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}${path}`;
  }

  return `${env.NEXT_PUBLIC_SITE_URL}${path}`;
};

export const coursesApi = apiService.injectEndpoints({
  endpoints: (builder) => ({
    list: builder.query<CourseListResponse, CourseListRequest | void>({
      async queryFn(params, queryApi, _extraOptions, baseQuery) {
        const queryString = buildQueryString(params ?? {});
        const url = resolveInternalApiUrl(`/api/courses${queryString}`);

        const result = await baseQuery({ url, method: 'GET' });

        if (result.error) {
          return { error: result.error };
        }

        return { data: normalizeListResponse(result.data) };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((course) => ({ type: 'Course' as const, id: course.id })),
              { type: 'Courses' as const, id: 'LIST' },
            ]
          : [{ type: 'Courses' as const, id: 'LIST' }],
    }),
    detail: builder.query<CourseDetailResponse, string>({
      async queryFn(courseId, queryApi, _extraOptions, baseQuery) {
        const url = resolveInternalApiUrl(`/api/courses/${courseId}`);

        const result = await baseQuery({ url, method: 'GET' });

        if (result.error) {
          return { error: result.error };
        }

        return { data: normalizeDetailResponse(result.data) };
      },
      providesTags: (result, error, courseId) => [{ type: 'Course', id: courseId }],
    }),
    wishlist: builder.query<{ ids: string[]; courses: any[] }, string>({
      async queryFn(parentId, _queryApi, _extraOptions, baseQuery) {
        const url = resolveInternalApiUrl(`/api/parents/${encodeURIComponent(parentId)}/wishlist`);
        const result = await baseQuery({ url, method: 'GET' });

        if (result.error) {
          return { error: result.error };
        }

        const courses = Array.isArray((result.data as any)?.data)
          ? ((result.data as any).data as any[])
          : [];
        const ids = courses
          .map((course) => course?.id ?? course?._id ?? null)
          .filter((id): id is string => Boolean(id));

        return { data: { ids, courses } };
      },
      providesTags: [{ type: 'Courses', id: 'WISHLIST' }],
    }),
    toggleWishlist: builder.mutation<{ status: 'added' | 'removed' }, { parentId: string; courseId: string; action: 'add' | 'remove' }>({
      query: ({ parentId, courseId, action }) => {
        const method: 'POST' | 'DELETE' = action === 'add' ? 'POST' : 'DELETE';
        const parentPath = `/api/parents/${parentId}/wishlist`;
        const url =
          method === 'POST'
            ? resolveInternalApiUrl(parentPath)
            : resolveInternalApiUrl(`${parentPath}/${courseId}`);
        const request: {
          url: string;
          method: 'POST' | 'DELETE';
          body?: string;
          headers?: Record<string, string>;
        } = {
          url,
          method,
        };

        if (method === 'POST') {
          request.body = JSON.stringify({ courseId });
          request.headers = {
            'Content-Type': 'application/json',
          };
        }

        return request;
      },
      invalidatesTags: (result, error, { courseId }) => [
        { type: 'Course' as const, id: courseId },
        { type: 'Courses' as const, id: 'LIST' },
        { type: 'Courses' as const, id: 'WISHLIST' },
      ],
      async onQueryStarted({ courseId, action }, { dispatch, getState, queryFulfilled }) {
        const state = getState() as RootState;
        const courseIds = selectWishlistCourseIds(state);
        const wasWishlisted = courseIds.includes(courseId);

        dispatch(
          markWishlistPending({
            courseId,
            direction: action === 'add' ? 'adding' : 'removing',
          })
        );

        if (action === 'add' && !wasWishlisted) {
          dispatch(addToWishlist(courseId));
        }

        if (action === 'remove' && wasWishlisted) {
          dispatch(removeFromWishlist(courseId));
        }

        try {
          await queryFulfilled;
        } catch (error) {
          if (action === 'add') {
            dispatch(removeFromWishlist(courseId));
          } else if (wasWishlisted) {
            dispatch(addToWishlist(courseId));
          }
          throw error;
        } finally {
          dispatch(clearWishlistPending(courseId));
        }
      },
    }),
  }),
  overrideExisting: true,
});

export const {
  useListQuery: useCoursesListQuery,
  useLazyListQuery: useLazyCoursesListQuery,
  useDetailQuery: useCourseDetailQuery,
  useToggleWishlistMutation,
  useWishlistQuery,
} = coursesApi;

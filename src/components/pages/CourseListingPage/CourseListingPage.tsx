'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import PublicNavbar from '@/components/organisms/PublicNavbar';
import Footer from '@/components/organisms/Footer';
import CourseFilters from '@/components/organisms/CourseFilters';
import CourseGrid from '@/components/organisms/CourseGrid';
import CoursesSearchBar from '@/components/molecules/CoursesSearchBar';
import SortDropdown from '@/components/molecules/SortDropdown';
import Pagination from '@/components/molecules/Pagination';
import Button from '@/components/atoms/Button';
import SpinnerIcon from '@/components/icons/SpinnerIcon';

import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useFeatureModules } from '@/hooks/useFeatureModule';
import type { FeatureModuleKey } from '@/store/modules/registry';
import { clearFilters, setCurrentPage, setFilters as setCourseFilters } from '@/store/courses.slice';
import { coursesApi, useCoursesListQuery, useWishlistQuery } from '@/store/api/courses.api';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import {
  selectCourseCurrentPage,
  selectCoursesError,
  selectCoursesStatus,
} from '@/store/selectors/courses.selectors';
import { selectMockCourses } from '@/store/selectors/mock.selectors';
import { selectUserProfile } from '@/store/selectors/user.selectors';
import type { LoadingStatus } from '@/store/courses.slice';

import type { FilterState, SortOption } from '@/types';

import './index.css';

const ITEMS_PER_PAGE = 20;

export interface CourseListingPageProps {
  initialFilters?: FilterState;
  initialSearch?: string;
}

const DEFAULT_FILTERS: FilterState = {
  priceRange: [0, 200],
  isFree: false,
  duration: [],
  level: [],
  rating: null,
};

const cloneDefaultFilters = (): FilterState => ({
  priceRange: [...DEFAULT_FILTERS.priceRange] as [number, number],
  isFree: DEFAULT_FILTERS.isFree,
  duration: [...DEFAULT_FILTERS.duration],
  level: [...DEFAULT_FILTERS.level],
  rating: DEFAULT_FILTERS.rating,
});

export default function CourseListingPage({
  initialFilters,
  initialSearch,
}: CourseListingPageProps) {
  const { isAuthenticated, isChecking } = useAuthGuard({ requireAuth: false });
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const requestedFeatures = useMemo<FeatureModuleKey[]>(
    () =>
      process.env.NODE_ENV !== 'production'
        ? ['courses', 'wishlist', 'mock']
        : ['courses', 'wishlist'],
    []
  );
  const featuresReady = useFeatureModules(requestedFeatures);

  const currentPage = useAppSelector(selectCourseCurrentPage);
  const devMockCourses = useAppSelector(selectMockCourses);
  const coursesStatus = useAppSelector(selectCoursesStatus);
  const coursesError = useAppSelector(selectCoursesError);
  const user = useAppSelector(selectUserProfile);

  const initialQuery = searchParams.get('q') ?? initialSearch ?? '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filters, setLocalFilters] = useState<FilterState>(
    initialFilters ?? cloneDefaultFilters()
  );

  useEffect(() => {
    if (initialFilters) {
      setLocalFilters(initialFilters);
    } else {
      setLocalFilters(cloneDefaultFilters());
    }
  }, [initialFilters]);

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      dispatch(setCourseFilters({ search: initialQuery }));
      dispatch(setCurrentPage(1));
    }
  }, [initialQuery, dispatch]);

  const queryArgs = useMemo(() => {
    const [minPrice, maxPrice] = filters.priceRange;
    const includePrice = filters.isFree || minPrice > 0 || maxPrice < 200;

    return {
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      search: searchQuery.trim() ? searchQuery.trim() : undefined,
      level: filters.level.length > 0 ? filters.level.map((level) => level.toLowerCase()) : undefined,
      ...(includePrice
        ? filters.isFree
          ? { minPrice: 0, maxPrice: 0 }
          : { minPrice, maxPrice }
        : {}),
      rating: filters.rating ?? undefined,
    };
  }, [currentPage, filters, searchQuery]);

  const { data, isFetching, isLoading, error } = useCoursesListQuery(queryArgs, {
    skip: isChecking || !featuresReady,
  });

  useWishlistQuery(user?.id ?? '', {
    skip: !featuresReady || !user?.id,
  });

  const prefetchCoursesList = coursesApi.usePrefetch('list');

  const coursesFromApi = data?.data ?? [];
  const shouldUseMock =
    Boolean(error) && process.env.NODE_ENV !== 'production' && devMockCourses.length > 0;
  const courses = shouldUseMock ? devMockCourses : coursesFromApi;

  const pagination = data?.pagination;
  const totalItems = shouldUseMock
    ? devMockCourses.length
    : pagination?.totalItems ?? courses.length;
  const totalPages = shouldUseMock
    ? Math.max(1, Math.ceil(devMockCourses.length / ITEMS_PER_PAGE))
    : pagination?.totalPages ?? 1;
  const statusIsLoading: LoadingStatus = isLoading || isFetching ? 'loading' : coursesStatus;
  const resolvedErrorMessage =
    (error && 'message' in error && typeof error.message === 'string'
      ? error.message
      : coursesError) ?? 'Failed to load courses. Please try again.';
  const hasError = !shouldUseMock && (Boolean(error) || Boolean(coursesError));

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setLocalFilters(newFilters);
    dispatch(setCourseFilters({
      search: searchQuery || undefined,
      level: newFilters.level,
    }));
    dispatch(setCurrentPage(1));
  }, [dispatch, searchQuery]);

  const handleSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      setSearchQuery(query);
      dispatch(setCourseFilters({
        search: trimmed || undefined,
        level: filters.level,
      }));
      dispatch(setCurrentPage(1));

      const params = new URLSearchParams();
      if (trimmed) {
        params.set('q', trimmed);
      }

      const newUrl = trimmed ? `/courses?${params.toString()}` : '/courses';
      router.push(newUrl, { scroll: false });
    },
    [dispatch, router, filters.level]
  );

  const handleSortChange = useCallback((newSort: SortOption) => {
    setSortBy(newSort);
  }, []);

  const handlePageChange = useCallback(
    (page: number) => {
      if (isAuthenticated) {
        prefetchCoursesList({
          ...queryArgs,
          page,
        });
      }
      dispatch(setCurrentPage(page));
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [dispatch, prefetchCoursesList, queryArgs, isAuthenticated]
  );

  const handleResetFilters = useCallback(() => {
    setLocalFilters(cloneDefaultFilters());
    setSearchQuery('');
    dispatch(clearFilters());
    dispatch(setCurrentPage(1));
    router.push('/courses', { scroll: false });
  }, [dispatch, router]);

  // Client-side sorting of courses
  const sortedCourses = useMemo(() => {
    const ordered = [...courses].sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical-asc':
          return a.title.localeCompare(b.title);
        case 'alphabetical-desc':
          return b.title.localeCompare(a.title);
        case 'rating':
          const ratingA = typeof a.rating === 'object' ? a.rating.average : a.rating;
          const ratingB = typeof b.rating === 'object' ? b.rating.average : b.rating;
          return ratingB - ratingA;
        case 'price-low':
          const priceA = typeof a.price === 'object' ? a.price.amount : a.price;
          const priceB = typeof b.price === 'object' ? b.price.amount : b.price;
          return priceA - priceB;
        case 'price-high':
          const priceHighA = typeof a.price === 'object' ? a.price.amount : a.price;
          const priceHighB = typeof b.price === 'object' ? b.price.amount : b.price;
          return priceHighB - priceHighA;
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    if (shouldUseMock) {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      return ordered.slice(start, start + ITEMS_PER_PAGE);
    }

    return ordered;
  }, [courses, sortBy, shouldUseMock, currentPage]);

  const renderGuardMessage = (message: string) => (
    <div className="course-listing-page">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: '0.75rem',
          color: '#1f2937',
        }}
        role="status"
        aria-live="polite"
      >
        <SpinnerIcon />
        <span>{message}</span>
      </div>
    </div>
  );

  if (isChecking || !featuresReady) {
    return renderGuardMessage('Checking your session…');
  }

  return (
    <div className="course-listing-page">
      <PublicNavbar />

      <main className="course-listing-main">
        <div className="course-listing-container">
          {/* Header */}
          <header className="course-listing-header">
            <h1 className="course-listing-title">Explore Courses</h1>
            <p className="course-listing-subtitle">
              Find the perfect course to enhance your parenting skills and knowledge
            </p>
          </header>

          {/* Search Bar */}
          <div className="course-listing-search">
            <CoursesSearchBar
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search by title, instructor, or topic..."
            />
          </div>

          {/* Filters - Top of the page */}
          <div className="course-listing-filters-section">
            <CourseFilters filters={filters} onFilterChange={handleFilterChange} />
          </div>

          {/* Results Header */}
          <div className="course-listing-results-header">
            <p className="course-listing-results-count">
              {totalItems} {totalItems === 1 ? 'course' : 'courses'} found
            </p>
            <SortDropdown value={sortBy} onChange={handleSortChange} />
          </div>

          {/* Loading State */}
          {statusIsLoading === 'loading' && (
            <div className="course-listing-loading">
              <SpinnerIcon size={48} />
              <p>Loading courses...</p>
            </div>
          )}

          {/* Error State */}
          {hasError && (
            <div className="course-listing-error">
              <p className="course-listing-error-text">
                {resolvedErrorMessage}
              </p>
              <Button onClick={handleResetFilters} variant="primary">
                Try Again
              </Button>
            </div>
          )}

          {/* Course Grid */}
          {statusIsLoading !== 'loading' && !hasError && sortedCourses.length > 0 && (
            <>
              <CourseGrid courses={sortedCourses} />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="course-listing-pagination">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {statusIsLoading !== 'loading' && !hasError && sortedCourses.length === 0 && (
            <div className="course-listing-empty">
              <div className="course-listing-empty-content">
                <h3 className="course-listing-empty-title">No courses found</h3>
                <p className="course-listing-empty-text">
                  We couldn't find any courses matching your criteria. Try adjusting
                  your filters or search query.
                </p>
                <Button onClick={handleResetFilters} variant="primary">
                  Reset Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

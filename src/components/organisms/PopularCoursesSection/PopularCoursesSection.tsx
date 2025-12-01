'use client';

import { useMemo } from 'react';
import Link from 'next/link';

import Carousel from '@/components/molecules/Carousel';
import CourseCard from '@/components/molecules/CourseCard';
import Button from '@/components/atoms/Button';
import SpinnerIcon from '@/components/icons/SpinnerIcon';

import { useAppSelector } from '@/hooks/useAppSelector';
import { useCoursesListQuery } from '@/store/api/courses.api';
import { selectMockCourses } from '@/store/selectors/mock.selectors';

import './index.css';

export interface PopularCoursesSectionProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  ctaText?: string;
  ctaHref?: string;
  isAuthenticated?: boolean;
}

export default function PopularCoursesSection({
  title = 'Popular Courses',
  subtitle = 'Most loved courses by our community',
  limit = 6,
  ctaText = 'View All Courses',
  ctaHref = '/courses',
}: PopularCoursesSectionProps) {
  const { data, isLoading, isFetching, error, refetch } = useCoursesListQuery({ page: 1, limit });
  const devMockCourses = useAppSelector(selectMockCourses);
  const courses = data?.data ?? [];
  const shouldUseMock =
    Boolean(error) && process.env.NODE_ENV !== 'production' && devMockCourses.length > 0;
  const sourceCourses = shouldUseMock ? devMockCourses.slice(0, limit) : courses;

  const popularCourses = useMemo(() => {
    if (!sourceCourses || !Array.isArray(sourceCourses)) {
      return [];
    }

    return [...sourceCourses]
      .sort((a, b) => (a?.title || '').localeCompare(b?.title || ''))
      .slice(0, limit);
  }, [sourceCourses, limit]);

  if ((isLoading || isFetching) && courses.length === 0 && !shouldUseMock) {
    return (
      <section className="popular-courses-section">
        <div className="popular-courses-container">
          <div className="popular-courses-loading">
            <SpinnerIcon size={48} />
            <p>Loading popular courses...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error && !shouldUseMock) {
    return (
      <section className="popular-courses-section">
        <div className="popular-courses-container">
          <div className="popular-courses-error">
            <p>Failed to load courses</p>
            <Button onClick={() => refetch()} variant="primary">
              Try Again
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="popular-courses-section">
        <div className="popular-courses-container">
          <div className="popular-courses-header">
          <h2 className="popular-courses-title">{title}</h2>
          <p className="popular-courses-subtitle">{subtitle}</p>
          </div>

          {popularCourses && popularCourses.length > 0 ? (
            <>
              <Carousel>
              {popularCourses.map((course) =>
                course && course.id ? (
                  <CourseCard key={course.id} {...course} />
                ) : null
              )}
            </Carousel>

            <div className="popular-courses-footer">
              <Link href={ctaHref}>
                <Button variant="primary" size="lg">
                  {ctaText}
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="popular-courses-empty">
            <p>No popular courses available at the moment.</p>
            <Link href={ctaHref}>
              <Button variant="primary">{ctaText}</Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

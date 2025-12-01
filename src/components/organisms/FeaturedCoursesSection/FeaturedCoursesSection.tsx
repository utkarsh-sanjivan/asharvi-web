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

export interface FeaturedCoursesSectionProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  isAuthenticated?: boolean;
  ctaText?: string;
  ctaHref?: string;
  useCarousel?: boolean;
}

export default function FeaturedCoursesSection({
  title = 'Featured Courses',
  subtitle = 'Discover our most popular courses chosen by parents like you',
  limit = 6,
  ctaText,
  ctaHref = '/courses',
  useCarousel = true,
}: FeaturedCoursesSectionProps) {
  const { data, isLoading, isFetching, error } = useCoursesListQuery({ page: 1, limit });
  const devMockCourses = useAppSelector(selectMockCourses);
  const courses = data?.data ?? [];
  const shouldUseMock =
    Boolean(error) && process.env.NODE_ENV !== 'production' && devMockCourses.length > 0;
  const sourceCourses = shouldUseMock ? devMockCourses.slice(0, limit) : courses;

  const featuredCourses = useMemo(() => {
    if (!sourceCourses || !Array.isArray(sourceCourses)) {
      return [];
    }

    return [...sourceCourses]
      .sort((a, b) => (a?.title || '').localeCompare(b?.title || ''))
      .slice(0, limit);
  }, [sourceCourses, limit]);

  if ((isLoading || isFetching) && courses.length === 0 && !shouldUseMock) {
    return (
      <section className="featured-courses-section">
        <div className="featured-courses-container">
          <div className="featured-courses-loading">
            <SpinnerIcon size={48} />
            <p>Loading featured courses...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="featured-courses-section">
      <div className="featured-courses-container">
        <div className="featured-courses-header">
          <h2 className="featured-courses-title">{title}</h2>
          <p className="featured-courses-subtitle">{subtitle}</p>
        </div>

        {featuredCourses && featuredCourses.length > 0 ? (
          <>
            {useCarousel ? (
              <Carousel>
                {featuredCourses.map((course) =>
                  course && course.id ? (
                    <CourseCard key={course.id} {...course} />
                  ) : null
                )}
              </Carousel>
            ) : (
              <div className="featured-courses-grid">
                {featuredCourses.map((course) =>
                  course && course.id ? (
                    <CourseCard key={course.id} {...course} />
                  ) : null
                )}
              </div>
            )}

            <div className="featured-courses-footer">
              {ctaText && (
                <Link href={ctaHref}>
                  <Button variant="primary" size="lg">
                    {ctaText}
                  </Button>
                </Link>
              )}
            </div>
          </>
        ) : (
          <div className="featured-courses-empty">
            <p>No featured courses available at the moment.</p>
            <Link href="/courses">
              <Button variant="primary">Browse All Courses</Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

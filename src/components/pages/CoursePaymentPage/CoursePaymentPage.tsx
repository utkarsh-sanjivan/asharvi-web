'use client';

import { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import PublicNavbar from '@/components/organisms/PublicNavbar';
import Footer from '@/components/organisms/Footer';
import Button from '@/components/atoms/Button';
import SpinnerIcon from '@/components/icons/SpinnerIcon';

import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useFeatureModules } from '@/hooks/useFeatureModule';
import { useAppSelector } from '@/hooks/useAppSelector';
import { env } from '@/config/env';
import type { FeatureModuleKey } from '@/store/modules/registry';
import { coursesApi, useCourseDetailQuery } from '@/store/api/courses.api';
import { selectMockCourses } from '@/store/selectors/mock.selectors';
import type { Course } from '@/types';
import { isStagingPurchaseMarked, markStagingPurchase } from '@/lib/staging-purchase';

import './index.css';

const formatCurrency = (amount?: number, currency = 'USD'): string => {
  if (!amount || amount <= 0) {
    return 'Free';
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
};

const formatDuration = (seconds?: number): string => {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) {
    return 'Self-paced';
  }

  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m total`;
  }

  if (hours < 10) {
    return `${hours}h ${minutes}m total`;
  }

  return `${hours}h total`;
};

const resolveInstructorName = (instructor?: Course['instructor']): string => {
  if (!instructor) {
    return 'Unknown Instructor';
  }

  if (typeof instructor === 'string') {
    return 'Instructor';
  }

  return instructor.name ?? 'Unknown Instructor';
};

export default function CoursePaymentPage({ courseId }: { courseId: string }) {
  const { isAuthenticated, isChecking } = useAuthGuard({ redirectTo: '/auth/login' });
  const router = useRouter();
  const [hasStagingPurchase, setHasStagingPurchase] = useState(false);

  const featureKeys = useMemo<FeatureModuleKey[]>(
    () => (process.env.NODE_ENV !== 'production' ? ['courses', 'wishlist', 'mock'] : ['courses', 'wishlist']),
    []
  );
  const featuresReady = useFeatureModules(featureKeys);

  const cachedCourse = coursesApi.endpoints.detail.useQueryState(courseId);
  const mockCourses = useAppSelector(selectMockCourses);
  const shouldFetch = !cachedCourse.data;
  const { isFetching: isFetchingFallback } = useCourseDetailQuery(courseId, {
    skip: !isAuthenticated || !shouldFetch,
  });

  const normalizedCourseId = courseId.trim().toLowerCase();
  const fallbackCourse = useMemo(
    () =>
      mockCourses.find((mock: Course) => {
        const candidates = [mock.id, mock.slug];
        return candidates.some((candidate) => candidate?.toLowerCase() === normalizedCourseId);
      }),
    [mockCourses, normalizedCourseId]
  );

  const course = cachedCourse.data?.data ?? fallbackCourse;
  const isPaidCourse = (course?.price?.amount ?? 0) > 0;
  const isPurchased = course?.isPurchased ?? false;
  const isStaging = env.APP_ENV === 'staging';
  const effectivePurchased = isPurchased || (isStaging && hasStagingPurchase);
  const isLoadingState = isChecking || !featuresReady || (!course && isFetchingFallback);

  useEffect(() => {
    if (!isStaging) {
      return;
    }

    setHasStagingPurchase(isStagingPurchaseMarked(courseId));
  }, [courseId, isStaging]);

  useEffect(() => {
    if (!course || isChecking || !featuresReady) {
      return;
    }

    if (!isPaidCourse || effectivePurchased) {
      router.replace(`/learn/${courseId}`);
    }
  }, [course, courseId, effectivePurchased, featuresReady, isChecking, isPaidCourse, router]);

  if (isLoadingState) {
    return (
      <div className="course-payment-page">
        <PublicNavbar />
        <main className="course-payment-main">
          <div className="course-payment-container">
            <div className="course-payment-loading">
              <SpinnerIcon size={48} />
              <p>Preparing your checkout...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="course-payment-page">
        <PublicNavbar />
        <main className="course-payment-main">
          <div className="course-payment-container">
            <div className="course-payment-error">
              <h1>Course not found</h1>
              <p>We couldn&apos;t load this course right now. Please return to the course page.</p>
              <Link href="/courses" className="course-payment-error-link">
                Browse courses
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const priceLabel = formatCurrency(course.price?.amount ?? course.originalPrice ?? 0, course.price?.currency);
  const durationLabel = formatDuration(course.metadata?.totalDuration);
  const instructorName = resolveInstructorName(course.instructor);

  const handleStagingPurchase = () => {
    markStagingPurchase(courseId);
    setHasStagingPurchase(true);
    router.replace(`/learn/${courseId}`);
  };

  return (
    <div className="course-payment-page">
      <PublicNavbar />
      <main className="course-payment-main">
        <div className="course-payment-container">
          <nav className="course-payment-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="course-payment-breadcrumb-divider">/</span>
            <Link href="/courses">Courses</Link>
            <span className="course-payment-breadcrumb-divider">/</span>
            <Link href={`/course/${courseId}`}>Course details</Link>
            <span className="course-payment-breadcrumb-divider">/</span>
            <span aria-current="page">Payment</span>
          </nav>

          <header className="course-payment-header">
            <h1>Complete your purchase</h1>
            <p>Review your course details and proceed to payment when you&apos;re ready.</p>
          </header>

          <div className="course-payment-grid">
            <section className="course-payment-summary">
              <div className="course-payment-summary-card">
                <div className="course-payment-summary-media">
                  <img
                    src={course.coverImage ?? course.thumbnail ?? '/images/course-placeholder.jpg'}
                    alt={course.title ?? 'Course preview'}
                  />
                </div>
                <div className="course-payment-summary-content">
                  <h2>{course.title ?? 'Course purchase'}</h2>
                  <p className="course-payment-summary-description">
                    {course.shortDescription ?? course.description ?? 'Course details'}
                  </p>
                  <dl className="course-payment-summary-details">
                    <div>
                      <dt>Instructor</dt>
                      <dd>{instructorName}</dd>
                    </div>
                    <div>
                      <dt>Duration</dt>
                      <dd>{durationLabel}</dd>
                    </div>
                    <div>
                      <dt>Level</dt>
                      <dd>{course.level ?? 'All levels'}</dd>
                    </div>
                    <div>
                      <dt>Price</dt>
                      <dd>{priceLabel}</dd>
                    </div>
                  </dl>
                  <div className="course-payment-summary-actions">
                    <Button variant="secondary" size="md" onClick={() => router.push(`/course/${courseId}`)}>
                      Back to course
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <section className="course-payment-gateway" aria-label="Payment gateway placeholder">
              <div className="course-payment-gateway-card">
                <h2>Payment gateway</h2>
                <p>
                  A secure payment provider will be integrated here. You&apos;ll be able to pay with your
                  preferred method once the gateway is connected.
                </p>
                <div className="course-payment-gateway-placeholder">
                  <span>Payment provider widget placeholder</span>
                </div>
                <Button variant="primary" size="lg" disabled>
                  Proceed to payment
                </Button>
                {isStaging && (
                  <Button variant="secondary" size="lg" onClick={handleStagingPurchase}>
                    Mark as purchased (staging)
                  </Button>
                )}
                <p className="course-payment-gateway-note">
                  Payments are not yet enabled in this environment.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

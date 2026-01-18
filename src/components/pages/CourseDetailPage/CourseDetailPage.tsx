'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import PublicNavbar from '@/components/organisms/PublicNavbar';
import Footer from '@/components/organisms/Footer';
import SpinnerIcon from '@/components/icons/SpinnerIcon';
import StarIcon from '@/components/icons/StarIcon';

import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useFeatureModules } from '@/hooks/useFeatureModule';
import { useAppSelector } from '@/hooks/useAppSelector';
import { env } from '@/config/env';
import type { FeatureModuleKey } from '@/store/modules/registry';
import { useCourseDetailQuery, useToggleWishlistMutation, useWishlistQuery } from '@/store/api/courses.api';
import { selectMockCourses } from '@/store/selectors/mock.selectors';
import { selectUserProfile } from '@/store/selectors/user.selectors';
import {
  makeSelectIsCourseWishlisted,
  makeSelectIsWishlistPending,
} from '@/store/selectors/wishlist.selectors';
import type { Course, Section } from '@/types';
import { isStagingPurchaseMarked } from '@/lib/staging-purchase';

import './index.css';
import CourseHero from '@/components/organisms/CourseHero';
import CourseOverview from '@/components/organisms/CourseOverview';
import CourseSidebar from '@/components/organisms/CourseSidebar';

export interface CourseDetailPageProps {
  courseId: string;
}

const FALLBACK_IMAGE = '/images/course-placeholder.jpg';
const FALLBACK_LANGUAGE = 'English';

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

const formatDate = (isoDate?: string): string => {
  if (!isoDate) {
    return 'Recently updated';
  }

  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return 'Recently updated';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(parsed);
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

const countSectionLessons = (section?: Section): number => {
  if (!section) {
    return 0;
  }

  const videoCount = Array.isArray(section.videos) ? section.videos.length : 0;
  const pdfCount = Array.isArray(section.pdfs) ? section.pdfs.length : 0;
  const testCount = section.test ? 1 : 0;

  return videoCount + pdfCount + testCount;
};

const renderStars = (rating: number, key: string) => {
  const normalized = Math.max(0, Math.min(5, rating));
  const stars = [] as JSX.Element[];
  const fullStars = Math.floor(normalized);
  const hasHalfStar = normalized % 1 >= 0.5;

  for (let i = 0; i < 5; i += 1) {
    if (i < fullStars) {
      stars.push(<StarIcon key={`${key}-star-${i}`} type="filled" />);
    } else if (i === fullStars && hasHalfStar) {
      stars.push(<StarIcon key={`${key}-star-${i}`} type="half" id={`${key}-half`} />);
    } else {
      stars.push(<StarIcon key={`${key}-star-${i}`} type="empty" />);
    }
  }

  return stars;
};

export default function CourseDetailPage({ courseId }: CourseDetailPageProps) {
  const { isAuthenticated, isChecking } = useAuthGuard({ redirectTo: '/auth/login', requireAuth: false });
  const router = useRouter();
  const [hasStagingPurchase, setHasStagingPurchase] = useState(false);

  const requestedFeatures = useMemo<FeatureModuleKey[]>(
    () =>
      process.env.NODE_ENV !== 'production'
        ? (['courses', 'wishlist', 'mock'] as FeatureModuleKey[])
        : (['courses', 'wishlist'] as FeatureModuleKey[]),
    []
  );
  const featuresReady = useFeatureModules(requestedFeatures);
  const wishlistReady = featuresReady;

  const cachedCourses = useAppSelector(selectMockCourses);
  const user = useAppSelector(selectUserProfile);
  const makeWishlistedSelector = useMemo(makeSelectIsCourseWishlisted, []);
  const makePendingSelector = useMemo(makeSelectIsWishlistPending, []);
  const isWishlistedFromStore = useAppSelector((state) =>
    makeWishlistedSelector(state, courseId)
  );
  const isWishlistPendingFromStore = useAppSelector((state) =>
    makePendingSelector(state, courseId)
  );

  const { data, isLoading, isFetching, error } = useCourseDetailQuery(courseId, {
    skip: !isAuthenticated,
  });
  useWishlistQuery(user?.id ?? '', {
    skip: !wishlistReady || !user?.id,
  });
  const [toggleWishlist, { isLoading: isWishlistMutating }] = useToggleWishlistMutation();

  const fallbackCourse = useMemo(() => {
    const normalized = courseId.trim().toLowerCase();
    return cachedCourses.find((course: Course) => {
      const candidates = [course?.id, course?._id, course?.slug];
      return candidates.some((candidate) => candidate && candidate.trim().toLowerCase() === normalized);
    });
  }, [cachedCourses, courseId]);

  const course = data?.data ?? fallbackCourse;

  const isWishlisted = wishlistReady
    ? isWishlistedFromStore
    : Boolean(course?.isWishlisted);
  const isWishlistPending = wishlistReady ? isWishlistPendingFromStore : false;
  const wishlistLabel = isWishlisted ? 'Remove from wishlist' : 'Add to wishlist';
  const wishlistDisabled =
    !wishlistReady || !user?.id || isWishlistPending || isWishlistMutating;

  const handleWishlistToggle = () => {
    if (wishlistDisabled || !user?.id) {
      return;
    }

    const action = isWishlisted ? 'remove' : 'add';
    toggleWishlist({ parentId: user.id, courseId, action }).catch((toggleError) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Failed to toggle wishlist', toggleError);
      }
    });
  };

  const isLoadingState = isChecking || !featuresReady || ((isLoading || isFetching) && !course);

  if (isLoadingState) {
    return (
      <div className="course-detail-page">
        <PublicNavbar />
        <main className="course-detail-main">
          <div className="course-detail-container">
            <div className="course-detail-loading">
              <SpinnerIcon size={48} />
              <p>Loading course details...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!course || error) {
    return (
      <div className="course-detail-page">
        <PublicNavbar />
        <main className="course-detail-main">
          <div className="course-detail-container">
            <div className="course-detail-error">
              <h1>Course not found</h1>
              <p>We couldn&apos;t load this course right now. Please try again later.</p>
              <Link href="/courses" className="course-detail-error-link">
                Return to courses
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const ratingAverage =
    typeof course.rating === 'object' && course.rating !== null
      ? Number(course.rating.average ?? 0)
      : 0;
  const ratingCount =
    typeof course.rating === 'object' && course.rating !== null
      ? Number(course.rating.count ?? 0)
      : 0;

  const enrollment = Number(course.enrollmentCount ?? 0);
  const totalDuration = course.metadata?.totalDuration ?? 0;
  const level =
    typeof course.level === 'string'
      ? `${course.level.charAt(0).toUpperCase()}${course.level.slice(1)}`
      : 'All levels';

  const language =
    typeof course.language === 'string' && course.language.length > 0
      ? course.language
      : FALLBACK_LANGUAGE;

  const thumbnail = course.coverImage ?? course.thumbnail ?? FALLBACK_IMAGE;

  const priceAmount =
    course.price?.amount ?? course.originalPrice ?? 0;
  const priceLabel = formatCurrency(priceAmount, course.price?.currency);
  const originalPrice =
    course.price?.discountedPrice !== undefined
      ? course.price.discountedPrice
      : course.originalPrice;
  const originalPriceLabel =
    originalPrice && originalPrice > priceAmount
      ? formatCurrency(originalPrice, course.price?.currency)
      : null;
  const isPaidCourse = priceAmount > 0;
  const isPurchased = course.isPurchased ?? false;
  const isStaging = env.APP_ENV === 'staging';
  const effectivePurchased = isPurchased || (isStaging && hasStagingPurchase);
  const primaryActionLabel = isPaidCourse && !effectivePurchased ? 'Purchase course' : 'Start learning';

  useEffect(() => {
    if (!isStaging) {
      return;
    }

    setHasStagingPurchase(isStagingPurchaseMarked(courseId));
  }, [courseId, isStaging]);

  const handleStartLearning = () => {
    if (isChecking) {
      return;
    }

    if (isPaidCourse && !effectivePurchased) {
      if (!isAuthenticated) {
        router.push(`/auth/login?redirect=/course/${courseId}/payment`);
        return;
      }

      router.push(`/course/${courseId}/payment`);
      return;
    }

    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/learn/${courseId}`);
      return;
    }

    router.push(`/learn/${courseId}`);
  };

  const sections: Section[] = Array.isArray(course.sections)
    ? (course.sections as Section[])
    : [];
  const lessonsCount = sections.reduce<number>(
    (total, section) => total + countSectionLessons(section),
    0
  );

  const instructor =
    typeof course.instructor === 'object' && course.instructor !== null
      ? course.instructor
      : null;

  const ratingStars = renderStars(ratingAverage, course.id);
  const durationLabel = formatDuration(totalDuration);
  const lastUpdatedLabel = formatDate(course.metadata?.lastUpdated ?? course.updatedAt);
  const learningOutcomes = Array.isArray(course.learningOutcomes)
    ? course.learningOutcomes
    : [];
  const prerequisites = Array.isArray(course.prerequisites) ? course.prerequisites : [];
  const targetAudience = Array.isArray(course.targetAudience) ? course.targetAudience : [];

  return (
    <div className="course-detail-page">
      <PublicNavbar />
      <main className="course-detail-main">
        <div className="course-detail-container">
          <nav className="course-detail-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="course-detail-breadcrumb-divider">/</span>
            <Link href="/courses">Courses</Link>
            <span className="course-detail-breadcrumb-divider">/</span>
            <span aria-current="page">{course.title ?? 'Course details'}</span>
          </nav>

          <CourseHero
            title={course.title ?? 'Course details'}
            subtitle={course.shortDescription}
            badges={Array.isArray(course.badges) ? (course.badges as string[]) : []}
            ratingAverage={ratingAverage}
            ratingCount={ratingCount}
            ratingStars={ratingStars}
            enrollmentCount={enrollment}
            durationLabel={durationLabel}
            levelLabel={level}
            thumbnail={thumbnail}
            priceLabel={priceLabel}
            originalPriceLabel={originalPriceLabel}
            onStartLearning={handleStartLearning}
            primaryActionLabel={primaryActionLabel}
            onWishlistToggle={handleWishlistToggle}
            wishlistLabel={wishlistLabel}
            wishlistDisabled={wishlistDisabled}
            wishlistLoading={isWishlistPending || isWishlistMutating}
            isWishlisted={isWishlisted}
          />

          <div className="course-detail-grid">
            <div className="course-detail-main-column">
              <CourseOverview
                learningOutcomes={learningOutcomes}
                description={course.description}
                prerequisites={prerequisites}
                targetAudience={targetAudience}
              />
            </div>

            <CourseSidebar
              courseId={courseId}
              sections={sections}
              totalSections={sections.length}
              lessonCount={lessonsCount}
              durationLabel={durationLabel}
              lastUpdatedLabel={lastUpdatedLabel}
              languageLabel={language}
              levelLabel={level}
              instructor={instructor}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

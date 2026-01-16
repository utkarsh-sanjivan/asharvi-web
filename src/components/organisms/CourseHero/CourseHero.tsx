"use client";

import type { ReactNode } from 'react';

import Button from '@/components/atoms/Button';
import UserIcon from '@/components/icons/UserIcon';
import ClockIcon from '@/components/icons/ClockIcon';
import HeartIcon from '@/components/icons/HeartIcon';

import './index.css';

interface CourseHeroProps {
  title: string;
  subtitle?: string;
  badges?: string[];
  ratingAverage: number;
  ratingCount: number;
  ratingStars: ReactNode;
  enrollmentCount: number;
  durationLabel: string;
  levelLabel: string;
  thumbnail: string;
  priceLabel: string;
  originalPriceLabel?: string | null;
  onStartLearning: () => void;
  primaryActionLabel?: string;
  onWishlistToggle?: () => void;
  wishlistLabel?: string;
  wishlistDisabled?: boolean;
  wishlistLoading?: boolean;
  isWishlisted?: boolean;
}

export default function CourseHero({
  title,
  subtitle,
  badges,
  ratingAverage,
  ratingCount,
  ratingStars,
  enrollmentCount,
  durationLabel,
  levelLabel,
  thumbnail,
  priceLabel,
  originalPriceLabel,
  onStartLearning,
  primaryActionLabel,
  onWishlistToggle,
  wishlistLabel,
  wishlistDisabled,
  wishlistLoading,
  isWishlisted = false,
}: CourseHeroProps) {
  const formattedRating = ratingAverage.toFixed(1);
  const formattedReviews = ratingCount.toLocaleString();
  const formattedEnrollment = enrollmentCount.toLocaleString();
  const resolvedWishlistLabel =
    wishlistLabel ?? (isWishlisted ? 'Remove from wishlist' : 'Add to wishlist');
  const wishlistButtonDisabled = wishlistDisabled ?? !onWishlistToggle;
  const actionLabel = primaryActionLabel ?? 'Start learning';

  return (
    <section className="course-detail-hero">
      <div className="course-detail-hero-content">
        <div className="course-detail-badges">
          {badges?.slice(0, 3).map((badge) => (
            <span key={badge} className={`course-detail-badge course-detail-badge--${badge.toLowerCase()}`}>
              {badge}
            </span>
          ))}
        </div>
        <h1 className="course-detail-title">{title}</h1>
        {subtitle && <p className="course-detail-subtitle">{subtitle}</p>}

        <div className="course-detail-metrics">
          <div className="course-detail-rating">
            <div className="course-detail-stars">{ratingStars}</div>
            <span className="course-detail-rating-value">{formattedRating}</span>
            <span className="course-detail-rating-count">({formattedReviews} reviews)</span>
          </div>
          <div className="course-detail-metric">
            <UserIcon />
            <span>{formattedEnrollment} enrolled</span>
          </div>
          <div className="course-detail-metric">
            <ClockIcon />
            <span>{durationLabel}</span>
          </div>
          <div className="course-detail-metric">
            <span className="course-detail-metric-dot" />
            <span>{levelLabel}</span>
          </div>
        </div>

        <div className="course-detail-actions">
          <Button variant="primary" size="lg" onClick={onStartLearning}>
            {actionLabel}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={onWishlistToggle}
            disabled={wishlistButtonDisabled}
            loading={wishlistLoading}
            aria-pressed={isWishlisted}
            aria-label={resolvedWishlistLabel}
          >
            {resolvedWishlistLabel}
          </Button>
        </div>
      </div>
      <div className="course-detail-hero-media">
        <img src={thumbnail} alt={title} />
        {onWishlistToggle && (
          <button
            type="button"
            className="course-detail-wishlist-toggle"
            onClick={onWishlistToggle}
            disabled={wishlistButtonDisabled}
            aria-label={resolvedWishlistLabel}
            aria-pressed={isWishlisted}
          >
            <HeartIcon filled={isWishlisted} />
          </button>
        )}
        <div className="course-detail-price-card">
          <span className="course-detail-price-current">{priceLabel}</span>
          {originalPriceLabel && (
            <span className="course-detail-price-original">{originalPriceLabel}</span>
          )}
        </div>
      </div>
    </section>
  );
}

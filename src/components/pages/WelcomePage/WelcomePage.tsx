'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/atoms/Button';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import './index.css';

export default function WelcomePage() {
  const { isAuthenticated, isChecking } = useAuthGuard({ redirectTo: '/auth/login' });
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      router.push('/');
    }, 5000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  if (isChecking) {
    return (
      <div className="welcome-page">
        <div className="welcome-container">
          <div className="welcome-card" role="status" aria-live="polite">
            Preparing your welcome experience…
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="welcome-page">
      <div className="welcome-container">
        <div className="welcome-card">
          <div className="welcome-animation">
            <div className="success-checkmark">
              <div className="check-icon">
                <span className="icon-line line-tip"></span>
                <span className="icon-line line-long"></span>
                <div className="icon-circle"></div>
                <div className="icon-fix"></div>
              </div>
            </div>
          </div>

          <h1 className="welcome-title">Welcome to Asharvi! 🎉</h1>
          <p className="welcome-message">
            Your account has been successfully created. Get ready to transform your parenting journey with evidence-based strategies and expert guidance.
          </p>

          <div className="welcome-features">
            <div className="feature-item">
              <div className="feature-icon">📚</div>
              <div className="feature-text">Access to expert-led courses</div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🎯</div>
              <div className="feature-text">Personalized recommendations</div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📊</div>
              <div className="feature-text">Track your progress</div>
            </div>
          </div>

          <div className="welcome-actions">
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/child')}
              className="w-full"
            >
              Take Child Assessment
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push('/')}
              className="w-full"
            >
              Explore Courses
            </Button>
          </div>

          <p className="auto-redirect">
            Redirecting to homepage in 5 seconds...
          </p>
        </div>
      </div>
    </div>
  );
}

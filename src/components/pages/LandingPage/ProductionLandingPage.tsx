'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import Link from 'next/link';

import CountdownTimer from '@/components/molecules/CountdownTimer/CountdownTimer';

import './production.css';

// Update this to the real launch date/time in IST when ready.
const LAUNCH_DATETIME_IST = new Date('2024-01-01T00:00:00+05:30');

export default function ProductionLandingPage() {
  const launchDate = useMemo(() => LAUNCH_DATETIME_IST, []);

  return (
    <main className="prod-landing-page">
      <section className="prod-landing-hero">
        <div className="prod-landing-left">
          <div className="prod-landing-brand">
            <Image
              src="/images/logo.jpg"
              alt="Asharvi logo"
              width={40}
              height={40}
              className="prod-landing-brand-logo"
              priority
              unoptimized
            />
            <span className="prod-landing-logo">Asharvi</span>
          </div>
          <h1 className="prod-landing-title">Positive parenting, simplified.</h1>
          <p className="prod-landing-subtitle">
            Evidence-based guidance to help you nurture calm, confident kids.
          </p>

          <CountdownTimer targetDate={launchDate} />

          <Link href="/auth/signup" className="prod-landing-cta">
            Sign Up
          </Link>
        </div>

        <div className="prod-landing-right">
          <Image
            src="/images/hero-landing-desktop.jpg"
            alt="Parent guiding a child with positive habits"
            fill
            priority
            className="prod-landing-image"
            sizes="(max-width: 768px) 100vw, 50vw"
            unoptimized
          />
        </div>
      </section>
    </main>
  );
}

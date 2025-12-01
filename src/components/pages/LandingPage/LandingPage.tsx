import React from 'react';
import { env } from '@/config/env';
import PublicNavbar from '@/components/organisms/PublicNavbar';
import HeroSection from '@/components/organisms/HeroSection';
import WhyChooseSection from '@/components/organisms/WhyChooseSection';
import HowItWorksSection from '@/components/organisms/HowItWorksSection';
import FeaturedCoursesSection from '@/components/organisms/FeaturedCoursesSection';
import PopularCoursesSection from '@/components/organisms/PopularCoursesSection';
import TestimonialsSection from '@/components/organisms/TestimonialsSection';
import NewsletterSection from '@/components/organisms/NewsletterSection';
import Footer from '@/components/organisms/Footer';
import ProductionLandingPage from './ProductionLandingPage';

import { landingFeatures, landingSteps, landingTestimonials } from '@/config/landing.config';

export default function LandingPage() {
  if (env.APP_ENV === 'production') {
    return <ProductionLandingPage />;
  }

  return (
    <>
      <PublicNavbar isAuthenticated={false} showSearch={false} transparent={true} />

      <HeroSection
        headline="Empowering Parents to Build Positive Child Behaviors"
        subheadline="Discover evidence-based parenting strategies and interactive learning designed by child behavior experts to help you become the parent you want to be."
        primaryCTA={{
          text: 'Start Free',
          href: '/auth/signup',
        }}
        secondaryCTA={{
          text: 'Explore Courses',
          href: '/courses',
        }}
        backgroundImage="/images/hero-landing-desktop.jpg"
        backgroundImageTablet="/images/hero-landing-tablet.jpg"
        backgroundImageMobile="/images/hero-landing-mobile.jpg"
      />

      <WhyChooseSection
        title="Why Choose Ashravi?"
        subtitle="Transform your parenting journey with proven strategies"
        features={landingFeatures}
        ctaText="Take a Free Assessment"
        ctaHref="/assessment/demo"
      />

      <HowItWorksSection steps={landingSteps} />

      {/* Recommended Courses with Carousel */}
      <FeaturedCoursesSection
        title="Recommended For You"
        subtitle="Personalized parenting courses based on your family's needs"
        limit={6}
        isAuthenticated={true}
        useCarousel={true}
      />

      {/* Popular Courses with Auto-play Carousel */}
      <PopularCoursesSection
        title="Most Popular Courses"
        subtitle="Join thousands of parents learning with our top-rated courses"
        limit={6}
        isAuthenticated={true}
        ctaText="Explore All Courses"
        ctaHref="/courses"
      />

      <TestimonialsSection testimonials={landingTestimonials} />

      <NewsletterSection />

      <Footer />
    </>
  );
}

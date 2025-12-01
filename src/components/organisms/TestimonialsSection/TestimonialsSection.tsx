'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { StarIcon } from '@/components/icons';
import './index.css';

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar?: string; // Made optional
  quote: string;
  rating: number;
}

export interface TestimonialsSectionProps {
  testimonials: Testimonial[];
}

export default function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <section className="testimonials-section">
      <div className="section-container">
        <div className="section-header">
          <h2 className="section-title">Success Stories</h2>
          <p className="section-subtitle">
            Real results from parents using Ashravi
          </p>
        </div>

        <div className="testimonials-carousel">
          <div 
            className="carousel-track"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="testimonial-card">
                <div className="testimonial-header">
                  {testimonial.avatar && (
                    <div className="avatar-wrapper">
                      <Image
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        width={80}
                        height={80}
                        className="testimonial-avatar"
                      />
                    </div>
                  )}
                  <div className="testimonial-info">
                    <h3 className="testimonial-name">{testimonial.name}</h3>
                    <p className="testimonial-role">{testimonial.role}</p>
                    <div className="testimonial-rating">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`star-icon ${i < testimonial.rating ? 'star-filled' : 'star-empty'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <blockquote className="testimonial-quote">
                  "{testimonial.quote}"
                </blockquote>
              </div>
            ))}
          </div>

          {/* Carousel Indicators */}
          <div className="carousel-indicators">
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentIndex ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

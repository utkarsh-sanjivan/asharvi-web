'use client';

import { useEffect, useState } from 'react';

import './index.css';

interface CountdownTimerProps {
  targetDate: Date;
}

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const clampToZero = (value: number) => (value < 0 ? 0 : value);

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const compute = (): CountdownParts => {
    const now = Date.now();
    const diff = targetDate.getTime() - now;
    const safeDiff = diff > 0 ? diff : 0;

    const days = Math.floor(safeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((safeDiff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((safeDiff / (1000 * 60)) % 60);
    const seconds = Math.floor((safeDiff / 1000) % 60);

    return {
      days: clampToZero(days),
      hours: clampToZero(hours),
      minutes: clampToZero(minutes),
      seconds: clampToZero(seconds),
    };
  };

  const [timeLeft, setTimeLeft] = useState<CountdownParts>(compute);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(compute());
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate.getTime()]);

  const format = (value: number) => value.toString().padStart(2, '0');

  return (
    <div className="countdown">
      <div className="countdown-heading">We are coming live in!!</div>
      <div className="countdown-grid">
        {([
          ['Days', timeLeft.days],
          ['Hours', timeLeft.hours],
          ['Minutes', timeLeft.minutes],
          ['Seconds', timeLeft.seconds],
        ] as const).map(([label, value]) => (
          <div key={label} className="countdown-cell">
            <div className="countdown-value">{format(value)}</div>
            <div className="countdown-label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

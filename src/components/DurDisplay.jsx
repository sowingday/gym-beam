import React from 'react';

/**
 * Displays a duration in seconds as "Xm YYs" with smaller m/s letters.
 * Uses font-body (Inter) for good readability.
 */
export default function DurDisplay({ seconds = 0, className = '' }) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;

  return (
    <span className={`tabular-nums ${className}`}>
      <span>{String(m).padStart(2, '0')}</span>
      <span className="text-[0.65em] opacity-70">m</span>
      {' '}
      <span>{String(sec).padStart(2, '0')}</span>
      <span className="text-[0.65em] opacity-70">s</span>
    </span>
  );
}
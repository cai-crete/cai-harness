'use client';

import type { Point } from '@/types/canvas';

interface InfiniteGridProps {
  zoom: number;
  offset: Point;
  theme?: 'light' | 'dark';
}

export function InfiniteGrid({ zoom, offset, theme = 'light' }: InfiniteGridProps) {
  const minor = 12 * (zoom / 100);
  const major = 60 * (zoom / 100);

  const lineColor = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const lineColorMajor = theme === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)';

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: [
          `linear-gradient(to right,  ${lineColorMajor} 1px, transparent 1px)`,
          `linear-gradient(to bottom, ${lineColorMajor} 1px, transparent 1px)`,
          `linear-gradient(to right,  ${lineColor} 1px, transparent 1px)`,
          `linear-gradient(to bottom, ${lineColor} 1px, transparent 1px)`,
        ].join(', '),
        backgroundSize: [
          `${major}px ${major}px`,
          `${major}px ${major}px`,
          `${minor}px ${minor}px`,
          `${minor}px ${minor}px`,
        ].join(', '),
        backgroundPosition: `calc(50% + ${offset.x}px) calc(50% + ${offset.y}px)`,
      }}
    />
  );
}

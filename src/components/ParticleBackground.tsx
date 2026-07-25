'use client';

import { useEffect, useRef } from 'react';

interface ParticleBackgroundProps {
  count?: number;
  className?: string;
}

export default function ParticleBackground({ count = 20, className = '' }: ParticleBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const particles = container.querySelectorAll('.particle');
    particles.forEach((particle) => {
      const el = particle as HTMLElement;
      el.style.left = `${Math.random() * 100}%`;
      el.style.top = `${Math.random() * 100}%`;
      el.style.animationDelay = `${Math.random() * -10}s`;
    });
  }, []);

  return (
    <div ref={containerRef} className={`particle-field ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="particle" />
      ))}
    </div>
  );
}

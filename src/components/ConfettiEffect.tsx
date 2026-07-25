'use client';

import { useEffect, useState } from 'react';

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  size: number;
  speed: number;
  delay: number;
  shape: 'square' | 'circle';
}

const LIGHT_COLORS = [
  '#FFD700', // Gold
  '#FFC0CB', // Pink
  '#E0E0E0', // Silver
  '#FFFFFF', // White
  '#C8E6C9', // Light green
  '#BBDEFB', // Light blue
  '#E1BEE7', // Light purple
  '#FFF9C4', // Light yellow
  '#FFCC80', // Light orange
  '#F8BBD0', // Light rose
];

interface ConfettiEffectProps {
  trigger: number;
  duration?: number;
}

export default function ConfettiEffect({ trigger, duration = 3000 }: ConfettiEffectProps) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    if (trigger === 0) {
      setParticles([]);
      return;
    }

    const newParticles: ConfettiParticle[] = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      color: LIGHT_COLORS[Math.floor(Math.random() * LIGHT_COLORS.length)],
      rotation: Math.random() * 360,
      size: 6 + Math.random() * 8,
      speed: 1 + Math.random() * 1.5,
      delay: Math.random() * 0.5,
      shape: Math.random() > 0.5 ? 'square' : 'circle',
    }));

    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
    }, duration);

    return () => clearTimeout(timer);
  }, [trigger, duration]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            animation: `confettiFall ${1.5 + p.speed}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${p.delay}s forwards`,
            boxShadow: `0 0 4px ${p.color}88`,
          }}
        />
      ))}
    </div>
  );
}

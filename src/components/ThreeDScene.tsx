'use client';

import { useEffect, useRef } from 'react';
import { Globe, DollarSign, Users, Sparkles } from 'lucide-react';

export default function ThreeDScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const cube = container.querySelector('.cube-3d') as HTMLElement;
      if (cube) {
        cube.style.transform = `rotateX(${y * -30}deg) rotateY(${x * 30}deg)`;
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    return () => container.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} className="scene-3d flex items-center justify-center">
      <div className="cube-3d">
        <div className="cube-face cube-face-front">
          <Globe className="w-8 h-8 text-[#8B5CF6]" />
        </div>
        <div className="cube-face cube-face-back">
          <DollarSign className="w-8 h-8 text-emerald-400" />
        </div>
        <div className="cube-face cube-face-right">
          <Sparkles className="w-8 h-8 text-yellow-400" />
        </div>
        <div className="cube-face cube-face-left">
          <Users className="w-8 h-8 text-blue-400" />
        </div>
        <div className="cube-face cube-face-top">
          <span className="text-2xl font-bold text-[#8B5CF6]">$</span>
        </div>
        <div className="cube-face cube-face-bottom">
          <span className="text-2xl font-bold text-emerald-400">✓</span>
        </div>
      </div>
    </div>
  );
}

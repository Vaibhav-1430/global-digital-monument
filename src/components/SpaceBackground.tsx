'use client';

import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
}

interface SpaceBackgroundProps {
  starsVisible?: boolean;
  starOpacity?: number;
}

export default function SpaceBackground({
  starsVisible = true,
  starOpacity = 1,
}: SpaceBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initStars();
    };

    window.addEventListener('resize', handleResize);

    // Subtle star count: around 120-180 stars for restrained cinematic feel
    const starCount = Math.floor(Math.min(180, Math.max(90, (width * height) / 14000)));
    let stars: Star[] = [];

    const starColors = [
      '#ffffff',
      '#f0f4ff',
      '#e2ecff',
      '#ffeec9', // subtle warm star
      '#7dd3fc', // subtle atmospheric azure
    ];

    function initStars() {
      stars = [];
      for (let i = 0; i < starCount; i++) {
        const sizeRand = Math.random();
        // Majority tiny distant dust, few closer stars
        const size = sizeRand > 0.92 ? 1.8 : sizeRand > 0.7 ? 1.2 : 0.8;
        const color = starColors[Math.floor(Math.random() * starColors.length)];
        const baseAlpha = 0.2 + Math.random() * 0.6;
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size,
          baseAlpha,
          twinkleSpeed: 0.005 + Math.random() * 0.015,
          twinklePhase: Math.random() * Math.PI * 2,
          color,
        });
      }
    }

    initStars();

    let time = 0;
    const render = () => {
      time += 1;
      ctx.clearRect(0, 0, width, height);

      // Deep space gradient backdrop
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        width * 0.1,
        width * 0.5,
        height * 0.45,
        Math.max(width, height)
      );
      bgGrad.addColorStop(0, '#04070F');
      bgGrad.addColorStop(0.5, '#030408');
      bgGrad.addColorStop(1, '#010204');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      if (starsVisible && starOpacity > 0.01) {
        for (const star of stars) {
          const currentTwinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
          const alpha = Math.max(0.05, Math.min(1, star.baseAlpha + currentTwinkle * 0.25)) * starOpacity;

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = star.color;

          // Subtle glow for larger stars
          if (star.size > 1.4) {
            ctx.shadowBlur = 4;
            ctx.shadowColor = star.color;
          }

          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [starsVisible, starOpacity]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}

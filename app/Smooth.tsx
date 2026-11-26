'use client';

import { useEffect } from 'react';
import Lenis from '@studio-freight/lenis';

/** Buttery page scrolling, the same feel as thejoietv.com. */
export default function Smooth({ paused }: { paused: boolean }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({
      lerp: 0.08,
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
    };
  }, []);

  // Stop the page scrolling behind a window that is open.
  useEffect(() => {
    const lenis = (window as unknown as { __lenis?: Lenis }).__lenis;
    if (!lenis) return;
    if (paused) lenis.stop();
    else lenis.start();
  }, [paused]);

  return null;
}

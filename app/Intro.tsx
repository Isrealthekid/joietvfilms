'use client';

import { useEffect, useState } from 'react';

const KEY = 'jtvf-intro-seen';
const SHOW_MS = 3200;

/**
 * A short logo reveal when the site opens: colour ribbons sweep through the Joie TV logo, it
 * settles to white, then zooms past the camera into the site. Shown once per visit.
 */
export default function Intro() {
  const [phase, setPhase] = useState<'show' | 'leave' | 'gone'>('show');

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === '1';
    } catch {}
    // ?intro in the address always replays it.
    if (new URLSearchParams(location.search).has('intro')) seen = false;
    if (seen) {
      setPhase('gone');
      return;
    }
    document.body.style.overflow = 'hidden';
    const leave = setTimeout(() => setPhase('leave'), SHOW_MS);
    const done = setTimeout(() => {
      try {
        sessionStorage.setItem(KEY, '1');
      } catch {}
      setPhase('gone');
      document.body.style.overflow = '';
    }, SHOW_MS + 700);
    return () => {
      clearTimeout(leave);
      clearTimeout(done);
      document.body.style.overflow = '';
    };
  }, []);

  if (phase === 'gone') return null;
  return (
    <div className={`nf-intro ${phase === 'leave' ? 'is-leaving' : ''}`} aria-hidden="true">
      <div className="nf-intro-stage">
        <div className="nf-intro-glow" />
        <div className="nf-intro-logo" />
      </div>
    </div>
  );
}

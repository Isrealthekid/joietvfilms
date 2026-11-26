'use client';

import { useEffect, useState } from 'react';

const KEY = 'jtvf-intro-seen';
const SHOW_MS = 2900; // colour ribbons sweep through the logo, then it holds for a moment
const FADE_MS = 900; // then the whole screen fades away

/**
 * A short logo reveal when the site opens: colour ribbons sweep through the Joie TV logo, it
 * settles to white, then everything fades gently into the site. Shown once per visit.
 */
export default function Intro({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'show' | 'leave' | 'gone'>('show');

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === '1';
    } catch {}
    // ?intro in the address always replays it.
    if (new URLSearchParams(location.search).has('intro')) seen = false;
    if (seen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('gone');
      onDone();
      return;
    }
    document.body.style.overflow = 'hidden';
    // The site starts appearing underneath while the intro fades.
    const leave = setTimeout(() => {
      setPhase('leave');
      onDone();
    }, SHOW_MS);
    const done = setTimeout(() => {
      try {
        sessionStorage.setItem(KEY, '1');
      } catch {}
      setPhase('gone');
      document.body.style.overflow = '';
    }, SHOW_MS + FADE_MS);
    return () => {
      clearTimeout(leave);
      clearTimeout(done);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Info, Play, X } from 'lucide-react';
import { fallbackMovies, type Movie } from '../lib/sample-films';
import { getPublicSupabase, isConfigured } from '../lib/supabase';
import { type Film, youtubeId } from '../lib/films';
import Intro from './Intro';
import './home.css';

const MAIN_SITE = 'https://thejoietv.com';

function toMovie(f: Film): Movie {
  return {
    id: f.id,
    title: f.title,
    subtitle: f.subtitle,
    genre: f.genre,
    year: String(f.release_year || ''),
    length: f.runtime_minutes ? `${f.runtime_minutes} min` : '',
    director: f.director,
    cast: f.cast_names.join(' · '),
    description: f.synopsis,
    image: f.poster_url,
    color: f.color,
    isNew: f.is_new,
    youtubeUrl: f.youtube_url,
  };
}

const isSoon = (m: Movie) => !m.youtubeUrl || !youtubeId(m.youtubeUrl);

export default function Home() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'offline'>(isConfigured ? 'loading' : 'offline');
  const [scrolled, setScrolled] = useState(false);
  const [details, setDetails] = useState<Movie | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const player = useRef<HTMLDialogElement>(null);

  // Load the published films, and refresh now and then so a new film appears without a reload.
  useEffect(() => {
    if (!isConfigured) return;
    let active = true;
    const db = getPublicSupabase();
    async function refresh() {
      try {
        const { data, error } = await db
          .from('films')
          .select('*')
          .eq('published', true)
          .order('sort_order')
          .order('id');
        if (!active) return;
        if (error) throw error;
        setMovies((data as Film[]).map(toMovie));
        setStatus('ready');
      } catch {
        if (active) setStatus((s) => (s === 'ready' ? s : 'offline'));
      }
    }
    void refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (video) player.current?.showModal();
    else player.current?.close();
  }, [video]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !video) setDetails(null);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = details ? 'hidden' : '';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [details, video]);

  const list = status === 'offline' && !movies.length ? fallbackMovies : movies;

  // The hero is the newest film that is still "coming soon", else the newest marked New, else the first.
  const hero = useMemo(() => {
    const soon = list.filter(isSoon);
    return soon[soon.length - 1] ?? list.find((m) => m.isNew) ?? list[0];
  }, [list]);

  const newRow = list.filter((m) => isSoon(m) || m.isNew);
  const genres = useMemo(() => {
    const by = new Map<string, Movie[]>();
    list.forEach((m) => {
      const g = m.genre || 'Films';
      by.set(g, [...(by.get(g) ?? []), m]);
    });
    return list.length > 6 ? [...by.entries()].filter(([, v]) => v.length >= 2) : [];
  }, [list]);

  const play = (m: Movie) => {
    const id = m.youtubeUrl ? youtubeId(m.youtubeUrl) : null;
    if (id) setVideo(id);
  };

  return (
    <main className="nf" id="top">
      <Intro />

      <header className={`nf-nav ${scrolled ? 'is-solid' : ''}`}>
        <div className="nf-nav-left">
          <a className="nf-logo" href="#top" aria-label="The Joie TV Films">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="The Joie TV" />
          </a>
          <nav className="nf-links" aria-label="Main navigation">
            <a className="is-active" href="#top">Films</a>
            <a href={`${MAIN_SITE}/work`}>Works</a>
            <a href={`${MAIN_SITE}/contact`}>Collaborate</a>
            <a href={`${MAIN_SITE}/contact`}>Contact</a>
          </nav>
        </div>
        <div className="nf-nav-right">
          <a href={MAIN_SITE}>thejoietv.com</a>
        </div>
      </header>

      {hero && <Hero movie={hero} onPlay={() => play(hero)} onInfo={() => setDetails(hero)} />}

      <div className="nf-rows">
        {status === 'loading' && !list.length && <p className="nf-empty">Loading films…</p>}
        {status === 'ready' && !list.length && <p className="nf-empty">New stories are on their way.</p>}
        {newRow.length > 0 && <Row title="New & Coming Soon" movies={newRow} onOpen={setDetails} />}
        {list.length > 0 && <Row title="All Films" movies={list} onOpen={setDetails} />}
        {genres.map(([genre, items]) => (
          <Row key={genre} title={genre} movies={items} onOpen={setDetails} />
        ))}
      </div>

      <footer className="nf-foot">
        <span>&copy; 2027 The Joie TV</span>
        <a href={MAIN_SITE}>thejoietv.com</a>
      </footer>

      {details && (
        <Details
          movie={details}
          onClose={() => setDetails(null)}
          onPlay={() => play(details)}
        />
      )}

      <dialog
        className="nf-player"
        ref={player}
        aria-label="Film player"
        onCancel={(e) => {
          e.preventDefault();
          setVideo(null);
        }}
        onClose={() => setVideo(null)}
      >
        <button className="nf-player-close" aria-label="Close video" onClick={() => setVideo(null)}>
          <X size={22} />
        </button>
        {video && (
          <>
            <iframe
              title="Film player"
              src={`https://www.youtube-nocookie.com/embed/${video}?autoplay=1`}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
            <a href={`https://www.youtube.com/watch?v=${video}`} target="_blank" rel="noreferrer">
              Watch on YouTube
            </a>
          </>
        )}
      </dialog>
    </main>
  );
}

/** A film's picture. Wide stills fill the space; tall posters are shown whole over a blurred copy. */
function Art({ movie, className }: { movie: Movie; className?: string }) {
  const [wide, setWide] = useState(!!movie.landscape);
  return (
    <>
      {!wide && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={`blur ${className ?? ''}`} src={movie.image} alt="" aria-hidden="true" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={movie.image}
        alt=""
        className={wide ? className : `poster ${className ?? ''}`}
        onLoad={(e) => setWide(e.currentTarget.naturalWidth > e.currentTarget.naturalHeight)}
      />
    </>
  );
}

function Hero({ movie, onPlay, onInfo }: { movie: Movie; onPlay: () => void; onInfo: () => void }) {
  const soon = isSoon(movie);
  const meta = [movie.year, movie.genre, movie.length].filter(Boolean);
  return (
    <section className="nf-hero" aria-label="Featured film">
      <div className="nf-hero-bg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={movie.landscape ? '' : 'blur'} src={movie.image} alt="" />
      </div>
      {!movie.landscape && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="nf-hero-poster" src={movie.image} alt={`${movie.title} poster`} />
      )}
      <div className="nf-hero-shade" />
      <div className="nf-hero-body">
        <span className={`nf-tag ${soon ? 'is-pink' : ''}`}>{soon ? 'Coming soon' : movie.isNew ? 'New' : 'Featured'}</span>
        <h1 className="nf-title">{movie.title}</h1>
        <div className="nf-meta">
          {meta.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
        {movie.description && <p className="nf-synopsis">{movie.description}</p>}
        <div className="nf-actions">
          {soon ? (
            <span className="nf-btn soon">Coming soon</span>
          ) : (
            <button className="nf-btn primary" onClick={onPlay}>
              <Play size={18} fill="currentColor" /> Play
            </button>
          )}
          <button className="nf-btn ghost" onClick={onInfo}>
            <Info size={18} /> More info
          </button>
        </div>
      </div>
    </section>
  );
}

function Row({ title, movies, onOpen }: { title: string; movies: Movie[]; onOpen: (m: Movie) => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const move = (dir: number) =>
    scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section className="nf-row" aria-label={title}>
      <h2>{title}</h2>
      <button className="nf-arrow left" aria-label={`${title}: scroll left`} onClick={() => move(-1)}>
        <ChevronLeft />
      </button>
      <div className="nf-scroller" ref={scroller}>
        {movies.map((m) => (
          <button
            key={`${title}-${m.id}`}
            className={`nf-card ${m.landscape ? 'wide' : ''}`}
            onClick={() => onOpen(m)}
            aria-label={`${m.title}${isSoon(m) ? ', coming soon' : ''}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.image} alt="" draggable={false} loading="lazy" />
            {isSoon(m) ? (
              <span className="nf-badge is-pink">Soon</span>
            ) : (
              m.isNew && <span className="nf-badge">New</span>
            )}
            <span className="nf-card-info">
              <span className="nf-card-title">{m.title}</span>
              {m.year && <span className="nf-card-sub">{[m.year, m.genre].filter(Boolean).join(' · ')}</span>}
            </span>
          </button>
        ))}
      </div>
      <button className="nf-arrow right" aria-label={`${title}: scroll right`} onClick={() => move(1)}>
        <ChevronRight />
      </button>
    </section>
  );
}

function Details({ movie, onClose, onPlay }: { movie: Movie; onClose: () => void; onPlay: () => void }) {
  const soon = isSoon(movie);
  const facts: [string, string][] = [
    ['Director', movie.director],
    ['Cast', movie.cast],
    ['Genre', movie.genre],
    ['Year', [movie.year, movie.length].filter(Boolean).join(' · ')],
  ];
  return (
    <div className="nf-modal" onClick={onClose} role="dialog" aria-modal="true" aria-label={movie.title}>
      <div className="nf-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="nf-sheet-top">
          <Art movie={movie} />
          <button className="nf-sheet-close" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
          <div className="nf-sheet-head">
            <h2>{movie.title}</h2>
            {soon ? (
              <span className="nf-btn soon">Coming soon</span>
            ) : (
              <button className="nf-btn primary" onClick={onPlay}>
                <Play size={18} fill="currentColor" /> Play
              </button>
            )}
          </div>
        </div>
        <div className="nf-sheet-body">
          <div>
            {movie.subtitle && <p style={{ marginBottom: 12, color: '#fff', fontWeight: 600 }}>{movie.subtitle}</p>}
            <p>{movie.description || 'More details soon.'}</p>
          </div>
          <dl className="nf-facts">
            {facts
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Info, Play, Volume2, VolumeX, X } from 'lucide-react';
import type { Movie } from '../lib/sample-films';
import { catalog } from '../lib/catalog';
import { youtubeId } from '../lib/films';
import Intro from './Intro';
import Smooth from './Smooth';
import './home.css';

const MAIN_SITE = 'https://thejoietv.com';

const isSoon = (m: Movie) => !m.youtubeUrl || !youtubeId(m.youtubeUrl);

export default function Home() {
  const list = catalog;
  const [ready, setReady] = useState(false); // becomes true as the intro finishes
  const [scrolled, setScrolled] = useState(false);
  const [details, setDetails] = useState<Movie | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const player = useRef<HTMLDialogElement>(null);

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
    return () => window.removeEventListener('keydown', onKey);
  }, [video]);

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

  const windowOpen = !!details || !!video;

  return (
    <main className={`nf ${ready ? 'is-ready' : ''}`} id="top">
      <Intro onDone={() => setReady(true)} />
      <Smooth paused={windowOpen} />

      <header className={`nf-nav ${scrolled ? 'is-solid' : ''}`}>
        <div className="nf-nav-left">
          <a className="nf-logo" href="#top" aria-label="The Joie TV Films">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="The Joie TV" />
          </a>
          <nav className="nf-links" aria-label="Main navigation">
            <a className="is-active" href="#top">Films</a>
            <a href={`${MAIN_SITE}/work`}>Works</a>
            <a href={`${MAIN_SITE}/contact`}>Contact</a>
          </nav>
        </div>
        <div className="nf-nav-right">
          <a href={MAIN_SITE}>thejoietv.com</a>
        </div>
      </header>

      {hero && (
        <Hero
          movie={hero}
          videoOn={ready && !windowOpen}
          onPlay={() => play(hero)}
          onInfo={() => setDetails(hero)}
        />
      )}

      <div className="nf-rows">
        {!list.length && <p className="nf-empty">New stories are on their way.</p>}
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
        <Details movie={details} onClose={() => setDetails(null)} onPlay={() => play(details)} />
      )}

      <dialog
        className="nf-player"
        ref={player}
        data-lenis-prevent
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

/**
 * A picture that fades in once it has loaded, with a little colour shimmer while it waits. If it is
 * tall or square it sits whole over a blurred copy of itself, so every card keeps the same shape.
 */
function Pic({
  src,
  className,
  fit = true,
  onShape,
}: {
  src: string;
  className?: string;
  fit?: boolean;
  onShape?: (wide: boolean) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [tall, setTall] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const seen = (img: HTMLImageElement) => {
    const wide = img.naturalWidth >= img.naturalHeight * 1.2;
    setTall(!wide);
    setLoaded(true);
    onShape?.(wide);
  };
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth) seen(img);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);
  return (
    <>
      {fit && tall && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="nf-pic is-loaded blur-bg" src={src} alt="" aria-hidden="true" draggable={false} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        src={src}
        alt=""
        draggable={false}
        className={`${className ?? ''} nf-pic ${loaded ? 'is-loaded' : ''} ${fit && tall ? 'contain' : ''}`}
        onLoad={(e) => seen(e.currentTarget)}
      />
    </>
  );
}

/** A film's picture for the details window. Wide stills fill it; tall posters sit whole over a blurred copy. */
function Art({ movie }: { movie: Movie }) {
  const [wide, setWide] = useState(!!movie.landscape);
  return (
    <>
      {!wide && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="blur" src={movie.image} alt="" aria-hidden="true" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={movie.image}
        alt=""
        className={wide ? undefined : 'poster'}
        onLoad={(e) => setWide(e.currentTarget.naturalWidth > e.currentTarget.naturalHeight)}
      />
    </>
  );
}

/** The hero film plays silently behind the text, with a button for sound. */
function HeroVideo({ id }: { id: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [shown, setShown] = useState(false);
  const [muted, setMuted] = useState(true);

  const send = (func: string) =>
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');

  return (
    <>
      <div className={`nf-hero-video ${shown ? 'is-shown' : ''}`} aria-hidden="true">
        <iframe
          ref={frame}
          title=""
          tabIndex={-1}
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&playsinline=1&modestbranding=1&rel=0&disablekb=1&iv_load_policy=3&enablejsapi=1`}
          allow="autoplay; encrypted-media"
          // The player paints black until the video starts, so it only fades in a moment after loading.
          onLoad={() => setTimeout(() => setShown(true), 1800)}
        />
      </div>
      {shown && (
        <button
          className="nf-sound"
          aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
          onClick={() => {
            send(muted ? 'unMute' : 'mute');
            if (muted) send('setVolume');
            setMuted(!muted);
          }}
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      )}
    </>
  );
}

function Hero({
  movie,
  videoOn,
  onPlay,
  onInfo,
}: {
  movie: Movie;
  videoOn: boolean;
  onPlay: () => void;
  onInfo: () => void;
}) {
  const soon = isSoon(movie);
  const meta = [movie.year, movie.length, movie.genre].filter(Boolean);
  const id = movie.youtubeUrl ? youtubeId(movie.youtubeUrl) : null;
  const section = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(true);
  const [wide, setWide] = useState(true);

  // Only play while the hero is on screen.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="nf-hero" aria-label="Featured film" ref={section}>
      <div className="nf-hero-bg">
        <Pic src={movie.image} className={wide ? '' : 'blur'} fit={false} onShape={setWide} />
      </div>
      {id && videoOn && inView && <HeroVideo id={id} />}
      {!wide && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="nf-hero-poster" src={movie.image} alt={`${movie.title} poster`} />
      )}
      <div className="nf-hero-shade" />
      <div className="nf-hero-body">
        <span className={`nf-tag nf-in ${soon ? 'is-pink' : ''}`} style={{ ['--d' as string]: '0ms' }}>
          {soon ? (movie.releaseDate ? `Coming ${movie.releaseDate}` : 'Coming soon') : movie.isNew ? 'New' : 'Featured'}
        </span>
        <h1 className="nf-title nf-in" style={{ ['--d' as string]: '90ms' }}>
          {movie.title}
        </h1>
        <div className="nf-meta nf-in" style={{ ['--d' as string]: '180ms' }}>
          {movie.rating && <span className="nf-rating">{movie.rating}</span>}
          {meta.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
        {movie.description && (
          <p className="nf-synopsis nf-in" style={{ ['--d' as string]: '260ms' }}>
            {movie.description}
          </p>
        )}
        <div className="nf-actions nf-in" style={{ ['--d' as string]: '340ms' }}>
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
  const section = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Slides up softly when it scrolls into view.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('is-in');
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const move = (dir: number) =>
    scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <section className="nf-row" aria-label={title} ref={section}>
      <h2>{title}</h2>
      <button className="nf-arrow left" aria-label={`${title}: scroll left`} onClick={() => move(-1)}>
        <ChevronLeft />
      </button>
      <div className="nf-scroller" ref={scroller} data-lenis-prevent-wheel>
        {movies.map((m, i) => (
          <button
            key={`${title}-${m.id}`}
            className="nf-card wide"
            style={{ ['--i' as string]: i }}
            onClick={() => onOpen(m)}
            aria-label={`${m.title}${isSoon(m) ? ', coming soon' : ''}`}
          >
            <Pic src={m.image} />
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
    ['Writer', movie.writer ?? ''],
    ['Producer', movie.producer ?? ''],
    ['Genre', movie.genre],
    ['Language', movie.language ?? ''],
    ['Year', [movie.year, movie.length].filter(Boolean).join(' · ')],
    ['Release', soon ? movie.releaseDate ?? '' : ''],
  ];
  return (
    <div
      className="nf-modal"
      data-lenis-prevent
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={movie.title}
    >
      <div className="nf-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="nf-sheet-top">
          <Art movie={movie} />
          <button className="nf-sheet-close" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
          <div className="nf-sheet-head">
            <h2>{movie.title}</h2>
            <div className="nf-meta">
              {movie.rating && <span className="nf-rating">{movie.rating}</span>}
              {[movie.year, movie.length, movie.genre].filter(Boolean).map((x, i) => (
                <span key={i}>{x}</span>
              ))}
            </div>
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
            {movie.tags && (
              <p className="nf-tags">
                <span>This film is:</span> {movie.tags}
              </p>
            )}
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

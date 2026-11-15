'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play, X } from 'lucide-react';
import { sampleMovies, type Movie } from '../lib/sample-films';
import { getPublicSupabase, isConfigured } from '../lib/supabase';
import { type Film, youtubeId } from '../lib/films';

export default function Home() {
  const [movies, setMovies] = useState<Movie[]>(isConfigured ? [] : sampleMovies);
  const [galleryError, setGalleryError] = useState('');
  const [loadingFilms, setLoadingFilms] = useState(isConfigured);
  const [video, setVideo] = useState<string | null>(null);
  const player = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!isConfigured) return;
    let active = true;
    const db = getPublicSupabase();
    async function refresh() {
      const {data,error} = await db.from('films').select('*').eq('published',true).order('sort_order').order('id');
      if (!active) return;
      setLoadingFilms(false);
      if(error) { setGalleryError('The gallery could not be loaded. Please try again.'); return; }
      setGalleryError('');
      setMovies((data as Film[]).map(f=>({id:f.id,title:f.title,subtitle:f.subtitle,genre:f.genre,year:String(f.release_year||''),length:f.runtime_minutes ? `${f.runtime_minutes} min` : '',director:f.director,cast:f.cast_names.join(' · '),description:f.synopsis,image:f.poster_url,color:f.color,isNew:f.is_new,youtubeUrl:f.youtube_url,posterArtwork:true})));
    }
    void refresh();
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 60000);
    const onFocus = () => void refresh();
    window.addEventListener('focus',onFocus);
    return () => {active=false;clearInterval(interval);window.removeEventListener('focus',onFocus);};
  }, []);
  useEffect(() => { if(video) player.current?.showModal(); else player.current?.close(); }, [video]);
  const [selected, setSelected] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const frames = useRef<(HTMLDivElement | null)[]>([]);
  const closeButton = useRef<HTMLButtonElement>(null);
  const phase = useRef(0);
  const activeFrame = useRef(0);
  const slide = useRef<{ from: number; to: number; start: number } | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const frameStep = viewportWidth <= 600 ? 226 : 268;
  const copies = movies.length > 1 ? Math.max(1, Math.ceil((viewportWidth + frameStep * 2) / (movies.length * frameStep))) : 1;
  const displayedMovies = Array.from({ length: copies }, () => movies).flat();
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setViewportWidth(entry.contentRect.width));
    if (stage.current) observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  const stopped = useRef(false);
  const returning = useRef(0);
  const drag = useRef<{ id: number; startX: number; startPhase: number; moved: boolean } | null>(null);
  const suppressClickUntil = useRef(0);
  const movie = movies.find(m => m.id === selected);
  stopped.current = selected !== null || paused;
  useEffect(() => {
    if (selected !== null && !movies.some(film => film.id === selected)) { setSelected(null); setVideo(null); }
  }, [movies, selected]);

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let request = 0;
    let previous = 0;
    function tick(time: number) {
      const width = stage.current?.clientWidth || innerWidth;
      const gap = frameStep;
      const cycle = gap * Math.max(1, displayedMovies.length);
      const elapsed = previous ? Math.min(time - previous, 50) : 0;
      previous = time;
      if (slide.current) {
        const progress = reduced.matches ? 1 : Math.min((time - slide.current.start) / 450, 1);
        phase.current = slide.current.from + (slide.current.to - slide.current.from) * (1 - Math.pow(1 - progress, 3));
        if (progress === 1) slide.current = null;
      }
      if (!slide.current && movies.length > 1 && !stopped.current && !drag.current && !reduced.matches && time > returning.current && !stage.current?.matches(':hover, :focus-within')) phase.current += elapsed * .025;
      frames.current.forEach((frame, index) => {
        const x = movies.length === 1 ? width / 2 : ((index * gap - phase.current + gap) % cycle + cycle) % cycle - gap;
        frame?.style.setProperty('--x', `${x}px`);
      });
      request = requestAnimationFrame(tick);
    }
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [movies, frameStep, displayedMovies.length]);

  function close() {
    setSelected(null);
    setIsReturning(true);
    returning.current = performance.now() + 3000;
    if (selected !== null) frames.current[activeFrame.current]?.querySelector('button')?.focus({preventScroll:true});
  }
  useEffect(() => {
    if (selected !== null) closeButton.current?.focus({preventScroll:true});
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !video) { setSelected(null); setIsReturning(true); returning.current = performance.now() + 3000; if (selected !== null) frames.current[activeFrame.current]?.querySelector('button')?.focus({preventScroll:true}); } };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [selected, video, movies]);

  useEffect(() => { if (!isReturning) return; const timer = setTimeout(() => setIsReturning(false), 3000); return () => clearTimeout(timer); }, [isReturning]);

  function reveal(index: number) {
    if (selected !== null || drag.current) return;
    const rect = frames.current[index]?.getBoundingClientRect();
    if (rect && (rect.left < 0 || rect.right > innerWidth)) {
      const gap = frameStep;
      slide.current = null;
      phase.current = index * gap - innerWidth / 2;
    }
  }

  function scrollGallery(direction: number) {
    if (selected !== null || isReturning || movies.length < 2) return;
    slide.current = { from: phase.current, to: (slide.current?.to ?? phase.current) + frameStep * direction, start: performance.now() };
    returning.current = performance.now() + 1600;
  }

  function startDrag(event: PointerEvent<HTMLElement>) {
    if (selected !== null || isReturning || !event.isPrimary || event.button !== 0) return;
    slide.current = null;
    suppressClickUntil.current = 0;
    drag.current = { id: event.pointerId, startX: event.clientX, startPhase: phase.current, moved: false };
  }

  function moveDrag(event: PointerEvent<HTMLElement>) {
    const gesture = drag.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    const distance = event.clientX - gesture.startX;
    if (!gesture.moved && Math.abs(distance) < 6) return;
    gesture.moved = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add('is-dragging');
    phase.current = gesture.startPhase - distance;
  }

  function endDrag(event: PointerEvent<HTMLElement>) {
    if (drag.current?.id !== event.pointerId) return;
    if (drag.current.moved) suppressClickUntil.current = performance.now() + 500;
    drag.current = null;
    event.currentTarget.classList.remove('is-dragging');
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return <main className={`exhibition ${movie ? 'is-focused' : ''} ${isReturning ? 'is-returning' : ''}`}>
    <div className="wall-grain"/>
    <nav className="text-nav" aria-label="Main navigation">
      <div><button onClick={close}>Films</button><span aria-hidden="true">—</span><span>Works</span></div>
      <div><span>Collaborate</span><span aria-hidden="true">—</span><span>Contact</span></div>
    </nav>
    <section ref={stage} className="gallery-stage" aria-label="Film gallery" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={event => { if (event.target === event.currentTarget) endDrag(event); }} onPointerLeave={event => { if (!drag.current?.moved) endDrag(event); }} onClickCapture={event => {
      if (performance.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation(); }
    }} onKeyDown={event => {
      if (selected !== null || isReturning || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      scrollGallery(event.key === 'ArrowRight' ? 1 : -1);
    }}>
      {!movies.length && <div className="gallery-empty" role="status">{loadingFilms ? 'Loading films…' : galleryError || 'New stories are on their way.'}{galleryError && <button onClick={()=>window.location.reload()}>Try again</button>}</div>}
      {displayedMovies.map((m, index) => <div ref={el => { frames.current[index] = el; }} key={`${m.id}-${index}`} className={`artwork ${selected === m.id && activeFrame.current === index ? 'selected' : ''} ${movie && activeFrame.current !== index ? 'unselected' : ''}`} style={{'--x': `${index * frameStep}px`, '--poster-color': m.color} as React.CSSProperties}>
        <button className="frame-button" aria-label={`Explore ${m.title}`} aria-describedby={m.isNew ? `new-film-${m.id}-${index}` : undefined} aria-expanded={selected === m.id && activeFrame.current === index} tabIndex={movie || index >= movies.length ? -1 : 0} onFocus={() => reveal(index)} onClick={() => { activeFrame.current = index; slide.current = null; setSelected(m.id); }}>
          {m.isNew && <span className="new-ribbon" id={`new-film-${m.id}-${index}`}><span><i aria-hidden="true">★</i> NEW</span></span>}
          <div className="frame"><div className="frame-inner"><div className="poster"><img src={m.image} alt="" draggable={false}/>{!m.posterArtwork && <><div className="poster-shade"/><span className="poster-credit">A FILM BY {m.director.toUpperCase()}</span><div className="poster-title">{m.title.split(' ').map((word, i) => <span key={i}>{word} </span>)}</div><span className="poster-subtitle">{m.subtitle}</span><span className="poster-bottom">JTVF ORIGINAL PICTURES<br/><small>A STORY WORTH TELLING</small></span></>}</div></div></div>
        </button>
      </div>)}
      <div className={`film-details ${movie ? 'visible' : ''}`} aria-hidden={!movie}>
        {movie && <><button ref={closeButton} className="back-button" onClick={close} aria-label="Back to films"><ArrowLeft size={20}/></button><h1>{movie.title.toLowerCase()}</h1><p className="synopsis">{movie.description}</p><dl><dt>Cast</dt><dd>{movie.cast}</dd></dl>{movie.youtubeUrl && youtubeId(movie.youtubeUrl) && <button className="play-film" onClick={()=>setVideo(youtubeId(movie.youtubeUrl!))}><Play size={16} fill="currentColor"/> Play film</button>}</>}
      </div>
    </section>
    {!movie && movies.length > 1 && <div className="gallery-arrows" role="group" aria-label="Gallery scrolling">
      <button aria-label="Scroll gallery left" disabled={isReturning} onClick={() => scrollGallery(-1)}><ArrowLeft size={22}/></button>
      <button aria-label="Scroll gallery right" disabled={isReturning} onClick={() => scrollGallery(1)}><ArrowRight size={22}/></button>
    </div>}
    {!movie && movies.length > 0 && <button className="motion-control" aria-label={paused ? 'Play gallery' : 'Pause gallery'} onClick={() => setPaused(!paused)}>{paused ? <Play size={16}/> : <Pause size={16}/>}</button>}
    <dialog className="video-dialog" ref={player} aria-label="Film player" onCancel={event=>{event.preventDefault();setVideo(null);}} onClose={()=>setVideo(null)}><button className="close-video" aria-label="Close video" onClick={()=>setVideo(null)}><X size={24}/></button>{video && <><iframe title="YouTube film player" src={`https://www.youtube-nocookie.com/embed/${video}?autoplay=1`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/><a href={`https://www.youtube.com/watch?v=${video}`} target="_blank" rel="noreferrer">Watch on YouTube</a></>}</dialog>
  </main>;
}


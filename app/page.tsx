'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Pause, Play } from 'lucide-react';

type Movie = { id: number; title: string; subtitle: string; genre: string; year: string; length: string; director: string; cast: string; description: string; image: string; color: string };
const movies: Movie[] = [
  { id: 1, title: 'THE LAST LIGHT', subtitle: 'Some journeys lead you home.', genre: 'Drama', year: '2025', length: '1h 48m', director: 'Amara Okafor', cast: 'Ada Nwosu · Daniel Cole · Femi Ajayi', description: 'Returning to the coast after years away, a young photographer finds an unfinished roll of film. As the images reveal a summer she barely remembers, she begins to see her family—and herself—in a different light.', image: '/posters/coast.jpg', color: '#b5bda8' },
  { id: 2, title: 'AFTER HOURS', subtitle: 'The city has a story to tell.', genre: 'Thriller', year: '2024', length: '1h 56m', director: 'Elias Morgan', cast: 'James Ade · Zara Bello · Oliver Reed', description: 'One missed train. One unexpected encounter. A quiet musician is drawn into a night that winds through the hidden corners of a restless city, where every stranger seems to know more than they should.', image: '/posters/city.jpg', color: '#a9b7b1' },
  { id: 3, title: 'WILD AT HEART', subtitle: 'Find yourself somewhere lost.', genre: 'Adventure', year: '2025', length: '2h 06m', director: 'Nia Campbell', cast: 'Maya Ellis · Kofi Mensah · Lena James', description: 'Two estranged sisters set out across an unfamiliar wilderness with a hand-drawn map and a promise to keep. Far from the lives they built, they discover that the longest distance is sometimes the one between two people.', image: '/posters/forest.jpg', color: '#b8c6a2' },
  { id: 4, title: 'A QUIET EARTH', subtitle: 'Everything leaves an echo.', genre: 'Drama', year: '2025', length: '1h 42m', director: 'Tomi Adebayo', cast: 'Ife Lawson · Samuel Obi · Ruth Williams', description: 'In a remote mountain village, a sound recordist arrives to document a landscape on the verge of change. An unlikely friendship with a local gardener teaches her to listen for the things that cannot be recorded.', image: '/posters/mountain.jpg', color: '#d2c9a7' },
  { id: 5, title: 'BLUE HOURS', subtitle: 'Between goodbye and tomorrow.', genre: 'Romance', year: '2024', length: '1h 38m', director: 'Sofia Laurent', cast: 'Chloe Martin · Alex Okeke · Eva Laurent', description: 'On the last evening of a summer by the sea, two old friends take the long way home. Across empty beaches and sleeping streets, a conversation years in the making finally begins.', image: '/posters/ocean.jpg', color: '#b5c9d2' },
  { id: 6, title: 'SUN CHILD', subtitle: 'A little courage goes a long way.', genre: 'Adventure', year: '2025', length: '1h 52m', director: 'Malik Johnson', cast: 'Noah Banks · Aisha Cole · Ben Thomas', description: 'Armed with a borrowed bicycle and an impossible plan, a young dreamer crosses the sun-scorched countryside to reach a once-in-a-lifetime festival. Along the way, strangers become a family of their own.', image: '/posters/desert.jpg', color: '#e4c390' },
  { id: 7, title: 'STILL HERE', subtitle: 'Ordinary lives. Extraordinary love.', genre: 'Documentary', year: '2024', length: '1h 24m', director: 'Grace Eze', cast: 'An ensemble of everyday storytellers', description: 'A lyrical portrait of a neighbourhood told through the people who have called it home for generations. Their small rituals, shared meals, and enduring friendships become a celebration of belonging.', image: '/posters/home.jpg', color: '#d9c4ad' },
];

export default function Home() {
  const [selected, setSelected] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const frames = useRef<(HTMLDivElement | null)[]>([]);
  const closeButton = useRef<HTMLButtonElement>(null);
  const phase = useRef(0);
  const stopped = useRef(false);
  const returning = useRef(0);
  const movie = movies.find(m => m.id === selected);
  stopped.current = selected !== null || paused;

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let request = 0;
    let previous = 0;
    function tick(time: number) {
      const width = stage.current?.clientWidth || innerWidth;
      const gap = Math.max(width < 600 ? 245 : 300, width / 5);
      const cycle = gap * movies.length;
      const elapsed = previous ? Math.min(time - previous, 50) : 0;
      previous = time;
      if (!stopped.current && !reduced.matches && time > returning.current && !stage.current?.matches(':hover, :focus-within')) phase.current += elapsed * .025;
      frames.current.forEach((frame, index) => {
        const x = ((index * gap - phase.current + gap) % cycle + cycle) % cycle - gap;
        frame?.style.setProperty('--x', `${x}px`);
      });
      request = requestAnimationFrame(tick);
    }
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, []);

  function close() {
    setSelected(null);
    setIsReturning(true);
    returning.current = performance.now() + 3000;
    if (selected !== null) frames.current[selected - 1]?.querySelector('button')?.focus({preventScroll:true});
  }
  useEffect(() => {
    if (selected !== null) closeButton.current?.focus({preventScroll:true});
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSelected(null); setIsReturning(true); returning.current = performance.now() + 3000; if (selected !== null) frames.current[selected - 1]?.querySelector('button')?.focus({preventScroll:true}); } };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [selected]);

  useEffect(() => { if (!isReturning) return; const timer = setTimeout(() => setIsReturning(false), 3000); return () => clearTimeout(timer); }, [isReturning]);

  function reveal(index: number) {
    if (selected !== null) return;
    const rect = frames.current[index]?.getBoundingClientRect();
    if (rect && (rect.left < 0 || rect.right > innerWidth)) {
      const gap = Math.max(innerWidth < 600 ? 245 : 300, innerWidth / 5);
      phase.current = index * gap - innerWidth / 2;
    }
  }

  return <main className={`exhibition ${movie ? 'is-focused' : ''} ${isReturning ? 'is-returning' : ''}`}>
    <div className="wall-grain"/>
    <nav className="text-nav" aria-label="Main navigation">
      <div><button onClick={close}>Films</button><span aria-hidden="true">—</span><span>Works</span></div>
      <div><span>Collaborate</span><span aria-hidden="true">—</span><span>Contact</span></div>
    </nav>
    <section ref={stage} className="gallery-stage" aria-label="Film gallery">
      {movies.map((m, index) => <div ref={el => { frames.current[index] = el; }} key={m.id} className={`artwork ${selected === m.id ? 'selected' : ''} ${movie && selected !== m.id ? 'unselected' : ''}`} style={{'--x': `${index * 300}px`, '--poster-color': m.color} as React.CSSProperties}>
        <button className="frame-button" aria-label={`Explore ${m.title}`} aria-expanded={selected === m.id} tabIndex={movie ? -1 : 0} onFocus={() => reveal(index)} onClick={() => setSelected(m.id)}>
          <div className="frame"><div className="frame-inner"><div className="poster"><img src={m.image} alt="" draggable={false}/><div className="poster-shade"/><span className="poster-credit">A FILM BY {m.director.toUpperCase()}</span><div className="poster-title">{m.title.split(' ').map((word, i) => <span key={i}>{word} </span>)}</div><span className="poster-subtitle">{m.subtitle}</span><span className="poster-bottom">JTVF ORIGINAL PICTURES<br/><small>A STORY WORTH TELLING</small></span></div></div></div>
        </button>
      </div>)}
      <div className={`film-details ${movie ? 'visible' : ''}`} aria-hidden={!movie}>
        {movie && <><button ref={closeButton} className="back-button" onClick={close} aria-label="Back to films"><ArrowLeft size={20}/></button><h1>{movie.title.toLowerCase()}</h1><p className="synopsis">{movie.description}</p><dl><dt>Cast</dt><dd>{movie.cast}</dd></dl></>}
      </div>
    </section>
    {!movie && <button className="motion-control" aria-label={paused ? 'Play gallery' : 'Pause gallery'} onClick={() => setPaused(!paused)}>{paused ? <Play size={16}/> : <Pause size={16}/>}</button>}
  </main>;
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, Check, ChevronDown, Film, Search, X } from 'lucide-react';

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
  const [center, setCenter] = useState(3);
  const [genre, setGenre] = useState('All films');
  const [tab, setTab] = useState('The gallery');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [saved, setSaved] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const frameRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  useEffect(() => { try { const value: unknown = JSON.parse(localStorage.getItem('jtvf-list') || '[]'); if (Array.isArray(value)) setSaved(value.filter((id): id is number => typeof id === 'number')); } catch {} setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem('jtvf-list', JSON.stringify(saved)); }, [saved, ready]);
  function close() { const id = selected; setSelected(null); if (id) frameRefs.current[id]?.focus(); }
  useEffect(() => { if (selected !== null) closeRef.current?.focus(); const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setSelected(null); if (selected) frameRefs.current[selected]?.focus(); } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [selected]);
  const filtered = movies.filter(m => (genre === 'All films' || m.genre === genre) && (tab !== 'My collection' || saved.includes(m.id)) && `${m.title} ${m.director} ${m.cast}`.toLowerCase().includes(query.toLowerCase()));
  const activeCenter = Math.min(center, Math.max(0, filtered.length - 1));
  const movie = movies.find(m => m.id === selected);
  function changeTab(value: string) { setTab(value); setSelected(null); setCenter(3); }
  function toggleSave(id: number) { setSaved(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); }
  return <main>
    <header className="header">
      <a className="brand" href="/" aria-label="JTVF home">JTVF<span>THE FILM GALLERY</span></a>
      <nav aria-label="Main navigation">{['The gallery', 'My collection'].map(t => <button key={t} className={tab === t ? 'nav-active' : ''} onClick={() => changeTab(t)}>{t}{t === 'My collection' && saved.length > 0 && <span className="count">{saved.length}</span>}</button>)}</nav>
      <div className="header-right"><span className="curated"><span/> A space for great cinema</span><button className="icon-button" aria-label={searchOpen ? 'Close search' : 'Search films'} onClick={() => { setSearchOpen(!searchOpen); setQuery(''); setSelected(null); }}>{searchOpen ? <X size={19}/> : <Search size={19}/>}</button></div>
    </header>
    {searchOpen && <div className="search-bar"><Search size={18}/><input autoFocus placeholder="Search films, cast, or directors…" aria-label="Search films" value={query} onChange={e => { setQuery(e.target.value); setSelected(null); }}/></div>}
    <section className={`exhibition ${selected !== null ? 'is-focused' : ''}`} aria-label="Interactive film exhibition">
      <div className="wall-grain"/>
      <div className="intro"><div className="eyebrow"><span/> THE JTVF COLLECTION <span/></div><h1>Every frame.<br className="mobile-break"/> A different world.</h1><p>A collection of stories, beautifully told. Step closer to find yours.</p></div>
      <div className="gallery-tools"><span className="room-label">EXHIBITION 001 <span>—</span> THE ART OF CINEMA</span><label className="genre-select"><select aria-label="Filter by genre" value={genre} onChange={e => { setGenre(e.target.value); setSelected(null); setCenter(2); }}>{['All films', 'Drama', 'Thriller', 'Adventure', 'Romance', 'Documentary'].map(g => <option key={g}>{g}</option>)}</select><ChevronDown size={13}/></label></div>
      <div className="gallery-stage">
        <div className="wall-moulding"/>
        {filtered.map((m, index) => { const offset = index - activeCenter; const isSelected = selected === m.id; return <div key={m.id} className={`artwork ${isSelected ? 'selected' : ''} ${selected !== null && !isSelected ? 'unselected' : ''}`} style={{ '--offset': offset, '--angle': `${offset * -3}deg`, '--poster-color': m.color } as React.CSSProperties}>
          <button ref={el => { frameRefs.current[m.id] = el; }} className="frame-button" aria-label={`Explore ${m.title}`} aria-expanded={isSelected} tabIndex={selected !== null ? -1 : 0} onClick={() => setSelected(m.id)}>
            <div className="frame"><div className="frame-inner"><div className="poster"><img src={m.image} alt="" draggable={false}/><div className="poster-shade"/><span className="poster-credit">A FILM BY {m.director.toUpperCase()}</span><div className="poster-title">{m.title.split(' ').map((word, i) => <span key={i}>{word} </span>)}</div><span className="poster-subtitle">{m.subtitle}</span><span className="poster-bottom">JTVF ORIGINAL PICTURES<br/><small>A STORY WORTH TELLING</small></span></div></div></div>
          </button>
          <div className="plaque"><span>{String(m.id).padStart(2, '0')}</span><div><h2>{m.title}</h2><p>{m.year} <i/> {m.genre}</p></div></div>
        </div>; })}
        {filtered.length === 0 && <div className="empty"><Film size={28}/><h2>{tab === 'My collection' ? 'Your own little film gallery.' : 'No films found.'}</h2><p>{tab === 'My collection' ? 'Open a film and save it to your collection.' : 'Try another title or genre.'}</p><button onClick={() => { changeTab('The gallery'); setGenre('All films'); setQuery(''); }}>Explore all films <ArrowRight size={16}/></button></div>}
        <div className={`film-details ${movie ? 'visible' : ''}`} aria-hidden={!movie}>
          {movie && <><button ref={closeRef} className="back-button" onClick={close}><ArrowLeft size={15}/> Back to the gallery</button><span className="detail-label">A CLOSER LOOK / {String(movie.id).padStart(2, '0')}</span><h2>{movie.title.toLowerCase()}</h2><div className="movie-meta">{movie.year}<i/>{movie.genre}<i/>{movie.length}</div><p className="synopsis">{movie.description}</p><dl><div><dt>DIRECTED BY</dt><dd>{movie.director}</dd></div><div><dt>STARRING</dt><dd>{movie.cast}</dd></div></dl><button className="save-button" onClick={() => toggleSave(movie.id)}>{saved.includes(movie.id) ? <Check size={17}/> : <Bookmark size={17}/>} {saved.includes(movie.id) ? 'In your collection' : 'Add to my collection'}</button></>}
        </div>
      </div>
      <div className="gallery-bottom"><span className="explore-hint"><span className="tiny-frame"/> Select a frame. Discover a story.</span><div className="pagination"><button aria-label="Previous film" disabled={activeCenter === 0 || selected !== null} onClick={() => setCenter(activeCenter - 1)}><ArrowLeft size={18}/></button><span>{filtered.length ? String(activeCenter + 1).padStart(2, '0') : '00'} <i>/ {String(filtered.length).padStart(2, '0')}</i></span><button aria-label="Next film" disabled={activeCenter >= filtered.length - 1 || selected !== null} onClick={() => setCenter(activeCenter + 1)}><ArrowRight size={18}/></button></div><span className="gallery-note">CURATED WITH INTENTION. <span>WATCHED WITH FEELING.</span></span></div>
      <div className="floor"/>
    </section>
    <footer><span className="footer-mark">Good films deserve a good frame.</span><span>INDEPENDENT SPIRITS. UNFORGETTABLE STORIES.</span><span>© {new Date().getFullYear()} JTVF <span className="sample-note">· Sample film exhibition</span></span></footer>
  </main>;
}

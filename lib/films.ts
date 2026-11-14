export type Film = {
  id: number;
  title: string;
  subtitle: string;
  genre: string;
  release_year: number | null;
  runtime_minutes: number | null;
  director: string;
  cast_names: string[];
  synopsis: string;
  youtube_url: string;
  poster_url: string;
  poster_key: string;
  color: string;
  is_new: boolean;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type FilmInput = Omit<Film, 'id' | 'created_at' | 'updated_at'>;
export const emptyFilm: FilmInput = {
  title: '', subtitle: '', genre: 'Drama', release_year: new Date().getFullYear(),
  runtime_minutes: null, director: '', cast_names: [], synopsis: '', youtube_url: '', poster_url: '',
  poster_key: '', color: '#e8d9b7', is_new: false, published: false, sort_order: 0,
};

export function validateFilm(film: FilmInput): string | null {
  if (!film.title.trim() || film.title.trim().length > 160) return 'Enter a title of up to 160 characters.';
  if (film.synopsis.length > 4000) return 'Keep the synopsis under 4,000 characters.';
  if (film.subtitle.length > 240 || film.director.length > 160 || film.genre.length > 80) return 'One of the text fields is too long.';
  if (film.cast_names.length > 50 || film.cast_names.some(name => name.length > 120)) return 'Use up to 50 cast names, each under 120 characters.';
  if (film.release_year !== null && (!Number.isInteger(film.release_year) || film.release_year < 1888 || film.release_year > 2200)) return 'Enter a valid release year.';
  if (film.runtime_minutes !== null && (!Number.isInteger(film.runtime_minutes) || film.runtime_minutes < 1 || film.runtime_minutes > 1440)) return 'Runtime must be between 1 and 1,440 minutes.';
  if (!Number.isInteger(film.sort_order) || Math.abs(film.sort_order) > 100000) return 'Gallery order must be an integer between -100,000 and 100,000.';
  if (!/^#[0-9a-f]{6}$/i.test(film.color)) return 'Choose a valid accent color.';
  if (film.youtube_url && !youtubeId(film.youtube_url)) return 'Enter a valid YouTube video link.';
  if (film.published && (!film.poster_url || !film.synopsis.trim() || !film.director.trim() || !film.cast_names.length)) return 'Add a poster, synopsis, director, and cast before publishing.';
  return null;
}

export function youtubeId(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    let id = '';
    if (['youtu.be','www.youtu.be'].includes(url.hostname)) id = url.pathname.slice(1);
    else if (['youtube.com','www.youtube.com','m.youtube.com'].includes(url.hostname)) {
      if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
      else if (/^\/(embed|shorts|live)\//.test(url.pathname)) id = url.pathname.split('/')[2];
    }
    return /^[\w-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

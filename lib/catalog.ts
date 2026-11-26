import data from '../data/films.json';
import { youtubeId } from './films';
import type { Movie } from './sample-films';

/** One film as stored in data/films.json (edited from the /admin page). */
export type StoredFilm = {
  id: number;
  title: string;
  subtitle: string;
  genre: string;
  year: string;
  length: string;
  director: string;
  cast: string;
  description: string;
  /** Path to an uploaded poster, like /posters/my-film.jpg. Empty means "use the YouTube picture". */
  poster: string;
  /** Empty means the film is still "coming soon". */
  youtubeUrl: string;
  isNew: boolean;
  published: boolean;
  /** Optional Netflix-style details. */
  rating?: string;
  writer?: string;
  producer?: string;
  language?: string;
  tags?: string;
  releaseDate?: string;
};

export const ytThumb = (url: string) => {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : '';
};

export function toMovie(f: StoredFilm): Movie {
  const wide = !f.poster;
  return {
    id: f.id,
    title: f.title,
    subtitle: f.subtitle,
    genre: f.genre,
    year: f.year,
    length: f.length,
    director: f.director,
    cast: f.cast,
    description: f.description,
    image: f.poster || ytThumb(f.youtubeUrl),
    color: '#FF7A00',
    isNew: f.isNew,
    rating: f.rating,
    writer: f.writer,
    producer: f.producer,
    language: f.language,
    tags: f.tags,
    releaseDate: f.releaseDate,
    youtubeUrl: f.youtubeUrl || undefined,
    landscape: wide,
  };
}

export const storedFilms = data as StoredFilm[];
export const catalog: Movie[] = storedFilms.filter((f) => f.published !== false).map(toMovie);

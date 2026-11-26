import { NextResponse } from 'next/server';
import { storedFilms, ytThumb } from '../../lib/catalog';

export const dynamic = 'force-static';

const SITE = 'https://films.thejoietv.com';

/**
 * A public list of the films, at films.thejoietv.com/films.json. thejoietv.com reads this so its
 * "On the screen" section always shows exactly the films that are on this site.
 */
export function GET() {
  const films = storedFilms
    .filter((f) => f.published !== false)
    .map((f) => ({
      id: f.id,
      title: f.title,
      subtitle: f.subtitle,
      genre: f.genre,
      year: f.year,
      length: f.length,
      director: f.director,
      description: f.description,
      image: f.poster ? `${SITE}${f.poster}` : ytThumb(f.youtubeUrl),
      youtubeUrl: f.youtubeUrl,
      soon: !f.youtubeUrl,
      isNew: f.isNew,
      releaseDate: f.releaseDate ?? '',
    }));
  return NextResponse.json({ updated: new Date().toISOString(), site: SITE, films });
}

export type Movie = {
  id: number;
  title: string;
  subtitle: string;
  genre: string;
  year: string;
  length: string;
  director: string;
  cast: string;
  description: string;
  image: string;
  color: string;
  isNew?: boolean;
  youtubeUrl?: string;
  /** True when the image is a wide still (like a YouTube thumbnail) rather than a tall poster. */
  landscape?: boolean;
};

const yt = (id: string) => `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
const link = (id: string) => `https://www.youtube.com/watch?v=${id}`;

// Shown only if the film database can't be reached, so the page is never empty.
export const fallbackMovies: Movie[] = [
  {
    id: -1,
    title: 'Wake Up, Eat, Sleep, Repeat',
    subtitle: 'The routine, the fatigue, the small moments that keep us going.',
    genre: 'Drama',
    year: '2024',
    length: '',
    director: 'Joy Karenate-Egbuson',
    cast: '',
    description:
      'A short film for anyone who has ever felt stuck in the daily cycle but still finds a way to keep moving forward. Watch, reflect, and maybe break the cycle.',
    image: yt('QxYfDjL8zcI'),
    color: '#FF7A00',
    youtubeUrl: link('QxYfDjL8zcI'),
    landscape: true,
  },
  {
    id: -2,
    title: 'Resonance',
    subtitle: 'How the past, present and future connect.',
    genre: 'Drama',
    year: '2024',
    length: '',
    director: 'Joy Karenate-Egbuson',
    cast: '',
    description:
      'Resonance is about the ripples people leave behind and the way certain memories never really fade. It is a meditation on time: the things we carry, and the things we pass on.',
    image: yt('TbVFPjYVFY0'),
    color: '#C6249B',
    youtubeUrl: link('TbVFPjYVFY0'),
    landscape: true,
  },
  {
    id: -3,
    title: 'I Love You',
    subtitle: 'Messy, complicated, and beautiful.',
    genre: 'Romance',
    year: '2024',
    length: '',
    director: 'Joy Karenate-Egbuson',
    cast: '',
    description:
      "I Love You is a short film that sits inside the mess and the beauty of loving someone. Whether you've been in love, lost it, or are still searching, this story will relate in more ways than one.",
    image: yt('dDHvTvbNeW4'),
    color: '#FFD34A',
    youtubeUrl: link('dDHvTvbNeW4'),
    landscape: true,
  },
  {
    id: -4,
    title: 'Knock Knock',
    subtitle: 'The dangers of being in the dorm room alone.',
    genre: 'Horror',
    year: '2023',
    length: '',
    director: 'Joy Karenate-Egbuson',
    cast: '',
    description:
      "Knock Knock is a tight, atmospheric horror short built on a very ordinary fear: being alone in a space that suddenly isn't yours anymore.",
    image: yt('3edRZ78dIuI'),
    color: '#FF7A00',
    youtubeUrl: link('3edRZ78dIuI'),
    landscape: true,
  },
];

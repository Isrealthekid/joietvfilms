import type { Metadata } from 'next';
import { Bowlby_One, Inter } from 'next/font/google';
import './globals.css';

// Same fonts as thejoietv.com: Bowlby One for headings, Inter for everything else.
const bowlbyOne = Bowlby_One({ weight: '400', variable: '--font-heading', subsets: ['latin'] });
const inter = Inter({ variable: '--font-body', subsets: ['latin'] });


const SITE = 'https://thejoietv.com';
const FILMS = 'https://films.thejoietv.com';

// Tells Google who made these films, including the other names people search for.
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${FILMS}/#website`,
      url: FILMS,
      name: 'The Joie TV Films',
      alternateName: ['Joie TV Films', 'Joie TV Productions'],
      inLanguage: 'en',
      publisher: { '@id': `${SITE}/#org` },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE}/#org`,
      name: 'The Joie TV',
      alternateName: ['Joie TV', 'Joie TV Productions', 'JTV'],
      url: SITE,
      logo: `${SITE}/logo.png`,
      founder: { '@id': `${SITE}/#joy` },
      sameAs: [
        FILMS,
        'https://www.youtube.com/@thejoietv',
        'https://www.instagram.com/joie.egbuson/',
        'https://www.linkedin.com/in/joykarenate-egbuson/',
      ],
    },
    {
      '@type': 'Person',
      '@id': `${SITE}/#joy`,
      name: 'Joy Karenate-Egbuson',
      alternateName: ['Joy Egbuson', 'Joie Egbuson'],
      familyName: 'Egbuson',
      givenName: 'Joy',
      jobTitle: 'Filmmaker and video editor',
      url: SITE,
      worksFor: { '@id': `${SITE}/#org` },
      sameAs: [
        'https://www.youtube.com/@thejoietv',
        'https://www.instagram.com/joie.egbuson/',
        'https://www.linkedin.com/in/joykarenate-egbuson/',
      ],
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL('https://films.thejoietv.com'),
  title: 'The Joie TV Films | Short films by Joy Karenate-Egbuson',
  description:
    'Watch short films from The Joie TV (Joie TV Productions) by Joy Karenate-Egbuson (Joy Egbuson): drama, romance and horror, free on YouTube, plus what is coming soon.',
  keywords: [
    'Joie TV Films',
    'Joie TV',
    'Joie TV Productions',
    'Joy Karenate-Egbuson',
    'Joy Egbuson',
    'Egbuson',
    'Nigerian short films',
  ],
  authors: [{ name: 'Joy Karenate-Egbuson', url: 'https://thejoietv.com' }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'The Joie TV Films',
    title: 'The Joie TV Films | Short films by Joy Karenate-Egbuson',
    description:
      'Watch short films from The Joie TV (Joie TV Productions) by Joy Karenate-Egbuson, plus what is coming soon.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'The Joie TV' }],
  },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bowlbyOne.variable} ${inter.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        {children}
      </body>
    </html>
  );
}

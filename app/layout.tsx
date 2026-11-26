import type { Metadata } from 'next';
import { Bowlby_One, Inter } from 'next/font/google';
import './globals.css';

// Same fonts as thejoietv.com: Bowlby One for headings, Inter for everything else.
const bowlbyOne = Bowlby_One({ weight: '400', variable: '--font-heading', subsets: ['latin'] });
const inter = Inter({ variable: '--font-body', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://films.thejoietv.com'),
  title: 'The Joie TV Films',
  description: 'Short films by Joy Karenate-Egbuson. Watch the latest and see what is coming soon.',
  openGraph: {
    type: 'website',
    siteName: 'The Joie TV Films',
    title: 'The Joie TV Films',
    description: 'Short films by Joy Karenate-Egbuson. Watch the latest and see what is coming soon.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'The Joie TV' }],
  },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bowlbyOne.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'JTVF — The Film Gallery', description: 'Stories worth a closer look. Explore a curated exhibition of cinema.' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }

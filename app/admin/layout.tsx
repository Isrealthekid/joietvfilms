import type { Metadata } from 'next';

// The films manager is for the owner only: keep it out of search results.
export const metadata: Metadata = {
  title: 'Films manager — The Joie TV',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}

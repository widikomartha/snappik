import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Snappik', robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body style={{ fontFamily: 'system-ui', maxWidth: 720, margin: '64px auto', padding: 24 }}>{children}</body></html>;
}

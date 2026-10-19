import { redirect } from 'next/navigation';
import { ownerPageState } from '../_lib/owner-page-state.js';
import {LogoutButton} from './logout-button.js';
export const dynamic = 'force-dynamic';
export default async function App() {
  const result = await ownerPageState('/app');
  if (result.state === 'unavailable') return <main><h1>Snappik</h1><p role="alert">Layanan masuk atau status studio belum tersedia.</p><a href="/app">Coba lagi</a></main>;
  if (result.state === 'verify') return <main><h1>Verifikasi email diperlukan</h1><a href="/login">Kembali ke halaman masuk</a></main>;
  if (result.data.setup_status === 'suspended') return <main><h1>Akses studio dibatasi</h1><p>Hubungi dukungan untuk memulihkan akses.</p><LogoutButton/></main>;
  if (result.data.setup_status !== 'ready') redirect('/onboarding?return_to=/app');
  return <main><h1>{result.data.studio?.name}</h1><p>Setup studio tersimpan.</p><p>Akses: {result.data.entitlement?.status === 'active' ? 'Aktif' : 'Trial berakhir'}.</p>
    <p>Batas proyek aktif: {result.data.entitlement?.project_limit}.</p><LogoutButton/></main>;
}

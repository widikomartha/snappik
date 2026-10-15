import { redirect } from 'next/navigation';
import { ownerPageState } from '../_lib/owner-page-state.js';
import { safeOwnerReturn } from '../../modules/onboarding/policy.js';
import { SetupForm } from './setup-form.js';
export const dynamic = 'force-dynamic';
export default async function Onboarding({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const destination = safeOwnerReturn((await searchParams).return_to);
  const result = await ownerPageState(destination);
  if (result.state === 'unavailable') return <main><h1>Setup studio</h1><p role="alert">Layanan masuk atau setup belum tersedia. Data tersimpan tetap aman.</p><a href={`/onboarding?return_to=${encodeURIComponent(destination)}`}>Coba lagi</a></main>;
  if (result.state === 'verify') return <main><h1>Verifikasi email</h1><p>Verifikasi email melalui layanan masuk sebelum melanjutkan.</p><a href="/login">Kembali ke halaman masuk</a></main>;
  if (result.data.setup_status === 'ready') redirect(destination);
  if (result.data.setup_status === 'suspended') return <main><h1>Akses studio dibatasi</h1><p>Hubungi dukungan untuk memulihkan akses.</p></main>;
  return <main><h1>Setup studio</h1><p>Trial tujuh hari, maksimal tiga proyek aktif. Percobaan ulang tidak memperpanjang trial.</p>
    {result.data.setup_status === 'incomplete' && <p role="status">Setup belum lengkap. Simpan kembali untuk memulihkannya.</p>}<SetupForm destination={destination} initial={{...result.data.studio,...result.data.settings}}/></main>;
}

import { safeOwnerReturn } from '../../modules/onboarding/policy.js';
export const dynamic = 'force-dynamic';
export default async function Login({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const destination = safeOwnerReturn((await searchParams).return_to);
  return <main><h1>Masuk ke Snappik</h1><p role="status">Layanan masuk belum dikonfigurasi. Silakan coba lagi setelah layanan tersedia.</p>
    <p>Tujuan setelah masuk: <code>{destination}</code></p><a href={`/login?return_to=${encodeURIComponent(destination)}`}>Coba lagi</a>
    <p><a href="/recover">Pemulihan akun</a></p></main>;
}

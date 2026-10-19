import { safeOwnerReturn } from '../../modules/onboarding/policy.js';
import {readConfig} from '../../config.js';
import {LoginForm} from './login-form.js';
export const dynamic = 'force-dynamic';
export default async function Login({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const destination = safeOwnerReturn((await searchParams).return_to);
  if(readConfig().authMode==='better-auth-local')return <main><h1>Masuk ke Snappik</h1><LoginForm destination={destination}/><p><a href="/recover">Pemulihan akun</a></p></main>;
  return <main><h1>Masuk ke Snappik</h1><p role="status">Layanan masuk belum dikonfigurasi. Silakan coba lagi setelah layanan tersedia.</p>
    <p>Tujuan setelah masuk: <code>{destination}</code></p><a href={`/login?return_to=${encodeURIComponent(destination)}`}>Coba lagi</a>
    <p><a href="/recover">Pemulihan akun</a></p></main>;
}

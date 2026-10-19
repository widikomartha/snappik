import {readConfig} from '../../config';
import {RecoveryForm} from './recovery-form';
export const dynamic='force-dynamic';
export default function Recover() {
  const config=readConfig();
  return <main><h1>Pemulihan akun</h1>{config.authMode==='better-auth-local'&&config.recoveryKey?
    <><p>Mode lokal: pengiriman email eksternal belum tersedia. Formulir ini menerima permintaan pemulihan untuk pengujian lokal.</p><RecoveryForm /></>:
    <p>Pemulihan akun menunggu konfigurasi layanan autentikasi.</p>}
    <p>Jika menggunakan akun dari penyedia lain, pulihkan akses melalui penyedia akun tersebut.</p>
    <a href="/login">Kembali ke halaman masuk</a></main>;
}

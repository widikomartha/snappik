'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const messages: Record<string,string> = {
  AUTH_REQUIRED:'Sesi berakhir. Masuk kembali melalui tautan di bawah, lalu coba lagi. Isian Anda tetap tersedia di tab ini.',
  EMAIL_VERIFICATION_REQUIRED:'Verifikasi email melalui layanan masuk sebelum melanjutkan.',
  INVALID_INPUT:'Periksa nama, slug, bahasa, dan zona waktu. Slug menggunakan 3–50 huruf kecil, angka, atau tanda hubung.',
  SLUG_TAKEN:'Slug telah digunakan. Pilih slug lain.',
  SETUP_CONFLICT:'Setup sudah diselesaikan dengan isian berbeda. Muat status tersimpan sebelum melanjutkan.',
  FORBIDDEN:'Akses studio dibatasi. Hubungi dukungan.',
  TEMPORARILY_UNAVAILABLE:'Setup belum dapat dipastikan. Coba lagi dengan isian yang sama; trial tidak akan dimulai ulang.',
};
export function SetupForm({destination,initial}:{destination:string;initial:{name?:string|null;slug?:string|null;locale?:string;timezone?:string}}) {
  const router = useRouter();
  const [pending,setPending] = useState(false);
  const [error,setError] = useState<string|null>(null);
  return <form onSubmit={async event => {
    event.preventDefault(); if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true); setError(null);
    try {
      const response = await fetch('/api/v1/onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(form)),cache:'no-store'});
      const result = await response.json();
      if (!response.ok) { setError(result.error?.code ?? 'TEMPORARILY_UNAVAILABLE'); return; }
      router.replace(destination); router.refresh();
    } catch { setError('TEMPORARILY_UNAVAILABLE'); }
    finally { setPending(false); }
  }}>
    <p><label htmlFor="name">Nama studio</label><br/><input id="name" name="name" required maxLength={200} autoComplete="organization" defaultValue={initial.name ?? ''}/></p>
    <p><label htmlFor="slug">Slug studio</label><br/><input id="slug" name="slug" required minLength={3} maxLength={50} pattern="[a-z0-9-]+" autoCapitalize="none" aria-describedby="slug-help" defaultValue={initial.slug ?? ''}/>
      <small id="slug-help"> 3–50 huruf kecil, angka, atau tanda hubung. Nama jalur aplikasi dicadangkan.</small></p>
    <p><label htmlFor="locale">Bahasa</label><br/><select id="locale" name="locale" defaultValue={initial.locale ?? 'id'}><option value="id">Indonesia</option><option value="en">English</option></select></p>
    <p><label htmlFor="timezone">Zona waktu</label><br/><select id="timezone" name="timezone" defaultValue={initial.timezone ?? 'Asia/Makassar'}>
      {Array.from(new Set(['Asia/Jakarta','Asia/Makassar','Asia/Jayapura','UTC',...(initial.timezone ? [initial.timezone] : [])])).map(zone=><option key={zone}>{zone}</option>)}
    </select></p>
    {error && <div role="alert"><p>{messages[error] ?? messages.TEMPORARILY_UNAVAILABLE}</p>
      {error === 'AUTH_REQUIRED' && <p><a href={`/login?return_to=${encodeURIComponent(destination)}`} target="_blank" rel="noopener noreferrer">Masuk kembali di tab baru</a></p>}
      {error === 'SETUP_CONFLICT' && <p><a href="/app">Muat status tersimpan</a></p>}</div>}
    <button type="submit" disabled={pending} style={{minHeight:44}}>{pending ? 'Menyimpan…' : error ? 'Coba simpan lagi' : 'Selesaikan setup'}</button>
  </form>;
}

'use client';
import { useState,type FormEvent } from 'react';
export function LoginForm({destination}:{destination:string}) {
  const [challenge,setChallenge]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setMessage('');
    const form=new FormData(event.currentTarget);
    const body=challenge?{code:form.get('code'),return_to:destination}:{email:form.get('email'),password:form.get('password'),return_to:destination};
    try {
      const response=await fetch(challenge?'/api/auth/two-factor/verify-totp':'/api/auth/sign-in/email',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
      const result=await response.json();
      if(!response.ok){setMessage(response.status===503?'Layanan masuk belum tersedia. Silakan coba lagi.':'Tidak dapat masuk. Periksa kredensial atau kode Anda.');return;}
      if(result.two_factor_required){setChallenge(true);setMessage('Masukkan kode dari aplikasi autentikator.');}
      else window.location.assign(destination);
    }catch{setMessage('Koneksi terputus. Silakan coba lagi.');}finally{setBusy(false);}
  }
  return <form onSubmit={submit}>
    {challenge?<label>Kode autentikator <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required /></label>:
      <><p><label>Email <input name="email" type="email" autoComplete="username" required /></label></p>
      <p><label>Kata sandi <input name="password" type="password" autoComplete="current-password" required /></label></p></>}
    <p><button disabled={busy}>{busy?'Memproses…':challenge?'Verifikasi kode':'Masuk'}</button></p>
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}

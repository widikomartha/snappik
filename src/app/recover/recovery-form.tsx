'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
export function RecoveryForm() {
  const [token,setToken]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const requestId=useRef('');
  useEffect(()=>{
    const value=new URLSearchParams(window.location.hash.slice(1)).get('token');
    if(value&&/^[A-Za-z0-9_-]{43}$/.test(value))setToken(value);
    // Fragment never reaches server/Referer; remove it from the current history entry.
    window.history.replaceState(null,'','/recover');
  },[]);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setMessage('');
    const element=event.currentTarget,data=new FormData(element);
    requestId.current||=crypto.randomUUID();
    try {
      const response=await fetch(token?'/api/auth/reset-password':'/api/auth/request-password-reset',{
        method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
        body:JSON.stringify(token?{token,new_password:data.get('password')}:{email:data.get('email'),request_id:requestId.current})});
      if(!response.ok){setMessage(response.status===503?
        'Hasil belum dapat dipastikan. Coba lagi. Jika reset sudah berhasil, masuk dengan kata sandi baru atau minta tautan baru.':
        token?'Tautan tidak valid, sudah digunakan, atau kedaluwarsa. Minta tautan baru melalui halaman pemulihan.':'Periksa isian Anda.');return;}
      if(token){element.reset();setToken('');setMessage('Kata sandi diperbarui. Semua sesi lama dinonaktifkan. Silakan masuk kembali.');}
      else{requestId.current='';setMessage('Permintaan diterima. Jika akun memenuhi syarat, pemberitahuan akan diproses. Ini bukan konfirmasi pengiriman.');}
    }catch{setMessage('Koneksi terputus; hasil belum dapat dipastikan. Coba lagi, masuk dengan kata sandi baru, atau minta tautan baru.');}
    finally{setBusy(false);}
  }
  return <form onSubmit={submit}>
    <p>{token?<label>Kata sandi baru <input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></label>:
      <label>Email <input name="email" type="email" maxLength={254} autoComplete="username" required onChange={()=>{requestId.current='';}} /></label>}</p>
    <button disabled={busy}>{busy?'Memproses…':token?'Perbarui kata sandi':'Minta pemulihan'}</button>
    <p role="status" aria-live="polite">{message}</p>
    {token&&<p><a href="/recover">Minta tautan baru</a></p>}
  </form>;
}

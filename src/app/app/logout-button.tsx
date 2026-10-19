'use client';
import {useState} from 'react';
export function LogoutButton() {
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  return <><button disabled={busy} onClick={async()=>{
    setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/auth/sign-out',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',cache:'no-store'});
      if(response.ok)window.location.assign('/login');
      else setMessage('Keluar belum dapat dipastikan. Silakan coba lagi.');
    }catch{setMessage('Koneksi terputus. Status keluar belum dapat dipastikan; silakan coba lagi.');}
    finally{setBusy(false);}
  }}>Keluar</button><p role="status">{message}</p></>;
}

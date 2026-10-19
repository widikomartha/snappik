'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {parseRecoveryFragment,recoveryAcknowledged,type RecoveryLocale} from '../../modules/auth/recovery-browser';
import {recoveryText} from './strings';
declare global {interface Window {__snappikTakeRecovery?:()=>string}}
type Notice='accepted'|'success'|'invalid'|'validation'|'uncertain'|'';
export function RecoveryForm({enabled,initialLocale}:{enabled:boolean;initialLocale:RecoveryLocale}) {
  const [locale,setLocale]=useState(initialLocale),[mode,setMode]=useState<'preparing'|'request'|'reset'|'success'>('preparing');
  const [token,setToken]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState<Notice>('');
  const [formRevision,setFormRevision]=useState(0);
  const requestId=useRef(''),sending=useRef(false),status=useRef<HTMLParagraphElement>(null),password=useRef<HTMLInputElement>(null);
  const text=recoveryText[locale],error=['invalid','validation','uncertain'].includes(notice);
  useEffect(()=>{
    const read=()=>{
      const fragment=window.__snappikTakeRecovery?.()??window.location.hash;
      window.history.replaceState(null,'','/recover'+(new URLSearchParams(window.location.search).get('lang')==='en'?'?lang=en':''));
      if(!enabled)return;
      const parsed=parseRecoveryFragment(fragment);setFormRevision(value=>value+1);setToken(parsed.token);setMode(parsed.kind==='reset'?'reset':'request');
      setNotice(parsed.kind==='invalid'?'invalid':'');requestId.current='';
    };
    read();window.addEventListener('snappik:recovery',read);
    if(!window.__snappikTakeRecovery)window.addEventListener('hashchange',read);
    return()=>{window.removeEventListener('snappik:recovery',read);window.removeEventListener('hashchange',read);};
  },[enabled]);
  useEffect(()=>{if(notice)status.current?.focus();else if(mode==='reset')password.current?.focus();},[notice,mode,formRevision]);
  function changeLocale(next:RecoveryLocale){setLocale(next);window.history.replaceState(null,'','/recover'+(next==='en'?'?lang=en':''));}
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(sending.current)return;sending.current=true;setBusy(true);setNotice('');
    const element=event.currentTarget,data=new FormData(element),kind=mode==='reset'?'reset':'request';
    requestId.current||=crypto.randomUUID();
    const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),15000);
    try {
      const response=await fetch(kind==='reset'?'/api/auth/reset-password':'/api/auth/request-password-reset',{
        method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',signal:abort.signal,
        body:JSON.stringify(kind==='reset'?{token,new_password:data.get('password')}:{email:data.get('email'),request_id:requestId.current})});
      let result:unknown;try{result=await response.json();}catch{setNotice('uncertain');return;}
      if(!response.ok){const code=(result as {error?:{code?:string}})?.error?.code;
        setNotice(response.status>=500?'uncertain':code==='INVALID_OR_EXPIRED_RESET'?'invalid':'validation');return;}
      if(!recoveryAcknowledged(kind,response.status,response.headers.get('content-type'),result)){setNotice('uncertain');return;}
      if(kind==='reset'){element.reset();setToken('');setMode('success');setNotice('success');}
      else{requestId.current='';setNotice('accepted');}
    }catch{setNotice('uncertain');}
    finally{clearTimeout(timeout);sending.current=false;setBusy(false);}
  }
  const buttonStyle={font:'inherit',minHeight:44,padding:'8px 12px'};
  return <main lang={locale} style={{overflowWrap:'anywhere'}}><h1>{text.title}</h1>
    <nav aria-label={text.language}><button type="button" disabled={busy} aria-pressed={locale==='id'} onClick={()=>changeLocale('id')} style={buttonStyle}>Bahasa Indonesia</button>{' '}
      <button type="button" disabled={busy} aria-pressed={locale==='en'} onClick={()=>changeLocale('en')} style={buttonStyle}>English</button></nav>
    {!enabled?<p role="status">{text.unavailable}</p>:<>
      <p>{text.local}</p><p id="recovery-instructions">{mode==='reset'?text.resetInstructions:text.instructions}</p>
      {mode==='preparing'?<p role="status">{text.preparing}</p>:mode!=='success'&&<form key={formRevision} onSubmit={submit} aria-describedby="recovery-instructions" aria-busy={busy}>
        <fieldset disabled={busy} style={{border:0,padding:0,minWidth:0}}><p><label style={{display:'block'}}>
          {mode==='reset'?text.password:text.email}
          {mode==='reset'?<input ref={password} name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required
            aria-invalid={notice==='validation'} style={{display:'block',width:'100%',boxSizing:'border-box',font:'inherit',minHeight:44}}/>:
            <input name="email" type="email" maxLength={254} autoComplete="username" required onChange={()=>{requestId.current='';}}
              style={{display:'block',width:'100%',boxSizing:'border-box',font:'inherit',minHeight:44}}/>}
        </label></p><button style={buttonStyle}>{busy?text.pending:mode==='reset'?text.reset:text.request}</button></fieldset>
      </form>}
      <p ref={status} role={error?'alert':'status'} aria-live={error?'assertive':'polite'} tabIndex={-1}>{notice?text[notice]:''}</p>
      {(mode==='reset'||notice==='invalid')&&<p><a href={`/recover${locale==='en'?'?lang=en':''}`}>{text.fresh}</a></p>}
    </>}
    <p>{text.upstream}</p><a href="/login">{text.login}</a></main>;
}

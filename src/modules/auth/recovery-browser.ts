// Pure browser protocol helpers; no password/token persistence or provider calls.
export type RecoveryLocale='id'|'en';
export function parseRecoveryFragment(fragment:string):{kind:'request'|'invalid'|'reset';token:string} {
  if(!fragment)return {kind:'request',token:''};
  const fields=new URLSearchParams(fragment.replace(/^#/,''));
  const token=fields.get('token');
  if([...fields.keys()].length!==1||fields.getAll('token').length!==1||!token||!/^[A-Za-z0-9_-]{43}$/.test(token))return {kind:'invalid',token:''};
  return {kind:'reset',token};
}
export function recoveryAcknowledged(kind:'request'|'reset',status:number,contentType:string|null,value:unknown) {
  if(!/^application\/json(?:\s*;|$)/i.test(contentType??'')||!value||typeof value!=='object'||Array.isArray(value))return false;
  const result=value as Record<string,unknown>;
  return Object.keys(result).length===1&&(kind==='request'?status===202&&result.accepted===true:status===200&&result.success===true);
}
// Parser-time scrubbing before hydration; one-shot memory only, including hash navigation.
// Static source: never interpolate URL/user/token data into this script.
export const recoveryBootstrap=String.raw`(()=>{
  if(window.__snappikTakeRecovery)return;
  let fragment='';
  window.__snappikTakeRecovery=()=>{const value=fragment;fragment='';return value;};
  const capture=()=>{
    if(location.pathname!=='/recover')return;
    fragment=location.hash;
    const lang=new URLSearchParams(location.search).get('lang')==='en'?'?lang=en':'';
    history.replaceState(null,'','/recover'+lang);
    window.dispatchEvent(new Event('snappik:recovery'));
  };
  capture();window.addEventListener('hashchange',capture);
})();`;

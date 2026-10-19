// Pure browser protocol helpers; no password/token persistence or provider calls.
export type RecoveryLocale='id'|'en';
// Only non-secret routing hints are accepted. Legacy URL proofs are never imported.
export function recoveryNavigation(search:string,fragment:string):'request'|'invalid'|'reset' {
  const fields=new URLSearchParams(search);
  if(fragment||[...fields.keys()].some(key=>!['lang','step'].includes(key))||fields.getAll('step').length>1||fields.getAll('lang').length>1)return 'invalid';
  if(fields.has('step')&&fields.get('step')!=='reset')return 'invalid';
  return fields.get('step')==='reset'?'reset':'request';
}
export function recoveryAcknowledged(kind:'request'|'reset',status:number,contentType:string|null,value:unknown) {
  if(!/^application\/json(?:\s*;|$)/i.test(contentType??'')||!value||typeof value!=='object'||Array.isArray(value))return false;
  const result=value as Record<string,unknown>;
  return Object.keys(result).length===1&&(kind==='request'?status===202&&result.accepted===true:status===200&&result.success===true);
}
// Static parser-time cleanup. Retain only a mode, never raw URL proof in a bridge.
export const recoveryBootstrap=String.raw`(()=>{
  if(window.__snappikTakeRecovery)return;
  let mode='request';
  window.__snappikTakeRecovery=()=>{const value=mode;mode='request';return value;};
  const capture=()=>{
    if(location.pathname!=='/recover')return;
    const fields=new URLSearchParams(location.search);
    mode=location.hash||[...fields.keys()].some(key=>!['lang','step'].includes(key))||fields.getAll('step').length>1||fields.getAll('lang').length>1||(fields.has('step')&&fields.get('step')!=='reset')?'invalid':fields.get('step')==='reset'?'reset':'request';
    const lang=fields.get('lang')==='en'?'lang=en':'';
    const query=[lang,mode==='reset'?'step=reset':''].filter(Boolean).join('&');
    history.replaceState(null,'','/recover'+(query?'?'+query:''));
    window.dispatchEvent(new Event('snappik:recovery'));
  };
  capture();window.addEventListener('hashchange',capture);
})();`;

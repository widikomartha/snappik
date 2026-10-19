import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {parseRecoveryFragment,recoveryAcknowledged,recoveryBootstrap} from '../src/modules/auth/recovery-browser.js';
import {recoveryText} from '../src/app/recover/strings.js';
test('strict reset fragment rejects duplicates, missing/invalid values and extra keys without echoing them',()=>{
  const token='x'.repeat(43);assert.equal(parseRecoveryFragment(`#token=${token}`).kind,'reset');
  assert.deepEqual(parseRecoveryFragment(''),{kind:'request',token:''});
  for(const value of ['#token=bad','#token=','#bad=value',`#token=${token}&token=${token}`,`#token=${token}&return_to=https://evil.test`]) {
    assert.deepEqual(parseRecoveryFragment(value),{kind:'invalid',token:''});
  }
});
test('synthetic bootstrap model scrubs before hydration, clears one-shot memory and handles hash-only navigation',()=>{
  const events:Record<string,()=>void>={},window:Record<string,unknown>={},urls:string[]=[];
  const location={pathname:'/recover',hash:'#token='+'x'.repeat(43),search:'?lang=en&ignored=1'};
  const history={replaceState(_state:unknown,_title:string,url:string){urls.push(url);location.hash='';}};
  window.addEventListener=(name:string,fn:()=>void)=>{events[name]=fn;};window.dispatchEvent=()=>{};
  runInNewContext(recoveryBootstrap,{window,location,history,URLSearchParams,Event});
  assert.deepEqual(urls,['/recover?lang=en']);const take=window.__snappikTakeRecovery as ()=>string;
  assert.equal(parseRecoveryFragment(take()).kind,'reset');assert.equal(take(),'');
  location.hash='#token=bad';events.hashchange();assert.equal(parseRecoveryFragment(take()).kind,'invalid');
  assert.equal(location.hash,'');assert.equal(take(),'');
});
test('HTTP200/HTML, empty, malformed and wrong-status acknowledgements cannot fabricate recovery/reset success',()=>{
  assert.equal(recoveryAcknowledged('request',202,'application/json',{accepted:true}),true);
  assert.equal(recoveryAcknowledged('reset',200,'application/json; charset=utf-8',{success:true}),true);
  for(const value of [undefined,null,[],{},'gateway',{success:false},{success:true,token:'must-not-be-accepted'}]) {
    assert.equal(recoveryAcknowledged('reset',200,'application/json',value),false);
  }
  assert.equal(recoveryAcknowledged('reset',200,'text/html',{success:true}),false);
  assert.equal(recoveryAcknowledged('reset',503,'application/json',{success:true}),false);
  assert.equal(recoveryAcknowledged('request',200,'application/json',{accepted:true}),false);
});
test('recovery locale keys match and every public message resolves in Indonesian and English',()=>{
  assert.deepEqual(Object.keys(recoveryText.id).sort(),Object.keys(recoveryText.en).sort());
  for(const locale of Object.values(recoveryText))for(const value of Object.values(locale))assert.ok(value.length>0&&!value.includes('undefined'));
});

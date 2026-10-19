import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {recoveryNavigation,recoveryAcknowledged,recoveryBootstrap} from '../src/modules/auth/recovery-browser.js';
import {recoveryText} from '../src/app/recover/strings.js';
test('manual handoff accepts only non-secret mode and never imports legacy URL credentials',()=>{
  assert.equal(recoveryNavigation('',''),'request');assert.equal(recoveryNavigation('?step=reset',''),'reset');
  for(const [search,hash] of [['','#token='+'x'.repeat(43)],['?token=secret',''],['?step=reset&step=reset',''],['?return_to=https://evil.test','']])assert.equal(recoveryNavigation(search,hash),'invalid');
});
test('synthetic bootstrap strips unsupported URL material without retaining raw proofs',()=>{
  for(const [search,hash] of [['?lang=en&step=reset',''],['?token='+'x'.repeat(43),''],['','#token='+'x'.repeat(43)]]){
    const events:Record<string,()=>void>={},window:Record<string,unknown>={},urls:string[]=[];
    const location={pathname:'/recover',hash,search};
    const history={replaceState(_state:unknown,_title:string,url:string){urls.push(url);location.hash='';}};
    window.addEventListener=(name:string,fn:()=>void)=>{events[name]=fn;};window.dispatchEvent=()=>{};
    const expected=recoveryNavigation(search,hash);
    runInNewContext(recoveryBootstrap,{window,location,history,URLSearchParams,Event});
    const take=window.__snappikTakeRecovery as ()=>string;
    assert.equal(take(),expected);assert.equal(take(),'request');assert.ok(!urls[0].includes('token'));assert.ok(!urls[0].includes('x'.repeat(43)));
    location.hash='#token=bad';events.hashchange();assert.equal(take(),'invalid');assert.equal(location.hash,'');
  }
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

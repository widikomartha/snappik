import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { photos, initial, stage, beginConfirm, respond, recover, loadConflict, reapply } from './model.mjs';
import { strings, translate } from './strings.mjs';

// These checks protect design stories. They do not exercise a production service.
test('same filenames and case variants remain three distinct design selections', () => {
  const state=initial();
  for (const p of photos.slice(0,3)) { assert.equal(stage(state,p.id),true);respond(state); }
  assert.equal(Object.keys(state.canonical).length,3);
  assert.equal(stage(state,photos[3].id),false);
  assert.equal(stage(state,photos[0].id),true);respond(state);
  assert.equal(Object.keys(state.canonical).length,2);
});
test('pending, failed and uncertain saves never replace the acknowledged design state prematurely', () => {
  const state=initial();stage(state,photos[0].id);
  assert.deepEqual(state.canonical,{});assert.equal(beginConfirm(state),false);
  respond(state,'offline');assert.equal(state.status,'failed');assert.ok(Object.hasOwn(state.intent,photos[0].id));assert.deepEqual(state.canonical,{});
  state.status='pending';respond(state,'lost');const revision=state.revision;
  assert.equal(state.status,'unknown');assert.equal(beginConfirm(state),false);
  recover(state);assert.equal(state.revision,revision);assert.deepEqual(state.intent,state.canonical);
});
test('conflict design preserves local intent and requires canonical inspection before deliberate reapplication', () => {
  const state=initial();stage(state,photos[0].id);respond(state,'conflict');
  assert.ok(Object.hasOwn(state.intent,photos[0].id));assert.ok(Object.hasOwn(state.canonical,photos[5].id));
  assert.equal(reapply(state),false);loadConflict(state);assert.equal(reapply(state),true);respond(state);
  assert.ok(Object.hasOwn(state.canonical,photos[0].id));
});
test('another-tab confirmation blocks design reapplication across a locked boundary', () => {
  const state=initial();stage(state,photos[0].id);respond(state,'other-confirmed');
  const snapshot=structuredClone(state.snapshot);loadConflict(state);
  assert.equal(reapply(state),false);assert.equal(stage(state,photos[1].id),false);
  recover(state);assert.deepEqual(state.snapshot,snapshot);assert.deepEqual(state.intent,snapshot.items);
});
test('one-photo confirmation below maximum and lost-result recovery keep the same synthetic snapshot', () => {
  const state=initial();stage(state,photos[0].id);respond(state);
  assert.equal(beginConfirm(state),true);respond(state,'lost');
  const snapshot=structuredClone(state.snapshot);recover(state);
  assert.deepEqual(state.snapshot,snapshot);assert.equal(beginConfirm(state),false);
});
test('unavailable selected source prevents the design confirmation without silently discarding its ID', () => {
  const state=initial();stage(state,photos[0].id);respond(state);state.unavailable=photos[0].id;
  assert.equal(beginConfirm(state),false);assert.ok(Object.hasOwn(state.canonical,photos[0].id));
});
test('note design counts Unicode code points and preserves text', () => {
  const state=initial();const text='😀'.repeat(500);
  assert.equal(stage(state,photos[0].id,text),true);respond(state);
  assert.equal(stage(state,photos[0].id,text+'a'),false);
  assert.equal(state.canonical[photos[0].id],text);
});
test('expired-response design retains acknowledged choices and pending intent', () => {
  const state=initial();stage(state,photos[0].id);respond(state);stage(state,photos[1].id);respond(state,'expired');
  assert.equal(state.status,'expired');assert.equal(Object.keys(state.canonical).length,1);assert.equal(Object.keys(state.intent).length,2);
});
test('ID/EN keys and interpolation names match; every string resolves with complete fixture values', () => {
  assert.deepEqual(Object.keys(strings.id).sort(),Object.keys(strings.en).sort());
  for(const key of Object.keys(strings.id)) {
    const fields=(str)=>[...str.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
    assert.deepEqual(fields(strings.id[key]),fields(strings.en[key]),key);
    for(const lang of ['id','en']) assert.doesNotMatch(translate(lang,key,{count:3,quota:3,revision:8,shown:4,total:6,date:'fixture date'}),/\{\w+\}/,key);
  }
});
test('light/dark semantic text pairs meet 4.5:1; control/focus edges meet 3:1 against their surfaces', async () => {
  const css=await readFile(new URL('./tokens.css',import.meta.url),'utf8');
  const luminance=(hex)=>{
    if(hex.length===4)hex='#'+[...hex.slice(1)].map(c=>c+c).join('');
    const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
  };
  const ratio=(a,b)=>{const l=[luminance(a),luminance(b)].sort((x,y)=>y-x);return(l[0]+.05)/(l[1]+.05);};
  const blocks=[...css.matchAll(/\{([^{}]+)\}/g)].map(m=>Object.fromEntries([...m[1].matchAll(/--([\w-]+):\s*(#[a-fA-F0-9]{3,6})\s*;/g)].map(p=>[p[1],p[2]]))).filter(v=>v.background);
  assert.equal(blocks.length,3);
  for(const tokens of blocks) {
    for(const fg of ['text','muted','error','success','warning']) for(const bg of ['surface','background']) assert.ok(ratio(tokens[fg],tokens[bg])>=4.5,`${fg}/${bg}: ${ratio(tokens[fg],tokens[bg])}`);
    assert.ok(ratio(tokens.primary,tokens['on-primary'])>=4.5);
    for(const fg of ['border','focus'])for(const bg of ['surface','background'])assert.ok(ratio(tokens[fg],tokens[bg])>=3);
  }
});

import { photos, photo, initial, stage, beginConfirm, respond, recover, loadConflict, reapply, projectId, clock } from './model.mjs';
import { translate } from './strings.mjs';

const $ = (selector) => document.querySelector(selector);
// QA aid, equivalent to the workbench text-scale control; not native browser zoom.
document.documentElement.classList.toggle('text-200', new URLSearchParams(location.search).get('text') === '200');
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let locale = 'id', theme = 'system', route = 'create', nextResponse = 'success', state = initial();
let inventory = 'ready', folder = '', limit = 4, layout = 'grid', accessState = 'expired', grant = false;
let created = false, createStatus = '', formErrors = [], gateError = '', attempts = 0, passwordVisible = false;
let requestTimer, modal = null, returnFocus = null, transient = '';
let form = { clientLabel: 'Project A · Synthetic', source: 'synthetic-folder-a', phone: '', subfolders: true, notesEnabled: true, layout: 'grid', mainEnabled: true, downloadEnabled: true, quota: '3', mainDeadline: '2026-10-20T16:00', downloadDeadline: '2026-10-27T16:00', mainPassword: '', downloadPassword: '' };
const t = (key, values) => translate(locale, key, values);
const date = (instant) => new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(new Date(instant)) + ' WITA (UTC+08)';
const deadline = (field) => form[field] ? date(form[field] + ':00+08:00') : t('noDeadline');
const selectedCount = () => Object.keys(state.intent).length;
const lockedUI = () => state.locked || !['saved', 'failed'].includes(state.status);
const button = (action, key, options = '') => `<button type="button" data-action="${action}" ${options}>${esc(t(key))}</button>`;
const heading = (title, intro, eyebrow) => `<div class="page-head"><div><p class="eyebrow">${esc(t(eyebrow))}</p><h1 tabindex="-1" id="page-title">${esc(t(title))}</h1><p class="muted">${esc(t(intro, { count: state.quota, date: deadline('mainDeadline') }))}</p></div></div>`;
const feedback = (message, type = '', actions = '') => `<div class="feedback ${type}" ${type === 'error' ? 'role="alert"' : ''}><p>${message}</p>${actions ? `<div class="row">${actions}</div>` : ''}</div>`;
const options = (keys, value) => keys.map(([id, key]) => `<option value="${id}" ${id === value ? 'selected' : ''}>${esc(t(key))}</option>`).join('');
const announce = (message) => { $('#announcement').textContent = message; };

function renderLab() {
  const isOpen = $('#lab details')?.open;
  $('#lab').innerHTML = `<aside class="lab" aria-label="${esc(t('prototype'))}">
    <details ${isOpen ? 'open' : ''}><summary>${esc(t('lab'))}</summary><p class="muted">${esc(t('labHelp'))}</p><div class="tools">
    <label>${esc(t('response'))}<select id="response">${options([['success','success'],['hold','hold'],['offline','offline'],['conflict','conflict'],['other-confirmed','otherConfirmed'],['lost','lost'],['expired','expiredOption']],nextResponse)}</select></label>
    <label>${esc(t('inventoryState'))}<select id="inventory">${options([['pending','pending'],['ready','ready'],['failed','failed'],['empty','empty'],['unavailable','unavailable']],inventory)}</select></label>
    <label>${esc(t('accessScenario'))}<select id="access-scenario">${options([['expired','expired'],['revoked','revoked'],['session','session'],['ownerSession','ownerSession'],['service','service'],['suspended','suspended']],accessState)}</select></label>
    </div><div class="row">${button('deliver','deliver', `${state.status !== 'pending' && createStatus !== 'pending' ? 'disabled' : ''}`)}${button('reset','reset')}</div></details>
    <div class="tools"><label>${esc(t('language'))}<select id="locale"><option value="id" ${locale === 'id' ? 'selected' : ''}>Bahasa Indonesia</option><option value="en" ${locale === 'en' ? 'selected' : ''}>English</option></select></label>
    <label>${esc(t('theme'))}<select id="theme">${options([['system','system'],['light','light'],['dark','dark']],theme)}</select></label></div>
    <nav aria-label="${esc(t('prototype'))}">${['create','detail','gate','gallery','review','access','components'].map((page) => button(`nav:${page}`,page,`${route === page ? 'aria-current="page"' : ''}`)).join('')}</nav></aside>`;
}
function field(name, key, { type = 'text', help = '', extra = '' } = {}) {
  const invalid = formErrors.some(([id]) => id === name);
  return `<label for="${name}">${esc(t(key))}<input id="${name}" name="${name}" type="${type}" value="${esc(form[name])}" ${extra} ${invalid ? 'aria-invalid="true"' : ''} ${help ? `aria-describedby="${name}-help"` : ''}>${help ? `<small id="${name}-help">${esc(t(help))}</small>` : ''}</label>`;
}
const check = (name, key) => `<label class="check"><input name="${name}" id="${name}" type="checkbox" ${form[name] ? 'checked' : ''}>${esc(t(key))}</label>`;
function renderCreate() {
  return heading('createTitle','createIntro','owner') + (formErrors.length ? `<div class="feedback error" id="form-errors" tabindex="-1" role="alert"><h2>${esc(t('validationTitle'))}</h2><ul>${formErrors.map(([name, key]) => `<li><a href="#${name}" data-field-link="${name}">${esc(t(key))}</a></li>`).join('')}</ul></div>` : '') +
    (createStatus ? feedback(esc(t({ pending:'createPending', failed:'createFailed', unknown:'createUnknown' }[createStatus])), createStatus === 'failed' ? 'error' : '', createStatus === 'unknown' ? button('recover-create','recoverProject') : createStatus === 'failed' ? button('retry-create','retryCreate') : '') : '') +
    `<div class="split"><form id="project-form" novalidate><fieldset ${createStatus === 'pending' || createStatus === 'unknown' ? 'disabled' : ''}>
    <section class="panel"><fieldset><legend>${esc(t('identity'))}</legend><div class="fields">${field('clientLabel','clientLabel',{extra:'maxlength="100" required'})}${field('source','source',{help:'sourceHelp',extra:'required spellcheck="false"'})}${field('phone','phone',{type:'tel',help:'phoneHelp'})}</div>${check('subfolders','subfolders')}</fieldset></section>
    <section class="panel"><fieldset><legend>${esc(t('appearance'))}</legend><label>${esc(t('layout'))}<select name="layout">${options([['grid','grid'],['masonry','masonry']],form.layout)}</select></label>${check('notesEnabled','notesEnabled')}</fieldset></section>
    <section class="panel"><fieldset><legend>${esc(t('workflows'))}</legend>${check('mainEnabled','mainEnabled')}<div class="fields">${field('quota','quota',{type:'number',help:'quotaHelp',extra:`min="1" max="500" step="1" ${form.mainEnabled ? '' : 'disabled'}`})}${field('mainDeadline','mainDeadline',{type:'datetime-local',help:'deadlineHelp',extra:form.mainEnabled ? '' : 'disabled'})}${field('mainPassword','mainPassword',{type:'password',help:'passwordHelp',extra:`autocomplete="off" ${form.mainEnabled ? '' : 'disabled'}`})}</div><hr>${check('downloadEnabled','downloadEnabled')}<div class="fields">${field('downloadDeadline','downloadDeadline',{type:'datetime-local',help:'deadlineHelp',extra:form.downloadEnabled ? '' : 'disabled'})}${field('downloadPassword','downloadPassword',{type:'password',help:'passwordHelp',extra:`autocomplete="off" ${form.downloadEnabled ? '' : 'disabled'}`})}</div></fieldset></section>
    <button class="primary" type="submit">${esc(t('createAction'))}</button></fieldset></form>
    <aside class="panel"><h2>${esc(t('preview'))}</h2><div class="neutral-cover">${esc(t('neutralCover'))}</div><strong id="preview-label">${esc(form.clientLabel)}</strong><p>${esc(t('sourcePending'))}</p><dl><dt>${esc(t('mainMenu'))}</dt><dd id="preview-main">${esc(t(form.mainEnabled ? 'enabled':'disabled'))} · ${esc(t('maxCount',{count:form.quota}))}<br>${esc(deadline('mainDeadline'))}</dd><dt>${esc(t('downloadMenu'))}</dt><dd id="preview-download">${esc(t(form.downloadEnabled?'enabled':'disabled'))}<br>${esc(deadline('downloadDeadline'))}</dd></dl></aside></div>`;
}
function inventoryFeedback() {
  if (inventory === 'pending') return feedback(esc(t('inventoryPending')), '', button('inventory-ready','finishInventory'));
  if (inventory === 'empty') return `<div class="empty"><h2>${esc(t('empty'))}</h2><p>${esc(t('inventoryEmpty'))}</p>${button('sync','retrySync')}</div>`;
  if (inventory === 'failed') return feedback(esc(t('inventoryFailed')) + `<br><small>${esc(t('lastSync',{date:date(clock)}))}</small>`,'error',route === 'detail' ? button('sync','retrySync') : '');
  return '';
}
const identityList = (items) => Object.entries(items).map(([id,note]) => `<li><strong>${esc(photo(id).name)}</strong> · ${esc(photo(id).folder)}<br><code>${id}</code>${note ? `<p>${esc(note)}</p>` : ''}</li>`).join('');
function renderDetail() {
  return heading('detail','durable','owner') + (created ? feedback(esc(t('durable')),'success') : '') +
    `<div class="split"><section><div class="panel"><h2>${esc(form.clientLabel)}</h2><dl><dt>${esc(t('projectId'))}</dt><dd><code>${projectId}</code></dd><dt>${esc(t('selectionStatus'))}</dt><dd>${esc(t(state.locked?'confirmed':selectedCount()?'selecting':'notStarted'))}</dd><dt>${esc(t('previewLink'))}</dt><dd><a href="#gate" data-route="gate">app.html#gate</a><br><small>${esc(t('noShare'))}</small></dd></dl>${button('nav:gate','clientPreview','class="primary"')}</div>
    <div class="panel"><h2>${esc(t('inventory'))}</h2>${inventoryFeedback()}${['ready','failed','unavailable'].includes(inventory) ? `<p>${esc(t('inventoryReady'))}</p><p class="muted">${esc(t('lastSync',{date:date(clock)}))}</p>` : ''}</div>
    <div class="panel"><h2>${esc(t('currentDraft'))} · r${state.revision}</h2>${Object.keys(state.canonical).length ? `<ul>${identityList(state.canonical)}</ul>` : `<p>${esc(t('noSelection'))}</p>`}<hr><h2>${esc(t('latestConfirmation'))}</h2>${state.snapshot ? `<p>${esc(date(state.snapshot.at))} · r${state.snapshot.revision}</p><ul>${identityList(state.snapshot.items)}</ul>` : `<p>${esc(t('none'))}</p>`}</div></section>
    <aside class="panel"><h2>${esc(t('workflows'))}</h2><dl><dt>${esc(t('mainMenu'))}</dt><dd>${esc(t(form.mainEnabled?'enabled':'disabled'))} · ${esc(t('maxCount',{count:state.quota}))}<br>${esc(deadline('mainDeadline'))}</dd><dt>${esc(t('downloadMenu'))}</dt><dd>${esc(t(form.downloadEnabled?'enabled':'disabled'))}<br>${esc(deadline('downloadDeadline'))}</dd></dl><p class="muted">${esc(t('downloadIndependent'))}</p></aside></div>`;
}
function renderGate() {
  return `<div class="narrow">${heading('gateTitle','gateIntro','client')}<section class="panel"><div class="neutral-cover">${esc(t('gateNeutral'))}</div>${gateError ? feedback(esc(t(gateError)),'error') : ''}<form id="gate-form"><label for="gallery-password">${esc(t('password'))}</label><div class="row"><input id="gallery-password" name="gallery-password" type="${passwordVisible?'text':'password'}" autocomplete="off" aria-describedby="password-fixture" ${attempts>=5?'disabled':''}>${button('password-toggle',passwordVisible?'hide':'show','aria-controls="gallery-password" aria-pressed="'+passwordVisible+'"')}</div><p id="password-fixture"><small>${esc(t('passwordFixture'))}</small></p><button class="primary" type="submit" ${attempts>=5?'disabled':''}>${esc(t('openGallery'))}</button></form>${attempts>=5?button('reset-throttle','resetThrottle'):''}</section><p class="muted">${esc(t('downloadIndependent'))}</p></div>`;
}
function stateFeedback() {
  const type = {failed:'error',conflict:'error',expired:'error',saved:'success'}[state.status] || '';
  let message, actions = '';
  if (state.status === 'saved') message = t('saved',{revision:state.revision});
  if (state.status === 'pending') message = t(state.pendingKind === 'confirm'?'confirming':'pendingSave');
  if (state.status === 'failed') { message = t('failedSave'); actions = button('retry-save','retry'); }
  if (state.status === 'unknown') { message = t(state.pendingKind === 'confirm'?'confirmUnknown':'unknownSave'); actions = button('recover-save','recover'); }
  if (state.status === 'conflict') {
    message = t('conflictSave');
    actions = !state.reconciled ? button('load-canonical','loadCanonical') : `${state.locked?'':button('reapply','reapply')}${button('use-canonical','useCanonical')}`;
    message = esc(message) + `<h3>${esc(t('localIntent'))}</h3><ul>${identityList(state.intent)}</ul>` + (state.reconciled ? `<h3>${esc(t('canonical'))} · r${state.revision}</h3><ul>${identityList(state.canonical)}</ul>` : '') + (state.locked ? `<p>${esc(t('lockedConflict'))}</p>` : '');
    return feedback(message,type,actions);
  }
  return feedback(esc(message || t('pendingSave')),type,actions);
}
function thumb(item, missing = true) {
  return item.missing && missing ? `<div class="missing"><span>${esc(t('missingThumb'))}</span>${button('retry-thumb','retryThumb',`data-id="${item.id}"`)}</div>` : `<img src="${item.src}" alt="" width="400" height="300">`;
}
function photoCard(item) {
  const picked = Object.hasOwn(state.intent,item.id);
  const disabled = lockedUI() || (!picked && selectedCount()>=state.quota);
  return `<article class="photo-card ${picked?'selected':''}" data-photo-id="${item.id}">${thumb(item)}<div class="photo-info"><p class="filename">${esc(item.name)}</p><p><small>${esc(item.folder)} · #${item.id.slice(-2)}</small></p><div class="photo-actions"><button type="button" data-action="toggle" data-id="${item.id}" data-focus="select-${item.id}" aria-pressed="${picked}" aria-disabled="${disabled}" aria-label="${esc(t(picked?'unselect':'select'))} ${esc(item.name)} · ${esc(item.folder)} · ${item.id.slice(-2)}" aria-describedby="selection-help">${picked?'☑':'☐'} ${esc(t(picked?'selected':'select'))}</button><button type="button" data-action="viewer" data-id="${item.id}" data-focus="enlarge-${item.id}" aria-label="${esc(t('enlarge'))} ${esc(item.name)} · ${esc(item.folder)} · ${item.id.slice(-2)}">${esc(t('enlarge'))} ↗</button></div></div></article>`;
}
function selectionBar() {
  return `<section class="selection-bar" aria-label="${esc(t('selectionStatus'))}"><div class="row spread"><div><strong>${esc(t('selectionCount',{count:selectedCount(),quota:state.quota}))}</strong><p id="selection-help" class="muted">${esc(t(selectedCount()>=state.quota?'quotaReached':'quotaHelp'))}</p></div>${button('nav:review','review','class="primary"')}</div>${stateFeedback()}</section>`;
}
function renderGallery() {
  const candidates = folder === 'empty' ? [] : photos.filter((item) => !folder || item.folder === folder);
  const visible = candidates.slice(0,limit);
  return heading('galleryTitle','galleryIntro','client') + `<div class="row spread"><p>${esc(form.clientLabel)}</p><div class="row layout-toggle" aria-label="${esc(t('layout'))}">${button('layout:grid','grid',`aria-pressed="${layout==='grid'}"`)}${button('layout:masonry','masonry',`aria-pressed="${layout==='masonry'}"`)}</div></div>` + inventoryFeedback() +
    (!['pending','empty'].includes(inventory) ? `<nav class="folders" aria-label="${esc(t('folder'))}">${[['','allFolders'],['Original',null],['Edited',null],['empty','emptyFolder']].map(([value,key])=>`<button type="button" data-action="folder" data-folder="${value}" aria-pressed="${folder===value}">${esc(key?t(key):value)}</button>`).join('')}</nav><p><small>${esc(t('shown',{shown:visible.length,total:candidates.length}))}</small></p>${visible.length?`<div class="grid ${layout==='masonry'?'masonry':''}">${visible.map(photoCard).join('')}</div>`:`<div class="empty"><p>${esc(t('folderEmpty'))}</p></div>`}${visible.length<candidates.length?`<div class="row">${button('load-more','loadMore')}</div>`:''}`:'') + selectionBar();
}
function renderReview() {
  const items = state.locked && state.status==='saved' ? state.snapshot.items : state.intent;
  const canConfirm = state.status==='saved' && !state.locked && selectedCount()>0 && !Object.hasOwn(state.intent,state.unavailable);
  return heading(state.locked&&state.status==='saved'?'confirmedTitle':'reviewTitle','reviewIntro','client') +
    (state.locked&&state.status==='saved' ? feedback(esc(t('confirmedCopy',{count:Object.keys(items).length,date:date(state.snapshot.at),revision:state.snapshot.revision})) + `<br><small>${esc(t('confirmationId'))}: ${state.snapshot.id}</small>`,'success') : stateFeedback()) +
    `<section class="panel"><strong>${esc(t('selectionCount',{count:Object.keys(items).length,quota:state.quota}))}</strong>${Object.keys(items).length?`<ul class="review-list">${Object.entries(items).map(([id,note])=>`<li class="review-item" data-photo-id="${id}"><img src="${photo(id).src}" width="90" height="90" alt=""><div><p class="filename">${esc(photo(id).name)}</p><p>${esc(photo(id).folder)}</p><code>${id}</code>${note?`<p>${esc(t('note'))}: ${esc(note)}</p>`:''}${id===state.unavailable?`<p class="error-text">${esc(t('sourceMissing'))}</p>`:''}<div class="row">${button('viewer','enlarge',`data-id="${id}" data-focus="review-enlarge-${id}"`)}${form.notesEnabled?button('note','editNote',`data-id="${id}" data-focus="note-${id}" ${lockedUI()?'disabled':''}`):''}${button('toggle','unselect',`data-id="${id}" data-focus="remove-${id}" ${lockedUI()?'disabled':''}`)}</div></div></li>`).join('')}</ul>`:`<div class="empty"><p>${esc(t('noSelection'))}</p></div>`}</section><div class="row spread">${button('nav:gallery','backGallery')}${state.locked&&state.status==='saved'?'':button('confirm-dialog','confirm',`class="primary" data-focus="confirm" ${canConfirm?'disabled-false':'disabled'} aria-describedby="confirm-help"`).replace('disabled-false','')}</div>${!canConfirm&&!state.locked?`<p id="confirm-help" class="muted">${esc(t('waitSaved'))}</p>`:''}`;
}
function renderAccess() {
  const values = {date:deadline('mainDeadline')};
  const owner=accessState==='ownerSession';
  return `<div class="narrow">${heading(accessState,accessState+'Copy',owner?'owner':'client')}<section class="panel">${owner?button('owner-resume','resumeOwner','class="primary"'):accessState==='session'?button('reauth','reauthenticate','class="primary"'):accessState==='service'?button('service-retry','retryService','class="primary"'):''}${owner?'':button('nav:gate','returnGate')}</section>${owner?'':`<p class="muted">${esc(t('downloadIndependent'))}</p>`}</div>`;
}
function renderComponents() {
  return heading('componentTitle','componentIntro','prototype') + `<div class="split"><section><div class="panel"><h2>${esc(t('componentTokens'))}</h2><div class="swatches">${['background','surface','text','muted','primary','error','success','border','focus','warning'].map(key=>`<div><code>--${key}</code></div>`).join('')}</div><p><code>4 / 8 / 12 / 16 / 24 / 32 / 48px · 16px / 1.5 · 44×44px</code></p></div><div class="panel"><h2>${esc(t('componentControls'))}</h2><p>${esc(t('componentKeyboardCopy'))}</p><div class="row">${button('nav:create','create','class="primary"')}${button('nav:gallery','gallery')}</div><label>${esc(t('note'))}<textarea aria-describedby="component-note-help"></textarea><small id="component-note-help">${esc(t('noteHelp'))}</small></label></div></section><section class="panel"><h2>${esc(t('componentStates'))}</h2>${['pendingSave','saved','confirmed','conflictSave','expired'].map(key=>feedback(esc(t(key,{revision:8})),key==='conflictSave'?'error':'')).join('')}<h2>${esc(t('componentKeyboard'))}</h2><p>${esc(t('componentKeyboardCopy'))}</p></section></div>`;
}
function render({focusTitle=false}={}) {
  const focused = document.activeElement;
  const focusId = focused?.id;
  const focusKey = focused?.dataset.focus;
  const selection = ['INPUT','TEXTAREA'].includes(focused?.tagName) ? [focused.selectionStart, focused.selectionEnd] : null;
  document.documentElement.lang = locale;
  document.documentElement.dataset.theme = theme;
  renderLab();
  const content = { create:renderCreate, detail:renderDetail, gate:renderGate, gallery:renderGallery, review:renderReview, access:renderAccess, components:renderComponents }[route]();
  $('#shell').innerHTML = `<header class="brand"><strong>snappik<span> / ${esc(t('prototype'))}</span></strong><span>${esc(t(['create','detail'].includes(route)||(route==='access'&&accessState==='ownerSession')?'owner':'client'))}</span></header><main id="main" tabindex="-1">${content}${transient?feedback(esc(transient),'error'):''}<footer><hr><small>${esc(t('noIntegration'))}</small></footer></main>`;
  if (focusTitle) $('#page-title').focus();
  else {
    const target = focusKey ? document.querySelector(`[data-focus="${focusKey}"]`) : focusId ? document.getElementById(focusId) : null;
    if (target && !target.disabled) { target.focus({preventScroll:true}); if (selection && target.type!=='number') { try { target.setSelectionRange(...selection); } catch { /* Non-text inputs have no caret. */ } } }
    else if(focusId||focusKey) $('#page-title').focus({preventScroll:true});
  }
}
function go(page) {
  if (['gallery','review'].includes(page) && (!grant || !form.mainEnabled)) page = 'gate';
  route = page; transient = ''; location.hash = page; render({focusTitle:true});
}
function saveRequest(kind='save') {
  if (kind==='save') state.pendingKind='save';
  clearTimeout(requestTimer);
  render();
  announce(t(state.pendingKind==='confirm'?'confirming':'pendingSave'));
  if (nextResponse !== 'hold') requestTimer = setTimeout(()=>deliver(nextResponse),900);
}
function deliver(outcome=nextResponse) {
  clearTimeout(requestTimer);
  if (outcome==='hold') outcome='success';
  if (createStatus==='pending') {
    if (outcome==='offline') createStatus='failed';
    else if (outcome==='expired') { createStatus='failed'; accessState='ownerSession'; go('access'); return; }
    else if (['conflict','other-confirmed'].includes(outcome)) { createStatus='failed'; }
    else { created=true; inventory='pending'; state.quota=Number(form.quota); layout=form.layout; createStatus=outcome==='lost'?'unknown':''; if (!createStatus) { go('detail'); announce(t('durable')); return; } }
    render(); announce(t(createStatus==='unknown'?'createUnknown':'createFailed')); return;
  }
  respond(state,outcome);
  if (state.status==='expired') { grant=false; accessState='expired'; go('access'); announce(t('expired')); return; }
  render();
  if(modal?.kind==='viewer') renderDialog();
  announce(state.status==='saved'?t(state.locked?'confirmed':'saved',{revision:state.revision}):t({failed:'failedSave',unknown:'unknownSave',conflict:'conflictSave'}[state.status]||'pendingSave'));
}
function validateForm() {
  const errors=[];
  if (!form.clientLabel.trim() || [...form.clientLabel].length>100) errors.push(['clientLabel','labelError']);
  if (!/^synthetic-[a-z0-9-]+$/.test(form.source)) errors.push(['source','sourceError']);
  if (form.phone && !/^\+[1-9]\d{7,14}$/.test(form.phone)) errors.push(['phone','phoneError']);
  if (!form.mainEnabled&&!form.downloadEnabled) errors.push(['mainEnabled','workflowError']);
  if (form.mainEnabled && (!Number.isInteger(Number(form.quota)) || Number(form.quota)<1 || Number(form.quota)>500)) errors.push(['quota','quotaError']);
  for (const prefix of ['main','download']) {
    if (!form[prefix+'Enabled']) continue;
    if (form[prefix+'Password'] && ([...form[prefix+'Password']].length<8||[...form[prefix+'Password']].length>128)) errors.push([prefix+'Password','passwordError']);
    if (form[prefix+'Deadline'] && !(new Date(form[prefix+'Deadline']+':00+08:00')>new Date(clock))) errors.push([prefix+'Deadline','dateError']);
  }
  formErrors=errors; return !errors.length;
}
function createProject() {
  if (!validateForm()) { render(); $('#form-errors').focus(); return; }
  createStatus='pending'; render(); announce(t('createPending')); clearTimeout(requestTimer);
  if (nextResponse!=='hold') requestTimer=setTimeout(()=>deliver(nextResponse),900);
}
function closeDialog() {
  const target=returnFocus;
  modal=null; const dialog=$('dialog'); if (dialog) dialog.close(); $('#dialogs').replaceChildren();
  if (target) document.querySelector(`[data-focus="${target}"]`)?.focus();
}
function showDialog(kind,id,origin) {
  if (!modal) returnFocus=origin || document.activeElement?.dataset.focus;
  modal={kind,id,zoom:false}; renderDialog();
}
function renderDialog() {
  const {kind,id,zoom}=modal, item=id?photo(id):null;
  const focusedAction=document.activeElement?.closest('dialog') ? document.activeElement.dataset.action : null;
  let content='';
  if (kind==='viewer') {
    const chosen=Object.hasOwn(state.intent,id);
    content=`<div class="row spread"><h2 id="dialog-title" tabindex="-1">${esc(t('viewer'))}</h2>${button('close','close','autofocus data-focus="dialog-close"')}</div><p class="filename">${esc(item.name)} · ${esc(item.folder)}</p><code>${item.id}</code>${item.missing?`<div class="missing">${esc(t('missingThumb'))}</div>`:`<img class="viewer-image ${zoom?'zoomed':''}" src="${item.src}" alt="${esc(item.name)} · ${esc(item.folder)}">`}<div class="row">${button('viewer-prev','previous')}${button('viewer-next','next')}${button('viewer-zoom',zoom?'resetZoom':'zoom',item.missing?'disabled':'')}${button('viewer-toggle',chosen?'unselect':'select',`aria-pressed="${chosen}" ${lockedUI()||(!chosen&&selectedCount()>=state.quota)?'disabled':''}`)}${chosen&&form.notesEnabled?button('viewer-note','editNote',lockedUI()?'disabled':''):''}</div><p class="viewer-help">${esc(t('viewerHelp'))}</p><p role="status">${esc(t(state.status==='pending'?'pendingSave':state.status==='saved'?'saved':'failedSave',{revision:state.revision}))}</p>`;
  }
  if (kind==='note') content=`<h2 id="dialog-title">${esc(t('editNote'))}</h2><p>${esc(item.name)} · ${esc(item.folder)}</p><label for="note-input">${esc(t('note'))}</label><textarea id="note-input" autofocus aria-describedby="note-help note-count note-error">${esc(state.intent[id])}</textarea><p id="note-help"><small>${esc(t('noteHelp'))}</small></p><p id="note-count">${esc(t('noteCount',{count:[...state.intent[id]].length}))}</p><p id="note-error" role="alert" class="error-text"></p><div class="row">${button('save-note','saveNote','class="primary" id="save-note"')}${button('close','cancel')}</div>`;
  if (kind==='remove') content=`<h2 id="dialog-title">${esc(t('removeTitle'))}</h2><p>${esc(item.name)} · ${esc(item.folder)}</p><p>${esc(t('removeWarning'))}</p><div class="row">${button('close','cancel','autofocus')}${button('remove-photo','remove','class="primary"')}</div>`;
  if (kind==='confirm') content=`<h2 id="dialog-title">${esc(t('confirmTitle'))}</h2><p>${esc(t('confirmWarning',{count:selectedCount()}))}</p><div class="row">${button('close','cancel','autofocus')}${button('confirm-now','confirmAction','class="primary"')}</div>`;
  const old=$('dialog'); if(old) old.close();
  $('#dialogs').innerHTML=`<dialog aria-labelledby="dialog-title" ${kind==='viewer'?'tabindex="-1"':''}>${content}</dialog>`;
  $('dialog').addEventListener('cancel',(event)=>{event.preventDefault();closeDialog();});
  $('dialog').showModal();
  if(focusedAction) $('dialog').querySelector(`[data-action="${focusedAction}"]:not(:disabled)`)?.focus();
}
function togglePhoto(id) {
  if (Object.hasOwn(state.intent,id) && state.intent[id]) { showDialog('remove',id); return; }
  if(stage(state,id)) { saveRequest(); if(modal?.kind==='viewer') renderDialog(); }
}
document.addEventListener('submit',(event)=>{
  event.preventDefault();
  if(event.target.id==='project-form') createProject();
  if(event.target.id==='gate-form') {
    if(attempts>=5) return;
    if($('#gallery-password').value!=='fixture-main') { attempts++;gateError=attempts>=5?'throttled':'wrongPassword';render();$('#gallery-password')?.focus();return; }
    if(!form.mainEnabled) { accessState='revoked';go('access');return; }
    grant=true;gateError='';
    if(state.status==='expired') { state.status='conflict';state.reconciled=false; }
    go('gallery');
  }
});
document.addEventListener('input',(event)=>{
  if(event.target.closest('#project-form')) {
    const input=event.target; form[input.name]=input.type==='checkbox'?input.checked:input.value;
    $('#preview-label').textContent=form.clientLabel;
  }
  if(event.target.id==='note-input') {
    const count=[...event.target.value].length; $('#note-count').textContent=t('noteCount',{count});$('#note-error').textContent=count>500?t('noteError'):'';$('#save-note').disabled=count>500;
  }
});
document.addEventListener('change',(event)=>{
  const input=event.target;
  if(input.id==='locale') { locale=input.value;render();if(modal)renderDialog(); }
  if(input.id==='theme') { theme=input.value;render(); }
  if(input.id==='response') nextResponse=input.value;
  if(input.id==='inventory') {
    inventory=input.value;
    if(inventory==='unavailable') {
      state.unavailable=photos[0].id;
      if(!selectedCount()) { state.intent[photos[0].id]='';state.canonical=structuredClone(state.intent); }
    } else state.unavailable=null;
    render();
  }
  if(input.id==='access-scenario') { accessState=input.value;grant=false;go('access'); }
  if(input.closest('#project-form')) render();
});
document.addEventListener('click',(event)=>{
  const fieldLink=event.target.closest('[data-field-link]');
  if(fieldLink) { event.preventDefault();document.getElementById(fieldLink.dataset.fieldLink).focus();return; }
  const link=event.target.closest('[data-route]'); if(link) {event.preventDefault();go(link.dataset.route);return;}
  const control=event.target.closest('[data-action]');if(!control||control.disabled||control.getAttribute('aria-disabled')==='true')return;
  const action=control.dataset.action,id=control.dataset.id;
  if(action.startsWith('nav:')) {go(action.slice(4));return;}
  if(action.startsWith('layout:')) {layout=action.slice(7);render();return;}
  if(action==='deliver') deliver();
  if(action==='reset') {clearTimeout(requestTimer);closeDialog();state=initial();inventory='ready';folder='';limit=4;grant=false;created=false;createStatus='';formErrors=[];gateError='';attempts=0;nextResponse='success';go('create');}
  if(action==='retry-create') createProject();
  if(action==='recover-create') {createStatus='';go('detail');announce(t('durable'));}
  if(action==='sync') {inventory='pending';render();announce(t('inventoryPending'));}
  if(action==='inventory-ready') {inventory='ready';render();announce(t('inventoryReady'));}
  if(action==='password-toggle') {const value=$('#gallery-password').value;passwordVisible=!passwordVisible;render();$('#gallery-password').value=value;$('#gallery-password').focus();}
  if(action==='reset-throttle') {attempts=0;gateError='';render();}
  if(action==='folder') {folder=control.dataset.folder;limit=4;render();announce(t('folder')+': '+(folder||t('allFolders')));}
  if(action==='load-more') {limit+=4;render();announce(t('shown',{shown:Math.min(limit,photos.filter(p=>!folder||p.folder===folder).length),total:photos.filter(p=>!folder||p.folder===folder).length}));}
  if(action==='retry-thumb') {transient=t('thumbnailFailed');render();announce(transient);}
  if(action==='toggle') togglePhoto(id);
  if(action==='viewer') showDialog('viewer',id,control.dataset.focus);
  if(action==='note') showDialog('note',id,control.dataset.focus);
  if(action==='close') closeDialog();
  if(action==='viewer-prev'||action==='viewer-next') {
    const candidates=route==='review' ? Object.keys(state.intent).map(photo) : photos.filter(p=>!folder||p.folder===folder);
    const index=candidates.findIndex(p=>p.id===modal.id);
    if(!candidates.length) return;
    modal.id=candidates[(index+(action==='viewer-next'?1:-1)+candidates.length)%candidates.length].id;modal.zoom=false;renderDialog();
  }
  if(action==='viewer-zoom') {modal.zoom=!modal.zoom;renderDialog();}
  if(action==='viewer-toggle') togglePhoto(modal.id);
  if(action==='viewer-note') showDialog('note',modal.id);
  if(action==='save-note') {const note=$('#note-input').value,key=modal.id;if([...note].length<=500) {closeDialog();if(stage(state,key,note))saveRequest();}}
  if(action==='remove-photo') {const key=modal.id;closeDialog();if(stage(state,key))saveRequest();}
  if(action==='retry-save') {state.status='pending';saveRequest(state.pendingKind);}
  if(action==='recover-save'||action==='use-canonical') {recover(state);render();announce(t(state.locked?'confirmed':'saved',{revision:state.revision}));}
  if(action==='load-canonical') {loadConflict(state);render();announce(t('canonical'));}
  if(action==='reapply'&&reapply(state)) saveRequest();
  if(action==='confirm-dialog') showDialog('confirm',null,'confirm');
  if(action==='confirm-now') {closeDialog();if(beginConfirm(state))saveRequest('confirm');}
  if(action==='reauth') go('gate');
  if(action==='owner-resume') go('create');
  if(action==='service-retry') {grant=true;go('gallery');announce(t('saved',{revision:state.revision}));}
});
document.addEventListener('keydown',(event)=>{
  if(modal && event.key==='Tab') {
    const dialog=$('dialog');
    const controls=[...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea, select, a[href], [tabindex="0"]')];
    const first=controls[0],last=controls.at(-1);
    if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))) {event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))) {event.preventDefault();first?.focus();}
  }
  if(modal?.kind!=='viewer'||event.altKey||event.ctrlKey||event.metaKey||['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))return;
  if(['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault();document.querySelector(`[data-action="${event.key==='ArrowLeft'?'viewer-prev':'viewer-next'}"]`).click(); }
  if(event.code==='Space'&&event.target.tagName!=='BUTTON') {event.preventDefault();document.querySelector('[data-action="viewer-toggle"]').click();}
});
window.addEventListener('hashchange',()=>{
  const page=location.hash.slice(1);if(page!==route&&['create','detail','gate','gallery','review','access','components'].includes(page))go(page);
});
const start=location.hash.slice(1);
if(['detail','gate','access','components'].includes(start))route=start;
else if(['gallery','review'].includes(start))route='gate';
render();

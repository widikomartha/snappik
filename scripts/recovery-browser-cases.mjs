// Run from the documented CUA browser REPL, passing its actual browser/tab handles.
// No alternative browser driver, test-only product route, or secret artifact is used.
import assert from 'node:assert/strict';
export function recoveryBrowserCases({app,panel,browser,origin}) {
  const results=[];let account={resetPassword:'Synthetic-browser-invalid!Password-4826'},link,usedLink;
  const status=()=>app.playwright.getByRole('status').innerText();
  const alert=()=>app.playwright.locator('main').getByRole('alert').innerText();
  async function control(action){
    await panel.playwright.getByRole('button',{name:action,exact:true}).click();
    await panel.playwright.locator('button:disabled').waitFor({state:'hidden',timeoutMs:15000});
    const result=JSON.parse(await panel.playwright.locator('#result').innerText());
    assert.ok(!result.error,'FIXTURE_CONTROL_FAILED');return result;
  }
  async function seed(){account=await control('seed');return account;}
  async function request(email=account.email){
    if((await app.url())!==origin+'/recover')await app.goto(origin+'/recover');else await app.reload();
    await app.playwright.getByLabel('Email',{exact:true}).fill(email);
    await app.playwright.getByRole('button',{name:'Minta pemulihan',exact:true}).click();
    await app.playwright.getByText(/^Permintaan diterima\./).waitFor({state:'visible',timeoutMs:15000});
    return status();
  }
  async function delivery(){await control('link');link=await panel.playwright.locator('#delivery').getAttribute('href');assert.ok(link,'SYNTHETIC_LINK_MISSING');return link;}
  async function open(value=link){await app.goto(value);await app.playwright.waitForURL(origin+'/recover',{timeoutMs:5000});await app.playwright.getByLabel('Kata sandi baru',{exact:true}).waitFor({state:'visible'});assert.equal((await app.url()).includes('#'),false,'FRAGMENT_REMAINED');}
  async function submit(){await app.playwright.getByLabel('Kata sandi baru',{exact:true}).fill(account.resetPassword);await app.playwright.getByRole('button',{name:'Perbarui kata sandi',exact:true}).click();}
  async function success(){await app.playwright.getByText(/^Kata sandi diperbarui\./).waitFor({state:'visible',timeoutMs:15000});}
  async function uncertain(){const until=Date.now()+21000;for(;;){try{await app.playwright.getByText(/^Hasil belum dapat dipastikan\./).waitFor({state:'visible',timeoutMs:1000});return;}catch(error){if(Date.now()>=until)throw error;}}}
  async function invalid(){await app.playwright.getByText(/^Tautan tidak valid/).waitFor({state:'visible',timeoutMs:10000});}
  async function test(id,fn){try{await fn();results.push({id,status:'Passed'});}catch(error){const line=error.stack?.match(/recovery-browser-cases\.mjs[^\n]*?:\d+:\d+/)?.[0]??'unknown';results.push({id,status:'Failed'});throw new Error(`RECOVERY_BROWSER_CASE_FAILED:${id}:${error.name}:${line}:${typeof error.actual==='number'?error.actual:''}:${typeof error.expected==='number'?error.expected:''}`);}}
  async function login(password){await app.goto(origin+'/login');await app.playwright.getByLabel('Email',{exact:true}).fill(account.email);
    await app.playwright.getByLabel('Kata sandi',{exact:true}).fill(password);await app.playwright.getByRole('button',{name:'Masuk',exact:true}).click();}
  const sections={
    async success(){
      await test('B01-known-unknown',async()=>{
        await seed();const known=await request();const unknown=await request('unknown-browser@example.test');assert.equal(known,unknown);
        const audit=await control('audit'),requests=audit.requests.filter(r=>r.path.endsWith('/request-password-reset')).slice(-2);
        assert.deepEqual(requests.map(r=>[r.status,r.body]),[[202,'{"accepted":true}'],[202,'{"accepted":true}']]);
      });
      await test('B02-browser-login-reset-old-sessions',async()=>{
        await login(account.password);await app.playwright.waitForURL(origin+'/onboarding?return_to=/app',{timeoutMs:15000});
        // The known request already queued its link; unknown delivery never invokes the sink.
        await delivery();await open();await submit();await success();usedLink=link;
        assert.equal(await app.playwright.getByLabel('Kata sandi baru',{exact:true}).count(),0);
        const verified=await control('verify');assert.deepEqual(verified.old_sessions,[401,401]);assert.equal(verified.old_password,401);assert.equal(verified.new_password,200);assert.equal(verified.version,2);
        await app.goto(origin+'/app');await app.playwright.getByRole('heading',{name:'Masuk ke Snappik'}).waitFor({state:'visible'});
        await login(account.password);await app.playwright.getByText('Tidak dapat masuk. Periksa kredensial atau kode Anda.').waitFor({state:'visible'});
        await login(account.resetPassword);await app.playwright.waitForURL(origin+'/onboarding?return_to=/app',{timeoutMs:15000});
      });
      await test('B03-consumed-and-hash-navigation',async()=>{await app.goto(origin+'/recover');await open(usedLink);await submit();await invalid();});
    },
    async errors(){
      await test('B04-malformed-duplicate-missing',async()=>{
        for(const hash of ['#token=bad','#token=','#token='+'A'.repeat(43)+'&token='+'B'.repeat(43),'#unexpected=value']) {
          await app.goto(origin+'/recover'+hash);await app.playwright.waitForURL(origin+'/recover',{timeoutMs:5000});await invalid();assert.equal((await app.url()).includes('#'),false);assert.equal(await app.playwright.getByLabel('Kata sandi baru',{exact:true}).count(),0);
        }
        await app.reload();await app.playwright.getByLabel('Email',{exact:true}).waitFor({state:'visible'});assert.equal(await app.playwright.getByLabel('Email',{exact:true}).count(),1);
        assert.ok((await app.playwright.getByText(/Jika halaman dimuat ulang/).innerText()).length>0);
      });
      await test('B05-invalid-well-formed',async()=>{await open(origin+'/recover#token='+'A'.repeat(43));await submit();await invalid();});
      await test('B06-expired',async()=>{await seed();await request();await delivery();await control('expire-token');await open();await submit();await invalid();
        const state=await control('verify');assert.equal(state.old_password,200);assert.equal(state.new_password,401);assert.equal(state.version,1);});
      await test('B07-short-password-denied',async()=>{await seed();await request();await delivery();await open();
        const before=(await control('audit')).requests.length;
        await app.playwright.getByLabel('Kata sandi baru',{exact:true}).pressSequentially('short');await app.playwright.getByRole('button',{name:'Perbarui kata sandi',exact:true}).click();
        const after=await control('audit');if(after.requests.length>before){assert.equal(after.requests.at(-1).status,400);assert.match(await alert(),/^Periksa isian Anda/);}assert.equal(await app.playwright.getByLabel('Kata sandi baru',{exact:true}).count(),1);const verified=await control('verify');assert.equal(verified.version,1);assert.equal(verified.new_password,401);
      });
      await test('B08-persistence-failure-and-retry',async()=>{await control('fail-reset');await submit();await uncertain();
        const state=await control('verify');assert.equal(state.old_password,200);assert.equal(state.new_password,401);assert.equal(state.version,1);
        await control('clear-failure');await submit();await success();});
    },
    async transport(){
      await test('B09-html200-no-false-success',async()=>{await seed();await app.goto(origin+'/recover');
        await control('html request-password-reset');const count=(await control('audit')).requests_count;
        await app.playwright.getByLabel('Email',{exact:true}).fill(account.email);await app.playwright.getByRole('button',{name:'Minta pemulihan',exact:true}).click();await uncertain();
        assert.equal((await control('audit')).requests_count,count);});
      await test('B10-request-response-loss-dedupe',async()=>{await control('drop-after request-password-reset');
        const before=(await control('audit')).requests_count;await app.playwright.getByRole('button',{name:'Minta pemulihan',exact:true}).click();await app.playwright.getByText(/^(Hasil belum dapat dipastikan|Permintaan diterima)\./).waitFor({state:'visible'});
        assert.equal((await control('audit')).requests_count,before+1);
        if((await app.playwright.locator('main').innerText()).includes('Hasil belum dapat dipastikan')){await app.playwright.getByRole('button',{name:'Minta pemulihan',exact:true}).click();await app.playwright.getByText(/^Permintaan diterima\./).waitFor({state:'visible'});}
        assert.equal((await control('audit')).requests_count,before+1);});
      await test('B11-reset-response-loss-and-refresh',async()=>{await delivery();await open();await control('drop-after reset-password');await submit();await app.playwright.getByText(/^(Hasil belum dapat dipastikan|Tautan tidak valid)/).waitFor({state:'visible'});
        const state=await control('verify');assert.equal(state.new_password,200);assert.equal(state.old_password,401);assert.equal(state.version,2);
        await submit();await invalid();const consumed=(await control('audit')).consumed;await app.reload();await app.playwright.getByLabel('Email',{exact:true}).waitFor({state:'visible'});
        assert.equal(await app.playwright.getByLabel('Email',{exact:true}).count(),1);assert.equal((await control('audit')).consumed,consumed);});
      await test('B12-session-expiry-independent-reset',async()=>{await seed();await request();await delivery();await control('expire-sessions');await open();await submit();await success();
        const state=await control('verify');assert.deepEqual(state.old_sessions,[401,401]);assert.equal(state.new_password,200);});
    },
    async usability(){
      await test('B13-loading-disabled-and-deadline',async()=>{await seed();await app.goto(origin+'/recover');await control('hold-after request-password-reset');
        await app.playwright.getByLabel('Email',{exact:true}).fill(account.email);await app.playwright.getByRole('button',{name:'Minta pemulihan',exact:true}).click();
        await app.playwright.getByRole('button',{name:'Memproses…',exact:true}).waitFor({state:'visible'});assert.equal(await app.playwright.getByRole('button',{name:'Memproses…',exact:true}).isEnabled(),false);
        assert.equal(await app.playwright.getByLabel('Email',{exact:true}).isEnabled(),false);
        await uncertain();assert.equal(await app.playwright.getByRole('button',{name:'Minta pemulihan',exact:true}).isEnabled(),true);await control('release');
      });
      await test('B14-locales-keyboard-and-reset-state',async()=>{await delivery();await open();await app.playwright.getByRole('button',{name:'English',exact:true}).click();
        assert.equal(await app.playwright.getByRole('heading',{name:'Account recovery',exact:true}).count(),1);
        assert.equal(await app.playwright.getByLabel('New password',{exact:true}).count(),1);
        await app.playwright.getByLabel('New password',{exact:true}).fill(account.resetPassword);
        await app.playwright.getByLabel('New password',{exact:true}).press('Tab');
        await app.playwright.getByRole('button',{name:'Update password',exact:true}).press('Enter');
        await app.playwright.getByText(/^Password updated\./).waitFor({state:'visible'});
        assert.equal(await app.playwright.getByRole('link',{name:'Back to sign in',exact:true}).count(),1);
      });
      await test('B15-responsive-320-768-1440',async()=>{
        const viewport=await browser.capabilities.get('viewport');
        try{for(const width of [320,768,1440]){await viewport.set({width,height:900});
          const dimensions=await app.playwright.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
          assert.ok(dimensions.scroll<=dimensions.width,'HORIZONTAL_OVERFLOW');
        }}finally{await viewport.reset();}
      });
      await test('B16-request-referrer-server-log-redaction',async()=>{const audit=await control('audit');assert.equal(audit.token_in_server_logs,false);assert.equal(audit.token_network_leaks,0);});
    }
  };
  return {run:async(name)=>{if(!sections[name])throw new Error('UNKNOWN_SECTION');await sections[name]();return results;},results,
    // URLs intentionally stay in this object's closure and never enter the results artifact.
    audit:()=>control('audit')};
}

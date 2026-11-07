const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL || undefined});try{
const context=await browser.newContext({viewport:{width:1920,height:1080}});
await context.addInitScript(()=>{
 if(!localStorage.getItem('kipsmthn.settings.v1')&&!localStorage.getItem('b1ackha7tv.settings.v1'))localStorage.setItem('b1ackha7tv.settings.v1',JSON.stringify({backgroundVersion:2,theme:'ember',favorites:['saved.app'],preview:false}));
});
const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('app/index.html')).href);
assert.equal(await p.locator('#launcher-title').innerText(),'Kipsmthn');
assert.equal(await p.locator('#launcher-mark').innerText(),'K');
assert.equal(await p.title(),'Kipsmthn');
await p.locator('#settings-open').click();await p.locator('[data-panel="about"]').click();await p.locator('#launcher-name').fill('  Living   Room  ');await p.locator('#name-save').click();
assert.equal(await p.locator('#launcher-title').innerText(),'Living Room');assert.equal(await p.locator('#launcher-mark').innerText(),'LR');
await p.reload();assert.equal(await p.locator('#launcher-title').innerText(),'Living Room');
const prefs=await p.evaluate(()=>JSON.parse(localStorage.getItem('kipsmthn.settings.v1')));assert.deepEqual(prefs.favorites,['saved.app']);assert.equal(prefs.preview,false);assert.equal(prefs.theme,'cinematic','obsolete ember theme safely migrates to cinematic');
assert.equal(await p.evaluate(()=>localStorage.getItem('b1ackha7tv.settings.v1')),null);
await p.locator('#settings-open').click();await p.locator('[data-panel="about"]').click();
await p.locator('#launcher-name').fill('<img src=x onerror=alert(1)>');await p.locator('#name-save').click();
assert.equal(await p.locator('#launcher-title img').count(),0);assert.equal(await p.locator('#launcher-title').innerText(),'<img src=x onerror=alert(1)>');
await p.locator('#launcher-name').fill(' ');await p.locator('#name-save').click();assert.equal(await p.locator('#launcher-title').innerText(),'Kipsmthn');
await p.locator('#launcher-name').fill('Home');await p.locator('#name-save').click();await p.locator('#name-reset').click();await p.reload();assert.equal(await p.locator('#launcher-title').innerText(),'Kipsmthn');
assert.deepEqual(errors,[]);
console.log('PASS: Kipsmthn default branding, legacy settings migration, name persistence, safe rendering, normalization, reset, and preference preservation.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});

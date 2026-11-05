const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const b=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL || undefined});try{
const c=await b.newContext({viewport:{width:1920,height:1080}});
await c.addInitScript(()=>{
 if(!localStorage.getItem('b1ackha7tv.settings.v1'))localStorage.setItem('b1ackha7tv.settings.v1',JSON.stringify({photoVersion:1,favorites:['prime.b','prime.a','disney.hidden','disney.visible','other','repeat','repeat','not-returned'],background:'',preview:false}));
 window.launched=[];
 window.list=[{id:'prime.a',name:'Amazon Prime Video',show:true},{id:'prime.b',name:'Prime Video',show:true},{id:'disney.hidden',name:'Disney+',show:false},{id:'disney.visible',name:'Disney Plus',show:true},{id:'other',name:'Disney+ Hotstar',show:true},{id:'repeat',name:'Unrelated',show:true},{id:'repeat',name:'Unrelated',show:true}];
 window.tizen={application:{getCurrentApplication:()=>({appInfo:{id:'self'}}),getAppsInfo:yes=>yes(list),launch:(id,yes,no)=>{launched.push(id);no({name:'TestError'});}}};
});
const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(pathToFileURL(path.resolve('app/index.html')).href);
// Initial render: Home page shows 4 apps (deduped)
assert.equal(await p.locator('#apps .app').count(),4);
assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('b1ackha7tv.settings.v1')).favorites),['prime.b','disney.visible','other','repeat','not-returned']);
// Click prime.b -> launch attempt (on Home page)
await p.locator('#apps [data-app-id="prime.b"]').click();assert.deepEqual(await p.evaluate(()=>launched),['prime.b']);
// Navigate to Apps page
await p.locator('[data-page="apps"]').click();
// In normal mode, Apps page shows all 4 unique apps
assert.equal(await p.locator('#apps-grid .app').count(),4);
// Enter edit mode
await p.locator('#edit-apps').click();assert.equal(await p.locator('#apps-grid .app').count(),4);
// Toggle prime.b off (remove from favorites)
await p.locator('#apps-grid [data-app-id="prime.b"]').click();
// Exit edit mode
await p.keyboard.press('Escape');
// Back on Home page (after Escape), should show 3 favorites
await p.locator('[data-page="home"]').click();
assert.equal(await p.locator('#apps .app').count(),3);
// Reload and verify persistence
await p.reload();assert.equal(await p.locator('#apps .app').count(),3);
// Toggle edit mode on again
await p.locator('[data-page="apps"]').click();
await p.locator('#edit-apps').click();assert.equal(await p.locator('#apps-grid .app').count(),4);
// Toggle prime.a on
await p.locator('#apps-grid [data-app-id="prime.a"]').click();await p.keyboard.press('Escape');
// Back on Home page
await p.locator('[data-page="home"]').click();
assert.equal(await p.locator('#apps .app').count(),4);
// Reverse list and refresh
await p.evaluate(()=>list.reverse());
await p.locator('[data-page="apps"]').click();
await p.locator('#apps-refresh').click();
// On Apps page, only 1 prime.a should be visible (deduped)
assert.equal(await p.locator('#apps-grid [data-app-id="prime.a"]').count(),1);
assert.equal(await p.locator('#apps-grid [data-app-id="other"]').count(),1);
assert.deepEqual(errors,[]);
console.log('Duplicate app regression checks passed');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});
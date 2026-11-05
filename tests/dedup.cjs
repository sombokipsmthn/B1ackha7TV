const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const b=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL || undefined});try{
const c=await b.newContext({viewport:{width:1920,height:1080}});
await c.addInitScript(()=>{
 if(!localStorage.getItem('kipsmthn.settings.v1'))localStorage.setItem('kipsmthn.settings.v1',JSON.stringify({backgroundVersion:2,favorites:['prime.b','prime.a','disney.hidden','disney.visible','other','repeat','repeat','not-returned'],background:'',preview:false}));
 window.launched=[];
 window.list=[{id:'prime.a',name:'Amazon Prime Video',show:true},{id:'prime.b',name:'Prime Video',show:true},{id:'disney.hidden',name:'Disney+',show:false},{id:'disney.visible',name:'Disney Plus',show:true},{id:'other',name:'Disney+ Hotstar',show:true},{id:'repeat',name:'Unrelated',show:true},{id:'repeat',name:'Unrelated',show:true}];
 window.tizen={ApplicationControl:function(operation){this.operation=operation;},application:{getCurrentApplication:()=>({appInfo:{id:'self'}}),getAppsInfo:yes=>yes(list),launch:(id,yes,no)=>{launched.push(id);no({name:'TestError'});},launchAppControl:(control,id,yes,no)=>{yes();}},tvwindow:{getSource:()=>({type:'TV',number:0}),show:yes=>yes(),hide:yes=>yes()},tvinputdevice:{registerKey:function(){}},systeminfo:{getPropertyValue:(key,cb)=>{if(key==='VIDEOSOURCE')cb({connected:[{type:'TV',number:0},{type:'HDMI',number:1},{type:'HDMI',number:2}]})}}};
});
const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(pathToFileURL(path.resolve('app/index.html')).href);
await p.waitForTimeout(1500);
// Navigate to Apps page
await p.locator('[data-section="apps"]').click();
await p.waitForTimeout(500);
// Apps page shows all 6 items (including duplicates - no dedup on Apps page in this architecture)
assert.equal(await p.locator('#apps-grid .app-grid-item').count(),6);
// After auto-population, favorites include prime.a, disney.hidden, and second repeat
const favs = await p.evaluate(()=>JSON.parse(localStorage.getItem('kipsmthn.settings.v1')).favorites);
assert.ok(favs.includes('prime.b'));
assert.ok(favs.includes('disney.visible'));
assert.ok(favs.includes('other'));
assert.ok(favs.includes('repeat'));
assert.ok(favs.includes('not-returned'));
// Click prime.b -> launch attempt (on Apps page)
await p.locator('#apps-grid [data-app-id="prime.b"]').click();assert.deepEqual(await p.evaluate(()=>launched),['prime.b']);
// Go to Home page to edit favorites
await p.locator('[data-section="home"]').click();
await p.waitForTimeout(500);
// Enter edit mode on Home page
await p.locator('#edit-apps-home').click();await p.waitForTimeout(200);
// Toggle prime.b off (remove from favorites) using library apps on Home
await p.locator('#library [data-app-id="prime.b"]').click();
// Exit edit mode
await p.keyboard.press('Escape');
await p.waitForTimeout(200);
// Reload and verify persistence
await p.reload();await p.waitForTimeout(1500);
await p.locator('[data-section="apps"]').click();
await p.waitForTimeout(500);
// After removing prime.b, it should no longer be in favorites
const favs2 = await p.evaluate(()=>JSON.parse(localStorage.getItem('kipsmthn.settings.v1')).favorites);
assert.ok(!favs2.includes('prime.b'));
// Toggle edit mode on again on Home page
await p.locator('[data-section="home"]').click();
await p.waitForTimeout(500);
await p.locator('#edit-apps-home').click();await p.waitForTimeout(200);
// Toggle prime.a on (add to favorites) using library apps on Home
await p.locator('#library [data-app-id="prime.a"]').click();await p.keyboard.press('Escape');
await p.waitForTimeout(200);
// Verify prime.a is now in favorites
const favs3 = await p.evaluate(()=>JSON.parse(localStorage.getItem('kipsmthn.settings.v1')).favorites);
assert.ok(favs3.includes('prime.a'));
// Reverse list and refresh
await p.evaluate(()=>list.reverse());
await p.locator('[data-section="apps"]').click();
await p.waitForTimeout(500);
await p.locator('#apps-refresh').click();
await p.waitForTimeout(500);
// On Apps page, shows all non-hidden apps from list (no dedup on Apps page)
assert.equal(await p.locator('#apps-grid [data-app-id="prime.a"]').count(),1);
assert.equal(await p.locator('#apps-grid [data-app-id="other"]').count(),1);
assert.deepEqual(errors,[]);
console.log('Duplicate app regression checks passed');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});
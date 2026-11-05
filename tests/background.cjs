const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL || undefined});try{
for(const legacy of [false,true]){
 const context=await browser.newContext({viewport:{width:1920,height:1080}});
 if(legacy)await context.addInitScript(()=>{
  if(!localStorage.getItem('b1ackha7tv.settings.v1'))localStorage.setItem('b1ackha7tv.settings.v1',JSON.stringify({background:'assets/old-background.jpg',photoVersion:1,theme:'aurora',favorites:['saved.app'],preview:false}));
 });
 const page=await context.newPage(),requests=[];page.on('request',r=>requests.push(r.url()));
 await page.goto(pathToFileURL(path.resolve('app/index.html')).href);
 // Default cinematic theme now uses twilight mountain/lake image (non-legacy case)
 if (!legacy) {
   const wallpaperStyle = await page.locator('#wallpaper').getAttribute('style');
   assert.ok(wallpaperStyle.includes('url(') && wallpaperStyle.includes('VWMK740-01059.jpg'));
   assert.ok(requests.some(url=>url.endsWith('.jpg')));
 } else {
   // Legacy case migrates to aurora gradient (no image)
   assert.ok(!(await page.locator('#wallpaper').getAttribute('style')).includes('url('));
   assert.ok(!requests.some(url=>url.endsWith('.jpg')));
 }
 if(legacy){const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('kipsmthn.settings.v1') || localStorage.getItem('b1ackha7tv.settings.v1')));assert.equal(saved.backgroundVersion,2);assert.deepEqual(saved.favorites,['saved.app']);assert.equal(saved.preview,false);}
 // Navigate to settings via sidebar
 await page.locator('#settings-open').click();await page.locator('[data-panel="appearance"]').click();
 await page.locator('#theme-select').selectOption('ember');
 await page.reload();
 // Ember theme uses gradient (no image)
 const wallpaperStyle = await page.locator('#wallpaper').getAttribute('style');
 assert.ok(!wallpaperStyle.includes('url('));
 await context.close();
}
console.log('PASS: neutral default, legacy image removal, favorites and preview retained, new theme persists.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
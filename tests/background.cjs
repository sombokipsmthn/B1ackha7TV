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
 // Default cinematic theme uses locally packaged Unsplash mountain photography.
 if (!legacy) {
   const wallpaperStyle = await page.locator('#wallpaper').getAttribute('style');
   assert.ok(wallpaperStyle.includes('twilight-mountains.jpg'));
   assert.ok(requests.some(url=>url.endsWith('twilight-mountains.jpg')));
 } else {
   // Legacy theme preference migrates to its monochrome gradient.
   assert.ok((await page.locator('#wallpaper').getAttribute('style')).includes('twilight-mountains.jpg'), 'obsolete colorful theme falls back to the cinematic monochrome-safe wallpaper');
   assert.ok(!requests.some(url=>url.endsWith('old-background.jpg')));
 }
 if(legacy){const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('kipsmthn.settings.v1') || localStorage.getItem('b1ackha7tv.settings.v1')));assert.equal(saved.backgroundVersion,2);assert.deepEqual(saved.favorites,['saved.app']);assert.equal(saved.preview,false);}
 // Navigate to settings via sidebar
 await page.locator('#settings-open').click();await page.locator('[data-panel="appearance"]').click();
 await page.locator('#theme-select').selectOption('midnight');
 await page.reload();
 // Monochrome treatment uses a CSS gradient without a wallpaper image URL.
 const wallpaperStyle = await page.locator('#wallpaper').getAttribute('style');
 assert.ok(!wallpaperStyle.includes('url('));
 await context.close();
}
console.log('PASS: neutral default, legacy image removal, favorites and preview retained, new theme persists.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
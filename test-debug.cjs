const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');

async function runTest() {
  const b=await chromium.launch({headless:true});
  try{
    const c=await b.newContext({viewport:{width:1920,height:1080}});
    await c.addInitScript(()=>{
     if(!localStorage.getItem('b1ackha7tv.settings.v1'))localStorage.setItem('b1ackha7tv.settings.v1',JSON.stringify({photoVersion:1,favorites:['prime.b','prime.a','disney.hidden','disney.visible','other','repeat','repeat','not-returned'],background:'',preview:false}));
     window.launched=[];
     window.list=[{id:'prime.a',name:'Amazon Prime Video',show:true},{id:'prime.b',name:'Prime Video',show:true},{id:'disney.hidden',name:'Disney+',show:false},{id:'disney.visible',name:'Disney Plus',show:true},{id:'other',name:'Disney+ Hotstar',show:true},{id:'repeat',name:'Unrelated',show:true},{id:'repeat',name:'Unrelated',show:true}];
     window.tizen={application:{getCurrentApplication:()=>({appInfo:{id:'self'}}),getAppsInfo:yes=>yes(window.list),launch:(id,yes,no)=>{launched.push(id);no({name:'TestError'});}}};
    });
    const p=await b.newPage();
    await p.goto(pathToFileURL(path.resolve('app/index.html')).href);
    await p.waitForTimeout(500);

    const debug = await p.evaluate(() => {
      const appsDiv = document.getElementById('apps');
      return {
        innerHTML: appsDiv ? appsDiv.innerHTML : 'NOT FOUND',
        childCount: appsDiv ? appsDiv.children.length : 0,
        appElements: appsDiv ? appsDiv.querySelectorAll('.app').length : 0
      };
    });
    console.log('Debug:', JSON.stringify(debug, null, 2));
    await b.close();
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

runTest();
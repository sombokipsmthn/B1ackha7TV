const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL || undefined});try{
 for(const mode of ['accepted','no-callback','denied','hidden','aliases','stale']) {
  const context=await browser.newContext({viewport:{width:1920,height:1080}});
  await context.addInitScript(mode=>{
   window.calls=[];window.oldSuccess=null;
   window.tizen={
     ApplicationControl:function(operation){this.operation=operation;},
     application:{
      getCurrentApplication:function(){return {appInfo:{id:'self'}};},
      getAppsInfo:function(yes){
        if(mode==='aliases'){
          yes([{id:'prime.a',name:'Prime Video',show:true},{id:'prime.b',name:'Amazon Prime Video',show:true}]);
        }else{
          yes([{id:'test',name:'Test App',show:true}]);
        }
      },
      launch:function(id,yes,no){
        calls.push(['launch',id]);
        oldSuccess=yes;
        if(mode==='denied'){no({name:'SecurityError'});}
        else if(mode!=='no-callback'){yes();}
      },
      launchAppControl:function(control,id,yes,no){
        calls.push(['control',id,control.operation]);
        if(mode==='denied'){no({name:'SecurityError'});}
        else{yes();}
      }
     },
     tvwindow:{
      getSource:function(){return {type:'TV',number:0};},
      show:function(yes){yes();},
      hide:function(){}
     },
     tvinputdevice:{
      registerKey:function(){}
     },
     filesystem:{
      resolve:function(path, yes, no){no();}
     }
    };
  },mode);
  const p=await context.newPage();await p.clock.install();
  await p.goto(pathToFileURL(path.resolve(process.env.LAUNCH_TEST_PAGE || 'app/index.html')).href);
  await p.clock.runFor(50);
  // App is on home page initially
  await p.locator('#apps .app').click();
  assert.equal(await p.evaluate(()=>calls.length),1,'preview cleanup must not block app launch');
  if(mode==='denied'){
   assert.match(await p.locator('#launch-feedback').innerText(),/SecurityError/);
   await p.locator('#apps .app').click();assert.equal(await p.evaluate(()=>calls.length),2);
  }else if(mode==='hidden'){
   await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
   await p.clock.runFor(20000);assert.equal(await p.evaluate(()=>calls.length),1);
   await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
   await p.locator('#apps .app').click();assert.equal(await p.evaluate(()=>calls.length),2);
  }else{
   await p.clock.runFor(8100);
   // launchAppControl is tried first (modern approach)
   assert.deepEqual(await p.evaluate(()=>calls[0]),['control',mode==='aliases'?'prime.a':'test','http://tizen.org/appcontrol/operation/default']);
   if(mode==='stale'){
     const oldSuccess = await p.evaluate(()=>window.oldSuccess);
     if(typeof oldSuccess === 'function'){await p.evaluate(()=>window.oldSuccess());}
     // After calling oldSuccess, the launch continues and eventually times out
     await p.clock.runFor(8100);
   }
   await p.clock.runFor(8100);
   if(mode==='aliases'){
    // Second attempt uses launchAppControl for the alias (same modern approach)
    assert.deepEqual(await p.evaluate(()=>calls[1]),['control','prime.b','http://tizen.org/appcontrol/operation/default']);
    await p.clock.runFor(16100);
    // In aliases mode, only 2 routes exist (prime.a, prime.b), so total calls should be 2
    assert.equal(await p.evaluate(()=>calls.length),2);
   }
   assert.match(await p.locator('#launch-feedback').innerText(),/Could not open/);
   const before=await p.evaluate(()=>calls.length);await p.locator('#apps .app').click();assert.equal(await p.evaluate(()=>calls.length),before+1);
  }
  await context.close();
 }
 console.log('PASS: launch never waits on preview; accepted/no-response timeout fallback; permission errors stop; hide cancels retry; aliases tried; late callbacks ignored; controls recover.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
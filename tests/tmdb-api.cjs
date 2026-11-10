const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.resolve(__dirname,'../app/services/tmdb-content-service.js'),'utf8');
const requests=[];
class FakeXHR {
  open(method,url) { this.method=method; this.url=url; }
  setRequestHeader(name,value) { (this.headers||(this.headers={}))[name]=value; }
  send() {
    requests.push(this);
    const body=this.url.endsWith('/configuration') ? {images:{secure_base_url:'https://image.tmdb.org/t/p/',poster_sizes:['w342','w500'],backdrop_sizes:['w780','w1280'],still_sizes:['w300','w780']}} : this.url.includes('/search/tv') ? {results:[{id:42,name:'Example'}]} : {id:42};
    this.status=200; this.responseText=JSON.stringify(body); this.readyState=4; this.onreadystatechange();
  }
}
const store={}; const window={TMDB_CATALOG:[],TMDB_DEMO_CATALOG:[],localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v;}}};
vm.runInNewContext(source,{window,XMLHttpRequest:FakeXHR,Date,JSON,encodeURIComponent,Promise,Object,Array,String,Error});
(async()=>{
  const client=window.TMDBContentService.createClient({accessToken:'test-bearer-token',storage:window.localStorage});
  const result=await client.searchTV('Ted Lasso'); assert.equal(result.results[0].id,42);
  assert.equal(requests[0].headers.Authorization,'Bearer test-bearer-token');
  assert.match(requests[0].url,/search\/tv\?query=Ted%20Lasso/);
  assert.equal(await client.buildImageUrl('/poster.jpg','w500','poster'),'https://image.tmdb.org/t/p/w500/poster.jpg');
  assert.equal(await client.buildImageUrl('/still.jpg','w780','still'),'https://image.tmdb.org/t/p/w780/still.jpg');
  assert.equal(await client.buildImageUrl('', 'w500','poster'),'');
  assert.equal((await client.getTVDetails(42)).id,42);
  assert.equal((await client.getSeason(42,1)).id,42);
  assert.equal((await client.getEpisode(42,1,1)).id,42);
  await client.getShowImages(42); await client.getEpisodeImages(42,1,1); await client.getVideos(42);
  assert.ok(requests.some(r=>r.url.includes('/tv/42/images')));
  assert.ok(requests.some(r=>r.url.includes('/season/1/episode/1/images')));
  assert.ok(requests.some(r=>r.url.includes('/videos')));
  assert.ok(requests.every(r=>r.timeout===12000));
  const noAuth=window.TMDBContentService.createClient({accessToken:'',storage:{getItem(){return null;},setItem(){}}});
  await assert.rejects(noAuth.searchTV('No token'),/not configured/);
  console.log('PASS: TMDB bearer authentication, API routes, image config sizing, timeout, and missing-credential handling.');
})().catch(e=>{console.error(e);process.exit(1);});

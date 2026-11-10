#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'app');
const API = 'https://api.themoviedb.org/3';
const IMAGE = 'https://image.tmdb.org/t/p';
const ATTRIBUTION = 'This product uses the TMDB API but is not endorsed or certified by TMDB.';
const SHOWS = [
  ['ted-lasso','Ted Lasso'],['stranger-things','Stranger Things'],['the-witcher','The Witcher'],['wednesday','Wednesday'],['the-mandalorian','The Mandalorian'],
  ['reacher','Reacher'],['the-last-of-us','The Last of Us'],['house-of-the-dragon','House of the Dragon'],['the-bear','The Bear'],['severance','Severance']
];
const cachePath = path.join(APP, 'data', '.tmdb-cache.json');
const manifestPath = path.join(APP, 'assets/streaming/manifest.json');
const previousManifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { assets: [] };
const existingAssets = Array.isArray(previousManifest.assets) ? previousManifest.assets : [];
const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};
const token = process.env.TMDB_API_KEY;
function request(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: headers || {}, timeout: 15000 }, res => {
      const parts=[]; res.on('data', x => parts.push(x)); res.on('end', () => {
        const body=Buffer.concat(parts);
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
        resolve({ body, type: res.headers['content-type'] || '' });
      });
    });
    req.on('timeout', () => req.destroy(new Error('TMDB request timed out')));
    req.on('error', reject);
  });
}
async function api(endpoint) {
  const url = API + endpoint;
  const cached = cache[url];
  if (cached && Date.now() - cached.time < 86400000) return cached.value;
  const result = await request(url, { Authorization: 'Bearer ' + token, Accept: 'application/json' });
  const value = JSON.parse(result.body.toString('utf8'));
  cache[url] = { time: Date.now(), value };
  fs.writeFileSync(cachePath, JSON.stringify(cache));
  await new Promise(resolve => setTimeout(resolve, 250));
  return value;
}
function dimensions(buffer, type) {
  if (type.indexOf('png') >= 0 && buffer.length > 24) return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  if (type.indexOf('jpeg') >= 0 || type.indexOf('jpg') >= 0) {
    let i=2;
    while (i < buffer.length) {
      if (buffer[i] !== 0xff) { i++; continue; }
      const marker=buffer[i+1], len=buffer.readUInt16BE(i+2);
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return { height: buffer.readUInt16BE(i+5), width: buffer.readUInt16BE(i+7) };
      i += 2 + len;
    }
  }
  return { width: null, height: null };
}
function imageSize(config, kind, preferred) {
  const sizes = (config.images && config.images[kind]) || [];
  return preferred.find(size => sizes.indexOf(size) >= 0) || sizes[sizes.length - 1] || 'original';
}
async function download(slug, tmdbId, title, type, filePath, size, directory, assets) {
  if (!filePath) return null;
  const url = IMAGE + '/' + size + filePath;
  const localPath = 'assets/streaming/' + directory + '/' + slug + (type === 'still' ? '-still' : '-' + type) + path.extname(filePath).toLowerCase();
  const absolute = path.join(APP, localPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const existing = existingAssets.find(item => item.localPath === localPath && item.originalReference === filePath);
  if (fs.existsSync(absolute) && existing) { assets.push(existing); return existing; }
  if (!fs.existsSync(absolute) || !existing) {
    const result = await request(url);
    if (!/^image\/(jpeg|png|webp)/i.test(result.type)) throw new Error('Unexpected image type ' + result.type + ' for ' + title + ' ' + type);
    fs.writeFileSync(absolute, result.body);
    const dims = dimensions(result.body, result.type);
    const record = { tmdbId, title, imageType:type, localPath, originalReference:filePath, imageUrl:url, width:dims.width, height:dims.height, retrievedAt:new Date().toISOString(), source:'TMDB', attribution:ATTRIBUTION };
    assets.push(record);
    return record;
  }
  return existing;
}
async function main() {
  if (!token) throw new Error('Set TMDB_API_KEY to your TMDB API read access token. The token is used only by this local importer and is never written into the app.');
  fs.mkdirSync(path.dirname(cachePath), { recursive:true });
  const config = await api('/configuration');
  const catalog=[]; const assets=[];
  for (const [slug, query] of SHOWS) {
    try {
    const search=await api('/search/tv?query='+encodeURIComponent(query)+'&include_adult=false&language=en-US');
    const norm=s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g,'');
    const match=(search.results || []).find(result => norm(result.name)===norm(query));
    if (!match) { console.warn('No exact TMDB title match:', query); continue; }
    const details=await api('/tv/'+match.id+'?language=en-US&append_to_response=images,videos');
    const seasonNumbers=(details.seasons || []).map(s=>s.season_number).filter(n=>n>0);
    const seasonNumber=seasonNumbers.length ? seasonNumbers[0] : null;
    let season=null, stillPath=null;
    if (seasonNumber !== null) {
      season=await api('/tv/'+match.id+'/season/'+seasonNumber+'?language=en-US');
      const ep=(season.episodes || []).find(e=>e.still_path) || (season.episodes || [])[0];
      stillPath=ep && ep.still_path || null;
    }
    const imageSet=details.images || {};
    const posterPath=details.poster_path || (imageSet.posters || [])[0]?.file_path;
    const backdropPath=details.backdrop_path || (imageSet.backdrops || [])[0]?.file_path;
    const poster=await download(slug,details.id,details.name,'poster',posterPath,imageSize(config,'poster_sizes',['w500','w342']), 'posters',assets);
    const backdrop=await download(slug,details.id,details.name,'backdrop',backdropPath,imageSize(config,'backdrop_sizes',['w1280','w780']), 'backdrops',assets);
    const still=await download(slug,details.id,details.name,'still',stillPath,imageSize(config,'still_sizes',['w780','w300']), 'thumbnails',assets);
    const videos=(details.videos && details.videos.results || []).filter(v=>v.site==='YouTube' && (v.type==='Trailer' || v.type==='Teaser')).map(v=>({id:v.id,name:v.name,site:v.site,key:v.key,type:v.type,official:!!v.official,publishedAt:v.published_at || null,playable:false}));
    catalog.push({slug,tmdbId:details.id,title:details.name,overview:details.overview || '',releaseYear:details.first_air_date ? Number(details.first_air_date.slice(0,4)) : null,firstAirDate:details.first_air_date || null,genres:(details.genres || []).map(g=>g.name),numberOfSeasons:details.number_of_seasons || 0,numberOfEpisodes:details.number_of_episodes || 0,seasons:seasonNumbers,season:season ? {number:season.season_number,name:season.name,episodes:(season.episodes || []).map(e=>({id:e.id,number:e.episode_number,title:e.name,overview:e.overview || '',airDate:e.air_date || null,stillPath:e.still_path || null,still:e.still_path ? 'assets/streaming/thumbnails/'+slug+'-still'+path.extname(e.still_path).toLowerCase() : ''}))} : null,images:{posterPath:posterPath || null,backdropPath:backdropPath || null},assets:{poster,backdrop,still},videos});
    } catch (error) { console.warn('Skipped '+query+': '+error.message); }
  }
  const manifest={generatedAt:new Date().toISOString(),source:'TMDB API v3',attribution:ATTRIBUTION,assets};
  fs.writeFileSync(path.join(APP,'data','tmdb-catalog.js'), '/* Generated locally by scripts/refresh-tmdb-catalog.cjs. */\n(function (global) { \'use strict\'; global.TMDB_CATALOG = '+JSON.stringify(catalog)+'; global.TMDB_ASSET_MANIFEST = '+JSON.stringify(manifest)+'; }(window));\n');
  fs.writeFileSync(path.join(APP,'assets/streaming/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  const projectFile=path.join(APP,'tizen_web_project.yaml');
  let project=fs.readFileSync(projectFile,'utf8');
  const packaged=new Set(project.split(/\r?\n/).map(line=>line.trim()));
  const paths=assets.map(item=>item.localPath).concat(['assets/streaming/manifest.json']);
  paths.forEach(assetPath=>{const entry='  - '+assetPath;if(!packaged.has(entry)){project=project.replace('  - services/content-artwork-service.js',entry+'\n  - services/content-artwork-service.js');packaged.add(entry);}});
  fs.writeFileSync(projectFile,project);
  console.log('Resolved '+catalog.length+'/'+SHOWS.length+' shows; downloaded '+assets.length+' TMDB artwork files.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});

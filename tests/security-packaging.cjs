const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = path.resolve(__dirname, '../app');
const html = fs.readFileSync(path.join(app, 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(app, 'main.js'), 'utf8');
const packaging = fs.readFileSync(path.join(app, 'tizen_web_project.yaml'), 'utf8');
const config = fs.readFileSync(path.join(app, 'config.xml'), 'utf8');
const packageFiles = packaging.split(/^excludes:\s*$/m)[0];

for (const removed of [
  'data/tmdb-catalog.js', 'data/tmdb-demo-catalog.js', 'services/tmdb-content-service.js',
  'services/streaming-asset-service.js', 'services/content-artwork-service.js',
  'services/content-metadata-service.js', 'services/viewing-activity-service.js',
  'data/mock-content.js', 'data/streaming-metadata.js',
  'components/continue-watching/ContinueWatching.js', 'components/continue-watching/ContinueWatchingCard.js',
  'components/dynamic-wallpaper/DynamicWallpaper.js', 'components/dynamic-wallpaper/WallpaperTransition.js',
  'components/content/ContentCard.js', 'assets/streaming'
]) {
  assert.equal(fs.existsSync(path.join(app, removed)), false, `Retired content module or artwork remains: ${removed}`);
  assert.ok(!html.includes(removed) && !packageFiles.includes(removed), `Retired module remains referenced: ${removed}`);
}
assert.doesNotMatch(html + main + packageFiles + config, /TMDB|brandfetch|api_key|accessToken|password|login/i, 'runtime, packaging and manifest must not activate credentialed integrations');
assert.doesNotMatch(main, /movies|my media|data-section=['"]media/i);
assert.match(config, /tizen:privilege name="http:\/\/tizen\.org\/privilege\/application\.launch"/);
assert.match(config, /tizen:privilege name="http:\/\/tizen\.org\/privilege\/application\.info"/);
assert.match(config, /tizen:privilege name="http:\/\/tizen\.org\/privilege\/tv\.window"/);
assert.match(config, /tizen:privilege name="http:\/\/tizen\.org\/privilege\/tv\.inputdevice"/);
assert.match(config, /tizen:privilege name="http:\/\/tizen\.org\/privilege\/filesystem\.read"/);
assert.match(packaging, /profile: tv-samsung/);
assert.match(packaging, /build_type: Release/);
assert.match(packaging, /opt: true/);
assert.match(html, /id="trending-section"[\s\S]*?Featured photography/);
assert.match(main, /TizenService\.launchApp/);
assert.match(main, /TizenService\.setSource/);
console.log('PASS: credentialed integrations retired, Movies/My Media absent, required Tizen privileges retained, and production packaging configured.');

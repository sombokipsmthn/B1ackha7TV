const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = path.resolve(__dirname, '..', 'app');
const read = (relative) => fs.readFileSync(path.join(app, relative), 'utf8');
const html = read('index.html');
const manifest = read('tizen_web_project.yaml');
const js = read('main.js');

assert.equal(fs.existsSync(path.resolve(__dirname, '..', 'MyTvTheme')), false, 'the duplicate app root must not return');
assert.ok(fs.existsSync(path.resolve(__dirname, '..', 'archive', 'legacy-MyTvTheme')), 'the old tree must remain preserved in archive/');

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
assert.deepEqual([...new Set(duplicates)], [], 'HTML IDs must be unique');

const localResources = [
  ...[...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((match) => match[1]),
  'icon.png',
  'assets/prime-video.svg',
  'audio-controller.js',
  'assets/wallpapers/twilight-mountains.svg',
  'assets/audio/navigation.wav',
  'assets/audio/selection.wav',
  'assets/audio/back.wav',
  'assets/audio/error.wav',
  'assets/audio/startup.wav'
].filter((resource) => !/^(?:https?:|data:|#)/i.test(resource));

for (const resource of localResources) {
  assert.ok(fs.existsSync(path.join(app, resource)), `Missing local resource: ${resource}`);
  assert.ok(manifest.includes(`- ${resource}`), `Tizen package manifest omits: ${resource}`);
}

assert.match(html, /href=["']css\/cinematic\.css["']/);
assert.match(manifest, /- css\/cinematic\.css/);
assert.doesNotMatch(manifest, /- css\/style\.css/);

// Backup-based main.js uses b1ackha7tv.settings.v1
assert.match(js, /b1ackha7tv\.settings\.v1/);

console.log('PASS: canonical Tizen app has unique IDs, valid local resources, complete package entries and legacy settings migration.');
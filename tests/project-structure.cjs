const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const app = path.join(root, 'app');
const read = (relative) => fs.readFileSync(path.join(app, relative), 'utf8');
const html = read('index.html');
const manifest = read('tizen_web_project.yaml');
const css = read('css/cinematic.css');
const js = read('main.js');

assert.equal(fs.existsSync(path.join(root, 'MyTvTheme')), false, 'the duplicate app root must not return');
assert.equal(fs.existsSync(path.join(root, 'archive')), false, 'obsolete archive must not be included');

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
assert.deepEqual([...new Set(duplicates)], [], 'HTML IDs must be unique');
assert.doesNotMatch(html, /\sstyle=["']/i, 'static HTML must not retain visual inline styles');
assert.match(html, /<html[^>]*class=["'][^"']*\bdark\b/);

const localResources = [
  ...[...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((match) => match[1]),
  'icon.png', 'audio-controller.js', 'photo-library.js', 'motion-system.js', 'icon-resolver.js',
  'assets/audio/navigation.wav', 'assets/audio/selection.wav', 'assets/audio/back.wav', 'assets/audio/error.wav', 'assets/audio/startup.wav',
  'assets/photos/desert-cinema.jpg', 'assets/photos/evening-sky.jpg', 'assets/photos/lake-dusk.jpg', 'assets/photos/moody-forest.jpg', 'assets/photos/night-sky.jpg', 'assets/photos/nocturnal-city.jpg', 'assets/photos/quiet-architecture.jpg', 'assets/photos/twilight-mountains.jpg',
].filter((resource) => !/^(?:https?:|data:|#)/i.test(resource));

for (const resource of localResources) {
  assert.ok(fs.existsSync(path.join(app, resource)), `Missing local resource: ${resource}`);
  assert.ok(manifest.includes(`- ${resource}`), `Tizen package manifest omits: ${resource}`);
}

for (const destination of ['home', 'search', 'apps', 'games', 'recent', 'inputs', 'settings']) {
  assert.match(html, new RegExp(`data-section=["']${destination}["']`), `navigation must expose ${destination}`);
  assert.match(html, new RegExp(`id=["']page-${destination}["']`), `destination ${destination} must have a screen`);
}
for (const screen of ['page-home', 'page-apps']) {
  assert.match(html, new RegExp(`id=["']${screen}["'][^>]*class=["'][^"']*page-section`));
}
assert.match(html, /id=["']page-settings["'][^>]*class=["'][^"']*settings-screen/);
assert.doesNotMatch(html, /data-section=["'](?:movies|media)["']|id=["']page-(?:movies|media)["']/i, 'removed destinations must not be reachable through markup');
assert.doesNotMatch(js, /['"](?:movies|media)['"]|page-(?:movies|media)|ContinueWatching|DynamicWallpaper|TMDBContentService|brandfetch/i, 'removed modules and external logo client must not remain in runtime routing or handlers');
assert.doesNotMatch(html, /TMDB|Brandfetch|Continue watching|Streaming artwork preview/i, 'disabled content integrations must not appear in the packaged UI');
assert.match(html, /<script src=["']photo-library\.js["']/);
assert.doesNotMatch(html, /assets\/(?:wallpapers|posters|logos)\/[^"']+\.svg/);
assert.match(html, /class=["'][^"']*text-app-tile/);
assert.match(read('photo-library.js'), /images\.unsplash\.com/);
assert.doesNotMatch(read('photo-library.js'), /access[_-]?key|client[_-]?secret/i);
assert.doesNotMatch(js, /cdn\.brandfetch\.io|api\.themoviedb\.org|api_key|Bearer\s+[A-Za-z0-9._-]{12}/i);
assert.doesNotMatch(manifest, /tmdb|streaming|ContinueWatching|DynamicWallpaper|Brandfetch/i);
assert.match(html, /href=["']css\/cinematic\.css["']/);
assert.match(manifest, /- css\/cinematic\.css/);
assert.doesNotMatch(manifest, /- css\/style\.css/);
assert.doesNotMatch(manifest, /assets\/lucide\.js|assets\/fonts\/|tailwind\.config\.js|postcss\.config\.js/);
assert.equal(fs.existsSync(path.join(app, 'assets/lucide.js')), false);
assert.equal(fs.existsSync(path.join(app, 'assets/fonts')), false);
assert.match(css, /--background:oklch\(1 0 0\)/);
assert.match(css, /--background:oklch\(0\.145 0 0\)/);
assert.match(css, /--primary:oklch\(0\.922 0 0\)/);
assert.match(css, /--chart-5:oklch\(0\.269 0 0\)/);
assert.match(css, /--sidebar-ring:oklch\(0\.556 0 0\)/);
assert.match(css, /--radius:0\.45rem/);
assert.match(css, /\.shadcn-button/);
assert.match(css, /\.settings-category:focus-visible|button:focus-visible/);
assert.equal(fs.existsSync(path.join(app, 'components.json')), true);
assert.equal(fs.existsSync(path.join(app, 'tailwind.config.js')), true);
assert.equal(fs.existsSync(path.join(app, 'postcss.config.js')), true);
assert.match(JSON.parse(read('components.json')).tailwind.css, /input\.css/);
assert.match(js, /TizenService\.launchApp/);
assert.match(js, /TizenService\.showPreview/);
assert.match(js, /TizenService\.setSource/);
assert.match(js, /b1ackha7tv\.settings\.v1/);

const lucide = read('assets/lucide.min.js');
const iconNames = [...html.matchAll(/data-lucide=["']([^"']+)["']/g)].map((match) => match[1]);
for (const name of iconNames) {
  const exportedName = name.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase()).replace(/^([a-z])/, (_, char) => char.toUpperCase());
  assert.ok(new RegExp(`(?:^|,)a\\.${exportedName}=`).test(lucide), `Lucide icon is missing: ${name}`);
}

console.log('PASS: project structure, destinations, visual theme, local assets, Tizen hooks, and absence of removed modules validated.');

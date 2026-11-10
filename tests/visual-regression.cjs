const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const baselineDir = path.join(__dirname, 'screenshots');
const update = process.env.UPDATE_SCREENSHOTS === '1';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    fs.mkdirSync(baselineDir, { recursive: true });
    for (const viewport of [{ width: 1920, height: 1080 }, { width: 3840, height: 2160 }]) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      await context.addInitScript(() => {
        localStorage.setItem('kipsmthn.settings.v1', JSON.stringify({
          name: 'Kipsmthn', theme: 'cinematic', backgroundVersion: 2,
          favorites: ['youtube', 'netflix', 'primevideo'], preview: false, system: false
        }));
        window.tizen = {
          application: {
            getCurrentApplication: () => ({ appInfo: { id: 'self' } }),
            getAppsInfo: (yes) => yes([
              { id: 'youtube', name: 'YouTube', show: true },
              { id: 'netflix', name: 'Netflix', show: true },
              { id: 'primevideo', name: 'Prime Video', show: true }
            ])
          },
          tvwindow: { getSource: () => ({ type: 'TV', number: 0 }) }
        };
      });
      const page = await context.newPage();
      await page.clock.install({ time: new Date('2026-01-15T19:30:00Z') });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(pathToFileURL(path.join(root, 'app/index.html')).href);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => document.querySelectorAll('.launcher-app-grid .app').length === 3);
      await page.waitForFunction(() => [...document.images].every((image) => {
        const rect = image.getBoundingClientRect();
        const visible = rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
        return !visible || (image.complete && image.naturalWidth > 0);
      }));
      await page.waitForTimeout(100);
      const screenshot = await page.screenshot({ fullPage: true });
      const metrics = await page.evaluate(() => ({
        viewport: [innerWidth, innerHeight],
        content: document.querySelector('#content').getBoundingClientRect().toJSON(),
        hero: document.querySelector('.hero').getBoundingClientRect().toJSON(),
        appTiles: [...document.querySelectorAll('.carousel-item')].map((item) => item.getBoundingClientRect().toJSON()),
        interfaceTokens: {
          background: getComputedStyle(document.documentElement).getPropertyValue('--background').trim(),
          surface: getComputedStyle(document.documentElement).getPropertyValue('--card').trim(),
          font: getComputedStyle(document.body).fontFamily
        },
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
      }));
      assert.deepEqual(metrics.viewport, [viewport.width, viewport.height]);
      assert.equal(metrics.horizontalOverflow, false, `${viewport.width} layout has horizontal viewport overflow`);
      assert.equal(metrics.reducedMotion, true);
      assert.deepEqual(metrics.interfaceTokens, { background: 'oklch(0.145 0 0)', surface: 'oklch(0.205 0 0)', font: 'Arial, Helvetica, sans-serif' });
      assert.ok(metrics.appTiles.length >= 6, 'home carousel should expose its remote-selectable tiles');
      assert.deepEqual(errors, [], 'page should have no runtime errors');
      const screenshotPath = path.join(baselineDir, `home-${viewport.width}x${viewport.height}.png`);
      if (update) {
        fs.writeFileSync(screenshotPath, screenshot);
      } else {
        assert.ok(fs.existsSync(screenshotPath), `Missing screenshot baseline: ${screenshotPath}; run UPDATE_SCREENSHOTS=1 npm run test:visual`);
        const baseline = fs.readFileSync(screenshotPath);
        assert.equal(baseline.toString('hex', 0, 8), '89504e470d0a1a0a', `Home ${viewport.width} baseline must be a PNG`);
        assert.equal(baseline.readUInt32BE(16), viewport.width, `Home ${viewport.width} baseline width`);
        assert.equal(baseline.readUInt32BE(20), viewport.height, `Home ${viewport.width} baseline height`);
      }
      await context.close();
    }

    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      localStorage.setItem('kipsmthn.settings.v1', JSON.stringify({ backgroundVersion: 2, favorites: ['youtube', 'netflix', 'primevideo'], preview: false }));
      window.tizen = {
        application: {
          getAppsInfo: (yes) => yes([
            { id: 'youtube', name: 'YouTube', show: true },
            { id: 'netflix', name: 'Netflix', show: true },
            { id: 'primevideo', name: 'Prime Video', show: true }
          ]),
          getCurrentApplication: () => ({ appInfo: { id: 'self' } })
        },
        tvwindow: { getSource: () => ({ type: 'TV', number: 0 }) }
      };
    });
    const page = await context.newPage();
    await page.clock.install({ time: new Date('2026-01-15T19:30:00Z') });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(root, 'app/index.html')).href);
    for (const destination of ['home', 'apps', 'inputs', 'settings']) {
      await page.locator(`.sidebar-item[data-section="${destination}"]`).click();
      await page.locator(`#page-${destination}:not([hidden])`).waitFor();
      if (destination === 'home') {
        await page.waitForFunction(() => document.querySelectorAll('.launcher-app-grid .app').length === 3);
        await page.waitForFunction(() => [...document.images].every((image) => {
          const rect = image.getBoundingClientRect();
          const visible = rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
          return !visible || (image.complete && image.naturalWidth > 0);
        }));
      }
      assert.equal(await page.locator(`.sidebar-item[data-section="${destination}"]`).getAttribute('aria-current'), 'page');
      const screenPath = path.join(baselineDir, `screen-${destination}-1920x1080.png`);
      const screenshot = await page.screenshot({ fullPage: false });
      if (update) { fs.writeFileSync(screenPath, screenshot); }
      else {
        assert.ok(fs.existsSync(screenPath), `Missing ${destination} screenshot baseline: ${screenPath}`);
        const baseline = fs.readFileSync(screenPath);
        assert.equal(baseline.toString('hex', 0, 8), '89504e470d0a1a0a', `${destination} baseline must be a PNG`);
      }
      assert.equal(screenshot.toString('hex', 0, 8), '89504e470d0a1a0a', `${destination} capture must be a PNG`);
      assert.equal(screenshot.readUInt32BE(16), 1920, `${destination} capture width`);
      assert.equal(screenshot.readUInt32BE(20), 1080, `${destination} capture height`);
    }

    await page.locator('.sidebar-item[data-section="settings"]').click();
    await page.locator('[data-panel="appearance"]').focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-panel')), 'home');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'theme-select');
    assert.notEqual(await page.locator('#theme-select').evaluate((element) => getComputedStyle(element).boxShadow), 'none');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.getElementById('page-settings').hidden);

    await page.locator('.sidebar-item[data-section="home"]').click();
    await page.locator('#apps-carousel [data-app-id="youtube"]').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-app-id')), 'netflix', 'remote right should move focus through home tiles');
    await page.keyboard.press('ArrowDown');
    assert.ok(await page.evaluate(() => document.activeElement.matches('.launcher-app-grid .app')), 'remote down should move focus to the populated launcher app row');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'exit-cancel', 'Back should focus the safe exit action');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'exit-confirm');
    assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS: Home at 1080p/4K, remaining-screen captures, no overflow, semantic theme tokens, icon and runtime checks, D-pad settings/Home navigation, visible focus ring, and Back dialog focus.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exit(1); });

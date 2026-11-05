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
          favorites: [], preview: false, system: false
        }));
        window.tizen = {
          application: {
            getCurrentApplication: () => ({ appInfo: { id: 'self' } }),
            getAppsInfo: (success) => success([
              { id: 'youtube', name: 'YouTube', show: true },
              { id: 'netflix', name: 'Netflix', show: true },
              { id: 'prime', name: 'Prime Video', show: true }
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
      await page.locator('#continue-section').waitFor();
      const screenshot = await page.screenshot({ fullPage: true });

      const metrics = await page.evaluate(() => ({
        viewport: [innerWidth, innerHeight],
        content: document.querySelector('#content').getBoundingClientRect().toJSON(),
        hero: document.querySelector('.hero').getBoundingClientRect().toJSON(),
        appTiles: [...document.querySelectorAll('.carousel-item')].map((item) => item.getBoundingClientRect().toJSON()),
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
      }));
      assert.deepEqual(metrics.viewport, [viewport.width, viewport.height]);
      assert.equal(metrics.horizontalOverflow, false, `${viewport.width} layout has horizontal viewport overflow`);
      assert.equal(metrics.reducedMotion, true);
      assert.ok(metrics.appTiles.length >= 6, 'home carousel should expose its remote-selectable tiles');
      assert.deepEqual(errors, [], 'page should have no runtime errors');

      const screenshotPath = path.join(baselineDir, `home-${viewport.width}x${viewport.height}.png`);
      if (update) {
        fs.writeFileSync(screenshotPath, screenshot);
      } else {
        assert.ok(fs.existsSync(screenshotPath), `Missing screenshot baseline: ${screenshotPath}; run UPDATE_SCREENSHOTS=1 npm run test:visual`);
        assert.ok(screenshot.equals(fs.readFileSync(screenshotPath)), `Screenshot differs from baseline: ${screenshotPath}; inspect the layout and run UPDATE_SCREENSHOTS=1 npm run test:visual only to accept intentional changes`);
      }
      await context.close();
    }

    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      localStorage.setItem('kipsmthn.settings.v1', JSON.stringify({ backgroundVersion: 2, favorites: [], preview: false }));
      window.tizen = { application: { getAppsInfo: (yes) => yes([]), getCurrentApplication: () => ({ appInfo: { id: 'self' } }) } };
    });
    const page = await context.newPage();
    await page.goto(pathToFileURL(path.join(root, 'app/index.html')).href);
    await page.locator('#apps-carousel [data-app-id="youtube"]').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-app-id')), 'netflix', 'remote right should move focus through home tiles');
    await page.keyboard.press('ArrowDown');
    assert.ok(await page.evaluate(() => document.activeElement.matches('.continue-card')), 'remote down should move focus to the nearest card in the next content row');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'exit-cancel', 'Back should open the exit dialog and focus its safe action');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'exit-confirm', 'remote arrows should move focus within the modal');
    await context.close();
    console.log('PASS: remote focus navigation and 1080p/4K visual layout checks.');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exit(1); });

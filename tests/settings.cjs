const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    await context.addInitScript(() => {
      localStorage.setItem('b1ackha7tv.settings.v1', JSON.stringify({
        backgroundVersion: 2, system: false, favorites: [], preview: false
      }));
      window.tizen = {
        application: {
          getCurrentApplication: () => ({ appInfo: { id: 'self' } }),
          getAppsInfo: (success) => success([{ id: 'sample', name: 'Sample App', show: true }]),
          launch: () => {}
        }
      };
    });
    const page = await context.newPage();
    await page.goto(pathToFileURL(path.resolve('app/index.html')).href);
    await page.locator('#settings-open').click();

    const panels = page.locator('.settings-panel');
    assert.equal(await panels.count(), 5);
    assert.equal(await page.locator('#settings-panel-appearance').isVisible(), true);

    await page.locator('[data-panel="apps"]').click();
    assert.equal(await page.locator('#settings-panel-apps').isVisible(), true);
    const toggle = page.locator('#system-toggle');
    assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('b1ackha7tv.settings.v1')).system), true);

    await page.locator('[data-panel="appearance"]').click();
    await page.locator('#theme-select').selectOption('aurora');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('b1ackha7tv.settings.v1')).theme), 'aurora');

    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#settings').isHidden(), true);
    await context.close();
    console.log('PASS: settings navigation, system-entry toggle persistence, theme selection and Back close.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

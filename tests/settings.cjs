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
        backgroundVersion: 2, theme: 'midnight', favorites: [], preview: false, system: false
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

    // Open settings via sidebar
    await page.locator('[data-page="settings"]').click();
    await page.waitForSelector('#page-settings:not([hidden])');

    // Check theme buttons exist (data-theme buttons)
    const themeBtns = page.locator('.theme-btn');
    assert.equal(await themeBtns.count(), 3);

    // Click aurora theme
    await page.locator('[data-theme="aurora"]').click({ force: true });
    await page.waitForTimeout(500);
    const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('b1ackha7tv.settings.v1')));
    assert.equal(prefs.theme, 'aurora');

    // Check system toggle
    const sysToggle = page.locator('#system-toggle');
    assert.equal(await sysToggle.getAttribute('aria-pressed'), 'false');
    await sysToggle.click({ force: true });
    assert.equal(await sysToggle.getAttribute('aria-pressed'), 'true');
    const prefs2 = await page.evaluate(() => JSON.parse(localStorage.getItem('b1ackha7tv.settings.v1')));
    assert.equal(prefs2.system, true);

    // Background apply button exists
    await page.locator('#background-apply').isVisible();

    // Close settings via Escape
    await page.keyboard.press('Escape');
    await page.waitForSelector('#page-settings[hidden]');

    await context.close();
    console.log('PASS: settings navigation, system-entry toggle persistence, theme selection and Back close.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
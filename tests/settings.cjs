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
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve('app/index.html')).href);

    await page.locator('[data-section="settings"]').click();
    await page.locator('#page-settings:not([hidden])').waitFor();
    assert.equal(await page.locator('.settings-category').count(), 7);
    await page.locator('[data-panel="appearance"]').click();
    await page.locator('#theme-select').selectOption('aurora');
    const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('kipsmthn.settings.v1')));
    assert.equal(prefs.theme, 'aurora');

    await page.locator('[data-panel="apps"]').click();
    const sysToggle = page.locator('#system-toggle');
    assert.equal(await sysToggle.getAttribute('aria-pressed'), 'false');
    await sysToggle.click();
    assert.equal(await sysToggle.getAttribute('aria-pressed'), 'true');
    assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('kipsmthn.settings.v1')))).system, true);

    await page.locator('[data-panel="appearance"]').click();
    assert.equal(await page.locator('#background-apply').isVisible(), true);
    assert.equal(await page.locator('.settings-wallpaper-choice').count(), 6);
    assert.equal(await page.locator('.settings-wallpaper-choice img').count(), 6);
    await page.locator('.settings-wallpaper-choice[aria-label="Apply Lake at Dusk wallpaper"]').click();
    assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('kipsmthn.settings.v1')))).background, 'assets/photos/lake-dusk.jpg');
    await page.locator('[data-panel="personalisation"]').click();
    const continueToggle = page.locator('[data-pref="showContinue"]').last();
    await continueToggle.click();
    assert.equal(await continueToggle.getAttribute('aria-pressed'), 'false');
    assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('kipsmthn.settings.v1')))).showContinue, false);

    await page.locator('[data-panel="system"]').click();
    await page.locator('#settings-panel-system').waitFor({ state: 'visible' });
    await page.locator('#tv-settings-status').waitFor({ state: 'attached' });
    await page.locator('[data-panel="general"]').click();
    await page.locator('#settings-reset').click();
    await page.locator('#settings-confirm').waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#settings-confirm').isHidden(), true);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.getElementById('page-settings').hidden);
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-section')), 'settings', 'Back should restore focus to the Settings entry point');
    assert.deepEqual(errors, []);
    console.log('PASS: Settings navigation, theme and wallpaper selection, app listing, Home row persistence, native settings availability, reset dialog, and Back dismissal.');
    await context.close();
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exit(1); });

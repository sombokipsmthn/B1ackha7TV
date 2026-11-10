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
        backgroundVersion: 2, theme: 'midnight', background: 'assets/photos/lake-dusk.jpg', favorites: ['sample'],
        preview: false, system: false, sounds: false, soundVolume: 47, reducedMotion: true,
        homeDestination: 'recent', showApps: false, showRecent: false
      }));
      window.__discoveryMode = 'ok';
      window.__discoveryCalls = 0;
      window.tizen = { application: {
        getCurrentApplication: () => ({ appInfo: { id: 'self' } }),
        getAppsInfo: (success, failure) => { window.__discoveryCalls++; if (window.__discoveryMode === 'error') failure({ name: 'SecurityError', message: 'denied' }); else success([{ id: 'sample', name: 'Sample App', show: true }]); },
        launch: () => {}
      } };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve('app/index.html')).href);
    let prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('kipsmthn.settings.v1')));
    assert.equal(await page.evaluate(() => localStorage.getItem('b1ackha7tv.settings.v1')), null, 'legacy key should migrate once');
    assert.equal(prefs.theme, 'midnight');
    assert.equal(prefs.background, 'assets/photos/lake-dusk.jpg');
    assert.deepEqual(prefs.favorites, ['sample']);
    assert.equal(prefs.soundVolume, 47);
    assert.equal(prefs.homeDestination, 'recent');
    assert.equal(prefs.showApps, false);
    assert.equal(await page.locator('#page-recent').isVisible(), true, 'saved landing page should open on startup');

    await page.locator('[data-section="settings"]').click();
    await page.locator('#page-settings:not([hidden])').waitFor();
    assert.deepEqual(await page.locator('.settings-category b').allTextContents(), ['Appearance', 'Home Screen', 'Sound & Motion', 'Applications', 'About & Maintenance']);
    assert.equal(await page.locator('.settings-category').count(), 5);
    assert.equal(await page.locator('[data-panel="network"]').count(), 0);
    assert.equal(await page.locator('[data-panel="system"]').count(), 0);

    await page.locator('[data-panel="appearance"]').click();
    await page.locator('#theme-select').selectOption('cinematic');
    await page.locator('.settings-wallpaper-choice[aria-label="Apply Lake at Dusk wallpaper"]').click();
    await page.waitForFunction(() => document.getElementById('wallpaper').hasAttribute('data-wallpaper'));
    assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('kipsmthn.settings.v1')))).background, 'assets/photos/lake-dusk.jpg');
    assert.equal(await page.locator('#wallpaper').getAttribute('data-wallpaper'), 'assets/photos/lake-dusk.jpg');

    for (const [selector, key] of [['#animations-toggle', 'animations'], ['#reduced-motion-toggle', 'reducedMotion']]) {
      const control = page.locator(selector);
      const current = await control.getAttribute('aria-pressed');
      await control.click();
      assert.equal(await control.getAttribute('aria-pressed'), String(current !== 'true'));
      assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('kipsmthn.settings.v1'))))[key], current !== 'true');
    }
    await page.locator('[data-panel="sound-motion"]').click();
    for (const [selector, key] of [['#sounds-toggle', 'sounds'], ['#startup-sound-toggle', 'startupSound']]) {
      const control = page.locator(selector);
      const current = await control.getAttribute('aria-pressed');
      await control.click();
      assert.equal(await control.getAttribute('aria-pressed'), String(current !== 'true'));
      assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('kipsmthn.settings.v1'))))[key], current !== 'true');
    }
    await page.locator('#sound-volume').evaluate((el) => { el.value = '63'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('kipsmthn.settings.v1')))).soundVolume, 63);

    await page.locator('[data-panel="home"]').click();
    for (const [key, value] of [['showApps', true], ['showRecent', true]]) {
      const toggle = page.locator(`#settings-panel-home [data-pref="${key}"]`);
      await toggle.click();
      assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('kipsmthn.settings.v1'))))[key], value);
    }
    assert.equal(await page.locator('#apps-section').evaluate((el) => el.hidden), false);
    assert.equal(await page.locator('#recent-home-section').evaluate((el) => el.hidden), false);
    await page.locator('#home-destination').selectOption('apps');
    assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('kipsmthn.settings.v1')))).homeDestination, 'apps');

    await page.locator('[data-panel="sound-motion"]').click();
    await page.locator('#settings-panel-sound-motion [data-pref="animations"]').click();
    assert.equal(await page.locator('#animations-toggle').getAttribute('aria-pressed'), await page.locator('#settings-panel-sound-motion [data-pref="animations"]').getAttribute('aria-pressed'), 'duplicate presentation uses shared state');
    await page.reload();
    prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('kipsmthn.settings.v1')));
    assert.equal(prefs.soundVolume, 63);
    assert.equal(prefs.homeDestination, 'apps');
    assert.equal(await page.locator('#page-apps').isVisible(), true);

    await page.locator('[data-section="settings"]').click();
    await page.locator('[data-panel="apps"]').click();
    await page.locator('#settings-panel-apps:not([hidden])').waitFor();
    await page.waitForFunction(() => document.querySelectorAll('#settings-installed-apps .settings-app-row').length === 1);
    assert.match(await page.locator('#settings-apps-status').innerText(), /1 apps discovered/);
    await page.locator('#apps-refresh-settings').click();
    await page.waitForFunction(() => document.querySelector('#settings-apps-status').getAttribute('data-state') === 'ready');
    assert.equal(await page.locator('#settings-apps-status').innerText(), 'Found 1 apps on this TV.');
    assert.ok(await page.evaluate(() => window.__discoveryCalls) >= 2, 'refresh calls the Tizen catalogue API again');
    await page.evaluate(() => { window.__discoveryMode = 'error'; });
    await page.locator('#apps-refresh-settings').click();
    await page.waitForFunction(() => document.querySelector('#settings-apps-status').getAttribute('data-state') === 'error');
    assert.match(await page.locator('#settings-apps-status').innerText(), /discovery failed/i);
    assert.equal(await page.locator('#apps-refresh-settings').isEnabled(), true);
    await page.locator('#system-toggle').click();
    assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('kipsmthn.settings.v1')))).system, true);
    await page.locator('#manage-visibility').click();
    assert.equal(await page.locator('#page-home').isVisible(), true);
    assert.equal(await page.locator('#edit-hint').isVisible(), true);

    await page.evaluate(() => { window.__discoveryMode = 'ok'; });
    await page.locator('[data-section="settings"]').click();
    await page.locator('#page-settings:not([hidden])').waitFor();
    await page.locator('[data-panel="apps"]').click();
    await page.locator('#settings-panel-apps:not([hidden])').waitFor();
    await page.locator('#apps-refresh-settings').click();
    await page.waitForFunction(() => document.querySelector('#settings-apps-status').getAttribute('data-state') === 'ready');
    await page.locator('[data-section="settings"]').click();
    await page.locator('#page-settings:not([hidden])').waitFor();
    await page.locator('[data-panel="about"]').click();
    await page.locator('#settings-panel-about:not([hidden])').waitFor();
    assert.equal(await page.locator('#app-version').innerText(), '0.8.0');
    await page.locator('#settings-reset').click();
    await page.locator('#settings-confirm').waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => document.activeElement.id), 'settings-reset-cancel');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#settings-confirm').isHidden(), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'settings-reset');
    await page.locator('#settings-reset').click();
    await page.locator('#settings-reset-confirm').click();
    prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('kipsmthn.settings.v1')));
    assert.equal(prefs.soundVolume, 25);
    assert.equal(prefs.homeDestination, 'home');
    assert.equal(prefs.showApps, true);
    assert.equal(prefs.showRecent, true);
    assert.deepEqual(prefs.favorites, ['sample'], 'default favourites are reseeded from the discovered application catalogue');
    assert.equal(await page.locator('#page-home').isVisible(), true);
    assert.equal(await page.locator('#settings-confirm').isHidden(), true);
    assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS: five-category structure; migration, legacy preference retention, wallpaper, shared sound/motion controls, all Home rows and landing destination, app discovery, reset confirm/cancel/execute, reload persistence, and no page errors.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exit(1); });

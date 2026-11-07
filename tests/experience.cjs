const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    await context.addInitScript(() => { if (!localStorage.getItem('kipsmthn.settings.v1')) localStorage.setItem('kipsmthn.settings.v1', JSON.stringify({ backgroundVersion: 2, preview: false })); });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve('app/index.html')).href);
    await page.waitForFunction(() => document.querySelectorAll('[data-lucide].lucide').length > 0);
    await page.waitForFunction(() => document.querySelectorAll('[data-lucide].lucide').length === document.querySelectorAll('svg.lucide').length && document.querySelectorAll('svg.lucide').length > 0);

    const destinations = ['home', 'search', 'apps', 'games', 'recent', 'movies', 'media', 'inputs', 'settings'];
    for (const destination of destinations) {
      await page.locator(`.sidebar-item[data-section="${destination}"]`).click();
      const selector = `#page-${destination}`;
      await page.locator(selector).waitFor({ state: 'visible' });
      assert.equal(await page.locator(`.sidebar-item[data-section="${destination}"]`).getAttribute('aria-current'), 'page');
      await page.screenshot({ path: path.resolve(`tests/screenshots/experience-${destination}-1920x1080.png`), fullPage: true });
      if (destination === 'movies') assert.match(await page.locator('#page-movies').innerText(), /No movie catalogue connected/);
      if (destination === 'media') assert.match(await page.locator('#page-media').innerText(), /Local media is unavailable/);
    }

    await page.locator('[data-panel="general"]').focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-panel')), 'appearance', 'remote down should move between settings categories');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'theme-select', 'remote right should enter the active settings panel');
    assert.notEqual(await page.locator('#theme-select').evaluate((element) => getComputedStyle(element).boxShadow), 'none', 'remote focus must have a visible shadcn ring');

    await page.locator('[data-panel="appearance"]').click();
    const toggles = [ ['#animations-toggle', 'animations', false], ['#reduced-motion-toggle', 'reducedMotion', true], ['#sounds-toggle', 'sounds', false], ['#startup-sound-toggle', 'startupSound', true] ];
    for (const [selector, key, value] of toggles) {
      const control = page.locator(selector);
      await control.scrollIntoViewIfNeeded();
      if ((await control.getAttribute('aria-pressed')) !== String(value)) await control.click();
      assert.equal(await control.getAttribute('aria-pressed'), String(value));
    }
    const volume = page.locator('#sound-volume');
    await volume.evaluate((element) => { element.value = '47'; element.dispatchEvent(new Event('input', { bubbles: true })); });
    let prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('kipsmthn.settings.v1')));
    assert.equal(prefs.animations, false);
    assert.equal(prefs.reducedMotion, true);
    assert.equal(prefs.sounds, false);
    assert.equal(prefs.startupSound, true);
    assert.equal(prefs.soundVolume, 47);
    assert.equal(await page.locator('#wallpaper').evaluate((element) => getComputedStyle(element).animationName), 'none');
    await page.reload();
    prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('kipsmthn.settings.v1')));
    assert.equal(prefs.soundVolume, 47);
    assert.equal(await page.locator('[data-panel="appearance"]').count(), 1);
    assert.deepEqual(errors, []);
    console.log('PASS: all destinations, Lucide SVG rendering, remote settings focus, experience controls, persistence, and reduced-motion behavior.');
    await context.close();
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exit(1); });

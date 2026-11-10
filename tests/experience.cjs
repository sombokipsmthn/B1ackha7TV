const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    await context.addInitScript(() => {
      if (!localStorage.getItem('kipsmthn.settings.v1')) localStorage.setItem('kipsmthn.settings.v1', JSON.stringify({ backgroundVersion: 2, preview: false, favorites: ['youtube', 'netflix'], recentApps: ['netflix'] }));
      window.tizen = {
        application: {
          getCurrentApplication: () => ({ appInfo: { id: 'launcher' } }),
          getAppsInfo: (success) => success([{ id: 'youtube', name: 'YouTube', show: true }, { id: 'netflix', name: 'Netflix', show: true }, { id: 'calc', name: 'Calculator', show: true }])
        },
        systeminfo: { getPropertyValue: (key, success) => success({ connected: [{ type: 'TV', number: 0 }, { type: 'HDMI', number: 1 }, { type: 'HDMI', number: 2 }, { type: 'HDMI', number: 3 }] }) },
        tvwindow: { getSource: () => ({ type: 'TV', number: 0 }), setSource: (source, success) => { window.__lastSource = source; success(); } }
      };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve('app/index.html')).href);
    await page.waitForFunction(() => document.querySelectorAll('#apps .app').length === 2);
    await page.waitForFunction(() => document.querySelectorAll('[data-lucide].lucide').length > 0);
    await page.waitForFunction(() => document.querySelectorAll('[data-lucide].lucide').length === document.querySelectorAll('svg.lucide').length && document.querySelectorAll('svg.lucide').length > 0);

    const destinations = ['home', 'search', 'apps', 'games', 'recent', 'inputs', 'settings'];
    for (const destination of destinations) {
      await page.locator(`.sidebar-item[data-section="${destination}"]`).click();
      const selector = `#page-${destination}`;
      await page.locator(selector).waitFor({ state: 'visible' });
      assert.equal(await page.locator(`.sidebar-item[data-section="${destination}"]`).getAttribute('aria-current'), 'page');
      await page.screenshot({ path: path.resolve(`tests/screenshots/experience-${destination}-1920x1080.png`), fullPage: true });
    }
    assert.equal(await page.locator('.sidebar-item[data-section="movies"], .sidebar-item[data-section="media"], #page-movies, #page-media').count(), 0, 'removed destinations must not be reachable');

    assert.equal(await page.locator('.footer').count(), 0, 'persistent footer must be removed');
    assert.equal(await page.locator('#status').evaluate((el) => getComputedStyle(el).position), 'absolute', 'live status should remain visually hidden');
    await page.locator('.sidebar-item[data-section="search"]').click();
    await page.waitForFunction(() => document.querySelectorAll('#search-apps .app').length === 3);
    assert.equal(await page.locator('#search-results').isVisible(), true, 'empty-query suggestions should render');
    assert.equal(await page.locator('#search-clear').isVisible(), false);
    assert.equal(await page.locator('#search-popular .search-chip').count(), 7);
    assert.equal(await page.locator('#search-titles .search-chip').count(), 4);
    assert.equal(await page.locator('#search-apps .app').first().getAttribute('data-app-id'), 'netflix', 'recent/favorite installed app should rank first');
    await page.locator('#search-input').fill('you');
    assert.equal(await page.locator('#search-apps .app').count(), 1);
    assert.equal(await page.locator('#search-apps .app').first().getAttribute('data-app-id'), 'youtube');
    assert.equal(await page.locator('#search-clear').isVisible(), true);
    await page.locator('#search-input').fill('no-such-app');
    assert.equal(await page.locator('#search-empty').isVisible(), true);
    await page.locator('#search-clear').click();
    assert.equal(await page.locator('#search-popular .search-chip').count(), 7, 'clearing should restore quick suggestions');
    await page.locator('#search-titles .search-chip').filter({ hasText: 'Dune' }).click();
    assert.equal(await page.locator('#search-input').inputValue(), 'Dune', 'title suggestion should populate query');
    await page.locator('#search-input').fill('');
    await page.locator('#search-input').focus();
    await page.keyboard.press('ArrowDown');
    assert.ok(await page.evaluate(() => document.activeElement.classList.contains('app')), 'Down should enter suggested apps');
    await page.locator('#search-popular .search-chip').first().focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'YouTube', 'Right should move horizontally across quick suggestions');
    await page.locator('#search-popular .search-chip').first().focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-section')), 'search', 'left from the first suggestion should return focus to the Search destination');
    await page.locator('#search-input').focus();
    assert.equal(await page.locator('#search-input').evaluate((el) => getComputedStyle(el).outlineStyle), 'none', 'input should not have an inner outline');
    assert.notEqual(await page.locator('.search-bar').evaluate((el) => getComputedStyle(el).boxShadow), 'none');
    await page.locator('.sidebar-item[data-section="inputs"]').click();
    await page.waitForFunction(() => document.querySelectorAll('#inputs-grid .input-tile').length === 4);
    assert.deepEqual(await page.locator('#inputs-grid .input-tile .input-icon').evaluateAll((els) => els.map((el) => el.getAttribute('data-lucide'))), ['Tv', 'Monitor', 'Monitor', 'Monitor']);
    const inputLayout = await page.locator('#inputs-grid').evaluate((grid) => ({
      overflow: document.documentElement.scrollHeight > innerHeight,
      cards: [...grid.children].map((card) => ({
        x: Math.round(card.getBoundingClientRect().x), y: Math.round(card.getBoundingClientRect().y),
        width: Math.round(card.getBoundingClientRect().width),
        tileWidth: Math.round(card.querySelector('.input-tile').getBoundingClientRect().width),
        tileHeight: Math.round(card.querySelector('.input-tile').getBoundingClientRect().height),
        configCount: card.querySelectorAll('.input-xbox-config').length
      }))
    }));
    assert.equal(inputLayout.overflow, false, 'Inputs page should fit vertically without 1080p scrolling');
    assert.ok(inputLayout.cards.every((card) => card.width >= 272 && card.width === card.tileWidth && card.tileHeight === 176), 'source tiles should use consistent dimensions');
    assert.deepEqual(inputLayout.cards.map((card) => card.configCount), [0, 1, 1, 1], 'only HDMI sources should offer Xbox configuration');
    for (const [index, source] of [[0, { type: 'TV', number: 0, name: 'TV' }], [1, { type: 'HDMI', number: 1, name: 'HDMI 1' }], [2, { type: 'HDMI', number: 2, name: 'HDMI 2' }], [3, { type: 'HDMI', number: 3, name: 'HDMI 3' }]]) {
      await page.locator('#inputs-grid .input-tile').nth(index).click();
      assert.deepEqual(await page.evaluate(() => window.__lastSource), source, `input ${source.name} must pass the TV-reported source object`);
    }
    const tileSurface = await page.locator('#apps-carousel [data-app-id="tv"]').evaluate((button) => {
      const nested = button.querySelector('.app-tile');
      const style = getComputedStyle(nested);
      return { background: style.backgroundColor, borderWidth: style.borderWidth, borderRadius: style.borderRadius, shadow: style.boxShadow };
    });
    assert.deepEqual(tileSurface, { background: 'rgba(0, 0, 0, 0)', borderWidth: '0px', borderRadius: '14px', shadow: 'none' }, 'homepage input shortcut should not create a nested glass surface');
    const appSurface = await page.locator('#apps-carousel [data-app-id="youtube"]').evaluate((button) => {
      const style = getComputedStyle(button), nested = getComputedStyle(button.querySelector('.app-tile'));
      return { outerBorder: style.borderWidth, nestedBorder: nested.borderWidth, nestedBackground: nested.backgroundColor, outerRadius: style.borderRadius };
    });
    assert.deepEqual(appSurface, { outerBorder: '1px', nestedBorder: '0px', nestedBackground: 'rgba(0, 0, 0, 0)', outerRadius: '14px' }, 'homepage App shortcut should have one clean glass surface');
    await page.locator('.sidebar-item[data-section="settings"]').click();
    await page.locator('[data-panel="appearance"]').focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-panel')), 'home', 'remote down should move between settings categories');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-panel')), 'sound-motion', 'category navigation should remain ordered and deterministic');
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-panel')), 'home');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'theme-select', 'remote right should enter the active settings panel');
    assert.notEqual(await page.locator('#theme-select').evaluate((element) => getComputedStyle(element).boxShadow), 'none', 'remote focus must have a visible shadcn ring');

    await page.locator('[data-panel="appearance"]').click();
    const toggles = [ ['#animations-toggle', 'animations', false], ['#reduced-motion-toggle', 'reducedMotion', true] ];
    for (const [selector, key, value] of toggles) {
      const control = page.locator(selector);
      if ((await control.getAttribute('aria-pressed')) !== String(value)) await control.click();
      assert.equal(await control.getAttribute('aria-pressed'), String(value));
    }
    await page.locator('[data-panel="sound-motion"]').click();
    for (const [selector, value] of [['#sounds-toggle', false], ['#startup-sound-toggle', true]]) {
      const control = page.locator(selector);
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

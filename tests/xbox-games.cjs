const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      window.__lastSource = null;
      window.tizen = {
        application: {
          getCurrentApplication: () => ({ appInfo: { id: 'launcher' } }),
          getAppsInfo: (success) => success([
            { id: 'tv-game', name: 'TV Puzzle', categories: ['game'], show: true, iconPath: '' },
            { id: 'xbox-app', name: 'Xbox Cloud Gaming', categories: ['game', 'streaming'], show: true, iconPath: '' },
            { id: 'stream-app', name: 'Video Service', categories: ['video'], show: true, iconPath: '' }
          ])
        },
        systeminfo: { getPropertyValue: (key, success) => success({ connected: [{ type: 'TV', number: 0 }, { type: 'HDMI', number: 1 }, { type: 'HDMI', number: 2 }] }) },
        tvwindow: {
          getSource: () => ({ type: 'TV', number: 0 }),
          setSource: (source, success) => { window.__lastSource = { type: source.type, number: source.number }; success(); },
          show: (success) => success && success(),
          hide: (success) => success && success()
        },
        tvinputdevice: { registerKey: () => {}, getSupportedKeys: () => [] }
      };
    });

    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../app/index.html')).href);
    await page.locator('.sidebar-item[data-section="games"]').click();
    await page.locator('#page-games:not([hidden])').waitFor();

    assert.equal(await page.locator('#games-grid .tv-game-card').count(), 1, 'only an installed app explicitly categorized as a game should be listed');
    assert.match(await page.locator('#games-grid').innerText(), /TV Puzzle/);
    assert.doesNotMatch(await page.locator('#games-grid').innerText(), /Xbox Cloud Gaming|Video Service/);
    assert.match(await page.locator('#xbox-console-status').innerText(), /reachability not verified/);
    assert.match(await page.locator('.xbox-highlights').innerText(), /need an authorized Xbox data service/);
    assert.doesNotMatch(await page.locator('.xbox-highlights').innerText(), /[0-9]+ gamerscore|achievement unlocked/i);

    await page.locator('#xbox-settings-open').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#xbox-settings').evaluate((element) => element.open), true);
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'xbox-gamertag-save');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#xbox-settings').evaluate((element) => element.open), false, 'Back should close the active disclosure before leaving the page');
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'SUMMARY', 'Disclosure Back should restore focus to its summary');
    await page.locator('#xbox-settings-open').focus();
    await page.keyboard.press('Enter');
    await page.locator('#xbox-gamertag-input').waitFor();
    await page.locator('#xbox-gamertag-input').fill('Player_Test');
    await page.locator('#xbox-gamertag-save').click();
    assert.equal(await page.locator('#xbox-gamertag').innerText(), 'Player_Test');
    assert.match(await page.locator('#xbox-account-status').innerText(), /Microsoft account not authenticated/);
    assert.equal(await page.evaluate(() => localStorage.getItem('kipsmthn.xbox-gamertag.v1')), 'Player_Test');

    await page.locator('#xbox-input-configure').click();
    await page.locator('#page-inputs:not([hidden])').waitFor();
    await page.locator('.input-xbox-config[aria-label="Set HDMI 2 as Xbox input"]').click();
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('kipsmthn.xbox-input.v1'))), { type: 'HDMI', number: 2, name: 'HDMI 2' });

    await page.locator('.sidebar-item[data-section="games"]').click();
    await page.locator('#page-games:not([hidden])').waitFor();
    await page.locator('#launch-xbox').click();
    assert.deepEqual(await page.evaluate(() => window.__lastSource), { type: 'HDMI', number: 2 });
    assert.match(await page.locator('#xbox-console-status').innerText(), /TV input configured: HDMI 2/);

    await page.locator('#launch-xbox').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'xbox-input-configure', 'Xbox input setup must be reachable with the remote');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'launch-xbox');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'tv-games-refresh', 'Down from the Xbox action should reach TV Games');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-section')), 'games', 'Left from TV Games refresh should reach Games navigation');
    assert.deepEqual(errors, [], 'the Games flows should not throw browser errors');
    console.log('PASS: Gamertag-only profile, honest unavailable-data state, installed TV game filtering, Xbox HDMI mapping, and remote controls.');
    await context.close();
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exit(1); });

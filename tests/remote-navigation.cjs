const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
  try {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      localStorage.setItem('kipsmthn.settings.v1', JSON.stringify({
        name: 'Kipsmthn',
        theme: 'cinematic',
        backgroundVersion: 2,
        favorites: ['youtube', 'netflix', 'primevideo'],
        recentApps: ['netflix'],
        preview: false,
        system: false,
        soundVolume: 50,
        sounds: true,
        animations: true,
        reducedMotion: false,
        showApps: true,
        showRecent: true
      }));

      window.tizen = {
        application: {
          getCurrentApplication: () => ({ appInfo: { id: 'launcher' } }),
          getAppsInfo: (yes) => yes([
            { id: 'youtube', name: 'YouTube', show: true },
            { id: 'netflix', name: 'Netflix', show: true },
            { id: 'primevideo', name: 'Prime Video', show: true },
            { id: 'spotify', name: 'Spotify', show: true },
            { id: 'twitch', name: 'Twitch', show: true }
          ])
        },
        tvwindow: {
          getSource: () => ({ type: 'TV', number: 0 }),
          show: (yes) => yes && yes(),
          hide: (yes) => yes && yes()
        },
        tvinputdevice: {
          registerKey: () => {},
          getSupportedKeys: () => []
        },
        systeminfo: {
          getPropertyValue: (key, cb) => {
            if (key === 'VIDEOSOURCE') {
              cb({ connected: [{ type: 'TV', number: 0 }, { type: 'HDMI', number: 1 }, { type: 'HDMI', number: 2 }] });
            }
          }
        }
      };
    });

    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(pathToFileURL(path.join(root, 'app/index.html')).href);
    await page.waitForFunction(() => document.querySelectorAll('#apps .app').length >= 3);

    // =========================================================================
    // 1. Initial focus on Home landing page
    // =========================================================================
    const initialFocused = await page.evaluate(() => document.activeElement ? document.activeElement.getAttribute('data-app-id') || document.activeElement.id : null);
    assert.ok(initialFocused === 'youtube' || initialFocused === 'home', `Initial focus should be on a valid control, got: ${initialFocused}`);

    // Focus on YouTube in apps carousel
    await page.locator('#apps-carousel [data-app-id="youtube"]').focus();
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-app-id')), 'youtube');

    // =========================================================================
    // 2. Carousel horizontal navigation & boundary handling
    // =========================================================================
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-app-id')), 'netflix');

    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-app-id')), 'prime');

    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-app-id')), 'netflix');

    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-app-id')), 'youtube');

    // Left from first item in carousel navigates to sidebar!
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-section')), 'home');

    // =========================================================================
    // 3. Sidebar vertical navigation & Right into content
    // =========================================================================
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-section')), 'search');

    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-section')), 'apps');

    await page.keyboard.press('ArrowUp');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-section')), 'search');

    await page.keyboard.press('ArrowUp');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-section')), 'home');

    // Up from top sidebar item stays at top
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-section')), 'home');

    // Right from sidebar enters content
    await page.keyboard.press('ArrowRight');
    assert.ok(await page.evaluate(() => document.activeElement.matches('.carousel-item, .app')), 'Right from sidebar should enter content');

    // =========================================================================
    // 4. Vertical navigation between sections on Home
    // =========================================================================
    await page.locator('#apps-carousel [data-app-id="youtube"]').focus();
    await page.keyboard.press('ArrowDown');
    assert.ok(await page.evaluate(() => document.activeElement.matches('.launcher-app-grid .app')), 'Down from carousel should enter apps grid');

    // Up from apps grid returns to carousel
    await page.keyboard.press('ArrowUp');
    assert.ok(await page.evaluate(() => document.activeElement.matches('#apps-carousel .carousel-item')), 'Up from apps grid should return to carousel');

    // Down from apps grid to trending section
    await page.locator('#apps .app').first().focus();
    await page.keyboard.press('ArrowDown');
    assert.ok(await page.evaluate(() => document.activeElement.matches('#trending-carousel .trending-card, .app')), 'Down from bottom of apps grid should enter trending carousel');

    // Left from leftmost item in apps grid returns to sidebar
    await page.locator('#apps .app').first().focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-section')), 'home', 'Left from column 0 of apps grid should focus sidebar');

    // =========================================================================
    // 5. Enter / OK activates focused control exactly once
    // =========================================================================
    await page.locator('.sidebar-item[data-section="home"]').focus();
    let clicks = 0;
    await page.exposeFunction('countTestClick', () => { clicks++; });
    await page.evaluate(() => {
      document.querySelector('#apps-carousel [data-app-id="youtube"]').addEventListener('click', () => {
        window.countTestClick();
      });
    });

    await page.locator('#apps-carousel [data-app-id="youtube"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(clicks, 1, 'Enter should activate button exactly once');

    // Legacy keyCode 13 event simulation
    clicks = 0;
    await page.evaluate(() => {
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13, which: 13, bubbles: true, cancelable: true }));
    });
    assert.equal(clicks, 1, 'Legacy keyCode 13 should activate control exactly once');

    // =========================================================================
    // 6. Settings navigation: Categories, Panels, Inputs, Sliders, Gallery
    // =========================================================================
    await page.locator('.sidebar-item[data-section="settings"]').click();
    await page.locator('#page-settings:not([hidden])').waitFor();
    await page.locator('[data-panel="appearance"]').focus();

    // Down through categories
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-panel')), 'home');

    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-panel')), 'sound-motion');

    // Up through categories
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-panel')), 'home');

    await page.keyboard.press('ArrowUp');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-panel')), 'appearance');

    // Left from category goes to Main Navigation Sidebar
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-section')), 'settings');

    // Right from Main Navigation Sidebar goes back to category
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains('settings-category')), true);

    // Right from Category enters active panel
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'theme-select');

    // Left from panel control at left edge returns to active category
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains('settings-category')), true);

    // Enter panel again
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'theme-select');

    // Down from theme-select enters wallpaper gallery row 1
    await page.keyboard.press('ArrowDown');
    assert.ok(await page.evaluate(() => document.activeElement.classList.contains('settings-wallpaper-choice')), 'Down from theme-select should enter wallpaper gallery');

    // Focus first tile to test full horizontal and vertical grid movement
    await page.locator('.settings-wallpaper-choice').first().focus();
    const firstChoice = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
    assert.equal(firstChoice, 'Apply Twilight Mountains wallpaper');

    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Apply Lake at Dusk wallpaper', 'Right should move to tile 2 in row');

    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Apply Quiet Forest wallpaper', 'Right should move to tile 3 in row');

    // Right on tile 3 (at column boundary) stays on tile 3
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Apply Quiet Forest wallpaper');

    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Apply Lake at Dusk wallpaper');

    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Apply Twilight Mountains wallpaper');

    // Down moves to row 2 in gallery (tile 0 -> tile 3)
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Apply Desert Cinema wallpaper');

    // Up moves back to row 1 in gallery (tile 3 -> tile 0)
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Apply Twilight Mountains wallpaper');

    // Test Sound & Motion range slider
    await page.locator('.settings-category[data-panel="sound-motion"]').click();
    await page.locator('#sound-volume').focus();
    const initialVol = await page.evaluate(() => Number(document.querySelector('#sound-volume').value));
    await page.keyboard.press('ArrowLeft');
    const lowerVol = await page.evaluate(() => Number(document.querySelector('#sound-volume').value));
    assert.equal(lowerVol, Math.max(0, initialVol - 5), 'Left on range slider should decrease volume');

    await page.keyboard.press('ArrowRight');
    const restoredVol = await page.evaluate(() => Number(document.querySelector('#sound-volume').value));
    assert.equal(restoredVol, initialVol, 'Right on range slider should increase volume');

    // =========================================================================
    // 7. Dialog navigation & focus restoration
    // =========================================================================
    await page.locator('.settings-category[data-panel="about"]').click();
    await page.locator('#settings-reset').focus();
    await page.keyboard.press('Enter');
    await page.locator('#settings-confirm:not([hidden])').waitFor();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'settings-reset-cancel');

    // Right moves to confirm button
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'settings-reset-confirm');

    // Left moves back to cancel button
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'settings-reset-cancel');

    // Back / Escape dismisses dialog and restores focus to originating control
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.getElementById('settings-confirm').hidden);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'settings-reset', 'Focus must be restored to #settings-reset after dialog cancel');

    // =========================================================================
    // 8. Back key hierarchy & navigation
    // =========================================================================
    // Back from Settings returns to Home
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.getElementById('page-settings').hidden);
    assert.equal(await page.evaluate(() => document.getElementById('page-home').hidden), false, 'Back from Settings should show Home page');

    // Back from non-home page (e.g. Apps page) returns to Home
    await page.locator('.sidebar-item[data-section="apps"]').click();
    await page.waitForFunction(() => !document.getElementById('page-apps').hidden);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('page-home').hidden);
    assert.equal(await page.evaluate(() => document.getElementById('page-home').hidden), false, 'Back from Apps should show Home page');

    // App editing mode: Back exits editing mode and restores focus
    await page.locator('#edit-apps-home').click();
    assert.equal(await page.evaluate(() => document.getElementById('edit-hint').hidden), false, 'Edit mode should be active');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.getElementById('edit-hint').hidden), true, 'Back should exit edit mode');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'edit-apps-home', 'Focus should return to edit button');

    // Back on Home with no overlays opens exit dialog
    await page.locator('#apps-carousel [data-app-id="youtube"]').focus();
    await page.keyboard.press('Escape');
    await page.locator('#exit-dialog:not([hidden])').waitFor();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'exit-cancel');

    // Dismiss exit dialog restores focus to previously active control
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.getElementById('exit-dialog').hidden);
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-app-id')), 'youtube', 'Focus should restore to YouTube after closing exit dialog');

    // =========================================================================
    // 9. Legacy key event codes (Samsung TV 10009 Return key, etc.)
    // =========================================================================
    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 10009, which: 10009, bubbles: true, cancelable: true }));
    });
    await page.locator('#exit-dialog:not([hidden])').waitFor();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'exit-cancel', 'Samsung keyCode 10009 should trigger Back/Exit dialog');

    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 10009, which: 10009, bubbles: true, cancelable: true }));
    });
    await page.waitForFunction(() => document.getElementById('exit-dialog').hidden);

    // =========================================================================
    // 10. Hidden & disabled controls are never focused
    // =========================================================================
    const invalidFocus = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) return true;
      if (active.disabled) return true;
      if (active.hidden || getComputedStyle(active).visibility === 'hidden' || getComputedStyle(active).display === 'none') return true;
      return false;
    });
    assert.equal(invalidFocus, false, 'Focused element must not be disabled or hidden');

    // =========================================================================
    // 11. Text input caret preservation
    // =========================================================================
    await page.locator('.sidebar-item[data-section="search"]').click();
    await page.locator('#search-input').fill('hello');
    await page.locator('#search-input').focus();
    // Put caret in the middle (index 2)
    await page.evaluate(() => {
      const input = document.querySelector('#search-input');
      input.setSelectionRange(2, 2);
    });
    // Left arrow moves caret, does NOT jump focus away
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'search-input', 'ArrowLeft inside text input should keep focus in input');

    // When at start of input, ArrowLeft navigates to sidebar
    await page.evaluate(() => {
      const input = document.querySelector('#search-input');
      input.setSelectionRange(0, 0);
    });
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-section')), 'search', 'ArrowLeft at start of input should navigate to sidebar');

    // =========================================================================
    // 12. Complete Screen-by-Screen Navigation Audit (Apps, Games, Recent, Inputs)
    // =========================================================================
    // Apps screen
    await page.locator('.sidebar-item[data-section="apps"]').click();
    await page.waitForFunction(() => !document.getElementById('page-apps').hidden);
    await page.locator('#apps-refresh').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'edit-apps');
    await page.keyboard.press('ArrowDown');
    assert.ok(await page.evaluate(() => document.activeElement.classList.contains('app-grid-item')), 'Down from edit-apps should enter apps grid');
    // Navigate Left from first column of apps grid returns to sidebar
    await page.locator('#apps-grid .app-grid-item').first().focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-section')), 'apps');

    // Games screen
    await page.locator('.sidebar-item[data-section="games"]').click();
    await page.waitForFunction(() => !document.getElementById('page-games').hidden);
    await page.locator('#launch-xbox').focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'tv-games-refresh');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-section')), 'games');

    // Recent screen
    await page.locator('.sidebar-item[data-section="recent"]').click();
    await page.waitForFunction(() => !document.getElementById('page-recent').hidden);
    await page.locator('#clear-recent').focus();
    await page.keyboard.press('ArrowDown');
    assert.ok(await page.evaluate(() => document.activeElement.classList.contains('recent-card')), 'Down from clear-recent should enter recent list');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-section')), 'recent');

    // Inputs screen
    await page.locator('.sidebar-item[data-section="inputs"]').click();
    await page.waitForFunction(() => !document.getElementById('page-inputs').hidden);
    await page.locator('#inputs-grid .input-tile').first().focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-section')), 'inputs');

    assert.deepEqual(errors, [], 'No page errors should have occurred');
    await context.close();
    console.log('PASS: comprehensive remote navigation regression tests.');
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

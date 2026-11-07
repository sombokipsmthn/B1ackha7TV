const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname);
const outputDir = path.join(__dirname, 'audit-screenshots');
fs.mkdirSync(outputDir, { recursive: true });

const pages = [
  { id: 'home', name: 'Home' },
  { id: 'search', name: 'Search' },
  { id: 'apps', name: 'Apps' },
  { id: 'games', name: 'Games' },
  { id: 'recent', name: 'Recent' },
  { id: 'inputs', name: 'Inputs' },
  { id: 'settings', name: 'Settings', panel: 'general' }
];

const viewports = [
  { width: 1920, height: 1080, suffix: '1920x1080' },
  { width: 3840, height: 2160, suffix: '3840x2160' }
];

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL });
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: 1,
        reducedMotion: 'reduce'
      });

      await context.addInitScript(() => {
        localStorage.setItem('kipsmthn.settings.v1', JSON.stringify({
          name: 'Kipsmthn',
          theme: 'cinematic',
          backgroundVersion: 2,
          favorites: [],
          preview: false,
          system: false,
          showApps: true,
          showContinue: true,
          showFeatured: true,
          showRecent: true
        }));
        window.tizen = {
          application: {
            getCurrentApplication: () => ({ appInfo: { id: 'self' } }),
            getAppsInfo: (success) => success([
              { id: 'youtube', name: 'YouTube', show: true },
              { id: 'netflix', name: 'Netflix', show: true },
              { id: 'prime', name: 'Prime Video', show: true },
              { id: 'disneyplus', name: 'Disney+', show: true },
              { id: 'hulu', name: 'Hulu', show: true },
              { id: 'spotify', name: 'Spotify', show: true },
              { id: 'twitch', name: 'Twitch', show: true },
              { id: 'steamlink', name: 'Steam Link', show: true },
              { id: 'geforcenow', name: 'GeForce NOW', show: true },
              { id: 'xbox', name: 'Xbox', show: true }
            ])
          },
          tvwindow: { getSource: () => ({ type: 'TV', number: 0 }) }
        };
      });

      const page = await context.newPage();
      await page.clock.install({ time: new Date('2026-01-15T19:30:00Z') });
      await page.goto(pathToFileURL(path.join(root, 'app/index.html')).href);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);

      for (const pageInfo of pages) {
        // Navigate to the page
        if (pageInfo.id === 'settings') {
          await page.locator('[data-section="settings"]').click();
          await page.locator('#page-settings:not([hidden])').waitFor();
          if (pageInfo.panel) {
            await page.locator(`[data-panel="${pageInfo.panel}"]`).click();
          }
        } else {
          await page.locator(`[data-section="${pageInfo.id}"]`).click();
          await page.locator(`#page-${pageInfo.id}:not([hidden])`).waitFor();
        }
        await page.waitForTimeout(300);

        // Take screenshot
        const screenshot = await page.screenshot({ fullPage: true });
        const filename = `${pageInfo.id}-${viewport.suffix}.png`;
        fs.writeFileSync(path.join(outputDir, filename), screenshot);
        console.log(`Captured: ${filename}`);
      }

      await context.close();
    }
    console.log('All screenshots captured successfully!');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exit(1); });
#!/usr/bin/env node
/**
 * Kipsmthn TV - Streaming Visual Preview Asset Downloader
 *
 * Downloads provider logos from Brandfetch and content artwork from TMDB
 * for use in the streaming visual preview system.
 *
 * Usage:
 *   node scripts/download-streaming-assets.js
 *
 * Requires:
 *   - BRANDFETCH_API_KEY (optional, for Brandfetch API)
 *   - TMDB_API_KEY (required for TMDB artwork)
 *
 * This script creates local asset files in app/assets/streaming/
 * for use as a visual prototype only.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ASSETS_DIR = path.join(__dirname, '../app/assets/streaming');
const PROVIDERS_DIR = path.join(ASSETS_DIR, 'providers');
const CONTENT_DIR = path.join(ASSETS_DIR, 'content');

// Provider configurations
const PROVIDERS = [
  { id: 'netflix', name: 'Netflix', domain: 'netflix.com' },
  { id: 'apple-tv', name: 'Apple TV+', domain: 'apple.com' },
  { id: 'prime-video', name: 'Prime Video', domain: 'primevideo.com' },
  { id: 'disney-plus', name: 'Disney+', domain: 'disneyplus.com' },
  { id: 'showmax', name: 'Showmax', domain: 'showmax.com' },
  { id: 'youtube', name: 'YouTube', domain: 'youtube.com' },
  { id: 'plex', name: 'Plex', domain: 'plex.tv' },
  { id: 'crunchyroll', name: 'Crunchyroll', domain: 'crunchyroll.com' }
];

// Sample content with TMDB IDs
const SAMPLE_CONTENT = [
  { id: 'ted-lasso', tmdbId: 100088, type: 'series', provider: 'apple-tv' },
  { id: 'severance', tmdbId: 112807, type: 'series', provider: 'apple-tv' },
  { id: 'stranger-things', tmdbId: 66732, type: 'series', provider: 'netflix' },
  { id: 'wednesday', tmdbId: 153001, type: 'series', provider: 'netflix' },
  { id: 'the-boys', tmdbId: 87113, type: 'series', provider: 'prime-video' },
  { id: 'reacher', tmdbId: 118422, type: 'series', provider: 'prime-video' },
  { id: 'the-bear', tmdbId: 137268, type: 'series', provider: 'disney-plus' },
  { id: 'the-mandalorian', tmdbId: 82856, type: 'series', provider: 'disney-plus' },
  { id: 'the-crown', tmdbId: 71712, type: 'series', provider: 'netflix' },
  { id: 'house-of-dragon', tmdbId: 94997, type: 'series', provider: 'disney-plus' }
];

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);

    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${destPath}`);
        resolve(destPath);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });

    file.on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

async function downloadProviderLogos() {
  console.log('\n=== Downloading Provider Logos (Brandfetch) ===\n');

  const brandfetchApiKey = process.env.BRANDFETCH_API_KEY;

  for (const provider of PROVIDERS) {
    const destPath = path.join(PROVIDERS_DIR, `${provider.id}-logo.svg`);

    // Check if already exists
    if (fs.existsSync(destPath)) {
      console.log(`Skipping ${provider.name} (already exists)`);
      continue;
    }

    try {
      let logoUrl = null;

      if (brandfetchApiKey) {
        // Use Brandfetch API
        const brandfetchUrl = `https://api.brandfetch.io/v2/brands/${provider.domain}?apiKey=${brandfetchApiKey}`;
        const data = await fetchJson(brandfetchUrl);

        if (data.logos && data.logos.length > 0) {
          // Prefer SVG, then PNG
          const svgLogo = data.logos.find(l => l.format === 'svg' || l.url.endsWith('.svg'));
          const pngLogo = data.logos.find(l => l.format === 'png' || l.url.endsWith('.png'));
          logoUrl = (svgLogo || pngLogo || data.logos[0]).url;
        }
      } else {
        // Fallback: try to get from brandfetch.io without API key (limited)
        // Or use known CDN URLs
        console.log(`No Brandfetch API key - creating placeholder for ${provider.name}`);
        // Create a simple SVG placeholder with provider name
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" fill="#1a1a2e"/>
  <text x="100" y="100" font-family="system-ui, sans-serif" font-size="24" fill="#fff" text-anchor="middle" dominant-baseline="middle" font-weight="600">${provider.name}</text>
</svg>`;
        fs.writeFileSync(destPath, svg);
        console.log(`Created placeholder: ${destPath}`);
        continue;
      }

      if (logoUrl) {
        await downloadFile(logoUrl, destPath);
      } else {
        console.warn(`No logo found for ${provider.name}`);
      }
    } catch (error) {
      console.error(`Failed to download logo for ${provider.name}:`, error.message);
    }
  }
}

async function downloadContentArtwork() {
  console.log('\n=== Downloading Content Artwork (TMDB) ===\n');

  const tmdbApiKey = process.env.TMDB_API_KEY;

  if (!tmdbApiKey) {
    console.log('No TMDB API key provided. Creating placeholder artwork.');
    for (const content of SAMPLE_CONTENT) {
      createContentPlaceholders(content);
    }
    return;
  }

  // Fetch TMDB configuration for image URLs
  try {
    const configUrl = `https://api.themoviedb.org/3/configuration?api_key=${tmdbApiKey}`;
    const config = await fetchJson(configUrl);
    const imageBaseUrl = config.images.secure_base_url;
    const posterSizes = config.images.poster_sizes;
    const backdropSizes = config.images.backdrop_sizes;
    const logoSizes = config.images.logo_sizes;

    // Use w500 for posters, w1280 for backdrops, original for logos
    const posterSize = posterSizes.find(s => s === 'w500') || 'w500';
    const backdropSize = backdropSizes.find(s => s === 'w1280') || 'w1280';
    const logoSize = logoSizes.find(s => s === 'original') || 'original';

    for (const content of SAMPLE_CONTENT) {
      const endpoint = content.type === 'series' ? 'tv' : 'movie';
      const imagesUrl = `https://api.themoviedb.org/3/${endpoint}/${content.tmdbId}/images?api_key=${tmdbApiKey}&include_image_language=en,null`;

      try {
        const imagesData = await fetchJson(imagesUrl);

        // Download poster
        if (imagesData.posters && imagesData.posters.length > 0) {
          const poster = imagesData.posters.find(p => p.iso_639_1 === 'en') || imagesData.posters[0];
          const posterUrl = `${imageBaseUrl}${posterSize}${poster.file_path}`;
          const destPath = path.join(CONTENT_DIR, `${content.id}-poster.jpg`);
          if (!fs.existsSync(destPath)) {
            await downloadFile(posterUrl, destPath);
          }
        }

        // Download backdrop
        if (imagesData.backdrops && imagesData.backdrops.length > 0) {
          const backdrop = imagesData.backdrops.find(b => b.iso_639_1 === 'en') || imagesData.backdrops[0];
          const backdropUrl = `${imageBaseUrl}${backdropSize}${backdrop.file_path}`;
          const destPath = path.join(CONTENT_DIR, `${content.id}-backdrop.jpg`);
          if (!fs.existsSync(destPath)) {
            await downloadFile(backdropUrl, destPath);
          }
        }

        // Download logo
        if (imagesData.logos && imagesData.logos.length > 0) {
          const logo = imagesData.logos.find(l => l.iso_639_1 === 'en') || imagesData.logos[0];
          const logoUrl = `${imageBaseUrl}${logoSize}${logo.file_path}`;
          const destPath = path.join(CONTENT_DIR, `${content.id}-logo.png`);
          if (!fs.existsSync(destPath)) {
            await downloadFile(logoUrl, destPath);
          }
        }

        // Create landscape still from backdrop (crop)
        // For prototype, we'll just copy the backdrop
        const backdropPath = path.join(CONTENT_DIR, `${content.id}-backdrop.jpg`);
        const landscapePath = path.join(CONTENT_DIR, `${content.id}-landscape.jpg`);
        if (fs.existsSync(backdropPath) && !fs.existsSync(landscapePath)) {
          fs.copyFileSync(backdropPath, landscapePath);
          console.log(`Copied backdrop as landscape: ${landscapePath}`);
        }

      } catch (error) {
        console.error(`Failed to fetch artwork for ${content.id}:`, error.message);
        createContentPlaceholders(content);
      }
    }
  } catch (error) {
    console.error('Failed to fetch TMDB configuration:', error.message);
    for (const content of SAMPLE_CONTENT) {
      createContentPlaceholders(content);
    }
  }
}

function createContentPlaceholders(content) {
  const posterPath = path.join(CONTENT_DIR, `${content.id}-poster.svg`);
  const backdropPath = path.join(CONTENT_DIR, `${content.id}-backdrop.svg`);
  const landscapePath = path.join(CONTENT_DIR, `${content.id}-landscape.svg`);
  const logoPath = path.join(CONTENT_DIR, `${content.id}-logo.svg`);

  if (!fs.existsSync(posterPath)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450" width="300" height="450">
  <rect width="300" height="450" fill="#1a1a2e"/>
  <rect x="50" y="75" width="200" height="300" fill="#0f0f1a" stroke="#333" stroke-width="2" rx="8"/>
  <circle cx="150" cy="175" r="40" fill="#1a1a2e" stroke="#333" stroke-width="2"/>
  <text x="150" y="270" font-family="system-ui, sans-serif" font-size="14" fill="#666" text-anchor="middle" font-weight="500">${content.id}</text>
  <text x="150" y="295" font-family="system-ui, sans-serif" font-size="12" fill="#555" text-anchor="middle">TMDB: ${content.tmdbId}</text>
</svg>`;
    fs.writeFileSync(posterPath, svg);
  }

  if (!fs.existsSync(backdropPath)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <rect width="1920" height="1080" fill="#0a0a0f"/>
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a3a;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#0a0a0f;stop-opacity:0.7" />
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#grad)"/>
  <text x="960" y="540" font-family="system-ui, sans-serif" font-size="32" fill="#555" text-anchor="middle" font-weight="500">${content.id}</text>
  <text x="960" y="585" font-family="system-ui, sans-serif" font-size="20" fill="#444" text-anchor="middle">TMDB: ${content.tmdbId}</text>
</svg>`;
    fs.writeFileSync(backdropPath, svg);
  }

  if (!fs.existsSync(landscapePath)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
  <rect width="640" height="360" fill="#1a1a2e"/>
  <rect x="80" y="60" width="480" height="240" fill="#0f0f1a" stroke="#333" stroke-width="2" rx="8"/>
  <circle cx="320" cy="180" r="50" fill="#1a1a2e" stroke="#333" stroke-width="2"/>
  <text x="320" y="260" font-family="system-ui, sans-serif" font-size="16" fill="#666" text-anchor="middle" font-weight="500">${content.id}</text>
  <text x="320" y="285" font-family="system-ui, sans-serif" font-size="12" fill="#555" text-anchor="middle">TMDB: ${content.tmdbId}</text>
</svg>`;
    fs.writeFileSync(landscapePath, svg);
  }

  if (!fs.existsSync(logoPath)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100" width="300" height="100">
  <rect width="300" height="100" fill="#1a1a2e"/>
  <text x="150" y="55" font-family="system-ui, sans-serif" font-size="20" fill="#fff" text-anchor="middle" dominant-baseline="middle" font-weight="600">${content.id}</text>
</svg>`;
    fs.writeFileSync(logoPath, svg);
  }

  console.log(`Created placeholders for ${content.id}`);
}

async function main() {
  console.log('Kipsmthn TV - Streaming Visual Preview Asset Downloader');
  console.log('========================================================');

  // Ensure directories exist
  if (!fs.existsSync(PROVIDERS_DIR)) fs.mkdirSync(PROVIDERS_DIR, { recursive: true });
  if (!fs.existsSync(CONTENT_DIR)) fs.mkdirSync(CONTENT_DIR, { recursive: true });

  await downloadProviderLogos();
  await downloadContentArtwork();

  console.log('\n=== Download Complete ===');
  console.log(`Provider logos: ${PROVIDERS_DIR}`);
  console.log(`Content artwork: ${CONTENT_DIR}`);
  console.log('\nNote: This is a visual prototype. Set BRANDFETCH_API_KEY and TMDB_API_KEY');
  console.log('environment variables for real asset downloads.');
}

main().catch(console.error);
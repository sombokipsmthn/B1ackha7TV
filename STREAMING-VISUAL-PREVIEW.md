# Kipsmthn TV — Streaming Visual Preview

## Overview

The Streaming Visual Preview system provides a cinematic, visually rich interface for browsing streaming content. It integrates with **Brandfetch** for provider logos and **TMDB (The Movie Database)** for content artwork (posters, backdrops, landscape stills, logos).

**IMPORTANT:** This is a **visual prototype only** using sample providers and sample shows. It does NOT:
- Access actual installed-app discovery
- Modify application identity or package IDs
- Interfere with launch functionality
- Collect or store user viewing history
- Scrape provider applications or authenticated sessions

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    StreamingAssetService                    │
│  (app/services/streaming-asset-service.js)                  │
├──────────────────────┬──────────────────────────────────────┤
│      Brandfetch      │              TMDB                     │
│  (Provider Logos)    │        (Content Artwork)              │
├──────────────────────┼──────────────────────────────────────┤
│  ContentArtworkService (existing, enhanced)                 │
│  - Caching          - Fallback handling                     │
│  - Preloading       - Validation                            │
└──────────────────────┴──────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │           UI Components                 │
         │  - ContinueWatchingCard                │
         │  - ContentCard                         │
         │  - DynamicWallpaper                    │
         └────────────────────────────────────────┘
```

## Asset Sources

### Brandfetch (Provider Logos)
- **API**: `https://api.brandfetch.io/v2/brands/{domain}`
- **Providers**: Netflix, Apple TV+, Prime Video, Disney+, Showmax, YouTube, Plex, Crunchyroll
- **Format**: SVG preferred, PNG fallback
- **Cache TTL**: 30 days
- **Local Path**: `assets/streaming/providers/{provider-id}-logo.svg`

### TMDB (Content Artwork)
- **API**: `https://api.themoviedb.org/3`
- **Content**: Posters (w500), Backdrops (w1280), Logos (original), Landscape (cropped backdrop)
- **Cache TTL**: 24 hours
- **Local Path**: `assets/streaming/content/{content-id}-{variant}.{ext}`

## Configuration

### Environment Variables
```bash
# Optional: Brandfetch API key for higher rate limits
export BRANDFETCH_API_KEY=your_key_here

# Required for real TMDB artwork downloads
export TMDB_API_KEY=your_tmdb_key_here
```

### Feature Flag
The streaming visual preview is controlled by the global flag `STREAMING_VISUAL_PREVIEW`:
```javascript
// Enable (default)
window.STREAMING_VISUAL_PREVIEW = true;

// Disable completely
window.STREAMING_VISUAL_PREVIEW = false;
```

## Asset Directory Structure

```
app/assets/streaming/
├── providers/
│   ├── netflix-logo.svg
│   ├── apple-tv-logo.svg
│   ├── prime-video-logo.svg
│   ├── disney-plus-logo.svg
│   ├── showmax-logo.svg
│   ├── youtube-logo.svg
│   ├── plex-logo.svg
│   ├── crunchyroll-logo.svg
│   └── fallback-provider.svg
└── content/
    ├── ted-lasso-poster.jpg
    ├── ted-lasso-backdrop.jpg
    ├── ted-lasso-landscape.jpg
    ├── ted-lasso-logo.png
    ├── severance-poster.jpg
    ├── severance-backdrop.jpg
    ├── severance-landscape.jpg
    ├── severance-logo.png
    ... (more content)
    ├── fallback-poster.svg
    ├── fallback-backdrop.svg
    ├── fallback-landscape.svg
    └── fallback-logo.svg
```

## Downloading Assets

Run the download script to populate local assets:

```bash
# With API keys (recommended)
BRANDFETCH_API_KEY=xxx TMDB_API_KEY=yyy node scripts/download-streaming-assets.js

# Without API keys (creates placeholders)
node scripts/download-streaming-assets.js
```

## Integration Points

### ContentArtworkService (Enhanced)
The existing `ContentArtworkService` now delegates to `StreamingAssetService` when available:

```javascript
// Before (local mock data only)
contentArtworkService.getBackdropUrl(content.backdrop);

// After (with streaming assets)
contentArtworkService.getBackdropUrl(content.backdrop, content.id, content.tmdbId, content.type);
```

### ContinueWatchingCard
Updated to use streaming assets for:
- Provider logos (via Brandfetch)
- Landscape stills (via TMDB)

### ContentCard
Updated to use streaming assets for all variants:
- Portrait: Posters
- Landscape: Landscape stills
- Provider logos

### DynamicWallpaper
Can now transition to content-specific backdrops from TMDB when focus changes in Continue Watching.

## Sample Content

The prototype includes 10 sample shows across 5 providers:

| Show | Provider | TMDB ID | Type |
|------|----------|---------|------|
| Ted Lasso | Apple TV+ | 100088 | Series |
| Severance | Apple TV+ | 112807 | Series |
| Stranger Things | Netflix | 66732 | Series |
| Wednesday | Netflix | 153001 | Series |
| The Boys | Prime Video | 87113 | Series |
| Reacher | Prime Video | 118422 | Series |
| The Bear | Disney+ | 137268 | Series |
| The Mandalorian | Disney+ | 82856 | Series |
| The Crown | Netflix | 71712 | Series |
| House of the Dragon | Disney+ | 94997 | Series |

## Fallback System

If assets are unavailable, the system gracefully falls back:

1. **Provider Logo** → `fallback-provider.svg` (generic "Streaming Preview" badge)
2. **Poster** → `fallback-poster.svg` (generic content card)
3. **Backdrop** → `fallback-backdrop.svg` (gradient with "Visual Prototype" text)
4. **Landscape** → `fallback-landscape.svg` (generic landscape card)
5. **Logo** → `fallback-logo.svg` (text-based)

## Manifest & Validation

The `StreamingAssetService` maintains a local manifest (`Map`) tracking:
- Asset source (brandfetch/tmdb/local)
- Cache timestamps
- Local file paths
- Validation status

Use `streamingAssetService.validateAllAssets()` to check asset integrity.

## Performance Considerations

- **Lazy loading**: Images loaded on demand via `ContentArtworkService`
- **Preloading**: Adjacent content preloaded (3 items before/after)
- **Caching**: In-memory cache with TTL (5 min for artwork service, 30 days for manifest)
- **Deduplication**: Manifest prevents duplicate downloads
- **Debounced transitions**: Wallpaper changes debounced at 150ms

## Disabling the Feature

To disable the streaming visual preview entirely:

1. Set global flag before app initialization:
   ```javascript
   window.STREAMING_VISUAL_PREVIEW = false;
   ```

2. Or remove the script from `index.html`:
   ```html
   <!-- Remove this line -->
   <script src="services/streaming-asset-service.js"></script>
   ```

3. The app will fall back to original mock-content.js assets seamlessly.

## TMDB Attribution

When using TMDB artwork in production, include:
```
This product uses the TMDB API but is not endorsed or certified by TMDB.
```

## License & Legal

- **Brandfetch**: Logos subject to respective brand guidelines
- **TMDB**: Artwork licensed under TMDB Terms of Use
- **Local Fallbacks**: Created for this project, free to use
- **Prototype Only**: This visual preview does not grant rights to distribute or use provider branding or TMDB artwork outside development

## Troubleshooting

### Assets not loading
1. Check `streamingAssetService.getCacheStats()` for manifest status
2. Verify local files exist in `assets/streaming/`
3. Check browser console for 404 errors
4. Run download script with API keys

### Wrong artwork showing
1. Verify TMDB IDs in `mock-content.js` match actual shows
2. Clear browser cache and localStorage
3. Call `streamingAssetService.clearCache()` and reinitialize

### Performance issues
1. Reduce `preloadCount` in `ContentArtworkService` config
2. Disable `useStreamingAssets` in `ContentArtworkService` config
3. Check `streamingAssetService.getCacheStats()` for cache size
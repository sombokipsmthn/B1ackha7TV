/**
 * Kipsmthn TV - Streaming Visual Preview Asset Service
 *
 * Manages streaming provider logos (via Brandfetch) and content artwork (via TMDB).
 * Provides local caching, deduplication, validation, and fallback handling.
 *
 * IMPORTANT: This is a visual prototype using sample providers and sample shows.
 * It must not interfere with actual installed-app discovery, application identity,
 * package IDs or launch functionality.
 */

(function (global) {
  'use strict';

  var DEFAULT_CONFIG = {
    // Brandfetch configuration
    brandfetch: {
      baseUrl: 'https://api.brandfetch.io/v2',
      enabled: true,
      cacheTTL: 30 * 24 * 60 * 60 * 1000 // 30 days
    },
    // TMDB configuration
    tmdb: {
      baseUrl: 'https://api.themoviedb.org/3',
      imageBaseUrl: 'https://image.tmdb.org/t/p',
      apiKey: null, // Set via environment or settings for production use
      enabled: false, // Enable when API key is configured
      cacheTTL: 24 * 60 * 60 * 1000 // 24 hours
    },
    // Local asset management
    assets: {
      basePath: 'assets/streaming',
      providersPath: 'assets/streaming/providers',
      contentPath: 'assets/streaming/content',
      maxCacheSize: 200,
      fallbackProviderLogo: 'assets/streaming/providers/fallback-provider.svg',
      fallbackContentPoster: 'assets/streaming/content/fallback-poster.svg',
      fallbackContentBackdrop: 'assets/streaming/content/fallback-backdrop.svg',
      fallbackContentLandscape: 'assets/streaming/content/fallback-landscape.svg'
    },
    // Supported providers (visual preview only)
    supportedProviders: [
      'netflix',
      'apple-tv',
      'prime-video',
      'disney-plus',
      'showmax',
      'youtube',
      'plex',
      'crunchyroll'
    ],
    // Sample content for visual preview (not real viewing data)
    sampleContent: [
      { id: 'ted-lasso', provider: 'apple-tv' },
      { id: 'stranger-things', provider: 'netflix' },
      { id: 'the-witcher', provider: 'netflix' },
      { id: 'wednesday', provider: 'netflix' },
      { id: 'the-mandalorian', provider: 'disney-plus' },
      { id: 'reacher', provider: 'prime-video' },
      { id: 'the-last-of-us', provider: 'showmax' },
      { id: 'house-of-the-dragon', provider: 'showmax' },
      { id: 'the-bear', provider: 'disney-plus' },
      { id: 'severance', provider: 'apple-tv' }
    ]
  };

  // Provider name mapping for Brandfetch
  var PROVIDER_BRAND_NAMES = {
    'netflix': 'Netflix',
    'apple-tv': 'Apple TV+',
    'prime-video': 'Prime Video',
    'disney-plus': 'Disney+',
    'showmax': 'Showmax',
    'youtube': 'YouTube',
    'plex': 'Plex',
    'crunchyroll': 'Crunchyroll'
  };

  // Provider domains for Brandfetch lookup
  var PROVIDER_DOMAINS = {
    'netflix': 'netflix.com',
    'apple-tv': 'apple.com/tv',
    'prime-video': 'primevideo.com',
    'disney-plus': 'disneyplus.com',
    'showmax': 'showmax.com',
    'youtube': 'youtube.com',
    'plex': 'plex.tv',
    'crunchyroll': 'crunchyroll.com'
  };

  function StreamingAssetService(config) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, config || {});
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.manifest = new Map();
    this.initManifest();
  }

  StreamingAssetService.prototype.mergeConfig = function (defaults, config) {
    var result = JSON.parse(JSON.stringify(defaults));
    function deepMerge(target, source) {
      Object.keys(source).forEach(function (key) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = target[key] || {};
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      });
    }
    deepMerge(result, config);
    return result;
  };

  StreamingAssetService.prototype.initManifest = function () {
    // Initialize local manifest with existing assets
    this.manifest.set('version', '1.0.0');
    this.manifest.set('updated', Date.now());
    this.manifest.set('assets', new Map());
  };

  StreamingAssetService.prototype.getManifestEntry = function (key) {
    var assets = this.manifest.get('assets');
    return assets ? assets.get(key) : undefined;
  };

  StreamingAssetService.prototype.setManifestEntry = function (key, entry) {
    var assets = this.manifest.get('assets');
    if (!assets) {
      assets = new Map();
      this.manifest.set('assets', assets);
    }
    assets.set(key, Object.assign({}, entry, { cachedAt: Date.now() }));
    this.manifest.set('updated', Date.now());
  };

  StreamingAssetService.prototype.getLocalAssetPath = function (type, identifier, variant) {
    var basePath = this.config.assets.basePath;
    if (type === 'provider') {
      return basePath + '/providers/' + identifier + (variant ? '-' + variant : '') + '.webp';
    } else if (type === 'content') {
      var extension = variant === 'logo' ? '.png' : '.jpg';
      return basePath + '/content/' + identifier + (variant ? '-' + variant : '') + extension;
    }
    return basePath + '/' + identifier;
  };

  // ==================== BRANDFETCH INTEGRATION ====================

  StreamingAssetService.prototype.fetchProviderLogo = function (providerId) {
    var self = this;
    var providerName = PROVIDER_BRAND_NAMES[providerId];
    var domain = PROVIDER_DOMAINS[providerId];

    if (!providerName || !domain) {
      console.warn('Unknown provider for Brandfetch:', providerId);
      return Promise.resolve(this.config.assets.fallbackProviderLogo);
    }

    // Check cache first
    var cacheKey = 'provider-logo:' + providerId;
    var cached = this.getManifestEntry(cacheKey);
    if (cached && cached.localPath && (Date.now() - cached.cachedAt) < this.config.brandfetch.cacheTTL) {
      return Promise.resolve(cached.localPath);
    }

    // Check if already loading
    var existingPromise = this.loadingPromises.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    var loadPromise = this.fetchBrandfetchLogo(providerName, domain, providerId)
      .then(function (localPath) {
        self.setManifestEntry(cacheKey, {
          type: 'provider-logo',
          providerId: providerId,
          source: 'brandfetch',
          localPath: localPath,
          brandName: providerName,
          domain: domain
        });
        self.loadingPromises.delete(cacheKey);
        return localPath;
      })
      .catch(function (error) {
        console.warn('Brandfetch failed for', providerId, ':', error.message);
        self.loadingPromises.delete(cacheKey);
        return self.config.assets.fallbackProviderLogo;
      });

    this.loadingPromises.set(cacheKey, loadPromise);
    return loadPromise;
  };

  StreamingAssetService.prototype.fetchBrandfetchLogo = function (brandName, domain, providerId) {
    var self = this;

    if (!this.config.brandfetch.enabled) {
      return Promise.reject(new Error('Brandfetch disabled'));
    }

    // In a real implementation, this would call the Brandfetch API
    // For now, we'll create placeholder paths that would be populated
    // by a build-time script or manual download
    var localPath = this.getLocalAssetPath('provider', providerId, 'logo');

    // Check if local file exists
    return this.checkLocalAsset(localPath).then(function (exists) {
      if (exists) {
        return localPath;
      }
      // In production: download from Brandfetch API
      // For prototype: return fallback with a note
      console.info('Brandfetch logo for', brandName, 'would be downloaded from', domain);
      console.info('Expected at:', localPath);
      return self.config.assets.fallbackProviderLogo;
    });
  };

  StreamingAssetService.prototype.preloadProviderLogos = function (providerIds) {
    var self = this;
    var promises = (providerIds || this.config.supportedProviders).map(function (providerId) {
      return self.fetchProviderLogo(providerId).catch(function () {
        // Silently ignore preload failures
      });
    });
    return Promise.allSettled(promises);
  };

  // ==================== TMDB INTEGRATION ====================

  StreamingAssetService.prototype.fetchContentArtwork = function (contentId, tmdbId, contentType) {
    var self = this;
    var cacheKey = 'content-artwork:' + contentId;

    // Check cache first
    var cached = this.getManifestEntry(cacheKey);
    if (cached && cached.localPaths && (Date.now() - cached.cachedAt) < this.config.tmdb.cacheTTL) {
      return Promise.resolve(cached.localPaths);
    }

    // Check if already loading
    var existingPromise = this.loadingPromises.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    var loadPromise = this.fetchTMDBArtwork(tmdbId, contentType, contentId)
      .then(function (localPaths) {
        self.setManifestEntry(cacheKey, {
          type: 'content-artwork',
          contentId: contentId,
          tmdbId: tmdbId,
          contentType: contentType,
          source: 'tmdb',
          localPaths: localPaths
        });
        self.loadingPromises.delete(cacheKey);
        return localPaths;
      })
      .catch(function (error) {
        console.warn('TMDB fetch failed for', contentId, ':', error.message);
        self.loadingPromises.delete(cacheKey);
        // Return fallbacks
        return {
          poster: self.config.assets.fallbackContentPoster,
          backdrop: self.config.assets.fallbackContentBackdrop,
          landscape: self.config.assets.fallbackContentLandscape,
          logo: null
        };
      });

    this.loadingPromises.set(cacheKey, loadPromise);
    return loadPromise;
  };

  StreamingAssetService.prototype.fetchTMDBArtwork = function (tmdbId, contentType, contentId) {
    var self = this;

    if (!this.config.tmdb.enabled || !this.config.tmdb.apiKey) {
      // Return local fallbacks for prototype
      return Promise.resolve({
        poster: this.getLocalAssetPath('content', contentId, 'poster'),
        backdrop: this.getLocalAssetPath('content', contentId, 'backdrop'),
        landscape: this.getLocalAssetPath('content', contentId, 'landscape'),
        logo: this.getLocalAssetPath('content', contentId, 'logo')
      });
    }

    // In a real implementation with TMDB API key:
    // 1. Call TMDB API for images configuration
    // 2. Search for the content by TMDB ID
    // 3. Download poster, backdrop, logo at appropriate sizes
    // 4. Save locally and return paths

    var endpoints = {
      series: '/tv/' + tmdbId + '/images',
      movie: '/movie/' + tmdbId + '/images'
    };

    var endpoint = endpoints[contentType] || endpoints.series;

    // Placeholder for real TMDB integration
    console.info('TMDB artwork for', contentId, '(TMDB:', tmdbId + ') would be fetched from', endpoint);

    return Promise.resolve({
      poster: this.getLocalAssetPath('content', contentId, 'poster'),
      backdrop: this.getLocalAssetPath('content', contentId, 'backdrop'),
      landscape: this.getLocalAssetPath('content', contentId, 'landscape'),
      logo: this.getLocalAssetPath('content', contentId, 'logo')
    });
  };

  StreamingAssetService.prototype.preloadContentArtwork = function (contentList) {
    var self = this;
    var promises = contentList.map(function (content) {
      if (content.tmdbId) {
        return self.fetchContentArtwork(content.id, content.tmdbId, content.type).catch(function () {
          // Silently ignore preload failures
        });
      }
      return Promise.resolve();
    });
    return Promise.allSettled(promises);
  };

  // ==================== ASSET VALIDATION ====================

  StreamingAssetService.prototype.checkLocalAsset = function (path) {
    return new Promise(function (resolve) {
      if (!global.Image) {
        resolve(false);
        return;
      }
      var img = new global.Image();
      img.onload = function () { resolve(true); };
      img.onerror = function () { resolve(false); };
      img.src = path;
    });
  };

  StreamingAssetService.prototype.validateAsset = function (path) {
    var self = this;
    return new Promise(function (resolve) {
      if (!global.Image) {
        resolve({ valid: false, reason: 'No Image support' });
        return;
      }
      var img = new global.Image();
      img.onload = function () {
        resolve({
          valid: true,
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight
        });
      };
      img.onerror = function () {
        resolve({ valid: false, reason: 'Failed to load' });
      };
      img.src = path;
    });
  };

  StreamingAssetService.prototype.validateAllAssets = function () {
    var self = this;
    var results = { valid: [], invalid: [], missing: [] };

    this.manifest.get('assets').forEach(function (entry, key) {
      if (entry.localPath) {
        self.validateAsset(entry.localPath).then(function (result) {
          if (result.valid) {
            results.valid.push(key);
          } else {
            results.invalid.push({ key: key, reason: result.reason });
          }
        });
      } else if (entry.localPaths) {
        // Content artwork with multiple variants
        Object.keys(entry.localPaths).forEach(function (variant) {
          var path = entry.localPaths[variant];
          if (path) {
            self.validateAsset(path).then(function (result) {
              if (result.valid) {
                results.valid.push(key + ':' + variant);
              } else {
                results.invalid.push({ key: key + ':' + variant, reason: result.reason });
              }
            });
          }
        });
      } else {
        results.missing.push(key);
      }
    });

    return results;
  };

  // ==================== PUBLIC API ====================

  StreamingAssetService.prototype.getProviderLogo = function (providerId) {
    return this.fetchProviderLogo(providerId);
  };

  StreamingAssetService.prototype.getProviderLogoUrl = function (providerId) {
    // Synchronous version for immediate use (returns fallback if not cached)
    var cacheKey = 'provider-logo:' + providerId;
    var cached = this.getManifestEntry(cacheKey);
    if (cached && cached.localPath) {
      return cached.localPath;
    }
    // Trigger async fetch
    this.fetchProviderLogo(providerId);
    return this.config.assets.fallbackProviderLogo;
  };

  StreamingAssetService.prototype.getContentArtwork = function (contentId, tmdbId, contentType) {
    return this.fetchContentArtwork(contentId, tmdbId, contentType);
  };

  StreamingAssetService.prototype.getContentArtworkUrls = function (contentId) {
    var show = global.TMDBContentService && global.TMDBContentService.getShow(contentId);
    var assets = show && show.assets;
    if (assets) { return { poster: assets.poster ? assets.poster.localPath : this.config.assets.fallbackContentPoster, backdrop: assets.backdrop ? assets.backdrop.localPath : this.config.assets.fallbackContentBackdrop, landscape: assets.still ? assets.still.localPath : (assets.backdrop ? assets.backdrop.localPath : this.config.assets.fallbackContentLandscape), logo: null }; }
    var cached = this.getManifestEntry('content-artwork:' + contentId);
    if (cached && cached.localPaths) { return cached.localPaths; }
    return { poster: this.config.assets.fallbackContentPoster, backdrop: this.config.assets.fallbackContentBackdrop, landscape: this.config.assets.fallbackContentLandscape, logo: null };
  };

  StreamingAssetService.prototype.getPosterUrl = function (contentId, tmdbId, contentType) {
    var urls = this.getContentArtworkUrls(contentId);
    return urls.poster;
  };

  StreamingAssetService.prototype.getBackdropUrl = function (contentId, tmdbId, contentType) {
    var urls = this.getContentArtworkUrls(contentId);
    return urls.backdrop;
  };

  StreamingAssetService.prototype.getLandscapeStillUrl = function (contentId, tmdbId, contentType) {
    var urls = this.getContentArtworkUrls(contentId);
    return urls.landscape;
  };

  StreamingAssetService.prototype.getContentLogoUrl = function (contentId, tmdbId, contentType) {
    var urls = this.getContentArtworkUrls(contentId);
    return urls.logo;
  };

  StreamingAssetService.prototype.initializePreviewAssets = function () {
    var self = this;
    var providerPromise = Promise.resolve([]);
    var catalogueSamples = global.TMDBContentService ? global.TMDBContentService.getCatalog().map(function (show) { return { id: show.slug, tmdbId: show.tmdbId, provider: '' }; }) : [];
    var contentPromise = this.config.tmdb.enabled && this.config.tmdb.apiKey
      ? this.preloadContentArtwork(catalogueSamples)
      : Promise.resolve([]);

    return Promise.all([providerPromise, contentPromise]).then(function () {
      console.info('Streaming visual preview assets initialized');
      return self.getManifest();
    });
  };

  StreamingAssetService.prototype.getManifest = function () {
    var manifest = {
      version: this.manifest.get('version'),
      updated: this.manifest.get('updated'),
      assets: {}
    };

    this.manifest.get('assets').forEach(function (entry, key) {
      manifest.assets[key] = entry;
    });

    return manifest;
  };

  StreamingAssetService.prototype.exportManifest = function () {
    return JSON.stringify(this.getManifest(), null, 2);
  };

  StreamingAssetService.prototype.clearCache = function () {
    this.cache.clear();
    this.loadingPromises.clear();
  };

  StreamingAssetService.prototype.getCacheStats = function () {
    var assetCount = this.manifest.get('assets') ? this.manifest.get('assets').size : 0;
    return {
      manifestEntries: assetCount,
      loadingPromises: this.loadingPromises.size,
      cacheSize: this.cache.size
    };
  };

  // ==================== SAMPLE CONTENT HELPERS ====================

  StreamingAssetService.prototype.getSampleContent = function () {
    return this.config.sampleContent.map(function (item) {
      return {
        id: item.id,
        tmdbId: item.tmdbId,
        provider: item.provider,
        // These would be enriched from ContentData/MOCK_CONTENT
        title: '',
        type: 'series'
      };
    });
  };

  StreamingAssetService.prototype.enrichSampleContent = function (contentList) {
    var self = this;
    return contentList.map(function (item) {
      var mockContent = global.ContentData && global.ContentData.getContentById(item.id);
      if (mockContent) {
        return Object.assign({}, mockContent, {
          // Add streaming preview specific fields
          streamingPreview: true,
          providerLogo: self.getProviderLogoUrl(mockContent.providerId),
          poster: self.getPosterUrl(mockContent.id, mockContent.tmdbId, mockContent.type),
          backdrop: self.getBackdropUrl(mockContent.id, mockContent.tmdbId, mockContent.type),
          landscapeStill: self.getLandscapeStillUrl(mockContent.id, mockContent.tmdbId, mockContent.type),
          contentLogo: self.getContentLogoUrl(mockContent.id, mockContent.tmdbId, mockContent.type)
        });
      }
      return item;
    });
  };

  // Export singleton instance
  global.streamingAssetService = new StreamingAssetService();

  // Export class for testing/custom instances
  global.StreamingAssetService = StreamingAssetService;

  // Configuration constants
  global.STREAMING_PREVIEW_CONFIG = {
    SUPPORTED_PROVIDERS: DEFAULT_CONFIG.supportedProviders,
    PROVIDER_BRAND_NAMES: PROVIDER_BRAND_NAMES,
    PROVIDER_DOMAINS: PROVIDER_DOMAINS,
    SAMPLE_CONTENT: DEFAULT_CONFIG.sampleContent,
    IS_DEMO: true
  };

}(window));
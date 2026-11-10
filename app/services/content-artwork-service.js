/**
 * Kipsmthn TV - Content Artwork Service
 *
 * Handles loading, caching, and fallback for content artwork including
 * posters, backdrops, landscape stills, and provider logos.
 * Works with locally bundled demonstration assets and streaming visual preview.
 */

(function (global) {
  'use strict';

  var DEFAULT_CONFIG = {
    cacheSize: 50,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
    preloadCount: 3,
    fallbackImage: 'assets/photos/twilight-mountains.jpg',
    useStreamingAssets: true // Enable streaming visual preview integration
  };

  function ContentArtworkService(config) {
    this.config = Object.assign({}, DEFAULT_CONFIG, config || {});
    this.cache = new Map();
    this.loadingPromises = new Map();
  }

  ContentArtworkService.prototype.loadImage = function (src) {
    // Check cache first
    var cached = this.cache.get(src);
    if (cached && cached.loaded && cached.element) {
      // Check TTL
      if (Date.now() - cached.timestamp < this.config.cacheTTL) {
        return Promise.resolve(cached.element);
      }
    }

    // Check if already loading
    var existingPromise = this.loadingPromises.get(src);
    if (existingPromise) {
      return existingPromise;
    }

    // Create new load promise
    var loadPromise = new Promise(function (resolve, reject) {
      var img = new Image();
      img.decoding = 'async';
      img.loading = 'lazy';

      img.onload = function () {
        this.cache.set(src, {
          src: src,
          loaded: true,
          element: img,
          timestamp: Date.now()
        });
        this.loadingPromises.delete(src);
        this.enforceCacheLimit();
        resolve(img);
      }.bind(this);

      img.onerror = function () {
        this.cache.set(src, {
          src: src,
          loaded: false,
          timestamp: Date.now()
        });
        this.loadingPromises.delete(src);
        reject(new Error('Failed to load image: ' + src));
      }.bind(this);

      img.src = src;
    }.bind(this));

    this.loadingPromises.set(src, loadPromise);
    return loadPromise;
  };

  ContentArtworkService.prototype.preloadImages = function (srcs) {
    var promises = srcs.slice(0, this.config.preloadCount).map(function (src) {
      // Skip if already cached
      var cached = this.cache.get(src);
      if (cached && cached.loaded) {
        return Promise.resolve();
      }
      return this.loadImage(src).catch(function () {
        // Silently ignore preload failures
      });
    }.bind(this));

    return Promise.allSettled(promises);
  };

  ContentArtworkService.prototype.getImageUrl = function (src) {
    if (!src) {
      return this.config.fallbackImage;
    }
    return src;
  };

  ContentArtworkService.prototype.getBackdropUrl = function (backdrop, contentId, tmdbId, contentType) {
    // Try streaming asset service first if enabled and contentId provided
    if (this.config.useStreamingAssets && contentId && window.streamingAssetService) {
      var streamingUrl = window.streamingAssetService.getBackdropUrl(contentId, tmdbId, contentType);
      if (streamingUrl && streamingUrl !== window.streamingAssetService.config.assets.fallbackContentBackdrop) {
        return streamingUrl;
      }
    }
    return this.getImageUrl(backdrop);
  };

  ContentArtworkService.prototype.getLandscapeStillUrl = function (landscapeStill, contentId, tmdbId, contentType) {
    // Try streaming asset service first if enabled and contentId provided
    if (this.config.useStreamingAssets && contentId && window.streamingAssetService) {
      var streamingUrl = window.streamingAssetService.getLandscapeStillUrl(contentId, tmdbId, contentType);
      if (streamingUrl && streamingUrl !== window.streamingAssetService.config.assets.fallbackContentLandscape) {
        return streamingUrl;
      }
    }
    return this.getImageUrl(landscapeStill);
  };

  ContentArtworkService.prototype.getPosterUrl = function (poster, contentId, tmdbId, contentType) {
    // Try streaming asset service first if enabled and contentId provided
    if (this.config.useStreamingAssets && contentId && window.streamingAssetService) {
      var streamingUrl = window.streamingAssetService.getPosterUrl(contentId, tmdbId, contentType);
      if (streamingUrl && streamingUrl !== window.streamingAssetService.config.assets.fallbackContentPoster) {
        return streamingUrl;
      }
    }
    return this.getImageUrl(poster);
  };

  ContentArtworkService.prototype.getProviderLogoUrl = function (logo, providerId) {
    // Try streaming asset service first if enabled and providerId provided
    if (this.config.useStreamingAssets && providerId && window.streamingAssetService) {
      var streamingUrl = window.streamingAssetService.getProviderLogoUrl(providerId);
      if (streamingUrl && streamingUrl !== window.streamingAssetService.config.assets.fallbackProviderLogo) {
        return streamingUrl;
      }
    }
    return this.getImageUrl(logo);
  };

  ContentArtworkService.prototype.isCached = function (src) {
    var cached = this.cache.get(src);
    if (!cached || !cached.loaded) return false;
    return Date.now() - cached.timestamp < this.config.cacheTTL;
  };

  ContentArtworkService.prototype.preloadAdjacent = function (currentIndex, contentList) {
    var srcs = [];

    // Preload previous items
    for (var i = 1; i <= this.config.preloadCount; i++) {
      var idx = currentIndex - i;
      if (idx >= 0) {
        var content = contentList[idx];
        if (content.backdrop) srcs.push(content.backdrop);
        if (content.landscapeStill) srcs.push(content.landscapeStill);
      }
    }

    // Preload next items
    for (var i = 1; i <= this.config.preloadCount; i++) {
      var idx = currentIndex + i;
      if (idx < contentList.length) {
        var content = contentList[idx];
        if (content.backdrop) srcs.push(content.backdrop);
        if (content.landscapeStill) srcs.push(content.landscapeStill);
      }
    }

    return this.preloadImages(srcs);
  };

  ContentArtworkService.prototype.enforceCacheLimit = function () {
    if (this.cache.size <= this.config.cacheSize) return;

    // Remove oldest entries
    var entries = Array.from(this.cache.entries())
      .sort(function (a, b) { return a[1].timestamp - b[1].timestamp; });

    var toRemove = entries.slice(0, this.cache.size - this.config.cacheSize);
    toRemove.forEach(function (entry) { this.cache.delete(entry[0]); }.bind(this));
  };

  ContentArtworkService.prototype.clearCache = function () {
    this.cache.clear();
    this.loadingPromises.clear();
  };

  ContentArtworkService.prototype.getCacheStats = function () {
    var hits = 0;
    var misses = 0;
    this.cache.forEach(function (entry) {
      if (entry.loaded) hits++;
      else misses++;
    });
    var total = hits + misses;
    return {
      size: this.cache.size,
      hitRate: total > 0 ? hits / total : 0
    };
  };

  // Export singleton instance
  global.contentArtworkService = new ContentArtworkService();

  // Export class for testing/custom instances
  global.ContentArtworkService = ContentArtworkService;
}(window));
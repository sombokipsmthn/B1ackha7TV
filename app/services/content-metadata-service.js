/**
 * Kipsmthn TV - Content Metadata Service
 *
 * Provides content metadata resolution with TMDB integration.
 * Currently uses locally bundled mock data; future implementations
 * can use TMDB API for real metadata resolution.
 *
 * IMPORTANT: This service does NOT scrape provider applications or
 * extract protected content. It only resolves publicly available
 * metadata from TMDB and local bundled assets.
 */

(function (global) {
  'use strict';

  var DEFAULT_CONFIG = {
    tmdb: {
      apiKey: null, // Set via environment or settings for production use
      baseUrl: 'https://api.themoviedb.org/3',
      imageBaseUrl: 'https://image.tmdb.org/t/p/w1280',
      enabled: false
    },
    useLocalFallback: true,
    cacheTTL: 24 * 60 * 60 * 1000 // 24 hours
  };

  function ContentMetadataService(config) {
    this.config = Object.assign({}, DEFAULT_CONFIG, config || {});
    this.cache = new Map();
    this.contentMap = new Map();

    // Initialize with mock content
    this.loadLocalContent();
  }

  ContentMetadataService.prototype.loadLocalContent = function () {
    if (window.ContentData && window.ContentData.MOCK_CONTENT) {
      var tmdbItems = window.TMDB_STREAMING_METADATA && window.TMDB_STREAMING_METADATA.content || [];
      var tmdbById = new Map();
      tmdbItems.forEach(function (item) { tmdbById.set(item.id, item); });
      window.ContentData.MOCK_CONTENT.forEach(function (content) {
        var metadata = tmdbById.get(content.id);
        this.contentMap.set(content.id, metadata ? Object.assign({}, content, {
          title: metadata.name || content.title,
          description: metadata.overview || content.description,
          releaseYear: metadata.firstAirDate ? Number(metadata.firstAirDate.slice(0, 4)) : content.releaseYear,
          episodeRunTime: metadata.episodeRunTime || [],
          trailers: metadata.videos || []
        }) : content);
      }.bind(this));
    }
  };

  ContentMetadataService.prototype.getContentById = function (id) {
    return this.contentMap.get(id);
  };

  ContentMetadataService.prototype.getAllContent = function () {
    return Array.from(this.contentMap.values());
  };

  ContentMetadataService.prototype.getContentByProvider = function (providerId) {
    return Array.from(this.contentMap.values()).filter(
      function (content) { return content.providerId === providerId; }
    );
  };

  ContentMetadataService.prototype.getProviderConfig = function (providerId) {
    if (window.ContentData && window.ContentData.PROVIDERS) {
      return window.ContentData.PROVIDERS.find(function (p) { return p.id === providerId; });
    }
    return undefined;
  };

  ContentMetadataService.prototype.getAllProviders = function () {
    if (window.ContentData && window.ContentData.PROVIDERS) {
      return window.ContentData.PROVIDERS.slice();
    }
    return [];
  };

  ContentMetadataService.prototype.searchContent = function (query) {
    if (!query || query.length < 2) return Promise.resolve([]);

    var term = query.toLowerCase().trim();
    var localResults = Array.from(this.contentMap.values()).filter(
      function (content) { return content.title.toLowerCase().includes(term); }
    );

    if (localResults.length > 0 || !this.config.useLocalFallback) {
      return Promise.resolve(localResults);
    }

    // Future: TMDB search when enabled
    // if (this.config.tmdb.enabled && this.config.tmdb.apiKey) {
    //   return this.searchTMDB(query);
    // }

    return Promise.resolve(localResults);
  };

  ContentMetadataService.prototype.resolveByTMDB = function (tmdbId) {
    // Check local cache first
    var local = Array.from(this.contentMap.values()).find(
      function (content) { return content.tmdbId === tmdbId; }
    );
    if (local) return Promise.resolve(local);

    // Future: TMDB resolution when enabled
    // if (this.config.tmdb.enabled && this.config.tmdb.apiKey) {
    //   return this.resolveTMDB(tmdbId);
    // }

    return Promise.resolve(undefined);
  };

  ContentMetadataService.prototype.getContinueWatchingContent = function () {
    if (window.ContentData) {
      return window.ContentData.getContinueWatchingContent();
    }
    return [];
  };

  ContentMetadataService.prototype.getTrendingContent = function () {
    if (window.ContentData && window.ContentData.MOCK_CONTENT) {
      return window.ContentData.MOCK_CONTENT.slice(0, 4);
    }
    return [];
  };

  ContentMetadataService.prototype.getFeaturedContent = function () {
    if (window.ContentData && window.ContentData.MOCK_CONTENT) {
      return window.ContentData.MOCK_CONTENT.slice(0, 6);
    }
    return [];
  };

  ContentMetadataService.prototype.getContentByGenre = function (genre) {
    var term = genre.toLowerCase();
    return Array.from(this.contentMap.values()).filter(
      function (content) {
        return content.genres && content.genres.some(function (g) {
          return g.toLowerCase().includes(term);
        });
      }
    );
  };

  ContentMetadataService.prototype.getRecentlyAdded = function () {
    if (window.ContentData && window.ContentData.MOCK_CONTENT) {
      return window.ContentData.MOCK_CONTENT.slice()
        .sort(function (a, b) { return (b.releaseYear || 0) - (a.releaseYear || 0); })
        .slice(0, 6);
    }
    return [];
  };

  ContentMetadataService.prototype.formatDuration = function (seconds) {
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return hours + 'h ' + minutes + 'm';
    }
    return minutes + 'm';
  };

  ContentMetadataService.prototype.formatRemainingTime = function (progress, duration) {
    var remaining = Math.round(duration * (1 - progress / 100));
    return this.formatDuration(remaining);
  };

  ContentMetadataService.prototype.getProviderDisplayName = function (providerId) {
    var provider = this.getProviderConfig(providerId);
    return provider ? provider.name : providerId;
  };

  ContentMetadataService.prototype.updateConfig = function (config) {
    this.config = Object.assign({}, this.config, config);
  };

  ContentMetadataService.prototype.isTMDBEnabled = function () {
    return this.config.tmdb.enabled && !!this.config.tmdb.apiKey;
  };

  // Export singleton instance
  global.contentMetadataService = new ContentMetadataService();

  // Export class for testing/custom instances
  global.ContentMetadataService = ContentMetadataService;
}(window));
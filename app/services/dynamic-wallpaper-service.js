/**
 * Kipsmthn TV - Dynamic Wallpaper Service
 *
 * Handles smooth transitions between cinematic backdrops based on
 * user focus navigation. Supports both content-specific and provider-specific
 * backgrounds with crossfade animations.
 */

(function (global) {
  'use strict';

  var DEFAULT_CONFIG = {
    transitionDuration: 800,
    debounceMs: 150,
    overlayOpacity: 0.4,
    gradientStops: 'linear-gradient(90deg, rgba(5,5,5,.36), rgba(5,5,5,.08) 62%, rgba(5,5,5,.22)), linear-gradient(0deg, rgba(5,5,5,.46), transparent 64%)',
    defaultBackdrop: 'assets/photos/twilight-mountains.jpg'
  };

  var WallpaperSource = {
    CONTENT: 'content',
    PROVIDER: 'provider',
    DEFAULT: 'default'
  };

  function DynamicWallpaperService(config) {
    this.config = Object.assign({}, DEFAULT_CONFIG, config || {});
    this.state = {
      currentSrc: DEFAULT_CONFIG.defaultBackdrop,
      currentSource: WallpaperSource.DEFAULT,
      currentContentId: undefined,
      currentProviderId: undefined,
      isTransitioning: false
    };
    this.wallpaperElement = null;
    this.pendingTransition = null;
    this.debounceTimer = null;
    this.listeners = new Set();
    this.preloadedBackdrops = new Set();
  }

  DynamicWallpaperService.prototype.init = function (wallpaperElement) {
    this.wallpaperElement = wallpaperElement;
    this.applyBackground(this.state.currentSrc, false);
  };

  DynamicWallpaperService.prototype.subscribe = function (listener) {
    this.listeners.add(listener);
    return function () { this.listeners.delete(listener); }.bind(this);
  };

  DynamicWallpaperService.prototype.notify = function () {
    var stateCopy = {
      currentSrc: this.state.currentSrc,
      currentSource: this.state.currentSource,
      currentContentId: this.state.currentContentId,
      currentProviderId: this.state.currentProviderId,
      isTransitioning: this.state.isTransitioning
    };
    this.listeners.forEach(function (listener) { listener(stateCopy); });
  };

  DynamicWallpaperService.prototype.setContentWallpaper = function (content) {
    if (!content.backdrop) {
      return this.setDefaultWallpaper();
    }

    this.debounceTransition(function () { this.transitionToContent(content); }.bind(this));
  };

  DynamicWallpaperService.prototype.setProviderWallpaper = function (provider) {
    var backdropKey = provider.backdropTheme;
    var backdropUrl = 'assets/content/providers/' + backdropKey + '.jpg';

    this.debounceTransition(function () { this.transitionToProvider(provider, backdropUrl); }.bind(this));
  };

  DynamicWallpaperService.prototype.setDefaultWallpaper = function () {
    this.debounceTransition(function () { this.transitionToDefault(); }.bind(this));
  };

  DynamicWallpaperService.prototype.debounceTransition = function (transitionFn) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(function () {
      transitionFn();
      this.debounceTimer = null;
    }.bind(this), this.config.debounceMs);
  };

  DynamicWallpaperService.prototype.transitionToContent = function (content) {
    if (this.state.currentContentId === content.id && this.state.currentSource === WallpaperSource.CONTENT) {
      return; // Already showing this content
    }

    var backdropUrl = window.contentArtworkService.getBackdropUrl(content.backdrop);
    this.performTransition(backdropUrl, WallpaperSource.CONTENT, content.id);
  };

  DynamicWallpaperService.prototype.transitionToProvider = function (provider, backdropUrl) {
    if (this.state.currentProviderId === provider.id && this.state.currentSource === WallpaperSource.PROVIDER) {
      return; // Already showing this provider
    }

    // Preload the provider backdrop
    window.contentArtworkService.loadImage(backdropUrl).catch(function () {
      // Fallback to default if provider backdrop fails
      backdropUrl = this.config.defaultBackdrop;
    }.bind(this)).then(function () {
      this.performTransition(backdropUrl, WallpaperSource.PROVIDER, provider.id);
    }.bind(this));
  };

  DynamicWallpaperService.prototype.transitionToDefault = function () {
    if (this.state.currentSource === WallpaperSource.DEFAULT) {
      return; // Already showing default
    }

    this.performTransition(this.config.defaultBackdrop, WallpaperSource.DEFAULT);
  };

  DynamicWallpaperService.prototype.performTransition = function (newSrc, source, identifier) {
    var self = this;

    if (!this.wallpaperElement) {
      console.warn('Wallpaper element not initialized');
      return Promise.resolve();
    }

    if (this.state.isTransitioning) {
      // Wait for current transition to complete
      return new Promise(function (resolve) {
        var checkTransition = setInterval(function () {
          if (!self.state.isTransitioning) {
            clearInterval(checkTransition);
            resolve();
          }
        }, 50);
      }).then(function () {
        return self.performTransition(newSrc, source, identifier);
      });
    }

    this.state.isTransitioning = true;
    this.notify();

    // Preload new image
    return window.contentArtworkService.loadImage(newSrc).then(function () {
      // Apply crossfade transition
      return self.crossfadeTo(newSrc);
    }).catch(function (error) {
      console.warn('Failed to preload wallpaper:', error);
      self.state.isTransitioning = false;
      self.notify();
    }).then(function () {
      // Update state
      self.state.currentSrc = newSrc;
      self.state.currentSource = source;
      self.state.currentContentId = source === WallpaperSource.CONTENT ? identifier : undefined;
      self.state.currentProviderId = source === WallpaperSource.PROVIDER ? identifier : undefined;
      self.state.isTransitioning = false;

      self.notify();
    });
  };

  DynamicWallpaperService.prototype.crossfadeTo = function (newSrc) {
    var self = this;
    return new Promise(function (resolve) {
      if (!self.wallpaperElement) {
        resolve();
        return;
      }

      var wallpaper = self.wallpaperElement;
      var duration = self.config.transitionDuration;

      // Create overlay element for crossfade
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position: absolute; inset: 0; opacity: 0; background-image: ' + self.config.gradientStops + ', url("' + newSrc + '"); background-size: cover; background-position: center; transition: opacity ' + duration + 'ms ease-in-out; pointer-events: none; z-index: 1;';

      wallpaper.style.position = 'relative';
      wallpaper.appendChild(overlay);

      // Force reflow
      overlay.offsetHeight;

      // Start crossfade
      overlay.style.opacity = '1';

      // Clean up after transition
      setTimeout(function () {
        // Update main background
        wallpaper.style.backgroundImage = self.config.gradientStops + ', url("' + newSrc + '")';
        wallpaper.style.backgroundSize = 'cover';
        wallpaper.style.backgroundPosition = 'center';

        // Remove overlay
        overlay.remove();
        resolve();
      }, duration);
    });
  };

  DynamicWallpaperService.prototype.applyBackground = function (src, animate) {
    if (!this.wallpaperElement) return;

    var wallpaper = this.wallpaperElement;
    wallpaper.style.backgroundImage = this.config.gradientStops + ', url("' + src + '")';
    wallpaper.style.backgroundSize = 'cover';
    wallpaper.style.backgroundPosition = 'center';

    if (animate) {
      wallpaper.style.transition = 'background-image ' + this.config.transitionDuration + 'ms ease-in-out';
    } else {
      wallpaper.style.transition = 'none';
    }
  };

  DynamicWallpaperService.prototype.preloadBackdrops = function (contentList) {
    var srcs = contentList
      .map(function (c) { return c.backdrop; })
      .filter(function (src) { return !!src; })
      .map(function (src) { return window.contentArtworkService.getBackdropUrl(src); });

    return window.contentArtworkService.preloadImages(srcs).then(function () {
      srcs.forEach(function (src) { self.preloadedBackdrops.add(src); });
    });
  };

  DynamicWallpaperService.prototype.getState = function () {
    return {
      currentSrc: this.state.currentSrc,
      currentSource: this.state.currentSource,
      currentContentId: this.state.currentContentId,
      currentProviderId: this.state.currentProviderId,
      isTransitioning: this.state.isTransitioning
    };
  };

  DynamicWallpaperService.prototype.isShowingContent = function (contentId) {
    return this.state.currentSource === WallpaperSource.CONTENT && this.state.currentContentId === contentId;
  };

  DynamicWallpaperService.prototype.isShowingProvider = function (providerId) {
    return this.state.currentSource === WallpaperSource.PROVIDER && this.state.currentProviderId === providerId;
  };

  DynamicWallpaperService.prototype.updateConfig = function (config) {
    this.config = Object.assign({}, this.config, config);
  };

  DynamicWallpaperService.prototype.destroy = function () {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.listeners.clear();
    this.preloadedBackdrops.clear();
  };

  // Export singleton instance
  global.dynamicWallpaperService = new DynamicWallpaperService();

  // Export class for testing/custom instances
  global.DynamicWallpaperService = DynamicWallpaperService;
  global.WallpaperSource = WallpaperSource;
}(window));
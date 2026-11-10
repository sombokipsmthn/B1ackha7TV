/**
 * Kipsmthn TV - Dynamic Wallpaper Component
 *
 * Main component for managing dynamic cinematic wallpapers on the homepage.
 * Integrates with the existing wallpaper element and focus navigation.
 */

(function (global) {
  'use strict';

  function DynamicWallpaper(options) {
    this.wallpaperElement = options.wallpaperElement;
    this.options = Object.assign({}, {
      defaultBackdrop: 'assets/photos/twilight-mountains.jpg',
      onWallpaperChange: null
    }, options || {});

    // Initialize transition component
    this.transition = new window.WallpaperTransition(this.wallpaperElement, {
      duration: 800,
      easing: 'ease-in-out',
      overlayGradient: 'linear-gradient(90deg, rgba(5,5,5,.36), rgba(5,5,5,.08) 62%, rgba(5,5,5,.22)), linear-gradient(0deg, rgba(5,5,5,.46), transparent 64%)',
      onTransitionStart: function () {
        this.wallpaperElement.classList.add('wallpaper-transitioning');
      }.bind(this),
      onTransitionEnd: function () {
        this.wallpaperElement.classList.remove('wallpaper-transitioning');
      }.bind(this)
    });

    // Initialize the dynamic wallpaper service
    window.dynamicWallpaperService.init(this.wallpaperElement);

    // Subscribe to service state changes
    this.serviceUnsubscribe = window.dynamicWallpaperService.subscribe(function (state) {
      if (this.options.onWallpaperChange) {
        this.options.onWallpaperChange(state.currentSrc, state.currentSource, state.currentContentId || state.currentProviderId);
      }
    }.bind(this));

    // Set initial background
    this.setDefault();
  }

  DynamicWallpaper.prototype.setContentWallpaper = function (content) {
    return window.dynamicWallpaperService.setContentWallpaper(content);
  };

  DynamicWallpaper.prototype.setProviderWallpaper = function (provider) {
    return window.dynamicWallpaperService.setProviderWallpaper(provider);
  };

  DynamicWallpaper.prototype.setDefault = function () {
    return window.dynamicWallpaperService.setDefaultWallpaper();
  };

  DynamicWallpaper.prototype.preloadBackdrops = function (contentList) {
    return window.dynamicWallpaperService.preloadBackdrops(contentList);
  };

  DynamicWallpaper.prototype.getState = function () {
    return window.dynamicWallpaperService.getState();
  };

  DynamicWallpaper.prototype.isShowingContent = function (contentId) {
    return window.dynamicWallpaperService.isShowingContent(contentId);
  };

  DynamicWallpaper.prototype.isShowingProvider = function (providerId) {
    return window.dynamicWallpaperService.isShowingProvider(providerId);
  };

  DynamicWallpaper.prototype.updateConfig = function (config) {
    window.dynamicWallpaperService.updateConfig(config);
    if (config.transitionDuration) {
      this.transition.updateOptions({ duration: config.transitionDuration });
    }
  };

  DynamicWallpaper.prototype.destroy = function () {
    if (this.serviceUnsubscribe) this.serviceUnsubscribe();
    this.transition.destroy();
  };

  // Factory function
  DynamicWallpaper.createDynamicWallpaper = function (options) {
    return new DynamicWallpaper(options);
  };

  // Export to global scope
  global.DynamicWallpaper = DynamicWallpaper;
  global.createDynamicWallpaper = DynamicWallpaper.createDynamicWallpaper;
}(window));
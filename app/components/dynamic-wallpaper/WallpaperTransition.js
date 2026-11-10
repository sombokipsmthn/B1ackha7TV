/**
 * Kipsmthn TV - Wallpaper Transition Component
 *
 * Handles smooth crossfade transitions between cinematic backdrops.
 * Provides a reusable transition effect for the dynamic wallpaper system.
 */

(function (global) {
  'use strict';

  var DEFAULT_OPTIONS = {
    duration: 800,
    easing: 'ease-in-out',
    overlayGradient: 'linear-gradient(90deg, rgba(5,5,5,.36), rgba(5,5,5,.08) 62%, rgba(5,5,5,.22)), linear-gradient(0deg, rgba(5,5,5,.46), transparent 64%)',
    onTransitionStart: function () {},
    onTransitionEnd: function () {}
  };

  function WallpaperTransition(wallpaperElement, options) {
    this.wallpaperElement = wallpaperElement;
    this.options = Object.assign({}, DEFAULT_OPTIONS, options || {});
    this.isTransitioning = false;
    this.currentSrc = '';

    // Ensure wallpaper element has relative positioning for overlay
    if (getComputedStyle(this.wallpaperElement).position === 'static') {
      this.wallpaperElement.style.position = 'relative';
    }
  }

  WallpaperTransition.prototype.transitionTo = function (newSrc) {
    var self = this;

    if (this.isTransitioning) {
      // Wait for current transition to complete
      return this.waitForTransition().then(function () {
        return self.transitionTo(newSrc);
      });
    }

    if (this.currentSrc === newSrc) {
      return Promise.resolve(); // Already showing this image
    }

    this.isTransitioning = true;
    this.options.onTransitionStart();

    // Preload the new image
    return this.preloadImage(newSrc).then(function () {
      // Perform crossfade
      return self.crossfade(newSrc);
    }).then(function () {
      self.currentSrc = newSrc;
    }).catch(function (error) {
      console.warn('Transition failed:', error);
      throw error;
    }).finally(function () {
      self.isTransitioning = false;
      self.options.onTransitionEnd();
    });
  };

  WallpaperTransition.prototype.applyBackground = function (src) {
    this.wallpaperElement.style.backgroundImage = this.options.overlayGradient + ', url("' + src + '")';
    this.wallpaperElement.style.backgroundSize = 'cover';
    this.wallpaperElement.style.backgroundPosition = 'center';
    this.wallpaperElement.style.transition = 'none';
    this.currentSrc = src;
  };

  WallpaperTransition.prototype.preloadImage = function (src) {
    return new Promise(function (resolve, reject) {
      if (!src) { reject(new Error('Missing wallpaper image')); return; }
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () { resolve(); };
      img.onerror = function () { reject(new Error('Failed to preload: ' + src)); };
      img.src = src;
    });
  };

  WallpaperTransition.prototype.crossfade = function (newSrc) {
    var self = this;
    return new Promise(function (resolve) {
      var duration = self.options.duration;

      // Create overlay for crossfade
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position: absolute; inset: 0; opacity: 0; background-image: ' + self.options.overlayGradient + ', url("' + newSrc + '"); background-size: cover; background-position: center; transition: opacity ' + duration + 'ms ' + self.options.easing + '; pointer-events: none; z-index: 1;';

      self.wallpaperElement.appendChild(overlay);

      // Force reflow
      overlay.offsetHeight;

      // Start crossfade
      overlay.style.opacity = '1';

      // Clean up after transition
      setTimeout(function () {
        // Update main background
        self.wallpaperElement.style.backgroundImage = self.options.overlayGradient + ', url("' + newSrc + '")';
        self.wallpaperElement.style.backgroundSize = 'cover';
        self.wallpaperElement.style.backgroundPosition = 'center';

        // Remove overlay
        overlay.remove();
        resolve();
      }, duration);
    });
  };

  WallpaperTransition.prototype.waitForTransition = function () {
    var self = this;
    return new Promise(function (resolve) {
      var checkInterval = setInterval(function () {
        if (!self.isTransitioning) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
    });
  };

  WallpaperTransition.prototype.getCurrentSrc = function () {
    return this.currentSrc;
  };

  WallpaperTransition.prototype.getIsTransitioning = function () {
    return this.isTransitioning;
  };

  WallpaperTransition.prototype.updateOptions = function (options) {
    this.options = Object.assign({}, this.options, options);
  };

  WallpaperTransition.prototype.destroy = function () {
    // Remove any overlay elements
    var overlays = this.wallpaperElement.querySelectorAll('div[style*="z-index: 1"]');
    overlays.forEach(function (overlay) { overlay.remove(); });
  };

  // Export to global scope
  global.WallpaperTransition = WallpaperTransition;
}(window));
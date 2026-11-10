/**
 * Kipsmthn TV - Continue Watching Section Component
 *
 * Renders the Continue Watching carousel with dynamic wallpaper integration.
 * Responds to focus changes to update the homepage background.
 */

(function (global) {
  'use strict';

  function ContinueWatching(options) {
    this.container = options.container;
    this.options = Object.assign({}, {
      maxItems: 8,
      onContentSelect: null
    }, options || {});
    this.cards = [];
    this.contentList = [];
    this.focusedIndex = -1;
    this.wallpaperUnsubscribe = null;
    this.activityUnsubscribe = null;
    this.init();
  }

  ContinueWatching.prototype.init = function () {
    // Load content from viewing activity service
    this.loadContent().then(function () {
      this.render();
      this.bindSubscriptions();
    }.bind(this));
  };

  ContinueWatching.prototype.loadContent = function () {
    var demoEnabled = window.TMDBContentService && window.TMDBContentService.isDemoModeEnabled();
    var authorised = window.viewingActivityService && window.viewingActivityService.isUsingAuthorisedSource();
    var source = demoEnabled
      ? Promise.resolve(window.TMDBContentService.createDemoContent())
      : (authorised ? window.viewingActivityService.getContinueWatching().then(function (activity) {
        return activity.map(function (record) { return record.content; });
      }) : Promise.resolve([]));
    return source.then(function (items) {
      this.contentList = items.slice(0, this.options.maxItems);
      return window.dynamicWallpaperService.preloadBackdrops(this.contentList);
    }.bind(this));
  };

  ContinueWatching.prototype.render = function () {
    // Clear container
    this.container.innerHTML = '';

    // Create cards
    this.cards = this.contentList.map(function (content, index) {
      var card = window.createContinueWatchingCard({
        content: content,
        onFocus: function (c) { this.handleFocus(c, index); }.bind(this),
        onSelect: function (c) { if (this.options.onContentSelect) this.options.onContentSelect(c); }.bind(this),
        index: index,
        total: this.contentList.length
      });
      this.container.appendChild(card.getElement());
      return card;
    }.bind(this));

    // Do not move remote focus during initialization; preserve launcher startup focus.
  };

  ContinueWatching.prototype.bindSubscriptions = function () {
    // Subscribe to wallpaper changes for focus sync
    this.wallpaperUnsubscribe = window.dynamicWallpaperService.subscribe(function (state) {
      this.syncFocusWithWallpaper(state);
    }.bind(this));

    // Subscribe to viewing activity updates
    this.activityUnsubscribe = window.viewingActivityService.subscribe(function () {
      this.refresh();
    }.bind(this));
  };

  ContinueWatching.prototype.handleFocus = function (content, index) {
    this.setFocus(index);
    window.dynamicWallpaperService.setContentWallpaper(content);
  };

  ContinueWatching.prototype.setFocus = function (index) {
    // Remove focus from previous card
    if (this.focusedIndex >= 0 && this.focusedIndex < this.cards.length) {
      this.cards[this.focusedIndex].setFocused(false);
    }

    // Set focus on new card
    this.focusedIndex = index;
    if (index >= 0 && index < this.cards.length) {
      this.cards[index].setFocused(true);
      this.cards[index].getElement().focus();
    }
  };

  ContinueWatching.prototype.syncFocusWithWallpaper = function (state) {
    if (state.currentSource === 'content' && state.currentContentId) {
      var index = this.contentList.findIndex(function (c) { return c.id === state.currentContentId; });
      if (index !== -1 && index !== this.focusedIndex) {
        this.setFocus(index);
      }
    }
  };

  ContinueWatching.prototype.navigate = function (direction) {
    if (this.cards.length === 0) return false;

    var newIndex = this.focusedIndex;
    if (direction === 'left') {
      newIndex = Math.max(0, this.focusedIndex - 1);
    } else {
      newIndex = Math.min(this.cards.length - 1, this.focusedIndex + 1);
    }

    if (newIndex !== this.focusedIndex) {
      this.handleFocus(this.contentList[newIndex], newIndex);
      return true;
    }
    return false;
  };

  ContinueWatching.prototype.refresh = function () {
    return this.loadContent().then(function () {
      this.render();
    }.bind(this));
  };

  ContinueWatching.prototype.getFocusedContent = function () {
    if (this.focusedIndex >= 0 && this.focusedIndex < this.contentList.length) {
      return this.contentList[this.focusedIndex];
    }
    return null;
  };

  ContinueWatching.prototype.getContent = function () {
    return this.contentList.slice();
  };

  ContinueWatching.prototype.destroy = function () {
    if (this.wallpaperUnsubscribe) this.wallpaperUnsubscribe();
    if (this.activityUnsubscribe) this.activityUnsubscribe();
    this.cards.forEach(function (card) { card.destroy(); });
    this.cards = [];
    this.contentList = [];
    this.container.innerHTML = '';
  };

  // Factory function
  ContinueWatching.createContinueWatching = function (options) {
    return new ContinueWatching(options);
  };

  // Export to global scope
  global.ContinueWatching = ContinueWatching;
  global.createContinueWatching = ContinueWatching.createContinueWatching;
}(window));
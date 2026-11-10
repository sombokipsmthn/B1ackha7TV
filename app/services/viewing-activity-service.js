/**
 * Kipsmthn TV - Viewing Activity Service
 *
 * Abstracts the source of viewing activity data. Currently uses mock data,
 * but designed to support future authorised provider integrations.
 *
 * IMPORTANT: This service does NOT access private app storage, scrape
 * authenticated sessions, or collect user credentials. It only provides
 * demonstration data until authorised integrations are available.
 */

(function (global) {
  'use strict';

  /**
   * Mock viewing activity source - demonstration data only
   */
  function MockViewingActivitySource() {
    this.id = 'mock';
    this.name = 'Demo Data';
    this.isAuthorised = false;

    this.mockActivity = [
      {
        contentId: 'ted-lasso',
        progress: 68,
        position: 1836,
        duration: 2700,
        lastWatched: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        seasonNumber: 3,
        episodeNumber: 5
      },
      {
        contentId: 'severance',
        progress: 42,
        position: 1260,
        duration: 3000,
        lastWatched: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        seasonNumber: 1,
        episodeNumber: 7
      },
      {
        contentId: 'stranger-things',
        progress: 75,
        position: 2700,
        duration: 3600,
        lastWatched: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        seasonNumber: 4,
        episodeNumber: 3
      },
      {
        contentId: 'wednesday',
        progress: 33,
        position: 891,
        duration: 2700,
        lastWatched: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        seasonNumber: 1,
        episodeNumber: 5
      },
      {
        contentId: 'the-boys',
        progress: 55,
        position: 1815,
        duration: 3300,
        lastWatched: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        seasonNumber: 4,
        episodeNumber: 2
      },
      {
        contentId: 'reacher',
        progress: 82,
        position: 2214,
        duration: 2700,
        lastWatched: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        seasonNumber: 2,
        episodeNumber: 4
      },
      {
        contentId: 'the-bear',
        progress: 91,
        position: 1638,
        duration: 1800,
        lastWatched: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        seasonNumber: 2,
        episodeNumber: 6
      },
      {
        contentId: 'the-mandalorian',
        progress: 27,
        position: 810,
        duration: 3000,
        lastWatched: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        seasonNumber: 3,
        episodeNumber: 4
      }
    ];
  }

  MockViewingActivitySource.prototype.getContinueWatching = function () {
    // Simulate network delay
    return new Promise(function (resolve) {
      setTimeout(function () {
        var sorted = this.mockActivity.slice().sort(function (a, b) {
          return new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime();
        });
        resolve(sorted);
      }.bind(this), 100);
    }.bind(this));
  };

  MockViewingActivitySource.prototype.getViewingActivity = function (contentId) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        var found = this.mockActivity.find(function (a) { return a.contentId === contentId; });
        resolve(found || null);
      }.bind(this), 50);
    }.bind(this));
  };

  MockViewingActivitySource.prototype.onActivityUpdate = function (callback) {
    // No-op for mock - in real implementation would subscribe to updates
    return function () { };
  };

  /**
   * Viewing Activity Service
   */
  function ViewingActivityService() {
    this.sources = new Map();
    this.activeSourceId = 'mock';
    this.contentMap = new Map();
    this.listeners = new Set();

    // Register mock source by default
    this.registerSource(new MockViewingActivitySource());
  }

  ViewingActivityService.prototype.registerSource = function (source) {
    this.sources.set(source.id, source);
  };

  ViewingActivityService.prototype.setActiveSource = function (sourceId) {
    if (this.sources.has(sourceId)) {
      this.activeSourceId = sourceId;
      return true;
    }
    return false;
  };

  ViewingActivityService.prototype.setContentMap = function (contentList) {
    this.contentMap.clear();
    contentList.forEach(function (content) {
      this.contentMap.set(content.id, content);
    }.bind(this));
  };

  ViewingActivityService.prototype.getContinueWatching = function () {
    var source = this.sources.get(this.activeSourceId);
    if (!source) {
      console.warn('No active viewing activity source');
      return Promise.resolve([]);
    }

    return source.getContinueWatching().then(function (activity) {
      // Enrich with content metadata
      return activity
        .map(function (record) {
          var content = this.contentMap.get(record.contentId);
          return content ? Object.assign({}, record, { content: content }) : null;
        }.bind(this))
        .filter(function (record) { return record !== null; });
    }.bind(this));
  };

  ViewingActivityService.prototype.getViewingActivity = function (contentId) {
    var source = this.sources.get(this.activeSourceId);
    if (!source) return Promise.resolve(null);

    return source.getViewingActivity(contentId).then(function (activity) {
      if (!activity) return null;
      var content = this.contentMap.get(contentId);
      return content ? Object.assign({}, activity, { content: content }) : null;
    }.bind(this));
  };

  ViewingActivityService.prototype.subscribe = function (listener) {
    this.listeners.add(listener);
    return function () { this.listeners.delete(listener); }.bind(this);
  };

  ViewingActivityService.prototype.notify = function (activity) {
    this.listeners.forEach(function (listener) { listener(activity); });
  };

  ViewingActivityService.prototype.getSources = function () {
    return Array.from(this.sources.values());
  };

  ViewingActivityService.prototype.getActiveSource = function () {
    return this.sources.get(this.activeSourceId);
  };

  ViewingActivityService.prototype.isUsingAuthorisedSource = function () {
    var source = this.sources.get(this.activeSourceId);
    return source ? source.isAuthorised : false;
  };

  ViewingActivityService.prototype.refresh = function () {
    return this.getContinueWatching().then(function (activity) {
      this.notify(activity.map(function (a) {
        var content = a.content;
        var rest = Object.assign({}, a);
        delete rest.content;
        return rest;
      }));
    }.bind(this));
  };

  // Export singleton instance
  global.viewingActivityService = new ViewingActivityService();

  // Export classes for testing/custom instances
  global.ViewingActivityService = ViewingActivityService;
  global.MockViewingActivitySource = MockViewingActivitySource;
}(window));
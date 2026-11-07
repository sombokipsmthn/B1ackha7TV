/**
 * Tizen Integration Service
 * Isolates all window.tizen.* calls and provides a unified interface for
 * both real TV and browser preview environments.
 */
(function (root) {
  'use strict';

  var TV = window.tizen || null;
  var IS_TV = !!TV && !!TV.application && typeof TV.application.getAppsInfo === 'function';
  var discoveryError = null;

  function normalizeApp(info) {
    if (!info || typeof info !== 'object' || typeof info.id !== 'string' || !info.id.trim()) { return null; }
    var name = typeof info.name === 'string' && info.name.trim() ? info.name.trim() : info.id;
    var categories = Array.isArray(info.categories) ? info.categories.filter(function (value) { return typeof value === 'string' && value.trim(); }) : [];
    var visible = typeof info.show === 'boolean' ? info.show : (typeof info.isVisible === 'boolean' ? info.isVisible : true);
    return {
      id: info.id.trim(), packageId: typeof info.packageId === 'string' ? info.packageId : '',
      name: name, version: typeof info.version === 'string' ? info.version : '',
      iconPath: typeof info.iconPath === 'string' ? info.iconPath : '',
      categories: categories, show: visible, installed: true, source: 'installed'
    };
  }

  function normalizeApps(list) {
    if (!Array.isArray(list)) { return []; }
    return list.map(normalizeApp).filter(function (app) { return !!app; });
  }

  // ---------------------------------------------------------------------------
  // Mock data for browser preview
  // ---------------------------------------------------------------------------
  var MOCK_APPS = [
    { id: 'netflix', name: 'Netflix', iconPath: '', categories: ['entertainment', 'video'], version: '1.0', show: true, installDate: new Date().toISOString(), packageId: 'netflix.pkg' },
    { id: 'youtube', name: 'YouTube', iconPath: '', categories: ['entertainment', 'video'], version: '1.0', show: true, installDate: new Date().toISOString(), packageId: 'youtube.pkg' },
    { id: 'primevideo', name: 'Prime Video', iconPath: '', categories: ['entertainment', 'video'], version: '1.0', show: true, installDate: new Date().toISOString(), packageId: 'primevideo.pkg' },
    { id: 'disneyplus', name: 'Disney+', iconPath: '', categories: ['entertainment', 'video'], version: '1.0', show: true, installDate: new Date().toISOString(), packageId: 'disneyplus.pkg' },
    { id: 'hulu', name: 'Hulu', iconPath: '', categories: ['entertainment', 'video'], version: '1.0', show: true, installDate: new Date().toISOString(), packageId: 'hulu.pkg' },
    { id: 'spotify', name: 'Spotify', iconPath: '', categories: ['music', 'audio'], version: '1.0', show: true, installDate: new Date().toISOString(), packageId: 'spotify.pkg' },
    { id: 'twitch', name: 'Twitch', iconPath: '', categories: ['entertainment', 'video', 'game'], version: '1.0', show: true, installDate: new Date().toISOString(), packageId: 'twitch.pkg' },
    { id: 'steamlink', name: 'Steam Link', iconPath: '', categories: ['game', 'streaming'], version: '1.0', show: true, installDate: new Date().toISOString(), packageId: 'steamlink.pkg' },
    { id: 'geforcenow', name: 'GeForce NOW', iconPath: '', categories: ['game', 'streaming'], version: '1.0', show: true, installDate: new Date().toISOString(), packageId: 'geforcenow.pkg' },
    { id: 'xbox', name: 'Xbox', iconPath: '', categories: ['game'], version: '1.0', show: true, installDate: new Date().toISOString(), packageId: 'xbox.pkg' },
    { id: 'plex', name: 'Plex', iconPath: '', categories: ['video', 'media'], version: '1.0', show: true, installDate: new Date().toISOString(), packageId: 'plex.pkg' },
    { id: 'appletv', name: 'Apple TV', iconPath: '', categories: ['entertainment', 'video'], version: '1.0', show: true, installDate: new Date().toISOString(), packageId: 'appletv.pkg' },
    { id: 'hbomax', name: 'Max', iconPath: '', categories: ['entertainment', 'video'], version: '1.0', show: true, installDate: new Date().toISOString(), packageId: 'hbomax.pkg' },
    { id: 'paramountplus', name: 'Paramount+', iconPath: '', categories: ['entertainment', 'video'], version: '1.0', show: true, installDate: new Date().toISOString(), packageId: 'paramountplus.pkg' },
    { id: 'peacock', name: 'Peacock', iconPath: '', categories: ['entertainment', 'video'], version: '1.0', show: true, installDate: new Date().toISOString(), packageId: 'peacock.pkg' },
    { id: 'tubitv', name: 'Tubi', iconPath: '', categories: ['entertainment', 'video'], version: '1.0', show: true, installDate: new Date().toISOString(), packageId: 'tubitv.pkg' },
    { id: 'plutotv', name: 'Pluto TV', iconPath: '', categories: ['entertainment', 'video', 'live'], version: '1.0', show: true, installDate: new Date().toISOString(), packageId: 'plutotv.pkg' },
    { id: 'crunchyroll', name: 'Crunchyroll', iconPath: '', categories: ['entertainment', 'video', 'anime'], version: '1.0', show: true, installDate: new Date().toISOString(), packageId: 'crunchyroll.pkg' },
    { id: 'funimation', name: 'Funimation', iconPath: '', categories: ['entertainment', 'video', 'anime'], version: '1.0', show: true, installDate: new Date().toISOString(), packageId: 'funimation.pkg' },
    { id: 'system.settings', name: 'Settings', iconPath: '', categories: ['system'], version: '1.0', show: false, installDate: new Date().toISOString(), packageId: 'system.settings.pkg' }
  ];

  var MOCK_RUNNING_APPS = [
    { id: 'ctx1', appId: 'netflix' },
    { id: 'ctx2', appId: 'youtube' }
  ];

  var MOCK_SOURCES = [
    { type: 'TV', number: 0, name: 'TV' },
    { type: 'HDMI', number: 1, name: 'HDMI 1' },
    { type: 'HDMI', number: 2, name: 'HDMI 2' },
    { type: 'HDMI', number: 3, name: 'HDMI 3' }
  ];

  // ---------------------------------------------------------------------------
  // Service API
  // ---------------------------------------------------------------------------
  var TizenService = {
    /**
     * Check if running on real TV hardware with Tizen APIs available
     */
    isTV: function () { return IS_TV; },

    /**
     * Get the current application ID (launcher itself)
     */
    getCurrentAppId: function () {
      if (!IS_TV) { return 'browser.launcher'; }
      try { return TV.application.getCurrentApplication().appInfo.id; }
      catch (e) { return 'unknown'; }
    },

    /**
     * Get all installed applications
     * @param {function} callback - receives (apps: AppInfo[])
     */
    getAppsInfo: function (callback) {
      if (!TV) {
        // Browser preview: synchronous so tests and initial render behave predictably.
        callback(normalizeApps(MOCK_APPS).map(function (app) {
          app.installed = false; app.source = 'development'; return app;
        }));
        return;
      }
      if (!TV.application || typeof TV.application.getAppsInfo !== 'function') {
        discoveryError = { name: 'NotSupportedError', message: 'Application discovery API unavailable' };
        callback([]); return;
      }
      try {
        TV.application.getAppsInfo(function (list) {
          discoveryError = null;
          callback(normalizeApps(list));
        }, function (e) {
          discoveryError = e || { name: 'UnknownError' };
          console.error('getAppsInfo error:', e);
          callback([]);
        });
      } catch (e) {
        discoveryError = e;
        console.error('getAppsInfo throw:', e);
        callback([]);
      }
    },

    /**
     * Get detailed info for a single app
     */
    getAppInfo: function (appId) {
      if (!TV) {
        return MOCK_APPS.find(function (a) { return a.id === appId; }) || null;
      }
      if (!TV.application || typeof TV.application.getAppInfo !== 'function') { return null; }
      try {
        return normalizeApp(TV.application.getAppInfo(appId));
      } catch (e) {
        return null;
      }
    },

    getDiscoveryError: function () { return discoveryError; },

    isInstalledApp: function (appId, apps) {
      return typeof appId === 'string' && appId.length > 0 && (apps || []).some(function (app) { return app && app.id === appId && app.installed !== false; });
    },

    /**
     * Get currently running application contexts
     */
    getAppsContext: function (callback) {
      if (!IS_TV) {
        setTimeout(function () { callback(MOCK_RUNNING_APPS.slice()); }, 0);
        return;
      }
      try {
        TV.application.getAppsContext(function (list) {
          callback(list || []);
        }, function (e) {
          console.error('getAppsContext error:', e);
          callback([]);
        });
      } catch (e) {
        console.error('getAppsContext throw:', e);
        callback([]);
      }
    },

    /**
     * Launch an application by ID
     * @param {string} appId
     * @param {string} appName - for logging
     * @param {function} onAccepted - launch request accepted
     * @param {function} onError - launch failed
     * @param {object} [appControl] - optional ApplicationControl
     */
    launchApp: function (appId, appName, onAccepted, onError, appControl) {
      if (!IS_TV) { if (onError) { onError({ name: 'NotSupportedError', message: 'Launching requires Tizen TV' }); } return; }
      if (typeof appId !== 'string' || !appId.trim()) { if (onError) { onError({ name: 'NotFoundError', message: 'Invalid application ID' }); } return; }
      if (!TV.application || typeof TV.application.launch !== 'function') {
        onError({ name: 'NotSupported', message: 'Launch API unavailable' });
        return;
      }
      try {
        var canControl = typeof TV.ApplicationControl === 'function' && typeof TV.application.launchAppControl === 'function';
        var control = appControl || (canControl ? new TV.ApplicationControl('http://tizen.org/appcontrol/operation/default', null, null, null, null, 'SINGLE') : null);
        if (control) { TV.application.launchAppControl(control, appId, onAccepted, onError); }
        else { TV.application.launch(appId, onAccepted, onError); }
      } catch (e) {
        onError(e);
      }
    },

    /**
     * Exit the current application (launcher)
     */
    exitApp: function () {
      if (!IS_TV) { return; }
      try {
        if (TV.application && TV.application.getCurrentApplication) {
          TV.application.getCurrentApplication().exit();
        }
      } catch (e) {
        console.error('exitApp error:', e);
      }
    },

    /**
     * Get connected video sources (TV, HDMI1, HDMI2, etc.)
     */
    getSources: function (callback) {
      if (!IS_TV) {
        setTimeout(function () { callback(MOCK_SOURCES.slice()); }, 0);
        return;
      }
      if (!TV.systeminfo) {
        callback([]);
        return;
      }
      try {
        TV.systeminfo.getPropertyValue('VIDEOSOURCE', function (info) {
          var sources = (info && info.connected) || [];
          callback(sources.map(function (s) { return { type: s.type, number: s.number, name: s.type + (s.type === 'TV' ? '' : ' ' + s.number) }; }));
        }, function (e) {
          console.error('getSources error:', e);
          callback([]);
        });
      } catch (e) {
        console.error('getSources throw:', e);
        callback([]);
      }
    },

    /**
     * Set the active video source
     */
    setSource: function (source, callback, errorCallback) {
      if (!IS_TV || !TV.tvwindow) {
        if (errorCallback) { errorCallback({ name: 'NotSupported', message: 'TV window API unavailable' }); }
        return;
      }
      try {
        TV.tvwindow.setSource(source, callback, errorCallback, 'MAIN');
      } catch (e) {
        if (errorCallback) { errorCallback(e); }
      }
    },

    /**
     * Get current video source
     */
    getCurrentSource: function () {
      if (!IS_TV || !TV.tvwindow) { return { type: 'TV', number: 0, name: 'TV' }; }
      try {
        var s = TV.tvwindow.getSource('MAIN');
        return { type: s.type, number: s.number, name: s.type + (s.type === 'TV' ? '' : ' ' + s.number) };
      } catch (e) {
        return { type: 'TV', number: 0, name: 'TV' };
      }
    },

    /**
     * Show TV window (preview)
     */
    showPreview: function (rect, callback, errorCallback) {
      if (!IS_TV || !TV.tvwindow) {
        if (errorCallback) { errorCallback({ name: 'NotSupported', message: 'TV window API unavailable' }); }
        return;
      }
      try {
        TV.tvwindow.show(callback, errorCallback, rect, 'MAIN', 'FRONT');
      } catch (e) {
        if (errorCallback) { errorCallback(e); }
      }
    },

    /**
     * Hide TV window (preview)
     */
    hidePreview: function (callback, errorCallback) {
      if (!IS_TV || !TV.tvwindow) {
        if (callback) { callback(); }
        return;
      }
      try {
        TV.tvwindow.hide(callback, errorCallback, 'MAIN');
      } catch (e) {
        if (errorCallback) { errorCallback(e); }
      }
    },

    /**
     * Open system TV settings via app control
     */
    openTVSettings: function (callback, errorCallback) {
      if (!IS_TV || !TV.application || !TV.ApplicationControl || typeof TV.application.findAppControl !== 'function') {
        if (errorCallback) { errorCallback({ name: 'NotSupported', message: 'Settings discovery unavailable' }); }
        return;
      }
      try {
        var control = new TV.ApplicationControl('http://tizen.org/appcontrol/operation/setting');
        TV.application.findAppControl(control, function (apps) {
          callback(apps || [], control);
        }, function (e) {
          errorCallback(null, null, e);
        });
      } catch (e) {
        errorCallback(null, null, e);
      }
    },

    /**
     * Resolve a filesystem path to a file:// URI (for icons)
     */
    resolvePath: function (path, callback, errorCallback) {
      if (!IS_TV || !TV.filesystem || typeof TV.filesystem.resolve !== 'function') {
        if (errorCallback) { errorCallback({ name: 'NotSupported', message: 'Filesystem API unavailable' }); }
        return;
      }
      try {
        TV.filesystem.resolve(path, function (file) {
          try { callback(file.toURI()); } catch (ignore) { callback(''); }
        }, function () { callback(''); }, 'r');
      } catch (e) {
        if (errorCallback) { errorCallback(e); }
      }
    },

    /**
     * Register a hardware key (e.g., ColorF3Blue for settings shortcut)
     */
    registerKey: function (keyName) {
      if (!IS_TV || !TV.tvinputdevice) { return; }
      try { TV.tvinputdevice.registerKey(keyName); } catch (e) { console.error('registerKey error:', e); }
    },

    /**
     * Get TV window rect (optional diagnostic)
     */
    getTVWindowRect: function (callback, errorCallback, unit, windowType) {
      if (!IS_TV || !TV.tvwindow || typeof TV.tvwindow.getRect !== 'function') {
        if (errorCallback) { errorCallback({ name: 'NotSupported', message: 'getRect unavailable' }); }
        return;
      }
      try {
        TV.tvwindow.getRect(callback, errorCallback, unit, windowType);
      } catch (e) {
        if (errorCallback) { errorCallback(e); }
      }
    },

    /**
     * Expose ApplicationControl constructor for advanced launch scenarios
     */
    getApplicationControl: function () {
      if (!IS_TV) { return null; }
      return TV.ApplicationControl;
    }
  };

  // Expose globally
  root.TizenService = TizenService;

})(window);
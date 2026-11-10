/* TMDB metadata client and packaged catalogue adapter. Never persist access tokens. */
(function (global) {
  'use strict';
  var catalog = global.TMDB_CATALOG || [];
  var DEMO_KEY = 'kipsmthn.tmdb-demo.v1';
  var shows = Object.create(null);
  catalog.forEach(function (show) { if (show && show.slug) shows[show.slug] = show; });
  function getShow(id) { return shows[id] || null; }
  function createDemoContent() {
    return (global.TMDB_DEMO_CATALOG || []).map(function (sample) {
      var show = getShow(sample.id) || {};
      var assets = show.assets || {};
      return {
        id: sample.id, title: show.title || sample.title, tmdbId: show.tmdbId || null,
        type: 'series', providerId: sample.providerId, providerLogo: sample.providerLogo,
        season: sample.season, episode: sample.episode, episodeTitle: sample.episodeTitle,
        progress: sample.progress, duration: sample.duration, isDemo: true,
        description: show.overview || sample.overview || '', overview: show.overview || sample.overview || '',
        releaseYear: show.releaseYear || sample.releaseYear || null, genres: show.genres || [],
        poster: assets.poster ? assets.poster.localPath : (sample.fallbackPoster || 'assets/streaming/content/fallback-poster.svg'),
        backdrop: assets.backdrop ? assets.backdrop.localPath : (sample.fallbackBackdrop || 'assets/streaming/content/fallback-backdrop.svg'),
        landscapeStill: assets.still ? assets.still.localPath : (assets.backdrop ? assets.backdrop.localPath : (sample.fallbackLandscape || 'assets/streaming/content/fallback-landscape.svg')),
        episodeStill: assets.still ? assets.still.localPath : '', seasons: show.seasons || [], videos: show.videos || [],
        availability: null, demoLabel: 'Demo preview, not viewing history or provider availability'
      };
    });
  }
  function createClient(options) {
    options = options || {};
    var token = options.accessToken || '';
    var cache = Object.create(null);
    var storage = options.storage || global.localStorage;
    var prefix = 'kipsmthn.tmdb.response.v1:';
    function request(endpoint) {
      var key = prefix + endpoint;
      var now = Date.now();
      if (cache[endpoint] && now - cache[endpoint].time < (options.cacheTtl || 86400000)) return Promise.resolve(cache[endpoint].value);
      try {
        var persisted = storage && storage.getItem(key);
        if (persisted) {
          persisted = JSON.parse(persisted);
          if (persisted.time && now - persisted.time < (options.cacheTtl || 86400000)) {
            cache[endpoint] = persisted;
            return Promise.resolve(persisted.value);
          }
        }
      } catch (ignore) { }
      if (!token) return Promise.reject(new Error('TMDB access token is not configured.'));
      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://api.themoviedb.org/3' + endpoint, true);
        xhr.timeout = options.timeout || 12000;
        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.onreadystatechange = function () {
          if (xhr.readyState !== 4) return;
          if (xhr.status === 429) { reject(new Error('TMDB rate limit reached.')); return; }
          if (xhr.status < 200 || xhr.status >= 300) { reject(new Error('TMDB request failed with HTTP ' + xhr.status + '.')); return; }
          try {
            var value = JSON.parse(xhr.responseText);
            var entry = { time: Date.now(), value: value };
            cache[endpoint] = entry;
            try { if (storage) storage.setItem(key, JSON.stringify(entry)); } catch (ignore) { }
            resolve(value);
          } catch (error) { reject(error); }
        };
        xhr.onerror = function () { reject(new Error('TMDB network request failed.')); };
        xhr.ontimeout = function () { reject(new Error('TMDB request timed out.')); };
        try { xhr.send(); } catch (error) { reject(error); }
      });
    }
    function imageConfig() { return request('/configuration').then(function (value) { return value.images || {}; }); }
    function showId(id) { if (!/^\d+$/.test(String(id))) throw new Error('A numeric TMDB show ID is required.'); return String(id); }
    function searchTV(query, params) {
      if (!query || !String(query).trim()) return Promise.resolve({ results: [] });
      var qs = '?query=' + encodeURIComponent(String(query).trim()) + '&include_adult=false&language=en-US';
      if (params && params.year) qs += '&first_air_date_year=' + encodeURIComponent(params.year);
      return request('/search/tv' + qs);
    }
    return {
      request: request,
      getConfiguration: imageConfig,
      searchTV: searchTV,
      getTVDetails: function (id) { return request('/tv/' + showId(id) + '?language=en-US'); },
      getSeason: function (id, season) { return request('/tv/' + showId(id) + '/season/' + encodeURIComponent(season) + '?language=en-US'); },
      getEpisode: function (id, season, episode) { return request('/tv/' + showId(id) + '/season/' + encodeURIComponent(season) + '/episode/' + encodeURIComponent(episode) + '?language=en-US'); },
      getShowImages: function (id) { return request('/tv/' + showId(id) + '/images?include_image_language=en,null'); },
      getEpisodeImages: function (id, season, episode) { return request('/tv/' + showId(id) + '/season/' + encodeURIComponent(season) + '/episode/' + encodeURIComponent(episode) + '/images?include_image_language=en,null'); },
      getVideos: function (id) { return request('/tv/' + showId(id) + '/videos?language=en-US&include_video_language=en,null'); },
      buildImageUrl: function (imagePath, size, kind) {
        if (!imagePath || imagePath.charAt(0) !== '/') return '';
        return imageConfig().then(function (config) {
          var category = kind === 'poster' ? 'poster_sizes' : (kind === 'still' ? 'still_sizes' : 'backdrop_sizes');
          var sizes = config[category] || [];
          var chosen = sizes.indexOf(size) >= 0 ? size : (sizes.indexOf(kind === 'poster' ? 'w500' : 'w1280') >= 0 ? (kind === 'poster' ? 'w500' : 'w1280') : sizes[sizes.length - 1]);
          if (!config.secure_base_url || !chosen) return '';
          return config.secure_base_url + chosen + imagePath;
        });
      },
      clearCache: function () { cache = Object.create(null); }
    };
  }
  global.TMDBContentService = {
    isDemoModeEnabled: function () {
      try { var value = global.localStorage.getItem(DEMO_KEY); return value === null ? true : value === 'true'; }
      catch (ignore) { return true; }
    },
    setDemoModeEnabled: function (enabled) {
      try { global.localStorage.setItem(DEMO_KEY, enabled ? 'true' : 'false'); } catch (ignore) { }
      return !!enabled;
    },
    createClient: createClient,
    getCatalog: function () { return catalog.slice(); },
    getShow: getShow,
    getImage: function (id, type) { var show = getShow(id); return show && show.assets && show.assets[type] ? show.assets[type].localPath : ''; },
    createDemoContent: createDemoContent,
    getManifest: function () { return global.TMDB_ASSET_MANIFEST || { assets: [] }; },
    isDemo: function (item) { return !!(item && item.isDemo); }
  };
}(window));

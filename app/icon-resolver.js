/* Resolves app icons without copying protected Tizen resources. */
(function (root) {
  'use strict';
  var DB_NAME = 'kipsmthn.app-icons.v1', STORE = 'icons', dbPromise = null;
  var decoded = Object.create(null);
  function openDb() {
    if (!root.indexedDB) { return Promise.resolve(null); }
    if (dbPromise) { return dbPromise; }
    dbPromise = new Promise(function (resolve) {
      try {
        var request = root.indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = function () { if (!request.result.objectStoreNames.contains(STORE)) { request.result.createObjectStore(STORE, { keyPath: 'appId' }); } };
        request.onsuccess = function () { resolve(request.result); };
        request.onerror = request.onblocked = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
    return dbPromise;
  }
  function read(appId) {
    return openDb().then(function (db) { return new Promise(function (resolve) {
      if (!db) { resolve(null); return; }
      try { var req = db.transaction(STORE, 'readonly').objectStore(STORE).get(appId); req.onsuccess = function () { resolve(req.result || null); }; req.onerror = function () { resolve(null); }; }
      catch (e) { resolve(null); }
    }); });
  }
  function write(record) {
    return openDb().then(function (db) { return new Promise(function (resolve) {
      if (!db) { resolve(false); return; }
      try { var req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(record); req.onsuccess = function () { resolve(true); }; req.onerror = function () { resolve(false); }; }
      catch (e) { resolve(false); }
    }); });
  }
  function clearExcept(ids) {
    return openDb().then(function (db) { return new Promise(function (resolve) {
      if (!db) { resolve(); return; }
      try {
        var tx = db.transaction(STORE, 'readwrite'), req = tx.objectStore(STORE).openCursor();
        req.onsuccess = function () { var cursor = req.result; if (!cursor) { return; } if (ids.indexOf(cursor.key) < 0) { cursor.delete(); } cursor.continue(); };
        tx.oncomplete = tx.onerror = function () { resolve(); };
      } catch (e) { resolve(); }
    }); });
  }
  function validate(src) {
    if (!src || decoded[src] === false) { return Promise.resolve(false); }
    if (decoded[src] === true) { return Promise.resolve(true); }
    if (!root.Image) { return Promise.resolve(false); }
    return new Promise(function (resolve) {
      var image = new root.Image();
      image.onload = function () { decoded[src] = true; resolve(true); };
      image.onerror = function () { decoded[src] = false; resolve(false); };
      image.src = src;
    });
  }
  function permittedArtwork(app) {
    var art = app && app.authorizedArtwork;
    if (!art || typeof art.src !== 'string' || !art.license || !art.provenance) { return null; }
    if (!/^(https:\/\/|data:image\/)/i.test(art.src) && art.src.charAt(0) !== '/') { return null; }
    return art;
  }
  function remember(app, src, sourceType) {
    return write({ appId: app.id, sourceType: sourceType, iconPath: src, assetRef: src, version: app.version || '', lastValidation: Date.now(), valid: true });
  }
  function resolve(app, callback) {
    if (!app || !app.id) { callback('', 'fallback'); return; }
    var bestRank = 0, settledFallback = false;
    function emit(src, type, rank) {
      if (rank < bestRank) { return; }
      bestRank = rank;
      callback(src || '', type || 'fallback');
    }
    function validateAndEmit(src, type, rank) {
      return validate(src).then(function (ok) {
        if (!ok) { return false; }
        remember(app, src, type);
        emit(src, type, rank);
        return true;
      });
    }
    function tryNative() {
      if (!app.iconPath || !root.TizenService || !root.TizenService.isTV()) { return; }
      root.TizenService.resolvePath(app.iconPath, function (uri) { if (uri) { validateAndEmit(uri, 'tizen-native', 4); } }, function () {});
    }
    read(app.id).then(function (record) {
      if (record && record.valid && record.version === (app.version || '') && record.iconPath) {
        validateAndEmit(record.iconPath, record.sourceType || 'cache', 3).then(function (ok) { if (!ok) { fallback(); } });
      } else { fallback(); }
    }).catch(fallback);
    tryNative();
    function fallback() {
      if (settledFallback) { return; }
      settledFallback = true;
      var art = permittedArtwork(app);
      if (!art) { emit('', 'fallback', 1); return; }
      validateAndEmit(art.src, art.sourceType === 'authorized' ? 'authorized' : 'licensed-external', art.sourceType === 'authorized' ? 2 : 1).then(function (ok) { if (!ok) { emit('', 'fallback', 1); } });
    }
  }
  root.IconResolver = { resolve: resolve, reconcile: clearExcept };
})(window);

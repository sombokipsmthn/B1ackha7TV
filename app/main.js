(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var $$ = function (selector, root) { return (root || document).querySelectorAll(selector); };
  var storageKey = 'kipsmthn.settings.v1';
  var legacyStorageKey = 'b1ackha7tv.settings.v1';
  var defaults = { name: 'Kipsmthn', theme: 'cinematic', background: '', backgroundVersion: 2, preview: true, system: false, favorites: null, recentApps: [], animations: true, sounds: true, soundVolume: 25, reducedMotion: false, startupSound: false, homeDestination: 'home', showApps: true, showRecent: true };
  var prefs = Object.assign({}, defaults);
  var themes = {
    cinematic: 'url("assets/photos/twilight-mountains.jpg")',
    midnight: 'linear-gradient(180deg,#141414,#090909)',
    aurora: 'linear-gradient(180deg,#141414,#090909)',
    ember: 'linear-gradient(180deg,#141414,#090909)'
  };
  var wallpaperChoices = [
    { id: 'mountains', name: 'Twilight Mountains', photo: 'mountains', path: PhotoLibrary.url('mountains'), focal: '50% 45%' },
    { id: 'lake', name: 'Lake at Dusk', photo: 'lake', path: PhotoLibrary.url('lake'), focal: '50% 55%' },
    { id: 'forest', name: 'Quiet Forest', photo: 'forest', path: PhotoLibrary.url('forest'), focal: '50% 50%' },
    { id: 'desert', name: 'Desert Cinema', photo: 'desert', path: PhotoLibrary.url('desert'), focal: '50% 50%' },
    { id: 'city', name: 'City at Night', photo: 'city', path: PhotoLibrary.url('city'), focal: '50% 50%' },
    { id: 'architecture', name: 'Quiet Architecture', photo: 'architecture', path: PhotoLibrary.url('architecture'), focal: '50% 50%' }
  ];
  var currentPage = 'home', currentPanel = 'appearance', allApps = [], editingApps = false, themeSnapshot = null;
  var previewHomeParent = $('preview') ? $('preview').parentNode : null, previewFloatExpanded = false;
  var iconResults = Object.create(null), iconCache = Object.create(null);
  var appRequest = 0, imageRequest = 0, launchGeneration = 0, launchTimer = null;
  var launching = false, previewBlocked = false, previewNeedsShow = true, windowBusy = false, windowVisible = false;
  var returnFocus = null, exitFocus = null, pageFocus = Object.create(null), log = [];

  function report(message, error) {
    var suffix = error ? ' [' + (error.name || 'Error') + ': ' + (error.message || 'No details') + ']' : '';
    if ($('status')) { $('status').textContent = message + suffix; }
    log.push(new Date().toLocaleTimeString() + ' ' + message + suffix);
    if (log.length > 16) { log.shift(); }
    if ($('diagnostics')) { $('diagnostics').textContent = log.join('\n'); }
  }
  function cleanName(value) { return String(value || '').replace(/[\x00-\x1f\x7f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 32).trim() || defaults.name; }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(prefs)); }
    catch (error) { report('Settings could not be saved.', error); }
  }
  function loadPrefs() {
    var saved = null, migrated = false;
    try {
      saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (!saved) { saved = JSON.parse(localStorage.getItem(legacyStorageKey) || 'null'); migrated = !!saved; }
    } catch (error) { report('Saved settings could not be read; using defaults.', error); }
    if (!saved || typeof saved !== 'object') { return; }
    if (typeof saved.name === 'string') { prefs.name = cleanName(saved.name); }
    if (Object.prototype.hasOwnProperty.call(themes, saved.theme) && ['cinematic', 'midnight'].indexOf(saved.theme) >= 0) { prefs.theme = saved.theme; }
    if (typeof saved.background === 'string') {
      var legacyImages = { 'twilight-mountains.svg': 'mountains', 'northern-lights.svg': 'night-sky', 'lake-dusk.svg': 'lake', 'earth-space.svg': 'night-sky', 'abstract-gradient.svg': 'mountains', 'cinematic-title.svg': 'mountains' };
      var legacyName = saved.background.split('/').pop();
      prefs.background = legacyImages[legacyName] ? PhotoLibrary.url(legacyImages[legacyName]) : saved.background;
    }
    if (typeof saved.preview === 'boolean') { prefs.preview = saved.preview; }
    if (typeof saved.system === 'boolean') { prefs.system = saved.system; }
    if (Array.isArray(saved.favorites)) { prefs.favorites = saved.favorites.filter(function (id) { return typeof id === 'string'; }); }
    var recent = Array.isArray(saved.recentApps) ? saved.recentApps : (Array.isArray(saved.recent) ? saved.recent.map(function (item) { return typeof item === 'string' ? item : item && item.id; }) : []);
    prefs.recentApps = recent.filter(function (id) { return typeof id === 'string'; }).slice(0, 20);
    ['animations', 'sounds', 'reducedMotion', 'startupSound', 'showApps', 'showRecent'].forEach(function (key) { if (typeof saved[key] === 'boolean') { prefs[key] = saved[key]; } });
    if (['home', 'apps', 'recent'].indexOf(saved.homeDestination) >= 0) { prefs.homeDestination = saved.homeDestination; }
    if (typeof saved.soundVolume === 'number' && isFinite(saved.soundVolume)) { prefs.soundVolume = Math.max(0, Math.min(100, Math.round(saved.soundVolume))); }
    if (saved.backgroundVersion !== 2) { prefs.background = ''; }
    var obsoleteTheme = !!saved.theme && ['cinematic', 'midnight'].indexOf(saved.theme) < 0;
    if (migrated || saved.backgroundVersion !== 2 || obsoleteTheme) {
      save();
      if (migrated && localStorage.getItem(storageKey)) {
        try { localStorage.removeItem(legacyStorageKey); } catch (ignore) { /* Keep the migrated copy if cleanup is unavailable. */ }
      }
    }
  }
  function applyName() {
    var words = prefs.name.split(' ');
    if ($('launcher-title')) { $('launcher-title').textContent = prefs.name; }
    if ($('launcher-mark')) { $('launcher-mark').textContent = words.map(function (word) { return word.charAt(0); }).join('').slice(0, 2).toUpperCase(); }
    if ($('launcher-name')) { $('launcher-name').value = prefs.name; }
    document.title = prefs.name;
  }
  function safeImagePath(path) { return /^(?:assets\/)[a-zA-Z0-9_\-\/ .]+\.(?:png|jpe?g|webp)$/i.test(path) && path.indexOf('..') === -1; }
  function applyBackground(path, persist) {
    var request = ++imageRequest, wallpaper = $('wallpaper');
    if (!wallpaper) { return; }
    wallpaper.setAttribute('data-theme', prefs.theme);
    wallpaper.style.backgroundImage = themes[prefs.theme] || themes.cinematic;
    wallpaper.style.backgroundPosition = 'center 45%';
    wallpaper.setAttribute('data-photo-fallback', 'none');
    if (!path) { return; }
    if (!safeImagePath(path)) { report('Use a packaged image path such as assets/background.jpg.'); return; }
    if (prefs.theme !== 'cinematic') { prefs.theme = 'cinematic'; }
    var isPackagedWallpaper = wallpaperChoices.some(function (choice) { return choice.path === path; });
    var image = new Image();
    image.onload = function () {
      if (request !== imageRequest) { return; }
      wallpaper.setAttribute('data-wallpaper', path);
      wallpaper.style.backgroundImage = 'linear-gradient(90deg,rgba(5,5,5,.36),rgba(5,5,5,.08) 62%,rgba(5,5,5,.22)),linear-gradient(0deg,rgba(5,5,5,.46),transparent 64%),url("' + path + '")';
      var choice = wallpaperChoices.filter(function (item) { return item.path === path; })[0];
      wallpaper.style.backgroundPosition = choice ? choice.focal : 'center';
      wallpaper.setAttribute('data-photo-fallback', choice ? choice.photo : 'mountains');
      if (persist) { prefs.background = path; save(); report('Custom background saved.'); }
    };
    image.onerror = function () { if (request === imageRequest) { wallpaper.style.backgroundImage = themes[prefs.theme] || themes.cinematic; wallpaper.removeAttribute('data-wallpaper'); report('Wallpaper unavailable; restored the default photograph.'); } };
    image.src = isPackagedWallpaper ? path.replace(/^assets\//, 'assets/') : path;
  }
  function initIcons(root) {
    if (!window.lucide || typeof window.lucide.createIcons !== 'function') { return; }
    try { window.lucide.createIcons({ root: root || document, icons: window.lucide.icons }); }
    catch (error) { report('Some interface icons could not be initialized.', error); }
  }
  function clock() {
    if ($('clock')) { $('clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
    if ($('date')) { $('date').textContent = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }); }
    if ($('clock')) { $('clock').setAttribute('datetime', new Date().toISOString()); }
  }

  function setActiveNavigation(page) {
    Array.prototype.forEach.call($$('.sidebar-item'), function (button) {
      var active = button.getAttribute('data-section') === page;
      button.classList.toggle('active', active);
      if (active) { button.setAttribute('aria-current', 'page'); } else { button.removeAttribute('aria-current'); }
    });
  }
  function getPrimaryControl(page) {
    if (page === 'settings') {
      return document.querySelector('.settings-category.active') || document.querySelector('.settings-category');
    }
    if (page === 'search') {
      return $('search-input');
    }
    if (page === 'home') {
      return $('apps-carousel') ? ($('apps-carousel').querySelector('.carousel-item.active') || $('apps-carousel').querySelector('.carousel-item')) : null;
    }
    if (page === 'apps') {
      return ($('apps-grid') && $('apps-grid').querySelector('.app:not(:disabled)')) || $('apps-refresh');
    }
    if (page === 'games') {
      return $('launch-xbox') || ($('games-grid') && $('games-grid').querySelector('.app:not(:disabled)'));
    }
    if (page === 'recent') {
      return ($('recent-list') && $('recent-list').querySelector('.app:not(:disabled)')) || $('clear-recent');
    }
    if (page === 'inputs') {
      return $('inputs-grid') && $('inputs-grid').querySelector('.input-tile:not(:disabled)');
    }
    var pageRoot = $('page-' + page);
    return pageRoot ? pageRoot.querySelector('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]') : null;
  }
  function showPage(page) {
    var supported = ['home', 'search', 'apps', 'games', 'recent', 'inputs', 'settings'];
    if (supported.indexOf(page) < 0) { page = 'home'; }
    var pageChanged = currentPage !== page;

    if (pageChanged && document.activeElement && document.activeElement !== document.body) { pageFocus[currentPage] = document.activeElement; }
    currentPage = page;
    updatePreviewPresentation();
    if (pageChanged) { previewNeedsShow = true; requestAnimationFrame(function () { syncPreview(); }); }
    $('content').setAttribute('data-home-view', String(page === 'home'));
    document.body.setAttribute('data-page', page);
    if (pageChanged && window.AudioController) { window.AudioController.play('navigate'); }
    if (pageChanged && window.MotionSystem) { window.MotionSystem.enter($('content')); }
    Array.prototype.forEach.call($$('.page-section'), function (section) {
      var sectionId = 'page-' + page;
      section.hidden = section.id !== sectionId;
    });
    if ($('page-settings')) { $('page-settings').hidden = page !== 'settings'; }
    setActiveNavigation(page);
    if (page === 'settings') { selectSettingsPanel(currentPanel); }
    else if (page === 'apps') { renderAppsPage(); }
    else if (page === 'games') { renderGames(); }
    else if (page === 'recent') { renderRecent(); }
    else if (page === 'inputs') { renderInputs(); }
    else if (page === 'home') { renderHome(); applyHomePreferences(); }
    else if (page === 'search') { updateSearch(); }

    var needsInitialFocus = !document.activeElement || document.activeElement === document.body;
    if (page === 'settings') {
      var firstCategory = document.querySelector('.settings-category.active');
      if (firstCategory && (pageChanged || needsInitialFocus)) { firstCategory.focus(); }
    } else if (page === 'search') {
      if ($('search-input')) { $('search-input').focus(); }
    } else if (pageChanged && page === 'home' && returnFocus && returnFocus.focus) {
      var restore = returnFocus;
      returnFocus = null;
      if (restore.getClientRects().length && restore.isConnected) { restore.focus(); }
      else { var primary = getPrimaryControl(page); if (primary) { primary.focus(); } }
    } else if (pageFocus[page] && pageFocus[page].isConnected && pageFocus[page].getClientRects().length && !pageFocus[page].disabled) {
      if (pageChanged || needsInitialFocus) { pageFocus[page].focus(); }
    } else if (pageFocus[page] && pageFocus[page].getAttribute && pageFocus[page].getAttribute('data-app-id')) {
      var appId = pageFocus[page].getAttribute('data-app-id');
      var matchingApp = $('page-' + page) && $('page-' + page).querySelector('[data-app-id="' + appId + '"]:not(:disabled)');
      if (matchingApp && (pageChanged || needsInitialFocus)) { matchingApp.focus(); }
      else if (pageChanged || needsInitialFocus) { var primary = getPrimaryControl(page); if (primary) { primary.focus(); } }
    } else if (pageChanged || needsInitialFocus) {
      var primary = getPrimaryControl(page);
      if (primary) { primary.focus(); }
    }
  }
  function selectSettingsPanel(name) {
    currentPanel = name;
    Array.prototype.forEach.call($$('.settings-category'), function (button) {
      var selected = button.getAttribute('data-panel') === name;
      button.classList.toggle('active', selected);
      if (selected) { button.setAttribute('aria-current', 'true'); } else { button.removeAttribute('aria-current'); }
    });
    Array.prototype.forEach.call($$('.settings-panel'), function (panel) {
      panel.hidden = panel.id !== 'settings-panel-' + name;
    });
    if (name === 'about') { updateDiagnostics(); }
    if (name === 'apps') { iconSummary(); renderSettingsApps(); }
    if (name === 'appearance') { renderWallpaperChoices(); syncSettingsControls(); }
    if (name === 'home' || name === 'sound-motion') { syncSettingsControls(); }
    initIcons($('settings-panel-' + name));
    syncSettingsControls();
  }

  function appGroupKey(app) {
    var name = (app.name || '').toLowerCase().replace(/[®™]/g, '').replace(/\+/g, 'plus').replace(/[^a-z0-9]/g, '');
    if (/^(amazonprimevideo|primevideo|amazonvideo)$/.test(name)) { return 'brand:prime-video'; }
    if (name === 'disneyplus') { return 'brand:disney-plus'; }
    return 'id:' + app.id;
  }
  function uniqueApps() {
    var groups = Object.create(null), aliases = Object.create(null), catalog = [];
    allApps.forEach(function (app) {
      if (!app || !app.id || app.id === TizenService.getCurrentAppId()) { return; }
      var key = appGroupKey(app); (groups[key] || (groups[key] = [])).push(app);
    });
    Object.keys(groups).forEach(function (key) {
      var group = groups[key];
      group.sort(function (a, b) {
        var visibility = Number(a.show === false) - Number(b.show === false);
        if (visibility) { return visibility; }
        var ai = (prefs.favorites || []).indexOf(a.id), bi = (prefs.favorites || []).indexOf(b.id);
        if (ai < 0) { ai = Infinity; } if (bi < 0) { bi = Infinity; }
        return ai !== bi ? ai - bi : (a.id < b.id ? -1 : (a.id > b.id ? 1 : 0));
      });
      catalog.push(group[0]); group.forEach(function (app) { aliases[app.id] = group[0].id; });
    });
    if (prefs.favorites !== null) {
      var normalized = [];
      prefs.favorites.forEach(function (id) { var canonical = aliases[id] || id; if (normalized.indexOf(canonical) < 0) { normalized.push(canonical); } });
      if (JSON.stringify(normalized) !== JSON.stringify(prefs.favorites)) { prefs.favorites = normalized; save(); }
    }
    return { catalog: catalog, aliases: aliases };
  }
  function ensureFavorites(catalog) {
    if (prefs.favorites !== null || !catalog.length) { return; }
    var preferred = catalog.filter(function (app) { return app.show !== false && /netflix|youtube|prime|amazon|disney|hulu|peacock|paramount|apple tv|spectrum|pluto|tubi|plex|\bmax\b/i.test(app.name || ''); });
    prefs.favorites = (preferred.length ? preferred : catalog.filter(function (app) { return app.show !== false; })).slice(0, 9).map(function (app) { return app.id; });
    save();
  }
  function createAppButton(app, actionVisible, cssClass) {
    var button = document.createElement('button');
    button.type = 'button'; button.className = (cssClass || 'app') + ' shadcn-card'; button.setAttribute('data-app-id', app.id); button.title = app.name || app.id; button.setAttribute('aria-label', app.name || app.id);
    var name = document.createElement('span'); name.className = 'app-name'; name.textContent = app.name || app.id; button.appendChild(name);
    function showIcon(src, sourceType) {
      if (!src || !button.isConnected) { return; }
      var image = document.createElement('img'); image.className = 'app-icon'; image.alt = ''; image.decoding = 'async'; image.src = src;
      image.onerror = function () { image.remove(); };
      var previous = button.querySelector('.app-icon');
      if (previous) { previous.remove(); }
      button.insertBefore(image, name);
      button.setAttribute('data-icon-source', sourceType);
    }
    if (window.IconResolver) {
      window.IconResolver.resolve(app, function (src, sourceType) { if (src) { showIcon(src, sourceType); } });
    }
    if (editingApps && actionVisible) {
      var selected = (prefs.favorites || []).indexOf(app.id) >= 0;
      button.setAttribute('aria-pressed', String(selected));
      var action = document.createElement('span'); action.className = 'app-action'; action.textContent = selected ? '✓ On Home · Remove' : '+ Add to Home'; button.appendChild(action);
    }
    button.addEventListener('click', function () {
      if (editingApps) {
        if (prefs.favorites === null) { prefs.favorites = []; }
        var index = prefs.favorites.indexOf(app.id);
        if (index < 0) { prefs.favorites.push(app.id); } else { prefs.favorites.splice(index, 1); }
        save(); renderCurrentPage(); report((index < 0 ? 'Added ' : 'Removed ') + (app.name || app.id) + (index < 0 ? ' to Home.' : ' from Home.'));
      } else { launch(app.id, app.name || app.id); }
    });
    return button;
  }
  function hydratePhotos(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('.card-bg[data-photo]'), function (container) {
      if (container.getAttribute('data-hydrated') === 'true') { return; }
      var key = container.getAttribute('data-photo');
      var photo = PhotoLibrary.get(key);
      if (!photo) { container.setAttribute('data-photo-fallback', 'true'); return; }
      container.setAttribute('data-hydrated', 'true');
      var image = document.createElement('img'); image.src = photo.src; image.alt = ''; image.loading = 'lazy'; image.decoding = 'async'; image.style.objectPosition = photo.focal;
      image.onerror = function () { image.hidden = true; container.setAttribute('data-photo-fallback', 'true'); };
      container.appendChild(image);
    });
  }
  function renderHome() {
    var library = $('apps'), catalog = uniqueApps();
    hydratePhotos($('page-home'));
    if (!library) { return; }
    ensureFavorites(catalog.catalog);
    var visible = catalog.catalog.filter(function (app) { return (prefs.system || app.show !== false) && (editingApps || prefs.favorites.indexOf(app.id) >= 0); });
    visible.sort(function (a, b) { return prefs.favorites.indexOf(a.id) - prefs.favorites.indexOf(b.id); });
    library.textContent = '';
    visible.forEach(function (app) { library.appendChild(createAppButton(app, true, 'app')); });
    if ($('library-title')) { $('library-title').textContent = editingApps ? 'Edit apps' : 'Apps'; }
    if ($('apps-section')) { $('apps-section').hidden = !prefs.showApps; }
    if ($('recent-home-section')) { $('recent-home-section').hidden = !prefs.showRecent; }
    if ($('catalog-mode')) { $('catalog-mode').textContent = TizenService.isTV() ? 'Installed apps from this TV' : 'Browser preview · demonstration apps'; }
    if ($('app-count')) { $('app-count').textContent = visible.length + (editingApps ? ' available' : ' on Home'); }
    if ($('edit-hint')) { $('edit-hint').hidden = !editingApps; }
    if ($('empty')) { $('empty').hidden = visible.length > 0; if (!visible.length) { $('empty').textContent = 'No apps'; } }
  }
  function filterApps(apps, query) {
    var term = (query || '').trim().toLowerCase();
    return apps.filter(function (app) { return app && app.id && (prefs.system || app.show !== false) && (!term || (app.name || app.id).toLowerCase().indexOf(term) >= 0); });
  }
  function renderAppsPage() {
    var grid = $('apps-grid'); if (!grid) { return; }
    var visible = filterApps(allApps, '');
    visible.sort(function (a, b) { return (a.name || a.id).localeCompare(b.name || b.id); });
    grid.textContent = ''; visible.forEach(function (app) { grid.appendChild(createAppButton(app, true, 'app app-grid-item')); });
    if ($('apps-empty')) { $('apps-empty').hidden = visible.length > 0; }
  }
  function isGame(app) {
    var categories = Array.isArray(app.categories) ? app.categories.map(function (item) { return String(item).toLowerCase(); }) : [];
    var name = String(app.name || app.id || '').toLowerCase();
    if (categories.some(function (category) { return /stream|video|entertainment|utility|system|media/.test(category); })) { return false; }
    if (/steam\s?link|geforce\s?now|cloud\s?gaming|xbox|game\s?pass|twitch/.test(name)) { return false; }
    return categories.some(function (category) { return /^(game|gaming|games|tizen\.org\/category\/game)$/i.test(category); });
  }
  var xboxGamertagKey = 'kipsmthn.xbox-gamertag.v1';
  function readXboxGamertag() {
    try {
      var value = localStorage.getItem(xboxGamertagKey) || '';
      return value.replace(/[\x00-\x1f\x7f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
    } catch (ignore) { return ''; }
  }
  function refreshXboxProfile() {
    var gamertag = readXboxGamertag(), input = $('xbox-gamertag-input');
    if ($('xbox-gamertag')) { $('xbox-gamertag').textContent = gamertag || 'Gamertag not set'; }
    if ($('xbox-account-status')) { $('xbox-account-status').textContent = gamertag ? 'Gamertag saved on this TV · Microsoft account not authenticated' : 'Xbox profile is not configured.'; }
    if ($('xbox-connection')) { $('xbox-connection').textContent = gamertag ? 'Gamertag-only profile · Account not verified · Profile data unavailable' : 'Account not connected · Online profile data unavailable'; }
    if (input && document.activeElement !== input) { input.value = gamertag; }
  }
  function renderGames() {
    var grid = $('games-grid'); if (!grid) { return; }
    var discoveredOnTV = TizenService.isTV();
    var visible = discoveredOnTV ? allApps.filter(function (app) { return app && app.installed === true && app.show !== false && isGame(app); }) : [];
    grid.textContent = '';
    visible.sort(function (a, b) { return (a.name || a.id).localeCompare(b.name || b.id); }).forEach(function (app) {
      var button = createAppButton(app, false, 'app app-grid-item tv-game-card');
      button.setAttribute('role', 'listitem');
      button.setAttribute('aria-label', 'Launch TV game ' + (app.name || app.id));
      var marker = document.createElement('span'); marker.className = 'tv-game-installed'; marker.textContent = 'Installed on this TV'; button.appendChild(marker);
      grid.appendChild(button);
    });
    if ($('games-empty')) { $('games-empty').hidden = visible.length > 0; }
    var status = $('tv-games-status'), error = TizenService.getDiscoveryError && TizenService.getDiscoveryError();
    if (status) { status.textContent = !discoveredOnTV ? 'Browser preview · installed TV applications are not available here.' : error ? 'TV application discovery failed. Refresh to try again.' : visible.length ? visible.length + ' game' + (visible.length === 1 ? '' : 's') + ' verified as installed on this TV.' : 'No game apps identified in the TV’s discovered categories.'; }
    if (error && $('games-empty')) { $('games-empty').textContent = 'Could not read this TV’s installed apps. Use Refresh to try again.'; }
    refreshXboxProfile();
    var input = null; try { input = JSON.parse(localStorage.getItem('kipsmthn.xbox-input.v1') || 'null'); } catch (ignore) { input = null; }
    if ($('xbox-console-status')) { $('xbox-console-status').textContent = 'Xbox Series S · Console reachability not verified' + (input && input.type === 'HDMI' ? ' · TV input configured: ' + (input.name || 'HDMI ' + input.number) : ''); }
    if ($('xbox-console-detail')) { $('xbox-console-detail').textContent = input && input.type === 'HDMI' ? 'Input ' + (input.name || 'HDMI ' + input.number) + ' is saved. Console online status, model data and installed games are not exposed to this Tizen app.' : 'Console details and installed Xbox games are not exposed to this Tizen app. HDMI carries audio/video only. Set the console input in Inputs.'; }
    initIcons(grid);
  }
  function saveXboxGamertag() {
    var field = $('xbox-gamertag-input'), value = field ? field.value.replace(/[\x00-\x1f\x7f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16) : '';
    if (!value || /[<>]/.test(value)) {
      if ($('xbox-settings-feedback')) { $('xbox-settings-feedback').textContent = 'Enter a Gamertag without angle brackets.'; }
      if (field) { field.focus(); }
      return;
    }
    try { localStorage.setItem(xboxGamertagKey, value); }
    catch (error) { if ($('xbox-settings-feedback')) { $('xbox-settings-feedback').textContent = 'Could not save the Gamertag on this TV.'; } report('Xbox Gamertag could not be saved.', error); return; }
    refreshXboxProfile();
    if ($('xbox-settings-feedback')) { $('xbox-settings-feedback').textContent = 'Gamertag saved on this TV. No Microsoft sign-in or Xbox data was retrieved.'; }
    report('Xbox Gamertag saved locally.');
  }
  function clearXboxGamertag() {
    try { localStorage.removeItem(xboxGamertagKey); }
    catch (error) { report('Xbox Gamertag could not be cleared.', error); return; }
    if ($('xbox-gamertag-input')) { $('xbox-gamertag-input').value = ''; }
    if ($('xbox-settings-feedback')) { $('xbox-settings-feedback').textContent = 'Saved Gamertag cleared from this TV.'; }
    refreshXboxProfile();
  }
  function switchToXboxInput() {
    var button = $('launch-xbox'); if (button) { button.disabled = true; }
    TizenService.getSources(function (sources) {
      var configured = null;
      try { configured = JSON.parse(localStorage.getItem('kipsmthn.xbox-input.v1') || 'null'); } catch (ignore) { configured = null; }
      var preferred = configured && String(configured.type).toUpperCase() === 'HDMI' ? (sources || []).filter(function (source) { return source && String(source.type).toUpperCase() === 'HDMI' && Number(source.number) === Number(configured.number); })[0] : null;
      if (!TizenService.isTV() || !preferred) {
        if (button) { button.disabled = false; }
        report(!TizenService.isTV() ? 'Xbox HDMI switching requires the Samsung TV.' : 'Xbox input is not configured or is unavailable. Open Inputs and set the correct HDMI port as Xbox input.');
        return;
      }
      TizenService.setSource(preferred, function () {
        if (button) { button.disabled = false; }
        if ($('xbox-connection')) { $('xbox-connection').textContent = 'TV accepted switch request to ' + preferred.name + ' · Console online status not verified'; }
        report('Requested switch to ' + preferred.name + '. Confirm on the Samsung TV.');
      }, function (error) { if (button) { button.disabled = false; } report('The TV could not switch to ' + preferred.name + '.', error); });
    });
  }
  function renderRecent() {
    var list = $('recent-list'); if (!list) { return; }
    list.textContent = ''; var found = 0;
    prefs.recentApps.forEach(function (id) {
      var app = allApps.filter(function (candidate) { return candidate.id === id; })[0]; if (!app) { return; }
      found++; var button = createAppButton(app, false, 'app recent-card'); list.appendChild(button);
    });
    if ($('recent-empty')) { $('recent-empty').hidden = found > 0; }
  }
  var quickSearches = ['Netflix', 'YouTube', 'Prime Video', 'Spotify', 'Live TV', 'Anime', 'Documentaries'];
  var titleSearches = ['The Last of Us', 'Dune', 'Stranger Things', 'Our Planet'];
  function appendSearchChips(container, values, query) {
    if (!container) { return 0; }
    container.textContent = '';
    var term = (query || '').trim().toLowerCase(), count = 0;
    values.filter(function (value) { return !term || value.toLowerCase().indexOf(term) >= 0; }).forEach(function (value) {
      var button = document.createElement('button'); button.type = 'button'; button.className = 'search-chip'; button.textContent = value; button.setAttribute('role', 'listitem');
      button.addEventListener('click', function () { var input = $('search-input'); input.value = value; updateSearch(); input.focus(); });
      container.appendChild(button); count++;
    });
    return count;
  }
  function getInputIcon(type) {
    var upper = String(type || '').toUpperCase();
    if (upper === 'TV') { return 'Tv'; }
    if (upper === 'HDMI') { return 'Monitor'; }
    if (upper === 'AV') { return 'AudioLines'; }
    if (upper === 'CASTING' || upper === 'CAST') { return 'Cast'; }
    if (upper === 'USB') { return 'Usb'; }
    return 'Tv';
  }
  function renderInputs() {
    var grid = $('inputs-grid'); if (!grid) { return; }
    grid.textContent = '';
    TizenService.getSources(function (sources) {
      grid.textContent = '';
      (sources || []).forEach(function (source) {
        if (!source || typeof source.type !== 'string') { return; }
        var name = source.name || source.type + (source.number ? ' ' + source.number : '');
        var button = document.createElement('button');
        var icon = document.createElement('span');
        var label = document.createElement('span');
        button.type = 'button';
        button.className = 'input-tile';
        button.setAttribute('role', 'listitem');
        button.setAttribute('aria-label', 'Switch to ' + name);
        icon.className = 'input-icon';
        icon.setAttribute('data-lucide', getInputIcon(source.type));
        icon.setAttribute('aria-hidden', 'true');
        label.className = 'input-name';
        label.textContent = name;
        button.appendChild(icon);
        button.appendChild(label);
        button.addEventListener('click', function () {
          TizenService.setSource(source, function () { report('Input changed.'); }, function (error) { report('Could not change input.', error); });
        });
        var inputCard = document.createElement('div'); inputCard.className = 'input-source-card';
        inputCard.appendChild(button);
        if (String(source.type).toUpperCase() === 'HDMI') {
          var configureXbox = document.createElement('button'); configureXbox.type = 'button'; configureXbox.className = 'input-xbox-config'; configureXbox.textContent = 'Set as Xbox input'; configureXbox.setAttribute('aria-label', 'Set ' + name + ' as Xbox input');
          configureXbox.addEventListener('click', function () {
            try { localStorage.setItem('kipsmthn.xbox-input.v1', JSON.stringify({ type: 'HDMI', number: Number(source.number), name: name })); } catch (error) { report('Xbox input setting could not be saved.', error); return; }
            if ($('xbox-connection')) { $('xbox-connection').textContent = 'Xbox input set to ' + name + ' · Console online status not verified'; }
            report(name + ' is configured as the Xbox input.');
          });
          inputCard.appendChild(configureXbox);
        }
        grid.appendChild(inputCard);
      });
      initIcons(grid);
      if ($('inputs-empty')) { $('inputs-empty').hidden = grid.children.length > 0; }
    });
  }
  function updateSearch() {
    var input = $('search-input'), grid = $('search-apps'), empty = $('search-empty'), query = input ? input.value : '';
    if (!grid) { return; }
    grid.textContent = '';
    var matches = filterApps(allApps, query).sort(function (a, b) {
      var recentA = prefs.recentApps.indexOf(a.id), recentB = prefs.recentApps.indexOf(b.id);
      if (!query && recentA !== recentB) { return (recentA < 0 ? Infinity : recentA) - (recentB < 0 ? Infinity : recentB); }
      var favoriteA = (prefs.favorites || []).indexOf(a.id), favoriteB = (prefs.favorites || []).indexOf(b.id);
      if (!query && favoriteA !== favoriteB) { return (favoriteA < 0 ? Infinity : favoriteA) - (favoriteB < 0 ? Infinity : favoriteB); }
      return (a.name || a.id).localeCompare(b.name || b.id);
    });
    if (!query) { matches = matches.slice(0, 6); }
    matches.forEach(function (app) { grid.appendChild(createAppButton(app, false, 'app app-grid-item')); });
    var quickCount = appendSearchChips($('search-popular'), quickSearches, query);
    var titleCount = appendSearchChips($('search-titles'), titleSearches, query);
    if ($('search-suggested-section')) { $('search-suggested-section').hidden = matches.length === 0; }
    if ($('search-catalog-note')) { $('search-catalog-note').hidden = !!query || TizenService.isTV(); $('search-catalog-note').textContent = 'Browser preview uses demonstration app data; it does not represent apps installed on a TV.'; }
    if ($('search-quick-section')) { $('search-quick-section').hidden = !quickCount; }
    if ($('search-titles-section')) { $('search-titles-section').hidden = !titleCount; }
    if (empty) { empty.hidden = !query || matches.length > 0; empty.textContent = 'No installed app matches “' + query + '”. Try another search.'; }
    if ($('search-clear')) { $('search-clear').hidden = !query; }
  }
  function renderCurrentPage() {
    if (currentPage === 'home') { applyHomePreferences(); }
    else if (currentPage === 'apps') { renderAppsPage(); }
    else if (currentPage === 'games') { renderGames(); }
    else if (currentPage === 'recent') { renderRecent(); }
    else if (currentPage === 'search') { updateSearch(); }
  }
  function syncExperienceControls() {
    var pairs = [['animations-toggle', 'animations'], ['sounds-toggle', 'sounds'], ['reduced-motion-toggle', 'reducedMotion'], ['startup-sound-toggle', 'startupSound']];
    pairs.forEach(function (pair) { var control = $(pair[0]); if (control) { control.setAttribute('aria-pressed', String(!!prefs[pair[1]])); control.textContent = prefs[pair[1]] ? 'On' : 'Off'; } });
    if ($('sound-volume')) { $('sound-volume').value = String(prefs.soundVolume); }
    if ($('sound-volume-value')) { $('sound-volume-value').textContent = prefs.soundVolume + '%'; }
  }
  function syncSettingsControls() {
    Array.prototype.forEach.call($$('.setting-toggle[data-pref]'), function (control) {
      var key = control.getAttribute('data-pref'), enabled = !!prefs[key];
      control.setAttribute('aria-pressed', String(enabled)); control.textContent = enabled ? 'On' : 'Off';
    });
    Array.prototype.forEach.call($$('select[data-pref]'), function (control) { if (typeof prefs[control.getAttribute('data-pref')] === 'string') { control.value = prefs[control.getAttribute('data-pref')]; } });
    syncExperienceControls();
  }
  function renderWallpaperChoices() {
    var gallery = $('wallpaper-gallery'); if (!gallery) { return; }
    gallery.textContent = '';
    wallpaperChoices.forEach(function (choice) {
      var button = document.createElement('button'), image = document.createElement('span'), photo = document.createElement('img'), label = document.createElement('span');
      button.type = 'button'; button.className = 'settings-wallpaper-choice shadcn-card' + (prefs.background === choice.path || (!prefs.background && prefs.theme === 'cinematic' && choice.photo === 'mountains') ? ' selected' : ''); button.setAttribute('aria-pressed', String(button.classList.contains('selected'))); button.setAttribute('aria-label', 'Apply ' + choice.name + ' wallpaper');
      image.className = 'settings-wallpaper-image'; image.setAttribute('data-wallpaper', choice.id); photo.src = PhotoLibrary.url(choice.photo); photo.alt = ''; photo.loading = 'eager'; photo.decoding = 'async'; photo.onerror = function () { photo.hidden = true; image.classList.add('photo-failed'); }; image.appendChild(photo); label.className = 'settings-wallpaper-label'; label.textContent = choice.name; button.appendChild(image); button.appendChild(label);
      button.addEventListener('click', function () { prefs.theme = 'cinematic'; prefs.background = choice.path; $('theme-select').value = 'cinematic'; $('background-path-enhanced').value = choice.path; save(); applyBackground(choice.path, false); renderWallpaperChoices(); }); gallery.appendChild(button);
    });
  }
  function renderSettingsApps() {
    var list = $('settings-installed-apps'), status = $('settings-apps-status'); if (!list) { return; }
    list.textContent = '';
    var catalog = uniqueApps().catalog;
    if (status) { var discoveryError = TizenService.getDiscoveryError && TizenService.getDiscoveryError(); status.textContent = discoveryError ? 'Application discovery failed. Select Refresh apps to try again.' : (TizenService.isTV() ? (catalog.length + ' apps discovered on this TV') : 'Browser preview · sample catalogue, not installed apps'); status.setAttribute('data-state', discoveryError ? 'error' : 'ready'); }
    catalog.slice(0, 16).forEach(function (app) {
      var row = document.createElement('div'), name = document.createElement('span'), state = document.createElement('span');
      row.className = 'settings-app-row'; name.textContent = app.name || app.id;
      state.className = 'settings-status-pill'; state.textContent = TizenService.isTV() ? 'Available on device' : 'Demo only';
      row.appendChild(name); row.appendChild(state); list.appendChild(row);
    });
  }
  function setHomeDestination() {
    var destination = ['home', 'apps', 'recent'].indexOf(prefs.homeDestination) >= 0 ? prefs.homeDestination : 'home';
    showPage(destination);
  }
  function applyHomePreferences() {
    var appSection = $('apps-section'), recentSection = $('recent-home-section');
    if (appSection) { appSection.hidden = !prefs.showApps; }
    if (recentSection) { recentSection.hidden = !prefs.showRecent; }
    var recent = $('recent-home-apps');
    if (recent) {
      recent.textContent = '';
      prefs.recentApps.slice(0, 6).forEach(function (id) { var app = allApps.filter(function (entry) { return entry.id === id; })[0]; if (app) { recent.appendChild(createAppButton(app, false, 'app app-grid-item')); } });
    }
    renderHome();
  }

  function handleSettingControl(control) {
    var key = control.getAttribute('data-pref'); if (!key || !Object.prototype.hasOwnProperty.call(defaults, key)) { return; }
    var update = function () { prefs[key] = control.tagName === 'SELECT' ? control.value : !prefs[key]; save(); syncSettingsControls(); if (key.indexOf('show') === 0) { applyHomePreferences(); } if (key === 'animations' || key === 'sounds' || key === 'reducedMotion' || key === 'startupSound') { applyExperience(); } };
    control.addEventListener(control.tagName === 'SELECT' ? 'change' : 'click', update);
  }
  function openSettingsDialog() {
    settingsDialogFocus = document.activeElement;
    if (window.AudioController) { window.AudioController.play('select'); }
    $('settings-confirm').hidden = false;
    $('settings-reset-cancel').focus();
  }
  function closeSettingsDialog() {
    var dialog = $('settings-confirm');
    if (dialog.hidden) { return; }
    if (window.AudioController) { window.AudioController.play('close'); }
    var dismiss = function () { dialog.hidden = true; if (isInteractive(settingsDialogFocus)) { settingsDialogFocus.focus(); } };
    dismiss();
  }
  var settingsDialogFocus = null;
  function resetSettings() {
    try { localStorage.removeItem(storageKey); localStorage.removeItem(legacyStorageKey); } catch (error) { report('Settings could not be reset.', error); return; }
    prefs = Object.assign({}, defaults); themeSnapshot = null; currentPanel = 'appearance'; applyName(); applyBackground('', false); applyExperience(); save(); syncSettingsControls(); renderWallpaperChoices(); renderCurrentPage(); setHomeDestination();
    closeSettingsDialog(); if (window.AudioController) { window.AudioController.play('success'); } report('Kipsmthn settings restored to defaults.');
  }
  function applyExperience() {
    if (window.MotionSystem) { window.MotionSystem.apply({ enabled: prefs.animations, reduced: prefs.reducedMotion }); }
    if (window.AudioController) { window.AudioController.configure({ enabled: prefs.sounds, volume: prefs.soundVolume / 100, startup: prefs.startupSound }); window.AudioController.preload(); }
    syncExperienceControls();
  }
  function toggleExperience(buttonId, key) {
    var control = $(buttonId); if (!control) { return; }
    control.addEventListener('click', function () { prefs[key] = !prefs[key]; save(); applyExperience(); if (window.AudioController) { window.AudioController.play('select'); } });
  }
  function iconSummary() {
    if (!$('icon-status')) { return; }
    $('icon-status').textContent = 'App tiles use icons reported by Samsung Tizen when available; otherwise, text labels remain visible.';
  }

  function addRecent(id) {
    prefs.recentApps = prefs.recentApps.filter(function (value) { return value !== id; });
    prefs.recentApps.unshift(id); prefs.recentApps = prefs.recentApps.slice(0, 20); save();
  }
  function refreshApps() {
    var request = ++appRequest;
    var refreshButton = $('apps-refresh-settings');
    if (refreshButton) { refreshButton.disabled = true; refreshButton.textContent = 'Refreshing…'; }
    if ($('settings-apps-status')) { $('settings-apps-status').textContent = 'Discovering applications…'; $('settings-apps-status').setAttribute('data-state', 'loading'); }
    TizenService.getAppsInfo(function (list) {
      if (request !== appRequest) { return; }
      allApps = Array.isArray(list) ? list : [];
      if (window.IconResolver) { window.IconResolver.reconcile(allApps.map(function (app) { return app.id; })); }
      var catalogMode = $('catalog-mode'); if (catalogMode) { catalogMode.textContent = TizenService.isTV() ? 'Installed apps discovered on this TV' : 'Demo catalogue · not installed on this device'; }
      var catalog = uniqueApps();
      ensureFavorites(catalog.catalog); renderCurrentPage(); renderSettingsApps();
      var discoveryError = TizenService.getDiscoveryError && TizenService.getDiscoveryError();
      if (refreshButton) { refreshButton.disabled = false; refreshButton.textContent = 'Refresh apps'; }
      if ($('settings-apps-status')) { $('settings-apps-status').textContent = discoveryError ? 'Application discovery failed. Try refreshing again.' : (TizenService.isTV() ? 'Found ' + allApps.length + ' apps on this TV.' : 'Sample catalogue loaded for browser preview; no installed app data is available.'); $('settings-apps-status').setAttribute('data-state', discoveryError ? 'error' : 'ready'); }
      report(discoveryError ? 'Application discovery failed.' : 'App list refreshed (' + allApps.length + ' apps).', discoveryError);
    });
  }
  function launch(id, name) {
    if (launching) { return; }
    if (!TizenService.isTV()) { report('Launching apps is unavailable in browser preview.'); return; }
    if (!TizenService.isInstalledApp || !TizenService.isInstalledApp(id, allApps)) { report('This application is not currently available on this TV. Refresh apps and try again.'); return; }
    var generation = ++launchGeneration, attempt = 0, routes = [], index = 0;
    function add(target) { if (!routes.some(function (route) { return route === target; })) { routes.push(target); } }
    add(id);
    var selected = allApps.filter(function (app) { return app.id === id; })[0];
    if (selected && appGroupKey(selected).indexOf('brand:') === 0) {
      allApps.filter(function (app) { return appGroupKey(app) === appGroupKey(selected) && app.id !== id; })
        .sort(function (a, b) { return Number(a.show === false) - Number(b.show === false); }).slice(0, 2).forEach(function (app) { add(app.id); });
    }
    function message(text, error) {
      if ($('launch-feedback')) { $('launch-feedback').hidden = false; $('launch-feedback').textContent = text + (error && error.name ? ' (' + error.name + ')' : ''); }
      report(text, error);
    }
    function active(token) { return generation === launchGeneration && attempt === token && launching && !document.hidden; }
    function stop(error) { clearTimeout(launchTimer); ++launchGeneration; launching = false; previewBlocked = false; previewNeedsShow = true; syncPreview(); if (window.AudioController) { window.AudioController.play('error'); } message('Could not open ' + name + '. You can try another app or open it from Samsung Home.', error); }
    function next(error) {
      clearTimeout(launchTimer); if (generation !== launchGeneration || document.hidden) { return; }
      if (index >= routes.length) { stop(error || { name: 'LaunchTimeout' }); return; }
      var target = routes[index++], token = ++attempt, answered = false;
      message(index === 1 ? 'Opening ' + name + '…' : 'Trying another way to open ' + name + '…');
      launchTimer = setTimeout(function () { if (active(token)) { next({ name: 'LaunchTimeout' }); } }, 8000);
      function failed(problem) { if (!active(token) || answered) { return; } answered = true; if (problem && /^(NotFoundError|UnknownError|NotSupportedError)$/.test(problem.name)) { next(problem); } else { stop(problem); } }
      function accepted() { if (!active(token) || answered) { return; } answered = true; if (window.AudioController) { window.AudioController.play('success'); } message('Waiting for ' + name + ' to appear…'); }
      try { TizenService.launchApp(target, name, accepted, failed); } catch (problem) { failed(problem); }
    }
    launching = true; addRecent(id);
    if (window.AudioController) { window.AudioController.play('launch'); }
    if (window.MotionSystem && $('content')) { $('content').classList.add('application-launching'); setTimeout(function () { $('content').classList.remove('application-launching'); }, window.MotionSystem.config.duration.cinematic); }
    syncPreview(); next();
  }

  function updatePreviewPresentation() {
    var preview = $('preview'), panel = $('preview-panel'), floating = $('preview-float'), launcher = $('preview-launcher');
    if (!preview || !panel || !floating || !launcher || !previewHomeParent) { return; }
    var onHome = currentPage === 'home';
    floating.hidden = onHome;
    if (onHome) {
      previewHomeParent.appendChild(preview);
      panel.hidden = true;
      launcher.setAttribute('aria-expanded', 'false');
    } else if (previewFloatExpanded) {
      panel.appendChild(preview);
      panel.hidden = false;
      launcher.setAttribute('aria-expanded', 'true');
    } else {
      previewHomeParent.appendChild(preview);
      panel.hidden = true;
      launcher.setAttribute('aria-expanded', 'false');
    }
  }
  function wantedPreview() { return prefs.preview && !document.hidden && !launching && !previewBlocked && (currentPage === 'home' || previewFloatExpanded); }
  function syncPreview(done) {
    if (!TizenService.isTV()) { if ($('preview-message')) { $('preview-message').textContent = 'TV preview is available on the Samsung TV.'; } if (done) { done(); } return; }
    if (windowBusy) { if (done) { setTimeout(function () { syncPreview(done); }, 50); } return; }
    var desired = wantedPreview();
    if (windowVisible === desired && !(desired && previewNeedsShow)) { if (done) { done(); } return; }
    windowBusy = true; var settled = false;
    var watchdog = setTimeout(function () { finish({ name: 'TimeoutError', message: 'TV did not respond.' }); }, 5000);
    function finish(error) {
      if (settled) { return; } settled = true; clearTimeout(watchdog); windowBusy = false;
      if (error) { previewNeedsShow = true; previewBlocked = true; document.body.classList.remove('preview-active'); if ($('preview-message')) { $('preview-message').textContent = 'Preview unavailable — select Retry TV.'; } report('TV preview unavailable. Check input and try again.', error); }
      else { windowVisible = desired; previewNeedsShow = !desired; document.body.classList.toggle('preview-active', desired); if ($('preview-message')) { $('preview-message').textContent = desired ? '' : 'Preview is off.'; } }
      if (!error && wantedPreview() !== windowVisible) { syncPreview(done); } else if (done) { done(); }
    }
    try {
      if (desired) {
        var previewPicture = $('preview-picture');
        var rect = previewPicture.getBoundingClientRect();
        var values = [rect.left, rect.top, rect.width, rect.height].map(function (value) { return Math.round(value) + 'px'; });
        if (rect.width < 100 || rect.height < 100) {
          var oldParent = previewPicture.parentNode;
          if (oldParent && oldParent !== document.body) { document.body.appendChild(previewPicture); }
          rect = previewPicture.getBoundingClientRect();
          values = [rect.left, rect.top, rect.width, rect.height].map(function (value) { return Math.round(value) + 'px'; });
          if (rect.width < 100 || rect.height < 100) { finish({ name: 'LayoutError', message: 'Preview layout is not ready.' }); return; }
        }
        TizenService.showPreview(values, function () { finish(); }, finish);
      } else { TizenService.hidePreview(function () { finish(); }, finish); }
    } catch (error) { finish(error); }
  }
  function updatePreviewToggle() {
    if (!$('preview-toggle')) { return; }
    $('preview-toggle').textContent = prefs.preview ? 'Turn off' : 'Turn on';
    $('preview-toggle').setAttribute('aria-label', prefs.preview ? 'Turn off preview' : 'Turn on preview');
  }
  function readCurrentSource() { try { $('source-label').textContent = TizenService.getCurrentSource().name; $('settings-source-label').textContent = TizenService.getCurrentSource().name; } catch (ignore) { } }
  function refreshSources() {
    if (!$('sources')) { return; }
    $('sources').textContent = '';
    if (!TizenService.isTV()) { $('sources').textContent = 'Browser preview · simulated sources; source switching requires a Samsung TV.'; return; }
    readCurrentSource();
    TizenService.getSources(function (sources) {
      $('sources').textContent = '';
      (sources || []).forEach(function (source) {
        var button = document.createElement('button'); button.type = 'button'; button.className = 'shadcn-button'; button.textContent = source.name;
        button.addEventListener('click', function () { TizenService.setSource(source, function () { readCurrentSource(); previewBlocked = false; previewNeedsShow = true; syncPreview(); report('Input changed.'); }, function (error) { report('Could not change input.', error); }); });
        $('sources').appendChild(button);
      });
      if (!$('sources').children.length) { $('sources').textContent = 'No connected inputs were reported.'; }
    });
  }
  function openTVSettings() {
    var button = $('tv-settings-open-enhanced'), status = $('tv-settings-status');
    var fallback = 'Direct opening is unavailable. Press Home on your Samsung remote, then select Settings.';
    if (!TizenService.isTV()) { status.textContent = fallback; return; }
    button.disabled = true; status.textContent = 'Checking TV settings access…';
    var finished = false, timer = setTimeout(function () { finish(null); }, 5000);
    function finish(apps, control, error) {
      if (finished) { return; } finished = true; clearTimeout(timer); button.disabled = false;
      if (!apps || !apps.length) { status.textContent = fallback; if (error) { report('TV settings access unavailable.', error); } return; }
      status.textContent = 'Requesting TV settings. If they do not open, press Home on your remote, then Settings.';
      TizenService.launchApp(apps[0].id, 'TV settings', function () {}, function (problem) {
        windowVisible = false; previewNeedsShow = true; previewBlocked = false;
        syncPreview(); report('Could not open TV settings.', problem);
      }, control);
    }
    TizenService.openTVSettings(finish, function (apps, control, error) { finish(apps, control, error); });
  }
  function updateDiagnostics() {
    if ($('tizen-env')) { $('tizen-env').textContent = TizenService.isTV() ? 'Samsung Tizen TV' : 'Browser preview'; }
    if ($('tv-integration')) { $('tv-integration').textContent = TizenService.isTV() ? 'Available' : 'Unavailable in preview'; }
    if ($('app-discovery')) { $('app-discovery').textContent = TizenService.isTV() ? 'Available' : 'Sample catalogue'; }
    if ($('input-integration')) { $('input-integration').textContent = TizenService.isTV() ? 'Available' : 'Unavailable in preview'; }
    if ($('run-mode')) { $('run-mode').textContent = TizenService.isTV() ? 'Samsung TV' : 'Browser Preview'; }
  }
  function exitDialog(open) {
    var dialog = $('exit-dialog');
    if (open) {
      exitFocus = document.activeElement;
      dialog.hidden = false;
      if (window.AudioController) { window.AudioController.play('select'); }
      if (window.MotionSystem) { window.MotionSystem.enter(dialog); }
      $('exit-cancel').focus();
      return;
    }
    if (dialog && !dialog.hidden) {
      if (window.AudioController) { window.AudioController.play('close'); }
      var dismiss = function () { dialog.hidden = true; if (isInteractive(exitFocus)) { exitFocus.focus(); } };
      if (window.MotionSystem) { window.MotionSystem.dismiss(dialog, dismiss); } else { dismiss(); }
    }
  }
  function closeLauncher() {
    if (!TizenService.isTV()) { exitDialog(false); report('This browser preview can be closed with its tab.'); return; }
    launching = true;
    try { TizenService.hidePreview(function () {}, function () {}); } catch (ignore) {}
    try { TizenService.exitApp(); } catch (error) { launching = false; exitDialog(false); report('Could not close the app.', error); syncPreview(); }
  }
  function isInteractive(el) {
    if (!el || !el.isConnected || el.disabled || (el.matches && el.matches(':disabled')) || el.getAttribute('aria-disabled') === 'true') { return false; }
    if (el.hidden || el.closest('[hidden], [inert], [aria-hidden="true"]') || getComputedStyle(el).visibility === 'hidden' || el.getClientRects().length === 0) { return false; }
    return true;
  }
  function findClosestX(fromEl, candidates) {
    if (!candidates || !candidates.length) { return null; }
    var a = fromEl.getBoundingClientRect(), ax = a.left + a.width / 2;
    var best = null, bestDist = Infinity;
    candidates.forEach(function (cand) {
      if (!cand || cand === fromEl || !isInteractive(cand)) { return; }
      var r = cand.getBoundingClientRect(), cx = r.left + r.width / 2;
      var dist = Math.abs(cx - ax);
      if (dist < bestDist) { bestDist = dist; best = cand; }
    });
    return best;
  }
  function focusableSelector() {
    return 'button,a[href],input,select,textarea,summary,[role="button"],[role="link"],[role="checkbox"],[role="switch"],[role="slider"],[role="option"],[contenteditable="true"],[tabindex]:not([tabindex="-1"])';
  }
  function firstInteractive(root, selector) {
    if (!root) { return null; }
    var candidates = selector ? root.querySelectorAll(selector) : root.querySelectorAll(focusableSelector());
    for (var i = 0; i < candidates.length; i++) {
      if (isInteractive(candidates[i])) { return candidates[i]; }
    }
    return null;
  }
  function visibleControls() {
    var root = !$('exit-dialog').hidden ? $('exit-dialog') : (!$('settings-confirm').hidden ? $('settings-confirm') : $('page-' + currentPage));
    if (!root) { return []; }
    return Array.prototype.filter.call(root.querySelectorAll(focusableSelector()), function (element) {
      return isInteractive(element);
    });
  }
  function normalizeKeyEvent(event) {
    var code = event.keyCode || event.which || 0;
    var key = event.key || '';
    if (code === 10009 || code === 27 || key === 'XF86Back' || key === 'Escape' || key === 'Back' || key === 'GoBack' || (code === 10009 && key === 'Return')) {
      return 'back';
    }
    var active = document.activeElement;
    var isTextInput = active && (active.tagName === 'INPUT' && ['text', 'search', 'url', 'email', 'number'].indexOf(active.type) >= 0 || active.tagName === 'TEXTAREA');
    if (!isTextInput && (code === 8 || key === 'Backspace')) {
      return 'back';
    }
    if (code === 38 || key === 'ArrowUp' || key === 'Up') { return 'up'; }
    if (code === 40 || key === 'ArrowDown' || key === 'Down') { return 'down'; }
    if (code === 37 || key === 'ArrowLeft' || key === 'Left') { return 'left'; }
    if (code === 39 || key === 'ArrowRight' || key === 'Right') { return 'right'; }
    if (code === 13 || code === 65379 || key === 'Enter' || key === 'Select' || key === 'Accept' || key === 'Ok') {
      return 'enter';
    }
    if (code === 406 || key === 'ColorF3Blue') {
      return 'settings';
    }
    if (code === 9 || key === 'Tab') {
      return 'tab';
    }
    return null;
  }
  function moveFocus(dirOrCode) {
    var dir = typeof dirOrCode === 'string' ? dirOrCode : (dirOrCode === 37 ? 'left' : dirOrCode === 38 ? 'up' : dirOrCode === 39 ? 'right' : 'down');

    if (!$('exit-dialog').hidden) {
      var exitTargets = visibleControls();
      if (exitTargets.length > 1) {
        var exitIndex = exitTargets.indexOf(document.activeElement);
        var exitTarget = exitTargets[exitIndex === 0 ? 1 : 0];
        if (exitTarget) { exitTarget.focus(); }
      }
      return;
    }
    if (!$('settings-confirm').hidden) {
      var dialogTargets = visibleControls();
      var modalPosition = dialogTargets.indexOf(document.activeElement);
      var dialogDelta = dir === 'left' || dir === 'up' ? -1 : 1;
      var dialogTarget = dialogTargets[Math.max(0, Math.min(dialogTargets.length - 1, modalPosition + dialogDelta))];
      if (dialogTarget) { dialogTarget.focus(); }
      return;
    }

    if (!document.activeElement || document.activeElement === document.body || !isInteractive(document.activeElement)) {
      var fallback = getPrimaryControl(currentPage) || visibleControls()[0];
      if (fallback) { fallback.focus(); fallback.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
      return;
    }

    var active = document.activeElement;

    if (active.classList && active.classList.contains('sidebar-item')) {
      var destinations = Array.prototype.slice.call($$('.sidebar-item'));
      var destinationIndex = destinations.indexOf(active);
      if (dir === 'up' || dir === 'down') {
        var nextDest = destinations[Math.max(0, Math.min(destinations.length - 1, destinationIndex + (dir === 'up' ? -1 : 1)))];
        if (nextDest) { nextDest.focus(); }
        return;
      }
      if (dir === 'right') {
        if (currentPage === 'settings') {
          var activeCategory = document.querySelector('.settings-category.active') || document.querySelector('.settings-category');
          if (activeCategory) { activeCategory.focus(); return; }
        }
        if (pageFocus[currentPage] && isInteractive(pageFocus[currentPage])) {
          pageFocus[currentPage].focus();
          pageFocus[currentPage].scrollIntoView({ block: 'nearest', inline: 'nearest' });
          return;
        }
        var pageControl = getPrimaryControl(currentPage) || visibleControls()[0];
        if (pageControl) {
          pageControl.focus();
          pageControl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
        return;
      }
      if (dir === 'left') { return; }
    }

    if (active === $('settings-open') || active === $('preview') || active === $('preview-retry') || active === $('preview-toggle') || active === $('preview-launcher') || active === $('preview-collapse')) {
      if (dir === 'left') {
        if (active === $('preview-toggle') && isInteractive($('preview-retry'))) { $('preview-retry').focus(); return; }
        if (active === $('preview-retry') && isInteractive($('preview'))) { $('preview').focus(); return; }
        if (active === $('preview') && isInteractive($('settings-open'))) { $('settings-open').focus(); return; }
        var sidebarTarget = document.querySelector('.sidebar-item[data-section="' + currentPage + '"]');
        if (sidebarTarget) { sidebarTarget.focus(); return; }
      }
      if (dir === 'right') {
        if (active === $('settings-open')) {
          if (isInteractive($('preview'))) { $('preview').focus(); return; }
          if (isInteractive($('preview-retry'))) { $('preview-retry').focus(); return; }
          if (isInteractive($('preview-toggle'))) { $('preview-toggle').focus(); return; }
        }
        if (active === $('preview') && isInteractive($('preview-retry'))) { $('preview-retry').focus(); return; }
        if (active === $('preview-retry') && isInteractive($('preview-toggle'))) { $('preview-toggle').focus(); return; }
      }
      if (dir === 'down') {
        var firstContent = getPrimaryControl(currentPage) || visibleControls()[0];
        if (firstContent) { firstContent.focus(); firstContent.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; }
      }
      return;
    }

    if (currentPage === 'games') {
      if (active.id === 'xbox-gamertag-input' && dir === 'down') { $('xbox-gamertag-save').focus(); return; }
      if (active.id === 'xbox-gamertag-save' && dir === 'up') { $('xbox-gamertag-input').focus(); return; }
      if (active.id === 'xbox-gamertag-clear' && dir === 'left') { $('xbox-gamertag-save').focus(); return; }
      if (active.id === 'xbox-gamertag-save' && dir === 'right') { $('xbox-gamertag-clear').focus(); return; }
      if (active.id === 'xbox-gamertag-clear' && dir === 'right') { return; }
      if (active.id === 'xbox-settings-open' && dir === 'down') { $('launch-xbox').focus(); return; }
      if (active.id === 'tv-games-refresh' && dir === 'left') { var gamesSidebar = document.querySelector('.sidebar-item[data-section="games"]'); if (gamesSidebar) { gamesSidebar.focus(); return; } }
      if (active.id === 'launch-xbox' && dir === 'up') { $('xbox-settings-open').focus(); return; }
      if (active.id === 'launch-xbox' && dir === 'right' && isInteractive($('xbox-input-configure'))) { $('xbox-input-configure').focus(); return; }
      if (active.id === 'xbox-input-configure' && dir === 'left') { $('launch-xbox').focus(); return; }
      var gameCards = Array.prototype.slice.call($$('#games-grid .tv-game-card'));
      var gameCardIndex = gameCards.indexOf(active);
      if (gameCardIndex >= 0 && dir === 'left') {
        if (gameCardIndex === 0) { var gamesNav = document.querySelector('.sidebar-item[data-section="games"]'); if (gamesNav) { gamesNav.focus(); return; } }
        else { gameCards[gameCardIndex - 1].focus(); return; }
      }
      if (gameCardIndex >= 0 && dir === 'right') { if (gameCardIndex + 1 < gameCards.length) { gameCards[gameCardIndex + 1].focus(); } return; }
      if (gameCardIndex >= 0 && dir === 'up') { $('tv-games-refresh').focus(); return; }
      if (active.id === 'tv-games-refresh' && dir === 'up') { $('launch-xbox').focus(); return; }
    }

    if (currentPage === 'search') {
      if (active === $('search-input')) {
        if (dir === 'down') {
          var firstSuggestion = firstInteractive($('search-results'));
          if (firstSuggestion) { firstSuggestion.focus(); firstSuggestion.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; }
        }
        if (dir === 'left') {
          var searchNav = document.querySelector('.sidebar-item[data-section="search"]');
          if (searchNav) { searchNav.focus(); return; }
        }
        if (dir === 'right') {
          if ($('search-clear') && !$('search-clear').hidden) { $('search-clear').focus(); return; }
        }
        return;
      }
      if (active === $('search-clear')) {
        if (dir === 'left') { $('search-input').focus(); return; }
        if (dir === 'down') {
          var firstSuggestion = firstInteractive($('search-results'));
          if (firstSuggestion) { firstSuggestion.focus(); firstSuggestion.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; }
        }
        return;
      }
      if (active.closest && active.closest('.search-chip')) {
        var section = active.closest('.search-section');
        var chips = Array.prototype.filter.call(section.querySelectorAll('.search-chip'), isInteractive);
        var chipIndex = chips.indexOf(active);
        if (dir === 'left') {
          if (chipIndex === 0) {
            var searchNav = document.querySelector('.sidebar-item[data-section="search"]');
            if (searchNav) { searchNav.focus(); return; }
          }
          if (chipIndex > 0) { chips[chipIndex - 1].focus(); chips[chipIndex - 1].scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; }
        }
        if (dir === 'right') {
          if (chipIndex < chips.length - 1) { chips[chipIndex + 1].focus(); chips[chipIndex + 1].scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; }
        }
        var allSections = Array.prototype.filter.call($$('.search-section'), function (item) { return !item.hidden && item.querySelector('.search-chip, .search-grid button'); });
        var sectionIndex = allSections.indexOf(section);
        if (dir === 'up') {
          if (sectionIndex === 0) {
            var appTarget = firstInteractive($('search-apps')) || $('search-input');
            if (appTarget) { appTarget.focus(); appTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; }
          } else if (allSections[sectionIndex - 1]) {
            var prevTarget = firstInteractive(allSections[sectionIndex - 1], '.search-chip, .search-grid button');
            if (prevTarget) { prevTarget.focus(); prevTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; }
          }
        }
        if (dir === 'down') {
          if (sectionIndex < allSections.length - 1 && allSections[sectionIndex + 1]) {
            var nextTarget = firstInteractive(allSections[sectionIndex + 1], '.search-chip, .search-grid button');
            if (nextTarget) { nextTarget.focus(); nextTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; }
          } else if ($('search-keyboard') && !$('search-keyboard').hidden) {
            var firstKey = $('search-keyboard').querySelector('.key');
            if (firstKey) { firstKey.focus(); firstKey.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; }
          }
        }
        return;
      }
      if (active.matches && active.matches('#search-apps button')) {
        if (dir === 'up') { $('search-input').focus(); return; }
        if (dir === 'down') {
          var nextSearchSection = $('search-quick-section').hidden ? $('search-titles-section') : $('search-quick-section');
          var nextSearchTarget = nextSearchSection && nextSearchSection.querySelector('.search-chip');
          if (nextSearchTarget) { nextSearchTarget.focus(); nextSearchTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; }
        }
        if (dir === 'left') {
          var searchButtons = Array.prototype.slice.call($$('#search-apps button'));
          if (searchButtons.indexOf(active) === 0 || active.getBoundingClientRect().left < searchButtons[0].getBoundingClientRect().left + 20) {
            var searchNav = document.querySelector('.sidebar-item[data-section="search"]');
            if (searchNav) { searchNav.focus(); return; }
          }
        }
      }
    }

    if (currentPage === 'settings') {
      if (active.classList && active.classList.contains('settings-category')) {
        var categories = Array.prototype.slice.call($$('.settings-category'));
        var catIndex = categories.indexOf(active);
        if (dir === 'up' || dir === 'down') {
          var nextCat = categories[Math.max(0, Math.min(categories.length - 1, catIndex + (dir === 'up' ? -1 : 1)))];
          if (nextCat) { nextCat.focus(); }
          return;
        }
        if (dir === 'left') {
          var settingsNav = document.querySelector('.sidebar-item[data-section="settings"]');
          if (settingsNav) { settingsNav.focus(); }
          return;
        }
        if (dir === 'right') {
          var panelEl = $('settings-panel-' + currentPanel);
          var panelControl = panelEl && panelEl.querySelector('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]');
          if (panelControl) { panelControl.focus(); panelControl.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
          return;
        }
      }

      if (active.closest && active.closest('.settings-panel')) {
        var currentPanelEl = $('settings-panel-' + currentPanel);

        if (active.id === 'sound-volume') {
          if (dir === 'left') {
            prefs.soundVolume = Math.max(0, prefs.soundVolume - 5);
            active.value = String(prefs.soundVolume);
            active.dispatchEvent(new Event('input', { bubbles: true }));
            active.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }
          if (dir === 'right') {
            prefs.soundVolume = Math.min(100, prefs.soundVolume + 5);
            active.value = String(prefs.soundVolume);
            active.dispatchEvent(new Event('input', { bubbles: true }));
            active.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }
        }

        if (dir === 'left') {
          var choices = Array.prototype.slice.call($$('.settings-wallpaper-choice', currentPanelEl));
          var cIdx = choices.indexOf(active);
          if (cIdx >= 0 && cIdx % 3 !== 0) {
            choices[cIdx - 1].focus(); choices[cIdx - 1].scrollIntoView({ block: 'nearest', inline: 'nearest' }); return;
          }
          if (active.id === 'name-reset') { $('name-save').focus(); return; }
          if (active.id === 'name-save') { $('launcher-name').focus(); return; }
          if (active.id === 'background-apply') { $('background-path-enhanced').focus(); return; }
          if (active.id === 'manage-visibility') { $('apps-refresh-settings').focus(); return; }

          var activeCategory = document.querySelector('.settings-category.active');
          if (activeCategory) { activeCategory.focus(); return; }
        }

        if (dir === 'right') {
          var choices = Array.prototype.slice.call($$('.settings-wallpaper-choice', currentPanelEl));
          var cIdx = choices.indexOf(active);
          if (cIdx >= 0) {
            if (cIdx % 3 !== 2 && cIdx + 1 < choices.length) {
              choices[cIdx + 1].focus(); choices[cIdx + 1].scrollIntoView({ block: 'nearest', inline: 'nearest' }); return;
            }
            return;
          }
          if (active.id === 'launcher-name') { $('name-save').focus(); return; }
          if (active.id === 'name-save') { $('name-reset').focus(); return; }
          if (active.id === 'background-path-enhanced') { $('background-apply').focus(); return; }
          if (active.id === 'apps-refresh-settings') { $('manage-visibility').focus(); return; }
        }

        var choices = Array.prototype.slice.call($$('.settings-wallpaper-choice', currentPanelEl));
        var cIdx = choices.indexOf(active);
        if (cIdx >= 0) {
          if (dir === 'up') {
            if (cIdx >= 3) {
              choices[cIdx - 3].focus(); choices[cIdx - 3].scrollIntoView({ block: 'nearest', inline: 'nearest' }); return;
            } else {
              $('theme-select').focus(); $('theme-select').scrollIntoView({ block: 'nearest', inline: 'nearest' }); return;
            }
          }
          if (dir === 'down') {
            if (cIdx < 3 && cIdx + 3 < choices.length) {
              choices[cIdx + 3].focus(); choices[cIdx + 3].scrollIntoView({ block: 'nearest', inline: 'nearest' }); return;
            } else {
              $('background-path-enhanced').focus(); $('background-path-enhanced').scrollIntoView({ block: 'nearest', inline: 'nearest' }); return;
            }
          }
        }
      }
    }

    var carousel = active.closest('.carousel, .games-carousel');
    if (carousel) {
      var items = Array.prototype.filter.call(carousel.querySelectorAll('.carousel-item, .app, .trending-card'), isInteractive);
      var itemIndex = items.indexOf(active);
      if (dir === 'left') {
        if (itemIndex === 0) {
          var activeNav = document.querySelector('.sidebar-item[data-section="' + currentPage + '"]');
          if (activeNav) { activeNav.focus(); return; }
        } else if (itemIndex > 0) {
          items[itemIndex - 1].focus(); items[itemIndex - 1].scrollIntoView({ block: 'nearest', inline: 'nearest' }); return;
        }
      }
      if (dir === 'right') {
        if (itemIndex < items.length - 1) {
          items[itemIndex + 1].focus(); items[itemIndex + 1].scrollIntoView({ block: 'nearest', inline: 'nearest' }); return;
        }
        return;
      }
      if (dir === 'up') {
        if (carousel.id === 'apps-carousel' && isInteractive($('preview'))) {
          $('preview').focus(); return;
        }
        if (carousel.id === 'trending-carousel') {
          var libraryApps = Array.prototype.slice.call($$('#apps .app'));
          var bestApp = findClosestX(active, libraryApps);
          if (bestApp) { bestApp.focus(); bestApp.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; }
        }
      }
      if (dir === 'down') {
        if (carousel.id === 'apps-carousel') {
          var libraryApps = Array.prototype.slice.call($$('#apps .app'));
          var bestApp = findClosestX(active, libraryApps);
          if (bestApp) { bestApp.focus(); bestApp.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; }
          if (isInteractive($('edit-apps-home'))) { $('edit-apps-home').focus(); return; }
        }
      }
    }

    if (active.closest && active.closest('#apps')) {
      var appsInGrid = Array.prototype.slice.call($$('#apps .app'));
      if (dir === 'left') {
        var isLeftEdge = !appsInGrid.some(function (el) { return el !== active && el.getBoundingClientRect().right < active.getBoundingClientRect().left - 10; });
        if (isLeftEdge) {
          var homeNav = document.querySelector('.sidebar-item[data-section="home"]');
          if (homeNav) { homeNav.focus(); return; }
        }
      }
      if (dir === 'up') {
        var isTopRow = !appsInGrid.some(function (el) { return el !== active && el.getBoundingClientRect().bottom < active.getBoundingClientRect().top - 10; });
        if (isTopRow) {
          var carouselItems = Array.prototype.slice.call($$('#apps-carousel .carousel-item'));
          var bestItem = findClosestX(active, carouselItems);
          if (bestItem) { bestItem.focus(); bestItem.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; }
        }
      }
      if (dir === 'down') {
        var isBottomRow = !appsInGrid.some(function (el) { return el !== active && el.getBoundingClientRect().top > active.getBoundingClientRect().bottom + 10; });
        if (isBottomRow) {
          var trendingCards = Array.prototype.slice.call($$('#trending-carousel .trending-card'));
          var bestCard = findClosestX(active, trendingCards);
          if (bestCard) { bestCard.focus(); bestCard.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; }
        }
      }
    }

    var controls = visibleControls();
    if (controls.indexOf(active) < 0) {
      if (controls[0]) { controls[0].focus(); controls[0].scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
      return;
    }

    if (dir === 'left') {
      var hasControlLeft = controls.some(function (el) {
        if (el === active) { return false; }
        var r = el.getBoundingClientRect(), act = active.getBoundingClientRect();
        return r.right < act.left - 5 && Math.abs((r.top + r.height / 2) - (act.top + act.height / 2)) < Math.max(r.height, act.height) * 2;
      });
      if (!hasControlLeft) {
        var navButton = document.querySelector('.sidebar-item[data-section="' + currentPage + '"]');
        if (navButton) { navButton.focus(); return; }
      }
    }

    var a = active.getBoundingClientRect(), x = a.left + a.width / 2, y = a.top + a.height / 2;
    var horizontal = dir === 'left' || dir === 'right', sign = (dir === 'left' || dir === 'up') ? -1 : 1;
    var chosen = null, best = Infinity;

    controls.forEach(function (element) {
      if (element === active || !isInteractive(element)) { return; }
      var r = element.getBoundingClientRect(), dx = r.left + r.width / 2 - x, dy = r.top + r.height / 2 - y;
      var forward = (horizontal ? dx : dy) * sign;
      var side = Math.abs(horizontal ? dy : dx);
      if (forward < 2) { return; }
      var overlap = horizontal ? (Math.max(a.top, r.top) < Math.min(a.bottom, r.bottom)) : (Math.max(a.left, r.left) < Math.min(a.right, r.right));
      var score = forward + side * (overlap ? 1.0 : 4.0);
      if (score < best) {
        chosen = element;
        best = score;
      }
    });

    if (chosen) {
      chosen.focus();
      chosen.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } else if (currentPage !== 'home' && dir === 'down' && isInteractive($('preview-launcher'))) {
      // The floating preview is pinned outside page layout. At a page's bottom
      // edge, make it discoverable with the remote instead of stranding it.
      $('preview-launcher').focus();
    }
  }

  Array.prototype.forEach.call($$('.sidebar-item'), function (button) { button.addEventListener('click', function () { showPage(button.getAttribute('data-section')); }); });
  Array.prototype.forEach.call($$('.settings-category'), function (button) { button.addEventListener('click', function () { selectSettingsPanel(button.getAttribute('data-panel')); if (window.AudioController) { window.AudioController.play('select'); } }); });
  $('settings-open').addEventListener('click', function () { returnFocus = $('settings-open'); currentPanel = 'appearance'; showPage('settings'); var active = document.querySelector('.settings-category.active'); if (active) { active.focus(); } });
  Array.prototype.forEach.call($$('.sidebar-item'), function (button) { button.addEventListener('click', function () { if (button.getAttribute('data-section') === 'settings') { returnFocus = button; } else { returnFocus = null; } }); });
  Array.prototype.forEach.call($$('[data-settings-destination]'), function (button) { button.addEventListener('click', function () { showPage(button.getAttribute('data-settings-destination')); }); });
  Array.prototype.forEach.call($$('.setting-toggle[data-pref]'), function (control) {
    control.addEventListener('click', function () {
      var key = control.getAttribute('data-pref'); if (typeof prefs[key] !== 'boolean') { return; }
      prefs[key] = !prefs[key]; save(); syncSettingsControls();
      if (key === 'animations' || key === 'reducedMotion' || key === 'sounds' || key === 'startupSound') { applyExperience(); }
      if (key === 'system') { renderCurrentPage(); renderSettingsApps(); }
      if (/^show/.test(key)) { applyHomePreferences(); }
      if (window.AudioController && prefs.sounds) { window.AudioController.play('select'); }
    });
  });
  Array.prototype.forEach.call($$('select[data-pref]'), function (control) { control.addEventListener('change', function () { var key = control.getAttribute('data-pref'), value = control.value; if (key === 'homeDestination' && ['home', 'apps', 'recent'].indexOf(value) < 0) { return; } prefs[key] = value; save(); }); });
  $('sound-volume').addEventListener('input', function () { prefs.soundVolume = Math.max(0, Math.min(100, Number(this.value) || 0)); save(); applyExperience(); });
  $('sound-volume').addEventListener('change', function () { if (window.AudioController) { window.AudioController.play('select'); } });
  $('settings-reset').addEventListener('click', openSettingsDialog);
  $('settings-reset-cancel').addEventListener('click', closeSettingsDialog);
  $('settings-reset-confirm').addEventListener('click', resetSettings);
  $('settings-confirm').addEventListener('click', function (event) { if (event.target === this) { closeSettingsDialog(); } });
  if ($('sources-refresh-system')) { $('sources-refresh-system').addEventListener('click', refreshSources); }
  $('name-save').addEventListener('click', function () { prefs.name = cleanName($('launcher-name').value); applyName(); save(); report('Launcher name saved.'); });
  $('name-reset').addEventListener('click', function () { prefs.name = defaults.name; applyName(); save(); report('Launcher name reset.'); });
  $('theme-select').addEventListener('change', function () { var nextTheme = this.value === 'midnight' ? 'midnight' : 'cinematic'; if (prefs.theme === 'cinematic' && nextTheme !== 'cinematic' && prefs.background) { themeSnapshot = prefs.background; } prefs.theme = nextTheme; if (nextTheme !== 'cinematic') { prefs.background = ''; applyBackground('', false); } else { prefs.background = themeSnapshot || ''; applyBackground(prefs.background, false); } save(); renderWallpaperChoices(); });
  $('background-apply').addEventListener('click', function () { applyBackground($('background-path-enhanced').value.trim(), true); });
  $('apps-refresh').addEventListener('click', refreshApps);
  if ($('tv-games-refresh')) { $('tv-games-refresh').addEventListener('click', function () { refreshApps(); }); }
  $('apps-refresh-settings').addEventListener('click', refreshApps);
  $('edit-apps').addEventListener('click', function () { editingApps = !editingApps; this.textContent = editingApps ? 'Done editing' : 'Edit apps'; renderAppsPage(); renderHome(); });
  $('edit-apps-home').addEventListener('click', function () { editingApps = !editingApps; renderHome(); });
  $('search-input').addEventListener('input', updateSearch);
  $('search-clear').addEventListener('click', function () { $('search-input').value = ''; updateSearch(); $('search-input').focus(); });
  $('clear-recent').addEventListener('click', function () { prefs.recentApps = []; save(); renderRecent(); report('Recent history cleared.'); });
  $('manage-visibility').addEventListener('click', function () { showPage('home'); editingApps = true; renderHome(); });
  $('tv-settings-open-enhanced').addEventListener('click', openTVSettings);
  if ($('sources-refresh')) { $('sources-refresh').addEventListener('click', refreshSources); }
  $('preview-retry').addEventListener('click', function () { prefs.preview = true; previewBlocked = false; previewNeedsShow = true; save(); updatePreviewToggle(); readCurrentSource(); syncPreview(); });
  $('preview-toggle').addEventListener('click', function () { prefs.preview = !prefs.preview; previewBlocked = false; save(); updatePreviewToggle(); syncPreview(); });
  $('preview-launcher').addEventListener('click', function () { previewFloatExpanded = true; updatePreviewPresentation(); syncPreview(); $('preview-collapse').focus(); });
  $('preview-collapse').addEventListener('click', function () { previewFloatExpanded = false; updatePreviewPresentation(); syncPreview(); $('preview-launcher').focus(); });
  $('close-app-settings').addEventListener('click', function () { exitDialog(true); });
  $('exit-cancel').addEventListener('click', function () { exitDialog(false); });
  $('exit-confirm').addEventListener('click', closeLauncher);
  $('launch-xbox').addEventListener('click', switchToXboxInput);
  if ($('xbox-settings-open')) { $('xbox-settings-open').addEventListener('click', function () { var settings = $('xbox-settings'); settings.open = !settings.open; this.setAttribute('aria-expanded', String(settings.open)); if (settings.open) { $('xbox-gamertag-input').focus(); } }); }
  if ($('xbox-gamertag-save')) { $('xbox-gamertag-save').addEventListener('click', saveXboxGamertag); }
  if ($('xbox-gamertag-clear')) { $('xbox-gamertag-clear').addEventListener('click', clearXboxGamertag); }
  if ($('xbox-input-configure')) { $('xbox-input-configure').addEventListener('click', function () { showPage('inputs'); }); }
  Array.prototype.forEach.call($$('.carousel-item[data-app-id]'), function (button) {
    button.addEventListener('click', function () {
      var id = button.getAttribute('data-app-id');
      if (id === 'all-apps') { showPage('apps'); }
      else if (id === 'tv') { TizenService.getSources(function (sources) { var source = sources.filter(function (item) { return item.type === 'TV'; })[0]; if (source) { TizenService.setSource(source, function () { report('Switched to TV'); }, function (error) { report('Could not switch input.', error); }); } else { report('TV input not available.'); } }); }
      else if (id === 'hdmi1' || id === 'hdmi2') { var n = id === 'hdmi1' ? 1 : 2; TizenService.getSources(function (sources) { var source = sources.filter(function (item) { return item.type === 'HDMI' && item.number === n; })[0]; if (source) { TizenService.setSource(source, function () { report('Switched to HDMI ' + n); }, function (error) { report('Could not switch input.', error); }); } }); }
      else { var app = allApps.filter(function (item) { return item.id === id || (id === 'prime' && /prime/i.test(item.name || '')); })[0]; if (app) { launch(app.id, app.name || app.id); } else { report('This shortcut has no matching installed app on this TV.'); } }
    });
  });

  var keyboardNavigation = false, keyboardNavigationTimer = null, lastFocusedControl = null;
  document.addEventListener('pointerdown', function () { keyboardNavigation = false; }, true);
  document.addEventListener('pointerover', function (event) {
    var target = event.target && event.target.closest ? event.target.closest('button,[role="button"],select,input,summary') : null;
    if (target && !target.disabled && event.relatedTarget && !target.contains(event.relatedTarget) && window.AudioController) { window.AudioController.play('focus'); }
  }, true);
  document.addEventListener('focusin', function (event) {
    if (keyboardNavigation && event.target !== lastFocusedControl && window.AudioController) { window.AudioController.play('focus'); }
    lastFocusedControl = event.target;
  });
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target.closest('button,[role="button"]') : null;
    if (!target || !window.AudioController || target.disabled) { return; }
    if (target.id === 'settings-open' || target.hasAttribute('data-section') || target.hasAttribute('data-settings-destination') || target.classList.contains('settings-category') || target.classList.contains('app') || target.classList.contains('app-grid-item') || target.classList.contains('carousel-item') || target.classList.contains('setting-toggle')) { return; }
    if (target.id === 'preview-collapse' || target.id === 'settings-reset-cancel' || target.id === 'exit-cancel') { window.AudioController.play('close'); return; }
    window.AudioController.play('select');
  }, true);
  document.addEventListener('keydown', function (event) {
    keyboardNavigation = true;
    document.body.classList.add('keyboard-mode');
    clearTimeout(keyboardNavigationTimer);
    keyboardNavigationTimer = setTimeout(function () {
      keyboardNavigation = false;
      if (!TizenService.isTV()) { document.body.classList.remove('keyboard-mode'); }
    }, 1500);

    var action = normalizeKeyEvent(event);

    if (action === 'back') {
      event.preventDefault();
      if (event.repeat) { return; }
      if (window.AudioController) { window.AudioController.play('back'); }
      if (!$('exit-dialog').hidden) { exitDialog(false); }
      else if (!$('settings-confirm').hidden) { closeSettingsDialog(); }
      else if (document.activeElement && document.activeElement.closest && document.activeElement.closest('details[open]')) {
        var openDetails = document.activeElement.closest('details[open]');
        openDetails.open = false;
        var summary = openDetails.querySelector('summary');
        if (summary) { summary.focus(); }
        if (openDetails.id === 'xbox-settings' && $('xbox-settings-open')) { $('xbox-settings-open').setAttribute('aria-expanded', 'false'); }
      }
      else if (currentPage !== 'home' && previewFloatExpanded) { $('preview-collapse').click(); }
      else if (editingApps) {
        editingApps = false;
        renderCurrentPage();
        var editBtn = $('edit-apps-home') || $('edit-apps');
        if (editBtn) { editBtn.focus(); }
      }
      else if (currentPage === 'settings') {
        showPage('home');
        if (returnFocus && returnFocus.focus && returnFocus.isConnected && returnFocus.getClientRects().length) {
          returnFocus.focus();
          returnFocus = null;
        }
      }
      else if (currentPage !== 'home') {
        showPage('home');
      }
      else {
        exitDialog(true);
      }
      return;
    }

    if (action === 'settings') {
      event.preventDefault();
      if (event.repeat) { return; }
      returnFocus = document.activeElement;
      currentPanel = 'appearance';
      showPage('settings');
      var category = document.querySelector('.settings-category.active');
      if (category) { category.focus(); }
      return;
    }

    if (action === 'up' || action === 'down' || action === 'left' || action === 'right') {
      var active = document.activeElement;
      var isTextInput = active && (active.tagName === 'INPUT' && ['text', 'search', 'url', 'email', 'number'].indexOf(active.type) >= 0 || active.tagName === 'TEXTAREA');

      if (isTextInput) {
        if (action === 'up' || action === 'down') {
          event.preventDefault();
          moveFocus(action);
          return;
        }
        if (action === 'left') {
          var atStart = (typeof active.selectionStart === 'number') && active.selectionStart === 0 && active.selectionEnd === 0;
          if (atStart) {
            event.preventDefault();
            moveFocus('left');
          }
          return;
        }
        if (action === 'right') {
          var atEnd = (typeof active.selectionStart === 'number') && active.selectionStart === active.value.length && active.selectionEnd === active.value.length;
          if (atEnd) {
            event.preventDefault();
            moveFocus('right');
          }
          return;
        }
        return;
      }

      event.preventDefault();
      moveFocus(action);
      return;
    }

    if (action === 'enter') {
      var active = document.activeElement;
      if (!active || active === document.body) { return; }
      if (active.tagName === 'INPUT' && active.type !== 'button' && active.type !== 'submit') {
        if (active.id === 'launcher-name') { event.preventDefault(); $('name-save').click(); return; }
        if (active.id === 'background-path-enhanced') { event.preventDefault(); $('background-apply').click(); return; }
        if (active.id === 'search-input') { event.preventDefault(); updateSearch(); return; }
        if (active.id === 'xbox-gamertag-input') { event.preventDefault(); saveXboxGamertag(); return; }
        return;
      }
      if (active.tagName === 'BUTTON' || active.tagName === 'A' || active.tagName === 'SUMMARY' || active.getAttribute('role') === 'button' || active.hasAttribute('tabindex')) {
        if (!event.repeat) {
          event.preventDefault();
          active.click();
        }
        return;
      }
    }

    if (action === 'tab') {
      var list = visibleControls();
      var index = list.indexOf(document.activeElement);
      if (list.length) {
        event.preventDefault();
        list[Math.max(0, Math.min(list.length - 1, index + (event.shiftKey ? -1 : 1)))].focus();
      }
    }
  });
  document.addEventListener('visibilitychange', function () {
    clearTimeout(launchTimer); ++launchGeneration;
    if ($('launch-feedback')) { $('launch-feedback').hidden = true; }
    if (!document.hidden) { launching = false; previewBlocked = false; previewNeedsShow = true; refreshApps(); readCurrentSource(); }
    syncPreview();
  });
  window.addEventListener('resize', function () { previewNeedsShow = true; syncPreview(); });

  loadPrefs(); applyName(); applyBackground(prefs.background, false); applyExperience(); syncSettingsControls(); renderWallpaperChoices(); applyHomePreferences();  if (window.AudioController) { window.AudioController.configure({ enabled: prefs.sounds, volume: prefs.soundVolume / 100, startup: prefs.startupSound }); }
  $('theme-select').value = prefs.theme; $('background-path-enhanced').value = prefs.background;
  $('system-toggle').setAttribute('aria-pressed', String(prefs.system)); $('system-toggle').textContent = prefs.system ? 'On' : 'Off';
  updatePreviewToggle(); clock(); setInterval(clock, 30000); initIcons(); updateDiagnostics();
  if (TizenService.isTV()) {
    document.body.classList.add('keyboard-mode');
    if (typeof TizenService.registerKeys === 'function') {
      TizenService.registerKeys(['ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue', 'MediaPlay', 'MediaPause', 'MediaStop', 'MediaFastForward', 'MediaRewind', 'MediaPlayPause']);
    } else {
      TizenService.registerKey('ColorF3Blue');
    }
  }
  refreshApps(); readCurrentSource(); setHomeDestination();
  requestAnimationFrame(function () { requestAnimationFrame(function () { syncPreview(); }); });
}());

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var $$ = function (selector, root) { return (root || document).querySelectorAll(selector); };
  var storageKey = 'kipsmthn.settings.v1';
  var legacyStorageKey = 'b1ackha7tv.settings.v1';
  var defaults = { name: 'Kipsmthn', theme: 'cinematic', background: '', backgroundVersion: 2, preview: true, system: false, favorites: null, recentApps: [], animations: true, sounds: true, soundVolume: 25, reducedMotion: false, startupSound: false, homeDestination: 'home', showApps: true, showContinue: true, showFeatured: true, showRecent: true };
  var prefs = Object.assign({}, defaults);
  var themes = {
    cinematic: 'url("assets/wallpapers/twilight-mountains.svg")',
    midnight: 'radial-gradient(ellipse at 10% 0%,#244357 0%,transparent 55%),linear-gradient(130deg,#131b33,#090e1b)',
    aurora: 'radial-gradient(ellipse at 0% 0%,#24746c 0%,transparent 60%),linear-gradient(130deg,#20224c,#101426)',
    ember: 'radial-gradient(ellipse at 0% 0%,#854b39 0%,transparent 60%),linear-gradient(130deg,#3d263c,#121325)'
  };
  var wallpaperChoices = [
    { id: 'twilight-mountains', name: 'Twilight Mountains', path: 'assets/wallpapers/twilight-mountains.svg' },
    { id: 'northern-lights', name: 'Northern Lights', path: 'assets/wallpapers/northern-lights.svg' },
    { id: 'lake-dusk', name: 'Lake at Dusk', path: 'assets/wallpapers/lake-dusk.svg' },
    { id: 'earth-space', name: 'Earth from Space', path: 'assets/wallpapers/earth-space.svg' },
    { id: 'abstract-gradient', name: 'Violet Gradient', path: 'assets/wallpapers/abstract-gradient.svg' },
    { id: 'cinematic-title', name: 'Cinematic', path: 'assets/wallpapers/cinematic-title.svg' }
  ];
  var currentPage = 'home', currentPanel = 'appearance', allApps = [], editingApps = false;
  var iconResults = Object.create(null), iconCache = Object.create(null);
  var appRequest = 0, imageRequest = 0, launchGeneration = 0, launchTimer = null;
  var launching = false, previewBlocked = false, previewNeedsShow = true, windowBusy = false, windowVisible = false;
  var returnFocus = null, exitFocus = null, log = [];

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
    if (Object.prototype.hasOwnProperty.call(themes, saved.theme)) { prefs.theme = saved.theme; }
    if (typeof saved.background === 'string') { prefs.background = saved.background; }
    if (typeof saved.preview === 'boolean') { prefs.preview = saved.preview; }
    if (typeof saved.system === 'boolean') { prefs.system = saved.system; }
    if (Array.isArray(saved.favorites)) { prefs.favorites = saved.favorites.filter(function (id) { return typeof id === 'string'; }); }
    var recent = Array.isArray(saved.recentApps) ? saved.recentApps : (Array.isArray(saved.recent) ? saved.recent.map(function (item) { return typeof item === 'string' ? item : item && item.id; }) : []);
    prefs.recentApps = recent.filter(function (id) { return typeof id === 'string'; }).slice(0, 20);
    ['animations', 'sounds', 'reducedMotion', 'startupSound', 'showApps', 'showContinue', 'showFeatured', 'showRecent'].forEach(function (key) { if (typeof saved[key] === 'boolean') { prefs[key] = saved[key]; } });
    if (['home', 'apps', 'recent'].indexOf(saved.homeDestination) >= 0) { prefs.homeDestination = saved.homeDestination; }
    if (typeof saved.soundVolume === 'number' && isFinite(saved.soundVolume)) { prefs.soundVolume = Math.max(0, Math.min(100, Math.round(saved.soundVolume))); }
    if (saved.backgroundVersion !== 2) { prefs.background = ''; }
    if (migrated || saved.backgroundVersion !== 2) {
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
  function safeImagePath(path) { return /^(?:assets\/)[a-zA-Z0-9_\-\/ .]+\.(?:png|jpe?g|webp|svg)$/i.test(path) && path.indexOf('..') === -1; }
  function applyBackground(path, persist) {
    var request = ++imageRequest, wallpaper = $('wallpaper');
    if (!wallpaper) { return; }
    wallpaper.style.backgroundImage = themes[prefs.theme] || themes.cinematic;
    if (!path) { return; }
    if (!safeImagePath(path)) { report('Use a packaged image path such as assets/background.jpg.'); return; }
    var isPackagedWallpaper = wallpaperChoices.some(function (choice) { return choice.path === path; });
    var image = new Image();
    image.onload = function () {
      if (request !== imageRequest) { return; }
      wallpaper.style.backgroundImage = 'linear-gradient(rgba(5,10,20,.35),rgba(5,10,20,.62)),url("' + path + '")';
      if (persist) { prefs.background = path; save(); report('Custom background saved.'); }
    };
    image.onerror = function () { if (request === imageRequest) { report('Image was not found in the app package.'); } };
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
  function showPage(page) {
    var supported = ['home', 'search', 'apps', 'games', 'recent', 'inputs', 'settings'];
    if (supported.indexOf(page) < 0) { page = 'home'; }
    var pageChanged = currentPage !== page;
    currentPage = page;
    if (pageChanged && document.body.classList.contains('animations-enabled')) {
      document.body.classList.add('page-transition');
      if (showPage.transitionTimer) { clearTimeout(showPage.transitionTimer); }
      showPage.transitionTimer = setTimeout(function () { document.body.classList.remove('page-transition'); }, prefs.reducedMotion ? 120 : 300);
    }
    Array.prototype.forEach.call($$('.page-section'), function (section) {
      var sectionId = 'page-' + page;
      section.hidden = section.id !== sectionId;
    });
    if ($('page-settings')) { $('page-settings').hidden = page !== 'settings'; }
    setActiveNavigation(page);
    if (page === 'settings') { selectSettingsPanel(currentPanel); refreshSources(); var firstCategory = document.querySelector('.settings-category.active'); if (firstCategory && pageChanged) { firstCategory.focus(); } }
    else {
      var pageRoot = $('page-' + page);
      if (pageRoot) { var first = pageRoot.querySelector('button,input,select,[tabindex="0"]'); if (first && pageChanged && page !== 'home') { first.focus(); } else if (pageChanged) { var navButton = document.querySelector('.sidebar-item[data-section="' + page + '"]'); if (navButton) { navButton.focus(); } } }
      if (page === 'apps') { renderAppsPage(); }
      else if (page === 'games') { renderGames(); }
      else if (page === 'recent') { renderRecent(); }
      else if (page === 'inputs') { renderInputs(); }
      else if (page === 'home') { renderHome(); }
      else if (page === 'search') { updateSearch(); }
    }
    if (page === 'search' && $('search-input')) { $('search-input').focus(); }
    if (page === 'home') { applyHomePreferences(); }
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
    if (name === 'about' || name === 'system') { updateDiagnostics(); }
    if (name === 'apps') { iconSummary(); renderSettingsApps(); }
    if (name === 'appearance') { renderWallpaperChoices(); syncSettingsControls(); }
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
    button.type = 'button'; button.className = cssClass || 'app'; button.setAttribute('data-app-id', app.id); button.title = app.name || app.id;
    var initial = document.createElement('span'); initial.className = 'initial'; initial.textContent = (app.name || '?').slice(0, 2).toUpperCase(); button.appendChild(initial);
    var image = document.createElement('img'); image.alt = ''; image.hidden = true; button.appendChild(image);
    var icon = app.iconPath || '';
    var cached = iconCache[app.id + '\n' + icon];
    if (cached) { image.src = cached; image.hidden = false; initial.hidden = true; }
    else if (icon) {
      image.onload = function () { image.hidden = false; initial.hidden = true; iconCache[app.id + '\n' + icon] = image.src; iconResults[app.id] = { name: app.name || app.id, failed: false }; iconSummary(); };
      image.onerror = function () { image.hidden = true; initial.hidden = false; iconResults[app.id] = { name: app.name || app.id, failed: true }; iconSummary(); };
      image.src = icon;
    } else if (/prime.?video/i.test(app.name || '')) {
      image.onload = function () { image.hidden = false; initial.hidden = true; iconResults[app.id] = { name: app.name || app.id, failed: false }; iconSummary(); };
      image.onerror = function () { image.hidden = true; initial.hidden = false; iconResults[app.id] = { name: app.name || app.id, failed: true }; iconSummary(); };
      image.src = 'assets/prime-video.svg';
    }
    var name = document.createElement('span'); name.className = 'app-name'; name.textContent = app.name || app.id; button.appendChild(name);
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
  function renderHome() {
    var library = $('apps'), catalog = uniqueApps();
    if (!library) { return; }
    ensureFavorites(catalog.catalog);
    var visible = catalog.catalog.filter(function (app) { return (prefs.system || app.show !== false) && (editingApps || prefs.favorites.indexOf(app.id) >= 0); });
    visible.sort(function (a, b) { return prefs.favorites.indexOf(a.id) - prefs.favorites.indexOf(b.id); });
    library.textContent = '';
    visible.forEach(function (app) { library.appendChild(createAppButton(app, true, 'app')); });
    if ($('library-title')) { $('library-title').textContent = editingApps ? 'Edit apps' : 'Apps'; }
    if ($('apps-section')) { $('apps-section').hidden = !prefs.showApps; }
    if ($('continue-section')) { $('continue-section').hidden = !prefs.showContinue; }
    if ($('trending-section')) { $('trending-section').hidden = !prefs.showFeatured; }
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
    var category = $('apps-category') ? $('apps-category').value : 'all';
    var visible = filterApps(allApps, '');
    if (category && category !== 'all') { visible = visible.filter(function (app) { return (app.categories || []).some(function (item) { return item.toLowerCase() === category; }); }); }
    var sort = $('apps-sort') ? $('apps-sort').value : 'alpha';
    visible.sort(function (a, b) {
      if (sort === 'favorites') { var ai = (prefs.favorites || []).indexOf(a.id), bi = (prefs.favorites || []).indexOf(b.id); if (ai !== bi) { return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi); } }
      if (sort === 'recent') { var ar = prefs.recentApps.indexOf(a.id), br = prefs.recentApps.indexOf(b.id); if (ar !== br) { return (ar < 0 ? Infinity : ar) - (br < 0 ? Infinity : br); } }
      return (a.name || a.id).localeCompare(b.name || b.id);
    });
    grid.textContent = ''; visible.forEach(function (app) { grid.appendChild(createAppButton(app, true, 'app app-grid-item')); });
    if ($('apps-empty')) { $('apps-empty').hidden = visible.length > 0; }
  }
  function isGame(app) { return (app.categories || []).some(function (category) { return /^(game|gaming)$/i.test(category); }); }
  function renderGames() {
    var grid = $('games-grid'); if (!grid) { return; }
    var visible = filterApps(allApps, '').filter(isGame); grid.textContent = '';
    visible.sort(function (a, b) { return (a.name || a.id).localeCompare(b.name || b.id); }).forEach(function (app) { grid.appendChild(createAppButton(app, true, 'app app-grid-item')); });
    if ($('games-empty')) { $('games-empty').hidden = visible.length > 0; }
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
  function renderInputs() {
    var grid = $('inputs-grid'); if (!grid) { return; }
    grid.textContent = '';
    TizenService.getSources(function (sources) {
      grid.textContent = '';
      (sources || []).forEach(function (source) {
        var button = document.createElement('button'); button.className = 'app'; button.textContent = source.name || source.type;
        button.setAttribute('aria-label', 'Switch to ' + (source.name || source.type));
        button.addEventListener('click', function () { TizenService.setSource(source, function () { report('Input changed.'); }, function (error) { report('Could not change input.', error); }); });
        grid.appendChild(button);
      });
      if ($('inputs-empty')) { $('inputs-empty').hidden = grid.children.length > 0; }
    });
  }
  function updateSearch() {
    var input = $('search-input'), results = $('search-results'), grid = $('search-apps'), empty = $('search-empty'), query = input ? input.value : '';
    if (!grid) { return; }
    grid.textContent = '';
    var matches = filterApps(allApps, query).sort(function (a, b) { return (a.name || a.id).localeCompare(b.name || b.id); });
    matches.forEach(function (app) { grid.appendChild(createAppButton(app, false, 'app app-grid-item')); });
    if (results) { results.hidden = !query; }
    if (empty) { empty.hidden = !!query; }
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
      var button = document.createElement('button'), image = document.createElement('span'), label = document.createElement('span');
      button.type = 'button'; button.className = 'settings-wallpaper-choice' + (prefs.background === choice.path || (!prefs.background && themes[prefs.theme] && themes[prefs.theme].indexOf(choice.path) >= 0) ? ' selected' : ''); button.setAttribute('aria-pressed', String(button.classList.contains('selected'))); button.setAttribute('aria-label', 'Apply ' + choice.name + ' wallpaper');
      image.className = 'settings-wallpaper-image'; image.style.backgroundImage = 'url("' + choice.path + '")'; label.className = 'settings-wallpaper-label'; label.textContent = choice.name; button.appendChild(image); button.appendChild(label);
      button.addEventListener('click', function () { prefs.theme = 'cinematic'; prefs.background = choice.path; $('theme-select').value = 'cinematic'; $('background-path-enhanced').value = choice.path; save(); applyBackground(choice.path, false); renderWallpaperChoices(); }); gallery.appendChild(button);
    });
  }
  function renderSettingsApps() {
    var list = $('settings-installed-apps'), status = $('settings-apps-status'); if (!list) { return; }
    list.textContent = '';
    var catalog = uniqueApps().catalog;
    if (status) { status.textContent = TizenService.isTV() ? (catalog.length + ' apps') : 'Demo apps · not installed'; }
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
    var appSection = $('apps-section'), continueSection = $('continue-section'), featuredSection = $('trending-section'), recentSection = $('recent-home-section');
    if (appSection) { appSection.hidden = !prefs.showApps; }
    if (continueSection) { continueSection.hidden = !prefs.showContinue; }
    if (featuredSection) { featuredSection.hidden = !prefs.showFeatured; }
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
    $('settings-confirm').hidden = false;
    $('settings-reset-cancel').focus();
  }
  function closeSettingsDialog() {
    $('settings-confirm').hidden = true;
    if (settingsDialogFocus && settingsDialogFocus.focus) { settingsDialogFocus.focus(); }
  }
  var settingsDialogFocus = null;
  function resetSettings() {
    try { localStorage.removeItem(storageKey); } catch (error) { report('Settings could not be reset.', error); return; }
    prefs = Object.assign({}, defaults); applyName(); applyBackground('', false); applyExperience(); save(); syncSettingsControls(); renderWallpaperChoices(); renderCurrentPage();
    closeSettingsDialog(); report('Kipsmthn settings restored to defaults.');
  }
  function applyExperience() {
    document.body.classList.toggle('animations-enabled', prefs.animations);
    document.body.classList.toggle('reduced-motion', prefs.reducedMotion);
    document.body.classList.toggle('animations-disabled', !prefs.animations);
    if (window.AudioController) { window.AudioController.configure({ enabled: prefs.sounds, volume: prefs.soundVolume / 100 }); }
    syncExperienceControls();
  }
  function toggleExperience(buttonId, key) {
    var control = $(buttonId); if (!control) { return; }
    control.addEventListener('click', function () { prefs[key] = !prefs[key]; save(); applyExperience(); if (window.AudioController) { window.AudioController.play('select'); } });
  }
  function iconSummary() {
    if (!$('icon-status')) { return; }
    var missing = Object.keys(iconResults).filter(function (id) { return iconResults[id].failed; }).map(function (id) { return iconResults[id].name; });
    $('icon-status').textContent = missing.length ? 'Pictures unavailable: ' + missing.join(', ') + '. Select Refresh apps to retry.' : 'No missing pictures detected among checked apps.';
  }

  function addRecent(id) {
    prefs.recentApps = prefs.recentApps.filter(function (value) { return value !== id; });
    prefs.recentApps.unshift(id); prefs.recentApps = prefs.recentApps.slice(0, 20); save();
  }
  function refreshApps() {
    var request = ++appRequest; iconCache = Object.create(null); iconResults = Object.create(null);
    TizenService.getAppsInfo(function (list) {
      if (request !== appRequest) { return; }
      allApps = Array.isArray(list) ? list : [];
      var catalogMode = $('catalog-mode'); if (catalogMode) { catalogMode.textContent = TizenService.isTV() ? 'Installed apps discovered on this TV' : 'Demo catalogue · not installed on this device'; }
      var catalog = uniqueApps(); ensureFavorites(catalog.catalog); renderCurrentPage(); renderSettingsApps(); report('App list refreshed (' + allApps.length + ' apps).');
    });
  }
  function launch(id, name) {
    if (launching) { return; }
    if (!TizenService.isTV()) { report('Launching apps is unavailable in browser preview.'); return; }
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
    function stop(error) { clearTimeout(launchTimer); ++launchGeneration; launching = false; previewBlocked = false; previewNeedsShow = true; syncPreview(); message('Could not open ' + name + '. You can try another app or open it from Samsung Home.', error); }
    function next(error) {
      clearTimeout(launchTimer); if (generation !== launchGeneration || document.hidden) { return; }
      if (index >= routes.length) { stop(error || { name: 'LaunchTimeout' }); return; }
      var target = routes[index++], token = ++attempt, answered = false;
      message(index === 1 ? 'Opening ' + name + '…' : 'Trying another way to open ' + name + '…');
      launchTimer = setTimeout(function () { if (active(token)) { next({ name: 'LaunchTimeout' }); } }, 8000);
      function failed(problem) { if (!active(token) || answered) { return; } answered = true; if (problem && /^(NotFoundError|UnknownError|NotSupportedError)$/.test(problem.name)) { next(problem); } else { stop(problem); } }
      function accepted() { if (!active(token) || answered) { return; } answered = true; message('Waiting for ' + name + ' to appear…'); }
      try { TizenService.launchApp(target, name, accepted, failed); } catch (problem) { failed(problem); }
    }
    launching = true; addRecent(id); syncPreview(); next();
  }

  function wantedPreview() { return prefs.preview && !document.hidden && !launching && !previewBlocked; }
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
        var rect = $('preview-picture').getBoundingClientRect();
        var values = [rect.left, rect.top, rect.width, rect.height].map(function (value) { return Math.round(value) + 'px'; });
        if (rect.width < 100 || rect.height < 100) { finish({ name: 'LayoutError', message: 'Preview layout is not ready.' }); return; }
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
        var button = document.createElement('button'); button.type = 'button'; button.textContent = source.name;
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
    if (open) { exitFocus = document.activeElement; }
    if ($('exit-dialog')) { $('exit-dialog').hidden = !open; }
    var target = open ? $('exit-cancel') : exitFocus;
    if (target && !target.disabled) { target.focus(); }
  }
  function closeLauncher() {
    if (!TizenService.isTV()) { exitDialog(false); report('This browser preview can be closed with its tab.'); return; }
    launching = true;
    try { TizenService.hidePreview(function () {}, function () {}); } catch (ignore) {}
    try { TizenService.exitApp(); } catch (error) { launching = false; exitDialog(false); report('Could not close the app.', error); syncPreview(); }
  }
  function visibleControls() {
    var root = !$('exit-dialog').hidden ? $('exit-dialog') : (!$('settings-confirm').hidden ? $('settings-confirm') : (!$('page-settings').hidden ? $('page-settings') : document));
    return Array.prototype.filter.call(root.querySelectorAll('button,input,select,summary'), function (element) { return !element.disabled && element.getClientRects().length > 0; });
  }
  function moveFocus(code) {
    if (!$('exit-dialog').hidden) { ($('exit-confirm') === document.activeElement ? $('exit-cancel') : $('exit-confirm')).focus(); return; }
    var controls = visibleControls(), active = document.activeElement;
    if (controls.indexOf(active) < 0) { if (controls[0]) { controls[0].focus(); } return; }
    var a = active.getBoundingClientRect(), x = a.left + a.width / 2, y = a.top + a.height / 2;
    var horizontal = code === 37 || code === 39, sign = code === 37 || code === 38 ? -1 : 1, chosen = null, best = Infinity;
    controls.forEach(function (element) {
      if (element === active) { return; }
      var r = element.getBoundingClientRect(), dx = r.left + r.width / 2 - x, dy = r.top + r.height / 2 - y;
      var forward = (horizontal ? dx : dy) * sign, side = Math.abs(horizontal ? dy : dx);
      if (forward > 2 && forward + side * 4 < best) { chosen = element; best = forward + side * 4; }
    });
    if (chosen) { chosen.focus(); chosen.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }

  Array.prototype.forEach.call($$('.sidebar-item'), function (button) { button.addEventListener('click', function () { showPage(button.getAttribute('data-section')); }); });
  Array.prototype.forEach.call($$('.settings-category'), function (button) { button.addEventListener('click', function () { selectSettingsPanel(button.getAttribute('data-panel')); }); });
  $('settings-open').addEventListener('click', function () { returnFocus = document.activeElement; currentPanel = 'general'; showPage('settings'); var active = document.querySelector('.settings-category.active'); if (active) { active.focus(); } });
  $('settings-close').addEventListener('click', function () { showPage('home'); if (returnFocus && returnFocus.focus) { returnFocus.focus(); } });
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
  $('theme-select').addEventListener('change', function () { prefs.theme = Object.prototype.hasOwnProperty.call(themes, this.value) ? this.value : 'cinematic'; prefs.background = ''; applyBackground('', false); save(); renderWallpaperChoices(); });
  $('background-apply').addEventListener('click', function () { applyBackground($('background-path-enhanced').value.trim(), true); });
  $('apps-refresh').addEventListener('click', refreshApps);
  $('apps-refresh-settings').addEventListener('click', refreshApps);
  $('apps-category').addEventListener('change', renderAppsPage);
  $('apps-sort').addEventListener('change', renderAppsPage);
  $('edit-apps').addEventListener('click', function () { editingApps = !editingApps; this.textContent = editingApps ? 'Done editing' : 'Edit apps'; renderAppsPage(); renderHome(); });
  $('edit-apps-home').addEventListener('click', function () { editingApps = !editingApps; renderHome(); });
  $('search-input').addEventListener('input', updateSearch);
  $('search-clear').addEventListener('click', function () { $('search-input').value = ''; updateSearch(); $('search-input').focus(); });
  $('clear-recent').addEventListener('click', function () { prefs.recentApps = []; save(); renderRecent(); report('Recent history cleared.'); });
  $('manage-visibility').addEventListener('click', function () { showPage('home'); editingApps = true; renderHome(); });
  $('tv-settings-open-enhanced').addEventListener('click', openTVSettings);
  $('sources-refresh').addEventListener('click', refreshSources);
  $('preview-retry').addEventListener('click', function () { prefs.preview = true; previewBlocked = false; previewNeedsShow = true; save(); updatePreviewToggle(); readCurrentSource(); syncPreview(); });
  $('preview-toggle').addEventListener('click', function () { prefs.preview = !prefs.preview; previewBlocked = false; save(); updatePreviewToggle(); syncPreview(); });
  $('close-app-settings').addEventListener('click', function () { exitDialog(true); });
  $('exit-cancel').addEventListener('click', function () { exitDialog(false); });
  $('exit-confirm').addEventListener('click', closeLauncher);
  $('watch-tv').addEventListener('click', function () { launch('org.tizen.tv-viewer', 'TV'); });
  $('launch-xbox').addEventListener('click', function () { var xbox = allApps.filter(function (app) { return /xbox/i.test(app.name || app.id); })[0]; if (xbox) { launch(xbox.id, xbox.name || 'Xbox'); } else { report('Xbox app was not found.'); } });
  Array.prototype.forEach.call($$('.carousel-item'), function (button) {
    button.addEventListener('click', function () {
      var id = button.getAttribute('data-app-id');
      if (id === 'all-apps') { showPage('apps'); }
      else if (id === 'hdmi1' || id === 'hdmi2') { var n = id === 'hdmi1' ? 1 : 2; TizenService.getSources(function (sources) { var source = sources.filter(function (item) { return item.type === 'HDMI' && item.number === n; })[0]; if (source) { TizenService.setSource(source, function () { report('Switched to HDMI ' + n); }, function (error) { report('Could not switch input.', error); }); } }); }
      else { var app = allApps.filter(function (item) { return item.id === id || (id === 'prime' && /prime/i.test(item.name || '')); })[0]; if (app) { launch(app.id, app.name || app.id); } else { launch(id, button.getAttribute('aria-label') || id); } }
    });
  });

  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target.closest('button,[role="button"]') : null;
    if (target && window.AudioController) { window.AudioController.play('select'); }
  }, true);
  document.addEventListener('keydown', function (event) {
    var code = event.keyCode || event.which;
    if (code === 37 || code === 38 || code === 39 || code === 40) { if (window.AudioController) { window.AudioController.play('nav'); } }
    if (code === 10009 || code === 27 || code === 8) {
      event.preventDefault();
      if (window.AudioController) { window.AudioController.play('back'); }
      if (!$('exit-dialog').hidden) { exitDialog(false); }
      else if (!$('settings-confirm').hidden) { closeSettingsDialog(); }
      else if (currentPage === 'settings') { showPage('home'); }
      else if (editingApps) { editingApps = false; renderCurrentPage(); }
      else if (currentPage !== 'home') { showPage('home'); }
      else { exitDialog(true); }
    } else if (code === 406) { event.preventDefault(); showPage('settings'); var category = document.querySelector('.settings-category.active'); if (category) { category.focus(); } }
    else if (currentPage === 'settings' && code === 39 && document.activeElement.classList.contains('settings-category')) { event.preventDefault(); var panelControl = $('settings-panel-' + currentPanel).querySelector('button,input,select,[tabindex="0"]'); if (panelControl) { panelControl.focus(); } }
    else if (currentPage === 'settings' && code === 37 && $('settings-panel-' + currentPanel).contains(document.activeElement)) { event.preventDefault(); var activeCategory = document.querySelector('.settings-category.active'); if (activeCategory) { activeCategory.focus(); } }
    else if (currentPage === 'settings' && (code === 38 || code === 40) && document.activeElement.classList.contains('settings-category')) { event.preventDefault(); var categories = Array.prototype.slice.call($$('.settings-category')), ci = categories.indexOf(document.activeElement); categories[Math.max(0, Math.min(categories.length - 1, ci + (code === 38 ? -1 : 1)))].focus(); }
    else if (code >= 37 && code <= 40 && !(document.activeElement.tagName === 'INPUT' && (code === 37 || code === 39))) { event.preventDefault(); moveFocus(code); }
    else if (code === 13 && document.activeElement.tagName === 'BUTTON' && !event.repeat) { event.preventDefault(); document.activeElement.click(); }
    else if (code === 9) {
      var list = visibleControls(), index = list.indexOf(document.activeElement);
      if (list.length) { event.preventDefault(); list[Math.max(0, Math.min(list.length - 1, index + (event.shiftKey ? -1 : 1)))].focus(); }
    }
  });
  document.addEventListener('visibilitychange', function () {
    clearTimeout(launchTimer); ++launchGeneration;
    if ($('launch-feedback')) { $('launch-feedback').hidden = true; }
    if (!document.hidden) { launching = false; previewBlocked = false; previewNeedsShow = true; refreshApps(); readCurrentSource(); }
    syncPreview();
  });
  window.addEventListener('resize', function () { previewNeedsShow = true; syncPreview(); });

  loadPrefs(); applyName(); applyBackground(prefs.background, false); applyExperience(); syncSettingsControls(); renderWallpaperChoices(); applyHomePreferences();
  if (window.AudioController) { window.AudioController.configure({ enabled: prefs.sounds, volume: prefs.soundVolume / 100, startup: prefs.startupSound }); }
  $('theme-select').value = prefs.theme; $('background-path-enhanced').value = prefs.background;
  $('system-toggle').setAttribute('aria-pressed', String(prefs.system)); $('system-toggle').textContent = prefs.system ? 'On' : 'Off';
  updatePreviewToggle(); clock(); setInterval(clock, 30000); initIcons(); updateDiagnostics();
  if (TizenService.isTV()) { TizenService.registerKey('ColorF3Blue'); }
  refreshApps(); readCurrentSource(); setHomeDestination();
  requestAnimationFrame(function () { requestAnimationFrame(function () { syncPreview(); }); });
}());

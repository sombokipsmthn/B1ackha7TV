(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var storageKey = 'b1ackha7tv.settings.v1';
var tv = window.tizen;

// Track current page
var currentPage = 'home';
var recentApps = [];

// Initialize Lucide icons after DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    lucide.createIcons();
  } catch (e) {
    report('Lucide icon initialization failed:', e);
  }
});

// Browser demo mock - only create if no working Tizen mock already exists
// (tests inject their own window.tizen mock via addInitScript; we must not overwrite it)
var isBrowser = typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.indexOf('Tizen') === -1;
var hasWorkingMock = tv && tv.application && typeof tv.application.getAppsInfo === 'function';
if ((isBrowser || !tv || !tv.application || !tv.application.getAppsInfo || !tv.tvwindow) && !hasWorkingMock) {
  window.tizen = {
    ApplicationControl: function(operation) { this.operation = operation; },
    application: {
      getCurrentApplication: function() { return { appInfo: { id: 'self' } }; },
      getAppsInfo: function(cb) {
        cb([
          { id: 'youtube', name: 'YouTube', show: true, iconPath: '' },
          { id: 'netflix', name: 'Netflix', show: true, iconPath: '' },
          { id: 'prime', name: 'Prime Video', show: true, iconPath: '' },
          { id: 'disney', name: 'Disney+', show: true, iconPath: '' },
          { id: 'apple.tv', name: 'Apple TV', show: true, iconPath: '' },
          { id: 'hulu', name: 'Hulu', show: true, iconPath: '' },
          { id: 'paramount', name: 'Paramount+', show: true, iconPath: '' },
          { id: 'peacock', name: 'Peacock', show: true, iconPath: '' },
          { id: 'plex', name: 'Plex', show: true, iconPath: '' },
          { id: 'tubi', name: 'Tubi', show: true, iconPath: '' }
        ]);
      },
      launch: function(id, success, error) { success(); },
      launchAppControl: function(control, id, success, error) { success(); },
      findAppControl: function(control, success, error) { error({name: 'NotFoundError'}); }
    },
    tvwindow: {
      getSource: function() { return { type: 'TV', number: 0 }; },
      show: function(success) { success(); },
      hide: function(success) { success(); }
    },
    systeminfo: {
      getPropertyValue: function(key, cb) {
        if (key === 'VIDEOSOURCE') {
          cb({ connected: [
            { type: 'TV', number: 0 },
            { type: 'HDMI', number: 1 },
            { type: 'HDMI', number: 2 }
          ]});
        }
      }
    },
    tvinputdevice: {
      registerKey: function() {}
    }
  };
  tv = window.tizen;
}

  var prefs = {name:'My TV', theme:'cinematic', background:'', backgroundVersion:2, preview:true, system:false, favorites:null};

// Initialize Lucide icons after DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    lucide.createIcons();
  } catch (e) {
    report('Lucide icon initialization failed:', e);
  }
});
  var editingApps = false;
  var iconResults = Object.create(null), iconCache = Object.create(null);
  var apps = [], log = [], returnFocus, exitFocus;
  var windowVisible = false, windowBusy = false, launching = false, previewBlocked = false;
  var previewNeedsShow = true;
  var launchTimer = null, imageRequest = 0, appRequest = 0;
  var launchGeneration = 0;
  var themes = {
    cinematic:'linear-gradient(rgba(5,10,20,.25),rgba(5,10,20,.5)),url("assets/VWMK740-01059.jpg")',
    midnight:'radial-gradient(ellipse at 10% 0%,#244357 0%,transparent 55%),linear-gradient(130deg,#131b33,#090e1b)',
    aurora:'radial-gradient(ellipse at 0% 0%,#24746c 0%,transparent 60%),linear-gradient(130deg,#20224c,#101426)',
    ember:'radial-gradient(ellipse at 0% 0%,#854b39 0%,transparent 60%),linear-gradient(130deg,#3d263c,#121325)'
  };
  var clockTimer = null;

  function showPage(pageId) {
    // Hide all page sections
    var pages = document.querySelectorAll('.page-section, #apps-section, #continue-section, #trending-section');
    pages.forEach(function(page) { page.hidden = true; });

    // Show the target page
    var targetPage = $(pageId + '-page');
    if (targetPage) { targetPage.hidden = false; }

    // Update sidebar active state
    var sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-section') === pageId);
    });

    currentPage = pageId;

    // Update greeting/subtitle based on page
    var pageTitles = {
      'home': { greeting: 'Good evening', subtitle: 'Relax. You\'ve got great things to watch.' },
      'search': { greeting: 'Search', subtitle: 'Find your favorite content.' },
      'apps': { greeting: 'Apps', subtitle: 'Your installed applications.' },
      'games': { greeting: 'Games', subtitle: 'Discover and play games.' },
      'recent': { greeting: 'Recent', subtitle: 'Recently launched apps and games.' },
      'inputs': { greeting: 'Inputs', subtitle: 'Select input source.' },
      'settings': { greeting: 'Settings', subtitle: 'Customize your experience.' }
    };
    var t = pageTitles[pageId] || pageTitles.home;
    var g = $('greeting');
    var s = document.querySelector('.subtitle');
    if (g) g.textContent = t.greeting;
    if (s) s.textContent = t.subtitle;

    // Initialize page-specific content
    if (pageId === 'apps') { renderAppsPage(); }
    else if (pageId === 'games') { renderGamesPage(); }
    else if (pageId === 'recent') { renderRecentPage(); }
    else if (pageId === 'inputs') { renderInputsPage(); }
    else if (pageId === 'search') { renderSearchPage(); }
  }

  function report(message, error) {
    var detail = error ? ' [' + (error.name || 'Error') + ': ' + (error.message || 'No details') + ']' : '';
    var statusEl = $('status');
    if (statusEl) statusEl.textContent = message + detail;
    log.push(new Date().toLocaleTimeString() + ' ' + message + detail);
    if (log.length > 16) { log.shift(); }
    var diagEl = $('diagnostics');
    if (diagEl) diagEl.textContent = log.join('\n');
  }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(prefs)); }
    catch (e) { report('Settings work this session, but could not be saved.', e); }
  }
  function focus(el) { if (el && !el.disabled) { el.focus(); } }
  function loadPrefs() {
    try {
      var stored = localStorage.getItem(storageKey);
      var migratedLegacy = false;
      if (!stored) {
        stored = localStorage.getItem('kipsmthntheme.settings.v1');
        migratedLegacy = !!stored;
      }
      var saved = JSON.parse(stored || '{}');
      if (saved && typeof saved === 'object') {
        if (typeof saved.name === 'string') { prefs.name = cleanName(saved.name); }
        if (Object.prototype.hasOwnProperty.call(themes, saved.theme)) { prefs.theme = saved.theme; }
        if (typeof saved.background === 'string') { prefs.background = saved.background; }
        if (typeof saved.preview === 'boolean') { prefs.preview = saved.preview; }
        if (typeof saved.system === 'boolean') { prefs.system = saved.system; }
        if (Array.isArray(saved.favorites)) { prefs.favorites = saved.favorites.filter(function (id) { return typeof id === 'string'; }); }
        if (saved.backgroundVersion !== 2) {
          prefs.background = '';
          save();
        } else if (migratedLegacy) {
          // Move preferences from the earlier MyTvTheme storage key without losing favourites.
          save();
        }
      }
    } catch (e) { report('Saved settings could not be read; using defaults.', e); }
  }
  function cleanName(value) {
    return value.replace(/[-]/g,'').replace(/\s+/g,' ').trim().slice(0,32).trim() || 'My TV';
  }
  function applyName() {
    var titleEl = $('launcher-title');
    var markEl = $('launcher-mark');
    var nameInput = $('launcher-name');
    if (titleEl) titleEl.textContent = prefs.name;
    if (markEl) markEl.textContent = prefs.name.split(' ').map(function (word) { return word.charAt(0); }).join('').slice(0,2).toUpperCase();
    if (nameInput) nameInput.value = prefs.name;
    document.title = prefs.name;
  }
  function safeImagePath(path) {
    return /^(?:assets\/)[a-zA-Z0-9_\-\/ .]+\.(?:png|jpe?g|webp)$/i.test(path) && path.indexOf('..') === -1;
  }
  function background(path, persist) {
    var request = ++imageRequest;
    var wallpaper = $('wallpaper');
    if (wallpaper) wallpaper.style.backgroundImage = themes[prefs.theme];
    if (!path) { return; }
    if (!safeImagePath(path)) { report('Use a packaged image path such as assets/background.jpg.'); return; }
    var img = new Image();
    img.onload = function () {
      if (request !== imageRequest) { return; }
      if (wallpaper) wallpaper.style.backgroundImage = 'linear-gradient(rgba(5,10,20,.25),rgba(5,10,20,.5)),url("' + path + '")';
      if (persist) { prefs.background = path; save(); report('Custom background saved.'); }
    };
    img.onerror = function () { if (request === imageRequest) { report('Image was not found in the app package.'); } };
    img.src = path;
  }

  function appGroupKey(app) {
    var name = (app.name || '').toLowerCase().replace(/[®™]/g,'').replace(/\+/g,'plus').replace(/[^a-z0-9]/g,'');
    if (/^(amazonprimevideo|primevideo|amazonvideo)$/.test(name)) { return 'brand:prime-video'; }
    if (name === 'disneyplus') { return 'brand:disney-plus'; }
    return 'id:' + app.id;
  }
  function uniqueApps(ownId) {
    var groups = Object.create(null), aliases = Object.create(null), catalog = [];
    apps.forEach(function (app) {
      if (!app || !app.id || app.id === ownId) { return; }
      var key = appGroupKey(app);
      if (!groups[key]) { groups[key] = []; }
      groups[key].push(app);
    });
    Object.keys(groups).forEach(function (key) {
      var group = groups[key];
      group.sort(function (a,b) {
        var visibleDifference = Number(a.show === false) - Number(b.show === false);
        if (visibleDifference) { return visibleDifference; }
        var aIndex = (prefs.favorites || []).indexOf(a.id), bIndex = (prefs.favorites || []).indexOf(b.id);
        if (aIndex < 0) { aIndex = Infinity; } if (bIndex < 0) { bIndex = Infinity; }
        if (aIndex !== bIndex) { return aIndex < bIndex ? -1 : 1; }
        return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
      });
      catalog.push(group[0]);
      group.forEach(function (app) { aliases[app.id] = group[0].id; });
    });
    if (prefs.favorites !== null) {
      var selected = [];
      prefs.favorites.forEach(function (id) {
        var canonical = aliases[id] || id;
        if (selected.indexOf(canonical) === -1) { selected.push(canonical); }
      });
      if (JSON.stringify(selected) !== JSON.stringify(prefs.favorites)) { prefs.favorites = selected; save(); }
    }
    return {catalog:catalog, aliases:aliases};
  }
  function renderApps() {
    var oldId = document.activeElement && document.activeElement.getAttribute('data-app-id');
    var appsDiv = $('apps');
    if (appsDiv) appsDiv.textContent = '';
    var ownId = '';
    try { ownId = tv.application.getCurrentApplication().appInfo.id; } catch (ignore) { }
    var unique = uniqueApps(ownId);
    oldId = unique.aliases[oldId] || oldId;
    var visible = unique.catalog.filter(function (app) { return prefs.system || app.show !== false; });
    visible.sort(function (a,b) { return (a.name || a.id).localeCompare(b.name || b.id); });
    if (prefs.favorites === null && visible.length) {
      var main = visible.filter(function (app) { return /netflix|youtube|prime video|amazon|disney|hulu|peacock|paramount|apple tv|spectrum|pluto|tubi|plex|\bmax\b/i.test(app.name || ''); });
      prefs.favorites = (main.length ? main : visible).slice(0,9).map(function (app) { return app.id; });
      save();
    }
    if (!editingApps) {
      visible = unique.catalog.filter(function (app) { return (prefs.favorites || []).indexOf(app.id) !== -1; });
      visible.sort(function (a,b) { return prefs.favorites.indexOf(a.id) - prefs.favorites.indexOf(b.id); });
    }
    var appsDiv2 = $('apps');
    if (appsDiv2) {
      visible.forEach(function (app) {
        var button = document.createElement('button'); button.className = 'app'; button.setAttribute('data-app-id', app.id);
        button.title = app.name || app.id;
        var initial = document.createElement('span'); initial.className = 'initial'; initial.textContent = (app.name || '?').slice(0,2).toUpperCase(); button.appendChild(initial);
        loadAppIcon(app,button,initial);
        var name = document.createElement('span'); name.className = 'app-name'; name.textContent = app.name || app.id; button.appendChild(name);
        if (editingApps) {
          var selected = (prefs.favorites || []).indexOf(app.id) !== -1;
          button.setAttribute('aria-pressed', String(selected));
          var action = document.createElement('span'); action.className = 'app-action'; action.textContent = selected ? '✓ On Home · Remove' : '+ Add to Home'; button.appendChild(action);
        }
        button.onclick = function () {
          if (!editingApps) { launch(app.id, app.name || app.id); return; }
          if (prefs.favorites === null) { prefs.favorites = []; }
          var index = prefs.favorites.indexOf(app.id);
          if (index === -1) { prefs.favorites.push(app.id); }
          else { prefs.favorites.splice(index,1); }
          save(); renderApps(); report((index === -1 ? 'Added ' : 'Removed ') + (app.name || app.id) + (index === -1 ? ' to Home.' : ' from Home.'));
        };
        appsDiv2.appendChild(button);
        if (oldId === app.id) { focus(button); }
      });
    }
    var lt = $('library-title');
    if (lt) lt.textContent = editingApps ? 'Add or remove apps' : 'Your main apps';
    var ea = $('edit-apps');
    if (ea) ea.textContent = editingApps ? 'Done editing apps' : 'Edit apps';
    var eh = $('edit-hint');
    if (eh) eh.hidden = !editingApps;
    if (appsDiv2) appsDiv2.classList.toggle('editing', editingApps);
    var ac = $('app-count');
    if (ac) ac.textContent = visible.length + (editingApps ? ' available' : ' on Home');
    var emptyEl = $('empty');
    if (emptyEl) {
      emptyEl.hidden = visible.length > 0;
      if (!visible.length) { emptyEl.textContent = tv ? (editingApps ? 'No apps returned. Try Refresh apps or show system entries in Settings.' : 'Choose Edit apps to add your favorite apps to Home.') : 'Open B1ackha7TV on your Samsung TV to see installed apps. TV apps and live input are unavailable in a PC browser.'; }
    }
    if (oldId && document.activeElement === document.body) { focus($('refresh')); }
  }
  function refreshApps() {
    iconCache = Object.create(null); iconResults = Object.create(null);
    if (!tv || !tv.application || !tv.application.getAppsInfo) { renderApps(); report('Browser preview — TV features need the TV.'); return; }
    var request = ++appRequest;
    try {
      tv.application.getAppsInfo(function (list) {
        if (request !== appRequest) { return; }
        apps = list || []; renderApps(); report('App list refreshed.');
      }, function (e) { if (request === appRequest) { report('The TV could not list apps.', e); renderApps(); } });
    } catch (e) { report('App discovery is unavailable.', e); renderApps(); }
  }
  function iconSummary() {
    var missing = Object.keys(iconResults).filter(function (id) { return iconResults[id].failed; }).map(function (id) { return iconResults[id].name; });
    var is = $('icon-status');
    if (is) is.textContent = missing.length ? 'Pictures unavailable: ' + missing.join(', ') + '. Select Refresh apps to retry.' : 'No missing pictures detected among checked apps.';
  }
  function loadAppIcon(app,button,initial) {
    var image = document.createElement('img'), paths = [], seen = Object.create(null);
    var timer, attempt = 0, refreshed = false, resolved = false, bundled = false, original = app.iconPath || '';
    var cacheKey = app.id + '\n' + original;
    image.alt = ''; image.hidden = true; button.appendChild(image);
    function add(value) {
      if (typeof value !== 'string' || !value || seen[value]) { return; }
      seen[value] = true; paths.push(value);
      if (value.charAt(0) === '/' && value.charAt(1) !== '/') {
        var uri = 'file://' + value.split('/').map(encodeURIComponent).join('/');
        if (!seen[uri]) { seen[uri] = true; paths.push(uri); }
      }
    }
    function finish(failed) {
      clearTimeout(timer); image.onload = image.onerror = null;
      image.hidden = failed; initial.hidden = !failed;
      if (!failed) { iconCache[cacheKey] = image.getAttribute('src'); }
      iconResults[app.id] = {name:app.name || app.id, failed:failed}; iconSummary();
    }
    function next() {
      clearTimeout(timer);
      if (paths.length) {
        var token = ++attempt, candidate = paths.shift();
        image.onload = function () { if (token === attempt) { finish(false); } };
        image.onerror = function () { if (token === attempt) { next(); } };
        timer = setTimeout(function () { if (token === attempt) { next(); } },3000);
        image.src = candidate; return;
      }
      if (!refreshed) {
        refreshed = true;
        try { if (tv && tv.application && tv.application.getAppInfo) { add(tv.application.getAppInfo(app.id).iconPath); } } catch (ignore) { }
        if (paths.length) { next(); return; }
      }
      if (!resolved && original && tv && tv.filesystem && tv.filesystem.resolve) {
        resolved = true;
        var finishedResolve = false;
        function resume(value) { if (finishedResolve) { return; } finishedResolve = true; clearTimeout(timer); add(value); next(); }
        timer = setTimeout(function () { resume(''); },3000);
        try { tv.filesystem.resolve(original,function (file) {
          try { resume(file.toURI()); } catch (ignore) { resume(''); }
        },function () { resume(''); },'r'); } catch (ignore) { resume(''); }
        return;
      }
      if (!bundled && /^(amazon)?primevideo$/.test((app.name || '').toLowerCase().replace(/[^a-z0-9]/g,''))) {
        bundled = true; add('assets/prime-video.svg'); next(); return;
      }
      finish(true);
    }
    if (iconCache[cacheKey]) { add(iconCache[cacheKey]); }
    add(original); next();
  }

  // Clock
  function updateClock() {
    var clockEl = $('clock');
    var dateEl = $('date');
    if (clockEl) clockEl.textContent = new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
    if (dateEl) {
      var now = new Date();
      dateEl.textContent = now.toLocaleDateString([], {weekday:'long',year:'numeric',month:'long',day:'numeric'});
    }
  }

  // Sidebar navigation
  function initSidebar() {
    var sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(function(btn) {
      var targetSection = btn.getAttribute('data-section');
      if (targetSection) {
        btn.onclick = function(e) {
          e.preventDefault();
          showPage(targetSection);
        };
      }
    });
  }

  // Carousel keyboard navigation
  function initCarouselNavigation() {
    var carousels = document.querySelectorAll('.carousel');
    carousels.forEach(function(carousel) {
      carousel.addEventListener('keydown', function(e) {
        var items = carousel.querySelectorAll('.carousel-item');
        if (items.length === 0) return;
        var activeIndex = Array.from(items).findIndex(function(item) { return item === document.activeElement || item.classList.contains('active'); });
        if (activeIndex === -1) activeIndex = 0;

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          var nextIndex = Math.min(activeIndex + 1, items.length - 1);
          items[nextIndex].focus();
          items[nextIndex].scrollIntoView({behavior: 'smooth', inline: 'center'});
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          var prevIndex = Math.max(activeIndex - 1, 0);
          items[prevIndex].focus();
          items[prevIndex].scrollIntoView({behavior: 'smooth', inline: 'center'});
        }
      });

      // Auto-set active class on focus
      var items = carousel.querySelectorAll('.carousel-item');
      items.forEach(function(item) {
        item.addEventListener('focus', function() {
          items.forEach(function(i) { i.classList.remove('active'); });
          item.classList.add('active');
          // Trigger preview for focused carousel item
          var meta = getPreviewMeta(item);
          if (meta && window.B1ackha7Preview) { window.B1ackha7Preview.start(meta); }
        });
      });

      // Stop preview when leaving carousel
      carousel.addEventListener('focusout', function(e) {
        if (!carousel.contains(e.relatedTarget) && window.B1ackha7Preview) {
          window.B1ackha7Preview.stop();
        }
      });

      // Set first item active initially
      if (items.length > 0) items[0].classList.add('active');
    });
  }

  // Preview metadata mapping for carousel items
  var PREVIEW_META = {
    'youtube': { preview: '', artwork: '', background: '', fullBackground: true },
    'netflix': { preview: '', artwork: '', background: '', fullBackground: true },
    'prime': { preview: '', artwork: '', background: '', fullBackground: true },
    'all-apps': { preview: '', artwork: '', background: '', fullBackground: false },
    'hdmi1': { preview: '', artwork: '', background: '', fullBackground: false },
    'hdmi2': { preview: '', artwork: '', background: '', fullBackground: false },
    'last-of-us': { preview: '', artwork: '', background: '', fullBackground: true },
    'dune': { preview: '', artwork: '', background: '', fullBackground: true },
    'ted-lasso': { preview: '', artwork: '', background: '', fullBackground: true },
    'our-planet': { preview: '', artwork: '', background: '', fullBackground: true },
    'trending-1': { preview: '', artwork: '', background: '', fullBackground: true },
    'trending-2': { preview: '', artwork: '', background: '', fullBackground: true },
    'trending-3': { preview: '', artwork: '', background: '', fullBackground: true },
    'trending-4': { preview: '', artwork: '', background: '', fullBackground: true }
  };

  function getPreviewMeta(element) {
    var id = element.getAttribute('data-app-id') || element.getAttribute('data-content-id');
    return id ? PREVIEW_META[id] : null;
  }

  // App launching (preserves original logic)
  function launch(id, name, appControl) {
    if (launching) { return; }
    if (!tv || !tv.application || typeof tv.application.launch !== 'function') { report('Launching apps is unavailable on this device.'); return; }
    var generation = ++launchGeneration, attempt = 0, routes = [], index = 0;
    var canControl = typeof tv.ApplicationControl === 'function' && typeof tv.application.launchAppControl === 'function';
    function add(target) {
      if (routes.some(function (route) { return route.id === target; })) { return; }
      routes.push({id:target,control:appControl || null});
      if (!appControl && canControl) { routes.push({id:target,control:'default'}); }
    }
    add(id);
    if (!appControl) {
      var selected = apps.filter(function (app) { return app.id === id; })[0];
      if (selected && appGroupKey(selected).indexOf('brand:') === 0) {
        apps.filter(function (app) { return appGroupKey(app) === appGroupKey(selected) && app.id !== id; })
          .sort(function (a,b) { return (a.show === false ? 1 : 0) - (b.show === false ? 1 : 0); })
          .slice(0,2).forEach(function (app) { add(app.id); });
      }
    }
    function message(text, error) {
      var lf = $('launch-feedback');
      if (lf) {
        lf.hidden = false;
        lf.textContent = text + (error && error.name ? ' (' + error.name + ')' : '');
      }
      report(text,error);
    }
    function active(token) { return generation === launchGeneration && attempt === token && launching && !document.hidden; }
    function stop(error) {
      clearTimeout(launchTimer); ++launchGeneration; launching = false;
      previewBlocked = false; previewNeedsShow = true;
// Ensure the preview element is in view before attempting to show it.
      // When settings or other overlays are open the preview may have scrolled off-screen.
      var previewEl = $('preview-picture');
      if (previewEl) { try { previewEl.scrollIntoView({block: 'nearest'}); } catch (ignore) { } }
      syncPreview();
      message('Could not open ' + name + '. You can try another app or open it from Samsung Home.',error);
    }
    function next(error) {
      clearTimeout(launchTimer);
      if (generation !== launchGeneration || document.hidden) { return; }
      if (index >= routes.length) { stop(error || {name:'LaunchTimeout'}); return; }
      var route = routes[index++], token = ++attempt, answered = false;
      message(index === 1 ? 'Opening ' + name + '…' : 'Trying another way to open ' + name + '…');
      launchTimer = setTimeout(function () { if (active(token)) { next({name:'LaunchTimeout'}); } }, 8000);
      function failed(e) {
        if (!active(token) || answered) { return; }
        answered = true;
        if (e && /^(NotFoundError|UnknownError|NotSupportedError)$/.test(e.name)) { next(e); }
        else { stop(e); }
      }
      function accepted() {
        if (!active(token) || answered) { return; }
        answered = true;
        message('Waiting for ' + name + ' to appear…');
      }
      try {
        var control = route.control === 'default' ? new tv.ApplicationControl('http://tizen.org/appcontrol/operation/default',null,null,null,null,'SINGLE') : route.control;
        if (control) { tv.application.launchAppControl(control, route.id, accepted, failed); }
        else { tv.application.launch(route.id, accepted, failed); }
      } catch (e) { failed(e); }
    }
    launching = true;
    syncPreview();
    next();
    // Track in recent apps
    addToRecent(id, name, 'launcher');
  }

  // App carousel click handlers
  function initAppCarousel() {
    var appItems = document.querySelectorAll('#apps-carousel .carousel-item');
    appItems.forEach(function(item) {
      item.addEventListener('click', function() {
        var appId = this.getAttribute('data-app-id');
        var appNames = {
          'youtube': 'YouTube',
          'netflix': 'Netflix',
          'prime': 'Prime Video',
          'all-apps': 'All Apps',
          'hdmi1': 'HDMI 1',
          'hdmi2': 'HDMI 2'
        };
        if (appId === 'hdmi1' || appId === 'hdmi2') {
          // Handle HDMI input switching
          var sourceNum = appId === 'hdmi1' ? 1 : 2;
          if (tv && tv.tvwindow && tv.systeminfo) {
            tv.systeminfo.getPropertyValue('VIDEOSOURCE', function(info) {
              var sources = info.connected || [];
              var hdmi = sources.find(function(s) { return s.type === 'HDMI' && s.number === sourceNum; });
              if (hdmi && tv.tvwindow.setSource) {
                tv.tvwindow.setSource(hdmi, function() { report('Switched to HDMI ' + sourceNum); }, function(e) { report('Could not switch input', e); }, 'MAIN');
              }
            });
          }
        } else {
          launch(appId, appNames[appId] || appId);
        }
      });
    });
  }

  // Edit apps toggle
  var editBtn = $('edit-apps');
  if (editBtn) {
    editBtn.addEventListener('click', function () {
      editingApps = !editingApps;
      renderApps();
      if (!editingApps) { focus($('edit-apps')); }
    });
  }
  // Refresh apps
  var refreshBtn = $('refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () { refreshApps(); });
  }

  // Settings view toggle
  function settings(open) {
    var settingsEl = $('settings');
    if (!settingsEl) { return; }
    settingsEl.hidden = !open;
    if (open) {
      refreshSources();
      focus($('settings-close'));
      updateSettingsDiagnostics();
      // Show Appearance panel by default for test compatibility (has theme buttons)
      var appearanceBtn = document.querySelector('.settings-category[data-panel="appearance"]');
      var appearancePanel = $('settings-panel-appearance');
      if (appearanceBtn && appearancePanel) {
        document.querySelectorAll('.settings-category').forEach(function(b) { b.classList.remove('active'); });
        document.querySelectorAll('.settings-panel').forEach(function(p) { p.hidden = true; });
        appearanceBtn.classList.add('active');
        appearancePanel.hidden = false;
      }
    }
  }
  var settingsOpen = $('settings-open');
  if (settingsOpen) { settingsOpen.addEventListener('click', function () { settings(true); }); }
  var settingsClose = $('settings-close');
  if (settingsClose) { settingsClose.addEventListener('click', function () { settings(false); }); }
  var tvSettingsOpen = $('tv-settings-open') || $('tv-settings-open-enhanced');
  if (tvSettingsOpen) { tvSettingsOpen.addEventListener('click', openTVSettings); }
  var sourcesRefresh = $('sources-refresh');
  if (sourcesRefresh) { sourcesRefresh.addEventListener('click', refreshSources); }
  var closeApp = $('close-app');
  if (closeApp) { closeApp.addEventListener('click', function () { exitDialog(true); }); }
  var closeAppSettings = $('close-app-settings');
  if (closeAppSettings) { closeAppSettings.addEventListener('click', function () { exitDialog(true); }); }

  // Settings panel navigation
  var settingsCategories = document.querySelectorAll('.settings-category');
  var settingsPanels = document.querySelectorAll('.settings-panel');
  settingsCategories.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var panelId = this.getAttribute('data-panel');
      settingsCategories.forEach(function(b) { b.classList.remove('active'); });
      settingsPanels.forEach(function(p) { p.hidden = true; });
      this.classList.add('active');
      var panel = $('settings-panel-' + panelId);
      if (panel) panel.hidden = false;
    });
  });

  // System toggle
  function updateSystemToggle() {
    var systemToggle = $('system-toggle');
    if (!systemToggle) { return; }
    systemToggle.classList.toggle('active', prefs.system);
    systemToggle.setAttribute('aria-pressed', String(prefs.system));
    systemToggle.title = 'Show system entries: ' + (prefs.system ? 'On' : 'Off');
  }
  var systemToggle = $('system-toggle');
  if (systemToggle) {
    systemToggle.addEventListener('click', function () {
      prefs.system = !prefs.system;
      save();
      updateSystemToggle();
      renderApps();
      if (typeof renderAppsPage === 'function') renderAppsPage();
    });
  }

  // Theme select
  var themeSelect = $('theme-select');
  if (themeSelect) {
    themeSelect.value = prefs.theme;
    themeSelect.addEventListener('change', function() {
      prefs.theme = this.value; prefs.background = '';
      var bp = $('background-path') || $('background-path-enhanced');
      if (bp) bp.value = '';
      background(''); save(); report('Background saved.');
      try { lucide.createIcons(); } catch (e) { /* ignore */ }
    });
  }

  // Background apply
  var backgroundApply = $('background-apply');
  if (backgroundApply) { backgroundApply.addEventListener('click', function () { background(($('background-path') || $('background-path-enhanced')).value.trim(), true); }); }

  // Name save
  var nameSave = $('name-save');
  if (nameSave) {
    nameSave.addEventListener('click', function () {
      var input = $('launcher-name');
      if (input) { prefs.name = cleanName(input.value); save(); applyName(); report('Launcher name saved.'); }
    });
  }
  var nameReset = $('name-reset');
  if (nameReset) {
    nameReset.addEventListener('click', function () {
      prefs.name = 'My TV'; save(); applyName(); report('Launcher name reset.');
    });
  }

  // Apps refresh from settings
  var appsRefreshSettings = $('apps-refresh-settings');
  if (appsRefreshSettings) { appsRefreshSettings.onclick = refreshApps; }

  // Manage visibility
  var manageVisibility = $('manage-visibility');
  if (manageVisibility) {
    manageVisibility.onclick = function() {
      settings(false);
      showPage('apps');
      report('Use the Apps page to manage visibility.');
    };
  }

  function updateSettingsDiagnostics() {
    // Tizen environment
    var tizenEnv = $('tizen-env');
    if (tizenEnv) {
      if (tv) tizenEnv.textContent = 'Available (Tizen ' + (tv.systeminfo ? 'with systeminfo' : 'limited') + ')';
      else tizenEnv.textContent = 'Browser Preview (mock)';
    }
    // TV integration
    var tvInt = $('tv-integration');
    if (tvInt) {
      if (tv && tv.tvwindow) tvInt.textContent = 'Available (tvwindow API)';
      else tvInt.textContent = 'Unavailable in browser';
    }
    // App discovery
    var appDisc = $('app-discovery');
    if (appDisc) {
      if (tv && tv.application && tv.application.getAppsInfo) appDisc.textContent = 'Available';
      else appDisc.textContent = 'Unavailable in browser';
    }
    // Input integration
    var inputInt = $('input-integration');
    if (inputInt) {
      if (tv && tv.systeminfo) inputInt.textContent = 'Available (systeminfo API)';
      else inputInt.textContent = 'Unavailable in browser';
    }
    // Run mode
    var runMode = $('run-mode');
    if (runMode) {
      if (tv) runMode.textContent = 'Physical TV';
      else runMode.textContent = 'Browser Preview (mock)';
    }
  }
  var exitCancel = $('exit-cancel');
  if (exitCancel) { exitCancel.addEventListener('click', function () { exitDialog(false); }); }
  var exitConfirm = $('exit-confirm');
  if (exitConfirm) {
    exitConfirm.addEventListener('click', function () {
      if (!tv || !tv.application) { exitDialog(false); report('This browser preview can be closed with its tab.'); return; }
      launching = true;
      try { if (tv.tvwindow) { tv.tvwindow.hide(function () {}, function () {}, 'MAIN'); } } catch (ignore) { /* Best-effort cleanup. */ }
      try { tv.application.getCurrentApplication().exit(); }
      catch (e) { launching = false; exitDialog(false); report('Could not close the app.', e); syncPreview(); }
    });
  }

  // Watch TV full screen
  var watchTv = $('watch-tv');
  if (watchTv) { watchTv.addEventListener('click', function () { launch('org.tizen.tv-viewer', 'TV'); }); }

  // Preview retry / toggle
  var previewRetry = $('preview-retry');
  if (previewRetry) { previewRetry.addEventListener('click', retryPreview); }
  var previewToggle = $('preview-toggle');
  if (previewToggle) {
    previewToggle.addEventListener('click', function () {
      prefs.preview = !prefs.preview; previewBlocked = false; save(); updatePreviewToggle(); syncPreview();
    });
  }

  // TV input preview (preserves original logic)
  function wantedPreview() { return prefs.preview && !document.hidden && !launching && !previewBlocked; }
  function previewLabel(text) { var el = $('preview-message'); if (el) el.textContent = text; }
  function syncPreview(done) {
    if (!tv || !tv.tvwindow) { previewLabel('TV preview is available on the Samsung TV.'); if (done) { done(); } return; }
    if (windowBusy) { if (done) { window.setTimeout(function () { syncPreview(done); }, 50); } return; }
    var desired = wantedPreview();
    if (windowVisible === desired && !(desired && previewNeedsShow)) { if (!desired && !previewBlocked) { previewLabel(prefs.preview ? 'Preview paused.' : 'Preview is off.'); } if (done) { done(); } return; }
    windowBusy = true;
    var settled = false;
    var watchdog = setTimeout(function () { completed({name:'TimeoutError',message:'TV did not respond. Select Retry TV.'}); }, 5000);
    function completed(error) {
      if (settled) {
        if (!error && desired && !wantedPreview()) { windowVisible = true; syncPreview(); }
        return;
      }
      settled = true; clearTimeout(watchdog);
      windowBusy = false;
      if (error) {
        previewNeedsShow = true;
        previewBlocked = true; report('TV preview unavailable. Check input and try again.', error);
        document.body.classList.remove('preview-active');
        previewLabel('Preview unavailable — select Retry TV.');
      } else {
        windowVisible = desired;
        previewNeedsShow = !desired;
        document.body.classList.toggle('preview-active', windowVisible);
        previewLabel(windowVisible ? '' : 'Preview is off.');
      }
      if (!error && wantedPreview() !== windowVisible) { syncPreview(done); }
      else if (done) { done(); }
    }
    try {
      if (desired) {
        var previewEl = $('preview-picture');
        if (!previewEl) { completed({name:'LayoutError',message:'Preview element not found.'}); return; }
        var r = previewEl.getBoundingClientRect();
        var screenW = window.innerWidth || (window.screen && window.screen.width) || 1920;
        var screenH = window.innerHeight || (window.screen && window.screen.height) || 1080;
        if (r.width < 50 || r.height < 50 || r.top >= screenH || r.left >= screenW || (r.top + r.height) <= 0 || (r.left + r.width) <= 0) {
          completed({name:'LayoutError',message:'Preview layout is not ready. Select Retry TV.'});
          return;
        }
        var left = Math.max(0, Math.min(Math.round(r.left), screenW - 100));
        var top = Math.max(0, Math.min(Math.round(r.top), screenH - 100));
        var width = Math.max(100, Math.min(Math.round(r.width), screenW - left));
        var height = Math.max(100, Math.min(Math.round(r.height), screenH - top));
        var rect = [left + 'px', top + 'px', width + 'px', height + 'px'];
        tv.tvwindow.show(function () {
          completed();
          if (typeof tv.tvwindow.getRect === 'function' && wantedPreview()) {
            try { tv.tvwindow.getRect(function (actual) { report('TV preview bounds: ' + actual.join(', ')); }, function (e) { report('Could not check TV preview bounds.',e); }, 'px', 'MAIN'); } catch (ignore) { }
          }
        }, function (error) {
          try {
            tv.tvwindow.show(function () {
              completed();
            }, completed, rect, 'MAIN');
          } catch (e) {
            completed(error || e);
          }
        }, rect, 'MAIN', 'FRONT');
      } else { tv.tvwindow.hide(function () { completed(); }, completed, 'MAIN'); }
    } catch (e) { completed(e); }
  }

  function updatePreviewToggle() { var el = $('preview-toggle'); if (el) el.textContent = prefs.preview ? 'Turn off' : 'Turn on'; }

  // ==========================================================================
  // HYBRID CINEMATIC PREVIEW ENGINE
  // ==========================================================================
  // Single shared HTML5 video element for all content previews.
  // Modes: 'full' (fills wallpaper background) | 'floating' (picture-in-picture)
  var previewVideo = null;
  var previewArtwork = null;
  var previewMode = 'none'; // 'none' | 'full' | 'floating'
  var previewActive = false;
  var previewTimer = null;
  var previewDelay = 700; // ms after focus settles before starting preview
  var previewLoading = false;
  var previewError = false;

  function ensurePreviewVideo() {
    if (!previewVideo) {
      previewVideo = document.createElement('video');
      previewVideo.muted = true;
      previewVideo.playsInline = true;
      previewVideo.preload = 'none';
      previewVideo.style.position = 'absolute';
      previewVideo.style.opacity = '0';
      previewVideo.style.transition = 'opacity 0.6s ease';
      previewVideo.addEventListener('error', onPreviewError);
      previewVideo.addEventListener('loadeddata', onPreviewLoaded);
      previewVideo.addEventListener('playing', onPreviewPlaying);
    }
    return previewVideo;
  }

  function onPreviewError() {
    previewError = true;
    previewLoading = false;
    if (previewActive) { showPreviewArtwork(currentPreviewMeta); }
    report('Preview video unavailable; showing artwork instead.');
  }

  function onPreviewLoaded() {
    previewLoading = false;
  }

  function onPreviewPlaying() {
    previewLoading = false;
  }

  function stopPreview() {
    if (!previewActive) { return; }
    previewActive = false;
    clearTimeout(previewTimer);
    if (previewVideo) {
      try { previewVideo.pause(); } catch (e) { /* ignore */ }
      previewVideo.src = '';
      previewVideo.load();
      previewVideo.style.opacity = '0';
    }
    hidePreviewArtwork();
  }

  function showPreviewArtwork(meta) {
    if (!meta) { return; }
    var bg = meta.artwork || meta.background || '';
    if (!bg) { return; }
    var wallpaper = $('wallpaper');
    if (!wallpaper) { return; }
    wallpaper.style.backgroundImage = 'linear-gradient(rgba(5,8,16,0.3),rgba(5,8,16,0.55)),url("' + bg + '")';
    wallpaper.style.backgroundSize = 'cover';
    wallpaper.style.backgroundPosition = 'center 40%';
  }

  function hidePreviewArtwork() {
    // Restore theme-based wallpaper
    var wallpaper = $('wallpaper');
    if (wallpaper) { wallpaper.style.backgroundImage = themes[prefs.theme]; }
  }

  function setPreviewMode(mode) {
    if (mode === previewMode) { return; }
    var floating = $('preview-floating');
    var wallpaper = $('wallpaper');
    if (mode === 'full') {
      if (wallpaper) { wallpaper.classList.add('preview-active'); }
      if (floating) { floating.hidden = true; }
      if (previewVideo) { previewVideo.style.position = 'absolute'; previewVideo.style.inset = '0'; }
    } else if (mode === 'floating') {
      if (wallpaper) { wallpaper.classList.remove('preview-active'); }
      if (floating) { floating.hidden = false; }
      if (previewVideo) {
        if (floating) { floating.appendChild(previewVideo); }
        previewVideo.style.position = 'absolute';
        previewVideo.style.inset = '0';
        previewVideo.style.width = '100%';
        previewVideo.style.height = '100%';
        previewVideo.style.objectFit = 'cover';
      }
    } else {
      if (wallpaper) { wallpaper.classList.remove('preview-active'); }
      if (floating) { floating.hidden = true; }
    }
    previewMode = mode;
  }

  var currentPreviewMeta = null;

  function startPreview(meta) {
    if (!meta) { stopPreview(); return; }
    currentPreviewMeta = meta;
    if (!meta.preview && !meta.artwork && !meta.background) {
      // No preview content available — keep artwork only
      stopPreview();
      showPreviewArtwork(meta);
      return;
    }
    // Decide mode based on content and screen space
    var mode = (meta.fullBackground !== false && meta.preview) ? 'full' : 'floating';
    setPreviewMode(mode);
    // Show artwork immediately
    showPreviewArtwork(meta);
    // Delayed video start
    clearTimeout(previewTimer);
    previewError = false;
    previewLoading = true;
    previewTimer = setTimeout(function () {
      if (!previewActive && meta.preview) {
        playPreviewVideo(meta.preview, mode);
      }
    }, previewDelay);
  }

  function playPreviewVideo(src, mode) {
    if (!src) { return; }
    var video = ensurePreviewVideo();
    if (mode === 'full') {
      var wallpaper = $('wallpaper');
      if (wallpaper && video.parentNode !== wallpaper) { wallpaper.appendChild(video); }
    } else {
      var floating = $('preview-floating');
      if (floating && video.parentNode !== floating) { floating.appendChild(video); }
    }
    previewActive = true;
    previewLoading = true;
    video.src = src;
    video.load();
    video.play().catch(function (e) {
      // Autoplay blocked — keep artwork visible
      previewError = true;
      report('Preview playback blocked by browser policy; showing artwork.');
    });
  }

  function cancelPreview() {
    clearTimeout(previewTimer);
    stopPreview();
  }

  // Expose for navigation focus handlers
  window.B1ackha7Preview = {
    start: startPreview,
    stop: cancelPreview,
    setMode: setPreviewMode,
    isActive: function () { return previewActive; }
  };
  function retryPreview() {
    prefs.preview = true; previewBlocked = false; previewNeedsShow = true;
    save(); updatePreviewToggle();
    if (tv && tv.tvwindow) { readCurrentSource(); }
    syncPreview();
  }

  function sourceName(source) { return source.type + (source.type === 'TV' ? '' : ' ' + source.number); }
  function readCurrentSource() {
    try { var current = sourceName(tv.tvwindow.getSource('MAIN')); var label = $('source-label'); var settingsLabel = $('settings-source-label'); if (label) label.textContent = current; if (settingsLabel) settingsLabel.textContent = current; }
    catch (e) { report('Current input could not be read.', e); }
  }
  function refreshSources() {
    var sourcesEl = $('sources');
    if (sourcesEl) sourcesEl.textContent = '';
    if (!tv || !tv.systeminfo || !tv.tvwindow) { if (sourcesEl) sourcesEl.textContent = 'Input selection requires the TV.'; return; }
    readCurrentSource();
    try {
      tv.systeminfo.getPropertyValue('VIDEOSOURCE', function (info) {
        if (sourcesEl) sourcesEl.textContent = '';
        (info.connected || []).forEach(function (source) {
          var button = document.createElement('button'); button.textContent = sourceName(source);
          button.onclick = function () {
            if (windowBusy) { report('Preview is updating; try again.'); return; }
            windowBusy = true;
            function failed(e) { windowBusy = false; report('Could not change input.',e); syncPreview(); }
            try {
              tv.tvwindow.setSource(source, function () {
                windowBusy = false; readCurrentSource(); previewBlocked = false; previewNeedsShow = true; syncPreview(); report('Input changed.');
              }, failed, 'MAIN');
            } catch (e) { failed(e); }
          };
          if (sourcesEl) sourcesEl.appendChild(button);
        });
        if (sourcesEl && !sourcesEl.children.length) { sourcesEl.textContent = 'No connected inputs were reported.'; }
      }, function (e) { report('Input list unavailable.',e); });
    } catch (e) { report('Input selection unavailable.',e); }
  }

  function openTVSettings() {
    var button = $('tv-settings-open'), messageEl = $('tv-settings-status');
    var fallback = 'Direct opening is unavailable. Press Home on your Samsung remote, then select Settings.';
    if (!tv || !tv.application || !tv.ApplicationControl ||
        typeof tv.application.findAppControl !== 'function' || typeof tv.application.launchAppControl !== 'function') {
      if (messageEl) messageEl.textContent = fallback; return;
    }
    if (button) button.disabled = true;
    if (messageEl) messageEl.textContent = 'Checking TV settings access…';
    var finished = false, timer = setTimeout(function () { finish(null); }, 5000);
    function finish(apps, control, error) {
      if (finished) { return; }
      finished = true; clearTimeout(timer); if (button) button.disabled = false;
      if (!apps || !apps.length) {
        if (messageEl) messageEl.textContent = fallback;
        if (error) { report('TV settings access unavailable.', error); }
        return;
      }
      if (messageEl) messageEl.textContent = 'Requesting TV settings. If they do not open, press Home on your remote, then Settings.';
      launch(apps[0].id, 'TV settings', control);
    }
    try {
      var control = new tv.ApplicationControl('http://tizen.org/appcontrol/operation/setting');
      tv.application.findAppControl(control, function (apps) { finish(apps, control); }, function (e) { finish(null, null, e); });
    } catch (e) { finish(null, null, e); }
  }

  function exitDialog(open) {
    if (open) { exitFocus = document.activeElement; }
    var dialog = $('exit-dialog');
    if (dialog) dialog.hidden = !open;
    focus(open ? $('exit-cancel') : exitFocus);
  }

  function controls() {
    var root = !$('exit-dialog').hidden ? $('exit-dialog') : (document.querySelector('#settings') && !$('settings').hidden ? $('settings') : document);
    return Array.prototype.filter.call(root.querySelectorAll('button,input,summary,a[href]'), function (el) { return !el.disabled && el.getClientRects().length > 0; });
  }

  function move(code) {
    if (!$('exit-dialog').hidden) {
      focus(document.activeElement === $('exit-confirm') ? $('exit-cancel') : $('exit-confirm'));
      return;
    }
    var list = controls(), current = document.activeElement;
    if (list.indexOf(current) < 0) { focus(list[0]); return; }
    var rect = current.getBoundingClientRect(), x = rect.left + rect.width/2, y = rect.top + rect.height/2;
    var horizontal = code === 37 || code === 39, sign = code === 37 || code === 38 ? -1 : 1;
    var best = null, score = Infinity;
    list.forEach(function (el) {
      if (el === current) { return; }
      var r = el.getBoundingClientRect(), dx = r.left+r.width/2-x, dy = r.top+r.height/2-y;
      var forward = (horizontal ? dx : dy)*sign, side = Math.abs(horizontal ? dy : dx);
      if (forward > 2 && forward+side*4 < score) { best = el; score = forward+side*4; }
    });
    if (best) { focus(best); best.scrollIntoView({block:'nearest',inline:'nearest'}); }
  }

  document.addEventListener('keydown', function (e) {
    var code = e.keyCode || e.which;
    if (code === 10009 || code === 27) { // Back / Escape
      e.preventDefault();
      if (!$('exit-dialog').hidden) { exitDialog(false); }
      else if (document.querySelector('#settings') && !$('settings').hidden) { settings(false); }
      else if (editingApps) { editingApps = false; renderApps(); focus($('edit-apps')); }
      else { exitDialog(true); }
    } else if (code >= 37 && code <= 40) { // Arrow keys
      if (document.activeElement.tagName === 'INPUT' && (code === 37 || code === 39)) { return; }
      e.preventDefault(); move(code);
    } else if (code === 13 && document.activeElement.tagName === 'BUTTON') { // Enter
      e.preventDefault(); if (!e.repeat) { document.activeElement.click(); }
    } else if (code === 406 && $('exit-dialog').hidden) { // Blue key
      e.preventDefault(); settings(!$('settings').hidden ? false : true);
    } else if (code === 9) { // Tab
      var list = controls(), i = list.indexOf(document.activeElement);
      e.preventDefault(); focus(list[(i+(e.shiftKey ? -1 : 1)+list.length)%list.length]);
    }
  });

  function updateGreeting() {
    var hour = new Date().getHours();
    var greetingEl = $('greeting');
    var subtitleEl = document.querySelector('.subtitle');
    var greeting, subtitle;
    if (hour < 12) { greeting = 'Good morning'; subtitle = 'Start your day with something great.'; }
    else if (hour < 17) { greeting = 'Good afternoon'; subtitle = 'Relax. You\'ve got great things to watch.'; }
    else { greeting = 'Good evening'; subtitle = 'Relax. You\'ve got great things to watch.'; }
    if (greetingEl) greetingEl.textContent = greeting;
    if (subtitleEl) subtitleEl.textContent = subtitle;
  }

  // Initialize
  loadPrefs(); applyName(); updateSystemToggle(); background(prefs.background,false);
  var bp = $('background-path') || $('background-path-enhanced');
  if (bp) bp.value = prefs.background;
  updatePreviewToggle(); clockTimer = setInterval(updateClock, 30000);
  updateClock(); updateGreeting();
  initSidebar(); initCarouselNavigation(); initAppCarousel();
  if (tv && tv.tvinputdevice) { try { tv.tvinputdevice.registerKey('ColorF3Blue'); } catch (e) { report('Blue-key shortcut unavailable; use Settings.',e); } }
  refreshApps();
  if (tv && tv.tvwindow) { readCurrentSource(); }
  requestAnimationFrame(function () { requestAnimationFrame(function () { syncPreview(); }); });
  window.addEventListener('resize',function () { previewNeedsShow = true; syncPreview(); });
  var contentEl = $('content');
  if (contentEl) {
    var scrollSyncTimer = null;
    contentEl.addEventListener('scroll', function () {
      if (scrollSyncTimer) return;
      scrollSyncTimer = setTimeout(function () {
        scrollSyncTimer = null;
        if (wantedPreview()) { previewNeedsShow = true; syncPreview(); }
      }, 100);
    }, { passive: true });
  }
  document.addEventListener('visibilitychange', function () {
    clearTimeout(launchTimer);
    ++launchGeneration;
    var lf = $('launch-feedback'); if (lf) lf.hidden = true;
    if (!document.hidden) { launching = false; previewBlocked = false; previewNeedsShow = true; refreshApps(); if (tv && tv.tvwindow) { readCurrentSource(); } }
    syncPreview();
  });
  focus($('apps-carousel .carousel-item'));

  // ==========================================================================
  // PAGE RENDERING FUNCTIONS
  // ==========================================================================

  function renderAppsPage() {
    var grid = $('apps-grid');
    var categorySelect = $('apps-category');
    var sortSelect = $('apps-sort');
    var emptyEl = $('apps-empty');
    if (!grid) return;

    // Get unique categories from apps
    var categories = ['all'];
    var seenCats = {all: true};
    apps.forEach(function(app) {
      if (!app || app.show === false) return;
      var name = (app.name || '').toLowerCase();
      var cat = 'Entertainment';
      if (name.includes('game') || name.includes('play')) cat = 'Games';
      else if (name.includes('news') || name.includes('weather')) cat = 'News & Weather';
      else if (name.includes('sport')) cat = 'Sports';
      else if (name.includes('music') || name.includes('spotify') || name.includes('pandora')) cat = 'Music';
      if (!seenCats[cat]) { seenCats[cat] = true; categories.push(cat); }
    });

    // Populate category select if empty
    if (categorySelect && categorySelect.options.length <= 1) {
      categorySelect.innerHTML = '';
      categories.forEach(function(cat) {
        var opt = document.createElement('option');
        opt.value = cat.toLowerCase().replace(/ /g, '-');
        opt.textContent = cat;
        categorySelect.appendChild(opt);
      });
    }

    // Filter and sort apps
    var category = categorySelect ? categorySelect.value : 'all';
    var sort = sortSelect ? sortSelect.value : 'alpha';

    var filtered = apps.filter(function(app) {
      if (!app || app.show === false) return false;
      if (category !== 'all') {
        var name = (app.name || '').toLowerCase();
        var cat = 'entertainment';
        if (name.includes('game') || name.includes('play')) cat = 'games';
        else if (name.includes('news') || name.includes('weather')) cat = 'news-weather';
        else if (name.includes('sport')) cat = 'sports';
        else if (name.includes('music') || name.includes('spotify') || name.includes('pandora')) cat = 'music';
        if (cat !== category) return false;
      }
      return true;
    });

    if (sort === 'alpha') {
      filtered.sort(function(a,b) { return (a.name || a.id).localeCompare(b.name || b.id); });
    } else if (sort === 'favorites') {
      var favs = prefs.favorites || [];
      filtered.sort(function(a,b) {
        var aFav = favs.indexOf(a.id), bFav = favs.indexOf(b.id);
        if (aFav < 0) aFav = Infinity;
        if (bFav < 0) bFav = Infinity;
        if (aFav !== bFav) return aFav < bFav ? -1 : 1;
        return (a.name || a.id).localeCompare(b.name || b.id);
      });
    }

    // Render grid
    grid.innerHTML = '';
    filtered.forEach(function(app) {
      var item = document.createElement('button');
      item.className = 'app-grid-item';
      item.setAttribute('data-app-id', app.id);
      item.setAttribute('role', 'listitem');
      item.setAttribute('aria-label', app.name || app.id);

      var icon = document.createElement('span');
      icon.className = 'app-icon';
      var initial = document.createElement('span');
      initial.className = 'initial';
      initial.textContent = (app.name || '?').slice(0,2).toUpperCase();
      icon.appendChild(initial);
      loadAppIcon(app, item, initial);

      var name = document.createElement('span');
      name.className = 'app-name';
      name.textContent = app.name || app.id;

      item.appendChild(icon);
      item.appendChild(name);

      item.onclick = function() { launch(app.id, app.name || app.id); };

      grid.appendChild(item);
    });

    if (emptyEl) emptyEl.hidden = filtered.length > 0;

    // Re-create Lucide icons
    try { lucide.createIcons(); } catch (e) { /* ignore */ }
  }

  function renderGamesPage() {
    var grid = $('games-grid');
    var xboxFeature = $('xbox-feature');
    var xboxConnection = $('xbox-connection');
    var emptyEl = $('games-empty');
    if (!grid) return;

    // Check for Xbox connection via HDMI
    var xboxDetected = false;
    var xboxHdmi = null;
    if (tv && tv.systeminfo) {
      try {
        tv.systeminfo.getPropertyValue('VIDEOSOURCE', function(info) {
          (info.connected || []).forEach(function(source) {
            if (source.type === 'HDMI') {
              xboxDetected = true;
              xboxHdmi = source.number;
            }
          });
          if (xboxFeature) xboxFeature.hidden = !xboxDetected;
          if (xboxConnection) xboxConnection.textContent = xboxDetected ? 'HDMI ' + xboxHdmi + ' · Connected' : 'Not detected';
        });
      } catch (e) { /* ignore */ }
    }

    // Filter games (apps with game-related names)
    var games = apps.filter(function(app) {
      if (!app || app.show === false) return false;
      var name = (app.name || '').toLowerCase();
      return name.includes('game') || name.includes('play') || name.includes('xbox') || name.includes('steam');
    });

    grid.innerHTML = '';
    games.forEach(function(app) {
      var item = document.createElement('button');
      item.className = 'app-grid-item';
      item.setAttribute('data-app-id', app.id);
      item.setAttribute('role', 'listitem');
      item.setAttribute('aria-label', app.name || app.id);

      var icon = document.createElement('span');
      icon.className = 'app-icon';
      var initial = document.createElement('span');
      initial.className = 'initial';
      initial.textContent = (app.name || '?').slice(0,2).toUpperCase();
      icon.appendChild(initial);
      loadAppIcon(app, item, initial);

      var name = document.createElement('span');
      name.className = 'app-name';
      name.textContent = app.name || app.id;

      item.appendChild(icon);
      item.appendChild(name);

      item.onclick = function() { launch(app.id, app.name || app.id); };

      grid.appendChild(item);
    });

    // Add launch Xbox handler
    var launchXbox = $('launch-xbox');
    if (launchXbox) {
      launchXbox.onclick = function() {
        if (tv && tv.tvwindow && tv.systeminfo) {
          tv.systeminfo.getPropertyValue('VIDEOSOURCE', function(info) {
            (info.connected || []).forEach(function(source) {
              if (source.type === 'HDMI' && source.number === (xboxHdmi || 2)) {
                tv.tvwindow.setSource(source, function() {
                  report('Switched to Xbox on HDMI ' + source.number);
                }, function(e) { report('Could not switch to Xbox', e); }, 'MAIN');
              }
            });
          });
        }
      };
    }

    if (emptyEl) emptyEl.hidden = games.length > 0 || xboxDetected;
    try { lucide.createIcons(); } catch (e) { /* ignore */ }
  }

  function renderRecentPage() {
    var list = $('recent-list');
    var emptyEl = $('recent-empty');
    if (!list) return;

    list.innerHTML = '';

    if (recentApps.length === 0) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    if (emptyEl) emptyEl.hidden = true;

    recentApps.forEach(function(entry) {
      var card = document.createElement('button');
      card.className = 'recent-card';
      card.setAttribute('data-app-id', entry.id);
      card.setAttribute('role', 'listitem');
      card.setAttribute('aria-label', entry.name + ', launched ' + entry.time);

      var icon = document.createElement('span');
      icon.className = 'app-icon';
      var initial = document.createElement('span');
      initial.className = 'initial';
      initial.textContent = (entry.name || '?').slice(0,2).toUpperCase();
      icon.appendChild(initial);
      loadAppIcon({id: entry.id, name: entry.name, iconPath: ''}, card, initial);

      var info = document.createElement('div');
      info.className = 'recent-info';
      var name = document.createElement('div');
      name.className = 'recent-name';
      name.textContent = entry.name;
      var meta = document.createElement('div');
      meta.className = 'recent-meta';
      meta.textContent = 'Launched from ' + entry.source;
      var time = document.createElement('div');
      time.className = 'recent-time';
      time.textContent = entry.time;

      info.appendChild(name);
      info.appendChild(meta);
      info.appendChild(time);

      card.appendChild(icon);
      card.appendChild(info);

      card.onclick = function() { launch(entry.id, entry.name); };

      list.appendChild(card);
    });

    try { lucide.createIcons(); } catch (e) { /* ignore */ }
  }

  function addToRecent(appId, appName, source) {
    // Remove existing entry for this app
    recentApps = recentApps.filter(function(e) { return e.id !== appId; });
    // Add to front
    recentApps.unshift({
      id: appId,
      name: appName,
      source: source || 'launcher',
      time: new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})
    });
    // Keep only last 20
    if (recentApps.length > 20) recentApps.pop();
    // Persist
    try { localStorage.setItem('b1ackha7tv.recent.v1', JSON.stringify(recentApps)); } catch (e) { /* ignore */ }
  }

  function renderInputsPage() {
    var grid = $('inputs-grid');
    var emptyEl = $('inputs-empty');
    if (!grid) return;

    grid.innerHTML = '';

    if (!tv || !tv.systeminfo || !tv.tvwindow) {
      if (emptyEl) { emptyEl.hidden = false; emptyEl.textContent = 'Input detection requires the TV.'; }
      return;
    }

    try {
      tv.systeminfo.getPropertyValue('VIDEOSOURCE', function(info) {
        var sources = info.connected || [];
        var currentSource = null;
        try { currentSource = tv.tvwindow.getSource('MAIN'); } catch (e) { /* ignore */ }

        if (sources.length === 0) {
          if (emptyEl) { emptyEl.hidden = false; emptyEl.textContent = 'No connected inputs were reported.'; }
          return;
        }

        if (emptyEl) emptyEl.hidden = true;

        sources.forEach(function(source) {
          var isActive = currentSource && currentSource.type === source.type && currentSource.number === source.number;
          var tile = document.createElement('button');
          tile.className = 'input-tile' + (isActive ? ' active' : '');
          tile.setAttribute('role', 'listitem');
          tile.setAttribute('aria-label', (source.type + (source.type === 'TV' ? '' : ' ' + source.number)) + (isActive ? ' · Current' : ''));

          var icon = document.createElement('span');
          icon.className = 'input-icon';
          if (source.type === 'TV') icon.setAttribute('data-lucide', 'tv');
          else if (source.type === 'HDMI') icon.setAttribute('data-lucide', 'monitor');
          else icon.setAttribute('data-lucide', 'plug');

          var name = document.createElement('span');
          name.className = 'input-name';
          name.textContent = source.type + (source.type === 'TV' ? '' : ' ' + source.number);

          var status = document.createElement('span');
          status.className = 'input-status';
          status.textContent = isActive ? 'Active' : 'Available';

          tile.appendChild(icon);
          tile.appendChild(name);
          tile.appendChild(status);

          tile.onclick = function() {
            if (windowBusy) { report('Preview is updating; try again.'); return; }
            windowBusy = true;
            function failed(e) { windowBusy = false; report('Could not change input.',e); syncPreview(); }
            try {
              tv.tvwindow.setSource(source, function () {
                windowBusy = false; readCurrentSource(); previewBlocked = false; previewNeedsShow = true; syncPreview(); report('Input changed to ' + name.textContent);
                renderInputsPage(); // Refresh to show active state
              }, failed, 'MAIN');
            } catch (e) { failed(e); }
          };

          grid.appendChild(tile);
        });

        try { lucide.createIcons(); } catch (e) { /* ignore */ }
      }, function(e) { report('Input list unavailable.',e); });
    } catch (e) { report('Input selection unavailable.',e); }
  }

  // Load recent apps from storage on init
  try {
    var savedRecent = JSON.parse(localStorage.getItem('b1ackha7tv.recent.v1') || '[]');
    if (Array.isArray(savedRecent)) { recentApps = savedRecent; }
  } catch (e) { recentApps = []; }

  // Clear recent handler
  var clearRecent = $('clear-recent');
  if (clearRecent) {
    clearRecent.onclick = function() {
      if (confirm('Clear all recent history?')) {
        recentApps = [];
        try { localStorage.removeItem('b1ackha7tv.recent.v1'); } catch (e) { /* ignore */ }
        renderRecentPage();
        report('Recent history cleared.');
      }
    };
  }

  // Apps page event handlers
  var appsCategory = $('apps-category');
  var appsSort = $('apps-sort');
  var appsRefresh = $('apps-refresh');
  if (appsCategory) { appsCategory.onchange = renderAppsPage; }
  if (appsSort) { appsSort.onchange = renderAppsPage; }
  if (appsRefresh) { appsRefresh.onclick = refreshApps; }

  // ==========================================================================
  // SEARCH PAGE
  // ==========================================================================
  var POPULAR_SEARCHES = [
    'Netflix', 'YouTube', 'Prime Video', 'Disney+', 'Hulu', 'Apple TV',
    'Spotify', 'Plex', 'Twitch', 'Xbox', 'Steam', 'Settings'
  ];

  function renderSearchPage() {
    var results = $('search-results');
    var appsGrid = $('search-apps');
    var chips = $('search-popular');
    var empty = $('search-empty');
    if (!results || !appsGrid || !chips) { return; }

    var query = ($('search-input') || {}).value || '';
    query = query.trim();

    if (!query) {
      results.hidden = true;
      empty.hidden = true;
      // Show popular searches as chips
      chips.innerHTML = '';
      POPULAR_SEARCHES.forEach(function (term) {
        var chip = document.createElement('button');
        chip.className = 'search-chip';
        chip.textContent = term;
        chip.onclick = function () {
          var input = $('search-input');
          if (input) { input.value = term; input.focus(); renderSearchPage(); }
        };
        chips.appendChild(chip);
      });
      return;
    }

    results.hidden = false;
    empty.hidden = true;
    var q = query.toLowerCase();

    // Filter installed apps by name
    var matches = apps.filter(function (app) {
      if (!app || app.show === false) { return false; }
      return (app.name || app.id).toLowerCase().indexOf(q) !== -1;
    });
    matches.sort(function (a, b) { return (a.name || a.id).localeCompare(b.name || b.id); });

    appsGrid.innerHTML = '';
    if (matches.length) {
      matches.forEach(function (app) {
        var item = document.createElement('button');
        item.className = 'app-grid-item';
        item.setAttribute('data-app-id', app.id);
        item.setAttribute('aria-label', app.name || app.id);

        var icon = document.createElement('span');
        icon.className = 'app-icon';
        var initial = document.createElement('span');
        initial.className = 'initial';
        initial.textContent = (app.name || '?').slice(0, 2).toUpperCase();
        icon.appendChild(initial);
        loadAppIcon(app, item, initial);

        var name = document.createElement('span');
        name.className = 'app-name';
        name.textContent = app.name || app.id;

        item.appendChild(icon);
        item.appendChild(name);
        item.onclick = function () { launch(app.id, app.name || app.id); };
        appsGrid.appendChild(item);
      });
    } else {
      var msg = document.createElement('p');
      msg.className = 'empty-state';
      msg.textContent = 'No installed apps match "' + query + '".';
      appsGrid.appendChild(msg);
    }

    // Filter popular searches by query
    chips.innerHTML = '';
    var popularMatches = POPULAR_SEARCHES.filter(function (term) {
      return term.toLowerCase().indexOf(q) !== -1;
    });
    if (!popularMatches.length) {
      popularMatches = POPULAR_SEARCHES.slice(0, 6);
    }
    popularMatches.forEach(function (term) {
      var chip = document.createElement('button');
      chip.className = 'search-chip';
      chip.textContent = term;
      chip.onclick = function () {
        var input = $('search-input');
        if (input) { input.value = term; input.focus(); renderSearchPage(); }
      };
      chips.appendChild(chip);
    });

    try { lucide.createIcons(); } catch (e) { /* ignore */ }
  }

  var searchInput = $('search-input');
  var searchClear = $('search-clear');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      if (searchClear) { searchClear.hidden = !this.value; }
      renderSearchPage();
    });
    searchInput.addEventListener('focus', function () {
      var bar = this.parentElement;
      if (bar) { bar.classList.add('focused'); }
      var kb = $('search-keyboard');
      if (kb) { kb.hidden = false; }
    });
  }
  if (searchClear) {
    searchClear.addEventListener('click', function () {
      var input = $('search-input');
      if (input) { input.value = ''; input.focus(); }
      if (searchClear) { searchClear.hidden = true; }
      renderSearchPage();
    });
  }

  // On-screen keyboard
  var keyboard = $('search-keyboard');
  if (keyboard) {
    keyboard.addEventListener('click', function (e) {
      var key = e.target.closest('.key');
      if (!key) { return; }
      var k = key.getAttribute('data-key');
      var input = $('search-input');
      if (!input) { return; }
      if (k === 'SPACE') { input.value += ' '; }
      else if (k === 'BACK') { input.value = input.value.slice(0, -1); }
      else { input.value += k.toLowerCase(); }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      key.classList.add('active');
      setTimeout(function () { key.classList.remove('active'); }, 120);
    });
  }

  // Show popular searches on first visit
  renderSearchPage();

}());

// Tizen integration service
// Handles both browser preview (mock) and real TV (native API)
// Exports unified API used by all pages

import { isBrowser, hasWorkingMock } from '../utils/env.js';
import { loadPrefs, savePrefs } from '../utils/storage.js';

// Browser mock ------------------------------------------------------------
const BROADCAST_CHANNEL = 'b1ackha7tv-tizen-mock';

// 初始化的 mock 数据
const DEFAULT_APPS = [
  { id: 'youtube', name: 'YouTube', show: true, iconPath: '' },
  { id: 'netflix', name: 'Netflix', show: true, iconPath: '' },
  { id: 'prime', name: 'Prime Video', show: true, iconPath: '' },
  { id: 'disney', name: 'Disney+', show: true, iconPath: '' },
  { id: 'apple.tv', name: 'Apple TV', show: true, iconPath: '' },
  { id: 'hulu', name: 'Hulu', show: true, iconPath: '' },
  { id: 'paramount', name: 'Paramount+', show: true, iconPath: '' },
  { id: 'peacock', name: 'Peacock', show: true, iconPath: '' },
  { id: 'plex', name: 'Plex', show: true, iconPath: '' },
  { id: 'tubi', name: 'Tubi', show: true, iconPath: '' },
];

function broadcast(event, data) {
  if (typeof window !== 'undefined') {
    window.postMessage({ type: 'tizen-event', event, data }, '*');
  }
}

// 模拟实现（浏览器环境）
export const tizenBrowser = {
  ApplicationControl: (operation) => ({ operation }),
  application: {
    getCurrentApplication: () => ({ appInfo: { id: 'self' } }),
    getAppsInfo: (callback) => {
      const prefs = loadPrefs();
      const filtered = DEFAULT_APPS.filter(app => prefs.system || app.show !== false);
      // 手动分类
      const categorized = filtered.reduce((acc, app) => {
        const key = appGroupKey(app);
        if (!acc[key]) acc[key] = [];
        acc[key].push(app);
      }, {});
      // 按显示顺序排序
      const ordered = filtered.sort((a, b) => {
        const aFav = (prefs.favorites || []).indexOf(a.id);
        const bFav = (prefs.favorites || []).indexOf(b.id);
        if (aFav < 0) aFav = Infinity;
        if (bFav < 0) bFav = Infinity;
        if (aFav !== bFav) return aFav < bFav ? -1 : 1;
        return a.id < b.id ? -1 : 1;
      });
      callback(ordered);
    },
    launch: (id, success, error) => { success(); },
    launchAppControl: (control, id, success, error) => { success(); },
    findAppControl: (control, success, error) => { error({ name: 'NotFoundError' }); },
  },
  tvwindow: {
    getSource: () => ({ type: 'TV', number: 0 }),
    show: (success) => { success(); },
    hide: (success) => { success(); },
  },
  systeminfo: {
    getPropertyValue: (key, cb) => {
      if (key === 'VIDEOSOURCE') {
        cb({ connected: [
          { type: 'TV', number: 0 },
          { type: 'HDMI', number: 1 },
          { type: 'HDMI', number: 2 },
        ] });
      }
    },
  },
  tvinputdevice: { registerKey: () => {} },
};

// 真机实现（Tizen 环境）
export const tizenNative = {
  ApplicationControl: (operation) => ({ operation }),
  application: {
    getCurrentApplication: () => {
      try { return { appInfo: { id: tv.application.getCurrentApplication().appInfo.id } }; }
      } catch (e) { return { appInfo: { id: 'self' } }; }
    },
    getAppsInfo: (callback) => {
      try { tv.application.getAppsInfo(callback); }
      catch (e) { callback([]); }
    },
    launch: (id, success, error) => {
      try { tv.application.launch(id, success, error); }
      catch (e) { error(e); }
    },
    launchAppControl: (control, id, success, error) => {
      try { tv.application.launchAppControl(control, id, success, error); }
      catch (e) { error(e); }
    },
    findAppControl: (control, success, error) => {
      try { tv.application.findAppControl(control, success, error); }
      catch (e) { error(e); }
    },
  },
  tvwindow: {
    getSource: () => {
      try { return tv.tvwindow.getSource(); }
      catch (e) { return { type: 'TV', number: 0 }; }
    },
    show: (success) => {
      try { tv.tvwindow.show(success); } catch (e) { success(); }
    },
    hide: (success) => {
      try { tv.tvwindow.hide(success); } catch (e) { success(); }
    },
  },
  systeminfo: {
    getPropertyValue: (key, cb) => {
      try { tv.systeminfo.getPropertyValue(key, cb); }
      catch (e) { cb(null); }
    },
  },
  tvinputdevice: { registerKey: () => {} },
};

// 统一接口 ------------------------------------------------------------
function appGroupKey(app) {
  const name = (app.name || '').toLowerCase().replace(/[®™]/g, '').replace(/\+/g, 'plus').replace(/[^a-z0-9]/g, '');
  if (/^(amazonprimevideo|primevideo|amazonvideo)$/.test(name)) return 'brand:prime-video';
  if (name === 'disneyplus') return 'brand:disney-plus';
  return 'id:' + app.id;
}

export function getUnifiedTizen() {
  return isBrowser && !hasWorkingMock ? tizenBrowser : tizenNative;
}

// 公共工具 ------------------------------------------------------------
export function isSupported() {
  return !isBrowser || hasWorkingMock;
}

export function launchApp(id, appControl = null) {
  const tizen = getUnifiedTizen();
  const success = () => {
    const prefs = loadPrefs();
    const recent = prefs.recent || [];
    const filtered = recent.filter(i => i.id !== id);
    filtered.unshift({ id, name: (DEFAULT_APPS.find(a => a.id === id) || {}).name || id, timestamp: Date.now() });
    if (filtered.length > 50) filtered.pop(); // 保持最近 50 条
    prefs.recent = filtered;
    savePrefs();
    broadcast('app-launched', { id });
  };
  const error = (e) => {
    broadcast('app-launch-failed', { id, error: e });
  };
  if (appControl) {
    tizen.application.launchAppControl(appControl, id, success, error);
  } else {
    tizen.application.launch(id, success, error);
  }
}

export function getVideoSources() {
  const sources = [];
  const tizen = getUnifiedTizen();
  try {
    const result = tizen.systeminfo.getPropertyValue('VIDEOSOURCE');
    if (result && result.connected) {
      sources.push(...result.connected);
    }
  } catch (e) { /* ignore */ }
  if (!sources.length && isBrowser) {
    sources.push({ type: 'TV', number: 0 }, { type: 'HDMI', number: 1 }, { type: 'HDMI', number: 2 });
  }
  return sources;
}

export function getCurrentAppId() {
  const tizen = getUnifiedTizen();
  try { return tizen.application.getCurrentApplication().appInfo.id; }
  catch (e) { return 'self'; }
}

export function subscribeToEvents(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => {
    if (e.data && e.data.type === 'tizen-event') {
      callback(e.data.event, e.data.data);
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

// 辅助工具 ------------------------------------------------------------
export function setAppCategory(id, category) {
  const prefs = loadPrefs();
  if (!prefs.categories) prefs.categories = {};
  prefs.categories[id] = category;
  savePrefs();
  broadcast('app-category-changed', { id, category });
}

export function getAppCategory(id) {
  const prefs = loadPrefs();
  return prefs.categories && prefs.categories[id];
}

export function getRecentApps() {
  const prefs = loadPrefs();
  return prefs.recent || [];
}

export function clearRecentApps() {
  const prefs = loadPrefs();
  prefs.recent = [];
  savePrefs();
  broadcast('recent-cleared');
}

// 导出给浏览器使用的模拟接口
export function mockGetAppsInfo(callback) {
  if (!isBrowser) return;
  const prefs = loadPrefs();
  const filtered = DEFAULT_APPS.filter(app => prefs.system || app.show !== false);
  // 分类并排序
  const grouped = filtered.reduce((acc, app) => {
    const key = appGroupKey(app);
    if (!acc[key]) acc[key] = [];
    acc[key].push(app);
  }, {});
  const catalog = [];
  Object.keys(grouped).forEach(key => {
    const group = grouped[key];
    group.sort((a, b) => {
      const aFav = (prefs.favorites || []).indexOf(a.id);
      const bFav = (prefs.favorites || []).indexOf(b.id);
      if (aFav < 0) aFav = Infinity;
      if (bFav < 0) bFav = Infinity;
      if (aFav !== bFav) return aFav < bFav ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    });
    catalog.push(group[0]);
  });
  // 按显示顺序
  const ordered = filtered.sort((a, b) => {
    const aFav = (prefs.favorites || []).indexOf(a.id);
    const bFav = (prefs.favorites || []).indexOf(b.id);
    if (aFav < 0) aFav = Infinity;
    if (bFav < 0) bFav = Infinity;
    if (aFav !== bFav) return aFav < bFav ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });
  callback(ordered);
}

// 供浏览器测试用的工具
export function setMockApps(apps) {
  window.tizenMockApps = apps;
  broadcast('mock-apps-updated');
}
export function getMockApps() {
  return window.tizenMockApps || DEFAULT_APPS;
}
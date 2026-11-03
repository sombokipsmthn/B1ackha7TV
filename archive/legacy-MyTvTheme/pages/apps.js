// APPS 页面 - 动态应用列表，字母排序，搜索过滤
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tizen } from '../services/tizen/index.js';
import { loadPrefs, savePrefs } from '../utils/storage.js';
import { useTheme } from '../hooks/use-theme.js';
import AppTile from '../components/AppTile.js';
import Sidebar from '../components/Sidebar.js';

export default function AppsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const [apps, setApps] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [categories, setCategories] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [theme] = useTheme();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const allApps = await tizen.getAppsInfo();
        setApps(allApps);
      } catch (e) {
        console.warn('Failed to fetch apps:', e);
        tizen.mockGetAppsInfo(setApps);
      }
    };
    load();
  }, []);

  useEffect(() => {
    // 实时监听应用更新
    const unsubscribe = tizen.subscribeToEvents((event, data) => {
      if (event === 'mock-apps-updated') {
        tizen.mockGetAppsInfo(setApps);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const prefs = loadPrefs();
    const favs = prefs.favorites || [];
    const catMap = {};
    apps.forEach(app => {
      const cat = prefs.categories && prefs.categories[app.id] || appGroupKey(app);
      if (!catMap[cat]) catMap[cat] = [];
      catMap[cat].push(app);
    });
    setCategories(catMap);
    // 过滤和排序
    const filteredApps = apps.filter(app => {
      if (search && !app.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedCategory !== 'all') {
        const appCat = prefs.categories && prefs.categories[app.id] || appGroupKey(app);
        if (appCat !== selectedCategory) return false;
      }
      return true;
    }).sort((a, b) => {
      const aFav = favs.indexOf(a.id);
      const bFav = favs.indexOf(b.id);
      if (aFav < 0) aFav = Infinity;
      if (bFav < 0) bFav = Infinity;
      if (aFav !== bFav) return aFav < bFav ? -1 : 1;
      return (a.name || a.id).localeCompare(b.name || b.id);
    });
    setFiltered(filteredApps);
  }, [search, selectedCategory, apps]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchParams({ search: value }, { replace: true });
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
  };

  const handleAppClick = (app) => {
    if (editing) return;
    tizen.launchApp(app.id);
  };

  const handleFavoriteToggle = (appId) => {
    const favs = loadPrefs().favorites || [];
    const newFavs = favs.includes(appId) ? favs.filter(id => id !== appId) : [...favs, appId];
    savePrefs({ favorites: newFavs });
    // 更新 UI
    setApps(prev => prev.map(app => ({
      ...app,
      show: newFavs.includes(app.id) || true,
    })));
  };

  const uniqueCategories = Object.keys(categories).sort((a, b) => {
    if (a.startsWith('brand:')) return 1; // 品牌分类最后
    if (b.startsWith('brand:')) return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="page apps-page">
      <Sidebar active="apps" />
      <main className="content">
        <header className="header">
          <div className="header-left">
            <Brand />
            <h1>All Applications</h1>
            <p className="subtitle">Your installed apps</p>
          </div>
        </header>

        {/* 搜索栏 */}
        <div className="search-bar">
          <Icon name="search" size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search apps…"
            value={search}
            onChange={handleSearch}
            autoFocus
          />
          {search && (
            <button onClick={() => setSearchParams({}, { replace: true })} className="clear-search">✕</button>
          )}
        </div>

        {/* 分类标签 */}
        <div className="categories">
          <button
            className={`cat-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => handleCategorySelect('all')}
          >All</button>
          {uniqueCategories.map(cat => (
            <button
              key={cat}
              className={`cat-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => handleCategorySelect(cat)}
            >
              {cat.replace('brand:', '') || 'Brand'}
            </button>
          ))}
        </div>

        {/* 应用网格 */}
        <div className="apps-grid">
          {filtered.map(app => (
            <AppTile
              key={app.id}
              app={app}
              onClick={handleAppClick}
              isFavorite={(loadPrefs().favorites || []).includes(app.id)}
              onToggle={() => handleFavoriteToggle(app.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="empty-state">
              No apps found. Try adjusting search or showing system entries in Settings.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function appGroupKey(app) {
  const prefs = loadPrefs();
  const name = (app.name || '').toLowerCase().replace(/[®™]/g, '').replace(/\+/g, 'plus').replace(/[^a-z0-9]/g, '');
  if (/^(amazonprimevideo|primevideo|amazonvideo)$/.test(name)) return 'brand:prime-video';
  if (name === 'disneyplus') return 'brand:disney-plus';
  // 游戏检测（启发式）
  const isGame = /game/i.test(app.name || '') || /play/i.test(app.name || '') || /video/i.test(app.name || '') || /sport/i.test(app.name || '');
  if (isGame) return 'category:games';
  return 'category:apps';
}
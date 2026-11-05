// SEARCH 页面 - 应用搜索与过滤
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tizen } from '../services/tizen/index.js';
import { loadPrefs } from '../utils/storage.js';
import { useTheme } from '../hooks/use-theme.js';
import AppTile from '../components/AppTile.js';
import Sidebar from '../components/Sidebar.js';
import Icon from '../components/Icon.js';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const [apps, setApps] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [theme] = useTheme();
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    const load = async () => {
      try { setApps(await tizen.getAppsInfo()); }
      catch (e) { tizen.mockGetAppsInfo(setApps); }
    };
    load();
  }, []);

  useEffect(() => {
    const unsubscribe = tizen.subscribeToEvents((event, data) => {
      if (event === 'mock-apps-updated') tizen.mockGetAppsInfo(setApps);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const prefs = loadPrefs();
    const filteredApps = apps.filter(app => {
      if (search && !app.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => {
      const aFav = (prefs.favorites || []).indexOf(a.id);
      const bFav = (prefs.favorites || []).indexOf(b.id);
      if (aFav < 0) aFav = Infinity;
      if (bFav < 0) bFav = Infinity;
      if (aFav !== bFav) return aFav < bFav ? -1 : 1;
      return (a.name || a.id).localeCompare(b.name || b.id);
    });
    setFiltered(filteredApps);
  }, [search, apps]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchParams({ search: value }, { replace: true });
    setSearchFocused(!!value);
  };

  const handleClear = () => {
    setSearchParams({}, { replace: true });
    setSearchFocused(false);
  };

  const handleAppClick = (app) => {
    tizen.launchApp(app.id);
  };

  return (
    <div className="page search-page">
      <Sidebar active="search" />
      <main className="content">
        <header className="header">
          <div className="header-left">
            <Brand />
            <h1>Search</h1>
            <p className="subtitle">Find your favorite apps</p>
          </div>
        </header>

        {/* 搜索栏 - 聚焦态更大 */}
        <div className="search-container">
          <div className={`search-bar ${searchFocused ? 'focused' : ''}`}>
            <Icon name="search" size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search apps and games…"
              value={search}
              onChange={handleSearchChange}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              autoFocus
            />
            {search && (
              <button onClick={handleClear} className="clear-search">✕</button>
            )}
          </div>
        </div>

        {/* 结果区域 */}
        <div className="search-results">
          {filtered.length === 0 && (
            <div className="empty-state">
              {search ? 'No results found. Try a different search term.' : 'Start typing to search your apps.'}
            </div>
          )}
          {filtered.map(app => (
            <AppTile
              key={app.id}
              app={app}
              onClick={handleAppClick}
              isFavorite={(loadPrefs().favorites || []).includes(app.id)}
              onToggle={() => {
                const prefs = loadPrefs();
                const newFavs = prefs.favorites.includes(app.id)
                  ? prefs.favorites.filter(id => id !== app.id)
                  : [...prefs.favorites, app.id];
                savePrefs({ favorites: newFavs });
                // 重新渲染以更新 UI
                setApps(prev => prev.map(a => ({
                  ...a,
                  show: newFavs.includes(a.id) || true,
                })));
              }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
// GAMES 页面 - 游戏专区
import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/use-theme.js';
import { tizen } from '../services/tizen/index.js';
import { loadPrefs } from '../utils/storage.js';
import AppTile from '../components/AppTile.js';
import Sidebar from '../components/Sidebar.js';

export default function GamesPage() {
  const [apps, setApps] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [theme] = useTheme();
  const [editing, setEditing] = useState(false);

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
      // 游戏检测优先级：
      // 1. 用户手动分类（prefs.categories）
      // 2. 启发式名称关键词
      // 3. 图标语义（视频类图标）
      const cat = prefs.categories && prefs.categories[app.id] || appGroupKey(app);
      if (cat === 'category:games') return true;
      if (search && !app.name.toLowerCase().includes(search.toLowerCase())) return false;
      // 启发式：名称含 game/play/video/sport 或图标包含 gamepad/video_library
      const name = (app.name || '').toLowerCase();
      const isGameByName = /\bgame\b|\bplay\b|\bvideo\b|\bsport\b/.test(name);
      // 图标检查（模拟环境可用）
      const isGameByIcon = app.iconPath && (app.iconPath.includes('gamepad') || app.iconPath.includes('videogame_asset'));
      return isGameByName || isGameByIcon;
    }).sort((a, b) => {
      const aCat = prefs.categories && prefs.categories[a.id] || appGroupKey(a);
      const bCat = prefs.categories && prefs.categories[b.id] || appGroupKey(b);
      if (aCat === 'category:games' && bCat !== 'category:games') return -1;
      if (bCat === 'category:games' && aCat !== 'category:games') return 1;
      const aFav = (loadPrefs().favorites || []).indexOf(a.id);
      const bFav = (loadPrefs().favorites || []).indexOf(b.id);
      if (aFav < 0) aFav = Infinity;
      if (bFav < 0) bFav = Infinity;
      if (aFav !== bFav) return aFav < bFav ? -1 : 1;
      return (a.name || a.id).localeCompare(b.name || b.id);
    });
    setFiltered(filteredApps);
  }, [search, apps]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
  };

  const handleAppClick = (app) => {
    if (editing) return;
    tizen.launchApp(app.id);
  };

  const handleCategoryChange = (cat) => {
    // 游戏页面只显示 games 分类
    // 点击「手动分类」进入编辑模式
  };

  const handleManualEdit = () => {
    setEditing(!editing);
    if (!editing) {
      // 进入编辑模式时，显示所有应用供用户分类
      setFiltered(apps);
    } else {
      // 退出编辑模式，恢复游戏过滤
      setFiltered(apps.filter(app => {
        const cat = loadPrefs().categories && loadPrefs().categories[app.id] || appGroupKey(app);
        return cat === 'category:games' || (/* 启发式游戏检测 */
          /\bgame\b|\bplay\b|\bvideo\b|\bsport\b/.test((app.name || '').toLowerCase()) ||
          app.iconPath && (app.iconPath.includes('gamepad') || app.iconPath.includes('videogame_asset'))
        );
      }));
    }
  };

  const appGroupKey = (app) => {
    const name = (app.name || '').toLowerCase().replace(/[®™]/g, '').replace(/\+/g, 'plus').replace(/[^a-z0-9]/g, '');
    if (/^(amazonprimevideo|primevideo|amazonvideo)$/.test(name)) return 'brand:prime-video';
    if (name === 'disneyplus') return 'brand:disney-plus';
    return 'id:' + app.id;
  };

  return (
    <div className="page games-page">
      <Sidebar active="gaming" />
      <main className="content">
        <header className="header">
          <div className="header-left">
            <Brand />
            <h1>Gaming</h1>
            <p className="subtitle">Discover and play games</p>
          </div>
          <div className="header-right">
            <button
              className={`action-btn ${editing ? 'active' : ''}`}
              onClick={handleManualEdit}
              aria-label="Edit categories"
            >
              <Icon name="edit" size={20} />
              {editing ? 'Done' : 'Edit'}
            </button>
          </div>
        </header>

        {/* 搜索栏 */}
        <div className="search-bar">
          <Icon name="search" size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search games…"
            value={search}
            onChange={handleSearch}
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch('')} className="clear-search">✕</button>
          )}
        </div>

        {/* 游戏网格 */}
        <div className="games-grid">
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
              }}
            />
          ))}
          {filtered.length === 0 && (
            <div className="empty-state">
              No games found. Try searching with different keywords or enable system apps in Settings.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
// Home 页面 - 影院风格主页
// 依赖于 app/services/tizen/index.js 提供的统一 API

import { useState, useEffect, useRef } from 'react';
import { tizen } from '../services/tizen/index.js';
import { loadPrefs, savePrefs } from '../utils/storage.js';
import { useTheme } from '../hooks/use-theme.js';

export default function HomePage() {
  const [apps, setApps] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [recent, setRecent] = useState([]);
  const [sources, setSources] = useState([]);
  const [theme, setTheme] = useTheme();
  const wallpaperRef = useRef(null);

  useEffect(() => {
    const unsubscribe = tizen.subscribeToEvents((event, data) => {
      if (event === 'app-launched') {
        // 更新最近应用
        const newRecent = [...recent];
        const existingIndex = newRecent.findIndex(r => r.id === data.id);
        if (existingIndex !== -1) newRecent.splice(existingIndex, 1);
        newRecent.unshift({ id: data.id, name: data.name || data.id, timestamp: Date.now() });
        if (newRecent.length > 50) newRecent.pop();
        setRecent(newRecent);
        savePrefs({ recent: newRecent });
      } else if (event === 'mock-apps-updated') {
        tizen.mockGetAppsInfo(setApps);
      }
    });
    // 初始加载
    const load = async () => {
      try {
        const allApps = await tizen.getAppsInfo();
        setApps(allApps);
      } catch (e) {
        console.warn('Failed to fetch apps:', e);
        tizen.mockGetAppsInfo(setApps);
      }
      setFavorites(loadPrefs().favorites || []);
      setRecent(loadPrefs().recent || []);
      setSources(await tizen.getVideoSources());
    };
    load();
    return unsubscribe;
  }, [recent]);

  const handleAppClick = (app) => {
    tizen.launchApp(app.id);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    savePrefs({ theme: newTheme });
    if (wallpaperRef.current) {
      wallpaperRef.current.style.backgroundImage = `var(--theme-${newTheme})`;
    }
  };

  const handleFavoriteToggle = (appId) => {
    const newFavs = favorites.includes(appId) ? favorites.filter(id => id !== appId) : [...favorites, appId];
    setFavorites(newFavs);
    savePrefs({ favorites: newFavs });
    // 更新应用列表排序
    setApps(prev => prev.map(app => ({
      ...app,
      show: newFavs.includes(app.id) || true,
    })));
  };

  const handleSourceSelect = (source) => {
    // 切换到 HDMI 输入
    if (source.type === 'HDMI') {
      // 调用 TV 系统切换（Tizen 环境下有效）
      try { tv.tvwindow.setSource(source, () => {}, () => {}, 'MAIN'); } catch (e) { /* ignore */ }
    }
  };

  return (
    <div className="page home-page">
      {/* 壁纸 */}
      <div
        ref={wallpaperRef}
        className="wallpaper"
        aria-hidden="true"
        style={{ backgroundImage: `var(--theme-${theme})` }}
      />

      {/* 左侧栏导航 */}
      <Sidebar active="home" />

      {/* 内容区 */}
      <main className="content">
        <header className="header">
          <div className="header-left">
            <Brand />
            <h1 className="greeting">Good evening</h1>
            <p className="subtitle">Relax. You've got great things to watch.</p>
          </div>
          <div className="header-right">
            <Clock />
            <div className="status-icons">
              <WifiIcon />
              <SettingsButton />
            </div>
            <PreviewPanel sources={sources} onSelect={handleSourceSelect} />
          </div>
        </header>

        {/* 收藏应用 */}
        <section className="favorites-section">
          <h2>Favourite applications</h2>
          <div className="favorites-grid">
            {favorites.slice(0, 12).map(id => {
              const app = apps.find(a => a.id === id);
              return app ? (
                <AppTile
                  key={id}
                  app={app}
                  onClick={() => handleAppClick(app)}
                  isFavorite
                  onToggle={() => handleFavoriteToggle(id)}
                />
              ) : null;
            })}
            {favorites.length === 0 && (
              <div className="empty-state">No favourites yet. Tap an app to add it.</div>
            )}
          </div>
        </section>

        {/* 最近应用 */}
        <section className="recent-section">
          <h2>Recently launched</h2>
          <div className="recent-list">
            {recent.slice(0, 8).map(item => (
              <RecentCard
                key={item.id}
                app={apps.find(a => a.id === item.id)}
                item={item}
                onClick={() => handleAppClick({ id: item.id, name: item.name })}
              />
            })}
            {recent.length === 0 && (
              <div className="empty-state">No recent apps yet.</div>
            )}
          </div>
        </section>

        {/* HDMI 输入预览 */}
        <section className="sources-section">
          <h2>Available HDMI inputs</h2>
          <div className="sources-grid">
            {sources.map(source => (
              <SourceCard
                key={`${source.type}-${source.number}`}
                source={source}
                onSelect={handleSourceSelect}
                isActive={source.type === 'TV'}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

// RECENT 页面 - 最近启动历史
import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/use-theme.js';
import { tizen } from '../services/tizen/index.js';
import { loadPrefs, savePrefs } from '../utils/storage.js';
import AppTile from '../components/AppTile.js';
import Sidebar from '../components/Sidebar.js';

export default function RecentPage() {
  const [recent, setRecent] = useState([]);
  const [apps, setApps] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [theme] = useTheme();
  const [clearVisible, setClearVisible] = useState(false);

  useEffect(() => {
    const loadApps = async () => {
      try { setApps(await tizen.getAppsInfo()); }
      catch (e) { tizen.mockGetAppsInfo(setApps); }
    };
    loadApps();
    const prefs = loadPrefs();
    setRecent(prefs.recent || []);
  }, []);

  useEffect(() => {
    const unsubscribe = tizen.subscribeToEvents((event, data) => {
      if (event === 'app-launched') {
        const newRecent = [...recent];
        const existingIndex = newRecent.findIndex(r => r.id === data.id);
        if (existingIndex !== -1) newRecent.splice(existingIndex, 1);
        newRecent.unshift({ id: data.id, name: data.name || data.id, timestamp: Date.now() });
        if (newRecent.length > 50) newRecent.pop();
        setRecent(newRecent);
        savePrefs({ recent: newRecent });
      }
    });
    return unsubscribe;
  }, [recent]);

  useEffect(() => {
    const filteredApps = recent.slice(0, 50).map(item => {
      const app = apps.find(a => a.id === item.id);
      return app ? { ...app, ...item } : null;
    }).filter(Boolean);
    if (search) {
      const lower = search.toLowerCase();
      filteredApps.sort((a, b) => {
        const aMatch = a.name.toLowerCase().includes(lower);
        const bMatch = b.name.toLowerCase().includes(lower);
        if (aMatch !== bMatch) return aMatch ? -1 : 1;
        return b.timestamp - a.timestamp; // 最新优先
      });
    } else {
      filteredApps.sort((a, b) => b.timestamp - a.timestamp);
    }
    setFiltered(filteredApps);
    setClearVisible(recent.length > 0);
  }, [search, recent, apps]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
  };

  const handleAppClick = (app) => {
    tizen.launchApp(app.id);
  };

  const handleClear = () => {
    if (confirm('Clear all recent history?')) {
      const prefs = loadPrefs();
      prefs.recent = [];
      savePrefs(prefs);
      setRecent([]);
      setFiltered([]);
      setClearVisible(false);
    }
  };

  return (
    <div className="page recent-page">
      <Sidebar active="recent" />
      <main className="content">
        <header className="header">
          <div className="header-left">
            <Brand />
            <h1>Recent</h1>
            <p className="subtitle">Your recent activity</p>
          </div>
          <div className="header-right">
            <Clock />
            <div className="status-icons">
              <button
                className="icon-btn clear-btn"
                onClick={handleClear}
                disabled={!clearVisible}
                aria-label="Clear history"
              >
                <Icon name="delete" size={20} />
              </button>
            </div>
          </div>
        </header>

        <div className="recent-list">
          {filtered.map(item => (
            <RecentCard
              key={item.id}
              app={apps.find(a => a.id === item.id)}
              item={item}
              onClick={() => handleAppClick({ id: item.id, name: item.name })}
            />
          ))}
          {filtered.length === 0 && (
            <div className="empty-state">No recent apps yet.</div>
          )}
        </div>
      </main>
    </div>
  );
}
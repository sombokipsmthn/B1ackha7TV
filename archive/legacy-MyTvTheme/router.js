// 简单路由系统，支持 section 切换和焦点保持
import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import HomePage from './pages/home.js';
import AppsPage from './pages/apps.js';
import GamesPage from './pages/games.js';
import RecentPage from './pages/recent.js';
import SearchPage from './pages/search.js';
import SettingsPage from './pages/settings.js';
import Sidebar from './components/Sidebar.js';

export default function AppRouter() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(location.pathname.replace(/^\//, '') || 'home');

  // 监听 Tizen 导航事件
  useEffect(() => {
    const handleTizenNav = (event, data) => {
      if (event === 'navigation-change') {
        // 模拟 TV 导航：左/右切换当前页面，OK 确认
        const sections = ['home', 'search', 'live-tv', 'apps', 'gaming', 'settings'];
        const currentIndex = sections.indexOf(activeSection);
        if (event === 'arrow-left') {
          const nextIndex = Math.max(0, currentIndex - 1);
          const nextSection = sections[nextIndex];
          setActiveSection(nextSection);
          navigate(`/${nextSection}`, { replace: true });
        } else if (event === 'arrow-right') {
          const nextIndex = Math.min(sections.length - 1, currentIndex + 1);
          const nextSection = sections[nextIndex];
          setActiveSection(nextSection);
          navigate(`/${nextSection}`, { replace: true });
        } else if (event === 'enter' || event === 'ok') {
          // 按下 OK 时进入当前页面（或执行操作）
          const currentPage = document.querySelector(`.page.${activeSection}`);
          if (currentPage) {
            const firstFocusable = currentPage.querySelector('button, input, a, summary');
            if (firstFocusable) firstFocusable.focus();
          }
        }
      }
    };
    const unsubscribe = tizen.subscribeToEvents(handleTizenNav);
    return unsubscribe;
  }, [activeSection]);

  // 页面组件映射
  const pageMap = {
    home: HomePage,
    search: SearchPage,
    'live-tv': () => <div className="page live-tv-page"><TVInputView /></div>,
    apps: AppsPage,
    gaming: GamesPage,
    settings: SettingsPage,
  };

  const PageComponent = pageMap[activeSection] || HomePage;

  return (
    <div className="app-container">
      <Sidebar active={activeSection} />
      <PageComponent />
    </div>
   );
}
// 侧边栏导航 - 单 Settings 入口，图标统一使用 Material Symbols Outlined
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/use-theme.js';
import { tizen } from '../services/tizen/index.js';

const sections = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'live-tv', label: 'Live TV', icon: 'tv' },
  { id: 'apps', label: 'Applications', icon: 'grid-2x2' },
  { id: 'gaming', label: 'Gaming', icon: 'gamepad-2' },
  { id: 'settings', label: 'Settings', icon: 'settings-2' },
];

export default function Sidebar({ active }) {
  const [theme] = useTheme();
  const isActive = (id) => id === active;

  const handleNavigate = (section) => {
    // 页面跳转逻辑由路由处理，这里仅触发聚焦
    tizen.subscribeToEvents((event, data) => {
      if (event === 'navigation-change') {
        // 实际导航由路由组件处理
      }
    });
  };

  return (
    <nav className="sidebar" role="navigation" aria-label="Main navigation">
      <ul className="sidebar-items">
        {sections.map(section => (
          <li key={section.id}>
            <Link
              to={`/${section.id}`}
              className={`sidebar-item ${isActive(section.id) ? 'active' : ''}`}
              aria-label={section.label}
              onClick={() => handleNavigate(section.id)}
            >
              <span
                className="sidebar-icon"
                data-lucide="{section.icon}"
                style={{ opacity: isActive(section.id) ? 1 : 0.8 }}
              />
              <span className="sidebar-label">{section.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
// Recent 卡片组件 - 时间线样式
import { useTheme } from '../hooks/use-theme.js';
import { formatDistanceToNow } from 'date-fns';

export default function RecentCard({ app, item, onClick }) {
  const [theme] = useTheme();
  const ago = formatDistanceToNow(new Date(item.timestamp), { addSuffix: true });
  const iconName = app?.iconPath ? app.iconPath.split('/').pop().replace(/\.[^.]+$/, '') : app?.id || '';
  const glyph = iconName.length > 2 ? iconName.slice(0, 2).toUpperCase() : iconName.toUpperCase();

  return (
    <button
      className="recent-card"
      onClick={() => onClick?.({ id: app?.id, name: app?.name })}
      aria-label={`${app?.name || app?.id} - ${ago}`}
    >
      <div className="card-bg" style={{ background: `linear-gradient(135deg, var(--bg-glass) 0%, var(--bg-glass-hover) 100%)` }} />
      <div className="card-content">
        <div className="app-icon">
          <span className="icon-glyph" data-lucide="{glyph}" />
        </div>
        <div className="app-info">
          <h3 className="app-name">{app?.name || app?.id}</h3>
          <p className="timestamp">{ago}</p>
        </div>
      </div>
    </button>
  );
}
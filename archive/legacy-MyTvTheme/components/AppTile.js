// 应用卡片组件 - 单色描边图标 + 交互反馈
import { useState } from 'react';
import { useTheme } from '../hooks/use-theme.js';

export default function AppTile({ app, onClick, isFavorite, onToggle }) {
  const [pressed, setPressed] = useState(false);
  const [theme] = useTheme();
  const iconName = app.iconPath ? app.iconPath.split('/').pop().replace(/\.[^.]+$/, '') : app.id;
  const glyph = iconName.length > 2 ? iconName.slice(0, 2).toUpperCase() : iconName.toUpperCase();

  return (
    <button
      className={`app-tile ${isFavorite ? 'is-favorite' : ''} ${pressed ? 'is-pressed' : ''}`}
      data-app-id={app.id}
      onClick={(e) => {
        e.stopPropagation();
        if (onToggle) {
          onToggle();
          return;
        }
        onClick?.(app);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      aria-label={app.name || app.id}
    >
      <div className="app-icon" style={{ opacity: isFavorite ? 1 : 0.8 }}>
        <span className="icon-glyph" data-lucide="{glyph}" />
      </div>
      <div className="app-name">{app.name || app.id}</div>
      {isFavorite && (
        <div className="app-favorite-indicator">★</div>
      )}
      {onToggle && (
        <div className="app-toggle" role="switch" aria-checked={isFavorite}>
          <span className="toggle-track" />
          <span className="toggle-thumb" />
        </div>
      )}
    </button>
  );
}
// 图标渲染组件 - 全局字体加载
import { useEffect } from 'react';
import { useTheme } from '../hooks/use-theme.js';

export default function Icon({ name, size = 24, className = '', ...props }) {
  const [theme] = useTheme();
  const ref = useRef(null);

  useEffect(() => {
    if (!document.getElementById('material-symbols-outlined')) {
      const link = document.createElement('link');
      link.id = 'material-symbols-outlined';
      link.rel = 'stylesheet';
      link.href = '/assets/fonts/MaterialSymbolsOutlined-subset.woff2';
      document.head.appendChild(link);
    }
  }, [theme]);

  return (
    <span
      ref={ref}
      className={`icon ${className}`}
      data-lucide="{name}"
      style={{ fontSize: `${size}px`, opacity: props.focused ? 1 : 0.8 }}
      {...props}
    />
  );
}
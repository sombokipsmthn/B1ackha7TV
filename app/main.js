// Main entry point - App bootstrap
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import AppRouter from './router.js';
import { tizen, isSupported, getDeviceInfo } from './services/tizen/index.js';
import { loadPrefs, savePrefs } from './utils/storage.js';

// 环境日志
const deviceInfo = getDeviceInfo();
console.log(`[${deviceInfo.isTizen ? 'Tizen' : 'Browser'}] Device:`, deviceInfo.userAgent);

// Tizen 初始化
let tv;
if (typeof window !== 'undefined' && window.tizen) {
  tv = window.tizen;
  console.log('Tizen API available');
} else {
  console.log('Browser preview mode - using mock data');
  // 应用 mock Tizen API
  window.tizen = tizen.browser;
  tv = window.tizen;
}

// 监听导航事件
window.addEventListener('keydown', (e) => {
  const prefs = loadPrefs();
  const animation = prefs.animation !== false;
  const focusGlow = prefs.focusGlow !== false;

  // 导航按键映射
  switch (e.keyCode) {
    case 37: // Left
      if (document.activeElement.tagName !== 'INPUT') {
        tizen.broadcastEvent('navigation-change', 'arrow-left');
      }
      break;
    case 39: // Right
      if (document.activeElement.tagName !== 'INPUT') {
        tizen.broadcastEvent('navigation-change', 'arrow-right');
      }
      break;
    case 13: // OK/Enter
      if (document.activeElement.tagName === 'BUTTON') {
        document.activeElement.click();
      }
      break;
    case 406: // Blue key
      tizen.launchApp('settings');
      break;
    case 27: // Back
      window.history.back();
      break;
  }
});

// 时钟更新
function updateClock() {
  const clockEl = document.getElementById('clock');
  const dateEl = document.getElementById('date');
  if (clockEl) {
    clockEl.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
}
setInterval(updateClock, 30000);
updateClock();

// 渲染应用
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <AppRouter />
  </BrowserRouter>
);

// 暴露全局 API 供调试
window.b1ackha7tv = {
  tizen,
  loadPrefs,
  savePrefs,
  deviceInfo,
};

export { tv };
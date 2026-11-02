// SETTINGS 页面 - 单一入口，合并原有重复项
import { useState } from 'react';
import { useTheme } from '../hooks/use-theme.js';
import { loadPrefs, savePrefs } from '../utils/storage.js';
import { tizen } from '../services/tizen/index.js';
import Sidebar from '../components/Sidebar.js';

export default function SettingsPage() {
  const [theme, setTheme] = useTheme();
  const [background, setBackground] = useState(loadPrefs().background || '');
  const [preview, setPreview] = useState(loadPrefs().preview !== false);
  const [system, setSystem] = useState(loadPrefs().system || false);
  const [launcherName, setLauncherName] = useState(loadPrefs().name || 'My TV');
  const [iconSize, setIconSize] = useState(loadPrefs().iconSize || 24);
  const [animation, setAnimation] = useState(loadPrefs().animation !== false);
  const [focusGlow, setFocusGlow] = useState(loadPrefs().focusGlow !== false);
  const [fontFamily, setFontFamily] = useState(loadPrefs().fontFamily || '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif');

  const handleSave = () => {
    const prefs = loadPrefs();
    prefs.theme = theme;
    prefs.background = background;
    prefs.preview = preview;
    prefs.system = system;
    prefs.name = launcherName.trim().replace(/[^\w\s-]/g, '').trim().slice(0,32) || 'My TV';
    prefs.iconSize = iconSize;
    prefs.animation = animation;
    prefs.focusGlow = focusGlow;
    prefs.fontFamily = fontFamily;
    savePrefs(prefs);
    // 应用主题变化
    document.documentElement.style.setProperty('--theme-main', `var(--theme-${theme})`);
    // 重新加载字体
    const link = document.querySelector('link[href*="MaterialSymbolsOutlined"]');
    if (link) link.href = link.href.replace(/\.(ttf|woff2)$/, `.${theme === 'cinematic' ? 'ttf' : 'woff2'}`);
    alert('Settings saved');
  };

  const handleReset = () => {
    const defaults = {
      theme: 'cinematic',
      background: '',
      preview: true,
      system: false,
      name: 'My TV',
      iconSize: 24,
      animation: true,
      focusGlow: true,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif',
    };
    Object.keys(defaults).forEach(key => {
      if (key === 'theme') setTheme(defaults[key]);
      else if (key === 'fontFamily') setFontFamily(defaults[key]);
      else eval(`set${key.charAt(0).toUpperCase()}${key.slice(1)}`)(defaults[key]);
    });
  };

  const handleIconSizeChange = (e) => {
    const val = parseInt(e.target.value);
    if (val >= 16 && val <= 64) setIconSize(val);
  };

  return (
    <div className="page settings-page">
      <Sidebar active="settings" />
      <main className="content">
        <header className="header">
          <div className="header-left">
            <Brand />
            <h1>Settings</h1>
            <p className="subtitle">Customize your launcher</p>
          </div>
        </header>

        <div className="settings-sections">
          <section className="section">
            <h3>Launcher Identity</h3>
            <div className="field">
              <label htmlFor="launcher-name">Launcher name</label>
              <input id="launcher-name" type="text" value={launcherName} onChange={e => setLauncherName(e.target.value)} maxLength={32} placeholder="My TV" />
            </div>
          </section>

          <section className="section">
            <h3>Appearance</h3>
            <div className="field">
              <label>Theme</label>
              <select value={theme} onChange={e => setTheme(e.target.value)}>
                <option value="cinematic">Cinematic</option>
                <option value="midnight">Midnight</option>
                <option value="aurora">Aurora</option>
                <option value="ember">Ember</option>
              </select>
            </div>
            <div className="field">
              <label>Background image</label>
              <div className="row">
                <input type="text" value={background} onChange={e => setBackground(e.target.value)} placeholder="assets/background.jpg" maxLength={180} />
                <button onClick={() => {
                  // 打开背景选择器
                  tizen.mockGetAppsInfo(() => {}); // 触发文件选择
                }}>Choose</button>
              </div>
            </div>
            <div className="field">
              <label>Icon size (px)</label>
              <input type="number" value={iconSize} onChange={handleIconSizeChange} min={16} max={64} />
            </div>
            <div className="field toggle">
              <label>Animation effects</label>
              <button className={`toggle ${animation ? 'on' : ''}`} onClick={() => setAnimation(!animation)} />
            </div>
            <div className="field toggle">
              <label>Focus glow on navigation</label>
              <button className={`toggle ${focusGlow ? 'on' : ''}`} onClick={() => setFocusGlow(!focusGlow)} />
            </div>
          </section>

          <section className="section">
            <h3>TV Integration</h3>
            <div className="field toggle">
              <label>Show system apps</label>
              <button className={`toggle ${system ? 'on' : ''}`} onClick={() => setSystem(!system)} />
            </div>
            <div className="field">
              <label>Preview TV input</label>
              <button className={`toggle ${preview ? 'on' : ''}`} onClick={() => setPreview(!preview)} />
            </div>
            <div className="field">
              <label>Font family</label>
              <input type="text" value={fontFamily} onChange={e => setFontFamily(e.target.value)} placeholder="System font" />
            </div>
          </section>
        </div>

        <footer className="settings-footer">
          <button onClick={handleSave}>Save</button>
          <button onClick={handleReset}>Reset to defaults</button>
        </footer>
      </main>
    </div>
  );
}
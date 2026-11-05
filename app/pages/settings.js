// SETTINGS 页面 - 双栏布局，Appearance 完整实现
import { useState, useCallback } from 'react';
import { useTheme, WALLPAPERS, ACCENT_COLORS } from '../hooks/use-theme.js';
import { loadPrefs, savePrefs, resetAppearance as resetAppearanceUtil } from '../utils/storage.js';
import { tizen } from '../services/tizen/index.js';
import Sidebar from '../components/Sidebar.js';
import { WifiIcon, SettingsButton, Brand, Clock, PreviewPanel, SourceCard } from './home.js';

export default function SettingsPage() {
  const {
    theme,
    wallpaper,
    wallpaperPosition,
    backgroundDimming,
    fontFamily,
    accentColor,
    focusGlow,
    animationsEnabled,
    animationSpeed,
    setTheme,
    setWallpaper,
    setWallpaperPosition,
    setBackgroundDimming,
    setFontFamily,
    setAccentColor,
    setFocusGlow,
    setAnimationsEnabled,
    setAnimationSpeed,
    resetAppearance,
  } = useTheme();

  const [preview, setPreview] = useState(loadPrefs().preview !== false);
  const [system, setSystem] = useState(loadPrefs().system || false);
  const [launcherName, setLauncherName] = useState(loadPrefs().name || 'My TV');

  const handleSave = useCallback(() => {
    const prefs = loadPrefs();
    prefs.name = launcherName.trim().replace(/[^\w\s-]/g, '').trim().slice(0, 32) || 'My TV';
    prefs.preview = preview;
    prefs.system = system;
    savePrefs(prefs);
    alert('Settings saved');
  }, [launcherName, preview, system]);

  const handleResetAppearance = useCallback(() => {
    if (confirm('Reset all Appearance settings to defaults?')) {
      resetAppearance();
      // Also update local state
      setLauncherName('My TV');
    }
  }, [resetAppearance]);

  return (
    <div className="page settings-page">
      <Sidebar active="settings" />
      <main className="settings-main">
        <header className="settings-header">
          <div className="header-left">
            <Brand />
            <h1>Settings</h1>
            <p className="subtitle">Customize your launcher</p>
          </div>
        </header>

        <div className="settings-layout">
          {/* Settings Sidebar */}
          <aside className="settings-sidebar">
            <nav aria-label="Settings categories">
              <ul className="settings-categories">
                <li>
                  <button
                    className="settings-category active"
                    aria-current="page"
                    onClick={() => {}}
                  >
                    <span className="category-icon">🎨</span>
                    <span>Appearance</span>
                    <span className="category-badge">Active</span>
                  </button>
                </li>
                <li>
                  <button className="settings-category" disabled>
                    <span className="category-icon">🖥️</span>
                    <span>Display</span>
                    <span className="category-badge coming-soon">Soon</span>
                  </button>
                </li>
                <li>
                  <button className="settings-category" disabled>
                    <span className="category-icon">📱</span>
                    <span>Apps</span>
                    <span className="category-badge coming-soon">Soon</span>
                  </button>
                </li>
                <li>
                  <button className="settings-category" disabled>
                    <span className="category-icon">🎮</span>
                    <span>Gaming & Inputs</span>
                    <span className="category-badge coming-soon">Soon</span>
                  </button>
                </li>
                <li>
                  <button className="settings-category" disabled>
                    <span className="category-icon">⚙️</span>
                    <span>Launcher Behaviour</span>
                    <span className="category-badge coming-soon">Soon</span>
                  </button>
                </li>
                <li>
                  <button className="settings-category" disabled>
                    <span className="category-icon">🎮</span>
                    <span>Remote & Controls</span>
                    <span className="category-badge coming-soon">Soon</span>
                  </button>
                </li>
                <li>
                  <button className="settings-category" disabled>
                    <span className="category-icon">ℹ️</span>
                    <span>About & Diagnostics</span>
                    <span className="category-badge coming-soon">Soon</span>
                  </button>
                </li>
              </ul>
            </nav>
          </aside>

          {/* Settings Content Panel */}
          <section className="settings-panel" aria-labelledby="appearance-heading">
            <h2 id="appearance-heading">Appearance</h2>

            {/* Live Preview */}
            <div className="preview-area" aria-label="Live preview of appearance settings">
              <div className="preview-title">Live Preview</div>
              <div className="preview-content">
                <h3 className="preview-heading">Sample Heading</h3>
                <p className="preview-text">Secondary text to preview font and contrast</p>
                <div className="preview-controls">
                  <button className="preview-tile selected" tabIndex="0">
                    <span className="preview-icon">📺</span>
                    <span>Selected Tile</span>
                  </button>
                  <button className="preview-button" tabIndex="0">
                    Sample Button
                  </button>
                </div>
                <div className="preview-focus-border" />
              </div>
            </div>

            {/* Wallpaper Selection */}
            <div className="setting-section">
              <h3>Wallpaper</h3>
              <p className="setting-description">Choose a built-in background</p>

              <div className="wallpaper-gallery" role="radiogroup" aria-label="Wallpaper selection">
                {Object.entries(WALLPAPERS).map(([key, path]) => (
                  <button
                    key={key}
                    className={`wallpaper-thumb ${wallpaper === key ? 'selected' : ''}`}
                    onClick={() => setWallpaper(key)}
                    role="radio"
                    aria-checked={wallpaper === key}
                    aria-label={key.charAt(0).toUpperCase() + key.slice(1)}
                    tabIndex={wallpaper === key ? 0 : -1}
                  >
                    <div className="thumb-image" style={{ backgroundImage: `url("${path}")` }} />
                    <span className="thumb-label">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    {wallpaper === key && (
                      <span className="checkmark" aria-hidden="true">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Wallpaper Positioning */}
            <div className="setting-section">
              <h3>Wallpaper Positioning</h3>
              <p className="setting-description">How the wallpaper fits the screen</p>

              <div className="setting-control-group">
                <select
                  value={wallpaperPosition}
                  onChange={(e) => setWallpaperPosition(e.target.value)}
                  className="setting-select"
                >
                  <option value="fill">Fill (Cover)</option>
                  <option value="fit">Fit (Contain)</option>
                  <option value="crop">Crop (Center)</option>
                </select>
              </div>
            </div>

            {/* Background Dimming */}
            <div className="setting-section">
              <h3>Background Dimming</h3>
              <p className="setting-description">Overlay intensity for better readability</p>

              <div className="setting-control-group">
                <input
                  type="range"
                  min="0"
                  max="70"
                  step="5"
                  value={backgroundDimming}
                  onChange={(e) => setBackgroundDimming(parseInt(e.target.value))}
                  className="setting-slider"
                  aria-label="Background dimming percentage"
                />
                <output className="slider-value">{backgroundDimming}%</output>
              </div>
            </div>

            {/* Interface Font */}
            <div className="setting-section">
              <h3>Interface Font</h3>
              <p className="setting-description">Global font for the launcher</p>

              <div className="setting-control-group">
                <div className="font-display">
                  <span className="font-name">Outfit</span>
                  <span className="font-status">Default · Active</span>
                </div>
              </div>
            </div>

            {/* Accent Colour */}
            <div className="setting-section">
              <h3>Accent Colour</h3>
              <p className="setting-description">Color for highlights, focus, and selections</p>

              <div className="accent-gallery" role="radiogroup" aria-label="Accent color selection">
                {Object.entries(ACCENT_COLORS).map(([key, colors]) => (
                  <button
                    key={key}
                    className={`accent-swatch ${accentColor === key ? 'selected' : ''}`}
                    onClick={() => setAccentColor(key)}
                    role="radio"
                    aria-checked={accentColor === key}
                    aria-label={key.charAt(0).toUpperCase() + key.slice(1)}
                    tabIndex={accentColor === key ? 0 : -1}
                    style={{
                      background: colors.primary,
                      boxShadow: accentColor === key
                        ? `0 0 0 2px ${colors.primary}, 0 0 16px ${colors.glow}`
                        : 'none'
                    }}
                  >
                    {accentColor === key && (
                      <span className="checkmark" aria-hidden="true">✓</span>
                    )}
                    <span className="accent-label">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Focus Glow */}
            <div className="setting-section">
              <h3>Focus Glow</h3>
              <p className="setting-description">Visual emphasis on focused elements</p>

              <div className="setting-control-group">
                <select
                  value={focusGlow}
                  onChange={(e) => setFocusGlow(e.target.value)}
                  className="setting-select"
                >
                  <option value="off">Off</option>
                  <option value="subtle">Subtle</option>
                  <option value="strong">Strong</option>
                </select>
              </div>
            </div>

            {/* Animations */}
            <div className="setting-section">
              <h3>Animations</h3>
              <p className="setting-description">Interface transitions and motion</p>

              <div className="setting-control-group">
                <label className="toggle-label">
                  <span>Animations</span>
                  <button
                    className={`toggle ${animationsEnabled ? 'on' : ''}`}
                    onClick={() => setAnimationsEnabled(!animationsEnabled)}
                    aria-pressed={animationsEnabled}
                  />
                </label>
              </div>

              {animationsEnabled && (
                <div className="setting-control-group">
                  <label>Animation Speed</label>
                  <select
                    value={animationSpeed}
                    onChange={(e) => setAnimationSpeed(e.target.value)}
                    className="setting-select"
                  >
                    <option value="slow">Slow</option>
                    <option value="normal">Normal</option>
                    <option value="fast">Fast</option>
                  </select>
                </div>
              )}
            </div>

            {/* Reset Appearance */}
            <div className="setting-section reset-section">
              <div className="setting-control-group">
                <button
                  className="setting-btn danger"
                  onClick={handleResetAppearance}
                >
                  Reset Appearance to Defaults
                </button>
              </div>
              <p className="reset-hint">Restores wallpaper, dimming, accent, focus glow, and animations</p>
            </div>
          </section>
        </div>

        <footer className="settings-footer">
          <button onClick={handleSave} className="primary-btn">Save All Settings</button>
        </footer>
      </main>
    </div>
  );
}
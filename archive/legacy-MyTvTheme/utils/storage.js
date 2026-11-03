// Settings persistence utility
// Centralizes all preferences and provides load/save with defaults

const STORAGE_KEY = 'b1ackha7tv.settings.v1';

// Default preferences matching the specification
const DEFAULTS = {
  // Basic settings
  name: 'My TV',
  theme: 'cinematic',
  background: '',
  preview: true,
  system: false,
  favorites: [],
  iconSize: 24,

  // Appearance settings
  wallpaper: 'twilight',        // twilight, lake, gradient, earth, aurora
  wallpaperPosition: 'fill',    // fill, fit, crop
  backgroundDimming: 30,        // 0-70%
  fontFamily: 'outfit',         // outfit
  accentColor: 'blue',          // blue, violet, cyan, orange, green
  focusGlow: 'subtle',          // off, subtle, strong
  animationsEnabled: true,      // true/false
  animationSpeed: 'normal',     // slow, normal, fast
};

export function loadPrefs() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to ensure all keys exist
      return { ...DEFAULTS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load prefs:', e);
  }
  return { ...DEFAULTS };
}

export function savePrefs(partial = {}) {
  try {
    const current = loadPrefs();
    const updated = { ...current, ...partial };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Broadcast change event for other components
    if (typeof window !== 'undefined') {
      window.postMessage({ type: 'settings-changed', data: partial }, '*');
    }
    return updated;
  } catch (e) {
    console.error('Failed to save prefs:', e);
    return loadPrefs();
  }
}

export function getPrefs() {
  return loadPrefs();
}

export function resetAppearance() {
  const appearanceDefaults = {
    wallpaper: 'twilight',
    wallpaperPosition: 'fill',
    backgroundDimming: 30,
    fontFamily: 'outfit',
    accentColor: 'blue',
    focusGlow: 'subtle',
    animationsEnabled: true,
    animationSpeed: 'normal',
  };
  return savePrefs(appearanceDefaults);
}

export { DEFAULTS };
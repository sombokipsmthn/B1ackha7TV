// Theme & Appearance Hook
// Manages all appearance settings with live CSS variable updates
// Provides reactive state and persistence

import { useState, useEffect, useCallback } from 'react';
import { loadPrefs, savePrefs } from '../utils/storage.js';

// Wallpaper images mapping - using SVG assets
const WALLPAPERS = {
  twilight: 'assets/wallpapers/twilight-mountains.svg',
  lake: 'assets/wallpapers/lake-dusk.svg',
  gradient: 'assets/wallpapers/abstract-gradient.svg',
  earth: 'assets/wallpapers/earth-space.svg',
  aurora: 'assets/wallpapers/northern-lights.svg',
};

// Accent color definitions
const ACCENT_COLORS = {
  blue: { primary: '#3b82f6', glow: 'rgba(59, 130, 246, 0.6)', subtle: 'rgba(59, 130, 246, 0.25)' },
  violet: { primary: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.6)', subtle: 'rgba(139, 92, 246, 0.25)' },
  cyan: { primary: '#06b6d4', glow: 'rgba(6, 182, 212, 0.6)', subtle: 'rgba(6, 182, 212, 0.25)' },
  orange: { primary: '#f97316', glow: 'rgba(249, 115, 22, 0.6)', subtle: 'rgba(249, 115, 22, 0.25)' },
  green: { primary: '#22c55e', glow: 'rgba(34, 197, 94, 0.6)', subtle: 'rgba(34, 197, 94, 0.25)' },
};

// Focus glow definitions
const FOCUS_GLOW = {
  off: { border: 'none', shadow: 'none', activeBorder: 'none', activeShadow: 'none' },
  subtle: {
    border: '2px solid var(--border-focus)',
    shadow: '0 0 16px var(--accent-blue-glow)',
    activeBorder: '3px solid var(--accent-blue)',
    activeShadow: '0 0 24px var(--accent-blue-glow)'
  },
  strong: {
    border: '3px solid var(--accent-blue)',
    shadow: '0 0 32px var(--accent-blue-glow), 0 0 64px var(--accent-blue-glow)',
    activeBorder: '4px solid var(--accent-blue)',
    activeShadow: '0 0 48px var(--accent-blue-glow), 0 0 96px var(--accent-blue-glow)'
  },
};

// Animation speed definitions
const ANIMATION_SPEEDS = {
  slow: { fast: '300ms', normal: '500ms', slow: '700ms' },
  normal: { fast: '150ms', normal: '250ms', slow: '400ms' },
  fast: { fast: '75ms', normal: '125ms', slow: '200ms' },
};

export function useTheme() {
  const [prefs, setPrefs] = useState(() => loadPrefs());
  const [theme, setThemeState] = useState(prefs.theme);
  const [wallpaper, setWallpaper] = useState(prefs.wallpaper);
  const [wallpaperPosition, setWallpaperPosition] = useState(prefs.wallpaperPosition);
  const [backgroundDimming, setBackgroundDimming] = useState(prefs.backgroundDimming);
  const [fontFamily, setFontFamily] = useState(prefs.fontFamily);
  const [accentColor, setAccentColor] = useState(prefs.accentColor);
  const [focusGlow, setFocusGlow] = useState(prefs.focusGlow);
  const [animationsEnabled, setAnimationsEnabled] = useState(prefs.animationsEnabled);
  const [animationSpeed, setAnimationSpeed] = useState(prefs.animationSpeed);

  // Apply CSS variables to document root
  const applyTheme = useCallback((newPrefs = prefs) => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Theme gradient
    root.style.setProperty('--theme-cinematic', 'radial-gradient(ellipse at 10% 0%,#244357 0%,transparent 55%),linear-gradient(130deg,#131b33,#090e1b)');
    root.style.setProperty('--theme-midnight', 'radial-gradient(ellipse at 10% 0%,#244357 0%,transparent 55%),linear-gradient(130deg,#131b33,#090e1b)');
    root.style.setProperty('--theme-aurora', 'radial-gradient(ellipse at 0% 0%,#24746c 0%,transparent 60%),linear-gradient(130deg,#20224c,#101426)');
    root.style.setProperty('--theme-ember', 'radial-gradient(ellipse at 0% 0%,#854b39 0%,transparent 60%),linear-gradient(130deg,#3d263c,#121325)');
    root.style.setProperty('--theme-twilight', 'radial-gradient(circle at 20% 20%, #1a2332 0%, #0a1222 100%)');

    // Wallpaper
    const wp = WALLPAPERS[newPrefs.wallpaper] || WALLPAPERS.twilight;
    root.style.setProperty('--wallpaper-image', `url("${wp}")`);
    root.style.setProperty('--wallpaper-position', newPrefs.wallpaperPosition);

    // Background dimming overlay
    const dimming = Math.max(0, Math.min(70, newPrefs.backgroundDimming)) / 100;
    root.style.setProperty('--bg-dimming', `rgba(5, 8, 16, ${dimming})`);

    // Font family
    root.style.setProperty('--font-family', newPrefs.fontFamily === 'outfit'
      ? '"Outfit", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif'
      : newPrefs.fontFamily);

    // Accent colors
    const accent = ACCENT_COLORS[newPrefs.accentColor] || ACCENT_COLORS.blue;
    root.style.setProperty('--accent-primary', accent.primary);
    root.style.setProperty('--accent-glow', accent.glow);
    root.style.setProperty('--accent-subtle', accent.subtle);
    root.style.setProperty('--border-focus', accent.glow);
    root.style.setProperty('--shadow-focus', `0 0 0 2px ${accent.primary}, 0 0 24px ${accent.glow}`);
    root.style.setProperty('--shadow-glow', `0 0 32px ${accent.glow}`);

    // Focus glow
    const glow = FOCUS_GLOW[newPrefs.focusGlow] || FOCUS_GLOW.subtle;
    root.style.setProperty('--focus-border', glow.border);
    root.style.setProperty('--focus-shadow', glow.shadow);
    root.style.setProperty('--active-border', glow.activeBorder);
    root.style.setProperty('--active-shadow', glow.activeShadow);

    // Animations
    if (newPrefs.animationsEnabled) {
      const speeds = ANIMATION_SPEEDS[newPrefs.animationSpeed] || ANIMATION_SPEEDS.normal;
      root.style.setProperty('--transition-fast', `${speeds.fast} cubic-bezier(0.4, 0, 0.2, 1)`);
      root.style.setProperty('--transition-normal', `${speeds.normal} cubic-bezier(0.4, 0, 0.2, 1)`);
      root.style.setProperty('--transition-slow', `${speeds.slow} cubic-bezier(0.4, 0, 0.2, 1)`);
    } else {
      root.style.setProperty('--transition-fast', '0.01ms');
      root.style.setProperty('--transition-normal', '0.01ms');
      root.style.setProperty('--transition-slow', '0.01ms');
    }

    // Apply theme gradient to wallpaper
    root.style.setProperty('--theme-main', `var(--theme-${newPrefs.theme})`);
  }, [prefs]);

  // Initialize on mount
  useEffect(() => {
    applyTheme(prefs);
  }, [applyTheme, prefs]);

  // Persist and apply changes
  const persistAndApply = useCallback((key, value) => {
    setPrefs(prev => {
      const updated = { ...prev, [key]: value };
      savePrefs(updated);
      applyTheme(updated);
      return updated;
    });
  }, [applyTheme]);

  // Individual setters for each setting
  const setTheme = useCallback((value) => {
    setThemeState(value);
    persistAndApply('theme', value);
  }, [persistAndApply]);

  const setWallpaper = useCallback((value) => {
    setWallpaper(value);
    persistAndApply('wallpaper', value);
  }, [persistAndApply]);

  const setWallpaperPosition = useCallback((value) => {
    setWallpaperPosition(value);
    persistAndApply('wallpaperPosition', value);
  }, [persistAndApply]);

  const setBackgroundDimming = useCallback((value) => {
    const clamped = Math.max(0, Math.min(70, value));
    setBackgroundDimming(clamped);
    persistAndApply('backgroundDimming', clamped);
  }, [persistAndApply]);

  const setFontFamily = useCallback((value) => {
    setFontFamily(value);
    persistAndApply('fontFamily', value);
  }, [persistAndApply]);

  const setAccentColor = useCallback((value) => {
    setAccentColor(value);
    persistAndApply('accentColor', value);
  }, [persistAndApply]);

  const setFocusGlow = useCallback((value) => {
    setFocusGlow(value);
    persistAndApply('focusGlow', value);
  }, [persistAndApply]);

  const setAnimationsEnabled = useCallback((value) => {
    setAnimationsEnabled(value);
    persistAndApply('animationsEnabled', value);
  }, [persistAndApply]);

  const setAnimationSpeed = useCallback((value) => {
    setAnimationSpeed(value);
    persistAndApply('animationSpeed', value);
  }, [persistAndApply]);

  // Reset all appearance settings
  const resetAppearance = useCallback(() => {
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

    Object.entries(appearanceDefaults).forEach(([key, value]) => {
      if (key === 'wallpaper') setWallpaper(value);
      else if (key === 'wallpaperPosition') setWallpaperPosition(value);
      else if (key === 'backgroundDimming') setBackgroundDimming(value);
      else if (key === 'fontFamily') setFontFamily(value);
      else if (key === 'accentColor') setAccentColor(value);
      else if (key === 'focusGlow') setFocusGlow(value);
      else if (key === 'animationsEnabled') setAnimationsEnabled(value);
      else if (key === 'animationSpeed') setAnimationSpeed(value);
    });
  }, [setWallpaper, setWallpaperPosition, setBackgroundDimming, setFontFamily, setAccentColor, setFocusGlow, setAnimationsEnabled, setAnimationSpeed]);

  return {
    // State
    theme,
    wallpaper,
    wallpaperPosition,
    backgroundDimming,
    fontFamily,
    accentColor,
    focusGlow,
    animationsEnabled,
    animationSpeed,

    // All prefs
    prefs,

    // Setters
    setTheme,
    setWallpaper,
    setWallpaperPosition,
    setBackgroundDimming,
    setFontFamily,
    setAccentColor,
    setFocusGlow,
    setAnimationsEnabled,
    setAnimationSpeed,

    // Utility
    resetAppearance,
    applyTheme: () => applyTheme(prefs),
  };
}

// Also export constants for use in components
export { WALLPAPERS, ACCENT_COLORS, FOCUS_GLOW, ANIMATION_SPEEDS };
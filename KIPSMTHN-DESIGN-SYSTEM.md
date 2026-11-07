# KIPSMTHN TV — DESIGN SYSTEM

**Version:** 1.0.0 (Consolidated)  
**Status:** Target specification — to be implemented from audit findings  
**Based on:** KIPSMTHN-MASTER-UI-AUDIT.md

---

## DESIGN PRINCIPLES

1. **Television-First** — Every decision optimized for 10-foot viewing, remote navigation
2. **Cohesive** — Single token authority, consistent components, predictable motion
3. **Premium** — Refined easing, subtle depth, restrained color, purposeful animation
4. **Accessible** — High contrast support, reduced motion, screen reader compatible
5. **Performant** — Minimal bundle, efficient rendering, TV-hardware conscious

---

## COLOR SYSTEM

### Primitive Tokens (Raw Values)
```css
/* Brand */
--color-brand-50: #E8F9FA;
--color-brand-100: #B4F1D8;  /* PRIMARY ACCENT */
--color-brand-200: #7DE8B8;
--color-brand-300: #4DE098;
--color-brand-400: #2DD680;
--color-brand-500: #1ABC6C;
--color-brand-600: #169B58;
--color-brand-700: #127A44;
--color-brand-800: #0E5930;
--color-brand-900: #0A381C;

/* Neutral */
--color-neutral-0: #FFFFFF;
--color-neutral-50: #F2F3F4;
--color-neutral-100: #E5E7EB;
--color-neutral-200: #D1D5DB;
--color-neutral-300: #9CA3AF;
--color-neutral-400: #6B7280;
--color-neutral-500: #4B5563;
--color-neutral-600: #374151;
--color-neutral-700: #1F2937;
--color-neutral-800: #111827;
--color-neutral-900: #090A0C;
--color-neutral-950: #050810;

/* Semantic Status */
--color-success-500: #10B981;
--color-warning-500: #F59E0B;
--color-error-500: #EF4444;
--color-info-500: #3B82F6;
```

### Semantic Tokens (Usage-Oriented)
```css
/* Backgrounds */
--bg-canvas: var(--color-neutral-950);           /* #050810 - Base page background */
--bg-elevated: var(--color-neutral-900);         /* #090A0C - Cards, panels */
--bg-surface: rgba(20, 22, 25, 0.88);            /* Glass surfaces */
--bg-surface-hover: #24282C;                     /* Hover state */
--bg-surface-active: rgba(180, 241, 216, 0.12);  /* Active/focus state */
--bg-overlay: rgba(2, 3, 9, 0.72);               /* Modal backdrops */

/* Text */
--text-primary: var(--color-neutral-50);         /* #F2F3F4 - Headlines, primary content */
--text-secondary: #92979D;                       /* Secondary content, metadata */
--text-muted: rgba(242, 243, 244, 0.62);         /* Supporting text, labels */
--text-dim: rgba(242, 243, 244, 0.38);           /* Disabled, placeholder */
--text-inverse: var(--color-neutral-950);        /* On-brand backgrounds */
--text-on-brand: #142B2D;                        /* On brand accent */

/* Borders */
--border-subtle: rgba(255, 255, 255, 0.08);      /* Default borders */
--border-default: rgba(255, 255, 255, 0.12);     /* Card borders */
--border-strong: rgba(255, 255, 255, 0.2);       /* Emphasized borders */
--border-focus: rgba(180, 241, 216, 0.9);        /* Focus rings */
--border-error: rgba(239, 68, 68, 0.6);          /* Error state */

/* Accent & Glow */
--accent-brand: var(--color-brand-100);          /* #B4F1D8 - Primary brand */
--accent-brand-glow: rgba(180, 241, 216, 0.18);  /* Subtle glow */
--accent-brand-strong: rgba(180, 241, 216, 0.4); /* Strong glow */
```

### High Contrast Mode Overrides
```css
@media (prefers-contrast: high) {
  :root {
    --border-subtle: rgba(255, 255, 255, 0.3);
    --border-default: rgba(255, 255, 255, 0.5);
    --bg-surface: rgba(20, 25, 40, 0.95);
    --text-muted: rgba(255, 255, 255, 0.7);
    --text-dim: rgba(255, 255, 255, 0.5);
  }
}
```

---

## TYPOGRAPHY SYSTEM

### Font Family
```css
--font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif;
--font-family-mono: "SF Mono", "Fira Code", "Consolas", monospace;
```

### Font Weights (Semantic)
```css
--font-weight-light: 300;
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### Type Scale (7 Tokens)
| Token | Clamp Formula | Use Case |
|-------|---------------|----------|
| `--text-display` | `clamp(44px, 4.2vw, 68px)` | Hero headlines, page titles (Settings) |
| `--text-title` | `clamp(30px, 2.5vw, 42px)` | Section titles, panel headings |
| `--text-section` | `clamp(21px, 1.55vw, 28px)` | Content section titles (Home rows) |
| `--text-body` | `clamp(16px, 1.1vw, 20px)` | Primary readable text |
| `--text-label` | `clamp(14px, 0.9vw, 17px)` | Form labels, button text, UI labels |
| `--text-caption` | `clamp(12px, 0.75vw, 15px)` | Metadata, timestamps, helper text |
| `--text-micro` | `clamp(11px, 0.65vw, 13px)` | Badges, pill labels, fine print |

### Line Heights
```css
--line-height-tight: 1.05;    /* Display, Title */
--line-height-normal: 1.25;   /* Section */
--line-height-relaxed: 1.45;  /* Body, Label */
--line-height-loose: 1.6;     /* Long-form reading */
```

### Letter Spacing
```css
--letter-spacing-tight: -0.035em;  /* Display, Title */
--letter-spacing-normal: 0;         /* Section, Body */
--letter-spacing-wide: 0.02em;      /* Label, Caption */
--letter-spacing-wider: 0.08em;     /* Micro, uppercase */
--letter-spacing-widest: 0.2em;     /* Eyebrow/overline (uppercase) */
```

### Text Shadow (For Legibility on Wallpapers)
```css
--text-shadow-subtle: 0 1px 4px rgba(0, 0, 0, 0.6);
--text-shadow-medium: 0 2px 16px rgba(0, 0, 0, 0.5);
--text-shadow-strong: 0 4px 32px rgba(0, 0, 0, 0.4);
```

---

## SPACING SYSTEM

### Base Unit: 4px
```css
--space-0: 0;
--space-1: 4px;    /* xs */
--space-2: 8px;    /* sm */
--space-3: 12px;   /* md-sm */
--space-4: 16px;   /* md */
--space-5: 20px;   /* md-lg */
--space-6: 24px;   /* lg */
--space-8: 32px;   /* xl */
--space-10: 40px;  /* 2xl-sm */
--space-12: 48px;  /* 2xl */
--space-16: 64px;  /* 3xl */
--space-20: 80px;  /* 4xl */
--space-24: 96px;  /* 5xl */
```

### Semantic Spacing
```css
--gap-card: var(--space-6);           /* 24px - Between cards in grids/carousels */
--gap-section: var(--space-12);       /* 48px - Between content sections */
--gap-component: var(--space-4);      /* 16px - Within components */
--gap-inline: var(--space-3);         /* 12px - Inline elements */
--padding-page-x: var(--space-8);     /* 32px - Page horizontal padding (1080p) */
--padding-page-y: var(--space-6);     /* 24px - Page vertical padding */
--padding-card: var(--space-4);       /* 16px - Card internal padding */
--padding-control: var(--space-3);    /* 12px - Control internal padding */
```

### Responsive Safe Areas
```css
--safe-area-x: clamp(64px, 5vw, 120px);   /* Horizontal safe margin */
--safe-area-y: clamp(48px, 5vh, 88px);    /* Vertical safe margin */
```

---

## BORDER RADIUS SYSTEM

```css
--radius-none: 0;
--radius-sm: 8px;      /* Small elements: badges, chips, icons */
--radius-md: 12px;     /* Buttons, inputs, selects, toggles */
--radius-lg: 16px;     /* Cards, tiles, modals, panels */
--radius-xl: 20px;     /* Large cards, featured content */
--radius-2xl: 24px;    /* Hero elements, full-screen modals */
--radius-pill: 999px;  /* Pills, toggles, avatars */
```

---

## SHADOW & ELEVATION SYSTEM

```css
/* Elevation Levels */
--elevation-1: 0 2px 8px rgba(0, 0, 0, 0.3);      /* Subtle: chips, badges */
--elevation-2: 0 8px 24px rgba(0, 0, 0, 0.4);     /* Default: cards, tiles */
--elevation-3: 0 16px 48px rgba(0, 0, 0, 0.5);    /* Raised: modals, dropdowns */
--elevation-4: 0 24px 64px rgba(0, 0, 0, 0.6);    /* Overlay: dialogs, toasts */

/* Special */
--shadow-focus: 0 0 0 2px var(--accent-brand), 0 0 24px var(--accent-brand-glow);
--shadow-glow: 0 0 32px var(--accent-brand-strong);
--shadow-inner: inset 0 2px 4px rgba(0, 0, 0, 0.2);
```

---

## MOTION SYSTEM

### Easing Curves
```css
--ease-standard: cubic-bezier(0.22, 0.61, 0.36, 1);      /* Primary: enter/exit, focus */
--ease-emphasized: cubic-bezier(0.05, 0.7, 0.1, 1.0);    /* Emphasized: hero, page transitions */
--ease-decelerate: cubic-bezier(0.4, 0, 0.2, 1);         /* Material: standard */
--ease-accelerate: cubic-bezier(0.4, 0, 1, 1);           /* Exit only */
```

### Duration Tokens
```css
--duration-instant: 0ms;           /* Reduced motion */
--duration-fast: 150ms;            /* Hover, simple state changes */
--duration-normal: 250ms;          /* Focus, standard transitions */
--duration-slow: 400ms;            /* Panel open/close, modals */
--duration-page: 300ms;            /* Page transitions */
--duration-sidebar: 250ms;         /* Sidebar interactions */
--duration-dialog: 210ms;          /* Dialog open/close */
--duration-toast: 300ms;           /* Toast appear/disappear */
```

### Motion Presets (Semantic)
```css
/* Focus Movement */
--motion-focus: var(--duration-normal) var(--ease-standard);
--motion-focus-transform: var(--duration-fast) var(--ease-standard);

/* Page/Section Transitions */
--motion-page: var(--duration-page) var(--ease-emphasized);
--motion-sidebar: var(--duration-sidebar) var(--ease-standard);
--motion-dialog: var(--duration-dialog) var(--ease-standard);

/* Content */
--motion-content-enter: var(--duration-normal) var(--ease-standard);
--motion-content-exit: var(--duration-fast) var(--ease-accelerate);

/* Wallpaper/Ambient */
--motion-ambient: 46s ease-in-out infinite alternate;
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-instant: 0.01ms;
    --duration-fast: 0.01ms;
    --duration-normal: 0.01ms;
    --duration-slow: 0.01ms;
    --duration-page: 0.01ms;
    --duration-sidebar: 0.01ms;
    --duration-dialog: 0.01ms;
    --motion-ambient: none;
  }
  
  *, *::before, *::after {
    animation-duration: var(--duration-instant) !important;
    animation-iteration-count: 1 !important;
    transition-duration: var(--duration-instant) !important;
    scroll-behavior: auto !important;
  }
}

/* Application-controlled reduced motion */
body.reduced-motion {
  --duration-fast: 90ms;
  --duration-normal: 90ms;
  --duration-slow: 120ms;
  --duration-page: 120ms;
  --duration-sidebar: 100ms;
  --duration-dialog: 100ms;
}

body.reduced-motion #wallpaper {
  animation: none !important;
  transform: none !important;
}
```

---

## BREAKPOINTS

```css
/* Viewport-based (TV resolutions) */
--bp-mobile: 1200px;      /* Below: compressed layout */
--bp-hd: 1920px;          /* 1080p baseline */
--bp-uhd: 3840px;         /* 4K */
--bp-8k: 7680px;          /* Future 8K */

/* Height-based */
--bp-short: 900px;        /* Compressed vertical */
--bp-tall: 1800px;        /* Expanded vertical */
```

### Responsive Token Overrides
```css
@media (max-width: 1920px) {
  :root {
    --safe-area-x: clamp(48px, 4vw, 80px);
    --safe-area-y: clamp(36px, 4vh, 64px);
    --gap-card: var(--space-5);        /* 20px */
    --gap-section: var(--space-10);    /* 40px */
    --text-display: clamp(36px, 3.5vw, 56px);
    --text-title: clamp(26px, 2.2vw, 36px);
    --text-section: clamp(18px, 1.4vw, 24px);
  }
}

@media (min-width: 3840px) {
  :root {
    --safe-area-x: clamp(120px, 5vw, 192px);
    --safe-area-y: clamp(90px, 5vh, 156px);
    --gap-card: var(--space-9);        /* 36px */
    --gap-section: var(--space-16);    /* 64px */
    --text-display: clamp(56px, 4.5vw, 84px);
    --text-title: clamp(40px, 2.8vw, 56px);
    --text-section: clamp(28px, 1.8vw, 36px);
  }
}
```

---

## COMPONENT SPECIFICATIONS

### 1. BUTTON

#### Variants
| Variant | Background | Border | Text | Use Case |
|---------|------------|--------|------|----------|
| Primary | `var(--accent-brand)` | None | `var(--text-on-brand)` | Primary actions |
| Secondary | `var(--bg-surface)` | `var(--border-default)` | `var(--text-primary)` | Secondary actions |
| Ghost | Transparent | None | `var(--text-secondary)` | Tertiary, subtle |
| Danger | Transparent | `var(--border-error)` | `var(--color-error-500)` | Destructive |
| Icon | `var(--bg-surface)` | `var(--border-subtle)` | `var(--text-muted)` → `var(--text-primary)` | Toolbar, icon-only |

#### States
| State | Primary | Secondary | Ghost | Icon |
|-------|---------|-----------|-------|------|
| Default | `--accent-brand` | `--bg-surface` / `--border-default` | Transparent | `--bg-surface` / `--border-subtle` |
| Hover | `--color-brand-200` | `--bg-surface-hover` / `--border-focus` | `--bg-surface` | `--bg-surface-hover` / `--border-focus` |
| Focus | `--shadow-focus` | `--shadow-focus` | `--shadow-focus` | `--shadow-focus` |
| Active | `--color-brand-300` | `--bg-surface-active` | `--bg-surface-active` | `--bg-surface-active` |
| Disabled | `opacity: 0.4` | `opacity: 0.4` | `opacity: 0.4` | `opacity: 0.4` |

#### Sizes
| Size | Height | Padding X | Font | Border Radius |
|------|--------|-----------|------|---------------|
| Small | 36px | 12px | `--text-caption` | `--radius-md` |
| Medium | 44px | 16px | `--text-label` | `--radius-md` |
| Large | 52px | 20px | `--text-label` | `--radius-md` |
| XL | 60px | 24px | `--text-body` | `--radius-lg` |

#### Icon Buttons
```css
.icon-btn {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
}
.icon-btn [data-lucide] {
  width: 24px;
  height: 24px;
  stroke-width: 1.7;
}
```

---

### 2. TOGGLE

```css
.toggle {
  position: relative;
  width: 60px;
  height: 34px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-standard),
              border-color var(--duration-fast) var(--ease-standard);
}

.toggle::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 24px;
  height: 24px;
  background: var(--text-primary);
  border-radius: 50%;
  box-shadow: var(--elevation-1);
  transition: transform var(--duration-normal) var(--ease-standard),
              background var(--duration-fast) var(--ease-standard);
}

.toggle[aria-pressed="true"] {
  background: var(--accent-brand);
  border-color: var(--accent-brand);
}

.toggle[aria-pressed="true"]::after {
  transform: translateX(26px);
  background: var(--text-on-brand);
}

.toggle:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}
```

---

### 3. SELECT / DROPDOWN

```css
.select {
  min-height: var(--control-height);  /* 52px */
  padding: 0 16px;
  padding-right: 40px;  /* Chevron space */
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--text-label);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,<chevron-down>");
  background-repeat: no-repeat;
  background-position: right 12px center;
  transition: border-color var(--duration-fast) var(--ease-standard),
              background-color var(--duration-fast) var(--ease-standard);
}

.select:hover {
  border-color: var(--border-default);
  background: var(--bg-surface-hover);
}

.select:focus-visible {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: var(--shadow-focus);
}

.select option {
  background: var(--bg-elevated);
  color: var(--text-primary);
  padding: var(--space-3) var(--space-4);
}
```

---

### 4. INPUT (Text, Search)

```css
.input {
  min-height: var(--control-height);  /* 52px */
  padding: 0 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--text-label);
  font-family: var(--font-family);
  transition: border-color var(--duration-fast) var(--ease-standard),
              background-color var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard);
}

.input::placeholder {
  color: var(--text-dim);
}

.input:hover {
  border-color: var(--border-default);
}

.input:focus-visible {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: var(--shadow-focus);
  background: var(--bg-surface);
}
```

---

### 5. CARD / TILE (Unified)

#### Base Card
```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--elevation-2);
  transition: border-color var(--motion-focus),
              background-color var(--motion-focus),
              box-shadow var(--motion-focus);
}

.card:hover {
  border-color: var(--border-focus);
  background: var(--bg-surface-hover);
  box-shadow: var(--elevation-3);
}

.card:focus-visible {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: var(--shadow-focus);
}
```

#### App Tile (Home Carousel)
```css
.app-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: var(--app-tile-width);
  height: var(--app-tile-height);
  padding: var(--space-3);
  text-align: center;
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--elevation-2);
}

.app-tile .brand-artwork {
  max-width: 70%;
  max-height: 48%;
  object-fit: contain;
  filter: drop-shadow(0 4px 18px rgba(0, 0, 0, 0.35));
  transition: transform var(--motion-focus-transform);
}

.app-tile .app-name {
  font-size: var(--text-label);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  text-shadow: var(--text-shadow-subtle);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
```

#### Content Card (Continue/Trending)
```css
.content-card {
  width: var(--content-card-width);  /* clamp(240px, 20vw, 380px) */
  height: var(--content-card-height); /* clamp(142px, 11.25vw, 216px) */
  border-radius: var(--radius-xl);
  overflow: hidden;
  position: relative;
}

.content-card .card-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transform: scale(1.02);
  transition: transform var(--motion-content-enter);
}

.content-card .card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.65) 100%);
}

.content-card .card-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: var(--space-5);
  z-index: 2;
}

.content-card .content-title {
  font-size: var(--text-section);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  text-shadow: var(--text-shadow-medium);
  margin: 0 0 var(--space-2);
}

.content-card .content-meta {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin: 0 0 var(--space-3);
}

.content-card .progress-bar {
  width: 100%;
  height: 5px;
  background: rgba(255,255,255,0.12);
  border-radius: 3px;
  overflow: hidden;
}

.content-card .progress-fill {
  height: 100%;
  background: var(--accent-brand);
  border-radius: 2px;
  transition: width 0.3s ease;
}
```

#### Grid Item (Apps/Games/Inputs Pages)
```css
.grid-item {
  min-width: var(--app-tile-width);
  min-height: var(--app-tile-height);
  padding: var(--space-4) var(--space-5);
  gap: var(--space-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  box-shadow: var(--elevation-2);
  transition: border-color var(--motion-focus),
              background-color var(--motion-focus);
}

.grid-item:hover {
  border-color: var(--border-focus);
  background: var(--bg-surface-hover);
}

.grid-item:focus-visible {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: var(--shadow-focus);
}

.grid-item .icon {
  width: 56px;
  height: 56px;
  object-fit: contain;
  margin-bottom: var(--space-2);
}

.grid-item .initial {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-size: 22px;
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
}

.grid-item .name {
  font-size: var(--text-label);
  line-height: var(--line-height-relaxed);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  max-width: 100%;
}
```

---

### 6. CAROUSEL

```css
.carousel {
  display: flex;
  gap: var(--gap-card);
  overflow-x: auto;
  overflow-y: hidden;
  padding: var(--space-2) 0 var(--space-6);
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  /* Hide scrollbar but keep scrollable */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.carousel::-webkit-scrollbar {
  display: none;
}

.carousel-item {
  flex: 0 0 auto;
  width: var(--app-tile-width);
  scroll-snap-align: start;
}

.carousel-item:first-child {
  margin-left: var(--safe-area-x);
}

.carousel-item:last-child {
  margin-right: var(--safe-area-x);
}
```

---

### 7. SIDEBAR NAVIGATION

```css
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--sidebar-width);  /* 104px base */
  height: 100%;
  background: rgba(9, 10, 12, 0.82);
  border-right: 1px solid var(--border-subtle);
  z-index: 20;
  display: flex;
  flex-direction: column;
  padding: var(--space-6) 0;
}

.sidebar-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);  /* 12px */
  width: 100%;
}

.sidebar-item {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-muted);
  transition: background var(--motion-sidebar),
              color var(--motion-sidebar);
}

.sidebar-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

.sidebar-item.active {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

.sidebar-item:focus-visible {
  outline: 2px solid var(--accent-brand);
  outline-offset: 3px;
}

.sidebar-icon {
  width: var(--icon-size-nav);  /* 26px */
  height: var(--icon-size-nav);
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
  color: currentColor;
}
```

---

### 8. MODAL / DIALOG

```css
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-overlay);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.dialog {
  width: min(540px, 80vw);
  padding: var(--space-8);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  box-shadow: var(--elevation-4);
  animation: dialog-enter var(--motion-dialog);
}

@keyframes dialog-enter {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.dialog-heading {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.dialog-title {
  font-size: var(--text-title);
  font-weight: var(--font-weight-semibold);
  margin: 0;
}

.dialog-text {
  font-size: var(--text-body);
  color: var(--text-secondary);
  line-height: var(--line-height-relaxed);
  margin: 0 0 var(--space-6);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
```

---

### 9. TOAST / NOTIFICATION

```css
.toast {
  position: fixed;
  bottom: var(--safe-area-y);
  left: 50%;
  transform: translateX(-50%);
  padding: var(--space-3) var(--space-6);
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--elevation-3);
  color: var(--text-primary);
  font-size: var(--text-label);
  z-index: 200;
  animation: toast-enter var(--duration-toast) var(--ease-standard);
}

@keyframes toast-enter {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.toast.exiting {
  animation: toast-exit var(--duration-fast) var(--ease-accelerate);
}

@keyframes toast-exit {
  to { opacity: 0; transform: translateX(-50%) translateY(-10px); }
}
```

---

### 10. ON-SCREEN KEYBOARD

```css
.keyboard {
  max-width: 900px;
  margin: var(--space-8) auto 0;
  padding: var(--space-6) var(--space-8);
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.keyboard-row {
  display: flex;
  justify-content: center;
  gap: var(--space-1);
}

.key {
  min-width: 44px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: var(--text-label);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  user-select: none;
  transition: all var(--motion-focus);
}

.key:hover,
.key:focus-visible {
  background: var(--accent-brand);
  border-color: var(--accent-brand);
  color: var(--text-on-brand);
}

.key.key-wide {
  min-width: 120px;
  font-size: var(--text-caption);
}

.key.active {
  background: var(--accent-brand);
  color: var(--text-on-brand);
  border-color: var(--accent-brand);
}
```

---

### 11. FOOTER / NAVIGATION HINTS

```css
.footer {
  position: fixed;
  bottom: 0;
  left: var(--sidebar-width);
  right: 0;
  padding: var(--space-4) var(--safe-area-x);
  background: transparent;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 15;
  pointer-events: none;
}

.footer > * {
  pointer-events: auto;
}

.nav-hint {
  font-size: var(--text-caption);
  color: var(--text-muted);
  letter-spacing: 0.02em;
}

.status-text {
  font-size: var(--text-caption);
  color: var(--text-dim);
}

.quick-actions {
  display: flex;
  gap: var(--space-4);
}

.quick-action-btn {
  padding: var(--space-2) var(--space-4);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-medium);
  transition: all var(--motion-focus);
}

.quick-action-btn:hover {
  border-color: var(--border-focus);
  color: var(--text-primary);
}
```

---

## ICON SYSTEM

### Lucide Icons (Subset)
Only include these icons in the production bundle (~30 icons):
```
Navigation: house, search, grid-2x2, gamepad-2, history, tv, settings-2, chevron-left, chevron-right, chevron-up, chevron-down
Actions: play-circle, power, refresh-cw, pencil, trash-2, x, check, plus, minus
Status: wifi, volume-2, volume-x, battery, signal
Media: layout-grid-circles, monitor, gamepad-2, hdmi (use monitor), film, music
UI: sliders-horizontal, palette, layout-dashboard, cpu, info, rotate-ccw, eye, eye-off
Brand: youtube, netflix, prime-video (custom SVGs, not Lucide)
```

### Icon Usage Rules
```css
/* Standard icon size */
.icon-sm { width: 16px; height: 16px; }   /* Inline with caption text */
.icon-md { width: 20px; height: 20px; }   /* Inline with label text */
.icon-lg { width: 24px; height: 24px; }   /* Default UI icons */
.icon-xl { width: 26px; height: 26px; }   /* Sidebar navigation */
.icon-2xl { width: 32px; height: 32px; }  /* Feature tiles, empty states */
.icon-3xl { width: 48px; height: 48px; }  /* App tile placeholders */

/* Stroke weight: always 1.7 for consistency */
[data-lucide] {
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
  color: currentColor;
}

/* Icon colors */
.icon-muted { color: var(--text-muted); }
.icon-secondary { color: var(--text-secondary); }
.icon-primary { color: var(--text-primary); }
.icon-brand { color: var(--accent-brand); }
.icon-error { color: var(--color-error-500); }
.icon-success { color: var(--color-success-500); }
```

---

## SOUND DESIGN

### Audio Cues
| Cue | Trigger | Frequency | Duration | Character |
|-----|---------|-----------|----------|-----------|
| `nav` | Remote directional (up/down/left/right) | 760 Hz | 25 ms | Subtle tick |
| `select` | Enter/Select on button | 620 Hz | 60 ms | Confirmation |
| `back` | Back/Return key | 430→290 Hz | 60 ms | Descending |
| `error` | Failed action, blocked | 190 Hz | 60 ms | Low alert |
| `startup` | First interaction (if enabled) | 520 Hz | 60 ms | Welcome |

### Implementation
```javascript
// Web Audio API (primary - no file dependencies)
const frequencies = {
  nav: 760,
  select: 620,
  back: { start: 430, end: 290 },
  error: 190,
  startup: 520
};

const durations = {
  nav: 0.025,
  select: 0.06,
  back: 0.06,
  error: 0.06,
  startup: 0.06
};

// Volume: master * 0.028 (synthesized)
// Nav debounce: 90ms minimum between cues
```

### Sound Preferences
```css
/* Respect system preferences */
@media (prefers-reduced-motion: reduce) {
  /* Also reduce sound intensity */
}
```

---

## ACCESSIBILITY SPECIFICATIONS

### Color Contrast (WCAG AA)
| Element | Ratio | Target |
|---------|-------|--------|
| Primary text on canvas | 12.6:1 | ✅ AAA |
| Secondary text on canvas | 5.8:1 | ✅ AA |
| Muted text on canvas | 3.6:1 | ⚠️ Large text only |
| Focus ring on surface | 4.5:1 | ✅ AA |
| Brand accent on canvas | 3.2:1 | ⚠️ Large/UI only |
| Brand accent on brand bg | 8.4:1 | ✅ AAA |

### Focus Management
- All interactive elements: visible focus indicator (`outline: 2px solid var(--accent-brand); outline-offset: 3px;`)
- Focus order: logical, follows visual layout
- Modals: trap focus, restore on close
- Page transitions: move focus to first focusable element

### Screen Reader
- `aria-label` on all icon-only buttons
- `aria-live="polite"` on status updates (clock, launch feedback)
- `role="dialog"` and `aria-modal="true"` on modals
- `aria-current="page"` on active navigation
- Semantic HTML: `<nav>`, `<main>`, `<header>`, `<footer>`, `<section>`

### Reduced Motion
- `prefers-reduced-motion` media query respected
- Application toggle (`prefs.reducedMotion`) overrides
- Disables: wallpaper drift, page transitions, focus transforms, hover transforms

### High Contrast Mode
- Increased border opacity
- Solid backgrounds (no transparency)
- Higher text opacity
- Focus rings more prominent

---

## PERFORMANCE BUDGETS

### Bundle Targets
| Asset | Target | Current | Action |
|-------|--------|---------|--------|
| HTML | < 20 KB | ~15 KB | ✅ |
| CSS | < 50 KB | ~45 KB | ✅ (after consolidation) |
| JS (main) | < 100 KB | ~25 KB | ✅ |
| JS (tizen-service) | < 15 KB | ~12 KB | ✅ |
| JS (audio) | < 5 KB | ~3 KB | ✅ |
| Lucide Icons | < 50 KB | 477 KB | ❌ Subset required |
| Wallpapers (6 SVG) | < 20 KB total | ~15 KB | ✅ |
| Posters (4 SVG) | < 30 KB total | TBD | Optimize |
| Audio (5 WAV) | < 30 KB total | ~20 KB | ✅ |

### Runtime Budgets (TV Hardware)
| Metric | Target |
|--------|--------|
| Initial paint | < 1.5s |
| Interactive | < 3s |
| Page transition | < 300ms (instant in reduced motion) |
| Focus response | < 100ms |
| Animation frame rate | 60fps sustained |
| Memory (idle) | < 100 MB |
| Memory (active) | < 150 MB |

### Optimization Strategies
1. **Subset Lucide** to ~30 used icons → ~50 KB
2. **Remove unused 7.1 MB JPG** (`VWMK740-01059.jpg`)
3. **Lazy-load** Settings panels (apps list, diagnostics)
4. **Debounce** `moveFocus()` rect calculations (cache for 50ms)
5. **Limit backdrop-filter** to sidebar, header, modals only
6. **Add `will-change: transform`** to animated elements
7. **Use `content-visibility: auto`** for off-screen sections

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Token Consolidation
- [ ] Remove Layer 2 (`:root` at ~line 2997) and Layer 3 (`:root` at ~line 3101)
- [ ] Migrate necessary values to Layer 1 with semantic names
- [ ] Define all semantic color tokens
- [ ] Define typography scale (7 tokens)
- [ ] Define spacing, radius, shadow, motion tokens
- [ ] Add high contrast mode overrides
- [ ] Add reduced motion overrides

### Phase 2: Component Migration
- [ ] Button (4 variants, 4 sizes)
- [ ] Toggle (single implementation)
- [ ] Select/Dropdown
- [ ] Input/Search
- [ ] Card/Tile (App Tile, Content Card, Grid Item)
- [ ] Carousel
- [ ] Sidebar Navigation
- [ ] Modal/Dialog
- [ ] Toast
- [ ] On-Screen Keyboard
- [ ] Footer/Nav Hints

### Phase 3: Screen Updates
- [ ] Home: Dynamic apps, real artwork, remove dead HTML
- [ ] Search: Keyboard spatial navigation
- [ ] Settings: Migrate to unified system
- [ ] Fix `hdmi-port` → `monitor` icon
- [ ] Remove dead HTML elements (eyebrow, greeting, etc.)

### Phase 4: Motion & Polish
- [ ] Unified easing (`cubic-bezier(0.22, 0.61, 0.36, 1)`)
- [ ] Enable focus transforms (remove `transform: none`)
- [ ] Consistent hover/focus/active states
- [ ] Wallpaper transition smoothing

### Phase 5: Performance & QA
- [ ] Lucide subset build
- [ ] Remove unused JPG
- [ ] Debounce focus calculations
- [ ] Full test suite pass
- [ ] Visual regression baseline update
- [ ] Manual remote testing
- [ ] Accessibility audit

---

## VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-11-06 | Initial audit-based specification |
| 1.0.0 | TBD | Post-implementation baseline |

---

## RELATED DOCUMENTS
- `KIPSMTHN-MASTER-UI-AUDIT.md` — Complete audit findings
- `KIPSMTHN-QA-REPORT.md` — Test results and verification (to be created)
- `CHANGES-DONE.md` — Implementation changelog (to be created)
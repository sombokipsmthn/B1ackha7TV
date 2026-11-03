// 焦点管理器 - 实现遥控器导航
export class FocusManager {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.selector = options.selector || 'button:not(:disabled), input, a[href], [tabindex]:not([tabindex="-1"])';
    this.loop = options.loop !== false;
    this.focusables = [];
    this.current = null;
  }

  init() {
    this.updateFocusables();
    window.addEventListener('resize', () => this.updateFocusables());
    return this;
  }

  updateFocusables() {
    this.focusables = Array.from(this.container.querySelectorAll(this.selector))
      .filter(el => el.offsetParent !== null && !el.closest('[hidden]'));
  }

  get(index) {
    if (!this.focusables.length) return null;
    const total = this.focusables.length;
    if (this.loop) {
      return this.focusables[(index % total + total) % total];
    }
    return this.focusables[Math.max(0, Math.min(index, total - 1))];
  }

  focusNext(delta = 1) {
    const current = this.focusables.indexOf(document.activeElement);
    const next = current + delta;
    const el = this.get(next);
    if (el) el.focus();
    return el;
  }

  focusFirst() {
    return this.get(0);
  }

  focusLast() {
    return this.get(-1);
  }

  focusCurrent() {
    return document.activeElement;
  }
}

// 空间导航 - 最近邻算法
export function nearestNeighbor(from, direction) {
  const fromRect = from.getBoundingClientRect();
  const cx = fromRect.left + fromRect.width / 2;
  const cy = fromRect.top + fromRect.height / 2;

  const items = Array.from(document.querySelectorAll('button:not(:disabled), input, a[href]'))
    .filter(el => {
      if (el === from || el.offsetParent === null) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

  const horizontal = direction === 'left' || direction === 'right';
  const sign = direction === 'right' || direction === 'down' ? 1 : -1;

  let best = null;
  let bestScore = Infinity;

  for (const el of items) {
    const rect = el.getBoundingClientRect();
    const dx = rect.left + rect.width / 2 - cx;
    const dy = rect.top + rect.height / 2 - cy;
    const forward = (horizontal ? dx : dy) * sign;
    const side = Math.abs(horizontal ? dy : dx);
    const score = forward > 0 ? forward + side * 4 : Infinity;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }

  if (best) {
    best.focus();
    best.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  return best;
}

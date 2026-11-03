// 远程导航控制器
import { FocusManager, nearestNeighbor } from './focus.js';

export class RemoteNavigator {
  constructor() {
    this.manager = new FocusManager();
    this.init();
  }

  init() {
    this.manager.init();
    document.addEventListener('keydown', this.handleKey.bind(this));
    return this;
  }

  handleKey(e) {
    const code = e.keyCode || e.which;

    // 箭头键
    if (code >= 37 && code <= 40) {
      if (e.target.tagName === 'INPUT') {
        // 输入框中，左右箭头移动光标
        if (code === 37 || code === 39) return;
      }
      e.preventDefault();
      const dir = code === 37 ? 'left' : code === 39 ? 'right' : code === 38 ? 'up' : 'down';
      nearestNeighbor(document.activeElement, dir);
      return;
    }

    // Enter / OK
    if (code === 13) {
      e.preventDefault();
      if (document.activeElement.tagName === 'BUTTON') {
        document.activeElement.click();
      }
      return;
    }

    // Back / Escape
    if (code === 27 || code === 40001) {
      e.preventDefault();
      this.handleBack();
      return;
    }

    // Blue key (406)
    if (code === 406) {
      e.preventDefault();
      window.location.hash = '#settings';
      return;
    }

    // Tab
    if (code === 9) {
      e.preventDefault();
      if (e.shiftKey) {
        this.manager.focusPrevious();
      } else {
        this.manager.focusNext();
      }
    }
  }

  handleBack() {
    // 检查是否有打开的对话框/模态
    const dialog = document.querySelector('[role="dialog"]:not([hidden])');
    if (dialog) {
      dialog.hidden = true;
      return;
    }

    // 检查设置面板
    const settings = document.getElementById('settings');
    if (settings && !settings.hidden) {
      settings.hidden = true;
      return;
    }

    // 返回上一页
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // 退出确认
      this.showExitDialog();
    }
  }

  showExitDialog() {
    const dialog = document.getElementById('exit-dialog');
    if (dialog) {
      dialog.hidden = false;
      // 聚焦取消按钮
      setTimeout(() => {
        const cancelBtn = dialog.querySelector('#exit-cancel');
        if (cancelBtn) cancelBtn.focus();
      }, 100);
    }
  }

  focusById(id) {
    const el = document.getElementById(id);
    if (el) el.focus();
  }
}

// 导出全局实例
const navigator = new RemoteNavigator();
window.b1ackha7tv = window.b1ackha7tv || {};
window.b1ackha7tv.navigator = navigator;

export default navigator;

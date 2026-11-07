(function (root) {
  'use strict';
  var components = {
    button: 'button.shadcn-button, .filter-btn, .setting-btn, #settings-open, #preview-toggle, #preview-retry, .quick-actions button, #exit-dialog button, .settings-source-list button, .search-clear',
    card: '.carousel-item, .app, .app-grid-item, .recent-card, .input-tile, .settings-dialog, .settings-wallpaper-choice, .settings-app-row',
    input: 'input[type="text"], input[type="search"]',
    select: 'select'
  };
  function mount(scope) {
    var base = scope || document;
    Object.keys(components).forEach(function (component) {
      Array.prototype.forEach.call(base.querySelectorAll(components[component]), function (element) {
        element.classList.add('shadcn-' + component);
      });
    });
    Array.prototype.forEach.call(base.querySelectorAll('.setting-toggle'), function (element) {
      element.classList.add('shadcn-switch');
      element.setAttribute('role', 'switch');
    });
  }
  function button(label, variant) {
    var element = document.createElement('button');
    element.type = 'button';
    element.className = 'shadcn-button' + (variant ? ' shadcn-button-' + variant : '');
    element.textContent = label;
    return element;
  }
  root.ShadcnUI = { mount: mount, button: button, components: components };
})(window);

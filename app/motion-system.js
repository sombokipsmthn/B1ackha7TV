/* Shared motion policy and navigation transitions for the launcher. */
(function (root) {
  'use strict';
  var config = {
    duration: { micro: 140, focus: 190, component: 240, page: 320, cinematic: 480 },
    easing: { standard: 'cubic-bezier(0.2, 0, 0, 1)', enter: 'cubic-bezier(0.16, 1, 0.3, 1)', exit: 'cubic-bezier(0.4, 0, 1, 1)' }
  };
  var transitionTimer = null, entryFrame = null, enabled = true, reduced = false;
  var systemMotion = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function apply(options) {
    options = options || {};
    if (typeof options.enabled === 'boolean') { enabled = options.enabled; }
    if (typeof options.reduced === 'boolean') { reduced = options.reduced; }
    var body = root.document && root.document.body;
    if (!body) { return; }
    var systemReduced = !!(systemMotion && systemMotion.matches);
    body.classList.toggle('animations-enabled', enabled);
    body.classList.toggle('animations-disabled', !enabled);
    body.classList.toggle('reduced-motion', reduced || systemReduced);
    body.classList.toggle('motion-system-reduced', systemReduced);
  }
  function enter(section) {
    if (!section || !root.document || !root.document.body.classList.contains('animations-enabled') || root.document.body.classList.contains('reduced-motion')) { return; }
    if (entryFrame && root.cancelAnimationFrame) { root.cancelAnimationFrame(entryFrame); }
    section.classList.remove('motion-enter');
    entryFrame = root.requestAnimationFrame(function () {
      section.classList.add('motion-enter');
      if (transitionTimer) { root.clearTimeout(transitionTimer); }
      transitionTimer = root.setTimeout(function () { section.classList.remove('motion-enter'); }, config.duration.page);
    });
  }
  function dismiss(element, callback, duration) {
    if (!element) { if (callback) { callback(); } return; }
    if (!enabled || reduced || !root.document.body.classList.contains('animations-enabled') || root.document.body.classList.contains('reduced-motion')) { if (callback) { callback(); } return; }
    if (element.motionDismissTimer) { root.clearTimeout(element.motionDismissTimer); }
    element.classList.add('motion-dismiss');
    element.motionDismissTimer = root.setTimeout(function () {
      element.classList.remove('motion-dismiss');
      element.motionDismissTimer = null;
      if (callback) { callback(); }
    }, duration || config.duration.component);
  }
  if (systemMotion) {
    var onSystemMotionChange = function () { apply(); };
    if (systemMotion.addEventListener) { systemMotion.addEventListener('change', onSystemMotionChange); }
    else if (systemMotion.addListener) { systemMotion.addListener(onSystemMotionChange); }
  }
  root.MotionSystem = { config: config, apply: apply, enter: enter, dismiss: dismiss };
})(window);

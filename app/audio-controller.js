/* Kipsmthn TV audio. Locally packaged original cues; failures never interrupt navigation. */
(function (root) {
  'use strict';
  var enabled = true, volume = 0.25, startup = false, lastNav = 0, started = false, activeAudio = null, unlockPending = false, pendingType = null;
  var urls = { nav: 'assets/audio/navigation.wav', navigate: 'assets/audio/navigation.wav', focus: 'assets/audio/navigation.wav', select: 'assets/audio/selection.wav', launch: 'assets/audio/selection.wav', close: 'assets/audio/back.wav', back: 'assets/audio/back.wav', success: 'assets/audio/selection.wav', error: 'assets/audio/error.wav', startup: 'assets/audio/startup.wav' };
  var channels = Object.create(null);
  var typeGain = { nav: 0.2, navigate: 0.2, focus: 0.16, select: 0.3, launch: 0.34, close: 0.22, back: 0.22, success: 0.26, error: 0.2, startup: 0.24 };
  function getChannel(type) {
    if (!urls[type]) { return null; }
    var key = urls[type];
    if (channels[key]) { return channels[key]; }
    if (typeof root.Audio !== 'function') { return null; }
    try { var audio = new root.Audio(key); audio.preload = 'auto'; channels[key] = audio; return audio; }
    catch (ignore) { return null; }
  }
  function preload() { Object.keys(urls).forEach(function (type) { getChannel(type); }); }
  function stopActive() {
    if (!activeAudio) { return; }
    try { activeAudio.pause(); activeAudio.currentTime = 0; } catch (ignore) {}
    activeAudio = null;
  }
  function unlock() {
    if (started || !enabled || unlockPending) { return; }
    unlockPending = true;
    preload();
    var channel = getChannel('nav');
    if (!channel) { started = true; unlockPending = false; return; }
    try {
      channel.volume = 0;
      var result = channel.play();
      if (result && typeof result.then === 'function') {
        result.then(function () { channel.pause(); channel.currentTime = 0; started = true; unlockPending = false; if (pendingType) { var type = pendingType; pendingType = null; cue(startup ? 'startup' : type); } })
          .catch(function () { unlockPending = false; });
      } else { channel.pause(); channel.currentTime = 0; started = true; unlockPending = false; if (pendingType) { var type = pendingType; pendingType = null; cue(startup ? 'startup' : type); } }
    } catch (ignore) { unlockPending = false; }
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (eventName) {
    if (root.document) { root.document.addEventListener(eventName, unlock, { capture: true, passive: true }); }
  });
  function playAsset(type) {
    if (!enabled || volume <= 0 || !urls[type]) { return false; }
    var audio = getChannel(type);
    if (!audio) { return false; }
    try {
      if (activeAudio === audio && !audio.paused) { audio.pause(); }
      else if (activeAudio) { activeAudio.pause(); }
      audio.currentTime = 0; audio.volume = Math.min(1, volume * (typeGain[type] || 0.22)); activeAudio = audio;
      var result = audio.play();
      if (result && typeof result.catch === 'function') { result.catch(function () { if (activeAudio === audio) { activeAudio = null; } }); }
      return true;
    } catch (ignore) { return false; }
  }
  function cue(type) { playAsset(type); }
  root.AudioController = {
    configure: function (options) {
      options = options || {};
      if (typeof options.enabled === 'boolean') { enabled = options.enabled; }
      if (typeof options.volume === 'number') { volume = Math.max(0, Math.min(1, options.volume)); }
      if (typeof options.startup === 'boolean') { startup = options.startup; }
      if (!enabled) { stopActive(); }
    },
    play: function (type) {
      var now = Date.now();
      if (type === 'nav' || type === 'focus' || type === 'navigate') { if (now - lastNav < 110) { return; } lastNav = now; }
      if (!started) { pendingType = type; return; }
      cue(type);
    },
    preload: preload,
    available: function () { return typeof root.Audio === 'function'; }
  };
})(window);

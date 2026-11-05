/* Kipsmthn TV audio. Locally packaged original cues; failures never interrupt navigation. */
(function (root) {
  'use strict';
  var enabled = true, volume = 0.25, startup = false, lastNav = 0, started = false, activeAudio = null;
  var urls = { nav: 'assets/audio/navigation.wav', select: 'assets/audio/selection.wav', back: 'assets/audio/back.wav', error: 'assets/audio/error.wav', startup: 'assets/audio/startup.wav' };
  var channels = Object.create(null);
  function getChannel(type) {
    if (channels[type]) { return channels[type]; }
    if (typeof root.Audio !== 'function') { return null; }
    try { var audio = new root.Audio(urls[type]); audio.preload = 'none'; channels[type] = audio; return audio; }
    catch (ignore) { return null; }
  }
  function playAsset(type) {
    if (!enabled || volume <= 0 || !urls[type]) { return false; }
    var audio = getChannel(type);
    if (!audio) { return false; }
    try {
      if (activeAudio && activeAudio !== audio) { activeAudio.pause(); activeAudio.currentTime = 0; }
      audio.pause(); audio.currentTime = 0; audio.volume = volume * 0.32; activeAudio = audio;
      var result = audio.play();
      if (result && typeof result.catch === 'function') { result.catch(function () {}); }
      return true;
    } catch (ignore) { return false; }
  }
  function cue(type) {
    if (playAsset(type)) { return; }
    var Ctor = root.AudioContext || root.webkitAudioContext;
    if (!enabled || volume <= 0 || !Ctor) { return; }
    try {
      var context = cue.context || (cue.context = new Ctor()), now = context.currentTime;
      if (context.state === 'suspended' && context.resume) { context.resume().catch(function () {}); }
      var frequencies = { nav: 760, select: 620, back: 430, error: 190, startup: 520 };
      var duration = type === 'nav' ? .025 : .06, oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.type = type === 'error' ? 'triangle' : 'sine'; oscillator.frequency.setValueAtTime(frequencies[type] || 500, now);
      if (type === 'back') { oscillator.frequency.exponentialRampToValueAtTime(290, now + duration); }
      gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(volume * .028, now + .008); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      oscillator.connect(gain); gain.connect(context.destination); oscillator.start(now); oscillator.stop(now + duration + .01);
    } catch (ignore) { /* TV web audio can be restricted; stay silent, keep working. */ }
  }
  root.AudioController = {
    configure: function (options) {
      options = options || {};
      if (typeof options.enabled === 'boolean') { enabled = options.enabled; }
      if (typeof options.volume === 'number') { volume = Math.max(0, Math.min(1, options.volume)); }
      if (typeof options.startup === 'boolean') { startup = options.startup; }
      if (!enabled && activeAudio) { try { activeAudio.pause(); activeAudio.currentTime = 0; } catch (ignore) {} activeAudio = null; }
    },
    play: function (type) {
      var now = Date.now();
      if (type === 'nav') { if (now - lastNav < 90) { return; } lastNav = now; }
      if (!started) { started = true; if (startup && type !== 'startup') { cue('startup'); return; } }
      cue(type);
    },
    available: function () { return typeof root.Audio === 'function' || !!(root.AudioContext || root.webkitAudioContext); }
  };
})(window);

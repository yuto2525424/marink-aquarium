/*
 * 効果音（Web Audio で合成。音声ファイルは使っていません）
 * BGMは未実装です。
 */
(function (g) {
  var M = (g.MARINK = g.MARINK || {});
  var ctx = null;
  var enabled = true;
  try { enabled = localStorage.getItem("marink-sound") !== "off"; } catch (e) {}

  function ac() {
    if (!ctx) {
      var C = g.AudioContext || g.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type, vol, slideTo) {
    var c = ac();
    if (!c) return;
    var t = c.currentTime + start;
    var o = c.createOscillator();
    var gn = c.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.02);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  var SFX = {
    tap: function () { tone(520, 0, 0.12, "sine", 0.08, 780); },
    bubble: function () { tone(380, 0, 0.18, "sine", 0.1, 900); tone(600, 0.08, 0.15, "sine", 0.06, 1200); },
    good: function () { [523, 659, 784].forEach(function (f, i) { tone(f, i * 0.09, 0.35, "triangle", 0.08); }); },
    bad: function () { tone(330, 0, 0.35, "triangle", 0.08, 260); tone(247, 0.18, 0.45, "triangle", 0.07, 200); },
    crisis: function () { tone(196, 0, 0.6, "sawtooth", 0.035, 180); tone(185, 0.3, 0.7, "sawtooth", 0.03, 160); },
    fanfare: function () { [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { tone(f, i * 0.12, 0.4, "triangle", 0.08); }); },
    soft: function () { [440, 523, 659].forEach(function (f, i) { tone(f, i * 0.18, 0.6, "sine", 0.07); }); },
  };

  M.sound = {
    play: function (name) { if (enabled && SFX[name]) { try { SFX[name](); } catch (e) {} } },
    isOn: function () { return enabled; },
    toggle: function () {
      enabled = !enabled;
      try { localStorage.setItem("marink-sound", enabled ? "on" : "off"); } catch (e) {}
      if (enabled) SFX.tap();
      return enabled;
    },
  };
})(window);

/*
 * 効果音（Web Audio で合成。音声ファイルは使っていません）
 * BGMは bgm.js（同じ音声の仕組みを使い、オン・オフも共通）
 */
(function (g) {
  var M = (g.MARINK = g.MARINK || {});
  var ctx = null, out = null, noiseBuf = null;
  // 効果音は大きめに（BGMより前に出るように）。音割れしないようコンプレッサーを通す
  var SFX_GAIN = 2.2;
  // 効果音が鳴っている間、BGMを小さくする時間（秒）
  var DUCK = { tap: 0.25, bubble: 0.5, good: 0.8, bad: 1.0, crisis: 1.4, fanfare: 1.2, soft: 1.2, construct: 2.9, constructShort: 1.7 };
  var enabled = true;
  try { enabled = localStorage.getItem("marink-sound") !== "off"; } catch (e) {}

  function ac() {
    if (!ctx) {
      var C = g.AudioContext || g.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -10; comp.ratio.value = 4;
      out = ctx.createGain(); out.gain.value = SFX_GAIN;
      out.connect(comp); comp.connect(ctx.destination);
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
    o.connect(gn).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // 工事の音：低い「どご」という打ちつけ（低い音＋こもった土ぼこりのような雑音）と、ときどき金づちの「カン」
  function thud(start, vol) {
    var c = ac();
    if (!c) return;
    var t = c.currentTime + start;
    var o = c.createOscillator(), gn = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.16);
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + 0.008); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(gn).connect(out); o.start(t); o.stop(t + 0.25);
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 0.4, c.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g2 = c.createGain();
    s.buffer = noiseBuf; f.type = "lowpass"; f.frequency.value = 520;
    g2.gain.setValueAtTime(vol * 0.9, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    s.connect(f).connect(g2).connect(out); s.start(t); s.stop(t + 0.16);
  }
  function construct(len) {
    var n = Math.round(len / 0.19);
    for (var i = 0; i < n; i++) {
      // 「どご・どご」と2回ずつ、少し揺らしながら
      var at = i * 0.19 + (i % 2 ? 0.02 : 0);
      thud(at, i % 2 ? 0.16 : 0.22);
      if (i % 5 === 3) tone(1750 + (i % 3) * 140, at + 0.09, 0.12, "triangle", 0.05);
    }
  }

  var SFX = {
    construct: function () { construct(2.6); },
    constructShort: function () { construct(1.4); },
    tap: function () { tone(520, 0, 0.12, "sine", 0.08, 780); },
    bubble: function () { tone(380, 0, 0.18, "sine", 0.1, 900); tone(600, 0.08, 0.15, "sine", 0.06, 1200); },
    good: function () { [523, 659, 784].forEach(function (f, i) { tone(f, i * 0.09, 0.35, "triangle", 0.08); }); },
    bad: function () { tone(330, 0, 0.35, "triangle", 0.08, 260); tone(247, 0.18, 0.45, "triangle", 0.07, 200); },
    crisis: function () { tone(196, 0, 0.6, "sawtooth", 0.035, 180); tone(185, 0.3, 0.7, "sawtooth", 0.03, 160); },
    fanfare: function () { [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { tone(f, i * 0.12, 0.4, "triangle", 0.08); }); },
    soft: function () { [440, 523, 659].forEach(function (f, i) { tone(f, i * 0.18, 0.6, "sine", 0.07); }); },
  };

  M.sound = {
    play: function (name) {
      if (M.native) M.native.haptic(name); // アプリ版では振動も（音のオン・オフとは別）
      if (enabled && SFX[name]) {
        if (M.bgm && M.bgm.duck) M.bgm.duck(DUCK[name] || 0.6);
        try { SFX[name](); } catch (e) {}
      }
    },
    isOn: function () { return enabled; },
    ctx: ac,
    toggle: function () {
      enabled = !enabled;
      try { localStorage.setItem("marink-sound", enabled ? "on" : "off"); } catch (e) {}
      if (enabled) SFX.tap();
      if (M.bgm) M.bgm.setEnabled(enabled);
      return enabled;
    },
  };
})(window);

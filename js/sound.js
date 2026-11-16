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
  var DUCK_KIND = 1.6;
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
      noiseBuf = c.createBuffer(1, c.sampleRate * 2.5, c.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g2 = c.createGain();
    s.buffer = noiseBuf; f.type = "lowpass"; f.frequency.value = 520;
    g2.gain.setValueAtTime(vol * 0.9, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    s.connect(f).connect(g2).connect(out); s.start(t); s.stop(t + 0.16);
  }
  // ドリルの「ギュイーン」（低いギザギザの音を震わせる）
  function drill(start, len) {
    var c = ac();
    if (!c) return;
    var t = c.currentTime + start;
    var o = c.createOscillator(), f = c.createBiquadFilter(), gn = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = "sawtooth"; o.frequency.setValueAtTime(150, t); o.frequency.linearRampToValueAtTime(230, t + len * 0.4); o.frequency.linearRampToValueAtTime(190, t + len);
    f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 1.4;
    lfo.frequency.value = 32; lg.gain.value = 0.02;
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.035, t + 0.05); gn.gain.setValueAtTime(0.035, t + len - 0.08); gn.gain.exponentialRampToValueAtTime(0.0001, t + len);
    lfo.connect(lg).connect(gn.gain);
    o.connect(f).connect(gn).connect(out); o.start(t); o.stop(t + len + 0.05); lfo.start(t); lfo.stop(t + len + 0.05);
  }
  // 鉄骨の「カーン」
  function clang(start) {
    [880, 1370, 2210].forEach(function (fq, i) { tone(fq, start, 0.5 - i * 0.1, "triangle", 0.045 - i * 0.01); });
  }
  // 雑音（ザー・パチ・ゴロゴロなど）。filter：lowpass/highpass/bandpass
  function nz(start, dur, vol, ftype, freq, q, attack) {
    var c = ac();
    if (!c) return;
    if (!noiseBuf) { thud(-1, 0.0001); }
    var t = c.currentTime + start;
    var s = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain();
    s.buffer = noiseBuf; f.type = ftype || "lowpass"; f.frequency.value = freq || 1000; if (q) f.Q.value = q;
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.005)); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(gn).connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  // 拍手（人が集まったとき）
  function claps(start, len, n, vol) {
    for (var i = 0; i < n; i++) nz(start + (i * 0.618 % 1) * len, 0.06, vol * (0.6 + (i * 0.37 % 1) * 0.6), "bandpass", 1200 + (i * 0.71 % 1) * 1400, 1.2);
  }
  // 足音
  function steps(start, n, gap, vol) {
    for (var i = 0; i < n; i++) nz(start + i * gap, 0.08, vol, "lowpass", 380 + (i % 2) * 120);
  }
  function construct(len) {
    drill(0.35, 0.55);
    if (len > 2) { drill(1.5, 0.5); clang(1.15); }
    clang(len > 2 ? 2.2 : 0.95);
    var n = Math.round(len / 0.19);
    for (var i = 0; i < n; i++) {
      // 「どご・どご」と2回ずつ、少し揺らしながら
      var at = i * 0.19 + (i % 2 ? 0.02 : 0);
      thud(at, i % 2 ? 0.16 : 0.22);
      if (i % 5 === 3) tone(1750 + (i % 3) * 140, at + 0.09, 0.12, "triangle", 0.05);
    }
  }

  var SFX = {
    // ── 場面ごとの音 ──
    "k-swim-big": function () { tone(90, 0, 1.6, "sine", 0.14, 52); nz(0.1, 1.2, 0.05, "lowpass", 500, 0, 0.4); for (var i = 0; i < 5; i++) tone(380 + i * 70, 0.5 + i * 0.13, 0.12, "sine", 0.05, 950 + i * 50); },
    "k-swim-small": function () { for (var i = 0; i < 8; i++) tone(560 + (i % 4) * 90, i * 0.09, 0.1, "sine", 0.06, 1150 + (i % 3) * 90); },
    "k-swim-jelly": function () { [784, 988, 1175, 1568, 1175].forEach(function (f, i) { tone(f, i * 0.18, 0.9, "sine", 0.04); }); },
    "k-coins": function () { for (var i = 0; i < 9; i++) { tone(1900 + (i % 3) * 320, i * 0.07, 0.12, "square", 0.022); tone(2850 + (i % 2) * 200, i * 0.07 + 0.02, 0.1, "sine", 0.02); } },
    "k-coins-out": function () { for (var i = 0; i < 7; i++) tone(1700 - i * 140, i * 0.12, 0.16, "square", 0.02, 1100 - i * 90); tone(220, 0.9, 0.5, "triangle", 0.05, 140); },
    "k-time": function () { for (var i = 0; i < 8; i++) { nz(i * 0.24, 0.03, 0.12, "highpass", 3200); tone(i % 2 ? 1250 : 1550, i * 0.24, 0.04, "triangle", 0.03); } },
    "k-staff": function () { steps(0, 6, 0.16, 0.12); [880, 1175, 1320].forEach(function (f, i) { tone(f, 0.95 + i * 0.1, 0.35, "sine", 0.05); }); },
    "k-open": function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.1, 0.4, "triangle", 0.06); }); claps(0.45, 1.6, 34, 0.09); },
    "k-crowd": function () { steps(0, 10, 0.11, 0.09); claps(0.5, 1.3, 22, 0.07); nz(0.2, 1.6, 0.03, "bandpass", 600, 0.8, 0.4); },
    "k-bus": function () { tone(65, 0, 1.4, "sawtooth", 0.025, 80); tone(440, 0.5, 0.18, "square", 0.035); tone(554, 0.72, 0.3, "square", 0.035); nz(1.1, 0.25, 0.06, "highpass", 2500); steps(1.3, 5, 0.12, 0.08); },
    "k-hearts": function () { [659, 784, 1047, 1319].forEach(function (f, i) { tone(f, i * 0.14, 0.7, "sine", 0.05); tone(f * 2, i * 0.14, 0.3, "sine", 0.015); }); },
    "k-sparkle": function () { for (var i = 0; i < 7; i++) tone(1760 + i * 210, i * 0.07, 0.3, "sine", 0.035); },
    "k-night": function () { for (var i = 0; i < 6; i++) tone(2093 - i * 140, i * 0.2, 0.7, "sine", 0.028); tone(262, 0, 1.4, "sine", 0.04); },
    "k-shrink": function () { tone(900, 0, 0.6, "sine", 0.07, 180); nz(0.2, 0.4, 0.08, "lowpass", 900); },
    "k-rain": function () { nz(0, 2.2, 0.06, "highpass", 1400, 0, 0.5); for (var i = 0; i < 10; i++) tone(1300 + (i * 0.73 % 1) * 900, 0.3 + i * 0.17, 0.05, "sine", 0.025, 700); },
    "k-storm": function () { nz(0, 2.2, 0.05, "highpass", 1400, 0, 0.3); nz(0.55, 1.8, 0.35, "lowpass", 160, 0, 0.02); nz(0.55, 0.25, 0.12, "highpass", 2500); },
    "k-fireworks": function () { [0.9, 1.15, 1.4, 1.65].forEach(function (t, i) { tone(300, t - 0.35, 0.35, "sine", 0.02, 1400); nz(t, 0.5, 0.18, "lowpass", 700 + i * 150); nz(t + 0.08, 0.6, 0.04, "highpass", 4000); }); },
    // 建物が大きくなる・小さくなる・階が積み上がる瞬間
    "k-grow-up": function () { tone(180, 0, 0.7, "triangle", 0.07, 620); nz(0, 0.6, 0.05, "bandpass", 900, 1, 0.3); thud(0.62, 0.3); },
    "k-floor": function () { tone(700, 0, 0.3, "sine", 0.03, 260); thud(0.3, 0.34); thud(0.52, 0.2); tone(1568, 0.6, 0.4, "sine", 0.04); },
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
        if (M.bgm && M.bgm.duck) M.bgm.duck(DUCK[name] || (name.indexOf("k-") === 0 ? DUCK_KIND : 0.6));
        try { SFX[name](); } catch (e) {}
      }
    },
    isOn: function () { return enabled; },
    has: function (name) { return !!SFX[name]; },
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

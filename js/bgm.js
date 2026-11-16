/*
 * BGM（場面ごとのオリジナル曲。Web Audio でその場で演奏するので、音楽ファイルは使っていません）
 *
 *   title  … タイトル画面：波の音とオルゴール
 *   play   … 問題を考えている間：波の音にのせた、ふしぎで幻想的なガラスの鐘とこだま
 *   crisis … 経営危機：少し緊張感のある曲
 *   happy  … 結果発表（うれしい結末）：きらきらしたベル
 *   sad    … 結果発表（ほろ苦い結末）：しっとりしたピアノ風
 *
 * 右上のスピーカーボタン（効果音と共通）でオン・オフできます。
 */
(function (g) {
  var M = (g.MARINK = g.MARINK || {});

  /* ── 曲のデータ ──
   * chords：1小節ごとのコード（MIDIの根音と種類）、16分音符×16で1小節
   * arp：アルペジオ（コードの何番目の音か。-1は休み）、lead：メロディの音の動き */
  var MAJ = [0, 4, 7, 12], MIN = [0, 3, 7, 12], SUS = [0, 5, 7, 12];
  // 幻想的な響き（リディアンの#11、メジャー7、9th）
  var LYD7 = [0, 4, 6, 11], MAJ7 = [0, 4, 7, 11], M9 = [0, 3, 7, 10, 14], SUS7 = [0, 5, 7, 10];
  var TRACKS = {
    title: {
      bpm: 70, waves: true, master: 0.9,
      chords: [[60, MAJ], [57, MIN], [53, MAJ], [55, MAJ], [60, MAJ], [57, MIN], [53, MAJ], [55, SUS]],
      pad: { type: "sine", vol: 0.045, oct: -12 },
      arp: { inst: "box", vol: 0.05, oct: 12, steps: [0, -1, 1, -1, 2, -1, 3, -1, 2, -1, 1, -1, 2, -1, 3, -1] },
      lead: { inst: "box", vol: 0.06, oct: 24, every: 2, notes: [[0, 2, 8], [8, 1, 4], [12, 0, 4]] },
      bass: { vol: 0.07, steps: [0, 8] },
    },
    play: {
      // 波の音にのせて、ゆっくり漂う水の底のような曲。和音が全音ずつ沈み、ガラスの鐘がこだまする
      bpm: 60, master: 0.95, echo: 0.42, waves: true, air: true,
      chords: [[60, LYD7], [58, LYD7], [56, MAJ7], [55, SUS7], [60, LYD7], [58, LYD7], [53, M9], [55, SUS7]],
      pad: { type: "sine", vol: 0.038, oct: -12, voices: 4, detune: 9 },
      arp: { inst: "glass", vol: 0.032, oct: 12, steps: [0, -1, -1, 1, -1, -1, 2, -1, -1, 3, -1, -1, 2, -1, -1, -1] },
      lead: { inst: "glass", vol: 0.028, oct: 24, every: 2, notes: [[0, 3, 8], [10, 2, 6]] },
      bass: { vol: 0.05, steps: [0] },
    },
    crisis: {
      bpm: 92, master: 0.85,
      chords: [[57, MIN], [53, MAJ], [50, MIN], [52, MAJ], [57, MIN], [53, MAJ], [50, MIN], [52, [0, 4, 7, 10]]],
      pad: { type: "sawtooth", vol: 0.016, oct: -12, cutoff: 900 },
      arp: { inst: "pluck", vol: 0.055, oct: 0, steps: [0, 0, 2, 0, 1, 0, 2, 0, 0, 0, 2, 0, 3, 0, 2, 1] },
      bass: { vol: 0.09, steps: [0, 2, 4, 6, 8, 10, 12, 14] },
      hat: { vol: 0.02, steps: [4, 12] },
    },
    happy: {
      bpm: 96, master: 0.9,
      chords: [[60, MAJ], [55, MAJ], [57, MIN], [53, MAJ], [60, MAJ], [55, MAJ], [53, MAJ], [55, MAJ]],
      pad: { type: "sine", vol: 0.04, oct: -12 },
      arp: { inst: "bell", vol: 0.05, oct: 12, steps: [0, -1, 1, -1, 2, -1, 1, -1, 3, -1, 2, -1, 1, -1, 2, -1] },
      lead: { inst: "bell", vol: 0.065, oct: 24, every: 1, notes: [[0, 0, 4], [4, 1, 2], [6, 2, 2], [8, 3, 6], [14, 2, 2]] },
      bass: { vol: 0.08, steps: [0, 8, 12] },
      hat: { vol: 0.014, steps: [4, 12] },
    },
    sad: {
      bpm: 64, master: 0.9,
      chords: [[57, MIN], [53, MAJ], [60, MAJ], [55, MAJ], [57, MIN], [53, MAJ], [50, MIN], [52, MAJ]],
      pad: { type: "sine", vol: 0.045, oct: -12 },
      arp: { inst: "piano", vol: 0.055, oct: 0, steps: [0, -1, -1, 1, -1, -1, 2, -1, 3, -1, -1, 2, -1, -1, 1, -1] },
      lead: { inst: "piano", vol: 0.055, oct: 12, every: 2, notes: [[0, 2, 6], [6, 1, 2], [8, 0, 8]] },
      bass: { vol: 0.07, steps: [0] },
    },
  };

  var ctx = null, master = null, current = null, wanted = null, enabled = true;
  var timer = null, nextTime = 0, step = 0, bar = 0, wavesNode = null, echoIn = null, airNode = null, duckNode = null;
  try { enabled = localStorage.getItem("marink-sound") !== "off"; } catch (e) {}

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  function getCtx() {
    if (!ctx) {
      ctx = (M.sound && M.sound.ctx && M.sound.ctx()) || null;
      if (!ctx) return null;
      master = ctx.createGain();
      master.gain.value = 0;
      // 効果音が鳴るときだけBGMを小さくするための音量つまみ
      duckNode = ctx.createGain(); duckNode.gain.value = 1;
      master.connect(duckNode); duckNode.connect(ctx.destination);
      // こだま（ディレイ）：音が水の中で遠くへ響いていくように
      try {
        echoIn = ctx.createGain(); echoIn.gain.value = 0;
        var dl = ctx.createDelay(2), fb = ctx.createGain(), lp = ctx.createBiquadFilter();
        dl.delayTime.value = 0.75; fb.gain.value = 0.45; lp.type = "lowpass"; lp.frequency.value = 2200;
        echoIn.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(master);
      } catch (e) { echoIn = null; }
    }
    return ctx;
  }

  /* ── 楽器 ── */
  function note(inst, freq, t, len, vol) {
    var c = ctx, o = c.createOscillator(), gn = c.createGain(), end;
    var shape = { glass: [0.02, 2.8], box: [0.004, 1.4], bell: [0.004, 1.8], marimba: [0.003, 0.35], pluck: [0.003, 0.22], piano: [0.006, 1.6], bass: [0.01, 0.5] }[inst] || [0.01, 0.6];
    o.type = inst === "marimba" || inst === "bass" || inst === "piano" ? "triangle" : inst === "pluck" ? "square" : "sine";
    o.frequency.setValueAtTime(freq, t);
    end = t + Math.max(shape[1], len);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(vol, t + shape[0]);
    gn.gain.exponentialRampToValueAtTime(0.0001, end);
    var out = gn;
    if (inst === "pluck") { var f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1400; gn.connect(f); out = f; }
    o.connect(gn); out.connect(master);
    if (echoIn && inst !== "bass") out.connect(echoIn);
    o.start(t); o.stop(end + 0.05);
    // ベルとオルゴールは倍音を足してキラッとさせる
    if (inst === "bell" || inst === "box" || inst === "glass") {
      var o2 = c.createOscillator(), g2 = c.createGain();
      o2.type = "sine"; o2.frequency.setValueAtTime(freq * (inst === "bell" ? 2.76 : inst === "glass" ? 3.01 : 2), t);
      g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.004); g2.gain.exponentialRampToValueAtTime(0.0001, t + shape[1] * 0.5);
      o2.connect(g2).connect(master); if (echoIn) g2.connect(echoIn); o2.start(t); o2.stop(t + shape[1]);
    }
  }
  function pad(tr, root, chord, t, dur) {
    chord.slice(0, tr.pad.voices || 3).forEach(function (iv, k) {
      var c = ctx, o = c.createOscillator(), gn = c.createGain();
      o.type = tr.pad.type;
      o.frequency.setValueAtTime(midi(root + iv + tr.pad.oct), t);
      o.detune.value = (k - 1) * (tr.pad.detune || 6);
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.linearRampToValueAtTime(tr.pad.vol, t + dur * 0.3);
      gn.gain.linearRampToValueAtTime(0.0001, t + dur * 1.02);
      var out = gn;
      if (tr.pad.cutoff) { var f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = tr.pad.cutoff; gn.connect(f); out = f; }
      o.connect(gn); out.connect(master);
      o.start(t); o.stop(t + dur * 1.05);
    });
  }
  var noiseBuf = null;
  function noise() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var s = ctx.createBufferSource(); s.buffer = noiseBuf; return s;
  }
  function hat(t, vol) {
    var s = noise(), f = ctx.createBiquadFilter(), gn = ctx.createGain();
    f.type = "highpass"; f.frequency.value = 7000;
    gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f).connect(gn).connect(master); s.start(t); s.stop(t + 0.06);
  }
  // 波の音：ノイズを低くこもらせて、ゆっくり寄せては返す
  function startWaves() {
    if (wavesNode) return;
    var s = noise(), f = ctx.createBiquadFilter(), gn = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    s.loop = true; f.type = "lowpass"; f.frequency.value = 600;
    gn.gain.value = 0.03; lfo.frequency.value = 0.12; lg.gain.value = 0.025;
    lfo.connect(lg).connect(gn.gain);
    s.connect(f).connect(gn).connect(master);
    s.start(); lfo.start();
    wavesNode = { s: s, lfo: lfo, gn: gn };
  }
  // ふしぎな空気：高いところでかすかに揺れる、きらめきの音
  function startAir() {
    if (airNode) return;
    var s = noise(), f = ctx.createBiquadFilter(), gn = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    s.loop = true; f.type = "bandpass"; f.frequency.value = 3200; f.Q.value = 6;
    gn.gain.value = 0.012; lfo.frequency.value = 0.07; lg.gain.value = 0.01;
    lfo.connect(lg).connect(gn.gain);
    s.connect(f).connect(gn).connect(master);
    s.start(); lfo.start();
    airNode = { s: s, lfo: lfo, gn: gn };
  }
  function stopAir() {
    if (!airNode) return;
    var w = airNode; airNode = null;
    try { w.gn.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3); w.s.stop(ctx.currentTime + 1.2); w.lfo.stop(ctx.currentTime + 1.2); } catch (e) {}
  }
  function stopWaves() {
    if (!wavesNode) return;
    var w = wavesNode; wavesNode = null;
    try { w.gn.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3); w.s.stop(ctx.currentTime + 1.2); w.lfo.stop(ctx.currentTime + 1.2); } catch (e) {}
  }

  /* ── 演奏（少し先まで予約していく） ── */
  function schedule() {
    if (!current) return;
    var tr = TRACKS[current], sp = 60 / tr.bpm / 4;
    while (nextTime < ctx.currentTime + 0.25) {
      var ch = tr.chords[bar % tr.chords.length], root = ch[0], chord = ch[1];
      if (step === 0) pad(tr, root, chord, nextTime, sp * 16);
      if (tr.bass && tr.bass.steps.indexOf(step) >= 0) note("bass", midi(root - 24), nextTime, sp * 2, tr.bass.vol);
      if (tr.arp) {
        var a = tr.arp.steps[step];
        if (a >= 0) note(tr.arp.inst, midi(root + chord[a % chord.length] + tr.arp.oct), nextTime, sp, tr.arp.vol);
      }
      if (tr.lead && bar % tr.lead.every === 0) {
        tr.lead.notes.forEach(function (n) {
          // 小節ごとに少しずつ音の高さを変えて、同じフレーズの繰り返しに聞こえないようにする
          if (n[0] === step) note(tr.lead.inst, midi(root + chord[(n[1] + (bar >> 1)) % chord.length] + tr.lead.oct), nextTime, sp * n[2], tr.lead.vol);
        });
      }
      if (tr.hat && tr.hat.steps.indexOf(step) >= 0) hat(nextTime, tr.hat.vol);
      nextTime += sp;
      step = (step + 1) % 16;
      if (step === 0) bar++;
    }
  }

  function begin(name) {
    if (!getCtx() || ctx.state !== "running") return false;
    var tr = TRACKS[name];
    current = name; step = 0; bar = 0;
    nextTime = ctx.currentTime + 0.12;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(tr.master, ctx.currentTime + 1.2);
    if (tr.waves) startWaves(); else stopWaves();
    if (tr.air) startAir(); else stopAir();
    if (echoIn) echoIn.gain.setTargetAtTime(tr.echo || 0, ctx.currentTime, 0.1);
    if (!timer) timer = setInterval(schedule, 60);
    schedule();
    return true;
  }

  function halt(fade) {
    if (!ctx || !master) { current = null; return; }
    var t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + (fade || 0.6));
    stopWaves(); stopAir();
    current = null;
    if (timer) { clearInterval(timer); timer = null; }
  }

  /* 場面に合わせて曲を変える（同じ曲なら何もしない） */
  function play(name) {
    wanted = name;
    if (!enabled || document.hidden) return;
    if (current === name) return;
    if (current) {
      halt(0.6);
      setTimeout(function () { if (wanted === name && enabled) begin(name); }, 650);
    } else begin(name);
  }

  // スマホは「画面に触れたあと」でないと音が出せないので、最初のタップで演奏を始める
  function unlock() {
    if (!getCtx()) return;
    if (ctx.state === "suspended") ctx.resume().then(function () { if (wanted && !current) play(wanted); });
    else if (wanted && !current) play(wanted);
  }
  ["pointerdown", "touchend", "keydown"].forEach(function (ev) { g.addEventListener(ev, unlock, { passive: true }); });

  // 別のアプリに切り替えたら止めて、戻ってきたら再開
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) halt(0.2);
    else if (wanted && enabled) { if (ctx && ctx.state === "suspended") ctx.resume(); setTimeout(function () { play(wanted); }, 200); }
  });

  M.bgm = {
    play: play,
    stop: function () { wanted = null; halt(0.6); },
    setEnabled: function (on) { enabled = on; if (!on) halt(0.3); else if (wanted) { current = null; play(wanted); } },
    current: function () { return current; },
    // 効果音の間、BGMを3割くらいまで下げて、そのあとゆっくり戻す
    duck: function (sec) {
      if (!ctx || !duckNode) return;
      var t = ctx.currentTime, gg = duckNode.gain;
      gg.cancelScheduledValues(t); gg.setValueAtTime(gg.value, t);
      gg.setTargetAtTime(0.28, t, 0.03);
      gg.setTargetAtTime(1, t + sec, 0.4);
    },
    TRACKS: Object.keys(TRACKS),
  };
})(window);

/*
 * MARINK AQUARIUM ― 水族館イラストの自動生成（SVG）
 *
 * aquariumConfig（engine.js）から、パーツを組み合わせて1枚の絵を作ります。
 * パーツは関数ごとに分かれているので、差し替えや追加が簡単です。
 * 外部画像は使っていないため、画像保存（Canvas）でもそのまま使えます。
 */
(function (g) {
  var M = (g.MARINK = g.MARINK || {});

  var PALETTE = {
    bright: { sky1: "#a9dcef", sky2: "#eef8fb", sea1: "#7cc4d6", sea2: "#4f9fba", sun: "#fff3c4", light: 1 },
    calm: { sky1: "#c3e6ee", sky2: "#f5fbf7", sea1: "#86c7d2", sea2: "#5aa3b3", sun: "#fff7da", light: 1 },
    warm: { sky1: "#ffd2bf", sky2: "#fff3e6", sea1: "#8cc3cf", sea2: "#5f9db2", sun: "#ffe0a8", light: 1 },
    dusk: { sky1: "#c7bfdc", sky2: "#f3e7ea", sea1: "#8eaec4", sea2: "#62839f", sun: "#ffd9c0", light: 0.8 },
    night: { sky1: "#56638c", sky2: "#a4a3c4", sea1: "#5d7b9a", sea2: "#3c5674", sun: "#f3f0dc", light: 0.4 },
  };

  /* 決定的な疑似乱数（同じ結果なら同じ絵になる） */
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  /* ── 生き物パーツ ── */
  function fish(x, y, s, color, flip) {
    var t = "translate(" + x + " " + y + ") scale(" + (flip ? -s : s) + " " + s + ")";
    return '<g transform="' + t + '"><path d="M-10 0 C-5 -7 7 -7 10 0 C7 7 -5 7 -10 0 Z" fill="' + color + '"/>' +
      '<path d="M9 0 L16 -6 L15 0 L16 6 Z" fill="' + color + '"/>' +
      '<circle cx="-5" cy="-1.5" r="1.3" fill="#2d3b55"/></g>';
  }

  function whaleShark(x, y, s) {
    var spots = "";
    for (var i = 0; i < 9; i++) spots += '<circle cx="' + (-22 + i * 6) + '" cy="' + (-3 + (i % 3) * 2.5) + '" r="1.1" fill="#ffffff" opacity=".8"/>';
    return '<g transform="translate(' + x + " " + y + ") scale(" + s + ')">' +
      '<path d="M-34 0 C-30 -9 12 -10 28 -2 L42 -12 L38 0 L42 10 L28 2 C12 9 -30 9 -34 0 Z" fill="#4f7fa8"/>' +
      '<path d="M-2 -7 L4 -16 L10 -7 Z" fill="#4f7fa8"/>' + spots + "</g>";
  }

  function ray(x, y, s) {
    return '<g transform="translate(' + x + " " + y + ") scale(" + s + ')"><path d="M0 -10 C10 -6 20 -2 26 2 C14 3 6 6 0 10 C-6 6 -14 3 -26 2 C-20 -2 -10 -6 0 -10 Z" fill="#5e86a6"/>' +
      '<path d="M0 9 Q2 20 8 26" stroke="#5e86a6" stroke-width="1.5" fill="none"/></g>';
  }

  function jelly(x, y, s, color) {
    return '<g transform="translate(' + x + " " + y + ") scale(" + s + ')" opacity=".9"><path d="M-8 0 C-8 -11 8 -11 8 0 Q4 2 0 0 Q-4 2 -8 0 Z" fill="' + color + '"/>' +
      '<path d="M-5 1 q-2 5 0 10 M0 1 q2 6 0 12 M5 1 q2 5 0 10" stroke="' + color + '" stroke-width="1" fill="none"/></g>';
  }

  /* ── 背景（立地） ── */
  function background(cfg, P, R) {
    var out = "";
    if (cfg.location === "tourist") {
      // 観覧車・ホテル・ヤシの木
      out += '<g opacity=".75"><circle cx="64" cy="150" r="34" fill="none" stroke="#e8a1a6" stroke-width="2.5"/>';
      for (var i = 0; i < 8; i++) {
        var a = (i / 8) * Math.PI * 2;
        out += '<line x1="64" y1="150" x2="' + (64 + Math.cos(a) * 34).toFixed(1) + '" y2="' + (150 + Math.sin(a) * 34).toFixed(1) + '" stroke="#e8a1a6" stroke-width="1"/>';
        out += '<circle cx="' + (64 + Math.cos(a) * 34).toFixed(1) + '" cy="' + (150 + Math.sin(a) * 34).toFixed(1) + '" r="3.5" fill="' + ["#f6c6a8", "#a9d8e6", "#f3e0a0"][i % 3] + '"/>';
      }
      out += '<path d="M56 212 L64 150 L72 212" stroke="#d58f95" stroke-width="2" fill="none"/></g>';
      out += '<rect x="300" y="140" width="34" height="72" rx="3" fill="#e9eef3"/><rect x="336" y="160" width="28" height="52" rx="3" fill="#f1e8de"/>';
      for (var w = 0; w < 6; w++) out += '<rect x="' + (305 + (w % 2) * 14) + '" y="' + (148 + Math.floor(w / 2) * 18) + '" width="8" height="8" rx="1.5" fill="#bcd9e6"/>';
      out += palm(30, 214) + palm(372, 214);
    } else if (cfg.location === "nature") {
      out += '<path d="M0 190 C60 150 120 168 170 186 C230 160 300 150 400 182 L400 215 L0 215 Z" fill="#a9d3a8" opacity=".85"/>';
      out += '<path d="M0 200 C80 178 150 196 220 200 C290 186 350 184 400 196 L400 215 L0 215 Z" fill="#8cc59a"/>';
      for (var t = 0; t < 7; t++) {
        var tx = [24, 48, 80, 312, 338, 366, 390][t];
        out += tree(tx, 206 - (t % 2) * 3, 0.8 + R() * 0.4);
      }
      // 灯台
      out += '<g transform="translate(352 120)"><path d="M-7 70 L-4 0 L4 0 L7 70 Z" fill="#fbfaf6"/><rect x="-4.5" y="16" width="9" height="7" fill="#e88f8f"/><rect x="-5.5" y="38" width="11" height="7" fill="#e88f8f"/><rect x="-6" y="-8" width="12" height="9" rx="2" fill="' + P.sun + '"/><path d="M-7 -8 L0 -16 L7 -8 Z" fill="#e88f8f"/></g>';
    } else {
      // 大学・時計台・天文台
      out += '<rect x="20" y="150" width="70" height="62" rx="3" fill="#ece6dc"/><path d="M14 152 L55 128 L96 152 Z" fill="#c9a98f"/>';
      for (var c = 0; c < 4; c++) out += '<rect x="' + (28 + c * 15) + '" y="166" width="8" height="30" rx="4" fill="#b9d4e0"/>';
      out += '<rect x="96" y="120" width="18" height="92" fill="#e5ddd0"/><circle cx="105" cy="134" r="6" fill="#fffaf0" stroke="#c9a98f"/><path d="M105 134 L105 130 M105 134 L108 135" stroke="#7a6a5a" stroke-width="1"/><path d="M93 121 L105 106 L117 121 Z" fill="#c9a98f"/>';
      out += '<rect x="318" y="168" width="54" height="44" rx="3" fill="#e6ebef"/><path d="M322 168 A23 23 0 0 1 368 168 Z" fill="#c4d3df"/><rect x="343" y="146" width="4" height="12" fill="#9fb5c7" transform="rotate(25 345 152)"/>';
      out += tree(300, 208, 0.9) + tree(384, 208, 1);
    }
    return out;
  }

  function palm(x, y) {
    return '<g transform="translate(' + x + " " + y + ')"><path d="M0 0 Q4 -26 2 -44" stroke="#b08a6a" stroke-width="3" fill="none"/>' +
      '<path d="M2 -44 Q-14 -50 -22 -38 M2 -44 Q16 -52 24 -40 M2 -44 Q-6 -58 -16 -56 M2 -44 Q10 -60 20 -56" stroke="#79b58e" stroke-width="4" fill="none" stroke-linecap="round"/></g>';
  }

  function tree(x, y, s) {
    return '<g transform="translate(' + x + " " + y + ") scale(" + s.toFixed(2) + ')"><rect x="-1.5" y="-10" width="3" height="10" fill="#a98568"/><circle cx="0" cy="-17" r="10" fill="#79b58e"/><circle cx="-5" cy="-13" r="6" fill="#8cc59a"/></g>';
  }

  /* ── 本館（メイン展示で形が変わる） ── */
  function mainBuilding(cfg, P, opts) {
    var W = [118, 142, 166, 190][cfg.scale];
    var H = [62, 70, 78, 86][cfg.scale];
    var x0 = 200 - W / 2;
    var gy = 214;
    var out = "";
    var dark = cfg.closed;
    var glass = dark ? "#8a97ad" : "url(#glass)";

    if (cfg.main === "big") {
      out += '<rect x="' + x0 + '" y="' + (gy - H) + '" width="' + W + '" height="' + H + '" rx="10" fill="#f8f4ec"/>';
      out += '<path d="M' + (x0 - 6) + " " + (gy - H + 4) + " C" + (x0 + W * 0.25) + " " + (gy - H - 22) + " " + (x0 + W * 0.6) + " " + (gy - H + 14) + " " + (x0 + W + 6) + " " + (gy - H - 8) + " L" + (x0 + W + 6) + " " + (gy - H + 8) + " L" + (x0 - 6) + " " + (gy - H + 12) + ' Z" fill="#5fb0c2"/>';
      var gw = W * 0.62, gx = 200 - gw / 2, gh = H * 0.62, gyy = gy - H * 0.78;
      out += '<rect x="' + gx + '" y="' + gyy + '" width="' + gw + '" height="' + gh + '" rx="' + gh / 2.4 + '" fill="' + glass + '"/>';
      if (!dark) out += cfg.bigFish === "full" ? whaleShark(200, gyy + gh * 0.5, gw / 95) : ray(200, gyy + gh * 0.45, gw / 90) + fish(gx + gw * 0.2, gyy + gh * 0.75, 0.6, "#f3b49f", false);
    } else if (cfg.main === "small") {
      out += '<rect x="' + x0 + '" y="' + (gy - H) + '" width="' + W + '" height="' + H + '" rx="8" fill="#fbf6ee"/>';
      out += '<path d="M' + (x0 - 8) + " " + (gy - H + 6) + " Q200 " + (gy - H - 38) + " " + (x0 + W + 8) + " " + (gy - H + 6) + ' Z" fill="#f2a79c"/>';
      var n = 3 + cfg.scale;
      for (var i = 0; i < n; i++) {
        var cx = x0 + (W / (n + 1)) * (i + 1);
        out += '<circle cx="' + cx + '" cy="' + (gy - H * 0.62) + '" r="9" fill="' + glass + '" stroke="#e6d6c2" stroke-width="2"/>';
        if (!dark) out += fish(cx, gy - H * 0.62, 0.35, ["#f4a35d", "#7fbf9b", "#e9827a", "#f2cf63"][i % 4], i % 2 === 0);
      }
    } else {
      out += '<rect x="' + x0 + '" y="' + (gy - H * 0.55) + '" width="' + W + '" height="' + H * 0.55 + '" rx="6" fill="#eef2f6"/>';
      out += '<path d="M' + (x0 + 6) + " " + (gy - H * 0.55) + " A" + (W / 2 - 6) + " " + H * 0.75 + " 0 0 1 " + (x0 + W - 6) + " " + (gy - H * 0.55) + ' Z" fill="#3f5f8e"/>';
      var r = W * 0.2;
      out += '<circle cx="200" cy="' + (gy - H * 0.8) + '" r="' + r + '" fill="' + (dark ? "#55627a" : "#21385f") + '"/>';
      if (!dark) {
        out += '<circle cx="200" cy="' + (gy - H * 0.8) + '" r="' + r + '" fill="url(#glow)"/>';
        out += jelly(192, gy - H * 0.84, r / 22, "#f7c6e0") + jelly(208, gy - H * 0.76, r / 30, "#c9e9ff");
      }
    }

    // 入口
    out += '<path d="M190 ' + gy + " L190 " + (gy - 16) + " A10 10 0 0 1 210 " + (gy - 16) + " L210 " + gy + ' Z" fill="' + (dark ? "#7d8799" : "#a9d6e2") + '" stroke="#e6d6c2" stroke-width="1.5"/>';
    if (dark) out += '<rect x="194" y="' + (gy - 19) + '" width="12" height="8" fill="#fbf8f0" transform="rotate(-6 200 ' + (gy - 15) + ')"/>';

    // 看板
    var sy = gy - H - (cfg.main === "small" ? 34 : cfg.main === "deep" ? H * 0.3 + 2 : 26);
    if (cfg.main === "deep") sy = gy - H * 0.55 - 4;
    var sw = 96;
    out += '<rect x="' + (200 - sw / 2) + '" y="' + (sy - 9) + '" width="' + sw + '" height="16" rx="8" fill="' + (dark ? "#9aa1ae" : "#fffaf0") + '" stroke="' + (dark ? "#7c8494" : "#f2a79c") + '" stroke-width="1.5"/>';
    if (!dark) out += '<rect x="' + (200 - sw / 2) + '" y="' + (sy - 9) + '" width="' + sw + '" height="16" rx="8" fill="#fff6c9" opacity=".35"/>';
    if (opts.signText) {
      out += '<text x="200" y="' + (sy + 3) + '" text-anchor="middle" font-size="7.5" font-weight="700" fill="' + (dark ? "#5d6577" : "#2f4a6b") + '" font-family="Zen Maru Gothic, Hiragino Maru Gothic ProN, sans-serif">' + esc(opts.signText) + "</text>";
    }
    return { svg: out, W: W, H: H, x0: x0 };
  }

  function annexes(cfg, b) {
    var gy = 214, out = "";
    if (cfg.mega) {
      out += '<rect x="' + (b.x0 + 12) + '" y="' + (gy - b.H - 40) + '" width="22" height="' + (b.H + 40) + '" rx="4" fill="#f0ebe2"/>';
      out += '<path d="M' + (b.x0 + 23) + " " + (gy - b.H - 40) + " L" + (b.x0 + 23) + " " + (gy - b.H - 58) + '" stroke="#8a8a8a" stroke-width="1.2"/><path d="M' + (b.x0 + 23) + " " + (gy - b.H - 58) + ' l12 4 l-12 4 Z" fill="#f2a79c"/>';
    }
    if (cfg.newWing) {
      var wx = b.x0 + b.W - 4;
      out += '<rect x="' + wx + '" y="' + (gy - 46) + '" width="50" height="46" rx="6" fill="#f6f1e8"/>';
      out += '<path d="M' + wx + " " + (gy - 46) + " Q" + (wx + 30) + " " + (gy - 76) + " " + (wx + 54) + " " + (gy - 46) + ' Z" fill="#7cc0cf"/>';
      out += '<rect x="' + (wx + 10) + '" y="' + (gy - 34) + '" width="30" height="16" rx="8" fill="' + (cfg.closed ? "#8a97ad" : "url(#glass)") + '"/>';
    }
    if (cfg.conservation) {
      var lx = b.x0 - 44;
      out += '<rect x="' + lx + '" y="' + (gy - 36) + '" width="40" height="36" rx="4" fill="#eef3f0"/><path d="M' + (lx - 3) + " " + (gy - 36) + " L" + (lx + 20) + " " + (gy - 50) + " L" + (lx + 43) + " " + (gy - 36) + ' Z" fill="#8cc59a"/>';
      out += '<path d="M' + (lx + 16) + " " + (gy - 26) + " h8 v6 l5 10 h-18 l5 -10 Z\" fill=\"#cfeaf2\" stroke=\"#6a9aa8\" stroke-width=\"1\"/>";
      out += '<path d="M' + (lx + 34) + " " + (gy - 46) + " v-12 m-4 4 a6 6 0 0 1 8 0\" stroke=\"#8a9aa8\" stroke-width=\"1.2\" fill=\"none\"/>";
    }
    if (cfg.alliance) {
      var y = gy - b.H - 2, flags = "";
      for (var i = 0; i < 9; i++) {
        var fx = b.x0 + (b.W / 8) * i;
        flags += '<path d="M' + fx + " " + (y + 3 + Math.sin(i) * 1.5) + " l5 0 l-2.5 6 Z\" fill=\"" + ["#f2a79c", "#7cc0cf", "#f3d27a"][i % 3] + '"/>';
      }
      out += '<path d="M' + b.x0 + " " + (y + 3) + " Q200 " + (y + 9) + " " + (b.x0 + b.W) + " " + (y + 3) + '" stroke="#b9a99a" stroke-width=".8" fill="none"/>' + flags;
    }
    if (cfg.reservation && !cfg.closed) {
      out += '<g transform="translate(' + (b.x0 - 4) + " " + (gy - 22) + ')"><rect width="18" height="22" rx="2" fill="#fdf1e4"/><path d="M-2 0 h22 l-3 -6 h-16 Z" fill="#f2a79c"/><text x="9" y="13" font-size="5.5" text-anchor="middle" fill="#7a5a4a" font-family="sans-serif">予約</text></g>';
    }
    return out;
  }

  function people(cfg, R) {
    if (cfg.closed) return "";
    var out = "", n = cfg.crowd;
    var colors = ["#f2a79c", "#7cc0cf", "#f3d27a", "#9ccf9f", "#c7a6d9", "#f6b98a"];
    for (var i = 0; i < n; i++) {
      var side = i % 2 === 0 ? -1 : 1;
      var x = 200 + side * (22 + Math.floor(i / 2) * 13 + R() * 5);
      var y = 222 + R() * 6;
      var s = 0.9 + R() * 0.25;
      out += '<g transform="translate(' + x.toFixed(1) + " " + y.toFixed(1) + ") scale(" + s.toFixed(2) + ')"><rect x="-3" y="-6" width="6" height="8" rx="3" fill="' + colors[i % colors.length] + '"/><circle cx="0" cy="-9" r="2.8" fill="#f3d9c4"/></g>';
    }
    return out;
  }

  function staff(cfg) {
    if (cfg.closed) return "";
    var gy = 224, out = "";
    var conf = { veteran: { n: 2, coat: "#4f7fa8", hat: true }, rookie: { n: 5, coat: "#7cc0cf", hat: false }, elite: { n: 2, coat: "#ffffff", hat: false } }[cfg.staffStyle];
    for (var i = 0; i < conf.n; i++) {
      var x = 186 + i * (28 / Math.max(1, conf.n - 1)) - (conf.n === 5 ? 0 : -0);
      if (conf.n === 2) x = 192 + i * 16;
      var s = conf.n === 5 ? 0.8 : 1;
      out += '<g transform="translate(' + x + " " + gy + ") scale(" + s + ')"><rect x="-3.2" y="-7" width="6.4" height="9" rx="3" fill="' + conf.coat + '" stroke="#9ab" stroke-width=".4"/><circle cx="0" cy="-10" r="3" fill="#f3d9c4"/>' +
        (conf.hat ? '<rect x="-3.5" y="-14" width="7" height="2.5" rx="1" fill="#2f4a6b"/>' : "") + "</g>";
    }
    return out;
  }

  function sea(cfg, P, R) {
    var out = '<rect x="0" y="230" width="400" height="70" fill="url(#seaGrad)"/>';
    out += '<path d="M0 232 Q25 227 50 232 T100 232 T150 232 T200 232 T250 232 T300 232 T350 232 T400 232" stroke="#ffffff" stroke-width="1.6" fill="none" opacity=".7"/>';
    out += '<path d="M0 252 Q30 248 60 252 T120 252 T180 252 T240 252 T300 252 T360 252 T420 252" stroke="#ffffff" stroke-width="1" fill="none" opacity=".35"/>';
    var colors = cfg.main === "deep" ? ["#f7c6e0", "#c9e9ff", "#e6d4ff"] : ["#f3b49f", "#f3d27a", "#ffffff"];
    for (var i = 0; i < 6; i++) {
      var x = 30 + i * 62 + R() * 20, y = 262 + R() * 26;
      out += '<g class="mk-swim" style="animation-delay:-' + (i * 1.7).toFixed(1) + 's">' +
        (cfg.main === "deep" && i % 2 ? jelly(x, y, 0.7, colors[i % 3]) : fish(x, y, 0.55 + R() * 0.3, colors[i % 3], i % 2 === 0)) + "</g>";
    }
    if (cfg.main === "big" && cfg.bigFish === "full" && !cfg.closed) out += '<g opacity=".55">' + whaleShark(300, 282, 0.55) + "</g>";
    return out;
  }

  function sky(cfg, P, R) {
    var out = '<rect width="400" height="300" fill="url(#skyGrad)"/>';
    var night = cfg.mood === "night";
    out += '<circle cx="' + (night ? 330 : 318) + '" cy="58" r="' + (night ? 16 : 22) + '" fill="' + P.sun + '" opacity=".95"/>';
    if (night) for (var s = 0; s < 14; s++) out += '<circle cx="' + (R() * 400).toFixed(0) + '" cy="' + (R() * 110).toFixed(0) + '" r="' + (0.6 + R()).toFixed(1) + '" fill="#fffbe8" opacity=".8"/>';
    for (var c = 0; c < 3; c++) {
      var cx = 40 + c * 130 + R() * 30, cy = 40 + R() * 40;
      out += '<g opacity="' + (night ? 0.25 : 0.85) + '"><ellipse cx="' + cx + '" cy="' + cy + '" rx="26" ry="9" fill="#ffffff"/><ellipse cx="' + (cx + 12) + '" cy="' + (cy - 6) + '" rx="14" ry="9" fill="#ffffff"/></g>';
    }
    return out;
  }

  function confetti(cfg, R) {
    if (cfg.mood !== "bright") return "";
    var out = "";
    var colors = ["#f2a79c", "#7cc0cf", "#f3d27a", "#9ccf9f"];
    for (var i = 0; i < 26; i++) {
      var cx = (R() * 400).toFixed(0), cy = (R() * 140).toFixed(0);
      out += '<rect x="' + cx + '" y="' + cy + '" width="3" height="5" rx="1" fill="' + colors[i % 4] + '" transform="rotate(' + (R() * 180).toFixed(0) + " " + cx + " " + cy + ')" opacity=".85"/>';
    }
    return out;
  }

  /*
   * render(cfg, opts) → SVG文字列
   * opts.signText: 看板の文字 / opts.seed: 絵のゆらぎ / opts.id: 定義IDの接頭辞
   */
  function render(cfg, opts) {
    opts = opts || {};
    var P = PALETTE[cfg.mood] || PALETTE.calm;
    var R = rng(opts.seed || 7);
    var id = opts.id || "mk";
    var defs =
      "<defs>" +
      '<linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + P.sky1 + '"/><stop offset="1" stop-color="' + P.sky2 + '"/></linearGradient>' +
      '<linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + P.sea1 + '"/><stop offset="1" stop-color="' + P.sea2 + '"/></linearGradient>' +
      '<linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9f1f7"/><stop offset="1" stop-color="#7fc3d6"/></linearGradient>' +
      '<radialGradient id="glow"><stop offset="0" stop-color="#9fd8ff" stop-opacity=".7"/><stop offset="1" stop-color="#9fd8ff" stop-opacity="0"/></radialGradient>' +
      '<filter id="wc" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter>' +
      '<filter id="paper"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="8"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0 0.35  0 0 0 0.08 0"/></filter>' +
      "</defs>";
    // ID衝突を避けるため接頭辞をつける
    var body = sky(cfg, P, R) + confetti(cfg, R) +
      '<g filter="url(#wc)">' + background(cfg, P, R) +
      '<path d="M0 212 C100 206 300 206 400 212 L400 232 L0 232 Z" fill="' + (cfg.location === "nature" ? "#efe3c8" : "#f1e6d0") + '"/>';
    var b = mainBuilding(cfg, P, opts);
    body += annexes(cfg, b) + b.svg + "</g>" + staff(cfg) + people(cfg, R) + sea(cfg, P, R);
    if (cfg.renewed && !cfg.closed) body += '<g fill="#fffbe0"><path d="M150 140 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z"/><path d="M262 128 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 Z"/></g>';
    if (cfg.closed) body += '<rect width="400" height="300" fill="#2b3557" opacity=".18"/>';
    body += '<rect width="400" height="300" filter="url(#paper)"/>';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="' + (opts.width || 400) + '" height="' + (opts.height || 300) + '" role="img" aria-label="' + esc(opts.label || "完成した水族館のイラスト") + '">' + defs + body + "</svg>";
    return svg.replace(/id="(skyGrad|seaGrad|glass|glow|wc|paper)"/g, 'id="' + id + '-$1"').replace(/url\(#(skyGrad|seaGrad|glass|glow|wc|paper)\)/g, "url(#" + id + "-$1)");
  }

  M.visual = { render: render };
})(typeof window !== "undefined" ? window : globalThis);

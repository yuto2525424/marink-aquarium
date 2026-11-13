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
      '<path d="M9 0 L16 -6 L15 0 L16 6 Z" fill="' + color + '"/><path d="M-1 -5 L3 -9 L5 -5 Z" fill="' + color + '"/>' +
      '<path d="M-2 -5.5 Q0 0 -2 5.5" stroke="#fff" stroke-width="1.6" fill="none" opacity=".75"/><path d="M-8 1.5 Q0 4.5 8 1.5" stroke="#fff" stroke-width="1" fill="none" opacity=".35"/>' +
      '<circle cx="-5" cy="-1.5" r="1.3" fill="#2d3b55"/><circle cx="-5.4" cy="-1.9" r=".4" fill="#fff"/></g>';
  }

  function whaleShark(x, y, s) {
    var spots = "";
    for (var i = 0; i < 9; i++) spots += '<circle cx="' + (-22 + i * 6) + '" cy="' + (-3 + (i % 3) * 2.5) + '" r="1.1" fill="#ffffff" opacity=".8"/>';
    return '<g transform="translate(' + x + " " + y + ") scale(" + s + ')">' +
      '<path d="M-34 0 C-30 -9 12 -10 28 -2 L42 -12 L38 0 L42 10 L28 2 C12 9 -30 9 -34 0 Z" fill="#4f7fa8"/>' +
      '<path d="M-33 2 C-24 8 8 8 26 2 C10 6 -22 7 -33 2 Z" fill="#e9f4f7" opacity=".9"/>' +
      '<path d="M-2 -7 L4 -16 L10 -7 Z" fill="#4f7fa8"/><path d="M-8 4 L-14 12 L-2 6 Z" fill="#43709a"/>' +
      '<g stroke="#3d6489" stroke-width=".8" fill="none"><path d="M-22 -4 q1.5 4 0 7"/><path d="M-19 -4 q1.5 4 0 7"/><path d="M-16 -4 q1.5 4 0 7"/></g>' +
      '<circle cx="-28" cy="-2" r="1.3" fill="#13304f"/><path d="M-34 1 q3 1.6 7 .6" stroke="#13304f" stroke-width=".8" fill="none"/>' + spots + "</g>";
  }

  function ray(x, y, s) {
    return '<g transform="translate(' + x + " " + y + ") scale(" + s + ')"><path d="M0 -10 C10 -6 20 -2 26 2 C14 3 6 6 0 10 C-6 6 -14 3 -26 2 C-20 -2 -10 -6 0 -10 Z" fill="#5e86a6"/>' +
      '<path d="M0 9 Q2 20 8 26" stroke="#5e86a6" stroke-width="1.5" fill="none"/></g>';
  }

  function jelly(x, y, s, color) {
    return '<g transform="translate(' + x + " " + y + ") scale(" + s + ')" opacity=".9"><path d="M-8 0 C-8 -11 8 -11 8 0 Q4 2 0 0 Q-4 2 -8 0 Z" fill="' + color + '"/>' +
      '<path d="M-5 1 q-2 5 0 10 M0 1 q2 6 0 12 M5 1 q2 5 0 10" stroke="' + color + '" stroke-width="1" fill="none"/></g>';
  }

  /* ── 背景（立地）：ひと目でどんな場所かわかるように ──
   * 建物や木は <g class="mk-city" style="--d:秒"> で包み、建設アニメーションで順番に立ち上がる */
  function cityItem(i, svg) { return '<g class="mk-city" style="--d:' + (0.15 + i * 0.07).toFixed(2) + 's">' + svg + "</g>"; }
  function tower(x, y, w, h, c, lit, R) {
    var out = '<rect x="' + x + '" y="' + (y - h) + '" width="' + w + '" height="' + h + '" rx="1.5" fill="' + c + '"/>';
    out += '<rect x="' + (x + w - 4) + '" y="' + (y - h) + '" width="4" height="' + h + '" fill="#2f4a6b" opacity=".12"/>';
    out += '<rect x="' + (x - 1) + '" y="' + (y - h - 2) + '" width="' + (w + 2) + '" height="3" rx="1" fill="#fff" opacity=".55"/>';
    var roof = R();
    if (roof < 0.3) out += '<path d="M' + (x + w / 2) + " " + (y - h - 2) + " V" + (y - h - 14) + '" stroke="#9aa6b4" stroke-width="1"/><circle cx="' + (x + w / 2) + '" cy="' + (y - h - 14) + '" r="1.3" fill="#ff8a80"/>';
    else if (roof < 0.6) out += '<rect x="' + (x + 3) + '" y="' + (y - h - 8) + '" width="8" height="6" rx="1" fill="#b9c6d2"/><rect x="' + (x + 5) + '" y="' + (y - h - 11) + '" width="4" height="3" fill="#a8b6c3"/>';
    else if (roof < 0.75) out += '<path d="M' + x + " " + (y - h) + " L" + (x + w / 2) + " " + (y - h - 10) + " L" + (x + w) + " " + (y - h) + ' Z" fill="#b6c4d1"/>';
    for (var wy = y - h + 6; wy < y - 6; wy += 7) {
      for (var wx = x + 3; wx < x + w - 4; wx += 6) {
        if (R() < 0.82) out += '<rect x="' + wx.toFixed(1) + '" y="' + wy.toFixed(1) + '" width="3" height="3.4" fill="' + (lit && R() < 0.5 ? "#ffe9a8" : "#cfe2ec") + '" opacity=".95"/>';
      }
    }
    return out;
  }
  function background(cfg, P, R) {
    var out = "", i;
    var lit = cfg.night || cfg.mood === "night" || cfg.mood === "dusk";
    if (!cfg.location) {
      out += '<path d="M0 196 C90 178 170 190 230 196 C300 184 350 182 400 192 L400 215 L0 215 Z" fill="#cfe4c4"/>';
      out += tree(40, 208, 0.9) + tree(360, 208, 1) + tree(384, 210, 0.8);
      return out;
    }
    if (cfg.location === "tourist") {
      // 都会：高層ビルが立ち並ぶスカイライン・展望タワー・観覧車・ホテル・ヤシの木
      var far = [[0, 22, 84], [20, 18, 112], [36, 26, 70], [60, 16, 128], [74, 24, 96], [96, 20, 140], [114, 28, 88], [140, 18, 118], [156, 24, 100], [178, 20, 136],
        [196, 26, 92], [220, 18, 124], [236, 24, 106], [258, 20, 146], [276, 26, 90], [300, 18, 120], [316, 24, 98], [338, 20, 132], [356, 26, 86], [380, 20, 116]];
      out += '<g opacity=".55">';
      for (i = 0; i < far.length; i++) out += cityItem(i * 0.5, tower(far[i][0], 212, far[i][1], far[i][2], ["#c4d3e0", "#cfd9e4", "#bccbd9"][i % 3], lit, R));
      out += "</g>";
      var near = [[4, 30, 70, "#e3e9f0"], [34, 22, 92, "#dde6ee"], [104, 26, 64, "#e8e4dc"], [262, 28, 78, "#e6ebf1"], [292, 24, 104, "#dfe7ef"], [318, 34, 66, "#ece6dc"], [354, 26, 88, "#e2e8ef"], [380, 22, 60, "#e8e2d8"]];
      for (i = 0; i < near.length; i++) out += cityItem(4 + i, tower(near[i][0], 214, near[i][1], near[i][2], near[i][3], lit, R));
      // 展望タワー（架空のもの）
      out += cityItem(12, '<g><path d="M338 214 L346 70 L350 70 L358 214 Z" fill="#e7a3a3" opacity=".9"/><rect x="336" y="96" width="24" height="10" rx="5" fill="#f4f1ea" stroke="#d58f95" stroke-width="1"/><rect x="341" y="76" width="14" height="8" rx="4" fill="#f4f1ea" stroke="#d58f95" stroke-width="1"/><path d="M348 70 V48" stroke="#b9767c" stroke-width="1.5"/><circle cx="348" cy="47" r="2.2" fill="#ff6b6b"/></g>');
      // 観覧車
      var wheel = '<g opacity=".9"><circle cx="64" cy="150" r="34" fill="none" stroke="#e8a1a6" stroke-width="2.5"/>';
      for (i = 0; i < 8; i++) {
        var a = (i / 8) * Math.PI * 2;
        wheel += '<line x1="64" y1="150" x2="' + (64 + Math.cos(a) * 34).toFixed(1) + '" y2="' + (150 + Math.sin(a) * 34).toFixed(1) + '" stroke="#e8a1a6" stroke-width="1"/>';
        wheel += '<circle cx="' + (64 + Math.cos(a) * 34).toFixed(1) + '" cy="' + (150 + Math.sin(a) * 34).toFixed(1) + '" r="3.5" fill="' + ["#f6c6a8", "#a9d8e6", "#f3e0a0"][i % 3] + '"/>';
      }
      wheel += '<path d="M56 212 L64 150 L72 212" stroke="#d58f95" stroke-width="2" fill="none"/></g>';
      out += cityItem(13, wheel);
      // 屋上の看板
      out += cityItem(14, '<g><rect x="290" y="96" width="30" height="10" rx="2" fill="#2f4a6b"/><text x="305" y="103.4" font-size="5.5" font-weight="700" text-anchor="middle" fill="#ffd36b" font-family="sans-serif">SEA CITY</text></g>');
      // 遊歩道：手すり・街灯・行き交う車
      var walk = '<rect x="0" y="216" width="400" height="5" fill="#9aa6b4" opacity=".45"/><g stroke="#fff" stroke-width="1" opacity=".8">';
      for (i = 0; i < 20; i++) walk += '<line x1="' + (6 + i * 20) + '" y1="218.5" x2="' + (14 + i * 20) + '" y2="218.5"/>';
      walk += "</g>";
      [[96, "#f2a79c"], [262, "#7cc0cf"], [330, "#f3d27a"]].forEach(function (car) {
        walk += '<g transform="translate(' + car[0] + ' 216)"><rect x="0" y="-5" width="16" height="5" rx="2" fill="' + car[1] + '"/><path d="M3 -5 l2 -3 h6 l2 3 Z" fill="' + car[1] + '"/><rect x="5.5" y="-7.6" width="2.4" height="2.2" fill="#e8f4f8"/><rect x="8.6" y="-7.6" width="2.4" height="2.2" fill="#e8f4f8"/><circle cx="4" cy="0.5" r="1.6" fill="#3d4a5c"/><circle cx="12" cy="0.5" r="1.6" fill="#3d4a5c"/></g>';
      });
      for (i = 0; i < 5; i++) {
        var lx = [12, 118, 172, 236, 300][i];
        walk += '<g><rect x="' + lx + '" y="190" width="1.4" height="27" fill="#6d7d8f"/><path d="M' + (lx + 0.7) + ' 190 q4 -2 6 1" stroke="#6d7d8f" stroke-width="1.2" fill="none"/><ellipse cx="' + (lx + 6.5) + '" cy="192" rx="2.4" ry="1.6" fill="' + (lit ? "#ffe7a3" : "#fff6d0") + '"/></g>';
      }
      out += cityItem(15, walk);
      out += cityItem(16, palm(24, 214) + palm(150, 214) + palm(250, 214) + palm(388, 214));
      // 空：ヘリコプターと鳥
      out += cityItem(17, '<g transform="translate(118 74)"><ellipse cx="0" cy="0" rx="7" ry="3.6" fill="#f3d27a"/><rect x="5" y="-1" width="9" height="1.6" fill="#f3d27a"/><path d="M-9 -5 h18" stroke="#5b6b7d" stroke-width="1"/><path d="M0 -5 v1.6" stroke="#5b6b7d"/><rect x="-3" y="-1.4" width="3" height="2" fill="#cfeaf2"/></g>' +
        '<g stroke="#5b6b7d" stroke-width="1" fill="none"><path d="M200 46 q4 -4 8 0 q4 -4 8 0"/><path d="M228 60 q3 -3 6 0 q3 -3 6 0"/></g>');
    } else if (cfg.location === "nature") {
      // 自然の海辺：重なる山・森・灯台・カモメ
      out += cityItem(0, '<path d="M0 170 L46 108 L84 150 L130 96 L184 160 L230 120 L280 166 L330 112 L400 168 L400 214 L0 214 Z" fill="#b7d3c4" opacity=".75"/>');
      out += cityItem(1, '<path d="M150 116 l-10 14 l20 0 Z M330 112 l-9 12 l18 0 Z" fill="#fff" opacity=".85"/>');
      out += cityItem(2, '<path d="M0 190 C60 150 120 168 170 186 C230 160 300 150 400 182 L400 215 L0 215 Z" fill="#a9d3a8" opacity=".9"/>');
      out += cityItem(3, '<path d="M0 200 C80 178 150 196 220 200 C290 186 350 184 400 196 L400 215 L0 215 Z" fill="#8cc59a"/>');
      var trees = "";
      for (i = 0; i < 16; i++) {
        var tx = [8, 22, 36, 50, 64, 78, 92, 106, 296, 310, 324, 338, 352, 366, 380, 394][i];
        trees += tree(tx, 207 - (i % 3) * 3, 0.7 + R() * 0.5);
      }
      out += cityItem(4, trees);
      out += cityItem(6, '<g transform="translate(352 118)"><path d="M-7 72 L-4 0 L4 0 L7 72 Z" fill="#fbfaf6"/><rect x="-4.5" y="16" width="9" height="7" fill="#e88f8f"/><rect x="-5.5" y="38" width="11" height="7" fill="#e88f8f"/><rect x="-6" y="-8" width="12" height="9" rx="2" fill="' + P.sun + '"/><path d="M-7 -8 L0 -16 L7 -8 Z" fill="#e88f8f"/><path d="M6 -4 L60 -20 L60 12 Z" fill="#fff6c9" opacity=".35"/></g>');
      out += cityItem(7, '<g stroke="#5b6b7d" stroke-width="1.2" fill="none"><path d="M120 70 q5 -5 10 0 q5 -5 10 0"/><path d="M150 54 q4 -4 8 0 q4 -4 8 0"/><path d="M262 66 q5 -5 10 0 q5 -5 10 0"/></g>');
      // 花畑と木の桟橋
      var fl = "";
      for (i = 0; i < 24; i++) fl += '<circle cx="' + (10 + i * 16 + (i % 3) * 3) + '" cy="' + (203 + (i % 4) * 2) + '" r="1.5" fill="' + ["#f2a79c", "#f3d27a", "#ffffff", "#c7a6d9"][i % 4] + '"/>';
      out += cityItem(5, fl);
      out += cityItem(9, '<g><rect x="250" y="226" width="62" height="4" fill="#b8916c"/><rect x="254" y="226" width="2.4" height="12" fill="#8f6c50"/><rect x="276" y="226" width="2.4" height="12" fill="#8f6c50"/><rect x="298" y="226" width="2.4" height="12" fill="#8f6c50"/><path d="M252 226 V219 M310 226 V219 M252 220 H310" stroke="#a3785a" stroke-width="1"/></g>');
      // 漁師小屋
      out += cityItem(8, '<g><rect x="16" y="196" width="26" height="18" fill="#d9b58c"/><path d="M13 197 L29 184 L45 197 Z" fill="#a3785a"/><rect x="25" y="203" width="7" height="11" fill="#8a6a50"/></g>');
    } else {
      // 大学の街：講堂・図書館・時計台・天文台・並木
      out += cityItem(0, '<g><rect x="6" y="144" width="96" height="68" rx="3" fill="#ece6dc"/><path d="M0 146 L54 116 L108 146 Z" fill="#c9a98f"/>' +
        (function () { var c = ""; for (var k = 0; k < 6; k++) c += '<rect x="' + (14 + k * 15) + '" y="158" width="7" height="44" rx="3.5" fill="#f8f4ec" stroke="#d9cbb8" stroke-width=".6"/>'; return c; })() + "</g>");
      out += cityItem(1, '<g><rect x="104" y="112" width="20" height="100" fill="#e5ddd0"/><circle cx="114" cy="128" r="7" fill="#fffaf0" stroke="#c9a98f"/><path d="M114 128 L114 123 M114 128 L118 129" stroke="#7a6a5a" stroke-width="1"/><path d="M100 113 L114 94 L128 113 Z" fill="#c9a98f"/><path d="M114 94 V84" stroke="#9a8a7a" stroke-width="1"/><path d="M114 84 l8 3 l-8 3 Z" fill="#7cc0cf"/></g>');
      out += cityItem(2, tower(272, 212, 40, 70, "#e6e1d8", lit, R) + '<path d="M270 143 L292 130 L314 143 Z" fill="#c9a98f"/><text x="292" y="156" font-size="5" font-weight="700" text-anchor="middle" fill="#7a6a5a" font-family="sans-serif">LIBRARY</text>');
      out += cityItem(3, '<g><rect x="318" y="166" width="58" height="46" rx="3" fill="#e6ebef"/><path d="M322 166 A25 25 0 0 1 372 166 Z" fill="#c4d3df"/><rect x="345" y="142" width="4" height="14" fill="#9fb5c7" transform="rotate(25 347 150)"/></g>');
      out += cityItem(4, '<g><rect x="380" y="150" width="20" height="62" fill="#ece6dc"/><rect x="384" y="158" width="5" height="6" fill="#cfe2ec"/><rect x="391" y="158" width="5" height="6" fill="#cfe2ec"/><rect x="384" y="170" width="5" height="6" fill="#cfe2ec"/><rect x="391" y="170" width="5" height="6" fill="#cfe2ec"/></g>');
      out += cityItem(5, tree(132, 210, 0.9) + tree(146, 211, 0.8) + tree(256, 210, 0.9) + tree(244, 211, 0.75));
      // 芝生と小道、学生
      out += cityItem(7, '<path d="M0 206 L400 206 L400 216 L0 216 Z" fill="#a9d3a8" opacity=".55"/><path d="M110 216 Q150 208 186 214 M214 214 Q250 208 290 216" stroke="#efe3c8" stroke-width="3" fill="none"/>');
      out += cityItem(8, '<g><g transform="translate(140 214)"><rect x="-2" y="-7" width="4" height="6" rx="2" fill="#7cc0cf"/><circle cx="0" cy="-9" r="2" fill="#f3d9c4"/><rect x="1.6" y="-6" width="3" height="4" rx="1" fill="#c9805a"/></g><g transform="translate(266 214)"><rect x="-2" y="-7" width="4" height="6" rx="2" fill="#c7a6d9"/><circle cx="0" cy="-9" r="2" fill="#f3d9c4"/><path d="M-3 -10 h6 l-3 -2 Z" fill="#2f4a6b"/></g></g>');
      // 自転車
      out += cityItem(6, '<g stroke="#5b6b7d" stroke-width="1" fill="none"><circle cx="246" cy="222" r="3.5"/><circle cx="256" cy="222" r="3.5"/><path d="M246 222 L250 216 L256 222 M250 216 L254 216"/></g>');
    }
    return out;
  }

  function palm(x, y) {
    var rings = "";
    for (var k = 1; k < 7; k++) rings += '<path d="M' + (k * 0.5 - 1.6).toFixed(1) + " " + (-k * 6.2).toFixed(1) + " l3.4 -.8" + '" stroke="#8f6c50" stroke-width=".7"/>';
    return '<g transform="translate(' + x + " " + y + ')"><ellipse cx="2" cy="1" rx="9" ry="2" fill="#000" opacity=".08"/><path d="M0 0 Q4 -26 2 -44" stroke="#b08a6a" stroke-width="3.4" fill="none"/>' + rings +
      '<path d="M2 -44 Q-14 -50 -22 -38 M2 -44 Q16 -52 24 -40" stroke="#5f9d74" stroke-width="4.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M2 -44 Q-6 -58 -16 -56 M2 -44 Q10 -60 20 -56 M2 -44 Q2 -56 4 -60" stroke="#79b58e" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="0" cy="-42" r="2" fill="#8a6a40"/><circle cx="4" cy="-41.5" r="2" fill="#7a5c36"/></g>';
  }

  function tree(x, y, s) {
    return '<g transform="translate(' + x + " " + y + ") scale(" + s.toFixed(2) + ')"><ellipse cx="0" cy="0.5" rx="8" ry="1.8" fill="#000" opacity=".08"/><rect x="-1.6" y="-11" width="3.2" height="11" fill="#a98568"/><rect x=".2" y="-11" width="1.4" height="11" fill="#8f6c50"/>' +
      '<circle cx="2" cy="-16" r="10" fill="#5f9d74"/><circle cx="-1" cy="-18" r="10" fill="#79b58e"/><circle cx="-5" cy="-14" r="6" fill="#8cc59a"/><circle cx="-4" cy="-22" r="3.4" fill="#a3d3ad" opacity=".9"/>' +
      '<circle cx="4" cy="-13" r="1.2" fill="#f2a79c" opacity=".8"/><circle cx="-7" cy="-19" r="1" fill="#f3d27a" opacity=".8"/></g>';
  }

  /* ── 本館（メイン展示で形が変わる） ── */
  function mainBuilding(cfg, P, opts) {
    // 派手さ（grand）に合わせて、建物の大きさを少しずつ変える
    var gr = typeof cfg.grand === "number" ? cfg.grand : [ -1.5, -0.5, 0.8, 2.2, 3.6, 5.2, 7 ][cfg.scale || 0];
    var W = Math.round(Math.max(72, Math.min(292, 100 + gr * 24)));
    var H = Math.round(Math.max(44, Math.min(126, 56 + gr * 8.5)));
    var x0 = 200 - W / 2;
    var gy = 214;
    var out = "";
    var dark = cfg.closed || cfg.damage >= 7;
    var glass = dark ? "#8a97ad" : "url(#glass)";

    if (!cfg.main) {
      out += '<rect x="' + x0 + '" y="' + (gy - H) + '" width="' + W + '" height="' + H + '" rx="8" fill="#f6f2ea"/>';
      out += '<path d="M' + (x0 - 6) + " " + (gy - H + 2) + " L200 " + (gy - H - 22) + " L" + (x0 + W + 6) + " " + (gy - H + 2) + ' Z" fill="#8fc3cf"/>';
      for (var pw = 0; pw < 4; pw++) out += '<rect x="' + (x0 + 14 + pw * (W - 28) / 3 - 9) + '" y="' + (gy - H * 0.7) + '" width="18" height="14" rx="3" fill="' + glass + '"/>';
    } else if (cfg.main === "big") {
      out += '<rect x="' + x0 + '" y="' + (gy - H) + '" width="' + W + '" height="' + H + '" rx="10" fill="#f8f4ec"/>';
      out += '<path d="M' + (x0 - 6) + " " + (gy - H + 4) + " C" + (x0 + W * 0.25) + " " + (gy - H - 22) + " " + (x0 + W * 0.6) + " " + (gy - H + 14) + " " + (x0 + W + 6) + " " + (gy - H - 8) + " L" + (x0 + W + 6) + " " + (gy - H + 8) + " L" + (x0 - 6) + " " + (gy - H + 12) + ' Z" fill="#5fb0c2"/>';
      var gw = W * 0.62, gx = 200 - gw / 2, gh = H * 0.62, gyy = gy - H * 0.78;
      out += '<rect x="' + gx + '" y="' + gyy + '" width="' + gw + '" height="' + gh + '" rx="' + gh / 2.4 + '" fill="' + glass + '" stroke="#e6dccb" stroke-width="2.5"/>';
      if (!dark) {
        var tank = "";
        for (var lr = 0; lr < 3; lr++) tank += '<path d="M' + (gx + gw * (0.25 + lr * 0.22)) + " " + gyy + " l" + (gw * 0.08) + " " + gh + " l" + (gw * 0.05) + " 0 l" + (-gw * 0.06) + " " + (-gh) + ' Z" fill="#fff" opacity=".18"/>';
        tank += '<path d="M' + (gx + 6) + " " + (gyy + gh - 2) + " Q" + (gx + gw * 0.3) + " " + (gyy + gh - 9) + " " + (gx + gw * 0.5) + " " + (gyy + gh - 4) + " T" + (gx + gw - 6) + " " + (gyy + gh - 3) + " L" + (gx + gw - 6) + " " + (gyy + gh) + " L" + (gx + 6) + " " + (gyy + gh) + ' Z" fill="#e8dcc0" opacity=".9"/>';
        for (var sw = 0; sw < 5; sw++) {
          var swx = gx + gw * (0.1 + sw * 0.2), swh = gh * (0.25 + (sw % 3) * 0.1);
          tank += '<path d="M' + swx + " " + (gyy + gh - 3) + " q-3 " + (-swh / 2) + " 0 " + (-swh) + " M" + (swx + 3) + " " + (gyy + gh - 3) + " q3 " + (-swh / 2.4) + " 0 " + (-swh * 0.8) + '" stroke="' + ["#6fb58a", "#8cc59a", "#e9a1a0"][sw % 3] + '" stroke-width="2" fill="none" stroke-linecap="round"/>';
        }
        for (var bb = 0; bb < 6; bb++) tank += '<circle cx="' + (gx + gw * (0.15 + bb * 0.14)) + '" cy="' + (gyy + gh * (0.2 + (bb % 3) * 0.18)) + '" r="' + (1 + (bb % 2)) + '" fill="none" stroke="#fff" stroke-width=".7" opacity=".8"/>';
        out += tank;
      }
      if (!dark) out += cfg.bigFish === "full" ? whaleShark(200, gyy + gh * 0.5, gw / 95) : ray(200, gyy + gh * 0.45, gw / 90) + fish(gx + gw * 0.2, gyy + gh * 0.75, 0.6, "#f3b49f", false);
    } else if (cfg.main === "small") {
      out += '<rect x="' + x0 + '" y="' + (gy - H) + '" width="' + W + '" height="' + H + '" rx="8" fill="#fbf6ee"/>';
      out += '<path d="M' + (x0 - 8) + " " + (gy - H + 6) + " Q200 " + (gy - H - 38) + " " + (x0 + W + 8) + " " + (gy - H + 6) + ' Z" fill="#f2a79c"/>';
      var n = Math.max(2, Math.min(7, Math.round(W / 34)));
      for (var i = 0; i < n; i++) {
        var cx = x0 + (W / (n + 1)) * (i + 1);
        out += '<circle cx="' + cx + '" cy="' + (gy - H * 0.62) + '" r="9" fill="' + glass + '" stroke="#e6d6c2" stroke-width="2"/>';
        if (!dark) out += '<path d="M' + (cx - 5) + " " + (gy - H * 0.62 - 3) + " a6 6 0 0 1 5 -4" + '" stroke="#fff" stroke-width="1.4" fill="none" opacity=".8" stroke-linecap="round"/><path d="M' + (cx - 6) + " " + (gy - H * 0.62 + 7) + " q6 -3 12 0" + '" stroke="#8cc59a" stroke-width="1.6" fill="none"/>';
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

    // 作り込み：外壁の陰影・上下の帯・柱
    var bodyTop = cfg.main === "deep" ? gy - H * 0.55 : gy - H, bodyH = gy - bodyTop;
    if (!dark) {
      out += '<rect x="' + x0 + '" y="' + bodyTop + '" width="' + W + '" height="' + bodyH + '" rx="8" fill="url(#wallShade)"/>';
      out += '<rect x="' + (x0 + 2) + '" y="' + (bodyTop + 1) + '" width="' + (W - 4) + '" height="3" rx="1.5" fill="#fff" opacity=".7"/>';
      out += '<rect x="' + (x0 + 4) + '" y="' + (bodyTop + 1) + '" width="3" height="' + (bodyH - 6) + '" fill="#fff" opacity=".45"/><rect x="' + (x0 + W - 7) + '" y="' + (bodyTop + 1) + '" width="3" height="' + (bodyH - 6) + '" fill="#d9cfc0" opacity=".55"/>';
    }
    out += '<rect x="' + (x0 - 2) + '" y="' + (gy - 5) + '" width="' + (W + 4) + '" height="5" rx="1.5" fill="' + (dark ? "#8f939d" : "#d8cfc0") + '"/>';
    // 入口のひさしと階段
    out += '<path d="M182 ' + (gy - 27) + " L218 " + (gy - 27) + " L214 " + (gy - 21) + " L186 " + (gy - 21) + ' Z" fill="' + (dark ? "#8a97ad" : "#f2a79c") + '"/>';
    if (!dark) for (var aw = 0; aw < 5; aw++) out += '<rect x="' + (187 + aw * 6) + '" y="' + (gy - 26.5) + '" width="3" height="5" fill="#fff" opacity=".6"/>';
    out += '<rect x="186" y="' + gy + '" width="28" height="2.5" fill="#e6dccb"/><rect x="183" y="' + (gy + 2.5) + '" width="34" height="2.5" fill="#d8cfc0"/>';
    // 入口
    out += '<path d="M190 ' + gy + " L190 " + (gy - 16) + " A10 10 0 0 1 210 " + (gy - 16) + " L210 " + gy + ' Z" fill="' + (dark ? "#7d8799" : "#a9d6e2") + '" stroke="#e6d6c2" stroke-width="1.5"/>';
    if (dark) out += '<rect x="194" y="' + (gy - 19) + '" width="12" height="8" fill="#fbf8f0" transform="rotate(-6 200 ' + (gy - 15) + ')"/>';
    else out += '<path d="M200 ' + (gy - 25) + " V" + gy + '" stroke="#e6d6c2" stroke-width="1"/><path d="M193 ' + (gy - 12) + " l5 -8 M195 " + (gy - 5) + ' l6 -10" stroke="#fff" stroke-width="1.2" opacity=".7"/><circle cx="198" cy="' + (gy - 8) + '" r=".8" fill="#c9a24a"/><circle cx="202" cy="' + (gy - 8) + '" r=".8" fill="#c9a24a"/>';

    // 看板
    var sy = gy - H - (cfg.main === "small" ? 34 : cfg.main === "deep" ? H * 0.3 + 2 : 26);
    if (cfg.main === "deep") sy = gy - H * 0.55 - 4;
    if ((cfg.scale || 0) >= 6 && !cfg.closed) sy = Math.min(sy, gy - H - 4 - W * 0.18 - 12); // ガラスドームの上に看板
    // 看板の幅と文字の大きさは名前の長さに合わせる
    var len = opts.signText ? Array.from(String(opts.signText)).length : 10;
    var fsz = len <= 12 ? 7.5 : len <= 16 ? 6.6 : 5.8;
    var sw = Math.max(96, Math.min(190, len * fsz + 22));
    if (cfg.damage >= 9) out += '<g transform="rotate(' + (cfg.damage >= 10 ? 9 : 5) + " " + (200 + sw / 2) + " " + sy + ')">';
    out += '<rect x="' + (200 - sw / 2) + '" y="' + (sy - 9) + '" width="' + sw + '" height="16" rx="8" fill="' + (dark ? "#9aa1ae" : "#fffaf0") + '" stroke="' + (dark ? "#7c8494" : "#f2a79c") + '" stroke-width="1.5"/>';
    if (!dark) out += '<rect x="' + (200 - sw / 2) + '" y="' + (sy - 9) + '" width="' + sw + '" height="16" rx="8" fill="#fff6c9" opacity=".35"/>';
    if (opts.signText) {
      out += '<text x="200" y="' + (sy + 3) + '" text-anchor="middle" font-size="' + fsz + '" font-weight="700" fill="' + (dark ? "#5d6577" : "#2f4a6b") + '" font-family="Zen Maru Gothic, Hiragino Maru Gothic ProN, sans-serif">' + esc(opts.signText) + "</text>";
    }
    if (cfg.damage >= 9) out += "</g>";
    return { svg: out, W: W, H: H, x0: x0, sy: sy, sw: sw };
  }

  /* ───── 選択ごとに増える外観パーツ（1回選ぶたびに、見た目がどこか変わる） ─────
   * それぞれ <g class="mk-x mk-x-フラグ名"> で包む。変化アニメーションで「新しく付いた部分」だけを目立たせるため */
  function has(cfg, f) { return !!(cfg.flags && cfg.flags.indexOf(f) >= 0); }
  function xg(flag, svg) { return '<g class="mk-x mk-x-' + flag + '">' + svg + "</g>"; }
  function balloon(x, y, c) {
    return '<path d="M' + x + " " + (y + 9) + " q-2 8 1 16" + '" stroke="#9aa6b4" stroke-width=".6" fill="none"/><ellipse cx="' + x + '" cy="' + y + '" rx="5" ry="6.2" fill="' + c + '"/><ellipse cx="' + (x - 1.6) + '" cy="' + (y - 2) + '" rx="1.3" ry="1.8" fill="#fff" opacity=".6"/>';
  }
  function extras(cfg, b) {
    if (cfg.closed) return "";
    var gy = 214, x0 = b.x0, W = b.W, H = b.H, out = "", i, s;
    // 第3問：たくさんの種類 → 外壁に色とりどりの小窓
    if (has(cfg, "variety")) {
      s = "";
      var cols = ["#f4a35d", "#7fbf9b", "#e9827a", "#f2cf63", "#7cc0cf", "#c7a6d9"];
      for (i = 0; i < 8; i++) {
        var px = i < 4 ? x0 + 12 + i * ((186 - x0 - 16) / 4) : 216 + (i - 4) * ((x0 + W - 220) / 4);
        s += '<circle cx="' + px.toFixed(1) + '" cy="' + (gy - 9) + '" r="3.6" fill="' + cols[i % 6] + '" stroke="#fff" stroke-width="1"/>';
      }
      out += xg("variety", s);
    }
    // 第3問：設備の信頼性 → 屋上のろ過タンクと配管
    if (has(cfg, "reliable")) {
      out += xg("reliable", '<rect x="' + (x0 + 8) + '" y="' + (gy - H - 16) + '" width="14" height="18" rx="5" fill="#9cc7d6" stroke="#6f9fb2" stroke-width="1"/><path d="M' + (x0 + 22) + " " + (gy - H - 6) + " h10 v8" + '" stroke="#8a9aa8" stroke-width="2" fill="none"/><rect x="' + (x0 + 11) + '" y="' + (gy - H - 12) + '" width="8" height="2" fill="#fff" opacity=".7"/>');
    }
    // 第4問：融資で予定通り開館 → 入口の両側に風船
    if (has(cfg, "loan")) {
      out += xg("loan", balloon(176, 186, "#f2a79c") + balloon(170, 192, "#7cc0cf") + balloon(181, 194, "#f3d27a") + balloon(224, 186, "#9ccf9f") + balloon(230, 192, "#f2a79c") + balloon(219, 194, "#c7a6d9"));
    }
    // 第4問：開館を延期 → 「祝 開館」の垂れ幕
    if (has(cfg, "delayed")) {
      out += xg("delayed", '<rect x="' + (x0 + W - 22) + '" y="' + (gy - H + 8) + '" width="13" height="40" fill="#fff6e8" stroke="#e8a1a6" stroke-width="1"/><text x="' + (x0 + W - 15.5) + '" y="' + (gy - H + 20) + '" font-size="7" font-weight="700" text-anchor="middle" fill="#d9605a" font-family="Zen Maru Gothic, sans-serif"><tspan x="' + (x0 + W - 15.5) + '" dy="0">祝</tspan><tspan x="' + (x0 + W - 15.5) + '" dy="9">開</tspan><tspan x="' + (x0 + W - 15.5) + '" dy="9">館</tspan></text>');
    }
    // 第6問：入館料 → 入口まわりが変わる
    if (has(cfg, "price_high")) {
      out += xg("price_high", '<path d="M192 214 L208 214 L216 230 L184 230 Z" fill="#d9605a" opacity=".85"/>' +
        '<g><rect x="179" y="196" width="2" height="18" fill="#6d5a4a"/><circle cx="180" cy="195" r="3.5" fill="#ffe7a3"/><rect x="219" y="196" width="2" height="18" fill="#6d5a4a"/><circle cx="220" cy="195" r="3.5" fill="#ffe7a3"/></g>');
    }
    if (has(cfg, "price_mid")) {
      out += xg("price_mid", '<rect x="222" y="198" width="18" height="16" rx="2" fill="#fdf6ec" stroke="#c9b9a0" stroke-width=".6"/><path d="M220 198 h22 l-3 -6 h-16 Z" fill="#7cc0cf"/><rect x="226" y="202" width="10" height="6" rx="1" fill="#bfe3ee"/><text x="231" y="212.5" font-size="3.6" text-anchor="middle" fill="#2f4a6b" font-family="sans-serif">TICKET</text>');
    }
    if (has(cfg, "price_low")) {
      s = '<rect x="236" y="204" width="26" height="12" rx="1.5" fill="#fff8ec"/>';
      for (i = 0; i < 5; i++) s += '<path d="M' + (234 + i * 6) + " 204 l6 0 l-1 -6 l-4 0 Z" + '" fill="' + (i % 2 ? "#fff" : "#e9827a") + '"/>';
      s += '<circle cx="243" cy="210" r="2.4" fill="#f3c74a"/><circle cx="250" cy="210" r="2.4" fill="#f4a35d"/><circle cx="257" cy="210" r="2.4" fill="#f3c74a"/>';
      out += xg("price_low", s);
    }
    // 第7問：設備トラブルへの対応
    if (has(cfg, "renewed")) {
      out += xg("renewed", '<g opacity=".55"><path d="M' + (x0 + W * 0.15) + " " + (gy - 4) + " l14 -" + (H - 10) + " l7 0 l-14 " + (H - 10) + ' Z" fill="#fff"/><path d="M' + (x0 + W * 0.72) + " " + (gy - 4) + " l10 -" + (H - 12) + " l4 0 l-10 " + (H - 12) + ' Z" fill="#fff"/></g>');
    }
    if (has(cfg, "paused")) {
      out += xg("paused", '<g><rect x="' + (x0 + W * 0.66) + '" y="' + (gy - H * 0.42) + '" width="22" height="14" rx="1.5" fill="#e3ecf2" stroke="#a8b8c6" stroke-width=".8"/><g fill="#a8b8c6"><circle cx="' + (x0 + W * 0.66 + 3) + '" cy="' + (gy - H * 0.42 + 3) + '" r=".9"/><circle cx="' + (x0 + W * 0.66 + 19) + '" cy="' + (gy - H * 0.42 + 3) + '" r=".9"/><circle cx="' + (x0 + W * 0.66 + 3) + '" cy="' + (gy - H * 0.42 + 11) + '" r=".9"/><circle cx="' + (x0 + W * 0.66 + 19) + '" cy="' + (gy - H * 0.42 + 11) + '" r=".9"/></g></g>');
    }
    if (has(cfg, "contract")) {
      out += xg("contract", '<g transform="translate(272 214)"><rect x="0" y="-13" width="30" height="11" rx="2" fill="#f6f6f2" stroke="#9aa6b4" stroke-width=".6"/><path d="M30 -10 h6 l3 4 v4 h-9 Z" fill="#cfe4ee" stroke="#9aa6b4" stroke-width=".6"/><rect x="2" y="-10" width="26" height="3" fill="#4fa6b8"/><circle cx="7" cy="-1" r="2.6" fill="#3d4a5c"/><circle cx="31" cy="-1" r="2.6" fill="#3d4a5c"/></g>');
    }
    // 第8問：SNSのバズへの対応
    if (has(cfg, "reservation")) {
      s = "";
      for (i = 0; i < 4; i++) s += '<rect x="' + (222 + i * 9) + '" y="214" width="1.4" height="9" fill="#c9a24a"/>';
      s += '<path d="M222.7 216 q4.5 3 9 0 q4.5 3 9 0 q4.5 3 9 0" stroke="#d9605a" stroke-width="1.2" fill="none"/>';
      out += xg("reservation", s);
    }
    if (has(cfg, "expanded_staff")) {
      var sx = Math.min(368, x0 + W + 52);
      out += xg("expanded_staff", '<rect x="' + sx + '" y="' + (gy - 24) + '" width="26" height="24" rx="2" fill="#f3efe6"/><path d="M' + (sx - 2) + " " + (gy - 24) + " l15 -9 l15 9 Z" + '" fill="#a9c6a0"/><rect x="' + (sx + 10) + '" y="' + (gy - 11) + '" width="6" height="11" fill="#c9b18e"/><text x="' + (sx + 13) + '" y="' + (gy - 15) + '" font-size="4" text-anchor="middle" fill="#2f4a6b" font-family="sans-serif">STAFF</text>');
    }
    // 第9問：待遇と設備の改善 → 花だんとベンチ
    if (has(cfg, "care")) {
      s = "";
      var fc = ["#f2a79c", "#f3d27a", "#c7a6d9", "#ffffff"];
      for (i = 0; i < 12; i++) {
        var fx = i < 6 ? x0 + 6 + i * 6 : 216 + (i - 6) * 6;
        if (fx > 186 && fx < 214) continue;
        s += '<path d="M' + fx + " 216 v-3" + '" stroke="#79b58e" stroke-width="1"/><circle cx="' + fx + '" cy="212.5" r="1.9" fill="' + fc[i % 4] + '"/>';
      }
      s += '<g transform="translate(' + (x0 - 18) + ' 220)"><rect x="0" y="-5" width="14" height="2" rx="1" fill="#b08a6a"/><rect x="0" y="-9" width="14" height="2" rx="1" fill="#b08a6a"/><rect x="1" y="-3" width="1.4" height="4" fill="#8a6a50"/><rect x="11.6" y="-3" width="1.4" height="4" fill="#8a6a50"/></g>';
      out += xg("care", s);
    }
    // 第10問：今の体制をみがく → 看板の上に星のエンブレム
    if (has(cfg, "keep") && b.sy) {
      var cy = b.sy - 16;
      out += xg("keep", '<path d="M200 ' + (cy - 7) + " l2.2 4.6 l5 .7 l-3.6 3.5 l.9 5 l-4.5 -2.4 l-4.5 2.4 l.9 -5 l-3.6 -3.5 l5 -.7 Z" + '" fill="#f3c74a" stroke="#d9a42e" stroke-width=".6"/>');
    }
    // 第10問：他館と連携 → 小さな国旗の列
    if (has(cfg, "alliance")) {
      s = "";
      var fl = [["#ffffff", "#d9605a"], ["#3f6fb5", "#ffffff"], ["#2f9e6a", "#f3d27a"]];
      for (i = 0; i < 3; i++) {
        var ax = 26 + i * 14;
        s += '<rect x="' + ax + '" y="190" width="1.2" height="26" fill="#9aa6b4"/><rect x="' + (ax + 1.2) + '" y="190" width="10" height="7" fill="' + fl[i][0] + '" stroke="#c9d3dc" stroke-width=".4"/><circle cx="' + (ax + 6.2) + '" cy="193.5" r="2" fill="' + fl[i][1] + '"/>';
      }
      out += xg("alliance", s);
    }
    return out;
  }

  /* ───── 派手さ（scale 0〜6）に応じた飾り ─────
   * 小さいほど手づくり感、大きいほど豪華に。class "mk-x-tierN" / "mk-x-cozy" は変化アニメーション用 */
  function tierDecor(cfg, b) {
    if (cfg.closed || cfg.empty) return "";
    var gy = 214, x0 = b.x0, W = b.W, H = b.H, t = cfg.scale || 0, out = "", i;
    if (t <= 1) {
      // こぢんまり：手書きの立て看板・植木鉢・ランタン
      out += xg("cozy", '<g><rect x="' + (x0 - 20) + '" y="196" width="16" height="12" rx="1.5" fill="#d9b58c" stroke="#a3785a" stroke-width=".8"/><rect x="' + (x0 - 13) + '" y="208" width="2" height="7" fill="#a3785a"/>' +
        '<text x="' + (x0 - 12) + '" y="204" font-size="4.4" font-weight="700" text-anchor="middle" fill="#6d4e36" font-family="Zen Maru Gothic, sans-serif">ようこそ</text>' +
        '<g><path d="M181 214 l2 -6 h6 l2 6 Z" fill="#c9805a"/><circle cx="186" cy="205" r="4" fill="#79b58e"/><path d="M211 214 l2 -6 h6 l2 6 Z" fill="#c9805a"/><circle cx="216" cy="205" r="4" fill="#8cc59a"/></g>' +
        '<rect x="' + (x0 + W - 12) + '" y="' + (gy - H * 0.55) + '" width="5" height="7" rx="2" fill="#ffd98a" stroke="#a3785a" stroke-width=".6"/></g>');
    }
    if (t >= 3) {
      // 屋根の旗
      out += xg("tier3", '<g><rect x="' + (x0 + 6) + '" y="' + (gy - H - 24) + '" width="1.4" height="22" fill="#9aa6b4"/><path d="M' + (x0 + 7.4) + " " + (gy - H - 24) + ' l12 3.5 l-12 3.5 Z" fill="#f2a79c"/><rect x="' + (x0 + W - 7) + '" y="' + (gy - H - 24) + '" width="1.4" height="22" fill="#9aa6b4"/><path d="M' + (x0 + W - 5.6) + " " + (gy - H - 24) + ' l12 3.5 l-12 3.5 Z" fill="#7cc0cf"/></g>');
    }
    if (t >= 4) {
      // 2階の展望ガラスと縦長の垂れ幕
      out += xg("tier4", '<g><rect x="' + (x0 + 10) + '" y="' + (gy - H + 4) + '" width="' + (W - 20) + '" height="7" rx="3.5" fill="#bfe3ee" stroke="#fff" stroke-width="1"/>' +
        '<rect x="' + (x0 + 3) + '" y="' + (gy - H + 14) + '" width="8" height="' + (H * 0.5) + '" fill="#f2a79c"/><rect x="' + (x0 + W - 11) + '" y="' + (gy - H + 14) + '" width="8" height="' + (H * 0.5) + '" fill="#7cc0cf"/>' +
        '<circle cx="' + (x0 + 7) + '" cy="' + (gy - H + 22) + '" r="2.4" fill="#fff"/><circle cx="' + (x0 + W - 7) + '" cy="' + (gy - H + 22) + '" r="2.4" fill="#fff"/></g>');
    }
    if (t >= 4) {
      out += xg("tier4b", '<g><ellipse cx="318" cy="58" rx="30" ry="11" fill="#f4f1ea" stroke="#c9d3dc" stroke-width="1"/><path d="M290 58 l-8 -7 v14 Z" fill="#7cc0cf"/><rect x="310" y="68" width="14" height="5" rx="2" fill="#7cc0cf"/>' +
        '<text x="318" y="61" font-size="7" font-weight="900" text-anchor="middle" fill="#2f4a6b" font-family="Zen Maru Gothic, sans-serif">MARINK</text></g>');
    }
    if (t >= 5) {
      // 両側の丸い塔とサーチライト
      var tw = 16, th = H + 30;
      out += xg("tier5", '<g><path d="M' + (x0 - 14) + " " + (gy - th + 26) + " L" + (x0 + 8) + " " + (gy - th - 140) + " L" + (x0 + 30) + " " + (gy - th + 26) + ' Z" fill="#fff6c9" opacity=".22"/><path d="M' + (x0 + W - 30) + " " + (gy - th + 26) + " L" + (x0 + W + 4) + " " + (gy - th - 140) + " L" + (x0 + W + 18) + " " + (gy - th + 26) + ' Z" fill="#fff6c9" opacity=".22"/>' +
        '<rect x="' + (x0 - 10) + '" y="' + (gy - th) + '" width="' + tw + '" height="' + th + '" rx="6" fill="#f3efe6"/><path d="M' + (x0 - 13) + " " + (gy - th) + " L" + (x0 - 2) + " " + (gy - th - 20) + " L" + (x0 + 9) + " " + (gy - th) + ' Z" fill="#4f8fb8"/>' +
        '<rect x="' + (x0 + W - 6) + '" y="' + (gy - th) + '" width="' + tw + '" height="' + th + '" rx="6" fill="#f3efe6"/><path d="M' + (x0 + W - 9) + " " + (gy - th) + " L" + (x0 + W + 2) + " " + (gy - th - 20) + " L" + (x0 + W + 13) + " " + (gy - th) + ' Z" fill="#4f8fb8"/>' +
        '<rect x="' + (x0 - 6) + '" y="' + (gy - th + 14) + '" width="8" height="10" rx="4" fill="#bfe3ee"/><rect x="' + (x0 + W - 2) + '" y="' + (gy - th + 14) + '" width="8" height="10" rx="4" fill="#bfe3ee"/></g>');
    }
    if (t >= 6) {
      // 屋根の上の大きなガラスドームと花火
      var dw = W * 0.42, dy = gy - H - 4;
      var dome = '<g><path d="M' + (200 - dw / 2) + " " + dy + " A" + dw / 2 + " " + dw * 0.42 + " 0 0 1 " + (200 + dw / 2) + " " + dy + ' Z" fill="#cfeef6" stroke="#fff" stroke-width="1.5" opacity=".92"/>';
      for (i = 1; i < 5; i++) dome += '<path d="M' + (200 - dw / 2 + (dw / 5) * i) + " " + dy + " Q200 " + (dy - dw * 0.5) + " " + (200 - dw / 2 + (dw / 5) * i) + " " + dy + '" stroke="#9fd3e2" stroke-width=".6" fill="none"/>';
      dome += '<path d="M' + (200 - dw * 0.36) + " " + (dy - dw * 0.18) + " Q200 " + (dy - dw * 0.3) + " " + (200 + dw * 0.36) + " " + (dy - dw * 0.18) + '" stroke="#9fd3e2" stroke-width=".6" fill="none"/></g>';
      var fw = "";
      [[60, 34, "#f2a79c"], [372, 92, "#f3d27a"], [286, 22, "#7cc0cf"]].forEach(function (p) {
        for (var k = 0; k < 10; k++) {
          var ang = (k / 10) * Math.PI * 2;
          fw += '<line x1="' + p[0] + '" y1="' + p[1] + '" x2="' + (p[0] + Math.cos(ang) * 11).toFixed(1) + '" y2="' + (p[1] + Math.sin(ang) * 11).toFixed(1) + '" stroke="' + p[2] + '" stroke-width="1.6" stroke-linecap="round"/>';
        }
      });
      out += xg("tier6", dome + '<g opacity=".85">' + fw + "</g>");
    }
    return out;
  }

  function nightLights(cfg, b) {
    if (!cfg.night || cfg.closed) return "";
    var out = "", y = 214 - b.H - 4;
    for (var i = 0; i <= 10; i++) out += '<circle cx="' + (b.x0 + (b.W / 10) * i).toFixed(1) + '" cy="' + (y + Math.sin(i / 10 * Math.PI) * 6).toFixed(1) + '" r="1.8" fill="#ffe7a3"/>';
    return out;
  }

  function plannedSite() {
    var out = '<g class="mk-site">';
    for (var i = 0; i < 9; i++) out += '<rect x="' + (128 + i * 18) + '" y="198" width="3" height="18" fill="#c9b18e"/>';
    out += '<rect x="126" y="202" width="150" height="3" fill="#d8c3a0"/><rect x="126" y="209" width="150" height="3" fill="#d8c3a0"/>';
    out += '<rect x="168" y="150" width="64" height="34" rx="4" fill="#fffaf0" stroke="#c9b18e" stroke-width="1.5"/><rect x="198" y="184" width="4" height="16" fill="#a98568"/>';
    out += '<text x="200" y="163" font-size="8" font-weight="700" text-anchor="middle" fill="#2f4a6b" font-family="Zen Maru Gothic, sans-serif">水族館</text><text x="200" y="176" font-size="8" font-weight="700" text-anchor="middle" fill="#c0645a" font-family="Zen Maru Gothic, sans-serif">建設予定地</text></g>';
    return out;
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
    if (cfg.gag) {
      out += '<g transform="translate(' + (b.x0 + b.W + 8) + " " + (gy - 30) + ')"><rect x="-1" y="10" width="2.5" height="20" fill="#a98568"/><rect x="-26" y="-6" width="54" height="20" rx="3" fill="#fff6d6" stroke="#e0b25a" stroke-width="1.2"/>' +
        '<text x="1" y="3" font-size="5.4" font-weight="700" text-anchor="middle" fill="#8a5a2a" font-family="sans-serif">ジンベエザメ</text><text x="1" y="10.5" font-size="5.4" font-weight="700" text-anchor="middle" fill="#d9605a" font-family="sans-serif">近日公開！</text></g>';
    }
    if (cfg.reservation && !cfg.closed) {
      out += '<g transform="translate(' + (b.x0 - 4) + " " + (gy - 22) + ')"><rect width="18" height="22" rx="2" fill="#fdf1e4"/><path d="M-2 0 h22 l-3 -6 h-16 Z" fill="#f2a79c"/><text x="9" y="13" font-size="5.5" text-anchor="middle" fill="#7a5a4a" font-family="sans-serif">予約</text></g>';
    }
    return out;
  }

  function people(cfg, R) {
    if (cfg.closed || cfg.damage >= 7) return "";
    var out = "", n = cfg.damage >= 6 ? Math.floor(cfg.crowd / 2) : cfg.crowd;
    var colors = ["#f2a79c", "#7cc0cf", "#f3d27a", "#9ccf9f", "#c7a6d9", "#f6b98a"];
    for (var i = 0; i < n; i++) {
      var side = i % 2 === 0 ? -1 : 1;
      var x = 200 + side * (22 + Math.floor(i / 2) * 13 + R() * 5);
      var y = 222 + R() * 6;
      var s = 0.9 + R() * 0.25;
      var kid = i % 4 === 3, hair = ["#4a3a30", "#6d4e36", "#2f2f3a", "#9a6a40"][i % 4], k = kid ? 0.72 : 1;
      out += '<g transform="translate(' + x.toFixed(1) + " " + y.toFixed(1) + ") scale(" + (s * k).toFixed(2) + ')"><ellipse cx="0" cy="3.6" rx="4" ry="1" fill="#000" opacity=".1"/>' +
        '<rect x="-2.2" y="0" width="1.8" height="3.4" rx=".8" fill="#5b6b7d"/><rect x=".4" y="0" width="1.8" height="3.4" rx=".8" fill="#5b6b7d"/>' +
        '<rect x="-3.2" y="-6.5" width="6.4" height="8" rx="3" fill="' + colors[i % colors.length] + '"/><rect x="-3.2" y="-1.5" width="6.4" height="1.6" fill="#fff" opacity=".35"/>' +
        '<circle cx="0" cy="-9.4" r="2.9" fill="#f3d9c4"/><path d="M-2.9 -9.6 A2.9 2.9 0 0 1 2.9 -9.6 Q0 -10.8 -2.9 -9.6 Z" fill="' + hair + '"/>' +
        (kid ? '<path d="M3 -5 q2 -6 1 -12" stroke="#9aa6b4" stroke-width=".5" fill="none"/><ellipse cx="4" cy="-19" rx="3.2" ry="3.8" fill="' + ["#f2a79c", "#7cc0cf", "#f3d27a"][i % 3] + '"/>' : "") + "</g>";
    }
    return out;
  }

  function staff(cfg) {
    if (cfg.closed || cfg.damage >= 7 || !cfg.staffStyle) return "";
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
    out += '<path d="M0 231 Q20 228 40 231 T80 231 T120 231 T160 231 T200 231 T240 231 T280 231 T320 231 T360 231 T400 231 L400 234 L0 234 Z" fill="#fff" opacity=".45"/>';
    for (var sp = 0; sp < 14; sp++) { var sx2 = (R() * 400).toFixed(0), sy2 = (240 + R() * 50).toFixed(0); out += '<path d="M' + sx2 + " " + sy2 + " l1.6 -1.6 l1.6 1.6 l-1.6 1.6 Z" + '" fill="#fff" opacity=".55"/>'; }
    out += '<g fill="#8b97a3"><ellipse cx="8" cy="236" rx="12" ry="6"/><ellipse cx="22" cy="238" rx="7" ry="4" fill="#a3aeb8"/><ellipse cx="392" cy="236" rx="11" ry="6"/></g>';
    out += '<path d="M0 232 Q25 227 50 232 T100 232 T150 232 T200 232 T250 232 T300 232 T350 232 T400 232" stroke="#ffffff" stroke-width="1.6" fill="none" opacity=".7"/>';
    out += '<path d="M0 252 Q30 248 60 252 T120 252 T180 252 T240 252 T300 252 T360 252 T420 252" stroke="#ffffff" stroke-width="1" fill="none" opacity=".35"/>';
    var colors = cfg.main === "deep" ? ["#f7c6e0", "#c9e9ff", "#e6d4ff"] : ["#f3b49f", "#f3d27a", "#ffffff"];
    for (var i = 0; i < 6; i++) {
      var x = 30 + i * 62 + R() * 20, y = 262 + R() * 26;
      out += '<g class="mk-swim" style="animation-delay:-' + (i * 1.7).toFixed(1) + 's">' +
        (cfg.main === "deep" && i % 2 ? jelly(x, y, 0.7, colors[i % 3]) : fish(x, y, 0.55 + R() * 0.3, colors[i % 3], i % 2 === 0)) + "</g>";
    }
    if (cfg.main === "big" && cfg.bigFish === "full" && !cfg.closed) out += '<g opacity=".55">' + whaleShark(300, 282, 0.55) + "</g>";
    // 海に浮かぶ船（場所によって変わる）
    if (cfg.location === "tourist") out += '<g class="mk-city" style="--d:1.2s"><path d="M300 240 h56 l-8 9 h-42 Z" fill="#fbfaf6"/><rect x="312" y="232" width="30" height="8" rx="2" fill="#f4f1ea"/><rect x="316" y="234" width="4" height="3" fill="#7cc0cf"/><rect x="323" y="234" width="4" height="3" fill="#7cc0cf"/><rect x="330" y="234" width="4" height="3" fill="#7cc0cf"/><rect x="336" y="226" width="5" height="7" fill="#e88f8f"/></g>' +
      '<g class="mk-city" style="--d:1.3s"><path d="M40 244 h24 l-4 6 h-17 Z" fill="#fff"/><path d="M52 243 V226 L64 242 Z" fill="#f6f1e8"/></g>';
    if (cfg.location === "nature") out += '<g class="mk-city" style="--d:1s"><path d="M310 244 h30 l-5 7 h-21 Z" fill="#c9805a"/><rect x="320" y="236" width="10" height="8" fill="#f3efe6"/><path d="M336 244 V228" stroke="#8a6a50" stroke-width="1"/><path d="M336 230 l10 6" stroke="#9aa6b4" stroke-width=".6"/></g>';
    return out;
  }

  function sky(cfg, P, R) {
    var out = '<rect width="400" height="300" fill="url(#skyGrad)"/>';
    var night = cfg.mood === "night";
    out += '<circle cx="' + (night ? 330 : 318) + '" cy="58" r="' + (night ? 30 : 44) + '" fill="' + P.sun + '" opacity=".25"/><circle cx="' + (night ? 330 : 318) + '" cy="58" r="' + (night ? 22 : 32) + '" fill="' + P.sun + '" opacity=".35"/>';
    out += '<circle cx="' + (night ? 330 : 318) + '" cy="58" r="' + (night ? 16 : 22) + '" fill="' + P.sun + '" opacity=".95"/>';
    if (night) for (var s = 0; s < 14; s++) out += '<circle cx="' + (R() * 400).toFixed(0) + '" cy="' + (R() * 110).toFixed(0) + '" r="' + (0.6 + R()).toFixed(1) + '" fill="#fffbe8" opacity=".8"/>';
    for (var c = 0; c < 3; c++) {
      var cx = 40 + c * 130 + R() * 30, cy = 40 + R() * 40;
      out += '<g opacity="' + (night ? 0.25 : 0.9) + '"><ellipse cx="' + (cx + 2) + '" cy="' + (cy + 3) + '" rx="27" ry="7" fill="#dbe8f0"/><ellipse cx="' + cx + '" cy="' + cy + '" rx="26" ry="9" fill="#ffffff"/><ellipse cx="' + (cx + 12) + '" cy="' + (cy - 6) + '" rx="14" ry="9" fill="#ffffff"/><ellipse cx="' + (cx - 10) + '" cy="' + (cy - 3) + '" rx="10" ry="7" fill="#ffffff"/><ellipse cx="' + (cx + 6) + '" cy="' + (cy - 9) + '" rx="6" ry="3" fill="#fff" opacity=".9"/></g>';
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

  /* ───── 崩壊・くたびれ表現（エンディングの重さに応じて重ねる） ─────
   * damage 0〜10（DAMAGE_NAMES 参照）。数値が大きいほど傷みが進む */
  function crack(x, y, len, R) {
    var d = "M" + x + " " + y, cx = x, cy = y;
    for (var i = 0; i < 4; i++) { cx += (R() - 0.5) * 8; cy += len / 4; d += " L" + cx.toFixed(1) + " " + cy.toFixed(1); }
    return '<path d="' + d + '" stroke="#4a4f5e" stroke-width="1" fill="none" opacity=".7"/>';
  }
  function weeds(x, n, R) {
    var out = "";
    for (var i = 0; i < n; i++) {
      var wx = x + i * 7 + R() * 4, h = 6 + R() * 7;
      out += '<path d="M' + wx + ' 216 q-2 -' + h + ' -5 -' + (h + 2) + ' M' + wx + ' 216 q1 -' + h + ' 4 -' + (h + 3) + ' M' + wx + ' 216 q0 -' + (h - 2) + ' 0 -' + h + '" stroke="#6f9a62" stroke-width="1.3" fill="none" stroke-linecap="round"/>';
    }
    return out;
  }
  function board(x, y, w, h) {
    return '<g><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#6d6670" opacity=".55"/>' +
      '<rect x="' + (x - 2) + '" y="' + (y + h * 0.25) + '" width="' + (w + 4) + '" height="4" fill="#a7835f" transform="rotate(-8 ' + (x + w / 2) + " " + (y + h * 0.25) + ')"/>' +
      '<rect x="' + (x - 2) + '" y="' + (y + h * 0.65) + '" width="' + (w + 4) + '" height="4" fill="#9b7854" transform="rotate(7 ' + (x + w / 2) + " " + (y + h * 0.65) + ')"/></g>';
  }
  function notice(x, y, w, text, bg, color) {
    return '<g><rect x="' + x + '" y="' + y + '" width="' + w + '" height="13" rx="2" fill="' + bg + '" stroke="#b8a48a" stroke-width=".6"/>' +
      '<text x="' + (x + w / 2) + '" y="' + (y + 9) + '" font-size="6" font-weight="700" text-anchor="middle" fill="' + color + '" font-family="sans-serif">' + text + "</text></g>";
  }
  var DAMAGE_NAMES = ["ぴかぴか", "ほんのり色あせ", "ところどころ汚れ", "くたびれ気味", "修理が追いつかない", "工事中", "一部休館", "休館中", "閉館", "荒れ果てた跡地", "廃墟"];
  function cone(x, y) {
    return '<g transform="translate(' + x + " " + y + ')"><path d="M-4 0 L0 -11 L4 0 Z" fill="#f08a3c"/><rect x="-2.6" y="-6.5" width="5.2" height="1.6" fill="#fff"/><rect x="-5" y="-1" width="10" height="1.6" fill="#d9772e"/></g>';
  }
  function damageLayer(cfg, b, R) {
    var lv = cfg.damage || 0;
    if (!lv) return "";
    var gy = 214, x0 = b.x0, W = b.W, H = b.H, out = "", i;
    var id = cfg.endingId;
    // 1〜：壁のしみ（段階が進むほど多く・濃く）
    var nst = Math.round(1 + lv * 1.6);
    for (i = 0; i < nst; i++) {
      out += '<ellipse cx="' + (x0 + 8 + R() * (W - 16)).toFixed(1) + '" cy="' + (gy - 6 - R() * H * 0.7).toFixed(1) + '" rx="' + (4 + R() * 7).toFixed(1) + '" ry="' + (2 + R() * 4).toFixed(1) + '" fill="#8a7f6a" opacity="' + Math.min(0.32, 0.06 + lv * 0.025).toFixed(2) + '"/>';
    }
    // 2〜：看板の色あせ
    if (lv >= 2 && b.sw) out += '<rect x="' + (200 - b.sw / 2) + '" y="' + (b.sy - 9) + '" width="' + b.sw + '" height="16" rx="8" fill="#9a958c" opacity="' + Math.min(0.4, 0.1 + lv * 0.03).toFixed(2) + '"/>';
    // 3〜：ペンキのはがれ、屋根からのサビ
    if (lv >= 3) {
      for (i = 0; i < Math.min(6, lv - 1); i++) {
        var px = x0 + 6 + R() * (W - 20), py = gy - 10 - R() * H * 0.6;
        out += '<path d="M' + px.toFixed(1) + " " + py.toFixed(1) + " l5 -2 l4 3 l-2 4 l-6 1 Z" + '" fill="#ded6c8" opacity=".9"/>';
      }
      for (i = 0; i < Math.min(5, lv - 2); i++) {
        var rx = x0 + 10 + R() * (W - 20);
        out += '<path d="M' + rx.toFixed(1) + " " + (gy - H + 8) + " v" + (8 + R() * 14).toFixed(1) + '" stroke="#a7744f" stroke-width="1.2" opacity=".45" stroke-linecap="round"/>';
      }
    }
    // 結末ごとの小物
    var hasNotice = false;
    if (id === "overexpanded" || id === "merrybad" || id === "open") {
      var cx = x0 + W + 30;
      out += '<g stroke="#e0a43a" stroke-width="2" fill="none"><path d="M' + cx + ' 216 V' + (gy - H - 50) + '"/><path d="M' + (cx - 46) + " " + (gy - H - 48) + " H" + (cx + 14) + '"/><path d="M' + cx + " " + (gy - H - 50) + " L" + (cx - 46) + " " + (gy - H - 48) + '" stroke-width="1"/></g>' +
        '<path d="M' + (cx - 40) + " " + (gy - H - 47) + " v22" + '" stroke="#555" stroke-width=".8"/><rect x="' + (cx - 45) + '" y="' + (gy - H - 25) + '" width="10" height="7" fill="#8a97ad"/>';
    }
    var NOTE = {
      staffcrisis: ["スタッフ募集中", "#c0645a"], chaos: ["スタッフ募集中", "#c0645a"], vetleave: ["飼育員募集中", "#c0645a"], burnout: ["休養中の職員あり", "#7a5a4a"],
      popstruggle: ["節約営業中", "#7a5a4a"], onehit: ["節約営業中", "#7a5a4a"], richempty: ["節約営業中", "#7a5a4a"],
      labonly: ["研究中", "#3a8ea1"], pricey: ["値下げ検討中", "#c0645a"], emptyres: ["当日枠あります", "#3a8ea1"], outsourced: ["業者点検中", "#7a5a4a"],
    };
    if (NOTE[id]) { out += notice(x0 + 6, gy - 30, 46, NOTE[id][0], "#fff8e6", NOTE[id][1]); hasNotice = true; }
    if (id === "reorg") { out += notice(200 - 30, gy - 40, 60, "運営会社が変わります", "#fff", "#7a5a4a"); hasNotice = true; }
    if (id === "merger") { out += notice(200 - 32, gy - 40, 64, "新しい名前になります", "#fff", "#7a5a4a"); hasNotice = true; }
    // 4〜：修理中の貼り紙、コーン、小さなひび
    if (lv >= 4) {
      if (!hasNotice) out += notice(x0 + W - 42, gy - 30, 36, "修理中", "#fff8e6", "#7a5a4a");
      out += cone(178, 222) + cone(222, 222);
      for (i = 0; i < 2; i++) out += crack(x0 + 12 + R() * (W - 24), gy - H * 0.7 + R() * 10, 10 + R() * 6, R);
    }
    // 5〜：ブルーシートと足場
    if (lv >= 5) {
      out += '<path d="M' + (x0 + W * 0.62) + " " + (gy - H - 2) + " L" + (x0 + W + 4) + " " + (gy - H + 4) + " L" + (x0 + W + 2) + " " + (gy - H + 24) + " L" + (x0 + W * 0.66) + " " + (gy - H + 18) + ' Z" fill="#5b8fd1" opacity=".85"/>';
      out += '<g stroke="#b9a07a" stroke-width="1.2">';
      for (i = 0; i < 4; i++) out += '<line x1="' + (x0 + W - 4) + '" y1="' + (gy - i * 16) + '" x2="' + (x0 + W + 18) + '" y2="' + (gy - i * 16) + '"/>';
      out += '<line x1="' + (x0 + W + 18) + '" y1="' + gy + '" x2="' + (x0 + W + 18) + '" y2="' + (gy - 52) + '"/></g>';
    }
    // 6〜：一部休館（ロープと貼り紙、窓が暗い）
    if (lv >= 6) {
      out += '<rect x="' + x0 + '" y="' + (gy - H) + '" width="' + (W * 0.45) + '" height="' + H + '" fill="#4a5068" opacity=".18"/>';
      out += '<path d="M' + (x0 - 18) + " " + (gy + 4) + " Q" + (x0 + 6) + " " + (gy + 10) + " " + (x0 + 30) + " " + (gy + 4) + '" stroke="#d24d4d" stroke-width="1.2" fill="none"/>' +
        '<rect x="' + (x0 - 19) + '" y="' + (gy - 6) + '" width="2" height="12" fill="#888"/><rect x="' + (x0 + 29) + '" y="' + (gy - 6) + '" width="2" height="12" fill="#888"/>';
      if (lv < 8) out += notice(x0 - 26, gy - 18, 42, "一部休館中", "#fff", "#c0645a");
    }
    // 7：休館中（入口にシャッター）
    if (lv === 7) {
      out += '<g><rect x="190" y="' + (gy - 22) + '" width="20" height="22" fill="#a5abb6"/>';
      for (i = 1; i < 7; i++) out += '<line x1="190" y1="' + (gy - 22 + i * 3.2) + '" x2="210" y2="' + (gy - 22 + i * 3.2) + '" stroke="#7f8694" stroke-width=".6"/>';
      out += "</g>" + notice(200 - 18, gy - 38, 36, "休館中", "#fffdf4", "#7a5a4a");
    }
    // 8〜：閉館（入口に板、雑草、貼り紙）
    if (lv >= 8) {
      out += board(191, gy - 26, 18, 26);
      out += weeds(x0 - 20, 3 + (lv - 8) * 2, R) + weeds(x0 + W - 6, 3 + (lv - 8) * 2, R);
      if (id !== "badtrue") out += '<g transform="rotate(-4 200 ' + (gy - H * 0.45) + ')"><rect x="168" y="' + (gy - H * 0.5) + '" width="64" height="12" fill="#fffdf4" stroke="#c9b9a0" stroke-width=".6"/><text x="200" y="' + (gy - H * 0.5 + 8.6) + '" font-size="6.5" font-weight="700" text-anchor="middle" fill="#7a5a4a" font-family="sans-serif">閉館しました</text></g>';
    }
    // 9〜：荒れ果てた跡地（割れた窓、ツタ、ごみ、カラス1羽）
    if (lv >= 9) {
      out += '<g stroke="#fff" stroke-width=".7" opacity=".8"><path d="M' + (x0 + W * 0.35) + " " + (gy - H * 0.55) + " l6 5 l-3 6 M" + (x0 + W * 0.35) + " " + (gy - H * 0.55) + ' l-5 6"/></g>';
      out += '<g stroke="#5f8a55" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M' + (x0 + 4) + " " + gy + " q6 -14 0 -26 q-6 -12 4 -22" + '"/><path d="M' + (x0 + W - 6) + " " + gy + " q-6 -16 2 -30" + '"/></g>';
      for (i = 0; i < 4; i++) out += '<rect x="' + (150 + R() * 100).toFixed(0) + '" y="' + (218 + R() * 6).toFixed(0) + '" width="4" height="2.5" fill="' + ["#c9c2b4", "#9fb3c2", "#d7b48a"][i % 3] + '" transform="rotate(' + (R() * 60 - 30).toFixed(0) + ')" transform-origin="center"/>';
      out += '<path d="M' + (x0 + W * 0.7) + " " + (gy - H - 4) + ' q4 -4 8 0 q4 -4 8 0" stroke="#2b2f3a" stroke-width="1.4" fill="none"/>';
    }
    // 10：廃墟（ひび、屋根の穴、立入禁止、カラスの群れ）
    if (lv >= 10) {
      for (i = 0; i < 5; i++) out += crack(x0 + 10 + R() * (W - 20), gy - H + 6 + R() * 12, 18 + R() * 20, R);
      out += '<path d="M' + (x0 + W * 0.2) + " " + (gy - H + 2) + " l10 -6 l8 7 l6 -4 l4 9 Z" + '" fill="#3c4050" opacity=".75"/>';
      out += '<g><rect x="' + (x0 - 24) + '" y="' + (gy - 14) + '" width="' + (W + 48) + '" height="4" fill="#f3cf3a"/>';
      for (i = 0; i < (W + 48) / 8; i++) out += '<rect x="' + (x0 - 24 + i * 8) + '" y="' + (gy - 14) + '" width="4" height="4" fill="#2b2b2b"/>';
      out += '<rect x="' + (x0 - 24) + '" y="' + (gy - 14) + '" width="' + (W + 48) + '" height="4" fill="none" stroke="#2b2b2b" stroke-width=".4"/></g>';
      out += notice(x0 - 22, gy - 30, 34, "立入禁止", "#f3cf3a", "#2b2b2b");
      for (i = 0; i < 3; i++) { var bx = 120 + R() * 160, by = 60 + R() * 40; out += '<path d="M' + bx.toFixed(0) + " " + by.toFixed(0) + ' q4 -4 8 0 q4 -4 8 0" stroke="#2b2f3a" stroke-width="1.4" fill="none"/>'; }
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
      '<linearGradient id="wallShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity=".35"/><stop offset=".45" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#2f4a6b" stop-opacity=".14"/></linearGradient>' +
      '<radialGradient id="glow"><stop offset="0" stop-color="#9fd8ff" stop-opacity=".7"/><stop offset="1" stop-color="#9fd8ff" stop-opacity="0"/></radialGradient>' +
      '<filter id="wc" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter>' +
      '<filter id="paper"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="8"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0 0.35  0 0 0 0.08 0"/></filter>' +
      "</defs>";
    // ID衝突を避けるため接頭辞をつける
    var body = '<g class="mk-sky">' + sky(cfg, P, R) + confetti(cfg, R) + "</g>" +
      '<g filter="url(#wc)"><g class="mk-bg">' + background(cfg, P, R) +
      '<path d="M0 212 C100 206 300 206 400 212 L400 232 L0 232 Z" fill="' + (cfg.location === "nature" ? "#efe3c8" : "#f1e6d0") + '"/></g>';
    if (cfg.empty) {
      body += plannedSite() + "</g>" + '<g class="mk-sea">' + sea(cfg, P, R) + "</g>";
    } else {
      var b = mainBuilding(cfg, P, opts);
      body += '<g class="mk-cluster"><g class="mk-annex">' + annexes(cfg, b) + "</g>" + '<g class="mk-bldg">' + b.svg + damageLayer(cfg, b, R) + nightLights(cfg, b) + "</g>" + '<g class="mk-extra">' + extras(cfg, b) + tierDecor(cfg, b) + "</g></g></g>" +
        '<g class="mk-staff">' + staff(cfg) + "</g>" + '<g class="mk-people">' + people(cfg, R) + "</g>" + '<g class="mk-sea">' + sea(cfg, P, R) + "</g>";
    }
    if (cfg.renewed && !cfg.closed) body += '<g fill="#fffbe0"><path d="M150 140 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z"/><path d="M262 128 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 Z"/></g>';
    if (cfg.closed || cfg.damage >= 8) body += '<rect width="400" height="300" fill="#2b3557" opacity="' + (0.16 + Math.max(0, cfg.damage - 8) * 0.07).toFixed(2) + '"/>';
    else if (cfg.damage >= 1) body += '<rect width="400" height="300" fill="#6b6f7d" opacity="' + (0.025 * cfg.damage).toFixed(3) + '"/>';
    body += '<rect width="400" height="300" filter="url(#paper)"/>';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="' + (opts.width || 400) + '" height="' + (opts.height || 300) + '" role="img" aria-label="' + esc(opts.label || "完成した水族館のイラスト") + '">' + defs + body + "</svg>";
    return svg.replace(/id="(skyGrad|seaGrad|glass|glow|wc|paper|wallShade)"/g, 'id="' + id + '-$1"').replace(/url\(#(skyGrad|seaGrad|glass|glow|wc|paper|wallShade)\)/g, "url(#" + id + "-$1)");
  }

  function widthOf(cfg) {
    var gr = typeof cfg.grand === "number" ? cfg.grand : [ -1.5, -0.5, 0.8, 2.2, 3.6, 5.2, 7 ][cfg.scale || 0];
    return Math.round(Math.max(72, Math.min(292, 100 + gr * 24)));
  }
  M.visual = { render: render, widthOf: widthOf, DAMAGE_NAMES: DAMAGE_NAMES };
})(typeof window !== "undefined" ? window : globalThis);

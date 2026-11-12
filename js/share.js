/*
 * 結果画像（1080×1350 PNG）の生成と共有
 * Canvas に直接描くので、スクリーンショットに頼りません。
 * 素材はすべてこのサイト内で生成したSVGなので、画像が汚染（tainted）されません。
 */
(function (g) {
  var M = (g.MARINK = g.MARINK || {});
  var W = 1080, H = 1350;
  var FONT = '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Hiragino Sans", "Meiryo", sans-serif';

  function loadSvg(svg) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* 日本語は1文字ずつ折り返す（句読点が行頭に来ないよう軽く調整） */
  function wrap(ctx, text, maxW, maxLines) {
    var lines = [], line = "";
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ctx.measureText(line + ch).width > maxW && line) {
        if ("、。」！？）".indexOf(ch) >= 0) { line += ch; continue; }
        lines.push(line);
        line = ch;
      } else line += ch;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + "…";
    }
    return lines;
  }

  function makeImage(result, story) {
    var ready = document.fonts && document.fonts.load
      ? Promise.all([document.fonts.load("900 40px 'Zen Maru Gothic'"), document.fonts.load("700 30px 'Zen Maru Gothic'")]).catch(function () {})
      : Promise.resolve();
    var svg = M.visual.render(result.aquarium, { signText: story.aquariumName, seed: result.resultNumber + 1, id: "ex", width: 960, height: 720 });
    return ready.then(function () { return loadSvg(svg); }).then(function (art) {
      var c = document.createElement("canvas");
      c.width = W; c.height = H;
      var ctx = c.getContext("2d");

      var bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#e9f7f9"); bg.addColorStop(0.55, "#d3edf3"); bg.addColorStop(1, "#fdf6ec");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      // やわらかい光
      var glow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 700);
      glow.addColorStop(0, "rgba(255,255,255,.9)"); glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, 700);

      ctx.textAlign = "center";
      ctx.fillStyle = "#3a8ea1";
      ctx.font = "700 30px " + FONT;
      ctx.fillText("M A R I N K   A Q U A R I U M", W / 2, 78);
      ctx.fillStyle = "#2f4a6b";
      ctx.font = "900 34px " + FONT;
      ctx.fillText("運命の館長", W / 2, 124);

      // イラスト
      ctx.save();
      ctx.shadowColor = "rgba(47,74,107,.18)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
      roundRect(ctx, 52, 152, 976, 736, 44); ctx.fillStyle = "#fff"; ctx.fill();
      ctx.restore();
      ctx.save();
      roundRect(ctx, 60, 160, 960, 720, 38); ctx.clip();
      ctx.drawImage(art, 60, 160, 960, 720);
      ctx.restore();

      // エンディング帯
      ctx.font = "900 26px " + FONT;
      var ov = M.story.overall(result);
      var cat = story.endingCategory + "　｜　総合評価 " + ov.rank + "（" + ov.score + "点）";
      var cw = ctx.measureText(cat).width + 60;
      roundRect(ctx, (W - cw) / 2, 852, cw, 52, 26);
      ctx.fillStyle = { dusk: "#8a86ad", night: "#8a86ad", warm: "#f08f84" }[result.ending.mood] || "#4fa6b8";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(cat, W / 2, 888);

      ctx.fillStyle = "#5b7290";
      ctx.font = "700 32px " + FONT;
      ctx.fillText(story.aquariumName, W / 2, 962);
      ctx.fillStyle = "#2f4a6b";
      ctx.font = "900 52px " + FONT;
      wrap(ctx, "『" + story.endingTitle + "』", 960, 2).forEach(function (l, i) { ctx.fillText(l, W / 2, 1030 + i * 62); });

      var yOff = ctx.measureText("『" + story.endingTitle + "』").width > 960 ? 62 : 0;
      ctx.font = "500 28px " + FONT;
      ctx.fillStyle = "#4b6384";
      wrap(ctx, story.shortSummary, 900, 2).forEach(function (l, i) { ctx.fillText(l, W / 2, 1086 + yOff + i * 42); });

      // ステータス要約
      var keys = M.engine.STAT_KEYS, labels = M.DATA.statLabels, fs = result.finalStats;
      var top = 1176 + yOff * 0.5;
      ctx.textAlign = "left";
      keys.forEach(function (k, i) {
        var col = i % 3, row = Math.floor(i / 3);
        var x = 90 + col * 310, y = top + row * 44;
        ctx.font = "700 20px " + FONT; ctx.fillStyle = "#2f4a6b";
        ctx.fillText(k === "fund" ? "資金 " + M.story.money(fs.fund) : labels[k], x, y);
        var v = k === "fund" ? Math.max(0, Math.min(100, (fs.fund + 30) / 1.6)) : fs[k];
        roundRect(ctx, x + 150, y - 15, 125, 14, 7); ctx.fillStyle = "#e3ebef"; ctx.fill();
        roundRect(ctx, x + 150, y - 15, Math.max(14, 125 * v / 100), 14, 7);
        ctx.fillStyle = k === "fund" && fs.fund < 0 ? "#d9786e" : "#4fa6b8"; ctx.fill();
      });

      ctx.textAlign = "center";
      ctx.fillStyle = "#f08f84";
      ctx.font = "900 30px " + FONT;
      ctx.fillText("あなたはどんな水族館をつくる？", W / 2, 1290 + yOff * 0.3 > 1300 ? 1300 : 1290);
      ctx.fillStyle = "#5b7290";
      ctx.font = "700 20px " + FONT;
      ctx.fillText("MARINK ｜ 海の生き物を、もっと面白く。", W / 2, 1328);

      return new Promise(function (resolve, reject) {
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error("toBlob failed")); }, "image/png");
      });
    });
  }

  function shareUrl(history, name) {
    var base = location.href.split("?")[0].split("#")[0];
    return base + "?r=" + history.join("") + (name ? "&n=" + encodeURIComponent(name) : "");
  }

  function shareText(story) {
    return "MARINK AQUARIUM で「" + story.aquariumName + "」をつくったら、『" + story.endingTitle + "』になりました！ あなたはどんな水族館をつくる？ #MARINK水族館";
  }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? resolve() : reject(); } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  M.share = { makeImage: makeImage, shareUrl: shareUrl, shareText: shareText, copy: copy };
})(window);

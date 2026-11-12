/*
 * MARINK AQUARIUM ― 画面の表示と操作
 * 計算は engine.js、物語は story.js / ai.js、絵は visual.js、画像は share.js が担当します。
 */
(function () {
  "use strict";
  var M = window.MARINK;
  var E = M.engine, D = M.DATA, S = M.sound;
  var $ = function (id) { return document.getElementById(id); };
  var app = $("app");
  var history = [];
  var busy = false;
  var current = null; // { result, story }
  var STORE = "marink-history-" + D.version;

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  var aqName = "";
  var NAME_STORE = "marink-name";
  function save() {
    try { sessionStorage.setItem(STORE, history.join("")); sessionStorage.setItem(NAME_STORE, aqName); } catch (e) {}
  }
  function loadName() { try { return M.story.cleanName(sessionStorage.getItem(NAME_STORE) || ""); } catch (e) { return ""; } }
  function load() { try { return E.parseHistory(sessionStorage.getItem(STORE) || "") || []; } catch (e) { return []; } }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function show(html, cls) {
    app.innerHTML = '<div class="screen ' + (cls || "") + '">' + html + "</div>";
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    return app.firstChild;
  }

  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, 2400);
  }

  function deltaChips(delta) {
    var items = [];
    E.STAT_KEYS.forEach(function (k) {
      if (!delta[k]) return;
      var up = delta[k] > 0;
      items.push('<li class="delta ' + (up ? "up" : "down") + '">' + D.statLabels[k] + (up ? " ↑" : " ↓") + M.story.fmtVal(k, Math.abs(delta[k])) + "</li>");
    });
    if (delta.debt) items.push('<li class="delta debt">借入金 ' + M.story.money(delta.debt, true) + "</li>");
    return items.length ? '<ul class="deltas">' + items.join("") + "</ul>" : "";
  }

  /* ───── 背景の魚と泡 ───── */
  function decorate() {
    var fishBox = $("bgFish"), bub = $("bgBubbles");
    var colors = ["#f3b49f", "#7cc0cf", "#f3d27a", "#ffffff", "#9ccf9f"];
    for (var i = 0; i < 6; i++) {
      var s = document.createElement("div");
      s.className = "bgfish" + (i % 2 ? " rev" : "");
      var size = 22 + (i * 7) % 26;
      s.style.top = 12 + i * 14 + "%";
      s.style.animationDuration = 22 + i * 6 + "s";
      s.style.animationDelay = -i * 5 + "s";
      s.innerHTML = '<svg width="' + size * 1.6 + '" height="' + size + '" viewBox="-12 -8 30 16"><path d="M-10 0 C-5 -7 7 -7 10 0 C7 7 -5 7 -10 0 Z" fill="' + colors[i % 5] + '"/><path d="M9 0 L16 -6 L15 0 L16 6 Z" fill="' + colors[i % 5] + '"/><circle cx="-5" cy="-1.5" r="1.3" fill="#2f4a6b"/></svg>';
      fishBox.appendChild(s);
    }
    for (var j = 0; j < 10; j++) {
      var b = document.createElement("span");
      var sz = 6 + (j * 5) % 12;
      b.style.left = (j * 11 + 4) % 100 + "%";
      b.style.width = b.style.height = sz + "px";
      b.style.animationDuration = 9 + (j % 5) * 3 + "s";
      b.style.animationDelay = -j * 1.9 + "s";
      bub.appendChild(b);
    }
  }

  /* ───── プレイ中のパラメーター表示 ───── */
  var HUD_LABEL = { fund: "資金", pop: "集客", welfare: "飼育", staff: "スタッフ", research: "研究", trust: "信頼" };
  var hudShown = null;
  function hud(stats, animate) {
    var prev = hudShown;
    hudShown = Object.assign({}, stats);
    $("hud").innerHTML = E.STAT_KEYS.map(function (k) {
      var v = stats[k];
      var pct = k === "fund" ? Math.max(0, Math.min(100, (v / 150) * 100)) : v;
      var low = k === "fund" ? v < 20 : v < 40;
      var d = animate && prev ? v - prev[k] : 0;
      var pop = d ? '<span class="hud__pop ' + (d > 0 ? "up" : "down") + '">' + (d > 0 ? "+" : "") + d + (k === "fund" ? "億" : "") + "</span>" : "";
      var debt = k === "fund" && stats.debt > 0 ? '<span class="hud__debt-badge">借入' + stats.debt + "億</span>" : "";
      return '<li class="hud__item' + (d ? (d > 0 ? " flash-up" : " flash-down") : "") + '" title="' + D.statLabels[k] + '">' +
        '<span class="hud__label">' + HUD_LABEL[k] + '</span><span class="hud__val' + (v < 0 ? " neg" : "") + '">' + v + (k === "fund" ? '<small>億</small>' : "") + "</span>" +
        '<span class="hud__bar"><i class="' + (low ? "low" : "") + '" style="width:' + pct + '%"></i></span>' + pop + debt + "</li>";
    }).join("");
    if (animate) setTimeout(function () {
      $("hud").querySelectorAll(".flash-up, .flash-down").forEach(function (el) { el.classList.remove("flash-up", "flash-down"); });
    }, 700);
  }

  /* ───── トップバー ───── */
  function topbar(visible, round) {
    var tb = $("topbar");
    tb.hidden = !visible;
    if (!visible) return;
    $("progressLabel").textContent = "第" + round + "問 / 全10問";
    $("progressFill").style.width = ((round - 1) / 10) * 100 + "%";
    $("backBtn").disabled = history.length === 0;
  }

  /* ───── エンディング図鑑（この端末のブラウザにだけ保存） ───── */
  var ZUKAN = "marink-zukan-v1";
  function loadZukan() {
    try { return JSON.parse(localStorage.getItem(ZUKAN)) || { found: {}, best: null }; } catch (e) { return { found: {}, best: null }; }
  }
  function saveZukan(result) {
    var z = loadZukan();
    var isNew = !z.found[result.endingId];
    z.found[result.endingId] = true;
    var o = M.story.overall(result);
    if (!z.best || o.score > z.best.score) z.best = { score: o.score, rank: o.rank };
    try { localStorage.setItem(ZUKAN, JSON.stringify(z)); } catch (e) {}
    return { isNew: isNew, count: Object.keys(z.found).length };
  }

  function guideHtml() {
    var z = loadZukan();
    var ids = Object.keys(D.endings);
    var count = ids.filter(function (k) { return z.found[k]; }).length;
    var grid = ids.map(function (k) {
      return z.found[k] ? '<li class="found">' + esc(D.endings[k].name.replace("エンド", "")) + "</li>" : "<li>？？？</li>";
    }).join("");
    return '<div class="guide">' +
      '<section class="card goal"><span class="goal__tag">ゲームの目的</span>' +
        "<h2>10回の決断で、<br>水族館の10年後を決めよう</h2>" +
        "<p>限られた資金100億円で、立地・展示・スタッフ・入館料…を決めていく館長ゲーム。人気、生き物の暮らし、研究、信頼をすべて両立させて「伝説の水族館」を目指そう。でも、思いがけない未来が待っていることも…？</p></section>" +
      '<ul class="hooks" style="margin-top:12px"><li><b>13種類</b>のエンディング</li><li><b>59,049</b>通りの未来</li><li><b>S〜D</b>の総合評価</li></ul>' +
      '<section class="card" style="margin-top:12px"><h2 class="section-title">遊び方</h2><ol class="steps">' +
        "<li><span><b>3つの選択肢から1つを選ぶ</b>正解はありません。どれにもメリットとデメリットがあります。</span></li>" +
        "<li><span><b>資金や人気などが変化</b>資金（億円）・集客力など6つのパラメーターが動きます。前の選択が、あとで効いてくることも。※金額はゲーム用の目安です。</span></li>" +
        "<li><span><b>10年後の結末を発表</b>あなただけの水族館のイラスト、10年間の物語、総合評価、「もしもの未来」がわかります。</span></li>" +
      "</ol></section>" +
      '<section class="card"><h2 class="section-title">こんな未来が待っているかも…</h2><p class="teaser">' +
        "<span>観光地の海辺に、ジンベエザメが泳ぐ大水族館が誕生！</span>" +
        "<span>小さなハゼの館が、町いちばんの人気者に。</span>" +
        "<span>大人気なのに、金庫はからっぽ…まさかの閉館!?</span></p></section>" +
      '<section class="card zukan"><div class="zukan__head"><h2 class="section-title" style="margin:0">エンディング図鑑</h2><span class="zukan__count">' + count + " / " + ids.length + "</span></div>" +
        '<ul class="zukan__grid">' + grid + "</ul>" +
        (z.best ? '<p class="zukan__best">これまでの最高評価：' + z.best.rank + "（" + z.best.score + "点）</p>" : '<p class="small-note">遊ぶと、たどり着いたエンディングがここに登録されます。全部見つけられるかな？</p>') +
      "</section></div>";
  }

  /* ───── タイトル画面 ───── */
  function renderTitle() {
    topbar(false);
    var saved = load();
    var demo = { location: "tourist", main: "big", bigFish: "full", tanks: "big", staffStyle: "veteran", price: "mid", scale: 2, newWing: false, lab: false, conservation: false, alliance: false, mega: false, reservation: false, renewed: false, care: false, closed: false, reorg: false, crowd: 7, mood: "bright" };
    var resume = saved.length > 0 && saved.length < 10
      ? '<button class="btn btn--ghost btn--small" id="resumeBtn" type="button" style="margin-top:10px">続きから遊ぶ（第' + (saved.length + 1) + "問）</button>"
      : "";
    show(
      '<section class="title-screen">' +
        '<div class="brand-mini">MARINK</div>' +
        '<h1 class="title-logo"><span class="title-logo__en">MARINK AQUARIUM</span><span class="title-logo__ja">運命の館長</span></h1>' +
        '<p class="catch">「自分だけの水族館を制作しよう！」</p>' +
        '<p class="subcatch">あなたの10の決断が、水族館の未来を変える。</p>' +
        '<div class="hero">' + M.visual.render(demo, { signText: "MARINK AQUARIUM", seed: 3, id: "hero" }) + "</div>" +
        '<div class="intro">' +
          "<p>あなたは今日、新しい水族館の<span class=\"em\">館長</span>に任命されました。</p>" +
          "<p>これから10回、重大な決断をしていただきます。</p>" +
          "<p>あなたの選択によって、水族館の未来は大きく変わります。</p>" +
          "<p>大成功するのか、それとも……？</p>" +
          "<p>さあ、あなたの水族館の物語を始めましょう。</p>" +
        "</div>" +
        '<ul class="chips"><li class="chip">約3〜5分</li><li class="chip">全10問・3択</li><li class="chip">無料・ログイン不要</li></ul>' +
        '<button class="btn btn--primary" id="startBtn" type="button">水族館をつくる！</button>' +
        resume +
        guideHtml() +
        '<button class="btn btn--primary" id="startBtn2" type="button" style="margin-top:18px">さっそく水族館をつくる！</button>' +
        '<p class="brand-foot"><b>MARINK</b><br>海の生き物を、もっと面白く。</p>' +
      "</section>"
    );
    function start() {
      S.play("bubble");
      renderNameScreen(loadName());
    }
    $("startBtn").addEventListener("click", start);
    $("startBtn2").addEventListener("click", start);
    if ($("resumeBtn")) $("resumeBtn").addEventListener("click", function () {
      S.play("bubble");
      history = saved;
      aqName = loadName();
      hudShown = null;
      goRound();
    });
  }

  /* ───── 水族館の名前を決める画面 ───── */
  var NAME_IDEAS = ["まりんく水族館", "うみかぜ水族館", "さんごの森アクアリウム", "ほしぞら水族館", "なみおと館", "あおいうみ水族館", "ぷかぷか水族館", "しおさい水族館", "ゆめのうみ水族館", "きらめき海の館"];
  function renderNameScreen(prefill) {
    topbar(false);
    var ideas = NAME_IDEAS.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 4);
    show(
      '<section class="name-screen">' +
        '<p class="q-round" style="display:inline-block">はじめに</p>' +
        '<h2 class="q-title">あなたの水族館に<br>名前をつけよう</h2>' +
        '<p class="q-desc">この名前が、看板や10年間の物語、結果画面に登場します。</p>' +
        '<div class="card name-card">' +
          '<label class="name-label" for="nameInput">水族館の名前（' + M.story.NAME_MAX + '文字まで）</label>' +
          '<input id="nameInput" class="name-input" type="text" maxlength="' + M.story.NAME_MAX + '" autocomplete="off" enterkeyhint="done" placeholder="例：まりんく水族館" value="' + esc(prefill || "") + '">' +
          '<div class="name-preview" aria-live="polite"><span class="name-preview__label">看板</span><span class="name-preview__sign" id="namePreview"></span></div>' +
          '<p class="small-note" style="margin:8px 0 0">「〇〇水族館」「〇〇館」で終わらない名前には、自動で「水族館」がつきます。</p>' +
          '<p class="name-ideas__title">迷ったら、ここから選んでもOK</p>' +
          '<div class="name-ideas">' + ideas.map(function (n) { return '<button type="button" class="name-idea">' + esc(n) + "</button>"; }).join("") + "</div>" +
        "</div>" +
        '<button class="btn btn--primary" id="nameOk" type="button" style="margin-top:18px">この名前で開館準備スタート！</button>' +
        '<button class="link-btn" id="nameAuto" type="button" style="display:block;margin:8px auto 0">名前はおまかせにする（選択に合わせて自動で決まります）</button>' +
        '<button class="link-btn" id="nameBack" type="button" style="display:block;margin:0 auto">タイトルに戻る</button>' +
      "</section>"
    );
    var input = $("nameInput");
    function update() {
      var n = M.story.cleanName(input.value);
      $("namePreview").textContent = n || "（おまかせ）";
      $("nameOk").disabled = !n;
      $("nameOk").style.opacity = n ? "" : ".5";
    }
    input.addEventListener("input", update);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); input.blur(); } });
    app.querySelectorAll(".name-idea").forEach(function (b) {
      b.addEventListener("click", function () { S.play("tap"); input.value = b.textContent; update(); });
    });
    function begin(name) {
      S.play("bubble");
      aqName = name;
      history = [];
      hudShown = null;
      save();
      goRound();
    }
    $("nameOk").addEventListener("click", function () { var n = M.story.cleanName(input.value); if (n) begin(n); });
    $("nameAuto").addEventListener("click", function () { begin(""); });
    $("nameBack").addEventListener("click", function () { S.play("tap"); renderTitle(); });
    update();
  }

  /* ───── ラウンド進行 ───── */
  function goRound() {
    busy = false;
    if (history.length >= 10) return finish();
    var sim = E.simulate(history);
    var next = sim.next;
    topbar(true, next.round);
    hud(sim.stats, true);
    if (next.events.length) renderEvents(next);
    else renderQuestion(next.question);
  }

  function renderEvents(next) {
    var crisis = next.events.some(function (e) { return e.mood === "crisis"; });
    var bad = next.events.some(function (e) { return e.mood === "bad"; });
    var cards = next.events.map(function (e) {
      var tag = { good: "うれしいニュース", bad: "ちょっと困った", crisis: "緊急事態", info: "お知らせ" }[e.mood];
      return '<article class="card event-card mood-' + e.mood + '"><span class="event-card__tag">' + tag + "</span><h3>" + esc(e.title) + "</h3><p>" + esc(e.text) + "</p>" + deltaChips(e.delta) + "</article>";
    }).join("");
    show(
      '<div class="q-head"><span class="q-round">第' + next.round + "問の前に…</span></div>" + cards +
      '<button class="btn btn--sea" id="toQuestion" type="button" style="margin-top:18px">第' + next.round + "問へ進む</button>",
      crisis ? "mood-crisis-screen" : ""
    );
    S.play(crisis ? "crisis" : bad ? "bad" : "good");
    $("toQuestion").addEventListener("click", function () { S.play("tap"); renderQuestion(next.question); });
  }

  /* 選択肢のお金の動き（目安） */
  function moneyTag(o) {
    if (o.debtMultiplier !== undefined) return '<span class="option__money in">収入 ' + M.story.money(o.fund) + "・借入金が半分に</span>";
    if (o.debt > 0) return '<span class="option__money loan">借入 ' + M.story.money(o.debt) + "（あとで利子つき返済）</span>";
    if (o.fund < 0) return '<span class="option__money out">費用 約' + M.story.money(-o.fund) + "</span>";
    if (o.fund > 0) return '<span class="option__money in">収入 約' + M.story.money(o.fund) + "</span>";
    return "";
  }

  function renderQuestion(q) {
    var opts = q.options.map(function (o) {
      return '<button class="option" type="button" data-id="' + o.id + '">' +
        '<span class="option__badge" aria-hidden="true">' + o.id + "</span>" +
        "<span><span class=\"option__label\">" + esc(o.label) + "</span>" +
        '<span class="option__pc"><span class="p">＋ ' + esc(o.pros) + '</span><br><span class="c">－ ' + esc(o.cons) + "</span></span>" + moneyTag(o) + "</span>" +
        "</button>";
    }).join("");
    show(
      '<div class="q-head">' + (aqName ? '<p class="q-owner">' + esc(aqName) + " 館長の決断</p>" : "") + '<span class="q-round">QUESTION ' + q.round + "</span>" +
      '<h2 class="q-title">' + esc(q.title) + "</h2>" +
      '<p class="q-desc">' + esc(q.description) + "</p></div>" +
      '<p class="q-ask">あなたならどうする？</p>' +
      '<div class="options" id="options">' + opts + "</div>"
    );
    $("options").addEventListener("click", function (ev) {
      var btn = ev.target.closest(".option");
      if (!btn || busy) return;
      pick(btn, ev);
    });
  }

  function ripple(x, y) {
    var r = document.createElement("div");
    r.className = "ripple";
    r.style.left = x - 10 + "px";
    r.style.top = y - 10 + "px";
    document.body.appendChild(r);
    setTimeout(function () { r.remove(); }, 750);
  }

  function pick(btn, ev) {
    busy = true;
    var id = btn.getAttribute("data-id");
    btn.classList.add("is-picked");
    $("options").classList.add("is-locked");
    var rect = btn.getBoundingClientRect();
    ripple(ev.clientX || rect.left + rect.width / 2, ev.clientY || rect.top + rect.height / 2);
    S.play("bubble");
    setTimeout(function () {
      history.push(id);
      save();
      var sim = E.simulate(history);
      var step = sim.steps[sim.steps.length - 1];
      $("progressFill").style.width = (history.length / 10) * 100 + "%";
      hud(step.statsAfter, true);
      openSheet(step);
    }, 380);
  }

  function openSheet(step) {
    var last = step.round === 10;
    var notes = step.notes.map(function (n) { return '<p class="note">' + esc(n) + "</p>"; }).join("");
    var tip = step.tip ? '<p class="tip"><b>海のまめ知識</b>' + esc(step.tip) + "</p>" : "";
    var sheet = $("sheet");
    sheet.innerHTML =
      '<div class="sheet__choice">第' + step.round + "問　あなたの決断 " + step.choice + "</div>" +
      '<h2 id="sheetTitle">' + esc(step.label) + "</h2>" +
      '<p class="sheet__text">' + esc(step.feedback) + "</p>" + notes + deltaChips(step.delta) + tip +
      '<button class="btn ' + (last ? "btn--primary" : "btn--sea") + '" id="sheetNext" type="button">' + (last ? "10年後の水族館を見る" : "次の問題へ") + "</button>";
    $("sheetBackdrop").hidden = false;
    sheet.hidden = false;
    sheet.scrollTop = 0;
    var ups = E.STAT_KEYS.reduce(function (a, k) { return a + (step.delta[k] || 0); }, 0);
    setTimeout(function () { S.play(ups >= 0 ? "good" : "soft"); }, 120);
    $("sheetNext").focus({ preventScroll: true });
    $("sheetNext").addEventListener("click", function () {
      S.play("tap");
      closeSheet();
      goRound();
    });
  }

  function closeSheet() {
    $("sheet").hidden = true;
    $("sheetBackdrop").hidden = true;
  }

  /* ───── 結果発表 ───── */
  function finish() {
    topbar(false);
    var result = E.simulate(history);
    var template = M.story.buildStory(result, { name: aqName });
    var curtain = $("curtain"), text = $("curtainText");
    curtain.hidden = false;
    var lines = ["あなたの水族館の10年間を振り返っています……", "10年間の経営結果をまとめています……"];
    var aiP = M.ai.requestStory(result, template, aqName);
    var seq = Promise.resolve();
    lines.forEach(function (l) {
      seq = seq.then(function () {
        text.textContent = l;
        text.style.animation = "none"; void text.offsetWidth; text.style.animation = "";
        return wait(1300);
      });
    });
    seq
      .then(function () {
        var slow = setTimeout(function () { text.textContent = "AIがあなただけの物語を書いています……"; }, 400);
        return aiP.then(function (r) { clearTimeout(slow); return r; });
      })
      .then(function (ai) {
        text.textContent = "あなたの水族館が完成しました！";
        S.play(["closure", "reorg", "staffcrisis", "overexpanded"].indexOf(result.endingId) >= 0 ? "soft" : "fanfare");
        return wait(1100).then(function () { return ai; });
      })
      .then(function (ai) {
        curtain.hidden = true;
        var story = ai.story || template;
        story.failReason = ai.story ? null : ai.reason;
        renderResult(result, story, false);
      });
  }

  function radar(fs) {
    var keys = E.STAT_KEYS, cx = 150, cy = 140, R = 100;
    var pt = function (i, v) {
      var a = -Math.PI / 2 + (i / keys.length) * Math.PI * 2;
      return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v];
    };
    var grid = "";
    [0.25, 0.5, 0.75, 1].forEach(function (s) {
      grid += '<polygon points="' + keys.map(function (k, i) { return pt(i, s).join(","); }).join(" ") + '" fill="none" stroke="#dfe7ea" stroke-width="1"/>';
    });
    var axes = keys.map(function (k, i) { var p = pt(i, 1); return '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke="#e6ecef"/>'; }).join("");
    var vals = keys.map(function (k) { return k === "fund" ? Math.max(0, Math.min(100, (fs.fund + 30) / 1.6)) : fs[k]; });
    var poly = vals.map(function (v, i) { return pt(i, Math.max(0.04, v / 100)).join(","); }).join(" ");
    var labels = keys.map(function (k, i) {
      var p = pt(i, 1.22);
      return '<text x="' + p[0] + '" y="' + (p[1] + 4) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#2f4a6b">' + D.statLabels[k] + "</text>";
    }).join("");
    return '<svg class="radar" viewBox="0 0 300 285" role="img" aria-label="経営結果のレーダーチャート">' + grid + axes +
      '<polygon points="' + poly + '" fill="rgba(124,192,207,.45)" stroke="#4fa6b8" stroke-width="2.5" stroke-linejoin="round"/>' + labels + "</svg>";
  }

  /* パラメーターごとの評価カード（S〜D・スタートとの比較・ひとこと） */
  function statCards(result) {
    return '<ul class="stat-cards">' + M.story.report(result).map(function (s) {
      var pct = s.key === "fund" ? Math.max(3, Math.min(100, (s.value + 50) / 2)) : Math.max(3, s.value);
      return '<li class="stat-card g-' + s.grade + '">' +
        '<span class="stat-card__grade" aria-label="評価' + s.grade + '">' + s.grade + "</span>" +
        '<div class="stat-card__body"><div class="stat-card__head"><b>' + s.label + "</b>" +
        '<span class="stat-card__val' + (s.value < 0 ? " neg" : "") + '">' + esc(s.valueText) + (s.key === "fund" ? "<small>" + s.extra + "</small>" : "") + "</span></div>" +
        '<span class="bar__track"><span class="bar__fill' + (s.gradeIndex <= 1 ? " neg" : "") + '" data-w="' + pct + '"></span></span>' +
        '<div class="stat-card__meta"><span>スタート ' + esc(s.startText) + " → " + esc(s.valueText) + '（<span class="' + (s.diff >= 0 ? "pos" : "neg") + '">' + esc(s.diffText) + "</span>）</span>" +
        (s.key === "pop" ? '<span class="stat-card__extra">' + esc(s.extra) + "</span>" : "") + "</div>" +
        '<p class="stat-card__comment">' + esc(s.comment) + "</p></div></li>";
    }).join("") + "</ul>";
  }

  /* 物語を1文ずつに分けて読みやすくする（金額・人数は太字） */
  function sentences(text) {
    var list = String(text).match(/[^。！？]+[。！？]+」?/g) || [text];
    var rest = String(text).replace(/[^。！？]+[。！？]+」?/g, "").trim();
    if (rest) list.push(rest);
    return '<div class="chapter__lines">' + list.map(function (t) {
      return "<p>" + esc(t.trim()).replace(/(-?\d+億円|約?\d+万人)/g, "<b>$1</b>") + "</p>";
    }).join("") + "</div>";
  }

  /* 総合評価 */
  function overallHtml(result) {
    var o = M.story.overall(result);
    return '<div class="overall g-' + o.rank + '">' +
      '<div class="overall__rank" aria-label="総合評価' + o.rank + '">' + o.rank + "</div>" +
      '<div class="overall__body"><span class="overall__label">総合評価</span><b class="overall__name">' + esc(o.name) + "</b>" +
      '<span class="overall__score"><b>' + o.score + '</b> / 100点</span>' +
      '<span class="bar__track"><span class="bar__fill" data-w="' + o.score + '"></span></span></div></div>' +
      '<p class="small-note" style="margin:6px 0 0">6つのパラメーター（60%）と結末（40%）から計算した、水族館の経営結果の評価です。</p>';
  }

  /* 資金の推移グラフ */
  function fundChart(result) {
    var pts = M.story.fundTrend(result);
    var W = 320, H = 170, L = 34, R = 10, T = 14, B = 26;
    var vals = pts.map(function (p) { return p.value; });
    var max = Math.max(110, Math.max.apply(null, vals) + 10), min = Math.min(-10, Math.min.apply(null, vals) - 10);
    var x = function (i) { return L + (i / (pts.length - 1)) * (W - L - R); };
    var y = function (v) { return T + ((max - v) / (max - min)) * (H - T - B); };
    var line = pts.map(function (p, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p.value).toFixed(1); }).join(" ");
    var area = line + " L" + x(pts.length - 1) + " " + y(0) + " L" + x(0) + " " + y(0) + " Z";
    var dots = pts.map(function (p, i) {
      return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.value).toFixed(1) + '" r="' + (i === pts.length - 1 ? 5 : 3.2) + '" fill="' + (p.value < 0 ? "#d9786e" : "#4fa6b8") + '" stroke="#fff" stroke-width="1.5"/>';
    }).join("");
    var xl = pts.map(function (p, i) {
      var t = i === 0 ? "開館前" : i === pts.length - 1 ? "決算" : String(i);
      return '<text x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '" font-size="9.5" text-anchor="middle" fill="#5b7290">' + t + "</text>";
    }).join("");
    var last = pts[pts.length - 1];
    return '<svg class="fund-chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="資金余力の推移グラフ">' +
      '<defs><clipPath id="negClip"><rect x="0" y="' + y(0) + '" width="' + W + '" height="' + H + '"/></clipPath></defs>' +
      '<rect x="' + L + '" y="' + y(0) + '" width="' + (W - L - R) + '" height="' + Math.max(0, y(min) - y(0)) + '" fill="#fbecea" opacity=".7"/>' +
      '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="#d9786e" stroke-dasharray="4 3" stroke-width="1"/>' +
      '<text x="' + (L - 4) + '" y="' + (y(0) + 3) + '" font-size="9.5" text-anchor="end" fill="#d9786e">0</text>' +
      '<text x="' + (L - 4) + '" y="' + (y(100) + 3) + '" font-size="9.5" text-anchor="end" fill="#5b7290">100億</text>' +
      '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(100) + '" y2="' + y(100) + '" stroke="#e3ebef" stroke-width="1"/>' +
      '<path d="' + area + '" fill="rgba(124,192,207,.18)"/>' +
      '<path d="' + line + '" fill="none" stroke="#4fa6b8" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="' + line + '" fill="none" stroke="#d9786e" stroke-width="2.5" stroke-linejoin="round" clip-path="url(#negClip)"/>' +
      dots + xl +
      '<text x="' + x(pts.length - 1).toFixed(1) + '" y="' + (y(last.value) - 9).toFixed(1) + '" font-size="11" font-weight="700" text-anchor="end" fill="' + (last.value < 0 ? "#d9786e" : "#2f4a6b") + '">' + M.story.money(last.value) + "</text>" +
      "</svg>";
  }

  /* もしもの未来 */
  function whatIfHtml(result) {
    var list = M.story.whatIf(result);
    if (!list.length) return "";
    return '<section class="card whatif"><h2 class="section-title">もしもの未来</h2>' +
      '<p class="small-note" style="margin:0 0 6px">ほかの選択はそのままで、1問だけ別の答えを選んでいたら…？ 実際に計算し直した結果です。</p>' +
      list.map(function (w) {
        return '<div class="whatif__item kind-' + w.kind + '">' +
          '<div class="whatif__round">第' + w.round + "問　" + esc(w.title) + "</div>" +
          '<div class="whatif__swap"><span class="whatif__you">あなた：' + esc(w.picked) + '</span><span class="whatif__arrow" aria-hidden="true">↓</span><span class="whatif__alt">もし：' + esc(w.label) + "</span></div>" +
          '<p class="whatif__text">' + esc(w.text) + "</p>" +
          (w.change ? '<p class="whatif__change">' + esc(w.change) + "</p>" : "") +
          "</div>";
      }).join("") + "</section>";
  }

  function renderResult(result, story, shared) {
    current = { result: result, story: story };
    topbar(false);
    var art = M.visual.render(result.aquarium, { signText: story.aquariumName, seed: result.resultNumber + 1, id: "res", label: story.aquariumName + "のイラスト" });
    var src = story.source === "ai"
      ? '<span class="source-badge ai">✦ 物語：AI生成（Claude）</span>'
      : '<span class="source-badge">物語：テンプレート生成' + (story.failReason && story.failReason !== "disabled" ? "（AIに接続できなかったため）" : "") + "</span>";
    var chapters = '<ol class="timeline">' + story.chapters.map(function (c, i) {
      return '<li class="chapter' + (i === story.chapters.length - 1 ? " chapter--last" : "") + '">' +
        '<span class="chapter__dot" aria-hidden="true"></span>' +
        (c.era ? '<span class="chapter__era">' + esc(c.era) + "</span>" : "") +
        "<h3>" + esc(c.heading) + "</h3>" + sentences(c.text) + "</li>";
    }).join("") + "</ol>";
    var decisions = story.keyDecisions.map(function (d) {
      return '<div class="decision"><div class="decision__no">第' + d.round + "問</div><div>" +
        '<div class="decision__label">' + esc(d.label) + "</div>" +
        (d.effect ? '<div class="decision__effect">' + esc(d.effect) + "</div>" : "") +
        '<div class="decision__reason">' + esc(d.reason) + "</div></div></div>";
    }).join("");
    var ledger = result.settlement.ledger.map(function (l) {
      var v = l.value ? M.story.money(l.value, true) : D.statLabels[l.stat] + " " + l.statValue;
      return "<li><span>" + esc(l.label) + '</span><span class="' + (l.value > 0 ? "pos" : "neg") + '">' + esc(v) + "</span></li>";
    }).join("");
    var record = result.steps.map(function (s) {
      return "<li><b>第" + s.round + "問　" + esc(s.title) + "</b>" + s.choice + "：" + esc(s.label) + "<br><span>" + esc(M.story.fmtDelta(s.delta) || "変化なし") + "</span></li>";
    }).join("");
    var tone = "tone-" + result.ending.mood;
    var ov = M.story.overall(result);
    var zk = shared ? null : saveZukan(result);
    var total = Object.keys(D.endings).length;

    show(
      '<section class="result-top">' +
        (shared ? '<p class="small-note" style="margin:0 0 10px">友達がつくった水族館の結果です</p>' : "") +
        '<div class="result-art">' + art + "</div>" +
        '<p class="result-name">' + (shared ? "友達の水族館" : "あなたの水族館") + "<b>" + esc(story.aquariumName) + "</b></p>" +
        '<span class="ending-badge ' + tone + '">' + esc(story.endingCategory) + "</span>" +
        (zk && zk.isNew ? '<span class="new-badge">NEW! 図鑑に登録（' + zk.count + " / " + total + "）</span>" : "") +
        '<h1 class="ending-title">『' + esc(story.endingTitle) + "』</h1>" +
        '<p class="ending-summary">' + esc(story.shortSummary) + "</p>" +
        '<div class="overall-mini g-' + ov.rank + '"><span>総合評価</span><b>' + ov.rank + "</b><em>" + ov.score + "点</em></div>" + src +
      "</section>" +
      '<section class="card" style="margin-top:18px"><h2 class="section-title">水族館の特徴</h2><ul class="feature-list">' +
        story.features.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul></section>" +
      '<section class="card"><h2 class="section-title">10年間の経営レポート</h2>' + overallHtml(result) + radar(result.finalStats) + statCards(result) +
        '<p class="small-note">評価はS・A・B・C・Dの5段階。※ 数値はゲーム内だけの指標で、現実の水族館の評価ではありません。</p></section>' +
      '<section class="card"><h2 class="section-title">資金余力の推移</h2>' + fundChart(result) +
        '<p class="small-note" style="margin-top:4px">数字は各問を選んだあとの資金余力。赤いゾーンは赤字です。</p>' +
        '<h3 class="sub-title">10年後の決算</h3><ul class="ledger">' + ledger + '<li><span><b>最終的な資金余力</b></span><span class="' + (result.finalStats.fund >= 0 ? "pos" : "neg") + '">' + M.story.money(result.finalStats.fund) + "</span></li></ul></section>" +
      '<section class="card"><h2 class="section-title">10年間の物語</h2>' + chapters + "</section>" +
      '<section class="card"><h2 class="section-title">運命を変えた3つの選択</h2>' + decisions + "</section>" +
      whatIfHtml(result) +
      '<section class="card"><h2 class="section-title">10年後の水族館</h2><p style="margin:0">' + esc(story.finalSceneDescription) + "</p></section>" +
      '<section class="card"><details class="record"><summary>すべての選択の記録</summary><ol>' + record + "</ol></details></section>" +
      (shared ? "" :
        '<section class="card"><h2 class="section-title">結果をシェアする</h2>' +
        '<div class="share-grid"><a class="btn btn--ghost" id="xBtn" target="_blank" rel="noopener">Xでポスト</a><a class="btn btn--ghost" id="lineBtn" target="_blank" rel="noopener">LINEで送る</a><button class="btn btn--ghost" id="copyBtn" type="button">URLコピー</button></div>' +
        '<p class="small-note">Instagramには「結果画像を保存」で保存した画像を投稿してください。</p>' +
        '<p class="replay-hook">まだ見ていないエンディングが<b>あと' + (total - zk.count) + "種類</b>。<br>ちがう選択をしたら、どんな未来になる？</p>" +
        '<button class="btn btn--primary" id="retryBtn" type="button" style="margin-top:10px">別の未来を見にいく！</button></section>') +
      '<p class="result-id">結果ID：' + esc(result.resultId) + "</p>" +
      '<p class="brand-foot"><b>MARINK</b><br>海の生き物を、もっと面白く。</p>' +
      '<div class="result-actions">' +
        (shared
          ? '<button class="btn btn--primary" id="retryBtn" type="button">自分も水族館をつくる！</button>'
          : '<div class="btn-row"><button class="btn btn--sea btn--small" id="saveBtn" type="button">結果画像を保存</button><button class="btn btn--primary btn--small" id="shareBtn" type="button">友達に共有</button></div>') +
      "</div>"
    );

    requestAnimationFrame(function () {
      setTimeout(function () {
        app.querySelectorAll(".bar__fill").forEach(function (b) { b.style.width = b.getAttribute("data-w") + "%"; });
      }, 300);
    });
    observeChapters();
    if (!shared && ["legendary", "national", "miracle", "paradise", "research", "conservation", "community"].indexOf(result.endingId) >= 0) burst();

    $("retryBtn").addEventListener("click", function () {
      S.play("bubble");
      history = [];
      save();
      if (location.search) window.history.replaceState(null, "", location.pathname);
      if (shared) renderTitle(); else renderNameScreen(aqName);
    });
    if (shared) return;

    var url = M.share.shareUrl(result.history, story.customName);
    var text = M.share.shareText(story);
    $("xBtn").href = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url);
    $("lineBtn").href = "https://social-plugins.line.me/lineit/share?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(text);
    $("copyBtn").addEventListener("click", function () {
      M.share.copy(url).then(function () { toast("結果のURLをコピーしました"); }, function () { toast("コピーできませんでした"); });
    });
    $("shareBtn").addEventListener("click", function () {
      if (navigator.share) {
        navigator.share({ title: "MARINK AQUARIUM", text: text, url: url }).catch(function () {});
      } else {
        M.share.copy(text + " " + url).then(function () { toast("共有用の文章とURLをコピーしました"); }, function () { toast("コピーできませんでした"); });
      }
    });
    $("saveBtn").addEventListener("click", saveImage);
  }

  function observeChapters() {
    var els = app.querySelectorAll(".chapter");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.15 });
    els.forEach(function (e) { io.observe(e); });
  }

  function burst() {
    var b = document.createElement("div");
    b.className = "burst";
    var colors = ["#f2a79c", "#7cc0cf", "#f3d27a", "#9ccf9f", "#ffffff"];
    for (var i = 0; i < 40; i++) {
      var p = document.createElement("i");
      p.style.left = (i * 37) % 100 + "%";
      p.style.background = colors[i % 5];
      p.style.animationDuration = 2.4 + (i % 7) * 0.35 + "s";
      p.style.animationDelay = (i % 10) * 0.08 + "s";
      b.appendChild(p);
    }
    document.body.appendChild(b);
    setTimeout(function () { b.remove(); }, 5500);
  }

  function saveImage() {
    if (!current) return;
    var btn = $("saveBtn");
    btn.disabled = true;
    btn.textContent = "画像を作成中…";
    M.share.makeImage(current.result, current.story).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var name = "marink-aquarium-" + current.result.resultNumber + ".png";
      var file = null;
      try { file = new File([blob], name, { type: "image/png" }); } catch (e) {}
      var canShareFile = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
      var modal = $("modal");
      modal.innerHTML =
        '<div class="modal__box"><img src="' + url + '" alt="結果画像">' +
        "<p>iPhoneなどでは、画像を長押しして「写真に保存」もできます。<br>Instagramには、保存した画像を投稿してください。</p>" +
        '<a class="btn btn--sea btn--small" href="' + url + '" download="' + name + '">PNG画像をダウンロード</a>' +
        (canShareFile ? '<button class="btn btn--primary btn--small" id="shareFileBtn" type="button">画像を共有する</button>' : "") +
        '<button class="btn btn--ghost btn--small" id="closeModal" type="button">閉じる</button></div>';
      modal.hidden = false;
      $("closeModal").addEventListener("click", function () { modal.hidden = true; URL.revokeObjectURL(url); });
      if (canShareFile) $("shareFileBtn").addEventListener("click", function () {
        navigator.share({ files: [file], text: M.share.shareText(current.story) }).catch(function () {});
      });
    }).catch(function (e) {
      console.error(e);
      toast("画像を作成できませんでした");
    }).finally(function () {
      btn.disabled = false;
      btn.textContent = "結果画像を保存";
    });
  }

  /* ───── 起動 ───── */
  function init() {
    decorate();
    var sb = $("soundBtn");
    sb.setAttribute("aria-pressed", S.isOn() ? "true" : "false");
    sb.addEventListener("click", function () { sb.setAttribute("aria-pressed", S.toggle() ? "true" : "false"); });
    $("backBtn").addEventListener("click", function () {
      if (busy || !history.length || !$("sheet").hidden) return;
      S.play("tap");
      history.pop();
      hudShown = null;
      save();
      goRound();
    });
    $("sheetBackdrop").addEventListener("click", function () {}); // 誤タップでシートを閉じない

    var r = new URLSearchParams(location.search).get("r");
    var shared = r && E.parseHistory(r);
    if (shared && shared.length === 10) {
      // 共有リンク：AIは呼ばず、テンプレートで同じ結果を再現する
      var result = E.simulate(shared);
      var story = M.story.buildStory(result, { name: new URLSearchParams(location.search).get("n") || "" });
      renderResult(result, story, true);
      return;
    }
    renderTitle();
  }

  init();
})();

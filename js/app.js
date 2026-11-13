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
    if (tapCleanup) tapCleanup();
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
      var pct = k === "fund" ? Math.max(0, Math.min(100, v / 2)) : v;
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
      var e = D.endings[k];
      if (z.found[k]) return '<li class="found"><small>' + esc(e.type) + "</small>" + esc(e.name.replace(/エンド$/, "")) + "</li>";
      return '<li class="' + (e.secret ? "secret" : "") + '"><small>' + (e.secret ? "シークレット" : esc(e.type)) + "</small>？？？</li>";
    }).join("");
    return '<div class="guide">' +
      '<section class="card goal"><span class="goal__tag">ゲームの目的</span>' +
        "<h2>10回の決断で、<br>水族館の10年後を決めよう</h2>" +
        "<p>限られた資金100億円で、立地・展示・スタッフ・入館料…を決めていく館長ゲーム。人気、生き物の暮らし、研究、信頼をすべて両立させて「伝説の水族館」を目指そう。でも、思いがけない未来が待っていることも…？</p></section>" +
      '<ul class="hooks" style="margin-top:12px"><li><b>' + Object.keys(D.endings).length + '種類</b>のエンディング</li><li><b>59,049</b>通りの未来</li><li><b>S〜F</b>の総合評価</li></ul>' +
      '<section class="card" style="margin-top:12px"><h2 class="section-title">遊び方</h2><ol class="steps">' +
        "<li><span><b>3つの選択肢から1つを選ぶ</b>正解はありません。どれにもメリットとデメリットがあります。</span></li>" +
        "<li><span><b>資金や人気などが変化</b>資金（億円）・集客力など6つのパラメーターが動きます。開館後は毎年「売上 − 運営費」の利益（または赤字）が入ります。大きな設備ほど毎年の維持費も重く、判断を誤ると経営危機に。※金額はゲーム用の目安です。</span></li>" +
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
  /* 「ホーム画面に追加」の案内（すでにアプリとして開いているときは出さない） */
  function installHtml() {
    if (M.native && M.native.isNative) return ""; // アプリ版では出さない
    var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
    if (standalone) return "";
    var ua = navigator.userAgent || "";
    var ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var android = /Android/.test(ua);
    var steps = ios
      ? "<li>画面の下（または上）にある <b>共有ボタン</b>（□から↑が出ているマーク）を押す</li><li>メニューの中の <b>「ホーム画面に追加」</b> を押す（見つからないときはメニューを下にスクロール）</li><li>右上の <b>「追加」</b> を押す</li>"
      : android
        ? "<li>右上の <b>︙（メニュー）</b> を押す</li><li><b>「ホーム画面に追加」</b> または <b>「アプリをインストール」</b> を押す</li><li><b>「追加」</b> を押す</li>"
        : "<li>スマホでこのページを開く</li><li>iPhoneなら共有ボタン →「ホーム画面に追加」、Androidならメニュー →「ホーム画面に追加」</li>";
    return '<section class="card install-card"><h2 class="section-title">アプリのように遊ぶには</h2>' +
      '<div class="install-card__head"><img src="assets/apple-touch-icon.png" alt="" width="56" height="56"><p>ホーム画面にアイコンを置くと、アプリのように<b>全画面</b>で遊べます。一度開けば<b>電波がなくても</b>遊べます。無料です。</p></div>' +
      '<ol class="install-card__steps">' + steps + "</ol>" +
      (ios ? '<p class="small-note">※ Safari で開いてください。LINEやInstagramの中で開いた場合は、右下や右上のメニューから「Safariで開く」を選んでから追加します。</p>' : "") +
      "</section>";
  }

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
        installHtml() +
        '<p class="title-foot"><a href="privacy.html">プライバシーポリシー</a></p>' +
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
    if (!next.__played) {
      next.__played = true;
      playEventCuts(history.slice(), next.events).then(function () { renderEvents(next); });
      return;
    }
    var crisis = next.events.some(function (e) { return e.mood === "crisis"; });
    var bad = next.events.some(function (e) { return e.mood === "bad"; });
    var cards = next.events.map(function (e) {
      var tag = { good: "うれしいニュース", bad: "ちょっと困った", crisis: "緊急事態", info: "お知らせ" }[e.mood];
      return '<article class="card event-card mood-' + e.mood + '"><span class="event-card__tag">' + tag + "</span><h3>" + esc(e.title) + "</h3><p>" + esc(e.text) + "</p>" + deltaChips(e.delta) + "</article>";
    }).join("");
    show(
      '<div class="q-head"><span class="q-round">第' + next.round + "問の前に…</span></div>" + cards +
      '<button class="btn btn--sea tap-go" id="toQuestion" type="button" style="margin-top:18px">第' + next.round + "問へ進む</button>" +
      '<p class="tap-hint">画面のどこをタップしても進めます</p>',
      crisis ? "mood-crisis-screen" : ""
    );
    tapAnywhere([document.body], function () { S.play("tap"); renderQuestion(next.question); });
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
      playCutscene(history.slice(0, -1), history.slice(), step).then(function () { openSheet(step); });
    }, 380);
  }

  /* ───── 選んだあとの「水族館が変わっていく」演出（タップでは飛ばせない短い映像） ───── */
  // 新しく付いたフラグ → 演出の種類と、画面に出す一言
  var CUT = {
    loc_tourist: ["build", "海沿いに水族館を建設中…"], loc_nature: ["build", "自然の海辺に水族館を建設中…"], loc_campus: ["build", "大学の街に水族館を建設中…"],
    main_big: ["swim-big", "大型魚たちがやってきた！"], main_small: ["swim-small", "個性派の魚たちがやってきた！"], main_deep: ["swim-jelly", "クラゲたちがやってきた！"],
    big_tanks: ["grow", "巨大水槽を建設中…"], variety: ["swim-small", "たくさんの生き物が仲間入り！"], reliable: ["sparkle", "設備をしっかり整えた！"],
    loan: ["coins", "銀行から資金を調達！"], downsized: ["shrink", "展示を小さくして開館準備…"], delayed: ["time", "時間をかけて資金集め…"],
    staff_vet: ["staff", "ベテラン飼育員が仲間入り！"], staff_rookie: ["staff", "新人たちが仲間入り！"], staff_elite: ["staff", "専門家チームが仲間入り！"],
    price_high: ["open", "いよいよ開館！"], price_mid: ["open", "いよいよ開館！"], price_low: ["open", "いよいよ開館！"],
    renewed: ["repair", "設備を全面リニューアル中…"], paused: ["repair", "展示を休んで修繕中…"], contract: ["repair", "専門業者がメンテナンス中…"],
    extended: ["night", "夜の水族館がオープン！"], reservation: ["crowd", "予約制でゆったり見学！"], expanded_staff: ["staff", "スタッフを増やした！"],
    new_wing: ["annex", "新しい展示館を建設中…"], conservation: ["annex", "研究・保全の施設を建設中…"], care: ["hearts", "スタッフも生き物も笑顔に！"],
    mega: ["grow", "水族館を大きく拡大中…"], shrink_end: ["shrink", "身の丈に合った規模へ…"], alliance: ["annex", "仲間の水族館と手を組んだ！"], keep: ["sparkle", "今の水族館をみがき上げる！"],
  };
  var CUT_ORDER = ["loc_tourist", "loc_nature", "loc_campus", "main_big", "main_small", "main_deep", "mega", "shrink_end", "new_wing", "conservation", "alliance", "big_tanks", "variety", "reliable", "loan", "downsized", "delayed",
    "staff_vet", "staff_rookie", "staff_elite", "price_high", "price_mid", "price_low", "renewed", "paused", "contract", "extended", "reservation", "expanded_staff", "care", "keep"];
  var CUT_MS = 2600;

  function cutKind(before, after) {
    var added = after.flags.filter(function (f) { return before.flags.indexOf(f) < 0; });
    for (var i = 0; i < CUT_ORDER.length; i++) if (added.indexOf(CUT_ORDER[i]) >= 0) return CUT[CUT_ORDER[i]];
    return ["sparkle", "水族館が少し変わった！"];
  }

  function cutParticles(kind) {
    var out = "", i;
    if (kind === "coins-out") for (i = 0; i < 10; i++) out += '<i class="cut-coin cut-coin--out" style="left:' + (30 + i * 4.5) + "%;animation-delay:" + (0.2 + (i % 5) * 0.1).toFixed(2) + 's"></i>';
    if (kind === "rain" || kind === "storm") {
      out += '<i class="cut-cloud" style="left:8%"></i><i class="cut-cloud" style="left:46%;animation-delay:.15s"></i><i class="cut-cloud" style="left:72%;animation-delay:.3s"></i>';
      for (i = 0; i < 26; i++) out += '<i class="cut-drop" style="left:' + ((i * 37) % 100) + "%;animation-delay:" + (0.4 + (i % 9) * 0.11).toFixed(2) + 's"></i>';
    }
    if (kind === "storm") out += '<i class="cut-flash"></i>';
    if (kind === "bus") out += '<div class="cut-bus"><svg viewBox="0 0 60 30"><rect x="2" y="4" width="54" height="20" rx="5" fill="#f3c74a"/><rect x="6" y="8" width="9" height="7" rx="1.5" fill="#cfeaf2"/><rect x="18" y="8" width="9" height="7" rx="1.5" fill="#cfeaf2"/><rect x="30" y="8" width="9" height="7" rx="1.5" fill="#cfeaf2"/><rect x="43" y="8" width="10" height="11" rx="1.5" fill="#cfeaf2"/><rect x="2" y="17" width="54" height="2" fill="#e09a3a"/><circle cx="14" cy="25" r="4" fill="#3d4a5c"/><circle cx="44" cy="25" r="4" fill="#3d4a5c"/></svg></div>';
    if (kind === "coins") for (i = 0; i < 14; i++) out += '<i class="cut-coin" style="left:' + (8 + i * 6.3) + "%;animation-delay:" + (0.25 + (i % 5) * 0.12).toFixed(2) + 's"></i>';
    if (kind === "hearts") for (i = 0; i < 10; i++) out += '<i class="cut-heart" style="left:' + (12 + i * 8) + "%;animation-delay:" + (0.3 + (i % 4) * 0.18).toFixed(2) + 's">♥</i>';
    if (kind === "sparkle" || kind === "repair" || kind === "grow" || kind === "annex") for (i = 0; i < 9; i++) out += '<i class="cut-star" style="left:' + (18 + (i * 37) % 64) + "%;top:" + (18 + (i * 23) % 46) + "%;animation-delay:" + (0.6 + i * 0.12).toFixed(2) + 's">✦</i>';
    if (kind === "build" || kind === "annex" || kind === "grow") for (i = 0; i < 8; i++) out += '<i class="cut-dust" style="left:' + (30 + i * 5.5) + "%;animation-delay:" + (0.3 + (i % 4) * 0.15).toFixed(2) + 's"></i>';
    if (kind === "swim-big") out += '<div class="cut-swimmer"><svg viewBox="-40 -20 90 40"><path d="M-34 0 C-30 -9 12 -10 28 -2 L42 -12 L38 0 L42 10 L28 2 C12 9 -30 9 -34 0 Z" fill="#4f7fa8"/><path d="M-2 -7 L4 -16 L10 -7 Z" fill="#4f7fa8"/><g fill="#fff" opacity=".85"><circle cx="-20" cy="-2" r="1.4"/><circle cx="-12" cy="1" r="1.4"/><circle cx="-4" cy="-3" r="1.4"/><circle cx="4" cy="0" r="1.4"/><circle cx="12" cy="-2" r="1.4"/></g><circle cx="-27" cy="-1" r="1.6" fill="#13304f"/></svg></div>';
    if (kind === "swim-small") for (i = 0; i < 6; i++) out += '<div class="cut-fish" style="top:' + (30 + i * 9) + "%;animation-delay:" + (i * 0.14).toFixed(2) + 's"><svg viewBox="-12 -8 30 16"><path d="M-10 0 C-5 -7 7 -7 10 0 C7 7 -5 7 -10 0 Z" fill="' + ["#f4a35d", "#7fbf9b", "#e9827a", "#f2cf63", "#7cc0cf", "#c7a6d9"][i] + '"/><path d="M9 0 L16 -6 L15 0 L16 6 Z" fill="' + ["#f4a35d", "#7fbf9b", "#e9827a", "#f2cf63", "#7cc0cf", "#c7a6d9"][i] + '"/><circle cx="-5" cy="-1.5" r="1.3" fill="#2d3b55"/></svg></div>';
    if (kind === "swim-jelly") for (i = 0; i < 5; i++) out += '<div class="cut-jelly" style="left:' + (14 + i * 17) + "%;animation-delay:" + (i * 0.15).toFixed(2) + 's"><svg viewBox="-10 -12 20 26"><path d="M-8 0 C-8 -11 8 -11 8 0 Q4 2 0 0 Q-4 2 -8 0 Z" fill="' + ["#f7c6e0", "#c9e9ff", "#e6d4ff"][i % 3] + '"/><path d="M-5 1 q-2 5 0 10 M0 1 q2 6 0 12 M5 1 q2 5 0 10" stroke="' + ["#f7c6e0", "#c9e9ff", "#e6d4ff"][i % 3] + '" stroke-width="1" fill="none"/></svg></div>';
    return out;
  }

  /* 演出を1つ流す（共通）
   * o: { before, after, kind, label, caption, ms, newFlags } */
  function showCut(o) {
    return new Promise(function (resolve) {
      var sign = aqName || "わたしの水族館";
      var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
      var ms = reduce ? 1200 : (o.ms || CUT_MS);
      var el = document.createElement("div");
      el.className = "cutscene cut-" + o.kind + (reduce ? " cut-reduce" : "");
      el.style.setProperty("--cut-ms", ms + "ms");
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      el.innerHTML =
        '<div class="cutscene__frame">' +
          '<div class="cutscene__layer cutscene__before">' + M.visual.render(o.before, { signText: sign, seed: 11, id: "cb", label: "変わる前の水族館" }) + "</div>" +
          '<div class="cutscene__layer cutscene__after">' + M.visual.render(o.after, { signText: sign, seed: 11, id: "ca", label: "変わったあとの水族館" }) + "</div>" +
          '<div class="cutscene__fx">' + cutParticles(o.kind) + "</div>" +
        "</div>" +
        (o.tag ? '<span class="cutscene__tag mood-' + o.mood + '">' + esc(o.tag) + "</span>" : "") +
        '<p class="cutscene__label">' + esc(o.label) + "</p>" +
        '<p class="cutscene__caption">' + esc(o.caption) + "</p>" +
        '<div class="cutscene__bar"><span></span></div>';
      // 新しく付いた外観パーツだけを「ポン」と出す
      (o.newFlags || []).forEach(function (f) {
        el.querySelectorAll(".cutscene__after .mk-x-" + f).forEach(function (n) { n.classList.add("cut-new"); });
      });
      // 演出中はタップを受け付けない（下の画面にも届かない）
      ["click", "touchstart", "touchend", "pointerdown"].forEach(function (t) { el.addEventListener(t, function (e) { e.stopPropagation(); if (t === "click") e.preventDefault(); }, { passive: t !== "click" }); });
      document.body.appendChild(el);
      if (o.sound) S.play(o.sound);
      setTimeout(function () {
        el.classList.add("is-leaving");
        setTimeout(function () { el.remove(); resolve(); }, 280);
      }, ms);
    });
  }

  function playCutscene(prevHistory, nextHistory, step) {
    var before, after;
    try { before = E.preview(prevHistory); after = E.preview(nextHistory); } catch (e) { return Promise.resolve(); }
    var k = cutKind(before, after), kind = k[0];
    var added = after.flags.filter(function (f) { return before.flags.indexOf(f) < 0; });
    return showCut({ before: before, after: after, kind: kind, label: step.label, caption: k[1], newFlags: added,
      sound: kind === "build" || kind === "annex" || kind === "grow" || kind === "repair" ? "bubble" : null });
  }

  /* 途中のイベント（「第○問の前に…」）の演出 */
  var EV_CUT = {
    ev_loan_payment: "coins-out", ev_delay_fans: "crowd", ev_nature_access: "bus", ev_veteran_notice: "sparkle", ev_reliable_saves: "sparkle",
    ev_bigfish_crowd: "crowd", ev_bigfish_planned: "swim-big", ev_rookie_growth: "staff", ev_tourist_season: "crowd", ev_overwork: "rain",
    ev_deep_breeding: "swim-jelly", ev_small_fans: "crowd", ev_campus_collab: "sparkle", ev_crisis: "storm",
  };
  function eventCaption(e) {
    var d = e.delta || {}, parts = [];
    if (d.fund) parts.push("資金 " + M.story.money(d.fund, true));
    ["pop", "welfare", "staff", "research", "trust"].forEach(function (k) { if (d[k]) parts.push(D.statLabels[k] + " " + (d[k] > 0 ? "+" : "") + d[k]); });
    return parts.join("　") || String(e.text || "").split("。")[0];
  }
  function playEventCuts(history, events) {
    var cfg;
    try { cfg = E.preview(history); } catch (e) { return Promise.resolve(); }
    var list = events.slice(0, 3);
    var tags = { good: "うれしいニュース", bad: "ちょっと困った", crisis: "緊急事態", info: "お知らせ" };
    return list.reduce(function (p, e) {
      return p.then(function () {
        var kind = e.id === "ev_income" ? ((e.delta.fund || 0) >= 0 ? "coins" : "rain") : EV_CUT[e.id] || (e.mood === "bad" ? "rain" : "sparkle");
        return showCut({ before: cfg, after: cfg, kind: kind, label: e.title, caption: eventCaption(e), tag: tags[e.mood], mood: e.mood, ms: 2100,
          sound: e.mood === "crisis" ? "crisis" : e.mood === "bad" || kind === "rain" ? "bad" : "good" });
      });
    }, Promise.resolve());
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
      '<button class="btn tap-go ' + (last ? "btn--primary" : "btn--sea") + '" id="sheetNext" type="button">' + (last ? "10年後の水族館を見る" : "次の問題へ") + "</button>" +
      '<p class="tap-hint">画面のどこをタップしても進めます</p>';
    $("sheetBackdrop").hidden = false;
    sheet.hidden = false;
    sheet.scrollTop = 0;
    var ups = E.STAT_KEYS.reduce(function (a, k) { return a + (step.delta[k] || 0); }, 0);
    setTimeout(function () { S.play(ups >= 0 ? "good" : "soft"); }, 120);
    $("sheetNext").focus({ preventScroll: true });
    // ボタンだけでなく、シートや背景のどこをタップしても次へ進める
    tapAnywhere([sheet, $("sheetBackdrop")], function () {
      S.play("tap");
      closeSheet();
      goRound();
    });
  }

  /* 画面のどこをタップしても進めるようにする
   * ・開いた直後の誤タップを防ぐため、少しだけ待ってから受け付ける
   * ・一度進んだら二重に反応しない
   * ・スクロールしただけ（指を動かした）なら進まない */
  var tapCleanup = null;
  function tapAnywhere(targets, go) {
    if (tapCleanup) tapCleanup();
    var ready = false, sx = 0, sy = 0, moved = false;
    var timer = setTimeout(function () { ready = true; }, 450);
    function down(e) { var t = e.touches ? e.touches[0] : e; sx = t.clientX; sy = t.clientY; moved = false; }
    function move(e) { var t = e.touches ? e.touches[0] : e; if (Math.abs(t.clientX - sx) > 10 || Math.abs(t.clientY - sy) > 10) moved = true; }
    function click(e) {
      if (!ready || moved) return;
      // 戻る・音のボタンやリンクなどは、そのボタン本来の動きを優先する
      if (e.target.closest && e.target.closest("a, input, textarea, select, details, .topbar, button:not(.tap-go)")) return;
      cleanup();
      go();
    }
    function cleanup() {
      clearTimeout(timer);
      targets.forEach(function (el) {
        el.removeEventListener("touchstart", down);
        el.removeEventListener("touchmove", move);
        el.removeEventListener("click", click);
      });
      if (tapCleanup === cleanup) tapCleanup = null;
    }
    targets.forEach(function (el) {
      el.addEventListener("touchstart", down, { passive: true });
      el.addEventListener("touchmove", move, { passive: true });
      el.addEventListener("click", click);
    });
    tapCleanup = cleanup;
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
    var vals = keys.map(function (k) { return k === "fund" ? Math.max(0, Math.min(100, fs.fund / 2)) : fs[k]; });
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
      var pct = s.key === "fund" ? Math.max(3, Math.min(100, s.value / 2)) : Math.max(3, s.value);
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

  /* 建物のようす（0〜10段階） */
  function damageMeter(lv) {
    lv = lv || 0;
    var cells = "";
    for (var i = 1; i <= 10; i++) cells += '<i class="' + (i <= lv ? "on" : "") + '"></i>';
    return '<div class="damage-meter lv' + (lv >= 8 ? "-hi" : lv >= 4 ? "-mid" : "-lo") + '"><span>建物のようす</span><b>' + esc(M.visual.DAMAGE_NAMES[lv]) + '</b><span class="damage-meter__cells" aria-label="傷み ' + lv + ' / 10">' + cells + "</span><em>傷み " + lv + "/10</em></div>";
  }

  /* 10年間のお金の流れ：開業準備／営業利益／開館後の投資など */
  function moneyFlow(result) {
    var start = D.initialStats.fund, prep = 0, profit = 0, loan = 0;
    result.steps.forEach(function (st) {
      st.events.forEach(function (e) {
        if (e.id === "ev_income") profit += e.delta.fund || 0;
        else if (st.round <= 6) prep += e.delta.fund || 0;
      });
      if (st.delta.debt > 0) loan += st.delta.debt;
      if (st.round <= 5) prep += (st.delta.fund || 0) - (st.delta.debt > 0 ? st.delta.debt : 0);
    });
    result.settlement.ledger.forEach(function (l) { if (l.business) profit += l.value; });
    var end = result.finalStats.fund, other = end - start - prep - profit - loan;
    var row = function (label, v, note) {
      return "<li><span>" + esc(label) + (note ? '<small class="ledger__note">' + esc(note) + "</small>" : "") + '</span><span class="' + (v >= 0 ? "pos" : "neg") + '">' + esc(M.story.money(v, true)) + "</span></li>";
    };
    var diff = end - start;
    return '<ul class="ledger">' +
      "<li><span>スタート時の資金</span><span>" + esc(M.story.money(start)) + "</span></li>" +
      row("開館までの準備（建設・設備・採用など）", prep, "第1〜5問") +
      (loan ? row("銀行からの借入", loan, "あとで利子つきで返済") : "") +
      row("開館後10年間の営業利益の合計", profit, "入館料・グッズ・飲食の売上 − 運営費") +
      row("開館後の投資・返済など", other, "第6〜10問、借入金の返済など") +
      '<li><span><b>10年後の資金</b></span><span class="' + (end >= 0 ? "pos" : "neg") + '"><b>' + esc(M.story.money(end)) + "</b></span></li>" +
      "</ul>" +
      '<p class="money-verdict ' + (diff >= 0 ? "up" : "down") + '">' + (diff >= 0
        ? "スタートの" + esc(M.story.money(start)) + "から <b>" + esc(M.story.money(diff, true)) + "</b>。経営で資金を増やせました！"
        : "スタートの" + esc(M.story.money(start)) + "から <b>" + esc(M.story.money(diff)) + "</b>。" + (profit > 0 ? "営業では利益が出たものの、投資や返済がそれを上回りました。" : "営業で利益を出せず、資金が減ってしまいました。")) + "</p>";
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
        damageMeter(result.aquarium.damage) +
        '<p class="result-name">' + (shared ? "友達の水族館" : "あなたの水族館") + "<b>" + esc(story.aquariumName) + "</b></p>" +
        '<span class="ending-type">' + esc(result.ending.type) + "</span>" +
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
        '<p class="small-note" style="margin-top:4px">数字は各問を選んだあとの資金余力。赤いゾーンはお金が底をついた状態です。開館後は毎年の営業利益が入ります。</p>' +
        '<h3 class="sub-title">10年間のお金の流れ</h3>' + moneyFlow(result) +
        '<h3 class="sub-title">10年後の決算（開館8〜10年目）</h3><ul class="ledger">' + ledger + '<li><span><b>最終的な資金余力</b></span><span class="' + (result.finalStats.fund >= 0 ? "pos" : "neg") + '">' + M.story.money(result.finalStats.fund) + "</span></li></ul></section>" +
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
      if (M.native && M.native.isNative) {
        M.native.shareText(text, url).catch(function () {});
      } else if (navigator.share) {
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
      var name0 = "marink-aquarium-" + current.result.resultNumber + ".png";
      // アプリ版：iPhone標準の共有画面を開く（「画像を保存」で写真アプリに保存できる）
      if (M.native && M.native.isNative) {
        return M.native.shareImage(blob, name0, M.share.shareText(current.story)).catch(function (e) {
          if (!/cancel/i.test(String(e && e.message))) toast("共有画面を開けませんでした");
        });
      }
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
    if (M.native) M.native.ready();
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

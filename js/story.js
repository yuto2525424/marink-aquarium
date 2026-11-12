/*
 * MARINK AQUARIUM ― テンプレート物語生成（AIを使わない通常モード）
 *
 * engine.simulate() の結果だけを材料に、選択履歴と矛盾しない物語を組み立てます。
 * AIモードでも、この結果を「確定した事実」としてAIに渡します。
 */
(function (g) {
  var M = (g.MARINK = g.MARINK || {});
  var D = M.DATA;
  var E = M.engine;

  var LOC = {
    tourist: { place: "人気観光地の海沿い", scene: "観光客でにぎわう海沿い", line: "人通りは多いけれど、土地代は目が飛び出るほど高かった。" },
    nature: { place: "自然豊かな静かな海辺", scene: "松林と白い砂浜に囲まれた静かな海辺", line: "交通は不便でも、生き物たちにとっては理想的な環境だった。" },
    campus: { place: "大学や研究所が集まる街", scene: "大学のキャンパスがすぐそばにある海辺の街", line: "研究者たちが散歩がてら立ち寄る、ちょっと変わった立地だ。" },
  };

  var NAMES = {
    tourist: { big: ["しおかぜ大海原水族館", "サンセットベイ大海原アクアリウム"], small: ["しおかぜ ちいさな海の水族館", "マリンポート まめうお館"], deep: ["しおかぜ ゆらめき水族館", "サンセットベイ・クラゲパレス"] },
    nature: { big: ["なぎさの大海原水族館", "こもれび 海の巨人館"], small: ["こもれび ちいさな海の水族館", "なぎさの まめうお館"], deep: ["しずかな入り江 ゆらめき水族館", "こもれびクラゲ館"] },
    campus: { big: ["まなびの海 大海原水族館", "アカデミア海洋館"], small: ["まなびの海 ちいさな生き物館", "アカデミア まめうお研究水族館"], deep: ["まなびの海 しんかい水族館", "アカデミア深海ラボ水族館"] },
  };

  var TITLE_VARIANTS = {
    paradise: { small: "小さな海の奇跡", deep: "ゆらめく、小さな楽園", big: "海辺の小さな楽園" },
    national: { big: "日本中が会いに来る、海の巨人", deep: "日本中が見とれる、クラゲの宮殿", small: "行列のできる、小さな魚の館" },
    research: { deep: "深海研究の聖地", small: "小さな魚たちの研究聖地", big: "大型魚研究の聖地" },
  };

  function mainLine(a) {
    if (a.main === "big") {
      return a.bigFish === "full"
        ? "主役は、巨大水槽を悠々と泳ぐジンベエザメ。"
        : "主役は大型魚。ただ、ジンベエザメを迎えるには水槽が足りず、まずはエイやサメたちが主役をつとめた。";
    }
    if (a.main === "small") return "主役に選んだのは、ハゼやギンポといった小さくて個性的な魚たち。";
    return "主役に選んだのは、ふわふわ漂うクラゲと、ふしぎな深海の生き物たち。";
  }

  function mainShort(a) {
    if (a.main === "big") return a.bigFish === "full" ? "ジンベエザメの大水槽" : "大型魚の回遊水槽（ジンベエザメは計画中）";
    if (a.main === "small") return "小さな個性派の魚たち";
    return "クラゲと深海生物";
  }

  function stepOf(r, n) { return r.steps[n - 1]; }
  function ch(r, n) { return r.steps[n - 1].choice; }
  function has(r, f) { return r.flags.indexOf(f) >= 0; }

  function chapter1(r) {
    var a = r.aquarium;
    var t = ["あなたが水族館を建てたのは、" + LOC[a.location].scene + "。" + LOC[a.location].line, mainLine(a)];
    t.push({ A: "建設予算の多くを、水槽の大きさと迫力に注ぎこんだ。", B: "建設予算は、展示する生き物の種類を増やすことに使った。", C: "建設予算は、目立たない設備の信頼性と飼育環境に使った。" }[ch(r, 3)]);
    t.push({ A: "開館直前の資金不足は、銀行の融資で乗り切った。", B: "開館直前の資金不足には、展示を縮小して対応した。", C: "開館直前の資金不足を受けて、開館を半年延期した。" }[ch(r, 4)]);
    stepOf(r, 4).notes.forEach(function (n) { t.push(n); });
    return t.join("");
  }

  function chapter2(r) {
    var a = r.aquarium;
    var t = [];
    t.push({ A: "飼育チームには経験豊富なベテランを迎え、", B: "飼育チームには新人をたくさん採用し、", C: "飼育チームは少数精鋭の専門家で固め、" }[ch(r, 5)]);
    t.push({ A: "入館料は高めに設定して特別な体験を売りにした。", B: "入館料はふつうの価格にして幅広い人を迎えた。", C: "入館料は安くして、たくさんの人が気軽に来られるようにした。" }[ch(r, 6)]);
    var trouble = a.main === "big" ? "大型水槽の設備" : a.main === "small" ? "たくさんの小さな水槽のろ過装置" : "クラゲ水槽の水流装置と深海水槽の冷却装置";
    t.push("開館3年目、" + trouble + "に不具合が見つかったときは、" + { A: "思い切って設備を全面リニューアルした。", B: "展示を休止して、安全第一で修繕した。", C: "専門業者と長期の保守契約を結んで対応した。" }[ch(r, 7)]);
    var buzz = a.main === "big" ? "大水槽の写真" : a.main === "small" ? "「変顔のハゼ」動画" : "幻想的なクラゲの写真";
    t.push("やがて" + buzz + "がSNSで話題になると、" + { A: "営業時間を延ばして来館者を迎え入れた。", B: "予約制を導入して、混雑から生き物と来館者を守った。", C: "スタッフと設備を増やして、ブームに備えた。" }[ch(r, 8)]);
    var evs = [];
    r.steps.forEach(function (s) { s.events.forEach(function (e) { if (e.mood !== "info" && e.id !== "ev_crisis") evs.push(e); }); });
    if (evs.length) t.push("「" + evs.slice(0, 3).map(function (e) { return e.title; }).join("」「") + "」――この10年には、そんな出来事もあった。");
    return t.join("");
  }

  function chapter3(r) {
    var t = [];
    var s9 = stepOf(r, 9);
    t.push("開館5年目、あなたは" + { A: "大型の新展示館の建設", B: "研究・保全活動の強化", C: "スタッフの待遇と設備の改善" }[s9.choice] + "に投資した。");
    s9.notes.forEach(function (n) { t.push(n); });
    var s10 = stepOf(r, 10);
    var modeText = { crisis: "資金繰りが限界に近づくなか、最後に下した決断は", research: "研究成果が注目を集めるなか、最後に下した決断は", strong: "経営が絶好調のなか、最後に下した決断は", normal: "そして開館10年目、最後に下した決断は" }[s10.mode];
    t.push(modeText + "「" + s10.label + "」。");
    s10.notes.forEach(function (n) { t.push(n); });
    return t.join("");
  }

  function biggest(ledger, sign) {
    var items = ledger.filter(function (l) { return sign > 0 ? l.value > 0 : l.value < 0; });
    items.sort(function (x, y) { return Math.abs(y.value) - Math.abs(x.value); });
    return items[0] ? items[0].label : null;
  }

  function finale(r, name) {
    var a = r.aquarium;
    var s = r.finalStats;
    var bad = biggest(r.settlement.ledger, -1);
    var good = biggest(r.settlement.ledger, 1);
    var main = mainShort(a);
    var T = {
      legendary: "人気、飼育環境、スタッフ、信頼。どれか一つではなく、そのすべてを大切にしてきた選択が実を結んだ。" + name + "は、「" + main + "」に会うために遠くから人が訪れる、伝説の水族館として語られるようになった。",
      national: name + "の「" + main + "」は全国的な人気に。" + (good ? good + "が経営を支え、" : "") + "休日には入館待ちの行列ができるほどだ。" + (s.welfare < 60 ? "ただ、混雑の中で生き物たちの暮らしをどう守るかは、これからの課題として残った。" : "それでも生き物たちの暮らしは丁寧に守られている。"),
      paradise: "大きな水族館ではない。でも、" + main + "がのびのび暮らすこの場所を、訪れた人はみんな好きになった。派手な宣伝はしなくても、口コミで少しずつファンが増えていった。",
      research: name + "は観光地としては控えめなまま。けれど、" + (has(r, "loc_campus") ? "近くの大学との共同研究" : "専門スタッフの地道な研究") + "が次々と成果を上げ、世界中の研究者が訪れる海洋研究の聖地になった。",
      conservation: "研究・保全活動への投資が実を結び、" + name + "では絶滅が心配される生き物の繁殖に成功。生まれた命を海へ返す活動は、多くの人の共感を集めた。",
      miracle: "一度は資金が底をつき、閉館もささやかれた。" + (has(r, "rescue") ? "それでも仲間の水族館との提携" : has(r, "shrink_end") ? "それでも規模を縮小して身の丈に合った経営に切り替えたこと" : "それでも最後の決断") + "が流れを変えた。10年目の決算は、まさかの黒字。どん底からの復活劇は、町の語り草になった。",
      community: "全国的に有名なわけではない。でも、" + name + "は町の人たちにとって特別な場所になった。遠足の子どもたち、初デートの二人、三世代でやって来る家族。みんなの思い出の中に、" + main + "がいる。",
      popstruggle: "来館者は毎日いっぱい。なのに、" + (bad ? bad + "が重くのしかかり、" : "") + "なぜか金庫にお金が残らない。人気があるのに苦しいという、ちょっと不思議な経営が続いている。",
      overexpanded: "夢を大きく広げた結果、建物はどんどん大きくなった。けれど" + (bad || "施設の維持費") + "が経営を圧迫。立派な水族館の裏で、館長は今日も電卓とにらめっこしている。",
      staffcrisis: "生き物たちの人気は上々。でも、それを支えるスタッフが足りなかった。" + (has(r, "extended") ? "延長営業の疲れも重なり、" : "") + "休みの取れない日々が続き、運営はぎりぎりの綱渡りになっている。",
      reorg: (bad ? bad + "などが重なり、" : "") + "経営は赤字に。" + name + "の運営は新しい会社へ引き継がれることになった。それでも展示は続き、" + main + "は今日も来館者を迎えている。",
      closure: (s.pop >= 70 ? "来館者はたくさん来てくれた。それでも、" : "") + "10年目の決算は、大きな赤字。" + (bad ? bad + "が最後の決め手となり、" : "") + name + "は閉館を決めた。最後の日、たくさんの人が別れを言いに訪れた。生き物たちは全国の水族館へ引っ越し、新しい場所で元気に暮らしている。",
      steady: "大事件も大ブームもない10年だった。けれど、" + name + "は今日も変わらず扉を開ける。" + main + "を眺めながら、のんびり過ごす常連さんたちがいる。",
    };
    return T[r.endingId];
  }

  function finalScene(r, name) {
    var a = r.aquarium;
    var parts = [];
    if (a.closed) {
      parts.push(LOC[a.location].scene + "に、明かりの消えた" + name + "が静かにたたずんでいる。");
      parts.push("入口には「10年間ありがとうございました」の手書きの貼り紙。");
      return parts.join("");
    }
    var size = ["こぢんまりとした", "ほどよい大きさの", "大きな", "とても大きな"][a.scale];
    parts.push(LOC[a.location].scene + "に建つ、" + size + name + "。");
    if (a.main === "big") parts.push(a.bigFish === "full" ? "大水槽ではジンベエザメがゆったりと旋回している。" : "大型水槽ではエイが優雅に羽ばたいている。");
    if (a.main === "small") parts.push("小さな水槽が並ぶ展示室では、ハゼが巣穴からひょっこり顔を出している。");
    if (a.main === "deep") parts.push("青く暗い展示室で、クラゲたちが光を受けてゆらめいている。");
    if (a.newWing) parts.push("隣には新しい展示館が増えた。");
    if (a.conservation) parts.push("裏手の研究棟では、生き物の繁殖研究が続いている。");
    if (a.alliance) parts.push("連携先の施設とは、生き物と知識の行き来がさかんだ。");
    if (a.reservation) parts.push("予約制のおかげで、館内はいつもゆったりしている。");
    if (a.reorg) parts.push("新しい運営体制のもと、再スタートを切ったところだ。");
    var staff = { veteran: "ベテラン飼育員", rookie: "かつての新人たち", elite: "専門家チーム" }[a.staffStyle];
    parts.push("今日も" + staff + "が、生き物たちの小さな変化を見守っている。");
    return parts.join("");
  }

  function features(r) {
    var a = r.aquarium;
    var list = [LOC[a.location].place, mainShort(a)];
    list.push({ big: "迫力の大水槽", variety: "多種多様な展示", reliable: "安心の設備" }[a.tanks]);
    list.push({ veteran: "ベテラン飼育員", rookie: "成長する新人チーム", elite: "少数精鋭の専門家" }[a.staffStyle]);
    list.push({ high: "高付加価値の入館料", mid: "ふつうの入館料", low: "お手ごろな入館料" }[a.price]);
    if (a.newWing) list.push("新展示館");
    if (a.conservation) list.push("研究・保全棟");
    if (a.reservation) list.push("予約制");
    if (a.alliance) list.push("他館との連携");
    if (a.mega) list.push("大規模拡張");
    if (a.renewed) list.push("最新設備");
    return list;
  }

  function fmtDelta(delta) {
    return E.STAT_KEYS.filter(function (k) { return delta[k]; })
      .map(function (k) { return D.statLabels[k] + (delta[k] > 0 ? " +" : " ") + delta[k]; })
      .concat(delta.debt ? ["借入金 " + (delta.debt > 0 ? "+" : "") + delta.debt] : [])
      .join(" / ");
  }

  var FLAG_WEIGHT = {
    closure: { loan: 12, mega: 10, new_wing: 6, gamble: 10 },
    reorg: { loan: 12, mega: 8, new_wing: 6 },
    miracle: { rescue: 14, shrink_end: 14, loan: 6 },
    overexpanded: { mega: 15, new_wing: 12, big_tanks: 6 },
    staffcrisis: { understaffed: 12, extended: 12, staff_rookie: 6 },
    popstruggle: { price_low: 10, loan: 8, mega: 6 },
    research: { loc_campus: 10, conservation: 10, staff_elite: 8 },
    conservation: { conservation: 15, reliable: 6 },
    paradise: { main_small: 10, loc_nature: 10, reliable: 6 },
    community: { price_low: 8, reservation: 8, keep: 8 },
    legendary: { staff_vet: 6, reliable: 6, expanded_staff: 6 },
    national: { loc_tourist: 8, big_tanks: 8, new_wing: 8 },
    steady: {},
  };

  var STEP_FLAGS = [
    ["loc_tourist", "loc_nature", "loc_campus"], ["main_big", "main_small", "main_deep"], ["big_tanks", "variety", "reliable"],
    ["loan", "downsized", "delayed"], ["staff_vet", "staff_rookie", "understaffed"], ["price_high", "price_mid", "price_low"],
    ["renewed", "paused", "contract"], ["extended", "reservation", "expanded_staff"], ["new_wing", "conservation", "care"], null,
  ];

  function keyDecisions(r) {
    var end = D.endings[r.endingId];
    var fw = FLAG_WEIGHT[r.endingId] || {};
    var scored = r.steps.map(function (s, i) {
      var sc = 0;
      end.keyStats.forEach(function (k) { sc += Math.abs(s.delta[k] || 0) * (k === "fund" ? 0.6 : 1); });
      var f = STEP_FLAGS[i] ? STEP_FLAGS[i]["ABC".indexOf(s.choice)] : null;
      if (i === 9) {
        if (s.choice === "A") f = r.flags.indexOf("gamble") >= 0 ? "gamble" : "mega";
        if (s.choice === "B") f = r.flags.indexOf("shrink_end") >= 0 ? "shrink_end" : "keep";
        if (s.choice === "C") f = r.flags.indexOf("rescue") >= 0 ? "rescue" : "alliance";
      }
      if (f && fw[f]) sc += fw[f];
      sc += s.notes.length * 3;
      return { step: s, score: sc };
    });
    scored.sort(function (x, y) { return y.score - x.score || x.step.round - y.step.round; });
    return scored.slice(0, 3).sort(function (x, y) { return x.step.round - y.step.round; }).map(function (x) {
      var s = x.step;
      return {
        round: s.round,
        title: s.title,
        label: s.label,
        effect: fmtDelta(s.delta),
        reason: s.notes[0] || s.feedback,
      };
    });
  }

  function aquariumName(r) {
    var a = r.aquarium;
    var list = NAMES[a.location][a.main];
    var name = list[E.hash(r.history.join("")) % list.length];
    if (a.main === "big" && a.bigFish !== "full") name = name.replace("ジンベエ", "おおうみ");
    return name;
  }

  function endingTitle(r) {
    var v = TITLE_VARIANTS[r.endingId];
    return (v && v[r.aquarium.main]) || r.ending.title;
  }

  /* 公開関数：結果オブジェクトからテンプレート物語を作る */
  function buildStory(r) {
    var name = aquariumName(r);
    var title = endingTitle(r);
    return {
      source: "template",
      aquariumName: name,
      endingTitle: title,
      endingCategory: r.ending.name,
      tagline: name + "は「" + title + "」に！",
      shortSummary: r.ending.summary,
      chapters: [
        { heading: "第1章　はじまり", text: chapter1(r) },
        { heading: "第2章　運命の転機", text: chapter2(r) },
        { heading: "第3章　次なる挑戦", text: chapter3(r) },
        { heading: "最終章　10年後の水族館", text: finale(r, name) },
      ],
      keyDecisions: keyDecisions(r),
      finalSceneDescription: finalScene(r, name),
      features: features(r),
    };
  }

  M.story = { buildStory: buildStory, fmtDelta: fmtDelta, mainShort: mainShort };
})(typeof window !== "undefined" ? window : globalThis);

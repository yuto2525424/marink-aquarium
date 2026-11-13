/*
 * MARINK AQUARIUM ― ゲーム計算エンジン
 *
 * すべて「初期状態 + 選択履歴」から結果を再計算する純粋関数です。
 * 同じ選択履歴なら、いつ・どこで計算しても同じ結果になります。
 * （ブラウザ・テスト・AIサーバーで同じファイルを共有しています）
 */
(function (g) {
  var M = (g.MARINK = g.MARINK || {});
  var D = M.DATA;
  var STAT_KEYS = ["fund", "pop", "welfare", "staff", "research", "trust"];
  var CHOICES = ["A", "B", "C"];
  var TOTAL_ROUNDS = 10;

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  /* ── 選択履歴の検証 ── */
  function parseHistory(input) {
    var arr = typeof input === "string" ? input.toUpperCase().split("") : input;
    if (!Array.isArray(arr) || arr.length > TOTAL_ROUNDS) return null;
    for (var i = 0; i < arr.length; i++) {
      if (CHOICES.indexOf(arr[i]) < 0) return null;
    }
    return arr.slice();
  }

  /* 10桁の三進数として 0〜59048 の番号を付ける */
  function resultNumber(history) {
    var n = 0;
    for (var i = 0; i < history.length; i++) n = n * 3 + CHOICES.indexOf(history[i]);
    return n;
  }

  function resultId(history) {
    return "MA-" + String(resultNumber(history)).padStart(5, "0") + "-" + history.join("");
  }

  /* 決定的なハッシュ（名前のゆらぎなどに使用。乱数は使わない） */
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function initialState() {
    var s = clone(D.initialStats);
    return { stats: s, flags: {}, minFund: s.fund, crisisSeen: false };
  }

  /* 第10問・危機イベントで使う「経営状況モード」 */
  function modeOf(state) {
    var s = state.stats;
    if (s.fund < 0 || (s.debt > 0 && s.fund < 15)) return "crisis";
    if (s.research >= 78) return "research";
    if (s.fund >= 50 && s.pop >= 65) return "strong";
    return "normal";
  }

  function evalCond(c, state) {
    if (!c) return true;
    if (c.all) return c.all.every(function (x) { return evalCond(x, state); });
    if (c.any) return c.any.some(function (x) { return evalCond(x, state); });
    if (c.flag) return !!state.flags[c.flag];
    if (c.notFlag) return !state.flags[c.notFlag];
    if (c.mode) return modeOf(state) === c.mode;
    if (c.stat) {
      var v = state.stats[c.stat];
      if (c.lt !== undefined && !(v < c.lt)) return false;
      if (c.gte !== undefined && !(v >= c.gte)) return false;
      return true;
    }
    return true;
  }

  /* 効果を適用し、実際に変化した量（クランプ後）を返す */
  function applyEffects(state, effects) {
    var delta = {};
    Object.keys(effects || {}).forEach(function (k) {
      var before = state.stats[k];
      var after = before + effects[k];
      if (k !== "fund" && k !== "debt") after = clamp(after, 0, 100);
      if (k === "debt") after = Math.max(0, after);
      state.stats[k] = after;
      if (after !== before) delta[k] = (delta[k] || 0) + (after - before);
    });
    return delta;
  }

  function mergeDelta(a, b) {
    Object.keys(b).forEach(function (k) { a[k] = (a[k] || 0) + b[k]; });
    return a;
  }

  function trackFund(state, round) {
    if (state.stats.fund < state.minFund) state.minFund = state.stats.fund;
    if (round >= 4 && state.stats.fund < 0) state.crisisSeen = true;
  }

  /* 指定ラウンドの問題を、現在の状態に合わせて組み立てる */
  function resolveRound(state, roundNo) {
    var r = D.rounds[roundNo - 1];
    var title = r.title;
    var description = r.description;
    var options = r.options;
    var mode = null;
    if (r.optionSets) {
      mode = modeOf(state);
      var set = r.optionSets.filter(function (s) { return s.mode === mode; })[0] || r.optionSets[r.optionSets.length - 1];
      title = set.title || title;
      description = set.description || description;
      options = set.options;
    } else if (r.variants) {
      for (var i = 0; i < r.variants.length; i++) {
        if (evalCond(r.variants[i].when, state)) {
          description = r.variants[i].description || description;
          title = r.variants[i].title || title;
          break;
        }
      }
    }
    return {
      id: r.id,
      round: roundNo,
      title: title,
      description: description,
      mode: mode,
      tip: r.tip || null,
      options: CHOICES.map(function (id) {
        var o = options[id];
        return { id: id, label: o.label, pros: o.pros, cons: o.cons, _def: o };
      }),
    };
  }

  function applyEvents(state, roundNo) {
    var fired = [];
    D.events.forEach(function (ev) {
      if (ev.beforeRound !== roundNo) return;
      if (!evalCond(ev.when, state)) return;
      var delta = applyEffects(state, ev.effects);
      (ev.addFlags || []).forEach(function (f) { state.flags[f] = true; });
      if (ev.id === "ev_crisis") state.crisisSeen = true;
      fired.push({ id: ev.id, title: ev.title, text: ev.text, mood: ev.mood, delta: delta });
    });
    trackFund(state, roundNo);
    return fired;
  }

  function applyChoice(state, resolved, choiceId) {
    var o = resolved.options[CHOICES.indexOf(choiceId)]._def;
    var notes = [];
    // 条件付き効果は「選ぶ前の状態」で判定する
    var conds = (o.conditional || []).filter(function (c) { return evalCond(c.when, state); });
    var delta = applyEffects(state, o.effects);
    (o.flags || []).forEach(function (f) { state.flags[f] = true; });
    (o.removeFlags || []).forEach(function (f) { delete state.flags[f]; });
    conds.forEach(function (c) {
      mergeDelta(delta, applyEffects(state, c.effects));
      (c.addFlags || []).forEach(function (f) { state.flags[f] = true; });
      (c.removeFlags || []).forEach(function (f) { delete state.flags[f]; });
      if (c.note) notes.push(c.note);
    });
    if (o.debtMultiplier !== undefined) {
      var before = state.stats.debt;
      state.stats.debt = Math.round(before * o.debtMultiplier);
      if (state.stats.debt !== before) delta.debt = (delta.debt || 0) + (state.stats.debt - before);
      notes.push("提携先の支援で、借入金の負担が軽くなった。");
    }
    trackFund(state, resolved.round);
    return { delta: delta, notes: notes, feedback: o.feedback, tip: o.tip || resolved.tip || null, label: o.label };
  }

  /* 10年間の決算（第10問のあと） */
  function settle(state) {
    var s = state.stats;
    var f = state.flags;
    var ledger = [];
    var startFund = s.fund;

    var op = Math.round((s.pop - 50) * 0.7 + (s.staff - 50) * 0.2 + (s.trust - 50) * 0.2);
    ledger.push({ label: "10年間の営業収支", value: op });
    s.fund += op;

    if (f.contract) { s.fund -= 10; ledger.push({ label: "設備保守契約の費用", value: -10 }); }
    if (f.alliance) { s.fund += 6; ledger.push({ label: "連携による経費の分担", value: 6 }); }
    if (f.mega) {
      if (s.pop >= 70 && s.staff >= 50) { s.fund += 10; ledger.push({ label: "拡張エリアの入館収入", value: 10 }); }
      else { s.fund -= 20; ledger.push({ label: "拡張した施設の維持費", value: -20 }); }
    }
    if (f.new_wing && s.staff < 45) { s.fund -= 8; ledger.push({ label: "新展示館の運営コスト", value: -8 }); }
    if (s.debt > 0) {
      var repay = Math.round(s.debt * 1.2);
      s.fund -= repay;
      ledger.push({ label: "借入金の返済（利子込み）", value: -repay });
      s.debt = 0;
    }
    if (s.welfare < 40) {
      s.trust = clamp(s.trust - 10, 0, 100);
      ledger.push({ label: "飼育環境への心配の声", value: 0, stat: "trust", statValue: -10 });
    }
    if (s.staff < 30) {
      s.welfare = clamp(s.welfare - 5, 0, 100);
      ledger.push({ label: "人手不足で世話が行き届かない", value: 0, stat: "welfare", statValue: -5 });
    }
    if (s.fund < state.minFund) state.minFund = s.fund;
    return { ledger: ledger, startFund: startFund, endFund: s.fund };
  }

  /* エンディング判定（AIではなく、ここで確定させる） */
  function decideEnding(state) {
    var s = state.stats;
    var f = state.flags;
    var closing = s.fund < -30 || (s.fund < -10 && (s.trust < 48 || s.pop < 48));
    var loopish = Math.abs(s.fund - 100) <= 45 && ["pop", "welfare", "staff", "research", "trust"].every(function (k) { return Math.abs(s[k] - 50) <= 24; });

    // ── 赤字・閉館まわり ──
    if (s.fund < -30 && s.welfare < 50) return "worst";            // ⑨ 考えられる限り最悪
    if (f.conservation && s.research >= 80 && s.fund < -5) return "badtrue";        // ⑱ 真相に気づいたが資金が尽きた
    if (closing && s.welfare >= 68 && s.trust >= 58) return "tragic";               // ⑲ 誠実でも避けられなかった
    if (closing) return "closure";                                                  // ⑬ 閉館
    if (f.gamble && s.fund < 15) return "open";                                     // ⑫ 大勝負の結果はまだ不明
    if (f.mega && s.fund < 0 && s.pop >= 72) return "merrybad";                     // ③ 館長だけはご満悦
    if (s.fund < 0) return "reorg";                                                 // ② 事業再編

    // ── 特別な結末 ──
    if (f.bigfish_full && f.conservation && s.welfare >= 62 && s.trust >= 60) return "secret";                 // ⑰ ジンベエザメの里帰り
    if (f.conservation && (f.reliable || f.renewed) && s.welfare >= 72 && s.research >= 85 && s.trust >= 70) return "true"; // ⑤ 本当の役目
    if (f.rescue && s.fund < 50) return "merger";                                  // ② 提携先に吸収合併
    if (state.crisisSeen && f.shrink_end && s.fund >= 10) return "rebornsmall";   // ⑪ 小さく再出発
    if (state.crisisSeen && f.rescue && s.fund >= 10) return "thanks";             // ⑪ 仲間に救われた
    if (state.crisisSeen && s.fund >= 10) return "miracle";                         // ⑪ どん底からの再建
    if (f.price_low && f.extended && s.staff < 55 && s.pop >= 70) return "chaos";   // ⑮ 大混乱
    if (f.main_big && !f.bigfish_full && s.pop >= 75 && s.fund >= 0) return "gag";  // ⑳ ジンベエザメ近日公開
    if (loopish) return "loop";                                                     // ⑯ 振り出しに戻る
    if (s.research >= 92 && s.pop < 40) return "labonly";                           // ③ 研究所になった水族館
    if (f.bigfish_full && s.pop >= 78 && s.welfare < 62 && s.research < 55) return "onehit"; // ④ ジンベエザメ頼み
    if (s.fund >= 85 && s.pop < 48) return "richempty";                               // ③ お金だけはある
    if (f.price_high && s.pop < 45 && s.fund < 40) return "pricey";                   // ④ 高すぎた入館料
    if (f.reservation && s.pop < 45) return "emptyres";                               // ④ 予約が埋まらない
    if ((f.mega || f.new_wing) && s.fund < 20 && s.pop >= 55) return "overexpanded";
    if (f.staff_vet && s.staff < 45) return "vetleave";                               // ④ ベテランが去った
    if (f.staff_elite && s.staff < 38 && s.research >= 60) return "burnout";                              // ④ 燃え尽き
    if (f.contract && s.staff < 48 && s.welfare < 60) return "outsourced";            // ④ 業者まかせ
    if (s.staff < 32 || (f.overworked && s.staff < 45)) return "staffcrisis";
    if (s.pop >= 72 && s.fund < 25) return "popstruggle";
    if (f.alliance && s.pop >= 75 && s.welfare >= 70 && s.staff >= 65 && s.trust >= 68 && s.fund >= 35 && s.research >= 75) return "worldbest"; // ⑥ 世界一
    if (s.pop >= 75 && s.welfare >= 70 && s.staff >= 65 && s.trust >= 68 && s.fund >= 35 && s.research >= 55) return "legendary";
    if (f.delayed && s.fund >= 60 && s.pop >= 66 && s.welfare >= 64) return "delayedwin";                 // ① 待った甲斐
    if (f.bigfish_full && s.pop >= 72 && s.fund >= 25 && s.welfare >= 62) return "whalecity";             // ① ジンベエザメの聖地
    if (f.loc_campus && f.staff_elite && s.research >= 90 && s.welfare >= 55) return "discovery";               // ① 新種発見
    if (f.main_deep && s.research >= 92 && s.welfare >= 50) return "deepbase";                             // ① 深海探査の拠点
    if (s.research >= 95 && s.welfare >= 50 && (f.loc_campus || f.staff_elite || f.conservation)) return "research";
    if (f.conservation && s.welfare >= 75 && s.pop < 55) return "hospital";                                // ⑦ 海の生き物病院
    if (f.conservation && s.research >= 72 && s.trust >= 66 && s.welfare >= 62) return "conservation";
    if (f.staff_rookie && f.care && s.staff >= 72 && s.trust >= 58) return "successor";                      // ① 新人が館長に
    if (f.alliance && s.trust >= 72 && s.research >= 62 && s.fund >= 10) return "sister";                     // ⑦ 姉妹館
    if (f.extended && f.main_deep && s.pop >= 68 && s.staff >= 45 && s.fund >= 10) return "night";             // ⑦ 夜の水族館
    if (f.reservation && f.price_high && s.pop >= 60 && s.fund >= 20) return "phantom";                       // ⑦ 幻の水族館
    if (f.staff_vet && f.care && s.welfare >= 80 && s.pop < 68) return "artisan";                             // ⑦ 職人の名館
    if (f.loc_nature && s.welfare >= 65 && s.trust >= 65 && s.pop < 75) return "satoumi";                  // ⑦ 里海
    if (f.main_small && f.downsized && s.welfare >= 60 && s.pop < 75) return "treasure";                   // ⑦ 小さな宝箱
    if ((f.main_small || f.loc_nature) && s.welfare >= 65 && s.pop < 75) return "paradise";
    if (f.price_low && s.trust >= 68 && s.pop < 78) return "classroom";                                    // ⑦ 子どもたちの教室
    if (s.trust >= 72 && s.pop < 78) return "community";
    if (f.main_deep && s.pop >= 72 && s.fund >= 25) return "jellycity";                                    // ① クラゲの都
    if (f.main_small && s.pop >= 72 && s.fund >= 25) return "gobystar";                                    // ⑳ ハゼが国民的スター
    if (f.loc_tourist && s.pop >= 72 && s.fund >= 25) return "landmark";                                   // ⑦ 観光名所
    if (s.pop >= 72 && s.fund >= 25) return "national";
    if (s.trust >= 62) return "community";
    return "steady";
  }

  /* 結果画面・イラスト用の「水族館の構成」 */
  /* 建物の傷み 0:ぴかぴか 〜 10:廃墟。結末の重さ＋最終ステータスで決まる */
  var CLOSED = ["closure", "worst", "tragic", "badtrue"];
  var DAMAGE_BASE = {
    miracle: 2, rebornsmall: 2, thanks: 2, steady: 1, loop: 2, gag: 1, chaos: 3, onehit: 3, labonly: 3, richempty: 3, outsourced: 3,
    pricey: 4, emptyres: 4, vetleave: 4, burnout: 4, popstruggle: 4, staffcrisis: 4, overexpanded: 4,
    open: 5, merrybad: 5, reorg: 6, merger: 6, badtrue: 8, tragic: 8, closure: 8, worst: 9,
  };
  function damageLevel(id, s) {
    var base = DAMAGE_BASE[id] || 0;
    if (!base) return s.staff < 50 || s.welfare < 55 ? 1 : 0;
    var lv = base + (s.fund < -40 ? 1 : 0) + (s.staff < 35 ? 1 : 0) + (s.welfare < 40 ? 1 : 0) - (s.trust >= 75 ? 1 : 0);
    if (CLOSED.indexOf(id) >= 0) return clamp(lv, 8, 10);
    return clamp(lv, 1, 7);
  }

  function aquariumConfig(state, endingId) {
    var f = state.flags;
    var s = state.stats;
    var scale = 1;
    if (f.big_tanks) scale += 1;
    if (f.downsized) scale -= 1;
    if (f.new_wing) scale += 1;
    if (f.mega) scale += 1;
    if (f.shrink_end) scale -= 1;
    scale = clamp(scale, 0, 3);
    return {
      location: f.loc_tourist ? "tourist" : f.loc_nature ? "nature" : "campus",
      main: f.main_big ? "big" : f.main_small ? "small" : "deep",
      bigFish: f.main_big ? (f.bigfish_full ? "full" : "planned") : null,
      tanks: f.big_tanks ? "big" : f.variety ? "variety" : "reliable",
      staffStyle: f.staff_vet ? "veteran" : f.staff_rookie ? "rookie" : "elite",
      price: f.price_high ? "high" : f.price_low ? "low" : "mid",
      scale: scale,
      newWing: !!f.new_wing,
      lab: !!(f.conservation || f.loc_campus),
      conservation: !!f.conservation,
      alliance: !!f.alliance,
      mega: !!f.mega,
      reservation: !!f.reservation,
      renewed: !!f.renewed,
      care: !!f.care,
      closed: CLOSED.indexOf(endingId) >= 0,
      gag: endingId === "gag",
      endingId: endingId,
      damage: damageLevel(endingId, s),
      reorg: endingId === "reorg",
      crowd: clamp(Math.round((s.pop - 20) / 8), 0, 10),
      mood: D.endings[endingId].mood,
    };
  }

  /*
   * メイン関数：選択履歴から全体を再計算する
   * history が10未満なら、次の問題（とその前のイベント）も返す
   */
  function simulate(input) {
    var history = parseHistory(input);
    if (!history) throw new Error("不正な選択履歴です: " + input);
    var state = initialState();
    var steps = [];
    for (var i = 0; i < history.length; i++) {
      var roundNo = i + 1;
      var events = applyEvents(state, roundNo);
      var q = resolveRound(state, roundNo);
      var res = applyChoice(state, q, history[i]);
      steps.push({
        round: roundNo,
        questionId: q.id,
        title: q.title,
        mode: q.mode,
        choice: history[i],
        label: res.label,
        delta: res.delta,
        notes: res.notes,
        feedback: res.feedback,
        tip: res.tip,
        events: events,
        statsAfter: clone(state.stats),
      });
    }

    var out = { history: history, steps: steps, state: state };
    if (history.length < TOTAL_ROUNDS) {
      var probe = { stats: clone(state.stats), flags: clone(state.flags), minFund: state.minFund, crisisSeen: state.crisisSeen };
      var nextEvents = applyEvents(probe, history.length + 1);
      var nq = resolveRound(probe, history.length + 1);
      out.next = {
        round: history.length + 1,
        events: nextEvents,
        question: {
          id: nq.id, round: nq.round, title: nq.title, description: nq.description, mode: nq.mode,
          options: nq.options.map(function (o) {
            // お金の動き（目安）：今の状況で当てはまる条件付き効果も含めて計算
            var fund = o._def.effects.fund || 0, debt = o._def.effects.debt || 0;
            (o._def.conditional || []).forEach(function (c) {
              if (evalCond(c.when, probe)) { fund += (c.effects && c.effects.fund) || 0; debt += (c.effects && c.effects.debt) || 0; }
            });
            return { id: o.id, label: o.label, pros: o.pros, cons: o.cons, fund: fund, debt: debt, debtMultiplier: o._def.debtMultiplier };
          }),
        },
      };
      out.stats = probe.stats;
      return out;
    }

    var settlement = settle(state);
    var endingId = decideEnding(state);
    out.settlement = settlement;
    out.endingId = endingId;
    out.ending = D.endings[endingId];
    out.finalStats = clone(state.stats);
    out.flags = Object.keys(state.flags).filter(function (k) { return state.flags[k]; }).sort();
    out.crisisSeen = state.crisisSeen;
    out.aquarium = aquariumConfig(state, endingId);
    out.resultId = resultId(history);
    out.resultNumber = resultNumber(history);
    out.version = D.version;
    return out;
  }

  M.engine = {
    VERSION: D.version,
    STAT_KEYS: STAT_KEYS,
    CHOICES: CHOICES,
    TOTAL_ROUNDS: TOTAL_ROUNDS,
    parseHistory: parseHistory,
    resultId: resultId,
    resultNumber: resultNumber,
    hash: hash,
    evalCond: evalCond,
    modeOf: modeOf,
    simulate: simulate,
  };
})(typeof window !== "undefined" ? window : globalThis);

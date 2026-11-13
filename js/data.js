/*
 * MARINK AQUARIUM ― 運命の館長
 * ゲームデータ（質問・選択肢・イベント・エンディング）
 *
 * このファイルは「データだけ」を持ちます。計算は engine.js が行います。
 * 文章や数値を調整したいときは、このファイルだけを編集してください。
 *
 * effects のキー:
 *   fund 資金余力 / pop 集客力 / welfare 飼育環境 / staff スタッフ体制
 *   research 研究・教育 / trust 社会的信頼 / debt 借入金
 * 条件(when)の書き方:
 *   {flag:"x"} {notFlag:"x"} {stat:"fund", lt:30} {stat:"pop", gte:70}
 *   {all:[...]} {any:[...]} {mode:"crisis"}
 */
(function (g) {
  var M = (g.MARINK = g.MARINK || {});

  M.DATA = {
    version: "1.0.0",

    statLabels: {
      fund: "資金余力",
      pop: "集客力",
      welfare: "飼育環境",
      staff: "スタッフ体制",
      research: "研究・教育",
      trust: "社会的信頼",
    },

    initialStats: { fund: 100, pop: 50, welfare: 50, staff: 50, research: 50, trust: 50, debt: 0 },

    /* 具体的な数字での表示ルール
     * 資金余力・借入金：1ポイント = 1億円（スタートは100億円）
     * 集客力：1ポイント = 年間来館者 2万人（集客力50 = 年間100万人） */
    money: { perPoint: 1, unit: "億円" },
    visitors: { perPoint: 2, min: 5, unit: "万人" },

    /* ───────────── 全10ラウンド ───────────── */
    rounds: [
      /* 第1問 */
      {
        id: "q1",
        round: 1,
        title: "水族館をどこに建てる？",
        description: "ついに水族館の建設が決まった！ でも、選べる土地は1か所だけ。",
        options: {
          A: {
            label: "人気観光地の海沿い",
            pros: "年中観光客が多く、集客しやすい",
            cons: "土地代が周辺相場の約3倍",
            effects: { fund: -30, pop: 15, research: -5 },
            flags: ["loc_tourist"],
            feedback: "観光客でにぎわう海沿いに決定！ 土地代の請求書には、ちょっとドキッ。",
          },
          B: {
            label: "静かで自然豊かな海辺",
            pros: "海がきれいで、土地も安い",
            cons: "最寄り駅からバスで40分",
            effects: { fund: -10, pop: -10, welfare: 10, trust: 5 },
            flags: ["loc_nature"],
            feedback: "聞こえるのは波の音だけ。生き物たちも落ち着いて暮らせそう。",
          },
          C: {
            label: "大学や研究所が集まる街",
            pros: "大学と共同研究ができる",
            cons: "観光客が少ない地域",
            effects: { fund: -20, research: 15, pop: -5 },
            flags: ["loc_campus"],
            feedback: "白衣の研究者たちがご近所さんに。学びの水族館になりそう！",
          },
        },
      },

      /* 第2問 */
      {
        id: "q2",
        round: 2,
        title: "水族館の主役は？",
        description: "メイン展示は、水族館の“顔”になる。",
        variants: [
          { when: { flag: "loc_tourist" }, description: "観光客の心をつかむ、水族館の“顔”を決めよう。" },
          { when: { flag: "loc_nature" }, description: "自然の海辺に似合う、水族館の“顔”を決めよう。" },
          { when: { flag: "loc_campus" }, description: "研究者たちも興味津々。水族館の“顔”を決めよう。" },
        ],
        options: {
          A: {
            label: "大型魚の迫力展示",
            pros: "ジンベエザメ級の展示で話題性大",
            cons: "水量数千トンの巨大水槽が必要",
            effects: { fund: -25, pop: 15, welfare: -5 },
            flags: ["main_big"],
            feedback: "目指すは海の巨人たちが泳ぐ水族館！ ただし巨大な水槽が必要だ。",
            tip: "ジンベエザメは世界最大の魚。全長10mを超えることもあり、飼育には巨大な水槽が欠かせません。",
          },
          B: {
            label: "個性派の小さな魚たち",
            pros: "ハゼやギンポなど数百種を展示",
            cons: "小さくて見落とされがち",
            effects: { fund: -5, pop: -5, research: 6, welfare: 5 },
            flags: ["main_small"],
            feedback: "主役は小さな名脇役たち。よく見ると、みんな表情豊か！",
            tip: "ハゼの仲間は日本だけでも数百種。テッポウエビと巣穴をシェアして暮らす種もいます。",
          },
          C: {
            label: "クラゲと深海の幻想展示",
            pros: "写真映えして若い世代に人気",
            cons: "冷却・水流の特殊設備が必要",
            effects: { fund: -15, pop: 10, research: 5, staff: -5 },
            flags: ["main_deep"],
            feedback: "ふわふわ漂うクラゲと、ふしぎな深海生物。幻想の世界へようこそ。",
            tip: "クラゲは泳ぐ力が弱く、水の流れがないと沈んでしまいます。そのため専用の円形水槽で飼育します。",
          },
        },
      },

      /* 第3問 */
      {
        id: "q3",
        round: 3,
        title: "限られた予算、どこに使う？",
        description: "建設予算には限りがある。いちばん大切にしたいのは？",
        variants: [
          { when: { flag: "main_big" }, description: "大型魚を迎えるには巨大水槽が欠かせない。でも予算には限りが…。" },
          { when: { flag: "main_deep" }, description: "冷却装置に水流装置。深海展示はなにかとお金がかかる…。" },
          { when: { flag: "main_small" }, description: "小さな水槽をいくつ並べる？ 予算の使い道を決めよう。" },
        ],
        options: {
          A: {
            label: "水槽の大きさと迫力",
            pros: "大型アクリルパネルで迫力満点",
            cons: "アクリルは1枚数億円することも",
            effects: { fund: -20, pop: 12, welfare: -3 },
            flags: ["big_tanks"],
            conditional: [
              {
                when: { flag: "main_big" },
                effects: { pop: 8, welfare: 6 },
                addFlags: ["bigfish_full"],
                note: "ジンベエザメがゆったり泳げる大水槽が完成！",
              },
            ],
            feedback: "目の前いっぱいに広がる大水槽！ 来館者の歓声が聞こえてきそう。",
          },
          B: {
            label: "展示する生き物の種類",
            pros: "300種以上の図鑑のような館に",
            cons: "水槽が増えて世話が大変",
            effects: { fund: -10, research: 5, pop: 6, staff: -8 },
            flags: ["variety"],
            feedback: "水槽ごとに違う世界。図鑑の中を歩いているみたい！",
          },
          C: {
            label: "設備の信頼性と飼育環境",
            pros: "ろ過装置と予備電源を二重化",
            cons: "見た目は地味になる",
            effects: { fund: -12, welfare: 15, pop: -5, trust: 3 },
            flags: ["reliable"],
            feedback: "見えない所こそ丁寧に。ろ過装置も水温管理も万全だ。",
          },
        },
      },

      /* 第4問 */
      {
        id: "q4",
        round: 4,
        title: "開館直前、まさかの資金不足！",
        description: "工事費が想定を上回ってしまった！ 開館まであとわずか。",
        variants: [
          { when: { stat: "fund", lt: 30 }, description: "工事費が想定を大きく上回った！ 金庫はほぼ空っぽ…。" },
          { when: { flag: "big_tanks" }, description: "巨大水槽の工事費がふくらみ、予算オーバー！ 開館まであとわずか。" },
        ],
        options: {
          A: {
            label: "融資を受けて予定通り開館",
            pros: "予定どおりオープンできる",
            cons: "金利年2%・10年で利子約8億円",
            effects: { fund: 40, debt: 40, pop: 3 },
            flags: ["loan"],
            feedback: "銀行の融資で、なんとか予定どおり開館へ。返済は未来の自分に託す…！",
          },
          B: {
            label: "展示を縮小して開館",
            pros: "出費をおさえられる",
            cons: "展示エリアが約2割減る",
            effects: { fund: 15, pop: -8 },
            flags: ["downsized"],
            conditional: [
              {
                when: { flag: "bigfish_full" },
                effects: { pop: -6 },
                removeFlags: ["bigfish_full"],
                note: "ジンベエザメの受け入れは、将来の計画として見送ることに…。",
              },
              {
                when: { all: [{ flag: "big_tanks" }, { notFlag: "main_big" }] },
                effects: { pop: -3 },
                note: "自慢の大水槽は、ひとまわり小さくなった。",
              },
            ],
            feedback: "身の丈に合わせて展示をスリムに。無理をしないのも館長の仕事。",
          },
          C: {
            label: "開館を延期して資金集め",
            pros: "寄付や協賛金を集められる",
            cons: "開館が半年遅れ、期待が冷める",
            effects: { fund: 25, pop: -6, trust: -4, staff: 5 },
            flags: ["delayed"],
            feedback: "開館は半年延期。その間にスタッフの研修をじっくり進めることに。",
          },
        },
      },

      /* 第5問 */
      {
        id: "q5",
        round: 5,
        title: "飼育員を採用しよう！",
        description: "生き物の命を預かるのはスタッフたち。採用予算は限られている。",
        variants: [
          { when: { flag: "main_deep" }, description: "クラゲや深海生物の飼育には、特別な技術が必要だ。誰を採用する？" },
          { when: { flag: "variety" }, description: "たくさんの水槽を世話する人手が必要だ。誰を採用する？" },
          { when: { flag: "main_big" }, description: "大型魚の健康管理には、確かな経験がものを言う。誰を採用する？" },
        ],
        options: {
          A: {
            label: "経験豊富なベテラン",
            pros: "経験20年以上の10人体制",
            cons: "給料が高く、人件費がかさむ",
            effects: { fund: -20, staff: 15, welfare: 10 },
            flags: ["staff_vet"],
            feedback: "その道30年の大ベテランが仲間に。生き物たちの顔色が、なんだか良くなった。",
          },
          B: {
            label: "新人をたくさん採用",
            pros: "新卒など30人を採用できる",
            cons: "一人前になるまで約3年",
            effects: { fund: -8, staff: -5, welfare: -3, trust: 3 },
            flags: ["staff_rookie"],
            feedback: "フレッシュな新人がずらり！ 失敗も多いけれど、やる気は満点。",
          },
          C: {
            label: "少数精鋭の専門チーム",
            pros: "博士号を持つ専門家5人",
            cons: "少人数で休みが取りにくい",
            effects: { fund: -14, staff: 3, research: 8, welfare: 5 },
            flags: ["staff_elite", "understaffed"],
            conditional: [
              {
                when: { flag: "main_deep" },
                effects: { welfare: 8 },
                note: "深海のプロが加わり、繊細な生き物たちも元気に。",
              },
              {
                when: { flag: "variety" },
                effects: { staff: -8 },
                note: "水槽の数に対して、人手がまったく足りない…。",
              },
            ],
            feedback: "博士号を持つ専門家チームが結成！ ただし、全員いつも大忙し。",
          },
        },
      },

      /* 第6問 */
      {
        id: "q6",
        round: 6,
        title: "ついに開館！ 入館料はいくら？",
        description: "いよいよオープン！ 入館料しだいで経営は大きく変わる。",
        variants: [
          { when: { flag: "delayed" }, description: "待ちに待った開館の日！ 入館料しだいで経営は大きく変わる。" },
          { when: { flag: "loc_tourist" }, description: "観光客なら少し高くても来てくれる…かも？ 入館料を決めよう。" },
          { when: { flag: "loc_nature" }, description: "アクセスが不便な分、価格で来館を後押しする？ 入館料を決めよう。" },
        ],
        options: {
          A: {
            label: "高めの価格（大人3,500円）",
            pros: "1人あたりの収入が多い",
            cons: "家族連れには高く感じる",
            effects: { fund: 18, pop: -8, trust: -3 },
            flags: ["price_high"],
            conditional: [
              {
                when: { flag: "loc_tourist" },
                effects: { fund: 8, pop: 5 },
                note: "旅行の思い出にと、観光客には好評！",
              },
            ],
            feedback: "ゆったり上質な水族館体験を。お客さんの満足度は高そう。",
          },
          B: {
            label: "ふつうの価格（大人2,400円）",
            pros: "全国の水族館の平均的な価格",
            cons: "強い個性は出にくい",
            effects: { fund: 10, pop: 4 },
            flags: ["price_mid"],
            feedback: "大人も子どもも来やすい、ちょうどいい価格に。",
          },
          C: {
            label: "お手ごろ価格（大人1,500円）",
            pros: "家族連れが気軽に来られる",
            cons: "混雑し、1人あたりの収入は少ない",
            effects: { fund: -2, pop: 15, trust: 8, staff: -5 },
            flags: ["price_low"],
            feedback: "週末は家族連れで大にぎわい！ スタッフはちょっとバタバタ。",
          },
        },
      },

      /* 第7問 */
      {
        id: "q7",
        round: 7,
        title: "突然のトラブル発生！",
        description: "開館から3年。設備に重大な不具合が見つかった！",
        variants: [
          { when: { flag: "bigfish_full" }, description: "開館から3年。大水槽のろ過ポンプに重大な不具合が！ ジンベエザメの健康にも関わる。" },
          { when: { flag: "main_big" }, description: "開館から3年。大型魚水槽の生命維持装置に、重大な不具合が見つかった！" },
          { when: { flag: "main_small" }, description: "開館から3年。たくさん並んだ小さな水槽のろ過装置が、次々と不調に…！" },
          { when: { flag: "main_deep" }, description: "開館から3年。クラゲ水槽の水流装置と、深海水槽の冷却装置が故障寸前！" },
        ],
        options: {
          A: {
            label: "設備を全面リニューアル",
            pros: "最新設備で15年は安心",
            cons: "工事中は一部の展示が止まる",
            effects: { fund: -28, welfare: 15, trust: 5 },
            flags: ["renewed"],
            conditional: [
              {
                when: { flag: "reliable" },
                effects: { fund: 12 },
                note: "もともと丈夫な設備を選んでいたので、工事費が安くすんだ。",
              },
            ],
            feedback: "思い切って最新設備へ。生き物たちの安全が最優先！",
          },
          B: {
            label: "展示を休止して修繕",
            pros: "安全第一で確実に直す",
            cons: "約3か月、展示が減る",
            effects: { fund: -10, pop: -8, welfare: 6, trust: 5 },
            flags: ["paused"],
            conditional: [
              {
                when: { flag: "understaffed" },
                effects: { staff: -5 },
                note: "少人数での修繕作業は、とても大変だった…。",
              },
            ],
            feedback: "「ただいま修理中」の看板を出して、ひとつずつ確実に直していく。",
          },
          C: {
            label: "専門業者と長期保守契約",
            pros: "24時間の監視と修理つき",
            cons: "毎年約1億円の契約料",
            effects: { fund: -8, welfare: 10, staff: 5 },
            flags: ["contract"],
            feedback: "設備のプロと長期契約。スタッフは生き物の世話に集中できる。",
          },
        },
        tip: "水族館の水槽では、ろ過装置が24時間休まず水をきれいにしています。止まると生き物の命に関わります。",
      },

      /* 第8問 */
      {
        id: "q8",
        round: 8,
        title: "水族館がSNSで大バズり！",
        description: "来館者が一気に増えた！ このチャンスをどう生かす？",
        variants: [
          { when: { all: [{ flag: "price_low" }, { flag: "main_deep" }] }, description: "クラゲの写真がSNSで大バズり！ 入館料の安さもあって来館者が殺到中！" },
          { when: { all: [{ flag: "price_low" }, { flag: "main_small" }] }, description: "「変顔のハゼ」動画がSNSで大バズり！ 入館料の安さもあって来館者が殺到中！" },
          { when: { all: [{ flag: "price_low" }, { flag: "main_big" }] }, description: "大水槽の前の写真がSNSで大バズり！ 入館料の安さもあって来館者が殺到中！" },
          { when: { flag: "main_deep" }, description: "幻想的なクラゲの写真がSNSで大バズり！ 来館者が一気に増えた！" },
          { when: { flag: "main_small" }, description: "「変顔のハゼ」動画がSNSで大バズり！ 来館者が一気に増えた！" },
          { when: { flag: "main_big" }, description: "大水槽の前で撮った写真がSNSで大バズり！ 来館者が一気に増えた！" },
        ],
        options: {
          A: {
            label: "営業時間を夜21時まで延長",
            pros: "夜の水族館で売上アップ",
            cons: "残業が増え、スタッフが疲れる",
            effects: { fund: 18, pop: 8, staff: -12, welfare: -4 },
            flags: ["extended"],
            conditional: [
              {
                when: { flag: "understaffed" },
                effects: { staff: -8, welfare: -6 },
                note: "少数精鋭チームは、すっかり疲れ切ってしまった…。",
              },
            ],
            feedback: "夜の水族館も大人気！ ただ、スタッフの目の下にはクマが…。",
          },
          B: {
            label: "予約制で混雑を管理",
            pros: "1時間ごとの入場人数を制限",
            cons: "チケットが取れない人も",
            effects: { fund: 5, pop: -3, trust: 10, welfare: 5 },
            flags: ["reservation"],
            feedback: "予約制で、どの時間もゆったり。生き物たちもストレス少なめ。",
          },
          C: {
            label: "スタッフと設備を増強",
            pros: "スタッフを20人増員",
            cons: "人件費と設備費が先にかかる",
            effects: { fund: -18, staff: 15, pop: 5 },
            flags: ["expanded_staff"],
            removeFlags: ["understaffed"],
            feedback: "仲間を増やして、ブームを一過性で終わらせない体制づくり！",
          },
        },
      },

      /* 第9問 */
      {
        id: "q9",
        round: 9,
        title: "開館から5年。次なる挑戦！",
        description: "水族館は次の成長段階へ。どこに投資する？",
        variants: [
          { when: { stat: "fund", lt: 10 }, description: "開館から5年。資金はぎりぎり…それでも次の一手を決めなければ。" },
          { when: { stat: "pop", gte: 72 }, description: "開館から5年。人気は絶好調！ 次はどこに投資する？" },
        ],
        options: {
          A: {
            label: "大型の新展示館を建設",
            pros: "新館オープンで話題性バツグン",
            cons: "完成まで約2年かかる",
            effects: { fund: -32, pop: 16 },
            flags: ["new_wing"],
            conditional: [
              {
                when: { all: [{ flag: "main_big" }, { notFlag: "bigfish_full" }] },
                effects: { pop: 5 },
                addFlags: ["bigfish_full"],
                note: "新展示館の巨大水槽で、ついにジンベエザメを迎えられることに！",
              },
            ],
            feedback: "新しい展示館の建設がスタート！ 完成予想図に、町中がわくわく。",
          },
          B: {
            label: "研究・保全活動を強化",
            pros: "絶滅危惧種の繁殖研究に挑戦",
            cons: "観光の目玉にはなりにくい",
            effects: { fund: -14, research: 15, trust: 8, pop: -3 },
            flags: ["conservation"],
            conditional: [
              { when: { flag: "loc_campus" }, effects: { research: 8 }, note: "近くの大学との共同研究が一気に進んだ！" },
              { when: { flag: "staff_elite" }, effects: { research: 5 }, note: "専門家チームの論文が学会で話題に。" },
            ],
            feedback: "絶滅が心配される生き物の繁殖研究をスタート。地道だけれど大切な一歩。",
          },
          C: {
            label: "スタッフ待遇と設備を改善",
            pros: "給料アップと休憩室の改装",
            cons: "目に見える変化は少ない",
            effects: { fund: -14, staff: 15, welfare: 8, trust: 3 },
            flags: ["care"],
            removeFlags: ["overworked"],
            conditional: [
              { when: { flag: "staff_rookie" }, effects: { staff: 5 }, note: "育ててきた新人たちが、頼れる中堅に育った。" },
            ],
            feedback: "休憩室をリフォームし、お給料もアップ。スタッフの笑顔が増えた。",
          },
        },
      },

      /* 第10問（状況によって選択肢そのものが変わる） */
      {
        id: "q10",
        round: 10,
        title: "館長として、最後の決断",
        description: "開館から10年。あなたの水族館に、最後の大きな決断が待っていた。",
        optionSets: [
          {
            mode: "crisis",
            title: "館長として、最後の決断 ― 再建",
            description: "開館から10年。資金繰りは限界に近い…。水族館を守るための、再建の決断を。",
            options: {
              A: {
                label: "大型投資で一発逆転を狙う",
                pros: "成功すれば一気に回復",
                cons: "失敗すれば後がない",
                effects: { fund: -30, pop: 14, trust: -5 },
                flags: ["mega", "gamble"],
                feedback: "最後の大勝負！ 新しい目玉展示に、すべてを賭ける。",
              },
              B: {
                label: "規模を縮小し、身の丈経営へ",
                pros: "確実に立て直せる",
                cons: "展示は小さくなる",
                effects: { fund: 25, pop: -8, trust: 8, welfare: 3 },
                flags: ["shrink_end"],
                feedback: "展示をしぼり、ひとつひとつを大切に。小さくても、ここに残る。",
              },
              C: {
                label: "他の水族館と提携して再建",
                pros: "借金の負担が軽くなる",
                cons: "経営の自由度が下がる",
                effects: { fund: 30, trust: 5, research: 5 },
                debtMultiplier: 0.5,
                flags: ["alliance", "rescue"],
                feedback: "仲間の水族館が手を差し伸べてくれた。新しい体制で再出発！",
              },
            },
          },
          {
            mode: "research",
            title: "館長として、最後の決断 ― 研究の未来",
            description: "開館から10年。研究成果が注目を集めている。研究の道をどう進む？",
            options: {
              A: {
                label: "研究棟つきの大型館へ拡大",
                pros: "研究も展示も大きく",
                cons: "大規模な投資が必要",
                effects: { fund: -35, pop: 10, research: 8 },
                flags: ["mega"],
                feedback: "研究棟と展示館を備えた、大きな海の学び舎をつくる！",
              },
              B: {
                label: "今の体制で研究を深める",
                pros: "堅実で質の高い研究",
                cons: "大きな成長は望めない",
                effects: { fund: 10, research: 8, trust: 8 },
                flags: ["keep"],
                feedback: "派手さより深さ。今の仲間と、研究をとことん突きつめる。",
              },
              C: {
                label: "研究機関と共同運営へ",
                pros: "研究力が大きく伸びる",
                cons: "経営の自由度が下がる",
                effects: { fund: 12, research: 15, trust: 5 },
                flags: ["alliance"],
                feedback: "研究機関と手を組み、水族館は海洋研究の拠点へ。",
              },
            },
          },
          {
            mode: "strong",
            title: "館長として、最後の決断 ― 成長戦略",
            description: "開館から10年。経営は絶好調！ 次の10年に向けた成長戦略は？",
            options: {
              A: {
                label: "全国区の大型水族館へ拡大",
                pros: "もっと多くの人に届く",
                cons: "大規模な投資が必要",
                effects: { fund: -35, pop: 16 },
                flags: ["mega"],
                feedback: "目指すは日本一の水族館！ 大拡張プロジェクトが始動。",
              },
              B: {
                label: "品質を磨き、唯一無二の館に",
                pros: "長く愛される水族館に",
                cons: "大きな成長は望めない",
                effects: { fund: 10, trust: 10, welfare: 8 },
                flags: ["keep"],
                feedback: "大きくするより、深くする。展示の質をとことん磨き上げる。",
              },
              C: {
                label: "海外の水族館と連携",
                pros: "世界に開かれた水族館に",
                cons: "調整に手間がかかる",
                effects: { fund: 5, research: 10, pop: 5, trust: 5 },
                flags: ["alliance"],
                feedback: "海外の水族館と姉妹館提携！ 生き物と知識の交流が始まる。",
              },
            },
          },
          {
            mode: "normal",
            title: "館長として、最後の決断",
            description: "開館から10年。あなたの水族館に、最後の大きな決断が待っていた。",
            options: {
              A: {
                label: "さらに大きな水族館へ",
                pros: "もっと多くの人に届く",
                cons: "大規模な投資が必要",
                effects: { fund: -35, pop: 14 },
                flags: ["mega"],
                feedback: "さらなる成長へ！ 新しい展示エリアの建設が決まった。",
              },
              B: {
                label: "今の規模で、長く愛される館に",
                pros: "堅実で質の高い運営",
                cons: "大きな成長は望めない",
                effects: { fund: 12, trust: 10, welfare: 5 },
                flags: ["keep"],
                feedback: "背伸びはしない。今いる生き物と、来てくれる人を大切に。",
              },
              C: {
                label: "他館や研究所と新しい運営体制",
                pros: "連携で新しい可能性",
                cons: "自由な決定がしにくい",
                effects: { fund: 8, research: 12, trust: 5, pop: -3 },
                flags: ["alliance"],
                feedback: "ほかの水族館や研究所と手を組んで、新しい運営体制へ。",
              },
            },
          },
        ],
      },
    ],

    /* ───────────── ラウンド前に起こるイベント ─────────────
     * beforeRound: そのラウンドの問題の前に表示される
     * mood: good / bad / crisis / info
     */
    events: [
      {
        id: "ev_loan_payment",
        beforeRound: 6,
        when: { flag: "loan" },
        mood: "bad",
        title: "最初の返済日",
        text: "融資の返済が始まった。開館前から、毎月の返済が金庫をじわじわ削っていく。",
        effects: { fund: -8 },
      },
      {
        id: "ev_delay_fans",
        beforeRound: 6,
        when: { flag: "delayed" },
        mood: "good",
        title: "待っていてくれた人たち",
        text: "延期のあいだに、研修中のスタッフがSNSで生き物の様子を発信。開館を待つファンが少しずつ増えていた。",
        effects: { pop: 5 },
      },
      {
        id: "ev_nature_access",
        beforeRound: 6,
        when: { flag: "loc_nature" },
        mood: "info",
        title: "バスは1時間に1本",
        text: "自然豊かな海辺は、やっぱり交通が不便。でも、のんびりした雰囲気がいいという声も。",
        effects: { pop: -4, trust: 3 },
      },
      {
        id: "ev_veteran_notice",
        beforeRound: 7,
        when: { flag: "staff_vet" },
        mood: "good",
        title: "ベテランの勘",
        text: "「ポンプの音が、いつもと違う」――ベテラン飼育員が異変にいち早く気づいた。",
        effects: { welfare: 5 },
      },
      {
        id: "ev_reliable_saves",
        beforeRound: 7,
        when: { all: [{ flag: "reliable" }, { notFlag: "staff_vet" }] },
        mood: "good",
        title: "丈夫な設備",
        text: "信頼性を重視した設備のおかげで、故障は早めに見つかった。",
        effects: { welfare: 4 },
      },
      {
        id: "ev_bigfish_crowd",
        beforeRound: 8,
        when: { flag: "bigfish_full" },
        mood: "good",
        title: "大水槽の前は人だかり",
        text: "ジンベエザメがゆったり泳ぐ大水槽の前は、いつも人だかり。",
        effects: { pop: 6 },
      },
      {
        id: "ev_bigfish_planned",
        beforeRound: 8,
        when: { all: [{ flag: "main_big" }, { notFlag: "bigfish_full" }] },
        mood: "info",
        title: "ジンベエザメはまだ計画中",
        text: "今の水槽ではジンベエザメは迎えられない。いまはエイやサメたちが主役だ。いつか大水槽を、と夢は続く。",
        effects: {},
      },
      {
        id: "ev_rookie_growth",
        beforeRound: 8,
        when: { all: [{ flag: "staff_rookie" }, { notFlag: "understaffed" }] },
        mood: "good",
        title: "新人たちの成長",
        text: "失敗ばかりだった新人たちが、いつのまにか一人前に。生き物の小さな変化にも気づけるようになった。",
        effects: { staff: 18, welfare: 5 },
      },
      {
        id: "ev_tourist_season",
        beforeRound: 8,
        when: { flag: "loc_tourist" },
        mood: "good",
        title: "観光シーズン到来",
        text: "夏の観光シーズン。海水浴帰りのお客さんが次々とやってくる。",
        effects: { pop: 5, fund: 5 },
      },
      {
        id: "ev_overwork",
        beforeRound: 9,
        when: { any: [{ all: [{ flag: "extended" }, { flag: "understaffed" }] }, { stat: "staff", lt: 35 }] },
        mood: "bad",
        title: "スタッフの疲れがピークに",
        text: "休みが取れない日々が続き、スタッフの疲れが限界に。水槽の掃除も後回しになりがちだ。",
        effects: { welfare: -8, staff: -5 },
        addFlags: ["overworked"],
      },
      {
        id: "ev_deep_breeding",
        beforeRound: 9,
        when: { all: [{ flag: "main_deep" }, { any: [{ flag: "staff_elite" }, { flag: "staff_vet" }] }] },
        mood: "good",
        title: "クラゲの繁殖に成功！",
        text: "飼育がむずかしいクラゲの繁殖に成功！ 小さな赤ちゃんクラゲの展示が話題になった。",
        effects: { research: 10, pop: 5 },
      },
      {
        id: "ev_small_fans",
        beforeRound: 9,
        when: { all: [{ flag: "main_small" }, { stat: "welfare", gte: 60 }] },
        mood: "good",
        title: "ハゼ観察会が大人気",
        text: "小さな魚をじっくり観察する「ハゼ観察会」が人気に。リピーターがぐんぐん増えた。",
        effects: { trust: 8, pop: 4 },
      },
      {
        id: "ev_campus_collab",
        beforeRound: 9,
        when: { all: [{ flag: "loc_campus" }, { stat: "research", gte: 70 }] },
        mood: "good",
        title: "大学との共同研究",
        text: "近くの大学との共同研究で、珍しい生き物の生態が明らかに。新聞にも載った！",
        effects: { research: 8, trust: 4 },
      },
      {
        id: "ev_crisis",
        beforeRound: 10,
        when: { mode: "crisis" },
        mood: "crisis",
        title: "経営危機",
        text: "このままでは資金が底をつく…。銀行からも厳しい連絡が届いた。",
        effects: { trust: -3 },
        addFlags: ["crisis"],
      },
    ],

    /* ───────────── エンディング ─────────────
     * 判定順は engine.js の decideEnding を参照
     * keyStats: 「運命を決めた選択」を選ぶときに重視する指標
     */
    endings: {
      legendary: {
        type: "ベストエンド",
        name: "伝説の水族館エンド",
        title: "海と人をつなぐ、伝説の水族館",
        mood: "bright",
        keyStats: ["pop", "welfare", "staff", "trust"],
        summary: "人気・飼育環境・スタッフ・信頼、そのすべてがそろった奇跡のような水族館。",
      },
      national: {
        type: "ハッピーエンド",
        name: "全国的人気水族館エンド",
        title: "日本中から人が集まる水族館",
        mood: "bright",
        keyStats: ["pop", "fund"],
        summary: "連日の行列、テレビの取材。全国から人が訪れる人気水族館になった。",
      },
      paradise: {
        type: "グッドエンド",
        name: "小さな楽園エンド",
        title: "小さな海の楽園",
        mood: "calm",
        keyStats: ["welfare", "trust"],
        summary: "規模は小さくても、生き物も人ものびのび過ごせる楽園のような水族館。",
      },
      research: {
        type: "グッドエンド",
        name: "海洋研究の聖地エンド",
        title: "世界が注目する、海洋研究の聖地",
        mood: "calm",
        keyStats: ["research"],
        summary: "観光地としては控えめでも、研究者たちのあこがれの場所になった。",
      },
      conservation: {
        type: "ハッピーエンド",
        name: "生物保全の先駆者エンド",
        title: "海の未来を守る、保全の先駆者",
        mood: "calm",
        keyStats: ["research", "trust", "welfare"],
        summary: "生き物を守り、増やし、海へ返す。保全活動の先駆けとして知られる水族館に。",
      },
      miracle: {
        type: "バッドハッピーエンド",
        name: "奇跡の経営再建エンド",
        title: "どん底からの、奇跡の再建",
        mood: "bright",
        keyStats: ["fund", "trust"],
        summary: "一度は閉館寸前まで追い込まれながら、見事に立ち直った水族館。",
      },
      community: {
        type: "グッドエンド",
        name: "地域密着の愛され水族館エンド",
        title: "町のみんなの、愛され水族館",
        mood: "warm",
        keyStats: ["trust", "welfare"],
        summary: "遠足、デート、家族の休日。町の人たちの思い出の中に、いつもこの水族館があった。",
      },
      popstruggle: {
        type: "ビターエンド",
        name: "人気爆発・経営苦戦エンド",
        title: "大人気なのに、金庫はからっぽ",
        mood: "warm",
        keyStats: ["pop", "fund"],
        summary: "来館者は絶えないのに、なぜかお金が残らない。うれしい悲鳴が続く水族館。",
      },
      overexpanded: {
        type: "ビターエンド",
        name: "拡大しすぎた水族館エンド",
        title: "大きくなりすぎた水族館",
        mood: "dusk",
        keyStats: ["fund", "pop"],
        summary: "夢を広げすぎて、建物ばかりが大きくなった。維持費の重さに、館長は今日もため息。",
      },
      staffcrisis: {
        type: "ビターエンド",
        name: "スタッフ不足による運営危機エンド",
        title: "人手が足りない！ 運営危機",
        mood: "dusk",
        keyStats: ["staff", "welfare"],
        summary: "生き物は元気でも、支える人が足りない。運営はぎりぎりの綱渡りに。",
      },
      reorg: {
        type: "バッドエンド",
        name: "財務危機・事業再編エンド",
        title: "新しい形での再出発",
        mood: "dusk",
        keyStats: ["fund"],
        summary: "借金がふくらみ、経営は新しい運営会社へ。それでも、生き物たちの暮らしは続いていく。",
      },
      closure: {
        type: "サッドエンド",
        name: "水族館閉館エンド",
        title: "ありがとう、またいつか",
        mood: "night",
        keyStats: ["fund", "pop", "trust"],
        summary: "10年の歴史に幕。生き物たちは各地の水族館へ引っ越し、看板の明かりが静かに消えた。",
      },
      true: {
        type: "トゥルーエンド",
        name: "海への約束エンド",
        title: "水族館は、海の未来を預かる場所だった",
        mood: "bright",
        keyStats: ["research", "welfare", "trust"],
        summary: "繁殖に成功した命を故郷の海へ。10年かけて、水族館の本当の役目にたどり着いた。",
      },
      secret: {
        type: "シークレットエンド",
        secret: true,
        name: "ジンベエザメの里帰りエンド",
        title: "おかえり、大きな海へ",
        mood: "bright",
        keyStats: ["welfare", "research", "trust"],
        summary: "大水槽で暮らしてきたジンベエザメが、発信機をつけて海へ帰っていった。",
      },
      badtrue: {
        type: "バッドトゥルーエンド",
        name: "海へ還る水族館エンド",
        title: "最後の日、命を海へ返して",
        mood: "night",
        keyStats: ["research", "fund"],
        summary: "水族館の本当の役目に気づいたとき、資金はもう尽きていた。最後に、命を海へ返して閉館。",
      },
      tragic: {
        type: "トラジックエンド",
        name: "優しすぎた水族館エンド",
        title: "誠実さだけでは、守りきれなかった",
        mood: "night",
        keyStats: ["fund", "welfare", "trust"],
        summary: "生き物にも人にも誠実だった。それでも、お金の問題だけは避けられなかった。",
      },
      worst: {
        type: "ワーストエンド",
        name: "すべてが裏目エンド",
        title: "伝説の“反面教師”水族館",
        mood: "night",
        keyStats: ["fund", "trust", "welfare"],
        summary: "考えられる限りの裏目が重なった10年。のちに業界で語り継がれる教訓になった。",
      },
      merrybad: {
        type: "メリーバッドエンド",
        name: "館長だけはご満悦エンド",
        title: "夢の巨大水族館（ただし帳簿は真っ赤）",
        mood: "warm",
        keyStats: ["pop", "fund"],
        summary: "ピカピカの巨大水族館に館長は大満足。でも、借金のことは見ないふりをしている。",
      },
      open: {
        type: "オープンエンド",
        name: "運命の開館日エンド",
        title: "答えは、明日の朝に",
        mood: "dusk",
        keyStats: ["fund", "pop"],
        summary: "最後の大勝負の結果は、まだ誰にもわからない。行列はできるのか――。",
      },
      chaos: {
        type: "カオスエンド",
        name: "毎日がお祭り騒ぎエンド",
        title: "今日も館内は大混乱！",
        mood: "warm",
        keyStats: ["pop", "staff"],
        summary: "安くて、夜までやっていて、人手は足りない。毎日がドタバタの大にぎわい水族館。",
      },
      gag: {
        type: "ギャグエンド",
        name: "ジンベエザメ近日公開エンド",
        title: "日本一来ないジンベエザメ",
        mood: "warm",
        keyStats: ["pop"],
        summary: "「ジンベエザメ近日公開！」の看板が10年。いつしかそれ自体が名物になった。",
      },
      loop: {
        type: "ループエンド",
        name: "振り出しに戻るエンド",
        title: "そしてまた、最初の決断へ",
        mood: "calm",
        keyStats: ["fund", "pop"],
        summary: "10年たって、数字はほとんど開館の日と同じ。そして再び、館長に任命される――。",
      },
      discovery: {
        type: "ハッピーエンド",
        name: "世紀の大発見エンド",
        title: "水槽の中から、新種が見つかった",
        mood: "bright",
        keyStats: ["research"],
        summary: "大学と専門家チームの研究が実を結び、なんと新種を発見！ 水族館の名前が図鑑に載った。",
      },
      sister: {
        type: "グッドエンド",
        name: "世界とつながる姉妹館エンド",
        title: "海の向こうに、仲間ができた",
        mood: "bright",
        keyStats: ["trust", "research"],
        summary: "世界の水族館と生き物や知識を交換し合う、国際的な水族館になった。",
      },
      night: {
        type: "グッドエンド",
        name: "夜の水族館エンド",
        title: "月あかりとクラゲの夜",
        mood: "dusk",
        keyStats: ["pop"],
        summary: "夜までひらく幻想的なクラゲの館は、大人のデートスポットとして大人気に。",
      },
      artisan: {
        type: "グッドエンド",
        name: "職人の名館エンド",
        title: "知る人ぞ知る、職人の水族館",
        mood: "calm",
        keyStats: ["welfare", "staff"],
        summary: "派手さはないが、生き物の美しさは日本一。全国の飼育員が見学に訪れる名館に。",
      },
      successor: {
        type: "ハッピーエンド",
        name: "新人が館長になる日エンド",
        title: "あの日の新人が、次の館長に",
        mood: "warm",
        keyStats: ["staff", "trust"],
        summary: "10年前に採用した新人が、立派に育って次の館長に。水族館の物語は受け継がれていく。",
      },
      phantom: {
        type: "グッドエンド",
        name: "予約の取れない幻の水族館エンド",
        title: "チケットは、半年待ち",
        mood: "calm",
        keyStats: ["pop", "fund"],
        summary: "高級・予約制・少人数。一度は行ってみたい「幻の水族館」として憧れの的に。",
      },
      onehit: {
        type: "ビターエンド",
        name: "ジンベエザメ頼みエンド",
        title: "主役はひとり、ほかは脇役",
        mood: "warm",
        keyStats: ["pop", "welfare", "research"],
        summary: "お客さんのお目当ては、ほぼジンベエザメだけ。ほかの展示の影はすっかり薄くなった。",
      },
      labonly: {
        type: "メリーバッドエンド",
        name: "研究所になった水族館エンド",
        title: "お客さんより、研究者のほうが多い",
        mood: "calm",
        keyStats: ["research", "pop"],
        summary: "研究に夢中になるうちに、気づけば来館者はほとんどいない。館長は今日も実験に夢中。",
      },
      merger: {
        type: "バッドエンド",
        name: "吸収合併エンド",
        title: "看板が、別の名前に変わる日",
        mood: "dusk",
        keyStats: ["fund"],
        summary: "提携先の大きな水族館グループに吸収され、名前も運営も変わることになった。",
      },
      steady: {
        type: "ノーマルエンド",
        name: "のんびり水族館エンド",
        title: "今日も、のんびり営業中",
        mood: "calm",
        keyStats: ["fund", "welfare"],
        summary: "大事件も大ブームもないけれど、今日も変わらず扉を開ける、マイペースな水族館。",
      },
    },
  };
})(typeof window !== "undefined" ? window : globalThis);

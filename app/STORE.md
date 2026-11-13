# MARINK水族館 iPhoneアプリ 申請ガイド

App Store に出すときに入力する内容と、手順のメモです。

## 基本情報

| 項目 | 内容 |
|---|---|
| バンドルID | `io.github.yuto2525424.marinkaquarium` |
| アプリ名（30文字以内） | MARINK水族館 運命の館長 |
| ホーム画面の表示名 | MARINK水族館 |
| サブタイトル（30文字以内） | 10の決断で未来が変わる水族館経営 |
| カテゴリ | ゲーム（サブカテゴリ：シミュレーション、カジュアル） |
| 価格 | 無料（アプリ内課金なし・広告なし） |
| 対応端末 | iPhone のみ（縦向き） |
| 対応OS | iOS 15.0 以上 |
| 言語 | 日本語 |
| 年齢区分 | 4+（暴力・課金・ユーザー間のやり取りなし） |
| 著作権表示 | © 2026 MARINK |
| プライバシーポリシーURL | https://yuto2525424.github.io/marink-aquarium/privacy.html |
| サポートURL | https://github.com/yuto2525424/marink-aquarium/issues |
| マーケティングURL | https://yuto2525424.github.io/marink-aquarium/ |

## 説明文（4000文字以内）

```
「自分だけの水族館を制作しよう！」

あなたは今日、新しい水族館の館長に任命されました。
建てる場所、主役の生き物、水槽、資金不足への対応、スタッフ、入館料、突然のトラブル、SNSでのバズ……。
10回の重大な決断が、水族館の10年後を決めます。

■ 59,049通りの未来
全10問・各3択。選択の組み合わせは59,049通り。
同じエンディングでも、水族館の名前、イラスト、物語はあなたの選択で変わります。

■ 54種類のエンディング
伝説の水族館、ジンベエザメの聖地、クラゲの都、海への約束（トゥルーエンド）、ジンベエザメの里帰り（シークレット）、ジンベエザメ近日公開（ギャグ）……。
ハッピーからビター、まさかの結末まで。エンディング図鑑を埋めよう。

■ リアルな経営
開館後は毎年、来館者×入館料の売上から運営費を引いた利益が入ります。
大きな設備ほど維持費も重く、判断を誤れば経営危機や閉館も。
上手に経営すれば、スタートの100億円を大きく増やせます。

■ 10年後の水族館が絵になる
あなたの選択から、水族館のイラストが自動で描かれます。
うまくいけばぴかぴかに、失敗すれば廃墟に……建物のようすは11段階。

■ 経営レポートと「もしも」の未来
資金・集客力・飼育環境・スタッフ・研究・信頼の6つを評価し、総合評価はS〜F。
「あのとき別の選択をしていたら？」も教えてくれます。

■ 結果をシェア
結果画像をiPhoneの写真に保存したり、友達に送ったりできます。

・ログイン不要、通信なしで遊べます
・広告なし、アプリ内課金なし
・個人情報は集めません
・1回3〜5分で遊べます

※ゲーム内の金額や数値は、ゲーム用の目安です。
```

## キーワード（100文字以内・カンマ区切り）

```
水族館,経営,シミュレーション,選択,三択,マルチエンディング,ジンベエザメ,クラゲ,海,物語,育成,館長
```

## プロモーション用テキスト（170文字以内）

```
10の決断で、あなたの水族館の10年後が決まる。54種類のエンディングと、選択から描かれる水族館のイラスト。ログイン不要・広告なしで、今すぐ館長に。
```

## 審査担当者へのメモ（App Review Information → Notes）

```
Thank you for reviewing MARINK AQUARIUM.

This is a self-contained management simulation game (in Japanese). All game logic, illustrations, sound effects and fonts are bundled in the app, so it works fully offline. No login is required.

How to play: Tap the start button, name your aquarium (or choose "おまかせ"), then make 10 choices. Each choice changes six parameters, and yearly business results are calculated after opening. At the end you will see one of 54 endings, an illustration generated from your choices, a business report and an S–F rating.

Native features:
- Haptic feedback when choosing and on events (Haptics)
- Saving and sharing the result image through the iOS share sheet ("Save Image" saves it to Photos) (Filesystem + Share)
- Launch screen and status bar styling

The app does not collect any personal data, has no ads, no tracking and no in-app purchases. Progress and the ending collection are stored only on the device.

日本語：本アプリは通信不要の水族館経営ゲームです。ゲーム本体・イラスト・効果音・フォントはすべてアプリ内に含まれ、ログインは不要です。
```

## App のプライバシー（App Store Connect の質問への答え）

- 「このAppからデータを収集しますか？」→ **いいえ（データの収集なし）**
- トラッキング → **なし**

## 年齢区分の質問への答え

すべて「なし」：暴力、性的表現、ギャンブル、ホラー、薬物、医療情報、ユーザー生成コンテンツ、無制限のWebアクセス、など。→ **4+**

## スクリーンショット

`app/screenshots/` に、6.9インチ（1320×2868）用の画像を用意しています。App Store Connect では 6.9インチの枠に入れれば、ほかのサイズにも自動で使われます。

## 手順メモ

1. **Apple Developer**（developer.apple.com）→「証明書、ID、プロファイル」→「ID」で、上のバンドルIDを登録する（機能の追加は不要）
2. **App Store Connect**（appstoreconnect.apple.com）→「アプリ」→「＋」→「新規App」
   - プラットフォーム：iOS ／ 名前：MARINK水族館 運命の館長 ／ 言語：日本語 ／ バンドルID：上のもの ／ SKU：marink-aquarium-001 ／ アクセス：フルアクセス
3. **App Store Connect の APIキー**：「ユーザとアクセス」→「統合」→「App Store Connect API」→「チームキー」でキーを作る（アクセス：App Manager）。**.p8ファイルは1回しかダウンロードできないので大切に保管**。Issuer ID とキーIDも控える
4. **Codemagic**（codemagic.io）に GitHub でサインインし、`marink-aquarium` リポジトリを追加
   - Team settings →「Team integrations」→「Developer Portal」で、3のキーを登録。名前は **MARINK_ASC**
   - 「codemagic.yaml settings」→「Code signing identities」→ iOS certificates で「Generate certificate」（種類：Apple Distribution）→ iOS provisioning profiles で「Fetch profiles」（App Store 用）
5. Codemagic で「Start new build」→ ワークフロー「ios-testflight」を選んで実行（約15〜25分）
6. 成功すると TestFlight に届く → iPhone に「TestFlight」アプリを入れて試す
7. 問題なければ App Store Connect で説明文・スクリーンショットなどを入れ、「審査に提出」

APIキー（.p8）は秘密の鍵です。GitHub やチャットには絶対に貼らないでください。

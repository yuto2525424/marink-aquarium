/*
 * 公開時の設定
 *
 * aiEndpoint を空のままにすると「通常モード（テンプレート物語）」で動きます。
 * AIで物語を作りたい場合は、server/ フォルダのAIサーバーを公開し、そのURLを入れてください。
 * 例: aiEndpoint: "https://marink-story.あなたのアカウント.workers.dev/story"
 *
 * ※ ここにAPIキーを書いてはいけません（誰でも見られてしまいます）。
 */
window.MARINK_CONFIG = {
  aiEndpoint: "",
  aiTimeoutMs: 20000,
  // アプリ版で結果を共有するときに使う、Webサイト版のURL
  webUrl: "https://yuto2525424.github.io/marink-aquarium/",
};

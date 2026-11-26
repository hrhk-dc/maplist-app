# maplist-app
maplist-app — 営業マンが回るお店のリストをAIが提案するWebアプリ（完了報告アプリ連携）

## 構成
- バニラ構成（フレームワーク・ビルドなし）。公開ディレクトリは `public`。
- `public/index.html`：画面（検索・提案リスト・訪問リスト・後で訪問）
- `public/app.js`：画面の動き、おすすめ点数、訪問リストの操作
- `public/style.css`：完了報告アプリのデザイン（`DESIGN.md`）に沿ったスタイル
- `public/data.js`：データの受け口（`VLA_DATA`）。店舗検索・住所の座標変換は `functions/api/`（Google Places、キーは環境変数 `GOOGLE_MAPS_API_KEY`）、訪問NGは完了報告アプリと同じ Firestore（`vla_blocks`）。設定手順は `docs/setup-rules-and-keys.md`。
- `public/sw.js`：サービスワーカー。画面のファイルを変えたら `CACHE` の番号を上げる。

## 注意
- 日付はすべて日本時間（JST）基準。デフォルトの訪問日は「今日の翌日」。
- 店の点数の基準は `app.js` の `CRIT`・`WHY` に書いてある。評価と口コミは Google の値、新しさ・成約しやすさは Google に無いため全店3点（中立）。
- 画像・アイコン画像は未作成（Gemini担当が生成して差し替える予定）。
- 完了報告アプリへの「訪問リスト」リンク追加は、Sonnet担当と調整してから行う（まだ行わない）。

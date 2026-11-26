# 訪問リストアプリ：設定手順（Firestoreルール・APIキー・ログイン）

データ層（店舗検索・訪問NG）を動かすために、次の3つを行います。
コードは入っているので、ここは「設定」だけです。

## 1. Firestoreルールの追加（完了報告アプリのリポジトリ）

ルール本体は `hrhk-dc/kanryohkk-app` の `firestore.rules` にあります。
この訪問リストアプリのリポジトリからは変更しません。下の1行の差し込みを、完了報告アプリ側で別途行ってください。

**差し込む位置**：`// それ以外はすべて禁止` の直前（`match /users/{uid} { ... }` の後、`match /{document=**}` の前）。

```
    // 訪問NG（訪問リストアプリ）：メンバーだけ読み書きできる。登録するのは本人
    match /vla_blocks/{placeId} {
      allow read, delete: if isMember();
      allow create, update: if isMember()
        && request.resource.data.keys().hasOnly(['name', 'reason', 'at', 'createdBy', 'createdByName'])
        && request.resource.data.createdBy == request.auth.uid;
    }
```

- `isMember()` は既存の関数をそのまま使う（`settings/members` の emails・admins に載っている人だけ）。
- 差し込み後、Firebase コンソールまたは `firebase deploy --only firestore:rules` で公開する。
- 公開前は、訪問NGの読み書きが拒否される（画面では「訪問NG」が保存されないだけで、他の機能には影響しない）。

## 2. Google Places APIキー（Cloudflare Pages）

完了報告アプリの `GOOGLE_MAPS_API_KEY` と同じキーを使います（Google Cloud プロジェクト `dc-report`、請求先は登録済み）。

1. Cloudflare Pages（visit-list-app）の「設定」→「環境変数」に、`GOOGLE_MAPS_API_KEY` を追加する（本番）。値はキーそのもの。画面に出さないこと。
2. 再デプロイすると反映される。
3. キーの「APIの制限」に **Places API (New)** と **Geocoding** は不要（住所の変換も Places で行う）。Places API (New) が許可されていることだけ確認する。
4. キーの「アプリケーションの制限」は「なし」にする（サーバーから呼ぶため。ウェブサイトの制限にすると使えない）。

キーが無いと、検索画面に「店舗検索の設定がまだです」と出ます。

### 地図で見る（Maps Static API）
- 提案の「地図で見る」は、サーバー（`functions/api/map.js`）が同じ `GOOGLE_MAPS_API_KEY` で地図の画像を作って返します。キーは画面にもレスポンスにも出ません。
- キーの「APIの制限」に **Maps Static API** を追加してください（許可されていないと「地図を取得できませんでした」と出ます）。
- 地図の画像は、ログインしたメンバーだけが見られます。

## 3. ログインの窓口（Firebase Authentication）

- Firebase コンソール（`dc-report-8e1d1`）→ Authentication → 設定 → **承認済みのドメイン** に `visit-list-app.pages.dev` を追加する。
- ログインは Google のみ。許可する人は完了報告アプリの「メンバー管理」（`settings/members`）で決める。訪問リストアプリに別の許可リストは作らない。

## 確認の仕方

- 検索画面で「ログインしてください」と出たら、ログイン（`VLA_DATA.signIn()`）が必要。ログインボタンは画面側（別担当）で付ける。
- 検索が「店舗検索の設定がまだです」→ 手順2。
- 「この店探しを使う許可がありません」→ そのアカウントが `settings/members` に無い。

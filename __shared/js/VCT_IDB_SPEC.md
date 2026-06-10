# V-Creator Tools: IndexedDB Wrapper (VCT_IDB) Technical Spec v0.5.0

## 1. 概要
`vct_idb.js` は、VCT 系テンプレート / CommentRaid 系テンプレートで共有する IndexedDB ラッパーです。

現時点では以下の 3 ストアを扱います。

- `supports`: 支援イベント履歴
- `users`: ユーザー現在値
- `commentraid_state`: CommentRaid 系プラグイン固有状態

ライブラリ版数と IndexedDB の `DB_VERSION` は別物です。

- ライブラリ版数: API / 設計仕様の版数
- `DB_VERSION`: IndexedDB スキーマ更新回数

現時点の前提:

- ライブラリ版数: `v0.5.0`
- `DB_VERSION`: `4`


## 2. 導入方法
テンプレートの `index.html` では、`idb.min.js` の後、メインスクリプトより前に読み込みます。

```html
<script src="../__shared/lib/idb/idb.min.js"></script>
<script src="../__shared/js/vct_idb.js"></script>
<script src="./main.js"></script>
```


## 3. 設計方針

### supports
- 1 イベント = 1 レコード
- 主キーは `eventKey`
- 支援履歴はイベント単位で残す
- `userKey` は取得できる場合に保持し、`users` との紐付け精度を上げる

### users
- 1 ユーザー = 1 レコード
- 主キーは `userKey`
- 同一人物の現在値を保持する
- `firstSeenAt` は初回観測時刻、`lastSeenAt` / `lastEventAt` は更新される

### commentraid_state
- CommentRaid 系プラグイン固有状態
- 主キーは `stateKey`
- `internal` / `shared` を `stateType` で区別する


## 4. API リファレンス

### `window.VCT_IDB.initDB()`
IndexedDB を初期化します。

### `window.VCT_IDB.getDefaultStreamId()`
当日 `YYYYMMDD` 形式のデフォルト `streamId` を返します。

### `window.VCT_IDB.buildSupportEventKey(data)`
支援イベント用の `eventKey` を生成します。

優先順位:
1. `platform + ":" + originalEventId`
2. `platform + ":" + streamId + ":" + userId + ":" + eventAt + ":" + rawType`
3. `platform + ":" + streamId + ":" + normalizedUserName + ":" + amount + ":" + messageHash + ":" + eventAt`

### `window.VCT_IDB.normalizeSupport(data)`
支援イベントデータを `supports` 用レコードへ正規化します。

主な補完対象:
- `eventKey`
- `streamId`
- `eventAt`
- `eventAtSource`
- `createdAt`
- `updatedAt`
- `amount`
- `currency`
- `userKey`

### `window.VCT_IDB.saveSupport(data)`
支援イベントを `supports` ストアへ保存します。

主な挙動:
- 正規化を実行
- `eventKey` を補完
- `userKey` 未指定時は `platform + userId` 系から補完
- 同一 `eventKey` は `put()` により上書き
- 正規化済みレコードを返す

### `window.VCT_IDB.getSupports(options)`
`supports` ストアから一覧取得します。

`options`:
- `streamId`
- `limit`
- `order` (`"desc"` / `"asc"`)

### `window.VCT_IDB.deleteSupport(eventKey)`
`supports` ストアから `eventKey` 単位で 1 件削除します。

戻り値:
- `true`: 削除成功
- `false`: 対象なし / `eventKey` 不正

### `window.VCT_IDB.clearSupports(options)`
`supports` ストアを削除します。

`options`:
- `streamId`
  - 指定時は配信単位削除
  - 未指定時は全削除

### `window.VCT_IDB.buildUserKey(data)`
ユーザー用の `userKey` を生成します。

基本形:
- `platform + ":" + userId`

フォールバック:
- `platform + ":name:" + normalizedDisplayName`

### `window.VCT_IDB.normalizeUserProfile(data)`
ユーザープロフィールを `users` 用レコードへ正規化します。

### `window.VCT_IDB.saveUserProfile(data)`
ユーザープロフィールを `users` ストアへ保存します。

主な挙動:
- `userKey` を補完
- 既存レコードがある場合はマージ更新
- `firstSeenAt` は維持
- `lastSeenAt` / `updatedAt` / `lastEventAt` は更新
- 空文字や未取得値で既存の名前・アイコンを潰さない

### `window.VCT_IDB.getUserProfile(userKey)`
`users` ストアから `userKey` 単位で 1 件取得します。

### `window.VCT_IDB.getUsers(options)`
`users` ストアから一覧取得します。

`options`:
- `platform`
- `limit`
- `order` (`"desc"` / `"asc"`)

### `window.VCT_IDB.clearUsers()`
`users` ストアを全件削除します。

### `window.VCT_IDB.normalizeState(data)`
`commentraid_state` 用レコードへ正規化します。

必須:
- `stateKey`
- `templateKey`
- `scope`
- `stateType`
- `data`

許可値:
- `scope`: `global` / `stream` / `user` / `session`
- `stateType`: `internal` / `shared`

### `window.VCT_IDB.saveState(data)`
`commentraid_state` ストアへ状態を保存します。

### `window.VCT_IDB.getState(stateKey)`
`commentraid_state` ストアから `stateKey` 単位で 1 件取得します。


## 5. ストア定義

### `supports`
主キー: `eventKey`

主な項目:
- `eventKey`
- `platform`
- `streamId`
- `originalEventId`
- `eventAt`
- `eventAtSource`
- `createdAt`
- `updatedAt`
- `userKey`
- `userId`
- `userName`
- `userIcon`
- `amount`
- `currency`
- `message`
- `supportColor`
- `rawType`
- `raw`

index:
- `streamId`
- `eventAt`
- `createdAt`
- `userId`
- `platform`
- `rawType`

### `users`
主キー: `userKey`

主な項目:
- `userKey`
- `platform`
- `userId`
- `userName`
- `displayName`
- `screenName`
- `userIcon`
- `originalUserIcon`
- `isMember`
- `isModerator`
- `isOwner`
- `firstSeenAt`
- `lastSeenAt`
- `lastEventAt`
- `updatedAt`
- `rawProfile`

index:
- `platform`
- `userId`
- `updatedAt`

### `commentraid_state`
主キー: `stateKey`

主な項目:
- `stateKey`
- `templateKey`
- `scope`
- `stateType`
- `streamId`
- `userKey`
- `updatedAt`
- `data`

index:
- `templateKey`
- `scope`
- `stateType`
- `updatedAt`


## 6. 現行利用イメージ

### VCT_support_banner
- 通常コメント受信時に `saveUserProfile()`
- 支援イベント時に `saveSupport()`
- 表示側は `getSupports({ streamId, limit, order })`

### VCT_support_banner_dashboard
- `Supports` ビュー: `getSupports()` + フロント側フィルタ
- `Users` ビュー: `getUsers()` と `getSupports()` を組み合わせて支援回数 / 通貨別累計を集計
- データ管理: `deleteSupport()` / `clearSupports()` / `clearUsers()`


## 7. 運用ルール
- `supports` は共有イベント履歴
- `users` は共有ユーザー現在値
- `commentraid_state` は CommentRaid 系プラグイン固有状態

`commentraid_state` では、
- `internal`: プラグイン内部状態
- `shared`: 他プラグイン / 他テンプレ参照可能な共有サマリー

を区別します。


## 8. 現時点でまだやらないこと
- 全プラットフォーム完全固定の `eventKey` 仕様
- `buildStateKey()` の共通化
- `getStates()` の多条件取得 API
- `clearState()` の共通設計
- `stats` ストア独立実装
- 完全汎用 DB ライブラリ化


## 9. 変更履歴
- **v0.5.0**: `supports.userKey` を明記。`deleteSupport()` / `getUsers()` / `clearUsers()` を追加。dashboard からの管理利用を反映。
- **v0.4.0**: `commentraid_state` と `saveState()/getState()` を追加。`supports` / `users` / `commentraid_state` の 3 ストア構成が揃った初期基盤段階。
- **v0.3.0**: `users` ストアと `saveUserProfile()/getUserProfile()` を追加。
- **v0.2.0**: `supports` を `eventKey` 主体へ再設計。`saveSupport()` の正規化と `eventAt` / `createdAt` 分離を導入。
- **v0.1.0**: `supports` 中心の初期 IndexedDB ラッパー。

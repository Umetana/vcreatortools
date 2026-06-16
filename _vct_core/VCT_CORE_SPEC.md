# VCT Core Technical Spec v0.3.1-dev

## 1. 概要

VCT Core は、わんコメ `OneSDK` から取得したコメントを解析し、VCT 共通 IndexedDB に `users` と `supports` を保存する常駐基盤テンプレートです。

v0.3.0 では、見た目と公開Facadeを大きく変えずに内部責務を分離しました。

## 2. バージョン系統

- VCT Core `v0.3.0`: runtime / ui / logger を含む Core テンプレート全体の版
- VCT SDK `v1.2.2`: `vct_one_core.js` の版
- VCT_IDB wrapper `v0.5.0` 系: IndexedDB facade の仕様版

VCT Core 本体版と VCT_IDB wrapper 仕様版は別系統です。

## 3. モジュール構成

### `main.js`

起動専用エントリです。

- `VCT_LOGGER` 初期化
- `VCT_RUNTIME` 初期化
- `VCT_UI` 初期化
- `runtime.start()` 呼び出し

業務ロジック、DOM描画、OneSDK callback、レコード生成は持ちません。

### `js/vct_logger.js`

ログ責務を担当します。

- `info()`, `warn()`, `error()`
- 最大保持件数の制御
- `debug` 設定に応じた console 出力
- `subscribe()` によるUI通知

公開名は `window.VCT_LOGGER` です。

### `js/vct_one_core.js`

OneSDK コメントの解析と、保存用レコード生成を担当します。

主なAPI:

- `VCT.parse(rawComment)`
- `VCT.parseStructured(rawComment)`
- `VCT.parseCore(rawComment)`
- `VCT.parseHtml(html)`
- `VCT.parseColor(value)`
- `VCT.parseLeadingCommand(text)`
- `VCT.extractSupportAmount(commentData)`
- `VCT.extractSupportCurrency(commentData)`
- `VCT.getDisplayMessage(commentData)`
- `VCT.resolveSupportGift(commentDataOrSupport)`
- `VCT.buildUserProfileRecord(commentData, options)`
- `VCT.buildSupportRecord(commentData, options)`
- `VCT.VERSION`

`VCT` は `VCT_IDB` を直接参照しません。
`streamId` や `buildUserKey` は runtime 側から options として注入します。

### `js/vct_runtime.js`

Core runtime を担当します。

- OneSDK setup / subscribe / ready / connect
- `streamId` 解決
- コメント受信時の parseCore / event 判定 / record build / DB保存
- DB stats 更新
- 削除操作の実行
- runtime status の通知

公開名は `window.VCT_RUNTIME` です。

主なAPI:

- `init(config, options)`
- `start()`
- `getStatus()`
- `getStreamId()`
- `refreshDbStats(options)`
- `clearSupportsByCurrentStream()`
- `clearAllSupports()`
- `clearAllUsers()`
- `on(eventName, handler)`

### `js/vct_ui.js`

監視UIを担当します。

- DOM参照
- status描画
- log描画
- danger panel
- ボタンイベント登録

UIは runtime の状態を描画し、削除などの実処理は runtime API を呼びます。

公開名は `window.VCT_UI` です。

### `js/vct_idb*.js`

IndexedDB facade と内部実装です。

公開Facade `window.VCT_IDB` は維持します。

主な維持API:

- `initDB()`
- `getDefaultStreamId()`
- `saveSupport(data)`
- `getSupports(options)`
- `deleteSupport(eventKey)`
- `clearSupports(options)`
- `buildUserKey(data)`
- `saveUserProfile(data)`
- `getUserProfile(userKey)`
- `getUsers(options)`
- `clearUsers()`
- state系API

## 4. streamId

v0.3.0 では runtime が保存前に `streamId` を確定します。

優先順位:

1. `runtime.init({ runtimeStreamId })` などで渡された明示値
2. `config.js` の `streamId`
3. `VCT_IDB.getDefaultStreamId()`
4. runtime 内の最終 fallback

互換性維持のため、`VCT_IDB.normalizeSupport()` 側の fallback は残します。
運用上は runtime が `streamId` を入れてから保存する前提です。

User 保存時も runtime が同じ `streamId` を注入します。
`VCT_IDB.saveUserProfile()` は `lastSeenStreamId` と `recentStreamIds` を更新し、同一配信内の重複を除いた直近5件を保持します。

## 5. 保存フロー

1. `OneSDK` の `comments` を受信
2. `VCT.parseCore(rawComment)`
3. `VCT.buildUserProfileRecord(commentData, options)`
4. `VCT_IDB.saveUserProfile(userRecord)`
5. `event.isSupport === true` の場合のみ `VCT.buildSupportRecord(commentData, options)`
6. `VCT_IDB.saveSupport(supportRecord)`
7. runtime status と DB stats を更新

## 6. UI

`index.html` は監視UI付きエントリとして維持します。
CSS は `style.css` に分離済みです。

## 7. 互換性

以下は維持します。

- `window.VCT_IDB` の公開名
- `window.VCT.parse()` の基本挙動
- VCT Core 内部処理では `parseCore()` と `event` を正規の判定基準として使う
- `supports` / `users` の保存構造
- legacy migration
- 監視UIの基本見た目

## 8. 変更履歴

- **v0.3.1-dev**: users に `lastSeenStreamId` / `recentStreamIds` を追加。runtime から User レコードへ `streamId` を注入。VCT SDK v1.2.0 の `parseCore().event` を保存判定の基準に変更。
- **v0.3.0**: runtime / ui / logger を分離。`main.js` を boot 専用化。User / Support レコード生成を `VCT` 側へ移動。`style.css` を分離。
- **v0.2**: Core監視UIとDB保守操作を追加。
- **v0.1**: `vct_common_data` 形成基盤を構築。

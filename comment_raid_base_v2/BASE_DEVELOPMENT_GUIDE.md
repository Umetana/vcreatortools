# Comment Raid Base v2.1.0-dev Development Guide

このガイドは、`js/plugins/_starter_kit/` を起点に新規 Rule Pack を作る plugin author 向け手順です。  
対象は「実装済みの Base API を正しく使う」ことに絞ります。

V2 は `../_vct_core/js/vct_sdk.js` (VCT SDK 2.0) を使います。`ctx.commentData` は `VCT_SDK.normalize(raw, { includeRaw: true })` の戻り値です。

## 1. 開発フロー（推奨）

1. `js/plugins/_starter_kit/` をコピーして `js/plugins/<your_pack>/` を作成
2. `starter_logic.js` を `<your_pack>_logic.js` 相当に編集
3. `plugin_manifest.js` に追加資産（scripts/styles/ui）を定義
4. `config.js` の `window.CONFIG.PLUGINS` にエントリーファイルを設定
5. OBS でキャッシュ更新して動作確認

補足:

- `js/plugins/sample_counter/` は Raid 非依存の最小完成例です
- `_starter_kit` は拡張前提の雛形、`sample_counter` は最小実装の見本という使い分けです

### 1.1 外部 `CRB_*` テンプレートとして開発する場合

`CRB_CASINO_V2` のように Base 外へ置くテンプレートでは、Base は相対参照される共通基盤として扱います。Base は個別 `CRB_*` テンプレートを読まず、管理もせず、DB 連携も担当しません。

外部テンプレート側で担当するもの:

- 固有ルールと固有 UI
- 固有 DB wrapper
- 必要に応じた `_vct_core` / `VCT_IDB` の読み込み
- `window.CONFIG.PLUGINS` と manifest パスの管理

この場合、manifest 内の `scripts` / `styles` / `ui` は、外部テンプレートの `index.html` から実際に解決できるパスで書いてください。Base はパスの自動補正をしません。

## 2. ファイル責務

- `<your_pack>_logic.js`
  - `ENGINE.use(plugin)` で登録するメインプラグイン
  - hook 実装と `state` / `ctx` 操作を担当
- `plugin_manifest.js`
  - 追加読み込み資産の宣言（scripts/styles/ui）
- `ui.html`
  - `#ui-root` に注入される表示断片
- `style.css`
  - `ui.html` の見た目と座標配置
- `*_config.js`（任意）
  - プラグイン専用設定を `window` へ公開

## 3. Hook 実装指針

### 3.1 実行順（engine.js 実装）

- 初期化時: `onInit(ctx, state, cfg)`
- 毎フレーム: `onUpdate(ctx, state, cfg)`
- コメントごと:
  - `beforeComment`
  - `onProcessAttack`
  - `onCalculateDamage`
  - `afterCalculateDamage`
  - `afterComment`

### 3.2 各 hook の責務

- `onInit`
  - `state` 初期値を作る
  - `cfg` を必要に応じて補正する
- `onUpdate`
  - 時間依存処理（クールダウン、タイマー進行）
- `beforeComment`
  - 早期中断判定（`ctx.terminated = true`）
- `onProcessAttack`
  - 攻撃種別や初期 `ctx.dmg` の決定
- `onCalculateDamage`
  - ブースト/軽減など最終ダメージ調整
- `afterCalculateDamage`
  - `state` 反映（HP減算など）と event 組み立て
- `afterComment`
  - 保存処理や最終後処理

注記（非同期処理）:

- hook は同期前提で呼ばれ、`Promise` を返しても Core は完了待ちしません
- 非同期処理は fire-and-forget に近い扱いになるため、完了順に依存した設計は避けてください
- reject はログ化されますが、処理順の保証には使えません

## 4. `ctx` の主要フィールド

コメント処理系 hook で使う基本フィールド:

- `ctx.commentData`
  - 受信コメントのSDK 2.0正規化結果
  - 本文は `message.text`
  - 表示名は `user.displayName`
  - ロールは `user.roles.owner` / `user.roles.moderator`
  - 支援・メンバーシップ分類は `event` / `membership`
  - 通貨建て支援額は `ENGINE.extractGiftPrice(ctx.commentData)` または `ctx.commentData.monetization.money.amount` を使う
  - ジュエル数は `ctx.commentData.monetization.jewels.count`、メンギフ件数は `ctx.commentData.membership.giftCount` を使い、通貨金額と混ぜない
- `ctx.events`
  - FX へ渡す event 配列。プラグインが `push` する
- `ctx.dmg`
  - ダメージ値。数値で管理
- `ctx.attack`
  - 攻撃情報オブジェクト（例: `{ name: "Slash" }`）
- `ctx.terminated`
  - `true` で以降の comment hook 処理を停止
- `ctx.isBossAction`
  - ボス行動として扱うフラグ
- `ctx.now`
  - `performance.now()` ベース時刻

`onInit` / `onUpdate` では `ctx.now` のみが前提です。

## 5. 責務境界（UI更新 / FX / state 管理）

- UI更新
  - 方式A: プラグインが DOM を直接更新
  - 方式B: `state.ui.status` を更新し、`script.js` の同期処理に任せる
- FX
  - 基本は `ctx.events.push({...})` を使う
  - `script.js` が `ENGINE.onComment()` の戻り値を `FX.push()` に橋渡しする
- state 管理
  - ゲーム状態は `state` に集約する
  - 永続化（`localStorage` / IndexedDB など）はプラグイン責務で、`afterComment` や節目の hook で保存する
  - Base は `VCT_IDB` や個別 DB wrapper を読み込まない
  - `state` は全プラグイン共有のため、`state.<pluginNamespace>` に集約して衝突を避ける

### 5.1 推奨 plugin state 構造

`state` は全プラグイン共有です。  
推奨: 各プラグインは `state.<pluginNamespace>` をルートにして管理します。

- `runtime`
  - コメント処理やフレーム更新で変わる一時情報
- `stats`
  - カウントや累積値などの集計情報
- `ui`
  - UI表示に使う値（DOM反映前の表示状態）
- `persist`
  - 保存データ本体や保存フラグなど、永続化用の置き場

短い例:

```js
function ensureMyState(state) {
  state.my_plugin = state.my_plugin || {};
  state.my_plugin.runtime = state.my_plugin.runtime || {};
  state.my_plugin.stats = state.my_plugin.stats || {};
  state.my_plugin.ui = state.my_plugin.ui || {};
  state.my_plugin.persist = state.my_plugin.persist || {};
  return state.my_plugin;
}
```

`state` 直下へ無秩序にキーを増やすと他プラグインと衝突しやすくなるため、避けてください。

## 6. Manifest 運用

`plugin` オブジェクトで `manifest` を指定し、`plugin_manifest.js` に資産をまとめます。

```js
window.RULE_MANIFEST = {
  scripts: ["./js/plugins/my_pack/my_config.js", "./js/plugins/my_pack/sub_logic.js"],
  styles: ["./js/plugins/my_pack/style.css"],
  ui: ["./js/plugins/my_pack/ui.html"]
};
```

補足:

- `scripts` は記述順で読み込まれるため、依存順を保つ
- `styles` / `ui` は重複チェックなしで読み込み
- 標準ディレクトリ外の構成は、manifest で明示的に自己管理する

## 7. 最小サンプル

```js
(function () {
  if (!window.ENGINE) return;

  const MyPlugin = {
    name: "MyPlugin",
    manifest: "./js/plugins/my_pack/plugin_manifest.js",

    onInit(ctx, state) {
      state.count = 0;
    },

    onCalculateDamage(ctx) {
      if (ctx.commentData?.membership?.isGiftReceiver) return;
      ctx.dmg = Math.max(1, (ctx.commentData?.message?.text || "").length);
      ctx.attack = { name: "WordHit" };
    },

    afterCalculateDamage(ctx, state) {
      state.count++;
      ctx.events.push({ motion: "pop", text: `-${ctx.dmg}` });
    }
  };

  ENGINE.use(MyPlugin);
})();
```

## 8. やってはいけないこと

- `js/core/engine.js` が呼ばない hook 名を前提にする
- `ctx` に未定義仕様の必須フィールドを勝手に追加前提にする
- Core 側に依存した密結合実装を作る（パッチ前提）

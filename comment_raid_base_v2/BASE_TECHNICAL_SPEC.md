# Comment Raid Base v2.0.0 Technical Specification

本仕様は `comment_raid_base_v2` の **現行実装（engine.js / script.js）** を基準に記述します。  
ここにない API や hook は「未サポート」です。

## 1. 構成

- Core
  - `js/core/engine.js`: プラグイン登録、hook 呼び出し、manifest 解決
  - `js/core/script.js`: OneSDK購読、FX橋渡し、`state.ui.status` 同期
  - `js/core/fx.js`: event の視覚演出
  - `../_vct_core/js/vct_one_core.js`: OneSDKコメント解析。V2では同梱旧SDKではなく共通VCT SDK v1.2.1+ を参照
- Rule Pack
  - `js/plugins/<pack>/...`: ルール、UI、CSS、追加データ

## 2. Plugin オブジェクト仕様

`ENGINE.use(plugin)` で登録するオブジェクトは次を持てます。

- 基本プロパティ
  - `name?: string`（重複名は登録スキップ）
  - `manifest?: string | string[]`
  - `dependencies?: string[]`
  - `style?: string`
  - `ui?: string`
- hook（任意）
  - `onInit(ctx, state, cfg)`
  - `onUpdate(ctx, state, cfg)`
  - `beforeComment(ctx, state, cfg)`
  - `onProcessAttack(ctx, state, cfg)`
  - `onCalculateDamage(ctx, state, cfg)`
  - `afterCalculateDamage(ctx, state, cfg)`
  - `afterComment(ctx, state, cfg)`

## 3. ライフサイクル

### 3.1 起動時

1. `cfg` に `window.CONFIG` をマージ
2. `resolvePlugins()` を実行
3. `onInit` を全プラグインに呼び出し

`onInit` に渡る `ctx`:

```js
{ now: performance.now() }
```

### 3.2 毎フレーム

`ENGINE.update()` -> `onUpdate` を全プラグインへ呼び出し。

`onUpdate` に渡る `ctx`:

```js
{ now: performance.now() }
```

### 3.3 コメント受信時

`ENGINE.onComment(commentData)` は `ctx` を生成して以下順で hook を呼びます。

1. `beforeComment`
2. `onProcessAttack`
3. `onCalculateDamage`
4. `afterCalculateDamage`
5. `afterComment`

途中で `ctx.terminated === true` なら、

- `beforeComment` 後: 以降をスキップして即 return
- `onProcessAttack` 後: 以降をスキップして即 return

戻り値は常に `ctx.events`。

## 4. `ctx` 仕様

コメント処理で生成される `ctx` 初期値:

```js
{
  commentData,
  events: [],
  dmg: 0,
  attack: null,
  terminated: false,
  isBossAction: false,
  now: performance.now()
}
```

主要フィールド:

- `commentData: object`
  - `script.js` から渡されるコメント情報
  - 実運用では `text`, `user`, `hasGift`, `isOwner`, `raw` 等が利用される
  - V2追加: `event`, `structured`, `message`, `monetization`, `membershipInfo`, `service`
  - `event.kind` は `normal`, `superchat`, `supersticker`, `membership_gift`, `membership_gift_received`, `member_join`, `member_milestone`, `membership_event` 等を取り得る
- `events: object[]`
  - 演出イベントキュー。`script.js` が `FX.push()` に渡す
- `dmg: number`
  - ダメージ値。各 hook で上書き可能
- `attack: object | null`
  - 攻撃情報（ログ用に `name` 利用が一般的）
- `terminated: boolean`
  - コメント処理中断フラグ
- `isBossAction: boolean`
  - ボス行動判定フラグ
- `now: number`
  - `performance.now()`

備考:

- `ctx.boostType` など追加フィールドは、プラグイン間で合意して任意追加できる
- ただし Core は追加フィールドの存在を保証しない

## 5. Hook 責務境界

- `beforeComment`
  - 入力ゲート。処理対象外判定と中断のみを担当
- `onProcessAttack`
  - 攻撃種別決定、初期ダメージ計算
- `onCalculateDamage`
  - 補正（ギフト倍率、ガード軽減、無効化など）
- `afterCalculateDamage`
  - `state` 反映と event 生成
- `afterComment`
  - 永続化や後始末

### 5.1 非同期 hook の扱い（現行実装）

- hook 呼び出しは基本的に同期前提で進行する
- hook が `Promise` を返しても、Core は完了待ち（await）をしない
- 非同期処理は fire-and-forget に近い扱いになり、後続 hook は先に進む
- そのため、非同期処理の完了結果を次の hook の前提にする設計は推奨されない
- `Promise` の reject は `Async hook error` としてログ出力される
- そのため、非同期処理の完了順は hook 呼び出し順と一致する保証がない

## 6. `state` / `cfg` 仕様

- `state`
  - Core 内部の共有オブジェクト
  - 全プラグインで同一参照
  - `ENGINE.getState()` は shallow copy (`{ ...state }`) を返す
  - 推奨: `state.<pluginNamespace>` 配下に集約して、プラグイン間のキー衝突を避ける
  - 推奨構造: `runtime` / `stats` / `ui` / `persist`
- `cfg`
  - `window.CONFIG` を初期値にした共有設定
  - `onInit` でプラグインが補正・追加して利用可能

補足:

- `ENGINE.getState()` は shallow copy のため、ネストしたオブジェクトは参照共有される
- 読み取り専用の参照用途を基本とし、状態変更は hook 内の `state` を通して行う

## 7. UI 同期インターフェース（script.js）

`script.js` は毎フレーム `ENGINE.update()` 実行後に `ENGINE.getState()` を参照し、`state.ui.status` を以下DOMへ同期します（要素が存在する場合のみ）。

- `#boss-label` <- `state.ui.status.label`
- `#boss-bar-fill` <- `state.ui.status.progress`（幅%）
- `#boss-bar-lag` <- `state.ui.status.progress`（遅延追従）
- `#boss-hp-text` <- `state.ui.status.text`

`state.ui.status.color` があれば `#boss-bar-fill` 背景色に適用。

## 8. FX インターフェース

コメント処理後、`script.js` が以下を実行:

- `events = ENGINE.onComment(commentData)`
- `events.forEach(ev => FX.push(ev))`

したがってプラグインは `ctx.events.push(event)` で演出要求を行う。

## 9. Manifest 仕様

### 9.1 エントリ解決

`resolvePlugins()` は以下を起点にスクリプトを読み込み:

- `window.CONFIG.PLUGINS`
- `window.PLUGIN_MANIFEST?.plugins`

重複URLはスクリプトのみ排除。

### 9.2 plugin プロパティ解決順

各登録プラグインに対して順に処理:

1. `plugin.style`（単一CSS）
2. `plugin.ui`（単一HTML）
3. `plugin.manifest`
   - `string`: そのJSを読み、`window.RULE_MANIFEST` を解釈
   - `string[]`: レガシー配列として script 群を順次読み込み
4. `plugin.dependencies`（script 群）

### 9.3 `window.RULE_MANIFEST` フォーマット

- レガシー

```js
window.RULE_MANIFEST = ["./a.js", "./b.js"];
```

- 推奨（統合オブジェクト）

```js
window.RULE_MANIFEST = {
  scripts: ["./js/plugins/my_pack/data.js", "./js/plugins/my_pack/logic2.js"],
  styles: ["./js/plugins/my_pack/style.css"],
  ui: ["./js/plugins/my_pack/ui.html"]
};
```

処理後、Core は `window.RULE_MANIFEST = null` に戻す。

### 9.4 パス運用ポリシー

- Core は manifest パスを自動補正しない
- 標準ディレクトリ外の構成を使う場合、manifest で読み込み順・パスを自己管理する
- 運用例: plugin 側の `index.html` / `config.js` から `../comment_raid_base_v2/js/...` のように Base を相対参照することで、Base 本体を編集せずに plugin ごとの単体管理・運用ができる
- script 依存順は `scripts` 配列の記述順で保証する

## 10. 互換・制約

- engine が呼ばない hook は実行されない
- hook 内例外は catch され、`plugin名 / hook名 / error` を含むログで出力される
- hook が Promise を返した場合、reject は `Async hook error` として catch される（完了待ちはしない）
- `styles` / `ui` は読み込み済み重複チェックをしない
- `OneSDK` 未接続時のコメント処理は `script.js` 依存

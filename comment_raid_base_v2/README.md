# Comment Raid Base v2.0.0

Comment Raid Base v2.0.0 は、わんコメ向けリアルタイム演出を **Core** と **Rule Pack (Plugin)** に分離した開発基盤です。  
本ドキュメントは「現在の実装」に合わせて、plugin author が `ctx / hook / manifest` を理解しやすい形で整理しています。

V2 では同梱旧SDKを廃止し、共通基盤 `../_vct_core/js/vct_one_core.js` (VCT SDK v1.2.1+) を参照します。既存互換の `VCT.parse()` 形式に加えて、`ctx.commentData.event` / `structured` / `monetization` から現行SDKの分類情報を利用できます。

## 1. 目的

- Core を変更せずに、ルールやUIをプラグイン側で差し替える
- プラグインは hook で処理を差し込み、`state` と `ctx.events` で動作を構成する
- UI/CSS/追加JS は manifest で宣言して動的ロードする

## 2. 最小構成

```text
comment_raid_base_v2/
├── index.html
├── config.js
├── style.css
├── js/
│   ├── core/
│   │   ├── engine.js
│   │   ├── script.js
│   │   └── fx.js
│   └── plugins/
│       ├── _starter_kit/
│       │   ├── starter_logic.js
│       │   ├── starter_config.js
│       │   ├── plugin_manifest.js
│       │   ├── ui.html
│       │   └── style.css
│       ├── sample_counter/
│       │   ├── sample_counter_logic.js
│       │   ├── sample_counter_config.js
│       │   ├── plugin_manifest.js
│       │   ├── ui.html
│       │   └── style.css
│       └── raid_battle/
│           └── ...
```

## 3. プラグイン有効化

`config.js` の `window.CONFIG.PLUGINS` に、エントリープラグイン（通常は `*_logic.js`）を設定します。

```js
window.CONFIG = {
  PLUGINS: [
    "./js/plugins/raid_battle/raid_logic.js"
  ]
};
```

## 4. plugin author 向け要点

- hook 実行順: `onInit` -> `onUpdate`(毎フレーム) -> コメントごとに `beforeComment` -> `onProcessAttack` -> `onCalculateDamage` -> `afterCalculateDamage` -> `afterComment`
- コメント処理用 `ctx` 主要フィールド: `commentData`, `events`, `dmg`, `attack`, `terminated`, `isBossAction`, `now`
- `ctx.commentData` は従来互換の `text`, `user`, `hasGift`, `colorStr`, `raw` を維持し、V2追加情報として `event`, `structured`, `message`, `monetization`, `membershipInfo`, `service` を持ちます
- `ctx.events` に event を push すると `script.js` 経由で `FX.push()` に渡される
- `state` は全プラグイン共有。UI同期は `state.ui.status` を利用可能

詳細は以下を参照:
- `BASE_DEVELOPMENT_GUIDE.md`
- `BASE_TECHNICAL_SPEC.md`

`sample_counter` は Raid 非依存の最小サンプルです。  
`_starter_kit` が拡張用テンプレートであるのに対し、`sample_counter` は最小完成例として参照できます。

## 5. Manifest 運用方針

本 Base では、プラグインの追加資産は manifest ベースで管理します。

- 標準構成（`js/plugins/<plugin_name>/`）でも `plugin_manifest.js` で管理する
- **標準ディレクトリから外れる構成にする場合は、manifest で自己管理すること**
  - 例: `data/`, `assets/`, `ui/` を別階層に置く
  - 例: 複数JS/CSS/HTMLを段階的に読み込む
- Core はパス解決を自動補正しないため、manifest のパスは実際に読み込める相対/絶対指定にする

## 6. 実装上の注意

- 推奨表示サイズ: 1920x1080
- 変更後は OBS 側でキャッシュ更新を行う
- Base の JS (`js/core/*`) は変更せず、プラグイン側で拡張する

## 7. ライセンス

# コード
- 本プロジェクトのコード部分は **MIT License** の下で公開されています。
- 自由に使用・改変・再配布できます。

# わんコメ（OneComme）について
- 本テンプレートは **わんコメ（OneComme）** を利用して動作します。
- 使用にあたっては **わんコメの利用規約に準拠してください。**

## 8. 更新履歴

- v2.0.0 (2026-06-12)
  - Base V1をフォークし、VCT SDK参照を `../_vct_core/js/vct_one_core.js` に移行
  - `ctx.commentData.event` / `structured` / `monetization` を追加し、VCT SDK v1.2.1+ の分類情報をプラグインで利用可能に変更
  - `ENGINE.extractGiftPrice()` が利用可能な場合は `VCT.extractSupportAmount()` を優先
- v1.1.1 (2026-03-14)
  - ログの切り分けロジックを改善（お名前に「の」が含まれるリスナーの表示崩れを修正）
- v1.1.0 (2026-03-12)
  - 動的 UI/CSS/Script ロード（manifest 方式）を正式化
  - plugin author 向けに責務分離を強化

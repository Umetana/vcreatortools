# VCT Core

`_vct_core` は、VCT 系テンプレートで共有する IndexedDB を形成・保守する常駐基盤テンプレートです。

## 現在の版

- VCT Core: `v0.3.1-dev`
- VCT OneComme Core SDK: `v1.1.0`
- VCT_IDB wrapper 仕様: `v0.5.0` 系由来

`VCT_IDB` の仕様版と VCT Core 本体版は別系統です。
`VCT_IDB_SPEC.md` の `v0.5.0` は、旧 `__shared` 側の IndexedDB wrapper 仕様を引き継いだものです。

## 構成

- `index.html`: 監視UI付きエントリ
- `style.css`: 監視UIスタイル
- `config.js`: Core 起動設定
- `main.js`: logger / runtime / ui の boot
- `js/vct_one_core.js`: OneSDKコメント解析とレコード生成
- `js/vct_runtime.js`: OneSDK購読、streamId解決、DB保存フロー
- `js/vct_ui.js`: 監視UI描画、ボタン操作、danger panel
- `js/vct_logger.js`: ログ保持、console出力、UI通知
- `js/vct_idb*.js`: IndexedDB facade と内部実装

## v0.3.0 の要点

- `main.js` を boot 専用へ縮小
- runtime / ui / logger を分離
- User / Support レコード生成を `VCT` 側へ移動
- `streamId` は runtime で確定し、保存前にレコードへ注入
- `window.VCT_IDB` の既存Facadeは維持

詳細は [VCT_CORE_SPEC.md](./VCT_CORE_SPEC.md) を参照してください。

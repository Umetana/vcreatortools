# Ms.Bridge V2

Ms.Bridge V2 は、わんコメの OneSDK から購読したコメントデータとメタデータを、localhost 上の接続先へ HTTP POST で送信する中継テンプレートです。

## 現行版

- テンプレート: `v0.6.0-dev`
- イベントschema: `msbridge.event.v1`
- 接続先の既定値: `http://127.0.0.1:3000/bridge`
- 正規化API: VCT SDK `v2.0.0-dev` の `VCT_SDK.normalize()`

確定仕様は [SPEC.md](./SPEC.md) を参照してください。

## 責務

Bridge が行う処理は以下に限定します。

1. OneSDK からコメントとメタデータを購読する
2. コメントをraw、normalized、または両方の形式で送信する
3. normalizedを `VCT_SDK.normalize()` で生成する
4. メタデータをraw形式で送信する
5. localhostの接続先へイベントを順次送信する

受信後の保存、ルール判定、gadgetへの振り分け、外部API呼び出し、戻り通信はBridgeの責務に含みません。

## 操作

1. わんコメのカスタムテンプレートとして読み込む
2. 送信先URLと送信対象を設定する
3. `Bridge送信` を有効にする
4. 必要に応じて `Start` / `Stop` で受付状態を切り替える

送信先は `localhost`、`127.0.0.1`、`::1` のHTTP/HTTPS URLだけを許可します。

comment送信形式は、通常運用では `normalized`、デバッグでは `both`、OneSDK原本だけを調査する場合は `raw` を使用します。rawは一部フィールドを抜粋せず、受信したcomment objectをそのまま格納します。

## ファイル

- `index.html`: 操作UIと依存スクリプトの読み込み
- `script.js`: OneSDK購読、データ整形、送信処理
- `style.css`: 操作UIのスタイル
- `SPEC.md`: 現行の確定仕様
- `olds/`: v0.1旧実装
- `olds2/`: v0.2旧実装

## 旧資料

旧設計資料は `__docs/Ms.Bridge_V2/archive/` へ退避しています。Hub、toc_ws、gadgetの資料はBridgeの責務外として、それぞれの資料ディレクトリへ分離しています。

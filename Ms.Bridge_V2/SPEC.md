# Ms.Bridge V2 仕様書

## 1. バージョン

- 実装バージョン: `v0.6.0-dev`
- schema: `msbridge.event.v1`
- 正規化: VCT SDK `v2.0.0-dev` の `VCT_SDK.normalize()`

## 2. 目的

わんコメのOneSDKから購読したコメントデータおよびメタデータを、localhost上の接続先へ一方向に送信します。

## 3. 責務範囲

### 3.1 対象

- OneSDKのcomment購読
- OneSDKのmeta購読
- rawコメントの完全保持
- Structured形式への正規化
- JSON envelopeの生成
- HTTP POSTによる順次送信
- 一時的な送信失敗への短時間再試行

### 3.2 対象外

- イベントの永続保存
- 受信側のルール判定
- gadgetへの振り分け・再配信
- gadget固有のaction生成
- 外部API呼び出し
- 接続先からBridgeへの戻り通信
- Legacy形式の生成と送信

## 4. コメント送信形式

`commentFormat` は以下のいずれかです。

| 値 | payload | 用途 |
| --- | --- | --- |
| `normalized` | `normalized` | 通常運用 |
| `both` | `raw` と `normalized` | デバッグ |
| `raw` | `raw` | OneSDK原本の調査 |

`normalized` は常に `VCT_SDK.normalize(comment)` の戻り値です。SDKの `includeRaw` は使用せず、rawは `payload.raw` へ分離します。

新規設定の既定値は `normalized` です。localStorageに保存済みの送信形式がある場合は、その選択を維持します。

### 4.1 raw

rawはOneSDKから受信したcomment objectをそのまま格納します。一部フィールドだけを抽出するlite形式は使用しません。

### 4.2 SDK情報

normalizedを送信する場合、payloadへ使用したSDKの情報を付加します。

```json
{
  "sdk": {
    "name": "VCT SDK",
    "version": "2.0.0-dev"
  }
}
```

## 5. メタデータ

metaイベントのpayloadは次の形式です。

```json
{
  "raw": {}
}
```

metaは設定したクールダウン期間内の連続送信を抑制します。設定範囲は0～60000ミリ秒です。

## 6. envelope

commentとmetaは共通のenvelopeで送信します。

```json
{
  "schema": "msbridge.event.v1",
  "eventType": "comment",
  "sentAt": "2026-08-16T00:00:00.000Z",
  "source": {
    "app": "onecomme",
    "bridge": "Ms.Bridge_V2",
    "bridgeVersion": "0.6.0-dev",
    "templateVersion": "v2"
  },
  "sequence": {
    "commentIndex": 0,
    "receivedAt": 0
  },
  "payload": {}
}
```

`eventType` は `comment` または `meta` です。旧互換フィールドの `type`、`ts`、`trigger_legacy` は使用しません。

## 7. 送信

- method: `POST`
- content type: `application/json`
- 接続先: localhost上のHTTP/HTTPS URL
- キュー上限: 200件
- 最大試行回数: 3回
- 再試行待機: 250ミリ秒、750ミリ秒

キュー上限を超えたイベントは破棄し、画面上の破棄件数へ反映します。

## 8. 設定保存

設定はlocalStorageの `ms_bridge_v2_settings_v04` に保存します。v0.4系から設定を引き継ぐため、保存キーは変更しません。

旧設定の `normalizedFormat` と `rawLevel` は読み込まれても使用・再保存されません。

## 9. 変更履歴

### v0.6.0-dev

- 正規化処理をVCT SDK v2.0.0-devの `VCT_SDK.normalize()` へ移行
- 新規設定のcomment送信形式を `normalized` へ変更
- rawのlite形式と `rawLevel` 設定を廃止
- rawを常にOneSDK comment objectの完全な原本として送信
- normalized送信時にSDK名とバージョンを付加

### v0.5.0-dev

- normalizedを `VCT.parseStructured()` に統一
- Legacy形式と `VCT.parse()` の使用を廃止
- normalized内部形式の選択設定を廃止
- envelopeから旧互換フィールド `type` と `ts` を削除
- Bridgeの責務外となるHub、toc_ws、gadget資料を分離

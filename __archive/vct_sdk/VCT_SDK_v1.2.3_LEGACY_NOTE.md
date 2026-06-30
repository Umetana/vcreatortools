# VCT SDK v1.2.3 Legacy互換版 退避メモ

このディレクトリは、旧配布テンプレートの保守や検証に備えて `vct_one_core.js` v1.2.3 を退避したものです。

## 退避ファイル

- `vct_one_core_v1.2.3_legacy-compatible.js`
- `VCT_SDK_SPEC_v1.2.3_legacy-compatible.md`

## 位置づけ

- 旧配布テンプレートは、同梱SDKのまま凍結して扱う。
- 新規開発やV2系テンプレートでは、原則として `_vct_core/js/vct_one_core.js` を参照する。
- Legacy互換の `VCT.parse()` / `comment.text` は、古いテンプレートを壊さないための表示用互換層として扱う。
- コマンド判定、ゲーム判定、DB保存、支援判定などのロジックでは、`parseStructured()` の `message` / `event` / `monetization` / `structured` を優先する。

## 注意点

Legacy互換の `text` は、SuperChat等のギフトコメントで本文と `paidText` が結合されることがあります。

例:

```json
{
  "raw": {
    "data": {
      "comment": "A",
      "paidText": "¥1,000"
    }
  },
  "normalized": {
    "text": "A ¥1,000"
  }
}
```

このため、`comment.text` をそのままコマンド判定やBET判定に使うと、裸コマンドや単独文字コマンドが誤判定される可能性があります。

## 今後の方針

- V2以降のテンプレートでは、Legacy `text` 直参照を増やさない。
- 既存テンプレートを改修する場合は、表示用途と判定用途の本文取得を分離する。
- Legacy互換を外す場合は、旧配布テンプレートを凍結版として残し、新規系は `_vct_core` 参照へ寄せる。

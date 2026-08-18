# ④.5 レンダリング疎結合化 契約設計追補 v004

- 親正本: `presentation-rendering-decoupling-contract-design-20260817-v001.md`
- 親正本SHA-256: `aec224048ac6131173eb8b69b4b4d45cda88d5646ab3b67e8fa8b5561310df94`
- 累積追補: v001、v002、v003
- 工事ID: `PRESENTATION-RENDERING-DECOUPLING-V001`
- 日付: 2026-08-18
- 状態: kawafmm承認済み

## 1. 目的

人間合格済みの字幕selectionが持つ意味上の行末を、cue終端とは別の版付きprojectionとしてrendererへ明示的に渡す。注文書、cue終端projection、本文、表示frame、style profileは変更しない。rendererは行末を再選択せず、jobと公開後再読済みreceiptで一致した行末projectionをatomへ一対一解決して使用する。

## 2. 正本path会計

正本pathは現在23/25件である。本追補文書を24件目として追加する。production・testの変更は既存正本path内で閉じ、新しいimplementation/test pathは追加しない。25件目は未使用のまま残す。

## 3. 意味上の行末projection

cue終端projectionと同じproduction moduleに、次の別schemaを追加する。

```json
{
  "schemaVersion": "presentation-semantic-line-end-projection-v001",
  "projectionId": "<formal id>",
  "sourcePackageBinding": "<formal binding>",
  "cueEndProjectionBinding": "<formal binding>",
  "sourceSelectionDigest": {
    "schemaVersion": "presentation-output-caption-cue-selection-v001",
    "artifactId": "<selection id>",
    "fileSha256": "<sha256>",
    "canonicalSha256": "<sha256>"
  },
  "captions": [
    {
      "caseId": "<formal id>",
      "inputCaptionId": "<formal id>",
      "semanticCaptionId": "<formal id>",
      "ordinal": 1,
      "cues": [
        {
          "cueId": "<formal id>",
          "cueOrdinal": 1,
          "cueEndBoundaryId": "<boundary id>",
          "lineEndBoundaryIds": ["<boundary id>"]
        }
      ]
    }
  ],
  "provenance": {"producerJobBinding": "<formal binding>"}
}
```

projectionはsource packageと正式selectionのstable再読値からのみ製造する。selectionのpath、本文、時刻、style、provider response、素材固有期待値を保持しない。caption、cue、境界はsource packageの順序だけを使う。各行末境界はsource caption内で一件だけ存在し、cueの開始より後かつcue終端以下でstrict増加し、最後の行末はcue終端と一致する。cue終端projectionのcaption/cue/終端とも全件一致する。違反、欠落、重複、順序差はfail-closedとする。

## 4. renderer job・admission・receipt

renderer jobへtop-level `lineEndProjectionBinding`を追加する。caption jobでは`presentation-semantic-line-end-projection-v001`のformal bindingを必須とし、title jobでは`null`を必須とする。workspace相対pathだけを許し、job、環境、default、旧selectionからの暗黙補完を禁止する。

caption formal runnerは、source packageと正式selectionのstable再読後にcue終端projectionと行末projectionを同じproducer jobの下で正式公開し、両bindingをinstruction/renderer配線へ渡す。

admissionは次を検査する。

1. job bindingとstable再読値のbyte・canonical SHA一致。
2. 行末projectionのsource package bindingがcaption instructionの意味package/cue終端来歴と同じsourceを指すこと。
3. 行末projectionのcue終端projection bindingが実読取済みcue終端projectionと一致すること。
4. caption/cue/終端/行末の一対一対応、cue内順序、全atom閉包。
5. titleで行末projectionが`null`、captionで非`null`であること。

receiptへjobの`lineEndProjectionBinding`をそのまま転記する。rendererはjobとreceiptで一致したbindingのstable再読値だけを使用する。

## 5. 行分割規則

speech captionの規則IDを`semantic-line-end-projection-v001`へ改訂する。titleの`greedy-code-point-v001`は変更しない。

captionの行分割は、instructionが持つatom occurrence列に対し、行末projectionの各境界をsource packageのboundary列から一件だけ解決し、対応する`afterAtomOccurrenceId`で分ける。境界不存在、重複解決、cue外、順序不正、最終境界とcue終端の不一致、atom欠落・重複、論理幅超過、maxLines超過はfail-closedとする。係数、重み、均衡再選択、fallback、素材固有境界を追加しない。

## 6. 検査

検査IDは44件のまま増減しない。

- PRP001〜006: 別schemaのformal byte、source/selection/cue終端対応、行末の一意解決、cue終端projectionへの行末混入0件、決定性を既存ID内のsubcaseで実発火する。
- PRL001〜004/007/008: caption行分割が明示projectionだけから作られ、voice-013の旧page/line planと本文・atom列・論理幅・行末をbyte一致で再現し、均衡列挙・旧selection fallbackが0件であることを観測する。PRL005/006のtitle規則は不変。
- PRA002/010/012: 行末projectionのstable再読、job/receipt一致、caption必須・title null、欠落・差替え・旧selection fallback拒否を実発火する。
- PRM003: voice-013の本文、cue終端、frame、行末projection、line layoutが分離前oracleとbyte一致する。

契約期待、test宣言、TAP observed、TAP passedの四者44/44 exactを維持する。

## 7. 不変条件

注文書schema、cue終端projection schema、字幕本文、cue終端、表示frame、styleProfileId、preset registry、既存正式成果物、stable tagは変更しない。旧経路を物理削除しない。素材固有文字列・固定境界・独自係数・暗黙補完を追加しない。API通信・費用・commit・tag・公開は0件とする。

## 8. 停止条件

正本25 path到達、親契約の追加意味変更、復元後baselineが86/203にならない、観測後も原因確定不能、PRM003不合格、同型停止3回、承認済み枠到達だけを停止条件とする。それ以外の原因確定済みで修正が一意な実装・設営・配線欠陥は証拠を保存して続行する。

## 9. 承認記録

kawafmmは2026-08-18、人間合格済み意味行末を別projectionとして公開し、renderer job・receiptで明示束縛してfail-closedに使用する案Aを承認した。追補4/5、停止8/12、検査設営修正5/15、限定実装修正3/6、正本path24/25である。

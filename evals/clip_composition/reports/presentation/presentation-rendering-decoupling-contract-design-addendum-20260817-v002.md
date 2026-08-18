# ④.5 レンダリング疎結合化 契約設計追補 v002

- 親正本: `presentation-rendering-decoupling-contract-design-20260817-v001.md`
- 親正本SHA-256: `aec224048ac6131173eb8b69b4b4d45cda88d5646ab3b67e8fa8b5561310df94`
- 累積追補v001: `presentation-rendering-decoupling-contract-design-addendum-20260817-v001.md`
- 工事ID: `PRESENTATION-RENDERING-DECOUPLING-V001`
- 日付: 2026-08-17
- 状態: kawafmm承認済み

## 1. 目的

captionの表示presetが複数の表示状態を持つ場合にも、配列先頭、固定文字列、環境変数、既定値を使わず、renderer job byteだけから表示状態を一件へ確定できるようにする。

注文書は従来どおり意味内容、cue終端、frame、`styleProfileId`を所有する。表示状態は出力側の責務としてrenderer jobとadmission receiptが所有し、注文書schemaへ追加しない。

## 2. renderer job exact schema

`executionInputs`のexact key順を次へ改訂する。

```json
{
  "format": "normal-landscape",
  "canvas": {"width": 1920, "height": 1080, "fps": 30},
  "screenLayoutId": null,
  "visualStateId": "<formal-id>",
  "cropPolicy": {"mode": "already-applied"},
  "sceneTransitionPolicy": {"mode": "straight-cut"},
  "audioPolicy": {"mode": "preserve-source"},
  "lineLayoutRules": {
    "speech-caption": "balanced-source-boundary-v001",
    "title": "greedy-code-point-v001"
  }
}
```

`visualStateId`は空でないformal IDとし、欠落・余分・別位置への配置を拒否する。execution input value bindingの固定順にも`/executionInputs/visualStateId`を追加する。

## 3. 値の供給

### 3.1 caption

caption正式runnerは、正式source packageをstable再読した結果に含まれる対象caseの`resolvedStyle.visualStateId`を転記する。source package以外のpreset配列順、固定文字列、旧render plan、環境変数から補完しない。

### 3.2 title

title正式runnerは、注文書の`styleProfileId`で一件に選択済みのprofileが持つ`visualState.stateId`を転記する。profileが一件でない、`visualState`が一件でない、またはstate IDが不正な場合はrenderer jobを発行しない。

## 4. admissionとreceipt

admissionは次を全て満たす場合だけacceptedとする。

1. 注文書の`styleProfileId`に該当するpreset/profileが台帳内にexact一件ある。
2. renderer jobの`visualStateId`に該当する状態が、そのpreset/profile配下にexact一件ある。
3. captionの`visualStates`配列とtitleの単一`visualState`を同じ規則で一件へ閉じる。
4. 他profile配下の同名状態、配列先頭、default、semantic kind対応表を選択根拠にしない。

receipt exact keyへ、`styleProfileRegistryBinding`の直後に`visualStateId`を追加し、renderer jobの値をbyte同一で転記する。receipt検査はjobと同値であること、execution input bindingが同pointerの値を束縛することを検査する。

rendererはjobと公開後stable再読済みreceiptの`visualStateId`が一致した場合だけ、その一致値を表示状態選択へ渡す。jobだけ、receiptだけ、注文書だけからは続行しない。

## 5. 検査差分

- PRA005: profile一件に加え、その配下の`visualStateId`一件を実発火で検査する。重複・欠落・別profile配下だけの一致を拒否する。
- PRA010: `visualStateId`が注文書内0件、renderer jobとreceiptに同値一件、execution input bindingに一件であることを検査する。
- PRM001: caption正式source contextの`resolvedStyle.visualStateId`がrenderer job、receipt、共通描画計画へ同値で届くことを検査する。
- PRM005: titleの選択済みprofile内`visualState.stateId`がrenderer job、receipt、共通描画計画へ同値で届くことを検査する。
- PRM007: caption/titleとも旧direct builder、配列先頭、default、環境変数から表示状態を選ばないことをsource・import graph・実capabilityで検査する。

検査IDはPRP 6、PRI 10、PRL 8、PRA 12、PRM 8の合計44件から増減しない。契約期待、test宣言、TAP observed、TAP passedの四者exact一致を維持する。

## 6. path会計

親正本と追補v001が固定した正本18 pathを変更しない。本追補、TAP、job、動画、QC、review page、停止・完了報告は作業path枠で管理する。19 path目は禁止する。

## 7. 不変条件と停止条件

注文書schema、本文、cue終端、frame、`styleProfileId`、既存成果物、stable tagを変更しない。二重解釈、配列先頭default、注文書への表示状態追加を禁止する。

caption/titleのどちらかでstable再読済み正式入力から`visualStateId`を供給できない、profileまたはstateが一件に閉じない、19 path目または親正本の意味変更が必要な場合は停止する。

## 8. 承認記録

kawafmmは2026-08-17、renderer jobが`visualStateId`を所有し、caption/titleの正式入力から転記し、receiptとの一致値だけをrendererが使用する案Aを承認した。追補件数は2/5である。

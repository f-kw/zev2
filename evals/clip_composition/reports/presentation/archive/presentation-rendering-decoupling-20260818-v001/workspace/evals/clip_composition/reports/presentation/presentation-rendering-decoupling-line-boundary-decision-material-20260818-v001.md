# ④.5 レンダリング疎結合化 行末所有の裁定資料 v001

## 1. 確認済み事実

1. v022正式selectionは、voice-013の10番目のcueについて、終端を`display-boundary-000001-000090`、途中の行末を`display-boundary-000001-000083`として正式保存している。
2. 分離前page/line planは、その行末をatom `000083`へ解決し、`デスカード、デビルカード` / `来ないんだけど`を描画した。
3. 現在のcue終端projectionは、選択済み行末を意図的に除き、cue終端だけを保持する。PRP004も`lineEndBoundaryIds`が0件であることを証明する。
4. 新rendererは行末を受け取らず、`balanced-source-boundary-v001`により全atom境界を列挙し、行数最小、最大行幅最小、幅差最小、境界ordinalの順で選ぶ。その結果は幅18/20のatom `000080`である。
5. 本文、cue終端、frame、atom集合、atom順序は一致し、違うのは行末一件だけである。

## 2. 案A: 人間合格済みの意味上の行末を維持する（推奨）

### 2.1 境界

- 現行cue終端projectionは変更しない。行末0件という責務とPRP004を保つ。
- 同じproduction moduleに、別schemaの`semantic line-end projection` builder/validator/codecを追加する。
- projectionはsource packageと正式selectionをstable再読し、caption ID、cue ID、cue終端、選択済み行末境界IDだけを決定的順序で持つ。selectionのpath、本文、時刻、style、provider応答、素材固有期待値は持たない。
- caption formal runnerがprojectionを正式公開し、renderer jobがそのbindingを明示入力として持つ。
- admissionがsource package、cue終端projection、line-end projectionのcaption/cue/境界対応を照合し、receiptへ同じbindingを転記する。
- line layoutはjobとreceiptで一致したline-end projectionだけを使用し、指定された境界をatom IDへ一対一解決する。境界不存在、cue外、順序不正、幅超過、物理配置不成立はfail-closedとする。
- 注文書schema・本文・cue終端・frame・styleProfileIdは不変とする。

### 2.2 path会計

現在23/25件。実装は既存正本path内で閉じる。

- 既存変更: cue終端projection production/test、line layout production/test、admission production/test、renderer runner/test、caption proof runner/test、fixture runner/test。
- 新規正本path: 版付き追補v004の1件だけ。
- 実装後: 24/25件。

別production moduleと別test moduleを新設すると、追補を含めて26/25となるため採らない。

### 2.3 検査

- 44 IDの総数を変えず、PRP004はcue終端projectionへの行末混入0件を維持する。
- PRL004とPRM003へ、line-end projectionの実値が分離前page/line planへbyte一致する観測を追加する。
- PRA002/010/012へ、line-end projectionのstable再読、job/receipt一致、欠落・差替え・旧selection fallback拒否を追加する。
- 期待、test宣言、TAP observed、TAP passedの四者44/44 exactを維持する。

### 2.4 効果と影響

- v022で人間合格した表示を保持できる。
- 行末を暗黙補完せず、独立成果物としてレビュー可能になる。
- AIは意味cueと必要な行末を選び、rendererはbinding・幅・物理配置を検査して描画する分業になる。
- 現契約の「rendererが行末を再選択する」責務は改訂されるため、第1層承認が必要である。

## 3. 案B: 新rendererの均衡分割を正とする

- `balanced-source-boundary-v001`の幅18/20を維持する。
- PRM003と完了条件の「分離前byte一致」を「本文・cue終端・frame・atom閉包一致、行末は新規則」と改訂する。
- 新規production artifactは不要で、追補v004一件だけを追加する。
- 人間合格済みの表示が変わるため、工事完了前に新動画の目視判断が必要になる。

## 4. 比較

| 項目 | 案A | 案B |
|---|---|---|
| 分離前の見た目 | 維持 | 一件変わる |
| 注文書 | 不変 | 不変 |
| 新規implementation path | 0 | 0 |
| 新規正本path | 追補1件 | 追補1件 |
| 行末の所有 | AI選択を版付きprojection化、rendererが検査 | rendererが再選択 |
| 追加目視 | 不要（byte oracle維持） | 必要 |
| 現契約の改訂 | 必要 | 必要 |

## 5. 推奨と一問

案Aを推奨する。字幕品質v002で人間合格した意味上の行末を失わず、注文書へ描画値を混ぜず、selectionそのものをrendererへ渡さず、明示bindingとfail-closedを維持できるためである。

**案A（意味上の行末を別projectionとして明示的に保持）を採用してよいか。**

## 6. 別件の完了保留

baseline 203件は、現在のclean checkoutに、既存testが参照する未追跡3.38GB fileが存在しないため85/203となった。差はR3一件だけで、他202件のID順・合否は保存oracleと一致する。このfileをarchive等から読取専用cloneとして復元する操作は本資料の案A/Bに含めず、別の第1層判断とする。

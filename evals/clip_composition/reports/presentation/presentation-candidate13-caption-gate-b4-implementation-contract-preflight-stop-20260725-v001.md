# candidate 13 B4 実装前完全性監査 停止報告v001

- 作成日: 2026-07-25
- 状態: **実装前停止**
- 対象正本: `presentation-candidate13-caption-gate-b4-display-plan-contract-design-20260725-v001.md`
- 承認範囲: B4実装、合成85件、既存回帰、candidate 13読み取り専用preflight
- 実装: 0件
- testdata: 0件
- job: 0件
- 検査実行: 0件
- Gemini実走: 0件
- 正式成果物生成: 0件

## 1. 結論

B4設計の目的、責務分離、成果物の大枠、69違反codeの集合、85件という検査構成は確定している。しかし、実装者判断なしでcode・runner・検査期待を一意に作るための詳細が残っていた。

夜間停止条件の「設計に書かれていない設計判断・契約解釈が新たに必要」「契約・既存検査の曖昧さを発見」に該当する。このため、コードを書いて不合格を出してから契約を補う進め方は採らず、実装前に停止した。

B4の方向設計が不採用になったわけではない。必要なのは、実装契約の追補である。

## 2. 確定済みで、そのまま維持できること

1. B4→B5→B6の段階分離。
2. B4の機械合格を「読める」の人間合格へ昇格しない状態契約。
3. display plan、instruction bundle、caption check、layout preflight、review request、manifest、validation reportの固定7ファイル。
4. 一つのmeaning groupからcue・target・instructionを一件ずつ作る責務。
5. source atom全件の欠落・重複・逆順禁止。
6. cue境界接触は許可し、正の交差だけを拒否する規則。
7. source atom正重なりは観測、時刻逆転は拒否する規則。
8. v002 fallbackを作らないこと。
9. candidate 13固有値をpreflightへ分離すること。
10. B1 pure compilerを再利用し、同等compilerを複製しないこと。

## 3. 実装者判断が必要になった未固定事項

### 3.1 実装・job・正式出力の具体path

設計はrole名を定めたが、次の正本pathを定めていない。

- B4 pure core。
- 正式runner。
- preflight runner。
- 合成検査。
- formal job root。
- preflight job root。
- 正式pair rootの親directoryと命名規則。

既存B1の命名から類推して作ることはできるが、その選択はinput path安全検査、許可root、監視root、正式公開検査の期待を変える。

### 3.2 上位IDの採番

cue、target、instructionの形式は固定済みだが、次の値の作り方が未固定である。

- `pairId`
- `displayPlanId`
- `instructionSetId`
- `resolutionPackageId`
- `artifactId`
- `requestId`

job値のexact copy、artifact IDからの決定的派生、固定suffixのどれを採るかで正式byteが変わる。

### 3.3 formal JSONとcanonical SHA-256の正本

次が未固定である。

- formal JSONのindent、末尾改行、UTF-8/BOM、重複key拒否。
- canonical JSONのobject key順、number、negative zero、小数、配列順。
- `contentSetCanonicalSha256`の入力shape。
- `sourceAtomsSha256`、artifact canonical SHA、compiler observed byte SHAの直列化入口。

B1の
`serializePresentationCaptionB1FormalJsonV001`、
`canonicalizePresentationCaptionB1JsonV001`、
`sha256PresentationCaptionB1BytesV001`
を正本として共有する案は導出できるが、B4設計は共有を明示していない。別実装を作ることもできるため、独自判断できない。

### 3.4 69違反codeの発火契約

code名と順序は確定しているが、各codeについて次が未固定である。

- 担当する17 checkのどれか。
- exact trigger。
- validation subject上のexact path。
- 同時発火を許すcode。
- 上流不成立時に抑制するcode。
- 同一原因を一件に畳むか、leafごとに出すか。

69 code全発火と`export集合=テスト観測集合`を実装するには、この対応表が必要である。code名から発火条件を推測すると、検査器が正本になってしまう。

### 3.5 pure builder/checkerの入力shapeと正式入口

「testとproductionが同じexportを使う」は確定しているが、次が未固定である。

- pure builderの関数名とexact context shape。
- checkerの関数名とexact validation subject shape。
- caption checker、instruction checker、layout inspectorをどの順で呼ぶか。
- B1 validation report validatorへ渡すcontext。
- B1 compiler再構築で使う既存exportとserializerのexact組合せ。
- runnerが同一exportを使ったことを検査する方法。

既存B1には必要なpure exportが実在することは確認した。しかし、B4側の縫い目はまだ一意でない。

### 3.6 layout・timelineの共有実装

設計は`layoutPreflightCore`, `rendererLayoutCore`, `timelineV002`というroleを置いたが、具体pathと共有関数を固定していない。

特に次が未固定である。

- 事前幾何モデルの正本関数。
- source時刻の「timeline内に入る」検査だけか、output frame写像まで生成するか。
- `TIMELINE_MAPPING_FAILED`のexact trigger。
- safe area・line intersectionの観測値shape。

ここを選ぶとlayout preflightの合否と正式byteが変わる。

### 3.7 reportの残るnested shape

root field順は多く固定されているが、次の完全shapeが未固定である。

- caption checkの各violation/observation。
- layout checkの各statusとscope exclusions。
- pair validationのinput binding六群の直列化shape。
- 失敗時の`observedProjection`、`reviewState`、`readOnlyObservation`。
- preflightのcheck名・固定順とcode帰属。
- fatal JSONのexact shape。

### 3.8 合成85件と既存回帰の一件表

69 code probe、帰属・抑制10件、実経路6件という内訳は確定している。しかし、各test名、mutation、期待code/path、期待check statusの一対一表がない。

また「既存G1〜G3、話者、timeline、rendererの全回帰」は対象file名と事前合格件数が未固定である。実装者が都合のよい集合だけを選べる余地を残す。

## 4. 既存成果物との照合で確認できたこと

実装前監査で、B1側には次のpure入口が実在することを確認した。

- `buildPresentationCaptionSemanticCompilerInputV001`
- `checkPresentationCaptionSemanticOutputV001`
- `validatePresentationCaptionSemanticOutputValidationReportV001`
- `serializePresentationCaptionB1FormalJsonV001`
- `canonicalizePresentationCaptionB1JsonV001`
- `sha256PresentationCaptionB1BytesV001`

したがって、B1→B4の受け渡し能力が存在しないのではない。追補で「どの入口を、どのshapeで、どの順序で使うか」を固定すれば実装可能である。

candidate 13の静的値も変更していない。

- source atom: 354
- container: 3
- boundary candidate: 205
- timeline segment: 2
- source atom正重なり: 0
- 隣接boundary candidate正重なり: 0

## 5. 推奨する追補の内容

一つの`B4実装契約追補v001`で、次を固定する。

1. 実装、test、job、formal/preflight rootのexact path。
2. 上位ID六種のexact採番規則とpattern。
3. B1 formal serializer/canonical/hashを共有するかの明記。
4. 69 codeについて`check / exact trigger / path / co-occurrence / suppression`の一件表。
5. pure builder/checker/report validatorの関数名とcontext shape。
6. layout/timelineで再利用する具体pathとexport。
7. reportの残るnested exact shape。
8. 合成85件の一件表。
9. 既存回帰の固定file一覧と事前合格件数。
10. preflight jobの正式保存先、stdout/fatal shape、監視投影。

追補承認をもって元設計の実装条項を補う形式とし、元設計本文を黙って書き換えない。

## 6. 今回行っていないこと

- B4 core、runner、preflight runnerの作成。
- testdata、合成検査の作成。
- job、正式root、lock、workの作成。
- 既存回帰の実行。
- candidate 13 preflightの実行。
- DECISIONS/HANDOVERの現在地をB4実装済みへ進めること。
- B5、B6、Gemini、正式変換、描画。

## 7. 人間判断

人間作業は承認判断1件、動画視聴0件、操作0件。

承認依頼文案:

> B4実装前完全性監査の停止を確認した。コード・testdata・job・検査を0件のまま止めた判断を承認する。推奨どおり、実装path、上位ID採番、formal/canonical直列化、69違反の発火対応表、pure入口、layout/timeline共有入口、report残shape、合成85件と既存回帰一覧を一つのB4実装契約追補v001として起草してよい。起草・提示で停止し、実装は追補承認後とする。

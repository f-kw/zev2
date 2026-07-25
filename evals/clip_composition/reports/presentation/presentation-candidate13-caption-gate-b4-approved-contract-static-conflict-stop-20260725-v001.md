# candidate 13 基本テロップ B4 承認後・実装前契約衝突 停止報告v001

- 作成日: 2026-07-25
- 状態: **実装前停止**
- 主線: B4表示計画・v003対生成
- 最新安定点: `stable/b3-complete-20260725`
- 人間作業: 本報告の確認1件。動画視聴、時刻入力、時間計測はない

## 1. 結論

承認済み三文書と既存実装・正式入力を、コード変更前に値レベルで照合した。次の三点は正本から一意に導けず、正式byteとv002回帰結果を変える契約事項である。

1. 解決パッケージの`sourceAtomsSha256`に二つの正本指定がある。
2. 共有G1〜G3処理の公開入口にexact input／return shapeがない。
3. v003字幕検査へ渡す`source.atomProvenance`の正本が、既存正式成果物の二つの候補のどちらか固定されていない。

実装者判断で一方を選ぶと、承認後の契約設計になる。夜間停止条件に従い、v003二file、v002共有化、B4 core、runner、testdata、合成85件、回帰95件、candidate 13 preflightをすべて0件のまま停止した。

## 2. 照合した正本

1. `presentation-candidate13-caption-gate-b4-display-plan-contract-design-20260725-v001.md`
2. `presentation-candidate13-caption-gate-b4-implementation-contract-addendum-20260725-v001.md`
3. commit `07c60b03`に保存された`presentation-candidate13-caption-gate-b4-v003-contract-core-implementation-addendum-20260725-v001.md`
4. `presentation_caption_contract_v002.mjs`
5. `presentation_instruction_contract_v002.mjs`
6. candidate 13の正式`source-atoms.json`

三つ目の承認済み追補は、作業ツリー上で承認後に1 byteの`"s"`へ変更されていた。承認時commitの内容は23,327 byteで完全に残っているため、監査ではcommitの正本を読み、作業ツリー上の変更は所有者不明の変更として戻していない。

## 3. 停止原因

### 3.1 `sourceAtomsSha256`の正本が二つある

元B4設計§6.2は、次を正本にする。

> 正規化後の`sourceAtoms`配列だけをcanonical JSON化したSHA-256

一方、実装契約追補§6.5は、次を正本にする。

> `source-atoms.json`のformal file byte

この二つは異なる入力をhashする。

- 前者は、解決パッケージへ載せる正規化後のatom配列だけ。
- 後者は、schema、artifact ID、来歴、選択情報、raw hash等を含む正式入力ファイル全体。

既存v002指示書契約は、解決パッケージ内のatom配列のcanonical SHAを検査している。v003追補も「retained source atom全件のcanonical SHAを照合」と記す。しかし、後発の実装契約追補にあるfile-byte指定を黙って無視することもできない。

どちらを選ぶかで正式`instruction-bundle.json`のbyte、B4検査期待、将来のbinding意味が変わるため停止対象である。

### 3.2 共有G1〜G3入口のexact shapeがない

v003追補は`validatePresentationCaptionGrammarSharedV001`を公開exportへ固定し、v002とv003が同じ計算を一回ずつ呼ぶことを要求する。

しかし固定されているのは役割だけで、次がない。

- 引数objectのfield順とfield名。
- v002 envelopeから共有入口へ渡す投影。
- v003 envelopeから共有入口へ渡す投影。
- 返値のfield順、status、contract observation、G1〜G3 reportのshape。
- v002の`inputSha256`、checker version、scope exclusionを共有入口の外側で復元する境界。

現行v002の24回帰と3 fixture aggregate SHAをbyte単位で維持するには、この境界が一意である必要がある。複数の実装形が契約文を満たし得るため、実装者判断で抽出できない。

### 3.3 `atomProvenance`の搬送元が未固定

v003字幕入口は`source: {atomGranularity, atomProvenance, atoms}`を要求する。

candidate 13の正式残存発話成果物には、次の二つがある。

- `sourceProvenance`: 文字列`youtube-format299-video+frozen-format251-audio-v001`
- `atomProvenance`: STT manifest、transcript、word timestamps、candidate manifestを持つobject

現行v002字幕文法は`source.atomProvenance`を非空文字列として検査し、v002指示書検査は`resolutionPackage.sourceProvenance`の文字列をそこへ渡す。v003追補はfield名だけを固定し、正式成果物の同名objectを渡すのか、v002と同じ`sourceProvenance`文字列を渡すのかを固定していない。

この選択はv002共有化のexact behavior、v003 schema reason `source-invalid`、caption reportのinput hashを変えるため停止対象である。

## 4. 実施していないこと

- `presentation_caption_contract_v003.mjs`: 未作成
- `presentation_instruction_contract_v003.mjs`: 未作成
- `presentation_caption_contract_v002.mjs`共有化: 未変更
- B4 core／formal runner／preflight runner: 未作成
- testdata／合成85件: 未作成・未実行
- 回帰95件: 未実行
- candidate 13 static preflight: 未作成・未実行
- B5、B6、Gemini、正式pair、描画: 未着手
- tag、JOURNAL: 未追加

B3正式7ファイルと既存安定点は変更していない。

## 5. 再開に必要な一判断

三点を一つの版付き契約確定追補で固定してから再開する。

推奨方向は次である。

1. `sourceAtomsSha256`は、元設計と既存v002契約に合わせて「正規化後atom配列のcanonical SHA」へ一意化する。正式入力ファイル全体のfile SHAは既存bindingにだけ保持し、意味を混ぜない。
2. 共有入口を、v002/v003固有envelopeを除いた一つのexact grammar inputと、一つのexact grammar reportへ固定する。v002 wrapperは既存report byteを完全再現し、3 fixture aggregate SHAの不変を合格条件にする。
3. grammar inputの`atomProvenance`は、既存v002と同じ`sourceProvenance`文字列を使う。正式残存発話成果物の来歴objectはbinding／manifestに保持し、G1〜G3の入力fieldへ混ぜない。

これは実装方針の推奨であり、承認前にはコードへ反映しない。

## 6. 作業ツリー上の承認済み追補について

承認済み追補の現在の作業ツリーbyteはcommit `07c60b03`と一致しない。この変更を勝手に破棄していない。次の契約確定追補を承認する際は、同時に次のどちらかを明示する必要がある。

1. commit `07c60b03`の23,327 byteを承認済み追補の現行正本として作業ツリーへ復元する。
2. 1 byte変更を意図した変更として扱い、承認済み追補を別artifactへ版付き移動する。

推奨は1である。現在の1 byteでは承認内容をリポジトリ現物から読めず、B4安定点の文書同期条件を満たせない。

## 7. 停止点

次に許可を求めるのは、上記三点と承認済み追補の現物復元をまとめた契約確定追補の起草である。起草承認なしに実装へ進まない。

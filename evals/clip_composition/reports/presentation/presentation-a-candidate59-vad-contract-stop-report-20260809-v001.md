# A工程 candidate 59 契約衝突停止報告 v001

作成日: 2026-08-09
開始commit: `6b366d3cf309112fa3ba637733b9d303e04d7983`
停止位置: 実現性調査後、契約設計中、実装前

## 結論

層1凍結の解除は記録したが、A工程の実装には進んでいない。

candidate 59へ旧層1 v3の既存選別手順を診断として当てると候補は0件だった。2秒という過去値を新品質閾値には使っていない。より短い候補は6件見つかったが、全て字幕の元となる文字atomの途中にある。現行契約はその切断を正しく拒否するため、独自判断で採用規則や字幕再構成を追加せず停止した。

## 完了したこと

1. C工程の機械完了を確認した。
2. 2026-08-02の予約条件に基づく層1凍結解除を`DECISIONS.md`へ記録した。
3. 前ZEV・層1 v3・現行timeline・意味package・ZEVOの現物を読み取り調査した。
4. candidate 59の51,574msへWebRTC VAD mode 0/3を適用した。
5. VAD候補をSTT単語時刻、281文字atom、現行字幕区間へ照合した。
6. forward-only A契約の責務分離案と停止点を設計draftへ記録した。
7. B工程用の副線資料3点を作成した。

## 実測事実

- 音量無音400ms以上: 0件。
- mode 0/3共通の発話不在400ms以上: 6件。
- 共通最長: 800ms。
- 旧v3の2秒候補相当: 0件。
- 6件全てが文字atomと部分交差。
- STT単語間の400ms以上の空白: 0件。
- 現行意味packageは`SOURCE_ATOM_PARTIAL_INTERSECTION`で部分交差を拒否する。
- 現行ZEVOは1字幕区間を複数segmentへ分けて写像しない。

## 帰属

これはproduction不具合やfixture不具合ではない。candidate 59の音響候補と、現行の文字・字幕閉包契約が交差して初めて見えた契約範囲の未確定である。

## 実施していないこと

- A工程のproduction code・契約正本・fixture変更: 0件。
- 正式検査、回帰、TAP: 未実施。
- A工程の横型・縦型mp4: 未生成。
- C工程の既存2本と既存stable tag: 不変。
- C工程2本の全編目視: kawafmm起床後の確認待ちのまま。
- API通信: 0回、API費用US$0。
- A工程の実装成果commit・stable tag: 未実施。停止記録・DECISIONS・副線資料だけを対象path限定の記録commitへ固定する。

## 人間に必要な判断

1件、目安1分未満。

推奨は、**Aの初回実データ素材を、旧v3相当の安全な間が実在する別区間へ変更する**ことである。これならatom・字幕契約を緩めず、実際に時間が縮むことを検証できる。

candidate 59を維持する場合は、文字atom・字幕をまたぐ無音をどう再構成するかというforward-only契約改訂が必要になる。候補0件のno-opで配管だけを通す案もあるが、時間圧縮の品質実証にはならない。

## 参照

- `presentation-a-timeline-composition-silence-trim-contract-design-draft-20260809-v001.md`
- `presentation-b-segment-role-vocabulary-draft-20260809-v001.md`
- `presentation-b-change-evidence-provenance-draft-20260809-v001.md`
- `presentation-b-fixture-selection-conditions-draft-20260809-v001.md`

本報告で停止する。

# candidate 13 B4 監視投影共用 修正設計 v001

- 日付: 2026-07-26
- 対象: candidate 13 static preflight
- 承認根拠: kawafmm指示「preflight v002停止のレビューと共用修正の承認」
- 変更範囲: 監視投影の読み取り専用入口、正式jobの新attempt、検査記録

## 1. 目的

preflight v002は12検査中11件に合格したが、jobへ固定した開始投影だけが
production runnerの開始・終了投影と一致しなかった。

原因は、job作成時とproduction実行時に監視対象の列挙と並び順を別々に実装したことにある。
job作成側は監視root自身を含めUTF-16順に並べ、production側はrootの子から英語locale順に並べていた。

本修正は期待値を実測値へ合わせるものではない。productionが実際に使う投影処理を
正式job作成にも共用し、二つの計算を一つへ戻す。

## 2. 正本と共用方向

- 正本は`run_presentation_caption_display_pair_static_preflight_v001.mjs`内のproduction投影処理。
- 同じfileから版付きの読み取り専用入口
  `inspectPresentationCaptionDisplayPairStaticPreflightProjectionV001`を公開する。
- 正式job作成はこの入口だけを呼ぶ。
- productionを旧job作成処理へ合わせない。
- 第三の列挙・並び順実装を作らない。

これはsemantic source packageで既に使っている
「production処理と同じ内部処理を読み取り専用入口から参照する」Q1:A方式の適用である。

## 3. 読み取り専用入口

入口は、static preflight job root直下の未作成JSON pathだけを受け付ける。

成立条件:

1. job pathが固定root直下のJSONである。
2. job rootと監視rootがsymlinkを介さない実体pathである。
3. 投影の前後でjob pathが存在しない。
4. 監視rootは`evals/clip_composition/outputs/presentation`に固定する。
5. 除外は作成予定job path一件だけに固定する。

戻り値は監視root、除外path、production投影処理が計算したcanonical SHA-256である。
入口は書き込みを行わない。条件不成立時は`unavailable`を返し、job作成側は停止する。

## 4. formal jobのattempt

11/12だったv002 job、stdout、停止報告は変更しない。
修正後は新attemptのv003 jobを作る。

v003 jobでは次だけを更新する。

- job ID・artifact ID・除外job path
- 承認済み実装commitと実file hash
- 共用入口から得た開始投影hash

入力素材、354文字、3まとまり、205候補、timeline 2区間、registry、
runtime固定値はv002から変更しない。

## 5. 棚卸しとの接続

棚卸しv001はcanonical JSONや契約世代の一般的な二重実装疑いを記録したが、
監視treeの列挙・並び順の独立実装は個別に挙げていなかった。
したがって本件は棚卸しv002で「新規発見・実害確定・是正済み」として記録する。

水平確認では、残る投影処理について次を区別する。

- 同じ契約・同じ監視集合を別々に列挙しているもの: 同型リスク。
- 別契約・別監視集合を扱うもの: 名前が似ていても直ちに重複とはしない。
- test fixtureだけの独立処理: productionとの一致を期待する箇所かを個別確認する。

本修正の範囲外で見つけた疑いは直さず、棚卸しv002の差分へ残す。

## 6. 実行と停止

1. production投影の読み取り専用入口を実装する。
2. 実装をcommitして正式jobが参照する実体を固定する。
3. 共用入口でv003 jobを一回だけ作る。
4. static preflightの12検査を頭から一回実行する。
5. 12/12の場合だけB4完了記録・安定点tag・JOURNAL・棚卸しv002を作る。
6. その後、B5承認依頼を起草して停止する。

一件でも不合格なら、同attemptで修正・job再作成・再実行をせず停止する。

# Codex Work Cycle & Cleanup Policy v001

作成日：2026-10-03（JST）
状態：正本運用ポリシー
適用範囲：ZEVでCodexが着工承認済みwork-orderを実行する全作業

## 1. 目的

Codexの1サイクルを「実装・検証・Git・報告」だけで終わらせず、**不要物の整理、実行processの終了、容量回収、正本更新、次指示の受領まで含めて完了**とする。

大容量の動画・音声・画像・一時copyを扱うZEVでは、作業が成功しても不要な中間物を残し続けると次工程を止める。逆に、監査・再現・人間レビューに必要な成果物を不用意に消すと正本性が壊れる。そのため、削除対象を所有関係と参照関係で明示的に分類する。

## 2. 標準作業サイクル

Codexは原則として次の順で一件を閉じる。

1. **指示受領**
   - 指示元、main HEAD、work-order、scope、禁止事項、必要な承認を確認する。
   - GPT_DECISION / HUMAN_DECISION / NEXT_REQUEST は相談役返信の生成完了・全文読了までを受領とする。

2. **開始前preflight**
   - branch/HEAD、git status、他セッション由来の変更、自分の残processを確認する。
   - 入力・出力root・正本path・所有sessionを確認する。
   - 媒体を作る作業では、想定する一時物・完成物・削除可能物と、開始前容量条件を確認する。
   - この時点で各大容量物を KEEP / DELETE_WHEN_DONE / ASK_BEFORE_DELETE のどれかへ分類できる範囲で分類する。

3. **作業**
   - 指示された実装・調査・生成・判断・保存だけを行う。
   - 別エピックや「ついでの改善」へ広げない。

4. **検証**
   - 指示書の完成条件、必要test、保存再読、媒体/QC、入力不変等を確認する。
   - 技術成立、人間品質、正式採用を混同しない。

5. **証拠固定**
   - 最終成果物、manifest、report、必要な失敗原因・ログ・SHA・再現情報を保存する。
   - 失敗attemptは、監査に必要な最小証拠を先に固定する。

6. **クリーンアップ**
   - §3の分類に従い、不要になった現在作業所有の一時物・素材copy・中間生成物を削除する。
   - 削除後、残すべき成果物・参照が壊れていないことを確認する。
   - 媒体作業では削除前後の容量を可能な範囲で記録する。

7. **実行環境クローズ**
   - 自分が起動したworker / ffmpeg / Node / Python / browser補助process等の残存を確認し、終了条件に従って閉じる。
   - 一時lock、未完了stdout入力、作業用temp、不要な専用補助tabを整理する。
   - 同じCodexセッションの報告用専用Edge tabは、次指示を受けるため必要なら保持する。

8. **正本・Git**
   - 方針変更・停止・完了・人間判断待ち等をCURRENT_GOAL/HANDOVER/対象reportへ反映する。
   - 自分の担当pathだけを明示stageし、commit/pushする。
   - git status --short --untracked-files=all が意図どおりであることを確認する。
   - cleanup対象をgit cleanやignoreで隠すことを代替にしない。

9. **相談役報告**
   - 完了したこと、未完了・未確認、検証、commit/push、Git状態に加え、cleanup結果を報告する。
   - 大容量作業では、削除した主なもの・回収bytes・残した大容量物と理由・現在空きを簡潔に示す。

10. **次指示取得**
   - NEXT_REQUESTを伴う報告は、相談役の返信全文を受領して同じsessionで続行する。
   - human_decisionなら相談役が本人判断を返すまで、未承認作業へ進まない。
   - 次の明示指示がなければ別エピックへ自動着工しない。

## 3. 削除分類

### 3.1 KEEP — 自動削除しない

次は原則保持する。

- ユーザーが与えた元素材・原本。
- 現在の正式/受理済み成果物、最終candidate、人間レビュー対象媒体。
- CURRENT_GOAL / HANDOVER / work-order / report / manifest / receipt等から現に参照される成果物。
- 後続工程が直接入力として読む成果物。
- 正規state、採否・判断結果、STT、inspection、時計、owner/approval/provenanceを支える小JSON。
- 再現不能または再生成コストが高く、後続で必要と明示されたもの。
- 人間確認待ちに束縛された媒体。
- 失敗原因の監査に必要な最小証拠。

### 3.2 DELETE_WHEN_DONE — 条件成立後にCodexが自動削除してよい

**現在のwork-order/sessionが自分で作ったもの**に限り、最終成果と監査証拠が固定され、後続参照がないことを確認した後に削除する。

例：

- source snapshot / 作業用copy。
- 一時PCM、audio grid、encode PCM。
- video-only、途中transcode、chunk、frame dump。
- renderer / QCのscratch画像、mask、calibration用一時物。
- 再生成可能なtemp JSON、stdout/stderrの重複dump。
- 成功した正式成果へ不要になったwork directory。
- 失敗attemptの巨大partial media。原因・command・log・必要SHA/size等の小さい証拠を残し、実体そのものが監査や再開に不要な場合。
- 現work-order内で明示的に「成功後削除」と定義された中間物。

削除は**成果物の検証成功後**に行う。削除前に、現在のmanifest/report/後続入力から参照されていないことを確認する。

### 3.3 ASK_BEFORE_DELETE — 本人または明示scopeなしに削除しない

- 元素材、ユーザーprovided file。
- 受理済みcandidate・完成動画・人間review媒体。
- 過去work-orderの成果物。
- 別session/別epicが作ったもの。
- 他の正本/manifest/reportから参照されるもの。
- archive/stable/tagに対応する成果物。
- 容量確保を目的とする既存成果の削除。
- 所有者・参照先・再生成可能性が不明なもの。

「古そう」「大きい」「今の作業では使わない」だけでは削除しない。

## 4. 削除安全規則

- 自分のwork-orderの明示root外へ広いrmを掛けない。
- symlink自体とtargetを区別し、symlink経由で共有実体を削除しない。
- 他sessionのprocessが使用中のpathを削除しない。
- 削除前に、少なくともpath、所有task、用途、参照有無を確認する。
- 大容量媒体の削除では、可能ならsizeと削除理由をreportへ残す。
- 失敗証拠を保存するために巨大な失敗媒体を永久保持することを標準にしない。必要な最小証拠で足りるなら実体は整理する。
- 一度削除した正式成果を「再生成できるはず」で正当化しない。正式/受理済み成果の削除は別の明示承認を要する。
- 削除失敗を無視して完了報告しない。削除しない判断をした大容量物も理由を残す。

## 5. 完了報告に追加する項目

通常の完了報告へ、必要に応じて次を追加する。

- cleanup: deleted / retained / pending。
- 削除した主なpath種別と合計bytes。
- 残した大容量物と保持理由。
- 大容量作業では開始前/完了後の空き容量。
- own process残存数。
- temporary/untrackedの残件。
- ASK_BEFORE_DELETEがある場合は、その対象だけを明示する。

削除が0件でも、媒体を生成した作業では「cleanup確認済み・削除対象0」または「残した理由」を報告する。

## 6. 既存権限との関係

このポリシーは、Codexへ任意の正式成果物削除権を与えない。

AGENTS.mdの第1層専決事項、正式成果物の削除・上書き、旧成果物の容量整理、新素材/費用/API/公開等の承認条件は維持する。

今回追加するのは、**着工承認済みwork-order内でCodex自身が生成した一時物・中間物を、成果固定後に責任を持って片付けることを標準工程化すること**である。

## 7. session work logとの接続

cleanup完了後、正本/Gitを閉じる前に `docs/policies/CODEX_SESSION_WORK_LOG_POLICY_v001.md` に従ってsession work logを一度まとめる。

複数sessionが走るため、cleanupや作業の細かなイベントを共有logへリアルタイム追記しない。各session専用fileへ、削除したもの・保持したもの・回収容量・own process・Gitへ渡す最終状態をまとめて記録する。

停止時にcleanupを実施しない方が安全なら、証拠を保持したままwork logへcleanup pendingと理由を残す。

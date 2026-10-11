# Codex-UI｜No.68 読取資格を保持した公開口・preview期限修正の保存

status: 限定公開口・検査完了、No.68全体未完成・Doing rev3。
開始/Git枠引継ぎHEAD: bef8c0b8bfc3c76f6f99138addfdcab6c5d3f7f3、main/origin/main一致。
最終実装checkpoint: 7349e260bd6e2d3ba87cef1cf2a872b3f8807f7c。

親からSSD担当保存完了とGit枠返却、既存読取資格を変えない薄いbridgeの公開許可、preview修正と自分の記録の保存許可を受領。音声指定の正しい出所と関数名/必要差分を報告本文へ示す指示を受領した。

公開口は `@zev2/agent-runner/digest-readonly`。6行bridgeで既存 `readConsumedDigestPlanV001` / `readPreparedDigestCaptionJudgmentInputsV001` と必要型だけを再export。資格や本体は不変で、writer/製造reader/job/permit/実行入口を公開しない。package exportと専用testのみ追加。backend依存/lock/UI投影は未変更。有効なcaption preparation登録参照がないため、音声指定は不足のまま。旧style/handoff pathや値を新素材へ代用しない。

previewは有効期限欠損/不正ならunknown、実有効期限があるclaimだけpreparing。backend29/29、backend/shared型検査、runner build、公開口3/3成功。既存2関数とのidentity、未承認/計画欠損/SSD外rootの拒否・state不変を確認。Digest有効入力正例やUI投影、実媒体資格/製造は未実施。既存reader/契約/gate/runner入口7fileが実byte不変である証拠を保存した。

公開口fixtureの必須モデル名不足とMac tmp実体path差の2件を修正し、失敗結果を保持。設営累計は前3件＋今回2件=5件で、一般上限を変更・リセットしない。資格条件・正式素材値の変更0。

証拠は[境界報告](../../reports/zev-ui-b-implementation-20261011/digest-read-boundary.md)と専用evidenceへ固定。test after/finallyで隔離runtime/tmpを削除、全own test/build process終了0。新規大容量物/ブラウザー/mock serverなし、cleanup回収対象0。元素材/共有dist/node_modules/SSD担当物への作用0。API/実製造/公開0。

自分のsource/test/config5pathと専用証拠6pathを上記checkpointへexplicit stage/commitした。残る境界報告・前handoff log・今回logの3pathを記録commitへ保存し、mainへまとめてpushする。他担当文書は保存済みで保持。共有checkout切替/reset/stash/branch/worktree/契約新設0。最終HEAD/push/status/untrackedは記録commit後に実観測して親へ返す。

次状態: backend消費側のworkspace配線と、同plan/executionに束縛された既存caption preparation参照/parametersの登録出所を具体化して親へ返す。製造用readerの資格を外さず、不足を推測で埋めない。No.68のDoneや実媒体成功には読み替えない。

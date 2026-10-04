# 限定復帰binding：通常job/authorization検証の実装

確認：2026-10-04T13:10:42.780379+00:00。担当の2製品pathと対応既存2testのみ変更しました。

結果は **TypeScript 14/14・Python49/49 passed**、target diff-check exit0です。新動画・SSD・実owner launch・旧失敗resultの書換えは0。

`recoveryBinding` は省略可能です。指定する場合は `path/fileSha256/sizeBytes` のexact3fields、safe repo relative・64桁実byte SHA・正safeintサイズだけを受けます。jobと独立authorizationの両方に同一bindingが必要で、片方欠落・差替え・absolute/traversal・余分field・サイズ無し/0/負/小数/boolを拒否します。代表方式policyも必須です。PythonでTrue==1や1.0==1が成立するため、authorizationのbinding自体も型検査して拒否しています。

descriptor内容の旧停止specific資格は、このpure validatorでは与えません。親のrunner private factoryで実binding/旧停止/保存媒体/終了ownerを検査する責務です。ここに任意recovery許可・legacy/default/fallback・hash免除は追加していません。

旧通常shape、独立SHA、implementation/HEAD/clean、volume/device/image、owner、command、guard、fresh rootのprepare/launchは変更していません。新recovery付きのactual小job/authファイル読取も、独立SHAを維持して通るfixtureを追加しました。新媒体/SSDを使う実launchは未実施です。

初回Python試験では、新fixtureの仮repoが実gitを呼ぶ設営不備1件と、sandboxのps拒否による既存監視3件が失敗しました。限定fixture修正と許可環境での再実行により解消。実runログは別JSONへ残し、初回を合格に書き換えていません。全体統合typecheckと実復帰は親側の未完作業です。

変更：

- `runner/src/digest-approved-job-v001.ts`
- `tools/digest-quality/original-resolution-full-supervisor-v002.py`
- 対応既存 `.test.ts` / `.approved-job.test.py`

branch `main`、HEAD `68df5d7afde60b3b8e938b71ad19678289cb5ba1`。stage/commit/pushは実施していません。現在のGit差分には親のcaller/publication testと担当4pathがあり、他者変更は保護。untracked 0件。source実SHA/差分/試験結果は同名JSONとdiff、actual test logsを参照してください。

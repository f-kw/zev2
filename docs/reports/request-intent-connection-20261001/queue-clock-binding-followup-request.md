# GPT_DECISION：時計結果を版なしbytes参照へ束縛する一差分

通常attempt-004はsource/STTの実claim・PUT・complete、実index/factoryの探索／採否／保持、内部参照・全bytesの検査、計画completeまで成功。次の実consumerは4出力を保存したが、消費記録の正式JSON保存で未定義の版情報を拒否され、fail登録された。時計検査の結果本文はstatus／violations／mappingsの三項目であり、版情報を持たない。既存時計validatorやJSON直列化の欠陥ではない。新consumerが全出力を一律に版付きJSON参照へしたための限定実装欠陥。

具体案は次の二pathに閉じる。まだ未適用。

1. runner/src/digest-plan-consumption-v001.ts：消費記録の4出力参照のうち時計結果だけをpath＋実bytes SHAにする。他の3出力は既存版付きJSON参照を維持。時計結果のbytes、個々の区間・断片・順序・frame/sample検査は変えない。
2. packages/shared/src/digest-plan-artifacts-v001.ts：薄い検証成果物の時計結果参照をbytes型として検査する。他の3JSON参照・全必須field・明示null／admission条件は維持。版情報を捏造せず、旧保存のSHAや回答を付け替えない。

```ts
outputs: Object.fromEntries(NAMES.map(name => [name, name === 'clock-resolution.json'
  ? {path: file(name), fileSha256: sha(formal(outputs[name]))}
  : bind(file(name), outputs[name])])),
```

共有型の時計結果参照はDigestByteBindingV001 | nullとし、JSON三参照を検査した後に時計参照をbytesとして検査する。変更前の失敗attempt-004と4出力は不変に保持、新attemptで再生成・要求SHAに対応した通信しない回答を使う。正規consumerと通常queueを使用し、試験専用callerやfallbackは追加しない。

AGENTSの軽微技術判断規則による相談役の個別自動承認対象とすることを推奨する。承認時には製品限定修正の累積5回目として記録する。一般3回上限、製品4／設営6の履歴は変更・リセットしない。製品方針／人間品質／動画許可／一般委任／認証／費用／素材／公開／本番を変えず、この既承認接続の完了に直接必要。必要なら開発候補の薄い参照型の扱いを同じ正本へ限定する。Codexは自分で例外承認せず、現物を保存して追加作用を停止した。

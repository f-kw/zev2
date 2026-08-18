# ④.5 レンダリング疎結合化 契約設計追補 v001

- 親正本: `presentation-rendering-decoupling-contract-design-20260817-v001.md`
- 親正本SHA-256: `aec224048ac6131173eb8b69b4b4d45cda88d5646ab3b67e8fa8b5561310df94`
- 工事ID: `PRESENTATION-RENDERING-DECOUPLING-V001`
- 日付: 2026-08-17
- 状態: kawafmm承認済み

## 1. 目的

親正本§6のrenderer jobが要求する「全実行値をformal job byteへ置く」「job/env/defaultから暗黙選択しない」を、workspace外の外部実行体についても成立させる。同時に、現行live renderer dependencyと不一致になったrenderer trustを版付きで再発行する。

本追補は親正本の意味・表現責務を変更しない。注文書は意味内容とcue終端だけを所有し、実行体・canvas・format・crop・scene・audio・screen layout・line ruleは引き続きrenderer jobとreceiptが所有する。

## 2. renderer job runtime binding

親正本§6.1のroot exact keyへ、`registryBindings`の後、`rendererImplementationBindings`の前に`runtimeBindings`を一件追加する。

```json
{
  "runtimeBindings": {
    "ffmpeg": {"path": "<absolute-path>", "fileSha256": "<sha256>"},
    "ffprobe": {"path": "<absolute-path>", "fileSha256": "<sha256>"},
    "imageMagick": {"path": "<absolute-path>", "fileSha256": "<sha256>"},
    "remotion": {"path": "<absolute-path>", "fileSha256": "<sha256>"},
    "tsx": {"path": "<absolute-path>", "fileSha256": "<sha256>"},
    "chromium": {"path": "<absolute-path>", "fileSha256": "<sha256>"}
  }
}
```

### 2.1 exact規則

1. key順・件数は上記6件でexactとする。
2. 各rowのkey順・件数は`path`、`fileSha256`の2件でexactとする。
3. `path`は実行時に使用するfileのabsolute pathとする。relative path、directory、欠落fileを拒否する。Homebrew等の版付き実体へ結ぶsymlinkは、実行直前の前後2回で同一real pathへ解決される場合だけ許す。
4. `fileSha256`は前項で固定したreal pathの実体をstable再読して得たSHA-256と一致しなければならない。
5. workspace外absolute pathを許すfieldは`runtimeBindings/*/path`だけとする。その他のformal binding pathは親正本どおりworkspace相対を維持する。
6. rendererは6件をこのfieldからだけ取得する。環境変数、PATH探索、既定値、親runner capability、旧job、renderer trustのversion文字列から実行体を選ばない。
7. external toolのversion出力は診断・来歴に使用できるが、正式実体の同一性はpathとfile SHAが所有する。

## 3. admission receiptへの転記

親正本§7.1のreceipt exact keyへ、`rendererTrustBinding`の後、`rendererImplementationBindings`の前に`runtimeBindings`を追加し、renderer jobの6件をbyte同一で転記する。

admission phaseはjobと6実体をstable再読し、path実体・非symlink・file SHAを照合した後だけaccepted receiptを公開する。render phaseはjobと公開後stable再読済みreceiptの両方から6件の一致を再確認し、receiptの自己申告だけで続行しない。

## 4. renderer trust v002

18件目の正本pathを次へ固定する。

`evals/clip_composition/registries/presentation/presentation-renderer-trust-v002/trust.json`

旧v001は履歴として不変保持する。v002はv001の配置規則、tool version、書体、preview、preset bindingを値変更せず継承し、次だけを版付き改訂する。

1. `schemaVersion`を`presentation-renderer-trust-v002`とする。
2. `trustVersion`を`presentation-renderer-trust-v002`とする。
3. `rendererDependencies` 8件のpath・順序を維持し、file SHAを2026-08-17のlive file実測値へ更新する。
4. 新renderer jobの`registryBindings.rendererTrust`と`fontLedger`はv002のfile/canonical bindingを使用する。
5. v002製造後にdependency 8件、font asset 2件、preset registry、layout規則、tool versionをstable再読し、不一致一件で停止する。

## 5. 検査差分

- PRA001: `runtimeBindings`を含むrenderer job exact schema、absolute path唯一性、formal byteを検査する。
- PRA008: renderer trust v002、dependency 8件、layout規則、tool version、preset bindingをlive実体へ照合する。
- PRA009: renderer implementation全件に加え、runtime 6件のpath・非symlink・file SHA一致を実発火で検査する。
- PRA010: runtime 6件が注文書に0件、renderer jobとreceiptだけに存在することを検査する。
- PRA011/012: receipt公開後のruntime転記一致、差替え・欠落・PATH fallbackをfail-closedで検査する。
- PRM001/005/007: caption/titleが同じ独立runnerへruntime 6件をjob byteから渡し、旧direct runner・PATH/defaultを使わないことを検査する。

検査IDはPRP 6、PRI 10、PRL 8、PRA 12、PRM 8の合計44件から増減しない。契約期待、test宣言、TAP observed、TAP passedの四者exact一致を維持する。

## 6. path会計

- 親正本§9の17 pathは不変。
- 18件目としてrenderer trust v002を追加する。
- 19 path目は禁止する。
- 本追補、TAP、job、動画、QC、review page、停止・完了報告はwork-orderの作業path枠で管理し、完了報告までに正本へ残す一覧と退避対象を区別する。

## 7. 不変条件と停止条件

親正本§11.2を維持する。追加停止条件は次のとおり。

1. runtime 6実体の一件でも現checkoutからabsolute pathで解決できない。
2. runtime pathの前後real path解決が一致しない、またはstable再読SHAがjob値と一致しない。
3. trust v002の8 dependencyがlive fileと一致しない。
4. 19 path目、契約の意味変更、注文書へのruntime・描画値追加が必要。
5. 旧job・環境変数・PATH・default・fallbackから実行体を補完する必要が生じる。

## 8. 承認記録

kawafmmは2026-08-17、正本path上限17から18への改訂、18件目のrenderer trust版付き再発行、renderer job/receiptへのruntime binding追加を一組として承認した。追補件数は1/5である。

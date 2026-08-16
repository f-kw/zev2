# ZEVO字幕品質v002 atomic公開・B6通信前失敗code所有 範囲改訂追補 v004

- 日付: 2026-08-11 JST
- 状態: 起草提示。未承認、未実装
- 対象: ZEVO字幕品質v002の正式root公開とB6通信前失敗の所有
- 起点HEAD: `542b35684a3ad67dbab042ca2bb3bff022e42023`
- 外部通信: 0回
- 費用: US$0
- 実装・検査・描画: 0件

## 0. 結論

この追補は、A正式attempt前監査で見つかった二つの未閉包を一組で解消する設計である。

1. 正式rootの公開を、通常のdirectory renameではなく、macOSの`renameatx_np`へ`RENAME_EXCL | RENAME_NOFOLLOW_ANY | RENAME_RESOLVE_BENEATH`を渡す固定native実体へ一本化する。
2. 有効なB6 jobが通信前にB5成果物または固定requestを再読できなかった場合を、新code `CUE_B6_INPUT_REREAD_FAILED`が所有する。HTTP・timeout・non-responseだけは従来どおり`CUE_PROVIDER_TRANSPORT_FAILED`が所有する。

強いatomic no-replace保証を、既存の`lstat→通常rename`や`mv -n`へ読み替えない。公開処理を4 runnerへ複製しないため、共用JavaScript入口、監査可能なC source、固定Darwin arm64実行体の3 pathを追加する。新規path上限は14から17へ、違反codeは47から48へ改訂する。検査ID 46件、正式成果物schema、status、終了code、API回数、費用条項は変えない。

本書は設計だけを提示する。native実体の作成、production/test修正、正式attempt、API通信、描画は別承認である。

## 1. 正本と適用順

| 種別 | path | SHA-256 | 扱い |
|---|---|---|---|
| 親契約 | `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md` | `33b61ee497d765fbe9eb63fb1b05bce16a99488d238eb27b732550b4daac24ba` | 不変 |
| 完全実装設計 | `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md` | `44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4` | 本書が数量と該当規則だけを上書き |
| 累積追補v002 | `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260811-v002.md` | `a3c8c3ef8e57cd557e4a7cae17ecc188dc523df1508a45de6e2bce36691c7e4d` | 不変。本書が該当binding件数だけを上書き |
| 実値配線追補v003 | `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-selection-runtime-value-wiring-addendum-20260811-v003.md` | `632aa7fdec88da47fe8639fb10f74f390aa0cc5f191a114b797c08115bee4c9e` | 不変。本書がselection/proofの契約・実装binding件数だけを上書き |
| 全面再実装修正設計 | `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-full-reimplementation-correction-design-20260811-v001.md` | `2e7905588da53e14fd762750ab2a6b753fb352c07a164096141175e4464e2fdc` | 直列ゲート方式を維持。path/code/proof件数だけ本書へ従う |
| 停止報告 | `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-a-gate-preflight-stop-report-20260811-v001.md` | `9d450e8978843abcec0c9e982e3e3c25bc0c021e337c12f5279bda6ac8d29b25` | 発見事実の証拠として不変保持 |

本書が承認された場合の適用順は、親契約→完全実装設計→累積追補v002→実値配線追補v003→本書である。前文書のうち本書が明示的に差し替える数量、公開入口、B6 code所有だけを上書きし、それ以外を変更しない。

## 2. 実現性調査

### 2.1 開始実体

| 観測 | 現物 |
|---|---|
| S production | `presentation_output_caption_cue_source_package_v001.mjs`、SHA `dd38dd2b3de9e3946da0fb7fb2e509cc1973515a8f32ae72b262c48ec667dee7` |
| S test | `presentation_output_caption_cue_source_package_v001.test.mjs`、SHA `f30e02552b7eeb422f54f6bc157d05f24084929f6a632bd9c24ac093446191ac` |
| S正式結果 | 6/6、S所有proof 39/39、TAP SHA `564a508c1f6aa09bff792aa426fe7642600426ccff8995af5c8d3748511c4da5` |
| A production | `run_presentation_output_caption_cue_b5_b6_v001.mjs`、SHA `9059b97b197b9952e2fbbbc068d87a2373f25f97cc6d257e82c4460aaaf74b1c` |
| A test | `run_presentation_output_caption_cue_b5_b6_v001.test.mjs`、SHA `993061c33c3e55cfd4340d353923943ed4ccf725e3aa5e7f3b5651e8eef904fb` |
| A正式attempt | 0回。開始前監査で停止 |
| L/P/R/F/U | 未作成 |

Sの6/6は事実として保持する。ただし、既存rootを開始前に拒否する枝だけが成立しており、不存在確認後に空directoryが作られるlate collisionのatomic拒否を証明していない。本書承認後の実装ではSを同じ検査IDで再検査し、この不足だけを追加証明する。

### 2.2 Node・既存共用処理・外部command

| 候補 | 現物観測 | 判定 |
|---|---|---|
| Node `fs.rename` | flags引数と`RENAME_EXCL`定数がない。通常renameは空の既存directoryを置換し得る | 不採用 |
| 既存共用公開処理 | `presentation_timeline_composition_decision_v001.mjs`の公開入口も`lstat→通常rename` | 強いno-replace正本にはできない |
| `fs.cp`や先行`mkdir` | root全体が一回で可視化されず、途中状態を見せる | 不採用 |
| `/bin/mv -n` | 実体は`renamex_np`を使わず、kernel-levelの排他rename保証を束縛できない | 不採用 |
| 新しいNode addon・FFI・Python | 同じsyscallへ到達できてもABI・runtime・依存を余分に増やす | 不採用 |
| 固定standalone native実体 | 既存Node工程から一回spawnでき、ABI依存をprocess境界へ閉じられる | 採用 |

### 2.3 OS実体

| 項目 | 観測値 |
|---|---|
| OS | macOS 26.5.1、Build 25F80、arm64 |
| workspace filesystem | APFSのData volume |
| C compiler | `/usr/bin/clang`、Apple clang 21.0.0、SHA `179301dcb41ea78accc3fa0048a7e6f6710d891945a751a34addd622020c1818` |
| SDK header | `/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/include/sys/stdio.h`、SHA `a8078ae1cba1a46a66d0de6fe7f13bbc969cdb7e78fc2d4b9a5c5cdaaf16126b` |
| system API | `renameatx_np`、`RENAME_EXCL=0x4`、`RENAME_NOFOLLOW_ANY=0x10`、`RENAME_RESOLVE_BENEATH=0x20`がheaderに実在 |
| OS契約 | `RENAME_EXCL`はtarget既存時に両pathを変更せず`EEXIST`、非対応filesystemは`ENOTSUP` |

API・定数・現環境は実在する。正式helper byteとAPFS上の実発火結果は実装前には存在しないため、本書で仮SHAを置かない。実装承認後、隔離一時領域で実helperの成功とlate collisionを実発火し、sourceとbinaryの実測SHAを固定してからjobを製造する。APFSが実helperの固定flagを`ENOTSUP`で拒否した場合は正式attempt前に停止する。対応済みAPFS上で`ENOTSUP`を人工的に起こせないため、unsupported、unsafe、source-invalid、cross-device、invocation-invalid、その他I/Oのwrapper写像は§4.1のpure classifierへ閉じたchild観測値を渡して決定的に検査し、OS syscallの実発火と混同しない。

### 2.4 B6現物枝

有効なB6 jobがstagingを開始した後、現行runnerには次の3群が実在する。

| 群 | 内側段階 | 現行外側code | 本来の所有 |
|---|---|---|---|
| B5の13成果物の欠落・読取不能・読取中変化・SHA不一致 | `b5-artifact-reread` | `CUE_PROVIDER_TRANSPORT_FAILED` | 通信前入力再読 |
| 固定requestの欠落・読取不能・読取中変化・byte不一致 | `request-reread` | `CUE_PROVIDER_TRANSPORT_FAILED` | 通信前入力再読 |
| transport返却rawと保存済みrawのbyte/SHA不一致 | transport後のraw照合 | `CUE_PROVIDER_TRANSPORT_FAILED` | raw公開・完全性 |

code表の`CUE_PROVIDER_TRANSPORT_FAILED`はHTTP・timeout・non-responseを所有するため、最初の2群を同codeへ置くと通信0回の失敗を通信失敗と記録する。3群はHTTP自体が完了しており、保存したrawを正式証拠として確立できなかった公開失敗である。

### 2.5 実現性判定

| 問い | 判定 | 根拠 |
|---|---|---|
| atomic no-replaceを通常renameの意味変更なしで実現できるか | yes | `renameatx_np`の排他flagが現SDKに実在 |
| 公開処理を4 runnerへ複製せず共用できるか | yes | 共用JavaScript入口から固定native実体を一回spawnできる |
| 既存成果物schemaを変えず失敗を区別できるか | yes | 既存stage、status、終了codeを維持し外側code一件だけ追加できる |
| B6 transport codeを純化できるか | yes | 通信前枝、transport枝、raw公開枝が現物で別段階に分かれている |
| 既存46検査ID内で証明できるか | yes | ZCQ001/005/006/007/015/016/018/027/042/044へsubcaseを追加できる |

## 3. exact 17 path

完全実装設計§3の既存14 pathは名前と役割を維持し、次の3 pathだけを追加する。

| # | exact path | 種別 | 責務 |
|---:|---|---|---|
| 15 | `evals/clip_composition/presentation_atomic_directory_publish_v001.mjs` | production共用入口 | 検証済み親directory FDと兄弟leafを固定native実体へ渡し、閉語彙結果を返す。native process実行も一つの共用capabilityとして所有し、本ZEVO字幕品質v002の4 runnerにおける公開処理の唯一のJavaScript正本 |
| 16 | `evals/clip_composition/presentation_atomic_directory_publish_v001.c` | native source | `renameatx_np`を一回だけ呼ぶ監査可能なsource。path・identity・errno→exit分類以外の処理を持たない |
| 17 | `evals/clip_composition/presentation_atomic_directory_publish_v001-darwin-arm64` | native runtime | path #16から固定commandで製造するDarwin arm64実行体。formal runnerが実行する唯一の排他的rename実体 |

production/supportは7から10、testは7のまま、合計17 pathである。専用test pathは増やさず、既存の工程別testが共用入口の全体証明と各工程の接続証明を所有する。18 path目、本書の17 path集合外にある既存pathの変更、別OS版、別wrapper、別公開実装が必要なら停止する。

path #16と#17のSHAは実装固定値である。実装承認後にsourceを確定し、次の固定入力で一度製造して実測SHAを完了記録へ固定する。仮SHA、毎回compile、runtime compile、別compiler fallbackを禁止する。

```text
/usr/bin/clang
-std=c11
-O2
-Wall
-Wextra
-Werror
-arch arm64
-isysroot /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk
-mmacosx-version-min=11.0
-Wl,-no_uuid
-o evals/clip_composition/presentation_atomic_directory_publish_v001-darwin-arm64
evals/clip_composition/presentation_atomic_directory_publish_v001.c
```

compiler version・compiler SHA・SDK header SHA・source SHA・binary SHA・実効deployment target `11.0`・実行日時を実装記録へ残す。製造時はbinaryを`0555`にするが、Gitが永続化するのは実行可否であってexact modeではないため、formal条件はregular・non-symlink・owner/group/other実行可能に限定する。同じsource、compiler実体、SDK、全flagから隔離一時領域へ再buildし、formal binaryとbyte同一であることを検査して初めてsourceとbinaryの対応を成立させる。正式job作成前と各正式attemptの実装前読/後読、およびspawn直前にsource/binaryをstable再読する。syscall成功後のpath再読を成功反転条件にはしない。

## 4. atomic公開のexact入口

### 4.1 JavaScript共用入口

path #15のexportは次の四件だけである。

```text
classifyPresentationAtomicDirectoryPublishObservationV001({
  exitCode,
  signal,
  stdoutBytes,
  stderrBytes,
})

executePresentationAtomicDirectoryNativeHelperV001({
  nativeBinaryPath,
  cwd,
  parentDirectoryHandle,
  stagingDirectoryHandle,
  stagingLeaf,
  outputLeaf,
})

preparePresentationDirectoryAtomicPublishV001({
  workspaceRoot,
  stagingRoot,
  outputRoot,
  verifiedImplementationBindings,
  nativeProcessExecutor,
})

publishPresentationDirectoryAtomicallyNoReplaceV001({
  workspaceRoot,
  stagingRoot,
  outputRoot,
  verifiedImplementationBindings,
})
```

classifierはexact 4 key、native process入口はexact 6 key、prepare入口はexact 5 key、combined入口はexact 4 keyである。四入口はいずれも非asyncの外側validatorとして引数一件のobjectを要求し、missing・extra keyまたは本節で固定した型の不成立を、file I/O・process起動・FD取得および内部Promise生成より前に同期`TypeError`へ写す。side effectを持つ三入口は検証成功後だけprivate async処理のPromiseを返す。classifierはfile I/O・process起動・環境参照を0件とし、§4.3のchild観測だけを同節の成功/失敗unionへ写すpure入口である。native process入口だけが§4.1の固定spawn optionsを組み立て、childのexact 4-key観測`exitCode,signal,stdoutBytes,stderrBytes`へ解決する。spawn不能・捕捉上限超過はthrowし、`commit`側が生errorを破棄して閉語彙へ写す。`verifiedImplementationBindings`は当該formal jobをstrict decode・validateし、全実装fileを前読し、binding SHAへ一致させた同じdense arrayである。path #15〜#17の3 roleがexact一件ずつ存在し、固定pathと一致しない場合はnative実体を起動しない。job、環境変数、cwd、任意引数から別実体を選ばない。

`nativeProcessExecutor`はnative process入口と同じexact 6-key objectを一件受け、同じchild観測へ解決するasync capabilityである。formal combined入口はこれを引数に持たず、同moduleの固定named export `executePresentationAtomicDirectoryNativeHelperV001`をprepareへ必ず渡す。検査は同じprepare/commit/close処理へ、(a)固定named exportそのものを渡して実helper成功・late collisionを発火するか、(b)child観測またはthrowだけを決定的に返すinstrumented capabilityを渡してsignal・spawn不能等の後始末を観測する。後者をOS syscall実発火済みとは数えず、runner formal mainから選択できる分岐にしない。別spawn実装、job/envによる選択、optional defaultを禁止する。

prepare入口は次の順だけを実行する。

1. `workspaceRoot`の前後realpathとidentityを一致させる。
2. 論理pathで`stagingRoot`が`outputRoot`へliteral suffix `.staging`を一回付けた値とexact一致することを確認した後、両者が同じ検証済み親directoryの直下にある兄弟pathであることを確認する。
3. 両leafが非空、`.`/`..`ではない、slashを含まないことを確認する。
4. stagingが一件の実directoryでsymlinkではなく、outputが不存在であることを確認する。
5. 親directoryを`O_RDONLY | O_DIRECTORY | O_NOFOLLOW`、stagingを同じflagで開き、両FDの`fstat` identityを事前観測へ一致させる。
6. exact `{status:'prepared',commit,cancel}`を返す。`commit`と`cancel`はいずれも引数0件の**非async wrapper function**で、一方を一回だけ呼べる。wrapperは引数件数と共有状態を同期検査し、最初の有効呼出しでは共有状態を同期的に`committing`または`cancelling`へ遷移させてから内部async処理のPromiseを返す。二回目、両方、余分な引数はPromiseを作る前に同期的に`TypeError`で拒否し、FDを再利用しない。`commit()`のPromiseはpublished/failed unionへ解決する。`cancel()`のPromiseはclose成功時にexact `{status:'cancelled'}`、一件でもclose不能ならexact `{status:'failed',reason:'helper-execution-failed',toolExitCode:null}`へ解決する。prepare前失敗だけはexact `{status:'failed',reason,toolExitCode:null}`を返す。

prepare途中で一つでもFDを開いた後に失敗した場合は、その呼出しが所有する全FDをreverse open orderでexact一回closeしてからfailedを返す。`commit`と`cancel`も一つの`finally`で両FDをexact一回closeし、一件目のclose失敗で残りを打ち切らない。prepare途中またはcancelのclose不能は`helper-execution-failed/toolExitCode:null`とする。`commit`がpublishedを観測していない状態で一件でもclose不能なら、先に得たchild分類を`helper-execution-failed/toolExitCode:null`へ置換する。numeric exit 0によるpublished観測後のclose不能だけはcommit成立を反転させず`{status:'published'}`を維持し、formal CLI終了時のOS回収へ委ねる。検査はnumeric exit 0、numeric child失敗、signal終了、native process executorのthrow、cancel成功、cancel close失敗、prepare途中失敗の各枝で、closeを試みたFD集合と呼出し後に観測可能なopen FD集合、および返却unionを照合する。

`commit()`は、親FD・staging FDとpath #15〜#17を再照合した後、**outputを再確認せず**次を一回だけ行う。prepare後にtargetが作られた競合は、この無確認区間を通ってkernelの`RENAME_EXCL`へ必ず到達する。

1. native process capabilityへ、検証済みpath #17、workspace実体、親/staging FileHandle、staging/output leafのexact 6 keyを渡して一回呼ぶ。
2. 固定native process入口は親FDをchild fd 3、staging FDをchild fd 4へ渡し、path #17を`<staging leaf> <output leaf>`のexact 2引数でspawnする。
3. spawn optionsは`env={}`、`shell=false`、`cwd=<検証済みworkspace実体>`、stdin=`ignore`、stdout/stderr=`pipe`、fd 3/4以外の追加継承0件へ固定する。`GEMINI_API_KEY`を含む親環境は一件もchildへ継承しない。
4. stdout/stderrはともに0 byteがformal protocolであり、非空判定に必要な各1 byteだけを上限として読む。それを超えたchildは終了させ`helper-execution-failed`とする。捕捉byteは分類後に破棄し、成果物・log・報告へ保存しない。
5. capabilityが返した終了code・signal・stdout・stderrを同じclassifierへ一回渡す。capabilityのreturn/throwにかかわらず共通`finally`でfd 3/4を両方closeし、close結果は直前段落の優先規則へ一意に写す。

`cancel()`はfd 3/4を閉じるだけで、rename、target作成、削除を0件とする。`publishPresentationDirectoryAtomicallyNoReplaceV001`は受け取ったexact 4-key objectへ固定native process入口を加えたexact 5-key objectをprepareへ一回渡し、`prepared`なら他処理を挟まず`commit()`を一回呼ぶ正式用combined入口である。formal CLIはcombined入口だけを渡し、prepare/classifier/native process入口を直接呼ばない。

classifier入力は`exitCode=non-negative safe integer|null`、`signal=string|null`、stdout/stderrは`Buffer`とする。正常なchild close観測では`exitCode`と`signal`の片方だけが非nullでなければならない。成功戻り値はexact `{status:'published'}`。失敗戻り値はexact `{status:'failed',reason,toolExitCode}`で、`reason`は§4.3の閉語彙、`toolExitCode`は§4.3の表と補足へ従う。`renameatx_np`終了0を唯一のcommit成立点とし、rename後のpath再読を新しい合否条件にしない。成功後の状態確認は検査が外側から観測するだけで、productionが成功をfailureへ反転させたりrollbackしたりしない。生error message、stack、stderr、path、成果物本文を戻り値や正式報告へ残さない。

### 4.2 native syscall

path #17は`argc=3`、環境entry 0件、継承fd 3を親directory、fd 4を検査済みstaging directoryとして検査する。`fstatat(fd 3, stagingLeaf, AT_SYMLINK_NOFOLLOW)`がfd 4と同じdevice/inodeの実directoryであることをsyscall直前に一致させ、次の一syscallだけを公開のcommit pointとして呼ぶ。

```text
renameatx_np(
  3,
  stagingLeaf,
  3,
  outputLeaf,
  RENAME_EXCL | RENAME_NOFOLLOW_ANY | RENAME_RESOLVE_BENEATH
)
```

copy、link、二段rename、先行target作成、通常renameへのfallback、失敗後retryを禁止する。sourceとtargetは同じ親FDの兄弟leafなのでcross-device移動を設計上要求しない。filesystemがflagを支えない場合も通常renameへ落とさず停止する。helperはstdout/stderrへ一byteも書かず、syscall終了後は結果に対応するprocess exitだけを行う。これによりcommit成立後の報告write失敗を作らない。

`errno`と事前観測は最初に一致する次の一行だけへ写す。`EEXIST→20`、`ENOTSUP|EOPNOTSUPP→21`、`ELOOP|ENOTCAPABLE`または`fstatat`結果がsymlink→22、`ENOENT|ENOTDIR`またはfd 4とのidentity/type不一致→23、`EXDEV→24`、`EBADF|EINVAL`またはargc/leaf/FD不正→25、それ以外→26である。同値aliasは一回だけ扱い、未列挙errnoを実装者判断で別分類へ移さない。

保証境界を分ける。target非置換は`RENAME_EXCL`がsyscall時点で任意の競合相手に対して保証する。source identityはfd 4とleafのsyscall直前照合、および正式実行中に同じ監視領域へ書き込まない既存規律による観測保証である。別の敵対processがidentity照合とsyscallの間だけsource leafを差し替えることまでkernel APIは原子的に束縛しない。この非保証をtargetのatomic no-replace保証と混同せず、より強いsource identity保証を本追補の成立条件にしない。

### 4.3 child閉語彙

| exit | signal | stdout/stderr exact | wrapper reason | `toolExitCode` | 意味 |
|---:|---|---|---|---:|---|
| 0 | `null` | 両方0 byte | 成功 | — | 一回の排他rename成立 |
| 20 | `null` | 両方0 byte | `late-target-exists` | 20 | syscall時点でtargetが存在 |
| 21 | `null` | 両方0 byte | `filesystem-unsupported` | 21 | `ENOTSUP` |
| 22 | `null` | 両方0 byte | `unsafe-path` | 22 | symlinkまたは開始directory外 |
| 23 | `null` | 両方0 byte | `source-invalid` | 23 | source欠落または型不正 |
| 24 | `null` | 両方0 byte | `cross-device` | 24 | `EXDEV` |
| 25 | `null` | 両方0 byte | `helper-invocation-invalid` | 25 | argc、fd、leaf、flagの内部不成立 |
| 26 | `null` | 両方0 byte | `helper-execution-failed` | 26 | 上記以外のI/O・権限・資源失敗 |

表外の通常exitは`helper-execution-failed`とし、観測した非負safe integerを`toolExitCode`へそのまま残す。signal終了はNodeの`exitCode=null`をそのまま扱い`toolExitCode:null`、spawn前失敗・捕捉上限超過・親identity変化も`toolExitCode:null`とする。stdout/stderr非空は`helper-execution-failed`で、`signal=null`かつexitCodeが実整数ならその整数を残し、それ以外は`null`とする。exitCode/signalが両方nullまたは両方非nullの不正tupleも`helper-execution-failed/toolExitCode:null`である。errnoの数値や生文字列は正式成果物へ保存しない。

JavaScript側のprepare/loader失敗は次の最初に一致する一行へ固定する。

| 観測 | native起動 | module-only reason | 外側の一意な扱い |
|---|---:|---|---|
| prepare時にoutputが既存 | 0 | `late-target-exists` | 当該runnerの`fatal/2/root-publication/<publication code>` |
| workspace realpath/identityまたは親配下条件の値不成立、leaf不正、symlink | 0 | `unsafe-path` | 同上 |
| staging欠落、非directory、fd 4とのidentity/type不一致 | 0 | `source-invalid` | 同上 |
| verifiedImplementationBindings各要素のkey/role/path/件数不成立、binaryのregular/non-symlink/executable条件不成立 | 0 | `helper-invocation-invalid` | 同上 |
| verified binding成立後のpath #15〜#17 byte/identity差 | 0 | `helper-execution-failed` | 同上 |
| realpath/open/fstat/read/closeのI/O・権限・資源失敗 | 0 | `helper-execution-failed` | 同上 |
| loader throw/reject | 0 | union生成前 | 当該runnerの`fatal/2/root-publication/<publication code>` |
| loaderがfunction以外を返す、またはrunnerがloaderを二回呼ぶ | 0 | union生成前 | 当該runnerの`fatal/2/root-publication/<publication code>` |

`<publication code>`はsource=`CUE_SOURCE_PUBLICATION_FAILED`、B5/B6=`CUE_API_PUBLICATION_FAILED`、selection=`CUE_SELECTION_PUBLICATION_FAILED`、proof=`CUE_PROOF_PUBLICATION_FAILED`である。loader失敗はjob/schema不正ではないためjob-invalid codeへ写さない。loaderはstaging予約前に呼ぶため正式root・staging・reportは0件、prepare/commitのfailed unionはstaging製造後のため正式root 0件・検査済みstaging保持・CLI-onlyとする。cancelは検査scheduleの後始末専用でformal CLIが呼ばず、cancel close失敗もtest内でfailed unionとして観測して正式成果物を作らない。

保証境界をさらに限定する。numeric exit 0を観測した枝だけをpublished、numeric exit 20〜26を観測した枝だけを「rename不成立・target不変・staging保持」と証明する。syscall成立後からchildのexit 0観測前に外部からsignal終了させられた場合、renameは成立済みでもparentはsignalしか観測できない。この窓では`failed/helper-execution-failed/toolExitCode:null`を返すが、target不存在またはstaging保持を主張せず、rollback・削除・再試行もしない。外部強制終了を受けない固定helperの通常終了だけを正式な公開状態保証の対象とし、signal・捕捉上限超過・不正tupleはcommit状態不明の異常停止としてCLI-onlyで記録する。これはtargetのno-replace保証を弱めないが、「failedなら未公開」という保証はこの異常停止へ主張しない。

### 4.4 formal runnerへの接続

| runner | 既存公開code | 共用入口を呼ぶ位置 | late collision時 |
|---|---|---|---|
| source | `CUE_SOURCE_PUBLICATION_FAILED` | source成果物と全bindingの公開直前再読後 | `fatal/2/root-publication`、正式root不変、staging保持 |
| B5/B6 | `CUE_API_PUBLICATION_FAILED` | 結果別成果物集合と全bindingの公開直前再読後 | 同上 |
| selection | `CUE_SELECTION_PUBLICATION_FAILED` | selection/reportの排他集合と全bindingの公開直前再読後 | 同上 |
| proof | `CUE_PROOF_PUBLICATION_FAILED` | completion/rejection/fatalの排他集合と全bindingの公開直前再読後 | 同上 |

runner開始時にoutputまたはstagingが既存なら従来どおり`rejected/1/root-publication`で、native実体を0回とする。runner開始確認後からprepareのoutput不存在確認までにtargetが現れた場合は`fatal/2/root-publication`、helper 0回、staging保持とし、開始時既存へ戻さない。開始時の`lstat`・親検証I/O、late collision、filesystem非対応、unsafe、helper異常も`fatal/2/root-publication`である。numeric exitを観測できた正常protocol枝の正式root/staging状態は§4.3どおり固定し、signal等のcommit状態不明枝では状態を推測しない。成果物集合・byte・staging identityの不一致は各工程の既存artifact/publication段階が所有し、late collisionと混同しない。

### 4.5 runnerのexact capability配線

late collisionをwatcher、polling、timerなしで実native helperへ決定的に到達させるため、CLIを持つ4 runnerのmodule入口だけを次へ置換する。これは既存Q1:A方式と同じmodule間capabilityであり、job/schema/環境変数から選べない。

| runner | 置換後のexact入口 |
|---|---|
| source | `executePresentationOutputCaptionCueSourceJobV001({jobPath,atomicDirectoryPublisherLoader})` |
| B5 | `executePresentationOutputCaptionCueB5V001({jobPath,countTokensTransport,atomicDirectoryPublisherLoader})` |
| B6 | `executePresentationOutputCaptionCueB6V001({jobPath,generateContentTransport,atomicDirectoryPublisherLoader})` |
| selection | `executePresentationOutputCaptionCueSelectionJobV001({jobPath,atomicDirectoryPublisherLoader})` |
| proof | `executePresentationZevoCaptionQualityV002ProofJobV001({jobPath,atomicDirectoryPublisherLoader})` |

`atomicDirectoryPublisherLoader`はrunnerがexact 0引数で呼ぶasync capabilityで、§4.1のcombined入口と同じexact 4-key objectを一件受けてpublished/failed unionを返すfunctionへ解決する。loaderはrunner入口へ渡されたfunctionであって別の外部object decoderではないため、検査はinstrumented loaderの`arguments.length`が0であることを実観測する。formal mainはadapter moduleを先行importしない。同じrunner module内に定義した固定loaderだけを渡し、そのloaderの本体がpath #15を固定literal `await import(...)`する。module namespaceのstring-key export集合が§4.1の四件とexact一致し、四件全てがfunctionであることを検証した後、`publishPresentationDirectoryAtomicallyNoReplaceV001`のidentityだけを返す。loader closureの生成はadapter moduleを評価しないため、jobと全implementation bindingを前読する前にpath #15が評価される経路はない。別loader、job/env/pathによる選択、default、fallbackを持たない。

各runnerはjobのstrict decode/validateと全implementation bindingの前読を完了し、既存dependencyを固定順でimportした後にだけloaderをexact一回呼ぶ。adapter import後、全implementation bindingを再読して前・binding・後を一致させてから、取得したpublisherを保持する。公開直前に三実体をもう一度stable再読し、その同じpublisherをexact一回呼ぶ。loaderがthrow/rejectする、function以外を返す、二回目の呼出しが起きる場合は、native helperを起動せず各runnerの既存実行fatalへ写す。これによりbinding検証前にadapterをmodule評価することなく、実装bindingに含まれるmodule自身を検証後importできる。

旧一引数のsource/selection/proof入口、およびatomic publisher loaderを欠くB5/B6 objectは受理しない。overload、optional default、互換wrapperを作らない。本書のforward-onlyな正式jobは置換後入口だけを使う。

各runnerのlate collision検査だけは、同じpath #15のprepare入口を呼び、`prepared`後に検査が空targetを排他的作成し、その同じprepare resultの`commit()`を呼ぶ一回限りのclosureへ解決するtest loaderをこの引数へ渡す。これは公開計算の代用品ではなく、正式prepare・正式native helper・正式classifierの間に競合状態を決定的に作るschedule capabilityである。targetを作った検査processはそのidentityを保持し、runner終了後にtarget directoryのidentityとempty状態が不変、staging treeのidentityとbyteが保持、正式code/stage/statusが一致することを実再読する。正常経路はformal mainと同じ固定loaderを渡す。対応filesystem上で実発火できないchild失敗は、pure classifierの結果を同じpublisher unionとして返すtest loaderで外側code写像を実発火できるが、underlying errno/syscallを実発火済みとは数えない。

## 5. implementation bindingとimport順

### 5.1 追加role

全formal jobの`implementationBindings`へ次の3 roleをrole/path狭義昇順で一件ずつ追加する。

| role | exact path | SHA固定時点 |
|---|---|---|
| `atomic-directory-publisher-adapter-v001` | `evals/clip_composition/presentation_atomic_directory_publish_v001.mjs` | path #15完成後 |
| `atomic-directory-publisher-native-darwin-arm64-v001` | `evals/clip_composition/presentation_atomic_directory_publish_v001-darwin-arm64` | path #17 compile・機能検査後 |
| `atomic-directory-publisher-native-source-v001` | `evals/clip_composition/presentation_atomic_directory_publish_v001.c` | path #16完成後、compile前 |

job別件数は次へ置換する。

| job | 変更前 | 変更後 |
|---|---:|---:|
| source | 33 | 36 |
| B5 | 8 | 11 |
| B6 | 16 | 19 |
| selection | 38 | 41 |
| proof | 48 | 51 |

JavaScript static/dynamic import graphの既存集合へpath #15だけを追加する。path #16と#17は非JavaScriptのbuild/runtime nodeとして別区分で全件照合し、importされたように偽装しない。全3 pathをjob検証後・adapter import前にstable再読し、§4.5の固定loaderによるliteral import後と公開直前にもstable再読して、前・binding・後を一致させる。native実行体は公開直前の最終再読後だけ起動する。

固定literal import順は既存順を落とさず、末尾へatomic publisher adapterを一件挿入した次の全列挙へ置換する。

| job | 順序 |
|---|---|
| source | style resolver→source package codec→meaning information package→finite/crop application→timeline publication→atomic publisher adapter |
| B5 | source contract→cost guard→atomic publisher adapter |
| B6 | cost guard→provider transport→atomic publisher adapter |
| selection | source contract→B5/B6 runner→meaning package v002→timeline decision v001→A source sequence v002→caption semantic source package v001→crop application v001→fatal observation v002→style resolver→planner v1→planner v2→piecewise timeline→atomic publisher adapter |
| proof | source contract→meaning package v002→timeline decision v001→A source sequence v002→caption semantic source package v001→crop application v001→fatal observation v002→selection→planner v3→render plan v3→review UI→renderer core→style resolver→planner v1→planner v2→render plan v1→render plan v2→atomic publisher adapter |

testはbinding表に現れるpath文字列の位置をimport順の証拠にしない。workspaceに実在する`packages/shared/node_modules/typescript/lib/typescript.js`のparserを、既存title import-graph検査と同じ方式で使う。syntax diagnostic 0のASTから、`AwaitExpression`直下にある`ImportKeyword` callかつ引数がstring literal一件のnodeだけをsource順に抽出する。comment、string、template raw、regular expression、hashbangの字面をnodeとして数えず、computed import・非await import・余分なliteral importを拒否する。独自regex/scannerを作らない。加えて、instrumented loaderで「job/implementation前読完了前の呼出し0件・完了後1件・返却publisher呼出し1件」を実観測し、AST上の字面だけで遅延評価を証明したことにしない。成功経路・B5のprovider transport未評価枝・改変拒否枝の実観測でも補完する。

### 5.2 approved contract binding

本書承認時の実測SHAを、role `caption-quality-atomic-publication-b6-owner-scope-revision-addendum`で正式jobへ追加する。

| job | 現在 | 本書後 |
|---|---:|---:|
| source/B5/B6 | 3 | 4 |
| selection/proof | 4 | 5 |

source/B5/B6は実値配線追補v003を実行しないため、v003を追加しない。selection/proofはv003を維持した上で本書を5件目へ加える。追補v001は追補v002が包含する既存原則を維持し、重複束縛しない。

## 6. B6通信前失敗code所有

### 6.1 code集合

固定順で`CUE_B6_JOB_INVALID`の直後、`CUE_PROVIDER_TRANSPORT_FAILED`の直前へ次の一件を追加する。

| code | 意味 | owner検査 |
|---|---|---|
| `CUE_B6_INPUT_REREAD_FAILED` | 有効なB6 jobがstaging開始後・通信前に、B5正式成果物または固定generate requestをstable再読できない、読取中に変化した、またはjob/B5 bindingとbyteが一致しない | ZCQ016 |

code集合は47から48へ変わる。owner集合、production実枝集合、実発火集合を48/48でexact一致させる。既存47 codeの順序と意味は、新code挿入位置より後のordinal以外は変えない。

### 6.2 三群の一意写像

| 失敗 | HTTP呼出し | 内側stage | CLI stage | primaryCode | status/exit | 正式成果物 |
|---|---:|---|---|---|---|---|
| B5 13成果物の欠落・I/O・読取中変化・binding/SHA不一致 | 0 | `b5-artifact-reread` | `source-reread` | `CUE_B6_INPUT_REREAD_FAILED` | `fatal/2` | failure report一件 |
| 固定requestの欠落・I/O・読取中変化・byte/binding不一致 | 0 | `request-reread` | `source-reread` | `CUE_B6_INPUT_REREAD_FAILED` | `fatal/2` | failure report一件 |
| HTTP network・timeout・non-response | 1 | `provider-transport` | `provider-transport` | `CUE_PROVIDER_TRANSPORT_FAILED` | `fatal/2` | failure report一件 |
| 保存済みrawとtransport返却rawのbyte/SHA不一致 | 1 | `raw-write` | `artifact-publication` | `CUE_API_PUBLICATION_FAILED` | `fatal/2` | rawを安全に除外できた場合だけfailure report一件、不能時は正式root 0件でstaging保持 |

B6 job decode/validatorやB5 manifest値検査の不成立は従来どおり`CUE_B6_JOB_INVALID`で、staging開始前・通信0・正式root 0件である。通信前の現物再読差とjob値不正を混同しない。

上表の「failure report一件」は、report製造・保存・stable再読・root公開が全て成立した場合の固定集合である。report自身またはrootの公開が失敗した場合だけ、既存排他規則どおり正式root 0件、検査済みstaging保持、CLI-onlyとする。parent完全実装設計§5.4の広い「B6 network・timeout・I/O・resource」行は、本書§6.2〜§6.3へ置換する。通信前のlocal I/O・resourceをprovider transportへ残さない。

`b6-failure-report.json`のschema、stage閉語彙、innerCode閉語彙、checks、targetFile規則を変えない。B5成果物またはrequestの検証済みbindingから対象fileをexact一件特定できる場合は、そのbindingだけから`targetFile`を作る。不一致、複数、未検証なら`null`とし、pathを自己認定しない。

### 6.3 provider transportの保証境界

`CUE_PROVIDER_TRANSPORT_FAILED`は、唯一のHTTP request開始からresponse byte取得までのnetwork、timeout、non-responseだけを所有する。通信前入力再読、raw保存、raw照合、envelope、usage、費用、root公開を所有しない。ZCQ015はこの純化後の境界を実呼出し回数と実stageで証明する。

## 7. 停止報告§5の限定修正表

| 群 | 修正する意味 | exact方向 | owner検査 |
|---|---|---|---|
| A1 workspace実体逸脱 | 入出力が検証済みworkspace実体から外れない | 既存ancestorを先にrealpath・identity照合し、未検証の再帰mkdirを行わない。新directoryは検証済み親の直下へ一段ずつ作り、各段を再照合する | ZCQ007、ZCQ016 |
| A2 公開失敗分類 | 競合と成果物不成立を別ownerへ返す | 開始時既存、late collision、helper/runtime異常、staging集合/byte/identity不一致をそれぞれ§4と既存artifact段へ写す | ZCQ005、ZCQ016、ZCQ027、ZCQ044 |
| A3 B6 writer返値 | 既存transportのexact callableへ一致させる | B6 raw writerは保存・stable再読後に値を返さない`Promise<void>`。formal runnerが同じpathを再読してbindingを作る | ZCQ015 |
| A4 未成立成果物残留 | failure rootの固定集合を守る | 公式snapshotはrename前ならidentity所有済み`.official-group`全体、rename後から6/6再読成立前なら`official/`全体を除外して不存在を証明する。evidenceとcopy一覧は6/6後に一括commitし、0〜5件を逐次登録しない。B5 manifest、B6 envelope、B6 manifestはrunnerが直前に製造しidentityを所有する当該未成立fileを除外する。対象group/fileの不存在確認後だけfailure reportへ進む | ZCQ016 |
| A5 除外失敗の握り潰し | 不成立file/groupを正式rootへ混ぜない | `.official-group`、`official/`、個別未成立file、probe/final/B6 rawの除外または不存在を証明できなければ正式root 0件、staging保持、CLI-onlyで停止する。空catch禁止 | ZCQ016、ZCQ017 |
| A6 B5 source再読stage | 実際の失敗段階を保持する | B5 source再読I/Oを`fatal/2/source-reread/CUE_API_PUBLICATION_FAILED`のまま報告し、汎用catchでstageをartifact-publicationへ上書きしない | ZCQ016 |

これらは契約を緩める修正ではない。既存schema、成功成果物byte、費用計算、通信回数、secret規則を維持し、実際の段階・集合・path安全性へ実装を合わせる。

## 8. 停止報告§6の検査修正表

| 群 | 現在の欠陥 | 修正 |
|---|---|---|
| T1 import順 | binding表に最初に現れるpath文字列をimport呼出しと誤認する | workspace既存TypeScript parserでASTを作り、syntax diagnostic 0かつ固定literalの`await import(...)` nodeだけをsource順に抽出する。comment/string/template/regex/hashbangを除外し、computed・非await・余分importを拒否する。独自regex/scannerを作らず、成功経路と未評価枝の実観測を併用する |
| T2 正式CLI起動 | secret拒否のchild CLIが固定TSX絶対loaderを欠く | 固定Node、固定TSX絶対`--import`、`NODE_OPTIONS`不存在、native環境を同じcommandへ適用し、起動前checklistをTAP添付記録へ残す |

検査期待をproductionの誤実装へ合わせない。T1は証明対象を維持した測定手段の訂正、T2は正式起動設営への一致である。

## 9. 旧proof itemの置換とV4 proof item 45件

既存P=297、V1=41、V2=55、V3=67の計460件のうち、旧implementation/contract件数を直接要求する17件は本書の新件数と同時成立しない。承認済み旧文書と過去TAPは変更せず歴史証拠として保持するが、新attemptの期待集合から§9.1の17 IDだけを除外し、同表のV4 itemへ置換する。証明自体を捨てず、同じ対象を新しいexact件数・来歴・拒否枝で再証明する。

新しい期待集合はexact `((P ∪ V1 ∪ V2 ∪ V3) − SUPERSEDED_V4) ∪ V4`である。`SUPERSEDED_V4`は§9.1の17 ID、V4は§9.3の45 IDだけとする。したがってP'=287、V1=41、V2'=51、V3'=64、V4=45、期待総数は488件である。検査IDは46件のまま、既存IDへ専用assertを追加する。旧proof IDをpassed扱いで残す、旧segment本文を黙って読み替える、旧IDと置換先V4 IDを同時要求することを禁止する。

### 9.1 失効17件と置換先

| 期待集合から除外するexact proof item ID | 旧要求 | 置換先 |
|---|---|---|
| `ZCQ001-P-06-b310cc503b06` | source implementation 33件 | V4-ZCQ001-01 |
| `ZCQ001-P-07-c88eea09ccd5` | source contract 2件 | V4-ZCQ001-04 |
| `ZCQ007-P-02-8c139deea6e7` | B5 implementation 8件 | V4-ZCQ007-01 |
| `ZCQ007-P-03-c88eea09ccd5` | B5 contract 2件 | V4-ZCQ007-02 |
| `ZCQ007-P-04-f310b51240ef` | B6 implementation 16件 | V4-ZCQ007-01 |
| `ZCQ007-P-05-c88eea09ccd5` | B6 contract 2件 | V4-ZCQ007-02 |
| `ZCQ018-P-03-94a0ff1ec3ad` | selection implementation 38件 | V4-ZCQ018-01 |
| `ZCQ018-P-04-c88eea09ccd5` | selection contract 2件 | V4-ZCQ018-01 |
| `ZCQ042-P-01-2f145c5a367f` | proof implementation 48件 | V4-ZCQ042-01 |
| `ZCQ042-P-02-c88eea09ccd5` | proof contract 2件 | V4-ZCQ042-01 |
| `ZCQ001-V2-02-e250b696c320` | source contract 3件 | V4-ZCQ001-04 |
| `ZCQ007-V2-01-192529ed7d93` | B5/B6 ID literalとcontract 3件 | V4-ZCQ007-02 |
| `ZCQ018-V2-04-5c9437d65eef` | selection contract 3件 | V4-ZCQ018-01 |
| `ZCQ042-V2-01-2787e1e00733` | proof contract 3件 | V4-ZCQ042-01 |
| `ZCQ018-V3-01-9500091bbb90` | selection contract 4件の実再読 | V4-ZCQ018-01 |
| `ZCQ018-V3-14-5b0b8fadf8cb` | selection contract 4件の不正拒否と入力binding owner分離 | V4-ZCQ018-03 |
| `ZCQ042-V3-01-a3add0d8af5d` | proof contract 4件の三時点照合 | V4-ZCQ042-01 |

この17 IDは、SHA照合済み旧文書から従来の分割規則で再導出した値とexact一致する場合だけ除外できる。0件、18件以上、ID/SHA不一致、表外proofの除外が一件でもあれば正式attemptを開始しない。

### 9.2 件数表

| ID | V4件数 | 改訂後ID合計 |
|---|---:|---:|
| ZCQ001 | 5 | 22 |
| ZCQ005 | 8 | 13 |
| ZCQ006 | 1 | 5 |
| ZCQ007 | 5 | 17 |
| ZCQ015 | 4 | 14 |
| ZCQ016 | 9 | 31 |
| ZCQ018 | 3 | 30 |
| ZCQ027 | 4 | 34 |
| ZCQ042 | 2 | 36 |
| ZCQ044 | 4 | 35 |

記載のない36 IDはV4=0で既存件数不変である。

### 9.3 V4-PROOF-ITEMS-BEGIN

- V4-ZCQ001-01 | source jobのimplementation bindingが36件で新3 roleのpathと実測SHAへexact一致する
- V4-ZCQ001-02 | atomic publisher adapterのstring-key exportが四件exactで全て非async外側validatorを持ち、classifier exact 4-key、native process exact 6-key、prepare exact 5-key、combined exact 4-keyについてmissing・extra keyと型不正を副作用・Promise生成前の同期TypeErrorへ写すこと、one-shot wrapperの同期拒否、pure classifier、module import時のI/O/process/environment参照ゼロを実観測する
- V4-ZCQ001-03 | source入口のexact objectについてmissing・extra keyと非function loaderをjob-read/CUE_SOURCE_JOB_INVALIDで拒否し、正常objectではjobとimplementation前読完了前のloader呼出し0件、既存五dependency import後のloader呼出し1件かつarguments 0件、固定literal adapter import・四export exact検証・combined named export返却・publisher呼出しを各1件実観測し、loader throw/reject・非function返却・二回呼出しをhelper 0回のfatal/2/root-publication/CUE_SOURCE_PUBLICATION_FAILEDへ写す
- V4-ZCQ001-04 | source jobのapproved contract bindingが4件で本書を含むことを実再読する
- V4-ZCQ001-05 | 固定compiler入力で隔離再buildしたbinary byteがformal binary byteへ一致しsourceとcompilerとSDK headerの実測SHAを来歴へ一致させる
- V4-ZCQ005-01 | 実native helperが兄弟stagingを一syscallで正式rootへ公開する
- V4-ZCQ005-02 | prepare後に空targetを明示作成して同じcommitを呼ぶ実native late collisionでtarget directoryのidentity・empty状態を変えずstaging treeのidentity・byteを保持する
- V4-ZCQ005-03 | runner開始確認後からprepareまでにtargetが出現した枝はhelperゼロ回・staging保持のfatal終了2となる
- V4-ZCQ005-04 | stagingRootがoutputRootのliteral `.staging` siblingだけを許し、任意の別兄弟pathはhelperゼロ回で拒否する
- V4-ZCQ005-05 | pure classifierへchild exit 20〜26の各exact観測を渡し、late-target-exists/filesystem-unsupported/unsafe-path/source-invalid/cross-device/helper-invocation-invalid/helper-execution-failedと同じ整数toolExitCodeへの七写像を一件ずつ決定的に証明する
- V4-ZCQ005-06 | prepareのworkspace/leaf/symlink不正をunsafe-path、staging欠落・型/identity差をsource-invalid、verified implementation binding要素のshape・role/path/件数とbinary実行条件の不正をhelper-invocation-invalid、検証後byte/identity差とrealpath/open/fstat/read I/Oをhelper-execution-failedへ写し、全枝helper 0回のroot-publication fatal終了2となることを実発火する
- V4-ZCQ005-07 | pure classifierが表外通常exitでは実整数、signal・不正tupleではnullのtoolExitCodeを返し、stdout不一致・stderr非空を含めfallbackせずhelper-execution-failedへ写し、signal枝でtarget/staging状態を合格条件にしない
- V4-ZCQ005-08 | 親FD・staging FDのcommit直前identityと空child環境を実観測し、同じprepare/commit/close経路でnumeric exit 0、numeric child失敗、simulated signal、spawn不能throw、stdout/stderr捕捉上限超過throw、prepare途中失敗、cancel成功、cancel close失敗の全枝について両FDのclose試行集合と残存open FD集合を照合する。close成功時のspawn不能throwと捕捉上限超過throwはfailed/helper-execution-failed/toolExitCode null、child失敗とclose失敗、およびprepare途中失敗とclose失敗の各重畳も同じunion、numeric exit 0後のclose失敗はpublished維持となること、commit→commit・cancel→cancel・commit→cancel・cancel→commit・両wrapper余分引数を同期TypeErrorで拒否して内部処理・FD再利用0件となること、numeric exit成功時と失敗時の排他状態を実観測する
- V4-ZCQ006-01 | stagingで検査したsource package byteとatomic公開後の正式byteが一致する
- V4-ZCQ007-01 | B5 implementation 11件とB6 implementation 19件のexact role/path/SHA集合を実再読する
- V4-ZCQ007-02 | B5/B6の正式ID literalを維持し、approved contract bindingが4件で本書を含むことを実再読する
- V4-ZCQ007-03 | binding表の文字列位置ではなく固定literal await import呼出しと実経路でimport順を証明する
- V4-ZCQ007-04 | B5/B6 module入口がatomicDirectoryPublisherLoaderを含む各exact key集合を要求し、missing・extra keyと非function loaderを各jobのjob-read/job-invalid codeで拒否する。正常objectではjobと実装binding前読完了前のloader呼出し0件、完了後はloader一回かつarguments 0件、固定literal import・四export exact検証・combined named export返却・publisher呼出しが各一回となり、loader throw/reject・非function返却・二回呼出しはnative helper 0回のfatal/2/root-publication/CUE_API_PUBLICATION_FAILEDへ写る
- V4-ZCQ007-05 | B5/B6が同じatomic publisher adapterとnative source/runtime bindingを使い、childへ親環境を渡さず別公開実装を持たない
- V4-ZCQ015-01 | B5 13成果物の再読成立前はgenerateContent transportをゼロ回とする
- V4-ZCQ015-02 | 固定requestの再読成立前はgenerateContent transportをゼロ回とする
- V4-ZCQ015-03 | local再読・raw公開を含むB6全failure枝のowner集合を照合し、network・timeout・non-responseの三枝だけがCUE_PROVIDER_TRANSPORT_FAILEDを返す
- V4-ZCQ015-04 | 正常transportでwriter保存rawと戻りrawが同一byteでありprovider transportがraw公開codeを所有しないことを観測する
- V4-ZCQ016-01 | B5成果物のfile-readをb5-artifact-rereadと新codeで実発火する
- V4-ZCQ016-02 | B5成果物のfile-changedまたはbinding不一致をb5-artifact-rereadと新codeで実発火する
- V4-ZCQ016-03 | requestのfile-readをrequest-rereadと新codeで実発火する
- V4-ZCQ016-04 | requestのfile-changedまたはrequest-byte-mismatchをrequest-rereadと新codeで実発火する
- V4-ZCQ016-05 | 保存rawとtransport rawのbyteまたはSHA不一致をraw-writeとAPI publication codeで実発火する
- V4-ZCQ016-06 | prepare→target明示作成→commitの同じ実native capabilityでB5 late collisionを発火しtarget不変とstaging保持を観測する
- V4-ZCQ016-07 | prepare→target明示作成→commitの同じ実native capabilityでB6 late collisionを発火しtarget不変とstaging保持を観測する
- V4-ZCQ016-08 | 公式snapshot groupと個別未成立成果物を安全に全除外できる枝、除外不能で正式rootゼロ件となる枝を別々に実発火する
- V4-ZCQ016-09 | 各owner IDが保存した実観測を再発火せず集計し、48 codeのowner集合・production実枝集合・実発火集合を48件exactで照合する
- V4-ZCQ018-01 | selection implementation 41件とapproved contract 5件のexact role/path/SHA集合を前読・import後・公開直前の三時点で実再読する
- V4-ZCQ018-02 | selection入口のexact objectについてmissing・extra keyと非function loaderをjob-read/CUE_SELECTION_JOB_INVALIDで拒否し、正常objectではjobとimplementation前読完了前のloader呼出し0件、既存dependency import後の固定loader一回かつarguments 0件、四export exact検証・combined named export返却・publisher呼出しを各一回実観測する。独自rename経路0件、loader異常時native helper 0回のfatal/2/root-publication/CUE_SELECTION_PUBLICATION_FAILEDを証明する
- V4-ZCQ018-03 | selection approved contract 5件の不足・余分・本書SHA不一致をdynamic import前のjob-read/CUE_SELECTION_JOB_INVALIDで拒否し、meaning/style/base/media実値binding不一致だけをCUE_SELECTION_INPUT_BINDING_MISMATCHの単一owner枝で実発火する
- V4-ZCQ027-01 | prepare→target明示作成→commitの同じ実native capabilityでselection late collisionを発火する
- V4-ZCQ027-02 | pure-classified helper failureをselectionの既存publication codeへ写す
- V4-ZCQ027-03 | selectionのtarget不変と検査済みstaging保持を実再読する
- V4-ZCQ027-04 | selectionのapproved contract 5件とatomic helper 3 bindingを公開直前まで照合する
- V4-ZCQ042-01 | proof implementation 51件とapproved contract 5件のexact role/path/SHA集合を前読・import後・公開直前の三時点で実再読する
- V4-ZCQ042-02 | proof入口のexact objectについてmissing・extra keyと非function loaderをjob-read/CUE_PROOF_JOB_INVALIDで拒否し、正常objectではjobとimplementation前読完了前のloader呼出し0件、既存dependency import後の固定loader一回かつarguments 0件、四export exact検証・combined named export返却・publisher呼出しを各一回実観測する。独自rename経路0件、loader異常時native helper 0回のfatal/2/root-publication/CUE_PROOF_PUBLICATION_FAILEDを証明する
- V4-ZCQ044-01 | prepare→target明示作成→commitの同じ実native capabilityでproof late collisionを発火する
- V4-ZCQ044-02 | pure-classified helper failureをproofの既存publication codeへ写す
- V4-ZCQ044-03 | proofのtarget不変と検査済みstaging保持を実再読する
- V4-ZCQ044-04 | helper失敗時に生messageとstderrと成果物本文を正式報告へ保存しない

### 9.4 V4-PROOF-ITEMS-END

V4は上記marker間で行頭がexact `- V4-ZCQ`の45行を取り、` | `より前をproof item ID、後を要求本文として読む。ID重複、ordinal欠落、記載件数と抽出件数の差を不成立とする。既存P/V1/V2/V3の抽出規則は変えず、抽出後にだけ§9.1のexact 17 IDを集合差として除く。期待488件、test source宣言488件、TAP観測488件、passed 488件をexact一致させる。専用assertのないdiagnostic、定数同士の比較、代表枝の転記を禁止する。

## 10. 実装・再検査順

本書が別途実装承認された場合だけ、次の順で進む。

1. 本書の承認済みSHA、既存正本5件、停止時S/A 4 path、S TAP、既存成果物treeを再照合する。
2. path #15と#16を新規作成し、固定compiler入力でpath #17を一度製造する。
3. source/binary SHA、隔離再build byte一致、Darwin arm64、実行権限、helper protocol、APFS上の成功・late collision実発火、pure classifierによる残りのfailure閉語彙を隔離一時領域で検査する。
4. Sの既存2 pathへ共用入口接続とV4 subcaseだけを実装し、S局所6件を頭から一回実行してTAP全文を版付き保存する。
5. S 6/6かつS所有既存39件+V4 14件が全て成立した場合だけAへ進む。
6. Aの停止時2 pathへ§6〜§8を限定実装し、A局所11件を頭から一回実行してTAP全文を版付き保存する。
7. A 11/11かつA所有既存102件+V4 18件が全て成立した場合だけLへ進む。
8. L→P→R→F→Uを承認済み直列ゲートで実装し、L/Fへ共用atomic公開を最初から接続する。
9. 17 path完成後に恒久6項目、actual引数逆引き、工程間binding全件閉包、子成果物追跡、native実体、48 code、旧17 proofのexact失効、488 proofを一括監査する。この監査を局所ゲートの代用にしない。
10. 正式46件を新attemptで一回実行し、TAP全文を版付き保存する。46/46、48/48、488/488の場合だけ直接影響回帰、green 287/287、baseline 86/203 exact、既存5 tree、A-v002記録対象treeを照合する。
11. 完了報告または停止報告を作り停止する。API通信、countTokens、generateContent、費用支出、正式描画へ進まない。

S 6/6とそのTAPは上書きしない。新S attemptはatomic保証を追加した別attemptとして並記する。Aの正式attemptは依然0回であり、本書起草だけでは開始しない。

## 11. 停止条件

既存停止条件を維持し、数量だけ次へ改訂する。次の一件でも成立したら、同attemptで直さず停止する。

- 18 path目、本書の17 path集合外にある既存path変更、別native helper、別公開wrapperが必要。
- macOS arm64以外、APFS上の`RENAME_EXCL`非対応、helper protocol不成立。
- 通常rename、copy、link、先行target作成、二段commit、retry、fallbackが必要。
- helper source/binaryの実測SHAをformal jobへ固定できない。
- job別implementation 36/11/19/41/51件またはcontract 4/5件をexact表現できない。
- 48 codeのownerまたは実発火が一件でも閉じない。
- §9.1の17 ID以外の旧proofが一件でも消える、失効17 IDが期待集合へ残る、またはproof item 488件が一件でも閉じない。
- status、終了code、正式成果物schema、通信回数、費用、secret規則の変更が必要。
- 新たな契約解釈、現物差、既存正式成果物・stable tag・tree差が出る。
- 局所または正式検査が一件でも不合格。

API通信0、費用US$0、既存正式成果物とstable tag不変を維持する。

## 12. 完全性チェック

| 項目 | 判定 | 根拠 |
|---|---|---|
| 現物照合 | closed | Node、既存helper、OS API、S/A実枝をpath・SHA・行位置で確認 |
| atomic性 | closed at design | 同一親FDの`renameatx_np`一回と`RENAME_EXCL`へ固定。実binary/APFS発火は実装前ゲートで必須 |
| 公開保証境界 | closed | numeric exit 0/20〜26だけ状態を断定し、signal等はcommit状態不明・rollback/retryなしと明記 |
| JS側失敗帰属 | closed | prepare 7群とloader 2群をreason、helper回数、runner別publication codeへ一意写像 |
| path閉包 | closed | 既存14+共用入口/source/binaryの3=17 |
| 実装binding | closed | 3 role、job別36/11/19/41/51件 |
| 契約binding | closed | source/B5/B6 4件、selection/proof 5件 |
| B6所有 | closed | 通信前入力再読、新code、transport、raw公開を四分 |
| status・終了code | unchanged | rejected=1、fatal=2、passed=0の既存規則を維持 |
| 成果物集合 | unchanged | failure report一件または正式root 0件の既存排他を維持 |
| code閉包 | closed | 48件、ZCQ016が新code owner |
| 検査閉包 | closed | 46 ID不変、旧17件をexact置換、V4 45件、総488件 |
| 数値区分 | unchanged | helper exit整数以外の新しい正式数値なし |
| 秘密 | unchanged | helperへ秘密・本文を渡さず、生stderrを保存しない |
| API・費用 | outside scope | 通信0、費用US$0 |
| 既存成果物 | unchanged | 起草時にproduction・test・成果物変更なし |

## 13. 人間作業量

本書の判断一件だけである。目安5〜10分。判断対象は、17 pathへの範囲改訂、固定Darwin arm64 native実体、48 code、旧17 proofの置換とV4 45件の四点である。実装承認、API通信承認、描画承認は本書の承認に含まれない。

## 14. 承認依頼文案

> 相談役レビュー済み。kawafmm裁定: ZEVO字幕品質v002 atomic公開・B6通信前失敗code所有 範囲改訂追補v004を承認する。正式root公開は、共用JavaScript入口・監査可能なC source・固定Darwin arm64実行体の3 pathを追加し、同一親directory FDに対する`renameatx_np`一回と`RENAME_EXCL | RENAME_NOFOLLOW_ANY | RENAME_RESOLVE_BENEATH`へ一本化する。通常rename、`mv -n`、copy、二段commit、retry、fallbackを禁止する。path上限は14から17へ、job別implementation bindingはsource/B5/B6/selection/proofの順に36/11/19/41/51件へ、approved contract bindingはsource/B5/B6 4件・selection/proof 5件へ改訂する。B6通信前のB5成果物・固定request再読失敗は新code `CUE_B6_INPUT_REREAD_FAILED`が所有し、provider transport codeはHTTP・timeout・non-responseだけ、保存rawとtransport raw不一致は既存API publication codeが所有する。codeは48件、検査IDは46件のまま、旧件数を要求する17 proofをexact置換し、V4 45件を加えてproof item 488件とする。停止報告§5の実装6群と§6の検査2群を本書の限定表どおり修正してよい。実装再開は別承認とし、本承認は追補の正本化まで。API通信、countTokens、generateContent、費用支出、正式描画は含まない。既存停止条件を数量改訂後も維持する。

本書はここで停止する。

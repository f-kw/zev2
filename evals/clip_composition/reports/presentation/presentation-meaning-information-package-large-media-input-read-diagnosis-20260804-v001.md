# 意味情報パッケージ 大容量媒体input-read診断 v001

- 日付: 2026-08-04
- 対象job SHA-256: `8b2595b84f77e721871ad064e4cb86713d7b56f7b9611ab6475bfc7245766e9c`
- 診断対象failure report SHA-256: `373c0e5f5200a552bfcd9bf5e6acc0295d8fe6a05719dbaa5adf0b8ae86c2f85`
- 外部通信: 0回
- 費用: US$0
- 結論: 元配信mp4を一括Bufferへ読む実装が、固定Nodeの2 GiB読取上限を超えた

## 1. 事実

- 正式jobが実際に読む20 fileは全て存在した。
- SHA期待値を持つ19 fileは19/19で現物SHAと一致した。
- 元配信mp4より前に読む実装4 file、契約2 file、timeline、source identityは、全てregular file・single link・realpath一致・SHA一致だった。
- 元配信mp4は次の実体である。
  - path: `evals/clip_composition/research/downloads/nE_bNeBNp4E/sources/qdczJpv8RCc/qdczJpv8RCc.mp4`
  - size: `3,288,164,785 byte`
  - SHA-256: `8359f59d8c205fb815c9165f5a464ec4bb9f109f9d91384b80e571410dc2fa25`
  - timeline decisionとsource identityのbinding: 一致
- 固定Node v20.19.6で、runnerと同じ`FileHandle.readFile()`をこの実体へ適用した読み取り診断は、読取前に次の例外を返した。
  - error class: `RangeError`
  - error code: `ERR_FS_FILE_TOO_LARGE`
  - message: `File size (3288164785) is greater than 2 GiB`
- 元配信mp4以外で最も大きい入力はSTT transcriptの`3,750,295 byte`であり、同制約に該当する入力は他に0件だった。
- 現行meaning package runnerは、source mediaの初回照合を一括Buffer読取で行い、公開直前の全入力再照合も同じ一括Buffer読取で行う。初回だけを直しても、公開直前に同じ停止が再発する構造である。
- timelineと基礎映像の既存経路には、同じ媒体を安定性確認付きの分割読取でSHA照合する正本処理が既に存在し、candidate 59の同媒体を処理済みである。

## 2. 三分法による帰属

| 区分 | 判定 | 根拠 |
|---|---|---|
| 入力実体 | 無傷 | path・file type・link数・realpath・SHAが正式bindingと一致 |
| 読取処理 | 欠陥 | 3.29 GB媒体へ全量`readFile()`を使用し、既存streaming SHA正本を使っていない |
| 資源制約 | 発火条件 | 固定Nodeが2 GiB超の`FileHandle.readFile()`を`ERR_FS_FILE_TOO_LARGE`で拒否 |

原因は、正しい大容量入力と固定Nodeの既知上限に適合していないmeaning package runnerの読取方式である。契約の意味、違反code、入力値の変更は不要である。

## 3. 限定修正方針

- source mediaの初回SHA照合だけを、timeline側にある既存の安定streaming SHA正本へ寄せる。
- source mediaの公開直前再照合も同じ正本へ寄せる。
- JSON、STT、retained atoms等の小入力は従来の厳密全byte読取を維持する。
- SHA比較、file identity確認、symlink・hardlink拒否、公開前再照合、違反code、契約、成果物schemaは変更しない。
- 新しいstreaming実装を複製しない。

## 4. fatal観測性

現行failure reportは`input-read`までしか保存せず、対象pathと内側error codeを保存しなかった。本件をfatal観測性の実害8例目として扱う。観測性契約自体の改訂は今回の修正へ混ぜない。

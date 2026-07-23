# candidate 13 基本テロップ 論理表示幅資産 事実棚卸し v001

- 作成日: 2026-07-23
- 区分: 人間待ち充填方式による副線・読み取り専用調査
- 主線: `presentation-candidate13-caption-planning-gate-b-direction-design-20260723-v001.md`の方向判断待ち
- 状態: **既存の文字幅規則、表示経路、検査、旧資産、candidate 13の実測値を照合した。B1設計・実装・正式生成・Gemini実走なし**
- 書き込み範囲: 本レポート1件だけ。共有文書、承認済み設計、コード、正式成果物は変更していない
- 人間作業: 0件。新しい確認・承認依頼を追加しない

## 1. 目的と結論

既存のB1入力資産棚卸しでは、「認定済みpresetとrenderer trustに論理文字幅規則はあるが、候補ごとの正式な幅値はない」と確認した。本調査では、その規則をどこまで直接使えるか、現行描画系が何を既に検査しているか、旧テロップ折返し処理を流用できるかを事実として追加確認した。

結論は次の四点である。

1. **論理幅の正本は実在する。** `U+0000..U+00FF`のUnicode code pointを1、それ以外を2として数える。UTF-16長、見た目の字形数、fontのpixel幅ではない。
2. **現行の基本テロップ経路は、一行36論理幅を検査していない。** 上流で決まった行を一文字も変えず保持し、最大2行だけを検査する。非captionのうち複数行状態だけが既存の自動折返し処理を通る。
3. **candidate 13の205境界候補は、単体ではすべて論理幅8以下だった。** 一候補だけで36を超えるものはない。幅制約が実際に効くのは、複数候補を一行へまとめた後である。その最終行はまだ存在しない。
4. **旧テロップ折返し処理はB1へ直接再利用できない。** 条件付き句点削除、空白・改行の正規化、候補IDを使わない文字幅折返しを含み、元354文字の不変契約と「意味上の行末候補IDだけを選ぶ」仕事に一致しない。

したがって、再利用できるのは既存の版付き幅規則と計数関数、認定済みの一行上限・最大行数、確定行の文字index検査、描画後のpixel品質検査である。B1の候補幅成果物、複数候補を束ねた行の幅検査、来歴束縛、違反検査はまだ存在しない。

## 2. 論理幅規則の正確な意味

対象:

`evals/clip_composition/presentation_renderer_text_layout_v001.mjs`

版付き規則:

`U+0000..U+00FF=1; other Unicode code point=2`

処理上の意味:

- U+0000〜U+00FFは重み1。ASCIIだけでなくLatin-1全域を含む。
- それ以外のUnicode code pointは重み2。
- 文字列は`Array.from`でcode point列へ分ける。UTF-16 code unit数ではない。
- Unicode正規化は行わない。
- 結合文字、variation selector、ZWJで構成された字形は、一般には複数code pointとして別々に数えられる。
- supplementary characterはUTF-16では2 code unitでも、一つのcode pointとして重み2になる。
- fontの実pixel幅は測らない。

このため、ゲートA候補の`segmenterLengthUtf16`を論理表示幅として流用できない。両者は別の単位である。

## 3. 認定済みpresetと信頼束縛

正式preset:

`evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json`

初描画で使う基本テロップ状態:

| 項目 | 固定値 |
|---|---|
| preset | `normal-landscape-readable-pop-v001` |
| 表示状態 | `caption-core-v001` |
| 一行の論理幅上限 | 36 |
| 最大行数 | 2 |
| 一行固定 | しない |
| font | `line-seed-jp-extra-bold-v001`、96px |

正式renderer trust:

`evals/clip_composition/registries/presentation/presentation-renderer-trust-v001/trust.json`

この信頼情報は次を固定している。

- preset台帳と承認済みpreview。
- fontの実byte。
- rendererの依存ファイル。
- `presentation_renderer_text_layout_v001.mjs`の実byte。
- 上記の論理幅規則。
- layoutの数値・式を変える場合に、新previewと人間再認定を必要とする手続き。

ただし、これは現行renderer実行の信頼根である。将来のB1入力、205候補の幅値、モデル出力、B1検査を自動的には束縛しない。また、人間が認定したのは正式presetと描画previewであり、この幅計数関数だけを独立に見て認定したわけではない。後発のrenderer trustが、現在の規則実装を正式描画系へ束縛している。

## 4. 現行描画系で検査される範囲

対象:

- `evals/clip_composition/presentation_renderer_plan_v002.mjs`
- `evals/clip_composition/presentation_renderer_text_layout_v001.mjs`

| 表示経路 | 行を決める処理 | 一行の論理幅 | 本文不変 | 描画後のpixel検査 |
|---|---|---|---|---|
| 基本テロップ | 上流cueが明示した行をそのまま使う | **検査しない** | 文字indexで検査 | 行の箱、画面内、安全域などを別工程で検査 |
| 基本テロップ以外・複数行状態 | rendererがcode point順に自動折返し | preset上限で折返し、最大行数を検査 | 文字indexで検査 | 同上 |
| 基本テロップ以外・一行固定状態 | rendererは一行のまま保持 | **検査しない** | 文字indexで検査 | 同上 |

基本テロップでは、上流cueの各行を`indexExplicitLinesV001`がそのままindex化する。検査するのは、文字の欠落・重複・改変と最大行数である。各行の重み合計が36以内かは調べない。

基本テロップ以外でも、複数行を許す表示状態だけが`layoutUnicodeCodePointsV001`の論理幅規則で順番に折り返される。意味の切れ目は判断せず、上限を越える直前のcode pointで機械的に分ける。一行固定の話者名表示などは折返さず、一行であることだけを検査し、論理幅上限は現在強制しない。

したがって、B1で一行36以内を保証する場合、「既存rendererが後で止めるからよい」とは扱えない。B1で複数境界候補を一行へまとめた結果に対する、版付きの幅検査が必要になる。

## 5. 現在の検査網

### 5.1 検査済みの事項

- preset、承認済みpreview、依存ファイル、font、tool、layout規則のhash整合。
- 基本テロップの明示行、句点、行頭・行末空白、開始・終了anchorの保持。
- 基本テロップ以外の本文で、句点、空白、CRLF、emojiを含む文字indexの欠落・重複・改変検出。
- 最大行数。
- 描画後の行矩形の正の空間交差、画面外、安全域。
- 描画結果とmanifestの決定性。

### 5.2 未検査の事項

- U+00FFとU+0100の境界値。
- ASCII、日本語、emoji、結合文字、ZWJを混ぜた論理幅の具体例。
- 一行36と37の閾値。
- 基本テロップ一行が36を超えた場合の拒否。
- B1で選ばれた複数境界候補の重み合計。
- 自然な意味の切れ目。

旧`runner/src/telop/telop-line-break.ts`の各関数を直接呼ぶunit test/specは、repo内検索では0件だった。現行presentation側には本文不変と描画配置の検査があるが、旧折返し判断そのものを正本として保証する検査ではない。

## 6. 旧テロップ折返し資産との違い

対象:

- `runner/src/telop/telop-line-break.ts`
- `runner/src/telop/telop-render-model.ts`
- `runner/src/telop/text-metrics.ts`

### 6.1 旧処理が行うこと

- 日本語を含む行は、同じ1/2重みでcode point順に折り返す。
- 非日本語行は空白境界を優先し、長単語だけを文字分割する。
- 結果が2行なら、最終一文字行の回避、上下の重み差、元分割からの距離で再配置する。
- 末尾の日本語句点`。`を除いた案を作り、行数が減るか最終一文字行を解消できる場合は、句点なし案を採用する。
- 非日本語行では先頭・末尾空白を落とす。
- 一行表示では文字列としての改行表現と、実LFまたはCRLFを除去し、前後空白を落とす。
- 境界候補ID、元文字ID、発話まとまり、anchor、欠落・重複証拠は扱わない。

### 6.2 B1へ直接使えない理由

1. 条件付き句点削除と空白・改行の正規化があり、元354文字の厳密一致契約と衝突する。
2. 入出力が生文字列と行文字列だけで、ゲートAの205境界候補IDを制約として使わない。
3. code point境界で切れるため、ゲートAが保証する「元文字を分割しない境界候補」の外でも切れ得る。
4. 文字幅、空白token、二行の見た目バランスだけを見ており、意味が読める行末を判断しない。
5. 現行基本テロップは「上流が行を決め、rendererは本文を変えず検査・描画する」契約であり、描画時に旧自動折返しを再適用する経路はない。

同じ粗い文字幅の1/2規則は、現行presentation側に版付きで再実装されている。旧runner資産から直接再利用されているのは、Canvas実測値と1/2重みの推定値の大きい方を使う、確定行の保守的な寸法計算である。最終描画後のalpha boundsと配置QCは別のpresentation検査である。旧の本文正規化と自動折返しは、B1の意味分割器ではない。

## 7. candidate 13の読み取り専用実測

### 7.1 再構成方法と副作用

固定済みの正式354文字、固定Node実体、ゲートAのexport済み純粋生成処理を使い、205境界候補をメモリ内だけで再構成した。正式runnerと正式jobは実行せず、正式成果物も生成していない。

実行環境:

- Node実体: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- Node: v20.19.6
- ICU: 77.1
- Segmenter locale / granularity: `ja` / `word`

固定した実byte:

| 対象 | SHA-256 |
|---|---|
| Node実体 | `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c` |
| ゲートA純粋生成処理 | `dac613292e463897ee2757be75a7d64f3ece9928141765a195ba54a0ebc6007a` |
| 論理幅処理 | `066a62adaa7fa3f8b8eda92c82e9a85940e43f372af976edc4b327ef4cf9ce5e` |
| 正式354文字ファイル | `8656549ec3fbbc0fb9447be7b9c2e784d22ebd18f08ee3e24c474ee62225c6d3` |

再構成したhashはゲートA完了記録と一致した。

| 対象 | SHA-256 |
|---|---|
| 205境界候補配列 | `0f8e7b07c32befc4e4703e1945b61e7656a2e978a8ba959fd169a753efe454b6` |
| 候補から元文字への所属対応 | `b2da8ee1b3fef9c23b5598d73713d77831f392471cf98a9723392ef115ea50fd` |
| 境界証拠全体 | `be4344dd5d97596a815a92ae283d0da3c7353600b2983e93cf53b1947c5338eb` |

予約済みの正式出力先
`evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/DmWu0jVQfTE-candidate-13-v001`
は、実測後も不存在だった。

### 7.2 全体の論理幅

正式354文字の内訳:

- U+0000〜U+007F: 2文字。どちらも`2`。
- U+0080〜U+00FF: 0文字。
- U+0100以上: 352文字。
- 論理幅合計: 706。

205境界候補の単体幅分布:

| 一候補の論理幅 | 候補数 |
|---:|---:|
| 1 | 2 |
| 2 | 101 |
| 4 | 67 |
| 6 | 23 |
| 8 | 12 |

- 最小: 1
- 最大: 8
- 36以下: 205件
- 36ちょうど: 0件
- 36超: 0件

### 7.3 container別

| container | 発話 | 文字数 | 候補数 | 論理幅合計 | 一候補の最大幅 |
|---|---:|---:|---:|---:|---:|
| `segmenter-container-000001` | 1 | 126 | 60 | 252 | 8 |
| `segmenter-container-000002` | 2 | 122 | 78 | 243 | 6 |
| `segmenter-container-000003` | 3 | 106 | 67 | 211 | 8 |

container全体は一つの連続発話範囲であり、一行として合否を判定する単位ではない。全205候補が単体で36以内でも、複数候補を一行にまとめた時の合計が36以内とは限らない。最終cueが未生成なので、一行36・最大2行・pixel配置は未判定である。

### 7.4 Unicode edgeの実測

candidate 13の**元データ**には次のedge caseがなかった。

- supplementary character。
- 孤立surrogate。
- 結合文字。
- variation selector。
- ZWJなどのzero-width format。
- control、改行、Unicode whitespace。
- emoji。
- Halfwidth and Fullwidth Forms。

正規化形式別の読み取り専用診断では、NFCとNFKCで本文または論理幅が変わる候補は0件だった。一方、NFDとNFKDでは、濁点付き文字の分解により本文と論理幅が変わる候補が34件あった。ゲートAと論理幅処理はUnicode正規化を行わないため、この診断は正規化の提案ではなく、「正規化すると別の値になるデータを含む」という既知事項である。

そのため、元データに存在しないUnicode edgeの一般挙動は実装から読めるが、candidate 13の実データで通ったとは言えない。

`segmenterLengthUtf16`と本文のcode point数が違う候補は0件だった。一方、`segmenterLengthUtf16`と論理幅が違う候補は203件だった。今回の実データでも、Segmenter長を表示幅として使えないことを確認した。

### 7.5 実行コマンド

固定byteの確認:

```sh
shasum -a 256 \
  /Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node \
  evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs \
  evals/clip_composition/presentation_renderer_text_layout_v001.mjs \
  evals/clip_composition/outputs/presentation/retained-source-atoms/DmWu0jVQfTE-candidate-13-v001/source-atoms.json
```

純粋生成処理と既存幅関数によるメモリ内集計。実行時の一行コマンドを、読みやすさのため改行している。

```sh
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node --input-type=module -e '
import {readFile} from "node:fs/promises";
import {buildPresentationSegmenterBoundaryEvidenceV001 as build}
  from "./evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs";
import {codePointWeightV001 as weight}
  from "./evals/clip_composition/presentation_renderer_text_layout_v001.mjs";
import {sha256CanonicalV001 as sha}
  from "./evals/clip_composition/presentation_retained_source_atoms_v001.mjs";
const jobPath =
  "evals/clip_composition/outputs/presentation/segmenter-boundary-preflight-jobs/DmWu0jVQfTE-candidate-13-v001.json";
const sourcePath =
  "evals/clip_composition/outputs/presentation/retained-source-atoms/DmWu0jVQfTE-candidate-13-v001/source-atoms.json";
const [job, source] = await Promise.all(
  [jobPath, sourcePath].map(async (path) => JSON.parse(await readFile(path, "utf8"))),
);
const input = job.inputs.find((entry) => entry.role === "sourceAtoms");
const resolved = new Intl.Segmenter("ja", {granularity: "word"}).resolvedOptions();
const runtimeBinding = {
  nodeBinarySha256: job.expectedRuntime.nodeBinarySha256,
  nodeVersion: process.version,
  icuVersion: process.versions.icu,
  resolvedLocale: resolved.locale,
  resolvedGranularity: resolved.granularity,
  diagnostics: {
    resolvedNodePath: process.execPath,
    platform: process.platform,
    arch: process.arch,
    v8Version: process.versions.v8,
    unicodeVersion: process.versions.unicode,
    cldrVersion: process.versions.cldr,
  },
};
const evidence = build({
  artifactId: job.artifactId,
  sourceArtifact: source,
  sourceArtifactSnapshot: {path: input.path, fileSha256: input.fileSha256},
  runtimeBinding,
});
const logicalWidth = (text) =>
  [...text].reduce((total, character) => total + weight(character), 0);
const candidates = evidence.boundaryCandidates;
const distribution = (values) => Object.fromEntries(
  [...new Set(values)].sort((left, right) => left - right)
    .map((value) => [value, values.filter((entry) => entry === value).length]),
);
const summarize = (entries) => {
  const characters = entries.flatMap((entry) => [...entry.text]);
  const widths = entries.map((entry) => logicalWidth(entry.text));
  const asciiCount = characters.filter((character) => character.codePointAt(0) <= 0x7f).length;
  const latin1NonAsciiCount = characters.filter((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint >= 0x80 && codePoint <= 0xff;
  }).length;
  return {
    candidateCount: entries.length,
    codePointCount: characters.length,
    asciiCount,
    latin1NonAsciiCount,
    aboveU00ffCount: characters.length - asciiCount - latin1NonAsciiCount,
    logicalWidthTotal: widths.reduce((left, right) => left + right, 0),
    widthDistribution: distribution(widths),
    maximumWidth: Math.max(...widths),
    atOrBelow36Count: widths.filter((value) => value <= 36).length,
    equal36Count: widths.filter((value) => value === 36).length,
    above36Count: widths.filter((value) => value > 36).length,
  };
};
const containerIds = [...new Set(candidates.map((entry) => entry.containerId))];
console.log(JSON.stringify({
  hashes: {
    candidates: evidence.boundaryCandidatesCanonicalSha256,
    membership: evidence.sourceAtomMembershipCanonicalSha256,
    evidence: sha(evidence),
  },
  overall: summarize(candidates),
  containers: containerIds.map((containerId) => ({
    containerId,
    ...summarize(candidates.filter((entry) => entry.containerId === containerId)),
  })),
  normalization: Object.fromEntries(
    ["NFC", "NFKC", "NFD", "NFKD"].map((form) => [form, {
      textChangedCount: candidates.filter(
        (entry) => entry.text.normalize(form) !== entry.text,
      ).length,
      logicalWidthChangedCount: candidates.filter(
        (entry) => logicalWidth(entry.text.normalize(form)) !== logicalWidth(entry.text),
      ).length,
    }]),
  ),
  logicalWidthVsSegmenterUtf16MismatchCount:
    candidates.filter((entry) =>
      logicalWidth(entry.text) !== entry.segmenterLengthUtf16).length,
}, null, 2));
'
```

正式出力が作られていないことの確認:

```sh
test ! -e \
  evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/DmWu0jVQfTE-candidate-13-v001
```

## 8. 直接再利用できるものと未整備のもの

| 区分 | 資産 | 現在言えること |
|---|---|---|
| 直接再利用候補 | 版付き論理幅規則と`codePointWeightV001` | 同じ計数を再実装せず使える |
| 直接再利用候補 | 正式presetの36・最大2行 | B1が従う表示上限の根拠にできる |
| 直接再利用候補 | 確定行の文字index化・本文不変検査 | B1後の行本文を欠落・重複・改変なしで検査できる |
| 後段の既存検査 | 保守的な行寸法計算、描画後alpha bounds、行交差、画面外、安全域 | 論理計画後の描画品質検査であり、意味分割の代わりではない |
| 直接再利用不可 | 旧テロップの自動折返し | 本文不変・候補ID制約・意味判断を満たさない |
| 未整備 | 候補ごとの論理幅成果物 | schema、field、実装来歴、入力hash束縛がない |
| 未整備 | 複数候補を束ねた一行の幅検査 | 現行基本テロップ経路にない |
| 未整備 | B1用の違反種類・検査器・CLI | 存在しない |
| 未整備 | B1結果からcaption契約へ渡す正式成果物 | 未承認のゲートB方向設計後の仕事 |

## 9. 本調査で決めていないこと

本レポートは次を固定しない。

- B1成果物のschema、field名、違反種類、CLI、終了コード。
- 候補幅をB1入力へ複製するか、検査時に計算するか。
- 一行の候補列をどの成果物で表すか。
- 意味分割prompt、モデル出力、run数、abstain契約。
- 既存rendererを改訂するか、B1で幅検査を完結させるか。
- Unicode edge case用の追加fixture。

これらは、主線の方向判断後に起草するB1実装契約で事前固定すべき設計事項である。

## 10. 停止点

- 主線はゲートB方向設計の人間判断待ちのまま。
- 本副線から新しい承認依頼は出さない。
- B1設計、コード、prompt、Gemini実走、正式成果物生成へは進んでいない。
- 人間作業は0件。

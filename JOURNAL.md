# JOURNAL.md — ZEV 実現記録

この文書は、撤退先として検証済みの`stable/*`タグごとに、「その地点で実際に何ができるようになったか」を平易な言葉で残す日記である。

## 記録規則

- エントリは安定点タグの対象commitへ、タグ発行と同時に追加する。
- 安定点は、全検査合格、正式成果物のhash一致、`DECISIONS.md`と`docs/HANDOVER.md`の現在地同期、の3条件を満たす地点だけとする。
- 各エントリには、日付とタグ名、実現できること、そこへ至る過程、撤退時に失われる作業範囲を書く。
- 詳細な契約名や検査コードの列挙は避け、必要な証拠は既存の完了報告へリンクする。
- 制度導入前の安定点へ付ける初回遡及タグだけは、3条件を読取監査で再確認し、このJOURNALの初回エントリを現在HEADの新規commitへ記録した上で、タグを過去の検証済みcommitへ付けてよい。エントリへタグ名と対象commitを明記する。この例外は初回だけで、以後のタグは原則どおり対象commitへエントリを同時記録する。

## 2026-07-24 — `stable/gate-a-complete-20260723`

- タグ対象: `23a709a1b1ea7ccc02966702e1048add965725c0`（2026-07-23の安定点）。
- 正式初見の配信から公開候補4本を選べて、第一関門「自分で使える」を通過した。
- 動画の意味を決める役割と、文字や画面を描く役割を分け、後から描画方法を交換できる土台を作った。
- 人間が選んだcandidate 13の二つの区間から、音を欠けさせず正式な基礎映像を作れるようになった。
- 切り落とした箇所を字幕側が再参照しないよう、残った354文字だけを正式な入力として保存した。
- その354文字から、欠落・重複・並べ替えなしで205個の字幕区切り候補を同じ結果で作れる。
- ここで保証するのは文字を正しく引き継ぐところまでで、自然な読みやすさや完成した見た目ではない。
- ここへ至るまでに、初見試験、演出と描画の責務分割、実データ音声の1msの欠落の発見と修正があった。
- 小さな差を許容して進めず、人間が聴いて採用した編集と同じ映像・音声になるまで照合した。
- 字幕区切り工程でも三度安全停止し、検査を弱めず不足と誤判定を直してから全検査を通した。
- 詳細: [第一関門認定](docs/reports/first-gate/FIRST_GATE_FINAL_REVIEW_PACKAGE_20260717.md)、[演出と描画の責務分割](evals/clip_composition/reports/presentation/presentation-instruction-renderer-boundary-contract-20260720-v002.md)、[初の実データ基礎映像](evals/clip_composition/reports/presentation/presentation-first-real-data-base-media-attempt-v002-completion-20260722-v001.md)。
- 詳細: [残存発話の正式抽出](evals/clip_composition/reports/presentation/presentation-candidate13-retained-source-atoms-formal-execution-20260722-v001.md)、[字幕区切り工程の完了](evals/clip_composition/reports/presentation/presentation-gate-a-implementation-completion-report-20260723-v001.md)、[遡及安定点の読み取り監査](evals/clip_composition/reports/presentation/presentation-gate-a-retrospective-stable-tag-audit-20260724-v001.md)。
- このタグへ撤退すると、次の字幕入力パッケージの実装、検査修正、127/132で安全停止するまでの診断と文書更新に加え、ゲートC以降の接続準備監査と新素材候補の再照合監査を失う。
- 正式入力パッケージ、Gemini実走、字幕指示書、描画はこの地点でも未実現なので、撤退で失う完成成果物はない。

## 2026-07-25 — `stable/b2-complete-20260725`

- candidate 13の354文字と205個の区切り候補から、Geminiへ渡す前の正式入力を安全に組み立てられるところまで完成した。
- Geminiが返せるものを行末候補と1〜2行のまとまりへ限定し、元の文字や時刻を作り直させない受け口もできた。
- 入力作り133件、回答受け入れ155件、既存の境界21件、残存発話50件がすべて合格した。
- candidate 13の現物を使った読み取りだけの確認も17件すべて通り、正式成果物をまだ書いていないことを確認した。
- 途中では、検査データ、公開手順、読取方法、パス表現の違いが何度も見つかった。
- そのたびに部分合格や許容差で押し通さず、原因を記録して人間承認後に全件を最初から流し直した。
- 最後の問題は、macOSが同じ一時ファイルを二つのパスで表すため、検査が実際の入口を起動できないことだった。
- 本番処理を変えず、検査が起動するファイルだけを実体のパスへ合わせて解消した。
- 既に完成していた基礎映像と残存発話の現物も再計算し、記録済みの値と一致した。
- 詳細: [B2完了報告](evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b2-completion-report-20260725-v001.md)。
- この地点は、正式入力を作る処理と回答を検査する処理までの撤退先である。
- 正式7ファイル、Geminiの回答、字幕指示書、描画動画はまだ作っていない。
- 将来このタグへ撤退すると、タグ後に作る正式入力、Gemini実走、表示計画、指示書、描画を失う。
- 次は正式入力を一件だけ生成し、そこで一度止まる。

## 2026-07-25 — `stable/b3-complete-20260725`

- candidate 13について、Geminiへ渡す前の正式入力7ファイルを初めて作った。
- 元の354文字を欠けさせず、205個の区切り候補との対応を保ったまま保存している。
- どの入力、処理、文字幅の決まりを使ったかも同じ一組に記録した。
- 正解や教師切り抜きから得た情報が、Gemini向け入力へ混ざっていないことを検査した。
- 正式生成は固定した依頼書から一回だけ行い、設定変更や再試行はしなかった。
- 作業中だけ使う場所へ7ファイルを書き、全検査後に一組のdirectoryとして公開した。
- 公開後に全ファイルを読み直し、名前、内容、hash、相互参照が生成時と同じことを確かめた。
- 事前に固定した354文字・3まとまり・205候補と三つの証拠hashも完全一致した。
- Geminiはまだ実行しておらず、自然な改行や読みやすさもまだ人間認定していない。
- 詳細: [B3完了報告](evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b3-formal-package-generation-completion-report-20260725-v001.md)。
- このタグは、正式入力が実在し、次の意味判断へ安全に渡せる地点への撤退先である。
- このタグへ撤退すると、B4以降で作る表示計画、prompt、Gemini回答、演出指示書、描画を失う。
- タグ時点ではそれらは未作成なので、撤退で失う完成動画はない。

## 2026-07-26 — `stable/b4-complete-20260726`

- Geminiの回答を、元の文字を変えず字幕の表示計画へ変換する配管と検査が完成した。
- 元発話354文字、3つのまとまり、205個の区切り候補、基礎映像2区間を実データのまま読み取れた。
- 表示計画の検査88件、回答の受け口133件、既存機能95件、実データ確認12件が全て合格した。
- まだGeminiは呼んでおらず、実際の字幕計画や描画動画も作っていない。
- 最後の停止は、本番確認と依頼書作成が同じ監視対象を別々の順序で数えていたことだった。
- 本番側の数え方を唯一の正本にし、依頼書作成はその処理を読み取り専用で使うようにした。
- 失敗した依頼書と11/12の結果は消さず、新しい依頼書を一度だけ作り12/12を確認した。
- この過程では、短すぎる一文字字幕、検査用ファイルの置き場所、別processの正式成果物混入も見つけた。
- いずれも正式入力や本番契約を緩めず、検査データと検査環境を正して全件をやり直した。
- 詳細: [B4完了報告](evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b4-completion-report-20260726-v001.md)。
- このタグは、Geminiへ送る内容を固定するB5へ進める撤退点である。
- このタグへ撤退すると、今後作るprompt、API送信内容、Gemini回答、正式表示計画、指示書、描画を失う。
- タグ時点ではそれらは未作成なので、撤退で失う完成動画はない。

## 2026-07-27 — `stable/first-clip-complete-20260727`

- candidate 13について、元配信からの選択、切り分け、字幕の意味判断、表示計画、描画までを一つの経路で完走した。
- B5 v004で、Geminiへ渡す内容と費用見積りを固定した。
- Geminiは一回の実走で、元の文字を変えず20個の意味まとまりを読みやすい短い2行へ分けた。
- 回答は既存の受入検査を通り、正式な表示計画になった。
- v003描画経路はv002への変換や偽装をせず、その計画を直接mp4へ描いた。
- できた動画は84.500秒、1920×1080、2,535 frameで、SHA-256は`82b216dca51e0c0c126e41e1272f0981b3318071dcb33ff4eb54cee0a472cbb8`。
- 文字の欠落、重なり、画面外、frame変化、音声変化がないことを機械検査した。
- 最後にkawafmmが目視し、「字幕は良い」と認定した。
- これで基本テロップだけの「初の一本」が成立した。
- 途中では、行幅の数値だけを追うと読みやすさから外れる問題、v003正式描画入口の不足、QCの版名依存を見つけた。
- 意味を優先する行分け、v003専用成果物、版中立の同一QCへ直し、検査を緩めず完走した。
- 詳細: [B5/B6 v004結果](evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b6-readability-result-20260727-v004.md)、[描画manifest](evals/clip_composition/outputs/presentation/review-renders/DmWu0jVQfTE-candidate-13-caption-b6-v004-v002/presentation-review-render-manifest-v003.json)、[描画後QC](evals/clip_composition/outputs/presentation/review-renders/DmWu0jVQfTE-candidate-13-caption-b6-v004-v002/presentation-review-render-qc-v003.json)。
- G4〜G7、素材、SE、タイトル、サムネイルはこのタグの完成範囲に含まれない。
- タグ時点より後の作業はまだ無いため、今ここへ撤退して失う完成作業はない。

## 2026-07-28 — `stable/second-clip-generality-20260728`

- 宝鐘マリンのLiar's Bar元配信から選んだcandidate 59を、candidate 13とは別の素材で一本の字幕付き動画まで完成させた。
- 元配信・候補・外側境界から組立と残存発話へ進む入口、素材ごとの初回token計測入口、固定jobからGemini・回答検査・表示計画へ進む入口の3点を共用化した。
- 既存の計算を呼ぶ構造を維持し、candidate 59専用の計算や4つ目の入口は作っていない。
- B1では、生成時の実装来歴と現在使う実装の検査を別の役割として扱い、両者の世代が同じであることだけを要求しないようにした。
- 生成時の来歴、現在の実ファイル、参照関係、内容、実行後の再読と改変検知は引き続き検査している。
- Geminiが作った16まとまりのうち1件だけが画面配置検査に抵触した。
- kawafmmがその1件の分割候補を認定し、他の15まとまり、上流281文字、プリセット、行幅上限36を変えず局所再選択した。
- 局所再選択後は、回答受入12/12、表示計画17/17、描画後QC 6/6に合格した。
- 完成動画は51.566秒、1920×1080、1,547 frameで、SHA-256は`730410a9598ac9fda6d84b61b80686a0706ce8cebe4d83cca923422398e3b88b`。
- kawafmmが全編を見て「何も問題ない」と認定した。
- これで、最初の一本だけでなく、別の元配信でも同じ配管から一本を成立させた実績ができた。
- 行幅36と横型プリセット1種は今回も固定であり、形式別の値差し替えはまだ実証していない。
- 詳細: [一般化入口の実装完了](evals/clip_composition/reports/presentation/presentation-liars-bar-candidate59-minimal-generalization-implementation-completion-20260727-v001.md)、[candidate 59完成検証](evals/clip_composition/reports/presentation/presentation-liars-bar-candidate59-completion-verification-report-20260728-v002.md)、[描画後QC](evals/clip_composition/outputs/presentation/review-renders/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/presentation-review-render-qc-v003.json)。
- このタグへ撤退すると、candidate 59の完成動画と3つの一般化入口までは保持される。タグ発行時点より後の完成作業はまだないため、現時点で失う作業はない。
- 一つ前の`stable/first-clip-complete-20260727`まで戻る場合は、candidate 59の全成果物、3つの一般化入口、B1世代差改訂、局所再選択の実績を失う。

## 2026-08-02 — `stable/vertical-first-clip-20260802`

- candidate 59を、正式な話者1人用cropと認定済みの大きな字幕で、ZEV初の縦型ショート形式動画にした。
- 確認動画は51.566秒、1080×1920、1,547 frame、字幕30件・51行で、SHA-256は`2cc9a3407148e5005616474f37cb76bb57111dd2aedc318307ea6a7190a8d7a2`。
- 字幕の適用、行の重なり、安全領域、文字の欠落、frame数、音声の6項目を機械検査し、全て合格した。
- kawafmmが全編を見て、crop位置、テロップの読みやすさ、音声、終端を「問題なし」と認定した。
- これは確認用の簡素な一本であり、演出、タイトル、サムネイル、公開はまだ含まない。
- 安定点化では、横型保護検査が同じ棚に増えた縦型55ファイルを横型への追加と誤認して一度止まった。
- 横型91ファイルは欠落も変更もなかったため、過去tag由来の横型root・fileだけを正確に守るよう検査範囲を直した。
- 横型root内の追加、未登録横型root、欠落、内容変更は引き続き拒否し、別の版付き縦型rootだけを対象外にした。
- stage済みの全変更を入力に、横型回帰H01〜H06は6/6へ合格した。
- 実完成物から、配信時には上段の画面内タイトルが必要という次の観測も得たが、まだ実装していない。
- 詳細: [描画完了報告](evals/clip_composition/reports/presentation/presentation-candidate59-vertical-render-completion-report-20260802-v001.md)、[安定点完了報告](evals/clip_composition/reports/presentation/presentation-candidate59-vertical-stable-point-completion-report-20260802-v001.md)、[描画後QC](evals/clip_composition/outputs/presentation/vertical-review-renders/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v003-result/presentation-vertical-review-render-qc-v001.json)。
- このタグへ撤退すると、横型2本、初の縦型一本、縦型正式経路までを保持できる。
- タグ後に予定する無音・間の調整、意味サポート場面接続、スケルトン再構築は失われるが、タグ発行時点では全て未着手である。
- 一つ前の`stable/second-clip-generality-20260728`まで戻る場合は、縦型preset、縦型B3〜B6・B1・B4・描画経路、Gemini実走と費用記録、縦型確認MP4、人間目視合格を失う。

## 2026-08-06 — `stable/meaning-output-first-real-run-20260806`

- 同じ意味情報から、横型と縦型の二つの完成動画を別々の画面表現として作れるようになった。
- 入力固定、Geminiへの一回送信、意味情報の保存、基礎映像、crop、二形式の描画、機械検査、人間確認までを一本の経路で完走した。
- 初回の完成物では、短い字幕まで必ず2行になる違和感をkawafmmが見つけた。
- 字幕本文や時刻は変えず、1行に収まる短文は1行、長すぎる本文だけを改行するよう出力側の選択順を直した。
- 改訂後の横型は51.566667秒、SHA-256 `175dc67489e86b2fc364894a737693a14a9c7c27fab492c0cb1873aedd6a77bc`。
- 改訂後の縦型は51.566016秒、SHA-256 `eeb72350373be88022966059f09cd9b3f474a005ffa3cc18db8417eafdaa9618`。
- 横型は31字幕を全て1行、縦型は短文15ページを1行、長文23ページを2行で表示した。
- 改行処理27件、正式出力と描画の回帰33件、両形式の描画後QCが全て合格した。
- kawafmmがcrop、音声、終端、字幕改行を目視し、二形式とも問題なしと認定した。
- APIの追加通信は0回、追加費用はUS$0で、意味情報パッケージと既存3本の正式成果物は変えていない。
- 詳細: [完成物検証レポートv002](evals/clip_composition/reports/presentation/presentation-output-page-line-wrap-policy-completion-verification-20260806-v002.md)。
- このタグへ撤退すると、意味／表現を分けた初回実データrunと、目視合格済みの横型・縦型二本を保持できる。
- このタグより後に予定するfatal観測性v002、タイトル、無音・間の調整、意味サポート場面接続は失われるが、タグ発行時点ではいずれも未実装である。

## 2026-08-08 — `stable/fatal-observability-v002-20260808`

- 表向きは同じ「処理できません」でも、内側のどこで何が止まったかを安全に残せるようになった。
- 対象は、字幕回答の受け口、時間構成、意味の区切り、意味情報の保存、横型・縦型の出力という五つの境界である。
- 生のエラー文、字幕本文、秘密情報は残さず、閉じた原因分類と、検証できた対象ファイルだけを記録する。
- 実装中は、呼び出し側の自己申告を信じて対象ファイルを記録する穴が複数見つかった。
- 既に検査済みの記録と実際の読み取り証拠が一件だけ一致した場合に限って記録する形へ揃えた。
- 検査環境の違いで古い基準値が歪んでいたことも分かり、同じ実体を正式条件で数え直した。
- 新しい正式基準は86/203で、旧記録と比べても不合格117件は増えていない。
- 新規81件、直接影響130件、既存の正常系287件、既存正式成果物5組の照合を全て通した。
- 既存の成功、検査済み拒否、終了規約、正式動画や意味情報の内容は変えていない。
- 詳細: [fatal観測性v002完了報告](evals/clip_composition/reports/presentation/presentation-fatal-observability-v002-completion-report-20260808-v001.md)。
- このタグへ撤退すると、意味と表現を分けた完成二形式と、そこまでの失敗を短い往復で診断できる基盤を保持できる。
- タグ後に進める画面内タイトル、無音・間の調整、遠距離の意味接続は失われる。
- タグ発行時点ではそれらは未実装なので、撤退で失う新しい完成動画はない。

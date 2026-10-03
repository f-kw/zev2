レイアウトCLIのIPC長pathについての読み取り結論：同じ専用SSD tempを保ち、資格確認済みlayout childだけcwd=generatedRoot/TMPDIR=tempにする限定caller接続案は、実source上は成立しそうである。probe/test/新生成をしていないため成功保証ではない。確認時刻 2026-10-03T16:07:45.270643+00:00、HEAD c57b9ebe8a806568c47737b5e3d4379870dc65b2。

今回の97.092秒の正式停止は、レイアウトCLIの60.233ms/exit1失敗を受けたもの。renderer-resultはlayout inspector produced no result。既存admission/line-layout/layout-inputはあるがlayout-outputは無い。372overlayのlayout-inputを保存済みで、字幕PNG/合成/完成QCの開始前に止まった。

0003 stderrの通信名は144 UTF-8 bytes。Node20.19.6が使うlocal libuv version headerは1.46.0、Darwin SDKのsun_pathは104bytes。libuvのlegacy bind sourceは長いnameをsun_path幅に切り詰める一方、cleanup用には元の長いnameを保存する。そのため一意なPIDより前で切られ、同じprefixの残存物に衝突し得る。[libuv1.46.0 source](https://raw.githubusercontent.com/libuv/libuv/v1.46.0/src/unix/pipe.c)

実lstatで104byte prefixの /Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-formal-handoff-20261003-v001/attempt-001/body-c がsocketだった。inode163、dev16777243、size0、symlinkなし、mtime2026-10-03 13:59:33.803987 UTC。103byte prefix body-は存在しなかった。典型値103bytesを述べるNode文書と区別し、この環境の104byte source/実pathを根拠にする。socketの作成者や現在の保持者はlstatだけでは証明せず、parent側の確認対象に残す。こちらはunlink/lsof/listen/connectをしていない。[Node20.19.6 IPC docs](https://nodejs.org/download/release/v20.19.6/docs/api/net.html#identifying-paths-for-ipc-connections)

installed tsxはos.tmpdir()/tsx-UID/PID.pipeを作り、cliは同名をrmしてからlistenし、exit時にもその元nameをrmする。Node20.19.6のtmpdir実装はTMPDIRを優先してその文字列を返し、絶対pathへの変換をしない。したがってTMPDIR=tempなら通信名はtemp/tsx-501/40094.pipeの23bytesになる。cwdをqualified generatedRootに固定すれば解決先は従来のgeneratedRoot/tempそのもので、SSD外への移動やsymlinkは不要。[Node20.19.6 os source](https://raw.githubusercontent.com/nodejs/node/v20.19.6/lib/os.js)

変更箇所は既存caller evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts のqualified processObserver wrapper（670〜682付近）。rendererのlayout subprocessへenvだけ追加しても、このwrapperが最後にTMPDIRを絶対tempへ上書きするため解消しない。qualified Digest＋label layout-inspectionだけを選び、exact tsx command、exact既存inspectorの絶対path、3args、generatedRoot配下で同じscratch内の絶対layout-input/outputを検査してからcwd=generatedRoot、最終TMPDIR=tempにする。NODE_PATHとTMP/TEMP/MAGICK_TEMPORARY_PATHは従来の専用SSD値を保持し、他childとcontextなし通常挙動は変えない。wrapper options型にcwd/observationLabelの宣言が必要。

cwd/tempのrealpathが固定実pathと一致し、path.resolve(generatedRoot, temp)===storageContext.tempDirectoryを検査する。任意cwd/tmp callbackは増やさず、opaque資格のbefore/after検査、絶対code/input/output参照、current SHA/device/image/grant/owner/reserve/RSS/pressureと既存QCを保持する。

layout CLIは明示input/outputだけを読む/書く。importsはsource fileから相対解決し、NODE_PATHは既存renderer依存を指す。Node版measureTextLineはdocument無しで推定geometryを返すためfontをcwdから開く処理はない。実fontロード/glyphは後段Remotionで従来どおり検査する。旧repo cwdと新guest cwdの祖先にtsconfig.jsonは無かったため、この修正で新tsconfig/aliasを加えない。layoutRules・safeArea・本文・時計・検査logicは不変。

必要な追加実装pathはcaller1path。加えてadapterの厳密caller逆変換は過去のfileURL2行差分だけを許しているため、新wrapper差分とfresh caller hashを個別に資格化しなければ開始前に拒否される。既存7実装束縛の中でcallerを正規更新し、一般trust/defaultや共通ROOT、layout CLI、generic observerは変更しない。adapterだけの変更では現在のwrapperの上書きを変えられない。

この案はQC-only復帰や新製造の許可ではない。現在v003にはadmission/line-layout/core metadataとlock/workが残り、既存fresh-entry/no-replace gateは同じentryの無条件再実行を拒否する。過去結果を保持した次の正式retry配置/資格はparent判断に残し、このreviewerは新rootを作らない。layout-output捏造、saved-inputをpassedとして代用、Native化、閾値緩和、短計画はしない。Normal encoded-omission-v2の全372samples/371survivors/全27691frame/40705770sampleとCore serialize=trueは維持する。

証拠の実path/bytes/SHA、socket stat、具体変更・未確認は同名JSONに保存した。

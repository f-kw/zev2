# 今回一件のDigest正式登録移行

親monaから届いた本人の「いいよ」（Sentinel_cf8aca8c66e88191900cd3508db6ba22、会話01a0ff1f-1ad3-70b5-bb7f-d0f3988a10e6）に基づく。本人メッセージの投稿時刻は未提供であり、記録時刻と区別する。DECISIONSへの承認追記は行わない。

対象は digest-SJvP9jhEdyI-20261004-v001 の保存済み一素材・31区間・5450atom・旧31字幕回答。元素材、STT、採用計画、元本文・ID・順序・時計・音声、旧4要求と登録成果、旧回答原本、失敗証拠は変更しない。既存の短字幕2箇所の表示調整を新候補へ再導出し、一本を既存正式入口で製造する。新素材取得・STT・LLM再判断・有料API・HTML・公開は対象外。

通常typed builderから、新しいvalidate_digest_plan要求だけを一件登録する。旧prepare_video/run_stt/prepare_digest_planへ依存し、通常runnerが実claim・現行consumer検証・完了登録を行う。旧要求を再開・上書きしない。旧execution ID/SHAと新execution ID/SHAの対応を証拠化し、source/STT/planの所有者は同一とする。

最新入力形式はdigest-caption-input-preparation-v002、候補はdigest-caption-current-registration-candidate-bundle-v001とdigest-caption-current-display-adjustment-candidate-bundle-v001、job/authはv002だけを受理する。一般readerで旧形式を救う分岐、Git旧コード実行・旧実装SHA黙認・自動fallbackを作らない。

明示inputRootは/Volumes/ZEV-Digest-20261003-01、inputPrefixはruntime/artifacts/digest-SJvP9jhEdyI-20261004-v001/current-inputs-v001。入力JSONの実pathはinputRoot + binding.pathとしprefixを二重付加しない。新スナップショット・準備・候補・回答登録・JSONログ・媒体・途中物はSSD。scope文書とコード、既存font/registryはrepo。約39KB以内の既存4制御JSONの内蔵例外は本人の別承認で継続し、一般Core ROOTを変更しない。

必須registrationMigrationBindingは旧候補・旧新準備・旧新meaning・旧新execution/adoption/clock・本人承認実証拠、順序付き31旧新request/response/result/trace/actualAnswerSourceの実bytes bindingを持つ。answerとjudgmentNote、request.input、本文・atom/caption/boundary/segment ID・順序・元時計を完全一致させる。新responseのrequestFileSha256は実新request bytesだけへ更新し、新Core token/traceを現行deterministic validatorで再構築する。旧actualAnswerSourceを新回答ファイルと偽装しない。

製造のauthorityは独立job/auth SHA、実装clean HEADと全実bytes、実Node、出力root、専有owner/permit、実device/UUID、元source readbackへ束縛する。移行proofは新trustや人間の品質採用を発行しない。

開始50GB、各disk reserve12GB、親子RSS16GiB、pressure1、1秒観測、next unit+reserve、ownPGID停止と残存確認を維持。ディスク間で容量を合算せず、切断後に自動再開しない。条件不成立なら大容量生成を始めない。

必要な型検査・移行不変量/偽装拒否試験・正式入力再構築・既存技術QCを実行し、未実施は合格としない。実glyphは正式依存成立後の最初の段階で確認する。修正2字幕と近隣だけを代表確認し、全650字幕の個別目視を要求しない。通常速再生・音声聴取・人間の品質採用は実施事実がなければ未評価として報告する。2時間以上の追加作業/製造見積りが現物で分かった時は根拠とともに親へ報告する。

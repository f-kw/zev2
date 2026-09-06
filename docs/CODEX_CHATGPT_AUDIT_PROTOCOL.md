# Codex–ChatGPT 監査プロトコル

制定日: 2026-09-06
制定者: kawafmm

## 1. 目的

Codexの自律開発を維持しながら、仕様・方針・完成条件からの逸脱をChatGPTが監査し、kawafmmを日常的な中継役から外す。

通常の実装・テスト・限定修正はCodexが自律的に進める。判断が必要になった時点で、現物をGitHubへ固定してChatGPTへ監査を依頼する。ChatGPTで判断可能な事項はChatGPTが返し、kawafmm本人の判断が必要な事項だけをエスカレーションする。

## 2. 役割

### ChatGPT（監査・判断・指示）

- 最初の指示書を作る。
- Codexから届いた質問、code、diff、test結果、commitを確認する。
- 現行仕様・方針・完成条件との整合を監査する。
- 自分で判断できる事項は承認・修正指示を返す。
- kawafmm専決事項だけを整理してkawafmmへ上げる。
- 第一完成時に最終監査を行う。

### Codex（実装・実行）

- 指示書に基づき、承認済み範囲の実装・テスト・修正を自律的に進める。
- 監査または判断が必要な箇所で止まり、監査用checkpointをcommitし、remoteへpushする。
- ChatGPTへ必要情報を送る。
- 回答を受けて続行する。
- 第一完成まで必要に応じて監査ループを繰り返す。

### kawafmm（最終判断・方向性の監督）

- 製品方針、契約変更、費用、素材の根幹値、目視評価、工事の着工・凍結、正式公開等の専決事項を判断する。
- ChatGPTで判断不能な事項だけを受け取る。
- 定期的な節目で成果を確認する。

## 3. 標準フロー

1. ChatGPTが指示書を作る。指示書には目的・scope・制約・禁止事項・完成条件・監査ポイント・質問形式を含める。
2. Codexが実装を開始し、承認済み範囲の実装・test・修正を自律的に進める。
3. 判断または監査が必要な箇所でCodexが停止する。
4. Codexはその時点までの変更を監査用checkpointとしてcommitし、git pushまで完了する。
5. CodexはChatGPTへ質問を送る。最低限、次を含める。
   - 何をしようとしているか
   - なぜ判断または監査が必要か
   - 推奨案と必要なら代案
   - 現在の実装状態
   - branch / commit SHA
   - 対象file / diff
   - test・検証結果
6. ChatGPTはGitHub上の現物、diff、test結果を確認し、仕様・方針・完成条件との整合を監査する。
7. ChatGPTで判断できる場合は、承認・修正指示を返す。
8. Codexは回答に従って開発を続行する。必要なら再度3〜7を繰り返す。
9. ChatGPTで判断できない場合は、kawafmm専決事項として質問を短く整理する。
10. Codexまたは相談役経路を通じてkawafmmへ提示する。
11. kawafmmが判断し、必要な指示を返す。
12. Codexはその指示に従って続行する。
13. 完成条件を満たしたらCodexは第一完成として成果物・文書・検証結果を整理し、監査用checkpointをcommit/pushして最終監査を依頼する。
14. ChatGPTが完成条件、品質、仕様適合を最終監査する。問題がなければ完了とし、問題があれば修正指示へ戻す。

## 4. 質問の種類

### GPT_DECISION

ChatGPTの判断で進行可能な事項。

既存仕様・既存契約・着工済みwork-orderの範囲で、設計解釈、限定修正、実装方針、既知の停止原因への対応などを扱う。

### HUMAN_DECISION

kawafmmの判断が必要な事項。

現行AGENTS.mdの第1層に属する事項、または既存の承認範囲を変更する事項を扱う。

### AUDIT_ONLY

判断は不要だが、ChatGPTによる現物監査を通してから進める事項。

完成条件の中間確認、契約適合性確認、重要なdiff確認、第一完成の最終監査などを扱う。

## 5. 監査用checkpointのcommit / push

本プロトコル制定により、**着工承認済みwork-orderの範囲内で、ChatGPT監査へ現物を渡すためのcheckpoint commitおよびそのpushは、個別の追加承認なしでCodexに許可する。**

ただし、この許可は次に限定する。

- 既にkawafmmが着工を承認した工事の範囲内であること。
- 監査対象の現状固定が目的であること。
- commit messageで監査checkpointであることを判別できること。
- 新しい仕様、契約、Goal、work-order、正式成果物の承認をcommit自体で成立させないこと。
- tag作成、stable昇格、release、公開、正式成果物の削除・上書きは含まないこと。
- API費用や新素材取得など、別途承認が必要な作用を含めないこと。

監査checkpointをpushした事実は「完成」「正式採用」「kawafmm承認」を意味しない。

## 6. ChatGPTがkawafmmへ上げる条件

ChatGPTは、次の場合だけkawafmmへ判断を求める。

- AGENTS.mdで第1層と定義された事項。
- 現行の目的・完成条件・契約そのものを変更する必要がある。
- 新規の費用、API、素材、外部公開、正式削除・上書きが必要である。
- 人間の目視・好み・製品方針でしか決められない。
- 根拠が不足し、現物確認を追加しても相談役だけでは決められない。

単にCodexが迷った、実装方法が複数ある、testが落ちた、既存契約の解釈が必要、といった理由だけでkawafmmへ上げない。

## 7. ChatGPT監査の返答形式

原則として次の順で返す。

1. `decision`: `continue` / `revise` / `human_decision` / `stop`
2. `finding`: 現物から確認した事実
3. `instruction`: Codexが次に行うこと
4. `scope`: 許可される範囲と禁止事項
5. `evidence`: branch / commit SHA / 対象file / test結果

kawafmmへの判断依頼が必要な場合は、COMMUNICATION.mdの規律に従い、冒頭で何を決めるかが分かる短い形へ整理する。

## 8. 既存契約との関係

- 本文はAGENTS.mdの三者運用体制を置き換えない。監査経路と監査checkpoint commit/pushの限定権限だけを追加する。
- 第1層 / 第2層 / 第3層の判断所有は維持する。
- 停止契約、試行錯誤枠、強制停止上限、費用上限、正式成果物・tag・公開の承認条件は維持する。
- DECISIONS.mdへ承認行を追加して承認を代替することは禁止したままとする。
- CURRENT_GOAL.md、GOAL_DEFINITION.md、着工承認済みwork-order等の正本を、会話履歴やモデル記憶で置き換えない。

## 9. 運用上の要点

1. 監査依頼の前に、Codexは必ず監査対象をcheckpoint commitしpushする。
2. まずChatGPTへ送り、ChatGPTで判断不能なものだけkawafmmへ上げる。
3. 通常の実装・修正はCodexが自律的に進める。
4. 第一完成では必ずChatGPTの最終監査を通す。
5. kawafmmは監督者として残し、日常的な中継役にはしない。

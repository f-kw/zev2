# Q3 local pipeline interface v001

This file describes the implementation handoff, not a product contract or quality policy.
All ranges are integer `[startFrame,endFrameExclusive)` in the selected completed video's clock.

## Input packet

`schemaVersion: digest-quality-input-v001`, `inputSha256` (canonical hash excluding itself),
`media: {id,path,sha256,fpsNum,fpsDen,frameCount,audioSampleRate,audioSampleCount}`,
`references: [{id,path,sha256,kind}]`, `clock` (explicit saved mapping and clock provenance),
`units`, `evidence`, `limitations` (nonempty string array).

Each unit: `{id,kind,range,text,display,sourceParts,evidenceIds}`.
Kinds: `caption`, `connection`, `no-caption`. Caption IDs remain existing IDs;
connections remain existing IDs; no-caption IDs are deterministic from their range.
Normal connections use the immediately adjacent two frames as their nonempty inspection range.
Caption plus no-caption ranges partition the full completed video. Connections may overlap them.
`display` contains only saved final display facts, not generation reasoning.
`sourceParts` explicitly splits final / baseline / original-source ranges; inserted parts have null origins.

Each evidence item: `{id,kind,range,unitIds,method,facts,limitations,referenceIds}`.
Kinds: `saved-caption`, `saved-display-plan`, `saved-source-mapping`,
`reused-audio-observation`, `completed-pcm-measurement`, `completed-pixel-measurement`.
`facts` is an object of the actual observations. `range` is the completed clock coverage of those facts.
Evidence spanning an insertion is split instead of claiming an observation during black/silence.
Source reference IDs must exist. The preparer verifies every referenced byte before creating the packet.
The judge receives only this packet and the saved prompt, without prior answers or generation rationale.
Historical sample endpoints use exact rational arithmetic; oversized integers are decimal strings.
This preserves the serialized ASR timestamp, not a claim of sample-accurate speech recognition.

## AI reply (strict JSON, integer ranges only)

Exactly these fields:
`schemaVersion: digest-quality-judgment-v001`, `inputSha256`, `mediaSha256`,
`status: complete|incomplete|failed`, `processedUnits`, `candidates`, `limitations`, `failureReason`.
`failureReason` is null for complete, nonempty string otherwise.

Each processed unit: `{unitId,state,evidenceIds,summary}`.
State: `reviewed-with-available-evidence` or `insufficient-evidence`.
Complete requires every input unit exactly once. Complete means the supplied evidence was considered,
not all frames or audio were semantically observed. No candidate is a valid complete result.

Each candidate: `{id,unitIds,range,evidenceIds,observedFacts,hypothesis,missingInformation,normalExplanations,humanQuestion,reflectionTargets}`.
Each observed fact: `{evidenceId,statement}`. The evidence ID must be included for that candidate.
`missingInformation`, `normalExplanations`, `reflectionTargets` are nonempty string arrays.
Other textual fields are nonempty strings. `unitIds`, `evidenceIds`, `observedFacts` are nonempty.
Candidate range must lie within the video, overlap each nominated unit and evidence range, and be
covered by the union of nominated units. Evidence claims retain their narrower actual ranges.
Facts remain attributed natural-language summaries, not machine-proven semantic assertions.

Validation rejects unknown or duplicate IDs, wrong identity/hash, unknown keys, malformed JSON,
unprocessed targets, missing references and unrelated evidence. No repair or completion of answers.
Only complete accepted replies can enter post-judgment comparison and standard review conversion.
The raw received bytes must be saved before JSON parsing. The accepted result keeps the raw hash.

## Post-judgment and review

Generation intent/allowed sets and existing HRC/answers are compared only after initial judgment.
Keep every internal candidate with `present|withheld|technical-followup` and the reason, known relation,
evidence bounds and unresolved observations. Do not create corrected media or automatically apply edits.
Presented entries supply a concise `reviewTitle` and explicit `scopeExclusions` so an answer about
one new hypothesis cannot silently reopen a previously adopted feature. Withheld entries use null
review IDs/titles/context and an empty exclusions array. The AI's question and candidate range remain unchanged.
Convert only `present` candidates to the unchanged `tools/point-review` format, with one candidate view.
No presented candidates means a zero-candidate result record and no invented review point.

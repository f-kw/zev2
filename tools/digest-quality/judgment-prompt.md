# Completed Digest quality possibilities — actual Codex judgment

Read the supplied `judgment-input.json` only as the evidence for this judgment. This is a real
reasoning pass over the saved captions, their order, current display facts, source clock correspondence,
old audio observations and newly decoded completed-video PCM measurements. You have not watched the
video or listened to the audio. Do not claim semantic visual/audio observations from these data.
Do not fetch or send video/audio/frame images, call external services, run inference APIs, render media,
read prior human review answers, or read generation reasoning. No new dependency is needed.

First consider the final captions, their surrounding captions, connections, ordinary displays,
caption-free intervals and actual measurements. Consider every input unit, not only styled captions.
Read the whole caption sequence and all units, and inspect relevant evidence. Unit coverage means
considering supplied evidence, not observing every frame semantically. Old audio observations belong
to their recorded earlier media and have been mapped once to this completed media; they are not a new
observation of this completed soundtrack. Evidence records retain narrower ranges and limitations.

Find plausible improvements only where a human answer could change subsequent handling. Zero
candidates is valid. Do not impose a count, scores, weights, periodic sampling, alternating effects,
or a presumption that repeated expression, large panels, black, no captions or silence is a defect.
Louder audio does not establish surprise, voice, emotion or the need for an effect. A short caption
does not by itself establish unreadability. A long caption-free interval does not by itself establish
missing speech or excessive duration. Look for attributable contextual reasons, then give normal
alternative explanations and state missing observation. Group the same concern instead of multiplying it.

You do not know the earlier human answers. The coordinating agent will compare your unmodified
initial answer with saved generation intent, allowed choices and known issues only afterwards.
Do not optimize for rediscovering a known issue. Propose no automatic edits. Questions must be neutral
and refer to one adoption or correction decision, using the existing completed clip as the candidate.

Return strict JSON, with exactly the following fields (no markdown fence):

```
{
  "schemaVersion": "digest-quality-judgment-v001",
  "inputSha256": "copy from input",
  "mediaSha256": "copy from input.media.sha256",
  "status": "complete",
  "processedUnits": [
    {"unitId":"existing ID", "state":"reviewed-with-available-evidence", "evidenceIds":["existing relevant ID"], "summary":"what you considered and what remains unobserved"}
  ],
  "candidates": [
    {"id":"Q3-C001", "unitIds":["existing ID"],
     "range":{"startFrame":0,"endFrameExclusive":1},
     "evidenceIds":["existing relevant ID"],
     "observedFacts":[{"evidenceId":"same existing relevant ID","statement":"only the recorded fact, with its actual scope"}],
     "hypothesis":"possible improvement, explicitly a hypothesis",
     "missingInformation":["needed observation"],
     "normalExplanations":["normal alternative explanation"],
     "humanQuestion":"one neutral, concrete question in Japanese",
     "reflectionTargets":["possible future handling, not an instruction to edit now"]}
  ],
  "limitations":["specific scope limitations"],
  "failureReason":null
}
```

Every input unit must appear exactly once for complete. `insufficient-evidence` is also a valid unit
state when the supplied evidence does not support the relevant judgment. Complete with `candidates: []`
means no supported question was found, never a quality pass. If you cannot process the supplied input,
use incomplete or failed with a nonempty failureReason instead of filling unprocessed units.
Ranges are integer completed-video frames, end exclusive, inside this media. The range must overlap
every nominated unit and evidence, and be covered by the nominated units. Refer to evidence only for
what it actually records. Do not invent IDs, measurements, caption wording, observed speech or outcomes.
Keep all prose in Japanese. Save the actual answer bytes once to the assigned new reply file.

/** A versioned extension to the existing single semantic judgment. The old
 * saved wire and validator stay unchanged; no extra model call is introduced. */
import {createHash} from 'node:crypto';
import {canonicalJson, canonicalSha256} from '../../tools/digest-quality/clock.mjs';
import {CAPTION_PALETTE_V001, resolveCaptionPaletteIdV001}
  from '../../tools/digest-quality/caption-palette-policy.mjs';
import {createOrchestrationJudgmentInputV001, fixOrchestrationJudgmentV001}
  from './presentation_orchestration_v001.mjs';
import {decodePresentationCaptionB1StrictJsonV001} from './presentation_caption_semantic_source_package_v001.mjs';

const clone = structuredClone, own = (value, key) => Object.hasOwn(value, key);
const require = (value, message) => {if (!value) throw new TypeError('PALETTE_JUDGMENT_INVALID: ' + message);};
const exact = (value, keys, name) => require(value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => own(value, key)), name + ' fields');
const freeze = value => {if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);} return value;};
const same = (a, b) => canonicalJson(a) === canonicalJson(b);
const seal = (body, key) => freeze({...clone(body), [key]: canonicalSha256(body)});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const policy = freeze({sameJudgmentOnly: true, colorChoicesOnly: true, explicitSinglePaletteId: true,
  paletteDoesNotSelectCaptionOrRange: true, noColorQuotas: true, noSequenceAssignment: true, noEmotionTaxonomy: true,
  weakColorReasonFallback: 'yellow', additionalModelCalls: 0, productionDefaultChanged: false});

export function createOrchestrationPaletteJudgmentInputV001(options) {
  const originalInput = createOrchestrationJudgmentInputV001(options);
  return seal({schemaVersion: 'presentation-orchestration-palette-input-v001',
    palette: CAPTION_PALETTE_V001, originalInput, policy}, 'inputSha256');
}
function validateInput(context, input) {
  exact(input, ['schemaVersion', 'palette', 'originalInput', 'policy', 'inputSha256'], 'palette judgment input');
  const prior = input.originalInput;
  const evidence = Object.fromEntries(['productionPurpose', 'captions', 'contexts', 'observations', 'audioEvidence', 'audioCandidates']
    .map(key => [key, prior?.[key]]));
  const expected = createOrchestrationPaletteJudgmentInputV001({context, evidence, connectionPolicy: prior?.connectionPolicy});
  require(same(expected, input), 'input/context/palette/source binding changed');
}
export function fixOrchestrationPaletteJudgmentV001({context, input, replyBytes}) {
  validateInput(context, input);
  require(typeof replyBytes === 'string' || Buffer.isBuffer(replyBytes) || replyBytes instanceof Uint8Array, 'reply original bytes required');
  const raw = Buffer.from(replyBytes), text = raw.toString('utf8');
  require(raw.equals(Buffer.from(text, 'utf8')), 'reply must be lossless UTF-8');
  const decoded = decodePresentationCaptionB1StrictJsonV001(raw);
  require(decoded.status === 'decoded', 'reply strict JSON: ' + (decoded.reason ?? 'invalid'));
  const reply = decoded.value;
  exact(reply, ['schemaVersion', 'inputSha256', 'completion', 'captions', 'connections'], 'palette reply');
  require(reply.schemaVersion === 'presentation-orchestration-palette-judgment-v001'
    && reply.inputSha256 === input.inputSha256 && reply.completion === 'complete', 'complete palette reply binding required');
  require(Array.isArray(reply.captions), 'caption decisions required');
  const delegated = clone(reply), colorChoices = [];
  for (const row of delegated.captions) {
    require(Array.isArray(row?.allowedPresets), 'allowed choices required');
    for (const choice of row.allowedPresets) {
      if (choice?.preset !== 'color') continue;
      require(own(choice, 'paletteId'), 'new Color judgment must explicitly select a finite palette ID');
      const paletteId = resolveCaptionPaletteIdV001({paletteId: choice.paletteId}); delete choice.paletteId;
      colorChoices.push({captionId: row.captionId, paletteId, reason: row.reason});
    }
  }
  delegated.schemaVersion = input.originalInput.schemaVersion.replace('-judgment-input-', '-judgment-');
  delegated.inputSha256 = input.originalInput.inputSha256;
  const delegatedReplyBytes = JSON.stringify(delegated) + '\n';
  // All existing range, duplicate, scope, grapheme, role, evidence, finite
  // expression and connection checks remain in the original implementation.
  const originalState = fixOrchestrationJudgmentV001({context, input: input.originalInput, replyBytes: delegatedReplyBytes});
  const colorIds = originalState.captionAuto.proposal.effects.filter(row => row.role === 'Focus').map(row => row.captionId);
  const choices = colorIds.map(captionId => {
    const rows = colorChoices.filter(row => row.captionId === captionId); require(rows.length === 1, 'selected Color palette correspondence differs');
    return rows[0];
  });
  return seal({schemaVersion: 'presentation-orchestration-palette-fixed-v001',
    paletteVersion: CAPTION_PALETTE_V001.version, input, replyBytes: text, replySha256: sha(raw),
    delegatedReplyBytes, delegatedReplySha256: sha(delegatedReplyBytes), originalState, colorChoices, choices,
    provenance: 'one extended semantic reply; explicit palette stripped for the unchanged original validator',
    additionalModelCalls: 0, humanQuality: 'not-evaluated', productionDefaultChanged: false}, 'fixedSha256');
}
export function restoreOrchestrationPaletteJudgmentV001({context, saved}) {
  const expected = fixOrchestrationPaletteJudgmentV001({context, input: saved?.input, replyBytes: saved?.replyBytes});
  require(same(saved, expected), 'saved palette judgment/delegate/choices/hash differs');
  return expected;
}

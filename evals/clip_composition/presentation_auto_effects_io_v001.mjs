import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import {basename, resolve} from 'node:path';
import {AUTO_PRESENTATION_RULES_REF_V007, sha256AutoPresentationV001,
  fixAutoPresentationProposalV001, resolveAutoPresentationV001} from './presentation_auto_effects_v001.mjs';
import {validatePresentationPulseEvidenceV001} from './presentation_pulse_evidence_v001.mjs';

const bytesHash = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const reject = message => { throw new TypeError(`Pulse evidence IO: ${message}`); };
const equal = (left, right) => sha256AutoPresentationV001(left) === sha256AutoPresentationV001(right);

async function readBound(ref) {
  const bytes = await readFile(ref.path);
  if (bytesHash(bytes) !== ref.fileSha256) reject('source bytes differ from measured timing');
  return bytes;
}
const nativeMatches = (native, bound, bytes) => native && native.path === bound.path
  && native.sha256 === bound.fileSha256 && native.bytes === bytes.length;

/** Reconstruct individual peaks from their native records. Candidate union maxima
 * are not timestamps for their constituent peaks. No saved table is trusted alone. */
async function loadPulseTimingEvidence(decision) {
  if (decision?.schemaVersion !== 'presentation-focus-decision-input-v005'
    || !Object.hasOwn(decision, 'pulseTimingEvidence')) reject('expected forward-only decision input v005');
  const evidence = decision.pulseTimingEvidence;
  validatePresentationPulseEvidenceV001(evidence);
  if (evidence === null) return null;
  const [sourceBytes, candidateBytes, peakBytes] = await Promise.all([
    readBound(evidence.sourceRef), readBound(evidence.candidatesRef), readBound(evidence.peaksRef),
  ]);
  const candidates = JSON.parse(candidateBytes.toString('utf8'));
  const peaks = JSON.parse(peakBytes.toString('utf8'));
  if (candidates?.schemaVersion !== 'presentation-vocal-audio-candidates-v001'
    || peaks?.schemaVersion !== 'presentation-vocal-audio-measurements-v001'
    || !Array.isArray(candidates.candidates) || candidates.candidateCount !== candidates.candidates.length
    || !Array.isArray(candidates.measurementEvidence) || !Array.isArray(peaks.rows)
    || ![candidates, peaks].every(value => value.sampleRate === evidence.sampleRate
      && value.sampleCount === evidence.sampleCount && nativeMatches(value.source, evidence.sourceRef, sourceBytes))) {
    reject('native source or measurement dimensions differ');
  }
  const peakRefs = candidates.measurementEvidence.filter(ref => basename(ref.path) === 'acoustic-peaks.json');
  if (peakRefs.length !== 1 || !nativeMatches(peakRefs[0], evidence.peaksRef, peakBytes)) {
    reject('native candidate does not bind this acoustic peak file');
  }
  const peakMap = new Map();
  for (const row of peaks.rows) {
    if (!row || typeof row.id !== 'string' || peakMap.has(row.id)) reject('duplicate native peak ID');
    peakMap.set(row.id, row);
  }
  const reconstructed = {...evidence, candidates: [], peaks: []};
  for (const candidate of candidates.candidates) {
    if (!Array.isArray(candidate.constituentPeakIds)) reject('native candidate has no constituent peaks');
    reconstructed.candidates.push({candidateId: candidate.id, peakIds: [...candidate.constituentPeakIds]});
    for (const id of candidate.constituentPeakIds) {
      const row = peakMap.get(id);
      if (!row || row.qualifies !== true) reject('candidate uses an unknown or unqualified native peak');
      reconstructed.peaks.push({peakId: row.id, startSample: row.startSample,
        endSampleExclusive: row.endSampleExclusive, peakSample: row.peakSample});
    }
  }
  validatePresentationPulseEvidenceV001(reconstructed);
  const qualified = peaks.rows.filter(row => row.qualifies === true);
  if (qualified.length !== reconstructed.peaks.length || !equal(evidence, reconstructed)) {
    reject('saved timing table differs from native constituent peaks');
  }
  return reconstructed;
}

/** Read actual bytes; a proposal cannot declare an old hash for new source content. */
export async function loadAutoPresentationContextV001({baselinePath, decisionInputPath}) {
  const [baselineBytes, decisionBytes] = await Promise.all([
    readFile(baselinePath), readFile(decisionInputPath),
  ]);
  const baselinePlan = JSON.parse(baselineBytes.toString('utf8'));
  const pulseTimingEvidence = await loadPulseTimingEvidence(JSON.parse(decisionBytes.toString('utf8')));
  const context = {
    baselineRef: {path: resolve(baselinePath), fileSha256: bytesHash(baselineBytes),
      canonicalSha256: sha256AutoPresentationV001(baselinePlan)},
    decisionInputRef: {path: resolve(decisionInputPath), fileSha256: bytesHash(decisionBytes)},
    renderingRulesRef: AUTO_PRESENTATION_RULES_REF_V007,
    pulseTimingEvidence,
  };
  resolveAutoPresentationV001({baselinePlan, context});
  return {baselinePlan, context};
}

/** Existing paths are never replaced. All validation precedes creation of an output. */
export async function saveFixedAutoPresentationV001({baselinePath, decisionInputPath, proposal, outputPath}) {
  const loaded = await loadAutoPresentationContextV001({baselinePath, decisionInputPath});
  const fixed = fixAutoPresentationProposalV001({...loaded, proposal});
  await writeFile(outputPath, `${JSON.stringify(fixed, null, 2)}\n`, {flag: 'wx'});
  return fixed;
}

/** This is the file-to-render boundary, not an unchecked JSON cast. */
export async function loadAutoPresentationV001({baselinePath, decisionInputPath, autoProposalPath, overridesPath}) {
  const {baselinePlan, context} = await loadAutoPresentationContextV001({baselinePath, decisionInputPath});
  const autoPresentation = {context,
    ...(autoProposalPath === undefined ? {} : {autoProposal: await readJson(autoProposalPath)}),
    ...(overridesPath === undefined ? {} : {overrides: await readJson(overridesPath)}),
  };
  // Recheck the proposal, overrides, and all bindings even if these files were
  // previously saved successfully. A file may have been edited since then.
  resolveAutoPresentationV001({baselinePlan, ...autoPresentation});
  return {baselinePlan, autoPresentation};
}

export async function saveAutoPresentationOverridesV001({baselinePath, decisionInputPath,
  autoProposalPath, overrides, outputPath}) {
  if (overrides === undefined) throw new TypeError('saving overrides requires a bound override document');
  const {baselinePlan, autoPresentation} = await loadAutoPresentationV001({baselinePath, decisionInputPath, autoProposalPath});
  resolveAutoPresentationV001({baselinePlan, ...autoPresentation, overrides});
  await writeFile(outputPath, `${JSON.stringify(overrides, null, 2)}\n`, {flag: 'wx'});
  return overrides;
}

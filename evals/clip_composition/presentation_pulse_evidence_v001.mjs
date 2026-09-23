/** Minimal measured timing, shared by saved-state validation and native-file IO. */
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys) => object(value) && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key));
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const integer = value => Number.isSafeInteger(value) && value >= 0;
const reject = message => { throw new TypeError(`Pulse evidence: ${message}`); };
const reference = value => exact(value, ['path', 'fileSha256']) && nonempty(value.path)
  && typeof value.fileSha256 === 'string' && /^[a-f0-9]{64}$/.test(value.fileSha256);

export function validatePresentationPulseEvidenceV001(evidence) {
  if (evidence === null) return;
  if (!exact(evidence, ['schemaVersion', 'sourceRef', 'candidatesRef', 'peaksRef', 'sampleRate', 'sampleCount', 'candidates', 'peaks'])
    || evidence.schemaVersion !== 'auto-presentation-pulse-timing-v001'
    || !['sourceRef', 'candidatesRef', 'peaksRef'].every(key => reference(evidence[key]))
    || !integer(evidence.sampleRate) || evidence.sampleRate === 0
    || !integer(evidence.sampleCount) || evidence.sampleCount === 0
    || !Array.isArray(evidence.candidates) || !Array.isArray(evidence.peaks)) reject('invalid timing evidence');
  const peakIds = new Set();
  for (const row of evidence.peaks) {
    if (!exact(row, ['peakId', 'startSample', 'endSampleExclusive', 'peakSample'])
      || !nonempty(row.peakId) || peakIds.has(row.peakId)
      || ![row.startSample, row.endSampleExclusive, row.peakSample].every(integer)
      || row.startSample > row.peakSample || row.peakSample >= row.endSampleExclusive
      || row.endSampleExclusive > evidence.sampleCount) reject('invalid or duplicate measured peak');
    peakIds.add(row.peakId);
  }
  const candidates = new Set(), assigned = [];
  for (const row of evidence.candidates) {
    if (!exact(row, ['candidateId', 'peakIds']) || !nonempty(row.candidateId) || candidates.has(row.candidateId)
      || !Array.isArray(row.peakIds) || row.peakIds.length === 0
      || row.peakIds.some(id => !peakIds.has(id))) reject('invalid candidate peak membership');
    candidates.add(row.candidateId);
    assigned.push(...row.peakIds);
  }
  if (assigned.length !== peakIds.size || new Set(assigned).size !== assigned.length
    || assigned.some((id, index) => evidence.peaks[index].peakId !== id)) reject('peak coverage or native order differs');
}

/** Paths are provenance; hashes and the complete timing table own identity. */
export function presentationPulseEvidenceIdentityV001(evidence) {
  if (evidence === null) return null;
  return {...evidence, ...Object.fromEntries(['sourceRef', 'candidatesRef', 'peaksRef']
    .map(key => [key, {fileSha256: evidence[key].fileSha256}]))};
}

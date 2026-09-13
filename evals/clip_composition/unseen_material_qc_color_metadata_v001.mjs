import assert from 'node:assert/strict';
import {buildCachedCounterfactualArgumentsV001} from './unseen_material_qc_lossless_cache_v001.mjs';

// Instruction 024 execution evidence only. Values come from observed media;
// this module supplies neither a default color profile nor a color conversion.
export const STREAM_INTERPRETATION_FIELDS_V001 = Object.freeze([
  'width', 'height', 'pix_fmt', 'sample_aspect_ratio', 'display_aspect_ratio',
  'color_range', 'color_space', 'color_transfer', 'color_primaries',
  'chroma_location', 'field_order', 'r_frame_rate', 'avg_frame_rate', 'time_base',
]);
const setparamsFields = Object.freeze({color_range: 'range', color_space: 'colorspace',
  color_transfer: 'color_trc', color_primaries: 'color_primaries', chroma_location: 'chroma_location', field_order: 'field_mode'});
const interpretationFields = STREAM_INTERPRETATION_FIELDS_V001.filter(k => !['time_base', 'r_frame_rate'].includes(k));
const present = value => value !== undefined && value !== 'unknown' && value !== 'unspecified';

export function deriveObservedStreamRestorationV001({base, main, cache}) {
  for (const key of interpretationFields) assert.equal(base[key], main[key], `QC_SOURCE_INTERPRETATION_DIFFERS:${key}`);
  const differences = [];
  for (const key of interpretationFields) {
    if (cache[key] === main[key]) continue;
    // Unknown source information is not filled in from a cache or a guess.
    assert(present(main[key]), `QC_SOURCE_INTERPRETATION_UNOBSERVED:${key}`);
    assert(Object.hasOwn(setparamsFields, key), `QC_METADATA_RESTORATION_UNSUPPORTED:${key}`);
    assert(/^[a-z0-9-]+$/u.test(main[key]), `QC_METADATA_VALUE_INVALID:${key}`);
    // ffprobe and setparams spell the same observed progressive flag differently.
    if (key === 'field_order') assert.equal(main[key], 'progressive', 'QC_FIELD_ORDER_RESTORATION_UNSUPPORTED');
    differences.push({field: key, sourceObservedValue: main[key], cacheObservedValue: cache[key] ?? null,
      filterOption: setparamsFields[key], filterValue: key === 'field_order' ? 'prog' : main[key]});
  }
  return {sourceInterpretation: Object.fromEntries(STREAM_INTERPRETATION_FIELDS_V001.map(k => [k, main[k] ?? null])),
    observedBase: base, observedMain: main, observedCache: cache, differences,
    filter: differences.length === 0 ? null : 'setparams=' + differences.map(d => `${d.filterOption}=${d.filterValue}`).join(':')};
}

export function restoreObservedStreamMetadataArgumentsV001(args, evidence) {
  const expected = deriveObservedStreamRestorationV001({base: evidence.observedBase, main: evidence.observedMain, cache: evidence.observedCache});
  assert.deepEqual(evidence, expected, 'QC_METADATA_EVIDENCE_CHANGED');
  const next = [...args], graph = next.indexOf('-filter_complex');
  assert(graph > 0 && next[graph + 1].endsWith('fps=30,format=yuv420p[video]'));
  if (evidence.filter !== null) next[graph + 1] = next[graph + 1].slice(0, -'[video]'.length) + ',' + evidence.filter + '[video]';
  return next;
}

export function buildColorRestoredCachedCounterfactualArgumentsV001(request, metadataEvidence) {
  return restoreObservedStreamMetadataArgumentsV001(buildCachedCounterfactualArgumentsV001(request), metadataEvidence);
}

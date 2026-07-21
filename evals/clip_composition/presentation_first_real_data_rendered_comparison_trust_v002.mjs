import {createHash} from 'node:crypto';

export const PRESENTATION_RENDERED_COMPARISON_BUILD_SUMMARY_SCHEMA_V002 =
  'presentation-rendered-comparison-build-summary-v002';
export const PRESENTATION_RENDERED_COMPARISON_PAGE_SCHEMA_V002 =
  'presentation-first-real-data-rendered-comparison-page-v002';
export const PRESENTATION_RENDERED_COMPARISON_RESULT_SCHEMA_V002 =
  'presentation-first-real-data-rendered-comparison-human-result-v002';
export const PRESENTATION_RENDERED_COMPARISON_MANIFEST_SCHEMA_V001 =
  'presentation-first-real-data-rendered-comparison-manifest-v001';
export const PRESENTATION_RENDERED_COMPARISON_PROVENANCE_SCHEMA_V001 =
  'presentation-first-real-data-rendered-comparison-provenance-v001';

export const PRESENTATION_RENDERED_COMPARISON_VARIANT_IDS_V002 = Object.freeze([
  'keep-both',
  'cut-both',
  'cut-gap1',
  'cut-gap2',
]);
export const PRESENTATION_RENDERED_COMPARISON_GAP_IDS_V002 = Object.freeze([
  'gap-01',
  'gap-02',
]);

export const PRESENTATION_RENDERED_COMPARISON_V001_ROOT =
  'evals/clip_composition/outputs/presentation/20260722-first-real-data-rendered-comparison-v001';
export const PRESENTATION_RENDERED_COMPARISON_V002_ROOT =
  'evals/clip_composition/outputs/presentation/20260722-first-real-data-rendered-comparison-v002';
export const PRESENTATION_RENDERED_COMPARISON_V002_REVIEW_PAGE_PATH =
  `${PRESENTATION_RENDERED_COMPARISON_V002_ROOT}/review-page.json`;
export const PRESENTATION_RENDERED_COMPARISON_V002_REVIEW_HTML_PATH =
  `${PRESENTATION_RENDERED_COMPARISON_V002_ROOT}/review.html`;
export const PRESENTATION_RENDERED_COMPARISON_V002_SUMMARY_PATH =
  `${PRESENTATION_RENDERED_COMPARISON_V002_ROOT}/comparison-preview-build-summary.json`;

const reference = (path, fileSha256) => Object.freeze({path, fileSha256});

export const PRESENTATION_RENDERED_COMPARISON_FIXED_MANIFEST_V001 = reference(
  `${PRESENTATION_RENDERED_COMPARISON_V001_ROOT}/comparison-preview-manifest.json`,
  'b243183e72a299cc4abc08a56f777300a9cc566aa2c85587a60d2979af1df550',
);
export const PRESENTATION_RENDERED_COMPARISON_FIXED_PROVENANCE_V001 = reference(
  `${PRESENTATION_RENDERED_COMPARISON_V001_ROOT}/comparison-preview-provenance.json`,
  '46bae75601c72d0a9880c099e930209ccb794a333ba17a9d77b6c744b86ba597',
);

export const PRESENTATION_RENDERED_COMPARISON_FIXED_SOURCE_V001 = reference(
  'evals/clip_composition/research/downloads/first-gate-unseen/DmWu0jVQfTE/native-1080p/DmWu0jVQfTE.native-1080p-h264-opus.mp4',
  'a2c4548d07eb387f095a198b8f6892121134c46e8c0d5315e4debf3e083234ee',
);
export const PRESENTATION_RENDERED_COMPARISON_FIXED_REFERENCES_V001 = Object.freeze({
  mediaEquivalence: reference(
    'evals/clip_composition/outputs/presentation/20260721-first-real-data-assembly-gate-v001/media-equivalence.json',
    '98c0f2018553f39a855610c569f2908efecccc0dadb696fc2b156d19010c15ea',
  ),
  sourceIdentity: reference(
    'evals/clip_composition/outputs/presentation/20260721-first-real-data-assembly-gate-v001/source-identity.json',
    'a7c9e9a8c3917662bcf3b66fad46cedc56f5ca558467226453339ea370108993',
  ),
  candidateManifest: reference(
    'evals/clip_composition/outputs/presentation/20260721-first-real-data-assembly-gate-v001/candidate-manifest.json',
    '3937747e947ef0dd27a67e289d06cece8c17a55b655c85fa7d6aaf21f696ec12',
  ),
});

export const PRESENTATION_RENDERED_COMPARISON_FIXED_MEDIA_V001 = Object.freeze([
  Object.freeze({
    variantId: 'keep-both',
    path: `${PRESENTATION_RENDERED_COMPARISON_V001_ROOT}/media/keep-both.mp4`,
    fileSha256: 'efd0d4ceb79e7b5db7e2548ada6c3ffa791df2648c50640cd1fc7e9eaa79d08e',
  }),
  Object.freeze({
    variantId: 'cut-both',
    path: `${PRESENTATION_RENDERED_COMPARISON_V001_ROOT}/media/cut-both.mp4`,
    fileSha256: 'ef73d4d98cbc81f50a89d2020d859eb7f63643918e716ad9c0e6a4ef195d4edc',
  }),
  Object.freeze({
    variantId: 'cut-gap1',
    path: `${PRESENTATION_RENDERED_COMPARISON_V001_ROOT}/media/cut-gap1.mp4`,
    fileSha256: '61ca2d44e2c743aaa8ca2db225fe19580da4d8cfd02067ec8ab998578bf17f21',
  }),
  Object.freeze({
    variantId: 'cut-gap2',
    path: `${PRESENTATION_RENDERED_COMPARISON_V001_ROOT}/media/cut-gap2.mp4`,
    fileSha256: 'c2aed204784cb111c0b0f9752ccd886b40eac123b85d152b770ebd656ce8de69',
  }),
]);
const FIXED_CUT_GAP_IDS = Object.freeze([
  Object.freeze([]),
  Object.freeze(['gap-01', 'gap-02']),
  Object.freeze(['gap-01']),
  Object.freeze(['gap-02']),
]);

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactFields = (value, expected) => isObject(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
};
const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const sameValue = (left, right) => canonicalJson(left) === canonicalJson(right);
const isSha256 = (value) => typeof value === 'string' && SHA256_PATTERN.test(value);
const isReference = (value) => exactFields(value, ['path', 'fileSha256'])
  && typeof value.path === 'string'
  && value.path.length > 0
  && !value.path.startsWith('/')
  && !value.path.split('/').includes('..')
  && isSha256(value.fileSha256);
const sameReference = (left, right) => isReference(left)
  && left.path === right.path
  && left.fileSha256 === right.fileSha256;

export const presentationRenderedComparisonCanonicalSha256V002 = (value) => createHash('sha256')
  .update(canonicalJson(value))
  .digest('hex');

const validCandidate = (candidate) => exactFields(
  candidate,
  ['candidateId', 'title', 'startMs', 'endMs'],
)
  && candidate.candidateId === 13
  && typeof candidate.title === 'string'
  && candidate.title.length > 0
  && Number.isInteger(candidate.startMs)
  && Number.isInteger(candidate.endMs)
  && candidate.startMs < candidate.endMs;

const validGap = (gap, index, candidate) => exactFields(gap, ['gapId', 'startMs', 'endMs'])
  && gap.gapId === PRESENTATION_RENDERED_COMPARISON_GAP_IDS_V002[index]
  && Number.isInteger(gap.startMs)
  && Number.isInteger(gap.endMs)
  && candidate.startMs < gap.startMs
  && gap.startMs < gap.endMs
  && gap.endMs < candidate.endMs;

const expectedMediaUrl = (variantId) => `/preview/${variantId}.mp4`;

export const validatePresentationRenderedComparisonManifestV001ForV002 = (manifest) => {
  if (!exactFields(
    manifest,
    ['schemaVersion', 'manifestId', 'human_review_only', 'formalOutput', 'candidate', 'gaps', 'mediaVariants'],
  )) throw new TypeError('fixed comparison manifest fields are invalid');
  if (
    manifest.schemaVersion !== PRESENTATION_RENDERED_COMPARISON_MANIFEST_SCHEMA_V001
    || manifest.manifestId !== 'DmWu0jVQfTE-candidate-13-rendered-comparison-v001'
    || manifest.human_review_only !== true
    || manifest.formalOutput !== false
    || !validCandidate(manifest.candidate)
    || !Array.isArray(manifest.gaps)
    || manifest.gaps.length !== PRESENTATION_RENDERED_COMPARISON_GAP_IDS_V002.length
    || !manifest.gaps.every((gap, index) => validGap(gap, index, manifest.candidate))
    || !Array.isArray(manifest.mediaVariants)
    || manifest.mediaVariants.length !== PRESENTATION_RENDERED_COMPARISON_VARIANT_IDS_V002.length
  ) throw new TypeError('fixed comparison manifest value is invalid');
  manifest.mediaVariants.forEach((entry, index) => {
    const fixed = PRESENTATION_RENDERED_COMPARISON_FIXED_MEDIA_V001[index];
    if (
      !exactFields(entry, ['variantId', 'url', 'fileSha256'])
      || entry.variantId !== fixed.variantId
      || entry.url !== expectedMediaUrl(fixed.variantId)
      || entry.fileSha256 !== fixed.fileSha256
    ) throw new TypeError(`fixed comparison manifest media mismatch: ${fixed.variantId}`);
  });
  return manifest;
};

const validAudioSamples = (value) => exactFields(
  value,
  ['sourceStart', 'sourceEnd', 'outputStart', 'outputEnd'],
)
  && Object.values(value).every(Number.isInteger)
  && value.sourceStart < value.sourceEnd
  && value.outputStart < value.outputEnd;

const validMapping = (mapping) => exactFields(
  mapping,
  [
    'segmentId', 'sourceStartMs', 'sourceEndMs', 'sourceStartFrame30',
    'sourceEndFrame30', 'outputStartFrame', 'outputEndFrame', 'audioSamples',
  ],
)
  && typeof mapping.segmentId === 'string'
  && mapping.segmentId.length > 0
  && [
    mapping.sourceStartMs,
    mapping.sourceEndMs,
    mapping.sourceStartFrame30,
    mapping.sourceEndFrame30,
    mapping.outputStartFrame,
    mapping.outputEndFrame,
  ].every(Number.isInteger)
  && mapping.sourceStartMs < mapping.sourceEndMs
  && mapping.sourceStartFrame30 < mapping.sourceEndFrame30
  && mapping.outputStartFrame < mapping.outputEndFrame
  && validAudioSamples(mapping.audioSamples);

const validateFixedReferenceGroup = (actual) => {
  if (!exactFields(actual, ['mediaEquivalence', 'sourceIdentity', 'candidateManifest'])) {
    throw new TypeError('fixed provenance reference fields are invalid');
  }
  Object.entries(PRESENTATION_RENDERED_COMPARISON_FIXED_REFERENCES_V001).forEach(
    ([key, expected]) => {
      if (!sameReference(actual[key], expected)) {
        throw new TypeError(`fixed provenance reference mismatch: ${key}`);
      }
    },
  );
};

export const validatePresentationRenderedComparisonProvenanceV001ForV002 = (
  provenance,
  manifest,
) => {
  validatePresentationRenderedComparisonManifestV001ForV002(manifest);
  if (!exactFields(provenance, [
    'schemaVersion', 'comparisonId', 'purpose', 'humanReviewOnly',
    'formalAssemblyDecision', 'builderVersion', 'source', 'fixedReferences',
    'candidate', 'gaps', 'sourceClock', 'audioClock', 'seekWindow', 'encoding',
    'variants', 'exclusions',
  ])) throw new TypeError('fixed comparison provenance fields are invalid');
  if (
    provenance.schemaVersion !== PRESENTATION_RENDERED_COMPARISON_PROVENANCE_SCHEMA_V001
    || provenance.comparisonId !== 'DmWu0jVQfTE-candidate-13-rendered-comparison-provenance-v001'
    || provenance.purpose !== 'human-review-comparison-only'
    || provenance.humanReviewOnly !== true
    || provenance.formalAssemblyDecision !== false
    || provenance.builderVersion !== 'presentation-first-real-data-rendered-comparison-builder-v001'
    || !sameReference(provenance.source, PRESENTATION_RENDERED_COMPARISON_FIXED_SOURCE_V001)
    || !sameValue(provenance.candidate, manifest.candidate)
    || !sameValue(provenance.gaps, manifest.gaps)
    || !exactFields(provenance.sourceClock, ['fps', 'decodedFrameCount', 'logicalFrameCount'])
    || provenance.sourceClock.fps !== 60
    || !exactFields(provenance.audioClock, [
      'sampleRate', 'channels', 'channelLayout', 'sourceGridMappingEndSample',
    ])
    || provenance.audioClock.sampleRate !== 48000
    || provenance.audioClock.channels !== 2
    || provenance.audioClock.channelLayout !== 'stereo'
    || !Array.isArray(provenance.variants)
    || provenance.variants.length !== PRESENTATION_RENDERED_COMPARISON_VARIANT_IDS_V002.length
  ) throw new TypeError('fixed comparison provenance value is invalid');
  validateFixedReferenceGroup(provenance.fixedReferences);
  provenance.variants.forEach((variant, index) => {
    const fixedMedia = PRESENTATION_RENDERED_COMPARISON_FIXED_MEDIA_V001[index];
    const manifestMedia = manifest.mediaVariants[index];
    if (
      !isObject(variant)
      || variant.variantId !== fixedMedia.variantId
      || !Array.isArray(variant.cutGapIds)
      || !sameValue(variant.cutGapIds, FIXED_CUT_GAP_IDS[index])
      || !Array.isArray(variant.mappings)
      || variant.mappings.length === 0
      || !variant.mappings.every(validMapping)
      || !isObject(variant.media)
      || variant.media.path !== `media/${variant.variantId}.mp4`
      || variant.media.fileSha256 !== fixedMedia.fileSha256
      || variant.media.fileSha256 !== manifestMedia.fileSha256
      || !Number.isInteger(variant.media.byteCount)
      || variant.media.byteCount <= 0
      || !Number.isInteger(variant.expectedFrameCount)
      || variant.expectedFrameCount <= 0
      || !Number.isInteger(variant.expectedAudioSampleCount)
      || variant.expectedAudioSampleCount !== variant.expectedFrameCount * 1600
      || !isObject(variant.inspection)
    ) throw new TypeError(`fixed comparison provenance variant mismatch: ${fixedMedia.variantId}`);
    variant.mappings.forEach((mapping, mappingIndex) => {
      if (
        mapping.segmentId !== `segment-${String(mappingIndex + 1).padStart(4, '0')}`
        || mapping.outputEndFrame - mapping.outputStartFrame
          !== mapping.sourceEndFrame30 - mapping.sourceStartFrame30
        || mapping.audioSamples.outputEnd - mapping.audioSamples.outputStart
          !== mapping.audioSamples.sourceEnd - mapping.audioSamples.sourceStart
        || (mappingIndex === 0
          ? mapping.outputStartFrame !== 0 || mapping.audioSamples.outputStart !== 0
          : mapping.outputStartFrame !== variant.mappings[mappingIndex - 1].outputEndFrame
            || mapping.audioSamples.outputStart
              !== variant.mappings[mappingIndex - 1].audioSamples.outputEnd)
      ) throw new TypeError(`fixed provenance mapping chain mismatch: ${variant.variantId}`);
    });
    if (
      variant.mappings.at(-1).outputEndFrame !== variant.expectedFrameCount
      || variant.mappings.at(-1).audioSamples.outputEnd !== variant.expectedAudioSampleCount
    ) throw new TypeError(`fixed provenance output total mismatch: ${variant.variantId}`);
  });
  return provenance;
};

const findSourceBoundaryFrame = (provenance, gap) => {
  const candidates = provenance.variants.flatMap((variant) => variant.mappings)
    .filter((mapping) => mapping.sourceEndMs === gap.startMs)
    .map((mapping) => mapping.sourceEndFrame30);
  if (candidates.length === 0 || new Set(candidates).size !== 1) {
    throw new TypeError(`source frame for ${gap.gapId} is not uniquely represented`);
  }
  return candidates[0];
};

const findInspectionEventFrame = (variant, gap, sourceBoundaryFrame) => {
  const cutsGap = variant.cutGapIds.includes(gap.gapId);
  if (cutsGap) {
    const left = variant.mappings.find((mapping) => mapping.sourceEndMs === gap.startMs);
    const right = variant.mappings.find((mapping) => mapping.sourceStartMs === gap.endMs);
    if (!left || !right || left.outputEndFrame !== right.outputStartFrame) {
      throw new TypeError(`cut join for ${variant.variantId}/${gap.gapId} is not represented`);
    }
    return {eventKind: 'cut-join', eventFrame30: left.outputEndFrame};
  }
  const containing = variant.mappings.find((mapping) => (
    mapping.sourceStartMs < gap.startMs && mapping.sourceEndMs > gap.endMs
  ));
  if (!containing) {
    throw new TypeError(`retained gap for ${variant.variantId}/${gap.gapId} is not represented`);
  }
  const eventFrame30 = containing.outputStartFrame
    + sourceBoundaryFrame
    - containing.sourceStartFrame30;
  if (eventFrame30 < containing.outputStartFrame || eventFrame30 >= containing.outputEndFrame) {
    throw new TypeError(`retained gap frame for ${variant.variantId}/${gap.gapId} is outside mapping`);
  }
  return {eventKind: 'kept-gap-start', eventFrame30};
};

export const derivePresentationRenderedComparisonInspectionPlaybackV002 = (provenance) => {
  const seekLeadFrames = 60;
  const points = provenance.variants.flatMap((variant) => provenance.gaps.map((gap) => {
    const sourceBoundaryFrame = findSourceBoundaryFrame(provenance, gap);
    const event = findInspectionEventFrame(variant, gap, sourceBoundaryFrame);
    if (event.eventFrame30 < seekLeadFrames) {
      throw new TypeError(`two-second lead is unavailable: ${variant.variantId}/${gap.gapId}`);
    }
    return {
      variantId: variant.variantId,
      gapId: gap.gapId,
      focusFrame: event.eventFrame30,
      playbackStartFrame: event.eventFrame30 - seekLeadFrames,
      eventKind: event.eventKind,
    };
  }));
  return {
    frameRate: 30,
    leadFrames: seekLeadFrames,
    leadSeconds: 2,
    points,
  };
};

export const validatePresentationRenderedComparisonInspectionPlaybackV002 = (
  actual,
  provenance,
) => {
  const expected = derivePresentationRenderedComparisonInspectionPlaybackV002(provenance);
  if (!sameValue(actual, expected)) {
    throw new TypeError('inspectionPlayback does not match the fixed provenance');
  }
  return actual;
};

export const validatePresentationRenderedComparisonPageV002 = (
  page,
  manifest,
  provenance,
) => {
  if (!exactFields(page, [
    'schemaVersion', 'pageId', 'pageRevision', 'comparisonManifest',
    'comparisonProvenance', 'candidate', 'mediaVariants', 'inspectionPlayback',
  ])) throw new TypeError('rendered-comparison v002 page fields are invalid');
  if (
    page.schemaVersion !== PRESENTATION_RENDERED_COMPARISON_PAGE_SCHEMA_V002
    || page.pageId !== 'DmWu0jVQfTE-candidate-13-rendered-comparison-review-v002'
    || page.pageRevision !== 2
    || !sameReference(page.comparisonManifest, PRESENTATION_RENDERED_COMPARISON_FIXED_MANIFEST_V001)
    || !sameReference(page.comparisonProvenance, PRESENTATION_RENDERED_COMPARISON_FIXED_PROVENANCE_V001)
    || !sameValue(page.candidate, manifest.candidate)
    || !sameValue(page.mediaVariants, manifest.mediaVariants)
  ) throw new TypeError('rendered-comparison v002 page value is invalid');
  validatePresentationRenderedComparisonInspectionPlaybackV002(page.inspectionPlayback, provenance);
  return page;
};

export const validatePresentationRenderedComparisonBuildSummaryV002 = (summary) => {
  if (!exactFields(summary, ['schemaVersion', 'status', 'artifactBindings'])) {
    throw new TypeError('rendered-comparison v002 build summary fields are invalid');
  }
  if (
    summary.schemaVersion !== PRESENTATION_RENDERED_COMPARISON_BUILD_SUMMARY_SCHEMA_V002
    || summary.status !== 'passed'
    || !exactFields(summary.artifactBindings, [
      'reviewPage', 'reviewHtml', 'comparisonManifest', 'comparisonProvenance',
      'mediaVariants',
    ])
    || !sameReference(summary.artifactBindings.comparisonManifest, PRESENTATION_RENDERED_COMPARISON_FIXED_MANIFEST_V001)
    || !sameReference(summary.artifactBindings.comparisonProvenance, PRESENTATION_RENDERED_COMPARISON_FIXED_PROVENANCE_V001)
    || !isReference(summary.artifactBindings.reviewPage)
    || summary.artifactBindings.reviewPage.path
      !== PRESENTATION_RENDERED_COMPARISON_V002_REVIEW_PAGE_PATH
    || !isReference(summary.artifactBindings.reviewHtml)
    || summary.artifactBindings.reviewHtml.path
      !== PRESENTATION_RENDERED_COMPARISON_V002_REVIEW_HTML_PATH
    || !Array.isArray(summary.artifactBindings.mediaVariants)
    || !sameValue(
      summary.artifactBindings.mediaVariants,
      PRESENTATION_RENDERED_COMPARISON_FIXED_MEDIA_V001,
    )
  ) throw new TypeError('rendered-comparison v002 build summary value is invalid');
  return summary;
};

export const assertPresentationRenderedComparisonReferenceChainV002 = ({
  summary,
  page,
  manifest,
  provenance,
}) => {
  validatePresentationRenderedComparisonBuildSummaryV002(summary);
  validatePresentationRenderedComparisonManifestV001ForV002(manifest);
  validatePresentationRenderedComparisonProvenanceV001ForV002(provenance, manifest);
  validatePresentationRenderedComparisonPageV002(page, manifest, provenance);
  if (
    !sameReference(page.comparisonManifest, summary.artifactBindings.comparisonManifest)
    || !sameReference(page.comparisonProvenance, summary.artifactBindings.comparisonProvenance)
  ) throw new TypeError('rendered-comparison v002 page reference chain mismatch');
  page.mediaVariants.forEach((pageMedia, index) => {
    const summaryMedia = summary.artifactBindings.mediaVariants[index];
    const manifestMedia = manifest.mediaVariants[index];
    const provenanceMedia = provenance.variants[index].media;
    if (
      pageMedia.variantId !== summaryMedia.variantId
      || pageMedia.variantId !== manifestMedia.variantId
      || pageMedia.variantId !== provenance.variants[index].variantId
      || pageMedia.fileSha256 !== summaryMedia.fileSha256
      || pageMedia.fileSha256 !== manifestMedia.fileSha256
      || pageMedia.fileSha256 !== provenanceMedia.fileSha256
    ) throw new TypeError(`rendered-comparison v002 media chain mismatch: ${pageMedia.variantId}`);
  });
  return {status: 'passed'};
};

export const derivePresentationRenderedComparisonResolutionV002 = ({
  primaryChoice,
  secondaryChoice,
}) => {
  if (primaryChoice === 'cut_both') {
    return {status: 'resolved', gapDecisions: {gap01: 'cut', gap02: 'cut'}, variantId: 'cut-both'};
  }
  if (primaryChoice === 'keep_both') {
    return {status: 'resolved', gapDecisions: {gap01: 'keep', gap02: 'keep'}, variantId: 'keep-both'};
  }
  if (primaryChoice !== 'one_or_different') return null;
  if (secondaryChoice === 'cut_gap1') {
    return {status: 'resolved', gapDecisions: {gap01: 'cut', gap02: 'keep'}, variantId: 'cut-gap1'};
  }
  if (secondaryChoice === 'cut_gap2') {
    return {status: 'resolved', gapDecisions: {gap01: 'keep', gap02: 'cut'}, variantId: 'cut-gap2'};
  }
  if (secondaryChoice === 'needs_other_editing') {
    return {status: 'needs_other_editing', gapDecisions: null, variantId: null};
  }
  return null;
};

export const validatePresentationRenderedComparisonHumanResultV002 = ({
  result,
  page,
  manifest,
  provenance,
}) => {
  validatePresentationRenderedComparisonPageV002(page, manifest, provenance);
  if (!exactFields(result, [
    'schemaVersion', 'reviewId', 'candidate', 'primaryChoice', 'secondaryChoice',
    'resolution', 'finalAssessment', 'comparisonManifest', 'comparisonProvenance',
    'selectedVariant', 'mediaBindings', 'timeMeasurement', 'formalAssemblyDecision',
  ])) throw new TypeError('rendered-comparison v002 result fields are invalid');
  if (
    result.schemaVersion !== PRESENTATION_RENDERED_COMPARISON_RESULT_SCHEMA_V002
    || result.reviewId !== page.pageId
    || !sameValue(result.candidate, page.candidate)
    || !sameReference(result.comparisonManifest, page.comparisonManifest)
    || !sameReference(result.comparisonProvenance, page.comparisonProvenance)
    || result.timeMeasurement !== 'not_measured'
    || result.formalAssemblyDecision !== false
    || !Array.isArray(result.mediaBindings)
    || result.mediaBindings.length !== page.mediaVariants.length
  ) throw new TypeError('rendered-comparison v002 result value is invalid');
  const recomputed = derivePresentationRenderedComparisonResolutionV002(result);
  if (!recomputed || !sameValue(result.resolution, recomputed)) {
    throw new TypeError('rendered-comparison v002 result resolution mismatch');
  }
  const expectedSecondary = result.primaryChoice === 'one_or_different'
    ? result.secondaryChoice
    : null;
  if (result.secondaryChoice !== expectedSecondary) {
    throw new TypeError('rendered-comparison v002 result secondary choice mismatch');
  }
  const allowedFinal = recomputed.status === 'needs_other_editing'
    ? ['needs_more_editing']
    : ['comparison_sufficient', 'needs_more_editing'];
  if (!allowedFinal.includes(result.finalAssessment)) {
    throw new TypeError('rendered-comparison v002 result final assessment mismatch');
  }
  result.mediaBindings.forEach((binding, index) => {
    const expected = page.mediaVariants[index];
    if (
      !exactFields(binding, ['variantId', 'fileSha256'])
      || binding.variantId !== expected.variantId
      || binding.fileSha256 !== expected.fileSha256
    ) throw new TypeError(`rendered-comparison v002 media binding mismatch: ${expected.variantId}`);
  });
  const expectedSelected = recomputed.variantId
    ? page.mediaVariants.find(({variantId}) => variantId === recomputed.variantId)
    : null;
  if (!sameValue(result.selectedVariant, expectedSelected)) {
    throw new TypeError('rendered-comparison v002 selected variant mismatch');
  }
  const mayCreateFormalAssemblyDecision = recomputed.status === 'resolved'
    && result.finalAssessment === 'comparison_sufficient';
  return {
    status: 'received',
    resultCanonicalSha256: presentationRenderedComparisonCanonicalSha256V002(result),
    recomputedResolution: recomputed,
    mayCreateFormalAssemblyDecision,
    formalizationBlockReason: mayCreateFormalAssemblyDecision
      ? null
      : recomputed.status === 'needs_other_editing'
        ? 'comparison-unresolved'
        : 'additional-editing-required',
  };
};

export const assertPresentationRenderedComparisonResultMayBeFormalizedV002 = (receipt) => {
  if (
    !exactFields(receipt, [
      'status', 'resultCanonicalSha256', 'recomputedResolution',
      'mayCreateFormalAssemblyDecision', 'formalizationBlockReason',
    ])
    || receipt.status !== 'received'
    || receipt.mayCreateFormalAssemblyDecision !== true
    || receipt.formalizationBlockReason !== null
    || receipt.recomputedResolution?.status !== 'resolved'
  ) throw new TypeError('comparison result cannot be promoted to a formal assembly decision');
  return receipt;
};

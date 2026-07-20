export const PRESENTATION_BASE_MEDIA_TIMELINE_SCHEMA_VERSION = 'presentation-base-media-timeline-v001';
export const PRESENTATION_BASE_MEDIA_TIMELINE_CHECKER_VERSION = 'presentation-base-media-timeline-checker-v001';

export const PRESENTATION_BASE_MEDIA_TIMELINE_VIOLATION_CODES = Object.freeze([
  'RENDER_SOURCE_COUNT_UNSUPPORTED',
  'BASE_MEDIA_TIMELINE_INVALID',
  'BASE_MEDIA_HASH_MISMATCH',
  'BASE_MEDIA_FRAME_COUNT_MISMATCH',
  'TIMELINE_SOURCE_REF_MISMATCH',
  'TIMELINE_SEGMENT_SOURCE_OVERLAP',
  'TIMELINE_SEGMENT_OUTPUT_NONCONTIGUOUS',
  'TIMELINE_SPEED_CHANGE_UNSUPPORTED',
  'INSTRUCTION_SOURCE_INTERVAL_UNMAPPED',
  'INSTRUCTION_SOURCE_INTERVAL_AMBIGUOUS',
  'INSTRUCTION_SOURCE_INTERVAL_MULTIPLE_SEGMENTS_UNSUPPORTED',
]);

const CODE_ORDER = new Map(PRESENTATION_BASE_MEDIA_TIMELINE_VIOLATION_CODES.map((code, index) => [code, index]));
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;
const isInteger = (value) => Number.isInteger(value) && Number.isFinite(value);

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
};

const issue = (code, path, relatedIds = [], details = undefined) => {
  const result = {
    code,
    path,
    relatedIds: [...new Set(relatedIds.filter(isNonEmptyString))].sort(),
  };
  if (details !== undefined) result.details = canonicalize(details);
  return result;
};

const sortIssues = (issues) => issues.sort((left, right) => {
  const codeDifference = (CODE_ORDER.get(left.code) ?? Number.MAX_SAFE_INTEGER)
    - (CODE_ORDER.get(right.code) ?? Number.MAX_SAFE_INTEGER);
  if (codeDifference !== 0) return codeDifference;
  return [left.path, left.relatedIds.join(','), JSON.stringify(left.details ?? null)]
    .join('\u0000')
    .localeCompare(
      [right.path, right.relatedIds.join(','), JSON.stringify(right.details ?? null)].join('\u0000'),
      'en',
    );
});

const exactFields = (value, expected) => (
  isObject(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort())
);

export const frameBoundaryV001 = (milliseconds) => Math.round(milliseconds * 30 / 1000);

/**
 * 元時間軸と、前工程が既に組み立てた基礎映像の時間軸を検査する。
 * `observedBaseMedia` はFFprobe等で得た事実だけを渡す。省略時もmanifest自体の
 * frame数整合は検査するが、実ファイルの照合を済ませたとは扱わない。
 */
export function validatePresentationBaseMediaTimelineV001(
  timelineInput,
  generationManifestInput,
  observedBaseMedia = {},
) {
  const violations = [];
  const add = (code, path, relatedIds = [], details) => violations.push(issue(code, path, relatedIds, details));

  const timeline = isObject(timelineInput) ? timelineInput : {};
  if (!exactFields(
    timelineInput,
    ['schemaVersion', 'timelineId', 'sourceProvenance', 'baseMedia', 'sourceRef', 'segments'],
  )) {
    add('BASE_MEDIA_TIMELINE_INVALID', '$');
  }
  if (timeline.schemaVersion !== PRESENTATION_BASE_MEDIA_TIMELINE_SCHEMA_VERSION) {
    add('BASE_MEDIA_TIMELINE_INVALID', '$.schemaVersion');
  }
  if (!isNonEmptyString(timeline.timelineId)) add('BASE_MEDIA_TIMELINE_INVALID', '$.timelineId');
  if (!isNonEmptyString(timeline.sourceProvenance)) {
    add('BASE_MEDIA_TIMELINE_INVALID', '$.sourceProvenance');
  }
  if (!isNonEmptyString(timeline.sourceRef)) add('BASE_MEDIA_TIMELINE_INVALID', '$.sourceRef');

  const baseMedia = isObject(timeline.baseMedia) ? timeline.baseMedia : {};
  if (!exactFields(baseMedia, ['artifactId', 'path', 'fileSha256', 'expectedFrameCount'])) {
    add('BASE_MEDIA_TIMELINE_INVALID', '$.baseMedia');
  }
  if (!isNonEmptyString(baseMedia.artifactId)) add('BASE_MEDIA_TIMELINE_INVALID', '$.baseMedia.artifactId');
  if (!isNonEmptyString(baseMedia.path)) add('BASE_MEDIA_TIMELINE_INVALID', '$.baseMedia.path');
  if (typeof baseMedia.fileSha256 !== 'string' || !SHA256_PATTERN.test(baseMedia.fileSha256)) {
    add('BASE_MEDIA_TIMELINE_INVALID', '$.baseMedia.fileSha256');
  }
  if (!isInteger(baseMedia.expectedFrameCount) || baseMedia.expectedFrameCount <= 0) {
    add('BASE_MEDIA_TIMELINE_INVALID', '$.baseMedia.expectedFrameCount');
  }

  const manifest = isObject(generationManifestInput) ? generationManifestInput : {};
  const sourceArtifacts = Array.isArray(manifest.sourceArtifacts) ? manifest.sourceArtifacts : [];
  if (sourceArtifacts.length !== 1) {
    add('RENDER_SOURCE_COUNT_UNSUPPORTED', '$generationManifest.sourceArtifacts', [], {
      actualCount: sourceArtifacts.length,
      supportedCount: 1,
    });
  }
  const soleSource = sourceArtifacts.length === 1 && isObject(sourceArtifacts[0]) ? sourceArtifacts[0] : null;
  if (
    soleSource
    && isNonEmptyString(timeline.sourceRef)
    && soleSource.sourceRef !== timeline.sourceRef
  ) {
    add('TIMELINE_SOURCE_REF_MISMATCH', '$.sourceRef', [timeline.sourceRef, soleSource.sourceRef]);
  }
  if (
    isNonEmptyString(manifest.sourceProvenance)
    && isNonEmptyString(timeline.sourceProvenance)
    && manifest.sourceProvenance !== timeline.sourceProvenance
  ) {
    add('TIMELINE_SOURCE_REF_MISMATCH', '$.sourceProvenance', [], {
      timeline: timeline.sourceProvenance,
      generationManifest: manifest.sourceProvenance,
    });
  }

  const segments = Array.isArray(timeline.segments) ? timeline.segments : [];
  if (!Array.isArray(timeline.segments) || segments.length === 0) {
    add('BASE_MEDIA_TIMELINE_INVALID', '$.segments');
  }
  const segmentIds = new Set();
  let previous = null;
  segments.forEach((segmentValue, index) => {
    const path = `$.segments[${index}]`;
    const segment = isObject(segmentValue) ? segmentValue : {};
    if (!exactFields(
      segmentValue,
      ['segmentId', 'sourceStartMs', 'sourceEndMs', 'outputStartMs', 'outputEndMs'],
    )) {
      add('BASE_MEDIA_TIMELINE_INVALID', path);
    }
    if (!isNonEmptyString(segment.segmentId) || segmentIds.has(segment.segmentId)) {
      add('BASE_MEDIA_TIMELINE_INVALID', `${path}.segmentId`, [segment.segmentId]);
    } else {
      segmentIds.add(segment.segmentId);
    }
    const times = ['sourceStartMs', 'sourceEndMs', 'outputStartMs', 'outputEndMs'];
    if (!times.every((field) => isInteger(segment[field]))) {
      add('BASE_MEDIA_TIMELINE_INVALID', path, [segment.segmentId]);
      previous = segment;
      return;
    }
    if (segment.sourceStartMs >= segment.sourceEndMs || segment.outputStartMs >= segment.outputEndMs) {
      add('BASE_MEDIA_TIMELINE_INVALID', path, [segment.segmentId]);
    }
    if (
      segment.sourceEndMs - segment.sourceStartMs
      !== segment.outputEndMs - segment.outputStartMs
    ) {
      add('TIMELINE_SPEED_CHANGE_UNSUPPORTED', path, [segment.segmentId]);
    }
    if (index === 0 && segment.outputStartMs !== 0) {
      add('TIMELINE_SEGMENT_OUTPUT_NONCONTIGUOUS', `${path}.outputStartMs`, [segment.segmentId]);
    }
    if (previous && times.every((field) => isInteger(previous[field]))) {
      if (segment.outputStartMs !== previous.outputEndMs) {
        add(
          'TIMELINE_SEGMENT_OUTPUT_NONCONTIGUOUS',
          `${path}.outputStartMs`,
          [previous.segmentId, segment.segmentId],
        );
      }
      if (segment.sourceStartMs < previous.sourceEndMs) {
        add(
          'TIMELINE_SEGMENT_SOURCE_OVERLAP',
          `${path}.sourceStartMs`,
          [previous.segmentId, segment.segmentId],
        );
      }
    }
    previous = segment;
  });

  const finalOutputEndMs = segments.length > 0 && isInteger(segments.at(-1)?.outputEndMs)
    ? segments.at(-1).outputEndMs
    : null;
  if (
    finalOutputEndMs !== null
    && isInteger(baseMedia.expectedFrameCount)
    && baseMedia.expectedFrameCount !== frameBoundaryV001(finalOutputEndMs)
  ) {
    add('BASE_MEDIA_FRAME_COUNT_MISMATCH', '$.baseMedia.expectedFrameCount', [], {
      expectedFromTimeline: frameBoundaryV001(finalOutputEndMs),
      manifestValue: baseMedia.expectedFrameCount,
    });
  }
  if (
    typeof observedBaseMedia.fileSha256 === 'string'
    && observedBaseMedia.fileSha256 !== baseMedia.fileSha256
  ) {
    add('BASE_MEDIA_HASH_MISMATCH', '$observedBaseMedia.fileSha256');
  }
  if (
    observedBaseMedia.frameCount !== undefined
    && observedBaseMedia.frameCount !== baseMedia.expectedFrameCount
  ) {
    add('BASE_MEDIA_FRAME_COUNT_MISMATCH', '$observedBaseMedia.frameCount', [], {
      observed: observedBaseMedia.frameCount,
      expected: baseMedia.expectedFrameCount,
    });
  }

  sortIssues(violations);
  return {
    schemaVersion: 'presentation-base-media-timeline-report-v001',
    checkerVersion: PRESENTATION_BASE_MEDIA_TIMELINE_CHECKER_VERSION,
    status: violations.length === 0 ? 'passed' : 'failed',
    violations,
    timeline: violations.length === 0 ? structuredClone(timeline) : null,
  };
}

/** source側半開区間を、分割せず1 segmentだけでoutput側へ写す。 */
export function mapPresentationSourceIntervalV001(timelineInput, sourceStartMs, sourceEndMs) {
  const violations = [];
  const intervalValid = isInteger(sourceStartMs) && isInteger(sourceEndMs) && sourceStartMs < sourceEndMs;
  if (!intervalValid) {
    violations.push(issue('INSTRUCTION_SOURCE_INTERVAL_UNMAPPED', '$sourceInterval', [], {
      sourceStartMs,
      sourceEndMs,
    }));
  }
  const segments = Array.isArray(timelineInput?.segments) ? timelineInput.segments : [];
  const containing = intervalValid
    ? segments.filter((segment) => (
      isInteger(segment?.sourceStartMs)
      && isInteger(segment?.sourceEndMs)
      && segment.sourceStartMs <= sourceStartMs
      && sourceEndMs <= segment.sourceEndMs
    ))
    : [];

  if (intervalValid && containing.length > 1) {
    violations.push(issue(
      'INSTRUCTION_SOURCE_INTERVAL_AMBIGUOUS',
      '$sourceInterval',
      containing.map((segment) => segment.segmentId),
    ));
  } else if (intervalValid && containing.length === 0) {
    const overlapping = segments.filter((segment) => (
      isInteger(segment?.sourceStartMs)
      && isInteger(segment?.sourceEndMs)
      && Math.max(sourceStartMs, segment.sourceStartMs) < Math.min(sourceEndMs, segment.sourceEndMs)
    ));
    violations.push(issue(
      overlapping.length > 1
        ? 'INSTRUCTION_SOURCE_INTERVAL_MULTIPLE_SEGMENTS_UNSUPPORTED'
        : 'INSTRUCTION_SOURCE_INTERVAL_UNMAPPED',
      '$sourceInterval',
      overlapping.map((segment) => segment.segmentId),
    ));
  }
  sortIssues(violations);
  if (violations.length > 0) return { status: 'failed', violations, mapping: null };

  const segment = containing[0];
  const outputStartMs = segment.outputStartMs + (sourceStartMs - segment.sourceStartMs);
  const outputEndMs = segment.outputStartMs + (sourceEndMs - segment.sourceStartMs);
  return {
    status: 'passed',
    violations: [],
    mapping: {
      timelineSegmentId: segment.segmentId,
      sourceStartMs,
      sourceEndMs,
      outputStartMs,
      outputEndMs,
    },
  };
}

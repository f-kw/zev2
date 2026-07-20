import { createHash } from 'node:crypto';

export const PRESENTATION_CAPTION_SCHEMA_VERSION = 'presentation-caption-check-v001';
export const PRESENTATION_CAPTION_CHECKER_VERSION = 'presentation-caption-checker-v001';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;
const isFiniteInteger = (value) => Number.isInteger(value) && Number.isFinite(value);

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
};

export const canonicalJson = (value) => JSON.stringify(canonicalize(value));

const makeIssue = (grammar, code, path, message, relatedIds = [], details = undefined) => {
  const issue = {
    grammar,
    code,
    path,
    message,
    relatedIds: [...new Set(relatedIds.filter(isNonEmptyString))].sort(),
  };
  if (details !== undefined) issue.details = canonicalize(details);
  return issue;
};

const issueSortKey = (issue) => [
  issue.grammar,
  issue.code,
  issue.path,
  issue.relatedIds.join(','),
  canonicalJson(issue.details ?? null),
].join('\u0000');

const sortIssues = (issues) => issues.sort((left, right) => issueSortKey(left).localeCompare(issueSortKey(right), 'en'));

const checkStatus = (violations, hasDeclaredLimit = false) => {
  if (violations.length > 0) return 'failed';
  return hasDeclaredLimit ? 'passed_with_declared_limit' : 'passed';
};

const getSpeakerSet = (target, atomById) => {
  const speakers = new Set();
  for (const atomId of target?.requiredAtomIds ?? []) {
    const atom = atomById.get(atomId);
    if (!atom || !isNonEmptyString(atom.speaker)) return null;
    speakers.add(atom.speaker);
  }
  return speakers;
};

export function validatePresentationCaptionContract(input) {
  const contractViolations = [];
  const contractObservations = [];
  const violations = { G1: [], G2: [], G3: [] };

  const addContractViolation = (code, path, message, relatedIds = [], details) => {
    contractViolations.push(makeIssue('CONTRACT', code, path, message, relatedIds, details));
  };
  const addObservation = (code, path, message, relatedIds = [], details) => {
    contractObservations.push(makeIssue('SOURCE', code, path, message, relatedIds, details));
  };
  const addViolation = (grammar, code, path, message, relatedIds = [], details) => {
    violations[grammar].push(makeIssue(grammar, code, path, message, relatedIds, details));
  };

  if (!isObject(input)) {
    addContractViolation('CONTRACT_INPUT_NOT_OBJECT', '$', '入力全体はJSON objectである必要があります。');
  }
  const root = isObject(input) ? input : {};
  if (root.schemaVersion !== PRESENTATION_CAPTION_SCHEMA_VERSION) {
    addContractViolation(
      'CONTRACT_SCHEMA_VERSION_UNSUPPORTED',
      '$.schemaVersion',
      `schemaVersionは${PRESENTATION_CAPTION_SCHEMA_VERSION}だけを受け付けます。`,
    );
  }
  if (root.format !== 'normal-landscape') {
    addContractViolation('CONTRACT_FORMAT_UNSUPPORTED', '$.format', 'formatはnormal-landscapeである必要があります。');
  }

  const source = isObject(root.source) ? root.source : {};
  if (!isObject(root.source)) {
    addContractViolation('SOURCE_NOT_OBJECT', '$.source', 'sourceはobjectである必要があります。');
  }
  const supportedGranularities = new Set(['character-timestamp', 'word-timestamp']);
  if (!supportedGranularities.has(source.atomGranularity)) {
    addContractViolation(
      'SOURCE_ATOM_GRANULARITY_UNSUPPORTED',
      '$.source.atomGranularity',
      'atomGranularityはcharacter-timestampまたはword-timestampである必要があります。',
    );
  }
  if (!isNonEmptyString(source.atomProvenance)) {
    addContractViolation('SOURCE_ATOM_PROVENANCE_MISSING', '$.source.atomProvenance', '時刻要素の出所と版が必要です。');
  }

  const atoms = Array.isArray(source.atoms) ? source.atoms : [];
  if (!Array.isArray(source.atoms)) {
    addContractViolation('SOURCE_ATOMS_NOT_ARRAY', '$.source.atoms', 'atomsは配列である必要があります。');
  }
  const atomById = new Map();
  const atomIndexById = new Map();
  let previousValidStartMs = null;
  let previousValidAtomId = null;
  const activeAtoms = [];

  atoms.forEach((atomValue, index) => {
    const path = `$.source.atoms[${index}]`;
    if (!isObject(atomValue)) {
      addContractViolation('SOURCE_ATOM_NOT_OBJECT', path, 'atomはobjectである必要があります。');
      return;
    }
    const atom = atomValue;
    const atomId = atom.atomId;
    if (!isNonEmptyString(atomId)) {
      addContractViolation('SOURCE_ATOM_ID_INVALID', `${path}.atomId`, 'atomIdは空でない文字列である必要があります。');
    } else if (atomById.has(atomId)) {
      addContractViolation('SOURCE_DUPLICATE_ATOM_ID', `${path}.atomId`, 'atomIdが入力内で重複しています。', [atomId]);
    } else {
      atomById.set(atomId, atom);
      atomIndexById.set(atomId, index);
    }
    if (!isFiniteInteger(atom.speechId)) {
      addContractViolation('SOURCE_ATOM_SPEECH_ID_INVALID', `${path}.speechId`, 'speechIdは有限の整数である必要があります。', [atomId]);
    }
    if (!isNonEmptyString(atom.text)) {
      addContractViolation('SOURCE_ATOM_TEXT_EMPTY', `${path}.text`, 'atomのtextは空にできません。', [atomId]);
    }
    const validTime = isFiniteInteger(atom.startMs) && isFiniteInteger(atom.endMs) && atom.startMs < atom.endMs;
    if (!validTime) {
      addContractViolation(
        'SOURCE_ATOM_TIME_RANGE_INVALID',
        path,
        'atomのstartMsとendMsは有限の整数で、startMs < endMsである必要があります。',
        [atomId],
      );
      return;
    }
    if (previousValidStartMs !== null && atom.startMs < previousValidStartMs) {
      addContractViolation(
        'SOURCE_ATOM_TIME_ORDER_REVERSED',
        `${path}.startMs`,
        'source配列上でatomの開始時刻が前のatomより過去へ戻っています。',
        [previousValidAtomId, atomId],
        { previousStartMs: previousValidStartMs, currentStartMs: atom.startMs },
      );
    }
    if (previousValidStartMs === null || atom.startMs >= previousValidStartMs) {
      for (let activeIndex = activeAtoms.length - 1; activeIndex >= 0; activeIndex -= 1) {
        if (activeAtoms[activeIndex].endMs <= atom.startMs) activeAtoms.splice(activeIndex, 1);
      }
      for (const prior of activeAtoms) {
        const overlapMs = Math.min(prior.endMs, atom.endMs) - Math.max(prior.startMs, atom.startMs);
        if (overlapMs > 0) {
          addObservation(
            'SOURCE_ATOM_TIME_OVERLAP_RECORDED',
            path,
            'source atom同士の正の時刻重なりを記録しました。入力拒否や同時表示許可には使いません。',
            [prior.atomId, atomId],
            { overlapMs },
          );
        }
      }
      activeAtoms.push({ atomId, startMs: atom.startMs, endMs: atom.endMs });
    }
    previousValidStartMs = atom.startMs;
    previousValidAtomId = atomId;
  });

  const targetValues = Array.isArray(source.captionTargets) ? source.captionTargets : [];
  if (!Array.isArray(source.captionTargets)) {
    addContractViolation('SOURCE_TARGETS_NOT_ARRAY', '$.source.captionTargets', 'captionTargetsは配列である必要があります。');
  }
  const targetById = new Map();
  const effectiveAtomIdsByTarget = new Map();
  const atomTargetOwner = new Map();

  targetValues.forEach((targetValue, index) => {
    const path = `$.source.captionTargets[${index}]`;
    if (!isObject(targetValue)) {
      addContractViolation('SOURCE_TARGET_NOT_OBJECT', path, 'captionTargetはobjectである必要があります。');
      return;
    }
    const target = targetValue;
    const targetId = target.targetId;
    if (!isNonEmptyString(targetId)) {
      addContractViolation('SOURCE_TARGET_ID_INVALID', `${path}.targetId`, 'targetIdは空でない文字列である必要があります。');
    } else if (targetById.has(targetId)) {
      addContractViolation('SOURCE_DUPLICATE_TARGET_ID', `${path}.targetId`, 'targetIdが重複しています。', [targetId]);
    } else {
      targetById.set(targetId, target);
    }
    const required = Array.isArray(target.requiredAtomIds) ? target.requiredAtomIds : [];
    const omissions = Array.isArray(target.allowedOmissionAtomIds) ? target.allowedOmissionAtomIds : [];
    if (!Array.isArray(target.requiredAtomIds) || required.length === 0) {
      addContractViolation('SOURCE_TARGET_REQUIRED_ATOMS_INVALID', `${path}.requiredAtomIds`, 'requiredAtomIdsは空でない配列である必要があります。', [targetId]);
    }
    if (!Array.isArray(target.allowedOmissionAtomIds)) {
      addContractViolation('SOURCE_TARGET_OMISSIONS_NOT_ARRAY', `${path}.allowedOmissionAtomIds`, 'allowedOmissionAtomIdsは配列である必要があります。', [targetId]);
    }
    const requiredSet = new Set();
    required.forEach((atomId, atomOffset) => {
      if (!isNonEmptyString(atomId) || !atomById.has(atomId)) {
        addContractViolation('SOURCE_TARGET_UNKNOWN_ATOM', `${path}.requiredAtomIds[${atomOffset}]`, 'targetがsourceに無いatomを参照しています。', [targetId, atomId]);
        return;
      }
      if (requiredSet.has(atomId)) {
        addContractViolation('SOURCE_TARGET_DUPLICATE_ATOM', `${path}.requiredAtomIds[${atomOffset}]`, '同じtarget内でatomが重複しています。', [targetId, atomId]);
        return;
      }
      requiredSet.add(atomId);
      const previousOwner = atomTargetOwner.get(atomId);
      if (previousOwner && previousOwner !== targetId) {
        addContractViolation(
          'SOURCE_ATOM_IN_MULTIPLE_TARGETS',
          `${path}.requiredAtomIds[${atomOffset}]`,
          '同じsource atomを複数targetへ登録できません。',
          [previousOwner, targetId, atomId],
        );
      } else if (isNonEmptyString(targetId)) {
        atomTargetOwner.set(atomId, targetId);
      }
    });
    const omissionSet = new Set();
    omissions.forEach((atomId, omissionOffset) => {
      if (!isNonEmptyString(atomId) || !requiredSet.has(atomId)) {
        addContractViolation(
          'SOURCE_OMISSION_OUTSIDE_REQUIRED',
          `${path}.allowedOmissionAtomIds[${omissionOffset}]`,
          'allowedOmissionAtomIdsはrequiredAtomIdsの部分集合である必要があります。',
          [targetId, atomId],
        );
        return;
      }
      if (omissionSet.has(atomId)) {
        addContractViolation('SOURCE_DUPLICATE_OMISSION_ATOM', `${path}.allowedOmissionAtomIds[${omissionOffset}]`, '削除許可atomが重複しています。', [targetId, atomId]);
      }
      omissionSet.add(atomId);
    });
    if (isNonEmptyString(targetId)) {
      effectiveAtomIdsByTarget.set(targetId, required.filter((atomId) => requiredSet.has(atomId) && !omissionSet.has(atomId)));
    }
  });

  const groupValues = Array.isArray(source.allowedSimultaneousGroups) ? source.allowedSimultaneousGroups : [];
  if (!Array.isArray(source.allowedSimultaneousGroups)) {
    addContractViolation('SOURCE_SIMULTANEOUS_GROUPS_NOT_ARRAY', '$.source.allowedSimultaneousGroups', 'allowedSimultaneousGroupsは配列である必要があります。');
  }
  const validGroupById = new Map();
  const seenGroupIds = new Set();
  groupValues.forEach((groupValue, index) => {
    const path = `$.source.allowedSimultaneousGroups[${index}]`;
    if (!isObject(groupValue)) {
      addContractViolation('SOURCE_SIMULTANEOUS_GROUP_NOT_OBJECT', path, '同時表示groupはobjectである必要があります。');
      return;
    }
    const groupId = groupValue.simultaneousGroupId;
    let valid = true;
    if (!isNonEmptyString(groupId) || seenGroupIds.has(groupId)) {
      addContractViolation('SOURCE_SIMULTANEOUS_GROUP_ID_INVALID', `${path}.simultaneousGroupId`, '同時表示group IDは空でない一意な文字列である必要があります。', [groupId]);
      valid = false;
    } else {
      seenGroupIds.add(groupId);
    }
    const targetIds = Array.isArray(groupValue.targetIds) ? groupValue.targetIds : [];
    if (targetIds.length < 2 || new Set(targetIds).size !== targetIds.length) {
      addContractViolation('SOURCE_SIMULTANEOUS_GROUP_TARGETS_INVALID', `${path}.targetIds`, '同時表示groupは重複のない2件以上のtargetを必要とします。', [groupId, ...targetIds]);
      valid = false;
    }
    const speakers = [];
    for (const targetId of targetIds) {
      const target = targetById.get(targetId);
      if (!target) {
        addContractViolation('SOURCE_SIMULTANEOUS_GROUP_UNKNOWN_TARGET', `${path}.targetIds`, '同時表示groupが未知のtargetを参照しています。', [groupId, targetId]);
        valid = false;
        continue;
      }
      const speakerSet = getSpeakerSet(target, atomById);
      if (!speakerSet || speakerSet.size !== 1) {
        addContractViolation('SOURCE_SIMULTANEOUS_GROUP_SPEAKER_UNKNOWN', `${path}.targetIds`, 'group内の各targetは単一の既知話者へ対応する必要があります。', [groupId, targetId]);
        valid = false;
        continue;
      }
      speakers.push([...speakerSet][0]);
    }
    if (speakers.length !== new Set(speakers).size) {
      addContractViolation('SOURCE_SIMULTANEOUS_GROUP_SPEAKERS_NOT_DISTINCT', `${path}.targetIds`, '同時表示groupのtargetは互いに異なる話者である必要があります。', [groupId, ...targetIds]);
      valid = false;
    }
    if (valid) validGroupById.set(groupId, new Set(targetIds));
  });

  const captionPlan = isObject(root.captionPlan) ? root.captionPlan : {};
  if (!isObject(root.captionPlan)) {
    addContractViolation('CAPTION_PLAN_NOT_OBJECT', '$.captionPlan', 'captionPlanはobjectである必要があります。');
  }
  const cues = Array.isArray(captionPlan.cues) ? captionPlan.cues : [];
  if (!Array.isArray(captionPlan.cues)) {
    addContractViolation('CAPTION_CUES_NOT_ARRAY', '$.captionPlan.cues', 'cuesは配列である必要があります。');
  }
  const seenCueIds = new Set();
  const cueRecords = [];
  const cueCountByTarget = new Map();
  const referencedByTarget = new Map();
  const atomCueOwner = new Map();

  cues.forEach((cueValue, cueIndex) => {
    const path = `$.captionPlan.cues[${cueIndex}]`;
    if (!isObject(cueValue)) {
      addContractViolation('CAPTION_CUE_NOT_OBJECT', path, 'cueはobjectである必要があります。');
      return;
    }
    const cue = cueValue;
    const cueId = cue.cueId;
    if (!isNonEmptyString(cueId) || seenCueIds.has(cueId)) {
      addContractViolation('CAPTION_CUE_ID_INVALID', `${path}.cueId`, 'cueIdは空でない一意な文字列である必要があります。', [cueId]);
    } else {
      seenCueIds.add(cueId);
    }
    const target = targetById.get(cue.targetId);
    if (!target) {
      addContractViolation('CAPTION_CUE_UNKNOWN_TARGET', `${path}.targetId`, 'cueが未知のtargetを参照しています。', [cueId, cue.targetId]);
    } else {
      cueCountByTarget.set(cue.targetId, (cueCountByTarget.get(cue.targetId) ?? 0) + 1);
    }
    const lines = Array.isArray(cue.lines) ? cue.lines : [];
    if (!Array.isArray(cue.lines) || lines.length === 0) {
      addViolation('G2', 'G2_EMPTY_CUE', `${path}.lines`, 'cueには1件以上のlineが必要です。', [cueId]);
    }
    const flattenedAtomIds = [];
    lines.forEach((lineValue, lineIndex) => {
      const linePath = `${path}.lines[${lineIndex}]`;
      if (!isObject(lineValue)) {
        addViolation('G2', 'G2_EMPTY_LINE', linePath, 'lineはatomを持つobjectである必要があります。', [cueId]);
        return;
      }
      const lineAtomIds = Array.isArray(lineValue.atomIds) ? lineValue.atomIds : [];
      if (!Array.isArray(lineValue.atomIds) || lineAtomIds.length === 0) {
        addViolation('G2', 'G2_EMPTY_LINE', `${linePath}.atomIds`, 'lineには1件以上のatomが必要です。', [cueId]);
      }
      if (typeof lineValue.renderedText !== 'string' || lineValue.renderedText.includes('\n') || lineValue.renderedText.includes('\r')) {
        addViolation('G2', 'G2_BOUNDARY_REPRESENTATION_INVALID', `${linePath}.renderedText`, '改行はlinesで表し、renderedTextへ改行文字を埋め込めません。', [cueId]);
      }
      const knownTexts = [];
      let allKnown = true;
      lineAtomIds.forEach((atomId, atomOffset) => {
        flattenedAtomIds.push(atomId);
        const atom = atomById.get(atomId);
        if (!atom) {
          addViolation('G1', 'G1_UNKNOWN_ATOM_REFERENCE', `${linePath}.atomIds[${atomOffset}]`, 'cueがsourceに無いatomを参照しています。', [cueId, atomId]);
          allKnown = false;
          return;
        }
        knownTexts.push(atom.text);
        const effectiveSet = new Set(effectiveAtomIdsByTarget.get(cue.targetId) ?? []);
        if (!target || !effectiveSet.has(atomId)) {
          addViolation('G1', 'G1_ATOM_OUTSIDE_TARGET', `${linePath}.atomIds[${atomOffset}]`, 'cueが自分の有効なtarget範囲外のatomを参照しています。', [cueId, cue.targetId, atomId]);
        }
      });
      if (allKnown && typeof lineValue.renderedText === 'string' && lineValue.renderedText !== knownTexts.join('')) {
        addViolation('G1', 'G1_TEXT_NOT_SOURCE_DERIVED', `${linePath}.renderedText`, 'renderedTextが参照atomの厳密な連結と一致しません。', [cueId]);
      }
    });

    let previousAtomIndex = null;
    for (const atomId of flattenedAtomIds) {
      const atomIndex = atomIndexById.get(atomId);
      if (atomIndex === undefined) continue;
      if (previousAtomIndex !== null && atomIndex < previousAtomIndex) {
        addViolation('G1', 'G1_SOURCE_ORDER_REVERSED', path, 'cue内のatom参照がsource順を逆転しています。', [cueId]);
        addViolation('G2', 'G2_ATOM_ORDER_REVERSED', path, 'cue内のatom参照がsource順を逆転しています。', [cueId]);
        break;
      }
      previousAtomIndex = atomIndex;
    }
    for (const atomId of flattenedAtomIds) {
      const previousCue = atomCueOwner.get(atomId);
      if (previousCue) {
        addViolation('G2', 'G2_DUPLICATE_ATOM', path, '同じatomを複数のcueまたはlineから参照しています。', [previousCue, cueId, atomId]);
      } else {
        atomCueOwner.set(atomId, cueId);
      }
    }
    if (isNonEmptyString(cue.targetId)) {
      const targetRefs = referencedByTarget.get(cue.targetId) ?? [];
      targetRefs.push(...flattenedAtomIds);
      referencedByTarget.set(cue.targetId, targetRefs);
    }

    const firstAtomId = flattenedAtomIds[0];
    const lastAtomId = flattenedAtomIds.at(-1);
    const firstAtom = atomById.get(firstAtomId);
    const lastAtom = atomById.get(lastAtomId);
    if (!isObject(cue.startAnchor) || cue.startAnchor.atomId !== firstAtomId || cue.startAnchor.edge !== 'start') {
      addViolation('G3', 'G3_START_ANCHOR_NOT_FIRST_ATOM', `${path}.startAnchor`, 'startAnchorはcue先頭atomのstartを指す必要があります。', [cueId, firstAtomId]);
    }
    if (!isObject(cue.endAnchor) || cue.endAnchor.atomId !== lastAtomId || cue.endAnchor.edge !== 'end') {
      addViolation('G3', 'G3_END_ANCHOR_NOT_LAST_ATOM', `${path}.endAnchor`, 'endAnchorはcue末尾atomのendを指す必要があります。', [cueId, lastAtomId]);
    }
    if (firstAtom && cue.startMs !== firstAtom.startMs) {
      addViolation('G3', 'G3_START_TIME_NOT_ANCHORED', `${path}.startMs`, 'startMsが先頭atomの保存時刻と一致しません。', [cueId, firstAtomId]);
    }
    if (lastAtom && cue.endMs !== lastAtom.endMs) {
      addViolation('G3', 'G3_END_TIME_NOT_ANCHORED', `${path}.endMs`, 'endMsが末尾atomの保存時刻と一致しません。', [cueId, lastAtomId]);
    }
    const validCueRange = isFiniteInteger(cue.startMs) && isFiniteInteger(cue.endMs) && cue.startMs < cue.endMs;
    if (!validCueRange) {
      addViolation('G3', 'G3_INVALID_TIME_RANGE', path, 'cueのstartMsとendMsは有限の整数で、startMs < endMsである必要があります。', [cueId]);
    }
    let validGroup = null;
    if (cue.simultaneousGroupId !== undefined) {
      const memberTargets = validGroupById.get(cue.simultaneousGroupId);
      if (!memberTargets || !memberTargets.has(cue.targetId)) {
        addViolation('G3', 'G3_INVALID_SIMULTANEOUS_GROUP', `${path}.simultaneousGroupId`, 'cueが上流固定済みの有効な同時表示groupを参照していません。', [cueId, cue.simultaneousGroupId, cue.targetId]);
      } else {
        validGroup = cue.simultaneousGroupId;
      }
    }
    cueRecords.push({
      cueIndex,
      cueId,
      targetId: cue.targetId,
      firstAtomIndex: atomIndexById.get(firstAtomId),
      lastAtomIndex: atomIndexById.get(lastAtomId),
      startMs: cue.startMs,
      endMs: cue.endMs,
      validCueRange,
      validGroup,
      path,
    });
  });

  for (const [targetId] of targetById) {
    if ((cueCountByTarget.get(targetId) ?? 0) === 0) {
      addViolation('G1', 'G1_TARGET_WITHOUT_CAPTION', '$.captionPlan.cues', '表示対象targetにcueがありません。', [targetId]);
    }
    const effectiveIds = effectiveAtomIdsByTarget.get(targetId) ?? [];
    const refs = referencedByTarget.get(targetId) ?? [];
    const refCounts = new Map();
    refs.forEach((atomId) => refCounts.set(atomId, (refCounts.get(atomId) ?? 0) + 1));
    for (const atomId of effectiveIds) {
      const count = refCounts.get(atomId) ?? 0;
      if (count === 0) {
        addViolation('G1', 'G1_UNDECLARED_OMISSION', '$.captionPlan.cues', '必須atomが表示計画から無断で欠落しています。', [targetId, atomId]);
        addViolation('G2', 'G2_REQUIRED_ATOM_MISSING', '$.captionPlan.cues', '必須atomがcue列全体で参照されていません。', [targetId, atomId]);
      }
    }
    const knownRefIndexes = refs.map((atomId) => atomIndexById.get(atomId)).filter((value) => value !== undefined);
    for (let index = 1; index < knownRefIndexes.length; index += 1) {
      if (knownRefIndexes[index] < knownRefIndexes[index - 1]) {
        addViolation('G2', 'G2_ATOM_ORDER_REVERSED', '$.captionPlan.cues', 'targetのcue列がsource順を逆転しています。', [targetId]);
        break;
      }
    }
  }

  for (let index = 1; index < cueRecords.length; index += 1) {
    const previous = cueRecords[index - 1];
    const current = cueRecords[index];
    if (
      previous.firstAtomIndex !== undefined
      && current.firstAtomIndex !== undefined
      && current.firstAtomIndex < previous.firstAtomIndex
    ) {
      addViolation('G3', 'G3_CUE_ORDER_REVERSED', current.path, '後のsource atomを参照するcueより先に、前のcueを表示する論理順序が必要です。', [previous.cueId, current.cueId]);
    }
  }

  for (let leftIndex = 0; leftIndex < cueRecords.length; leftIndex += 1) {
    const left = cueRecords[leftIndex];
    if (!left.validCueRange) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < cueRecords.length; rightIndex += 1) {
      const right = cueRecords[rightIndex];
      if (!right.validCueRange) continue;
      const overlapMs = Math.min(left.endMs, right.endMs) - Math.max(left.startMs, right.startMs);
      if (overlapMs <= 0) continue;
      const declaredTogether = left.validGroup !== null && left.validGroup === right.validGroup;
      if (!declaredTogether) {
        addViolation(
          'G3',
          'G3_UNDECLARED_OVERLAP',
          right.path,
          'cue同士が正の時間だけ交差していますが、有効な同時表示groupがありません。',
          [left.cueId, right.cueId],
          { overlapMs },
        );
      }
    }
  }

  sortIssues(contractViolations);
  sortIssues(contractObservations);
  sortIssues(violations.G1);
  sortIssues(violations.G2);
  sortIssues(violations.G3);

  const hasG2DeclaredLimit = source.atomGranularity === 'character-timestamp';
  const g2Unverified = hasG2DeclaredLimit
    ? ['linguistic_word_boundary', 'semantic_chunk_readability', 'on_screen_readability']
    : [];
  const report = {
    checkerVersion: PRESENTATION_CAPTION_CHECKER_VERSION,
    inputSha256: createHash('sha256').update(canonicalJson(root)).digest('hex'),
    overallStatus: 'passed',
    contract: {
      status: checkStatus(contractViolations),
      violations: contractViolations,
      observations: contractObservations,
    },
    checks: {
      G1: { status: checkStatus(violations.G1), violations: violations.G1, unverified: [] },
      G2: { status: checkStatus(violations.G2, hasG2DeclaredLimit), violations: violations.G2, unverified: g2Unverified },
      G3: { status: checkStatus(violations.G3), violations: violations.G3, unverified: [] },
    },
  };
  const statuses = [report.contract.status, report.checks.G1.status, report.checks.G2.status, report.checks.G3.status];
  report.overallStatus = statuses.includes('failed')
    ? 'failed'
    : statuses.includes('passed_with_declared_limit')
      ? 'passed_with_declared_limit'
      : 'passed';
  return report;
}

export const serializePresentationCaptionReport = (report) => `${JSON.stringify(report, null, 2)}\n`;

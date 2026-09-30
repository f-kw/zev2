/** Digest開発候補の薄い登録成果物。内容採否・保持本文は参照先だけに保存する。 */
export type DigestByteBindingV001 = {path: string; fileSha256: string};
export type DigestJsonBindingV001 = DigestByteBindingV001 & {schemaVersion: string; canonicalSha256: string};
export type DigestPlanArtifactV001 = {
  schemaVersion: 'digest-plan-artifact-v001'; kind: 'digest_plan_json';
  requestDraftId: string; requestId: string;
  approvedRequestBinding: DigestJsonBindingV001;
  sourceVideoBinding: DigestByteBindingV001;
  transcriptBinding: DigestByteBindingV001;
  utteranceBinding: DigestJsonBindingV001;
  preparationBinding: DigestJsonBindingV001;
  dataBindings: DigestByteBindingV001[];
  quality: 'human-review-pending';
};
export type DigestExecutionInputArtifactV001 = {
  schemaVersion: 'digest-execution-input-artifact-v001'; kind: 'digest_execution_input_json';
  requestDraftId: string; requestId: string;
  planFileRefBinding: DigestByteBindingV001 & {requestId: string; outputId: string; fileRefId: string; byteSize: number};
  sourceInspectionBinding: DigestByteBindingV001 | null;
  sourceInspectionMissingReason: string | null;
  consumptionBinding: DigestJsonBindingV001 | null;
  editPlanBinding: DigestJsonBindingV001 | null;
  manufacturingInputBinding: DigestJsonBindingV001 | null;
  clockResolutionBinding: DigestJsonBindingV001 | null;
  dataBindings: DigestByteBindingV001[];
  admission: {planIntegrity: 'passed'; presentation: 'not-connected'; executionPermission: 'not-approved'; humanQuality: 'pending'};
};
const id = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]+$/u.test(v);
const sha = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{64}$/u.test(v);
const record = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const exact = (v: unknown, keys: string[]): v is Record<string, any> => record(v)
  && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
function requireCondition(v: unknown, message: string): asserts v {if (!v) throw new Error(message);}
export function digestArtifactFileNameV001(bindingPath: string, draftId: string): string {
  const prefix = `artifacts/${draftId}/`;
  requireCondition(id(draftId) && typeof bindingPath === 'string' && bindingPath.startsWith(prefix), 'DIGEST_REFERENCE_OTHER_DRAFT');
  const file = bindingPath.slice(prefix.length);
  requireCondition(/^[A-Za-z0-9_-]+--[A-Za-z0-9_.-]+$/u.test(file), 'DIGEST_REFERENCE_INVALID');
  return file;
}
export function assertDigestByteBindingV001(value: unknown, draftId: string): asserts value is DigestByteBindingV001 {
  requireCondition(exact(value, ['path', 'fileSha256']) && sha(value.fileSha256), 'DIGEST_BYTE_BINDING_INVALID');
  digestArtifactFileNameV001(value.path, draftId);
}
function jsonBinding(v: unknown, draft: string): asserts v is DigestJsonBindingV001 {
  requireCondition(exact(v, ['schemaVersion','path','fileSha256','canonicalSha256'])
    && typeof v.schemaVersion === 'string' && v.schemaVersion && sha(v.fileSha256) && sha(v.canonicalSha256), 'DIGEST_JSON_BINDING_INVALID');
  digestArtifactFileNameV001(v.path, draft);
}
export function assertDigestArtifactV001(value: unknown, kind: 'digest_plan_json' | 'digest_execution_input_json',
  expected?: {requestDraftId: string; requestId: string}): asserts value is DigestPlanArtifactV001 | DigestExecutionInputArtifactV001 {
  requireCondition(record(value) && value.kind === kind && id(value.requestDraftId) && id(value.requestId), 'DIGEST_ARTIFACT_IDENTITY_INVALID');
  const d = value.requestDraftId;
  if (expected) requireCondition(d === expected.requestDraftId && value.requestId === expected.requestId, 'DIGEST_ARTIFACT_REQUEST_MISMATCH');
  const refs: DigestByteBindingV001[] = [];
  const add = (b: unknown, json = false) => {if (json) jsonBinding(b,d); else assertDigestByteBindingV001(b,d); refs.push(b as DigestByteBindingV001);};
  if (kind === 'digest_plan_json') {
    requireCondition(exact(value, ['schemaVersion','kind','requestDraftId','requestId','approvedRequestBinding','sourceVideoBinding',
      'transcriptBinding','utteranceBinding','preparationBinding','dataBindings','quality'])
      && value.schemaVersion === 'digest-plan-artifact-v001' && value.quality === 'human-review-pending', 'DIGEST_PLAN_VERSION_OR_FIELDS_INVALID');
    for (const n of ['approvedRequestBinding','utteranceBinding','preparationBinding']) add(value[n],true);
    for (const n of ['sourceVideoBinding','transcriptBinding']) add(value[n]);
  } else {
    requireCondition(exact(value, ['schemaVersion','kind','requestDraftId','requestId','planFileRefBinding','sourceInspectionBinding',
      'sourceInspectionMissingReason','consumptionBinding','editPlanBinding','manufacturingInputBinding','clockResolutionBinding','dataBindings','admission'])
      && value.schemaVersion === 'digest-execution-input-artifact-v001', 'DIGEST_EXECUTION_VERSION_OR_FIELDS_INVALID');
    const p = value.planFileRefBinding;
    requireCondition(exact(p,['path','fileSha256','requestId','outputId','fileRefId','byteSize']) && id(p.requestId) && id(p.outputId)
      && id(p.fileRefId) && Number.isSafeInteger(p.byteSize) && p.byteSize > 0, 'DIGEST_PLAN_FILEREF_INVALID');
    add({path:p.path,fileSha256:p.fileSha256});
    const a = value.admission;
    requireCondition(exact(a,['planIntegrity','presentation','executionPermission','humanQuality']) && a.planIntegrity === 'passed'
      && a.presentation === 'not-connected' && a.executionPermission === 'not-approved' && a.humanQuality === 'pending', 'DIGEST_ADMISSION_INVALID');
    if (value.sourceInspectionBinding === null) {
      requireCondition(typeof value.sourceInspectionMissingReason === 'string' && value.sourceInspectionMissingReason.trim()
        && ['consumptionBinding','editPlanBinding','manufacturingInputBinding','clockResolutionBinding'].every(n => value[n] === null), 'DIGEST_MISSING_INSPECTION_INVALID');
    } else {
      add(value.sourceInspectionBinding);
      requireCondition(value.sourceInspectionMissingReason === null, 'DIGEST_INSPECTION_REASON_INVALID');
      for (const n of ['consumptionBinding','editPlanBinding','manufacturingInputBinding','clockResolutionBinding']) add(value[n],true);
    }
  }
  requireCondition(Array.isArray(value.dataBindings) && value.dataBindings.length > 0, 'DIGEST_DATA_CLOSURE_MISSING');
  const seen = new Map<string,string>();
  for (const b of value.dataBindings) {assertDigestByteBindingV001(b,d);requireCondition(!seen.has(b.path),'DIGEST_DATA_REFERENCE_DUPLICATE'); seen.set(b.path,b.fileSha256);}
  for (const b of refs) requireCondition(seen.get(b.path) === b.fileSha256, 'DIGEST_DATA_CLOSURE_INCOMPLETE');
}

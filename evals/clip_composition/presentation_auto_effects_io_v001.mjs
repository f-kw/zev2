import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {AUTO_PRESENTATION_RULES_REF_V002, sha256AutoPresentationV001,
  fixAutoPresentationProposalV001, resolveAutoPresentationV001} from './presentation_auto_effects_v001.mjs';

const bytesHash = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));

/** Read actual bytes; a proposal cannot declare an old hash for new source content. */
export async function loadAutoPresentationContextV001({baselinePath, decisionInputPath}) {
  const [baselineBytes, decisionBytes] = await Promise.all([
    readFile(baselinePath), readFile(decisionInputPath),
  ]);
  const baselinePlan = JSON.parse(baselineBytes.toString('utf8'));
  const context = {
    baselineRef: {path: resolve(baselinePath), fileSha256: bytesHash(baselineBytes),
      canonicalSha256: sha256AutoPresentationV001(baselinePlan)},
    decisionInputRef: {path: resolve(decisionInputPath), fileSha256: bytesHash(decisionBytes)},
    renderingRulesRef: AUTO_PRESENTATION_RULES_REF_V002,
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

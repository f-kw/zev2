import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  buildDistantConnectionPresentationMeaningInputFromFilesV001,
  serializeDistantConnectionPresentationMeaningInputV001
} from './distant-connection-presentation-meaning-input-v001.js';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outputPath =
  'evals/clip_composition/outputs/work-distant-connection-presentation-meaning-input-ymUsGrT6EaA-v001/candidate-horror-claim-to-speed-up/meaning-input-v001.json';

export async function materializeDistantConnectionPresentationMeaningInputV001(): Promise<void> {
  const artifact = await buildDistantConnectionPresentationMeaningInputFromFilesV001({
    workspaceRoot,
    artifactId: 'ymUsGrT6EaA-candidate-horror-claim-to-speed-up-presentation-meaning-v001',
    candidateId: 'candidate-horror-claim-to-speed-up',
    candidateResponsePath:
      'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-concrete-payoff-ymUsGrT6EaA-v001/candidate-response-v001.json',
    expectedCandidateResponseSha256:
      '4239b6b51d3dd3dd548a9083ac0434860182d497321a89cf07c8f53eb66586b8',
    semanticUtterancePath:
      'evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json',
    expectedSemanticUtteranceSha256:
      'e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2',
    intervalizationPlanPath:
      'evals/clip_composition/outputs/work-distant-connection-intervalization-plan-ymUsGrT6EaA-v002/intervalization-plan-v002.json',
    expectedIntervalizationPlanSha256:
      'f9a4c6e3b524117fd46b56d8e14bb410dea9747fec1657022ab69d15019be192',
    editPlanProjectionPath:
      'evals/clip_composition/outputs/work-distant-connection-edit-plan-projection-ymUsGrT6EaA-v001/candidate-horror-claim-to-speed-up/edit-plan.json',
    expectedEditPlanProjectionSha256:
      '961b4f529fb5abff4ffa11129e6ee55967977794ba1bb15d394c2cd8ffee9db6',
    assemblyDecisionPath:
      'evals/clip_composition/outputs/presentation/source-assembly-formalizations/ymUsGrT6EaA-candidate-horror-claim-to-speed-up-edit-plan-projection-v001/assembly-decision.json',
    expectedAssemblyDecisionSha256:
      'bd9a0394c1caec7008d291c272aba62798b17f4a9a31c880b57ba68e44a76ca3'
  });
  const absoluteOutputPath = path.join(workspaceRoot, outputPath);
  await mkdir(path.dirname(absoluteOutputPath), {recursive: true});
  await writeFile(
    absoluteOutputPath,
    serializeDistantConnectionPresentationMeaningInputV001(artifact)
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await materializeDistantConnectionPresentationMeaningInputV001();
}

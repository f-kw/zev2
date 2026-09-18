/** Editing caller only: the drawing implementation remains the shared renderer. */
import {readFile, writeFile} from 'node:fs/promises';
import {inspectPresentationRenderLayoutV001} from './inspect_presentation_render_layout_v001';

async function main() {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath || process.argv.length !== 4) throw new Error('layout input and output required');
  const input = JSON.parse(await readFile(inputPath, 'utf8'));
  const result = inspectPresentationRenderLayoutV001(input);
  await writeFile(outputPath, JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
}
main().catch(error => {console.error(error); process.exitCode = 2;});

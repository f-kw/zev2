import assert from 'node:assert/strict';
import test from 'node:test';

import {buildDistantConnectionRendererTemplateRebindV001} from './distant_connection_renderer_template_rebind_v001.mts';

const TEMPLATE = 'evals/clip_composition/outputs/presentation/distant-connection-formal-render/'
  + 'candidate-horror-claim-to-speed-up-v003/renderer-job-v002.json';
const BASE = 'evals/clip_composition/outputs/presentation/base-media/'
  + 'distant-connection-candidate-horror-claim-to-speed-up-audio-grid-v003';

test('renderer設定を変えず対象base-mediaだけを決定的に再束縛する', async () => {
  const input = {
    workspaceRoot: process.cwd(), templatePath: TEMPLATE, baseMediaRoot: BASE,
    jobId: 'renderer-template-rebind-test-v001', publicationRoot: 'tmp/renderer-template-test',
  };
  const first = await buildDistantConnectionRendererTemplateRebindV001(input);
  const second = await buildDistantConnectionRendererTemplateRebindV001(input);
  assert.deepEqual(second, first);
  assert.equal(first.cropAppliedBaseMedia.baseMedia.path, `${BASE}/base-media.mp4`);
  assert.equal(first.runtimeBindings.chromium.path.includes('chrome-headless-shell'), true);
});

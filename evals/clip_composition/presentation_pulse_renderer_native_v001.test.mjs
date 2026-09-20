import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';
import test from 'node:test';
import {indexExplicitLinesV001} from './presentation_renderer_text_layout_v001.mjs';
import {buildPresentationPulseStateElementsV001, assertPresentationPulseAnchorsV001,
  getPresentationPulseProgramV001} from './presentation_pulse_v001.mjs';
import {evaluatePresentationRendererQcV002, inspectRenderedMediaWithToolsV001}
  from './presentation_renderer_qc_v002.mjs';
import {executeValidatedPresentationDrawAndQcV001, buildPresentationCompositeArgumentsV001,
  buildPresentationFrameExtractionArgumentsV001, runPresentationRendererChildProcessV001}
  from './render_presentation_v002.mjs';
import {inspectPresentationPulseCompletedFramesV001} from './presentation_pulse_renderer_qc_v001.mjs';
const execute = promisify(execFile);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const FFMPEG='/opt/homebrew/bin/ffmpeg', MAGICK='/opt/homebrew/bin/magick';

test('native Pulse states, exact common renderer and broken completed-frame cases', async t => {
  const root = process.cwd();
  const output = process.env.ZEV_PULSE_NATIVE_QC_OUTPUT
    ? path.resolve(process.env.ZEV_PULSE_NATIVE_QC_OUTPUT) : await mkdtemp(path.join(tmpdir(), 'zev-pulse-native-'));
  if (!process.env.ZEV_PULSE_NATIVE_QC_OUTPUT) t.after(() => rm(output, {recursive:true,force:true}));
  await mkdir(output,{recursive:true});
  const renderDirectory = await mkdtemp(path.resolve('evals/clip_composition/outputs/presentation/pulse-native-test-'));
  if (!process.env.ZEV_PULSE_NATIVE_QC_OUTPUT) t.after(() => rm(renderDirectory,{recursive:true,force:true}));
  const savedPropsPath = path.resolve(root,
    'evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/style-95-v001/raster-diagnosis-v001/overlay-props.json');
  const savedPropsBytes=await readFile(savedPropsPath), savedProps=JSON.parse(savedPropsBytes);
  savedProps.visualState.textStyle.fontSizePx=96;
  const req = createRequire(path.resolve(root, 'runner/package.json'));
  const remotion = createRequire(req.resolve('@remotion/cli/package.json'));
  const rendererPath = remotion.resolve('@remotion/renderer');
  const {openBrowser} = remotion('@remotion/renderer');
  const {screenshot} = remotion(path.join(path.dirname(rendererPath), 'puppeteer-screenshot.js'));
  const {build} = createRequire(req.resolve('tsx/package.json'))('esbuild');
  const tsx = path.resolve(root, 'runner/node_modules/tsx/dist/cli.mjs');
  const chromePath = path.resolve(root,
    'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell');
  const fontPath = path.resolve(root, 'runner/public/font', savedProps.fontFileName);
  const fontBytes = await readFile(fontPath);
  const bundle = await build({stdin: {contents: `
    import React from 'react';
    import {createRoot} from 'react-dom/client';
    import {flushSync} from 'react-dom';
    import {buildExactTextModel, ExactOverlay} from './evals/clip_composition/presentation_renderer_entry_v001.tsx';
    let mounted;
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    export async function draw(props) {
      if (mounted) flushSync(() => mounted.unmount());
      document.body.replaceChildren(); document.body.style.margin='0';
      window.remotion_staticBase=''; window.remotion_renderReady=false;
      const host=document.createElement('div'); document.body.append(host);
      mounted=createRoot(host); flushSync(() => mounted.render(React.createElement(ExactOverlay,props)));
      const deadline=performance.now()+30000;
      while (!window.remotion_renderReady || window.remotion_delayRenderHandles.length !== 0) {
        if (performance.now()>deadline) throw new Error('pulse overlay did not become ready');
        await frame();
      }
      await frame();
      return {exact:buildExactTextModel(props), ready:window.remotion_renderReady,
        fillTexts:[...document.querySelectorAll('svg text:not([stroke])')].map(el=>el.textContent),
        fontLoaded:document.fonts.check(props.visualState.textStyle.fontSizePx+'px "'+props.fontFamilyName+'"')};
    }
  `, resolveDir: root, loader: 'tsx'}, bundle: true, platform: 'browser', format: 'iife', globalName: 'PulseQC',
    write: false, nodePaths: [path.resolve(root, 'runner/node_modules')],
    define: {'process.env.NODE_ENV': '"production"'}, metafile: true, logLevel: 'silent'});
  await writeFile(path.join(output, 'browser-bundle.js'), bundle.outputFiles[0].text);
  const server = createServer((request, response) => {
    if (request.url === `/font/${savedProps.fontFileName}`) {
      response.writeHead(200, {'Content-Type': 'font/otf'}); response.end(fontBytes);
    } else if (request.url === '/') {
      response.writeHead(200, {'Content-Type': 'text/html'}); response.end('<!doctype html><html><body></body></html>');
    } else { response.writeHead(404); response.end(); }
  });
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
  t.after(() => new Promise(resolve => server.close(resolve)));
  const results = [];
  const browser = await openBrowser('chrome', {browserExecutable: chromePath, forceDeviceScaleFactor: 1, logLevel: 'error'});
  try {
    const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false,
      pageIndex: 0, onBrowserLog: null, onLog: () => {}});
    const {width, height} = savedProps.canvas;
    await page.setViewport({width, height, deviceScaleFactor: 1});
    await page.goto({url: `http://127.0.0.1:${server.address().port}`, timeout: 30000});
    await page.evaluate(bundle.outputFiles[0].text);
    const shot = async name => {
      const bytes = await screenshot({page, type: 'png', omitBackground: true, width, height, scale: 1});
      const pngPath = path.join(output, `${name}.png`);
      await writeFile(pngPath, bytes);
      const {stdout} = await execute('magick', [pngPath, '-depth', '8', 'rgba:-'],
        {encoding: 'buffer', maxBuffer: width * height * 4 + 1024});
      return {pngPath, fileSha256: sha(bytes), rgba: stdout};
    };
    const draw = props => page.evaluate(`PulseQC.draw(${JSON.stringify(props)})`);
    const inspectLayout = async (props, name) => {
      const input = path.join(output, `${name}-layout-input.json`), resultPath = path.join(output, `${name}-layout.json`);
      await writeFile(input, JSON.stringify({canvas: props.canvas, overlays: [props]}));
      try {
        await execute(process.execPath, [tsx, path.resolve(root, 'evals/clip_composition/inspect_presentation_render_layout_v001.ts'), input, resultPath],
          {cwd: root, env: {...process.env, NODE_PATH: path.resolve(root, 'runner/node_modules'), TSX_DISABLE_CACHE: '1'}});
      } catch (error) { if (error.code !== 1) throw error; }
      return JSON.parse(await readFile(resultPath, 'utf8'));
    };
    const makeElement = (name, lines, startFrame, endFrameExclusive, anchorFrame) => {
      const indexed=indexExplicitLinesV001(lines); assert.equal(indexed.status,'passed');
      return {instructionId:name,kind:'speech-caption',presetId:'normal-test',requestedPresetId:'normal-test',
        appliedPresetId:'normal-test',registryVersion:'native-test-v001',text:indexed.sourceText,indexedLines:indexed.indexedLines,
        startFrame,endFrameExclusive,displayFrameCount:endFrameExclusive-startFrame,
        visualState:structuredClone(savedProps.visualState),
        presentationPulse:{presentation:'provisional-pulse',anchorPeakId:`measured-${name}`,anchorFrame}};
    };
    const propsFor=element=>({...savedProps,instructionId:element.instructionId,text:element.text,
      indexedLines:element.indexedLines,visualState:element.visualState,inspectionLineIndex:null});
    const elements=[makeElement('short',['一度だけ変化'],0,45,20),
      makeElement('two-lines',['先に条件を伝える','それから進める'],45,90,65)];
    const canvas=savedProps.canvas;
    const plan={schemaVersion:'presentation-output-common-core-plan-v001',canvas,elements};
    for (const element of elements) {
      const stateProps=buildPresentationPulseStateElementsV001({element,canvas}).map(row=>propsFor(row.element));
      const layouts=[];
      for (const [index,props] of stateProps.entries()) {
        const layout=await inspectLayout(props,`${element.instructionId}-state-${index}`);
        assert.equal(layout.status,'passed',JSON.stringify(layout));layouts.push(layout.items[0]);
      }
      assertPresentationPulseAnchorsV001(layouts);
    }
    const tooWide=makeElement('normal-fits-maximum-does-not',['猫'.repeat(17)],0,45,20);
    const wideStates=buildPresentationPulseStateElementsV001({element:tooWide,canvas});
    const normalWide=await inspectLayout(propsFor(wideStates[0].element),'wide-normal');
    const maximumWide=await inspectLayout(propsFor(wideStates[2].element),'wide-maximum');
    assert.equal(normalWide.status,'passed');
    assert(maximumWide.violations.some(row=>row.code==='LAYOUT_SAFE_AREA_VIOLATION'));
    const collision=makeElement('overlap',['重なる一行目','重なる二行目'],0,45,20);
    collision.visualState.textStyle.lineSpacingPercent=0;
    for (const row of buildPresentationPulseStateElementsV001({element:collision,canvas})) {
      const result=await inspectLayout(propsFor(row.element),`overlap-${row.state}`);
      assert(result.violations.some(item=>item.code==='LAYOUT_LINE_POSITIVE_INTERSECTION'));
    }
    const baseMediaPath=path.join(output,'synthetic-base.mp4');
    await execute(FFMPEG,['-hide_banner','-loglevel','error','-y','-f','lavfi','-i',
      `testsrc2=size=${canvas.width}x${canvas.height}:rate=30:duration=3`,
      '-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=3',
      '-frames:v','90','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','aac',baseMediaPath]);
    const tools={ffmpegPath:FFMPEG,ffprobePath:'/opt/homebrew/bin/ffprobe',imageMagickPath:MAGICK,
      tsxPath:tsx,layoutInspectorPath:path.resolve(root,'evals/clip_composition/inspect_presentation_render_layout_v001.ts')};
    const baseMediaInspection={media:await inspectRenderedMediaWithToolsV001(baseMediaPath,tools)};
    const calls=[];
    const adapter={buildProps:propsFor,
      renderStill:async(props,file)=>{await draw(props);const bytes=await screenshot({page,type:'png',omitBackground:true,width,height,scale:1});
        await writeFile(file,bytes);calls.push({kind:'still',instructionId:props.instructionId,fontSizePx:props.visualState.textStyle.fontSizePx,file,sha256:sha(bytes)});},
      renderLineMask:async(props,lineIndex,file)=>{await draw({...props,inspectionLineIndex:lineIndex});
        const bytes=await screenshot({page,type:'png',omitBackground:true,width,height,scale:1});await writeFile(file,bytes);
        calls.push({kind:'line',instructionId:props.instructionId,fontSizePx:props.visualState.textStyle.fontSizePx,lineIndex,file,sha256:sha(bytes)});}};
    const outcome=await executeValidatedPresentationDrawAndQcV001({outputDirectory:path.join(renderDirectory,'render'),
      plan,presetRegistry:{},baseMediaPath,baseMediaInspection,expectedFrameCount:90,overlayAdapter:adapter,
      toolPaths:tools,serializePngAndFilters:true});
    await writeFile(path.join(output,'common-render-result.json'),JSON.stringify(outcome,null,2));
    assert.equal(outcome.exitCode,0,JSON.stringify(outcome));
    assert.equal(outcome.overlayRecords.length,2);assert.equal(outcome.applicationResults.length,2);
    assert.equal(outcome.finalQc.status,'passed');
    assert.equal(calls.filter(call=>call.kind==='still').length,20);
    assert.equal(calls.filter(call=>call.kind==='line').length,15);
    assert.equal(outcome.outputMedia.audio.packetPayloadSha256,baseMediaInspection.media.audio.packetPayloadSha256);
    assert.deepEqual(plan.elements,elements);
    results.push({name:'common-render',finalQc:outcome.finalQc,video:outcome.workVideo,
      videoSha256:sha(await readFile(outcome.workVideo)),calls});
    const original=outcome.overlayRecords[0];
    const extract=(file,frame,out,fps,ffmpegPath,processObserver)=>runPresentationRendererChildProcessV001(ffmpegPath,
      buildPresentationFrameExtractionArgumentsV001({inputPath:file,frame,outputPath:out,fps}),{processObserver});
    const cases=[
      {name:'maximum-replaced-by-normal',change:records=>{records[0].pulseStates[2].pngPath=records[0].pulseStates[0].pngPath;}},
      {name:'pulse-timing-shifted',change:records=>{records[0].element.presentationPulse.anchorFrame+=8;}},
      {name:'pulse-does-not-return',changeGraph:graph=>graph
        .replace('[1:v]format=rgba,split=2[pulse0state0][pulse0state8]','[1:v]format=rgba[pulse0state0]')
        .replace('[3:v]format=rgba[pulse0state4]','[3:v]format=rgba,split=2[pulse0state4][pulse0state8]')},
    ];
    for (const defect of cases) {
      const records=structuredClone(outcome.overlayRecords);defect.change?.(records);
      const args=buildPresentationCompositeArgumentsV001({baseMediaPath,plan,overlayRecords:records,expectedFrameCount:90,serializePngAndFilters:true});
      if(defect.changeGraph) {const index=args.indexOf('-filter_complex')+1;const changed=defect.changeGraph(args[index]);
        assert.notEqual(changed,args[index]);args[index]=changed;}
      const video=path.join(output,`${defect.name}.mp4`);
      await execute(FFMPEG,[...args,video]);
      const directory=path.join(output,defect.name);await mkdir(directory);
      const frames=await inspectPresentationPulseCompletedFramesV001({record:original,canvas,baseMediaPath,completedMediaPath:video,
        scratchDirectory:directory,ffmpegPath:FFMPEG,imageMagickPath:MAGICK,processObserver:null,
        runProcess:runPresentationRendererChildProcessV001,extractFrame:extract});
      const inspections=outcome.overlayRecords.map(record=>structuredClone(record.inspection));
      inspections[0].pulse.completedFrames=frames;
      const qc=evaluatePresentationRendererQcV002({plan,canvas,applicationResults:outcome.applicationResults,
        overlayInspections:inspections,mediaInspection:outcome.outputMedia,expectedAudio:outcome.baseExpectedAudio,expectedFrameCount:90});
      assert(qc.violations.some(row=>row.code==='PULSE_FRAME_STATE_MISMATCH'),JSON.stringify({defect: defect.name,frames,qc}));
      results.push({name:defect.name,video,videoSha256:sha(await readFile(video)),frames,qc});
    }
  } finally {
    await browser.close({silent:true});
    await writeFile(path.join(output,'measurement.json'),JSON.stringify({schemaVersion:'presentation-pulse-native-qc-v001',
      savedPropsBinding:{path:savedPropsPath,fileSha256:sha(savedPropsBytes)},
      fontBinding:{path:fontPath,fileSha256:sha(fontBytes)},chromiumBinding:{path:chromePath,fileSha256:sha(await readFile(chromePath))},
      runtime:process.version,renderDirectory,syntheticVideoOnly:true,externalApiCalls:0,costUsd:0,results},null,2)+'\n');
  }
});

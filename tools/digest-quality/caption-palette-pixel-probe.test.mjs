import assert from 'node:assert/strict';
import test from 'node:test';
import {paletteProbePropsV001, inspectPaletteRgbaV001, assertPaletteRgbaV001, summarizeLumaV001} from './caption-palette-pixel-probe.mjs';

test('finite probe changes only the existing Color fill and refuses unknown/additional targets', () => {
  const props = {text: '前対象後', indexedLines: [{text: '前対象後'}], presentationColorRange: {startCodePoint: 1, endCodePointExclusive: 3, fontColor: '#FFD65A'}};
  const before = structuredClone(props), result = paletteProbePropsV001(props, 'light-sky-blue');
  assert.deepEqual(props, before);assert.deepEqual(result, {...before, presentationColorRange: {...before.presentationColorRange, fontColor: '#87CEFA'}});
  assert.throws(() => paletteProbePropsV001(props, '#87CEFA'), /unknown/);
  assert.throws(() => paletteProbePropsV001({text: 'Normal'}, 'yellow'), /does not add/);
});
function fixture() {
  const yellow = [255,214,90,255], blue = [135,206,250,255], normal = [255,253,248,255];
  return {baseline: Buffer.from([...normal,...yellow]), colored: Buffer.from([...normal,...blue]),
    baselineFill: Buffer.from([...normal,...yellow]), coloredFill: Buffer.from([...normal,...blue]),
    selectedMask: Buffer.from([0,0,0,0,255,255,255,255]), baselineStroke: Buffer.from([47,79,79,12,47,79,79,23]),
    coloredStroke: Buffer.from([47,79,79,12,47,79,79,23]), width: 2, height: 1,
    safeArea: {left: 0,right: 0,top: 0,bottom: 0}, expectedColor: '#87CEFA'};
}
test('exact pixel predicate accepts range-only changes and detects one-byte alpha/outside/stroke faults', () => {
  assertPaletteRgbaV001(inspectPaletteRgbaV001(fixture()), {expectChange: true});
  for (const mutate of [f=>f.colored[0]--,f=>f.colored[7]--,
    f=>f.coloredStroke[0]++,f=>f.selectedMask.fill(0),f=>f.safeArea.right=1]) {
    const f=fixture();mutate(f);assert.throws(()=>assertPaletteRgbaV001(inspectPaletteRgbaV001(f),{expectChange:true}));
  }
  const f=fixture();f.colored=f.baseline;f.coloredFill=f.baselineFill;f.expectedColor='#FFD65A';
  assertPaletteRgbaV001(inspectPaletteRgbaV001(f),{expectChange:false});
});
test('isolated-fill auxiliary alpha differences remain reported without replacing the full-overlay alpha invariant', () => {
  const f=fixture();f.coloredFill[3]--;
  const result=inspectPaletteRgbaV001(f);assert.equal(result.fillAlphaDifferences,1);assert.equal(result.alphaDifferences,0);
  assertPaletteRgbaV001(result,{expectChange:true});
  f.colored[3]--;assert.throws(()=>assertPaletteRgbaV001(inspectPaletteRgbaV001(f),{expectChange:true}),/alphaDifferences/);
});
test('background Y statistics are measured values and exact crop counts, without an acceptance threshold', () => {
  const bytes=Buffer.from([10,20,30,40]);
  const whole=summarizeLumaV001(bytes,{width:2,height:2});assert.equal(whole.mean,25);assert.equal(whole.minimum,10);assert.equal(whole.maximum,40);
  const crop=summarizeLumaV001(bytes,{width:2,height:2,rect:{left:1,right:1,top:0,bottom:1}});assert.equal(crop.mean,30);assert.equal(crop.sampleCount,2);
  assert.throws(()=>summarizeLumaV001(bytes,{width:2,height:2,rect:{left:0,right:2,top:0,bottom:1}}));
});

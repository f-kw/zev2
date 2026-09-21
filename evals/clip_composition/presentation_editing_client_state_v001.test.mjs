/**
 * Non-browser component tests. Compile the actual SFC and actual API adapter,
 * mount them with the installed Vue custom renderer, and delay only fetch.
 * This checks reactive rendering/events and request ownership, not browser
 * layout, DOM behavior, playback, or the blocked browser acceptance path.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const clientRequire = createRequire(path.join(repository, 'client/package.json'));
const vue = clientRequire('vue');
const {parse, compileScript} = clientRequire('vue/compiler-sfc');
const ts = clientRequire('typescript');
const clone = value => structuredClone(value);

function compileModule(source, filename, modules) {
  const compiled = ts.transpileModule(source, {fileName: filename, reportDiagnostics: true,
    compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}});
  assert.deepEqual(compiled.diagnostics?.filter(row => row.category === ts.DiagnosticCategory.Error), [],
    'actual component/API TypeScript must compile');
  const module = {exports: {}};
  const require = name => {
    assert(Object.hasOwn(modules, name), 'unexpected component dependency: ' + name);
    return modules[name];
  };
  new Function('require', 'module', 'exports', compiled.outputText)(require, module, module.exports);
  return module.exports;
}

const apiFilename = path.join(repository, 'client/src/presentation-editing-api.ts');
const api = compileModule(await readFile(apiFilename, 'utf8'), apiFilename, {});
const sfcFilename = path.join(repository, 'client/src/PresentationEditing.vue');
const parsed = parse(await readFile(sfcFilename, 'utf8'), {filename: sfcFilename});
assert.deepEqual(parsed.errors, []);
const compiledSfc = compileScript(parsed.descriptor, {id: 'editing-component-state-test',
  inlineTemplate: true, templateOptions: {compilerOptions: {hoistStatic: false}}});
const component = compileModule(compiledSfc.content, sfcFilename + '.ts',
  {vue, './presentation-editing-api': api}).default;

class HostNode {
  constructor(type, value = '') {
    this.type = type;
    this.tagName = type.toUpperCase();
    this.text = value;
    this.children = [];
    this.parent = null;
    this.props = {};
    this.listeners = new Map();
    this.value = '';
    this.checked = false;
    this.selected = false;
    this.multiple = false;
    this.selectionStart = 0;
    this.selectionEnd = 0;
  }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter(row => row !== listener));
  }
  getRootNode() {return this.parent ? this.parent.getRootNode() : this;}
  get options() {return walk(this).filter(node => node.type === 'option');}
  get selectedIndex() {return this.options.findIndex(option => option.selected);}
  set selectedIndex(index) {this.options.forEach((option, ordinal) => {option.selected = ordinal === index;});}
}

function walk(root) {return [root, ...root.children.flatMap(walk)];}
function textOf(node) {return node.type === '#comment' ? '' : node.text + node.children.map(textOf).join('');}
function classHas(node, name) {return String(node.props.class ?? '').split(/\s+/u).includes(name);}
function removeNode(node) {
  if (!node.parent) return;
  const siblings = node.parent.children, index = siblings.indexOf(node);
  if (index >= 0) siblings.splice(index, 1);
  node.parent = null;
}
const renderer = vue.createRenderer({
  createElement: type => new HostNode(type),
  createText: text => new HostNode('#text', text),
  createComment: text => new HostNode('#comment', text),
  setText: (node, text) => {node.text = text;},
  setElementText(node, text) {
    node.children.forEach(child => {child.parent = null;});
    node.children = []; node.text = text;
  },
  insert(node, parent, anchor = null) {
    removeNode(node);
    const index = anchor === null ? parent.children.length : parent.children.indexOf(anchor);
    assert(index >= 0, 'renderer anchor belongs to another parent');
    parent.children.splice(index, 0, node); node.parent = parent;
  },
  remove: removeNode,
  parentNode: node => node.parent,
  nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
  patchProp(node, key, _before, value) {
    node.props[key] = value;
    if (['value', 'checked', 'selected', 'multiple', 'type'].includes(key)) node[key] = value;
    if (key === 'value') node._value = value;
  },
  setScopeId: () => {},
  insertStaticContent() {throw new Error('test compiler must retain explicit host nodes');},
});

const captions = [
  {id: 'caption-a', text: '前半の色を変える', startFrame: 0, endFrameExclusive: 90},
  {id: 'caption-b', text: '後半の別の字幕', startFrame: 90, endFrameExclusive: 180},
];
const baseState = () => ({title: 'component state fixture', revision: 'revision-1',
  savedAt: '2026-09-18T09:00:00.000Z', fps: 30, frameCount: 180, csrfToken: 'fixture-token',
  captions: captions.map(row => ({...row, preset: 'normal', presetLabel: 'Normal',
    hasOverride: false, status: 'automatic', statusLabel: '自動案'})),
  connections: [], media: [], job: null});
const presets = [['normal', 'Normal'], ['color', 'Color'], ['scale', 'Scale'], ['panel', 'Panel'],
  ['pulse', 'Pulse'], ['bounce', 'Bounce'], ['shake', 'Shake']];
const targetFor = (state, id, selection = {preset: 'normal'}) => ({
  revision: state.revision, kind: 'caption', id, text: captions.find(row => row.id === id).text, selection,
  options: presets.map(([value, label]) => ({value, label, status: 'unchecked'})),
  peakOptions: [{id: 'peak-a', label: '一つ目の実測ピーク', displaySeconds: 1, status: 'unchecked'},
    {id: 'peak-b', label: '二つ目の実測ピーク', displaySeconds: 2, status: 'unchecked'}],
  ...(state.paletteOptions ? {paletteOptions: state.paletteOptions} : {}),
});
const response = (body, status = 200) => ({ok: status >= 200 && status < 300, status, json: async () => clone(body)});

function createService() {
  const service = {state: baseState(), checks: [], saves: [], requests: [], selections: new Map()};
  service.fetch = async (url, options = {}) => {
    assert.equal(options.credentials, 'same-origin');
    const method = options.method ?? 'GET', body = options.body ? JSON.parse(options.body) : undefined;
    service.requests.push({url: String(url), method, body: clone(body)});
    if (url === '/api/editing/state' && method === 'GET') return response(service.state);
    if (String(url).startsWith('/api/editing/targets/caption/') && method === 'GET') {
      const id = decodeURIComponent(String(url).slice('/api/editing/targets/caption/'.length));
      return response(targetFor(service.state, id, service.selections.get(id)));
    }
    assert.equal(options.headers?.['X-ZEV-Editing-Token'], 'fixture-token');
    if (url === '/api/editing/check' && method === 'POST') {
      assert.deepEqual(Object.keys(body).sort(), ['expectedRevision', 'itemId', 'kind', 'selection']);
      let complete;
      const promise = new Promise(resolve => {complete = resolve;});
      const check = {body, settled: false, resolve(status = 'applicable', extra = {}, httpStatus = 200) {
        assert.equal(check.settled, false, 'a check response is delivered once');
        check.settled = true;
        complete(response(httpStatus === 200 ? {revision: body.expectedRevision, kind: body.kind, itemId: body.itemId,
          selection: clone(body.selection), checkKey: 'fixture-check-' + service.checks.indexOf(check), status, ...extra}
          : extra, httpStatus));
      }};
      service.checks.push(check);
      return promise;
    }
    if (url === '/api/editing/save' && method === 'POST') {
      service.saves.push(clone(body));
      assert.equal(body.expectedRevision, service.state.revision);
      service.selections.set(body.itemId, clone(body.selection));
      service.state = {...service.state, revision: 'saved-' + service.saves.length};
      return response(service.state);
    }
    assert.fail('unexpected network operation in component-only test: ' + method + ' ' + url);
  };
  return service;
}

async function settle() {
  // Flush queued fetch json reads and Vue updates. No wall-clock delay or timing SLA.
  await new Promise(resolve => setImmediate(resolve));
  await vue.nextTick();
}
async function mount(t) {
  const service = createService(), root = new HostNode('root'), errors = [];
  const globals = new Map(['fetch', 'document', 'Document', 'ShadowRoot']
    .map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  Object.assign(globalThis, {fetch: service.fetch, document: {title: '', activeElement: null},
    Document: class TestDocument {}, ShadowRoot: class TestShadowRoot {}});
  const app = renderer.createApp(component);
  app.config.errorHandler = error => errors.push(error);
  const warnings = [];
  app.config.warnHandler = warning => warnings.push(warning);
  app.mount(root);
  t.after(async () => {
    app.unmount();
    for (const check of service.checks.filter(row => !row.settled)) check.resolve('failed', {reason: 'test cleanup'});
    await settle();
    for (const [name, descriptor] of globals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
    assert.deepEqual(errors, [], 'Vue component must not throw');
    assert.deepEqual(warnings, [], 'Vue component must not emit runtime warnings');
  });
  await settle();
  const find = predicate => {
    const nodes = walk(root).filter(predicate);
    assert.equal(nodes.length, 1, 'expected exactly one rendered control');
    return nodes[0];
  };
  const button = label => find(node => node.type === 'button' && textOf(node) === label);
  const label = (type, value) => find(node => node.type === type && node.props['aria-label'] === value);
  const isDisabled = node => Boolean(node.props.disabled
    || (node.parent && node.parent.type === 'fieldset' && node.parent.props.disabled)
    || (node.parent && isDisabledAncestor(node.parent)));
  const invoke = (node, type, extra = {}) => {
    assert.equal(isDisabled(node), false, 'rendered control is disabled: ' + textOf(node));
    const event = {target: node, currentTarget: node, preventDefault() {}, stopPropagation() {}, ...extra};
    const listeners = [...node.listeners.get(type) ?? []];
    const prop = node.props['on' + type[0].toUpperCase() + type.slice(1)];
    if (prop) listeners.push(...Array.isArray(prop) ? prop : [prop]);
    assert(listeners.length > 0, 'rendered control has no ' + type + ' event');
    for (const listener of listeners) {
      const result = listener(event);
      if (result && typeof result.catch === 'function') result.catch(error => errors.push(error));
    }
  };
  const click = async node => {invoke(node, 'click'); await settle();};
  const choose = async id => {
    const caption = captions.find(row => row.id === id);
    await click(find(node => node.type === 'button' && classHas(node, 'target-row')
      && walk(node).some(child => classHas(child, 'row-text') && textOf(child) === caption.text)));
  };
  const select = async (aria, value) => {
    const node = label('select', aria), option = node.options.find(row => row.props.value === value);
    assert(option, 'requested option is rendered'); assert.equal(Boolean(option.props.disabled), false);
    node.options.forEach(row => {row.selected = row === option;});
    node.value = value; invoke(node, 'change'); await settle();
  };
  const check = (id, selection, revision = service.state.revision) => {
    const matches = service.checks.filter(row => row.body.itemId === id && row.body.expectedRevision === revision
      && JSON.stringify(row.body.selection) === JSON.stringify(selection));
    assert.equal(matches.length, 1, 'selected input must have exactly one check request');
    return matches[0];
  };
  const editorText = () => textOf(find(node => node.props['aria-label'] === '選択対象の後修正'));
  const checkText = () => textOf(find(node => node.props['aria-label'] === '選んだ表現の適用確認'));
  return {root, service, find, button, label, isDisabled, invoke, click, choose, select, check, editorText, checkText};
}
function isDisabledAncestor(node) {
  return Boolean(node.type === 'fieldset' && node.props.disabled || node.parent && isDisabledAncestor(node.parent));
}
const saveLabel = 'この変更を保存';

test('component: target text and navigation remain available while a physical check is pending', async t => {
  const ui = await mount(t);
  await ui.choose('caption-a');
  const first = ui.check('caption-a', {preset: 'normal'});
  assert(ui.editorText().includes(captions[0].text));
  assert.equal(first.settled, false);
  await ui.choose('caption-b');
  assert(ui.editorText().includes(captions[1].text));
  await ui.select('変更する表現', 'panel');
  const current = ui.check('caption-b', {preset: 'panel'});
  first.resolve('inapplicable', {reason: 'OLD_TARGET_RESULT_MUST_NOT_APPEAR'});
  await settle();
  assert(!ui.editorText().includes('OLD_TARGET_RESULT_MUST_NOT_APPEAR'));
  assert(ui.checkText().includes('検査中'));
  assert.equal(ui.isDisabled(ui.button(saveLabel)), true);
  current.resolve('applicable');
  await settle();
  assert.equal(ui.isDisabled(ui.button(saveLabel)), false);
  await ui.click(ui.button(saveLabel));
  assert.deepEqual(ui.service.saves, [{expectedRevision: 'revision-1', kind: 'caption',
    itemId: 'caption-b', selection: {preset: 'panel'}}]);
});

test('component: late whole-Color and prior-range results cannot validate a changed Color range', async t => {
  const ui = await mount(t);
  await ui.choose('caption-a');
  await ui.select('変更する表現', 'color');
  const whole = ui.check('caption-a', {preset: 'color', scope: 'whole-caption'});
  const textarea = ui.label('textarea', '色を付ける原文の範囲');
  const selectRange = async (start, end) => {
    textarea.selectionStart = start; textarea.selectionEnd = end;
    ui.invoke(textarea, 'select'); await settle();
  };
  await selectRange(0, 2);
  const firstSelection = {preset: 'color', scope: 'partial-caption', startUtf16: 0, endUtf16: 2,
    selectedText: captions[0].text.slice(0, 2)};
  const firstRange = ui.check('caption-a', firstSelection);
  await selectRange(3, 5);
  const latestSelection = {preset: 'color', scope: 'partial-caption', startUtf16: 3, endUtf16: 5,
    selectedText: captions[0].text.slice(3, 5)};
  const latestRange = ui.check('caption-a', latestSelection);
  whole.resolve('applicable'); firstRange.resolve('applicable');
  await settle();
  assert(ui.checkText().includes('検査中'));
  assert.equal(ui.isDisabled(ui.button(saveLabel)), true);
  latestRange.resolve('applicable'); await settle();
  assert.equal(ui.isDisabled(ui.button(saveLabel)), false);
  await ui.click(ui.button(saveLabel));
  assert.deepEqual(ui.service.saves[0], {expectedRevision: 'revision-1', kind: 'caption',
    itemId: 'caption-a', selection: latestSelection});
});

test('component: a new saved revision invalidates an older pending check without overwriting the draft', async t => {
  const ui = await mount(t);
  await ui.choose('caption-a'); await ui.select('変更する表現', 'scale');
  const old = ui.check('caption-a', {preset: 'scale'});
  ui.service.state = {...ui.service.state, revision: 'revision-2'};
  await ui.click(ui.button('保存状態を再読込み'));
  old.resolve('applicable'); await settle();
  assert.equal(ui.label('select', '変更する表現').value, 'scale');
  assert.equal(ui.isDisabled(ui.button(saveLabel)), true);
  assert.equal(ui.service.saves.length, 0);
  assert(ui.editorText().includes('別の保存') || ui.editorText().includes('古い'));
  assert(ui.checkText().includes('再確認が必要'));
  await ui.click(ui.button('未保存入力を破棄して最新からやり直す'));
  await ui.select('変更する表現', 'scale');
  const current = ui.check('caption-a', {preset: 'scale'}, 'revision-2');
  assert.equal(ui.isDisabled(ui.button(saveLabel)), true);
  current.resolve('applicable'); await settle();
  await ui.click(ui.button(saveLabel));
  assert.equal(ui.service.saves[0].expectedRevision, 'revision-2');
});

test('component: a returned Pulse check failure stays distinct from inapplicability and preserves measured peaks', async t => {
  const ui = await mount(t);
  await ui.choose('caption-a'); await ui.select('変更する表現', 'pulse');
  await ui.select('時刻条件を満たす音のピーク', 'peak-a');
  const check = ui.check('caption-a', {preset: 'pulse', anchorPeakId: 'peak-a'});
  check.resolve('failed', {reason: '物理検査の実行に失敗しました（試験）'});
  await settle();
  assert(ui.editorText().includes('物理検査の実行に失敗しました（試験）'));
  assert(ui.checkText().includes('検査失敗'));
  assert(!ui.editorText().includes('使用できるピークがありません'));
  const peaks = ui.label('select', '時刻条件を満たす音のピーク').options.filter(node => node.props.value);
  assert.deepEqual(peaks.map(node => node.props.value), ['peak-a', 'peak-b']);
  assert.equal(ui.isDisabled(ui.button(saveLabel)), true);
  await ui.select('時刻条件を満たす音のピーク', 'peak-b');
  ui.check('caption-a', {preset: 'pulse', anchorPeakId: 'peak-b'}).resolve('inapplicable', {
    reason: 'このピークでの表示領域が安全域を超えます（試験）'});
  await settle();
  assert(ui.checkText().includes('適用不能'));
  assert(!ui.checkText().includes('検査失敗'));
  assert(ui.checkText().includes('このピークでの表示領域が安全域を超えます（試験）'));
  assert.equal(ui.isDisabled(ui.button(saveLabel)), true);
  assert.equal(ui.service.saves.length, 0);
});

test('component: a response that echoes another selection is stale and cannot enable saving', async t => {
  const ui = await mount(t);
  await ui.choose('caption-a'); await ui.select('変更する表現', 'panel');
  ui.check('caption-a', {preset: 'panel'}).resolve('applicable', {selection: {preset: 'scale'}});
  await settle();
  assert(ui.editorText().includes('別の入力'));
  assert.equal(ui.isDisabled(ui.button(saveLabel)), true);
  assert.equal(ui.service.saves.length, 0);
});

test('component: delayed Reset checking cannot save after the user moves to another target', async t => {
  const ui = await mount(t);
  await ui.choose('caption-a'); await ui.click(ui.button('自動案へ戻す'));
  const reset = ui.check('caption-a', 'Reset');
  await ui.choose('caption-b');
  assert(ui.editorText().includes(captions[1].text));
  reset.resolve('applicable'); await settle();
  assert.equal(ui.service.saves.length, 0);
  assert(ui.editorText().includes(captions[1].text));
  assert(ui.checkText().includes('検査中'));
});

test('component: paired palette choice is saved with its background and survives a target reload', async t => {
  const ui = await mount(t);
  ui.service.state.paletteOptions = [
    {id: 'ivory', label: 'アイボリー', backgroundColor: '#FFFDF8', fontColor: '#111827'},
    {id: 'cool', label: '寒色', backgroundColor: '#EAF4FF', fontColor: '#142B49'},
    {id: 'warm', label: '暖色', backgroundColor: '#FFF0DC', fontColor: '#4B2C16'},
    {id: 'dark', label: '暗地', backgroundColor: '#172338', fontColor: '#F8FAFC'},
  ];
  await ui.choose('caption-a'); await ui.select('変更する表現', 'panel');
  const first = ui.check('caption-a', {preset: 'panel', paletteId: 'ivory'});
  await ui.select('背景と文字の配色', 'dark');
  const selected = {preset: 'panel', paletteId: 'dark'};
  first.resolve('applicable'); await settle();
  assert.equal(ui.isDisabled(ui.button(saveLabel)), true, 'old palette check cannot validate the new palette');
  ui.check('caption-a', selected).resolve('applicable'); await settle();
  await ui.click(ui.button(saveLabel));
  assert.deepEqual(ui.service.saves[0].selection, selected);
  await ui.choose('caption-b'); await ui.choose('caption-a');
  assert.equal(ui.label('select', '背景と文字の配色').value, 'dark');
  assert.equal(ui.label('select', '変更する表現').value, 'panel');
});

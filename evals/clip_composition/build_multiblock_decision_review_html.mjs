import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = workspaceRoot();
const options = parseOptions(process.argv.slice(2));

function workspaceRoot() {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error('pnpm-workspace.yaml が見つかりません');
    }
    current = parent;
  }
}

function parseOptions(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      continue;
    }
    const inlineIndex = item.indexOf('=');
    if (inlineIndex >= 0) {
      values.set(item.slice(2, inlineIndex), item.slice(inlineIndex + 1));
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      values.set(key, 'true');
      continue;
    }
    values.set(key, next);
    index += 1;
  }

  const sourceHtml = resolveRequired(values, 'sourceHtml');
  const decisionTemplate = resolveRequired(values, 'decisionTemplate');
  const output = values.get('output')?.trim()
    ? resolvePath(values.get('output').trim())
    : path.join(path.dirname(sourceHtml), 'decision-review.html');
  if (path.dirname(sourceHtml) !== path.dirname(output)) {
    throw new Error('確認媒体の相対パスを維持するため、outputはsourceHtmlと同じディレクトリにしてください');
  }
  return {
    sourceHtml,
    decisionTemplate,
    output,
    checkedBy: values.get('checkedBy')?.trim() || 'kawafmm',
    checkedAt: values.get('checkedAt')?.trim() || localDate(new Date())
  };
}

function resolveRequired(values, key) {
  const value = values.get(key)?.trim();
  if (!value) {
    throw new Error(`--${key} を指定してください`);
  }
  return resolvePath(value);
}

function resolvePath(value) {
  return path.isAbsolute(value) ? value : path.join(root, value);
}

function localDate(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function option(value, label) {
  return `<option value="${value}">${label}</option>`;
}

function boundaryForm(boundary) {
  const id = boundary.boundaryIndex;
  return `
  <section class="decision-answer" data-boundary-answer="${id}">
    <h3>境界${id}の回答</h3>
    <p>4項目を動画で確認してください。判定不能は無理に合格へ寄せず、そのまま選べます。</p>
    <div class="decision-grid">
      <label>切り抜き連続再生で素材が切り替わるか
        <select data-boundary-field="clipSwitch">
          ${option('', '未回答')}
          ${option('true', '切り替わる')}
          ${option('false', '切り替わらない')}
          ${option('unresolved', '判定不能')}
        </select>
      </label>
      <label>元配信の対応位置が切り替わるか
        <select data-boundary-field="sourcePositionSwitches">
          ${option('', '未回答')}
          ${option('true', '別位置へ切り替わる')}
          ${option('false', '同じ位置に見える')}
          ${option('unresolved', '判定不能')}
        </select>
      </label>
      <label>境界前は切り抜きと元配信で同じ素材か
        <select data-boundary-field="beforeMatches">
          ${option('', '未回答')}
          ${option('true', '同じ素材')}
          ${option('false', '違う素材')}
          ${option('unresolved', '判定不能')}
        </select>
      </label>
      <label>境界後は切り抜きと元配信で同じ素材か
        <select data-boundary-field="afterMatches">
          ${option('', '未回答')}
          ${option('true', '同じ素材')}
          ${option('false', '違う素材')}
          ${option('unresolved', '判定不能')}
        </select>
      </label>
    </div>
    <label>境界メモ
      <textarea data-boundary-field="note" placeholder="不一致・判定不能・crossfadeなど、後で判断根拠になることだけ記録"></textarea>
    </label>
    <p class="answer-state" data-boundary-state="${id}">未回答</p>
  </section>`;
}

function blockRows(blocks) {
  return blocks.map((block) => `
      <tr data-block-row="${block.blockIndex}">
        <td>${block.blockIndex}</td>
        <td>${block.clipRange.startMs}-${block.clipRange.endMs}</td>
        <td>${block.sourceRange.startMs}-${block.sourceRange.endMs}</td>
        <td>
          <select data-block-field="status">
            ${option('pending', '未回答')}
            ${option('accepted', '採用')}
            ${option('rejected', '不採用')}
            ${option('unresolved', '判定不能')}
          </select>
        </td>
        <td><textarea data-block-field="note" placeholder="不採用・判定不能では理由必須"></textarea></td>
      </tr>`).join('');
}

function finalForm(template) {
  return `
  <section class="decision-final" id="decision-final">
    <h2>最終確認とdecision JSON</h2>
    <p>境界回答からブロック状態を埋めた後、各ブロックの採否を人間が確認してください。自動提案は確定ではありません。</p>
    <div class="decision-actions">
      <button type="button" id="derive-blocks">境界回答からブロック状態を埋める</button>
    </div>
    <div class="block-table-wrap">
      <table class="block-decision-table">
        <thead><tr><th>block</th><th>clip ms</th><th>source ms</th><th>人間判定</th><th>理由・メモ</th></tr></thead>
        <tbody>${blockRows(template.blocks)}</tbody>
      </table>
    </div>
    <div class="decision-grid final-fields">
      <label>確認者
        <input id="checked-by" value="${escapeHtml(options.checkedBy)}">
      </label>
      <label>確認日
        <input id="checked-at" type="date" value="${escapeHtml(options.checkedAt)}">
      </label>
      <label class="wide">固定テーマ1行
        <input id="fixed-theme" placeholder="採用区間から人間が逆算したテーマ。候補LLMの文をそのまま使わない">
      </label>
      <label class="wide">全体メモ
        <textarea id="confirmation-note" placeholder="確認手段の限界、crossfade、除外理由など"></textarea>
      </label>
    </div>
    <label class="freeze-consent">
      <input type="checkbox" id="freeze-consent">
      この回答を凍結候補として確定する。実際のfixture/expected書き込みは、別工程のpost-human dry-run後に行う。
    </label>
    <div class="decision-actions">
      <button type="button" id="build-decision">回答を検査してJSONを作る</button>
      <button type="button" id="copy-summary">回答文をコピー</button>
      <button type="button" id="copy-decision">JSONをコピー</button>
      <button type="button" id="download-decision">JSONを保存</button>
      <button type="button" class="secondary" id="clear-saved">この画面の保存回答を消す</button>
    </div>
    <div id="validation-summary" class="validation-summary"></div>
    <h3>チャットへ返す回答</h3>
    <textarea id="review-summary" readonly placeholder="確認結果をまとめると、ここにチャットへ貼れる回答が出ます"></textarea>
    <h3>凍結用decision JSON</h3>
    <textarea id="decision-output" readonly placeholder="入力内容を検査すると、凍結用decision JSONがここに出ます"></textarea>
    <p id="copy-status" class="copy-status"></p>
  </section>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function styles() {
  return `
    :root { --ink: #172033; --muted: #5f6b7a; --line: #d8dee8; --blue: #2563eb; --blue-soft: #eff6ff; --ok: #166534; --ok-soft: #f0fdf4; --warn: #9a3412; --warn-soft: #fff7ed; --bad: #991b1b; --bad-soft: #fef2f2; }
    body { max-width: 1240px; margin: 0 auto !important; padding: 28px 24px 80px; background: #f8fafc; color: var(--ink) !important; }
    body > h1 { margin-top: 74px; }
    article, .decision-final, .decision-meta { background: white; border: 1px solid var(--line); border-radius: 14px; padding: 22px; box-shadow: 0 6px 22px rgba(15, 23, 42, .06); }
    article { border-top: 1px solid var(--line) !important; }
    .decision-progress { position: fixed; z-index: 20; top: 0; left: 0; right: 0; display: flex; justify-content: center; gap: 22px; padding: 13px 20px; color: white; background: rgba(15, 23, 42, .96); backdrop-filter: blur(8px); font-weight: 700; }
    .decision-meta { margin: 18px 0 24px; background: linear-gradient(135deg, #eff6ff, #fff); }
    .decision-meta p { color: var(--muted); }
    .decision-answer { margin: 18px 0; padding: 18px; border: 2px solid #bfdbfe; border-radius: 12px; background: var(--blue-soft); }
    .decision-answer h3 { margin-top: 0; }
    .decision-grid { display: grid; grid-template-columns: repeat(2, minmax(260px, 1fr)); gap: 14px 18px; }
    .decision-grid label, .decision-answer > label, .decision-final label { display: grid; gap: 6px; color: #334155; font-weight: 650; }
    .decision-grid .wide { grid-column: 1 / -1; }
    select, input, textarea { box-sizing: border-box; width: 100%; padding: 9px 11px; border: 1px solid #aeb8c6; border-radius: 8px; background: white; color: #172033; font: inherit; }
    textarea { min-height: 72px; resize: vertical; }
    select:focus, input:focus, textarea:focus { outline: 3px solid rgba(37, 99, 235, .18); border-color: var(--blue); }
    .answer-state { display: inline-block; margin-bottom: 0; padding: 5px 9px; border-radius: 999px; color: var(--warn); background: var(--warn-soft); font-weight: 700; }
    .answer-state.confirmed { color: var(--ok); background: var(--ok-soft); }
    .answer-state.rejected { color: var(--bad); background: var(--bad-soft); }
    .decision-final { margin-top: 32px; }
    .decision-actions { display: flex; flex-wrap: wrap; gap: 10px; margin: 16px 0; }
    button { border: 0; border-radius: 9px; padding: 10px 15px; color: white; background: var(--blue); font: inherit; font-weight: 750; cursor: pointer; }
    button.secondary, #clear-saved { color: #334155; background: #e2e8f0; }
    button:hover { filter: brightness(.96); }
    .block-table-wrap { overflow-x: auto; }
    .block-decision-table { width: 100%; }
    .block-decision-table textarea { min-width: 280px; min-height: 48px; }
    .block-decision-table td { text-align: left; }
    .final-fields { margin-top: 20px; }
    .freeze-consent { display: flex !important; grid-template-columns: auto 1fr; align-items: start; margin: 20px 0; padding: 14px; border: 1px solid #f59e0b; background: #fffbeb; border-radius: 9px; }
    .freeze-consent input { width: auto; margin-top: 3px; }
    .validation-summary { margin: 15px 0; padding: 14px; border-radius: 9px; background: #f1f5f9; }
    .validation-summary.ok { color: var(--ok); background: var(--ok-soft); }
    .validation-summary.bad { color: var(--bad); background: var(--bad-soft); }
    #review-summary { width: 100%; min-height: 260px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
    #decision-output { width: 100%; min-height: 420px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    .copy-status { min-height: 1.4em; color: var(--ok); font-weight: 700; }
    details.optional-evidence { margin: 12px 0; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; }
    @media (max-width: 820px) { .decision-grid { grid-template-columns: 1fr; } .decision-grid .wide { grid-column: auto; } .decision-progress { justify-content: flex-start; overflow-x: auto; } }
  `.trim();
}

function topPanel(template) {
  return `
  <div class="decision-progress">
    <span id="boundary-progress">境界 0/${template.boundaries.length}</span>
    <span id="block-progress">ブロック 0/${template.blocks.length}</span>
    <span id="save-state">自動保存待ち</span>
  </div>
  <section class="decision-meta">
    <h2>この画面で行うこと</h2>
    <p>動画を見ながら境界1から順に4項目へ回答します。最後に17ブロックの採否と固定テーマを確認すると、凍結処理が直接読めるdecision JSONを出力します。</p>
    <ul>
      <li>回答はこのブラウザー内へ自動保存されます。</li>
      <li>判定不能・不一致を選んでも構いません。理由を残し、凍結を止めるための選択肢です。</li>
      <li>このHTML自身はfixture/expectedへ書き込みません。</li>
      <li>JSON生成後も、実凍結前に書き込みなしのpost-human dry-runを行います。</li>
    </ul>
  </section>`;
}

function script(template) {
  const embedded = JSON.stringify(template).replaceAll('<', '\\u003c');
  return `
  <script id="decision-template" type="application/json">${embedded}</script>
  <script>
    (() => {
      const template = JSON.parse(document.getElementById('decision-template').textContent);
      const storageKey = 'zev-multiblock-decision-review:' + template.fixtureId + ':' + template.evidence.materialBlocksSha256;
      const boundaryFields = ['clipSwitch', 'sourcePositionSwitches', 'beforeMatches', 'afterMatches'];

      function boundarySection(index) {
        return document.querySelector('[data-boundary-answer="' + index + '"]');
      }

      function boundaryValue(index, field) {
        return boundarySection(index)?.querySelector('[data-boundary-field="' + field + '"]')?.value || '';
      }

      function toBoolean(value) {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return null;
      }

      function boundaryResult(boundary) {
        const id = boundary.boundaryIndex;
        const values = Object.fromEntries(boundaryFields.map((field) => [field, boundaryValue(id, field)]));
        const noteInput = boundaryValue(id, 'note').trim();
        const answered = boundaryFields.every((field) => values[field]);
        const allConfirmed = answered && boundaryFields.every((field) => values[field] === 'true');
        const hasUnresolved = boundaryFields.some((field) => values[field] === 'unresolved');
        const status = !answered ? 'pending' : allConfirmed ? 'confirmed' : hasUnresolved ? 'unresolved' : 'rejected';
        const facts = [
          'clip連続再生=' + (values.clipSwitch || '未回答'),
          'source位置切替=' + (values.sourcePositionSwitches || '未回答'),
          '前側対応=' + (values.beforeMatches || '未回答'),
          '後側対応=' + (values.afterMatches || '未回答')
        ];
        const note = facts.join(' / ') + (noteInput ? ' / メモ=' + noteInput : '');
        return {
          ...boundary,
          status,
          beforeMatches: toBoolean(values.beforeMatches),
          afterMatches: toBoolean(values.afterMatches),
          sourcePositionSwitches: toBoolean(values.sourcePositionSwitches),
          note,
          _ui: { ...values, answered, facts }
        };
      }

      function setBoundaryState(index) {
        const result = boundaryResult(template.boundaries[index - 1]);
        const element = document.querySelector('[data-boundary-state="' + index + '"]');
        if (!element) return;
        element.className = 'answer-state';
        if (result.status === 'confirmed') {
          element.textContent = '4項目とも確認済み';
          element.classList.add('confirmed');
        } else if (result.status === 'rejected') {
          element.textContent = '不一致あり。凍結前に扱いの確認が必要';
          element.classList.add('rejected');
        } else if (result.status === 'unresolved') {
          element.textContent = '判定不能あり。凍結を止める';
        } else {
          const answered = result._ui.facts.filter((fact) => !fact.endsWith('未回答')).length;
          element.textContent = '回答 ' + answered + '/4';
        }
      }

      function blockControl(index, field) {
        return document.querySelector('[data-block-row="' + index + '"] [data-block-field="' + field + '"]');
      }

      function deriveBlocks() {
        for (const block of template.blocks) {
          const refs = [];
          if (block.blockIndex > 1) {
            refs.push({ boundary: block.blockIndex - 1, side: 'afterMatches', value: boundaryValue(block.blockIndex - 1, 'afterMatches') });
          }
          if (block.blockIndex <= template.boundaries.length) {
            refs.push({ boundary: block.blockIndex, side: 'beforeMatches', value: boundaryValue(block.blockIndex, 'beforeMatches') });
          }
          let status = 'pending';
          if (refs.every((ref) => ref.value === 'true')) {
            status = 'accepted';
          } else if (refs.some((ref) => ref.value === 'false')) {
            status = 'rejected';
          } else if (refs.every((ref) => ref.value) && refs.some((ref) => ref.value === 'unresolved')) {
            status = 'unresolved';
          }
          const reasons = refs
            .filter((ref) => ref.value !== 'true')
            .map((ref) => '境界' + ref.boundary + 'の' + (ref.side === 'beforeMatches' ? '前側' : '後側') + '=' + (ref.value || '未回答'));
          blockControl(block.blockIndex, 'status').value = status;
          blockControl(block.blockIndex, 'note').value = status === 'accepted' || status === 'pending' ? '' : reasons.join(' / ');
        }
        saveState();
        updateProgress();
      }

      function blockResult(block) {
        return {
          ...block,
          status: blockControl(block.blockIndex, 'status').value,
          note: blockControl(block.blockIndex, 'note').value.trim()
        };
      }

      function collectState() {
        const controls = [...document.querySelectorAll('select, input, textarea')].filter((control) => !['decision-output', 'review-summary'].includes(control.id));
        const state = {};
        controls.forEach((control, index) => {
          const key = control.id || control.dataset.boundaryField || control.dataset.blockField || 'control-' + index;
          const boundary = control.closest('[data-boundary-answer]')?.dataset.boundaryAnswer || '';
          const block = control.closest('[data-block-row]')?.dataset.blockRow || '';
          state[boundary + ':' + block + ':' + key + ':' + index] = control.type === 'checkbox' ? control.checked : control.value;
        });
        return state;
      }

      function restoreState() {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        try {
          const state = JSON.parse(raw);
          const controls = [...document.querySelectorAll('select, input, textarea')].filter((control) => !['decision-output', 'review-summary'].includes(control.id));
          controls.forEach((control, index) => {
            const key = control.id || control.dataset.boundaryField || control.dataset.blockField || 'control-' + index;
            const boundary = control.closest('[data-boundary-answer]')?.dataset.boundaryAnswer || '';
            const block = control.closest('[data-block-row]')?.dataset.blockRow || '';
            const value = state[boundary + ':' + block + ':' + key + ':' + index];
            if (value === undefined) return;
            if (control.type === 'checkbox') control.checked = Boolean(value);
            else control.value = value;
          });
        } catch {
          localStorage.removeItem(storageKey);
        }
      }

      function saveState() {
        localStorage.setItem(storageKey, JSON.stringify(collectState()));
        const state = document.getElementById('save-state');
        state.textContent = '回答を保存済み';
        window.clearTimeout(saveState.timeout);
        saveState.timeout = window.setTimeout(() => { state.textContent = '自動保存中'; }, 1200);
      }

      function updateProgress() {
        const boundaries = template.boundaries.map(boundaryResult);
        boundaries.forEach((boundary) => setBoundaryState(boundary.boundaryIndex));
        const answered = boundaries.filter((boundary) => boundary._ui.answered).length;
        const blocks = template.blocks.map(blockResult);
        const decided = blocks.filter((block) => block.status !== 'pending').length;
        document.getElementById('boundary-progress').textContent = '境界 ' + answered + '/' + boundaries.length;
        document.getElementById('block-progress').textContent = 'ブロック ' + decided + '/' + blocks.length;
      }

      function validate(decision, boundaryUi) {
        const issues = [];
        if (!decision.humanConfirmation.checkedBy) issues.push('確認者が未入力');
        if (!decision.humanConfirmation.checkedAt) issues.push('確認日が未入力');
        if (!decision.humanConfirmation.allBoundariesReviewed) issues.push('未回答の境界がある');
        if (!decision.humanConfirmation.allBlocksReviewed) issues.push('未回答のブロックがある');
        if (!decision.fixedTheme.title) issues.push('固定テーマ1行が未入力');
        if (!decision.blocks.some((block) => block.status === 'accepted')) issues.push('採用ブロックが1件もない');
        for (const block of decision.blocks) {
          if ((block.status === 'rejected' || block.status === 'unresolved') && !block.note) {
            issues.push('block ' + block.blockIndex + ' の不採用・判定不能理由がない');
          }
        }
        for (const boundary of decision.boundaries) {
          if ((boundary.status === 'rejected' || boundary.status === 'unresolved') && !boundary.note) {
            issues.push('境界' + boundary.boundaryIndex + ' の不一致・判定不能理由がない');
          }
          if (boundary.status === 'confirmed' && boundaryUi[boundary.boundaryIndex].clipSwitch !== 'true') {
            issues.push('境界' + boundary.boundaryIndex + ' は切り抜き側の切替確認がない');
          }
        }
        const accepted = new Set(decision.blocks.filter((block) => block.status === 'accepted').map((block) => block.blockIndex));
        for (const boundary of decision.boundaries) {
          if (accepted.has(boundary.beforeBlockIndex) && accepted.has(boundary.afterBlockIndex) && boundary.status !== 'confirmed') {
            issues.push('採用block ' + boundary.beforeBlockIndex + '/' + boundary.afterBlockIndex + ' 間の境界' + boundary.boundaryIndex + 'が未確定');
          }
        }
        if (!document.getElementById('freeze-consent').checked) issues.push('凍結候補として確定するチェックが未入力');
        return [...new Set(issues)];
      }

      function buildDecision() {
        const decision = structuredClone(template);
        const boundariesWithUi = template.boundaries.map(boundaryResult);
        const boundaryUi = Object.fromEntries(boundariesWithUi.map((boundary) => [boundary.boundaryIndex, boundary._ui]));
        decision.boundaries = boundariesWithUi.map(({ _ui, ...boundary }) => boundary);
        decision.blocks = template.blocks.map(blockResult);
        decision.humanConfirmation = {
          checkedBy: document.getElementById('checked-by').value.trim(),
          checkedAt: document.getElementById('checked-at').value,
          method: '境界確認パッケージの動画・音声確認と入力HTMLによる記録',
          allBlocksReviewed: decision.blocks.every((block) => block.status !== 'pending'),
          allBoundariesReviewed: boundariesWithUi.every((boundary) => boundary._ui.answered),
          note: document.getElementById('confirmation-note').value.trim()
        };
        const theme = document.getElementById('fixed-theme').value.trim();
        decision.fixedTheme.title = theme;
        decision.fixedTheme.summary = theme;
        decision.readyForFreeze = false;
        const issues = validate(decision, boundaryUi);
        decision.readyForFreeze = issues.length === 0;
        const acceptedBlocks = decision.blocks.filter((block) => block.status === 'accepted').map((block) => block.blockIndex);
        const excludedBlocks = decision.blocks.filter((block) => block.status !== 'accepted').map((block) => block.blockIndex + ':' + block.status);
        const summaryLines = [
          'B素材 nOEWCNc77MI 人間確認結果',
          '確認者: ' + (decision.humanConfirmation.checkedBy || '未入力'),
          '確認日: ' + (decision.humanConfirmation.checkedAt || '未入力'),
          '',
          ...decision.boundaries.map((boundary) => '境界' + boundary.boundaryIndex + ': ' + boundary.status + ' / ' + boundary.note),
          '',
          '採用block: ' + (acceptedBlocks.length ? acceptedBlocks.join(', ') : 'なし'),
          '除外・判定不能block: ' + (excludedBlocks.length ? excludedBlocks.join(', ') : 'なし'),
          '固定テーマ: ' + (decision.fixedTheme.title || '未入力'),
          'readyForFreeze: ' + decision.readyForFreeze,
          ...(issues.length ? ['', '未完了:', ...issues.map((issue) => '- ' + issue)] : [])
        ];
        document.getElementById('review-summary').value = summaryLines.join('\\n') + '\\n';
        document.getElementById('decision-output').value = JSON.stringify(decision, null, 2) + '\\n';
        const summary = document.getElementById('validation-summary');
        summary.className = 'validation-summary ' + (issues.length ? 'bad' : 'ok');
        summary.innerHTML = issues.length
          ? '<strong>まだ凍結候補にできません</strong><ul>' + issues.map((issue) => '<li>' + escapeText(issue) + '</li>').join('') + '</ul>'
          : '<strong>入力完了</strong><p>decision JSONはpost-human dry-runへ渡せる状態です。このHTMLからfixture/expectedへは書き込んでいません。</p>';
        saveState();
        return { decision, issues };
      }

      function escapeText(value) {
        const div = document.createElement('div');
        div.textContent = value;
        return div.innerHTML;
      }

      async function copyDecision() {
        const { decision } = buildDecision();
        const text = JSON.stringify(decision, null, 2) + '\\n';
        try {
          await navigator.clipboard.writeText(text);
          document.getElementById('copy-status').textContent = 'JSONをコピーしました。';
        } catch {
          const output = document.getElementById('decision-output');
          output.focus();
          output.select();
          document.execCommand('copy');
          document.getElementById('copy-status').textContent = 'JSONを選択しました。コピーできない場合は手動でコピーしてください。';
        }
      }

      async function copySummary() {
        buildDecision();
        const text = document.getElementById('review-summary').value;
        try {
          await navigator.clipboard.writeText(text);
          document.getElementById('copy-status').textContent = 'チャット用回答をコピーしました。';
        } catch {
          const output = document.getElementById('review-summary');
          output.focus();
          output.select();
          document.execCommand('copy');
          document.getElementById('copy-status').textContent = '回答を選択しました。コピーできない場合は手動でコピーしてください。';
        }
      }

      function downloadDecision() {
        const { decision } = buildDecision();
        const blob = new Blob([JSON.stringify(decision, null, 2) + '\\n'], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = template.fixtureId + '-human-decision.json';
        link.click();
        URL.revokeObjectURL(url);
      }

      document.addEventListener('input', (event) => {
        if (event.target.matches('select, input, textarea') && !['decision-output', 'review-summary'].includes(event.target.id)) {
          saveState();
          updateProgress();
        }
      });
      document.addEventListener('change', (event) => {
        if (event.target.matches('select, input, textarea') && !['decision-output', 'review-summary'].includes(event.target.id)) {
          saveState();
          updateProgress();
        }
      });
      document.getElementById('derive-blocks').addEventListener('click', deriveBlocks);
      document.getElementById('build-decision').addEventListener('click', buildDecision);
      document.getElementById('copy-summary').addEventListener('click', copySummary);
      document.getElementById('copy-decision').addEventListener('click', copyDecision);
      document.getElementById('download-decision').addEventListener('click', downloadDecision);
      document.getElementById('clear-saved').addEventListener('click', () => {
        if (!window.confirm('この画面に自動保存した回答を消しますか？')) return;
        localStorage.removeItem(storageKey);
        window.location.reload();
      });
      restoreState();
      updateProgress();
    })();
  </script>`;
}

async function main() {
  const [sourceHtml, templateText] = await Promise.all([
    readFile(options.sourceHtml, 'utf8'),
    readFile(options.decisionTemplate, 'utf8')
  ]);
  const template = JSON.parse(templateText);
  assert(template.kind === 'clip_composition_multiblock_material_human_decision', `decision template kindが不正です: ${template.kind}`);
  assert(template.blocks?.length >= 2, 'decision templateに複数blockがありません');
  assert(template.boundaries?.length === template.blocks.length - 1, 'decision templateのblock/boundary数が不正です');
  const headings = [...sourceHtml.matchAll(/<h2>境界(\d+):/g)].map((match) => Number.parseInt(match[1], 10));
  assert(headings.length === template.boundaries.length, `HTML境界数とdecision templateが一致しません: ${headings.length}/${template.boundaries.length}`);

  let html = sourceHtml;
  html = html.replace('</style>', `${styles()}\n  </style>`);
  html = html.replace(/(<h1>[^<]+<\/h1>)/, `$1\n${topPanel(template)}`);
  for (const boundary of template.boundaries) {
    const headingPattern = new RegExp(`(<h2>境界${boundary.boundaryIndex}:.*?<\\/h2>)`);
    assert(headingPattern.test(html), `境界${boundary.boundaryIndex}見出しがありません`);
    html = html.replace(headingPattern, `$1\n${boundaryForm(boundary)}`);
  }
  html = html.replace('</body>', `${finalForm(template)}\n${script(template)}\n</body>`);
  await writeFile(options.output, html, 'utf8');
  console.log(`output: ${path.relative(root, options.output)}`);
  console.log(`fixture: ${template.fixtureId}`);
  console.log(`blocks: ${template.blocks.length}`);
  console.log(`boundaries: ${template.boundaries.length}`);
  console.log('fixture/expected writes: none');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

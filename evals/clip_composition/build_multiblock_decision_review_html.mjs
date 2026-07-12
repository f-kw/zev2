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
    <h3>確認${id}の答え</h3>
    <p>上の2本、下の2本を見て答えてください。迷ったら「わからない」で大丈夫です。</p>
    <div class="decision-grid">
      <label>1. 上の左：ここで途中を飛ばし、別の時刻へジャンプしたように見えますか？
        <select data-boundary-field="clipSwitch">
          ${option('', '未回答')}
          ${option('true', 'はい、時間がジャンプした')}
          ${option('false', 'いいえ、元配信の時間どおり続いている')}
          ${option('unresolved', 'わからない')}
        </select>
      </label>
      <label>2. 上の右：前半と後半は、元配信の別の所ですか？
        <select data-boundary-field="sourcePositionSwitches">
          ${option('', '未回答')}
          ${option('true', 'はい、別の所')}
          ${option('false', 'いいえ、同じ所の続き')}
          ${option('unresolved', 'わからない')}
        </select>
      </label>
      <label>3. 下の左：左右は同じ会話・場面ですか？
        <select data-boundary-field="beforeMatches">
          ${option('', '未回答')}
          ${option('true', 'はい、同じ')}
          ${option('false', 'いいえ、違う')}
          ${option('unresolved', 'わからない')}
        </select>
      </label>
      <label>4. 下の右：左右は同じ会話・場面ですか？
        <select data-boundary-field="afterMatches">
          ${option('', '未回答')}
          ${option('true', 'はい、同じ')}
          ${option('false', 'いいえ、違う')}
          ${option('unresolved', 'わからない')}
        </select>
      </label>
    </div>
    <label>気づいたこと（なければ空欄）
      <textarea data-boundary-field="note" placeholder="例：音は同じだが画面だけ切り替わる。途中で少し重なっている。"></textarea>
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
            ${option('pending', '未確認')}
            ${option('accepted', '正しい')}
            ${option('rejected', '違う')}
            ${option('unresolved', 'わからない')}
          </select>
        </td>
        <td><textarea data-block-field="note" placeholder="「違う」「わからない」のときだけ理由を書く"></textarea></td>
      </tr>`).join('');
}

function finalForm(template) {
  const blockCount = template.blocks.length;
  return `
  <section class="decision-final" id="decision-final">
    <h2>最後の確認</h2>
    <p>機械が「切り抜きは元配信のこの${blockCount}か所を使った」と予想しています。下のボタンで、さきほどの回答から${blockCount}か所を仮入力します。基本は内容を見るだけで、違う所やわからない所があれば直してください。</p>
    <div class="decision-actions">
      <button type="button" id="derive-blocks">さきほどの回答から${blockCount}か所を仮入力する</button>
    </div>
    <div class="block-table-wrap">
      <table class="block-decision-table">
        <thead><tr><th>候補</th><th>切り抜き内の時刻</th><th>元配信内の時刻</th><th>この候補は正しい？</th><th>違う・わからない理由</th></tr></thead>
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
      <label class="wide">この切り抜きは、何についての動画ですか？ 1文で入力
        <input id="fixed-theme" placeholder="例：マリンところねがRaftでじゃれ合いながら船を作る場面">
      </label>
      <label class="wide">全体を通して気づいたこと（なければ空欄）
        <textarea id="confirmation-note" placeholder="例：確認8だけ画面が重なっていて判断しづらい"></textarea>
      </label>
    </div>
    <label class="freeze-consent">
      <input type="checkbox" id="freeze-consent">
      以上の回答で次の確認へ進んでよい。ここにチェックしても、まだ正解データの書き込みは行いません。
    </label>
    <div class="decision-actions">
      <button type="button" id="build-decision">未回答を確認して結果を作る</button>
      <button type="button" id="copy-summary">チャットに返す文をコピー</button>
      <button type="button" id="copy-decision">作業用JSONをコピー</button>
      <button type="button" id="download-decision">作業用JSONを保存</button>
      <button type="button" class="secondary" id="clear-saved">入力を最初からやり直す</button>
    </div>
    <div id="validation-summary" class="validation-summary"></div>
    <h3>チャットへ返す回答</h3>
    <textarea id="review-summary" readonly placeholder="確認結果をまとめると、ここにチャットへ貼れる回答が出ます"></textarea>
    <h3>作業用JSON（通常は見なくてよい）</h3>
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
    body > h2:first-of-type, body > h2:first-of-type + table { display: none; }
    article > table, section.strip { display: none; }
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
  const blockCount = template.blocks.length;
  const boundaryCount = template.boundaries.length;
  return `
  <div class="decision-progress">
    <span id="boundary-progress">時間ジャンプ 0/${template.boundaries.length}</span>
    <span id="block-progress">使用箇所 0/${template.blocks.length}</span>
    <span id="save-state">自動保存待ち</span>
  </div>
  <section class="decision-meta">
    <h2>何を確認する画面？</h2>
    <p>この切り抜きは、元配信の${blockCount}か所をつないで作られていると機械が予想しました。その予想が本当に合っているかを、${boundaryCount}個の「元配信の時間がジャンプした所」で確認します。</p>
    <p><strong>話題が変わったかは見ません。</strong>話題が変わっても元配信が時間どおり続いていれば「ジャンプしていない」です。同じ話題の途中でも、編集で間を飛ばして別の時刻へつないでいれば「ジャンプした」です。</p>
    <p><strong>各番号で見る動画は4本だけです。</strong></p>
    <ol>
      <li><strong>上の左</strong>：切り抜きだけを見る。編集で途中を飛ばし、別の時刻へジャンプしたように見えるか。</li>
      <li><strong>上の右</strong>：元配信の前半と後半をつないだ動画。別の所へ飛んでいるか。</li>
      <li><strong>下の左</strong>：切り替わる前。左右が同じ会話・場面か。</li>
      <li><strong>下の右</strong>：切り替わった後。左右が同じ会話・場面か。</li>
    </ol>
    <p>口の動きが完全に同じか、数秒の細かい違いまでは見なくて大丈夫です。迷ったら「わからない」を選んでください。</p>
    <ul>
      <li>回答はこのブラウザー内へ自動保存されます。</li>
      <li>「違う」「わからない」を選んでも問題ありません。正解データを間違って作らないための回答です。</li>
      <li>この画面へ入力しても、まだ正解データは書き込まれません。</li>
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
          element.textContent = '4つとも「はい」';
          element.classList.add('confirmed');
        } else if (result.status === 'rejected') {
          element.textContent = '「いいえ」があります。ここは後で確認します';
          element.classList.add('rejected');
        } else if (result.status === 'unresolved') {
          element.textContent = '「わからない」があります。ここは正解に入れません';
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
        document.getElementById('boundary-progress').textContent = '時間ジャンプ ' + answered + '/' + boundaries.length;
        document.getElementById('block-progress').textContent = '使用箇所 ' + decided + '/' + blocks.length;
      }

      function validate(decision, boundaryUi) {
        const issues = [];
        if (!decision.humanConfirmation.checkedBy) issues.push('確認した人の名前がありません');
        if (!decision.humanConfirmation.checkedAt) issues.push('確認した日がありません');
        if (!decision.humanConfirmation.allBoundariesReviewed) issues.push('${template.boundaries.length}個の時間ジャンプ確認に未回答があります');
        if (!decision.humanConfirmation.allBlocksReviewed) issues.push('${template.blocks.length}個の使用箇所に未確認があります');
        if (!decision.fixedTheme.title) issues.push('「この切り抜きは何についての動画か」が未入力です');
        if (!decision.blocks.some((block) => block.status === 'accepted')) issues.push('正しいと確認できた使用箇所がありません');
        for (const block of decision.blocks) {
          if ((block.status === 'rejected' || block.status === 'unresolved') && !block.note) {
            issues.push('使用箇所' + block.blockIndex + 'の「違う・わからない」理由がありません');
          }
        }
        for (const boundary of decision.boundaries) {
          if ((boundary.status === 'rejected' || boundary.status === 'unresolved') && !boundary.note) {
            issues.push('確認' + boundary.boundaryIndex + 'の「違う・わからない」理由がありません');
          }
          if (boundary.status === 'confirmed' && boundaryUi[boundary.boundaryIndex].clipSwitch !== 'true') {
            issues.push('確認' + boundary.boundaryIndex + 'で、切り抜き側の時間ジャンプが「はい」になっていません');
          }
        }
        const accepted = new Set(decision.blocks.filter((block) => block.status === 'accepted').map((block) => block.blockIndex));
        for (const boundary of decision.boundaries) {
          if (accepted.has(boundary.beforeBlockIndex) && accepted.has(boundary.afterBlockIndex) && boundary.status !== 'confirmed') {
            issues.push('正しい使用箇所' + boundary.beforeBlockIndex + 'と' + boundary.afterBlockIndex + 'の間の確認' + boundary.boundaryIndex + 'が終わっていません');
          }
        }
        if (!document.getElementById('freeze-consent').checked) issues.push('「以上の回答で次の確認へ進んでよい」にチェックがありません');
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
        const boundaryStatusText = { confirmed: '問題なし', rejected: '違う可能性あり', unresolved: 'わからない', pending: '未回答' };
        const blockStatusText = { accepted: '正しい', rejected: '違う', unresolved: 'わからない', pending: '未確認' };
        const summaryLines = [
          '${template.targetId} 人間確認結果',
          '確認者: ' + (decision.humanConfirmation.checkedBy || '未入力'),
          '確認日: ' + (decision.humanConfirmation.checkedAt || '未入力'),
          '',
          ...decision.boundaries.map((boundary) => '確認' + boundary.boundaryIndex + ': ' + boundaryStatusText[boundary.status] + ' / ' + boundary.note),
          '',
          '正しい使用箇所: ' + (acceptedBlocks.length ? acceptedBlocks.join(', ') : 'なし'),
          '違う・わからない使用箇所: ' + (excludedBlocks.length ? decision.blocks.filter((block) => block.status !== 'accepted').map((block) => block.blockIndex + ':' + blockStatusText[block.status]).join(', ') : 'なし'),
          'この切り抜きの内容: ' + (decision.fixedTheme.title || '未入力'),
          '次の確認へ進める: ' + (decision.readyForFreeze ? 'はい' : 'いいえ'),
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
  html = html.replace(/  <section class="instructions">[\s\S]*?<\/section>/, '');
  const pageLabel = `${template.targetId}：切り抜きと元配信の確認`;
  html = html.replace(/<title>[^<]+<\/title>/, `<title>${escapeHtml(pageLabel)}</title>`);
  html = html.replace(/<h1>[^<]+<\/h1>/, `<h1>${escapeHtml(pageLabel)}</h1>`);
  html = html.replace('</style>', `${styles()}\n  </style>`);
  html = html.replace(/(<h1>[^<]+<\/h1>)/, `$1\n${topPanel(template)}`);
  for (const boundary of template.boundaries) {
    const headingPattern = new RegExp(`(<h2>境界${boundary.boundaryIndex}:.*?<\\/h2>)`);
    assert(headingPattern.test(html), `境界${boundary.boundaryIndex}見出しがありません`);
    html = html.replace(headingPattern, `$1\n${boundaryForm(boundary)}`);
  }
  html = html.replace(/<h2>境界(\d+): block (\d+) -> (\d+)<\/h2>/g, '<h2>確認$1：候補$2の後から候補$3へ時間がジャンプする所</h2>');
  html = html.replaceAll('<h3>最初に見る動画</h3>', '<h3>上の2本</h3>');
  html = html.replaceAll('<h3>対応確認の補助</h3>', '<h3>下の2本</h3>');
  html = html.replaceAll('clip連続再生。切り抜き単体で、境界前から境界後まで実際の順番で見る。', '上の左。切り抜きだけの動画。編集で途中を飛ばし、別の時刻へジャンプしたように見えるかを見る。');
  html = html.replaceAll('source前後連続再生。元動画の前側対応2秒、後側対応2秒を順番につないだ人工連結。別位置に飛んでいるかを見る。', '上の右。元配信の前半と後半をつないだ動画。前後が別の所かを見る。');
  html = html.replaceAll('前側対応確認。左が切り抜き、右が元動画。境界前の対応が合っているかを見る。', '下の左。切り替わる前。左右が同じ会話・場面かを見る。');
  html = html.replaceAll('後側対応確認。左が切り抜き、右が元動画。境界後の対応が合っているかを見る。', '下の右。切り替わった後。左右が同じ会話・場面かを見る。');
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

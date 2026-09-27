import {createHash} from 'node:crypto';
import {closeSync, createReadStream, openSync, writeSync} from 'node:fs';
import {createInterface} from 'node:readline';

export const PRESENTATION_QC_EVIDENCE_STORE_SCHEMA_V001 = 'presentation-qc-evidence-store-v001';
const HASH = /^[a-f0-9]{64}$/;
const digest = text => createHash('sha256').update(text).digest('hex');
const requireValue = (condition, message) => {if (!condition) throw new Error('QC evidence store: ' + message);};
const plainObject = value => value !== null && typeof value === 'object'
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const exactKeys = (value, expected) => plainObject(value)
  && Object.keys(value).sort().join('\0') === [...expected].sort().join('\0');
const primitive = value => value === null || typeof value === 'string' || typeof value === 'boolean'
  || (typeof value === 'number' && Number.isFinite(value));

/**
 * Store a JSON value as a content-addressed DAG, without expanding shared inputs.
 * The file is valid JSON, with one shallow node per line. Node hashes bind the
 * canonical, sorted-key node body (including child hashes), not an expanded
 * multi-gigabyte JSON string. The footer binds the root and complete node count.
 *
 * Repeated object instances are visited once; equal independent JSON objects
 * also share one node. Undefined object properties are omitted and undefined
 * array entries become null, as in the existing JSON evidence representation.
 * A partial failed write is retained as evidence and cannot be overwritten.
 */
export async function writePresentationQcEvidenceV001(file, value) {
  const descriptor = openSync(file, 'wx', 0o600);
  // The input root stays alive for this entire synchronous walk. A call-local
  // Map avoids V8 ephemeron-table rehashing on large already-expanded evidence.
  const fileHash = createHash('sha256'), identity = new Map(), visiting = new Set();
  const stored = new Set();
  let pending = '', bytes = 0, reusedObjectCount = 0, deduplicatedNodeCount = 0;
  const flush = () => {
    if (!pending) return;
    const buffer = Buffer.from(pending, 'utf8');
    let offset = 0;
    while (offset < buffer.length) offset += writeSync(descriptor, buffer, offset, buffer.length - offset);
    fileHash.update(buffer);
    bytes += buffer.length;
    pending = '';
  };
  const append = text => {pending += text; if (pending.length >= 64 * 1024) flush();};
  const encode = current => {
    if (primitive(current)) return current;
    requireValue(current !== undefined && typeof current === 'object' && current !== null,
      'non-JSON value');
    requireValue(Array.isArray(current) || plainObject(current), 'non-plain JSON object');
    requireValue(!visiting.has(current), 'cyclic JSON value');
    if (identity.has(current)) {reusedObjectCount++; return {ref: identity.get(current)};}
    visiting.add(current);
    const body = Array.isArray(current)
      ? {kind: 'array', values: Array.from(current, item => encode(item === undefined ? null : item))}
      : {kind: 'object', entries: Object.keys(current).sort().filter(key => current[key] !== undefined)
        .map(key => [key, encode(current[key])])};
    const canonicalBody = JSON.stringify(body), sha256 = digest(canonicalBody);
    identity.set(current, sha256);
    visiting.delete(current);
    if (stored.has(sha256)) deduplicatedNodeCount++;
    else {
      append((stored.size === 0 ? '' : ',') + '{"sha256":' + JSON.stringify(sha256)
        + ',' + canonicalBody.slice(1) + '\n');
      stored.add(sha256);
    }
    return {ref: sha256};
  };
  try {
    append('{"schemaVersion":' + JSON.stringify(PRESENTATION_QC_EVIDENCE_STORE_SCHEMA_V001) + ',"nodes":[\n');
    const root = encode(value);
    append('],"root":' + JSON.stringify(root) + ',"nodeCount":' + stored.size + '}\n');
    flush();
    return {schemaVersion: PRESENTATION_QC_EVIDENCE_STORE_SCHEMA_V001,
      fileSha256: fileHash.digest('hex'), rootSha256: plainObject(root) ? root.ref : digest(JSON.stringify(root)),
      bytes, nodeCount: stored.size, reusedObjectCount, deduplicatedNodeCount};
  } finally {closeSync(descriptor);}
}

/**
 * Read only the versioned DAG representation. No old giant-JSON fallback.
 * Each node is validated and restored once; all references point to that same
 * restored object. Hash checks cover common and inspection-specific evidence.
 * expectedFileSha256 binds the entire saved artifact when supplied by its caller.
 */
export async function readPresentationQcEvidenceV001(file, {expectedFileSha256} = {}) {
  requireValue(expectedFileSha256 === undefined || HASH.test(expectedFileSha256), 'invalid expected file SHA');
  const input = createReadStream(file), fileHash = createHash('sha256');
  input.on('data', chunk => fileHash.update(chunk));
  const lines = createInterface({input, crlfDelay: Infinity}), nodes = new Map();
  let lineNumber = 0, footer = null;
  const parse = text => {
    try {return JSON.parse(text);}
    catch {throw new Error('QC evidence store: malformed JSON at line ' + lineNumber);}
  };
  const resolve = (token, references) => {
    if (primitive(token)) return token;
    requireValue(exactKeys(token, ['ref']) && HASH.test(token.ref), 'invalid node reference');
    requireValue(nodes.has(token.ref), 'missing or forward node reference: ' + token.ref);
    references.push(token.ref);
    return nodes.get(token.ref).value;
  };
  try {
    for await (const line of lines) {
      lineNumber++;
      if (lineNumber === 1) {
        requireValue(line.endsWith('['), 'missing versioned envelope header');
        const header = parse(line.slice(0, -1) + '[]}');
        requireValue(exactKeys(header, ['schemaVersion', 'nodes']) && Array.isArray(header.nodes)
          && header.nodes.length === 0 && header.schemaVersion === PRESENTATION_QC_EVIDENCE_STORE_SCHEMA_V001,
        'unknown schema or invalid envelope header');
        continue;
      }
      requireValue(footer === null, 'unexpected content after root');
      if (line.startsWith('],')) {
        footer = parse('{' + line.slice(2));
        requireValue(exactKeys(footer, ['root', 'nodeCount']) && Number.isSafeInteger(footer.nodeCount)
          && footer.nodeCount === nodes.size, 'missing nodes or invalid node count');
        continue;
      }
      requireValue(nodes.size === 0 ? !line.startsWith(',') : line.startsWith(','), 'invalid node separator');
      const record = parse(nodes.size === 0 ? line : line.slice(1));
      requireValue(plainObject(record) && HASH.test(record.sha256), 'invalid node SHA');
      requireValue(!nodes.has(record.sha256), 'duplicate node');
      let body, restored;
      const references = [];
      if (record.kind === 'array') {
        requireValue(exactKeys(record, ['sha256', 'kind', 'values']) && Array.isArray(record.values), 'invalid array node');
        body = {kind: 'array', values: record.values};
        restored = record.values.map(token => resolve(token, references));
      } else {
        requireValue(record.kind === 'object' && exactKeys(record, ['sha256', 'kind', 'entries'])
          && Array.isArray(record.entries), 'invalid object node');
        body = {kind: 'object', entries: record.entries};
        restored = {};
        let previous = null;
        for (const entry of record.entries) {
          requireValue(Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string'
            && (previous === null || previous < entry[0]), 'invalid, duplicate or unsorted object key');
          previous = entry[0];
          Object.defineProperty(restored, entry[0], {value: resolve(entry[1], references),
            enumerable: true, writable: true, configurable: true});
        }
      }
      requireValue(digest(JSON.stringify(body)) === record.sha256, 'node content SHA mismatch');
      nodes.set(record.sha256, {value: restored, references});
    }
    requireValue(lineNumber > 1 && footer !== null, 'missing envelope root');
    const roots = [], value = resolve(footer.root, roots), reachable = new Set(), pending = [...roots];
    while (pending.length) {
      const reference = pending.pop();
      if (reachable.has(reference)) continue;
      reachable.add(reference);
      for (const child of nodes.get(reference).references) pending.push(child);
    }
    requireValue(reachable.size === nodes.size, 'unreferenced evidence nodes');
    const actualFileSha256 = fileHash.digest('hex');
    requireValue(expectedFileSha256 === undefined || actualFileSha256 === expectedFileSha256, 'file SHA mismatch');
    return value;
  } finally {lines.close(); input.destroy();}
}

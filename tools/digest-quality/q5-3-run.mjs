#!/usr/bin/env node
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {initializeQ53SelectionV001, readQ53SelectionV001, selectQ53CandidateV001,
  acquireQ53OutputV001, verifyQ53OutputV001, summarizeQ53SelectionV001} from './q5-3-store.mjs';

export async function runQ53V001(argv) {
  const [command, ...args] = argv;
  if (command === 'init' && args.length === 2)
    return summarizeQ53SelectionV001(await initializeQ53SelectionV001({catalogPath: args[0], directory: args[1]}));
  if (command === 'read' && args.length === 1)
    return summarizeQ53SelectionV001(await readQ53SelectionV001({directory: args[0]}));
  if (command === 'select' && args.length === 6 && ['on', 'off'].includes(args[3]))
    return summarizeQ53SelectionV001(await selectQ53CandidateV001({directory: args[0], expectedSavedStateToken: args[1],
      side: args[2], enabled: args[3] === 'on', provenance: {kind: args[4], statement: args[5]}}));
  if (command === 'acquire' && args.length === 2)
    return acquireQ53OutputV001({directory: args[0], outputDirectory: args[1]});
  if (command === 'verify-output' && args.length === 1)
    return verifyQ53OutputV001({outputDirectory: args[0]});
  throw new TypeError('Usage: q5-3-run.mjs init CATALOG DIR | read DIR | select DIR TOKEN omit|add on|off technical-fixture STATEMENT | acquire DIR OUT | verify-output OUT');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runQ53V001(process.argv.slice(2)).then(result => process.stdout.write(JSON.stringify({...result, executionProcessId: process.pid}) + '\n'))
    .catch(error => {process.stderr.write(JSON.stringify({error: error.message, code: error.code ?? null}) + '\n'); process.exitCode = 1;});
}

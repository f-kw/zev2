from pathlib import Path
import hashlib
import json
import os
import sys

work = Path(__file__).resolve().parent
root = work.parents[4]
baseline = json.loads((work / 'preservation-baseline.json').read_text())
changed = []
for row in baseline['files']:
    p = root / row['path']
    if row['kind'] == 'absent':
        if p.exists() or p.is_symlink():
            changed.append({'path': row['path'], 'reason': 'created'})
        continue
    if row['kind'] == 'symlink':
        if not p.is_symlink():
            changed.append({'path': row['path'], 'reason': 'symlink-missing'})
            continue
        data = os.readlink(p).encode()
        actual = hashlib.sha256(data).hexdigest()
        size = len(data)
    elif row['kind'] == 'file':
        if p.is_symlink() or not p.is_file():
            changed.append({'path': row['path'], 'reason': 'file-missing-or-kind-changed'})
            continue
        digest = hashlib.sha256()
        with p.open('rb') as f:
            for data in iter(lambda: f.read(1024 * 1024), b''):
                digest.update(data)
        actual = digest.hexdigest()
        size = p.stat().st_size
    else:
        raise AssertionError(row['kind'])
    if actual != row['fileSha256'] or size != row['bytes']:
        changed.append({'path': row['path'], 'reason': 'byte-sha-or-size-changed'})
proof = {'schemaVersion': 'thin-plan-preservation-verification-v0', 'status': 'passed' if not changed else 'failed',
         'checkedFiles': len(baseline['files']), 'baselineHead': baseline['head'], 'changed': changed,
         'baselineFileSha256': hashlib.sha256((work / 'preservation-baseline.json').read_bytes()).hexdigest(),
         'verifierFileSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
with (work / sys.argv[1]).open('x') as f:
    f.write(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(proof, ensure_ascii=False))

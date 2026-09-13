"""Restore only approved missing bytes from recorded local ZIP members; never execute packages."""
import hashlib
import io
import json
import os
from pathlib import Path
import stat
import zipfile

ROOT = Path('/Users/kawafmm/workspace/zev2')
WORK = ROOT / 'evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001'
SITE = Path('/private/tmp/zev024-stt-arm64/lib/python3.12/site-packages')
sha = lambda data: hashlib.sha256(data).hexdigest()

def save(name, value):
    with (WORK / name).open('x') as stream:
        stream.write(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def bound_input(name):
    raw = (WORK / name).read_bytes()
    return json.loads(raw), {'path': str(WORK / name), 'fileSha256': sha(raw)}

record, record_binding = bound_input('missing-acoustic-runtime-stop-v001.json')
candidates, candidate_binding = bound_input('local-runtime-restoration-candidates-v001.json')
preflight, preflight_binding = bound_input('acoustics-supplemental-v001/acoustic-preflight-v001.json')
expected = {r['path']: r['fileSha256'] for r in preflight['implementationBindings']}
assert expected == {r['path']: r['expectedFileSha256'] for r in record['runtimeBindings']}
missing = {r['path'] for r in record['runtimeBindings'] if not r['exists']}
present = set(expected) - missing
assert len(expected) == 581 and len(missing) == 469 and len(present) == 112
assert set(candidates['matches']) == missing
assert not (WORK / 'runtime-restoration-result-v001.json').exists()
archives = {}
payloads = {}
restored = []
created_directories = []
try:
    for r in candidates['archives']:
        raw = Path(r['path']).read_bytes()
        assert sha(raw) == r['archiveFileSha256'], 'ARCHIVE_SHA_MISMATCH: ' + r['path']
        archives[r['path']] = zipfile.ZipFile(io.BytesIO(raw))
    for raw_path in sorted(present):
        p = Path(raw_path)
        assert p.is_file(), 'EXISTING_REFERENCE_MISSING: ' + raw_path
        assert sha(p.read_bytes()) == expected[raw_path], 'EXISTING_REFERENCE_SHA_MISMATCH: ' + raw_path
    for raw_path in sorted(missing):
        p = Path(raw_path)
        relative = p.relative_to(SITE)
        assert str(p) == str(SITE / relative) and '..' not in relative.parts
        assert not os.path.lexists(p), 'TARGET_ALREADY_EXISTS: ' + raw_path
        for parent in p.parents:
            if parent == SITE.parent:
                break
            if os.path.lexists(parent):
                info = parent.lstat()
                assert stat.S_ISDIR(info.st_mode) and not stat.S_ISLNK(info.st_mode), 'UNEXPECTED_PARENT: ' + str(parent)
        options = sorted(candidates['matches'][raw_path], key=lambda r: (r['archivePath'], r['member']))
        assert options
        selected = options[0]
        assert selected['member'] == relative.as_posix(), 'UNEXPECTED_ARCHIVE_MEMBER: ' + raw_path
        assert selected['fileSha256'] == expected[raw_path]
        payload = archives[selected['archivePath']].read(selected['member'])
        assert sha(payload) == expected[raw_path], 'MEMBER_SHA_MISMATCH: ' + raw_path
        payloads[raw_path] = (payload, selected)
    save('runtime-restoration-preflight-v001.json', {
        'schemaVersion': 'digest-v1-phase2-runtime-restoration-preflight-v001', 'status': 'passed',
        'recordBinding': record_binding, 'candidateBinding': candidate_binding, 'originalPreflightBinding': preflight_binding,
        'presentFilesVerified': len(present), 'absentTargetsVerified': len(missing),
        'matchingPayloadsLoadedBeforeAnyWrite': len(payloads), 'archivesVerified': len(archives),
        'networkCalls': 0, 'packagesExecuted': 0, 'packageInstallation': False})
    for raw_path, (payload, selected) in payloads.items():
        p = Path(raw_path)
        absent_parents = []
        parent = p.parent
        while not parent.exists():
            absent_parents.append(parent)
            parent = parent.parent
        for parent in reversed(absent_parents):
            parent.mkdir()
            created_directories.append(str(parent))
        # EXCL prevents an overwrite even if a file appears after preflight.
        fd = os.open(p, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o644)
        with os.fdopen(fd, 'wb') as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        assert sha(p.read_bytes()) == expected[raw_path], 'RESTORED_SHA_MISMATCH: ' + raw_path
        restored.append({'path': raw_path, 'fileSha256': expected[raw_path], **selected})
    verified = []
    for raw_path in sorted(expected):
        p = Path(raw_path)
        assert p.is_file(), 'POST_RESTORE_MISSING: ' + raw_path
        digest = sha(p.read_bytes())
        assert digest == expected[raw_path], 'POST_RESTORE_SHA_MISMATCH: ' + raw_path
        verified.append({'path': raw_path, 'fileSha256': digest, 'restored': raw_path in missing})
    save('runtime-restoration-result-v001.json', {
        'schemaVersion': 'digest-v1-phase2-runtime-restoration-result-v001', 'status': 'passed',
        'recordBinding': record_binding, 'candidateBinding': candidate_binding, 'originalPreflightBinding': preflight_binding,
        'restoredCount': len(restored), 'existingFilesNotOverwritten': len(present), 'verifiedCount': len(verified),
        'restored': restored, 'allReferences': verified, 'createdDirectories': created_directories,
        'implementationChanges': 0, 'expectationChanges': 0, 'newObservations': 0,
        'networkCalls': 0, 'packagesExecuted': 0, 'packageInstallation': False,
        'existingValidatorReplay': 'next-required-step', 'humanQuality': 'not-evaluated', 'completionApproval': 'not-claimed'})
    print(json.dumps({'status': 'passed', 'restored': len(restored), 'unchanged': len(present), 'verified': len(verified)}))
except BaseException as error:
    save('runtime-restoration-failure-v001.json', {
        'schemaVersion': 'digest-v1-phase2-runtime-restoration-failure-v001', 'status': 'stopped',
        'error': repr(error), 'restoredBeforeFailure': restored, 'createdDirectories': created_directories})
    raise
finally:
    for archive in archives.values():
        archive.close()

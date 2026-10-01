"""One-off, explicitly approved ID9 copy retirement; no prefix-based deletion."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
REPORT = Path(__file__).with_suffix('.json')
SOURCE = 'runtime/artifacts/digest-new-material-20260926-v001/source/source-video.mp4'
RETAINED = [SOURCE, 'runtime/artifacts/digest-new-material-20260926-v001/transcript.json',
            'runtime/artifacts/digest-new-material-20260926-v001/base-attempt-002/source-media-inspection.json']
COPIES = [
    'runtime/artifacts/request-intent-connection-20261001-v002-attempt-003/artifacts/fixture/source-video.mp4',
    'runtime/artifacts/request-intent-connection-20261001-v002-attempt-004/artifacts/fixture/source-video.mp4',
    'runtime/artifacts/request-intent-connection-20261001-v002-attempt-005/artifacts/fixture/source-video.mp4',
    'runtime/artifacts/request-intent-connection-20261001-v002-attempt-006/artifacts/fixture/source-video.mp4',
    'runtime/artifacts/request-intent-connection-20261001-v003-attempt-001/artifacts/fixture/source-video.mp4',
    'runtime/artifacts/request-intent-connection-20261001-v005-attempt-002/local-json/artifacts/draft_dYl1usb5pAi3C2XEYCwRr/agent_gHCs-76lRLPdapgA0RRwR--source-media.mp4',
    'runtime/artifacts/request-intent-connection-20261001-v005-attempt-004/local-json/artifacts/draft_q4VWVmXYmvcgGJ4PZKPjl/agent_dKhAeos97RZgYjcNiK1-P--source-media.mp4',
    'runtime/artifacts/request-intent-connection-20261001-v005-attempt-005/local-json/artifacts/draft_24o0Va-7yYUymmrICp03U/agent_3eTUH53d0duI1svD3-pnu--source-media.mp4',
]
PARTIAL = 'runtime/artifacts/request-intent-connection-20261001-v005-attempt-005/upload-json-worker/runner-artifacts/draft_bf6hKeP7hmmx5CMKYTCNb/agent_jGgk6ywiuluA2Sv0IkOrQ--source-media.mp4'
OLD_PROOF = ROOT / 'docs/reports/request-intent-connection-20261001/queue-capacity-stop-evidence-attempt-005.json'


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()


def identity(p):
    s = p.lstat()
    return dict(device=s.st_dev, inode=s.st_ino, size=s.st_size,
                allocatedBytes=s.st_blocks * 512, links=s.st_nlink,
                mode=s.st_mode, modifiedNs=s.st_mtime_ns, changedNs=s.st_ctime_ns)


def safe_file(rel):
    p = ROOT / rel
    assert not Path(rel).is_absolute() and '..' not in Path(rel).parts
    q = ROOT
    for part in Path(rel).parts:
        q /= part
        assert not q.is_symlink(), f'symlink: {q}'
    assert p.resolve() == p and p.is_relative_to(ROOT / 'runtime/artifacts')
    s = identity(p)
    assert stat.S_ISREG(s['mode']) and s['links'] == 1, f'not a single-link regular file: {p}'
    return p, s


def hashed(rel):
    p, before = safe_file(rel)
    reuse_path = os.environ.get('ZEV_ID9_CLEANUP_HASH_REUSE')
    if reuse_path:
        reused = json.loads(Path(reuse_path).read_text()).get(rel)
        if reused:
            assert reused['identity'] == before, f'changed since streamed hash: {rel}'
            return dict(path=rel, absolutePath=str(p), identity=before,
                        fileSha256=reused['fileSha256'], hashEvidence=reused['hashEvidence'])
    h = hashlib.sha256()
    with p.open('rb') as f:
        while chunk := f.read(8 * 1024 * 1024):
            h.update(chunk)
    assert identity(p) == before, f'changed while hashing: {p}'
    print(json.dumps({'hashed': rel, 'size': before['size'], 'sha256': h.hexdigest()}), flush=True)
    return dict(path=rel, absolutePath=str(p), identity=before, fileSha256=h.hexdigest())


def available():
    v = os.statvfs(ROOT / 'runtime/artifacts')
    return dict(at=now(), device=os.stat(ROOT / 'runtime/artifacts').st_dev,
                availableBytes=v.f_bavail * v.f_frsize, blockSize=v.f_frsize)


def open_files(paths):
    r = subprocess.run(['/usr/sbin/lsof', '-nP', '-Fpn', '--', *[str(ROOT / p) for p in paths]],
                       capture_output=True, text=True)
    assert r.returncode in (0, 1) and not r.stderr.strip(), f'lsof failed: {r.stderr}'
    return dict(exitCode=r.returncode, output=r.stdout, checkedAt=now())


def other_files():
    rows = []
    for region in sorted((ROOT / 'runtime/artifacts').iterdir()):
        if not region.name.startswith('request-intent-') or not region.is_dir() or region.is_symlink():
            continue
        for parent, dirs, files in os.walk(region, followlinks=False):
            dirs[:] = sorted(d for d in dirs if not (Path(parent) / d).is_symlink())
            for name in sorted(files):
                p = Path(parent) / name
                rel = str(p.relative_to(ROOT))
                if rel not in COPIES:
                    rows.append([rel, identity(p)])
    rows.sort()
    return dict(fileCount=len(rows), metadataSha256=hashlib.sha256(
        json.dumps(rows, sort_keys=True, separators=(',', ':')).encode()).hexdigest())


def write_record(value, exclusive=False):
    with REPORT.open('x' if exclusive else 'w') as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
        f.write('\n')


def inventory():
    assert not REPORT.exists() and len(COPIES) == len(set(COPIES))
    assert not set(COPIES).intersection(RETAINED)
    tracked = set(git('ls-files').splitlines())
    assert not set(COPIES).intersection(tracked)
    use = open_files(COPIES + RETAINED)
    assert use['exitCode'] == 1 and not use['output'], 'in-use files; do not authorize deletion'
    origins = [hashed(p) for p in RETAINED]
    source = origins[0]
    record = dict(schemaVersion='id9-user-approved-storage-cleanup-v001', status='pre-deletion',
                  receivedAt=now(), instructionHead=git('rev-parse', 'HEAD'), session='Codex2',
                  workOrder='docs/work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_STORAGE_CLEANUP.md',
                  approval='kawafmm: また容量が問題になってるのか。SSD用意するから一旦削除して',
                  productFixes=5, setupFixes=6, setup7Applied=False,
                  retained=origins, availableAtInventory=available(), openFileCheck=use, candidates=[])
    protected = {}
    for rel in COPIES:
        item = hashed(rel)
        region = ROOT / Path(*Path(rel).parts[:3])
        refs = []
        for p in sorted(region.rglob('*binding.json')):
            x = json.loads(p.read_text())
            i = x.get('identity', {})
            b = i.get('sourceVideo', {})
            logical = b.get('path', '')
            mapped = logical == rel
            if logical.startswith('artifacts/'):
                parts = logical.split('/')
                if len(parts) == 3:
                    mapped = parts[1] == p.parent.name and p.parent / parts[2] == ROOT / rel
                elif len(parts) == 4:
                    mapped = parts[1] == p.parent.name and p.parent / (parts[2] + '--' + parts[3]) == ROOT / rel
            if mapped:
                assert b['fileSha256'] == item['fileSha256'] and i['sourceUri'] == str(ROOT / SOURCE)
                if 'sourceOrigin' in i:
                    assert i['sourceOrigin']['fileSha256'] == item['fileSha256']
                    assert i['sourceOrigin']['byteSize'] == item['identity']['size']
                ref = str(p.relative_to(ROOT))
                refs.append(dict(binding=ref, logicalSourceReference=logical))
                protected[ref] = hashlib.sha256(p.read_bytes()).hexdigest()
        assert refs, f'no saved source binding proves copy provenance: {rel}'
        same = (item['fileSha256'] == source['fileSha256'] and item['identity']['size'] == source['identity']['size'])
        assert (item['identity']['device'], item['identity']['inode']) != (source['identity']['device'], source['identity']['inode'])
        item.update(classification='verified-test-source-copy', eligible=same,
                    retainedSourcePath=SOURCE, retainedSourceSha256=source['fileSha256'],
                    savedReferences=refs, oldReadImpact='source bytes must be recreated before rereading this test runtime')
        record['candidates'].append(item)
        for p in region.rglob('state.json'):
            protected[str(p.relative_to(ROOT))] = hashlib.sha256(p.read_bytes()).hexdigest()
    for p in REPORT.parent.glob('*.json'):
        protected[str(p.relative_to(ROOT))] = hashlib.sha256(p.read_bytes()).hexdigest()
    record['preservedEvidenceHashes'] = protected
    record['otherRuntimeFilesAtInventory'] = other_files()
    failure = json.loads(OLD_PROOF.read_text())['failedRequest']
    assert str(ROOT / PARTIAL) in failure['errorMessage'] and 'ENOSPC' in failure['errorMessage']
    assert not (ROOT / PARTIAL).exists() and not (ROOT / PARTIAL).is_symlink(), 'partial now exists: inspect separately'
    record['knownInterruptedCopy'] = dict(path=PARTIAL, exists=False, deleted=False,
                                         reason='failure destination is already absent',
                                         evidence=str(OLD_PROOF.relative_to(ROOT)), requestId=failure['id'])
    record['eligibleCount'] = sum(i['eligible'] for i in record['candidates'])
    record['eligibleLogicalBytes'] = sum(i['identity']['size'] for i in record['candidates'] if i['eligible'])
    write_record(record, exclusive=True)
    print(json.dumps({'saved': str(REPORT), 'eligibleCount': record['eligibleCount'],
                      'logicalBytes': record['eligibleLogicalBytes']}), flush=True)


def delete():
    record = json.loads(REPORT.read_text())
    assert record['status'] == 'pre-deletion'
    assert [i['path'] for i in record['candidates']] == COPIES
    rel_report = str(REPORT.relative_to(ROOT))
    assert git('show', f'HEAD:{rel_report}') == REPORT.read_text().strip(), 'record is not committed'
    assert git('rev-parse', 'HEAD') == git('rev-parse', 'origin/main'), 'checkpoint push is not confirmed'
    assert git('branch', '--show-current') == 'main'
    record['preDeletionCommit'] = git('rev-parse', 'HEAD')
    use = open_files(COPIES + RETAINED)
    assert use['exitCode'] == 1 and not use['output'], 'files in use'
    for origin in record['retained']:
        _, s = safe_file(origin['path'])
        assert s == origin['identity'], 'retained source changed'
    assert other_files() == record['otherRuntimeFilesAtInventory'], 'other runtime files changed'
    for p, expected in record['preservedEvidenceHashes'].items():
        assert hashlib.sha256((ROOT / p).read_bytes()).hexdigest() == expected, f'evidence changed: {p}'
    record['availableBeforeDeletion'] = available()
    record['preDeletionOpenFileCheck'] = use
    record['results'] = []
    for item in record['candidates']:
        result = dict(path=item['path'], at=now(), deleted=False)
        try:
            assert item['eligible'], 'size/hash does not match retained source'
            p, s = safe_file(item['path'])
            assert s == item['identity'], 'file changed since verified hash'
            fd = os.open(p.parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
            try:
                s2 = os.stat(p.name, dir_fd=fd, follow_symlinks=False)
                assert (s2.st_dev, s2.st_ino, s2.st_size, s2.st_mtime_ns, s2.st_ctime_ns) == (
                    s['device'], s['inode'], s['size'], s['modifiedNs'], s['changedNs'])
                os.unlink(p.name, dir_fd=fd)
            finally:
                os.close(fd)
            result.update(deleted=True, status='retired-by-user-approved-cleanup', logicalBytes=s['size'])
        except (AssertionError, OSError) as e:
            result.update(status='retained', reason=str(e))
        record['results'].append(result)
        write_record(record)
        print(json.dumps(result), flush=True)
    record['availableAfterDeletion'] = available()
    record['otherRuntimeFilesAfterDeletion'] = other_files()
    record['otherRuntimeFilesUnchanged'] = record['otherRuntimeFilesAfterDeletion'] == record['otherRuntimeFilesAtInventory']
    record['preservedEvidenceUnchanged'] = all(hashlib.sha256((ROOT / p).read_bytes()).hexdigest() == h
                                              for p, h in record['preservedEvidenceHashes'].items())
    record['retainedIdentitiesUnchanged'] = all(identity(ROOT / i['path']) == i['identity'] for i in record['retained'])
    record['deletedCount'] = sum(i['deleted'] for i in record['results'])
    record['logicalDeletedBytes'] = sum(i.get('logicalBytes', 0) for i in record['results'])
    record['actualAvailableIncreaseBytes'] = record['availableAfterDeletion']['availableBytes'] - record['availableBeforeDeletion']['availableBytes']
    record['status'] = 'cleanup-completed'
    record['completedAt'] = now()
    record['largeTestsResumed'] = False
    record['oldRuntimeImmediatelyReadable'] = False
    write_record(record)
    assert record['otherRuntimeFilesUnchanged'] and record['preservedEvidenceUnchanged'] and record['retainedIdentitiesUnchanged']
    print(json.dumps({k:record[k] for k in ('deletedCount', 'logicalDeletedBytes', 'actualAvailableIncreaseBytes',
                                         'otherRuntimeFilesUnchanged', 'preservedEvidenceUnchanged', 'retainedIdentitiesUnchanged')}), flush=True)


if __name__ == '__main__':
    assert len(sys.argv) == 2 and sys.argv[1] in ('inventory', 'delete')
    inventory() if sys.argv[1] == 'inventory' else delete()

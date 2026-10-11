"""Current-state review restart: tiny opaque files and private test ports only."""
from contextlib import contextmanager
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import http.client
import importlib.util
import json
import os
from pathlib import Path
import select
import socket
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).with_name('serve_digest_review_v001.py')
spec = importlib.util.spec_from_file_location('current_review_test_module', SOURCE)
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


@contextmanager
def fixture():
    with tempfile.TemporaryDirectory(prefix='zev-current-review-test-') as temporary:
        root = Path(temporary).resolve()
        served = root / 'served'
        served.mkdir()
        records = root / 'records'
        records.mkdir()
        contents = {'review.html': b'<p>opaque review fixture</p>', 'movie.mp4': b'OPAQUE FIXTURE; NO VIDEO GENERATED'}
        for name, data in contents.items():
            (served / name).write_bytes(data)
        port = free_port()
        old = root / 'server.json'
        # Arbitrary historical identity is deliberately not converted into current identity.
        old.write_text(json.dumps({'bindAddress': '127.0.0.1', 'port': port,
                                   'url': f'http://127.0.0.1:{port}/review.html',
                                   'targetIdentities': {'movie.mp4': [99999, 99999]}}))
        storage = {'volumeRoot': str(root), 'volumeUuid': '11111111-1111-1111-1111-111111111111',
                   'device': root.stat().st_dev, 'observedAt': datetime.now(timezone.utc).isoformat()}
        config = {'schemaVersion': 'digest-review-resume-config-v001', 'port': port, 'servedRoot': str(served),
                  'routes': {'/': 'review.html', '/review.html': 'review.html', '/digest.mp4': 'movie.mp4'},
                  'files': {n: {'fileSha256': digest(d), 'sizeBytes': len(d)} for n, d in contents.items()},
                  'storageObservation': storage,
                  'originRecordBinding': {'path': str(old), 'fileSha256': digest(old.read_bytes()), 'sizeBytes': old.stat().st_size},
                  'recordOutput': str(records / 'new-server.json'), 'contentSecurityPolicy': review.REVIEW_CSP}
        yield root, config, contents


def save(root, config):
    p = root / 'config.json'
    p.write_text(json.dumps(config))
    return p, digest(p.read_bytes())


def observer(config):
    return lambda root: {**config['storageObservation'], 'deviceNode': 'TEST-ONLY-OBSERVATION'}


@contextmanager
def serving(root, config, real_observer=None):
    p, sha = save(root, config)
    server, record = review.create_resume_server(p, sha, real_observer or observer(config))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    with patch.object(review.CurrentReviewHandler, 'log_message', lambda *a: None):
        thread.start()
        try:
            yield server, record
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)


def request(port, url, method='GET', headers=None, explicit_headers=None):
    connection = http.client.HTTPConnection('127.0.0.1', port, timeout=3)
    try:
        if explicit_headers is None:
            connection.request(method, url, headers=headers or {})
        else:
            connection.putrequest(method, url, skip_host=True)
            for key, value in explicit_headers:
                connection.putheader(key, value)
            connection.endheaders()
        result = connection.getresponse()
        return result.status, dict(result.getheaders()), result.read()
    finally:
        connection.close()


def assert_port_free(test, port):
    with socket.socket() as probe:
        probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        probe.bind(('127.0.0.1', port))


class CurrentReviewTests(unittest.TestCase):
    def test_explicit_alias_head_ranges_headers_and_new_record(self):
        with fixture() as (root, c, contents):
            original = (root / 'server.json').read_bytes()
            with serving(root, c) as (server, record):
                self.assertEqual(server.server_address, ('127.0.0.1', c['port']))
                for route, name in c['routes'].items():
                    status, headers, body = request(c['port'], route)
                    self.assertEqual((status, body), (200, contents[name]))
                    self.assertEqual(headers['Cache-Control'], 'no-store')
                    self.assertEqual(headers['X-Content-Type-Options'], 'nosniff')
                    self.assertEqual(headers['Content-Security-Policy'], review.REVIEW_CSP)
                self.assertEqual(request(c['port'], '/digest.mp4', 'HEAD')[2], b'')
                for range_header, expected in [('bytes=3-7', contents['movie.mp4'][3:8]),
                                               ('bytes=-2', contents['movie.mp4'][-2:])]:
                    status, headers, body = request(c['port'], '/digest.mp4', headers={'Range': range_header})
                    self.assertEqual((status, body), (206, expected))
                    self.assertIn('Content-Range', headers)
                self.assertEqual(request(c['port'], '/digest.mp4', headers={'Range': 'bytes=99999-'})[0], 416)
                self.assertEqual(record['schemaVersion'], 'digest-current-review-start-v001')
                self.assertEqual(record['targetIdentities']['movie.mp4'][0], root.stat().st_dev)
                self.assertNotEqual(record['targetIdentities'], json.loads(original)['targetIdentities'])
                self.assertEqual(json.loads(Path(c['recordOutput']).read_text()), json.loads(json.dumps(record)))
            self.assertEqual((root / 'server.json').read_bytes(), original)

    def test_host_query_unlisted_encoded_and_traversal_requests_are_refused(self):
        with fixture() as (root, c, _):
            (Path(c['servedRoot']) / 'private.txt').write_text('DO NOT SERVE')
            with serving(root, c):
                for route in ['/private.txt', '/movie.mp4', '/server.json', '/review.html?x=1', '/review.html?',
                              '/../server.json', '/%2e%2e/server.json', '/%72eview.html', '//review.html']:
                    with self.subTest(route=route):
                        self.assertEqual(request(c['port'], route)[0], 404)
                self.assertEqual(request(c['port'], '/review.html', headers={'Host': 'localhost'})[0], 404)
                self.assertEqual(request(c['port'], '/review.html', explicit_headers=[
                    ('Host', f'127.0.0.1:{c["port"]}'), ('Host', f'127.0.0.1:{c["port"]}')])[0], 404)

    def test_changed_content_same_size_inode_replacement_and_symlink_are_refused(self):
        for change in ['bytes', 'replacement', 'symlink']:
            with self.subTest(change=change), fixture() as (root, c, contents):
                with serving(root, c):
                    target = Path(c['servedRoot']) / 'movie.mp4'
                    if change == 'bytes':
                        target.write_bytes(b'X' * len(contents['movie.mp4']))
                    else:
                        target.unlink()
                        alternate = root / 'alternate'
                        alternate.write_bytes(contents['movie.mp4'])
                        if change == 'replacement':
                            alternate.rename(target)
                        else:
                            target.symlink_to(alternate)
                    self.assertEqual(request(c['port'], '/digest.mp4')[0], 409)

    def test_replaced_root_and_changed_current_volume_are_refused(self):
        with fixture() as (root, c, _):
            with serving(root, c):
                served = Path(c['servedRoot'])
                served.rename(root / 'previous-served')
                served.mkdir()
                self.assertEqual(request(c['port'], '/review.html')[0], 409)
        with fixture() as (root, c, _):
            p, sha = save(root, c)
            calls = 0
            def changed_volume(volume):
                nonlocal calls
                calls += 1
                return {**c['storageObservation'], 'device': c['storageObservation']['device'] + (calls > 1)}
            with self.assertRaisesRegex(ValueError, 'Storage changed'):
                review.create_resume_server(p, sha, changed_volume)
            self.assertFalse(Path(c['recordOutput']).exists())
            assert_port_free(self, c['port'])

    def test_current_config_storage_hash_size_and_path_constraints(self):
        mutations = {
            'old schema': lambda c: c.update(schemaVersion='legacy'),
            'zero port': lambda c: c.update(port=0),
            'bool port': lambda c: c.update(port=True),
            'unknown field': lambda c: c.update(autoFallback=True),
            'storage UUID': lambda c: c['storageObservation'].update(volumeUuid='22222222-2222-2222-2222-222222222222'),
            'storage device': lambda c: c['storageObservation'].update(device=c['storageObservation']['device'] + 1),
            'no timezone': lambda c: c['storageObservation'].update(observedAt='2026-10-11T00:00:00'),
            'target hash': lambda c: c['files']['movie.mp4'].update(fileSha256='0' * 64),
            'target size': lambda c: c['files']['movie.mp4'].update(sizeBytes=999999),
            'extra route': lambda c: c['routes'].update({'/other': 'private.txt'}),
            'path escape': lambda c: c.update(servedRoot=c['servedRoot'] + '/../served'),
            'CSP broadening': lambda c: c.update(contentSecurityPolicy="default-src *"),
            'record input': lambda c: c.update(recordOutput=c['originRecordBinding']['path']),
        }
        for label, mutate in mutations.items():
            with self.subTest(label=label), fixture() as (root, c, _):
                observe = observer(deepcopy(c))
                original = (root / 'server.json').read_bytes()
                mutate(c)
                p, sha = save(root, c)
                with self.assertRaises((ValueError, OSError)):
                    review.create_resume_server(p, sha, observe)
                self.assertEqual((root / 'server.json').read_bytes(), original)
        with fixture() as (root, c, _):
            p, sha = save(root, c)
            with self.assertRaisesRegex(ValueError, 'content'):
                review.create_resume_server(p, '0' * 64, observer(c))
            p.write_text('{"schemaVersion":1,"schemaVersion":2}')
            with self.assertRaisesRegex(ValueError, 'Duplicate'):
                review.create_resume_server(p, digest(p.read_bytes()), observer(c))
        with fixture() as (root, c, _):
            link = root / 'linked-root'
            link.symlink_to(c['servedRoot'])
            c['servedRoot'] = str(link)
            p, sha = save(root, c)
            with self.assertRaisesRegex(ValueError, 'Symlink'):
                review.create_resume_server(p, sha, observer(c))

    def test_old_record_content_port_and_url_remain_independent_anchors(self):
        for key in ['bytes', 'port', 'url', 'bindAddress']:
            with self.subTest(key=key), fixture() as (root, c, _):
                p, sha = save(root, c)
                if key == 'bytes':
                    (root / 'server.json').write_bytes(b'changed')
                else:
                    old = json.loads((root / 'server.json').read_text())
                    old[key] = c['port'] + 1 if key == 'port' else 'wrong'
                    (root / 'server.json').write_text(json.dumps(old))
                    c['originRecordBinding'].update(fileSha256=digest((root / 'server.json').read_bytes()),
                                                   sizeBytes=(root / 'server.json').stat().st_size)
                    p, sha = save(root, c)
                with self.assertRaises(ValueError):
                    review.create_resume_server(p, sha, observer(c))
                self.assertFalse(Path(c['recordOutput']).exists())

    def test_port_conflict_no_fallback_no_record_and_existing_record_preserved(self):
        with fixture() as (root, c, _):
            original = (root / 'server.json').read_bytes()
            with socket.socket() as occupied:
                occupied.bind(('127.0.0.1', c['port']))
                occupied.listen()
                p, sha = save(root, c)
                with self.assertRaises(OSError):
                    review.create_resume_server(p, sha, observer(c))
                self.assertFalse(Path(c['recordOutput']).exists())
            self.assertEqual((root / 'server.json').read_bytes(), original)
        with fixture() as (root, c, _):
            output = Path(c['recordOutput'])
            output.write_bytes(b'KEEP NEW RECORD')
            p, sha = save(root, c)
            with self.assertRaisesRegex(ValueError, 'already exists'):
                review.create_resume_server(p, sha, observer(c))
            self.assertEqual(output.read_bytes(), b'KEEP NEW RECORD')
            assert_port_free(self, c['port'])

    def test_publication_failure_closes_socket_and_preserves_old_record(self):
        with fixture() as (root, c, _):
            original = (root / 'server.json').read_bytes()
            p, sha = save(root, c)
            with patch.object(review.os, 'fsync', side_effect=OSError('TEST RECORD FSYNC FAILURE')):
                with self.assertRaisesRegex(OSError, 'TEST RECORD'):
                    review.create_resume_server(p, sha, observer(c))
            assert_port_free(self, c['port'])
            self.assertEqual((root / 'server.json').read_bytes(), original)
            # A failed new publication is kept; restart never silently overwrites it.
            self.assertTrue(Path(c['recordOutput']).exists())
            with self.assertRaisesRegex(ValueError, 'already exists'):
                review.create_resume_server(p, sha, observer(c))

    @unittest.skipUnless(sys.platform == 'darwin', 'Mac diskutil/CLI integration')
    def test_real_mac_observation_cli_sigterm_and_same_url_restart(self):
        with fixture() as (root, c, contents):
            current = review.observe_volume('/System/Volumes/Data')
            self.assertEqual(root.stat().st_dev, current['device'])
            c['storageObservation'] = {k: current[k] for k in ['volumeRoot', 'volumeUuid', 'device', 'observedAt']}
            c['contentSecurityPolicy'] = None
            old = (root / 'server.json').read_bytes()
            first_record = None
            for iteration in [1, 2]:
                c['recordOutput'] = str(root / 'records' / f'new-server-{iteration}.json')
                p, sha = save(root, c)
                child = subprocess.Popen([sys.executable, '-B', str(SOURCE), '--resume-config', str(p),
                                          '--config-sha256', sha], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                try:
                    self.assertTrue(select.select([child.stdout], [], [], 10)[0], 'startup did not return')
                    line = child.stdout.readline()
                    if not line:
                        self.fail(child.stderr.read().decode())
                    record = json.loads(line)
                    self.assertEqual(record['url'], f'http://127.0.0.1:{c["port"]}/review.html')
                    self.assertEqual(record['currentStorageObservation']['volumeUuid'], current['volumeUuid'])
                    self.assertEqual(request(c['port'], '/digest.mp4')[2], contents['movie.mp4'])
                finally:
                    child.terminate()
                    out, err = child.communicate(timeout=5)
                self.assertEqual(child.returncode, 0, err.decode())
                if iteration == 1:
                    first_record = Path(c['recordOutput']).read_bytes()
                else:
                    self.assertEqual((root / 'records' / 'new-server-1.json').read_bytes(), first_record)
            self.assertEqual((root / 'server.json').read_bytes(), old)
            assert_port_free(self, c['port'])

    def test_existing_six_file_cli_and_import_range_behavior(self):
        with tempfile.TemporaryDirectory(prefix='zev-existing-review-test-') as temporary:
            root = Path(temporary).resolve()
            for name in review.FILES:
                (root / name).write_bytes(b'LEGACY ENTRYPOINT TEST BYTES')
            child = subprocess.Popen([sys.executable, '-B', str(SOURCE), str(root)],
                                     stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            try:
                self.assertTrue(select.select([child.stdout], [], [], 5)[0])
                record = json.loads(child.stdout.readline())
                port = int(record['origin'].rsplit(':', 1)[1])
                self.assertEqual(set(record['files']), review.FILES)
                self.assertEqual(request(port, '/old.mp4', headers={'Range': 'bytes=0-5'})[2], b'LEGACY')
            finally:
                child.send_signal(2)
                child.communicate(timeout=5)
            self.assertEqual(child.returncode, 0)
            self.assertTrue(issubclass(review.CurrentReviewHandler, review.ReviewHandler))


if __name__ == '__main__':
    unittest.main()

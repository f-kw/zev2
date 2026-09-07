"""Instruction 008: three short windows of exact repaired media and saved human answers."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from datetime import datetime, timezone
import argparse
import hashlib
import json
import re
import threading

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[5]
CONFIG = json.loads((HERE / 'config.json').read_text())
TARGETS = {t['id']: t for t in CONFIG['targets']}
LOCK = threading.Lock()

def resolve_selection(body):
    if not isinstance(body, dict) or set(body) != {'targetId', 'answers', 'memo', 'requestId'}:
        raise ValueError('回答の形式が一致しません。')
    if not isinstance(body['requestId'], str) or not re.fullmatch(r'[a-f0-9-]{36}', body['requestId']):
        raise ValueError('回答番号が不正です。')
    target = TARGETS.get(body['targetId'])
    if target is None:
        raise ValueError('今回の確認対象ではありません。')
    answers = body['answers']
    if not isinstance(answers, dict) or set(answers) != {f['id'] for f in target['fields']}:
        raise ValueError('確認項目が一致しません。')
    if any(a not in ['問題なし', '気になる', '判別できない'] for a in answers.values()):
        raise ValueError('未回答の項目があります。')
    if not isinstance(body['memo'], str) or len(body['memo']) > 2000:
        raise ValueError('メモが長すぎます。')
    return {'schemaVersion': 'digest-three-caption-human-review-v001',
            'instruction': 'ZEV進行管理２ 指示-008', 'request': body,
            'targetBinding': target, 'completedMediaBinding': CONFIG['completedMediaBinding'],
            'technicalManifestBinding': CONFIG['technicalManifestBinding'],
            'status': 'all-items-no-issue' if all(a == '問題なし' for a in answers.values()) else 'human-issue-or-unresolved'}

class Handler(BaseHTTPRequestHandler):
    def valid_host(self):
        return self.headers.get('Host') == f'127.0.0.1:{self.server.server_port}'

    def send_json(self, value, status=200):
        raw = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self):
        if not self.valid_host() or self.headers.get('Origin') != f'http://127.0.0.1:{self.server.server_port}':
            self.send_error(403); return
        if self.path != '/observations' or self.headers.get('Content-Type') != 'application/json':
            self.send_error(404); return
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 16384:
                raise ValueError('回答のサイズが不正です。')
            record = resolve_selection(json.loads(self.rfile.read(size)))
            record['observedAt'] = datetime.now(timezone.utc).isoformat()
            path = self.server.output_dir / (record['request']['requestId'] + '.json')
            with LOCK:
                if path.exists():
                    old = json.loads(path.read_text())
                    if old['request'] != record['request']:
                        raise ValueError('保存済みの回答番号と内容が異なります。')
                    record = old
                else:
                    self.server.output_dir.mkdir(parents=True, exist_ok=True)
                    with path.open('x') as f:
                        json.dump(record, f, ensure_ascii=False, indent=2)
                        f.write('\n')
            self.send_json(record)
        except (ValueError, TypeError, KeyError) as exc:
            self.send_json({'error': str(exc)}, 400)

    def do_HEAD(self): self.serve(False)
    def do_GET(self): self.serve(True)

    def serve(self, body):
        if not self.valid_host(): self.send_error(403); return
        route = urlsplit(self.path).path
        if route == '/observations':
            records = [json.loads(p.read_text()) for p in self.server.output_dir.glob('*.json')] if self.server.output_dir.exists() else []
            self.send_json(sorted(records, key=lambda r: r['observedAt'])); return
        paths = {'/': (HERE/'index.html', 'text/html; charset=utf-8'),
                 '/app.js': (HERE/'app.js', 'text/javascript; charset=utf-8'),
                 '/config.json': (HERE/'config.json', 'application/json'),
                 '/media.mp4': (ROOT/CONFIG['completedMediaBinding']['path'], 'video/mp4')}
        if route not in paths: self.send_error(404); return
        p, mime = paths[route]
        total = p.stat().st_size
        start, end, status = 0, total-1, 200
        if self.headers.get('Range'):
            match = re.fullmatch(r'bytes=(\d+)-(\d*)', self.headers['Range'])
            if not match: self.send_error(416); return
            start = int(match[1]); end = min(int(match[2]) if match[2] else end, end); status = 206
            if start > end: self.send_error(416); return
        self.send_response(status)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(end-start+1))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        if status == 206: self.send_header('Content-Range', f'bytes {start}-{end}/{total}')
        self.end_headers()
        if body:
            try:
                with p.open('rb') as f:
                    f.seek(start); remaining = end-start+1
                    while remaining:
                        data = f.read(min(remaining, 65536))
                        if not data: break
                        self.wfile.write(data); remaining -= len(data)
            except (BrokenPipeError, ConnectionResetError): pass

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output-dir', type=Path, default=HERE/'observations')
    args = parser.parse_args()
    for key in ['completedMediaBinding', 'technicalManifestBinding']:
        ref = CONFIG[key]
        assert hashlib.sha256((ROOT/ref['path']).read_bytes()).hexdigest() == ref['fileSha256']
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    server.output_dir = args.output_dir
    print(f'http://127.0.0.1:{server.server_port}/', flush=True)
    server.serve_forever()

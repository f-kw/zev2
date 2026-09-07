"""指示-014限定。既存digest人間frame画面の媒体配信・追記保存方式を適用する。"""
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
LOCK = threading.Lock()

def load_config():
    raw = (HERE / 'config.json').read_bytes()
    return json.loads(raw), hashlib.sha256(raw).hexdigest()

def resolve_selection(body, config, config_sha):
    if not isinstance(body, dict) or set(body) != {'targetId', 'startMode', 'start', 'end', 'requestId', 'configSha256'}:
        raise ValueError('回答の形式が一致しません。')
    if body['configSha256'] != config_sha:
        raise ValueError('確認画面の原本が更新されています。再読込してください。')
    if not isinstance(body['requestId'], str) or not re.fullmatch(r'[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}', body['requestId']):
        raise ValueError('回答番号が不正です。')
    target = next((t for t in config['targets'] if t['id'] == body['targetId']), None)
    if target is None: raise ValueError('今回の対象字幕ではありません。')
    if body['startMode'] not in ('keep-current', 'human-selected'):
        raise ValueError('開始位置の指定方式が不正です。')
    keep = body['startMode'] == 'keep-current'
    if keep and (not target['optionalStart'] or body['start'] is not None):
        raise ValueError('この字幕の開始位置は人間指定が必要です。')
    fps, rate = config['framesPerSecond'], config['audioSampleRate']
    seg = target['timelineSegment']
    def boundary(side, value):
        if not isinstance(value, dict) or set(value) != {'frame', 'presentedFrame', 'kind'}:
            raise ValueError('再生を止め、実際のコマを指定してください。')
        frame, shown = value['frame'], value['presentedFrame']
        if type(frame) is not int or type(shown) is not int:
            raise ValueError('整数のコマ位置だけを受け付けます。')
        last = config['windowEndFrameExclusive']
        if not config['windowStartFrame'] <= shown < last:
            raise ValueError('短い確認範囲のコマを指定してください。')
        if value['kind'] == 'frame-start':
            if frame != shown: raise ValueError('表示中のコマと指定コマが一致しません。')
        elif value['kind'] == 'after-final-frame':
            if side != 'end' or shown != last-1 or frame != last:
                raise ValueError('最終コマの直後は終了位置にだけ指定できます。')
        else: raise ValueError('境界の指定方法が不正です。')
        if not seg['outputStartFrame'] <= frame <= seg['outputEndFrame'] or rate % fps:
            raise ValueError('採用映像の範囲にありません。')
        sample = frame * (rate // fps)
        source_sample = seg['audioSamples']['sourceStart'] + sample - seg['audioSamples']['outputStart']
        return {'side': side, 'outputVideoFrame': frame, 'observedPresentedFrame': shown, 'kind': value['kind'],
            'outputAudioSample': sample, 'sourceAudioSample': source_sample,
            'sourceVideoFrame30': seg['sourceStartFrame30'] + frame - seg['outputStartFrame'],
            'outputTimeSecondsExact': {'numerator': frame, 'denominator': fps},
            'sourceAudioTimeSecondsExact': {'numerator': source_sample, 'denominator': rate},
            'instructionId': target['instructionId'], 'textIds': target['textIds'],
            'completedMediaSha256': config['completedMediaBinding']['fileSha256'],
            'baseMediaSha256': config['baseMediaBinding']['fileSha256'],
            'audioPacketPayloadSha256': config['audioPacketPayloadSha256']}
    start = None if keep else boundary('start', body['start'])
    end = boundary('end', body['end'])
    start_frame = target['currentFrames']['startFrame'] if keep else start['outputVideoFrame']
    if start_frame >= end['outputVideoFrame']: raise ValueError('終了位置は開始位置より後にしてください。')
    return {'schemaVersion': 'distant-human-speech-boundary-observation-v001', 'authority': config['authority'],
        'request': body, 'configSha256': config_sha, 'targetBinding': target,
        'completedMediaBinding': config['completedMediaBinding'], 'baseMediaBinding': config['baseMediaBinding'],
        'audioPacketPayloadSha256': config['audioPacketPayloadSha256'], 'sourceBindings': config['sources'],
        'start': start, 'end': end, 'startMode': body['startMode'],
        'proposedFrames': {'startFrame': start_frame, 'endFrameExclusive': end['outputVideoFrame']},
        'status': 'human-observation-saved-not-promoted', 'perceptualSync': 'final-local-review-pending'}

class Handler(BaseHTTPRequestHandler):
    def valid_host(self): return self.headers.get('Host') == f'127.0.0.1:{self.server.server_port}'
    def send_json(self, value, status=200):
        raw = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status); self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw))); self.send_header('Cache-Control', 'no-store')
        self.end_headers(); self.wfile.write(raw)
    def do_POST(self):
        if not self.valid_host() or self.headers.get('Origin') != f'http://127.0.0.1:{self.server.server_port}':
            self.send_error(403); return
        if self.path != '/observations' or self.headers.get('Content-Type') != 'application/json':
            self.send_error(404); return
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 2048: raise ValueError('回答のサイズが不正です。')
            record = resolve_selection(json.loads(self.rfile.read(size)), self.server.config, self.server.config_sha)
            record['observedAt'] = datetime.now(timezone.utc).isoformat()
            record['recordPurpose'] = 'synthetic-ui-verification' if self.server.qa else 'human-boundary-observation'
            dest = self.server.output_dir / (record['request']['requestId'] + '.json')
            with LOCK:
                if dest.exists():
                    old = json.loads(dest.read_text())
                    if old['request'] != record['request']: raise ValueError('同じ回答番号で異なる内容は保存できません。')
                    record = old
                else:
                    self.server.output_dir.mkdir(parents=True, exist_ok=True)
                    with dest.open('x') as f: json.dump(record, f, ensure_ascii=False, indent=2); f.write('\n')
            self.send_json(record)
        except (ValueError, TypeError, KeyError) as exc: self.send_json({'error': str(exc)}, 400)
    def do_HEAD(self): self.serve(False)
    def do_GET(self): self.serve(True)
    def serve(self, body):
        if not self.valid_host(): self.send_error(403); return
        route = urlsplit(self.path).path
        if route == '/config.json':
            self.send_json({'config': self.server.config, 'fileSha256': self.server.config_sha, 'qa': self.server.qa}); return
        if route == '/observations':
            rows = [json.loads(p.read_text()) for p in self.server.output_dir.glob('*.json')] if self.server.output_dir.exists() else []
            self.send_json(sorted(rows, key=lambda r:r['observedAt'])); return
        paths = {'/': (HERE/'index.html', 'text/html; charset=utf-8'), '/app.js': (HERE/'app.js', 'text/javascript; charset=utf-8'),
                 '/media.mp4': (ROOT/self.server.config['completedMediaBinding']['path'], 'video/mp4')}
        if route not in paths: self.send_error(404); return
        p, mime = paths[route]; total = p.stat().st_size
        start, end, status = 0, total-1, 200
        if self.headers.get('Range'):
            match = re.fullmatch(r'bytes=(\d+)-(\d*)', self.headers['Range'])
            if not match: self.send_error(416); return
            start = int(match[1]); end = min(int(match[2]) if match[2] else end, end); status = 206
            if start > end: self.send_error(416); return
        self.send_response(status); self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(end-start+1)); self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Cache-Control', 'no-store'); self.send_header('X-Content-Type-Options', 'nosniff')
        if status == 206: self.send_header('Content-Range', f'bytes {start}-{end}/{total}')
        self.end_headers()
        if body:
            try:
                with p.open('rb') as f:
                    f.seek(start); remaining = end-start+1
                    while remaining:
                        chunk = f.read(min(remaining, 65536))
                        if not chunk: break
                        self.wfile.write(chunk); remaining -= len(chunk)
            except (BrokenPipeError, ConnectionResetError): pass

def make_server(output_dir=None, qa=False):
    config, config_sha = load_config()
    for ref in config['sources'] + [config['completedMediaBinding'], config['baseMediaBinding']]:
        assert hashlib.sha256((ROOT/ref['path']).read_bytes()).hexdigest() == ref['fileSha256'], ref['path']
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    server.config, server.config_sha, server.qa = config, config_sha, qa
    server.output_dir = output_dir or HERE/'observations'
    return server

if __name__ == '__main__':
    p = argparse.ArgumentParser(); p.add_argument('--qa-output', type=Path); args = p.parse_args()
    server = make_server(args.qa_output, bool(args.qa_output))
    print(f'http://127.0.0.1:{server.server_port}/', flush=True); server.serve_forever()

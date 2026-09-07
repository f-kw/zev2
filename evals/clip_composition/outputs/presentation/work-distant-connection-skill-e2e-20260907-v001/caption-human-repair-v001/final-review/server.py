"""指示-014の修正版を最後の25秒だけ確認する、読取専用のローカル配信。"""
import importlib.util
from pathlib import Path
from urllib.parse import urlsplit

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parents[1] / 'human-caption-boundary-v001' / 'server.py'
spec = importlib.util.spec_from_file_location('distant_boundary_media_server', SOURCE)
media = importlib.util.module_from_spec(spec)
spec.loader.exec_module(media)
media.HERE = HERE

class Handler(media.Handler):
    def do_POST(self): self.send_error(405)
    def serve(self, body):
        if urlsplit(self.path).path not in ('/', '/app.js', '/media.mp4', '/config.json'):
            self.send_error(404)
            return
        super().serve(body)

def make_server():
    config, config_sha = media.load_config()
    for ref in config['sources'] + [config['completedMediaBinding'], config['baseMediaBinding']]:
        assert media.hashlib.sha256((media.ROOT / ref['path']).read_bytes()).hexdigest() == ref['fileSha256'], ref['path']
    server = media.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    server.config, server.config_sha, server.qa = config, config_sha, False
    return server

if __name__ == '__main__':
    server = make_server()
    print(f'http://127.0.0.1:{server.server_port}/', flush=True)
    server.serve_forever()

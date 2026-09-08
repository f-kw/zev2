"""Serve this evaluation's two existing videos and explanatory files on loopback."""
import argparse
from functools import partial
from http.server import ThreadingHTTPServer
import json
from pathlib import Path
import serve_digest_review_v001 as existing


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    args = parser.parse_args()
    directory = args.directory.resolve(strict=True)
    existing.FILES = {'review.html', 'review.md', 'report.md', 'old.mp4', 'edited.mp4'}
    assert {p.name for p in directory.iterdir()} == existing.FILES
    assert all((directory / name).is_file() for name in existing.FILES)
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(existing.ReviewHandler, directory=str(directory)))
    print(json.dumps({'origin': f'http://127.0.0.1:{server.server_port}/', 'directory': str(directory),
                      'files': sorted(existing.FILES)}), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()

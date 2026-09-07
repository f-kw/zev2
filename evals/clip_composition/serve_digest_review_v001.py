"""Loopback-only review of exactly three output videos and three review documents."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

FILES = {"review.html", "review.md", "report.md", "old.mp4", "synced.mp4", "edited.mp4"}


class ReviewHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        name = unquote(urlsplit(self.path).path)
        name = "review.html" if name == "/" else name.removeprefix("/")
        if name not in FILES:
            self.send_error(404)
            return None
        target = Path(self.directory) / name
        handle = target.open("rb")
        size = target.stat().st_size
        start, end, partial_content = 0, size - 1, False
        requested = self.headers.get("Range")
        if requested:
            matched = re.fullmatch(r"bytes=(\d*)-(\d*)", requested)
            if matched and any(matched.groups()):
                first, last = matched.groups()
                if first:
                    start = int(first)
                    end = min(int(last), size - 1) if last else size - 1
                else:
                    start = max(size - int(last), 0)
                partial_content = start <= end and start < size and (bool(first) or int(last) > 0)
            if not partial_content:
                handle.close()
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{size}")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return None
        self.send_response(206 if partial_content else 200)
        self.send_header("Content-Type", "video/mp4" if name.endswith(".mp4")
                         else "text/html; charset=utf-8" if name.endswith(".html")
                         else "text/plain; charset=utf-8")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        if partial_content:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        handle.seek(start)
        self.remaining = end - start + 1
        return handle

    def copyfile(self, source, outputfile):
        try:
            while self.remaining:
                data = source.read(min(65536, self.remaining))
                if not data:
                    break
                outputfile.write(data)
                self.remaining -= len(data)
        except (BrokenPipeError, ConnectionResetError):
            # Browsers cancel a metadata/range request when the user seeks or switches videos.
            pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    directory = args.directory.resolve(strict=True)
    assert {p.name for p in directory.iterdir()} == FILES, "Only the six review files may be served"
    assert all((directory / name).is_file() for name in FILES), "Directories must not be exposed"
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(ReviewHandler, directory=str(directory)))
    print(json.dumps({"origin": f"http://127.0.0.1:{server.server_port}",
                      "directory": str(directory), "files": sorted(FILES)}), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

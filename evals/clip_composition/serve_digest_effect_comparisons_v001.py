"""Serve the six Step 2 comparisons through the existing loopback Range handler."""
import argparse
from functools import partial
from http.server import ThreadingHTTPServer
import json
from pathlib import Path
import serve_digest_review_v001 as review

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("directory", type=Path)
args = parser.parse_args()
directory = args.directory.resolve(strict=True)
review.FILES = {"review.html"} | {f"{name}-{side}.mp4"
    for name in ("emphasis", "reaction", "black") for side in ("A", "B")}
assert all((directory / name).is_file() and not (directory / name).is_symlink() for name in review.FILES)
server = ThreadingHTTPServer(("127.0.0.1", 0), partial(review.ReviewHandler, directory=str(directory)))
print(json.dumps({"origin": f"http://127.0.0.1:{server.server_port}", "files": sorted(review.FILES)}), flush=True)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()

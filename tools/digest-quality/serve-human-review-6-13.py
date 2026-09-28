"""6＋13.3: serve one review entry and four unchanged saved videos on loopback."""
import argparse
from functools import partial
import hashlib
from http.server import ThreadingHTTPServer
import json
from pathlib import Path
import sys
from urllib.parse import unquote, urlsplit

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "evals/clip_composition"))
import serve_digest_review_v001 as review

OUTPUT = ROOT / "evals/clip_composition/outputs/presentation"
ENTRY = OUTPUT / "human-review-6-13-20260928-v001/review.html"
COLOR = OUTPUT / "stage4-editing-color-emphasis-20260926-v001"
VIDEOS = {
    "digest.mp4": (OUTPUT / "new-material-digest-20260926-first-draft-qc-resume-v001/presentation-rendered-v002.mp4", "11611ff2071aa21325eb672094b90f5c495b77af311aa409a460c69e7cb16b8a"),
    "A-current.mp4": (COLOR / "A-current.mp4", "4f95335e118c6f2ff5439f75d1d8f9e87c5eeaaa000ddd5eb2d2a2801d711aef"),
    "B-yellow-selection.mp4": (COLOR / "B-yellow-selection.mp4", "de64e90904a9fcd7620d4c3234e04b8aea362cca46845a570e2bc1a7776ab348"),
    "C-yellow-cyan.mp4": (COLOR / "C-yellow-cyan.mp4", "d05fa1a91140abb190ca62f8b5783787a62a0d269770a5adcf5f062ba59b0292"),
}
ROUTES = {"/": ENTRY, "/review.html": ENTRY, **{"/" + name: item[0] for name, item in VIDEOS.items()}}
review.FILES = {p.name for p in ROUTES.values()}


class Handler(review.ReviewHandler):
    def send_head(self):
        # Resolve only these aliases; never expose a directory or a supplied filesystem path.
        target = ROUTES.get(unquote(urlsplit(self.path).path))
        if target is None:
            self.send_error(404)
            return None
        self.directory, self.path = str(target.parent), "/" + target.name
        return super().send_head()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=0, help="0 selects an unused local port")
    args = parser.parse_args()
    for p in ROUTES.values():
        if not p.is_file() or p.is_symlink():
            raise RuntimeError(f"Saved review input is missing or is not a regular file: {p}")
    for name, (p, expected) in VIDEOS.items():
        digest = hashlib.sha256()
        with p.open("rb") as source:
            for block in iter(lambda: source.read(4 * 1024 * 1024), b""):
                digest.update(block)
        if digest.hexdigest() != expected:
            raise RuntimeError(f"Saved video SHA does not match: {name}")
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(Handler, directory=str(ENTRY.parent)))
    print(json.dumps({"origin": f"http://127.0.0.1:{server.server_port}/", "videoShaChecked": 4}), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

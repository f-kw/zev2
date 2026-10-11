"""Loopback-only review of exactly three output videos and three review documents."""
import argparse
from datetime import datetime, timezone
import hashlib
import os
import plistlib
import signal
import stat
import subprocess
import sys
import uuid
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
        return self.send_opened_file(name, handle, target.stat().st_size)

    def send_opened_file(self, name, handle, size):
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


# Explicit current-state restart. Historical records supply provenance, never current identity.
REVIEW_CSP = ("default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; "
              "media-src 'self'; img-src data:; connect-src 'none'; object-src 'none'; "
              "base-uri 'none'; frame-ancestors 'none'")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def exact_keys(value, keys):
    require(type(value) is dict and set(value) == set(keys), "Unexpected or missing fields")


def identity(info):
    return (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns)


def exact_path(value, directory=False):
    require(type(value) is str and value.startswith("/"), "Absolute path required")
    p = Path(value)
    require(str(p) == value and ".." not in p.parts, "Normalized path required")
    for ancestor in [*reversed(p.parents), p]:
        require(not ancestor.is_symlink(), "Symlink path rejected")
    require(p.resolve(strict=True) == p, "Real path must match")
    info = p.lstat()
    require(stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode),
            "Regular file or directory required")
    return p


def checked_open(p, expected_identity=None):
    exact_path(str(p))
    before = identity(p.lstat())
    require(expected_identity is None or before == expected_identity, "File identity changed")
    handle = os.fdopen(os.open(str(p), os.O_RDONLY | os.O_NOFOLLOW), "rb")
    try:
        require(identity(os.fstat(handle.fileno())) == before, "Opened file changed")
        require(identity(p.lstat()) == before, "File path changed")
        return handle, before
    except BaseException:
        handle.close()
        raise


def read_pinned(p, digest, size=None, capture=False):
    require(type(digest) is str and re.fullmatch(r"[0-9a-f]{64}", digest), "SHA256 required")
    require(size is None or type(size) is int and size > 0, "Positive file size required")
    with checked_open(p)[0] as handle:
        before = identity(os.fstat(handle.fileno()))
        require(size is None or before[2] == size, "File size changed")
        require(not capture or before[2] <= 4 * 1024 * 1024, "Record/config too large")
        sha, parts = hashlib.sha256(), []
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            sha.update(chunk)
            if capture:
                parts.append(chunk)
        require(sha.hexdigest() == digest, "File content changed")
        require(identity(os.fstat(handle.fileno())) == before, "File changed during read")
        exact_path(str(p))
        require(identity(p.lstat()) == before, "File path changed during read")
    return before, b"".join(parts) if capture else None


def unique_json(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, "Duplicate JSON field")
            result[key] = value
        return result
    return json.loads(raw, object_pairs_hook=pairs)


def observe_volume(volume_root):
    root = exact_path(volume_root, directory=True)
    result = subprocess.run(["/usr/sbin/diskutil", "info", "-plist", str(root)],
                            check=True, capture_output=True, timeout=10)
    value = plistlib.loads(result.stdout)
    mount_table = subprocess.run(["/sbin/mount"], check=True, capture_output=True, text=True, timeout=10).stdout
    mount_prefix = value["DeviceNode"] + " on " + str(root) + " ("
    require(value.get("MountPoint") == str(root) and
            any(row.startswith(mount_prefix) for row in mount_table.splitlines()),
            "Configured volume is not the current mount point")
    return {"volumeRoot": str(root), "volumeUuid": value["VolumeUUID"],
            "device": root.lstat().st_dev, "deviceNode": value["DeviceNode"],
            "observedAt": datetime.now(timezone.utc).isoformat()}


def load_resume(config_path, config_sha256, observe=observe_volume):
    p = exact_path(str(config_path))
    config_identity, raw = read_pinned(p, config_sha256, capture=True)
    c = unique_json(raw)
    exact_keys(c, ["schemaVersion", "port", "servedRoot", "routes", "files",
                   "storageObservation", "originRecordBinding", "recordOutput",
                   "contentSecurityPolicy"])
    require(c["schemaVersion"] == "digest-review-resume-config-v001", "Current config required")
    port = c["port"]
    require(type(port) is int and 1 <= port <= 65535, "Exact positive port required")
    require(c["contentSecurityPolicy"] is None or c["contentSecurityPolicy"] == REVIEW_CSP,
            "Only the explicit existing review CSP is supported")
    root = exact_path(c["servedRoot"], directory=True)
    storage = c["storageObservation"]
    exact_keys(storage, ["volumeRoot", "volumeUuid", "device", "observedAt"])
    volume_root = exact_path(storage["volumeRoot"], directory=True)
    require(type(storage["device"]) is int and storage["device"] > 0, "Current device required")
    require(type(storage["volumeUuid"]) is str and
            str(uuid.UUID(storage["volumeUuid"])).upper() == storage["volumeUuid"], "Exact volume UUID required")
    require(type(storage["observedAt"]) is str and
            datetime.fromisoformat(storage["observedAt"].replace("Z", "+00:00")).tzinfo is not None,
            "Independent observation time with timezone required")
    current = observe(str(volume_root))
    for key in ["volumeRoot", "volumeUuid", "device"]:
        require(current[key] == storage[key], "Current storage observation differs: " + key)
    require(root.lstat().st_dev == storage["device"], "Served root is on another device")
    files, routes = c["files"], c["routes"]
    require(type(files) is dict and files and type(routes) is dict and routes, "Explicit files/routes required")
    for name, binding in files.items():
        require(type(name) is str and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", name) and
                name not in {".", ".."}, "Flat basename required")
        exact_keys(binding, ["fileSha256", "sizeBytes"])
    for route, name in routes.items():
        require(type(route) is str and re.fullmatch(r"/(?:[A-Za-z0-9][A-Za-z0-9._-]*)?", route),
                "Exact flat URL path required")
        require(name in files, "Route must name an explicitly permitted file")
    require(set(routes.values()) == set(files), "Every permitted file must have an explicit route")
    origin = c["originRecordBinding"]
    exact_keys(origin, ["path", "fileSha256", "sizeBytes"])
    origin_path = exact_path(origin["path"])
    _, origin_raw = read_pinned(origin_path, origin["fileSha256"], origin["sizeBytes"], capture=True)
    old = unique_json(origin_raw)
    require(type(old) is dict and old.get("bindAddress") == "127.0.0.1" and
            type(old.get("port")) is int and old["port"] == port, "Origin port/bind differ")
    old_url = old.get("url")
    require(type(old_url) is str and any(old_url == f"http://127.0.0.1:{port}{r}" for r in routes),
            "Origin URL must remain an explicitly permitted route")
    # No legacy identity/schema conversion: current files/routes are bound by the independent config SHA.
    identities = {}
    for name, binding in files.items():
        target = exact_path(str(root / name))
        require(target.lstat().st_dev == storage["device"], "Target device differs")
        identities[name], _ = read_pinned(target, binding["fileSha256"], binding["sizeBytes"])
    output_text = c["recordOutput"]
    require(type(output_text) is str and output_text.startswith("/"), "Absolute record output required")
    output = Path(output_text)
    require(str(output) == output_text and ".." not in output.parts, "Normalized record output required")
    parent = exact_path(str(output.parent), directory=True)
    require(parent.lstat().st_dev == storage["device"], "Record output device differs")
    require(output not in {p, origin_path, *(root / n for n in files)}, "Record output would replace input")
    require(not output.exists() and not output.is_symlink(), "New record already exists")
    require(origin_path.lstat().st_dev == storage["device"], "Origin record device differs")
    state = {"config": c, "configBinding": {"path": str(p), "fileSha256": config_sha256,
              "sizeBytes": config_identity[2]}, "storageCurrent": current,
             "root": root, "rootIdentity": (root.lstat().st_dev, root.lstat().st_ino),
             "volumeIdentity": (volume_root.lstat().st_dev, volume_root.lstat().st_ino),
             "identities": identities, "output": output,
             "outputParentIdentity": (parent.lstat().st_dev, parent.lstat().st_ino), "url": old_url}
    return state


class CurrentReviewHandler(ReviewHandler):
    def __init__(self, *args, state, **kwargs):
        self.state = state
        super().__init__(*args, directory=str(state["root"]), **kwargs)

    def send_head(self):
        c = self.state["config"]
        parsed = urlsplit(self.path)
        hosts = self.headers.get_all("Host", [])
        original_target = self.requestline.split()[1]
        if (original_target != self.path or hosts != [f'127.0.0.1:{c["port"]}'] or "?" in self.path or "#" in self.path or
                parsed.scheme or parsed.netloc or parsed.path not in c["routes"]):
            self.send_error(404)
            return None
        handle = None
        try:
            root = exact_path(str(self.state["root"]), directory=True)
            volume = exact_path(c["storageObservation"]["volumeRoot"], directory=True)
            require((root.lstat().st_dev, root.lstat().st_ino) == self.state["rootIdentity"],
                    "Served root changed")
            require((volume.lstat().st_dev, volume.lstat().st_ino) == self.state["volumeIdentity"],
                    "Mounted volume changed")
            name = c["routes"][parsed.path]
            handle, observed = checked_open(root / name, self.state["identities"][name])
            return self.send_opened_file(name, handle, observed[2])
        except (OSError, ValueError):
            if handle is not None:
                handle.close()
            self.send_error(409, "The explicitly pinned current file or storage has changed")
            return None

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if self.state["config"]["contentSecurityPolicy"] is not None:
            self.send_header("Content-Security-Policy", self.state["config"]["contentSecurityPolicy"])
        super().end_headers()


def create_resume_server(config_path, config_sha256, observe=observe_volume):
    state = load_resume(config_path, config_sha256, observe)
    server = ThreadingHTTPServer(("127.0.0.1", state["config"]["port"]),
                                 partial(CurrentReviewHandler, state=state))
    try:
        c = state["config"]
        # Check current files and origin again after binding, before publishing the new startup record.
        for name, pin in state["identities"].items():
            with checked_open(state["root"] / name, pin)[0]:
                pass
        origin = c["originRecordBinding"]
        read_pinned(Path(origin["path"]), origin["fileSha256"], origin["sizeBytes"])
        binding = state["configBinding"]
        read_pinned(Path(binding["path"]), binding["fileSha256"], binding["sizeBytes"])
        current = observe(c["storageObservation"]["volumeRoot"])
        for key in ["volumeRoot", "volumeUuid", "device"]:
            require(current[key] == c["storageObservation"][key], "Storage changed before publication")
        state["storageCurrent"] = current
        require((state["root"].lstat().st_dev, state["root"].lstat().st_ino) == state["rootIdentity"],
                "Served root changed before publication")
        parent = exact_path(str(state["output"].parent), directory=True)
        require((parent.lstat().st_dev, parent.lstat().st_ino) == state["outputParentIdentity"],
                "Record parent changed")
        record = {"schemaVersion": "digest-current-review-start-v001",
                  "startedAt": datetime.now(timezone.utc).isoformat(), "pid": os.getpid(),
                  "pgid": os.getpgrp(), "bindAddress": "127.0.0.1", "port": server.server_port,
                  "url": state["url"], "servedRoot": str(state["root"]), "routes": c["routes"],
                  "files": c["files"], "targetIdentities": state["identities"],
                  "originRecordBinding": origin, "configBinding": state["configBinding"],
                  "independentStorageObservation": c["storageObservation"],
                  "currentStorageObservation": state["storageCurrent"],
                  "contentSecurityPolicy": c["contentSecurityPolicy"]}
        data = (json.dumps(record, ensure_ascii=False, indent=2) + "\n").encode()
        parent_fd = os.open(str(parent), os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        try:
            st = os.fstat(parent_fd)
            require((st.st_dev, st.st_ino) == state["outputParentIdentity"], "Opened record parent changed")
            fd = os.open(state["output"].name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                         0o600, dir_fd=parent_fd)
            with os.fdopen(fd, "wb") as out:
                out.write(data)
                out.flush()
                os.fsync(out.fileno())
            exact_path(str(parent), directory=True)
            require((parent.lstat().st_dev, parent.lstat().st_ino) == state["outputParentIdentity"],
                    "Record parent path changed during publication")
        finally:
            os.close(parent_fd)
        return server, record
    except BaseException:
        server.server_close()
        raise


def resume_main():
    parser = argparse.ArgumentParser(description="Explicit, pinned current-state loopback review restart")
    parser.add_argument("--resume-config", type=Path, required=True)
    parser.add_argument("--config-sha256", required=True)
    args = parser.parse_args()
    server, record = create_resume_server(args.resume_config, args.config_sha256)
    signal.signal(signal.SIGTERM, lambda signum, frame: sys.exit(0))
    try:
        print(json.dumps(record, ensure_ascii=False), flush=True)
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


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
    if "--resume-config" in sys.argv[1:]:
        resume_main()
    else:
        main()

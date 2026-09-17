#!/usr/bin/env python3
"""Independent, finite media oracle for the Stage II connection fixture.

The oracle imports no renderer or preset. It reads every YUV420p frame and every
float32 PCM sample from the two supplied media. The six-frame entrance/exit,
twelve inserted frames and integer rounding below are the independently written
specification. AAC observations do not assert sample identity or audibility.
"""

import argparse
import array
import datetime
import hashlib
import json
import math
import pathlib
import re
import subprocess
import sys
from fractions import Fraction


FPS = 30
SAMPLE_RATE = 48000
CHANNELS = 2
SAMPLES_PER_FRAME = 1600
INSERTED_FRAMES = 12
FADE_FRAMES = 6
SCHEMA = "connection-expression-media-check-v001"


class Rejected(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


class CommandFailed(Exception):
    pass


def require(condition, code, message):
    if not condition:
        raise Rejected(code, message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def save_json(file, value):
    with file.open("x", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
        stream.write("\n")


def safe_path(value):
    file = pathlib.Path(value)
    require(file.is_absolute(), "PATH_NOT_ABSOLUTE", str(file))
    require(not any(re.search(r"archive|退避", part, re.I) for part in file.parts),
            "EXCLUDED_PATH", "Archive paths are outside this fixture")
    return file


def binding(file):
    file = safe_path(str(file))
    resolved = safe_path(str(file.resolve(strict=True)))
    require(resolved.is_file(), "NOT_REGULAR_FILE", str(file))
    hash_value = hashlib.sha256()
    with resolved.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            hash_value.update(chunk)
    return {"path": str(file), "realPath": str(resolved), "bytes": resolved.stat().st_size,
            "fileSha256": hash_value.hexdigest()}


def observed_int(value, name):
    require(type(value) is int or (isinstance(value, str) and re.fullmatch(r"-?\d+", value)),
            "NONINTEGER_OBSERVATION", name)
    return int(value)


def rational(value, name):
    try:
        result = Fraction(value)
    except (TypeError, ValueError, ZeroDivisionError):
        raise Rejected("INVALID_RATIONAL_OBSERVATION", name)
    return result


class Commands:
    def __init__(self, directory, ffmpeg, ffprobe):
        self.directory = directory
        self.ffmpeg = ffmpeg
        self.ffprobe = ffprobe
        self.count = 0
        self.log = directory / "commands.jsonl"
        self.log.touch(exist_ok=False)

    def event(self, value):
        with self.log.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(value, ensure_ascii=False, allow_nan=False) + "\n")

    def start(self, purpose, argv):
        self.count += 1
        number = self.count
        self.event({"number": number, "event": "start", "purpose": purpose, "argv": argv})
        return number

    def capture(self, purpose, argv, filename):
        number = self.start(purpose, argv)
        process = subprocess.run(argv, stdin=subprocess.DEVNULL, capture_output=True, check=False)
        target = self.directory / filename
        with target.open("xb") as stream:
            stream.write(process.stdout)
        stderr_file = self.directory / ("command-%03d.stderr" % number)
        with stderr_file.open("xb") as stream:
            stream.write(process.stderr)
        self.event({"number": number, "event": "complete", "exitCode": process.returncode,
                    "stdoutPath": str(target), "stdoutBytes": len(process.stdout),
                    "stdoutSha256": digest(process.stdout), "stderrPath": str(stderr_file),
                    "stderrBytes": len(process.stderr), "stderrSha256": digest(process.stderr)})
        if process.returncode != 0:
            raise CommandFailed("%s failed with exit %s; see %s" % (purpose, process.returncode, stderr_file))
        return process.stdout

    def probe(self, media, name, kind):
        args = [self.ffprobe, "-v", "error"]
        if kind == "metadata":
            args += ["-show_streams", "-show_format"]
        elif kind == "video-frames":
            args += ["-select_streams", "v:0", "-show_frames", "-show_entries",
                     "frame=stream_index,pts,duration,pkt_duration"]
        elif kind == "audio-packets":
            args += ["-select_streams", "a:0", "-show_packets", "-show_entries",
                     "packet=stream_index,pts,dts,duration,side_data_list"]
        else:
            raise ValueError("Unknown probe kind")
        args += ["-of", "json", str(media)]
        return json.loads(self.capture(name + "-" + kind, args, name + "-" + kind + ".json"))

    def decode_pcm(self, media, name):
        return self.capture(name + "-decode-pcm", [self.ffmpeg, "-hide_banner", "-loglevel", "error",
            "-nostdin", "-i", str(media), "-map", "0:a:0", "-vn", "-sn", "-dn",
            "-c:a", "pcm_f32le", "-f", "f32le", "pipe:1"], name + ".f32le")

    def video_pipe(self, media, name):
        argv = [self.ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-i", str(media),
                "-map", "0:v:0", "-an", "-sn", "-dn", "-fps_mode", "passthrough",
                "-c:v", "rawvideo", "-pix_fmt", "yuv420p", "-f", "rawvideo", "pipe:1"]
        return VideoPipe(self, name + "-decode-yuv420p", argv)


class VideoPipe:
    def __init__(self, owner, purpose, argv):
        self.owner = owner
        self.number = owner.start(purpose, argv)
        self.stderr_path = owner.directory / ("command-%03d.stderr" % self.number)
        self.stderr = self.stderr_path.open("xb")
        self.process = subprocess.Popen(argv, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=self.stderr)
        self.hash = hashlib.sha256()
        self.bytes = 0
        self.finished = False

    def read(self, size):
        parts = []
        remaining = size
        while remaining:
            block = self.process.stdout.read(remaining)
            if not block:
                break
            parts.append(block)
            self.hash.update(block)
            self.bytes += len(block)
            remaining -= len(block)
        return b"".join(parts)

    def finish(self):
        while self.read(1024 * 1024):
            pass
        code = self.process.wait()
        self.process.stdout.close()
        self.stderr.close()
        errors = self.stderr_path.read_bytes()
        self.finished = True
        result = {"bytes": self.bytes, "sha256": self.hash.hexdigest(), "exitCode": code}
        self.owner.event({"number": self.number, "event": "complete", "exitCode": code,
                          "stdoutBytes": self.bytes, "stdoutSha256": result["sha256"],
                          "stderrPath": str(self.stderr_path), "stderrBytes": len(errors),
                          "stderrSha256": digest(errors)})
        if code != 0:
            raise CommandFailed("Video decoder failed with exit %s; see %s" % (code, self.stderr_path))
        return result

    def close(self):
        if not self.finished:
            self.process.stdout.close()
            if self.process.poll() is None:
                self.process.terminate()
            self.process.wait()
            self.stderr.close()


def one_stream(probe, kind):
    streams = [s for s in probe["streams"] if s["codec_type"] == kind]
    require(len(streams) == 1, "STREAM_COUNT_MISMATCH", "Exactly one %s stream is required" % kind)
    return streams[0]


def metadata(probe, lossless, expected_dimensions=None):
    require(len(probe["streams"]) == 2, "STREAM_COUNT_MISMATCH", "Exactly video and audio are required")
    video, audio = one_stream(probe, "video"), one_stream(probe, "audio")
    require(video.get("codec_name") == ("ffv1" if lossless else "h264"), "VIDEO_CODEC_MISMATCH", "Unexpected video codec")
    require(video.get("pix_fmt") == "yuv420p", "PIXEL_FORMAT_MISMATCH", "Only 8-bit planar YUV420p is supported")
    require(video.get("color_range") in (None, "unknown", "tv"), "COLOR_RANGE_MISMATCH", "Full-range YUV is outside the finite limited-range-black preset")
    width, height = observed_int(video.get("width"), "width"), observed_int(video.get("height"), "height")
    require(width >= 2 and height >= 2 and width % 2 == 0 and height % 2 == 0,
            "DIMENSION_MISMATCH", "Even positive YUV420p dimensions are required")
    if expected_dimensions is not None:
        require((width, height) == expected_dimensions, "DIMENSION_MISMATCH", "Dimensions changed")
    require(video.get("r_frame_rate") == "30/1" and video.get("avg_frame_rate") == "30/1",
            "FPS_MISMATCH", "Only 30 fps is supported; no resampling is performed")
    require(audio.get("codec_name") == ("pcm_f32le" if lossless else "aac"), "AUDIO_CODEC_MISMATCH", "Unexpected audio codec")
    require(observed_int(audio.get("sample_rate"), "sample rate") == SAMPLE_RATE,
            "SAMPLE_RATE_MISMATCH", "Only the existing 48 kHz input clock is supported")
    require(audio.get("channels") == CHANNELS and audio.get("channel_layout") in ((None, "stereo") if lossless else ("stereo",)),
            "CHANNEL_MISMATCH", "Two unchanged channels are required")
    for label, stream in [("video", video), ("audio", audio)]:
        require(observed_int(stream.get("start_pts"), label + " start PTS") == 0,
                "STREAM_START_MISMATCH", label + " must start at zero")
        require(rational(stream.get("start_time"), label + " start time") == 0,
                "STREAM_START_MISMATCH", label + " start time must be zero")
        require(rational(stream.get("time_base"), label + " timebase") > 0,
                "INVALID_TIMEBASE", label)
    return video, audio, (width, height)


def video_clock(video, decoded, expected_frames):
    rows = decoded.get("frames", [])
    require(len(rows) == expected_frames, "VIDEO_FRAME_COUNT_MISMATCH", "Decoded frame record count differs")
    timebase = rational(video["time_base"], "video timebase")
    for index, row in enumerate(rows):
        require(row.get("stream_index") == video["index"], "FRAME_STREAM_MISMATCH", str(index))
        pts = observed_int(row.get("pts"), "decoded video PTS")
        duration = observed_int(row.get("duration", row.get("pkt_duration")), "decoded video duration")
        require(pts * timebase == Fraction(index, FPS), "VIDEO_PTS_MISMATCH", "Frame %d is not on its original presentation grid" % index)
        require(duration * timebase == Fraction(1, FPS), "VIDEO_DURATION_MISMATCH", "Frame %d has a different duration" % index)
    if video.get("duration_ts") is not None:
        require(observed_int(video["duration_ts"], "video duration ticks") * timebase == Fraction(expected_frames, FPS),
                "VIDEO_STREAM_DURATION_MISMATCH", "Video stream duration differs from the frame schedule")
    return {"frameCount": len(rows), "timeBase": video["time_base"], "firstPts": rows[0]["pts"],
            "lastPts": rows[-1]["pts"], "continuous": True, "checkedBeforeTimestampRescaling": True}


def sample_clock(value, stream, name):
    samples = observed_int(value, name) * rational(stream["time_base"], "audio timebase") * SAMPLE_RATE
    require(samples.denominator == 1, "AUDIO_OFF_SAMPLE_GRID", name)
    return samples.numerator


def audio_packet_clock(audio, packet_probe, expected_samples, aac=False):
    packets = packet_probe.get("packets", [])
    require(len(packets) > 0, "AUDIO_PACKETS_MISSING", "No audio packets")
    first = None
    end = None
    sides = []
    first_skip = 0
    for index, packet in enumerate(packets):
        require(packet.get("stream_index") == audio["index"], "PACKET_STREAM_MISMATCH", str(index))
        pts = sample_clock(packet.get("pts"), audio, "audio packet PTS")
        dts = sample_clock(packet.get("dts"), audio, "audio packet DTS")
        duration = sample_clock(packet.get("duration"), audio, "audio packet duration")
        require(pts == dts and duration > 0, "AUDIO_PACKET_CLOCK_MISMATCH", "Unexpected DTS or packet duration")
        if end is not None:
            require(pts == end, "AUDIO_PACKET_GAP_OR_OVERLAP", "Packet %d is not contiguous" % index)
        else:
            first = pts
        end = pts + duration
        for data in packet.get("side_data_list", []):
            sides.append({"packetIndex": index, "data": data})
            if data.get("side_data_type") == "Skip Samples":
                skip = observed_int(data.get("skip_samples", 0), "skip samples")
                discard = observed_int(data.get("discard_padding", 0), "discard padding")
                require(skip >= 0 and discard >= 0, "INVALID_AUDIO_PADDING", "Negative skip or discard padding")
                require(skip == 0 or index == 0, "UNEXPECTED_AUDIO_SKIP", "Skip samples occur inside the media")
                require(discard == 0 or index == len(packets) - 1, "UNEXPECTED_AUDIO_PADDING", "Discard padding occurs inside the media")
                if index == 0:
                    first_skip += skip
    require(first + first_skip == 0, "AUDIO_PRESENTATION_START_MISMATCH", "Packet start plus declared priming skip is not zero")
    require(end == expected_samples, "AUDIO_PACKET_END_MISMATCH", "Packet timeline end differs from the exact expected sample clock")
    if aac:
        require(audio.get("duration_ts") is not None, "AUDIO_DURATION_MISSING", "AAC stream duration is required")
        require(sample_clock(audio["duration_ts"], audio, "AAC stream duration") == expected_samples,
                "AUDIO_STREAM_DURATION_MISMATCH", "AAC presentation duration differs")
    return {"packetCount": len(packets), "timeBase": audio["time_base"],
            "firstPacketSample": first, "firstSkipSamples": first_skip,
            "presentedStartSample": first + first_skip, "packetEndSampleExclusive": end,
            "expectedTimelineSamplesPerChannel": expected_samples, "continuous": True,
            "lastPacketPts": packets[-1]["pts"], "lastPacketDuration": packets[-1]["duration"],
            "sideData": sides}


def first_difference(expected, actual):
    for index, (left, right) in enumerate(zip(expected, actual)):
        if left != right:
            return {"byteOffset": index, "expected": left, "actual": right}
    if len(expected) != len(actual):
        return {"byteOffset": min(len(expected), len(actual)), "expectedBytes": len(expected), "actualBytes": len(actual)}
    return None


def compare_video(commands, source, output, mode, boundary, frames, dimensions):
    width, height = dimensions
    luma_bytes = width * height
    frame_bytes = luma_bytes * 3 // 2
    black = bytes([16]) * luma_bytes + bytes([128]) * (luma_bytes // 2)
    inserted = 0 if mode == "normal" else INSERTED_FRAMES
    expected_frames = frames + inserted
    tables = {(black_value, k): bytes((value * k + black_value * (5 - k) + 2) // 5
                                    for value in range(256))
              for black_value in (16, 128) for k in range(6)}
    input_pipe, output_pipe = commands.video_pipe(source, "input"), commands.video_pipe(output, "output")
    changed = []
    first_mismatch = None
    phase_counts = {}
    complete_black_frames = []
    row_path = commands.directory / "video-frame-comparison.jsonl"
    try:
        with row_path.open("x", encoding="utf-8") as rows:
            for display in range(expected_frames):
                source_index = display if display < boundary else (display - inserted if display >= boundary + inserted else None)
                source_hash = None
                k = 5
                if source_index is None:
                    expected = black
                    phase = "inserted-black"
                else:
                    original = input_pipe.read(frame_bytes)
                    if len(original) != frame_bytes:
                        # A failed decoder is an observation-tool error, not a
                        # successfully observed truncated input media.
                        input_pipe.finish()
                    require(len(original) == frame_bytes, "INPUT_VIDEO_TRUNCATED", "Input frame %d is incomplete" % source_index)
                    source_hash = digest(original)
                    phase = "unchanged-before" if source_index < boundary else "unchanged-after"
                    if mode == "soft" and boundary - FADE_FRAMES <= source_index < boundary:
                        k = boundary - 1 - source_index
                        phase = "fade-out"
                    elif mode == "soft" and boundary <= source_index < boundary + FADE_FRAMES:
                        k = source_index - boundary
                        phase = "fade-in"
                    expected = original if k == 5 else (original[:luma_bytes].translate(tables[(16, k)])
                                                        + original[luma_bytes:].translate(tables[(128, k)]))
                actual = output_pipe.read(frame_bytes)
                matched = actual == expected
                phase_counts.setdefault(phase, {"checked": 0, "matched": 0})
                phase_counts[phase]["checked"] += 1
                phase_counts[phase]["matched"] += int(matched)
                if actual == black:
                    complete_black_frames.append(display)
                if not matched:
                    changed.append(display)
                    if first_mismatch is None:
                        first_mismatch = {"displayFrame": display, "sourceFrame": source_index, "phase": phase,
                                          **first_difference(expected, actual)}
                rows.write(json.dumps({"displayFrame": display, "sourceFrame": source_index, "phase": phase,
                    "numeratorOverFive": None if source_index is None else k, "sourceSha256": source_hash,
                    "expectedSha256": digest(expected), "actualSha256": digest(actual), "matched": matched}) + "\n")
        input_decode, output_decode = input_pipe.finish(), output_pipe.finish()
    finally:
        input_pipe.close()
        output_pipe.close()
    input_count_matches = input_decode["bytes"] == frames * frame_bytes
    output_count_matches = output_decode["bytes"] == expected_frames * frame_bytes
    passed = not changed and input_count_matches and output_count_matches
    planned_black = None if mode == "normal" else {"startFrame": boundary - (1 if mode == "soft" else 0),
        "endFrameExclusive": boundary + inserted + (1 if mode == "soft" else 0)}
    return {"status": "passed" if passed else "failed", "expectedFrames": expected_frames,
            "actualInputFrames": input_decode["bytes"] // frame_bytes,
            "actualOutputFrames": output_decode["bytes"] // frame_bytes,
            "actualInputTrailingBytes": input_decode["bytes"] % frame_bytes,
            "actualOutputTrailingBytes": output_decode["bytes"] % frame_bytes,
            "sourceFrameCount": frames, "checkedFrames": expected_frames,
            "matchedFrames": expected_frames - len(changed), "phaseCounts": phase_counts,
            "mismatchedDisplayFrames": changed, "firstMismatch": first_mismatch,
            "insertedFrameCount": inserted, "plannedCompletelyBlackSpan": planned_black,
            "actualCompletelyBlackDisplayFrames": complete_black_frames,
            "blackCountMeaning": "The designed black span includes fade endpoints. Naturally black source frames outside it are reported separately, not forbidden.",
            "inputRawYuv": input_decode, "outputRawYuv": output_decode,
            "perFrameEvidence": binding(row_path)}


def pcm_values(data):
    require(len(data) % (CHANNELS * 4) == 0, "PCM_BYTE_COUNT_MISMATCH", "PCM is not complete float32 stereo samples")
    values = array.array("f")
    require(values.itemsize == 4, "FLOAT_SIZE_MISMATCH", "Four-byte float support is required")
    values.frombytes(data)
    if sys.byteorder != "little":
        values.byteswap()
    require(all(math.isfinite(value) for value in values), "NONFINITE_PCM", "Decoded PCM contains a nonfinite sample")
    return values


def compare_pcm(commands, source, output, mode, boundary, frames):
    original, actual = commands.decode_pcm(source, "input"), commands.decode_pcm(output, "output")
    pcm_values(original)
    pcm_values(actual)
    require(len(original) == frames * SAMPLES_PER_FRAME * CHANNELS * 4,
            "INPUT_PCM_LENGTH_MISMATCH", "Source sample count differs from its frame clock")
    inserted_samples = 0 if mode == "normal" else INSERTED_FRAMES * SAMPLES_PER_FRAME
    at = boundary * SAMPLES_PER_FRAME * CHANNELS * 4
    expected = original[:at] + bytes(inserted_samples * CHANNELS * 4) + original[at:]
    difference = first_difference(expected, actual)
    if difference is not None:
        difference["samplePerChannel"] = difference["byteOffset"] // (CHANNELS * 4)
        difference["channel"] = (difference["byteOffset"] // 4) % CHANNELS
    return {"status": "passed" if actual == expected else "failed", "sourceSamplesPerChannel": len(original) // 8,
            "expectedSamplesPerChannel": len(expected) // 8, "actualSamplesPerChannel": len(actual) // 8,
            "insertAtSamplePerChannel": boundary * SAMPLES_PER_FRAME, "insertedZeroSamplesPerChannel": inserted_samples,
            "allRetainedPcmBytesAndChannelOrderIdentical": actual == expected,
            "sourcePcmSha256": digest(original), "expectedPcmSha256": digest(expected),
            "actualPcmSha256": digest(actual), "firstMismatch": difference}


def zero_observation(values, start, end):
    total = len(values) // CHANNELS
    require(0 <= start <= end <= total, "PCM_OBSERVATION_OUTSIDE_MEDIA", "Requested sample observation is out of bounds")
    channels = []
    for channel in range(CHANNELS):
        samples = values[start * CHANNELS + channel:end * CHANNELS:CHANNELS]
        runs = []
        run_start = None
        for offset, value in enumerate(samples):
            if value == 0 and run_start is None:
                run_start = start + offset
            if value != 0 and run_start is not None:
                runs.append([run_start, start + offset])
                run_start = None
        if run_start is not None:
            runs.append([run_start, end])
        zero_count = sum(right - left for left, right in runs)
        channels.append({"channel": channel, "zeroSamples": zero_count, "nonzeroSamples": len(samples) - zero_count,
                         "maximumAbsoluteSample": max((abs(value) for value in samples), default=0),
                         "exactZeroRuns": runs})
    return {"startSamplePerChannel": start, "endSamplePerChannelExclusive": end, "channels": channels}


def review_observation(commands, review, expected_frames, inserted_ranges, dimensions, seam_frames=None):
    require(type(expected_frames) is int and expected_frames > 0, "INVALID_FRAME_SCHEDULE", "Positive expected frame count required")
    previous_end = 0
    for start, end in inserted_ranges:
        require(type(start) is int and type(end) is int and 0 < start < end < expected_frames,
                "INVALID_INSERTED_RANGE", "Inserted range must lie inside the final media")
        require(end - start == INSERTED_FRAMES and start >= previous_end,
                "INVALID_INSERTED_RANGE", "Only ordered, nonoverlapping twelve-frame inserted ranges are supported")
        previous_end = end
    expected_samples = expected_frames * SAMPLES_PER_FRAME
    probe = commands.probe(review, "review", "metadata")
    video, audio, _ = metadata(probe, False, dimensions)
    frame_records = commands.probe(review, "review", "video-frames")
    packets = commands.probe(review, "review", "audio-packets")
    clock_video = video_clock(video, frame_records, expected_frames)
    clock_audio = audio_packet_clock(audio, packets, expected_samples, aac=True)
    pcm = commands.decode_pcm(review, "review")
    values = pcm_values(pcm)
    samples = len(values) // CHANNELS
    require(samples >= expected_samples, "AAC_DECODE_TRUNCATED", "AAC decode ends before the expected presentation interval")
    seams = sorted(set(frame * SAMPLES_PER_FRAME for interval in inserted_ranges for frame in interval))
    if seam_frames is not None:
        for frame in seam_frames:
            require(type(frame) is int and 0 < frame < expected_frames, "INVALID_SEAM", "Observed seam must lie inside the media")
        seams = sorted(set(seams + [frame * SAMPLES_PER_FRAME for frame in seam_frames]))
    waveform = []
    for seam in seams:
        waveform.append({"seamSamplePerChannel": seam,
                         "before": zero_observation(values, max(0, seam - SAMPLES_PER_FRAME), seam),
                         "after": zero_observation(values, seam, min(samples, seam + SAMPLES_PER_FRAME)),
                         "endpoints": [{"channel": channel, "left": values[(seam - 1) * CHANNELS + channel],
                                        "right": values[seam * CHANNELS + channel]} for channel in range(CHANNELS)]})
    return {"status": "passed", "scope": "Media clocks and decoded AAC observations; compressed pixel/fade equivalence needs the separate verified-intermediate encoding comparison.",
            "expectedFrameCount": expected_frames, "insertedRanges": [{"startFrame": start, "endFrameExclusive": end} for start, end in inserted_ranges],
            "videoClock": clock_video, "audioPacketClock": clock_audio,
            "expectedTimelineSamplesPerChannel": expected_samples, "decodedSamplesPerChannel": samples,
            "decodedTailDifferenceSamplesPerChannel": samples - expected_samples,
            "decodedPcmSha256": digest(pcm), "sampleIdentityClaim": False,
            "decodedTail": zero_observation(values, expected_samples, samples),
            "insertedIntervals": [zero_observation(values, start * SAMPLES_PER_FRAME, end * SAMPLES_PER_FRAME)
                                  for start, end in inserted_ranges],
            "insertionBoundaryObservations": waveform, "audibility": "not-evaluated",
            "compressedPixelIdentityClaim": False, "fadeAppearanceVerification": "not-performed-by-media-observation-only"}


def inspect_review(media, expected_frame_count, inserted_ranges, ffmpeg, ffprobe,
                   evidence_directory, expected_dimensions=None):
    """Observe one final MP4, including a bundle with several fixed insertions.

    Returns a small observation dict on success. Rejected.code describes a media
    contract failure; CommandFailed describes an observation-tool failure. Both
    failures are saved before they are raised. No encoding is performed here.
    """
    directory = safe_path(str(evidence_directory))
    safe_path(str(directory.parent.resolve(strict=True)))
    directory.mkdir()
    report = {"schemaVersion": SCHEMA + "-review", "status": "running", "inputBindings": []}
    try:
        report["inputBindings"] = [binding(pathlib.Path(value).absolute())
                                   for value in [media, ffmpeg, ffprobe, __file__, sys.executable]]
        commands = Commands(directory, str(ffmpeg), str(ffprobe))
        observation = review_observation(commands, str(media), expected_frame_count, inserted_ranges,
                                         expected_dimensions)
        after = [binding(pathlib.Path(ref["path"])) for ref in report["inputBindings"]]
        require(after == report["inputBindings"], "INPUT_CHANGED_DURING_CHECK", "Review input or measurement implementation changed")
        report.update(observation)
        report["inputBindingsUnchanged"] = True
        report["exitCode"] = 0
        save_json(directory / "result.json", report)
        return report
    except Exception as error:
        report["status"] = "failed" if isinstance(error, Rejected) else "error"
        report["exitCode"] = 1 if isinstance(error, Rejected) else 2
        report["failure"] = {"code": error.code if isinstance(error, Rejected) else type(error).__name__,
                             "message": str(error)}
        save_json(directory / "result.json", report)
        raise


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-lossless", required=True)
    parser.add_argument("--output-lossless", required=True)
    parser.add_argument("--mode", choices=("normal", "black", "soft"), required=True)
    parser.add_argument("--boundary-frame", type=int, default=120)
    parser.add_argument("--input-frames", type=int, default=240)
    parser.add_argument("--ffmpeg", required=True)
    parser.add_argument("--ffprobe", required=True)
    parser.add_argument("--evidence-directory", required=True)
    parser.add_argument("--review-mp4")
    return parser.parse_args()


def main(args):
    directory = safe_path(args.evidence_directory)
    safe_path(str(directory.parent.resolve(strict=True)))
    directory.mkdir()  # An existing proof directory is never replaced.
    result = {"schemaVersion": SCHEMA, "status": "running", "mode": args.mode,
              "inputFrameCount": args.input_frames, "boundaryFrame": args.boundary_frame,
              "scope": "Finite technical fixture only; no automatic placement, human quality or formal-job admission claim.",
              "independentOracle": {"rendererCodeImported": False, "pixelFormat": "yuv420p", "blackYuv": [16, 128, 128],
                  "outgoingSixFrameNumeratorsOverFive": [5, 4, 3, 2, 1, 0], "incomingSixFrameNumeratorsOverFive": [0, 1, 2, 3, 4, 5],
                  "rounding": "floor((inputByte * numerator + blackByte * (5 - numerator) + 2) / 5)",
                  "coefficientFive": "unaltered input bytes", "insertedFrames": 12, "insertedZeroSamplesPerChannel": 19200},
              "checks": {}, "violations": [], "commandFailures": [], "inputBindings": [], "inputRechecks": []}
    exit_code = 2
    try:
        require(args.input_frames > 0 and 0 < args.boundary_frame < args.input_frames,
                "INVALID_FRAME_SCHEDULE", "Boundary must be inside the original frame interval")
        if args.mode == "soft":
            require(args.boundary_frame >= FADE_FRAMES and args.input_frames - args.boundary_frame >= FADE_FRAMES,
                    "FADE_WINDOW_OUTSIDE_INPUT", "Both complete six-frame windows must fit")
        supplied = [args.input_lossless, args.output_lossless, args.ffmpeg, args.ffprobe, __file__, sys.executable]
        if args.review_mp4:
            supplied.append(args.review_mp4)
        result["inputBindings"] = [binding(pathlib.Path(value).absolute()) for value in supplied]
        require(result["inputBindings"][0]["realPath"] != result["inputBindings"][1]["realPath"],
                "SAME_INPUT_AND_OUTPUT", "Use a separately saved output media")
        commands = Commands(directory, args.ffmpeg, args.ffprobe)
        dimensions = None
        expected = args.input_frames + (0 if args.mode == "normal" else INSERTED_FRAMES)
        for name, file, frame_count in [("input", args.input_lossless, args.input_frames), ("output", args.output_lossless, expected)]:
            probe = commands.probe(file, name, "metadata")
            video, audio, dimensions = metadata(probe, True, dimensions)
            result["checks"][name + "Clock"] = {"video": video_clock(video, commands.probe(file, name, "video-frames"), frame_count),
                "audio": audio_packet_clock(audio, commands.probe(file, name, "audio-packets"), frame_count * SAMPLES_PER_FRAME),
                "width": dimensions[0], "height": dimensions[1], "videoColorRange": video.get("color_range")}
        result["checks"]["losslessVideo"] = compare_video(commands, args.input_lossless, args.output_lossless,
                                                           args.mode, args.boundary_frame, args.input_frames, dimensions)
        result["checks"]["losslessAudio"] = compare_pcm(commands, args.input_lossless, args.output_lossless,
                                                        args.mode, args.boundary_frame, args.input_frames)
        for key, code in [("losslessVideo", "VIDEO_FRAME_BYTES_MISMATCH"), ("losslessAudio", "AUDIO_PCM_BYTES_MISMATCH")]:
            if result["checks"][key]["status"] != "passed":
                result["violations"].append({"code": code, "firstMismatch": result["checks"][key]["firstMismatch"]})
        if args.review_mp4:
            result["checks"]["reviewMp4"] = review_observation(commands, args.review_mp4, expected,
                [] if args.mode == "normal" else [(args.boundary_frame, args.boundary_frame + INSERTED_FRAMES)],
                dimensions, seam_frames=[args.boundary_frame] if args.mode == "normal" else None)
        for previous in result["inputBindings"]:
            after = binding(pathlib.Path(previous["path"]))
            unchanged = previous == after
            result["inputRechecks"].append({"path": previous["path"], "fileSha256": after["fileSha256"], "unchanged": unchanged})
            require(unchanged, "INPUT_CHANGED_DURING_CHECK", previous["path"])
        result["status"] = "failed" if result["violations"] else "passed"
        exit_code = 1 if result["violations"] else 0
    except Rejected as error:
        result["status"] = "failed"
        result["violations"].append({"code": error.code, "message": str(error)})
        exit_code = 1
    except Exception as error:
        result["status"] = "error"
        result["commandFailures"].append({"type": type(error).__name__, "message": str(error)})
        exit_code = 2
    result["completedAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    result["exitCode"] = exit_code
    save_json(directory / "result.json", result)
    print(json.dumps({"status": result["status"], "exitCode": exit_code, "resultPath": str(directory / "result.json"),
                      "violationCodes": [row["code"] for row in result["violations"]]}))
    return exit_code


if __name__ == "__main__":
    sys.exit(main(arguments()))

#!/usr/bin/env python3
"""Read-only measurements of the eleven existing canonical Digest excerpts.

This research runner reads existing media and writes evidence into a new directory.
It does not render a transition, change a retained range, or assess naturalness.
All arguments are explicit; run --help for the CLI. No third-party Python packages.
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
from decimal import Decimal, localcontext
from fractions import Fraction


FPS = 30
SAMPLE_RATE = 48000
CHANNELS = 2
SAMPLES_PER_FRAME = SAMPLE_RATE // FPS
EXCERPT_FRAMES = 240
BOUNDARY_FRAME = 120
EXCERPT_SAMPLES = EXCERPT_FRAMES * SAMPLES_PER_FRAME
WIDTH = 1920
HEIGHT = 1080
REQUIRED_CONNECTIONS = 11
SCHEMA = "digest-connections-physical-observation-research-v001"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def integer(value, name, minimum=0):
    require(type(value) is int and value >= minimum, f"{name}: invalid integer")
    return value


def observed_integer(value, name, minimum=None):
    require(type(value) is int or (isinstance(value, str) and re.fullmatch(r"-?\d+", value)),
            f"{name}: missing or noninteger observed value")
    result = int(value)
    if minimum is not None:
        require(result >= minimum, f"{name}: value below {minimum}")
    return result


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def sha_bytes(data):
    return hashlib.sha256(data).hexdigest()


def file_sha(file):
    digest = hashlib.sha256()
    with file.open("rb") as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def safe_absolute(value, label):
    file = pathlib.Path(value)
    require(file.is_absolute(), f"{label}: absolute path required")
    require(not any(re.search(r"archive|退避", part, re.I) for part in file.parts),
            f"{label}: archive paths are outside this study")
    return file


def save_json(file, value):
    with file.open("x", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
        stream.write("\n")


def save_bytes(file, value):
    with file.open("xb") as stream:
        stream.write(value)


def read_json(file):
    return json.loads(file.read_text(encoding="utf-8"))


class Inputs:
    def __init__(self):
        self.items = {}

    def bind(self, value, label, expected_sha=None, expected_bytes=None):
        file = safe_absolute(value, label)
        resolved = safe_absolute(file.resolve(strict=True), label)
        require(resolved.is_file(), f"{label}: regular file required")
        key = str(file)
        if key not in self.items:
            self.items[key] = {
                "path": key, "resolvedPath": str(resolved), "bytes": resolved.stat().st_size,
                "sha256": file_sha(resolved), "roles": [label],
            }
        record = self.items[key]
        require(record["resolvedPath"] == str(resolved), f"{label}: input target changed")
        if label not in record["roles"]:
            record["roles"].append(label)
        if expected_sha is not None:
            require(isinstance(expected_sha, str) and re.fullmatch(r"[a-f0-9]{64}", expected_sha),
                    f"{label}: invalid expected SHA-256")
            require(record["sha256"] == expected_sha, f"{label}: SHA-256 differs")
        if expected_bytes is not None:
            require(record["bytes"] == expected_bytes, f"{label}: byte length differs")
        return record

    def recheck(self):
        results = []
        for before in self.items.values():
            file = pathlib.Path(before["path"])
            resolved = safe_absolute(file.resolve(strict=True), "input after execution")
            after_sha = file_sha(resolved)
            result = {
                "path": before["path"], "resolvedPath": str(resolved),
                "beforeSha256": before["sha256"], "afterSha256": after_sha,
                "beforeBytes": before["bytes"], "afterBytes": resolved.stat().st_size,
            }
            result["unchanged"] = (str(resolved) == before["resolvedPath"]
                                   and after_sha == before["sha256"]
                                   and result["afterBytes"] == before["bytes"])
            results.append(result)
        return results


class Commands:
    def __init__(self, output, ffmpeg, ffprobe):
        self.log = output / "commands.jsonl"
        self.log.touch(exist_ok=False)
        self.ffmpeg = ffmpeg
        self.ffprobe = ffprobe
        self.number = 0

    def event(self, value):
        with self.log.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(value, ensure_ascii=False, allow_nan=False) + "\n")

    def run(self, argv, stdout_file=None):
        self.number += 1
        number = self.number
        argv = [str(value) for value in argv]
        self.event({"number": number, "event": "started", "at": now(), "argv": argv})
        try:
            process = subprocess.run(argv, stdin=subprocess.DEVNULL, capture_output=True, check=False)
        except OSError as error:
            self.event({"number": number, "event": "launch-failed", "at": now(), "message": str(error)})
            raise
        if stdout_file is not None:
            save_bytes(stdout_file, process.stdout)
        self.event({
            "number": number, "event": "finished", "at": now(), "exitCode": process.returncode,
            "stdoutBytes": len(process.stdout), "stdoutSha256": sha_bytes(process.stdout),
            "stdoutPath": str(stdout_file) if stdout_file else None,
            "stderrBytes": len(process.stderr), "stderrSha256": sha_bytes(process.stderr),
            "stderr": process.stderr.decode("utf-8", errors="replace"),
        })
        require(process.returncode == 0, f"command {number} failed with exit {process.returncode}")
        return process.stdout

    def ff(self, args, stdout_file=None):
        return self.run([self.ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-n", *args], stdout_file)

    def probe(self, media, file, frames=False, packets=False):
        options = []
        if frames:
            options += ["-count_frames", "-show_frames"]
        if packets:
            options += ["-select_streams", "a:0", "-show_packets"]
        options += ["-show_streams", "-show_format", "-of", "json"]
        return json.loads(self.run([self.ffprobe, "-v", "error", *options, media], file))


def unique_stream(probe, kind):
    streams = [stream for stream in probe["streams"] if stream["codec_type"] == kind]
    require(len(streams) == 1, f"exactly one {kind} stream required")
    return streams[0]


def time_base(stream, name):
    raw = stream.get("time_base")
    require(isinstance(raw, str) and re.fullmatch(r"\d+/\d+", raw), f"{name}: invalid time base")
    value = Fraction(raw)
    require(value > 0, f"{name}: nonpositive time base")
    return value


def ticks_at_frame(frame, stream, name):
    value = Fraction(integer(frame, f"{name} frame"), FPS) / time_base(stream, name)
    require(value.denominator == 1, f"{name}: frame boundary is not an integer stream timestamp")
    return value.numerator


def assert_streams(probe, video_codec, audio_codec, frame_count, counted=False):
    require(len(probe["streams"]) == 2, "media must have exactly one video and one audio stream")
    video, audio = unique_stream(probe, "video"), unique_stream(probe, "audio")
    require(video["codec_name"] == video_codec and video["pix_fmt"] == "yuv420p", "video format differs")
    require(video["width"] == WIDTH and video["height"] == HEIGHT, "video dimensions differ")
    require(video["r_frame_rate"] == "30/1" and video["avg_frame_rate"] == "30/1", "video frame rate differs")
    count_field = "nb_read_frames" if counted else "nb_frames"
    require(observed_integer(video.get(count_field), "observed video frame count", 1) == frame_count,
            "observed video frame count differs")
    require(audio["codec_name"] == audio_codec, "audio codec differs")
    require(observed_integer(audio.get("sample_rate"), "audio sample rate", 1) == SAMPLE_RATE,
            "audio sample rate differs")
    require(audio["channels"] == CHANNELS, "audio channel count differs")
    if audio_codec == "aac":
        require(audio.get("channel_layout") == "stereo", "canonical/review AAC channel layout differs")
    else:
        # The measured PCM NUT files have two channels but omit a named layout.
        # Their channel order is established by byte equality with direct decode
        # of the canonical stereo stream, not inferred from this missing field.
        require(audio.get("channel_layout") in (None, "stereo"), "PCM stream declares a conflicting channel layout")
    for name, stream in [("video", video), ("audio", audio)]:
        require(observed_integer(stream.get("start_pts"), f"{name} start PTS") == 0, f"{name} does not start at zero")
        require(Fraction(stream["start_time"]) == 0, f"{name} start time is not zero")
        time_base(stream, name)
    return video, audio


def sample_at_tick(tick, stream, name):
    value = observed_integer(tick, name) * time_base(stream, name) * SAMPLE_RATE
    require(value.denominator == 1, f"{name}: timestamp is not on the 48000Hz sample grid")
    return value.numerator


def check_lossless_clocks(probe, packets, frame_count):
    video, audio = unique_stream(probe, "video"), unique_stream(probe, "audio")
    video_frames = [frame for frame in probe["frames"] if frame["media_type"] == "video"]
    audio_frames = [frame for frame in probe["frames"] if frame["media_type"] == "audio"]
    require(len(video_frames) == frame_count, "decoded frame record count differs")
    video_rows = []
    ticks_per_frame = ticks_at_frame(1, video, "excerpt video")
    for index, frame in enumerate(video_frames):
        pts = observed_integer(frame.get("pts"), "decoded video PTS")
        duration = observed_integer(frame.get("duration"), "decoded video duration", 1)
        require(frame["stream_index"] == video["index"], "video frame stream differs")
        require(pts == index * ticks_per_frame and duration == ticks_per_frame,
                "video frame timestamp gap, overlap, or duration mismatch")
        video_rows.append({"frame": index, "pts": pts, "durationTicks": duration})
    audio_rows = []
    end = 0
    for index, frame in enumerate(audio_frames):
        require(frame["stream_index"] == audio["index"], "audio frame stream differs")
        start = sample_at_tick(frame.get("pts"), audio, "decoded audio PTS")
        count = observed_integer(frame.get("nb_samples"), "decoded audio samples", 1)
        require(start == end, "decoded audio frame has a sample gap or overlap")
        end += count
        audio_rows.append({"decodedAudioFrame": index, "startSample": start, "endSampleExclusive": end,
                           "samplesPerChannel": count})
    require(end == frame_count * SAMPLES_PER_FRAME, "decoded audio clock length differs")
    packet_rows = []
    packet_end = 0
    for index, packet in enumerate(packets["packets"]):
        require(packet["stream_index"] == audio["index"], "audio packet stream differs")
        start = sample_at_tick(packet.get("pts"), audio, "audio packet PTS")
        duration = sample_at_tick(packet.get("duration"), audio, "audio packet duration")
        require(duration > 0 and start == packet_end, "audio packet has a sample gap or overlap")
        packet_end += duration
        packet_rows.append({"packet": index, "startSample": start, "endSampleExclusive": packet_end,
                            "samplesPerChannel": duration})
    require(packet_end == end, "audio packet clock differs from decoded sample clock")
    return {
        "videoTimeBase": video["time_base"], "videoTicksPerFrame": ticks_per_frame,
        "videoFrameCount": len(video_rows), "videoContinuous": True, "videoFrames": video_rows,
        "audioTimeBase": audio["time_base"], "sampleRate": SAMPLE_RATE,
        "decodedAudioContinuous": True, "decodedAudioSamplesPerChannel": end, "decodedAudioFrames": audio_rows,
        "audioPacketsContinuous": True, "packetSamplesPerChannel": packet_end, "audioPackets": packet_rows,
    }


def parse_framehash(raw, count):
    text = raw.decode("utf-8")
    require(re.search(r"^#tb 0: 1/30$", text, re.M), "framehash time base differs from 1/30")
    rows = []
    for line in text.splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        fields = [value.strip() for value in line.split(",")]
        require(len(fields) == 6, "unexpected framehash row")
        stream, dts, pts, duration, byte_count = map(int, fields[:5])
        number = len(rows)
        require((stream, dts, pts, duration) == (0, number, number, 1), "framehash clock is not contiguous")
        require(byte_count == WIDTH * HEIGHT * 3 // 2, "framehash payload is not 1920x1080 yuv420p")
        require(re.fullmatch(r"[a-f0-9]{64}", fields[5]), "invalid frame SHA-256")
        rows.append({"frame": number, "pts": pts, "duration": duration, "bytes": byte_count, "sha256": fields[5]})
    require(len(rows) == count, "decoded framehash count differs")
    return rows


def framehash(commands, input_args, evidence_file, video_filter=None):
    filters = ["-vf", video_filter] if video_filter else []
    raw = commands.ff([*input_args, "-map", "0:v:0", "-an", *filters, "-c:v", "rawvideo",
                       "-pix_fmt", "yuv420p", "-fps_mode", "passthrough", "-f", "framehash", "-hash", "sha256", "-"],
                      evidence_file)
    return parse_framehash(raw, EXCERPT_FRAMES)


def decode_pcm(commands, input_args, audio_filter=None):
    filters = ["-af", audio_filter] if audio_filter else []
    return commands.ff([*input_args, "-map", "0:a:0", "-vn", *filters,
                        "-c:a", "pcm_f32le", "-f", "f32le", "-"])


def verify_canonical(commands, canonical, canonical_probe, item, directory, excerpt_hashes, excerpt_pcm):
    video, audio = unique_stream(canonical_probe, "video"), unique_stream(canonical_probe, "audio")
    start, end = item["canonicalStartFrame"], item["canonicalEndFrameExclusive"]
    with localcontext() as context:
        context.prec = 30
        seek = format(Decimal(max(0, start - FPS)) / Decimal(FPS), ".15f")
    window = {
        "canonicalPath": canonical["path"], "canonicalSha256": canonical["sha256"],
        "startFrame": start, "endFrameExclusive": end, "frameCount": EXCERPT_FRAMES,
        "videoTimeBase": video["time_base"], "videoStartPts": ticks_at_frame(start, video, "canonical video"),
        "videoEndPtsExclusive": ticks_at_frame(end, video, "canonical video"),
        "audioTimeBase": audio["time_base"], "audioStartPts": ticks_at_frame(start, audio, "canonical audio"),
        "audioEndPtsExclusive": ticks_at_frame(end, audio, "canonical audio"),
        "audioStartSamplePerChannel": start * SAMPLES_PER_FRAME,
        "audioEndSamplePerChannelExclusive": end * SAMPLES_PER_FRAME,
        "seekSeconds": seek, "copyInputTimestamps": True,
        "seekMeaning": "One-second decoder preroll only. Integer stream PTS define the exact half-open observation window.",
    }
    save_json(directory / "canonical-window.json", window)
    input_args = ["-copyts", "-ss", seek, "-i", canonical["resolvedPath"]]
    canonical_hashes = framehash(commands, input_args, directory / "canonical-window.framehash",
                                f"trim=start_pts={window['videoStartPts']}:end_pts={window['videoEndPtsExclusive']},setpts=PTS-STARTPTS")
    canonical_pcm = decode_pcm(commands, input_args,
                               f"atrim=start_pts={window['audioStartPts']}:end_pts={window['audioEndPtsExclusive']},asetpts=PTS-STARTPTS")
    expected_sequence = [row["sha256"] for row in canonical_hashes]
    actual_sequence = [row["sha256"] for row in excerpt_hashes]
    frame_differences = [index for index, (expected, actual) in enumerate(zip(expected_sequence, actual_sequence))
                         if expected != actual]
    same_frames = expected_sequence == actual_sequence
    same_pcm = canonical_pcm == excerpt_pcm
    expected_bytes = EXCERPT_SAMPLES * CHANNELS * 4
    first_byte_difference = next((index for index, (a, b) in enumerate(zip(canonical_pcm, excerpt_pcm)) if a != b), None)
    result = {
        "status": "passed" if same_frames and same_pcm and len(canonical_pcm) == expected_bytes else "failed",
        "scope": "Every decoded frame and every float32 PCM byte of this canonical Digest window; not a comparison with media before captions were burned in.",
        "canonicalStartFrame": start, "canonicalEndFrameExclusive": end,
        "canonicalFrameSequenceSha256": sha_bytes("\n".join(expected_sequence).encode()),
        "excerptFrameSequenceSha256": sha_bytes("\n".join(actual_sequence).encode()),
        "checkedFrameCount": EXCERPT_FRAMES, "completeFrameSequenceEqual": same_frames,
        "differingExcerptFrameIndices": frame_differences,
        "canonicalDecodedPcmSha256": sha_bytes(canonical_pcm), "excerptDecodedPcmSha256": sha_bytes(excerpt_pcm),
        "canonicalPcmBytes": len(canonical_pcm), "excerptPcmBytes": len(excerpt_pcm),
        "expectedPcmBytes": expected_bytes, "checkedSamplesPerChannel": EXCERPT_SAMPLES,
        "completeFloat32PcmByteEqual": same_pcm, "firstDifferentPcmByteOffset": first_byte_difference,
    }
    save_json(directory / "canonical-window-verification.json", result)
    require(result["status"] == "passed", "excerpt differs from the specified canonical frame/audio window")
    return result


def picture_changes(commands, lossless, excerpt_hashes, directory):
    first_frame, end_frame = 118, 122
    raw = commands.ff(["-i", lossless, "-map", "0:v:0", "-an", "-vf",
                       f"trim=start_frame={first_frame}:end_frame={end_frame},setpts=PTS-STARTPTS",
                       "-c:v", "rawvideo", "-pix_fmt", "yuv420p", "-fps_mode", "passthrough", "-f", "rawvideo", "-"])
    frame_bytes = WIDTH * HEIGHT * 3 // 2
    require(len(raw) == (end_frame - first_frame) * frame_bytes, "four-frame raw video size differs")
    frames = [memoryview(raw)[index * frame_bytes:(index + 1) * frame_bytes] for index in range(4)]
    for index, frame in enumerate(frames):
        require(sha_bytes(frame) == excerpt_hashes[first_frame + index]["sha256"], "raw measurement frame differs from excerpt framehash")
    plane_specs = [("Y", 0, WIDTH * HEIGHT, WIDTH, HEIGHT),
                   ("U", WIDTH * HEIGHT, WIDTH * HEIGHT // 4, WIDTH // 2, HEIGHT // 2),
                   ("V", WIDTH * HEIGHT * 5 // 4, WIDTH * HEIGHT // 4, WIDTH // 2, HEIGHT // 2)]
    pairs = []
    for pair_index in range(3):
        before_frame = first_frame + pair_index
        planes = []
        for plane_name, offset, count, width, height in plane_specs:
            histogram = [0] * 256
            # bytes yield unsigned 0..255 Python ints; subtraction is signed and
            # sums are unbounded Python integers, not uint8 arithmetic.
            for left, right in zip(frames[pair_index][offset:offset + count], frames[pair_index + 1][offset:offset + count]):
                histogram[abs(int(right) - int(left))] += 1
            require(sum(histogram) == count, "pixel histogram count differs")
            absolute_sum = sum(difference * observations for difference, observations in enumerate(histogram))
            planes.append({
                "plane": plane_name, "width": width, "height": height, "sampleCount": count,
                "changedSampleCount": count - histogram[0], "absoluteDifferenceSum": absolute_sum,
                "meanAbsoluteDifference": absolute_sum / count,
                "maximumAbsoluteDifference": max(index for index, occurrences in enumerate(histogram) if occurrences),
                "absoluteDifferenceHistogramBins0Through255": histogram,
            })
        pairs.append({"beforeExcerptFrame": before_frame, "afterExcerptFrame": before_frame + 1,
                      "isConnectionBoundary": before_frame + 1 == BOUNDARY_FRAME, "planes": planes})
    result = {
        "scope": "Raw 8-bit YUV420p plane codes including burned-in captions. No perceptual classification, threshold, weighting, or score.",
        "rawMeasurementBytes": len(raw), "rawMeasurementSha256": sha_bytes(raw),
        "measuredExcerptFrames": list(range(first_frame, end_frame)), "pairs": pairs,
    }
    save_json(directory / "image-differences.json", result)
    return result


def rms(values):
    require(len(values) > 0, "RMS requires samples")
    return math.sqrt(math.fsum(float(value) * float(value) for value in values) / len(values))


def level_change(before, after):
    return {
        "beforeRms": before, "afterRms": after, "afterMinusBeforeRms": after - before,
        "afterDividedByBeforeRms": after / before if before != 0 else None,
        "ratioUndefinedReason": "before RMS is exactly zero; no epsilon or replacement value was used" if before == 0 else None,
    }


def exact_zero_runs(values, total):
    runs, start = [], None
    consumed = 0
    for index, zero in enumerate(values):
        consumed += 1
        if zero and start is None:
            start = index
        if not zero and start is not None:
            runs.append((start, index))
            start = None
    require(consumed == total, "zero-run sample count differs")
    if start is not None:
        runs.append((start, total))
    return [{
        "startSample": begin, "endSampleExclusive": end, "sampleCount": end - begin,
        "durationSeconds": (end - begin) / SAMPLE_RATE,
        "touchesObservationStart": begin == 0, "touchesObservationEnd": end == total,
        "continuationBeforeWindow": "not-observed" if begin == 0 else "preceding sample is nonzero",
        "continuationAfterWindow": "not-observed" if end == total else "following sample is nonzero",
    } for begin, end in runs]


def audio_measurements(pcm, directory):
    require(len(pcm) == EXCERPT_SAMPLES * CHANNELS * 4, "decoded PCM length differs")
    require(sys.byteorder == "little", "this research runner requires the measured little-endian environment")
    interleaved = array.array("f")
    require(interleaved.itemsize == 4, "float32 array width differs")
    interleaved.frombytes(pcm)
    require(all(math.isfinite(value) for value in interleaved), "nonfinite PCM sample")
    split = [interleaved[channel::CHANNELS] for channel in range(CHANNELS)]
    boundary_sample = BOUNDARY_FRAME * SAMPLES_PER_FRAME
    channels = []
    for channel, values in enumerate(split):
        frames = []
        for frame in range(EXCERPT_FRAMES):
            start, end = frame * SAMPLES_PER_FRAME, (frame + 1) * SAMPLES_PER_FRAME
            samples = values[start:end]
            low, high = min(samples), max(samples)
            frames.append({
                "excerptFrame": frame, "startSample": start, "endSampleExclusive": end,
                "sampleCount": len(samples), "minimum": float(low), "maximum": float(high),
                "rms": rms(samples), "firstSample": float(samples[0]), "lastSample": float(samples[-1]),
                "peakAbsolute": max(abs(float(low)), abs(float(high))),
            })
        before_rms, after_rms = rms(values[:boundary_sample]), rms(values[boundary_sample:])
        left, right = float(values[boundary_sample - 1]), float(values[boundary_sample])
        runs = exact_zero_runs((value == 0.0 for value in values), len(values))
        channels.append({
            "channelIndex": channel, "channelName": ["FL", "FR"][channel], "frameMeasurements": frames,
            "boundaryEndpointSamples": {"beforeSampleIndex": boundary_sample - 1, "afterSampleIndex": boundary_sample,
                                         "beforeValue": left, "afterValue": right, "signedDifference": right - left,
                                         "absoluteDifference": abs(right - left)},
            "adjacentFrameLevelChange": {"beforeExcerptFrame": BOUNDARY_FRAME - 1, "afterExcerptFrame": BOUNDARY_FRAME,
                                          **level_change(frames[BOUNDARY_FRAME - 1]["rms"], frames[BOUNDARY_FRAME]["rms"])},
            "beforeAfterFourSecondLevelChange": {"beforeSamples": [0, boundary_sample],
                                                 "afterSamples": [boundary_sample, len(values)], **level_change(before_rms, after_rms)},
            "exactZeroSampleCount": sum(run["sampleCount"] for run in runs), "exactZeroRuns": runs,
        })
    joint_runs = exact_zero_runs((left == 0.0 and right == 0.0 for left, right in zip(*split)), EXCERPT_SAMPLES)
    result = {
        "scope": "Unweighted measurements of decoded float32 PCM. Numeric exact zero includes +0 and -0; it does not establish audible silence. Endpoint differences do not establish audible clicks.",
        "arithmetic": "PCM byte identity is checked separately. Numerical sample calculations use Python float64 and math.fsum; no clipping, resampling, smoothing, noise threshold, or epsilon.",
        "sampleRate": SAMPLE_RATE, "samplesPerChannel": EXCERPT_SAMPLES, "channelOrder": ["FL", "FR"],
        "channelOrderEvidence": "Exact interleaved PCM byte equality with direct decode of the canonical stereo AAC stream; PCM NUT itself may omit a named channel layout.",
        "samplesPerVideoFrame": SAMPLES_PER_FRAME, "boundarySamplePerChannel": boundary_sample,
        "decodedPcmSha256": sha_bytes(pcm), "decodedPcmBytes": len(pcm), "channels": channels,
        "bothChannelsExactZeroSampleCount": sum(run["sampleCount"] for run in joint_runs),
        "bothChannelsExactZeroRuns": joint_runs,
        "windowEdgeMeaning": "A run touching the observation edge is censored there; continuation outside the eight-second window was not observed.",
        "audibleClickVerdict": "not-assessed", "audibleSilenceVerdict": "not-assessed",
    }
    save_json(directory / "audio-measurements.json", result)
    return result


def validate_canonical_structure(completion, timeline, plan, adoption, generation, bridge, prospects):
    require(completion["phase2Status"] == "completed", "completion record is not completed")
    require(timeline["schemaVersion"] == "presentation-base-media-timeline-v003", "timeline schema differs")
    require(timeline["baseMedia"]["frameRate"] == "30/1", "timeline rate differs")
    clock = timeline["sourceFrameClock"]
    require(clock["logicalFrameRate"] == "30/1" and clock["inputFrameRate"] == "60/1"
            and clock["extractionRuleId"] == "source-frame-60fps-global-even-v001", "canonical source frame extraction differs")
    require(plan["canvas"]["fps"] == FPS and plan["canvas"]["width"] == WIDTH and plan["canvas"]["height"] == HEIGHT,
            "canonical canvas differs")
    segments = timeline["segments"]
    require(len(segments) == REQUIRED_CONNECTIONS + 1 == len(adoption["segments"]) == len(generation["segments"]),
            "canonical retained segment count differs")
    require(prospects["sourceId"] == timeline["sourceRef"], "source IDs differ")
    require(generation["source"]["sourceRef"] == timeline["sourceRef"], "generation source ID differs")
    end, segment_ids = 0, set()
    for segment, adopted, generated in zip(segments, adoption["segments"], generation["segments"]):
        require(segment["segmentId"] not in segment_ids, "duplicate canonical segment")
        segment_ids.add(segment["segmentId"])
        for key in ["sourceStartFrame30", "sourceEndFrame30", "outputStartFrame", "outputEndFrame"]:
            integer(segment[key], key)
        require(segment["outputStartFrame"] == end and segment["outputEndFrame"] > end, "canonical timeline is not contiguous")
        require(segment["sourceEndFrame30"] - segment["sourceStartFrame30"] == segment["outputEndFrame"] - end,
                "canonical segment duration differs from source grid duration")
        end = segment["outputEndFrame"]
        for key in ["segmentId", "sourceStartMs", "sourceEndMs"]:
            require(segment[key] == adopted[key] == generated[key], f"canonical {key} differs")
        for key in ["sourceStartFrame30", "sourceEndFrame30", "outputStartFrame", "outputEndFrame"]:
            require(segment[key] == generated[key], f"canonical generation {key} differs")
        samples = generated["audioSamples"]
        require(samples == {"sourceStart": segment["sourceStartFrame30"] * SAMPLES_PER_FRAME,
                            "sourceEnd": segment["sourceEndFrame30"] * SAMPLES_PER_FRAME,
                            "outputStart": segment["outputStartFrame"] * SAMPLES_PER_FRAME,
                            "outputEnd": segment["outputEndFrame"] * SAMPLES_PER_FRAME}, "canonical audio/source mapping differs")
        require(len(adopted["retainedRanges"]) > 0, "segment has no retained provenance")
    require(end == timeline["baseMedia"]["expectedFrameCount"] == completion["technicalResults"]["frameCount"],
            "canonical total frame count differs")
    require(len(plan["elements"]) == 325 == completion["productionRoute"]["captionCount"], "canonical caption count differs")
    require(len(prospects["candidates"]) == completion["productionRoute"]["prospectCount"], "canonical Prospect count differs")
    require(sum(len(segment["retainedRanges"]) for segment in adoption["segments"]) == completion["productionRoute"]["retainedRangeCount"],
            "canonical retained range count differs")
    projections = {item["instructionId"]: item for item in bridge["boundaryProjection"]}
    require(len(projections) == len(plan["elements"]) == len(bridge["boundaryProjection"]), "caption projection count differs")
    caption_ids = set()
    for caption in plan["elements"]:
        require(caption["instructionId"] not in caption_ids and caption["instructionId"] in projections, "caption ID/projection differs")
        caption_ids.add(caption["instructionId"])
        integer(caption["startFrame"], "caption start")
        integer(caption["endFrameExclusive"], "caption end", 1)
        require(caption["startFrame"] < caption["endFrameExclusive"] <= end, "caption range invalid")
        require(caption["displayFrameCount"] == caption["endFrameExclusive"] - caption["startFrame"], "caption length differs")
    return projections


def connection_structure(ordinal, item, timeline, plan, adoption, projections, inventory_connection):
    before, after = timeline["segments"][ordinal - 1:ordinal + 1]
    before_adopted, after_adopted = adoption["segments"][ordinal - 1:ordinal + 1]
    boundary = after["outputStartFrame"]
    start, end = item["canonicalStartFrame"], item["canonicalEndFrameExclusive"]
    require(boundary == item["canonicalBoundaryFrame"] == before["outputEndFrame"], "connection boundary differs")
    require(boundary - start == BOUNDARY_FRAME and end - start == EXCERPT_FRAMES, "observation window differs")
    require(start >= before["outputStartFrame"] and end <= after["outputEndFrame"], "window extends beyond the adjacent two segments")
    require(inventory_connection["leftSegmentId"] == before["segmentId"]
            and inventory_connection["rightSegmentId"] == after["segmentId"]
            and inventory_connection["boundaryOutputFrame"] == boundary, "inventory connection differs")
    gap_ms = after["sourceStartMs"] - before["sourceEndMs"]
    require(inventory_connection["sourceGapMillisecondsNominal"] == gap_ms, "inventory source gap differs")
    captions = []
    for caption in plan["elements"]:
        first, final = caption["startFrame"], caption["endFrameExclusive"]
        relation = "before" if final <= boundary else "after" if first >= boundary else "crosses"
        projection = projections[caption["instructionId"]]
        captions.append({
            "captionId": caption["instructionId"], "text": caption["text"], "canonicalFrames": [first, final],
            "relationToBoundary": relation, "timelineSegmentId": projection["timelineSegmentId"],
            "nominalSourceMilliseconds": [projection["sourceStartMs"], projection["sourceEndMs"]],
            "excerptIntersection": [max(first, start) - start, min(final, end) - start] if first < end and final > start else None,
            "clippedAtObservationStart": first < start < final, "clippedAtObservationEnd": first < end < final,
        })
    crossings = [caption["captionId"] for caption in captions if caption["relationToBoundary"] == "crosses"]
    require(not crossings and not inventory_connection["captionCrossingBoundary"], "caption crosses canonical connection")
    nearest_before = max((caption for caption in captions if caption["relationToBoundary"] == "before"), key=lambda value: value["canonicalFrames"][1])
    nearest_after = min((caption for caption in captions if caption["relationToBoundary"] == "after"), key=lambda value: value["canonicalFrames"][0])
    source_map = []
    for local_frame in range(EXCERPT_FRAMES):
        canonical_frame = start + local_frame
        segment = before if canonical_frame < boundary else after
        require(segment["outputStartFrame"] <= canonical_frame < segment["outputEndFrame"], "unmapped observation frame")
        source_frame = segment["sourceStartFrame30"] + canonical_frame - segment["outputStartFrame"]
        source_map.append({
            "excerptFrame": local_frame, "canonicalFrame": canonical_frame, "segmentId": segment["segmentId"],
            "sourceId": timeline["sourceRef"], "logicalSourceFrame30": source_frame, "decodedSourceFrame60": 2 * source_frame,
            "excerptAudioSamples": [local_frame * SAMPLES_PER_FRAME, (local_frame + 1) * SAMPLES_PER_FRAME],
            "canonicalAudioSamples": [canonical_frame * SAMPLES_PER_FRAME, (canonical_frame + 1) * SAMPLES_PER_FRAME],
            "logicalSourceAudioSamples": [source_frame * SAMPLES_PER_FRAME, (source_frame + 1) * SAMPLES_PER_FRAME],
        })
    def retained_side(segment, adopted):
        return {"segment": segment, "prospectIds": adopted["candidateIds"],
                "retainedRanges": [{key: retained[key] for key in ["candidateId", "blockOrdinal", "sourceStartMs", "sourceEndMs", "segmentId", "meaningRoles", "reason"]}
                                   for retained in adopted["retainedRanges"]]}
    return {
        "connectionId": item["connectionId"], "inventoryConnectionId": inventory_connection["connectionId"],
        "sourceId": timeline["sourceRef"], "before": retained_side(before, before_adopted), "after": retained_side(after, after_adopted),
        "canonicalBoundaryFrame": boundary, "canonicalBoundarySeconds": boundary / FPS,
        "observationFrames": [start, end], "localBoundaryFrame": BOUNDARY_FRAME,
        "sourceGapNominalMilliseconds": gap_ms,
        "sourceGapLogicalFrames30": after["sourceStartFrame30"] - before["sourceEndFrame30"],
        "sameSource": True, "sourceContinuous": before["sourceEndFrame30"] == after["sourceStartFrame30"],
        "mappingScope": "Canonical timeline correspondence only, including the stored globally-even 60fps source rule and sample grid. No original-source pixel/PCM equality is claimed.",
        "sourceFrameMapping": source_map,
        "captionCountChecked": len(captions), "captionCrossingCount": len(crossings), "captions": captions,
        "nearestCaptionBefore": nearest_before, "nearestCaptionAfter": nearest_after,
        "captionFreeFramesBeforeBoundary": boundary - nearest_before["canonicalFrames"][1],
        "captionFreeFramesAfterBoundary": nearest_after["canonicalFrames"][0] - boundary,
        "captionFreeIntervalMeaning": "Caption-free time does not establish acoustic silence.",
    }


def seconds_text(value):
    return f"{value:.6f}"


def number_text(value):
    return "未定義" if value is None else f"{value:.9g}"


def human_report(summary):
    lines = [
        "# Digest 全11接続の物理観測", "",
        "既存の完成Digestから切り出した各8秒について、映像・音声・時刻の対応と変化量を測定した。接続は各動画の中央4秒。",
        "自然さ、聴覚上のclick、無音の感じ方、transitionの必要性は判定していない。値にしきい値・点数・重み・順位を付けていない。", "",
        "## 正本との一致と時計", "",
        "正本の指定範囲を直接復号し、切り出しの全240frameと全384,000sample/channelを比較した。元素材へ遡る対応は既存timeline上の論理対応で、焼込前の元素材との画素・音声一致ではない。", "",
        "| 接続 | 完成Digestの境界（秒） | 元時間の省略（秒） | 映像frame一致 | 音声sample/channel一致 | 映像・音声時計 | 跨ぐ字幕 |",
        "|---|---:|---:|---:|---:|---|---:|",
    ]
    for row in summary["connections"]:
        lines.append(f"| {row['ordinal']} | {seconds_text(row['canonicalBoundarySeconds'])} | {row['sourceGapNominalMilliseconds']/1000:.3f} | 240 / 240 | 384,000 / 384,000 | 連続 | {row['captionCrossingCount']} |")
    lines += ["", "## 境界前後の画像差", "",
              "境界直前119枚目から直後120枚目への差（0始まり）。値は焼込字幕を含むY/U/Vの8bit値の差であり、映像内容や違和感の判定ではない。隣の118→119、120→121も詳細記録へ保存。", "",
              "| 接続 | 面 | 比較画素数 | 値が異なる画素数 | 絶対差合計 | 絶対差平均 | 最大絶対差 |",
              "|---|---|---:|---:|---:|---:|---:|"]
    for row in summary["connections"]:
        for plane in row["imageBoundaryPlanes"]:
            lines.append(f"| {row['ordinal']} | {plane['plane']} | {plane['sampleCount']} | {plane['changedSampleCount']} | {plane['absoluteDifferenceSum']} | {number_text(plane['meanAbsoluteDifference'])} | {plane['maximumAbsoluteDifference']} |")
    lines += ["", "## 境界の音声", "",
              "左右を分け、境界直前と直後の1sampleの差、前後各1frame（1,600sample）のRMS、前後各4秒のRMSを記録した。RMSは振幅の二乗平均平方根。値の差からclickの可聴性や接続の良否を推測しない。", "",
              "| 接続 | channel | 直前sample | 直後sample | 直後−直前 | 直前frame RMS | 直後frame RMS | RMS差 | RMS比 | 前4秒RMS | 後4秒RMS |",
              "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|"]
    for row in summary["connections"]:
        for channel in row["audioBoundaryChannels"]:
            endpoints, change, halves = channel["endpoints"], channel["adjacentFrameRms"], channel["fourSecondRms"]
            values = [endpoints["beforeValue"], endpoints["afterValue"], endpoints["signedDifference"], change["beforeRms"],
                      change["afterRms"], change["afterMinusBeforeRms"], change["afterDividedByBeforeRms"], halves["beforeRms"], halves["afterRms"]]
            lines.append(f"| {row['ordinal']} | {channel['channelName']} | " + " | ".join(number_text(value) for value in values) + " |")
    lines += ["", "直前のRMSが0の場合、比は未定義。微小値の補填はしていない。全240frameそれぞれの最小・最大・RMS・最初・最後・最大絶対値は詳細記録へ保存。", "",
              "## 厳密に0のsample", "",
              "+0と−0を数値として0と数える。聴覚上の無音の判定ではない。連続区間の両端はsample番号で保存し、観測窓端に接する区間は窓外で続くか未確認とする。", "",
              "| 接続 | 左の0 sample数 | 右の0 sample数 | 両方同時の0 sample数 | 両方同時の連続区間数 |",
              "|---|---:|---:|---:|---:|"]
    for row in summary["connections"]:
        zeros = row["exactZero"]
        lines.append(f"| {row['ordinal']} | {zeros['leftSampleCount']} | {zeros['rightSampleCount']} | {zeros['bothSampleCount']} | {zeros['bothRunCount']} |")
    lines += ["", "## 証拠の範囲", "",
              "- 全11件について、完成記録・構造一覧・抽出記録・既存媒体・使用toolのhashを照合し、終了後にも入力の不変を再確認した。",
              "- 比較と測定は可逆圧縮映像とPCMを対象にした。人間確認用MP4は既存byteのhashと形式を検査した。再圧縮MP4のsample同一性は主張しない。",
              "- 映像frame、復号音声frame、音声packetの実timestampを、それぞれの実timebaseで確認した。",
              "- 実行command・終了状態・stdout/stderrのhash、raw probe、framehash、各接続の詳細JSONは同じ出力先に保存した。",
              "- 人間観測や意味判断を追加していない。production、字幕演出、renderer/trust、元媒体は変更していない。", ""]
    return "\n".join(lines)


def run(args):
    output = safe_absolute(args.output, "output")
    safe_absolute(output.parent.resolve(strict=True), "output parent")
    output.mkdir(exist_ok=False)
    inputs = Inputs()
    completed = []
    try:
        save_json(output / "run-request.json", {"schemaVersion": SCHEMA, "startedAt": now(), "arguments": vars(args),
                                                "scope": "Read-only measurements of existing media; no transition rendering or perceptual judgments."})
        repo = safe_absolute(args.repo_root, "repository").resolve(strict=True)
        inputs.bind(pathlib.Path(__file__).absolute(), "research runner")
        index_binding = inputs.bind(args.index, "all-eleven extraction index")
        inventory_binding = inputs.bind(args.inventory, "structural inventory")
        completion_binding = inputs.bind(args.completion, "canonical completion record")
        ffmpeg = inputs.bind(args.ffmpeg, "FFmpeg binary")
        ffprobe = inputs.bind(args.ffprobe, "ffprobe binary")
        commands = Commands(output, ffmpeg["resolvedPath"], ffprobe["resolvedPath"])
        index, inventory, completion = [read_json(pathlib.Path(binding["resolvedPath"]))
                                         for binding in [index_binding, inventory_binding, completion_binding]]
        require(inventory["bindingFileHashChecks"]["completionRecord"]["actualSha256"] == completion_binding["sha256"],
                "inventory completion record differs from the supplied canonical completion record")
        required = ["finalMp4", "baseMediaTimeline", "commonPlan", "sourceMaterial", "machineAdoption",
                    "baseMediaGenerationManifest", "bridge", "prospects"]
        canonical_inputs = {}
        for key in required:
            declaration = completion["bindings"][key]
            candidate = repo / declaration["path"]
            require(candidate.resolve(strict=True).is_relative_to(repo), f"{key}: completion path outside repository")
            canonical_inputs[key] = inputs.bind(candidate, key, declaration["fileSha256"], declaration.get("bytes"))
        def canonical_json(key):
            return read_json(pathlib.Path(canonical_inputs[key]["resolvedPath"]))
        timeline, plan, adoption = [canonical_json(key) for key in ["baseMediaTimeline", "commonPlan", "machineAdoption"]]
        generation, bridge, prospects = [canonical_json(key) for key in ["baseMediaGenerationManifest", "bridge", "prospects"]]
        projections = validate_canonical_structure(completion, timeline, plan, adoption, generation, bridge, prospects)
        for source_reference in [adoption["sourceVideoBinding"], prospects["sourceVideoBinding"], generation["source"]]:
            require(source_reference["fileSha256"] == canonical_inputs["sourceMaterial"]["sha256"], "source media provenance differs")
        for key in ["finalMp4", "baseMediaTimeline", "commonPlan", "sourceMaterial", "machineAdoption", "baseMediaGenerationManifest", "bridge", "prospects"]:
            require(inventory["bindingFileHashChecks"][key]["actualSha256"] == canonical_inputs[key]["sha256"],
                    f"inventory {key} input differs from current canonical binding")
        require(index["count"] == REQUIRED_CONNECTIONS == len(index["items"]) == len(inventory["connections"]),
                "the index and inventory must cover all eleven connections")
        require(index["durationSecondsEach"] == EXCERPT_FRAMES / FPS, "index observation duration differs")
        cases = []
        for ordinal, item in enumerate(index["items"], 1):
            expected_id = f"connection-{ordinal:02d}"
            require(item["connectionId"] == expected_id, "index order/connection ID differs")
            manifest_binding = inputs.bind(item["manifestPath"], f"{expected_id} extraction manifest", item["manifestSha256"])
            manifest = read_json(pathlib.Path(manifest_binding["resolvedPath"]))
            require(manifest["connectionId"] == expected_id, "extraction manifest ID differs")
            for field in ["canonicalStartFrame", "canonicalBoundaryFrame", "canonicalEndFrameExclusive"]:
                require(item[field] == manifest[field], f"index/extraction {field} differs")
                integer(item[field], field)
            require(manifest["localBoundaryFrame"] == BOUNDARY_FRAME and manifest["frameCount"] == EXCERPT_FRAMES,
                    "extraction manifest local frame clock differs")
            require(manifest["audioSampleRate"] == SAMPLE_RATE and manifest["audioSamplesPerChannel"] == EXCERPT_SAMPLES,
                    "extraction manifest sample clock differs")
            for field, key in [("canonicalBinding", "finalMp4"), ("timelineBinding", "baseMediaTimeline"), ("planBinding", "commonPlan")]:
                declaration = manifest[field]
                bound = inputs.bind(declaration["path"], f"{expected_id} {field}", declaration["sha256"], declaration["bytes"])
                require(bound["resolvedPath"] == canonical_inputs[key]["resolvedPath"]
                        and bound["sha256"] == canonical_inputs[key]["sha256"], f"{expected_id} canonical binding differs")
            lossless = inputs.bind(item["lossless"]["path"], f"{expected_id} lossless excerpt", item["lossless"]["sha256"], item["lossless"]["bytes"])
            mp4 = inputs.bind(item["mp4"]["path"], f"{expected_id} existing observation MP4", item["mp4"]["sha256"], item["mp4"]["bytes"])
            for declaration, bound in [(manifest["lossless"], lossless), (manifest["observationMp4"], mp4)]:
                require(str(pathlib.Path(declaration["path"]).resolve(strict=True)) == bound["resolvedPath"]
                        and declaration["sha256"] == bound["sha256"] and declaration["bytes"] == bound["bytes"], "extraction media binding differs")
            structure = connection_structure(ordinal, item, timeline, plan, adoption, projections, inventory["connections"][ordinal - 1])
            expected_visible = [{"id": caption["captionId"], "text": caption["text"],
                                 "originalStartFrame": caption["canonicalFrames"][0], "originalEndFrameExclusive": caption["canonicalFrames"][1],
                                 "localStartFrame": caption["excerptIntersection"][0], "localEndFrameExclusive": caption["excerptIntersection"][1],
                                 "clippedAtObservationWindow": caption["clippedAtObservationStart"] or caption["clippedAtObservationEnd"]}
                                for caption in structure["captions"] if caption["excerptIntersection"] is not None]
            require(manifest["visibleCaptions"] == expected_visible, "extraction caption intersection differs from canonical plan")
            cases.append((ordinal, item, lossless, mp4, structure))
        save_json(output / "input-bindings-before.json", list(inputs.items.values()))
        canonical = canonical_inputs["finalMp4"]
        canonical_probe = commands.probe(canonical["resolvedPath"], output / "canonical-media-probe.json")
        assert_streams(canonical_probe, "h264", "aac", timeline["baseMedia"]["expectedFrameCount"])
        for ordinal, item, lossless, mp4, structure in cases:
            connection_id = item["connectionId"]
            print(f"{connection_id}: inspect clocks and canonical correspondence", flush=True)
            directory = output / connection_id
            directory.mkdir()
            save_json(directory / "connection-structure.json", structure)
            probe = commands.probe(lossless["resolvedPath"], directory / "lossless-frames-probe.json", frames=True)
            assert_streams(probe, "ffv1", "pcm_f32le", EXCERPT_FRAMES, counted=True)
            packets = commands.probe(lossless["resolvedPath"], directory / "lossless-audio-packets-probe.json", packets=True)
            clocks = check_lossless_clocks(probe, packets, EXCERPT_FRAMES)
            save_json(directory / "clock-verification.json", clocks)
            mp4_probe = commands.probe(mp4["resolvedPath"], directory / "observation-mp4-probe.json")
            assert_streams(mp4_probe, "h264", "aac", EXCERPT_FRAMES)
            hashes = framehash(commands, ["-i", lossless["resolvedPath"]], directory / "excerpt.framehash")
            pcm = decode_pcm(commands, ["-i", lossless["resolvedPath"]])
            require(len(pcm) == EXCERPT_SAMPLES * CHANNELS * 4, "excerpt PCM byte count differs")
            equality = verify_canonical(commands, canonical, canonical_probe, item, directory, hashes, pcm)
            print(f"{connection_id}: measure raw image differences and audio values", flush=True)
            pictures = picture_changes(commands, lossless["resolvedPath"], hashes, directory)
            sound = audio_measurements(pcm, directory)
            boundary_picture = next(pair for pair in pictures["pairs"] if pair["isConnectionBoundary"])
            summary_row = {
                "ordinal": ordinal, "connectionId": connection_id, "inventoryConnectionId": structure["inventoryConnectionId"],
                "canonicalBoundaryFrame": structure["canonicalBoundaryFrame"], "canonicalBoundarySeconds": structure["canonicalBoundarySeconds"],
                "beforeSegmentId": structure["before"]["segment"]["segmentId"], "afterSegmentId": structure["after"]["segment"]["segmentId"],
                "sourceId": structure["sourceId"], "sourceGapNominalMilliseconds": structure["sourceGapNominalMilliseconds"],
                "sourceGapLogicalFrames30": structure["sourceGapLogicalFrames30"],
                "checkedFrames": EXCERPT_FRAMES, "checkedSamplesPerChannel": EXCERPT_SAMPLES,
                "canonicalAllFramesEqual": equality["completeFrameSequenceEqual"], "canonicalAllPcmBytesEqual": equality["completeFloat32PcmByteEqual"],
                "videoClockContinuous": clocks["videoContinuous"], "decodedAudioClockContinuous": clocks["decodedAudioContinuous"],
                "audioPacketClockContinuous": clocks["audioPacketsContinuous"],
                "captionCountChecked": structure["captionCountChecked"], "captionCrossingCount": structure["captionCrossingCount"],
                "captionFreeFramesBeforeBoundary": structure["captionFreeFramesBeforeBoundary"],
                "captionFreeFramesAfterBoundary": structure["captionFreeFramesAfterBoundary"],
                "imageBoundaryPlanes": [{key: value for key, value in plane.items() if key != "absoluteDifferenceHistogramBins0Through255"}
                                        for plane in boundary_picture["planes"]],
                "audioBoundaryChannels": [{"channelName": channel["channelName"], "endpoints": channel["boundaryEndpointSamples"],
                                            "adjacentFrameRms": channel["adjacentFrameLevelChange"], "fourSecondRms": channel["beforeAfterFourSecondLevelChange"]}
                                           for channel in sound["channels"]],
                "exactZero": {"leftSampleCount": sound["channels"][0]["exactZeroSampleCount"],
                              "rightSampleCount": sound["channels"][1]["exactZeroSampleCount"],
                              "bothSampleCount": sound["bothChannelsExactZeroSampleCount"], "bothRunCount": len(sound["bothChannelsExactZeroRuns"])},
                "detailDirectory": connection_id, "naturalnessVerdict": "not-assessed", "transitionNeedVerdict": "not-assessed",
            }
            save_json(directory / "connection-result.json", {"schemaVersion": SCHEMA, "status": "passed", "summary": summary_row,
                                                             "losslessBinding": lossless, "observationMp4Binding": mp4,
                                                             "observationMp4Scope": "Existing lossy review encoding; byte hash and stream format checked, PCM identity not claimed.",
                                                             "canonicalWindowVerification": equality})
            completed.append(summary_row)
            print(f"{connection_id}: physical measurements saved", flush=True)
        after = inputs.recheck()
        save_json(output / "input-bindings-after.json", after)
        require(all(record["unchanged"] for record in after), "input or tool bytes changed during execution")
        summary = {
            "schemaVersion": SCHEMA, "status": "passed", "completedAt": now(), "connectionCount": len(completed),
            "canonicalCompletionId": completion["completionId"], "canonicalMedia": canonical,
            "scope": "All eleven existing hard-cut boundaries. Measurements and exact preservation checks only; no semantic symptom classification or transition vocabulary adoption.",
            "inputBindingsUnchanged": True, "thresholdsWeightsScoresOrRanksAdded": False,
            "humanObservation": "not-read-or-modified", "naturalnessVerdict": "not-assessed",
            "originalSourceIdentity": canonical_inputs["sourceMaterial"],
            "originalSourceMappingScope": "Logical canonical timeline mapping only, not original-source pixel or PCM equality.",
            "connections": completed,
        }
        require(len(completed) == REQUIRED_CONNECTIONS, "not all eleven connections completed")
        save_json(output / "all-eleven-physical-observation.json", summary)
        with (output / "all-eleven-physical-observation.md").open("x", encoding="utf-8") as stream:
            stream.write(human_report(summary))
        evidence = [{"relativePath": str(file.relative_to(output)), "bytes": file.stat().st_size, "sha256": file_sha(file)}
                    for file in sorted(output.rglob("*")) if file.is_file()]
        save_json(output / "evidence-files.json", evidence)
        print(f"all eleven connections: measurements saved to {output}", flush=True)
        return summary
    except Exception as error:
        save_json(output / "physical-observation-failure.json", {
            "schemaVersion": SCHEMA, "status": "failed", "at": now(), "errorType": type(error).__name__, "message": str(error),
            "completedConnections": [record["connectionId"] for record in completed],
            "evidencePreserved": True, "automaticRetry": False, "naturalnessVerdict": "not-assessed",
        })
        raise


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--index", required=True, help="absolute path to the existing eleven-excerpt index")
    parser.add_argument("--inventory", required=True, help="absolute path to the read-only structural inventory")
    parser.add_argument("--completion", required=True, help="absolute path to canonical Digest Phase 2 completion record")
    parser.add_argument("--repo-root", required=True, help="absolute repository root for completion bindings")
    parser.add_argument("--ffmpeg", required=True, help="absolute path to the installed FFmpeg executable")
    parser.add_argument("--ffprobe", required=True, help="absolute path to the installed ffprobe executable")
    parser.add_argument("--output", required=True, help="absolute path to a new output directory; its parent must already exist")
    return parser.parse_args()


if __name__ == "__main__":
    run(arguments())

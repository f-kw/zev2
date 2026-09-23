import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(`Q3 PCM: ${message}`); };

// This measures encoded-media samples. It makes no voice, emotion, silence-quality,
// loudness-normalisation, or preferred-edit judgment.
export function measurePcmIntervals(bytes, {channels, sampleRate, fpsNum, fpsDen, units}) {
  if (!Buffer.isBuffer(bytes) || !Number.isSafeInteger(channels) || channels < 1 ||
      !Number.isSafeInteger(sampleRate) || sampleRate < 1 ||
      !Number.isSafeInteger(fpsNum) || fpsNum < 1 || !Number.isSafeInteger(fpsDen) || fpsDen < 1 ||
      bytes.length % (channels * 4)) fail('PCM layout is invalid');
  const sampleCount = bytes.length / (channels * 4);
  const sampleAtFrame = frame => {
    const sample = frame * sampleRate * fpsDen / fpsNum;
    if (!Number.isSafeInteger(frame) || frame < 0 || !Number.isSafeInteger(sample)) fail('frame boundary is not an exact sample boundary');
    return sample;
  };
  // JSON has one numeric zero; preserve the raw PCM bytes for the original sign bit.
  const read = (sample, channel) => {
    const value=bytes.readFloatLE((sample * channels + channel) * 4);
    return value === 0 ? 0 : value;
  };
  const intervals = units.map(unit => {
    const start = sampleAtFrame(unit.range.startFrame), end = sampleAtFrame(unit.range.endFrameExclusive);
    if (!(start < end && end <= sampleCount)) fail(`missing decoded samples for ${unit.id}`);
    const channelMetrics = Array.from({length: channels}, (_, channel) => {
      let squareSum = 0, peakAbsolute = -1, peakSample = start, exactZeroSamples = 0, fullScaleOrAboveSamples = 0;
      let minimum = Infinity, maximum = -Infinity;
      for (let sample = start; sample < end; sample++) {
        const value = read(sample, channel);
        if (!Number.isFinite(value)) fail('non-finite decoded sample');
        const absolute = Math.abs(value);
        squareSum += value * value;
        minimum = Math.min(minimum, value); maximum = Math.max(maximum, value);
        if (absolute > peakAbsolute) { peakAbsolute = absolute; peakSample = sample; }
        if (value === 0) exactZeroSamples++;
        if (absolute >= 1) fullScaleOrAboveSamples++;
      }
      return {channel, minimum, maximum, peakAbsolute, peakSample,
        peakCompletedFrame: Math.floor(peakSample * fpsNum / (sampleRate * fpsDen)),
        rootMeanSquare: Math.sqrt(squareSum / (end - start)), exactZeroSamples, fullScaleOrAboveSamples,
        firstSample: read(start, channel), lastSample: read(end - 1, channel),
        previousSample: start > 0 ? read(start - 1, channel) : null,
        followingSample: end < sampleCount ? read(end, channel) : null};
    });
    return {unitId: unit.id, range: structuredClone(unit.range), startSample: start, endSampleExclusive: end,
      sampleCount: end - start, channelMetrics};
  });
  return {sampleRate, channels, decodedSampleCount: sampleCount, intervals};
}

export async function measureCompletedPcm(packet, {outputDir, ffmpegPath = '/opt/homebrew/bin/ffmpeg', ffprobePath = '/opt/homebrew/bin/ffprobe'} = {}) {
  if (!outputDir) fail('output directory is required');
  const mediaBytes = await readFile(packet.media.path);
  if (sha(mediaBytes) !== packet.media.sha256) fail('media identity changed');
  await mkdir(outputDir, {recursive: true});
  const probeArgs = ['-v','error','-select_streams','a:0','-show_entries','stream=sample_rate,channels,codec_name','-of','json',packet.media.path];
  const probe = spawnSync(ffprobePath, probeArgs, {encoding:'utf8'});
  if (probe.error || probe.status !== 0) fail(`audio probe failed: ${probe.error?.message ?? probe.stderr}`);
  const streams = JSON.parse(probe.stdout).streams;
  if (!Array.isArray(streams) || streams.length !== 1) fail('one selected audio stream is required');
  const sampleRate = Number(streams[0].sample_rate), channels = streams[0].channels;
  if (sampleRate !== packet.media.audioSampleRate) fail('audio sample clock differs from input');
  const pcmPath = path.resolve(outputDir, 'completed-audio.f32le');
  const args = ['-v','error','-nostdin','-n','-i',packet.media.path,'-map','0:a:0','-vn','-c:a','pcm_f32le','-f','f32le',pcmPath];
  const decode = spawnSync(ffmpegPath, args, {encoding:'utf8'});
  if (decode.error || decode.status !== 0) fail(`decode failed: ${decode.error?.message ?? decode.stderr}`);
  const bytes = await readFile(pcmPath);
  const measurements = measurePcmIntervals(bytes, {channels, sampleRate, fpsNum: packet.media.fpsNum, fpsDen: packet.media.fpsDen, units: packet.units});
  const videoSamples = packet.media.frameCount * sampleRate * packet.media.fpsDen / packet.media.fpsNum;
  if (measurements.decodedSampleCount < videoSamples) fail('decoded audio does not cover the completed video');
  const reference = {id:'q3-completed-pcm',path:pcmPath,sha256:sha(bytes),kind:'completed-pcm-f32le'};
  const limitations = ['完成動画の混合音声を各チャンネルのまま復号した数値。声・効果音・音楽を分離していない。',
    '音の意味、驚き、聞きやすさ、無音の良し悪しを聴覚で判定した記録ではない。',
    'RMS・頂点・ゼロサンプルは区間の測定値で、品質得点や自動修正の閾値ではない。'];
  const evidence = measurements.intervals.map(item => ({id:`pcm-${item.unitId}`,kind:'completed-pcm-measurement',range:item.range,
    unitIds:[item.unitId],method:'FFmpeg decoded the selected completed MP4 to unchanged-channel float32 PCM; each full target interval was measured.',
    facts:{sampleRate,channels,startSample:item.startSample,endSampleExclusive:item.endSampleExclusive,sampleCount:item.sampleCount,channelMetrics:item.channelMetrics},
    limitations,referenceIds:[reference.id]}));
  const details = {schemaVersion:'digest-quality-pcm-measurement-v001',mediaSha256:packet.media.sha256,
    probe:{command:ffprobePath,args:probeArgs,result:JSON.parse(probe.stdout)},decode:{command:ffmpegPath,args,exitCode:decode.status},
    pcmReference:reference,videoSampleCount:videoSamples,decoderTailSamples:measurements.decodedSampleCount-videoSamples,
    measurements,limitations};
  await writeFile(path.resolve(outputDir,'pcm-measurements.json'), `${JSON.stringify(details,null,2)}\n`,{flag:'wx'});
  if (sha(await readFile(packet.media.path)) !== packet.media.sha256) fail('media changed during decode');
  return {reference,evidence,details,decodedSampleCount:measurements.decodedSampleCount};
}

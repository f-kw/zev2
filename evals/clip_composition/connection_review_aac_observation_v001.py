import array, hashlib, json, math, subprocess, sys
from pathlib import Path
root=Path('/private/tmp/zev-connection-study-_ijhcn1e')
fixture=root/'technical-fixtures-v001'
result=json.loads((fixture/'physical-fixture-result.json').read_text())
rows=[]
for case in result['results']:
 for variant in case['variants']:
  review=variant['reviewMp4']; path=Path(review['path'])
  assert hashlib.file_digest(path.open('rb'),'sha256').hexdigest()==review['sha256']
  packets=review['audioPackets']['packets']; end=None; gaps=[]
  for packet in packets:
   start=int(packet['pts']); duration=int(packet['duration'])
   if end is not None and start!=end:gaps.append({'previousEnd':end,'start':start})
   end=start+duration
  assert review['probe']['streams'][1]['time_base']=='1/48000'
  assert not gaps
  assert end==variant['decodedSamplesPerChannel']
  row={'connectionId':case['connectionId'],'variant':variant['variant'],'sha256':review['sha256'],
       'packetTimeBase':'1/48000','firstPacketPts':int(packets[0]['pts']),
       'firstPacketSideData':packets[0].get('side_data_list',[]),'lastPacketEndPts':end,
       'packetGapOrOverlap':False,'decodedSamplesPerChannel':review['decodedSamplesPerChannel'],
       'decodedTailBeyondPacketEnd':review['decodedTailDifferenceSamplesPerChannel'],
       'audioIdentityClaim':False,'audibilityVerdict':'not-assessed'}
  if variant['variant']=='black':
   command=['/opt/homebrew/bin/ffmpeg','-v','error','-i',str(path),'-map','0:a:0','-vn','-c:a','pcm_f32le','-f','f32le','-']
   pcm=subprocess.run(command,capture_output=True,check=True).stdout
   values=array.array('f'); values.frombytes(pcm)
   if sys.byteorder!='little':values.byteswap()
   assert len(values)==review['decodedSamplesPerChannel']*2
   begin=120*1600; finish=132*1600; channels=[]
   for ch in range(2):
    segment=values[begin*2+ch:finish*2:2]; assert all(math.isfinite(v) for v in segment)
    zeros=[]; zstart=None
    for i,v in enumerate(segment):
     if v==0 and zstart is None:zstart=i
     if v!=0 and zstart is not None:zeros.append([begin+zstart,begin+i]);zstart=None
    if zstart is not None:zeros.append([begin+zstart,finish])
    nonzero=[begin+i for i,v in enumerate(segment) if v!=0]
    channels.append({'channel':ch,'exactZeroSampleCount':sum(v==0 for v in segment),
      'nonzeroSampleCount':len(nonzero),'firstNonzeroSample':nonzero[0] if nonzero else None,
      'lastNonzeroSample':nonzero[-1] if nonzero else None,'maximumAbsoluteSample':max(map(abs,segment)),
      'rms':math.sqrt(math.fsum(v*v for v in segment)/len(segment)),
      'exactZeroRunsSampleHalfOpen':zeros})
   row['insertedIntervalAfterAac']={'startSample':begin,'endSampleExclusive':finish,
      'channels':channels,'decodeCommand':command,'decodedPcmSha256':hashlib.sha256(pcm).hexdigest(),
      'interpretation':'Numeric observations only. AAC samples are lossy; nonzero values do not establish audibility.'}
  rows.append(row)
output={'scope':'Read-only inspection of the nine review AAC encodings; no new encoding and no perceptual classification.',
        'status':'passed','rows':rows}
with (root/'review-aac-clock-facts-v001.json').open('x') as f:json.dump(output,f,ensure_ascii=False,indent=2);f.write('\n')
for r in rows:
 if r['variant']=='black':print(r['connectionId'], 'tail',r['decodedTailBeyondPacketEnd'], 'zero/nonzero',[(c['exactZeroSampleCount'],c['nonzeroSampleCount']) for c in r['insertedIntervalAfterAac']['channels']])

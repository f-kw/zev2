import json,hashlib,runpy,datetime
from pathlib import Path
root=Path('/Users/kawafmm/workspace/zev2');w=root/'evals/clip_composition/outputs/presentation/work-caption-local-acoustics-20260908-v001'
s=runpy.run_path(str(root/'evals/clip_composition/caption_local_acoustics_v001.py'));index=s['read'](w/'observation-index-v001.json');freeze=s['read'](index['freezeBinding']['path']);assert s['binding'](index['freezeBinding']['path'])==index['freezeBinding'];assert freeze['rule']==s['RULE'];actual=s['inputs']()
for k in ['cases','chunks','sourceBindings']:assert freeze[k]==actual[k],k
assert s['binding'](freeze['selectorBinding']['path'])==freeze['selectorBinding'];assert s['binding'](s['__file__'])==freeze['implementationBindings'][0]
readpaths=[r['path'] for r in freeze['sourceBindings']];assert not any(any(x in p for x in ['human','review-final','acoustic-correspondence','caption-review-selector']) for p in readpaths)
chunks={c['index']:c for c in freeze['chunks']};proof=[];total_seconds=0;total_calls=0
for ref in index['observations']:
 assert s['binding'](ref['path'])==ref;row=s['read'](ref['path']);c=next(c for c in freeze['cases'] if c['caseId']==row['caseId']);f=next(r for r in c['rows'] if r['instructionId']==row['instructionId']);assert (row['text'],row['textIds'],row['sourceIds'])==(f['text'],f['textIds'],f['sourceIds']);assert row['freezeBinding']==index['freezeBinding'];assert row['sensorEvidenceOnly'] and not row['humanQualityApproved'];attemptproof=[]
 for plan in f['plans']:
  ats=[a for a in row['attempts'] if a['chunkIndex']==plan['chunkIndex']];assert 1<=len(ats)<=2
  ch=chunks[plan['chunkIndex']]
  for i,a in enumerate(ats):
   expected=plan['initial'] if i==0 else ch
   assert a['window']['text']==expected['text'] and a['window']['atoms']==expected['atoms'];assert a['samples']<=480000;assert a['numFrames']==a['samples']//160
   assert abs(a['window']['startMs']-expected['startMs'])<1000/a['sampleRate'];assert abs(a['window']['endMs']-expected['endMs'])<1000/a['sampleRate'];assert a['inputAudioBinding']==ch['audioBinding']
   replay=s['interpret'](a['window'],a['words'],a['textTokens'],plan['targetIds'],20)
   for k in replay:assert replay[k]==a[k],k
   for side in ['targetStart','targetEnd']:
    e=a[side]
    if e['resolved']:assert not e['edgeContact'] and e['candidateMs'] is not None
   total_seconds+=a['elapsedSec'];total_calls+=1
  if len(ats)==2:
   assert ats[0]['edgeContact'];assert (ats[1]['window']['startMs'],ats[1]['window']['endMs'])==(ch['startMs'],ch['endMs'])
   assert ats[0]['window']['startMs']!=ch['startMs'] or ats[0]['window']['endMs']!=ch['endMs']
  else:assert not ats[0]['edgeContact'] or (ats[0]['window']['startMs']==ch['startMs'] and ats[0]['window']['endMs']==ch['endMs'])
  assert row['attempts'].index(ats[-1]) in row['chosenAttemptIndices']
  attemptproof.append({'chunkIndex':ch['index'],'attempts':len(ats),'windows':[{'startMs':a['window']['startMs'],'endMs':a['window']['endMs'],'edgeContact':a['edgeContact']} for a in ats]})
 proof.append({'caseId':row['caseId'],'instructionId':row['instructionId'],'text':row['text'],'textIds':row['textIds'],'observationBinding':ref,'start':row['startBoundary'],'end':row['endBoundary'],'uniqueBoundaryPair':row['uniqueBoundaryPair'],'attempts':attemptproof})
assert len(proof)==37
baseline=s['read'](w/'preservation-baseline-v001.json');changed=[]
for r in baseline['files']:
 p=root/r['path'];h=hashlib.sha256(p.read_bytes()).hexdigest()
 if h!=r['fileSha256']:changed.append(r['path'])
assert not changed,changed
s['save'](w/'preservation-verification-v001.json',{'baselineBinding':s['binding'](w/'preservation-baseline-v001.json'),'verifiedFiles':len(baseline['files']),'unchangedFiles':len(baseline['files']),'changes':changed,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()})
s['save'](w/'sensor-evidence-proof-v001.json',{'freezeBinding':index['freezeBinding'],'verificationScriptBinding':s['binding'](__file__),'captionCount':len(proof),'fixedInputsReconstructedExactly':True,'onlyOriginalInputFilesRead':readpaths,'humanInputFilesRead':0,'modelSelectorAndWindowRulesUnchanged':True,'rawAlignmentReplay':'all saved raw words/tokens match interpreted groups and candidates','windowRetries':'exact frozen expansion; at most two per caption/chunk; final attempt always used','alignmentCalls':total_calls,'alignmentElapsedSeconds':total_seconds,'inferenceApiCalls':0,'downloads':0,'costUsd':0,'formalArtifactChanges':0,'rows':proof})
print(json.dumps({'captions':len(proof),'alignmentCalls':total_calls,'alignmentElapsedSeconds':total_seconds,'preservedFiles':len(baseline['files'])}))

"""Bind already-authored semantic choices to the actual Core requests after exact input comparison."""
import hashlib
import json
from pathlib import Path

work = Path(__file__).resolve().parent
formal = work / 'formal-v004'

def read(path):
    return json.loads(path.read_bytes())

def binding(path):
    return {'path': str(path.relative_to(Path.cwd())), 'fileSha256': hashlib.sha256(path.read_bytes()).hexdigest()}

def publish(path, value):
    with path.open('x', encoding='utf-8') as stream:
        stream.write(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

preview_path = work / 'caption-source-preview-v003.json'
draft_path = work / 'judgments/caption-boundaries-draft-v003.json'
preview = read(preview_path)
draft = read(draft_path)
readiness = read(work / 'caption-source-readiness-v003.json')
assert readiness['status'] == 'passed'
assert readiness['previewBinding'] == binding(preview_path)
assert readiness['draftBinding'] == binding(draft_path)
assert len(list(formal.glob('display-*-request.json'))) == len(preview['requests'])
responses, evidence = [], []
ordinal = 0
for n, earlier in enumerate(preview['requests'], 1):
    actual_path = formal / f'display-{n}-request.json'
    actual = read(actual_path)
    assert actual['input'] == earlier['input'], (n, 'Actual Core caption input differs from the semantically reviewed source')
    assert actual['candidateId'] == earlier['candidateId']
    assert len(actual['input']['captions']) == 1
    caption = actual['input']['captions'][0]
    atoms = caption['boundaryCandidates']
    boundary_by_ordinal = {}
    for atom in atoms:
        ordinal += 1
        boundary_by_ordinal[ordinal] = atom['boundaryId']
    cues = []
    for row in draft['candidates'][actual['candidateId']]:
        ends = row if isinstance(row, list) else [row]
        cues.append({'cueEndBoundaryId': boundary_by_ordinal[ends[-1]],
                     'lineEndBoundaryIds': [boundary_by_ordinal[i] for i in ends]})
    assert cues[-1]['cueEndBoundaryId'] == atoms[-1]['boundaryId']
    responses.append({'schemaVersion': 'unseen-material-display-response-v001',
        'requestFileSha256': binding(actual_path)['fileSha256'],
        'answer': {'status': 'complete', 'captions': [{'captionId': caption['captionId'], 'cues': cues}]},
        'judgmentNote': 'Codexが全字幕片を読み、意味の区切りを選択してから行幅を検査した下書きを使用。実際のCore入力と下書きの全入力が一致することを確認して境界IDを束縛した。音声の正確さや知覚品質を確認済みとは扱わない。'})
    evidence.append({'candidateId': actual['candidateId'], 'requestBinding': binding(actual_path),
                     'exactInputEquality': True, 'boundaryCount': len(atoms), 'cueCount': len(cues)})
assert ordinal == readiness['atomCount']
assert sum(len(r['answer']['captions'][0]['cues']) for r in responses) == readiness['cueCount']
response_path = work / 'judgments/caption-responses-v001.json'
publish(response_path, {'schemaVersion': 'unseen-material-caption-response-bundle-v001', 'responses': responses})
publish(work / 'caption-actual-input-verification-v001.json', {
    'schemaVersion': 'unseen-material-caption-actual-input-verification-v001', 'status': 'passed',
    'previewBinding': binding(preview_path), 'draftBinding': binding(draft_path),
    'responseBundleBinding': binding(response_path), 'rows': evidence,
    'checks': {'allActualRequestsMatchedReviewedInput': 'passed', 'allBoundariesMatched': 'passed'},
    'semanticAuthor': 'Codex in the active task', 'humanPerceptualEvaluation': 'not-performed'})
print(json.dumps({'status': 'actual-caption-answers-bound', 'requestCount': len(responses), 'cueCount': readiness['cueCount']}))

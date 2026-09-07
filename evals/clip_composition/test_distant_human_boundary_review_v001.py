"""合成回答は一時directoryにだけ保存し、人間の指定値には混入させない。"""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest
import urllib.request
import urllib.error
import uuid

HERE = Path(__file__).resolve().parent / 'outputs/presentation/work-distant-connection-skill-e2e-20260907-v001/human-caption-boundary-v001'
spec = importlib.util.spec_from_file_location('distant_boundary_server', HERE/'server.py')
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
CONFIG, SHA = mod.load_config()

def request(index=0, start=1300, end=1400):
    pick = lambda f: {'frame': f, 'presentedFrame': f, 'kind': 'frame-start'}
    return {'targetId': CONFIG['targets'][index]['id'], 'startMode': 'keep-current' if index == 0 else 'human-selected',
            'start': None if index == 0 else pick(start), 'end': pick(end), 'requestId': str(uuid.uuid4()), 'configSha256': SHA}

class SelectionTest(unittest.TestCase):
    def resolve(self, body): return mod.resolve_selection(body, CONFIG, SHA)
    def test_first_caption_keeps_start_only_by_declared_mode(self):
        r = self.resolve(request())
        self.assertIsNone(r['start']); self.assertEqual(r['proposedFrames']['startFrame'], 1255)
        self.assertEqual(r['status'], 'human-observation-saved-not-promoted')
    def test_optional_start_is_an_explicit_real_frame_observation(self):
        b=request(); b['startMode']='human-selected'; b['start']={'frame':1260,'presentedFrame':1260,'kind':'frame-start'}
        r=self.resolve(b); self.assertEqual(r['proposedFrames']['startFrame'],1260)
        self.assertEqual(r['start']['outputAudioSample'],1260*1470)
    def test_successors_cannot_reuse_current_start(self):
        for index in (1,2):
            b=request(index); b.update(startMode='keep-current',start=None)
            with self.assertRaises(ValueError): self.resolve(b)
    def test_exact_output_and_source_sample_binding(self):
        r=self.resolve(request(1)); e=r['end']; t=CONFIG['targets'][1]; seg=t['timelineSegment']
        self.assertEqual(e['outputAudioSample'],2058000)
        self.assertEqual(e['sourceAudioSample'],62516866)
        self.assertEqual(e['outputTimeSecondsExact'],{'numerator':1400,'denominator':30})
        self.assertEqual(e['instructionId'],t['instructionId']); self.assertEqual(e['textIds'],t['textIds'])
        for k in ['completedMediaSha256','baseMediaSha256','audioPacketPayloadSha256']: self.assertEqual(len(e[k]),64)
    def test_non_integer_absolute_time_and_extra_fields_rejected(self):
        for value in (1400.5,True,'1400',None):
            b=request();b['end']['frame']=value
            with self.assertRaises(ValueError): self.resolve(b)
        b=request();b['absoluteMs']=40000
        with self.assertRaises(ValueError): self.resolve(b)
    def test_stale_config_or_wrong_target_rejected(self):
        for key,value in [('configSha256','0'*64),('targetId','caption-1')]:
            b=request();b[key]=value
            with self.assertRaises(ValueError): self.resolve(b)
    def test_unpresented_or_outside_window_frame_rejected(self):
        for change in ({'presentedFrame':1399},{'frame':920,'presentedFrame':920},{'frame':1671,'presentedFrame':1671}):
            b=request();b['end'].update(change)
            with self.assertRaises(ValueError): self.resolve(b)
    def test_positive_interval_and_explicit_terminal_boundary(self):
        b=request(2,1600,1670); b['end']={'frame':1671,'presentedFrame':1670,'kind':'after-final-frame'}
        r=self.resolve(b); self.assertEqual(r['end']['outputAudioSample'],2456370)
        self.assertEqual(r['end']['sourceAudioSample'],62915236)
        b['start']=copy.deepcopy(b['end'])
        with self.assertRaises(ValueError): self.resolve(b)
        with self.assertRaises(ValueError): self.resolve(request(1,1400,1400))
    def test_config_text_and_current_ranges_match_formal_input(self):
        ins=json.loads((HERE.parent/'run-v001/instruction.json').read_text())
        for t,i in zip(CONFIG['targets'],ins['instructions'][1:]):
            self.assertEqual(t['text'],i['content']['text']);self.assertEqual(t['instructionId'],i['instructionId'])
            self.assertEqual(t['currentFrames'],i['outputTime']);self.assertEqual(t['textIds'],i['targetProvenance']['atomOccurrenceIds'])

class HttpTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory(prefix='zev-distant-human-frame-test-')
        cls.server=mod.make_server(Path(cls.tmp.name),qa=True)
        cls.url=f'http://127.0.0.1:{cls.server.server_port}'
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
    @classmethod
    def tearDownClass(cls): cls.server.shutdown();cls.server.server_close();cls.thread.join();cls.tmp.cleanup()
    def post(self,b,origin=None):
        return urllib.request.urlopen(urllib.request.Request(self.url+'/observations',data=json.dumps(b).encode(),
            headers={'Content-Type':'application/json','Origin':origin or self.url}))
    def test_validated_save_is_idempotent_and_qa_only(self):
        b=request(); a=json.load(self.post(b)); second=json.load(self.post(b))
        self.assertEqual(a,second);self.assertEqual(a['recordPurpose'],'synthetic-ui-verification')
        b['end']['frame']=b['end']['presentedFrame']=1401
        with self.assertRaises(urllib.error.HTTPError) as e:self.post(b)
        self.assertEqual(e.exception.code,400)
    def test_cross_origin_write_rejected(self):
        with self.assertRaises(urllib.error.HTTPError) as e:self.post(request(),origin='https://example.invalid')
        self.assertEqual(e.exception.code,403)
    def test_range_returns_exact_original_media_bytes(self):
        response=urllib.request.urlopen(urllib.request.Request(self.url+'/media.mp4',headers={'Range':'bytes=123-456'}))
        self.assertEqual(response.status,206)
        original=(mod.ROOT/CONFIG['completedMediaBinding']['path']).read_bytes()
        self.assertEqual(response.read(),original[123:457])

if __name__ == '__main__': unittest.main(verbosity=2)

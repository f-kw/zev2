import runpy
from pathlib import Path
import json
p=Path('/Users/kawafmm/workspace/zev2/evals/clip_composition/caption_local_acoustics_v001.py')
s=runpy.run_path(str(p));g=s['observe'].__globals__;original=g['interpret'];work=g['WORK'];d=work/'diagnostic-v001';d.mkdir();(d/'pre-observation-freeze-v001.json').write_bytes((work/'pre-observation-freeze-v001.json').read_bytes());g['WORK']=d
s['save'](d/'wrapper-binding-v001.json',s['binding'](__file__))
def capture(window,words,tokens,target_ids,stride_ms):
 s['save'](d/'first-window-raw-v001.json',dict(window=window,words=words,tokens=tokens,targetIds=target_ids,strideMs=stride_ms))
 return original(window,words,tokens,target_ids,stride_ms)
g['interpret']=capture;s['observe']()

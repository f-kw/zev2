"""Keep optional model-conversion frameworks out of an already-converted CT2 inference process."""
import importlib.abc
import json
from pathlib import Path
import runpy
import sys


class ExcludeUnusedConversionFrameworks(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname.split('.')[0] in {'torch', 'tensorflow'}:
            raise ImportError('Optional model-conversion framework excluded from fixed CT2 inference: ' + fullname)
        return None


sys.meta_path.insert(0, ExcludeUnusedConversionFrameworks())
observer_path = Path(__file__).with_name('observe_digest_caption_acoustics_v001.py')
observer = runpy.run_path(str(observer_path))
output = observer['OUT']
observer['save'](output / 'acoustic-runtime-execution-v002.json', {
    'schemaVersion': 'digest-acoustic-runtime-execution-v002',
    'preflightBinding': observer['binding'](output / 'acoustic-preflight-v001.json'),
    'runtimeWrapperBinding': observer['binding'](__file__),
    'environment': {'HF_HUB_OFFLINE': '1', 'TRANSFORMERS_OFFLINE': '1'},
    'correction': 'Optional torch/tensorflow conversion imports are unavailable in this process. Existing converted CT2 model and original alignment implementation are unchanged.',
    'priorFailures': [{'attempt': 1, 'exitCode': 134, 'reason': 'OpenMP shared memory denied in sandbox'},
                      {'attempt': 2, 'exitCode': 134, 'reason': 'Duplicate OpenMP loaded through optional torch conversion import'}],
    'setupCorrectionCount': 2, 'observationsBeforeCorrection': 0,
})
observer['observe']()

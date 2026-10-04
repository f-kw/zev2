"""Approved-job binding and supervision tests. No video production or disk mounts."""
import sys
sys.dont_write_bytecode = True
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import unittest
from datetime import datetime, timezone
from unittest import mock

SOURCE = Path(__file__).with_name('original-resolution-full-supervisor-v002.py')
spec = importlib.util.spec_from_file_location('approved_supervisor', SOURCE)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def bind(path):
    data = path.read_bytes()
    return dict(path=str(path), fileSha256=hashlib.sha256(data).hexdigest(), sizeBytes=len(data))


class ApprovedJobTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.repo = Path(self.temporary.name).resolve()
        self.root_patch = mock.patch.object(m, 'FORMAL_REPO', str(self.repo))
        self.root_patch.start()
        self.addCleanup(self.root_patch.stop)
        self.head = 'a' * 40
        self.node_file = self.repo / 'node'
        self.node_file.write_bytes(b'explicit approved Node fixture bytes')
        self.storage = dict(guestRoot='/Volumes/Approved-Fixture-Guest',
            guestVolumeUuid='11111111-1111-1111-1111-111111111111', guestDevice=11,
            hostRoot='/Volumes/Approved-Fixture-Host', hostVolumeUuid='22222222-2222-2222-2222-222222222222',
            hostDevice=22, imagePath='/Volumes/Approved-Fixture-Host/fixture.sparsebundle',
            imageMaximumBytes=80_000_000_000, hostMetadataReserveBytes=900_000_000,
            internalRoot=str(self.repo))
        inputs = dict(preparationParameters={'fixtureOnly': True})
        for key in m.APPROVED_INPUT_KEYS - {'preparationParameters'}:
            path = self.repo / 'inputs' / (key + '.json')
            path.parent.mkdir(exist_ok=True)
            path.write_text('{}\n')
            inputs[key] = {**bind(path), 'path': path.relative_to(self.repo).as_posix()}
        implementations = []
        for name in m.APPROVED_CODE:
            path = self.repo / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('// approved fixture source ' + name + '\n')
            implementations.append({**bind(path), 'path': name})
        self.job = dict(schemaVersion='digest-approved-job-v001', planId='different-approved-plan',
            outputRoot='runtime/artifacts/different-approved-plan/attempt-005', inputs=inputs,
            storage=self.storage, expected=dict(frames=600, audioSamples=960000, groups=2, atoms=41, cues=7),
            implementation=dict(sha=self.head, bindings=implementations,
                nodeBinding=bind(self.node_file)), guard=copy.deepcopy(m.APPROVED_GUARD),
            allocationBudget=dict(baseBuildBytes=8_000_000_000, rendererPreparationBytes=3_000_000_000))
        self.job_file = self.repo / 'job.json'
        self.job_file.write_text(json.dumps(self.job))
        self.authorization = dict(schemaVersion='digest-approved-job-authorization-v001',
            recordId='real-approval-fixture', userApproval=dict(at='2026-10-04T02:12:00Z',
                messageId='different-recorded-message', text='Proceed with this approved job.', sourceThreadId='fixture-thread'),
            actions=['manufacture-one-approved-plan'], jobBinding=bind(self.job_file),
            planId=self.job['planId'], manifestBinding=self.job['inputs']['candidateManifestBinding'],
            typographySettingsBinding=self.job['inputs']['typographySettingsBinding'], outputRoot=self.job['outputRoot'],
            storage=self.storage, guard=self.job['guard'], implementation=self.job['implementation'], normalCandidates=1)
        self.auth_file = self.repo / 'authorization.json'
        self.auth_file.write_text(json.dumps(self.authorization))
        self.permit_file = self.repo / 'permit.json'
        self.root = self.storage['guestRoot'] + '/' + self.job['outputRoot']
        self.directory = self.root + '/monitor'
        self.owner = dict(schemaVersion='digest-approved-job-exclusive-owner-v001',
            exclusiveOwnerId='33333333-3333-3333-3333-333333333333', createdAt=datetime.now(timezone.utc).isoformat(),
            controllerPid=os.getpid(), jobSha256=bind(self.job_file)['fileSha256'],
            authorizationSha256=bind(self.auth_file)['fileSha256'], outputRoot=self.job['outputRoot'],
            commandPermitPath=str(self.permit_file), implementationSha=self.head)
        self.owner_ref = dict(path=self.root + '/ownership.json', fileSha256='c' * 64, sizeBytes=400)
        self.command = [str(self.node_file), '--import', str(self.repo / 'runner/node_modules/tsx/dist/loader.mjs'),
            str(self.repo / m.APPROVED_WORKER), '--permit', str(self.permit_file), '--job-sha256',
            self.owner['jobSha256'], '--authorization-sha256', self.owner['authorizationSha256']]
        self.permit = dict(schemaVersion='digest-approved-job-command-permit-v001',
            status='verified-approved-digest-job-v001', jobBinding=bind(self.job_file), authorizationBinding=bind(self.auth_file),
            bindings=dict(planId=self.job['planId'], logicalPrefix=self.job['outputRoot'],
                planManifest=m.absolute_repo_binding(self.job['inputs']['candidateManifestBinding']),
                approvalRecord=bind(self.auth_file), implementationSha=self.head, commandPermitPath=str(self.permit_file)),
            storage=self.storage, implementation=[m.absolute_repo_binding(ref) for ref in self.job['implementation']['bindings']],
            monitorDirectory=self.directory, command=self.command, ownerBinding=self.owner_ref)
        self.permit_file.write_text(json.dumps(self.permit))

    def qualify(self, permit=None, job_sha=None, auth_sha=None):
        permit = self.permit if permit is None else permit
        stable_json = m.stable_bound_json
        stable_bytes = m.stable_bound_bytes
        file_identity = m.bound_file_identity
        verify_identity = m.verify_file_identity
        def identity(ref):
            return {'path': self.owner_ref['path'], 'fixtureOwner': True} if ref['path'] == self.owner_ref['path'] else file_identity(ref)
        def current_identity(value):
            return None if value.get('fixtureOwner') else verify_identity(value)
        def read_json(ref):
            return copy.deepcopy(self.owner) if ref['path'] == self.owner_ref['path'] else stable_json(ref)
        def read_bytes(ref):
            return b'bound owner fixture' if ref['path'] == self.owner_ref['path'] else stable_bytes(ref)
        def git(args, **kwargs):
            if args[-2:] == ['rev-parse', 'HEAD']:
                return getattr(self, 'observed_head', self.head) + '\n'
            if args[-2:] == ['status', '--porcelain=v1']:
                return getattr(self, 'observed_git_status', '')
            raise AssertionError('unexpected subprocess: ' + repr(args))
        with mock.patch.object(m, 'stable_bound_json', side_effect=read_json), \
            mock.patch.object(m, 'stable_bound_bytes', side_effect=read_bytes), \
            mock.patch.object(m, 'bound_file_identity', side_effect=identity), \
            mock.patch.object(m, 'verify_file_identity', side_effect=current_identity), \
            mock.patch.object(m, 'approved_image_identity', return_value={'fixture': True}), \
            mock.patch.object(Path, 'resolve', lambda path: path), \
            mock.patch.object(Path, 'is_dir', return_value=True), \
            mock.patch.object(m.subprocess, 'check_output', side_effect=git), \
            mock.patch.object(m.os, 'geteuid', return_value=501):
            result = m.validate_approved_job_permit(permit, self.directory, self.command, str(self.permit_file),
                self.permit['jobBinding']['fileSha256'] if job_sha is None else job_sha,
                self.permit['authorizationBinding']['fileSha256'] if auth_sha is None else auth_sha)
            result['revalidate']()
            return result

    def test_accepts_other_approved_plan_and_counts_without_old_values(self):
        result = self.qualify()
        self.assertEqual(result['job']['expected']['frames'], 600)
        self.assertEqual(result['job']['planId'], 'different-approved-plan')
        self.assertNotEqual(result['job']['storage']['imageMaximumBytes'], m.FORMAL_STORAGE['imageMaximumBytes'])

    def verification_policy(self):
        return dict(schemaVersion='digest-representative-verification-policy-v001',
            mode='representative-plus-rules-v001', representativeInstructionIds=['instruction-A'],
            permittedMethods=['still-frame', 'text-clock-context', 'video-playback'],
            confirmationRecordPath=self.job['outputRoot'] + '/review/confirmation.json')

    def policy_config(self, policy=None):
        job = copy.deepcopy(self.job)
        job['verificationPolicy'] = self.verification_policy() if policy is None else policy
        authorization = copy.deepcopy(self.authorization)
        authorization['verificationPolicy'] = copy.deepcopy(job['verificationPolicy'])
        return job, authorization

    def test_verification_policy_accepts_one_or_several_representatives(self):
        for ids, methods in ((['instruction-A'], ['still-frame']),
            (['A', 'B', 'C', 'D'], ['still-frame', 'text-clock-context', 'video-playback'])):
            policy = self.verification_policy()
            policy['representativeInstructionIds'] = ids
            policy['permittedMethods'] = methods
            job, authorization = self.policy_config(policy)
            with self.subTest(ids=ids):
                self.assertIs(m.validate_approved_job_config(job, authorization), job)
        self.assertNotIn('verificationPolicy', m.validate_approved_job_config(self.job, self.authorization))

    def test_verification_policy_requires_both_records_and_exact_agreement(self):
        job, authorization = self.policy_config()
        with self.assertRaisesRegex(ValueError, 'presence mismatch'):
            m.validate_approved_job_config(job, self.authorization)
        with self.assertRaisesRegex(ValueError, 'presence mismatch'):
            m.validate_approved_job_config(self.job, authorization)
        for field, value in (('representativeInstructionIds', ['instruction-B']),
            ('permittedMethods', ['video-playback']),
            ('confirmationRecordPath', self.job['outputRoot'] + '/another.json')):
            changed = copy.deepcopy(authorization)
            changed['verificationPolicy'][field] = value
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, 'policy mismatch'):
                m.validate_approved_job_config(job, changed)

    def test_verification_policy_rejects_other_modes_and_unbound_media_fields(self):
        bad = [None, {}, {**self.verification_policy(), 'finalMp4Sha256': 'a' * 64},
            {**self.verification_policy(), 'schemaVersion': 'unknown'},
            {**self.verification_policy(), 'mode': 'skip-qc'}]
        for policy in bad:
            job, authorization = self.policy_config()
            job['verificationPolicy'] = policy
            authorization['verificationPolicy'] = copy.deepcopy(policy)
            with self.subTest(policy=policy), self.assertRaises(ValueError):
                m.validate_approved_job_config(job, authorization)

    def test_verification_policy_rejects_empty_duplicate_or_invalid_ids_and_methods(self):
        cases = [('representativeInstructionIds', value) for value in
            ([], [''], [' '], ['A', 'A'], [1], 'A')]
        cases += [('permittedMethods', value) for value in
            ([], ['still-frame', 'still-frame'], ['native-qc'], [1], 'still-frame')]
        for field, value in cases:
            policy = self.verification_policy()
            policy[field] = value
            job, authorization = self.policy_config(policy)
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                m.validate_approved_job_config(job, authorization)

    def test_verification_policy_record_stays_inside_exact_output_root(self):
        prefix = self.job['outputRoot']
        for value in ('', '/tmp/confirmation.json', '../confirmation.json', prefix + '/../confirmation.json',
            prefix + '/review//confirmation.json', prefix + '-other/confirmation.json',
            'runtime/artifacts/other-plan/attempt-005/confirmation.json', prefix + '/confirmation.txt'):
            policy = self.verification_policy()
            policy['confirmationRecordPath'] = value
            job, authorization = self.policy_config(policy)
            with self.subTest(path=value), self.assertRaisesRegex(ValueError, 'safe relative JSON'):
                m.validate_approved_job_config(job, authorization)

    def test_representative_completion_module_is_required_and_byte_bound(self):
        module = 'evals/clip_composition/digest_representative_completion_v001.mjs'
        job, authorization = self.policy_config()
        job['implementation']['bindings'] = [ref for ref in job['implementation']['bindings'] if ref['path'] != module]
        authorization['implementation'] = copy.deepcopy(job['implementation'])
        with self.assertRaisesRegex(ValueError, 'implementation'):
            m.validate_approved_job_config(job, authorization)
        source = self.repo / module
        source.write_text('// changed representative completion implementation')
        with self.assertRaisesRegex(ValueError, 'SHA'):
            self.qualify()

    def test_policy_change_cannot_reuse_the_bound_authorization_bytes(self):
        changed = copy.deepcopy(self.authorization)
        changed['verificationPolicy'] = self.verification_policy()
        self.auth_file.write_text(json.dumps(changed))
        with self.assertRaisesRegex(ValueError, 'SHA'):
            self.qualify()

    def test_requires_independent_job_and_authorization_anchors(self):
        for job_sha, auth_sha in ((False, 'd' * 64), ('d' * 64, False), ('d' * 64, 'e' * 64)):
            with self.subTest(job_sha=job_sha, auth_sha=auth_sha), self.assertRaises(ValueError):
                self.qualify(job_sha=job_sha, auth_sha=auth_sha)

    def test_rejects_unknown_legacy_or_failure_fields(self):
        permit = copy.deepcopy(self.permit)
        permit['previousGrant'] = {}
        with self.assertRaisesRegex(ValueError, 'exact fields'):
            self.qualify(permit)

    def test_authorization_different_plan_settings_storage_or_action(self):
        for key in ('planId', 'typographySettingsBinding', 'storage', 'actions'):
            authorization = copy.deepcopy(self.authorization)
            authorization[key] = 'different' if key == 'planId' else {} if key != 'actions' else ['manufacture-any-plan']
            with self.subTest(key=key), self.assertRaises(ValueError):
                m.validate_approved_job_config(self.job, authorization)

    def test_rejects_bool_negative_unsafe_counts_and_weaker_guard(self):
        for value in (True, 0, -1, 1 << 53):
            job = copy.deepcopy(self.job)
            job['expected']['frames'] = value
            with self.subTest(value=value), self.assertRaises(ValueError):
                m.validate_approved_job_config(job, self.authorization)
        job = copy.deepcopy(self.job)
        job['guard']['maximumRssBytes'] += 1
        authorization = {**self.authorization, 'guard': job['guard']}
        with self.assertRaisesRegex(ValueError, 'safety'):
            m.validate_approved_job_config(job, authorization)

    def test_rejects_missing_required_code_and_duplicate_code(self):
        for bindings in (self.job['implementation']['bindings'][1:], self.job['implementation']['bindings'] * 2):
            job = copy.deepcopy(self.job)
            job['implementation']['bindings'] = bindings
            with self.assertRaisesRegex(ValueError, 'implementation'):
                m.validate_approved_job_config(job, self.authorization)

    def test_rejects_changed_source_hash_and_size(self):
        path = self.repo / self.job['inputs']['candidateManifestBinding']['path']
        path.write_text('{"changed":true}\n')
        with self.assertRaisesRegex(ValueError, 'SHA'):
            self.qualify()
        ref = bind(path)
        ref['sizeBytes'] += 1
        with self.assertRaisesRegex(ValueError, 'size'):
            m.stable_bound_bytes(ref)

    def test_rejects_symlink_binding(self):
        path = self.repo / 'actual.json'
        path.write_text('{}')
        link = self.repo / 'link.json'
        link.symlink_to(path)
        with self.assertRaisesRegex(ValueError, 'symlink'):
            m.stable_bound_bytes({**bind(path), 'path': str(link)})

    def test_rejects_wrong_owner_and_stale_owner(self):
        self.owner['controllerPid'] += 1
        with self.assertRaisesRegex(ValueError, 'supervisor'):
            self.qualify()
        self.owner['controllerPid'] = os.getpid()
        self.owner['createdAt'] = '2020-01-01T00:00:00Z'
        with self.assertRaisesRegex(ValueError, 'fresh'):
            self.qualify()

    def test_rejects_missing_owner_fields_and_other_job_owner(self):
        self.owner['jobSha256'] = 'e' * 64
        with self.assertRaisesRegex(ValueError, 'owner binding'):
            self.qualify()
        del self.owner['createdAt']
        with self.assertRaisesRegex(ValueError, 'exact fields'):
            self.qualify()

    def test_rejects_command_with_other_sha(self):
        self.permit['command'][-1] = 'f' * 64
        with self.assertRaisesRegex(ValueError, 'command'):
            self.qualify()

    def test_runtime_head_dirty_and_code_hash_fail_closed(self):
        self.observed_head = 'b' * 40
        with self.assertRaisesRegex(ValueError, 'HEAD'):
            self.qualify()
        self.observed_head = self.head
        self.observed_git_status = ' M source.ts\n'
        with self.assertRaisesRegex(ValueError, 'clean'):
            self.qualify()
        self.observed_git_status = ''
        source = self.repo / self.job['implementation']['bindings'][0]['path']
        source.write_text('// changed implementation')
        with self.assertRaisesRegex(ValueError, 'SHA'):
            self.qualify()

    def test_allocation_budget_is_explicit_positive_input(self):
        for value in (True, 0, -1, 1 << 53):
            job = copy.deepcopy(self.job)
            job['allocationBudget']['baseBuildBytes'] = value
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, 'budget'):
                m.validate_approved_job_config(job, self.authorization)
        job = copy.deepcopy(self.job)
        del job['allocationBudget']
        with self.assertRaisesRegex(ValueError, 'exact fields'):
            m.validate_approved_job_config(job, self.authorization)

    def test_start_host_capacity_uses_this_job_sample(self):
        sample = dict(availableBytes=55_000_000_000, pressure=1, treeRssBytes=0,
            hostAvailableBytes=95_000_000_000, hostStartRequiredBytes=92_900_000_000,
            hostRequiredBytes=20_000_000_000, internalAvailableBytes=20_000_000_000)
        self.assertIsNone(m.formal_decision(sample, starting=True, guard=self.job['guard']))
        sample['hostAvailableBytes'] = sample['hostStartRequiredBytes'] - 1
        self.assertIn('host', m.formal_decision(sample, starting=True, guard=self.job['guard']))

    def test_legacy_requires_explicit_recovery_and_normal_cannot_fall_back(self):
        legacy = self.repo / 'legacy.json'
        legacy.write_text(json.dumps({'status': 'verified-same-run-resume'}))
        with self.assertRaisesRegex(ValueError, 'legacy-recovery-only'):
            m.run(str(self.repo / 'unused'), [], str(legacy))
        with mock.patch.object(m, 'run_resume', return_value=7) as resume:
            self.assertEqual(m.run('legacy-dir', ['legacy-cmd'], str(legacy), legacy_recovery_only=True), 7)
            resume.assert_called_once()
        with self.assertRaisesRegex(ValueError, 'normal approved jobs'):
            m.run(self.directory, self.command, str(self.permit_file), legacy_recovery_only=True)

    def test_cli_keeps_independent_anchors_outside_node_command(self):
        with mock.patch.object(m, 'run', return_value=0) as run:
            self.assertEqual(m.main(['--approved-job-sha256', 'a' * 64, '--authorization-sha256', 'b' * 64,
                '/fixture/monitor', '/fixture/permit', '/node', '--import', 'loader', 'worker']), 0)
            self.assertEqual(run.call_args.args[1], ['/node', '--import', 'loader', 'worker'])
            self.assertEqual(run.call_args.args[3:5], ('a' * 64, 'b' * 64))

    def test_unknown_status_never_falls_back(self):
        path = self.repo / 'unknown.json'
        path.write_text(json.dumps({'status': 'unknown'}))
        with self.assertRaisesRegex(RuntimeError, 'unknown'):
            m.run('unused', [], str(path), legacy_recovery_only=True)


    def test_owner_or_grant_same_bytes_replacement_is_detected(self):
        owner = self.repo / 'owned-anchor.json'
        owner.write_text('{"same":"bytes"}')
        identity = m.bound_file_identity(bind(owner))
        replacement = self.repo / 'replacement.json'
        replacement.write_bytes(owner.read_bytes())
        replacement.replace(owner)
        with self.assertRaisesRegex(ValueError, 'anchor file identity'):
            m.verify_file_identity(identity)

    def test_node_options_are_rejected_before_any_worker(self):
        with mock.patch.dict(m.os.environ, {'NODE_OPTIONS': '--require unsafe.js'}), self.assertRaisesRegex(ValueError, 'NODE_OPTIONS'):
            self.qualify()

    def test_node_basename_and_missing_node_approval_are_rejected(self):
        job = copy.deepcopy(self.job)
        job['implementation']['nodeBinding']['path'] = str(self.repo / 'python3')
        with self.assertRaisesRegex(ValueError, 'basename'):
            m.validate_approved_job_config(job, self.authorization)
        del job['implementation']['nodeBinding']
        with self.assertRaisesRegex(ValueError, 'exact fields'):
            m.validate_approved_job_config(job, self.authorization)

    def prepared_fixture(self):
        return dict(job=copy.deepcopy(self.job), authorization=copy.deepcopy(self.authorization),
            jobBinding=copy.deepcopy(self.permit['jobBinding']), authorizationBinding=copy.deepcopy(self.permit['authorizationBinding']),
            outputDirectory=self.root, observedNodeIdentity=m.bound_node_identity(self.job['implementation']['nodeBinding']), imageIdentity={}, initialResourceSample={},
            status='ready-for-explicit-approved-job-launch-v001', rootClaimed=False)

    def test_prepare_is_read_only_and_grants_no_new_permission(self):
        configured = self.prepared_fixture()
        sample = dict(at=time.time(), availableBytes=60_000_000_000, pressure=1, treeRssBytes=0,
            parentRssBytes=0, hostAvailableBytes=200_000_000_000, hostRequiredBytes=20_000_000_000,
            hostStartRequiredBytes=92_900_000_000, internalAvailableBytes=20_000_000_000)
        with mock.patch.object(m, 'read_approved_job_files', return_value=configured), \
            mock.patch.object(m, 'approved_image_identity', return_value={}), \
            mock.patch.object(m, 'inspect_output_ancestors'), \
            mock.patch.object(m, 'observe_formal', return_value=sample), \
            mock.patch.object(m.os, 'geteuid', return_value=501), \
            mock.patch.object(Path, 'mkdir') as mkdir, mock.patch.object(m.subprocess, 'Popen') as spawn:
            prepared = m.prepare_approved_job(str(self.job_file), str(self.auth_file),
                self.owner['jobSha256'], self.owner['authorizationSha256'], self.command[0])
        self.assertFalse(prepared['manufacturePermissionGranted'])
        self.assertFalse(prepared['rootClaimed'])
        self.assertEqual(prepared['processesStarted'], 0)
        mkdir.assert_not_called()
        spawn.assert_not_called()

    def test_explicit_node_binding_is_required_and_bytes_are_observed(self):
        alternate = self.repo / 'different-node'
        alternate.write_bytes(b'different approved binary fixture')
        self.permit['command'][0] = str(alternate)
        self.command = self.permit['command']
        with self.assertRaisesRegex(ValueError, 'Node command path'):
            self.qualify()
        node = self.repo / 'fixture-node'
        node.write_bytes(b'approved executable bytes')
        identity = m.bound_node_identity(bind(node))
        m.verify_node_identity(identity)
        node.write_bytes(b'changed executable bytes')
        with self.assertRaisesRegex(ValueError, 'Node identity'):
            m.verify_node_identity(identity)

    def launch_fixture(self):
        configured = self.prepared_fixture()
        guest = self.repo / 'guest'
        guest.mkdir()
        configured['job']['storage']['guestRoot'] = str(guest)
        configured['job']['storage']['guestDevice'] = guest.stat().st_dev
        configured['outputDirectory'] = str(guest / self.job['outputRoot'])
        return configured

    def test_launch_builds_real_owner_and_permit_without_manual_pid(self):
        configured = self.launch_fixture()
        with mock.patch.object(m, 'prepare_approved_job', return_value=configured), \
            mock.patch.object(m, 'volume_identity', return_value={'writable': True, 'permissionsEnabled': True}), \
            mock.patch.object(m, 'run', return_value=0) as run:
            self.assertEqual(m.launch_approved_job(str(self.job_file), str(self.auth_file),
                self.owner['jobSha256'], self.owner['authorizationSha256'], self.command[0]), 0)
        root = Path(configured['outputDirectory'])
        owner = json.loads((root / 'ownership.json').read_text())
        permit = json.loads((root / 'command-permit.json').read_text())
        self.assertEqual(owner['controllerPid'], os.getpid())
        self.assertEqual(owner['jobSha256'], self.owner['jobSha256'])
        self.assertEqual(owner['outputRoot'], 'runtime/artifacts/different-approved-plan/attempt-005')
        self.assertEqual(permit['bindings']['planId'], 'different-approved-plan')
        self.assertEqual(permit['ownerBinding'], bind(root / 'ownership.json'))
        self.assertEqual(len(permit['command']), 10)
        self.assertEqual(permit['command'][0], self.command[0])
        self.assertTrue((root / 'temp').is_dir())
        self.assertEqual(run.call_args.args[-2:], (self.owner['jobSha256'], self.owner['authorizationSha256']))
        self.assertEqual((root / 'command-permit.json').stat().st_mode & 0o777, 0o444)

    def test_launch_preserves_existing_root_and_partial_claim(self):
        configured = self.launch_fixture()
        root = Path(configured['outputDirectory'])
        with mock.patch.object(m, 'prepare_approved_job', return_value=configured), \
            mock.patch.object(m, 'volume_identity', return_value={'writable': True, 'permissionsEnabled': True}), \
            mock.patch.object(m, 'run', side_effect=RuntimeError('injected validation failure')):
            with self.assertRaisesRegex(RuntimeError, 'claim retained'):
                m.launch_approved_job(str(self.job_file), str(self.auth_file),
                    self.owner['jobSha256'], self.owner['authorizationSha256'], self.command[0])
        original = (root / 'ownership.json').read_bytes()
        with mock.patch.object(m, 'prepare_approved_job', return_value=configured), \
            mock.patch.object(m, 'volume_identity', return_value={'writable': True, 'permissionsEnabled': True}), \
            mock.patch.object(m, 'run') as run, self.assertRaises(FileExistsError):
            m.launch_approved_job(str(self.job_file), str(self.auth_file),
                self.owner['jobSha256'], self.owner['authorizationSha256'], self.command[0])
        self.assertEqual((root / 'ownership.json').read_bytes(), original)
        run.assert_not_called()

    def test_prepare_rejects_used_root_and_symlink_ancestor(self):
        configured = self.launch_fixture()
        guest = configured['job']['storage']['guestRoot']
        real = Path(guest) / 'actual'
        real.mkdir()
        link = Path(guest) / 'symlink'
        link.symlink_to(real)
        with self.assertRaisesRegex(ValueError, 'ancestor'):
            m.inspect_output_ancestors(link, configured['job']['storage'])
        root = Path(configured['outputDirectory'])
        root.mkdir(parents=True)
        with mock.patch.object(m, 'read_approved_job_files', return_value=configured), \
            mock.patch.object(m, 'approved_image_identity', return_value={}), \
            mock.patch.object(m.os, 'geteuid', return_value=501), self.assertRaisesRegex(ValueError, 'already exists'):
            m.prepare_approved_job(str(self.job_file), str(self.auth_file),
                self.owner['jobSha256'], self.owner['authorizationSha256'], self.command[0])

    def test_prepare_cli_is_explicit_and_separate_from_direct_worker(self):
        with mock.patch.object(m, 'prepare_approved_job', return_value={'processesStarted': 0}) as prepare, \
            mock.patch('builtins.print'):
            self.assertEqual(m.main(['--prepare-job', '--job-file', str(self.job_file),
                '--authorization-file', str(self.auth_file), '--node-path', self.command[0],
                '--approved-job-sha256', 'a' * 64, '--authorization-sha256', 'b' * 64]), 0)
        prepare.assert_called_once_with(str(self.job_file), str(self.auth_file), 'a' * 64, 'b' * 64, self.command[0])


class ApprovedRunTest(unittest.TestCase):
    def test_next_unit_refresh_stops_only_owned_group(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            permit_file = root / 'permit.json'
            command = [sys.executable, '-u', '-c',
                'import sys,time;print(\'@@RESOURCE_CHECK {"id":1,"stage":"body","newBytes":0}\',flush=True);sys.stdin.readline();time.sleep(30)']
            permit = dict(status='verified-approved-digest-job-v001', bindings={}, storage=dict(imageMaximumBytes=80_000_000_000,
                hostMetadataReserveBytes=900_000_000), jobBinding={}, authorizationBinding={}, ownerBinding={})
            permit_file.write_text(json.dumps(permit))
            outsider = subprocess.Popen([sys.executable, '-c', 'import time;time.sleep(30)'], start_new_session=True)
            validations = []
            sample_count = 0
            def observation(group, config, identity):
                nonlocal sample_count
                sample_count += 1
                return dict(at=time.time(), availableBytes=60_000_000_000, pressure=2 if sample_count >= 3 else 1,
                    treeRssBytes=0, parentRssBytes=0, hostAvailableBytes=200_000_000_000,
                    hostRequiredBytes=20_000_000_000, hostStartRequiredBytes=92_900_000_000,
                    internalAvailableBytes=20_000_000_000)
            approved = dict(imageIdentity={}, guard=m.APPROVED_GUARD, revalidate=lambda: validations.append(time.time()))
            real_spawn = subprocess.Popen
            try:
                with mock.patch.object(m, 'validate_approved_job_permit', return_value=approved), \
                    mock.patch.object(m, 'observe_formal', side_effect=observation), \
                    mock.patch.dict(m.os.environ, {'NODE_PATH': '/unapproved/caller/node_modules'}), \
                    mock.patch.object(m.subprocess, 'Popen', side_effect=real_spawn) as spawn:
                    self.assertEqual(m.run(str(root / 'monitor'), command, str(permit_file), 'a' * 64, 'b' * 64), 1)
                worker_spawns = [call for call in spawn.call_args_list if call.args and call.args[0] == command]
                self.assertEqual(len(worker_spawns), 1)
                self.assertEqual(worker_spawns[0].kwargs['env']['NODE_PATH'], str(Path(m.FORMAL_REPO) / 'runner/node_modules'))
                result = json.loads((root / 'monitor/summary.json').read_text())
                self.assertEqual(result['remainingRunning'], [])
                self.assertIn('pressure', result['reason'])
                self.assertEqual(result['limits']['imageMaximumBytes'], 80_000_000_000)
                self.assertTrue(validations)
                self.assertIsNone(outsider.poll())
                rows = [json.loads(line) for line in (root / 'monitor/resource.jsonl').read_text().splitlines()]
                before = [row for row in rows if row.get('phase') == 'before-body']
                self.assertEqual(len(before), 1)
                self.assertEqual(before[0]['pressure'], 2)
            finally:
                outsider.terminate()
                outsider.wait()

    def test_existing_monitor_cannot_start_worker(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            existing = root / 'monitor'
            existing.mkdir()
            permit = root / 'permit.json'
            permit.write_text(json.dumps({'status': 'verified-approved-digest-job-v001'}))
            approved = dict(imageIdentity={}, guard=m.APPROVED_GUARD, revalidate=lambda: None)
            with mock.patch.object(m, 'validate_approved_job_permit', return_value=approved), \
                mock.patch.object(m.subprocess, 'Popen') as spawn, self.assertRaises(FileExistsError):
                m.run(str(existing), ['unused'], str(permit), 'a' * 64, 'b' * 64)
            spawn.assert_not_called()


if __name__ == '__main__':
    unittest.main()

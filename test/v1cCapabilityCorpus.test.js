import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  V1CCapabilityCorpusError,
  assertExpectedOutcome,
  assertExpectedSemanticComparison,
  validateV1CCapabilityManifest,
} from '../src/corpus/v1cCapabilityCorpus.js';

const manifest = JSON.parse(fs.readFileSync('fixtures/v1c/manifest.json', 'utf8'));

test('V1C manifest validates the pinned external source and twenty-two capability cases', () => {
  const validated = validateV1CCapabilityManifest(manifest);
  assert.equal(validated.stage, 'V1C');
  assert.equal(validated.source.repository, 'w3c-cg/musicxmlTestSuite');
  assert.equal(validated.source.commitSha, '77c19f7e819154c70ca1a1992e80dcda8ff82fea');
  assert.equal(validated.engine.commitSha, '1d8ced644f544f7e991f7275eda77a2ce557774e');
  assert.equal(validated.cases.length, 22);
  assert.equal(validated.policy.unsupportedIsLocal, true);
  assert.equal(validated.policy.corpusContinuesAfterCaseFailure, true);
  assert.equal(validated.policy.rejectOtherDeclarations, true);
  assert.equal(validated.policy.rawInputSecurityPolicyRemainsUnchanged, true);
  assert.deepEqual(validated.policy.allowedSemanticProbeTransforms, [
    'IDENTITY_NO_DOCTYPE',
    'REMOVE_VERIFIED_MUSICXML_PARTWISE_EXTERNAL_DOCTYPE',
  ]);
  assert.ok(Object.isFrozen(validated));
});

test('V1C committed cases pin raw/probe hashes, transforms and non-observational outcomes', () => {
  const validated = validateV1CCapabilityManifest(manifest);
  for (const item of validated.cases) {
    assert.match(item.sourceSha256, /^[a-f0-9]{64}$/);
    assert.match(item.semanticProbeSha256, /^[a-f0-9]{64}$/);
    assert.equal(item.semanticProbeTransform, 'REMOVE_VERIFIED_MUSICXML_PARTWISE_EXTERNAL_DOCTYPE');
    assert.notEqual(item.expectedLab.status, 'OBSERVE');
    assert.notEqual(item.expectedEngine.status, 'OBSERVE');
    assert.notEqual(item.expectedProbeLab.status, 'OBSERVE');
    assert.notEqual(item.expectedProbeEngine.status, 'OBSERVE');
    assert.notEqual(item.expectedSemanticComparison, 'OBSERVE');
  }
});

test('V1C baseline pins five equal semantic comparisons without claiming broader conformance', () => {
  const validated = validateV1CCapabilityManifest(manifest);
  const equalCases = validated.cases
    .filter((item) => item.expectedSemanticComparison === 'EQUAL')
    .map((item) => item.caseId)
    .sort();
  assert.deepEqual(equalCases, [
    'w3c-03b-rhythm-backup',
    'w3c-21a-chord-basic',
    'w3c-33b-simple-tie',
    'w3c-43a-piano-staff',
    'w3c-43i-single-voice-staff-change',
  ]);
});

test('V1C observation helper keeps unsupported local capability distinct from runner failure', () => {
  assert.doesNotThrow(() => assertExpectedOutcome(
    { status: 'OBSERVE', errorCode: null },
    { status: 'UNSUPPORTED_LOCAL', errorCode: 'ANY_LOCAL_CODE' },
    'case.lab',
  ));
  assert.doesNotThrow(() => assertExpectedSemanticComparison(
    'OBSERVE',
    'NOT_COMPARABLE',
    'case.semantic',
  ));
});

test('V1C pinned expectations detect outcome drift', () => {
  assert.throws(
    () => assertExpectedOutcome(
      { status: 'SUPPORTED', errorCode: null },
      { status: 'UNSUPPORTED_LOCAL', errorCode: 'X' },
      'case.lab',
    ),
    /EXPECTED_OUTCOME_DRIFT/,
  );
});

test('V1C manifest rejects duplicate identity, unpinned provenance, unapproved transforms and global unsupported policy', () => {
  const duplicate = structuredClone(manifest);
  duplicate.cases[1].caseId = duplicate.cases[0].caseId;
  assert.throws(() => validateV1CCapabilityManifest(duplicate), V1CCapabilityCorpusError);

  const badSha = structuredClone(manifest);
  badSha.cases[0].sourceSha256 = null;
  assert.throws(() => validateV1CCapabilityManifest(badSha), V1CCapabilityCorpusError);

  const badProbeSha = structuredClone(manifest);
  badProbeSha.cases[0].semanticProbeSha256 = null;
  assert.throws(() => validateV1CCapabilityManifest(badProbeSha), V1CCapabilityCorpusError);

  const observe = structuredClone(manifest);
  observe.cases[0].expectedProbeEngine = { status: 'OBSERVE', errorCode: null };
  assert.throws(() => validateV1CCapabilityManifest(observe), V1CCapabilityCorpusError);

  const badTransform = structuredClone(manifest);
  badTransform.cases[0].semanticProbeTransform = 'REMOVE_ANY_DOCTYPE';
  assert.throws(() => validateV1CCapabilityManifest(badTransform), V1CCapabilityCorpusError);

  const weakenedDeclarationPolicy = structuredClone(manifest);
  weakenedDeclarationPolicy.policy.rejectOtherDeclarations = false;
  assert.throws(() => validateV1CCapabilityManifest(weakenedDeclarationPolicy), V1CCapabilityCorpusError);

  const globalBlock = structuredClone(manifest);
  globalBlock.policy.unsupportedIsLocal = false;
  assert.throws(() => validateV1CCapabilityManifest(globalBlock), V1CCapabilityCorpusError);
});

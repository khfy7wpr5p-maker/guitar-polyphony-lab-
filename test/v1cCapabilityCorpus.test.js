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

test('V1C manifest validates the pinned external source and eleven capability cases', () => {
  const validated = validateV1CCapabilityManifest(manifest);
  assert.equal(validated.stage, 'V1C');
  assert.equal(validated.source.repository, 'w3c-cg/musicxmlTestSuite');
  assert.equal(validated.source.commitSha, '77c19f7e819154c70ca1a1992e80dcda8ff82fea');
  assert.equal(validated.engine.commitSha, '1d8ced644f544f7e991f7275eda77a2ce557774e');
  assert.equal(validated.cases.length, 11);
  assert.equal(validated.policy.unsupportedIsLocal, true);
  assert.equal(validated.policy.corpusContinuesAfterCaseFailure, true);
  assert.equal(validated.policy.rawInputSecurityPolicyRemainsUnchanged, true);
  assert.ok(Object.isFrozen(validated));
});

test('V1C observation mode does not turn unsupported local capability into a global contract failure', () => {
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

test('V1C manifest rejects duplicate identity, malformed provenance and global unsupported policy', () => {
  const duplicate = structuredClone(manifest);
  duplicate.cases[1].caseId = duplicate.cases[0].caseId;
  assert.throws(() => validateV1CCapabilityManifest(duplicate), V1CCapabilityCorpusError);

  const badSha = structuredClone(manifest);
  badSha.source.commitSha = 'main';
  assert.throws(() => validateV1CCapabilityManifest(badSha), V1CCapabilityCorpusError);

  const globalBlock = structuredClone(manifest);
  globalBlock.policy.unsupportedIsLocal = false;
  assert.throws(() => validateV1CCapabilityManifest(globalBlock), V1CCapabilityCorpusError);
});

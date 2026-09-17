import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  V2_FAILURE_INTELLIGENCE_CONTRACT_VERSION,
  assertNoSemanticGlobalBlock,
  classifyObservedFailure,
  failureTaxonomyEntries,
} from '../src/failures/v2FailureIntelligence.js';

function loadV1CCases() {
  const report = JSON.parse(fs.readFileSync('artifacts/v1c/capability-report.json', 'utf8'));
  return report.caseShards.flatMap((shard) => (
    JSON.parse(fs.readFileSync(shard.path, 'utf8')).cases
  ));
}

function observedFailures() {
  return loadV1CCases().flatMap((item) => {
    const rows = [];
    for (const [provider, phase, outcome] of [
      ['LAB', 'RAW_INPUT', item.rawInput.lab],
      ['ENGINE', 'RAW_INPUT', item.rawInput.engine],
      ['LAB', 'SEMANTIC_PROBE', item.semanticProbe.lab],
      ['ENGINE', 'SEMANTIC_PROBE', item.semanticProbe.engine],
    ]) {
      if (outcome.status === 'UNSUPPORTED_LOCAL') {
        rows.push({ caseId: item.caseId, provider, phase, errorCode: outcome.errorCode });
      }
    }
    return rows;
  });
}

test('V2 taxonomy classifies every V1C failure observation without semantic global blocking', () => {
  const failures = observedFailures();
  assert.equal(failures.length, 63);
  const classified = failures.map((item) => assertNoSemanticGlobalBlock(classifyObservedFailure(item)));
  assert.equal(classified.filter((item) => item.failureFamily === 'UNCLASSIFIED_FAILURE').length, 0);
  assert.equal(classified.filter((item) => item.phase === 'RAW_INPUT').length, 44);
  assert.equal(classified.filter((item) => item.phase === 'SEMANTIC_PROBE').length, 19);
  assert.equal(classified.filter((item) => item.handlingClass === 'GLOBAL_TRUST_REJECT').length, 44);
  assert.equal(classified.filter((item) => (
    item.phase === 'SEMANTIC_PROBE' && item.progressiveStateCandidate === 'REVIEW_REQUIRED'
  )).length, 13);
  assert.equal(classified.filter((item) => (
    item.phase === 'SEMANTIC_PROBE' && item.progressiveStateCandidate === 'UNSUPPORTED_LOCAL'
  )).length, 6);
});

test('generic projection failures stay explicitly unrefined instead of inventing a root cause', () => {
  const classified = classifyObservedFailure({
    provider: 'ENGINE',
    phase: 'SEMANTIC_PROBE',
    errorCode: 'UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE',
  });
  assert.equal(classified.failureFamily, 'GENERIC_PROJECTION_CAPABILITY');
  assert.equal(classified.layer, 'PROJECTION_OR_COMPATIBILITY');
  assert.equal(classified.scopeClass, 'UNKNOWN_LOCAL');
  assert.equal(classified.handlingClass, 'NEEDS_FEATURE_REFINEMENT');
  assert.equal(classified.progressiveStateCandidate, 'UNSUPPORTED_LOCAL');
  assert.equal(classified.refinementRequired, true);
});

test('repeat and display failures are localized review candidates, not whole-score blocks', () => {
  const repeat = classifyObservedFailure({
    provider: 'ENGINE',
    phase: 'SEMANTIC_PROBE',
    errorCode: 'UNSUPPORTED_POLYPHONIC_REPEAT_BARLINE',
  });
  const display = classifyObservedFailure({
    provider: 'ENGINE',
    phase: 'SEMANTIC_PROBE',
    errorCode: 'UNSUPPORTED_POLYPHONIC_TIME_SIGNATURE_DISPLAY',
  });
  assert.equal(repeat.scopeClass, 'MEASURE_REGION');
  assert.equal(repeat.progressiveStateCandidate, 'REVIEW_REQUIRED');
  assert.equal(display.scopeClass, 'MEASURE_DISPLAY');
  assert.equal(display.progressiveStateCandidate, 'REVIEW_REQUIRED');
});

test('raw hostile-XML codes are the only current global trust rejects', () => {
  const entries = Object.values(failureTaxonomyEntries());
  const global = entries.filter((item) => item.progressiveStateCandidate === 'BLOCKED_GLOBAL');
  assert.equal(global.length, 2);
  assert.ok(global.every((item) => item.failureFamily === 'INPUT_SECURITY'));
  assert.ok(global.every((item) => item.scopeClass === 'SCORE_INPUT'));
});

test('unknown codes remain local and demand a taxonomy entry', () => {
  const unknown = classifyObservedFailure({
    provider: 'ENGINE',
    phase: 'SEMANTIC_PROBE',
    errorCode: 'FUTURE_UNKNOWN_CAPABILITY',
  });
  assert.equal(unknown.contractVersion, V2_FAILURE_INTELLIGENCE_CONTRACT_VERSION);
  assert.equal(unknown.failureFamily, 'UNCLASSIFIED_FAILURE');
  assert.equal(unknown.progressiveStateCandidate, 'UNSUPPORTED_LOCAL');
  assert.equal(unknown.refinementRequired, true);
  assert.doesNotThrow(() => assertNoSemanticGlobalBlock(unknown));
});

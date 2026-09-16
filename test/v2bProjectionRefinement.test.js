import assert from 'node:assert/strict';
import test from 'node:test';

import {
  refineGenericProjectionFailure,
} from '../src/failures/v2bProjectionRefinement.js';

const CODE = 'UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE';

function occurrence(overrides = {}) {
  return {
    partIndex: 0,
    partId: 'P1',
    measureIndex: 0,
    measureNumber: '1',
    measureChildIndex: 2,
    noteOrdinal: null,
    matchedPath: 'measure/direction',
    sourceShape: {
      nestedChildPaths: ['direction-type/metronome'],
    },
    ...overrides,
  };
}

test('direction with Engine measure location refines to one measure child', () => {
  const result = refineGenericProjectionFailure({
    errorCode: CODE,
    observedFeature: 'direction',
    details: { feature: 'direction', measureIndex: 0, measureChildIndex: 2 },
    sourceOccurrences: [occurrence()],
  });
  assert.equal(result.failureFamily, 'DIRECTION_COMPATIBILITY');
  assert.equal(result.scopeClass, 'MEASURE_CHILD');
  assert.equal(result.progressiveStateCandidate, 'REVIEW_REQUIRED');
  assert.equal(result.refinementRequired, false);
  assert.deepEqual(result.sourceSubtypeEvidence, ['direction-type/metronome']);
});

test('notation dynamics with a unique note occurrence refines to NOTE_EVENT', () => {
  const result = refineGenericProjectionFailure({
    errorCode: CODE,
    observedFeature: 'notation:dynamics',
    details: { feature: 'notation:dynamics' },
    sourceOccurrences: [occurrence({
      measureIndex: 1,
      measureNumber: '85',
      measureChildIndex: 1,
      noteOrdinal: 0,
      matchedPath: 'measure/note/notations/dynamics',
      sourceShape: { nestedChildPaths: ['notations/dynamics'] },
    })],
  });
  assert.equal(result.failureFamily, 'NOTATION_DYNAMICS_COMPATIBILITY');
  assert.equal(result.scopeClass, 'NOTE_EVENT');
  assert.equal(result.progressiveStateCandidate, 'REVIEW_REQUIRED');
  assert.equal(result.refinementRequired, false);
});

test('multiple harmony occurrences preserve the unresolved exact occurrence', () => {
  const result = refineGenericProjectionFailure({
    errorCode: CODE,
    observedFeature: 'harmony',
    details: { feature: 'harmony' },
    sourceOccurrences: [
      occurrence({ measureChildIndex: 1, matchedPath: 'measure/harmony', sourceShape: { nestedChildPaths: ['frame/frame-note'] } }),
      occurrence({ measureChildIndex: 3, matchedPath: 'measure/harmony', sourceShape: { nestedChildPaths: ['degree/degree-value', 'frame/frame-note'] } }),
    ],
  });
  assert.equal(result.failureFamily, 'HARMONY_COMPATIBILITY');
  assert.equal(result.scopeClass, 'FEATURE_REGION_SET');
  assert.equal(result.progressiveStateCandidate, 'REVIEW_REQUIRED');
  assert.equal(result.refinementRequired, true);
  assert.equal(result.evidencePrecision, 'ENGINE_FEATURE_WITH_SOURCE_OCCURRENCE_SET');
});

test('unknown generic feature stays unsupported local rather than inventing a cause', () => {
  const result = refineGenericProjectionFailure({
    errorCode: CODE,
    observedFeature: 'unknown-feature',
    details: { feature: 'unknown-feature' },
    sourceOccurrences: [],
  });
  assert.equal(result.failureFamily, 'GENERIC_PROJECTION_CAPABILITY');
  assert.equal(result.scopeClass, 'FEATURE_CLASS');
  assert.equal(result.progressiveStateCandidate, 'UNSUPPORTED_LOCAL');
  assert.equal(result.refinementRequired, true);
});

test('V2B rejects non-generic error codes', () => {
  assert.throws(
    () => refineGenericProjectionFailure({
      errorCode: 'SOME_OTHER_CODE',
      observedFeature: 'direction',
      details: {},
      sourceOccurrences: [],
    }),
    (error) => error.code === 'INVALID_V2B_PROJECTION_REFINEMENT_INPUT',
  );
});

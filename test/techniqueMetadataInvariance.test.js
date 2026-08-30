import assert from 'node:assert/strict';
import test from 'node:test';

import {
  benchmarkTechniqueMetadataInvariance,
  TechniqueMetadataInvarianceError,
} from '../src/benchmarks/techniqueMetadataInvariance.js';
import { createGuitarTechniqueProvenance } from '../src/musicxml/guitarTechniqueProvenance.js';

function technique(input) {
  return createGuitarTechniqueProvenance({
    subtype: 'lab-tech-04-fixture',
    sourceAttributes: {},
    sourceText: '',
    capabilityClass: 'SAFE_METADATA_ONLY',
    ...input,
  });
}

const SOURCE_MUSICAL_FACTS = Object.freeze([
  Object.freeze({
    logicalNoteId: 'n1-attack',
    pitch: 'E3',
    octave: 3,
    onset: 0,
    duration: 4,
    voice: '1',
    staff: 1,
    tie: 'START',
    grace: false,
    chordMembership: false,
  }),
  Object.freeze({
    logicalNoteId: 'n2',
    pitch: 'C4',
    octave: 4,
    onset: 0,
    duration: 2,
    voice: '2',
    staff: 1,
    tie: null,
    grace: false,
    chordMembership: true,
  }),
  Object.freeze({
    logicalNoteId: 'n1-hold',
    pitch: 'E3',
    octave: 3,
    onset: 4,
    duration: 2,
    voice: '1',
    staff: 1,
    tie: 'STOP',
    grace: false,
    chordMembership: false,
  }),
  Object.freeze({
    logicalNoteId: 'n3',
    pitch: 'G3',
    octave: 3,
    onset: 4,
    duration: 2,
    voice: '2',
    staff: 1,
    tie: null,
    grace: false,
    chordMembership: true,
  }),
]);

const POINTS = Object.freeze([
  Object.freeze({
    pointId: 'p0',
    measureIndex: 0,
    timeDivisions: 0,
    notes: Object.freeze([
      Object.freeze({
        logicalNoteId: 'n1-attack',
        sustainId: 's1',
        pitch: 'E3',
        disposition: 'ATTACK',
        tie: 'START',
        voice: '1',
        staff: 1,
      }),
      Object.freeze({
        logicalNoteId: 'n2',
        sustainId: 's2',
        pitch: 'C4',
        disposition: 'ATTACK',
        tie: null,
        voice: '2',
        staff: 1,
      }),
    ]),
  }),
  Object.freeze({
    pointId: 'p1',
    measureIndex: 0,
    timeDivisions: 4,
    notes: Object.freeze([
      Object.freeze({
        logicalNoteId: 'n1-hold',
        sustainId: 's1',
        pitch: 'E3',
        disposition: 'HOLD',
        tie: 'STOP',
        voice: '1',
        staff: 1,
      }),
      Object.freeze({
        logicalNoteId: 'n3',
        sustainId: 's3',
        pitch: 'G3',
        disposition: 'ATTACK',
        tie: null,
        voice: '2',
        staff: 1,
      }),
    ]),
  }),
]);

const SAFE_TECHNIQUE_SIDECAR = Object.freeze({
  'n1-attack': Object.freeze([
    technique({
      kind: 'HAMMER_ON',
      state: 'START',
      sourcePath: 'note/notations/technical/hammer-on',
      sourceAttributes: { number: '1', type: 'start' },
      sourceText: 'H',
      pairingId: 'fixture:hammer:1',
      pairingBasis: 'DETERMINISTIC_SOURCE_IDENTITY',
      sourcePairingToken: 'fixture:n1-attack->n1-hold',
      normalizedSemantics: 'HAMMER_ON',
    }),
    technique({
      kind: 'HARMONIC',
      state: 'SINGLE',
      sourcePath: 'note/notations/technical/harmonic',
      normalizedSemantics: 'HARMONIC_UNSPECIFIED',
    }),
  ]),
  n2: Object.freeze([
    technique({
      kind: 'SLIDE',
      state: 'START',
      sourcePath: 'note/notations/slide',
      sourceAttributes: { number: '5', type: 'start' },
      normalizedSemantics: 'SLIDE',
    }),
    technique({
      kind: 'MUTE',
      state: 'SINGLE',
      sourcePath: 'note/play/mute',
      sourceText: 'straight',
      normalizedSemantics: 'MUTE_STRAIGHT',
    }),
  ]),
  'n1-hold': Object.freeze([
    technique({
      kind: 'HAMMER_ON',
      state: 'STOP',
      sourcePath: 'note/notations/technical/hammer-on',
      sourceAttributes: { number: '1', type: 'stop' },
      pairingId: 'fixture:hammer:1',
      pairingBasis: 'DETERMINISTIC_SOURCE_IDENTITY',
      sourcePairingToken: 'fixture:n1-attack->n1-hold',
      normalizedSemantics: 'HAMMER_ON',
    }),
    technique({
      kind: 'HARMONIC',
      state: 'SINGLE',
      sourcePath: 'note/notations/technical/harmonic',
      normalizedSemantics: 'HARMONIC_NATURAL_BASE_PITCH',
    }),
  ]),
  n3: Object.freeze([
    technique({
      kind: 'POSITION',
      state: 'SINGLE',
      sourcePath: 'note/notations/technical/fingering',
      sourceText: '1',
      normalizedSemantics: 'POSITION_FINGERING',
    }),
    technique({
      kind: 'POSITION',
      state: 'SINGLE',
      sourcePath: 'note/notations/technical/pluck',
      sourceText: '2',
      normalizedSemantics: 'POSITION_PLUCK',
    }),
  ]),
});

function runBenchmark(sidecar = SAFE_TECHNIQUE_SIDECAR) {
  return benchmarkTechniqueMetadataInvariance({
    caseId: 'gp760-safe-metadata-mixed-polyphony',
    sourceMusicalFacts: SOURCE_MUSICAL_FACTS,
    points: POINTS,
    techniqueProvenanceByLogicalNoteId: sidecar,
    determinismRuns: 2,
  });
}

function expectCode(code, fn) {
  assert.throws(fn, (error) => (
    error instanceof TechniqueMetadataInvarianceError
    && error.code === code
  ));
}

test('SAFE_METADATA_ONLY provenance leaves source facts, candidates, ranking and sustained physical result unchanged', () => {
  const sourceBefore = structuredClone(SOURCE_MUSICAL_FACTS);
  const pointsBefore = structuredClone(POINTS);
  const result = runBenchmark();

  assert.equal(result.status, 'PASS');
  assert.equal(result.stage, 'LAB-TECH-04');
  assert.equal(result.determinismRuns, 2);
  assert.equal(result.techniqueRecordCount, 8);
  assert.deepEqual(result.invariants, {
    sourceMusicalFactsUnchanged: true,
    solverInputUnchanged: true,
    candidateSetUnchanged: true,
    assignmentRankingUnchanged: true,
    physicalResultUnchanged: true,
    deterministic: true,
  });
  assert.equal(result.hashes.baselineRunSha256, result.hashes.metadataRunSha256);
  assert.deepEqual(SOURCE_MUSICAL_FACTS, sourceBefore);
  assert.deepEqual(POINTS, pointsBefore);
});

test('metadata invariance benchmark itself is deterministic across repeated invocations', () => {
  const first = runBenchmark();
  const second = runBenchmark();
  assert.deepEqual(first, second);
});

test('empty sidecar produces the same candidate, ranking and physical hashes', () => {
  const safe = runBenchmark();
  const empty = runBenchmark(Object.freeze({}));
  assert.equal(safe.hashes.candidatesSha256, empty.hashes.candidatesSha256);
  assert.equal(safe.hashes.rankingSha256, empty.hashes.rankingSha256);
  assert.equal(safe.hashes.physicalResultSha256, empty.hashes.physicalResultSha256);
  assert.equal(safe.hashes.solverInputSha256, empty.hashes.solverInputSha256);
});

test('blocked or ambiguous technique provenance cannot enter metadata-only benchmark', () => {
  const blocked = createGuitarTechniqueProvenance({
    kind: 'HARMONIC',
    subtype: 'artificial-pitch-role-chord',
    state: 'UNKNOWN',
    sourcePath: 'note/notations/technical/harmonic',
    sourceAttributes: {},
    sourceText: '',
    normalizedSemantics: 'UNKNOWN',
    capabilityClass: 'BLOCKED_UNKNOWN_OR_AMBIGUOUS',
  });
  expectCode('NON_METADATA_TECHNIQUE_FORBIDDEN', () => runBenchmark(Object.freeze({
    n2: Object.freeze([blocked]),
  })));
});

test('forged provenance cannot smuggle source pitch or solver authority into the sidecar', () => {
  const forged = Object.freeze({
    documentType: 'GuitarTechniqueProvenance',
    contractVersion: '1.0.0',
    kind: 'SLIDE',
    subtype: 'forged',
    state: 'SINGLE',
    sourcePath: 'note/notations/slide',
    sourceAttributes: Object.freeze({}),
    sourceText: '',
    pairingId: null,
    pairingBasis: null,
    sourcePairingToken: null,
    normalizedSemantics: 'SLIDE',
    capabilityClass: 'SAFE_METADATA_ONLY',
    pitch: 'F#5',
  });
  expectCode('MUSICAL_FACT_AUTHORITY_FORBIDDEN', () => runBenchmark(Object.freeze({
    n2: Object.freeze([forged]),
  })));
});

test('technique sidecar cannot reference an unknown note identity', () => {
  expectCode('UNKNOWN_TECHNIQUE_NOTE_ID', () => runBenchmark(Object.freeze({
    missing: Object.freeze([
      technique({
        kind: 'MUTE',
        state: 'SINGLE',
        sourcePath: 'note/play/mute',
        sourceText: 'straight',
        normalizedSemantics: 'MUTE_STRAIGHT',
      }),
    ]),
  })));
});

test('benchmark requires the mandated two determinism runs', () => {
  expectCode('INVALID_DETERMINISM_RUN_COUNT', () => benchmarkTechniqueMetadataInvariance({
    caseId: 'invalid-run-count',
    sourceMusicalFacts: SOURCE_MUSICAL_FACTS,
    points: POINTS,
    techniqueProvenanceByLogicalNoteId: SAFE_TECHNIQUE_SIDECAR,
    determinismRuns: 1,
  }));
});

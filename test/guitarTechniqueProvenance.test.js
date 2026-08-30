import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertDeterministicTechniquePair,
  createGuitarTechniqueProvenance,
  GuitarTechniqueProvenanceError,
  guitarTechniqueProvenanceContract,
} from '../src/musicxml/guitarTechniqueProvenance.js';

function expectCode(code, fn) {
  assert.throws(fn, (error) => (
    error instanceof GuitarTechniqueProvenanceError
    && error.code === code
  ));
}

test('creates metadata-only provenance while preserving source form separately', () => {
  const sourceAttributes = { placement: 'above', number: '1' };
  const provenance = createGuitarTechniqueProvenance({
    kind: 'HARMONIC',
    subtype: 'guitar-pro-unspecified-harmonic-marker',
    state: 'SINGLE',
    sourcePath: 'note/notations/technical/harmonic',
    sourceAttributes,
    sourceText: '',
    normalizedSemantics: 'HARMONIC_UNSPECIFIED',
    capabilityClass: 'SAFE_METADATA_ONLY',
  });

  sourceAttributes.number = '99';
  assert.equal(provenance.documentType, 'GuitarTechniqueProvenance');
  assert.deepEqual(provenance.sourceAttributes, { number: '1', placement: 'above' });
  assert.equal(provenance.normalizedSemantics, 'HARMONIC_UNSPECIFIED');
  assert.equal(provenance.capabilityClass, 'SAFE_METADATA_ONLY');
  assert.equal(provenance.pairingId, null);
  assert.ok(Object.isFrozen(provenance));
  assert.ok(Object.isFrozen(provenance.sourceAttributes));
});

test('blocked ambiguous provenance cannot claim normalized semantics', () => {
  expectCode('BLOCKED_SEMANTICS_MUST_BE_UNKNOWN', () => createGuitarTechniqueProvenance({
    kind: 'HAMMER_ON',
    subtype: 'producer-observed-unresolved-shape',
    state: 'UNKNOWN',
    sourcePath: 'note/notations/technical/hammer-on',
    normalizedSemantics: 'HAMMER_ON',
    capabilityClass: 'BLOCKED_UNKNOWN_OR_AMBIGUOUS',
  }));

  const blocked = createGuitarTechniqueProvenance({
    kind: 'HAMMER_ON',
    subtype: 'producer-observed-unresolved-shape',
    state: 'UNKNOWN',
    sourcePath: 'note/notations/technical/hammer-on',
    normalizedSemantics: 'UNKNOWN',
    capabilityClass: 'BLOCKED_UNKNOWN_OR_AMBIGUOUS',
  });
  assert.equal(blocked.normalizedSemantics, 'UNKNOWN');
});

test('LAB-TECH-02 refuses physical solver authority and musical fact fields', () => {
  expectCode('LAB_PHYSICAL_SEMANTICS_FORBIDDEN', () => createGuitarTechniqueProvenance({
    kind: 'MUTE',
    subtype: 'straight-mute',
    state: 'SINGLE',
    sourcePath: 'note/play/mute',
    sourceText: 'straight',
    normalizedSemantics: 'MUTE_STRAIGHT',
    capabilityClass: 'PHYSICAL_SEMANTICS_SUPPORTED',
  }));

  for (const field of ['pitch', 'octave', 'onset', 'duration', 'voice', 'staff', 'tie', 'grace', 'chordMembership', 'candidate', 'ranking', 'solverState']) {
    expectCode('MUSICAL_FACT_AUTHORITY_FORBIDDEN', () => createGuitarTechniqueProvenance({
      kind: 'MUTE',
      subtype: 'straight-mute',
      state: 'SINGLE',
      sourcePath: 'note/play/mute',
      sourceText: 'straight',
      normalizedSemantics: 'MUTE_STRAIGHT',
      capabilityClass: 'SAFE_METADATA_ONLY',
      [field]: 'forbidden',
    }));
  }
  assert.equal(guitarTechniqueProvenanceContract.physicalSemanticsEnabled, false);
});

test('single and unknown provenance cannot carry invented pairing identity', () => {
  expectCode('PAIRING_NOT_ALLOWED_FOR_STATE', () => createGuitarTechniqueProvenance({
    kind: 'HARMONIC',
    subtype: 'marker',
    state: 'SINGLE',
    sourcePath: 'note/notations/technical/harmonic',
    normalizedSemantics: 'HARMONIC_UNSPECIFIED',
    capabilityClass: 'SAFE_METADATA_ONLY',
    pairingId: 'pair-1',
    pairingBasis: 'DETERMINISTIC_SOURCE_IDENTITY',
    sourcePairingToken: 'source:1',
  }));
});

test('start-stop pairing requires matching deterministic source identity', () => {
  const base = {
    kind: 'SLIDE',
    subtype: 'standard-slide',
    sourcePath: 'note/notations/slide',
    sourceAttributes: { number: '2', type: 'start' },
    normalizedSemantics: 'SLIDE',
    capabilityClass: 'SAFE_METADATA_ONLY',
    pairingId: 'slide:2',
    pairingBasis: 'DETERMINISTIC_SOURCE_IDENTITY',
    sourcePairingToken: 'number:2',
  };
  const start = createGuitarTechniqueProvenance({ ...base, state: 'START' });
  const stop = createGuitarTechniqueProvenance({
    ...base,
    state: 'STOP',
    sourceAttributes: { number: '2', type: 'stop' },
  });

  const pair = assertDeterministicTechniquePair(start, stop);
  assert.equal(pair.pairingId, 'slide:2');
  assert.equal(pair.start, start);
  assert.equal(pair.stop, stop);

  const conflictingStop = createGuitarTechniqueProvenance({
    ...base,
    state: 'STOP',
    pairingId: 'slide:3',
    sourcePairingToken: 'number:3',
    sourceAttributes: { number: '3', type: 'stop' },
  });
  expectCode('CONFLICTING_TECHNIQUE_PAIR', () => assertDeterministicTechniquePair(start, conflictingStop));
});

test('pairing basis and source bounds fail closed', () => {
  expectCode('NON_DETERMINISTIC_PAIRING_FORBIDDEN', () => createGuitarTechniqueProvenance({
    kind: 'SLIDE',
    subtype: 'standard-slide',
    state: 'START',
    sourcePath: 'note/notations/slide',
    normalizedSemantics: 'SLIDE',
    capabilityClass: 'SAFE_METADATA_ONLY',
    pairingId: 'slide:1',
    pairingBasis: 'GUESSED_BY_ORDER',
    sourcePairingToken: 'number:1',
  }));

  expectCode('SOURCE_ATTRIBUTES_LIMIT_EXCEEDED', () => createGuitarTechniqueProvenance({
    kind: 'OTHER',
    subtype: 'bounded-test',
    state: 'UNKNOWN',
    sourcePath: 'note/notations/technical/other',
    normalizedSemantics: 'UNKNOWN',
    capabilityClass: 'BLOCKED_UNKNOWN_OR_AMBIGUOUS',
    sourceAttributes: Object.fromEntries(Array.from({ length: 17 }, (_, index) => [`a${index}`, 'x'])),
  }));
});

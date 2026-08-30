import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  assertDeterministicTechniquePair,
  createGuitarTechniqueProvenance,
} from '../src/musicxml/guitarTechniqueProvenance.js';

const matrixUrl = new URL('../fixtures/techniques/lab-tech-03-cases.json', import.meta.url);

async function matrix() {
  return JSON.parse(await readFile(matrixUrl, 'utf8'));
}

function byId(document, id) {
  return document.cases.find((entry) => entry.id === id);
}

test('LAB-TECH-03 covers observed and negative technique classes without physical authority', async () => {
  const document = await matrix();
  assert.equal(document.stage, 'LAB-TECH-03');
  assert.equal(document.policy.realCorpusCommitted, false);
  assert.equal(document.policy.physicalSemanticsEnabled, false);
  assert.equal(document.policy.pairingIsNeverInferredFromTechniqueNumberAlone, true);

  const covered = new Set(document.cases.map((entry) => entry.technique));
  for (const technique of [
    'hammer-on',
    'slide',
    'natural-harmonic',
    'artificial-harmonic',
    'straight-mute',
    'let-ring',
    'position',
    'pull-off',
    'bend',
    'palm-mute/tap',
  ]) {
    assert.ok(covered.has(technique), `missing fixture family: ${technique}`);
  }

  assert.equal(
    document.cases.some((entry) => JSON.stringify(entry).includes('PHYSICAL_SEMANTICS_SUPPORTED')),
    false,
  );
});

test('simple Guitar Pro hammer-on pair can preserve exact source form with event-identity pairing', async () => {
  const document = await matrix();
  const fixture = byId(document, 'hammer-on-simple-pair-gp760');
  assert.equal(fixture.sourceEvidence.evidenceStatus, 'EXACT_SOURCE_REAUDIT');
  assert.equal(fixture.verification.destinationPitchInference, 'FORBIDDEN');

  const start = createGuitarTechniqueProvenance({
    kind: 'HAMMER_ON',
    subtype: 'guitar-pro-7.6.0-hammer-on',
    state: 'START',
    sourcePath: fixture.sourceShape.path,
    sourceAttributes: { number: '1', type: 'start' },
    sourceText: 'H',
    pairingId: 'air-bird:v1:s1:hammer:pair-1',
    pairingBasis: 'DETERMINISTIC_SOURCE_IDENTITY',
    sourcePairingToken: 'air-bird:v1:s1:event-start-1->event-stop-2',
    normalizedSemantics: 'HAMMER_ON',
    capabilityClass: 'SAFE_METADATA_ONLY',
  });
  const stop = createGuitarTechniqueProvenance({
    kind: 'HAMMER_ON',
    subtype: 'guitar-pro-7.6.0-hammer-on',
    state: 'STOP',
    sourcePath: fixture.sourceShape.path,
    sourceAttributes: { number: '1', type: 'stop' },
    sourceText: '',
    pairingId: 'air-bird:v1:s1:hammer:pair-1',
    pairingBasis: 'DETERMINISTIC_SOURCE_IDENTITY',
    sourcePairingToken: 'air-bird:v1:s1:event-start-1->event-stop-2',
    normalizedSemantics: 'HAMMER_ON',
    capabilityClass: 'SAFE_METADATA_ONLY',
  });

  const pair = assertDeterministicTechniquePair(start, stop);
  assert.equal(pair.kind, 'HAMMER_ON');
  assert.equal(pair.start.sourceText, 'H');
  assert.equal(pair.stop.sourceText, '');
});

test('reused hammer-on number in a Guitar Pro chain is explicitly not a unique pairing identity', async () => {
  const document = await matrix();
  const fixture = byId(document, 'hammer-on-chain-reused-number-gp760');
  assert.equal(fixture.verification.numberAloneIsUniquePairingId, false);
  assert.equal(fixture.verification.automaticPairing, 'BLOCKED_UNKNOWN_OR_AMBIGUOUS');
  assert.match(fixture.sourceShape.sequence[1], /type=\\"start\\"/);
  assert.match(fixture.sourceShape.sequence[1], /type=\\"stop\\"/);

  const middleStart = createGuitarTechniqueProvenance({
    kind: 'HAMMER_ON',
    subtype: 'guitar-pro-7.6.0-hammer-on',
    state: 'START',
    sourcePath: 'note/notations/technical/hammer-on',
    sourceAttributes: { number: '1', type: 'start' },
    sourceText: 'H',
    normalizedSemantics: 'HAMMER_ON',
    capabilityClass: 'SAFE_METADATA_ONLY',
  });
  const middleStop = createGuitarTechniqueProvenance({
    kind: 'HAMMER_ON',
    subtype: 'guitar-pro-7.6.0-hammer-on',
    state: 'STOP',
    sourcePath: 'note/notations/technical/hammer-on',
    sourceAttributes: { number: '1', type: 'stop' },
    sourceText: '',
    normalizedSemantics: 'HAMMER_ON',
    capabilityClass: 'SAFE_METADATA_ONLY',
  });

  assert.equal(middleStart.pairingId, null);
  assert.equal(middleStop.pairingId, null);
  assert.throws(() => assertDeterministicTechniquePair(middleStart, middleStop), /deterministic source pairing/i);
});

test('slide provenance preserves source evidence without inventing same-string physics', async () => {
  const document = await matrix();
  const withPosition = byId(document, 'slide-same-string-evidence-gp760');
  const withoutPosition = byId(document, 'slide-without-string-evidence-gp760');
  assert.equal(withPosition.verification.sameStringEvidence, 'PRESENT_IN_SOURCE');
  assert.equal(withoutPosition.verification.sameStringEvidence, 'ABSENT');
  assert.equal(withPosition.verification.sameStringRequirementInference, 'FORBIDDEN');
  assert.equal(withoutPosition.verification.sameStringRequirementInference, 'FORBIDDEN');

  const provenance = createGuitarTechniqueProvenance({
    kind: 'SLIDE',
    subtype: 'guitar-pro-7.6.0-slide',
    state: 'START',
    sourcePath: 'note/notations/slide',
    sourceAttributes: { number: '5', type: 'start' },
    sourceText: '',
    normalizedSemantics: 'SLIDE',
    capabilityClass: 'SAFE_METADATA_ONLY',
  });
  assert.equal(provenance.pairingId, null);
});

test('natural harmonic source role is metadata-only while artificial pitch-role chord stays blocked for projection', async () => {
  const document = await matrix();
  const natural = byId(document, 'natural-harmonic-base-pitch-gp760');
  const artificial = byId(document, 'artificial-harmonic-pitch-role-chord-gp760');
  assert.equal(natural.verification.individualProvenance, 'SAFE_METADATA_ONLY');
  assert.equal(natural.verification.soundingPitchInference, 'FORBIDDEN');
  assert.equal(artificial.sourceShape.chordContext, true);
  assert.equal(artificial.verification.projectionCapability, 'BLOCKED_UNKNOWN_OR_AMBIGUOUS');

  const provenance = createGuitarTechniqueProvenance({
    kind: 'HARMONIC',
    subtype: 'natural-base-pitch',
    state: 'SINGLE',
    sourcePath: 'note/notations/technical/harmonic',
    sourceAttributes: {},
    sourceText: '',
    normalizedSemantics: 'HARMONIC_NATURAL_BASE_PITCH',
    capabilityClass: 'SAFE_METADATA_ONLY',
  });
  assert.equal(provenance.capabilityClass, 'SAFE_METADATA_ONLY');
});

test('straight mute is per-note metadata; GP7 let-ring marker remains scope-ambiguous', async () => {
  const document = await matrix();
  const mute = byId(document, 'straight-mute-note-play-gp760');
  const letRing = byId(document, 'gp7-let-ring-processing-instruction');
  assert.equal(mute.verification.individualProvenance, 'SAFE_METADATA_ONLY');
  assert.equal(mute.verification.scopeInference, 'FORBIDDEN');
  assert.equal(letRing.verification.capabilityClass, 'BLOCKED_UNKNOWN_OR_AMBIGUOUS');
  assert.equal(letRing.verification.normalizedScopeSemantics, 'UNKNOWN');
});

test('position evidence remains provenance and never solver target authority', async () => {
  const document = await matrix();
  const position = byId(document, 'position-fingering-pluck-gp760');
  assert.deepEqual(position.sourceShape.observedChildren, ['string', 'fret', 'fingering', 'pluck']);
  assert.equal(position.verification.solverTargetAuthority, 'FORBIDDEN');
  assert.equal(position.verification.conflictWithPitchOrConfiguration, 'FAIL_CLOSED_REQUIRED');
});

test('producer-unevidenced and malformed cases remain blocked', async () => {
  const document = await matrix();
  for (const id of [
    'pull-off-no-producer-evidence',
    'bend-no-producer-evidence',
    'palm-mute-tap-no-producer-evidence',
    'negative-hammer-missing-stop',
    'negative-hammer-conflicting-number',
    'negative-slide-missing-endpoint',
    'negative-bend-malformed-or-duplicate',
  ]) {
    const fixture = byId(document, id);
    assert.match(JSON.stringify(fixture.verification), /BLOCKED_UNKNOWN_OR_AMBIGUOUS/);
  }
});

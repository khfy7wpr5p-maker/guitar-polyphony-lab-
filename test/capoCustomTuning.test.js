import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  DROP_D_GUITAR_CONFIGURATION,
  GUITAR_FRET_SEMANTICS,
  GUITAR_MAX_ABSOLUTE_FRET,
  GuitarConfigurationError,
  STANDARD_GUITAR_CONFIGURATION,
  createGuitarConfiguration,
  guitarConfigurationToGuitarFacts,
  guitarConfigurationToWorkbenchRequest,
  resolveGuitarConfiguration,
  withCapo,
} from '../src/guitar/tuningConfiguration.js';
import {
  attachFretboardCandidates,
  generateFretboardCandidates,
  positionToMidi,
  spelledPitchToMidi,
} from '../src/guitar/fretboardCandidates.js';
import { enumerateSonorityAssignments } from '../src/guitar/sonorityAssignments.js';
import { verifySustainedPolyphonyWithConfiguration } from '../src/guitar/sustainedConfigurationVerifier.js';
import { verifyGraceTransitionWithConfiguration } from '../src/guitar/graceConfigurationVerifier.js';
import { resolveGuitarConfigurationAuthority } from '../src/guitar/configurationAuthority.js';
import {
  parseStaffConfigurationFragment,
  parseTechnicalPositionFragment,
  serializeStaffConfiguration,
  serializeTechnicalPosition,
} from '../src/musicxml/guitarConfigurationSerializer.js';
import { inspectMusicXmlGuitarConfigurationProvenance } from '../src/musicxml/guitarConfigurationProvenance.js';
import { parseMusicXmlPartwise } from '../src/musicxml/partwiseParser.js';
import { buildMeasureTimeline } from '../src/polyphony/measureTimeline.js';

const CUSTOM_CONFIGURATION = createGuitarConfiguration({
  tuning: [
    { string: 1, pitch: 'D4' },
    { string: 2, pitch: 'A3' },
    { string: 3, pitch: 'F3' },
    { string: 4, pitch: 'C3' },
    { string: 5, pitch: 'G2' },
    { string: 6, pitch: 'C2' },
  ],
  capoFret: 0,
});

const STANDARD_CAPO_2 = withCapo(STANDARD_GUITAR_CONFIGURATION, 2);
const DROP_D_CAPO_2 = withCapo(DROP_D_GUITAR_CONFIGURATION, 2);
const CUSTOM_CAPO_2 = withCapo(CUSTOM_CONFIGURATION, 2);

function makeAttackPoint(pitches, pointId = 'p0') {
  return {
    pointId,
    measureIndex: 0,
    timeDivisions: 0,
    notes: pitches.map((pitch, index) => ({
      logicalNoteId: `${pointId}:n${index}`,
      sustainId: `${pointId}:s${index}`,
      pitch,
      disposition: 'ATTACK',
      tie: null,
      voice: String(index + 1),
      staff: 1,
    })),
  };
}

function signatures(result) {
  if (result.status !== 'PASS') return [];
  return result.points.at(-1).selectedPositions.map(
    (entry) => `${entry.pitch}@${entry.string}:${entry.fret}`,
  );
}

function benchmarkFinalSonority(fileName, configuration) {
  const xml = readFileSync(new URL(`../fixtures/compat/${fileName}`, import.meta.url), 'utf8');
  const parsed = parseMusicXmlPartwise(xml);
  let finalSonority = null;
  for (const measure of parsed.parts[0].measures) {
    const timeline = buildMeasureTimeline(measure.events);
    if (timeline.sonoritySpans.length > 0) finalSonority = timeline.sonoritySpans.at(-1);
  }
  assert.ok(finalSonority);
  const attached = attachFretboardCandidates(finalSonority.activeNotes, configuration);
  const assignments = enumerateSonorityAssignments(attached);
  return {
    candidateCount: attached.reduce((sum, note) => sum + note.fretboardCandidates.length, 0),
    playable: assignments.length > 0,
    solverStatus: assignments.length > 0 ? 'PASS' : 'BLOCKED',
    selectedPositions: assignments.length > 0
      ? assignments[0].map((entry) => `${entry.pitch}@${entry.string}:${entry.fret}`)
      : [],
  };
}

test('GuitarConfiguration is immutable, capo-aware and preserves non-capo tuning facts', () => {
  assert.equal(STANDARD_GUITAR_CONFIGURATION.documentType, 'GuitarConfiguration');
  assert.equal(STANDARD_GUITAR_CONFIGURATION.stringCount, 6);
  assert.equal(STANDARD_GUITAR_CONFIGURATION.capoFret, 0);
  assert.equal(STANDARD_GUITAR_CONFIGURATION.fretSemantics, GUITAR_FRET_SEMANTICS);
  assert.equal(STANDARD_CAPO_2.capoFret, 2);
  assert.equal(STANDARD_CAPO_2.tuning[5].pitch, 'E2');
  assert.equal(STANDARD_CAPO_2.tuning[5].midi, 40);
  assert.equal(STANDARD_CAPO_2.tuning, STANDARD_CAPO_2.strings);
  assert.ok(Object.isFrozen(STANDARD_CAPO_2));
  assert.ok(Object.isFrozen(STANDARD_CAPO_2.tuning));
  assert.ok(STANDARD_CAPO_2.tuning.every(Object.isFrozen));

  const facts = guitarConfigurationToGuitarFacts(STANDARD_CAPO_2);
  assert.equal(facts.capoFret, 2);
  assert.equal(facts.fretSemantics, 'RELATIVE_FROM_CAPO');
  assert.equal(facts.tuning[5].midi, 40);
  assert.equal(facts.tuning[5].soundingOpenMidi, 42);
});

test('capo validation fails closed for negative, fractional, out-of-bounds and hostile values', () => {
  assert.throws(
    () => createGuitarConfiguration({ capoFret: -1 }),
    (error) => error instanceof GuitarConfigurationError && error.code === 'INVALID_CAPO_FRET',
  );
  assert.throws(
    () => createGuitarConfiguration({ capoFret: 1.5 }),
    (error) => error instanceof GuitarConfigurationError && error.code === 'INVALID_CAPO_FRET',
  );
  assert.throws(
    () => createGuitarConfiguration({ capoFret: GUITAR_MAX_ABSOLUTE_FRET + 1 }),
    (error) => error instanceof GuitarConfigurationError && error.code === 'CAPO_OUT_OF_BOUNDS',
  );

  let getterRead = false;
  const hostile = {};
  Object.defineProperty(hostile, 'capoFret', {
    enumerable: true,
    get() {
      getterRead = true;
      return 2;
    },
  });
  assert.throws(
    () => createGuitarConfiguration(hostile),
    (error) => error instanceof GuitarConfigurationError
      && error.code === 'HOSTILE_GUITAR_CONFIGURATION_INPUT',
  );
  assert.equal(getterRead, false);
  assert.throws(
    () => createGuitarConfiguration(new Proxy({ capoFret: 2 }, {})),
    (error) => error instanceof GuitarConfigurationError
      && error.code === 'HOSTILE_GUITAR_CONFIGURATION_INPUT',
  );
  assert.throws(
    () => createGuitarConfiguration({ capoFret: 2, fretSemantics: 'ABSOLUTE' }),
    (error) => error instanceof GuitarConfigurationError
      && error.code === 'INVALID_GUITAR_CONFIGURATION_FIELD',
  );
});

test('Workbench request carries only requested tuning pitches and capo while browser remains non-authoritative', () => {
  assert.deepEqual(guitarConfigurationToWorkbenchRequest(DROP_D_CAPO_2), {
    guitar: {
      capoFret: 2,
      tuning: [
        { string: 1, pitch: 'E4' },
        { string: 2, pitch: 'B3' },
        { string: 3, pitch: 'G3' },
        { string: 4, pitch: 'D3' },
        { string: 5, pitch: 'A2' },
        { string: 6, pitch: 'D2' },
      ],
    },
  });
});

test('position round-trip is exact for standard, Drop D and custom tuning with and without capo', () => {
  const cases = [
    [STANDARD_GUITAR_CONFIGURATION, 'E3'],
    [STANDARD_CAPO_2, 'E3'],
    [DROP_D_GUITAR_CONFIGURATION, 'E2'],
    [DROP_D_CAPO_2, 'E2'],
    [CUSTOM_CONFIGURATION, 'C2'],
    [CUSTOM_CAPO_2, 'D2'],
  ];
  for (const [configuration, pitch] of cases) {
    const candidates = generateFretboardCandidates(pitch, configuration);
    assert.ok(candidates.length > 0, `${pitch} must be playable`);
    for (const candidate of candidates) {
      assert.equal(positionToMidi(candidate, configuration), spelledPitchToMidi(pitch));
      assert.equal(candidate.fretSemantics, 'RELATIVE_FROM_CAPO');
      assert.equal(candidate.absoluteFret, configuration.capoFret + candidate.fret);
    }
  }
});

test('standard capo 0 remains exact backward-compatible physical behavior', () => {
  assert.deepEqual(
    generateFretboardCandidates('A2').map(({ string, fret }) => ({ string, fret })),
    [
      { string: 5, fret: 0 },
      { string: 6, fret: 5 },
    ],
  );
  const implicit = verifySustainedPolyphonyWithConfiguration(
    [makeAttackPoint(['E2', 'A2', 'D3', 'G3'], 'implicit')],
    STANDARD_GUITAR_CONFIGURATION,
  );
  assert.equal(implicit.status, 'PASS');
  assert.deepEqual(signatures(implicit), ['E2@6:0', 'A2@5:0', 'D3@4:0', 'G3@3:0']);
});

test('standard capo 2 solves deterministic one-, two-, three- and four-voice open-relative sonorities', () => {
  const pitches = ['F#2', 'B2', 'E3', 'A3'];
  for (let voiceCount = 1; voiceCount <= 4; voiceCount += 1) {
    const result = verifySustainedPolyphonyWithConfiguration(
      [makeAttackPoint(pitches.slice(0, voiceCount), `standard-capo2-v${voiceCount}`)],
      STANDARD_CAPO_2,
    );
    assert.equal(result.status, 'PASS');
    assert.deepEqual(
      result.points[0].selectedPositions.map(({ string, fret }) => ({ string, fret })),
      Array.from({ length: voiceCount }, (_, index) => ({ string: 6 - index, fret: 0 })),
    );
  }
});

test('Drop D works without capo and with capo under the same configuration-aware POLY verifier', () => {
  const noCapo = verifySustainedPolyphonyWithConfiguration(
    [makeAttackPoint(['D2', 'A2'], 'dropd')],
    DROP_D_GUITAR_CONFIGURATION,
  );
  assert.equal(noCapo.status, 'PASS');
  assert.deepEqual(signatures(noCapo), ['D2@6:0', 'A2@5:0']);

  const capo = verifySustainedPolyphonyWithConfiguration(
    [makeAttackPoint(['E2', 'B2', 'E3', 'A3'], 'dropd-capo2')],
    DROP_D_CAPO_2,
  );
  assert.equal(capo.status, 'PASS');
  assert.deepEqual(signatures(capo), ['E2@6:0', 'B2@5:0', 'E3@4:0', 'A3@3:0']);
});

test('fully custom tuning plus capo is a native single GuitarConfiguration and solves bounded polyphony', () => {
  const result = verifySustainedPolyphonyWithConfiguration(
    [makeAttackPoint(['D2', 'A2', 'D3', 'G3'], 'custom-capo2')],
    CUSTOM_CAPO_2,
  );
  assert.equal(result.status, 'PASS');
  assert.equal(result.guitar.capoFret, 2);
  assert.deepEqual(signatures(result), ['D2@6:0', 'A2@5:0', 'D3@4:0', 'G3@3:0']);
});

test('capo-raised minimum pitch fails closed instead of transposing or octave-shifting source pitch', () => {
  assert.deepEqual(generateFretboardCandidates('E2', STANDARD_CAPO_2), []);
  const points = [makeAttackPoint(['E2'], 'unplayable')];
  const before = structuredClone(points);
  const result = verifySustainedPolyphonyWithConfiguration(points, STANDARD_CAPO_2);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'NO_EXACT_FRETBOARD_CANDIDATE');
  assert.deepEqual(points, before);
  assert.equal(points[0].notes[0].pitch, 'E2');
});

test('custom tuning plus capo preserves tie/HOLD occupancy and simultaneous attack positions', () => {
  const points = [
    {
      pointId: 'm0:p0', measureIndex: 0, timeDivisions: 0,
      notes: [{
        logicalNoteId: 'tie-1', sustainId: 'bass', pitch: 'E2', disposition: 'ATTACK',
        tie: 'START', voice: '1', staff: 1,
      }],
    },
    {
      pointId: 'm0:p1', measureIndex: 0, timeDivisions: 4,
      notes: [
        {
          logicalNoteId: 'tie-1', sustainId: 'bass', pitch: 'E2', disposition: 'HOLD',
          tie: 'CONTINUE', voice: '1', staff: 1,
        },
        {
          logicalNoteId: 'upper', sustainId: 'upper', pitch: 'A2', disposition: 'ATTACK',
          tie: null, voice: '2', staff: 1,
        },
      ],
    },
    {
      pointId: 'm1:p0', measureIndex: 1, timeDivisions: 0,
      notes: [{
        logicalNoteId: 'tie-2', sustainId: 'bass', pitch: 'E2', disposition: 'HOLD',
        tie: 'STOP', voice: '1', staff: 1,
      }],
    },
  ];
  const before = structuredClone(points);
  const result = verifySustainedPolyphonyWithConfiguration(points, CUSTOM_CAPO_2);
  assert.equal(result.status, 'PASS');
  assert.deepEqual(points, before);
  for (const point of result.points) {
    const bass = point.selectedPositions.find((entry) => entry.sustainId === 'bass');
    assert.equal(bass.string, 6);
    assert.equal(bass.fret, 2);
    assert.equal(bass.pitch, 'E2');
  }
});

test('grace physical transition uses the same custom tuning plus capo configuration and respects held strings', () => {
  const request = {
    anchorPitch: 'D3',
    anchorPosition: { string: 4, fret: 0 },
    heldPositions: [{ string: 6, fret: 2, pitch: 'E2' }],
    notes: [{ graceEventId: 'g1', pitch: 'A2' }],
  };
  const before = structuredClone(request);
  const result = verifyGraceTransitionWithConfiguration(request, CUSTOM_CAPO_2);
  assert.deepEqual(request, before);
  assert.equal(result.status, 'PASS');
  assert.equal(result.guitar.capoFret, 2);
  assert.deepEqual(result.reservedHeldStrings, [6]);
  assert.deepEqual(result.notes, [{ graceEventId: 'g1', pitch: 'A2', string: 5, fret: 0 }]);
});

test('configuration authority blocks user/source conflicts and otherwise follows explicit source then default', () => {
  const conflict = resolveGuitarConfigurationAuthority({
    userConfiguration: DROP_D_CAPO_2,
    sourceConfiguration: STANDARD_CAPO_2,
  });
  assert.equal(conflict.status, 'CONFLICT');
  assert.equal(conflict.configuration, null);
  assert.equal(conflict.conflict.code, 'USER_SOURCE_GUITAR_CONFIGURATION_CONFLICT');

  const sourceOnly = resolveGuitarConfigurationAuthority({ sourceConfiguration: DROP_D_CAPO_2 });
  assert.equal(sourceOnly.status, 'RESOLVED');
  assert.equal(sourceOnly.authority, 'MUSICXML_EXPLICIT');
  assert.equal(sourceOnly.configuration.capoFret, 2);

  const fallback = resolveGuitarConfigurationAuthority({});
  assert.equal(fallback.authority, 'STANDARD_DEFAULT');
  assert.equal(fallback.configuration.capoFret, 0);
});

test('MusicXML target staff-tuning plus capo and technical string/fret round-trip deterministically', () => {
  for (const configuration of [
    STANDARD_GUITAR_CONFIGURATION,
    STANDARD_CAPO_2,
    DROP_D_GUITAR_CONFIGURATION,
    DROP_D_CAPO_2,
    CUSTOM_CONFIGURATION,
    CUSTOM_CAPO_2,
  ]) {
    const xml = serializeStaffConfiguration(configuration);
    const reparsed = parseStaffConfigurationFragment(xml);
    assert.deepEqual(
      guitarConfigurationToGuitarFacts(reparsed),
      guitarConfigurationToGuitarFacts(configuration),
    );
  }

  const technical = serializeTechnicalPosition({ string: 6, fret: 0 }, DROP_D_CAPO_2, 'E2');
  assert.equal(technical, '<technical><string>6</string><fret>0</fret></technical>');
  assert.deepEqual(parseTechnicalPositionFragment(technical, DROP_D_CAPO_2, 'E2'), {
    string: 6,
    fret: 0,
    fretSemantics: 'RELATIVE_FROM_CAPO',
    absoluteFret: 2,
    midi: 40,
  });
});

test('MusicXML provenance treats staff-tuning/capo as configuration evidence but technical fingering as non-authoritative', () => {
  const staff = serializeStaffConfiguration(DROP_D_CAPO_2);
  const xml = `<score-partwise><part><measure><attributes>${staff}</attributes><note><notations><technical><string>6</string><fret>0</fret></technical></notations></note></measure></part></score-partwise>`;
  const evidence = inspectMusicXmlGuitarConfigurationProvenance(xml);
  assert.equal(evidence.status, 'SAFE_EXPLICIT');
  assert.equal(evidence.configuration.preset, 'DROP_D');
  assert.equal(evidence.configuration.capoFret, 2);
  assert.equal(evidence.technicalPositionEvidenceCount, 1);
  assert.equal(evidence.technicalPositionAuthority, 'NON_AUTHORITATIVE_SOURCE_FINGERING');
});

test('capo benchmark snapshot matches the existing research corpus across six configurations', () => {
  const snapshot = JSON.parse(readFileSync(
    new URL('../fixtures/tuning/capo-benchmark-snapshot.json', import.meta.url),
    'utf8',
  ));
  assert.equal(snapshot.fretSemantics, 'RELATIVE_FROM_CAPO');
  const configurations = {
    'standard-capo-0': STANDARD_GUITAR_CONFIGURATION,
    'standard-capo-2': STANDARD_CAPO_2,
    'drop-d-capo-0': DROP_D_GUITAR_CONFIGURATION,
    'drop-d-capo-2': DROP_D_CAPO_2,
    'custom-capo-0': CUSTOM_CONFIGURATION,
    'custom-capo-2': CUSTOM_CAPO_2,
  };
  for (const [name, configuration] of Object.entries(configurations)) {
    for (const fileName of ['ps6-counterpoint-2v.musicxml', 'ps6-counterpoint-4v-tie.musicxml']) {
      const observed = benchmarkFinalSonority(fileName, configuration);
      assert.deepEqual(observed, snapshot.cases[name][fileName], `${name} ${fileName}`);
      assert.deepEqual(benchmarkFinalSonority(fileName, configuration), observed);
    }
    assert.equal(snapshot.cases[name].deterministicRerun, true);
    assert.equal(snapshot.cases[name].tieConsistency, 'PASS');
    assert.equal(snapshot.cases[name].graceConsistency, 'PASS');
  }
});

test('resolver rejects forged absolute-fret semantics instead of silently interpreting them', () => {
  const forged = {
    ...STANDARD_CAPO_2,
    fretSemantics: 'ABSOLUTE_FROM_NUT',
  };
  assert.throws(
    () => resolveGuitarConfiguration(forged),
    (error) => error instanceof GuitarConfigurationError
      && error.code === 'INVALID_GUITAR_CONFIGURATION',
  );
});

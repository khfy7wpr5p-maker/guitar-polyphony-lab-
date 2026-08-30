import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  DROP_D_TUNING_CONFIGURATION,
  STANDARD_TUNING_CONFIGURATION,
  TuningConfigurationError,
  createGuitarTuningConfiguration,
  tuningConfigurationToWorkbenchRequest,
} from '../src/guitar/tuningConfiguration.js';
import {
  STANDARD_GUITAR_PROFILE,
  attachFretboardCandidates,
  generateFretboardCandidates,
  positionToMidi,
} from '../src/guitar/fretboardCandidates.js';
import { enumerateSonorityAssignments } from '../src/guitar/sonorityAssignments.js';
import { verifySustainedPolyphonyWithTuning } from '../src/guitar/sustainedTuningVerifier.js';
import { verifyGraceTransitionWithTuning } from '../src/guitar/graceTuningVerifier.js';
import {
  parseStaffTuningFragment,
  serializeStaffTuning,
} from '../src/musicxml/staffTuningSerializer.js';
import { parseMusicXmlPartwise } from '../src/musicxml/partwiseParser.js';
import { buildMeasureTimeline } from '../src/polyphony/measureTimeline.js';

const CUSTOM_TUNING_CONFIGURATION = createGuitarTuningConfiguration([
  { string: 1, pitch: 'D4' },
  { string: 2, pitch: 'A3' },
  { string: 3, pitch: 'F3' },
  { string: 4, pitch: 'C3' },
  { string: 5, pitch: 'G2' },
  { string: 6, pitch: 'C2' },
]);

function positionPairs(candidates) {
  return candidates.map(({ string, fret }) => ({ string, fret }));
}

function positionSignature(result) {
  return result.points.flatMap((point) => (
    point.selectedPositions.map((entry) => `${entry.pitch}@${entry.string}:${entry.fret}`)
  ));
}

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

function benchmarkFinalSonority(fileName, tuningConfiguration) {
  const xml = readFileSync(
    new URL(`../fixtures/compat/${fileName}`, import.meta.url),
    'utf8',
  );
  const parsed = parseMusicXmlPartwise(xml);
  let finalSonority = null;
  for (const measure of parsed.parts[0].measures) {
    const timeline = buildMeasureTimeline(measure.events);
    if (timeline.sonoritySpans.length > 0) finalSonority = timeline.sonoritySpans.at(-1);
  }
  assert.ok(finalSonority);
  const attached = attachFretboardCandidates(finalSonority.activeNotes, tuningConfiguration);
  const assignments = enumerateSonorityAssignments(attached);
  return {
    candidateCount: attached.reduce((sum, note) => sum + note.fretboardCandidates.length, 0),
    solvable: assignments.length > 0,
    blocked: assignments.length === 0,
    selectedPositions: assignments.length === 0
      ? []
      : assignments[0].map((entry) => `${entry.pitch}@${entry.string}:${entry.fret}`),
  };
}

test('six-string tuning configurations are immutable and expose exact standard/drop-D/custom facts', () => {
  assert.equal(STANDARD_TUNING_CONFIGURATION.preset, 'STANDARD');
  assert.equal(DROP_D_TUNING_CONFIGURATION.preset, 'DROP_D');
  assert.equal(CUSTOM_TUNING_CONFIGURATION.preset, 'CUSTOM');
  assert.equal(STANDARD_TUNING_CONFIGURATION.stringCount, 6);
  assert.ok(Object.isFrozen(STANDARD_TUNING_CONFIGURATION));
  assert.ok(Object.isFrozen(STANDARD_TUNING_CONFIGURATION.strings));
  assert.ok(STANDARD_TUNING_CONFIGURATION.strings.every(Object.isFrozen));
  assert.deepEqual(
    STANDARD_TUNING_CONFIGURATION.strings.map(({ string, pitch, midi, writtenPitch }) => ({
      string,
      pitch,
      midi,
      writtenPitch,
    })),
    [
      { string: 1, pitch: 'E4', midi: 64, writtenPitch: 'E4' },
      { string: 2, pitch: 'B3', midi: 59, writtenPitch: 'B3' },
      { string: 3, pitch: 'G3', midi: 55, writtenPitch: 'G3' },
      { string: 4, pitch: 'D3', midi: 50, writtenPitch: 'D3' },
      { string: 5, pitch: 'A2', midi: 45, writtenPitch: 'A2' },
      { string: 6, pitch: 'E2', midi: 40, writtenPitch: 'E2' },
    ],
  );
  assert.equal(DROP_D_TUNING_CONFIGURATION.strings[5].pitch, 'D2');
  assert.equal(DROP_D_TUNING_CONFIGURATION.strings[5].midi, 38);
});

test('tuning validation fails closed for malformed, contradictory, unbounded and hostile inputs', () => {
  const standard = STANDARD_TUNING_CONFIGURATION.strings.map(({ string, pitch }) => ({ string, pitch }));

  assert.throws(
    () => createGuitarTuningConfiguration(standard.slice(0, 5)),
    (error) => error instanceof TuningConfigurationError && error.code === 'INVALID_STRING_COUNT',
  );

  assert.throws(
    () => createGuitarTuningConfiguration([
      standard[0],
      { string: 1, pitch: 'B3' },
      ...standard.slice(2),
    ]),
    (error) => error instanceof TuningConfigurationError && error.code === 'DUPLICATE_STRING',
  );

  assert.throws(
    () => createGuitarTuningConfiguration([
      { string: 1, pitch: 'E4', midi: 200 },
      ...standard.slice(1),
    ]),
    (error) => error instanceof TuningConfigurationError && error.code === 'INVALID_MIDI',
  );

  assert.throws(
    () => createGuitarTuningConfiguration([
      { string: 1, pitch: 'H4' },
      ...standard.slice(1),
    ]),
    (error) => error instanceof TuningConfigurationError && error.code === 'INVALID_PITCH',
  );

  assert.throws(
    () => createGuitarTuningConfiguration([
      { string: 1, pitch: 'E4', midi: 63 },
      ...standard.slice(1),
    ]),
    (error) => error instanceof TuningConfigurationError && error.code === 'PITCH_MIDI_MISMATCH',
  );

  assert.throws(
    () => createGuitarTuningConfiguration([
      { string: 2, pitch: 'B3' },
      { string: 1, pitch: 'E4' },
      ...standard.slice(2),
    ]),
    (error) => error instanceof TuningConfigurationError && error.code === 'STRING_ORDER_MISMATCH',
  );

  assert.throws(
    () => createGuitarTuningConfiguration([
      { string: 1, pitch: 'C3' },
      { string: 2, pitch: 'E4' },
      ...standard.slice(2),
    ]),
    (error) => error instanceof TuningConfigurationError && error.code === 'PHYSICALLY_UNBOUNDED_TUNING',
  );

  let getterRead = false;
  const hostile = { string: 1 };
  Object.defineProperty(hostile, 'pitch', {
    enumerable: true,
    get() {
      getterRead = true;
      return 'E4';
    },
  });
  assert.throws(
    () => createGuitarTuningConfiguration([hostile, ...standard.slice(1)]),
    (error) => error instanceof TuningConfigurationError && error.code === 'HOSTILE_TUNING_INPUT',
  );
  assert.equal(getterRead, false);

  assert.throws(
    () => createGuitarTuningConfiguration(new Proxy(standard, {})),
    (error) => error instanceof TuningConfigurationError && error.code === 'HOSTILE_TUNING_INPUT',
  );
});

test('workbench request contract contains only browser-supplied string and pitch facts', () => {
  assert.deepEqual(
    tuningConfigurationToWorkbenchRequest(DROP_D_TUNING_CONFIGURATION),
    {
      guitar: {
        tuning: [
          { string: 1, pitch: 'E4' },
          { string: 2, pitch: 'B3' },
          { string: 3, pitch: 'G3' },
          { string: 4, pitch: 'D3' },
          { string: 5, pitch: 'A2' },
          { string: 6, pitch: 'D2' },
        ],
      },
    },
  );
});

test('standard tuning remains backward-compatible with the existing fretboard profile and default API', () => {
  assert.equal(STANDARD_GUITAR_PROFILE.id, 'STANDARD_E2_E4_24_FRET_1.0');
  for (const pitch of ['E2', 'A2', 'D3', 'G3', 'B3', 'E4', 'C5']) {
    assert.deepEqual(
      generateFretboardCandidates(pitch),
      generateFretboardCandidates(pitch, STANDARD_TUNING_CONFIGURATION),
    );
  }
  assert.deepEqual(positionPairs(generateFretboardCandidates('E2')), [{ string: 6, fret: 0 }]);
  assert.deepEqual(positionPairs(generateFretboardCandidates('A2')), [
    { string: 5, fret: 0 },
    { string: 6, fret: 5 },
  ]);
});

test('Drop D changes only physical realization candidates while source pitch facts remain immutable', () => {
  assert.deepEqual(generateFretboardCandidates('D2'), []);
  assert.deepEqual(positionPairs(generateFretboardCandidates('D2', DROP_D_TUNING_CONFIGURATION)), [
    { string: 6, fret: 0 },
  ]);
  assert.equal(positionToMidi({ string: 6, fret: 2 }, DROP_D_TUNING_CONFIGURATION), 40);

  const source = Object.freeze([
    Object.freeze({ id: 'n1', pitch: 'E3', voice: '1', staff: 1, onset: 0, end: 4 }),
  ]);
  const before = structuredClone(source);
  const standard = attachFretboardCandidates(source, STANDARD_TUNING_CONFIGURATION);
  const dropD = attachFretboardCandidates(source, DROP_D_TUNING_CONFIGURATION);
  assert.deepEqual(source, before);
  assert.equal(source[0].pitch, 'E3');
  assert.deepEqual(
    positionPairs(standard[0].fretboardCandidates).filter((entry) => entry.string === 6),
    [{ string: 6, fret: 12 }],
  );
  assert.deepEqual(
    positionPairs(dropD[0].fretboardCandidates).filter((entry) => entry.string === 6),
    [{ string: 6, fret: 14 }],
  );
});

test('standard sustained verification is identical for implicit and explicit standard tuning', () => {
  const points = [makeAttackPoint(['E2', 'A2', 'D3', 'G3'])];
  const implicit = verifySustainedPolyphonyWithTuning(points);
  const explicit = verifySustainedPolyphonyWithTuning(points, STANDARD_TUNING_CONFIGURATION);
  assert.deepEqual(implicit, explicit);
  assert.equal(implicit.status, 'PASS');
  assert.deepEqual(positionSignature(implicit), ['E2@6:0', 'A2@5:0', 'D3@4:0', 'G3@3:0']);
});

test('Drop D solves deterministic one-, two-, three- and four-voice sonorities', () => {
  const pitches = ['D2', 'A2', 'D3', 'G3'];
  for (let voiceCount = 1; voiceCount <= 4; voiceCount += 1) {
    const result = verifySustainedPolyphonyWithTuning(
      [makeAttackPoint(pitches.slice(0, voiceCount), `v${voiceCount}`)],
      DROP_D_TUNING_CONFIGURATION,
    );
    assert.equal(result.status, 'PASS');
    assert.equal(result.points[0].activeNoteCount, voiceCount);
    assert.deepEqual(
      result.points[0].selectedPositions[0],
      {
        logicalNoteId: `v${voiceCount}:n0`,
        sustainId: `v${voiceCount}:s0`,
        pitch: 'D2',
        disposition: 'ATTACK',
        tie: null,
        voice: '1',
        staff: 1,
        string: 6,
        fret: 0,
      },
    );
  }
});

test('Drop D preserves HOLD occupancy and cross-measure tie identity while allowing simultaneous attacks', () => {
  const points = [
    {
      pointId: 'm0:p0',
      measureIndex: 0,
      timeDivisions: 0,
      notes: [
        {
          logicalNoteId: 'tie-segment-1',
          sustainId: 'bass-tie',
          pitch: 'D2',
          disposition: 'ATTACK',
          tie: 'START',
          voice: '1',
          staff: 1,
        },
      ],
    },
    {
      pointId: 'm0:p1',
      measureIndex: 0,
      timeDivisions: 4,
      notes: [
        {
          logicalNoteId: 'tie-segment-1',
          sustainId: 'bass-tie',
          pitch: 'D2',
          disposition: 'HOLD',
          tie: 'CONTINUE',
          voice: '1',
          staff: 1,
        },
        {
          logicalNoteId: 'upper-attack',
          sustainId: 'upper-attack',
          pitch: 'A2',
          disposition: 'ATTACK',
          tie: null,
          voice: '2',
          staff: 1,
        },
      ],
    },
    {
      pointId: 'm1:p0',
      measureIndex: 1,
      timeDivisions: 0,
      notes: [
        {
          logicalNoteId: 'tie-segment-2',
          sustainId: 'bass-tie',
          pitch: 'D2',
          disposition: 'HOLD',
          tie: 'STOP',
          voice: '1',
          staff: 1,
        },
        {
          logicalNoteId: 'new-upper',
          sustainId: 'new-upper',
          pitch: 'G3',
          disposition: 'ATTACK',
          tie: null,
          voice: '3',
          staff: 1,
        },
      ],
    },
  ];
  const sourceSnapshot = structuredClone(points);
  const result = verifySustainedPolyphonyWithTuning(points, DROP_D_TUNING_CONFIGURATION);
  assert.deepEqual(points, sourceSnapshot);
  assert.equal(result.status, 'PASS');
  for (const point of result.points) {
    const bass = point.selectedPositions.find((entry) => entry.sustainId === 'bass-tie');
    assert.equal(bass.string, 6);
    assert.equal(bass.fret, 0);
    assert.equal(bass.pitch, 'D2');
  }
  assert.equal(result.points[2].selectedPositions[0].tie, 'STOP');
});

test('a bounded fully custom tuning solves a four-voice sonority unavailable at its lowest pitch in standard tuning', () => {
  const points = [makeAttackPoint(['C2', 'G2', 'C3', 'F3'], 'custom')];
  const custom = verifySustainedPolyphonyWithTuning(points, CUSTOM_TUNING_CONFIGURATION);
  const standard = verifySustainedPolyphonyWithTuning(points, STANDARD_TUNING_CONFIGURATION);
  assert.equal(custom.status, 'PASS');
  assert.deepEqual(positionSignature(custom), ['C2@6:0', 'G2@5:0', 'C3@4:0', 'F3@3:0']);
  assert.equal(standard.status, 'BLOCKED');
  assert.equal(standard.reason, 'NO_EXACT_FRETBOARD_CANDIDATE');
});

test('sustained results are deterministic for Standard, Drop D and Custom', () => {
  const scenarios = [
    [STANDARD_TUNING_CONFIGURATION, ['E2', 'A2', 'D3', 'G3']],
    [DROP_D_TUNING_CONFIGURATION, ['D2', 'A2', 'D3', 'G3']],
    [CUSTOM_TUNING_CONFIGURATION, ['C2', 'G2', 'C3', 'F3']],
  ];
  for (const [configuration, pitches] of scenarios) {
    const points = [makeAttackPoint(pitches, configuration.preset)];
    assert.deepEqual(
      verifySustainedPolyphonyWithTuning(points, configuration),
      verifySustainedPolyphonyWithTuning(points, configuration),
    );
  }
});

test('grace transition uses the same Drop D tuning, exact anchor pitch, held-string reservation and round-trip', () => {
  const pass = verifyGraceTransitionWithTuning(
    {
      anchorPitch: 'A2',
      anchorPosition: { string: 5, fret: 0 },
      heldPositions: [],
      notes: [{ graceEventId: 'g1', pitch: 'D2' }],
    },
    DROP_D_TUNING_CONFIGURATION,
  );
  assert.equal(pass.status, 'PASS');
  assert.deepEqual(pass.anchorPosition, { pitch: 'A2', string: 5, fret: 0 });
  assert.deepEqual(pass.notes, [{ graceEventId: 'g1', pitch: 'D2', string: 6, fret: 0 }]);
  assert.equal(positionToMidi({ string: 6, fret: 0 }, DROP_D_TUNING_CONFIGURATION), 38);

  const standardBlocked = verifyGraceTransitionWithTuning(
    {
      anchorPitch: 'A2',
      anchorPosition: { string: 5, fret: 0 },
      heldPositions: [],
      notes: [{ graceEventId: 'g1', pitch: 'D2' }],
    },
    STANDARD_TUNING_CONFIGURATION,
  );
  assert.equal(standardBlocked.status, 'BLOCKED');
  assert.equal(standardBlocked.reason, 'NO_EXACT_GRACE_POSITION');

  const heldBlocked = verifyGraceTransitionWithTuning(
    {
      anchorPitch: 'A2',
      anchorPosition: { string: 5, fret: 0 },
      heldPositions: [{ string: 6, fret: 2, pitch: 'E2' }],
      notes: [{ graceEventId: 'g1', pitch: 'D2' }],
    },
    DROP_D_TUNING_CONFIGURATION,
  );
  assert.equal(heldBlocked.status, 'BLOCKED');
  assert.equal(heldBlocked.reason, 'NO_EXACT_GRACE_POSITION');
});

test('MusicXML staff-tuning serialization round-trips actual target tuning deterministically', () => {
  for (const configuration of [
    STANDARD_TUNING_CONFIGURATION,
    DROP_D_TUNING_CONFIGURATION,
    CUSTOM_TUNING_CONFIGURATION,
  ]) {
    const first = serializeStaffTuning(configuration);
    const second = serializeStaffTuning(configuration);
    assert.equal(first, second);
    assert.deepEqual(parseStaffTuningFragment(first), configuration);
  }
  const dropDXml = serializeStaffTuning(DROP_D_TUNING_CONFIGURATION);
  assert.match(
    dropDXml,
    /<staff-tuning line="1"><tuning-step>D<\/tuning-step><tuning-octave>2<\/tuning-octave><\/staff-tuning>/,
  );
  assert.doesNotMatch(dropDXml, /<staff-tuning line="1"><tuning-step>E<\/tuning-step>/);
});

test('existing polyphony corpus benchmark matches the recorded Standard, Drop D and Custom snapshot', () => {
  const snapshot = JSON.parse(readFileSync(
    new URL('../fixtures/tuning/benchmark-snapshot.json', import.meta.url),
    'utf8',
  ));
  const configurations = {
    STANDARD: STANDARD_TUNING_CONFIGURATION,
    DROP_D: DROP_D_TUNING_CONFIGURATION,
    CUSTOM: CUSTOM_TUNING_CONFIGURATION,
  };
  for (const [fileName, expectedByPreset] of Object.entries(snapshot.fixtures)) {
    for (const [preset, configuration] of Object.entries(configurations)) {
      const first = benchmarkFinalSonority(fileName, configuration);
      const second = benchmarkFinalSonority(fileName, configuration);
      assert.deepEqual(first, second);
      assert.deepEqual(first, expectedByPreset[preset]);
    }
  }
  assert.equal(snapshot.deterministicRerun, true);
  assert.equal(snapshot.tieConsistency, 'PASS');
  assert.equal(snapshot.graceConsistency, 'PASS');
});

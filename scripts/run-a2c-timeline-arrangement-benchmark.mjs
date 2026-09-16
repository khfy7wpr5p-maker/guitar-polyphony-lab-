import fs from 'node:fs';
import path from 'node:path';

import { parseMusicXmlPartwise } from '../src/musicxml/partwiseParser.js';
import { buildArrangementTimelineSidecar } from '../src/arrangement/arrangementTimelineSidecar.js';
import { generateTimelineBackedArpeggiationAlternatives } from '../src/arrangement/timelineBackedArpeggiationGenerator.js';

const NOTES = [
  ['E', 0, 3, 52], ['G', 0, 3, 55], ['B', 0, 3, 59], ['D', 0, 4, 62],
  ['F', 1, 4, 66], ['A', 0, 4, 69], ['C', 0, 5, 72], ['E', 0, 5, 76],
];

function xml(simultaneous = true) {
  const notes = NOTES.map(([step, alter, octave], index) => `<note>${index > 0 && simultaneous ? '<chord/>' : ''}<pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ''}<octave>${octave}</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff></note>`).join('');
  return `<?xml version="1.0"?><score-partwise version="4.0"><part-list/><part id="P1"><measure number="1"><attributes><divisions>8</divisions></attributes>${notes}</measure></part></score-partwise>`;
}

function source() {
  const events = NOTES.map(([, , , midi], index) => ({ sourceEventId: `p1-m1-n${index + 1}`, midi, voice: '1', staff: 1 }));
  return { partId: 'P1', events, groups: [{ sourceGroupId: 'piano-8', sourceEventIds: events.map((event) => event.sourceEventId) }] };
}

function runCase(id, simultaneous, policy) {
  const parsed = parseMusicXmlPartwise(xml(simultaneous));
  const arrangementSource = source();
  const sidecar = buildArrangementTimelineSidecar(parsed.parts[0], arrangementSource);
  const result = generateTimelineBackedArpeggiationAlternatives(arrangementSource, sidecar, policy);
  const feasibleCount = result.validations.filter((item) => item.timelinePhysical.status === 'FEASIBLE').length;
  const arpeggiatedSourceCounts = result.alternativeSet
    ? result.alternativeSet.alternatives.map((alternative) => alternative.decisions.find((decision) => decision.decisionType === 'ARPEGGIATED')?.sourceEventIds.length ?? 0)
    : [];
  return {
    id,
    generationStatus: result.generation.status,
    candidateSpaceComplete: result.generation.candidateSpaceComplete,
    emittedAlternativeCount: result.generation.emittedAlternativeCount,
    feasibleCount,
    sourceTimelineStatus: result.sourceTimelineEvidence.status,
    sourceGroupWasSimultaneous: result.sourceTimelineEvidence.sourceGroupWasSimultaneous,
    sourceNoteLossAllowed: result.sourceNoteLossAllowed,
    targetTimingAuthority: result.targetTimingAuthority,
    arpeggiatedSourceCounts,
  };
}

const basePolicy = {
  sourceGroupId: 'piano-8',
  spreadDivisions: 1,
  orderStrategies: ['SOURCE_ORDER', 'ASCENDING_PITCH', 'DESCENDING_PITCH', 'REVERSE_SOURCE_ORDER'],
  maxAlternatives: 8,
};

const cases = [
  runCase('eight-note-piano-no-loss', true, basePolicy),
  runCase('non-simultaneous-group-conflict', false, basePolicy),
  runCase('candidate-limit-is-partial', true, { ...basePolicy, maxAlternatives: 1 }),
];

const report = {
  documentType: 'A2CTimelineArrangementBenchmark',
  contractVersion: '1.0.0',
  authority: 'LAB_RESEARCH_EVIDENCE_ONLY',
  productionAuthority: false,
  summary: {
    caseCount: cases.length,
    eightNoteNoLossFeasibleCandidates: cases[0].feasibleCount,
    timelineConflictCases: cases.filter((item) => item.generationStatus === 'TIMELINE_CONFLICT').length,
    partialLimitCases: cases.filter((item) => item.generationStatus === 'PARTIAL_LIMIT').length,
  },
  cases,
};

if (process.argv.includes('--assert-expectations')) {
  if (cases[0].generationStatus !== 'COMPLETE' || cases[0].feasibleCount < 1) throw new Error('Eight-note no-loss case must produce feasible candidates.');
  if (!cases[0].arpeggiatedSourceCounts.every((count) => count === 8)) throw new Error('Every no-loss candidate must cover all eight source events.');
  if (cases[0].sourceNoteLossAllowed !== false || cases[0].targetTimingAuthority !== false) throw new Error('A2C authority boundary drifted.');
  if (cases[1].generationStatus !== 'TIMELINE_CONFLICT' || cases[1].emittedAlternativeCount !== 0) throw new Error('Non-simultaneous source group must fail closed.');
  if (cases[2].generationStatus !== 'PARTIAL_LIMIT' || cases[2].candidateSpaceComplete !== false) throw new Error('Candidate limit must remain PARTIAL_LIMIT.');
}

const outputIndex = process.argv.indexOf('--output');
const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : 'a2c-timeline-arrangement-report.json';
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));

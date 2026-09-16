import fs from 'node:fs';
import path from 'node:path';

import { createArrangementAlternativeSet } from '../src/arrangement/arrangementAlternativeSet.js';
import { validateTemporalArpeggiationAlternative } from '../src/arrangement/temporalArpeggiationValidator.js';
import { composeDisjointArrangementTransforms } from '../src/arrangement/disjointTransformComposition.js';

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

const output = argValue('--output');
const assertExpectations = process.argv.includes('--assert-expectations');
if (!output) throw new Error('--output is required');

const source = {
  partId: 'P1',
  events: [
    { sourceEventId: 'e1', midi: 60, voice: '1', staff: 1 },
    { sourceEventId: 'e2', midi: 64, voice: '1', staff: 1 },
    { sourceEventId: 'e3', midi: 67, voice: '1', staff: 1 },
    { sourceEventId: 'e4', midi: 40, voice: '2', staff: 2 },
  ],
  groups: [
    { sourceGroupId: 'g1', sourceEventIds: ['e1', 'e2', 'e3'] },
  ],
};

function preserved(id, sourceEventId) {
  return {
    decisionId: id,
    decisionType: 'PRESERVED',
    sourceEventIds: [sourceEventId],
    sourceGroupId: null,
    target: null,
    reasonCode: 'BENCHMARK_PRESERVE',
  };
}

function normalize(raw) {
  return createArrangementAlternativeSet(source, [raw]).alternatives[0];
}

const arpeggio = normalize({
  alternativeId: 'a2b:benchmark:arp',
  strategyTags: ['ARPEGGIATION'],
  decisions: [
    {
      decisionId: 'a2b:benchmark:arp:g1',
      decisionType: 'ARPEGGIATED',
      sourceEventIds: ['e1', 'e2', 'e3'],
      sourceGroupId: 'g1',
      target: { orderedSourceEventIds: ['e3', 'e2', 'e1'], spreadDivisions: 2 },
      reasonCode: 'BENCHMARK_ARPEGGIATION',
    },
    preserved('a2b:benchmark:arp:e4', 'e4'),
  ],
});

const reduction = normalize({
  alternativeId: 'a2b:benchmark:reduction',
  strategyTags: ['INNER_VOICE_REDUCTION'],
  decisions: [
    {
      decisionId: 'a2b:benchmark:reduction:g1',
      decisionType: 'CHORD_REDUCED',
      sourceEventIds: ['e1', 'e2', 'e3'],
      sourceGroupId: 'g1',
      target: { survivingSourceEventIds: ['e1', 'e3'] },
      reasonCode: 'BENCHMARK_REDUCTION',
    },
    preserved('a2b:benchmark:reduction:e4', 'e4'),
  ],
});

function octave(sourceEventId) {
  return normalize({
    alternativeId: `a2b:benchmark:octave:${sourceEventId}`,
    strategyTags: ['REGISTER_COMPRESSION'],
    decisions: source.events.map((event) => event.sourceEventId === sourceEventId
      ? {
        decisionId: `a2b:benchmark:octave:${sourceEventId}:transform`,
        decisionType: 'OCTAVE_DISPLACED',
        sourceEventIds: [sourceEventId],
        sourceGroupId: null,
        target: { semitoneDelta: 12 },
        reasonCode: 'BENCHMARK_OCTAVE',
      }
      : preserved(`a2b:benchmark:octave:${sourceEventId}:${event.sourceEventId}`, event.sourceEventId)),
  });
}

const temporal = validateTemporalArpeggiationAlternative(source, arpeggio);
const disjoint = composeDisjointArrangementTransforms(
  source,
  [reduction, octave('e4')],
  { alternativeId: 'a2b:benchmark:composed' },
);
const overlap = composeDisjointArrangementTransforms(source, [reduction, octave('e2')]);

const disjointAlternative = disjoint.alternativeSet?.alternatives?.[0] ?? null;
const report = {
  documentType: 'A2BTemporalCompositionBenchmark',
  contractVersion: '1.0.0',
  authority: 'LAB_RESEARCH_BENCHMARK_ONLY',
  productionAuthority: false,
  summary: {
    caseCount: 3,
    temporalFeasibleCount: temporal.status === 'FEASIBLE' ? 1 : 0,
    composedCount: disjoint.status === 'COMPOSED' ? 1 : 0,
    overlappingScopeCount: overlap.status === 'OVERLAPPING_SCOPE' ? 1 : 0,
  },
  cases: [
    {
      caseId: 'abstract-arpeggiation-sequence',
      status: temporal.status,
      reason: temporal.reason,
      timingAuthority: temporal.timingAuthority,
      sequenceSemantics: temporal.temporalEvidence.sequenceSemantics,
      declaredSpreadDivisions: temporal.declaredSpreadDivisions,
      orderedSourceEventIds: temporal.witness?.steps?.map((step) => step.sourceEventId) ?? [],
      witnessStepCount: temporal.witness?.steps?.length ?? 0,
    },
    {
      caseId: 'disjoint-reduction-plus-octave',
      status: disjoint.status,
      reason: disjoint.reason,
      transformedSourceEventCount: disjoint.transformedSourceEventCount ?? null,
      inputAlternativeCount: disjoint.inputAlternativeCount ?? null,
      decisionTypes: disjointAlternative
        ? disjointAlternative.decisions.map((decision) => decision.decisionType).sort()
        : [],
      sourceCoverageComplete: disjointAlternative?.sourceCoverageComplete ?? false,
    },
    {
      caseId: 'overlapping-reduction-plus-octave',
      status: overlap.status,
      reason: overlap.reason,
      overlapSourceEventId: overlap.overlap?.sourceEventId ?? null,
      alternativeSetProduced: overlap.alternativeSet !== null,
    },
  ],
};

if (assertExpectations) {
  if (report.summary.temporalFeasibleCount !== 1) throw new Error('A2B temporal expectation failed');
  if (report.summary.composedCount !== 1) throw new Error('A2B disjoint composition expectation failed');
  if (report.summary.overlappingScopeCount !== 1) throw new Error('A2B overlap expectation failed');
  if (report.cases[0].timingAuthority !== false) throw new Error('A2B must not claim timing authority');
  if (report.cases[1].sourceCoverageComplete !== true) throw new Error('A2B composition lost source coverage');
  if (report.cases[2].alternativeSetProduced !== false) throw new Error('A2B overlap must not emit an alternative set');
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

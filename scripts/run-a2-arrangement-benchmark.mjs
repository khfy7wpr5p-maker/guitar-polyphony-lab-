import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  A2_SUPPORTED_TRANSFORMS,
  BOUNDED_ARRANGEMENT_GENERATOR_VERSION,
  generateBoundedArrangementAlternatives,
} from '../src/arrangement/boundedArrangementGenerator.js';
import { ARRANGEMENT_ALTERNATIVE_SET_VERSION } from '../src/arrangement/arrangementAlternativeSet.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const options = { output: null, assertExpectations: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--output') {
      options.output = argv[index + 1] || null;
      index += 1;
    } else if (token === '--assert-expectations') {
      options.assertExpectations = true;
    } else {
      fail(`Unknown argument: ${token}`);
    }
  }
  if (!options.output) {
    fail('Usage: node scripts/run-a2-arrangement-benchmark.mjs --output <report.json> [--assert-expectations]');
  }
  return options;
}

function validationIndex(result) {
  return new Map(result.validations.map((item) => [item.alternativeId, item.physical]));
}

function decisionTypeCounts(result) {
  const counts = Object.create(null);
  for (const alternative of result.alternativeSet.alternatives) {
    for (const decision of alternative.decisions) {
      counts[decision.decisionType] = (counts[decision.decisionType] || 0) + 1;
    }
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function statusCounts(result) {
  const counts = { FEASIBLE: 0, INFEASIBLE: 0, INDETERMINATE_LIMIT: 0, OTHER: 0 };
  for (const item of result.validations) {
    if (Object.hasOwn(counts, item.physical.status)) counts[item.physical.status] += 1;
    else counts.OTHER += 1;
  }
  return counts;
}

function reductionEvidence(result, survivors) {
  const survivorKey = survivors.join(',');
  for (const alternative of result.alternativeSet.alternatives) {
    const reduction = alternative.decisions.find((decision) => (
      decision.decisionType === 'CHORD_REDUCED'
      && decision.target.survivingSourceEventIds.join(',') === survivorKey
    ));
    if (!reduction) continue;
    const physical = result.validations.find((item) => item.alternativeId === alternative.alternativeId)?.physical;
    return {
      alternativeId: alternative.alternativeId,
      survivors: [...reduction.target.survivingSourceEventIds],
      status: physical?.status ?? null,
      reason: physical?.reason ?? null,
      realizedEventCount: physical?.realizedEventCount ?? null,
      sourceCoverageComplete: alternative.sourceCoverageComplete,
      reviewRequired: alternative.reviewRequired,
    };
  }
  return null;
}

function summarizeCase(item, result) {
  const validations = validationIndex(result);
  const strict = validations.get('a2:strict-source');
  const evidence = {};

  if (item.expect.requiredFeasibleReductionSurvivors) {
    evidence.requiredReduction = reductionEvidence(
      result,
      item.expect.requiredFeasibleReductionSurvivors,
    );
  }
  if (item.expect.requiredFeasibleAlternativeId) {
    const physical = validations.get(item.expect.requiredFeasibleAlternativeId) || null;
    evidence.requiredAlternative = physical === null ? null : {
      alternativeId: item.expect.requiredFeasibleAlternativeId,
      status: physical.status,
      reason: physical.reason,
      realizedEventCount: physical.realizedEventCount,
      hasWitness: physical.witness !== null,
    };
  }

  return {
    caseId: item.caseId,
    sourceEventCount: item.source.events.length,
    sourceGroupEventCount: item.source.groups[0].sourceEventIds.length,
    allowedTransforms: [...item.policy.allowedTransforms],
    priorityEventIds: [...(item.policy.priorityEventIds || [])],
    generationStatus: result.generation.status,
    candidateSpaceComplete: result.generation.candidateSpaceComplete,
    emittedAlternativeCount: result.generation.emittedAlternativeCount,
    candidateOrderIsPreferenceRank: result.generation.candidateOrderIsPreferenceRank,
    strict: {
      status: strict?.status ?? null,
      reason: strict?.reason ?? null,
      realizedEventCount: strict?.realizedEventCount ?? null,
    },
    validationStatusCounts: statusCounts(result),
    decisionTypeCounts: decisionTypeCounts(result),
    evidence,
  };
}

function assertCase(item, summary) {
  assert.equal(summary.generationStatus, item.expect.generationStatus, `${item.caseId}.generationStatus`);
  if (Object.hasOwn(item.expect, 'candidateSpaceComplete')) {
    assert.equal(
      summary.candidateSpaceComplete,
      item.expect.candidateSpaceComplete,
      `${item.caseId}.candidateSpaceComplete`,
    );
  }
  if (Object.hasOwn(item.expect, 'emittedAlternativeCount')) {
    assert.equal(
      summary.emittedAlternativeCount,
      item.expect.emittedAlternativeCount,
      `${item.caseId}.emittedAlternativeCount`,
    );
  }
  if (item.expect.strictStatus) {
    assert.equal(summary.strict.status, item.expect.strictStatus, `${item.caseId}.strict.status`);
    assert.equal(summary.strict.reason, item.expect.strictReason, `${item.caseId}.strict.reason`);
  }
  if (item.expect.requiredFeasibleReductionSurvivors) {
    assert.ok(summary.evidence.requiredReduction, `${item.caseId}.requiredReduction exists`);
    assert.equal(summary.evidence.requiredReduction.status, 'FEASIBLE', `${item.caseId}.requiredReduction.status`);
    assert.equal(summary.evidence.requiredReduction.sourceCoverageComplete, true, `${item.caseId}.sourceCoverageComplete`);
    assert.equal(summary.evidence.requiredReduction.reviewRequired, true, `${item.caseId}.reviewRequired`);
  }
  if (item.expect.requiredFeasibleAlternativeId) {
    assert.ok(summary.evidence.requiredAlternative, `${item.caseId}.requiredAlternative exists`);
    assert.equal(summary.evidence.requiredAlternative.status, 'FEASIBLE', `${item.caseId}.requiredAlternative.status`);
    assert.equal(summary.evidence.requiredAlternative.hasWitness, true, `${item.caseId}.requiredAlternative.hasWitness`);
  }
  assert.equal(summary.candidateOrderIsPreferenceRank, false, `${item.caseId}.candidateOrderIsPreferenceRank`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const fixture = JSON.parse(fs.readFileSync(
    path.join(repoRoot, 'fixtures/a2/benchmark.json'),
    'utf8',
  ));
  if (
    fixture.documentType !== 'GuitarArrangementA2Benchmark'
    || fixture.contractVersion !== '1.0.0'
    || !Array.isArray(fixture.cases)
  ) {
    fail('Invalid A2 benchmark contract.');
  }

  const cases = fixture.cases.map((item) => {
    const result = generateBoundedArrangementAlternatives(item.source, item.policy);
    const summary = summarizeCase(item, result);
    if (options.assertExpectations) assertCase(item, summary);
    return summary;
  });

  const report = {
    documentType: 'GuitarArrangementA2BenchmarkReport',
    contractVersion: '1.0.0',
    productionAuthority: false,
    automaticProductionTransformationAuthority: false,
    learnedRankingAuthority: false,
    arrangementAlternativeSetVersion: ARRANGEMENT_ALTERNATIVE_SET_VERSION,
    boundedGeneratorVersion: BOUNDED_ARRANGEMENT_GENERATOR_VERSION,
    sourceTruthMayExceedGuitarStringCount: true,
    supportedGeneratedTransforms: [...A2_SUPPORTED_TRANSFORMS],
    scope: {
      staticSonorityOnly: true,
      singleTransformPerAlternativeResearchSlice: true,
      temporalArpeggiationGeneration: false,
      transformedCandidatesPhysicallyRevalidated: true,
    },
    summary: {
      caseCount: cases.length,
      completeGenerationCaseCount: cases.filter((item) => item.generationStatus === 'COMPLETE').length,
      partialLimitCaseCount: cases.filter((item) => item.generationStatus === 'PARTIAL_LIMIT').length,
      casesWithStrictInfeasibility: cases.filter((item) => item.strict.status === 'INFEASIBLE').length,
      casesWithFeasibleTransformedEvidence: cases.filter((item) => (
        item.evidence.requiredReduction?.status === 'FEASIBLE'
        || item.evidence.requiredAlternative?.status === 'FEASIBLE'
      )).length,
    },
    cases,
  };

  const output = path.resolve(options.output);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const text = `${JSON.stringify(report, null, 2)}\n`;
  fs.writeFileSync(output, text, 'utf8');
  process.stdout.write(text);
}

main();

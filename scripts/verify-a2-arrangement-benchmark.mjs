import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const options = { generated: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--generated') {
      options.generated = argv[index + 1] || null;
      index += 1;
    } else {
      fail(`Unknown argument: ${token}`);
    }
  }
  if (!options.generated) {
    fail('Usage: node scripts/verify-a2-arrangement-benchmark.mjs --generated <report.json>');
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const generated = JSON.parse(fs.readFileSync(path.resolve(options.generated), 'utf8'));
  const baseline = JSON.parse(fs.readFileSync(
    path.join(repoRoot, 'artifacts/a2/arrangement-generation-baseline.json'),
    'utf8',
  ));

  if (generated.documentType !== 'GuitarArrangementA2BenchmarkReport') {
    fail('Generated A2 report has an unexpected document type.');
  }
  if (
    generated.productionAuthority !== false
    || generated.automaticProductionTransformationAuthority !== false
    || generated.learnedRankingAuthority !== false
  ) {
    fail('A2 benchmark must remain Lab research evidence only.');
  }
  if (generated.sourceTruthMayExceedGuitarStringCount !== true) {
    fail('A2 must preserve source groups larger than the guitar string count.');
  }
  if (
    generated.scope?.staticSonorityOnly !== true
    || generated.scope?.singleTransformPerAlternativeResearchSlice !== true
    || generated.scope?.temporalArpeggiationGeneration !== false
    || generated.scope?.transformedCandidatesPhysicallyRevalidated !== true
  ) {
    fail('A2 benchmark scope drifted beyond the implemented static research slice.');
  }
  if (
    generated.summary?.caseCount !== 3
    || generated.summary?.partialLimitCaseCount < 1
    || generated.summary?.casesWithFeasibleTransformedEvidence < 2
  ) {
    fail('A2 benchmark lost required bounded-generation evidence.');
  }

  const pianoCase = generated.cases?.find((item) => item.caseId === 'piano-eight-reduction');
  if (
    !pianoCase
    || pianoCase.sourceGroupEventCount !== 8
    || pianoCase.strict?.reason !== 'ACTIVE_NOTE_COUNT_EXCEEDS_STRING_COUNT'
    || pianoCase.evidence?.requiredReduction?.status !== 'FEASIBLE'
    || pianoCase.evidence?.requiredReduction?.sourceCoverageComplete !== true
    || pianoCase.evidence?.requiredReduction?.reviewRequired !== true
  ) {
    fail('A2 benchmark lost the source-complete piano reduction proof.');
  }

  const octaveCase = generated.cases?.find((item) => item.caseId === 'low-pitch-octave-recovery');
  if (
    !octaveCase
    || octaveCase.strict?.reason !== 'NO_EXACT_FRETBOARD_CANDIDATE'
    || octaveCase.evidence?.requiredAlternative?.status !== 'FEASIBLE'
    || octaveCase.evidence?.requiredAlternative?.hasWitness !== true
  ) {
    fail('A2 benchmark lost the octave recovery proof.');
  }

  const limitCase = generated.cases?.find((item) => item.caseId === 'candidate-limit-is-indeterminate');
  if (
    !limitCase
    || limitCase.generationStatus !== 'PARTIAL_LIMIT'
    || limitCase.candidateSpaceComplete !== false
  ) {
    fail('A2 candidate bound must remain partial evidence, not false completeness/impossibility.');
  }

  for (const item of generated.cases || []) {
    if (item.candidateOrderIsPreferenceRank !== false) {
      fail('A2 candidate order must not become preference ranking authority.');
    }
  }

  assert.deepStrictEqual(generated, baseline);
  process.stdout.write('A2 bounded arrangement benchmark matches committed evidence.\n');
}

main();

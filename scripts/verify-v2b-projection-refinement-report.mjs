import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) { throw new Error(message); }

function parseArgs(argv) {
  const options = { generated: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--generated') { options.generated = argv[index + 1] || null; index += 1; }
    else fail(`Unknown argument: ${token}`);
  }
  if (!options.generated) fail('Usage: node scripts/verify-v2b-projection-refinement-report.mjs --generated <report.json>');
  return options;
}

function projection(report) {
  return {
    documentType: 'GuitarPolyphonyV2BProjectionRefinementBaseline',
    contractVersion: report.contractVersion,
    sourceEvidence: report.sourceEvidence,
    summary: report.summary,
    cases: report.cases.map((item) => ({
      caseId: item.caseId,
      semanticProbeSha256: item.semanticProbeSha256,
      engineObservation: {
        errorCode: item.engineObservation.errorCode,
        observedFeature: item.engineObservation.observedFeature,
        details: item.engineObservation.details,
        locationEvidence: item.engineObservation.locationEvidence,
      },
      sourceOccurrenceCount: item.sourceOccurrences.length,
      refinement: item.refinement,
    })),
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const generated = JSON.parse(fs.readFileSync(path.resolve(options.generated), 'utf8'));
  const baseline = JSON.parse(fs.readFileSync(
    path.join(repoRoot, 'artifacts/v2b/projection-refinement-baseline.json'),
    'utf8',
  ));

  if (generated.documentType !== 'GuitarPolyphonyV2BProjectionRefinementReport') {
    fail('Generated V2B report has an unexpected document type.');
  }
  if (generated.policy?.productionAuthority !== false || generated.policy?.productionBehaviorChanged !== false) {
    fail('Generated V2B report must remain evidence-only and non-authoritative.');
  }
  if (generated.policy?.automaticRecoveryAuthorized !== false) {
    fail('Generated V2B report must not authorize automatic recovery.');
  }
  if (generated.policy?.semanticGlobalBlockForbidden !== true || generated.summary?.blockedGlobalCount !== 0) {
    fail('Generated V2B report must preserve the semantic no-global-block invariant.');
  }
  if (generated.summary?.caseCount !== 6 || generated.summary?.reviewRequiredCandidateCount !== 6) {
    fail('Generated V2B report has unexpected case/review counts.');
  }
  assert.deepStrictEqual(projection(generated), baseline);
  process.stdout.write('V2B projection refinement baseline matches generated evidence.\n');
}

main();

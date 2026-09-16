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
    fail('Usage: node scripts/verify-v2-failure-intelligence-report.mjs --generated <report.json>');
  }
  return options;
}

function projection(report) {
  return {
    documentType: 'GuitarPolyphonyV2FailureIntelligenceBaseline',
    contractVersion: report.contractVersion,
    sourceEvidence: report.sourceEvidence,
    summary: report.summary,
    groups: report.groups.map((group) => ({
      provider: group.provider,
      phase: group.phase,
      errorCode: group.errorCode,
      failureFamily: group.failureFamily,
      layer: group.layer,
      scopeClass: group.scopeClass,
      handlingClass: group.handlingClass,
      progressiveStateCandidate: group.progressiveStateCandidate,
      refinementRequired: group.refinementRequired,
      evidencePrecision: group.evidencePrecision,
      caseIds: group.caseIds,
      observationCount: group.observationCount,
    })),
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const generated = JSON.parse(fs.readFileSync(path.resolve(options.generated), 'utf8'));
  const baseline = JSON.parse(fs.readFileSync(
    path.join(repoRoot, 'artifacts/v2/failure-intelligence-baseline.json'),
    'utf8',
  ));
  if (generated.documentType !== 'GuitarPolyphonyV2FailureIntelligenceReport') {
    fail('Generated V2 report has an unexpected document type.');
  }
  if (generated.policy?.productionAuthority !== false || generated.policy?.productionBehaviorChanged !== false) {
    fail('Generated V2 report must remain evidence-only and non-authoritative.');
  }
  if (generated.policy?.semanticProbeGlobalBlockForbidden !== true) {
    fail('Generated V2 report must preserve the semantic no-global-block invariant.');
  }
  assert.deepStrictEqual(projection(generated), baseline);
  process.stdout.write('V2 failure intelligence baseline matches generated evidence.\n');
}

main();

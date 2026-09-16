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
    fail('Usage: node scripts/verify-v3b-left-hand-benchmark-report.mjs --generated <report.json>');
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const generated = JSON.parse(fs.readFileSync(path.resolve(options.generated), 'utf8'));
  const baseline = JSON.parse(fs.readFileSync(
    path.join(repoRoot, 'artifacts/v3b/left-hand-benchmark-baseline.json'),
    'utf8',
  ));

  if (generated.documentType !== 'GuitarPolyphonyV3BLeftHandBenchmarkReport') {
    fail('Generated V3B report has an unexpected document type.');
  }
  if (generated.productionAuthority !== false) {
    fail('V3B must remain research evidence only.');
  }
  if (
    generated.comparisonPolicy?.labImplementationIndependent !== true
    || generated.comparisonPolicy?.pinnedEngineUsedAsComparisonTargetOnly !== true
  ) {
    fail('V3B must preserve independent Lab authority and comparison-only Engine usage.');
  }
  if (
    generated.summary?.crossRepoComparableCaseCount !== generated.summary?.crossRepoStatusParityCount
  ) {
    fail('Every cross-repo comparable V3B case must preserve status parity with the pinned Engine baseline.');
  }
  if (generated.summary?.labIndeterminateLimitCount < 1) {
    fail('V3B must preserve search/evidence limits as indeterminate rather than physical impossibility.');
  }

  assert.deepStrictEqual(generated, baseline);
  process.stdout.write('V3B left-hand benchmark baseline matches generated evidence.\n');
}

main();

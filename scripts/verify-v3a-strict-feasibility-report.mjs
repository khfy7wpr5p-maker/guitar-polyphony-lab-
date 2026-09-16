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
    fail('Usage: node scripts/verify-v3a-strict-feasibility-report.mjs --generated <report.json>');
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const generated = JSON.parse(fs.readFileSync(path.resolve(options.generated), 'utf8'));
  const baseline = JSON.parse(fs.readFileSync(
    path.join(repoRoot, 'artifacts/v3a/strict-feasibility-baseline.json'),
    'utf8',
  ));

  if (generated.documentType !== 'GuitarPolyphonyV3AStrictFeasibilityBenchmarkReport') {
    fail('Generated V3A report has an unexpected document type.');
  }
  if (generated.productionAuthority !== false) {
    fail('V3A must remain research evidence only.');
  }
  if (
    generated.scope?.leftHandFingering !== false
    || generated.scope?.barreFeasibility !== false
    || generated.scope?.ergonomicReach !== false
    || generated.scope?.arrangementTransforms !== false
  ) {
    fail('V3A must not overclaim left-hand, ergonomic, or arrangement authority.');
  }
  if (generated.summary?.demonstratedGreedyFalseNegativeCount < 1) {
    fail('V3A benchmark must preserve at least one proven greedy false-negative case.');
  }

  assert.deepStrictEqual(generated, baseline);
  process.stdout.write('V3A strict feasibility baseline matches generated evidence.\n');
}

main();

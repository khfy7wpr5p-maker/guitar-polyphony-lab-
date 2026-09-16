import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateStrictGuitarFeasibility } from '../src/guitar/strictFeasibilityOracle.js';
import { verifySustainedPolyphonyWithConfiguration } from '../src/guitar/sustainedConfigurationVerifier.js';

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
    fail('Usage: node scripts/run-v3a-strict-feasibility-benchmark.mjs --output <file> [--assert-expectations]');
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const fixture = JSON.parse(fs.readFileSync(
    path.join(repoRoot, 'fixtures/v3a/benchmark.json'),
    'utf8',
  ));
  if (
    fixture.documentType !== 'GuitarPolyphonyV3AStrictFeasibilityBenchmark'
    || fixture.contractVersion !== '1.0.0'
    || !Array.isArray(fixture.cases)
  ) {
    fail('Invalid V3A benchmark fixture contract.');
  }

  const cases = fixture.cases.map((item) => {
    const oracle = evaluateStrictGuitarFeasibility(
      item.points,
      undefined,
      item.options || {},
    );
    const legacy = item.legacyGreedyExpected
      ? verifySustainedPolyphonyWithConfiguration(item.points)
      : null;

    if (options.assertExpectations) {
      assert.equal(oracle.status, item.expected.status, `${item.caseId}.oracle.status`);
      assert.equal(oracle.reason, item.expected.reason, `${item.caseId}.oracle.reason`);
      if (item.legacyGreedyExpected) {
        assert.equal(legacy.status, item.legacyGreedyExpected.status, `${item.caseId}.legacy.status`);
        assert.equal(legacy.reason, item.legacyGreedyExpected.reason, `${item.caseId}.legacy.reason`);
      }
    }

    return {
      caseId: item.caseId,
      expected: item.expected,
      oracle: {
        status: oracle.status,
        reason: oracle.reason,
        decisiveScope: oracle.decisiveScope,
        stateCounts: oracle.stateCounts,
        witnessPointCount: oracle.witness?.points?.length ?? 0,
      },
      legacyGreedy: legacy
        ? { status: legacy.status, reason: legacy.reason }
        : null,
    };
  });

  const result = {
    documentType: 'GuitarPolyphonyV3AStrictFeasibilityBenchmarkReport',
    contractVersion: '1.0.0',
    productionAuthority: false,
    scope: {
      exactPitch: true,
      distinctStrings: true,
      sustainStringFretStable: true,
      leftHandFingering: false,
      barreFeasibility: false,
      ergonomicReach: false,
      arrangementTransforms: false,
    },
    summary: {
      caseCount: cases.length,
      feasibleCount: cases.filter((item) => item.oracle.status === 'FEASIBLE').length,
      infeasibleCount: cases.filter((item) => item.oracle.status === 'INFEASIBLE').length,
      indeterminateLimitCount: cases.filter((item) => item.oracle.status === 'INDETERMINATE_LIMIT').length,
      demonstratedGreedyFalseNegativeCount: cases.filter((item) => (
        item.oracle.status === 'FEASIBLE' && item.legacyGreedy?.status === 'BLOCKED'
      )).length,
    },
    cases,
  };

  const output = path.resolve(options.output);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const text = `${JSON.stringify(result, null, 2)}\n`;
  fs.writeFileSync(output, text, 'utf8');
  process.stdout.write(text);
}

main();

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  LEFT_HAND_MAXIMUM_EXTRA_FRET_REACH,
  LEFT_HAND_MAXIMUM_STATIC_FRET_SPAN,
  evaluateIndependentLeftHandFeasibility,
} from '../src/guitar/leftHandFeasibilityOracle.js';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PINNED_ENGINE_SHA = '1d8ced644f544f7e991f7275eda77a2ce557774e';
const STANDARD_OPEN_MIDI = Object.freeze({ 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 });

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const options = { engineRoot: null, output: null, assertExpectations: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--engine-root') {
      options.engineRoot = argv[index + 1] || null;
      index += 1;
    } else if (token === '--output') {
      options.output = argv[index + 1] || null;
      index += 1;
    } else if (token === '--assert-expectations') {
      options.assertExpectations = true;
    } else {
      fail(`Unknown argument: ${token}`);
    }
  }
  if (!options.engineRoot || !options.output) {
    fail('Usage: node scripts/run-v3b-left-hand-benchmark.mjs --engine-root <path> --output <file> [--assert-expectations]');
  }
  return options;
}

function gitHead(root) {
  return execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

function exactFingeringConstraints(positions) {
  const constrained = positions.filter((position) => position.requiredFinger !== undefined);
  if (constrained.length === 0) return null;
  const index = Object.create(null);
  for (const position of constrained) {
    Object.defineProperty(index, position.positionId, {
      value: position.requiredFinger,
      enumerable: true,
      writable: false,
      configurable: false,
    });
  }
  Object.freeze(index);
  return Object.freeze({
    documentType: 'ExactGuitarFingeringConstraints',
    contractVersion: '1.0.0',
    authority: 'EXPLICIT_SOURCE_GUITAR_FINGERING_ONLY',
    constraintCount: constrained.length,
    bySourceEventId: index,
  });
}

function enginePositions(positions) {
  return Object.freeze(positions.map((position) => Object.freeze({
    sourceEventId: position.positionId,
    targetMidi: STANDARD_OPEN_MIDI[position.string] + position.fret,
    string: position.string,
    fret: position.fret,
  })));
}

function engineObservation(item, engineModules) {
  const positions = enginePositions(item.positions);
  const counters = { shapeCandidates: 0, assignmentAttempts: 0 };
  const shapes = engineModules.enumerateStaticLeftHandShapeCandidatesFromPositions(
    `${item.caseId}:candidate`,
    positions,
    null,
    counters,
    item.caseId,
    exactFingeringConstraints(item.positions),
  );
  const verdicts = shapes.map((shape) => engineModules.evaluateStaticLeftHandShapeCandidate(
    shape,
    positions,
    `${item.caseId}:candidate`,
    item.caseId,
    {},
  ));
  const playable = verdicts.filter((verdict) => verdict.status === engineModules.PLAYABILITY_STATUS.PLAYABLE_WITHIN_POLICY);
  const rejectionReasons = [...new Set(verdicts.flatMap((verdict) => verdict.reasonCodes))].sort();
  return {
    normalizedStatus: playable.length > 0 ? 'FEASIBLE' : 'INFEASIBLE',
    shapeCandidateCount: shapes.length,
    playableShapeCount: playable.length,
    rejectedShapeCount: verdicts.length - playable.length,
    rejectionReasons,
    assignmentAttemptCount: counters.assignmentAttempts,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const engineRoot = path.resolve(options.engineRoot);
  if (gitHead(engineRoot) !== PINNED_ENGINE_SHA) {
    fail(`ENGINE_PROVENANCE_MISMATCH expected ${PINNED_ENGINE_SHA}, observed ${gitHead(engineRoot)}`);
  }

  const fixture = JSON.parse(fs.readFileSync(
    path.join(repoRoot, 'fixtures/v3b/left-hand-benchmark.json'),
    'utf8',
  ));
  if (
    fixture.documentType !== 'GuitarPolyphonyV3BLeftHandBenchmark'
    || fixture.contractVersion !== '1.0.0'
    || !Array.isArray(fixture.cases)
  ) {
    fail('Invalid V3B left-hand benchmark contract.');
  }

  const leftHandShape = require(path.join(engineRoot, 'src/music/leftHandShapeModel.js'));
  const physical = require(path.join(engineRoot, 'src/music/physicalPlayabilityValidatorV2.js'));
  if (
    physical.MAXIMUM_STATIC_FRET_SPAN !== LEFT_HAND_MAXIMUM_STATIC_FRET_SPAN
    || physical.MAXIMUM_EXTRA_FRET_REACH !== LEFT_HAND_MAXIMUM_EXTRA_FRET_REACH
  ) {
    fail('ENGINE_LEFT_HAND_POLICY_DRIFT pinned Engine thresholds diverge from the explicit V3B comparison policy.');
  }

  const engineModules = {
    enumerateStaticLeftHandShapeCandidatesFromPositions: leftHandShape.enumerateStaticLeftHandShapeCandidatesFromPositions,
    evaluateStaticLeftHandShapeCandidate: physical.evaluateStaticLeftHandShapeCandidate,
    PLAYABILITY_STATUS: physical.PLAYABILITY_STATUS,
  };

  const cases = fixture.cases.map((item) => {
    const lab = evaluateIndependentLeftHandFeasibility(item.positions, item.options || {});
    const engine = item.compareWithEngine ? engineObservation(item, engineModules) : null;
    const parity = engine === null ? null : lab.status === engine.normalizedStatus;

    if (options.assertExpectations) {
      assert.equal(lab.status, item.expectedLab.status, `${item.caseId}.lab.status`);
      assert.equal(lab.reason, item.expectedLab.reason, `${item.caseId}.lab.reason`);
      if (item.compareWithEngine) {
        assert.equal(parity, true, `${item.caseId}.lab-engine-parity`);
      }
    }

    return {
      caseId: item.caseId,
      compareWithEngine: item.compareWithEngine,
      lab: {
        status: lab.status,
        reason: lab.reason,
        assignmentAttempts: lab.assignmentAttempts,
        structurallyValidShapeCount: lab.structurallyValidShapeCount,
        policyRejectedShapeCount: lab.policyRejectedShapeCount,
        witnessBarreCount: lab.witness?.barres?.length ?? 0,
      },
      engine,
      statusParity: parity,
    };
  });

  const comparable = cases.filter((item) => item.compareWithEngine);
  const result = {
    documentType: 'GuitarPolyphonyV3BLeftHandBenchmarkReport',
    contractVersion: '1.0.0',
    productionAuthority: false,
    comparisonPolicy: {
      labImplementationIndependent: true,
      pinnedEngineUsedAsComparisonTargetOnly: true,
      engineCommitSha: PINNED_ENGINE_SHA,
      maximumStaticFretSpan: LEFT_HAND_MAXIMUM_STATIC_FRET_SPAN,
      maximumExtraFretReach: LEFT_HAND_MAXIMUM_EXTRA_FRET_REACH,
    },
    summary: {
      caseCount: cases.length,
      crossRepoComparableCaseCount: comparable.length,
      crossRepoStatusParityCount: comparable.filter((item) => item.statusParity === true).length,
      labFeasibleCount: cases.filter((item) => item.lab.status === 'FEASIBLE').length,
      labInfeasibleCount: cases.filter((item) => item.lab.status === 'INFEASIBLE').length,
      labIndeterminateLimitCount: cases.filter((item) => item.lab.status === 'INDETERMINATE_LIMIT').length,
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

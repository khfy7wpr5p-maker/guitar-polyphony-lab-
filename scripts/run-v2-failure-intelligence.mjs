import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  V2_FAILURE_INTELLIGENCE_CONTRACT_VERSION,
  assertNoSemanticGlobalBlock,
  classifyObservedFailure,
} from '../src/failures/v2FailureIntelligence.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHA256 = /^[a-f0-9]{64}$/;

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const options = { engineRoot: null, output: null, assertCovered: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--engine-root') {
      options.engineRoot = argv[index + 1] || null;
      index += 1;
    } else if (token === '--output') {
      options.output = argv[index + 1] || null;
      index += 1;
    } else if (token === '--assert-covered') {
      options.assertCovered = true;
    } else {
      fail(`Unknown argument: ${token}`);
    }
  }
  if (!options.engineRoot || !options.output) {
    fail('Usage: node scripts/run-v2-failure-intelligence.mjs --engine-root <path> --output <file> [--assert-covered]');
  }
  return options;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function gitHead(root) {
  return execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

function loadV1C() {
  const reportPath = path.join(repoRoot, 'artifacts/v1c/capability-report.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  if (report.documentType !== 'GuitarPolyphonyV1CCapabilityReport' || report.contractVersion !== '2.0.0') {
    fail('V2 requires V1C capability report contract 2.0.0.');
  }
  if (!Array.isArray(report.caseShards) || report.caseShards.length === 0) {
    fail('V1C report must expose committed case shards.');
  }
  const cases = [];
  for (const shardRef of report.caseShards) {
    if (!SHA256.test(shardRef.sha256 || '')) fail(`Invalid V1C shard hash for ${shardRef.path}`);
    const shardPath = path.resolve(repoRoot, shardRef.path);
    if (!shardPath.startsWith(`${repoRoot}${path.sep}`)) fail(`V1C shard path escapes repository: ${shardRef.path}`);
    const bytes = fs.readFileSync(shardPath);
    const observedHash = sha256(bytes);
    if (observedHash !== shardRef.sha256) {
      fail(`V1C shard hash mismatch for ${shardRef.path}: expected ${shardRef.sha256}, observed ${observedHash}`);
    }
    const shard = JSON.parse(bytes.toString('utf8'));
    if (shard.documentType !== 'GuitarPolyphonyV1CCapabilityCaseShard' || shard.contractVersion !== '2.0.0') {
      fail(`Invalid V1C case shard contract: ${shardRef.path}`);
    }
    if (!Array.isArray(shard.cases) || shard.cases.length !== shardRef.caseCount) {
      fail(`V1C shard case count mismatch: ${shardRef.path}`);
    }
    cases.push(...shard.cases);
  }
  if (cases.length !== report.summary.caseCount) {
    fail(`V1C total case count mismatch: expected ${report.summary.caseCount}, observed ${cases.length}`);
  }
  return { report, cases };
}

function classifyCaseFailures(item) {
  const observations = [];
  const slots = [
    ['LAB', 'RAW_INPUT', item.rawInput?.lab],
    ['ENGINE', 'RAW_INPUT', item.rawInput?.engine],
    ['LAB', 'SEMANTIC_PROBE', item.semanticProbe?.lab],
    ['ENGINE', 'SEMANTIC_PROBE', item.semanticProbe?.engine],
  ];
  for (const [provider, phase, outcome] of slots) {
    if (outcome?.status !== 'UNSUPPORTED_LOCAL') continue;
    const classification = assertNoSemanticGlobalBlock(classifyObservedFailure({
      provider,
      phase,
      errorCode: outcome.errorCode,
    }));
    observations.push({
      caseId: item.caseId,
      category: item.category,
      featureTags: item.featureTags,
      classification,
    });
  }
  return observations;
}

function verifyAnchor(anchor, errorCode, engineRoot) {
  const root = anchor.repository === 'LAB'
    ? repoRoot
    : anchor.repository === 'ENGINE'
      ? engineRoot
      : null;
  if (!root) fail(`Unknown source-anchor repository ${anchor.repository}`);
  const target = path.resolve(root, anchor.path);
  if (!target.startsWith(`${root}${path.sep}`)) fail(`Source-anchor path escape: ${anchor.path}`);
  const text = fs.readFileSync(target, 'utf8');
  if (!text.includes(errorCode)) {
    fail(`Source anchor ${anchor.repository}:${anchor.path} does not contain ${errorCode}`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const engineRoot = path.resolve(options.engineRoot);
  const { report: v1cReport, cases } = loadV1C();
  if (gitHead(engineRoot) !== v1cReport.engineCommitSha) {
    fail(`ENGINE_PROVENANCE_MISMATCH expected ${v1cReport.engineCommitSha}, observed ${gitHead(engineRoot)}`);
  }

  const observations = cases.flatMap(classifyCaseFailures);
  const groups = new Map();
  for (const observation of observations) {
    const c = observation.classification;
    if (options.assertCovered && c.failureFamily === 'UNCLASSIFIED_FAILURE') {
      fail(`UNCLASSIFIED_V2_FAILURE ${c.provider}:${c.phase}:${c.errorCode}`);
    }
    for (const anchor of c.sourceAnchors) verifyAnchor(anchor, c.errorCode, engineRoot);
    const key = `${c.provider}:${c.phase}:${c.errorCode}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        provider: c.provider,
        phase: c.phase,
        errorCode: c.errorCode,
        failureFamily: c.failureFamily,
        layer: c.layer,
        scopeClass: c.scopeClass,
        handlingClass: c.handlingClass,
        progressiveStateCandidate: c.progressiveStateCandidate,
        refinementRequired: c.refinementRequired,
        evidencePrecision: c.evidencePrecision,
        sourceAnchors: c.sourceAnchors,
        caseIds: [],
        observedCaseCategories: [],
        observedFeatureTags: [],
      };
      groups.set(key, group);
    }
    group.caseIds.push(observation.caseId);
    group.observedCaseCategories.push(observation.category);
    group.observedFeatureTags.push(...observation.featureTags);
  }

  const normalizedGroups = [...groups.values()]
    .map((group) => ({
      ...group,
      caseIds: [...new Set(group.caseIds)].sort(),
      observedCaseCategories: [...new Set(group.observedCaseCategories)].sort(),
      observedFeatureTags: [...new Set(group.observedFeatureTags)].sort(),
      observationCount: group.caseIds.length,
    }))
    .sort((a, b) => (
      `${a.phase}:${a.provider}:${a.errorCode}`.localeCompare(`${b.phase}:${b.provider}:${b.errorCode}`)
    ));

  const count = (predicate) => observations.filter(predicate).length;
  const familyCounts = {};
  for (const observation of observations) {
    const family = observation.classification.failureFamily;
    familyCounts[family] = (familyCounts[family] || 0) + 1;
  }
  const sortedFamilyCounts = Object.fromEntries(Object.entries(familyCounts).sort(([a], [b]) => a.localeCompare(b)));

  const result = {
    documentType: 'GuitarPolyphonyV2FailureIntelligenceReport',
    contractVersion: V2_FAILURE_INTELLIGENCE_CONTRACT_VERSION,
    sourceEvidence: {
      stage: 'V1C',
      caseCount: cases.length,
      externalRepository: v1cReport.sourceRepository,
      externalCommitSha: v1cReport.sourceCommitSha,
      engineRepository: v1cReport.engineRepository,
      engineCommitSha: v1cReport.engineCommitSha,
    },
    policy: {
      productionAuthority: false,
      productionBehaviorChanged: false,
      caseMetadataIsContextNotCause: true,
      semanticProbeGlobalBlockForbidden: true,
      unknownGenericProjectionCauseMustRemainUnrefined: true,
      rawTrustBoundaryMayRejectGlobally: true,
    },
    summary: {
      failureObservationCount: observations.length,
      rawInputFailureCount: count((item) => item.classification.phase === 'RAW_INPUT'),
      semanticProbeFailureCount: count((item) => item.classification.phase === 'SEMANTIC_PROBE'),
      globalTrustRejectCount: count((item) => item.classification.handlingClass === 'GLOBAL_TRUST_REJECT'),
      semanticReviewCandidateCount: count((item) => (
        item.classification.phase === 'SEMANTIC_PROBE'
        && item.classification.progressiveStateCandidate === 'REVIEW_REQUIRED'
      )),
      semanticUnsupportedLocalCount: count((item) => (
        item.classification.phase === 'SEMANTIC_PROBE'
        && item.classification.progressiveStateCandidate === 'UNSUPPORTED_LOCAL'
      )),
      refinementRequiredCount: count((item) => item.classification.refinementRequired === true),
      unclassifiedCount: count((item) => item.classification.failureFamily === 'UNCLASSIFIED_FAILURE'),
      familyCounts: sortedFamilyCounts,
    },
    groups: normalizedGroups,
  };

  const output = path.resolve(options.output);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const text = `${JSON.stringify(result, null, 2)}\n`;
  fs.writeFileSync(output, text, 'utf8');
  process.stdout.write(text);
}

main();

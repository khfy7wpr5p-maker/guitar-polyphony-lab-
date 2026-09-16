import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  V2B_PROJECTION_REFINEMENT_CONTRACT_VERSION,
  refineGenericProjectionFailure,
} from '../src/failures/v2bProjectionRefinement.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) { throw new Error(message); }

function parseArgs(argv) {
  const options = { externalRoot: null, engineRoot: null, output: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--external-root') { options.externalRoot = argv[index + 1] || null; index += 1; }
    else if (token === '--engine-root') { options.engineRoot = argv[index + 1] || null; index += 1; }
    else if (token === '--output') { options.output = argv[index + 1] || null; index += 1; }
    else fail(`Unknown argument: ${token}`);
  }
  if (!options.externalRoot || !options.engineRoot || !options.output) {
    fail('Usage: node scripts/run-v2b-projection-refinement.mjs --external-root <path> --engine-root <path> --output <file>');
  }
  return options;
}

function increment(map, key) { map[key] = (map[key] || 0) + 1; }
function sortedObject(map) { return Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b))); }

function main() {
  const options = parseArgs(process.argv.slice(2));
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'guitar-polyphony-v2b-'));
  const discoveryPath = path.join(temporaryDirectory, 'discovery.json');
  try {
    execFileSync(process.execPath, [
      path.join(repoRoot, 'scripts/run-v2b-projection-refinement-discovery.mjs'),
      '--external-root', options.externalRoot,
      '--engine-root', options.engineRoot,
      '--output', discoveryPath,
    ], { cwd: repoRoot, stdio: ['ignore', 'ignore', 'inherit'] });

    const discovery = JSON.parse(fs.readFileSync(discoveryPath, 'utf8'));
    if (
      discovery.documentType !== 'GuitarPolyphonyV2BProjectionRefinementDiscovery'
      || discovery.contractVersion !== '1.1.0'
      || discovery.discoveryOnly !== true
      || discovery.productionAuthority !== false
    ) {
      fail('V2B refinement requires discovery contract 1.1.0 with non-production authority.');
    }
    if (!Array.isArray(discovery.cases) || discovery.cases.length !== 6) {
      fail(`V2B expected six discovery cases, observed ${discovery.cases?.length ?? 'invalid'}`);
    }

    const familyCounts = {};
    const scopeCounts = {};
    const cases = discovery.cases.map((item) => {
      const refinement = refineGenericProjectionFailure({
        errorCode: item.observation.errorCode,
        observedFeature: item.observation.observedFeature,
        details: item.observation.details,
        sourceOccurrences: item.observation.sourceOccurrences,
      });
      if (refinement.progressiveStateCandidate === 'BLOCKED_GLOBAL') {
        fail(`V2B_SEMANTIC_GLOBAL_BLOCK_FORBIDDEN ${item.caseId}`);
      }
      increment(familyCounts, refinement.failureFamily);
      increment(scopeCounts, refinement.scopeClass);
      return {
        caseId: item.caseId,
        sourcePath: item.sourcePath,
        semanticProbeSha256: item.semanticProbeSha256,
        engineObservation: {
          errorCode: item.observation.errorCode,
          errorName: item.observation.errorName,
          observedFeature: item.observation.observedFeature,
          details: item.observation.details,
          locationEvidence: item.observation.locationEvidence,
        },
        sourceOccurrences: item.observation.sourceOccurrences,
        refinement,
      };
    });

    const result = {
      documentType: 'GuitarPolyphonyV2BProjectionRefinementReport',
      contractVersion: V2B_PROJECTION_REFINEMENT_CONTRACT_VERSION,
      sourceEvidence: discovery.sourceEvidence,
      policy: {
        productionAuthority: false,
        productionBehaviorChanged: false,
        automaticRecoveryAuthorized: false,
        semanticGlobalBlockForbidden: true,
        fixtureMetadataIsContextNotCause: true,
        sourceSubtypeEvidenceIsContextNotEngineCause: true,
        exactEngineOrSourceLocationRequiredForSingleOccurrenceScope: true,
      },
      summary: {
        caseCount: cases.length,
        exactLocalScopeCount: cases.filter((item) => item.refinement.refinementRequired === false).length,
        remainingLocationRefinementRequiredCount: cases.filter((item) => item.refinement.refinementRequired === true).length,
        reviewRequiredCandidateCount: cases.filter((item) => item.refinement.progressiveStateCandidate === 'REVIEW_REQUIRED').length,
        unsupportedLocalCount: cases.filter((item) => item.refinement.progressiveStateCandidate === 'UNSUPPORTED_LOCAL').length,
        blockedGlobalCount: cases.filter((item) => item.refinement.progressiveStateCandidate === 'BLOCKED_GLOBAL').length,
        familyCounts: sortedObject(familyCounts),
        scopeCounts: sortedObject(scopeCounts),
      },
      cases,
    };

    if (
      result.summary.caseCount !== 6
      || result.summary.exactLocalScopeCount !== 4
      || result.summary.remainingLocationRefinementRequiredCount !== 2
      || result.summary.reviewRequiredCandidateCount !== 6
      || result.summary.unsupportedLocalCount !== 0
      || result.summary.blockedGlobalCount !== 0
    ) {
      fail(`V2B_REFINEMENT_BASELINE_DRIFT ${JSON.stringify(result.summary)}`);
    }

    const output = path.resolve(options.output);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    const text = `${JSON.stringify(result, null, 2)}\n`;
    fs.writeFileSync(output, text, 'utf8');
    process.stdout.write(text);
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

main();

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const engineRootIndex = process.argv.indexOf('--engine-root');
const engineRoot = path.resolve(
  engineRootIndex >= 0 ? process.argv[engineRootIndex + 1] : '.v1b-engine',
);
const contract = JSON.parse(
  fs.readFileSync('fixtures/a3/production-integration-contract.json', 'utf8'),
);
const baseline = JSON.parse(
  fs.readFileSync('artifacts/a3/real-piano-corpus-baseline.json', 'utf8'),
);

assert.equal(contract.documentType, 'A3ProductionIntegrationContract');
assert.equal(contract.contractVersion, '1.0.0');
assert.equal(contract.authority.labProductionAuthority, false);
assert.equal(contract.authority.canonicalTabAuthority, 'MUSICXML_TO_GUITAR_TAB_ENGINE_ONLY');
assert.equal(contract.authority.firstSliceResultStatus, 'REVIEW_REQUIRED');
assert.equal(contract.authority.firstSliceExportAllowed, false);
assert.equal(contract.authority.firstSliceCanonicalTabAvailable, false);
assert.equal(contract.authority.provisionalTabRequiredWhenSafe, true);
assert.equal(contract.authority.sourceMutationAllowed, false);

assert.equal(baseline.productionAuthority, false);
assert.equal(baseline.sourceNoteLossAllowed, false);
assert.equal(baseline.summary.caseCount, contract.labEvidence.requiredCaseCount);
assert.equal(baseline.summary.probeSupportedCount, contract.labEvidence.requiredSupportedCount);
assert.equal(baseline.summary.probeUnsupportedCount, contract.labEvidence.requiredUnsupportedCount);
assert.equal(contract.labEvidence.requiredSupportedCount, 5);
assert.equal(contract.labEvidence.requiredUnsupportedCount, 0);
assert.equal(contract.labEvidence.sourceNoteLossAllowed, false);
assert.equal(contract.labEvidence.targetTimingAuthority, false);

const observedEngineHead = execFileSync(
  'git',
  ['-C', engineRoot, 'rev-parse', 'HEAD'],
  { encoding: 'utf8' },
).trim();
assert.equal(observedEngineHead, contract.productionTarget.commitSha);

for (const relativePath of contract.productionTarget.requiredSeams) {
  const resolved = path.resolve(engineRoot, relativePath);
  assert.ok(
    resolved.startsWith(`${engineRoot}${path.sep}`),
    `Production seam escapes engine root: ${relativePath}`,
  );
  assert.ok(fs.statSync(resolved).isFile(), `Missing production seam: ${relativePath}`);
}

const reviewContract = fs.readFileSync(
  path.join(engineRoot, 'src/app/reviewRequiredCapabilityContract.js'),
  'utf8',
);
assert.match(
  reviewContract,
  new RegExp(`REVIEW_REQUIRED_CAPABILITY_CONTRACT_VERSION = '${contract.productionTarget.existingContracts.reviewRequiredCapabilityContract}'`),
);
assert.match(
  reviewContract,
  new RegExp(`MUSICXML_UPLOAD_RESULT_SCHEMA_VERSION = '${contract.productionTarget.existingContracts.musicXmlUploadResultSchema}'`),
);
assert.match(reviewContract, /capabilities = \{/);
assert.match(reviewContract, /export: passed && Boolean\(result\.canonicalTabResult\)/);

const partialArrangement = fs.readFileSync(
  path.join(engineRoot, 'src/app/partialGuitarArrangement.js'),
  'utf8',
);
assert.match(
  partialArrangement,
  new RegExp(`PARTIAL_GUITAR_ARRANGEMENT_VERSION = '${contract.productionTarget.existingContracts.partialGuitarTabArrangement}'`),
);
assert.match(
  partialArrangement,
  new RegExp(`REVIEW_EDITABLE_PROJECTION_VERSION = '${contract.productionTarget.existingContracts.reviewEditableTabProjection}'`),
);
assert.match(partialArrangement, /PROVISIONAL_REVIEW_ONLY/);

const sourceModel = fs.readFileSync(
  path.join(engineRoot, 'src/music/polyphonicSourceModel.js'),
  'utf8',
);
assert.match(
  sourceModel,
  new RegExp(`POLYPHONIC_SOURCE_MODEL_VERSION = '${contract.productionTarget.existingContracts.polyphonicSourceModel}'`),
);
assert.match(sourceModel, /return `\$\{partId\}:measure:\$\{measureIndex\}:note:\$\{noteIndex\}`;/);

const simultaneousModel = fs.readFileSync(
  path.join(engineRoot, 'src/music/simultaneousEventModel.js'),
  'utf8',
);
assert.match(simultaneousModel, /return `\$\{measureId\}:simultaneous:\$\{onsetDivisions\}`;/);

const semanticProfile = fs.readFileSync(
  path.join(engineRoot, 'docs/pa-2-3-semantic-profile-contract.md'),
  'utf8',
);
assert.match(semanticProfile, /tied type="let-ring"/);
assert.match(semanticProfile, /not equivalent to a normal tie/);
assert.equal(contract.notationCompatibility.letRing.productionStatusAtPinnedCommit, 'UNSUPPORTED');
assert.equal(contract.notationCompatibility.letRing.setTieStart, false);
assert.equal(contract.notationCompatibility.letRing.setTieStop, false);
assert.equal(contract.notationCompatibility.letRing.mayCreateSustainTieChain, false);

const arpeggiated = contract.transformAdoption.ARPEGGIATED;
assert.equal(arpeggiated.state, 'FIRST_SLICE_NEW_REVIEW_ONLY_CAPABILITY');
assert.equal(arpeggiated.sourceGroupMustBeProvenSimultaneous, true);
assert.equal(arpeggiated.allSourceEventsMustBeCovered, true);
assert.equal(arpeggiated.sourceNoteLossAllowed, false);
assert.equal(arpeggiated.spreadDivisions, 1);
assert.equal(arpeggiated.targetTimingAuthority, false);
assert.equal(arpeggiated.physicalRevalidationRequired, true);
assert.equal(arpeggiated.candidateOrderIsPreferenceRank, false);
assert.equal(arpeggiated.automaticCanonicalAuthority, false);

assert.deepEqual(contract.firstMigrationSlice.orderedRecoveryPolicy, [
  'STRICT_CANONICAL_SELECTION',
  'NO_LOSS_ARPEGGIATION_REVIEW_RECOVERY',
  'EXISTING_BOUNDED_REDUCTION_REVIEW_FALLBACK',
]);
assert.equal(contract.firstMigrationSlice.result.status, 'REVIEW_REQUIRED');
assert.equal(contract.firstMigrationSlice.result.canonicalTabResult, null);
assert.equal(contract.firstMigrationSlice.result.generateTab, true);
assert.equal(contract.firstMigrationSlice.result.export, false);
assert.equal(contract.firstMigrationSlice.provisionalSelectionIsMusicalRanking, false);
assert.equal(contract.hardBlockBoundary.localArrangementFailureMustNotAutomaticallyBecomeGlobalBlock, true);
assert.equal(contract.hardBlockBoundary.boundedCandidateExhaustionIsPhysicalImpossibility, false);

console.log(`A3 production integration contract verified against Engine ${observedEngineHead}.`);

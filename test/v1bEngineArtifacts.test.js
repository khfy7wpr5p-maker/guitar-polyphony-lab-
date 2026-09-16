import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import {
  adaptEnginePolyphonicSourceModel,
  buildLabSemanticSnapshot,
  compareSemanticSnapshots,
} from '../src/verification/semanticComparator.js';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const evidenceRoot = resolve(repoRoot, 'artifacts/v1b-engine');
const manifestBytes = readFileSync(resolve(evidenceRoot, 'manifest.json'));
const manifest = JSON.parse(manifestBytes.toString('utf8'));

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

test('V1B manifest pins the real Engine projector identity and two approved fixtures', () => {
  assert.equal(manifest.documentType, 'GuitarPolyphonyLabV1BEngineArtifactManifest');
  assert.equal(manifest.contractVersion, '1.0.0');
  assert.equal(manifest.generationPolicy, 'real-pinned-engine-projector');
  assert.equal(manifest.engineRepository, 'khfy7wpr5p-maker/musicxml-to-guitar-tab-engine');
  assert.equal(manifest.engineCommitSha, '1d8ced644f544f7e991f7275eda77a2ce557774e');
  assert.equal(manifest.artifacts.length, 2);
});

for (const evidence of manifest.artifacts) {
  test(`V1B real Engine artifact matches Lab source semantics: ${evidence.fixturePath}`, () => {
    const fixtureBytes = readFileSync(resolve(repoRoot, evidence.fixturePath));
    const artifactBytes = readFileSync(resolve(evidenceRoot, evidence.artifactFile));

    assert.equal(sha256(fixtureBytes), evidence.fixtureSha256);
    assert.equal(sha256(artifactBytes), evidence.artifactSha256);
    assert.equal(evidence.engineRepository, manifest.engineRepository);
    assert.equal(evidence.engineCommitSha, manifest.engineCommitSha);
    assert.equal(evidence.engineDocumentType, 'PolyphonicSourceModel');
    assert.equal(evidence.engineContractVersion, '1.0.0');

    const engineModel = JSON.parse(artifactBytes.toString('utf8'));
    const labSnapshot = buildLabSemanticSnapshot(fixtureBytes.toString('utf8'), {
      partId: engineModel.source.partId,
    });
    const engineSnapshot = adaptEnginePolyphonicSourceModel(engineModel);
    const comparison = compareSemanticSnapshots(labSnapshot, engineSnapshot);

    assert.equal(
      comparison.equal,
      true,
      `semantic mismatches: ${JSON.stringify(comparison.mismatches)}`,
    );
    assert.equal(comparison.mismatchCount, 0);
  });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import {
  CORPUS_REGISTRY_SCHEMA_VERSION,
  validateCorpusRegistry,
} from '../src/corpus/corpusRegistry.js';

const manifestUrl = new URL('../fixtures/compat/manifest.json', import.meta.url);

async function loadManifest() {
  return JSON.parse(await readFile(manifestUrl, 'utf8'));
}

test('V1A corpus registry requires versioned provenance and semantic expectation fields', async () => {
  const manifest = await loadManifest();
  const registry = validateCorpusRegistry(manifest);

  assert.equal(CORPUS_REGISTRY_SCHEMA_VERSION, 2);
  assert.equal(registry.schemaVersion, 2);
  assert.equal(registry.fixtures.length, 2);

  const requiredFields = [
    'fixtureId',
    'source',
    'sourceUrl',
    'license',
    'licenseNotice',
    'sourceSha256',
    'musicXmlVersion',
    'category',
    'expectedVoices',
    'expectedPeakPolyphony',
    'expectedTies',
    'expectedSustainedOverlap',
    'expectedEngineStatus',
    'expectedFailureCode',
    'expectedSemanticVectorVersion',
  ];

  for (const fixture of registry.fixtures) {
    for (const field of requiredFields) {
      assert.ok(Object.hasOwn(fixture, field), `${fixture.path} missing ${field}`);
    }
    assert.equal(Object.isFrozen(fixture), true);
  }
});

test('V1A corpus registry SHA-256 values match fixture bytes exactly', async () => {
  const registry = validateCorpusRegistry(await loadManifest());

  for (const fixture of registry.fixtures) {
    const fixtureUrl = new URL(`../${fixture.path}`, manifestUrl);
    const bytes = await readFile(fixtureUrl);
    const observed = createHash('sha256').update(bytes).digest('hex');
    assert.equal(observed, fixture.sourceSha256, fixture.fixtureId);
  }
});

test('V1A corpus registry records current internal corpus semantics without inventing Engine outcomes', async () => {
  const registry = validateCorpusRegistry(await loadManifest());
  const byId = new Map(registry.fixtures.map((fixture) => [fixture.fixtureId, fixture]));

  assert.deepEqual(
    {
      voices: byId.get('ps6-counterpoint-2v').expectedVoices,
      peak: byId.get('ps6-counterpoint-2v').expectedPeakPolyphony,
      ties: byId.get('ps6-counterpoint-2v').expectedTies,
      overlap: byId.get('ps6-counterpoint-2v').expectedSustainedOverlap,
    },
    { voices: 2, peak: 2, ties: false, overlap: true },
  );
  assert.deepEqual(
    {
      voices: byId.get('ps6-counterpoint-4v-tie').expectedVoices,
      peak: byId.get('ps6-counterpoint-4v-tie').expectedPeakPolyphony,
      ties: byId.get('ps6-counterpoint-4v-tie').expectedTies,
      overlap: byId.get('ps6-counterpoint-4v-tie').expectedSustainedOverlap,
    },
    { voices: 4, peak: 4, ties: true, overlap: true },
  );

  for (const fixture of registry.fixtures) {
    assert.equal(fixture.expectedEngineStatus, 'NOT_YET_GATED');
    assert.equal(fixture.expectedFailureCode, null);
    assert.equal(fixture.expectedSemanticVectorVersion, 'LAB_SEMANTIC_VECTOR_1.0.0');
  }
});

test('V1A corpus registry fails closed on missing license, malformed hash, duplicate id or external source without https', async () => {
  const manifest = await loadManifest();

  for (const mutation of [
    (copy) => { delete copy.fixtures[0].license; },
    (copy) => { copy.fixtures[0].sourceSha256 = 'not-a-sha256'; },
    (copy) => { copy.fixtures[1].fixtureId = copy.fixtures[0].fixtureId; },
    (copy) => { copy.fixtures[0].sourceUrl = 'http://example.invalid/fixture.musicxml'; },
  ]) {
    const copy = structuredClone(manifest);
    mutation(copy);
    assert.throws(
      () => validateCorpusRegistry(copy),
      (error) => error && error.code === 'INVALID_CORPUS_REGISTRY',
    );
  }
});

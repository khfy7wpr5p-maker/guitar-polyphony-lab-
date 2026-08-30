import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const taxonomyUrl = new URL('../TECHNIQUE_TAXONOMY.json', import.meta.url);
const fixtureIndexUrl = new URL('../fixtures/techniques/index.json', import.meta.url);

async function readJson(url) {
  return JSON.parse(await readFile(url, 'utf8'));
}

test('technique taxonomy keeps incomplete corpus evidence fail-closed', async () => {
  const taxonomy = await readJson(taxonomyUrl);
  assert.equal(taxonomy.stage, 'LAB-TECH-01');
  assert.equal(taxonomy.evidencePolicy.sourceCorpusCommitted, false);
  assert.ok(taxonomy.techniques.length >= 4);

  for (const technique of taxonomy.techniques) {
    assert.ok(technique.id);
    assert.ok(technique.kind);
    assert.ok(technique.producer);
    assert.ok(technique.xmlPath);
    assert.ok(technique.evidenceStatus);
    assert.ok(technique.capabilityClass);
    assert.ok(technique.normalizedSemantics);
    assert.ok(technique.observedCorpus.length > 0);
    assert.ok(technique.observedCorpus.every((entry) => entry.committed === false));

    if (technique.evidenceStatus !== 'EXACT_RETAINED_AUDIT') {
      assert.equal(technique.capabilityClass, 'BLOCKED_UNKNOWN_OR_AMBIGUOUS');
      assert.equal(technique.normalizedSemantics, 'UNKNOWN');
    }
  }
});

test('LAB-TECH-01 does not grant physical solver authority', async () => {
  const taxonomy = await readJson(taxonomyUrl);
  assert.equal(
    taxonomy.techniques.some((technique) => technique.capabilityClass === 'PHYSICAL_SEMANTICS_SUPPORTED'),
    false,
  );
  assert.ok(
    taxonomy.techniques
      .filter((technique) => technique.capabilityClass === 'SAFE_METADATA_ONLY')
      .every((technique) => technique.physicalSemantics === 'NOT_PROVEN'),
  );
});

test('fixture index separates synthetic lawful fixtures from external corpus provenance', async () => {
  const index = await readJson(fixtureIndexUrl);
  const synthetic = index.entries.filter((entry) => entry.sourceType === 'SYNTHETIC_MINIMAL');
  const external = index.entries.filter((entry) => entry.sourceType === 'EXTERNAL_REAL_CORPUS');

  assert.equal(synthetic.length, 2);
  assert.equal(external.length, 3);
  assert.ok(synthetic.every((entry) => entry.lawfulFixture === true));
  assert.ok(external.every((entry) => entry.committed === false && /^[a-f0-9]{64}$/.test(entry.sha256)));
});

test('synthetic fixtures pin only the two exact retained safe shapes', async () => {
  const harmonic = await readFile(
    new URL('../fixtures/techniques/guitar-pro-7.6.0-empty-technical-harmonic.musicxml', import.meta.url),
    'utf8',
  );
  const mute = await readFile(
    new URL('../fixtures/techniques/guitar-pro-7.6.0-play-straight-mute.musicxml', import.meta.url),
    'utf8',
  );

  assert.match(harmonic, /<technical>[\s\S]*<harmonic\/>[\s\S]*<string>1<\/string>[\s\S]*<fret>0<\/fret>[\s\S]*<\/technical>/);
  assert.doesNotMatch(harmonic, /<natural\s*\/>|<artificial\s*\/>|<hammer-on|<pull-off|<slide|<bend/);
  assert.match(mute, /<play><mute>straight<\/mute><\/play>/);
  assert.doesNotMatch(mute, /<mute>palm<\/mute>|<let-ring|<tap/);
});

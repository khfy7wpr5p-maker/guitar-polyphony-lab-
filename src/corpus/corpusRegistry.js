const CORPUS_REGISTRY_SCHEMA_VERSION = 2;
const CORPUS_REGISTRY_ERROR_CODE = 'INVALID_CORPUS_REGISTRY';

const REQUIRED_FIXTURE_FIELDS = Object.freeze([
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
]);

class CorpusRegistryError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'CorpusRegistryError';
    this.code = CORPUS_REGISTRY_ERROR_CODE;
    this.details = Object.freeze({ ...details });
  }
}

function invalid(message, details = {}) {
  return new CorpusRegistryError(message, details);
}

function assertRecord(value, path) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw invalid('Corpus registry value must be an object.', { path });
  }
}

function assertNonEmptyString(value, path) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) {
    throw invalid('Corpus registry field must be a bounded non-empty string.', { path });
  }
}

function assertPositiveInteger(value, path) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw invalid('Corpus registry numeric expectation must be a positive safe integer.', { path });
  }
}

function assertHttpsUrl(value, path) {
  assertNonEmptyString(value, path);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw invalid('Corpus registry sourceUrl must be a valid URL.', { path });
  }
  if (parsed.protocol !== 'https:') {
    throw invalid('Corpus registry sourceUrl must use HTTPS.', { path, protocol: parsed.protocol });
  }
}

function validateFixture(rawFixture, index, seenIds, seenPaths) {
  const path = `fixtures[${index}]`;
  assertRecord(rawFixture, path);

  for (const field of REQUIRED_FIXTURE_FIELDS) {
    if (!Object.hasOwn(rawFixture, field)) {
      throw invalid('Corpus registry fixture is missing a required field.', { path, field });
    }
  }

  for (const field of [
    'fixtureId',
    'source',
    'license',
    'licenseNotice',
    'musicXmlVersion',
    'category',
    'expectedEngineStatus',
    'expectedSemanticVectorVersion',
    'path',
    'sourcePath',
    'blobSha',
    'profile',
  ]) {
    assertNonEmptyString(rawFixture[field], `${path}.${field}`);
  }

  assertHttpsUrl(rawFixture.sourceUrl, `${path}.sourceUrl`);

  if (!/^[a-f0-9]{64}$/.test(rawFixture.sourceSha256)) {
    throw invalid('Corpus registry sourceSha256 must be a lowercase SHA-256 hex digest.', {
      path: `${path}.sourceSha256`,
    });
  }

  if (!/^\d+\.\d+$/.test(rawFixture.musicXmlVersion)) {
    throw invalid('Corpus registry musicXmlVersion must be an explicit major.minor version.', {
      path: `${path}.musicXmlVersion`,
    });
  }

  assertPositiveInteger(rawFixture.expectedVoices, `${path}.expectedVoices`);
  assertPositiveInteger(rawFixture.expectedPeakPolyphony, `${path}.expectedPeakPolyphony`);

  if (typeof rawFixture.expectedTies !== 'boolean') {
    throw invalid('expectedTies must be boolean.', { path: `${path}.expectedTies` });
  }
  if (typeof rawFixture.expectedSustainedOverlap !== 'boolean') {
    throw invalid('expectedSustainedOverlap must be boolean.', {
      path: `${path}.expectedSustainedOverlap`,
    });
  }
  if (
    rawFixture.expectedFailureCode !== null
    && (typeof rawFixture.expectedFailureCode !== 'string' || rawFixture.expectedFailureCode.length === 0)
  ) {
    throw invalid('expectedFailureCode must be null or a non-empty string.', {
      path: `${path}.expectedFailureCode`,
    });
  }
  if (
    rawFixture.expectedEngineStatus === 'NOT_YET_GATED'
    && rawFixture.expectedFailureCode !== null
  ) {
    throw invalid('Ungated Engine status cannot claim a failure code.', { path });
  }

  if (seenIds.has(rawFixture.fixtureId)) {
    throw invalid('Corpus registry fixtureId values must be unique.', {
      path: `${path}.fixtureId`,
      fixtureId: rawFixture.fixtureId,
    });
  }
  if (seenPaths.has(rawFixture.path)) {
    throw invalid('Corpus registry fixture paths must be unique.', {
      path: `${path}.path`,
      fixturePath: rawFixture.path,
    });
  }
  seenIds.add(rawFixture.fixtureId);
  seenPaths.add(rawFixture.path);

  const expected = rawFixture.expected === undefined
    ? undefined
    : Object.freeze({ ...rawFixture.expected });

  return Object.freeze({
    ...rawFixture,
    ...(expected === undefined ? {} : { expected }),
  });
}

function validateCorpusRegistry(rawRegistry) {
  assertRecord(rawRegistry, 'registry');
  if (rawRegistry.schemaVersion !== CORPUS_REGISTRY_SCHEMA_VERSION) {
    throw invalid('Corpus registry schemaVersion is not supported.', {
      expected: CORPUS_REGISTRY_SCHEMA_VERSION,
      observed: rawRegistry.schemaVersion,
    });
  }

  assertNonEmptyString(rawRegistry.sourceRepository, 'sourceRepository');
  assertNonEmptyString(rawRegistry.sourceRef, 'sourceRef');
  if (!/^[a-f0-9]{40}$/.test(rawRegistry.sourceRef)) {
    throw invalid('sourceRef must be a full 40-character Git commit SHA.', { path: 'sourceRef' });
  }
  if (!Array.isArray(rawRegistry.fixtures) || rawRegistry.fixtures.length === 0) {
    throw invalid('Corpus registry must contain at least one fixture.', { path: 'fixtures' });
  }

  const seenIds = new Set();
  const seenPaths = new Set();
  const fixtures = rawRegistry.fixtures.map((fixture, index) => (
    validateFixture(fixture, index, seenIds, seenPaths)
  ));

  return Object.freeze({
    ...rawRegistry,
    fixtures: Object.freeze(fixtures),
  });
}

export {
  CORPUS_REGISTRY_SCHEMA_VERSION,
  CORPUS_REGISTRY_ERROR_CODE,
  REQUIRED_FIXTURE_FIELDS,
  CorpusRegistryError,
  validateCorpusRegistry,
};

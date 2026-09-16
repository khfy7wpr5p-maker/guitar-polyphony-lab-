export const V1C_CAPABILITY_CORPUS_SCHEMA_VERSION = 1;
export const V1C_CAPABILITY_CORPUS_ERROR_CODE = 'INVALID_V1C_CAPABILITY_CORPUS';

const EXPECTED_STATUSES = new Set(['OBSERVE', 'SUPPORTED', 'UNSUPPORTED_LOCAL']);
const SEMANTIC_EXPECTATIONS = new Set(['OBSERVE', 'EQUAL', 'MISMATCH', 'NOT_COMPARABLE']);
const SHA1 = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;

export class V1CCapabilityCorpusError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'V1CCapabilityCorpusError';
    this.code = V1C_CAPABILITY_CORPUS_ERROR_CODE;
    this.details = Object.freeze({ ...details });
  }
}

function invalid(message, details = {}) {
  throw new V1CCapabilityCorpusError(message, details);
}

function assertRecord(value, path) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    invalid('V1C corpus value must be an object.', { path });
  }
}

function assertText(value, path, maxLength = 2048) {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    invalid('V1C corpus text must be a bounded non-empty string.', { path });
  }
}

function assertHttps(value, path) {
  assertText(value, path);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    invalid('V1C corpus URL must be valid.', { path });
  }
  if (parsed.protocol !== 'https:') {
    invalid('V1C corpus URL must use HTTPS.', { path, protocol: parsed.protocol });
  }
}

function assertExpectedOutcomeShape(value, path) {
  assertRecord(value, path);
  if (!EXPECTED_STATUSES.has(value.status)) {
    invalid('V1C expected status is not supported.', { path: `${path}.status`, status: value.status });
  }
  if (
    value.errorCode !== null
    && (typeof value.errorCode !== 'string' || value.errorCode.length === 0 || value.errorCode.length > 256)
  ) {
    invalid('V1C expected errorCode must be null or a bounded non-empty string.', {
      path: `${path}.errorCode`,
    });
  }
  if (value.status !== 'UNSUPPORTED_LOCAL' && value.errorCode !== null) {
    invalid('Only UNSUPPORTED_LOCAL expectations may pin an errorCode.', { path });
  }
}

function deepFreeze(value) {
  if (Array.isArray(value)) {
    value.forEach(deepFreeze);
    return Object.freeze(value);
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }
  return value;
}

export function validateV1CCapabilityManifest(rawManifest) {
  assertRecord(rawManifest, 'manifest');
  if (rawManifest.schemaVersion !== V1C_CAPABILITY_CORPUS_SCHEMA_VERSION) {
    invalid('V1C corpus schemaVersion is not supported.', {
      expected: V1C_CAPABILITY_CORPUS_SCHEMA_VERSION,
      observed: rawManifest.schemaVersion,
    });
  }
  if (rawManifest.stage !== 'V1C') {
    invalid('V1C corpus stage must be V1C.', { stage: rawManifest.stage });
  }
  assertText(rawManifest.purpose, 'purpose');

  assertRecord(rawManifest.source, 'source');
  assertText(rawManifest.source.repository, 'source.repository');
  if (!SHA1.test(rawManifest.source.commitSha)) {
    invalid('source.commitSha must be a full lowercase Git SHA-1.', { path: 'source.commitSha' });
  }
  assertText(rawManifest.source.license, 'source.license');
  assertHttps(rawManifest.source.licenseUrl, 'source.licenseUrl');
  assertText(rawManifest.source.licenseNotice, 'source.licenseNotice', 4096);

  assertRecord(rawManifest.engine, 'engine');
  assertText(rawManifest.engine.repository, 'engine.repository');
  if (!SHA1.test(rawManifest.engine.commitSha)) {
    invalid('engine.commitSha must be a full lowercase Git SHA-1.', { path: 'engine.commitSha' });
  }

  assertRecord(rawManifest.policy, 'policy');
  if (rawManifest.policy.unsupportedIsLocal !== true) {
    invalid('V1C policy must keep unsupported capability local.', {
      path: 'policy.unsupportedIsLocal',
    });
  }
  if (rawManifest.policy.corpusContinuesAfterCaseFailure !== true) {
    invalid('V1C policy must continue after a local capability failure.', {
      path: 'policy.corpusContinuesAfterCaseFailure',
    });
  }
  if (!Array.isArray(rawManifest.policy.globalFailureOnlyFor) || rawManifest.policy.globalFailureOnlyFor.length === 0) {
    invalid('V1C policy must declare bounded global failure reasons.', {
      path: 'policy.globalFailureOnlyFor',
    });
  }
  rawManifest.policy.globalFailureOnlyFor.forEach((value, index) => (
    assertText(value, `policy.globalFailureOnlyFor[${index}]`, 128)
  ));

  if (!Array.isArray(rawManifest.cases) || rawManifest.cases.length < 1 || rawManifest.cases.length > 128) {
    invalid('V1C corpus cases must be a bounded non-empty array.', { path: 'cases' });
  }

  const seenIds = new Set();
  const seenPaths = new Set();
  for (let index = 0; index < rawManifest.cases.length; index += 1) {
    const item = rawManifest.cases[index];
    const path = `cases[${index}]`;
    assertRecord(item, path);
    assertText(item.caseId, `${path}.caseId`, 256);
    assertText(item.sourcePath, `${path}.sourcePath`, 1024);
    if (!SHA1.test(item.sourceBlobSha)) {
      invalid('sourceBlobSha must be a full lowercase Git blob SHA-1.', {
        path: `${path}.sourceBlobSha`,
      });
    }
    if (item.sourceSha256 !== null && !SHA256.test(item.sourceSha256)) {
      invalid('sourceSha256 must be null or a lowercase SHA-256 digest.', {
        path: `${path}.sourceSha256`,
      });
    }
    assertText(item.category, `${path}.category`, 256);
    if (!Array.isArray(item.featureTags) || item.featureTags.length === 0 || item.featureTags.length > 32) {
      invalid('featureTags must be a bounded non-empty array.', { path: `${path}.featureTags` });
    }
    item.featureTags.forEach((tag, tagIndex) => assertText(tag, `${path}.featureTags[${tagIndex}]`, 128));
    assertExpectedOutcomeShape(item.expectedLab, `${path}.expectedLab`);
    assertExpectedOutcomeShape(item.expectedEngine, `${path}.expectedEngine`);
    if (!SEMANTIC_EXPECTATIONS.has(item.expectedSemanticComparison)) {
      invalid('V1C semantic comparison expectation is not supported.', {
        path: `${path}.expectedSemanticComparison`,
        value: item.expectedSemanticComparison,
      });
    }
    if (seenIds.has(item.caseId)) {
      invalid('V1C caseId values must be unique.', { caseId: item.caseId });
    }
    if (seenPaths.has(item.sourcePath)) {
      invalid('V1C sourcePath values must be unique.', { sourcePath: item.sourcePath });
    }
    seenIds.add(item.caseId);
    seenPaths.add(item.sourcePath);
  }

  return deepFreeze(structuredClone(rawManifest));
}

export function observedFailure(error) {
  const code = typeof error?.code === 'string' && error.code.length > 0
    ? error.code
    : typeof error?.name === 'string' && error.name.length > 0
      ? error.name
      : 'UNKNOWN_ERROR';
  return Object.freeze({ status: 'UNSUPPORTED_LOCAL', errorCode: code });
}

export function assertExpectedOutcome(expected, observed, label) {
  if (expected.status === 'OBSERVE') return;
  if (expected.status !== observed.status) {
    throw new Error(`EXPECTED_OUTCOME_DRIFT ${label}: expected ${expected.status}, observed ${observed.status}`);
  }
  if (expected.errorCode !== observed.errorCode) {
    throw new Error(`EXPECTED_OUTCOME_DRIFT ${label}: expected error ${expected.errorCode}, observed ${observed.errorCode}`);
  }
}

export function assertExpectedSemanticComparison(expected, observed, label) {
  if (expected === 'OBSERVE') return;
  if (expected !== observed) {
    throw new Error(`EXPECTED_OUTCOME_DRIFT ${label}: expected semantic ${expected}, observed ${observed}`);
  }
}

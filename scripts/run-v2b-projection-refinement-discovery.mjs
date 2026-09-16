import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { validateV1CCapabilityManifest } from '../src/corpus/v1cCapabilityCorpus.js';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET_CODE = 'UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE';
const VERIFIED_MUSICXML_DOCTYPE = /<!DOCTYPE\s+score-partwise\s+PUBLIC\s+"-\/\/Recordare\/\/DTD MusicXML\s+[0-9]+(?:\.[0-9]+)*\s+Partwise\/\/EN"\s+"http:\/\/www\.musicxml\.org\/dtds\/partwise\.dtd"\s*>\s*/g;
const ANY_DOCTYPE = /<!DOCTYPE\b/i;
const ANY_ENTITY = /<!ENTITY\b/i;
const MAX_DETAIL_DEPTH = 4;
const MAX_DETAIL_KEYS = 64;
const MAX_ARRAY_ITEMS = 32;
const MAX_STRING_LENGTH = 256;
const MAX_OCCURRENCES = 64;

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
    fail('Usage: node scripts/run-v2b-projection-refinement-discovery.mjs --external-root <path> --engine-root <path> --output <file>');
  }
  return options;
}

function gitHead(root) { return execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
function gitBlobSha(filePath) { return execFileSync('git', ['hash-object', filePath], { encoding: 'utf8' }).trim(); }
function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
function requireEngineModule(engineRoot, relativePath) { return require(path.resolve(engineRoot, relativePath)); }

function createSemanticProbeXml(xml, item) {
  if (ANY_ENTITY.test(xml)) fail(`SEMANTIC_PROBE_TRANSFORM_REJECTED ${item.caseId}: entity declaration present`);
  if (item.semanticProbeTransform === 'IDENTITY_NO_DOCTYPE') {
    if (ANY_DOCTYPE.test(xml)) fail(`SEMANTIC_PROBE_TRANSFORM_REJECTED ${item.caseId}: identity transform requires no DOCTYPE`);
    return xml;
  }
  if (item.semanticProbeTransform === 'REMOVE_VERIFIED_MUSICXML_PARTWISE_EXTERNAL_DOCTYPE') {
    if (!ANY_DOCTYPE.test(xml)) fail(`SEMANTIC_PROBE_TRANSFORM_REJECTED ${item.caseId}: verified DOCTYPE transform requires a DOCTYPE`);
    const matches = [...xml.matchAll(VERIFIED_MUSICXML_DOCTYPE)];
    if (matches.length !== 1) fail(`SEMANTIC_PROBE_TRANSFORM_REJECTED ${item.caseId}: DOCTYPE is not a single verified Recordare MusicXML partwise declaration`);
    const transformed = xml.replace(VERIFIED_MUSICXML_DOCTYPE, '');
    if (ANY_DOCTYPE.test(transformed) || ANY_ENTITY.test(transformed)) fail(`SEMANTIC_PROBE_TRANSFORM_REJECTED ${item.caseId}: declaration remains after verified transform`);
    return transformed;
  }
  fail(`SEMANTIC_PROBE_TRANSFORM_REJECTED ${item.caseId}: unapproved transform ${item.semanticProbeTransform}`);
}

function sanitizeDetailValue(value, depth = 0) {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return value.slice(0, MAX_STRING_LENGTH);
  if (depth >= MAX_DETAIL_DEPTH) return '[DEPTH_LIMIT]';
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeDetailValue(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, MAX_DETAIL_KEYS).map(([key, item]) => [
      key.slice(0, 128), sanitizeDetailValue(item, depth + 1),
    ]));
  }
  return String(value).slice(0, MAX_STRING_LENGTH);
}

function collectLocationEvidence(value, prefix = '', output = {}) {
  if (value === null || value === undefined) return output;
  if (Array.isArray(value)) {
    value.slice(0, MAX_ARRAY_ITEMS).forEach((item, index) => collectLocationEvidence(item, `${prefix}[${index}]`, output));
    return output;
  }
  if (typeof value !== 'object') return output;
  for (const [key, item] of Object.entries(value).slice(0, MAX_DETAIL_KEYS)) {
    const pathKey = prefix ? `${prefix}.${key}` : key;
    const normalized = key.toLowerCase();
    const isLocationKey = normalized.includes('measure') || normalized.includes('event') || normalized.includes('note')
      || normalized.includes('part') || normalized === 'voice' || normalized === 'staff'
      || normalized.endsWith('index') || normalized.endsWith('ordinal');
    if (isLocationKey && (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')) {
      output[pathKey] = sanitizeDetailValue(item);
    }
    if (item && typeof item === 'object') collectLocationEvidence(item, pathKey, output);
  }
  return output;
}

function attributeValue(node, name) {
  return node?.attributes?.find((attribute) => attribute.name === name && attribute.uri === '')?.value ?? null;
}

function summarizeNode(node) {
  const directChildNames = node.children.slice(0, 32).map((child) => child.name);
  const nestedChildPaths = [];
  for (const child of node.children.slice(0, 16)) {
    for (const grandchild of child.children.slice(0, 16)) {
      nestedChildPaths.push(`${child.name}/${grandchild.name}`);
      if (nestedChildPaths.length >= 32) break;
    }
    if (nestedChildPaths.length >= 32) break;
  }
  return {
    nodeName: node.name,
    attributeNames: node.attributes.slice(0, 32).map((attribute) => attribute.name),
    directChildNames,
    nestedChildPaths,
  };
}

function descendantHasPath(node, first, second) {
  for (const child of node.children) {
    if (child.name === first && child.children.some((grandchild) => grandchild.name === second)) return true;
    if (descendantHasPath(child, first, second)) return true;
  }
  return false;
}

function sourceOccurrences(parsed, feature, errorDetails = {}) {
  const occurrences = [];
  const parts = parsed.root.children.filter((node) => node.name === 'part');
  for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
    const part = parts[partIndex];
    const partId = attributeValue(part, 'id');
    const measures = part.children.filter((node) => node.name === 'measure');
    for (let measureIndex = 0; measureIndex < measures.length; measureIndex += 1) {
      const measure = measures[measureIndex];
      const measureNumber = attributeValue(measure, 'number');
      let noteOrdinal = 0;
      for (let measureChildIndex = 0; measureChildIndex < measure.children.length; measureChildIndex += 1) {
        const child = measure.children[measureChildIndex];
        const currentNoteOrdinal = child.name === 'note' ? noteOrdinal++ : null;
        let matches = false;
        let matchedPath = null;
        if (feature === 'direction' && child.name === 'direction') {
          matches = true;
          matchedPath = 'measure/direction';
        } else if (feature === 'harmony' && child.name === 'harmony') {
          matches = true;
          matchedPath = 'measure/harmony';
        } else if (feature === 'notation:dynamics' && child.name === 'note' && descendantHasPath(child, 'notations', 'dynamics')) {
          matches = true;
          matchedPath = 'measure/note/notations/dynamics';
        }
        if (!matches) continue;
        if (
          feature === 'direction'
          && Number.isInteger(errorDetails.measureIndex)
          && Number.isInteger(errorDetails.measureChildIndex)
          && (measureIndex !== errorDetails.measureIndex || measureChildIndex !== errorDetails.measureChildIndex)
        ) continue;
        occurrences.push({
          partIndex,
          partId,
          measureIndex,
          measureNumber,
          measureChildIndex,
          noteOrdinal: currentNoteOrdinal,
          matchedPath,
          sourceShape: summarizeNode(child),
        });
        if (occurrences.length >= MAX_OCCURRENCES) return occurrences;
      }
    }
  }
  return occurrences;
}

function observeGenericProjectionFailure(xml, parseParsedMusicXmlDocument, projectChain) {
  const parsed = parseParsedMusicXmlDocument(xml);
  try {
    projectChain(parsed);
    return { status: 'SUPPORTED_UNEXPECTEDLY', sourceOccurrences: [] };
  } catch (error) {
    const code = typeof error?.code === 'string' ? error.code : error?.name || 'UNKNOWN_ERROR';
    const details = sanitizeDetailValue(error?.details || {});
    const observedFeature = typeof error?.details?.feature === 'string' ? error.details.feature.slice(0, MAX_STRING_LENGTH) : null;
    const occurrences = observedFeature ? sourceOccurrences(parsed, observedFeature, error?.details || {}) : [];
    return {
      status: 'ERROR',
      errorCode: code,
      errorName: typeof error?.name === 'string' ? error.name : null,
      observedFeature,
      details,
      locationEvidence: collectLocationEvidence(error?.details || {}),
      sourceOccurrences: occurrences,
      sourceOccurrenceScope: occurrences.length === 0 ? 'NOT_LOCATED' : occurrences.length === 1 ? 'SINGLE_SOURCE_OCCURRENCE' : 'MULTIPLE_SOURCE_OCCURRENCES',
    };
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const externalRoot = path.resolve(options.externalRoot);
  const engineRoot = path.resolve(options.engineRoot);
  const manifest = validateV1CCapabilityManifest(JSON.parse(fs.readFileSync(path.join(repoRoot, 'fixtures/v1c/manifest.json'), 'utf8')));
  if (gitHead(externalRoot) !== manifest.source.commitSha) fail(`SOURCE_PROVENANCE_MISMATCH external commit: expected ${manifest.source.commitSha}, got ${gitHead(externalRoot)}`);
  if (gitHead(engineRoot) !== manifest.engine.commitSha) fail(`ENGINE_PROVENANCE_MISMATCH expected ${manifest.engine.commitSha}, got ${gitHead(engineRoot)}`);

  const { parseParsedMusicXmlDocument } = requireEngineModule(engineRoot, 'src/parser/parsedMusicXmlDocument.js');
  const { projectParsedMusicXmlThroughPolyProductionCompatibilityChain } = requireEngineModule(engineRoot, 'src/app/polyProductionCompatibilityNormalizationChain.js');
  const candidates = manifest.cases.filter((item) => item.expectedProbeEngine?.status === 'UNSUPPORTED_LOCAL' && item.expectedProbeEngine?.errorCode === TARGET_CODE);
  if (candidates.length !== 6) fail(`V2B_DISCOVERY_CANDIDATE_DRIFT expected 6 generic projection cases, observed ${candidates.length}`);

  const cases = [];
  for (const item of candidates) {
    const sourceFile = path.resolve(externalRoot, item.sourcePath);
    if (!sourceFile.startsWith(`${externalRoot}${path.sep}`)) fail(`Source path escapes external root: ${item.sourcePath}`);
    if (gitBlobSha(sourceFile) !== item.sourceBlobSha) fail(`SOURCE_PROVENANCE_MISMATCH ${item.caseId}: Git blob SHA drift`);
    const bytes = fs.readFileSync(sourceFile);
    if (sha256(bytes) !== item.sourceSha256) fail(`SOURCE_PROVENANCE_MISMATCH ${item.caseId}: SHA-256 drift`);
    const probeXml = createSemanticProbeXml(bytes.toString('utf8'), item);
    if (sha256(Buffer.from(probeXml, 'utf8')) !== item.semanticProbeSha256) fail(`SOURCE_PROVENANCE_MISMATCH ${item.caseId}: semantic probe SHA-256 drift`);
    const observation = observeGenericProjectionFailure(probeXml, parseParsedMusicXmlDocument, projectParsedMusicXmlThroughPolyProductionCompatibilityChain);
    if (observation.status !== 'ERROR' || observation.errorCode !== TARGET_CODE) {
      fail(`V2B_DISCOVERY_OUTCOME_DRIFT ${item.caseId}: expected ${TARGET_CODE}, observed ${observation.errorCode || observation.status}`);
    }
    cases.push({ caseId: item.caseId, category: item.category, featureTags: item.featureTags, sourcePath: item.sourcePath, semanticProbeSha256: item.semanticProbeSha256, observation });
  }

  const observedFeatures = Object.fromEntries([...new Set(cases.map((item) => item.observation.observedFeature || 'NULL'))].sort().map((feature) => [
    feature, cases.filter((item) => (item.observation.observedFeature || 'NULL') === feature).length,
  ]));
  const withEngineLocation = cases.filter((item) => Object.keys(item.observation.locationEvidence).length > 0).length;
  const withSingleSourceOccurrence = cases.filter((item) => item.observation.sourceOccurrenceScope === 'SINGLE_SOURCE_OCCURRENCE').length;

  const result = {
    documentType: 'GuitarPolyphonyV2BProjectionRefinementDiscovery',
    contractVersion: '1.1.0',
    discoveryOnly: true,
    productionAuthority: false,
    productionBehaviorChanged: false,
    sourceEvidence: {
      v1cCaseCount: manifest.cases.length,
      externalRepository: manifest.source.repository,
      externalCommitSha: manifest.source.commitSha,
      engineRepository: manifest.engine.repository,
      engineCommitSha: manifest.engine.commitSha,
    },
    policy: {
      fixtureMetadataIsContextNotCause: true,
      liveEngineErrorDetailsAreRequiredForRefinement: true,
      exactSourceOccurrenceMayRefineScopeButNotInventEngineCause: true,
      noAutomaticRecoveryAuthorization: true,
      semanticCapabilityMustRemainNonGlobal: true,
    },
    summary: {
      candidateCount: cases.length,
      observedFeatureCounts: observedFeatures,
      casesWithEngineLocationEvidence: withEngineLocation,
      casesWithoutEngineLocationEvidence: cases.length - withEngineLocation,
      casesWithSingleSourceOccurrence: withSingleSourceOccurrence,
      casesWithMultipleOrMissingSourceOccurrences: cases.length - withSingleSourceOccurrence,
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

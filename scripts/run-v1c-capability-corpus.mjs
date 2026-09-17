import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import {
  assertExpectedOutcome,
  assertExpectedSemanticComparison,
  observedFailure,
  validateV1CCapabilityManifest,
} from '../src/corpus/v1cCapabilityCorpus.js';
import {
  adaptEnginePolyphonicSourceModel,
  buildLabSemanticSnapshot,
  compareSemanticSnapshots,
} from '../src/verification/semanticComparator.js';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERIFIED_MUSICXML_DOCTYPE = /<!DOCTYPE\s+score-partwise\s+PUBLIC\s+"-\/\/Recordare\/\/DTD MusicXML\s+[0-9]+(?:\.[0-9]+)*\s+Partwise\/\/EN"\s+"http:\/\/www\.musicxml\.org\/dtds\/partwise\.dtd"\s*>\s*/g;
const ANY_DOCTYPE = /<!DOCTYPE\b/i;
const ANY_ENTITY = /<!ENTITY\b/i;

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const options = { externalRoot: null, engineRoot: null, output: null, assertExpectations: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--external-root') {
      options.externalRoot = argv[index + 1] || null;
      index += 1;
    } else if (token === '--engine-root') {
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
  if (!options.externalRoot || !options.engineRoot || !options.output) {
    fail('Usage: node scripts/run-v1c-capability-corpus.mjs --external-root <path> --engine-root <path> --output <file> [--assert-expectations]');
  }
  return options;
}

function gitHead(root) {
  return execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

function gitBlobSha(filePath) {
  return execFileSync('git', ['hash-object', filePath], { encoding: 'utf8' }).trim();
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function declaredMusicXmlVersion(xml) {
  const match = xml.match(/<score-partwise\b[^>]*\bversion=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function requireEngineModule(engineRoot, relativePath) {
  return require(path.resolve(engineRoot, relativePath));
}

function readResolvedManifest() {
  const manifestPath = path.join(repoRoot, 'fixtures/v1c/manifest.json');
  const expansionPath = path.join(repoRoot, 'fixtures/v1c/capability-expansions-a3.json');
  const rawManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const overlay = JSON.parse(fs.readFileSync(expansionPath, 'utf8'));

  if (
    overlay.documentType !== 'V1CCapabilityExpansionOverlay'
    || overlay.contractVersion !== '1.0.0'
    || overlay.stage !== 'A3'
    || overlay.authorityBoundary?.rawInputSecurityUnchanged !== true
    || overlay.authorityBoundary?.productionEngineExpectationUnchanged !== true
    || overlay.authorityBoundary?.targetGraceTimingAuthority !== false
    || overlay.authorityBoundary?.reviewRequired !== true
    || !Array.isArray(overlay.overrides)
    || overlay.overrides.length !== 4
  ) {
    fail('INVALID_V1C_CAPABILITY_EXPANSION_OVERLAY');
  }

  const manifest = structuredClone(rawManifest);
  const seen = new Set();
  for (const override of overlay.overrides) {
    if (
      !override
      || typeof override !== 'object'
      || typeof override.caseId !== 'string'
      || override.field !== 'expectedProbeLab'
      || seen.has(override.caseId)
    ) {
      fail('INVALID_V1C_CAPABILITY_EXPANSION_OVERRIDE');
    }
    seen.add(override.caseId);
    const target = manifest.cases.find((item) => item.caseId === override.caseId);
    if (!target) fail(`UNKNOWN_V1C_CAPABILITY_EXPANSION_CASE ${override.caseId}`);
    if (
      JSON.stringify(target.expectedProbeLab) !== JSON.stringify(override.from)
      || override.from?.status !== 'UNSUPPORTED_LOCAL'
      || override.from?.errorCode !== 'UNSUPPORTED_GRACE_NOTE'
      || override.to?.status !== 'SUPPORTED'
      || override.to?.errorCode !== null
    ) {
      fail(`V1C_CAPABILITY_EXPANSION_PRECONDITION_MISMATCH ${override.caseId}`);
    }
    target.expectedProbeLab = structuredClone(override.to);
  }

  return validateV1CCapabilityManifest(manifest);
}

function createSemanticProbeXml(xml, item) {
  if (ANY_ENTITY.test(xml)) {
    fail(`SEMANTIC_PROBE_TRANSFORM_REJECTED ${item.caseId}: entity declaration present`);
  }

  if (item.semanticProbeTransform === 'IDENTITY_NO_DOCTYPE') {
    if (ANY_DOCTYPE.test(xml)) {
      fail(`SEMANTIC_PROBE_TRANSFORM_REJECTED ${item.caseId}: identity transform requires no DOCTYPE`);
    }
    return xml;
  }

  if (item.semanticProbeTransform === 'REMOVE_VERIFIED_MUSICXML_PARTWISE_EXTERNAL_DOCTYPE') {
    if (!ANY_DOCTYPE.test(xml)) {
      fail(`SEMANTIC_PROBE_TRANSFORM_REJECTED ${item.caseId}: verified DOCTYPE transform requires a DOCTYPE`);
    }
    const matches = [...xml.matchAll(VERIFIED_MUSICXML_DOCTYPE)];
    if (matches.length !== 1) {
      fail(`SEMANTIC_PROBE_TRANSFORM_REJECTED ${item.caseId}: DOCTYPE is not a single verified Recordare MusicXML partwise declaration`);
    }
    const transformed = xml.replace(VERIFIED_MUSICXML_DOCTYPE, '');
    if (ANY_DOCTYPE.test(transformed) || ANY_ENTITY.test(transformed)) {
      fail(`SEMANTIC_PROBE_TRANSFORM_REJECTED ${item.caseId}: declaration remains after verified transform`);
    }
    return transformed;
  }

  fail(`SEMANTIC_PROBE_TRANSFORM_REJECTED ${item.caseId}: unapproved transform ${item.semanticProbeTransform}`);
}

function labObservation(xml) {
  try {
    const snapshot = buildLabSemanticSnapshot(xml);
    const noteCount = snapshot.measures.reduce((sum, measure) => sum + measure.notes.length, 0);
    return {
      summary: Object.freeze({ status: 'SUPPORTED', errorCode: null, measureCount: snapshot.measures.length, noteCount }),
      snapshot,
    };
  } catch (error) {
    return { summary: observedFailure(error), snapshot: null };
  }
}

function engineObservation(
  xml,
  parseParsedMusicXmlDocument,
  projectParsedMusicXmlThroughPolyProductionCompatibilityChain,
) {
  try {
    const parsed = parseParsedMusicXmlDocument(xml);
    const projection = projectParsedMusicXmlThroughPolyProductionCompatibilityChain(parsed);
    const model = projection.sourceModel;
    return {
      summary: Object.freeze({
        status: 'SUPPORTED',
        errorCode: null,
        measureCount: model.measureCount,
        noteCount: model.eventCount,
        extractedGraceEventCount: projection.musicalMaterialAccounting.extractedGraceEventCount,
        ignoredFeatureCount: projection.ignoredFeatures.length,
        reviewIssueCount: projection.reviewIssues.length,
      }),
      model,
    };
  } catch (error) {
    return { summary: observedFailure(error), model: null };
  }
}

function semanticObservation(lab, engine) {
  if (!lab.snapshot || !engine.model) return { status: 'NOT_COMPARABLE', mismatchCount: null };
  const engineSnapshot = adaptEnginePolyphonicSourceModel(engine.model);
  const report = compareSemanticSnapshots(lab.snapshot, engineSnapshot);
  return { status: report.equal ? 'EQUAL' : 'MISMATCH', mismatchCount: report.mismatchCount };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = readResolvedManifest();
  const externalRoot = path.resolve(options.externalRoot);
  const engineRoot = path.resolve(options.engineRoot);

  const observedExternalHead = gitHead(externalRoot);
  if (observedExternalHead !== manifest.source.commitSha) {
    fail(`SOURCE_PROVENANCE_MISMATCH external commit: expected ${manifest.source.commitSha}, got ${observedExternalHead}`);
  }
  const observedEngineHead = gitHead(engineRoot);
  if (observedEngineHead !== manifest.engine.commitSha) {
    fail(`SOURCE_PROVENANCE_MISMATCH engine commit: expected ${manifest.engine.commitSha}, got ${observedEngineHead}`);
  }

  const { parseParsedMusicXmlDocument } = requireEngineModule(
    engineRoot,
    'src/parser/parsedMusicXmlDocument.js',
  );
  const { projectParsedMusicXmlThroughPolyProductionCompatibilityChain } = requireEngineModule(
    engineRoot,
    'src/app/polyProductionCompatibilityNormalizationChain.js',
  );

  const cases = [];
  for (const item of manifest.cases) {
    const sourceFile = path.resolve(externalRoot, item.sourcePath);
    if (!sourceFile.startsWith(`${externalRoot}${path.sep}`)) {
      fail(`SOURCE_PROVENANCE_MISMATCH path escapes external root: ${item.sourcePath}`);
    }
    const observedBlobSha = gitBlobSha(sourceFile);
    if (observedBlobSha !== item.sourceBlobSha) {
      fail(`SOURCE_PROVENANCE_MISMATCH ${item.caseId}: expected blob ${item.sourceBlobSha}, got ${observedBlobSha}`);
    }

    const bytes = fs.readFileSync(sourceFile);
    const observedSha256 = sha256(bytes);
    if (item.sourceSha256 !== observedSha256) {
      fail(`SOURCE_PROVENANCE_MISMATCH ${item.caseId}: expected SHA-256 ${item.sourceSha256}, got ${observedSha256}`);
    }
    const xml = bytes.toString('utf8');
    const rawLab = labObservation(xml);
    const rawEngine = engineObservation(
      xml,
      parseParsedMusicXmlDocument,
      projectParsedMusicXmlThroughPolyProductionCompatibilityChain,
    );

    const probeXml = createSemanticProbeXml(xml, item);
    const observedProbeSha256 = sha256(Buffer.from(probeXml, 'utf8'));
    if (item.semanticProbeSha256 !== observedProbeSha256) {
      fail(`SOURCE_PROVENANCE_MISMATCH ${item.caseId}: expected semantic probe SHA-256 ${item.semanticProbeSha256}, got ${observedProbeSha256}`);
    }
    const probeLab = labObservation(probeXml);
    const probeEngine = engineObservation(
      probeXml,
      parseParsedMusicXmlDocument,
      projectParsedMusicXmlThroughPolyProductionCompatibilityChain,
    );
    const semantic = semanticObservation(probeLab, probeEngine);

    if (options.assertExpectations) {
      assertExpectedOutcome(item.expectedLab, rawLab.summary, `${item.caseId}.rawLab`);
      assertExpectedOutcome(item.expectedEngine, rawEngine.summary, `${item.caseId}.rawEngine`);
      assertExpectedOutcome(item.expectedProbeLab, probeLab.summary, `${item.caseId}.probeLab`);
      assertExpectedOutcome(item.expectedProbeEngine, probeEngine.summary, `${item.caseId}.probeEngine`);
      assertExpectedSemanticComparison(item.expectedSemanticComparison, semantic.status, `${item.caseId}.semantic`);
    }

    cases.push({
      caseId: item.caseId,
      sourcePath: item.sourcePath,
      sourceBlobSha: item.sourceBlobSha,
      sourceSha256: observedSha256,
      declaredMusicXmlVersion: declaredMusicXmlVersion(xml),
      category: item.category,
      featureTags: item.featureTags,
      rawInput: { lab: rawLab.summary, engine: rawEngine.summary },
      semanticProbe: {
        transform: item.semanticProbeTransform,
        transformedSha256: observedProbeSha256,
        lab: probeLab.summary,
        engine: probeEngine.summary,
        semanticComparison: semantic,
      },
    });
  }

  const rawCount = (side, status) => cases.filter((item) => item.rawInput[side].status === status).length;
  const probeCount = (side, status) => cases.filter((item) => item.semanticProbe[side].status === status).length;
  const report = {
    documentType: 'GuitarPolyphonyV1CCapabilityReport',
    contractVersion: '2.0.0',
    sourceRepository: manifest.source.repository,
    sourceCommitSha: manifest.source.commitSha,
    engineRepository: manifest.engine.repository,
    engineCommitSha: manifest.engine.commitSha,
    engineObservationPath: 'polyProductionCompatibilityNormalizationChain',
    policy: manifest.policy,
    summary: {
      caseCount: cases.length,
      rawLabSupported: rawCount('lab', 'SUPPORTED'),
      rawLabUnsupportedLocal: rawCount('lab', 'UNSUPPORTED_LOCAL'),
      rawEngineSupported: rawCount('engine', 'SUPPORTED'),
      rawEngineUnsupportedLocal: rawCount('engine', 'UNSUPPORTED_LOCAL'),
      probeLabSupported: probeCount('lab', 'SUPPORTED'),
      probeLabUnsupportedLocal: probeCount('lab', 'UNSUPPORTED_LOCAL'),
      probeEngineSupported: probeCount('engine', 'SUPPORTED'),
      probeEngineUnsupportedLocal: probeCount('engine', 'UNSUPPORTED_LOCAL'),
      semanticEqual: cases.filter((item) => item.semanticProbe.semanticComparison.status === 'EQUAL').length,
      semanticMismatch: cases.filter((item) => item.semanticProbe.semanticComparison.status === 'MISMATCH').length,
      semanticNotComparable: cases.filter((item) => item.semanticProbe.semanticComparison.status === 'NOT_COMPARABLE').length,
    },
    cases,
  };

  const outputPath = path.resolve(options.output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const text = `${JSON.stringify(report, null, 2)}\n`;
  fs.writeFileSync(outputPath, text, 'utf8');
  process.stdout.write(text);
}

main();

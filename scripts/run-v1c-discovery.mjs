import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { observedFailure } from '../src/corpus/v1cCapabilityCorpus.js';
import {
  adaptEnginePolyphonicSourceModel,
  buildLabSemanticSnapshot,
  compareSemanticSnapshots,
} from '../src/verification/semanticComparator.js';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PINNED_DOCTYPE = /<!DOCTYPE\s+score-partwise\s+PUBLIC\s+"-\/\/Recordare\/\/DTD MusicXML 4\.0 Partwise\/\/EN"\s+"http:\/\/www\.musicxml\.org\/dtds\/partwise\.dtd"\s*>\s*/g;
const SHA1 = /^[a-f0-9]{40}$/;

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const options = { externalRoot: null, engineRoot: null, output: null };
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
    } else {
      fail(`Unknown argument: ${token}`);
    }
  }
  if (!options.externalRoot || !options.engineRoot || !options.output) {
    fail('Usage: node scripts/run-v1c-discovery.mjs --external-root <path> --engine-root <path> --output <file>');
  }
  return options;
}

function readDiscovery() {
  const value = JSON.parse(fs.readFileSync(path.join(repoRoot, 'fixtures/v1c/discovery.json'), 'utf8'));
  if (value.documentType !== 'GuitarPolyphonyV1CDiscoverySet' || value.contractVersion !== '1.0.0') {
    fail('INVALID_V1C_DISCOVERY_CONTRACT');
  }
  if (value.policy?.discoveryOnly !== true || value.policy?.mustBePromotedBeforeRegressionUse !== true) {
    fail('INVALID_V1C_DISCOVERY_POLICY');
  }
  if (!SHA1.test(value.source?.commitSha || '') || !SHA1.test(value.engine?.commitSha || '')) {
    fail('INVALID_V1C_DISCOVERY_PROVENANCE');
  }
  if (!Array.isArray(value.cases) || value.cases.length === 0 || value.cases.length > 64) {
    fail('INVALID_V1C_DISCOVERY_CASES');
  }
  const ids = new Set();
  const paths = new Set();
  for (const item of value.cases) {
    if (
      typeof item.caseId !== 'string'
      || typeof item.sourcePath !== 'string'
      || !SHA1.test(item.sourceBlobSha || '')
      || typeof item.category !== 'string'
      || !Array.isArray(item.featureTags)
      || item.featureTags.length === 0
    ) {
      fail(`INVALID_V1C_DISCOVERY_CASE ${item?.caseId || 'unknown'}`);
    }
    if (ids.has(item.caseId) || paths.has(item.sourcePath)) {
      fail(`DUPLICATE_V1C_DISCOVERY_IDENTITY ${item.caseId}`);
    }
    ids.add(item.caseId);
    paths.add(item.sourcePath);
  }
  return value;
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

function createProbe(xml, caseId) {
  const matches = [...xml.matchAll(PINNED_DOCTYPE)];
  if (matches.length !== 1) {
    fail(`SEMANTIC_PROBE_TRANSFORM_REJECTED ${caseId}: observed ${matches.length} pinned declarations`);
  }
  const transformed = xml.replace(PINNED_DOCTYPE, '');
  if (/<!DOCTYPE/i.test(transformed) || /<!ENTITY/i.test(transformed)) {
    fail(`SEMANTIC_PROBE_TRANSFORM_REJECTED ${caseId}: declaration remains`);
  }
  return transformed;
}

function labObservation(xml) {
  try {
    const snapshot = buildLabSemanticSnapshot(xml);
    return {
      summary: {
        status: 'SUPPORTED',
        errorCode: null,
        measureCount: snapshot.measures.length,
        noteCount: snapshot.measures.reduce((sum, measure) => sum + measure.notes.length, 0),
      },
      snapshot,
    };
  } catch (error) {
    return { summary: observedFailure(error), snapshot: null };
  }
}

function engineObservation(xml, parseParsedMusicXmlDocument, projectCompatibility) {
  try {
    const parsed = parseParsedMusicXmlDocument(xml);
    const projection = projectCompatibility(parsed);
    return {
      summary: {
        status: 'SUPPORTED',
        errorCode: null,
        measureCount: projection.sourceModel.measureCount,
        noteCount: projection.sourceModel.eventCount,
        extractedGraceEventCount: projection.musicalMaterialAccounting.extractedGraceEventCount,
        ignoredFeatureCount: projection.ignoredFeatures.length,
        reviewIssueCount: projection.reviewIssues.length,
      },
      model: projection.sourceModel,
    };
  } catch (error) {
    return { summary: observedFailure(error), model: null };
  }
}

function semanticObservation(lab, engine) {
  if (!lab.snapshot || !engine.model) return { status: 'NOT_COMPARABLE', mismatchCount: null };
  const report = compareSemanticSnapshots(
    lab.snapshot,
    adaptEnginePolyphonicSourceModel(engine.model),
  );
  return { status: report.equal ? 'EQUAL' : 'MISMATCH', mismatchCount: report.mismatchCount };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const discovery = readDiscovery();
  const externalRoot = path.resolve(options.externalRoot);
  const engineRoot = path.resolve(options.engineRoot);
  if (gitHead(externalRoot) !== discovery.source.commitSha) fail('SOURCE_PROVENANCE_MISMATCH external commit');
  if (gitHead(engineRoot) !== discovery.engine.commitSha) fail('SOURCE_PROVENANCE_MISMATCH engine commit');

  const { parseParsedMusicXmlDocument } = require(path.resolve(
    engineRoot,
    'src/parser/parsedMusicXmlDocument.js',
  ));
  const { projectParsedMusicXmlThroughPolyProductionCompatibilityChain } = require(path.resolve(
    engineRoot,
    'src/app/polyProductionCompatibilityNormalizationChain.js',
  ));

  const cases = discovery.cases.map((item) => {
    const sourceFile = path.resolve(externalRoot, item.sourcePath);
    if (!sourceFile.startsWith(`${externalRoot}${path.sep}`)) fail(`SOURCE_PATH_ESCAPE ${item.caseId}`);
    const blob = gitBlobSha(sourceFile);
    if (blob !== item.sourceBlobSha) {
      fail(`SOURCE_PROVENANCE_MISMATCH ${item.caseId}: expected ${item.sourceBlobSha}, got ${blob}`);
    }
    const bytes = fs.readFileSync(sourceFile);
    const xml = bytes.toString('utf8');
    const rawLab = labObservation(xml);
    const rawEngine = engineObservation(
      xml,
      parseParsedMusicXmlDocument,
      projectParsedMusicXmlThroughPolyProductionCompatibilityChain,
    );
    const probe = createProbe(xml, item.caseId);
    const probeLab = labObservation(probe);
    const probeEngine = engineObservation(
      probe,
      parseParsedMusicXmlDocument,
      projectParsedMusicXmlThroughPolyProductionCompatibilityChain,
    );
    return {
      ...item,
      sourceSha256: sha256(bytes),
      semanticProbeSha256: sha256(Buffer.from(probe, 'utf8')),
      rawInput: { lab: rawLab.summary, engine: rawEngine.summary },
      semanticProbe: {
        transform: discovery.policy.semanticProbeTransform,
        lab: probeLab.summary,
        engine: probeEngine.summary,
        semanticComparison: semanticObservation(probeLab, probeEngine),
      },
    };
  });

  const report = {
    documentType: 'GuitarPolyphonyV1CDiscoveryReport',
    contractVersion: '1.0.0',
    discoveryOnly: true,
    sourceRepository: discovery.source.repository,
    sourceCommitSha: discovery.source.commitSha,
    engineRepository: discovery.engine.repository,
    engineCommitSha: discovery.engine.commitSha,
    caseCount: cases.length,
    cases,
  };
  const output = path.resolve(options.output);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const text = `${JSON.stringify(report, null, 2)}\n`;
  fs.writeFileSync(output, text, 'utf8');
  process.stdout.write(text);
}

main();

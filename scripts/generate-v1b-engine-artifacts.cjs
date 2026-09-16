'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ENGINE_REPOSITORY = 'khfy7wpr5p-maker/musicxml-to-guitar-tab-engine';
const ENGINE_COMMIT_SHA = '1d8ced644f544f7e991f7275eda77a2ce557774e';
const FIXTURES = Object.freeze([
  'fixtures/compat/ps6-counterpoint-2v.musicxml',
  'fixtures/compat/ps6-counterpoint-4v-tie.musicxml',
]);

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const options = {
    engineRoot: null,
    outputDir: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--engine-root') {
      options.engineRoot = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--output-dir') {
      options.outputDir = argv[index + 1] || null;
      index += 1;
      continue;
    }
    fail(`Unknown argument: ${token}`);
  }

  if (!options.engineRoot || !options.outputDir) {
    fail('Usage: node scripts/generate-v1b-engine-artifacts.cjs --engine-root <path> --output-dir <path>');
  }
  return options;
}

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function canonicalJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function requireEngineModule(engineRoot, relativePath) {
  return require(path.resolve(engineRoot, relativePath));
}

function assertPinnedEngineCheckout(engineRoot) {
  const actual = execFileSync('git', ['-C', engineRoot, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  if (actual !== ENGINE_COMMIT_SHA) {
    fail(`Engine checkout SHA mismatch: expected ${ENGINE_COMMIT_SHA}, got ${actual}`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(__dirname, '..');
  const engineRoot = path.resolve(options.engineRoot);
  const outputDir = path.resolve(options.outputDir);

  assertPinnedEngineCheckout(engineRoot);

  const {
    parseParsedMusicXmlDocument,
  } = requireEngineModule(engineRoot, 'src/parser/parsedMusicXmlDocument.js');
  const {
    projectParsedMusicXmlToPolyphonicSourceModel,
  } = requireEngineModule(engineRoot, 'src/parser/polyphonicMusicXmlProjector.js');

  fs.mkdirSync(outputDir, { recursive: true });

  const artifacts = [];
  for (const fixturePath of FIXTURES) {
    const absoluteFixturePath = path.resolve(repoRoot, fixturePath);
    const fixtureBytes = fs.readFileSync(absoluteFixturePath);
    const fixtureText = fixtureBytes.toString('utf8');
    const parsed = parseParsedMusicXmlDocument(fixtureText);
    const model = projectParsedMusicXmlToPolyphonicSourceModel(parsed);

    if (model.documentType !== 'PolyphonicSourceModel' || model.contractVersion !== '1.0.0') {
      fail(`Unexpected Engine artifact contract for ${fixturePath}`);
    }

    const basename = path.basename(fixturePath, path.extname(fixturePath));
    const artifactFile = `${basename}.polyphonic-source-model.json`;
    const artifactText = canonicalJson(model);
    const artifactPath = path.join(outputDir, artifactFile);
    fs.writeFileSync(artifactPath, artifactText, 'utf8');

    artifacts.push({
      fixturePath,
      fixtureSha256: sha256Buffer(fixtureBytes),
      engineRepository: ENGINE_REPOSITORY,
      engineCommitSha: ENGINE_COMMIT_SHA,
      engineDocumentType: model.documentType,
      engineContractVersion: model.contractVersion,
      artifactFile,
      artifactSha256: sha256Buffer(Buffer.from(artifactText, 'utf8')),
    });
  }

  const manifest = {
    documentType: 'GuitarPolyphonyLabV1BEngineArtifactManifest',
    contractVersion: '1.0.0',
    generationPolicy: 'real-pinned-engine-projector',
    engineRepository: ENGINE_REPOSITORY,
    engineCommitSha: ENGINE_COMMIT_SHA,
    artifacts,
  };
  fs.writeFileSync(
    path.join(outputDir, 'manifest.json'),
    canonicalJson(manifest),
    'utf8',
  );

  process.stdout.write(`${canonicalJson(manifest)}`);
}

main();

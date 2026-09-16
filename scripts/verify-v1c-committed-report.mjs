import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  let generated = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--generated') {
      generated = argv[index + 1] || null;
      index += 1;
    } else {
      fail(`Unknown argument: ${argv[index]}`);
    }
  }
  if (!generated) fail('Usage: node scripts/verify-v1c-committed-report.mjs --generated <report.json>');
  return { generated };
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function main() {
  const { generated } = parseArgs(process.argv.slice(2));
  const indexPath = path.join(repoRoot, 'artifacts/v1c/capability-report.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  if (index.storageFormat !== 'SHARDED_CASES_V1' || !Array.isArray(index.caseShards)) {
    fail('INVALID_V1C_COMMITTED_REPORT_INDEX');
  }
  if (index.caseShards.length < 1 || index.caseShards.length > 64) {
    fail('INVALID_V1C_COMMITTED_REPORT_SHARDS');
  }

  const cases = [];
  const seen = new Set();
  index.caseShards.forEach((entry, offset) => {
    const shardPath = path.resolve(repoRoot, entry.path);
    const evidenceRoot = path.resolve(repoRoot, 'artifacts/v1c');
    if (!shardPath.startsWith(`${evidenceRoot}${path.sep}`)) {
      fail(`V1C_REPORT_SHARD_PATH_ESCAPE ${entry.path}`);
    }
    const text = fs.readFileSync(shardPath, 'utf8');
    if (sha256(text) !== entry.sha256) {
      fail(`V1C_REPORT_SHARD_HASH_MISMATCH ${entry.path}`);
    }
    const shard = JSON.parse(text);
    if (
      shard.documentType !== 'GuitarPolyphonyV1CCapabilityCaseShard'
      || shard.contractVersion !== index.contractVersion
      || shard.shardIndex !== offset + 1
      || !Array.isArray(shard.cases)
      || shard.cases.length !== entry.caseCount
    ) {
      fail(`INVALID_V1C_REPORT_SHARD ${entry.path}`);
    }
    for (const item of shard.cases) {
      if (seen.has(item.caseId)) fail(`DUPLICATE_V1C_REPORT_CASE ${item.caseId}`);
      seen.add(item.caseId);
      cases.push(item);
    }
  });

  if (cases.length !== index.summary.caseCount) {
    fail(`V1C_REPORT_CASE_COUNT_MISMATCH expected ${index.summary.caseCount}, got ${cases.length}`);
  }

  const {
    storageFormat,
    caseShards,
    ...reportMetadata
  } = index;
  const expected = { ...reportMetadata, cases };
  const observed = JSON.parse(fs.readFileSync(path.resolve(generated), 'utf8'));
  assert.deepStrictEqual(observed, expected);
  process.stdout.write(`V1C committed report verified: ${cases.length} cases across ${caseShards.length} shards.\n`);
}

main();

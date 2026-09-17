import assert from 'node:assert/strict';
import fs from 'node:fs';

const generatedIndex = process.argv.indexOf('--generated');
const generatedPath = generatedIndex >= 0
  ? process.argv[generatedIndex + 1]
  : 'a3-generated/real-piano-corpus-discovery.json';
const baselinePath = 'artifacts/a3/real-piano-corpus-baseline.json';

const generated = JSON.parse(fs.readFileSync(generatedPath, 'utf8'));
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

assert.equal(baseline.authority, 'LAB_RESEARCH_CORPUS_EVIDENCE_ONLY');
assert.equal(baseline.productionAuthority, false);
assert.equal(baseline.sourceNoteLossAllowed, false);
assert.equal(baseline.summary.caseCount, 5);
assert.equal(baseline.summary.probeSupportedCount, 5);
assert.equal(baseline.summary.probeUnsupportedCount, 0);
assert.deepEqual(generated, baseline);

console.log('A3 real-piano corpus report matches committed non-production baseline.');

import assert from 'node:assert/strict';
import fs from 'node:fs';

const generatedIndex = process.argv.indexOf('--generated');
const generatedPath = generatedIndex >= 0
  ? process.argv[generatedIndex + 1]
  : 'a2c-generated/timeline-arrangement-report.json';
const baselinePath = 'artifacts/a2c/timeline-arrangement-baseline.json';

const generated = JSON.parse(fs.readFileSync(generatedPath, 'utf8'));
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
assert.deepEqual(generated, baseline);
console.log('A2C timeline arrangement benchmark matches committed baseline.');

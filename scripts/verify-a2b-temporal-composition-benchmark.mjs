import assert from 'node:assert/strict';
import fs from 'node:fs';

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

const generatedPath = argValue('--generated');
const baselinePath = argValue('--baseline')
  ?? 'artifacts/a2b/temporal-composition-baseline.json';

if (!generatedPath) throw new Error('--generated is required');

const generated = JSON.parse(fs.readFileSync(generatedPath, 'utf8'));
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

assert.deepStrictEqual(
  generated,
  baseline,
  'Generated A2B temporal/composition benchmark differs from committed baseline.',
);

if (generated.productionAuthority !== false) {
  throw new Error('A2B benchmark must remain non-production-authoritative.');
}
if (generated.cases[0]?.timingAuthority !== false) {
  throw new Error('A2B temporal evidence must not claim score timing authority.');
}
if (generated.cases[2]?.alternativeSetProduced !== false) {
  throw new Error('Overlapping transforms must not produce a composed alternative set.');
}

console.log('A2B temporal/composition baseline verified.');

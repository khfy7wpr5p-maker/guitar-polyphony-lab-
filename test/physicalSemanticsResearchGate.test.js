import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const gateUrl = new URL('../PHYSICAL_SEMANTICS_RESEARCH_GATE.json', import.meta.url);

async function gate() {
  return JSON.parse(await readFile(gateUrl, 'utf8'));
}

test('LAB-TECH-05 keeps physical integration disabled and explicitly approval-gated', async () => {
  const document = await gate();
  assert.equal(document.stage, 'LAB-TECH-05');
  assert.equal(document.authority, 'RESEARCH_DECISION_ONLY');
  assert.equal(document.physicalIntegrationEnabled, false);
  assert.equal(document.requiresExplicitUserApprovalBeforeAnyPhysicalIntegration, true);
  assert.equal(document.rankingChangesAllowed, false);
  assert.deepEqual(document.gateResult.techniquesApprovedForPhysicalIntegration, []);
  assert.equal(document.gateResult.automaticPhysicalImplementationAuthorized, false);
});

test('no technique claims physical solver semantics are proven from source alone', async () => {
  const document = await gate();
  assert.ok(document.decisions.length >= 10);
  assert.ok(document.decisions.every((entry) => entry.sourceAloneProvesPhysicalSolverSemantics === false));
  assert.equal(
    document.decisions.some((entry) => JSON.stringify(entry).includes('PHYSICAL_SEMANTICS_SUPPORTED')),
    false,
  );
});

test('position evidence may be researched later but is not solver candidate authority now', async () => {
  const document = await gate();
  const position = document.decisions.find((entry) => entry.technique === 'technical string/fret position evidence');
  assert.equal(position.decision, 'KEEP_SAFE_METADATA_ONLY_PENDING_EXPLICIT_PHYSICAL_STAGE');
  assert.match(position.researchFinding, /pitch\/position consistency can be validated/i);
  assert.match(position.reason, /change the candidate set/i);
});

test('ambiguous or producer-unevidenced classes remain blocked', async () => {
  const document = await gate();
  for (const technique of [
    'reused-number hammer-on chain',
    'artificial harmonic pitch-role chord',
    'let-ring',
    'pull-off',
    'bend',
    'palm-mute',
    'tap',
  ]) {
    const entry = document.decisions.find((candidate) => candidate.technique === technique);
    assert.equal(entry.decision, 'BLOCKED_UNKNOWN_OR_AMBIGUOUS', technique);
  }
});

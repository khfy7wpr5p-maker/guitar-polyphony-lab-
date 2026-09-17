# A3 Committed Real Piano Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the verified A3 five-piece real-piano discovery result into deterministic committed lab evidence without granting production authority.

**Architecture:** Keep the existing A3 discovery runner and pinned external corpus unchanged. Commit the exact green discovery report as a baseline, add a small deep-equality verifier following the existing A2C pattern, and gate CI on reproduction from the pinned `musetrainer/library` commit before artifact upload.

**Tech Stack:** Node.js 22, built-in `assert`/`fs`, GitHub Actions, JSON evidence artifacts.

**Spec:** `fixtures/a3/piano-corpus-manifest.json`

## Global Constraints

- Preserve `authority: LAB_RESEARCH_CORPUS_EVIDENCE_ONLY`.
- Preserve `productionAuthority: false`.
- Preserve `sourceNoteLossAllowed: false`.
- Keep pinned source commit `9128876f6164d96997c877a2be843349a32bdabb` unchanged.
- Keep raw-input security policy unchanged; committed evidence uses only the existing verified Recordare DOCTYPE probe path.
- Do not change production integration contracts in this stage.
- Do not broaden parser capability beyond the already-verified `let-ring` support.

---

### Task 1: Commit the verified A3 report

**Files:**
- Create: `artifacts/a3/real-piano-corpus-baseline.json`

**Interfaces:**
- Consumes: `scripts/run-a3-real-piano-corpus-discovery.mjs` output from the pinned five-piece corpus.
- Produces: immutable committed evidence consumed by the A3 verifier.

- [ ] **Step 1:** Copy the exact report produced by clean CI run `35233854473`, head `9cca7e065497965291e5d25550f10fe3a52678bc`.
- [ ] **Step 2:** Confirm summary remains `caseCount: 5`, `probeSupportedCount: 5`, `probeUnsupportedCount: 0`.
- [ ] **Step 3:** Confirm the authority and no-loss fields remain non-production.
- [ ] **Step 4:** Commit the evidence file without modifying the runner or corpus manifest.

### Task 2: Add deterministic baseline verification

**Files:**
- Create: `scripts/verify-a3-real-piano-corpus-report.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `--generated <path>` or default `a3-generated/real-piano-corpus-discovery.json`.
- Produces: process success only when generated JSON deep-equals `artifacts/a3/real-piano-corpus-baseline.json`.

- [ ] **Step 1:** Implement a verifier matching the established A2C `assert.deepEqual` pattern.
- [ ] **Step 2:** Add the verifier to `npm run check` through `node --check`; do not execute corpus generation during syntax check.
- [ ] **Step 3:** Run syntax and test verification through normal CI.

### Task 3: Make A3 reproduction a CI gate

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: the already-generated `a3-generated/real-piano-corpus-discovery.json`.
- Produces: a failing CI gate if pinned corpus behavior drifts from the committed A3 evidence.

- [ ] **Step 1:** Keep the existing `Generate A3 real piano corpus discovery` step unchanged.
- [ ] **Step 2:** Insert `Verify committed A3 real piano corpus baseline` immediately after generation and before upload.
- [ ] **Step 3:** Run `node scripts/verify-a3-real-piano-corpus-report.mjs --generated a3-generated/real-piano-corpus-discovery.json`.
- [ ] **Step 4:** Keep artifact upload and seven-day retention unchanged.

### Task 4: Clean-head verification

**Files:**
- No additional source files unless verification exposes a real defect.

**Interfaces:**
- Consumes: final branch HEAD.
- Produces: evidence that A3 committed baseline is reproducible and still non-production.

- [ ] **Step 1:** Require normal branch CI to complete successfully.
- [ ] **Step 2:** Inspect job steps and confirm the new A3 baseline verification step succeeded.
- [ ] **Step 3:** Inspect the uploaded A3 artifact and confirm five supported cases, zero unsupported cases.
- [ ] **Step 4:** Do not proceed to Production Integration Contract until this gate is green.

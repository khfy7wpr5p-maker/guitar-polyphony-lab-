# A3 Production Integration Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze a production-facing contract that maps the verified A3 arrangement evidence into the current `musicxml-to-guitar-tab-engine` review-only architecture without granting Lab code production authority.

**Architecture:** The contract pins the current production Engine revision and its existing internal seams (`PolyphonicSourceModel`, simultaneous groups, `PartialGuitarTabArrangement`, review capabilities, and the internal POLY_V2 pipeline). The first migration slice preserves immutable source identity, admits MusicXML `let-ring` without fabricating normal tie continuity, attempts no-loss timeline-backed arpeggiation before note-reducing recovery when the source group is proven simultaneous, and exposes any transformed result only as `REVIEW_REQUIRED` provisional TAB until the production Engine independently validates and selects it.

**Tech Stack:** Node.js 22, JSON evidence contracts, GitHub Actions, current production Engine CommonJS runtime.

**Spec:** `artifacts/a3/real-piano-corpus-baseline.json`

## Global Constraints

- Lab remains `productionAuthority: false`.
- Production Engine remains the only canonical TAB authority.
- Source bytes and production `PolyphonicSourceModel` musical facts remain immutable.
- No source note may disappear silently.
- `let-ring` must not be converted into ordinary `tieStart`/`tieStop` continuity.
- First integration output is review-only when any arrangement transform is applied: `status: REVIEW_REQUIRED`, `export: false`.
- Existing production safety, processing-budget, cancellation, physical validation and ranking ceilings remain in force.
- `ARPEGGIATED` target timing uses an explicit bounded presentation policy; it is not inferred source timing and does not gain musical timing authority.
- Candidate enumeration order is not a musical preference rank.
- Existing deterministic reduction remains a fallback; it is not rewritten as part of the first no-loss slice.

---

### Task 1: Freeze the machine-readable integration contract

**Files:**
- Create: `fixtures/a3/production-integration-contract.json`

**Interfaces:**
- Consumes: committed A3 baseline at Lab commit `7a74008c2293fe4a30c07f8da9b7dd80df1475b8` and production Engine commit `1d8ced644f544f7e991f7275eda77a2ce557774e`.
- Produces: stable migration invariants and the first production slice definition.

- [ ] **Step 1:** Pin both repositories and evidence paths.
- [ ] **Step 2:** Record production authority/result/capability invariants.
- [ ] **Step 3:** Record source-event and simultaneous-group identity mappings.
- [ ] **Step 4:** Define transform adoption states: existing production behavior vs first-slice new behavior vs deferred.
- [ ] **Step 5:** Define `let-ring` as non-continuity notation evidence.
- [ ] **Step 6:** Define no-loss arpeggiation-before-reduction review policy with explicit `spreadDivisions: 1` presentation timing and `targetTimingAuthority: false`.

### Task 2: Document the architecture contract

**Files:**
- Create: `docs/ARRANGEMENT-A3-PRODUCTION-INTEGRATION-CONTRACT.md`

**Interfaces:**
- Consumes: machine-readable contract and current production architecture.
- Produces: implementation sequence and acceptance gates for the production repository.

- [ ] **Step 1:** Explain why production source/canonical authority does not move to the Lab.
- [ ] **Step 2:** Map A1/A2/A2C evidence to current production seams.
- [ ] **Step 3:** Specify the first production migration sequence: `let-ring` admission, no-loss arpeggio candidate generation, physical revalidation, provisional selection, review capabilities.
- [ ] **Step 4:** Specify exact fallback and blocking rules.
- [ ] **Step 5:** Define corpus and CI acceptance gates before any production merge.

### Task 3: Add a contract verifier

**Files:**
- Create: `scripts/verify-a3-production-integration-contract.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `fixtures/a3/production-integration-contract.json`, `artifacts/a3/real-piano-corpus-baseline.json`, and a checked-out production Engine root.
- Produces: CI success only if authority, evidence, pinned Engine SHA and required production seams remain compatible.

- [ ] **Step 1:** Assert non-production Lab authority and 5/5 A3 support baseline.
- [ ] **Step 2:** Assert pinned production Git HEAD equals the contract SHA.
- [ ] **Step 3:** Assert required production seam files exist.
- [ ] **Step 4:** Assert review-only result semantics and no-loss/arpeggio invariants.
- [ ] **Step 5:** Add verifier syntax checking to `npm run check`.

### Task 4: Gate CI and refresh stage documentation

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`

**Interfaces:**
- Consumes: existing pinned `.v1b-engine` checkout and A3 baseline gate.
- Produces: a green `ARRANGEMENT_CONTRACT_STABLE` checkpoint without changing production runtime.

- [ ] **Step 1:** Run the contract verifier after A3 baseline verification while `.v1b-engine` is available.
- [ ] **Step 2:** Update README stage map to mark A3 real-corpus baseline and production integration contract complete in Lab.
- [ ] **Step 3:** Move architecture continuation point to production migration, not further Lab parser broadening.
- [ ] **Step 4:** Run clean branch CI and inspect every new gate.

### Task 5: Stop at the production-repository boundary

**Files:**
- No Lab runtime changes.

**Interfaces:**
- Consumes: green A3 production integration contract.
- Produces: an implementation-ready handoff to a new production Engine stage branch.

- [ ] **Step 1:** Confirm Lab branch is green.
- [ ] **Step 2:** Confirm production `main` still equals the pinned SHA before creating a production branch.
- [ ] **Step 3:** Only then begin TDD implementation in a separate Engine branch; never modify protected `main` directly.

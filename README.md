# Guitar Polyphony Lab

Evidence-first research and verification laboratory for guitar polyphony, MusicXML semantics, physical feasibility, arrangement research, and future guitar-specific ranking evidence.

The Lab independently verifies what a source score says, what is physically possible on guitar, where production behavior differs from reproducible evidence, and which future recovery/arrangement capabilities can be added without corrupting source truth.

The Lab is **not** the production TAB authority. Production behavior belongs to `musicxml-to-guitar-tab-engine`; there is no production runtime dependency from that Engine to this repository.

## Product direction

The long-term goal is broad-capability MusicXML-to-guitar realization, not a narrow rejection engine.

> Preserve source truth strictly, localize uncertainty, produce what can safely be produced, keep provisional output editable, and reserve whole-score blocking for genuinely global failures.

Verification-stage fail-closed boundaries are evidence boundaries, not permanent product capability limits.

## Implemented Lab capabilities

- **P0:** deterministic measure timeline and sonority semantics
- **P1A:** bounded MusicXML input/security gate
- **P1B:** partwise parser adapter
- **P1C:** internal compatibility corpus foundation
- **P2A:** configuration-aware fretboard candidate enumeration
- **P2B:** bounded distinct-string sonority assignment enumeration
- **V1A:** corpus provenance/licensing/expectation registry
- **V1B:** deterministic Lab ↔ production Engine semantic comparison with pinned real Engine evidence
- **V1C:** 22-case pinned external MusicXML capability regression
- **V2A:** deterministic failure-family/layer/scope/handling taxonomy over current V1C failures
- **V2B:** live Engine feature/location refinement for the six generic projection failures
- **Tuning research:** immutable Standard, Drop D, custom six-string and capo configurations
- **Technique research:** bounded source-provenance sidecars kept separate from physical authority

## Current status

| Area | Status | Verified boundary |
|---|---|---|
| MusicXML input gate and bounded partwise parser | ✅ VERIFIED | Lab reference/security contract |
| Measure timelines, voice overlap and sonority spans | ✅ VERIFIED | Per-measure deterministic semantics |
| Fretboard candidates and distinct-string assignments | ✅ VERIFIED | Bounded six-string research configuration |
| Sustained/grace physical verifiers | 🧪 EXPERIMENTAL | Deterministic research baselines, not production solvers |
| Engine/Lab semantic comparator | ✅ V1B COMPLETE | Pinned real Engine evidence and reproducible CI loop |
| External MusicXML capability corpus | ✅ V1C COMPLETE | 22 pinned MIT-licensed cases, hashed evidence, exact outcomes |
| Failure intelligence taxonomy | ✅ V2A COMPLETE | 66 observations, 8 families, zero unclassified |
| Generic projection refinement | ✅ V2B COMPLETE | 6/6 generic cases refined from live Engine evidence; 4 exact local scopes, 2 bounded harmony region sets |
| Independent feasibility oracle | 📋 V3 NEXT | Separate strict-physical oracle; offline/CI evidence only |
| Arrangement/N-best alternatives | 📋 FUTURE CAPABILITY | Explicit transformed alternatives with provenance |
| Learned guitar evidence / FretNet / TabCNN | 📋 V4 RESEARCH | Future shadow evidence/ranking provider |

## V1B / V1C evidence

Pinned production Engine commit:

```text
1d8ced644f544f7e991f7275eda77a2ce557774e
```

V1B compares approved Lab semantic snapshots with Engine `PolyphonicSourceModel 1.0.0` artifacts and reproduces them byte-for-byte in CI.

V1C uses 22 pinned files from `w3c-cg/musicxmlTestSuite` at commit `77c19f7e819154c70ca1a1992e80dcda8ff82fea`.

Pinned V1C probe summary:

- Lab semantic path: 17/22 supported
- Engine production compatibility chain: 5/22 supported
- semantic `EQUAL`: 5
- semantic `MISMATCH`: 0
- local unsupported / `NOT_COMPARABLE`: 17

Raw XML trust-boundary behavior remains separate from musical capability; the CI semantic probe does not weaken production security.

## V2A failure intelligence

The current V1C evidence contains 66 unsupported observations:

```text
44 raw-input trust failures
22 semantic capability failures
```

V2A maps them into eight deterministic failure families with zero unclassified observations. Semantic capability evidence is forbidden from being promoted to a global block by the Lab taxonomy.

Before V2B, six Engine cases were intentionally left as generic `UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE` rather than assigning a cause from fixture metadata.

## V2B projection refinement

V2B re-runs those six cases against the exact pinned Engine production compatibility chain and captures bounded live `error.details` plus exact source occurrence evidence.

Observed Engine feature split:

```text
direction          3
harmony            2
notation:dynamics  1
```

Refined scope split:

```text
MEASURE_CHILD      3
NOTE_EVENT         1
FEATURE_REGION_SET 2
```

All six are architecture-level `REVIEW_REQUIRED` candidates. None becomes `BLOCKED_GLOBAL` and this does not change production runtime behavior.

Four cases reach exact local scope. The two harmony cases remain bounded region sets because Engine identifies `harmony` but does not identify which individual harmony occurrence is causal. V2B preserves that uncertainty instead of guessing.

Committed V2B evidence: `artifacts/v2b/projection-refinement-baseline.json`.

See `docs/V2-FAILURE-INTELLIGENCE.md`.

## Architecture direction

```text
SOURCE MUSICXML
      |
      v
strict source facts / provenance
      |
      +---------------------> semantic verification
      |
      v
V2 failure intelligence
family / layer / scope / handling
      |
      v
V3 independent strict feasibility oracle
      |
      +---- physically feasible ------> candidate / N-best space
      |
      +---- truly infeasible ----------> explicit recovery / arrangement research
      |
      v
future editable guitar realization
```

Source truth and hard physical validity remain separate from preference and learned ranking. Learned evidence may eventually rank already-valid candidates or explicit alternatives, but may not invent source facts or make an impossible untransformed candidate physically valid.

## Authority and safety boundaries

- P1A remains authoritative for bounded hostile-input rejection before Lab parsing.
- V1C semantic probing is offline test evidence only.
- V2 classifications are evidence-only; candidate states do not change production runtime behavior.
- No Lab module is production authority for reduction, arrangement, final fingering, Canonical TAB, rendering, playback, OMR, or application UI.
- Higher-level musical capability gaps should be localized rather than automatically interpreted as whole-score failure.
- External fixtures/models/datasets require provenance and licensing before promotion.
- Learned evidence remains below source truth and hard physical constraints.

## Roadmap

- **V1 — Polyphony Verification Foundation**
  - V1A Corpus Registry ✅
  - V1B Engine/Lab Semantic Comparator ✅
  - V1C external MusicXML capability corpus ✅
- **V2 — Failure Intelligence**
  - V2A deterministic taxonomy ✅
  - V2B live generic projection cause/location refinement ✅
  - additional exact harmony-location refinement is additive, not blocking
- **V3 — Independent Feasibility Oracle** **NEXT**
  - distinguish true strict guitar infeasibility from implementation/search/capability failure
  - offline/CI evidence only
- **Arrangement capability**
  - explicit voice prioritization, omission, octave displacement, register compression, arpeggiation and N-best transformed alternatives
- **V4 — Guitar research / learned evidence**
  - ergonomic benchmarks and player profiles
  - TabCNN/FretNet-style providers in shadow mode
  - learned ranking only after benchmark/calibration/candidate-invariance evidence

## Commands

```bash
npm ci --ignore-scripts
npm run check
npm test
```

Node.js 22 or newer is required.

## Maintained architecture documents

- `docs/ARCHITECTURE.md`
- `docs/REPOSITORY_REALITY.md`
- `docs/DOCUMENTATION_AUDIT.md`
- `docs/V1B-SEMANTIC-COMPARATOR.md`
- `docs/V1C-EXTERNAL-CAPABILITY-CORPUS.md`
- `docs/V2-FAILURE-INTELLIGENCE.md`
- `docs/FRETNET_RESEARCH.md`
- `docs/P1A-INPUT-GATE.md`
- `docs/P1B-PARSER-ADAPTER.md`
- `docs/P1C-COMPATIBILITY-MATRIX.md`
- `docs/POLYPHONY-MODEL.md`
- `docs/SUPPORTED-MUSICXML.md`
- `docs/TUNING-LAB-02.md`
- `SECURITY.md`

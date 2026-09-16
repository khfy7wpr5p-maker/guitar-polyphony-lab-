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
- **V3A:** exhaustive exact string/fret sustained-path feasibility oracle with committed regression evidence
- **V3B:** independent left-hand finger/barre/reach feasibility oracle with pinned Engine comparison baseline
- **Arrangement A1:** provenance-tracked N-best alternative-set contract with exact source coverage and explicit transformation facts
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
| Independent exact-position feasibility oracle | ✅ V3A COMPLETE | exhaustive exact pitch/string/sustain reachability with a proven greedy false negative |
| Independent left-hand physical oracle | ✅ V3B COMPLETE | 7-case benchmark; 6 cross-repo comparable cases with 6/6 status parity |
| Arrangement/N-best contract | ✅ A1 FOUNDATION | explicit source coverage, transform provenance, review boundary; no automatic production authority |
| Arrangement candidate generation + transformed-physical validation | 📋 A2 NEXT | bounded explicit-policy candidate generation; every candidate revalidated physically |
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

## V2B projection refinement

V2B re-runs the six formerly generic projection failures against the exact pinned Engine production compatibility chain and captures bounded live `error.details` plus exact source occurrence evidence.

Observed feature split:

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

Committed V2B evidence: `artifacts/v2b/projection-refinement-baseline.json`.

## V3A independent exact-position feasibility oracle

V3A adds an independent, non-greedy feasibility oracle for exact guitar string/fret reachability. It carries every bounded reachable physical state across sustained points while preserving exact pitch, distinct-string use, and held string/fret identity. Search bounds produce `INDETERMINATE_LIMIT`, never false physical impossibility.

Pinned five-case benchmark:

```text
FEASIBLE:                            2
INFEASIBLE:                          2
INDETERMINATE_LIMIT:                 1
proven legacy greedy false-negative: 1
```

The false-negative benchmark proves that the older greedy research verifier can report `BLOCKED / NO_DISTINCT_STRING_ASSIGNMENT` even though a valid exact sustained path exists.

Committed V3A evidence: `artifacts/v3a/strict-feasibility-baseline.json`.

## V3B independent left-hand physical oracle

V3B adds an independent bounded left-hand feasibility layer for fixed string/fret positions. It models ordered finger-to-fret use, reusable fingers on one fret, barre legality, a conservative maximum static fret span, explicit finger reach, and bounded assignment search.

Pinned seven-case benchmark:

```text
cases:                         7
Lab FEASIBLE:                  3
Lab INFEASIBLE:                3
Lab INDETERMINATE_LIMIT:       1
cross-repo comparable:         6
pinned Engine status parity:   6 / 6
```

Covered evidence includes open strings, a compact C-major shape, an F-major barre shape, excessive fret span, five distinct fretted frets, explicit finger-reach rejection, and a deliberately bounded assignment-limit case.

The pinned Engine is a **comparison target only**. The Lab implementation remains independent. Equal status on the six comparable cases is regression evidence, not production authority and not proof that the two implementations are identical.

Committed V3B evidence: `artifacts/v3b/left-hand-benchmark-baseline.json`.

## Arrangement A1 — provenance-tracked N-best contract

A1 introduces `GuitarArrangementAlternativeSet 1.0.0` as a Lab-only representation for multiple explicit guitar-arrangement candidates.

It deliberately reuses the production arrangement vocabulary:

```text
PRESERVED
OMITTED
OCTAVE_DISPLACED
VOICE_REDISTRIBUTED
CHORD_REDUCED
REVOICED
ARPEGGIATED
```

Every alternative must cover every source note event **exactly once**. This makes silent note loss structurally invalid. Group transformations must bind to exact source-group membership, and content-changing decisions carry explicit target provenance.

Supported V1 target facts include whole-octave displacement, target voice, chord survivors, pitch-class-preserving register revoicing, and explicit arpeggio order/spread.

N-best candidate order is deterministic enumeration only:

```text
candidateOrderIsPreferenceRank = false
qualityRankingNotImplied = true
```

Any content-changing alternative is review-required. A1 explicitly declares:

```text
productionAuthority = false
automaticTransformationAuthority = false
learnedRankingAuthority = false
exportAuthority = false
```

See `docs/ARRANGEMENT-NBEST-CONTRACT.md`.

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
      |
      v
V3A exact string/fret feasibility
      |
      v
V3B independent left-hand physical feasibility
      |
      +---- true strict infeasibility ----> explicit recovery/arrangement alternatives
      |
      +---- strict feasibility -----------> strict transcription candidate space
      |
      v
A1 provenance-tracked N-best arrangement contract
      |
      v
A2 bounded candidate generation + physical revalidation
      |
      v
future editable guitar realization
```

Source truth and hard physical validity remain separate from preference and learned ranking. Learned evidence may eventually rank already-valid candidates or explicit alternatives, but may not invent source facts or make an impossible untransformed candidate physically valid.

## Authority and safety boundaries

- P1A remains authoritative for bounded hostile-input rejection before Lab parsing.
- V1C semantic probing is offline test evidence only.
- V2 classifications are evidence-only; candidate states do not change production runtime behavior.
- V3A/V3B are independent research evidence only; neither changes production status or final TAB authority.
- `INDETERMINATE_LIMIT` is never re-labeled as physical impossibility.
- Arrangement A1 represents explicit transformed alternatives but does not authorize automatic production transformations.
- Every A1 alternative must explain every source event exactly once; silent omission is invalid.
- No Lab module is production authority for final reduction policy, final fingering, Canonical TAB, rendering, playback, OMR, or application UI.
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
- **V3 — Independent Feasibility Oracle**
  - V3A exhaustive exact pitch/string/sustain reachability ✅
  - V3B independent finger/barre/reach physical layer + pinned Engine comparison ✅
- **Arrangement capability**
  - A1 provenance-tracked N-best alternative-set contract ✅
  - A2 bounded explicit-policy candidate generation + transformed-candidate physical validation **NEXT**
  - later deterministic/teacher/learned ranking only after validation gates
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
- `docs/V3-INDEPENDENT-FEASIBILITY-ORACLE.md`
- `docs/ARRANGEMENT-NBEST-CONTRACT.md`
- `docs/FRETNET_RESEARCH.md`
- `SECURITY.md`

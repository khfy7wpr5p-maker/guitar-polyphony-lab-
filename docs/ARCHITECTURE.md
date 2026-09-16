# Architecture

## Project purpose

`guitar-polyphony-lab` is an independent research and verification laboratory for guitar polyphony. It produces deterministic, reproducible evidence about MusicXML source facts, active polyphony, guitar feasibility, production/Lab semantic differences, localized capability failures, future arrangement alternatives, and future learned/ergonomic ranking evidence.

The Lab does **not** own production TAB output. Production authority remains `musicxml-to-guitar-tab-engine`.

## Governing architecture policy

The product direction is broad-capability rather than safe-by-refusal. The architecture keeps these layers separate:

1. source truth;
2. strict physical feasibility;
3. capability availability;
4. failure intelligence;
5. local approximation/review;
6. explicit arrangement transformation;
7. soft ranking/evidence;
8. teacher edits;
9. export readiness.

Trust-boundary or broken-evidence conditions may fail closed. A local musical capability gap must not automatically become a whole-score product block.

## Authority boundary

The Lab must not become a production runtime dependency. It may produce fixtures, pinned production artifacts, semantic comparisons, capability reports, failure-intelligence reports, benchmarks, and independent feasibility evidence for separately reviewed production work.

The Lab does not own production reduction policy, arrangement authority, final path selection, Canonical TAB, rendering, playback, OMR, or application UI.

## Implemented architecture

- **P0** — measure timeline / sonority reference semantics
- **P1A** — bounded MusicXML trust/input gate
- **P1B** — partwise parser adapter
- **P1C** — internal compatibility corpus foundation
- **P2A** — deterministic fretboard candidates
- **P2B** — bounded distinct-string sonority assignments
- **V1A** — corpus provenance/licensing/expectation registry
- **V1B** — Lab ↔ Engine semantic comparator
- **V1C** — 22-case pinned external MusicXML capability regression
- **V2A** — deterministic failure family/layer/scope/handling taxonomy
- **V2B** — live generic projection cause/location refinement
- **V3A** — exhaustive exact pitch/string/sustain reachability oracle
- **V3B** — independent left-hand finger/barre/reach feasibility oracle with pinned Engine comparison
- **configuration research** — Standard / Drop D / custom tuning / capo
- **technique provenance** — source metadata sidecars without automatic physical authority

## Current architecture map

```text
SOURCE MUSICXML
      |
      v
P1 trust boundary / parser
      |
      v
P0 source-polyphony facts
      |
      +---------------------> V1B semantic comparison
      |
      +---------------------> V1C external capability evidence
                                  |
                                  v
                         V2A failure taxonomy
                                  |
                                  v
                         V2B cause/location refinement
                                  |
                                  v
                    V3A EXACT POSITION ORACLE
             pitch / string / sustain reachability
                                  |
                                  v
                    V3B LEFT-HAND ORACLE
              finger / barre / span / reach
                                  |
                   +--------------+--------------+
                   |                             |
             strict feasible              strict infeasible
                   |                             |
                   v                             v
           candidate/N-best space      explicit recovery /
                                      arrangement alternatives
                   \____________________   __________________/
                                        \ /
                                         v
                           provenance-tracked arrangement
```

## V1 evidence foundation

Pinned production Engine commit:

```text
1d8ced644f544f7e991f7275eda77a2ce557774e
```

V1B closes a reproducible real Engine/Lab evidence loop for the approved internal fixtures.

V1C adds 22 pinned cases from `w3c-cg/musicxmlTestSuite` at commit:

```text
77c19f7e819154c70ca1a1992e80dcda8ff82fea
```

V1C pinned summary:

```text
cases:                    22
probe Lab supported:      17
probe Engine supported:    5
semantic EQUAL:            5
semantic MISMATCH:         0
semantic NOT_COMPARABLE:  17
```

Raw trust-boundary behavior remains separate from musical-semantic capability. CI-only semantic probing does not weaken production XML security.

## V2A — failure intelligence foundation

V2A classifies all current V1C unsupported observations:

```text
failure observations:         66
raw trust failures:            44
semantic capability failures:  22
unclassified:                   0
```

Semantic capability evidence is forbidden from becoming `BLOCKED_GLOBAL` in the Lab taxonomy.

## V2B — live cause/location refinement

V2B is complete for the six formerly generic Engine projection cases.

Observed feature families:

```text
direction          3
harmony            2
notation:dynamics  1
```

Refined scope classes:

```text
MEASURE_CHILD      3
NOTE_EVENT         1
FEATURE_REGION_SET 2
```

Four cases reach exact local scope. Two harmony cases remain bounded region sets because the Engine does not identify the individual causal occurrence. All six are architecture-level `REVIEW_REQUIRED` candidates and none becomes semantic `BLOCKED_GLOBAL`.

## V3A — independent exact-position feasibility

V3A is implemented as `src/guitar/strictFeasibilityOracle.js`.

It independently asks whether at least one exact pitch-preserving string/fret path exists when simultaneous notes require distinct strings and held notes must keep the same string/fret.

Unlike the earlier greedy research verifier, V3A carries every distinct reachable state forward and deduplicates equivalent states. Its result states are:

```text
FEASIBLE
INFEASIBLE
INDETERMINATE_LIMIT
```

Pinned benchmark:

```text
cases:                               5
FEASIBLE:                            2
INFEASIBLE:                          2
INDETERMINATE_LIMIT:                 1
proven legacy greedy false-negative: 1
```

A configured search/evidence limit yields `INDETERMINATE_LIMIT`, never a false physical impossibility claim.

## V3B — independent left-hand physical feasibility

V3B is implemented as `src/guitar/leftHandFeasibilityOracle.js` plus a pinned cross-repository benchmark.

For already-fixed string/fret positions, V3B independently evaluates:

- fretting fingers 1–4 and open-string finger 0;
- one finger remaining on one fret inside a static shape;
- ordered finger-to-fret relationships;
- legal partial/full barre spans;
- maximum static fret span;
- conservative extra finger reach;
- bounded assignment search.

Result states remain:

```text
FEASIBLE
INFEASIBLE
INDETERMINATE_LIMIT
```

Pinned seven-case benchmark:

```text
cases:                         7
Lab FEASIBLE:                  3
Lab INFEASIBLE:                3
Lab INDETERMINATE_LIMIT:       1
cross-repo comparable:         6
pinned Engine status parity:   6 / 6
```

The six comparable cases agree in normalized feasible/infeasible status with the pinned Engine physical layer. The Engine is used only as a comparison target; the Lab oracle is not implemented by calling the Engine physical validator.

The benchmark also preserves one deliberately bounded assignment-limit case as `INDETERMINATE_LIMIT`, proving that evidence exhaustion is not silently converted into physical impossibility.

Committed evidence:

```text
fixtures/v3b/left-hand-benchmark.json
artifacts/v3b/left-hand-benchmark-baseline.json
scripts/run-v3b-left-hand-benchmark.mjs
scripts/verify-v3b-left-hand-benchmark-report.mjs
```

CI regenerates the report from the exact pinned Engine revision, asserts fixture expectations, and requires deep equality with the committed baseline on stage and pull-request runs.

### V3 authority limit

V3A/V3B establish bounded strict-physical evidence, not complete human performance authority. They do not claim:

- ergonomic preference or comfort;
- hand-size/player-specific capability;
- musical quality of a fingering;
- production final-path authority;
- arrangement authority;
- learned ranking authority.

Therefore a V3B `FEASIBLE` result means a strict shape exists within the declared physical policy, not that it is the best fingering for a player. A V3B `INFEASIBLE` result means the tested fixed-position strict shape has no admissible left-hand realization within the declared policy. A limit result remains indeterminate.

## Current continuation point — Arrangement contracts / N-best

```text
V1B reproducible Engine evidence ✅
        |
V1C external capability baseline ✅
        |
V2A failure taxonomy ✅
        |
V2B cause/location refinement ✅
        |
V3A exact-position oracle ✅
        |
V3B left-hand physical oracle ✅
        |
        v
PROVENANCE-TRACKED ARRANGEMENT CONTRACTS  <--- NEXT
        |
        +--> explicit omission
        +--> octave displacement
        +--> register compression
        +--> arpeggiation
        +--> voice prioritization
        +--> N-best transformed alternatives
        |
        v
V4 learned/ergonomic evidence in shadow mode
```

The unresolved exact occurrence inside the two V2B harmony region sets may be refined additively and does not block arrangement-contract research.

## Trust and physical boundaries

P1A remains authoritative for bounded hostile-input rejection before Lab parsing. V1C semantic transforms remain offline regression probes only.

P2A/P2B and V3A/V3B provide deterministic research evidence. Learned or preference evidence may not convert an impossible untransformed candidate into a physically valid one.

## Progressive capability states

Architecture contracts use or plan around:

- `SUPPORTED`
- `APPROXIMATE`
- `REVIEW_REQUIRED`
- `UNSUPPORTED_LOCAL`
- `BLOCKED_GLOBAL`

Use the narrowest truthful scope. `REVIEW_REQUIRED` is not intended to be a global TAB lock. Lab candidate states remain evidence-only until separately reviewed production changes adopt them.

## Arrangement direction

Arrangement work may create explicit transformed alternatives while preserving original source facts separately. Candidate transforms include voice prioritization, melody/bass preservation, inner-voice reduction, omission, octave displacement, register compression, arpeggiation, and N-best alternatives.

Every transform must retain provenance, before/after facts, reason/policy, and editability/reversibility. Arrangement is not permission to silently rewrite source truth.

## V4 learned evidence

TabCNN/FretNet-style providers remain future soft evidence. The hierarchy is:

```text
source truth
   > hard physical constraints
   > explicit arrangement policy
   > soft ergonomic / learned ranking evidence
```

## Roadmap

- **V1A** corpus registry — ✅
- **V1B** real Engine/Lab semantic evidence — ✅
- **V1C** external MusicXML capability classification — ✅
- **V2A** deterministic failure taxonomy — ✅
- **V2B** live bounded cause/location refinement — ✅
- **V3A** exhaustive exact pitch/string/sustain reachability — ✅
- **V3B** independent left-hand physical oracle + pinned Engine comparison — ✅
- **Arrangement / N-best** explicit transformed alternatives — **NEXT**
- **V4** ergonomic and learned evidence providers in shadow mode

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
                         V3 independent feasibility oracle
                                  |
                     +------------+------------+
                     |                         |
                feasible                 truly infeasible
                     |                         |
                     v                         v
              candidate space          explicit recovery /
                                       arrangement research
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
failure observations:       66
raw trust failures:          44
semantic capability failures:22
unclassified:                 0
```

It enforces:

```text
SEMANTIC_PROBE capability evidence -> never BLOCKED_GLOBAL in Lab taxonomy
```

Before V2B, six Engine failures deliberately remained generic because `UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE` has multiple emitters and fixture metadata alone is not proof of cause.

## V2B — live cause/location refinement

V2B is complete for those six generic cases. It re-runs the exact pinned sources through the exact pinned Engine compatibility chain and combines bounded live `error.details` with exact source occurrence evidence.

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

Four cases reach an exact local scope. The two harmony cases remain bounded region sets because the Engine identifies `harmony` but not the individual causal occurrence. That uncertainty is preserved rather than guessed.

All six are architecture-level `REVIEW_REQUIRED` candidates. V2B produces no semantic `BLOCKED_GLOBAL`, does not alter production runtime status, and does not authorize automatic recovery.

Committed V2B evidence is `artifacts/v2b/projection-refinement-baseline.json` and is regenerated/verified in CI.

## Current continuation point — V3

```text
V1B reproducible Engine evidence ✅
        |
V1C 22-case external capability baseline ✅
        |
V2A deterministic failure taxonomy ✅
        |
V2B live cause/location refinement ✅
        |
        v
V3 INDEPENDENT STRICT FEASIBILITY ORACLE  <--- NEXT
        |
        +--> true untransformed guitar impossibility
        +--> implementation/search/capability failure
        +--> independent evidence, not production authority
        |
        v
explicit arrangement / N-best research
        |
        v
V4 learned/ergonomic evidence in shadow mode
```

The unresolved exact occurrence inside the two harmony region sets may be refined additively if later Engine evidence becomes available. It does not block V3.

## Trust and physical boundaries

P1A remains authoritative for bounded hostile-input rejection before Lab parsing. V1C semantic transforms remain offline regression probes only.

P2A/P2B provide deterministic six-string research evidence. Physical validity is a hard constraint: learned or preference evidence may not convert an impossible untransformed candidate into a physically valid one.

## Progressive capability states

Architecture contracts use or plan around:

- `SUPPORTED`
- `APPROXIMATE`
- `REVIEW_REQUIRED`
- `UNSUPPORTED_LOCAL`
- `BLOCKED_GLOBAL`

Use the narrowest truthful scope. `REVIEW_REQUIRED` is not intended to be a global TAB lock. Lab candidate states remain evidence-only until separately reviewed production changes adopt them.

## Arrangement direction

Future arrangement work may create explicit transformed alternatives while preserving original source facts separately. Candidate transforms include voice prioritization, melody/bass preservation, inner-voice reduction, omission, octave displacement, register compression, arpeggiation, and N-best alternatives.

Every transform must retain provenance, before/after facts, reason/policy and editability/reversibility.

## V3 independent feasibility oracle

V3 should independently test whether strict source-preserving guitar realization is physically possible. It must distinguish physical impossibility from production search/capability limitations and remain offline/CI evidence rather than production runtime authority.

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
- **V3** independent feasibility oracle — **NEXT**
- **Arrangement / N-best** explicit transformed alternatives
- **V4** ergonomic and learned evidence providers in shadow mode

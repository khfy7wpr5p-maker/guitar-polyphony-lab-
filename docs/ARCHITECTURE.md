# Architecture

## Project purpose

`guitar-polyphony-lab` is an independent research and verification laboratory for guitar polyphony. It produces deterministic, reproducible evidence about MusicXML source facts, active polyphony, guitar feasibility, production/Lab semantic differences, localized capability failures, explicit arrangement alternatives, and future learned/ergonomic ranking evidence.

The Lab does **not** own production TAB output. Production authority remains `musicxml-to-guitar-tab-engine`.

## Governing architecture policy

The product direction is broad-capability rather than safe-by-refusal. The architecture keeps these layers separate:

1. source truth;
2. strict physical feasibility;
3. capability availability;
4. failure intelligence;
5. local approximation/review;
6. explicit arrangement transformation;
7. transformed-candidate physical validation;
8. soft ranking/evidence;
9. teacher edits;
10. export readiness.

Trust-boundary or broken-evidence conditions may fail closed. A local musical capability gap must not automatically become a whole-score product block.

## Authority boundary

The Lab must not become a production runtime dependency. It may produce fixtures, pinned production artifacts, semantic comparisons, capability reports, failure-intelligence reports, benchmarks, independent feasibility evidence, and arrangement-contract research for separately reviewed production work.

The Lab does not own production reduction policy, automatic arrangement authority, final path selection, Canonical TAB, rendering, playback, OMR, or application UI.

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
- **Arrangement A1** — provenance-tracked N-best alternative-set contract with exact source coverage
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
             strict feasible              strict infeasible /
                   |                      explicit arrangement request
                   |                             |
                   +--------------+--------------+
                                  v
                     A1 ARRANGEMENT ALTERNATIVE SET
                 source-complete explicit provenance
                                  |
                                  v
                   A2 BOUNDED CANDIDATE GENERATION
                     + transformed-physical validation
                                  |
                                  v
                  future ranking / teacher selection
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

For already-fixed string/fret positions, V3B independently evaluates fretting fingers, ordered finger/fret use, barre legality, static fret span, conservative extra reach, and bounded assignment search.

Pinned seven-case benchmark:

```text
cases:                         7
Lab FEASIBLE:                  3
Lab INFEASIBLE:                3
Lab INDETERMINATE_LIMIT:       1
cross-repo comparable:         6
pinned Engine status parity:   6 / 6
```

The Engine is used only as a comparison target; the Lab oracle remains independently implemented. Evidence/search exhaustion remains `INDETERMINATE_LIMIT`, never physical impossibility.

## Arrangement A1 — provenance-tracked N-best contract

A1 is implemented as:

```text
src/arrangement/arrangementAlternativeSet.js
```

It defines:

```text
GuitarArrangementAlternativeSet 1.0.0
```

The decision vocabulary is aligned with the production arrangement contract:

```text
PRESERVED
OMITTED
OCTAVE_DISPLACED
VOICE_REDISTRIBUTED
CHORD_REDUCED
REVOICED
ARPEGGIATED
```

A1 adds independent Lab invariants around multiple candidate alternatives.

### Exact source coverage

Every source event must be referenced exactly once inside every alternative.

Therefore:

```text
silent note loss -> invalid contract
source event covered twice -> invalid contract
unknown source event -> invalid contract
```

Explicit omission remains valid only because the omitted source event is still present in provenance as an `OMITTED` decision.

### Exact group transformations

`CHORD_REDUCED`, `REVOICED`, and `ARPEGGIATED` must reference one known source group and its exact canonical membership.

A1 does not permit an implementation to fabricate a smaller source group merely because that smaller set is easier to play.

### Explicit target facts

V1 target facts include:

- whole-octave `OCTAVE_DISPLACED` targets;
- explicit `targetVoice` for `VOICE_REDISTRIBUTED`;
- explicit surviving event IDs for `CHORD_REDUCED`;
- pitch-class-preserving per-event target MIDI for `REVOICED`;
- exact order and spread divisions for `ARPEGGIATED`.

The V1 revoicing boundary is intentionally conservative: register may change by octaves, but pitch class may not be silently rewritten.

### N-best semantics

A1 is an alternative **set**, not a ranking authority.

```text
candidateOrderIsPreferenceRank = false
qualityRankingNotImplied = true
```

Strategy tags such as `VOICE_PRIORITY`, `REGISTER_COMPRESSION`, and `MELODY_PRESERVATION` describe candidate intent. They do not mutate source truth and do not imply quality.

### Consequential boundary

A1 declares:

```text
productionAuthority = false
automaticTransformationAuthority = false
learnedRankingAuthority = false
exportAuthority = false
```

Any non-`PRESERVED` alternative is review-required. This gives the architecture a language for broad-capability guitar arrangement without silently enabling note-changing production behavior.

See `docs/ARRANGEMENT-NBEST-CONTRACT.md`.

## Current continuation point — Arrangement A2

```text
V1 evidence ✅
   |
V2 failure intelligence ✅
   |
V3 independent physical evidence ✅
   |
A1 provenance-tracked N-best contract ✅
   |
   v
A2 BOUNDED EXPLICIT-POLICY CANDIDATE GENERATION  <--- NEXT
   |
   +--> preserve melody/bass priorities explicitly
   +--> propose omission/reduction alternatives explicitly
   +--> propose octave/register alternatives explicitly
   +--> propose arpeggiation alternatives explicitly
   +--> re-run transformed candidates through physical validation
   |
   v
later deterministic / teacher / learned ranking
```

Automatic content-changing behavior in the production Engine remains a separate consequential gate.

## Trust and physical boundaries

P1A remains authoritative for bounded hostile-input rejection before Lab parsing. V1C semantic transforms remain offline regression probes only.

P2A/P2B and V3A/V3B provide deterministic physical research evidence. A1 provides arrangement representation only. Learned or preference evidence may not convert an impossible untransformed candidate into a physically valid one, and arrangement intent may not overwrite source truth.

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
- **Arrangement A1** provenance-tracked N-best alternative contract — ✅
- **Arrangement A2** bounded explicit-policy generation + transformed physical revalidation — **NEXT**
- **V4** ergonomic and learned evidence providers in shadow mode

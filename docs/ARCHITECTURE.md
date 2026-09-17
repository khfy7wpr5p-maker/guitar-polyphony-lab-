# Architecture

## Purpose

`guitar-polyphony-lab` is an independent research and verification laboratory. It separates MusicXML source truth, physical guitar feasibility, production capability gaps, explicit arrangement transformations, and later ranking evidence.

The Lab does **not** own production TAB output. Production authority remains `musicxml-to-guitar-tab-engine`.

## Governing policy

The product direction is broad-capability rather than safe-by-refusal. Keep these layers separate:

1. source truth;
2. strict physical feasibility;
3. capability/failure intelligence;
4. local review/approximation;
5. explicit arrangement alternatives;
6. transformed-candidate physical validation;
7. deterministic/teacher/learned ranking;
8. export readiness.

A local musical limitation must not automatically become a whole-score block. Computational/generation bounds must not masquerade as physical impossibility.

## Implemented stage chain

```text
SOURCE MUSICXML
      |
      v
P1 trust boundary + parser
      |
      v
P0 source-polyphony facts / onset / duration / tie
      |
      +--> V1 semantic/capability evidence
      |
      v
V2 localized failure intelligence
      |
      v
V3A exact pitch/string/sustain feasibility
      |
      v
V3B left-hand finger/barre/span/reach feasibility
      |
      +--> strict feasible -> strict transcription candidate
      |
      +--> strict infeasible / explicit arrangement request
                    |
                    v
A1 source-complete explicit N-best alternative contract
                    |
                    v
A2 bounded reduction / octave generation
                    |
                    v
A2B abstract arpeggio validation + safe disjoint composition
                    |
                    v
A2C P0-backed source timing + no-loss arpeggio generation
                    |
                    v
A3 real piano/non-guitar corpus validation
                    |
                    v
ARRANGEMENT_CONTRACT_STABLE
                    |
          =====================
          PRODUCTION INTEGRATION GATE
          =====================
                    |
                    v
musicxml-to-guitar-tab-engine
```

## V1 / V2 / V3 evidence

Pinned production Engine comparison target:

```text
1d8ced644f544f7e991f7275eda77a2ce557774e
```

V1C external corpus is pinned to `w3c-cg/musicxmlTestSuite` commit `77c19f7e819154c70ca1a1992e80dcda8ff82fea`.

V2A classifies 66 unsupported observations with zero unclassified. V2B refines generic projection failures into bounded local capability families instead of global blocks.

V3A independently proves exact string/fret paths and contains a real greedy false-negative counterexample. V3B independently checks static finger/barre/span/reach feasibility; its comparable pinned slice matches production physical status 6/6. `INDETERMINATE_LIMIT` remains distinct from `INFEASIBLE`.

## Arrangement A1 — representation contract

A1 defines explicit transformation provenance:

```text
PRESERVED
OMITTED
OCTAVE_DISPLACED
VOICE_REDISTRIBUTED
CHORD_REDUCED
REVOICED
ARPEGGIATED
```

Every alternative covers every source event exactly once. Silent omission is invalid. Source groups are independent from the guitar's six-string target capacity.

## Arrangement A2 — bounded static generator

A2 generates `CHORD_REDUCED` and `OCTAVE_DISPLACED` research candidates. Every static candidate is revalidated through exact target pitch, fretboard candidates, distinct-string assignment, and the independent left-hand oracle.

Candidate exhaustion returns `PARTIAL_LIMIT`, not impossibility.

## Arrangement A2B — abstract temporal slice

A2B validates an explicit arpeggio as an ordered exact-pitch position path while deliberately keeping `timingAuthority=false`. It also composes transforms with disjoint source-event scopes; same-event overlap remains explicit `OVERLAPPING_SCOPE`.

## Arrangement A2C — P0-backed timeline + no-loss generation

A2C adds three layers:

```text
arrangementTimelineSidecar.js
  -> exact/explicit source-event to P0 timing mapping

timelineBackedArpeggiationValidator.js
  -> proves the source group was actually simultaneous

timelineBackedArpeggiationGenerator.js
  -> emits bounded full-source arpeggio alternatives
```

The source side of timing can now be authoritative where P0 evidence is complete:

```text
sourceTimingAuthority = true
targetTimingAuthority = false
```

Target `spreadDivisions` must be supplied explicitly. A2C never infers arpeggio speed from source note duration.

### Eight-note no-loss evidence

The committed benchmark contains an 8-note simultaneous piano sonority. Strict simultaneous realization exceeds the six-string capacity, but A2C preserves all eight source events and emits two unique deterministic arpeggio orders. Both are physically feasible as exact-pitch guitar sequences.

```text
source events:                 8
feasible no-loss candidates:   2
sourceNoteLossAllowed:          false
sourceTimingAuthority:          true
targetTimingAuthority:          false
```

This means chord reduction remains available, but it is no longer the only recovery mechanism for >6-note source sonorities.

Evidence:

```text
artifacts/a2c/timeline-arrangement-baseline.json
scripts/run-a2c-timeline-arrangement-benchmark.mjs
scripts/verify-a2c-timeline-arrangement-benchmark.mjs
```

## Authority boundary

All current arrangement stages remain Lab-only:

```text
productionAuthority = false
automaticProductionTransformationAuthority = false
exportAuthority = false
candidateOrderIsPreferenceRank = false
```

A2C does not yet claim target playback timing, sustain/ringing behavior across generated steps, performance-speed feasibility, ergonomic ranking, or learned preference.

## Current continuation point

```text
V1 ✅
V2 ✅
V3 ✅
A1 ✅
A2 ✅
A2B ✅
A2C initial P0-backed no-loss slice ✅
        |
        v
A3 REAL PIANO / NON-GUITAR CORPUS BASELINE ✅
        |
        +--> 5/5 pinned real-piano cases supported
        +--> committed deterministic CI baseline
        +--> let-ring preserved as non-continuity notation evidence
        |
        v
A3 PRODUCTION INTEGRATION CONTRACT ✅
        |
        +--> production Engine remains canonical authority
        +--> no-loss arpeggiation before reduction for contracted review recovery
        +--> transformed output remains REVIEW_REQUIRED / non-exportable
        |
        v
PRODUCTION MIGRATION  <--- NEXT
        |
        v
musicxml-to-guitar-tab-engine
```

## Learned evidence

Future TabCNN/FretNet-style providers remain below source truth and hard physical constraints:

```text
source truth
   > hard physical constraints
   > explicit arrangement policy
   > soft ergonomic / learned ranking evidence
```

Learned ranking remains shadow-only until benchmark, calibration, and candidate-invariance evidence exists.

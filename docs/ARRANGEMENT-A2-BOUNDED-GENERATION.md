# Arrangement A2 — Bounded Candidate Generation + Physical Revalidation

## Status

A2 implements the first bounded Lab-only arrangement generator over the A1 provenance contract.

It is research evidence only. It does **not** enable automatic note-changing behavior in `musicxml-to-guitar-tab-engine`, does not select final TAB, does not authorize export, and does not make learned ranking authoritative.

## Why A2 exists

A1 defined how explicit transformed alternatives are represented without corrupting source truth.

A2 asks the next question:

> Given an explicit arrangement policy, can the Lab generate a bounded set of transformed alternatives and independently prove whether each static candidate is physically realizable on guitar?

This is intentionally different from silently rewriting a score to make it fit.

## Source truth is not bounded by six guitar strings

A2 exposed and corrected an important contract error from A1 `1.0.0`: source-group cardinality must not be limited to six simply because the target guitar has six strings.

A piano sonority may legitimately contain more than six simultaneous source events.

A1 was therefore broadened to:

```text
GuitarArrangementAlternativeSet 1.1.0
maxSourceGroupEvents = 128
```

The target realization may later reduce or transform that material, but the original source group remains fully represented in provenance.

## Initial generator scope

Implementation:

```text
src/arrangement/boundedArrangementGenerator.js
```

Current generated transformations:

```text
CHORD_REDUCED
OCTAVE_DISPLACED
```

These are the initial transforms because their resulting static pitch set can be independently revalidated now.

A1 can already represent additional transformations such as `ARPEGGIATED`, `REVOICED`, and `VOICE_REDISTRIBUTED`; A2 does not yet automatically generate all of them.

This is an implementation slice, not a permanent product-support boundary.

## Explicit generation policy

A2 accepts explicit policy facts:

```text
sourceGroupId
allowedTransforms[]
priorityEventIds[]
maxAlternatives
maxKeptNotes
minKeptNotes
octaveSemitoneDeltas[]
maxAssignments
leftHandMaxAssignmentAttempts
```

No hidden learned ranking or preference model is used.

`priorityEventIds` are hard candidate-generation constraints for the research slice. A reduction candidate is invalid if it would drop one of those explicitly prioritized events.

## Reduction generation

For `CHORD_REDUCED`, A2:

1. preserves canonical source-group membership in the A1 decision;
2. enumerates bounded source-order survivor subsets;
3. forces all declared priority events to survive;
4. records the exact surviving source IDs;
5. preserves every source event in provenance even when it is not realized;
6. never treats source groups larger than six as malformed.

A2 currently generates one transformation per candidate. Combined transformations belong to a later slice.

## Octave generation

For `OCTAVE_DISPLACED`, A2:

1. uses only explicit policy deltas;
2. accepts bounded non-zero whole octaves;
3. records the exact source event and semitone delta;
4. lets A1 derive the exact target MIDI;
5. revalidates the transformed static pitch set physically.

Arbitrary pitch-class rewriting is not admitted by this slice.

## Candidate bound semantics

`maxAlternatives` is an evidence/computation bound.

When the candidate space is cut off, A2 returns:

```text
generation.status = PARTIAL_LIMIT
candidateSpaceComplete = false
```

This must **not** be rewritten as:

```text
INFEASIBLE
BLOCKED_GLOBAL
no arrangement exists
```

The system knows only that the configured candidate-generation bound was reached.

## Static physical revalidation

Every emitted static candidate is realized from A1 provenance and passed through this Lab chain:

```text
realized pitch set
   |
   v
exact fretboard candidates
   |
   v
distinct-string sonority assignments
   |
   v
independent V3B left-hand feasibility oracle
```

Possible results include:

```text
FEASIBLE
INFEASIBLE
INDETERMINATE_LIMIT
```

An assignment/search limit remains `INDETERMINATE_LIMIT`.

Current static hard reasons include:

```text
ACTIVE_NOTE_COUNT_EXCEEDS_STRING_COUNT
NO_EXACT_FRETBOARD_CANDIDATE
NO_DISTINCT_STRING_ASSIGNMENT
NO_LEFT_HAND_FEASIBLE_ASSIGNMENT
```

## Temporal boundary

`ARPEGGIATED` is already a valid A1 representation, but A2 does not yet automatically generate it because proper proof requires temporal rather than simultaneous-sonority revalidation.

If an arpeggiated alternative is presented to the current static validator, the truthful result is:

```text
INDETERMINATE_TRANSFORM_SCOPE
TEMPORAL_REVALIDATION_REQUIRED
```

It is not mislabeled as physically impossible.

## Reproducible benchmark

A2 commits a three-case benchmark:

```text
fixtures/a2/benchmark.json
artifacts/a2/arrangement-generation-baseline.json
scripts/run-a2-arrangement-benchmark.mjs
scripts/verify-a2-arrangement-benchmark.mjs
```

Pinned summary:

```text
cases:                                  3
complete generation cases:              2
partial-limit cases:                     1
cases with strict infeasibility:         3
cases with feasible transformed evidence:2
```

### Case 1 — eight-note piano reduction

Source:

```text
8 simultaneous piano-source events
```

Strict realization:

```text
INFEASIBLE
ACTIVE_NOTE_COUNT_EXCEEDS_STRING_COUNT
```

A2 produces 15 six-note reduction candidates under the pinned policy; all 15 are physically feasible in the benchmark.

The required evidence candidate keeps:

```text
e1 e2 e3 e4 e5 e6
```

and retains complete eight-note source provenance.

This is direct evidence that source material larger than six notes can remain intact while a playable guitar alternative is represented separately.

### Case 2 — low pitch octave recovery

Strict source contains MIDI 28, below Standard guitar range.

Strict result:

```text
INFEASIBLE
NO_EXACT_FRETBOARD_CANDIDATE
```

Explicit `+12` octave displacement produces a candidate with a physical witness:

```text
a2:octave:low-e:12 -> FEASIBLE
```

### Case 3 — bounded candidate space

The policy intentionally sets a very small `maxAlternatives`.

Result:

```text
PARTIAL_LIMIT
candidateSpaceComplete = false
```

This regression protects the distinction between search/generation exhaustion and physical impossibility.

## Authority boundary

A2 declares:

```text
authority = LAB_RESEARCH_GENERATOR_ONLY
productionAuthority = false
automaticProductionTransformationAuthority = false
learnedRankingAuthority = false
candidateOrderIsPreferenceRank = false
```

No A2 output is automatically final, export-ready, teacher-approved, or production-selected.

Content-changing alternatives remain review-required through A1.

## Next arrangement slice

The next useful slice is temporal and multi-transform research:

```text
A2B temporal validation for ARPEGGIATED alternatives
+ bounded combined-transform candidates
+ explicit melody/bass/voice-priority policy contracts
+ broader piano/polyphonic benchmark corpus
```

Only after those layers are evidenced should the project consider a separately reviewed production integration that exposes automatic arrangement behavior to users.

# Arrangement / N-best Contract Foundation

## Status

This stage establishes a Lab-only, provenance-tracked contract for explicit guitar-arrangement alternatives.

It does **not** automatically choose or apply musical transformations in production. It does not change `musicxml-to-guitar-tab-engine` runtime behavior, final TAB selection, export readiness, or learned-model authority.

## Purpose

Strict transcription and playable arrangement are different questions.

When exact source material cannot be realized directly on guitar, the architecture must be able to represent alternatives such as:

- preserve the source event;
- omit an explicitly identified event;
- move an event by one or more octaves;
- redistribute a source event to another target voice;
- reduce a simultaneous group while recording exactly which source events survive;
- revoice a group by octave-register changes;
- arpeggiate a simultaneous group with explicit member order and spread.

Every transformed alternative must remain traceable to immutable source truth.

## Alignment with production vocabulary

The Lab contract intentionally uses the existing production arrangement-decision vocabulary:

```text
PRESERVED
OMITTED
OCTAVE_DISPLACED
VOICE_REDISTRIBUTED
CHORD_REDUCED
REVOICED
ARPEGGIATED
```

This avoids creating a second incompatible arrangement language.

The Lab adds independent validation around N-best alternative sets and executable target provenance. Production remains the authority for application/runtime behavior.

## Contract

Implementation:

```text
src/arrangement/arrangementAlternativeSet.js
```

Main document:

```text
GuitarArrangementAlternativeSet 1.0.0
```

Each alternative contains:

```text
alternativeId
candidateOrder
candidateOrderIsPreferenceRank = false
strategyTags[]
reviewRequired
musicalContentChanged
sourceCoverageComplete
decisions[]
```

The set declares:

```text
productionAuthority = false
automaticTransformationAuthority = false
learnedRankingAuthority = false
```

## Source coverage invariant

Every source note event must be covered **exactly once in every alternative**.

This prevents:

- silent note dropping;
- duplicate source-event transformation;
- an arrangement candidate that cannot explain what happened to a source event.

A note may disappear from the realized musical surface only through an explicit provenance-bearing decision such as `OMITTED` or `CHORD_REDUCED`.

## Group-transform invariant

`CHORD_REDUCED`, `REVOICED`, and `ARPEGGIATED` are group decisions.

They require:

- a known `sourceGroupId`;
- the exact canonical source membership of that group;
- explicit target facts appropriate to the transformation.

Partial or invented group membership is rejected.

## Type-specific target provenance

### `PRESERVED`

No target mutation fields are allowed.

### `OMITTED`

No target mutation fields are allowed. The omission remains explicit through the decision type and source event ID.

### `OCTAVE_DISPLACED`

Requires a non-zero bounded whole-octave displacement:

```text
semitoneDelta = ... -24, -12, +12, +24 ...
```

The Lab derives and records target MIDI. Arbitrary pitch-class rewriting is not admitted by this V1 contract.

### `VOICE_REDISTRIBUTED`

Requires explicit `targetVoice`.

### `CHORD_REDUCED`

Requires a non-empty proper subset:

```text
survivingSourceEventIds[]
```

The source group itself remains fully represented in provenance.

### `REVOICED`

Requires explicit target MIDI for every group member.

V1 permits only octave-register changes for each source event, preserving pitch class. This is intentionally narrower than future general harmonic transformation.

### `ARPEGGIATED`

Requires:

```text
orderedSourceEventIds[]
spreadDivisions
```

The order must be an exact permutation of the original simultaneous group.

## Strategy tags

Strategy tags explain arrangement intent but do not themselves mutate notes:

```text
MELODY_PRESERVATION
BASS_PRESERVATION
VOICE_PRIORITY
INNER_VOICE_REDUCTION
REGISTER_COMPRESSION
ARPEGGIATION
```

They are descriptive candidate metadata, not automatic authority.

## N-best semantics

`candidateOrder` is deterministic candidate order only.

It does **not** mean:

- best musical choice;
- preferred fingering;
- highest learned-model score;
- teacher-approved choice.

Therefore:

```text
candidateOrderIsPreferenceRank = false
qualityRankingNotImplied = true
```

Future deterministic or learned ranking may operate only after candidates satisfy source/provenance and physical-validity contracts.

## Review and export boundary

Any alternative containing a non-`PRESERVED` decision is marked:

```text
reviewRequired = true
musicalContentChanged = true
```

All alternatives remain:

```text
productionAuthority = false
exportAuthority = false
```

This stage therefore creates the language needed for playable arrangements without silently authorizing automatic content-changing production behavior.

## Relationship to V3

V3 answers whether exact source material is physically feasible under declared guitar constraints.

Arrangement follows only as a separate layer:

```text
source truth
   |
   v
V3 exact + left-hand physical evidence
   |
   +--> exact feasible -> strict transcription candidate
   |
   +--> exact infeasible / explicit arrangement request
           |
           v
ArrangementAlternativeSet
   multiple explicit transformed candidates
           |
           v
future physical validation of each transformed candidate
           |
           v
future deterministic / learned / teacher ranking
```

Physical impossibility does not authorize silent mutation. Every transformed candidate remains explicit and reviewable.

## Current acceptance evidence

Regression tests verify:

- immutable alternative-set construction;
- source input is not mutated;
- exact source coverage;
- overlap rejection;
- exact group membership;
- bounded whole-octave displacement;
- pitch-class-preserving V1 revoicing;
- exact arpeggiation permutation;
- explicit chord-reduction survivors;
- unknown decision/strategy rejection;
- candidate order is not preference rank.

## Next stage

The next arrangement slice should generate a **bounded candidate set from explicit policy inputs** and pass every transformed candidate back through independent physical validation.

Automatic note-changing production behavior remains a separate consequential gate. The Lab may research and benchmark generation policy without silently enabling it in the production Engine.

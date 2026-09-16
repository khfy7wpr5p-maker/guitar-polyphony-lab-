# Arrangement / N-best Contract Foundation

## Status

A1 establishes a Lab-only, provenance-tracked representation for explicit guitar-arrangement alternatives. Current contract version:

```text
GuitarArrangementAlternativeSet 1.1.0
```

A1 does **not** automatically apply musical transformations in production. It does not own final TAB, export readiness, learned ranking, or production selection.

## Purpose

Strict transcription and playable arrangement are separate layers. When exact source material cannot be realized directly on guitar, the architecture must be able to represent explicit alternatives without changing the original source facts.

Decision vocabulary is aligned with the production arrangement language:

```text
PRESERVED
OMITTED
OCTAVE_DISPLACED
VOICE_REDISTRIBUTED
CHORD_REDUCED
REVOICED
ARPEGGIATED
```

## Core invariants

### Exact source coverage

Every source event must be covered **exactly once in every alternative**.

Therefore:

```text
silent note dropping -> invalid
duplicate transformation -> invalid
unknown source event -> invalid
```

An event may disappear from the realized surface only through explicit provenance such as `OMITTED` or as a non-survivor of `CHORD_REDUCED`.

### Source groups are not guitar-string bounded

A1 `1.0.0` incorrectly capped source group cardinality at six. A2 research exposed that this would make piano/non-guitar source truth artificially narrow.

A1 `1.1.0` corrects the boundary:

```text
maxSourceGroupEvents = 128
source group size != target guitar string count
```

An 8-note piano sonority is therefore preserved as an 8-note source group even if a guitar realization later keeps only six notes.

### Exact group provenance

`CHORD_REDUCED`, `REVOICED`, and `ARPEGGIATED` require a known `sourceGroupId` and exact canonical source membership. Implementations may not fabricate a smaller source group simply because it is easier to play.

## Type-specific target facts

- `PRESERVED` — no target mutation facts.
- `OMITTED` — no target mutation facts; omission remains explicit by type and source ID.
- `OCTAVE_DISPLACED` — bounded non-zero whole-octave `semitoneDelta`; target MIDI is derived.
- `VOICE_REDISTRIBUTED` — explicit `targetVoice`.
- `CHORD_REDUCED` — explicit non-empty proper subset `survivingSourceEventIds`.
- `REVOICED` — target MIDI for every source-group member; current contract preserves pitch class by whole-octave register changes.
- `ARPEGGIATED` — exact source-event permutation plus `spreadDivisions`.

## Strategy tags

Current descriptive tags:

```text
MELODY_PRESERVATION
BASS_PRESERVATION
VOICE_PRIORITY
INNER_VOICE_REDUCTION
REGISTER_COMPRESSION
ARPEGGIATION
```

Tags describe candidate intent; they do not mutate source truth or imply quality.

## N-best semantics

Candidate order is deterministic enumeration only:

```text
candidateOrderIsPreferenceRank = false
qualityRankingNotImplied = true
```

The first candidate is not automatically the best musical, ergonomic, learned-model, or teacher-approved choice.

## Review and authority boundary

Any alternative containing a non-`PRESERVED` decision is:

```text
reviewRequired = true
musicalContentChanged = true
```

A1 explicitly declares:

```text
productionAuthority = false
automaticTransformationAuthority = false
learnedRankingAuthority = false
exportAuthority = false
```

## Relationship to V3 and A2

```text
source truth
   |
V3 physical evidence
   |
A1 explicit source-complete alternatives
   |
A2 bounded explicit-policy generation
   |
physical revalidation of transformed candidates
   |
future ranking / teacher selection
```

V3 strict infeasibility does not authorize silent mutation. A1 supplies the explicit provenance language; A2 may generate candidates only within separately declared policy.

## Current acceptance evidence

Regression tests verify:

- immutable alternative-set construction;
- caller-owned inputs are not mutated;
- exact source coverage;
- overlap rejection;
- exact group membership;
- piano-scale source groups larger than six are preserved;
- bounded whole-octave displacement;
- pitch-class-preserving register revoicing;
- exact arpeggiation permutation;
- explicit chord-reduction survivors;
- unknown strategy/decision rejection;
- candidate order is not preference rank.

## Current continuation

A2 initial static bounded generation is now implemented and benchmarked. See:

```text
docs/ARRANGEMENT-A2-BOUNDED-GENERATION.md
```

The next arrangement slice is A2B temporal and combined-transform research, especially arpeggiation timing semantics and broader piano/polyphonic benchmarks.

Automatic note-changing production behavior remains a separate consequential gate.

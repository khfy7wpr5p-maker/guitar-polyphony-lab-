# Arrangement A2B — Temporal Arpeggiation + Disjoint Transform Composition

## Status

A2B is a Lab-only continuation of Arrangement A1/A2.

It adds two capabilities:

1. bounded physical validation of an explicit `ARPEGGIATED` alternative as an ordered guitar-position sequence;
2. composition of multiple already-valid arrangement transforms when their source-event scopes are disjoint.

It does **not** change production Engine runtime behavior, Canonical TAB, export readiness, playback authority, or learned ranking authority.

## Why A2B exists

A2 can validate static transformed sonorities such as chord reduction and octave displacement. `ARPEGGIATED` is different: simultaneity is replaced by an ordered sequence.

The A1 source contract currently does not carry full source onset/duration facts. Therefore A2B must not invent a score timeline.

A2B validates only the facts it actually has:

```text
explicit source-event order
+ explicit spreadDivisions metadata
+ exact pitch preservation
+ exact guitar fretboard positions
+ per-step left-hand feasibility
```

It deliberately does not claim:

```text
real source onset reconstruction
real source duration reconstruction
inter-step duration
speed-dependent reach
sustain/ringing policy across arpeggio steps
playback timing authority
```

## Temporal validator

Implementation:

```text
src/arrangement/temporalArpeggiationValidator.js
```

Policy:

```text
ABSTRACT_SPREAD_SEQUENCE_EXACT_POSITION_PATH_1.0
```

A valid `ARPEGGIATED` decision is interpreted as an `ABSTRACT_SPREAD_SEQUENCE`.

`spreadDivisions` is preserved as declared provenance. A2B does not reinterpret it as a fully reconstructed MusicXML onset schedule.

The validator builds an exact fretboard candidate layer for every ordered source event and computes a deterministic path using lexicographic research cost:

```text
string changes
fret distance
maximum fret
fret sum
string sum
```

This cost is deterministic path selection evidence only. It is not a musical quality score and not a learned ranking.

Each selected step is independently checked through the Lab left-hand oracle.

Possible outcomes:

```text
FEASIBLE
INFEASIBLE
INDETERMINATE_LIMIT
NOT_APPLICABLE
```

A `FEASIBLE` A2B result means an exact-position ordered sequence exists under the declared research slice. It does **not** mean real-time performance feasibility has been proven at an unknown tempo/duration.

Every applicable arpeggiation result remains review-required and declares:

```text
timingAuthority = false
productionAuthority = false
exportAuthority = false
```

## Disjoint transform composition

Implementation:

```text
src/arrangement/disjointTransformComposition.js
```

The composer accepts multiple A1-normalized alternatives and extracts their non-`PRESERVED` decisions.

Composition is allowed only when transformed source-event scopes do not overlap.

Example allowed shape:

```text
CHORD_REDUCED on source group g1
+
OCTAVE_DISPLACED on source event e4 outside g1
```

The composer then rebuilds one fresh A1 alternative and sends it back through `createArrangementAlternativeSet(...)` for source-coverage and transform-contract validation.

Normalized derived fields are not copied blindly. Type-specific raw targets are reconstructed first, so fields such as derived octave `targetMidi` cannot leak back into the raw contract.

## Overlap boundary

A2B intentionally does not silently combine two transforms that act on the same source event.

For example:

```text
CHORD_REDUCED on [e1,e2,e3]
+
OCTAVE_DISPLACED on e2
```

returns:

```text
status = OVERLAPPING_SCOPE
reason = SOURCE_EVENT_TRANSFORMED_MORE_THAN_ONCE
```

This is not a global project block. It is a precise statement that same-event transform sequencing needs a richer explicit transform-pipeline contract before it can be represented safely.

Future work may introduce explicit same-event transform pipelines such as:

```text
reduce -> revoice -> arpeggiate
```

but only with ordered transform provenance and before/after facts for every stage.

## Current physical interpretation

A2B preserves the hierarchy:

```text
source truth
> transform provenance
> hard exact-position validity
> bounded left-hand validity
> soft path preference
```

The temporal path cost cannot make an impossible pitch playable and cannot authorize a source mutation.

## Acceptance evidence

Regression tests cover:

- exact arpeggiation order preservation;
- `timingAuthority = false`;
- abstract-sequence scope instead of invented score timing;
- exact-position witness generation;
- out-of-range arpeggio rejection;
- static alternative `NOT_APPLICABLE` behavior;
- disjoint reduction + octave composition;
- full A1 source coverage after composition;
- overlapping transform rejection;
- type-specific raw-target reconstruction before A1 revalidation.

## Next continuation

The next safe slice is A2C:

1. integrate explicit arpeggiation generation into bounded candidate generation;
2. add a richer timeline-bearing source adapter from P0/P1 evidence so real onset/duration validation can replace abstract spread-only evidence where available;
3. define an explicit ordered same-event transform pipeline before allowing reduction + revoicing + arpeggiation on the same source region;
4. keep production activation separately gated.

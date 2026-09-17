# Arrangement A3 — Production Integration Contract

Status: **LAB CONTRACT / PRODUCTION MIGRATION GATE**

Target production repository: `khfy7wpr5p-maker/musicxml-to-guitar-tab-engine`  
Pinned production revision: `1d8ced644f544f7e991f7275eda77a2ce557774e`

This contract does not give Guitar Polyphony Lab production authority and does not import Lab runtime code into production. The production Engine remains the only authority for canonical TAB, export, physical selection and writer output.

## Evidence entering the gate

A3 now has a committed, reproducible five-piece real-piano baseline:

```text
cases:                 5
supported:             5
unsupported:           0
parsed notes:          11,911
maximum active voices: 11
source note loss:      forbidden
production authority:  false
```

Evidence:

```text
artifacts/a3/real-piano-corpus-baseline.json
scripts/verify-a3-real-piano-corpus-report.mjs
```

The formerly blocking Für Elise case was traced to `<tied type="let-ring">`. A3 preserves that as separate `letRing` notation evidence and does not convert it into ordinary tie continuity.

## Production reality at the pinned revision

Production already supplies the correct authority boundaries for migration:

- `PolyphonicSourceModel 1.0.0` owns stable source event identities;
- `SimultaneousEventModel 1.0.0` owns proven simultaneous groups;
- `InternalPolyphonicTabV2Conversion` is the bounded internal conversion seam;
- `PartialGuitarTabArrangement 1.0.0` is provisional and review-only;
- `ReviewEditableTabProjection 1.1.0` provides source-bound teacher editing;
- `REVIEW_REQUIRED` may render provisional TAB but may not export;
- production physical solvers, resource ceilings and canonical selection remain authoritative.

Production currently documents `tied type="let-ring"` as unsupported. Therefore A3 integration must not assume the Lab parser expansion already exists in production.

## Source identity mapping

Lab alternatives may enter production only after they are rebuilt against production identities.

Production event identity:

```text
<partId>:measure:<measureIndex>:note:<noteIndex>
```

Production simultaneous group identity:

```text
<measureId>:simultaneous:<onsetDivisions>
```

Pitch-only matching is forbidden. Filename- or SHA-specific behavior is forbidden. Source bytes and source musical facts remain immutable.

## First production migration slice

The first slice is deliberately narrow in authority but broad in user continuity:

```text
safe MusicXML
    |
    v
production parse + source model
    |
    v
strict canonical selection first
    |
    +--> succeeds -> existing PASS/canonical path
    |
    +--> recoverable dense/physical failure
              |
              v
      proven simultaneous source group
              |
              v
      no-loss ARPEGGIATED alternatives
              |
              v
      production physical revalidation
              |
              +--> feasible -> provisional REVIEW_REQUIRED TAB
              |
              +--> none feasible -> existing bounded reduction fallback
```

This order matters: a source sonority above six notes should first be offered a no-loss sequential realization when A3 can preserve every source event. Reduction remains available when no physically valid no-loss path exists.

## ARPEGGIATED authority

The first slice uses:

```text
spreadDivisions = 1
targetTimingAuthority = false
```

`spreadDivisions = 1` is an explicit provisional presentation policy. It is not inferred from the source and must not be described as composer/performance timing truth.

Every arpeggiated candidate must:

1. originate from a production-proven simultaneous group;
2. account for every source event exactly once;
3. preserve source pitch identity unless another separately authorized transform explicitly records otherwise;
4. pass production string/fret and left-hand physical validation;
5. preserve immutable source provenance;
6. remain non-canonical and non-exportable while review is outstanding.

Candidate enumeration order is deterministic evidence, not musical preference ranking. For provisional display only, production may use `SOURCE_ORDER` when feasible, otherwise the first deterministic feasible alternative. That selection remains teacher-reviewable.

## `let-ring` migration rule

Production must first admit the exact notation shape:

```xml
<notations><tied type="let-ring"/></notations>
```

Required behavior:

```text
ordinary tieStart: false
ordinary tieStop:  false
sustain-tie chain: not created from let-ring alone
source bytes:      unchanged
review evidence:   allowed
```

The first migration does **not** claim physical let-ring sustain authority. It only prevents a valid notation token from being misclassified as an ordinary tie or from globally blocking otherwise processable material.

## Result contract for transformed output

When an arrangement transform is needed, the first slice must remain inside the existing review boundary:

```text
status:                    REVIEW_REQUIRED
canonicalTabResult:        null
arrangement artifact:      present
provisional TAB MusicXML:  present
capabilities.generateTab:  true
capabilities.export:       false
playback:                  approximate when target timeline is provisional
teacher editing:           required/available through backend evidence
```

A local arrangement limitation must not automatically become a whole-score block when a bounded, source-bound provisional result can be produced safely.

## Hard-block boundary

Whole-score blocking remains appropriate for:

- unsafe input;
- XML that remains unparseable after explicitly bounded compatibility handling;
- unresolved global structure that prevents safe source interpretation;
- untrusted/unsafe review source provenance;
- processing deadline or cancellation.

Candidate exhaustion is not proof of physical impossibility. A local unplayable group is not by itself permission to discard the rest of the score.

## Existing production behavior that must not be rewritten in the first slice

- current bounded octave-displacement policy;
- current sparse deterministic reduction fallback;
- current source/canonical authority split;
- current solver ranking and resource ceilings;
- current writer authority;
- current review/edit capability contract.

The first integration should add a no-loss recovery route before reduction, not replace the production architecture.

## Production implementation order

1. TDD: admit `let-ring` as non-continuity notation evidence without creating ordinary ties.
2. Add an internal source-complete arrangement-alternative representation mapped to production `sourceEventId`/group identities.
3. Port/reimplement the A2C no-loss arpeggio generator against production models; do not import Lab runtime modules.
4. Revalidate every generated sequence through production physical constraints.
5. Add provisional selection and writer projection inside `REVIEW_REQUIRED` only.
6. Attempt this no-loss route before the existing bounded reduction fallback for the contracted recoverable physical failures.
7. Re-run the five-piece A3 piano corpus through the production branch.
8. Require all protected production CI checks to remain green before PR review.

## Production acceptance gate

The production branch is not integration-ready until all of the following hold:

- current Node.js 18/20/22 tests remain green;
- alphaTab import/SVG render checks remain green on 18/20/22;
- Runtime staging browser E2E remains green on Node.js 22;
- immutable source regression tests remain green;
- `let-ring` does not create ordinary tie continuity;
- no-loss arpeggio candidates preserve every source event;
- transformed candidates are physically revalidated;
- safe provisional TAB remains visible under `REVIEW_REQUIRED`;
- export remains disabled while review is required;
- existing reduction fallback still works;
- the pinned five-piece real-piano corpus does not regress below 5/5 parse/admission support.

## Deferred authority

This contract does not authorize:

- automatic musical ranking of arpeggio orders;
- composer/performance target timing inference;
- physical sustain authority for `let-ring`;
- arbitrary same-event multi-transform ordering;
- learned ranking;
- package-root API expansion.

Those require separate evidence and contracts.

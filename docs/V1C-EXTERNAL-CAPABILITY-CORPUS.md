# V1C — External MusicXML Capability Corpus

## Status

V1C has an initial pinned regression slice built from 11 MusicXML 4.0 files in `w3c-cg/musicxmlTestSuite`.

The source repository is pinned to commit `77c19f7e819154c70ca1a1992e80dcda8ff82fea`. The selected MusicXML files are covered by that repository's MIT license. The production comparison side is pinned to `musicxml-to-guitar-tab-engine` commit `1d8ced644f544f7e991f7275eda77a2ce557774e`.

This stage is a **capability map**, not a MusicXML conformance claim and not a production acceptance claim.

## Why V1C exists

V1B proved that the Lab can compare its source semantics with real production Engine evidence for two approved internal fixtures. V1C expands that verification boundary to externally maintained MusicXML shapes so unsupported features become measurable, reproducible, and localizable.

The central rule is:

```text
unsupported musical capability != global corpus failure
```

A case may record `UNSUPPORTED_LOCAL` and the corpus continues. CI fails only when the evidence contract itself drifts or becomes untrustworthy: source/probe provenance mismatch, invalid corpus contract, rejected probe transform, pinned outcome drift, or runner failure.

## Source and licensing

External source:

```text
repository: w3c-cg/musicxmlTestSuite
commit:     77c19f7e819154c70ca1a1992e80dcda8ff82fea
license:    MIT
```

V1C does not vendor the external MusicXML files into this repository. CI checks out the exact external commit and validates each selected source using:

- repository commit SHA;
- Git blob SHA;
- raw file SHA-256;
- semantic-probe SHA-256.

The source paths and hashes are recorded in `fixtures/v1c/manifest.json`.

## Raw input versus semantic probe

The selected upstream files contain the standard external MusicXML 4.0 `DOCTYPE` declaration. Both current Lab and Engine raw-input security gates reject DTD/DOCTYPE-bearing XML.

V1C preserves that fact. It does **not** weaken the production or Lab trust boundary.

Each case therefore has two observations:

```text
UPSTREAM BYTES
    |
    +--> RAW INPUT OBSERVATION
    |       Lab trust boundary
    |       Engine trust boundary
    |
    +--> V1C OFFLINE SEMANTIC PROBE
            remove exactly the pinned external
            MusicXML 4.0 DOCTYPE declaration
            |
            +--> Lab semantic path
            +--> production Engine compatibility chain
```

The only approved transform in this slice is:

```text
REMOVE_PINNED_MUSICXML_4_0_EXTERNAL_DOCTYPE
```

The transform must match exactly one known declaration. Any other/multiple declaration shape fails the runner. The transformed bytes are SHA-256 pinned per case.

This probe is test infrastructure only. It must not be interpreted as authorization to silently strip arbitrary DTDs from application input.

## Production observation path

V1C does not use the bare Engine projector as a proxy for the whole product capability. The Engine side is observed through the pinned production compatibility normalization chain:

```text
parseParsedMusicXmlDocument
    -> projectParsedMusicXmlThroughPolyProductionCompatibilityChain
    -> sourceModel / ignoredFeatures / reviewIssues
```

This matters because the production compatibility chain can intentionally normalize presentation-only forms before source-semantic projection.

## Initial 11-case baseline

The first pinned slice contains both isolated and mixed/stress fixtures:

| Case | Focus | Probe Lab | Probe Engine | Semantic comparison |
|---|---|---|---|---|
| `03b` | backup / polyphony | SUPPORTED | SUPPORTED | EQUAL |
| `21a` | basic chord | SUPPORTED | SUPPORTED | EQUAL |
| `23a` | tuplets / time-modification | SUPPORTED | `UNSUPPORTED_POLYPHONIC_TRIPLET_TIME_MODIFICATION` | NOT_COMPARABLE |
| `24a` | grace notes | `UNSUPPORTED_GRACE_NOTE` | `UNSUPPORTED_POLYPHONIC_GRACE_ORNAMENT` | NOT_COMPARABLE |
| `42a` | multivoice + lyrics | SUPPORTED | `UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE` | NOT_COMPARABLE |
| `42b` | three voices + multistaff + clef changes | SUPPORTED | `UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE` | NOT_COMPARABLE |
| `43a` | piano / multistaff | SUPPORTED | SUPPORTED | EQUAL |
| `45a` | simple repeat | SUPPORTED | `UNSUPPORTED_POLYPHONIC_REPEAT_BARLINE` | NOT_COMPARABLE |
| `45b` | repeat + alternative endings | SUPPORTED | `UNSUPPORTED_POLYPHONIC_REPEAT_BARLINE` | NOT_COMPARABLE |
| `71c` | guitar fretboard/frame metadata | SUPPORTED | `UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE` | NOT_COMPARABLE |
| `71e` | multipart TAB-staff stress fixture | `PART_SELECTION_REQUIRED` | `UNSUPPORTED_POLYPHONIC_GRACE_ORNAMENT` | NOT_COMPARABLE |

The raw upstream input result is intentionally separate: all 11 selected files are rejected by the current raw trust boundary because they carry an external DOCTYPE (`DOCTYPE_NOT_ALLOWED` in the Lab; `UNSAFE_XML_DECLARATION` in the Engine).

## What the baseline does and does not prove

The three `EQUAL` cases prove only that the compared source-semantic fields represented by V1B agree for these exact pinned fixtures after the explicit offline probe transform.

They do **not** prove:

- general MusicXML conformance;
- full piano-to-guitar arrangement support;
- full TAB import support;
- repeat playback semantics;
- grace-note realization;
- tuplet rendering or playback;
- harmony/fretboard-frame preservation;
- cross-measure sustain-chain equality;
- production string/fret choice;
- Canonical TAB equality.

Likewise, a local unsupported code is evidence about the exact fixture and pinned Engine revision. A mixed fixture must not be used to infer a single causal unsupported feature unless an isolated fixture establishes it.

## Regression contract

`fixtures/v1c/manifest.json` pins:

- external repository and commit;
- external license record;
- Engine repository and commit;
- source Git blob SHA;
- source SHA-256;
- semantic-probe SHA-256;
- raw Lab outcome;
- raw Engine outcome;
- probe Lab outcome;
- probe Engine outcome;
- semantic comparison outcome.

`artifacts/v1c/capability-report.json` records the initial full report.

CI regenerates the report from the pinned external repository and Engine revision, requires all expected outcomes to match, and compares the generated JSON semantically with the committed baseline report.

## Security and product boundary

V1C keeps these boundaries explicit:

- external DOCTYPE remains rejected on raw input;
- semantic probe transformation is offline CI evidence only;
- unsupported musical capability stays local to the case where possible;
- corpus evidence never grants the Lab production authority;
- the Engine remains the production MusicXML-to-TAB authority;
- no external repository becomes a runtime dependency;
- no learned model participates in this V1C slice.

## Continuation

This initial V1C slice should be expanded by adding **isolated** fixtures before drawing broader capability conclusions. High-value next groups are:

1. simple versus advanced tuplets;
2. grace subtypes and grace/chord interaction;
3. multivoice fixtures without unrelated presentation metadata;
4. simple repeat versus nested/alternative repeat structures;
5. guitar/TAB-specific staff-tuning and technical string/fret cases separated from multipart/grace stress files;
6. ties, octave shifts, articulations and directions;
7. valid compressed `.mxl` ingestion as a separate transport boundary.

V1C should then feed V2 failure intelligence: stable error taxonomy, local capability classification, reproducible failure fixtures, and production-gap prioritization. It should not be used to make unsupported input globally block provisional downstream work where a safe partial representation exists.

# V1C — External MusicXML Capability Corpus

## Status

V1C has a pinned **22-case regression baseline** built from `w3c-cg/musicxmlTestSuite`.

The source repository is pinned to commit `77c19f7e819154c70ca1a1992e80dcda8ff82fea`. The selected MusicXML files are covered by that repository's MIT license. The production comparison side is pinned to `musicxml-to-guitar-tab-engine` commit `1d8ced644f544f7e991f7275eda77a2ce557774e`.

This stage is a **capability map**, not a MusicXML conformance claim and not a production acceptance claim.

Current pinned summary:

```text
cases:                    22
raw Lab supported:         0
raw Engine supported:      0
probe Lab supported:      17
probe Engine supported:    5
semantic EQUAL:            5
semantic MISMATCH:         0
semantic NOT_COMPARABLE:  17
```

These counts are regression observations for the exact pinned corpus and Engine revision. They are not product scores.

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

The source paths, hashes, transforms and expected outcomes are recorded in `fixtures/v1c/manifest.json`.

## Raw input versus semantic probe

All 22 currently pinned upstream cases carry an external MusicXML `DOCTYPE`, so both current Lab and Engine raw-input security gates reject the raw files. V1C preserves that fact. It does **not** weaken the production or Lab trust boundary.

Each case therefore has two observations:

```text
UPSTREAM BYTES
    |
    +--> RAW INPUT OBSERVATION
    |       Lab trust boundary
    |       Engine trust boundary
    |
    +--> V1C OFFLINE SEMANTIC PROBE
            execute the exact per-case approved transform
            |
            +--> Lab semantic path
            +--> production Engine compatibility chain
```

The approved transform allowlist is:

```text
IDENTITY_NO_DOCTYPE
REMOVE_VERIFIED_MUSICXML_PARTWISE_EXTERNAL_DOCTYPE
```

For DOCTYPE-bearing cases, the runner accepts only one structurally verified Recordare MusicXML `score-partwise` PUBLIC declaration with the expected MusicXML system URI. Arbitrary, multiple, entity-bearing or otherwise unapproved declarations are rejected. The transformed bytes are SHA-256 pinned per case.

The generic verified transform is intentionally able to observe historical MusicXML partwise declarations rather than assuming every external file is MusicXML 4.0. The raw security gate remains unchanged.

This probe is test infrastructure only. It must not be interpreted as authorization to silently strip arbitrary DTDs from application input.

## Production observation path

V1C does not use the bare Engine projector as a proxy for the whole product capability. The Engine side is observed through the pinned production compatibility normalization chain:

```text
parseParsedMusicXmlDocument
    -> projectParsedMusicXmlThroughPolyProductionCompatibilityChain
    -> sourceModel / ignoredFeatures / reviewIssues
```

This matters because the production compatibility chain can intentionally normalize presentation-only forms before source-semantic projection.

## Pinned 22-case baseline

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
| `23b` | tuplet styles / display variants | SUPPORTED | `UNSUPPORTED_POLYPHONIC_TIME_SIGNATURE_DISPLAY` | NOT_COMPARABLE |
| `23d` | nested tuplets | SUPPORTED | `UNSUPPORTED_POLYPHONIC_TRIPLET_TIME_MODIFICATION` | NOT_COMPARABLE |
| `24b` | grace chord | `UNSUPPORTED_GRACE_NOTE` | `UNSUPPORTED_POLYPHONIC_GRACE_ORNAMENT` | NOT_COMPARABLE |
| `24c` | grace at measure end | `UNSUPPORTED_GRACE_NOTE` | `UNSUPPORTED_POLYPHONIC_GRACE_ORNAMENT` | NOT_COMPARABLE |
| `24h` | simultaneous grace material | `UNSUPPORTED_GRACE_NOTE` | `UNSUPPORTED_POLYPHONIC_GRACE_ORNAMENT` | NOT_COMPARABLE |
| `31c` | metronome / tempo directions | SUPPORTED | `UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE` | NOT_COMPARABLE |
| `33b` | simple tie | SUPPORTED | SUPPORTED | EQUAL |
| `33d` | octave-shift direction/spanner | SUPPORTED | `UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE` | NOT_COMPARABLE |
| `43i` | single-voice multistaff staff change | SUPPORTED | SUPPORTED | EQUAL |
| `45c` | repeat multiple-times metadata | SUPPORTED | `UNSUPPORTED_POLYPHONIC_REPEAT_BARLINE` | NOT_COMPARABLE |
| `71d` | multistaff fretboard/frame metadata | SUPPORTED | `UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE` | NOT_COMPARABLE |

The two expansion cases `33d` and `45c` do not declare a `score-partwise version` attribute; the report records that as `null` rather than inventing a version.

## What the baseline does and does not prove

The five `EQUAL` cases prove only that the compared source-semantic fields represented by V1B agree for these exact pinned fixtures after the explicit offline probe transform:

- `03b` backup/polyphony;
- `21a` basic chord;
- `33b` simple tie;
- `43a` piano/multistaff;
- `43i` single-voice staff change.

They do **not** prove:

- general MusicXML conformance;
- full piano-to-guitar arrangement support;
- full TAB import support;
- repeat playback semantics;
- grace-note realization;
- tuplet rendering or playback;
- harmony/fretboard-frame preservation;
- all direction/spanner semantics;
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
- per-case approved semantic-probe transform;
- raw Lab outcome;
- raw Engine outcome;
- probe Lab outcome;
- probe Engine outcome;
- semantic comparison outcome.

Committed report evidence is sharded so corpus growth does not create one increasingly monolithic JSON file:

```text
artifacts/v1c/capability-report.json   # metadata, summary, shard hashes
artifacts/v1c/cases-01.json
artifacts/v1c/cases-02.json
artifacts/v1c/cases-03.json
artifacts/v1c/cases-04.json
```

CI regenerates the full report from the pinned external repository and Engine revision, requires all expected outcomes to match, verifies every shard hash, reconstructs the committed report, and compares it semantically with the generated report.

## Security and product boundary

V1C keeps these boundaries explicit:

- external DOCTYPE remains rejected on raw input;
- semantic probe transformation is offline CI evidence only;
- unsupported musical capability stays local to the case where possible;
- corpus evidence never grants the Lab production authority;
- the Engine remains the production MusicXML-to-TAB authority;
- no external repository becomes a runtime dependency;
- no learned model participates in this V1C baseline.

## Continuation

The initial isolated V1C expansion is complete. V1C may continue to grow additively with additional focused fixtures, especially compressed `.mxl`, transposition, microtones, more guitar technical metadata and further isolated presentation forms.

The main architecture continuation now moves to **V2 Failure Intelligence**:

1. stable localized capability/recovery taxonomy;
2. narrowest truthful failure scope (score/part/measure/voice/event/note/sonority/region/export);
3. distinction between unsupported source feature, normalization gap, projection gap, search failure and true physical infeasibility;
4. recovery metadata that preserves provisional downstream work instead of turning local uncertainty into global blocking;
5. evidence suitable for the later independent feasibility oracle and arrangement contracts.

V1C evidence must not be used to make unsupported input globally block provisional downstream work where a safe partial representation exists.

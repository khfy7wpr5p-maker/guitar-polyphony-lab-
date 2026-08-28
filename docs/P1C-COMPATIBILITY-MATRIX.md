# P1C Compatibility Matrix

P1C measures parser/timeline compatibility against pinned MusicXML corpus material before parser behavior is broadened.

## Corpus authority

The first corpus slice is copied byte-for-byte from:

```text
khfy7wpr5p-maker/musicxml-to-guitar-tab-engine
source ref: 0210976ffc74123df8a3c8c0fab2d3cf69067c32
```

The source path and blob SHA for each fixture are pinned in `fixtures/compat/manifest.json`. This is test-data reuse only; it does not create a runtime or package dependency between repositories.

## Current matrix

| Profile | Source voices | Tie evidence | Parser | P0 timeline | Expected status |
|---|---:|---:|---|---|---|
| PS6_COUNTERPOINT_2V | 2 | no | required PASS | required PASS | SUPPORTED |
| PS6_COUNTERPOINT_4V_TIE | 4 | yes | required PASS | required PASS per measure | SUPPORTED_WITH_CROSS_MEASURE_TIE_JOINING_DEFERRED |

## What P1C proves

The fixtures exercise real repository MusicXML containing presentation metadata that P1B does not use (`part-list`, `part-name`, `time`, `staves`, `type`, `dot`) while preserving the timed semantic contract required by the lab.

The 2V fixture proves:

- `backup` reconstruction;
- a later `forward` offset;
- voice 1 sustained while voice 2 enters;
- deterministic sonority spans.

The 4V tie fixture additionally proves:

- same-part `divisions` inheritance into a later measure;
- four independent voices reconstructed through repeated backup/forward movement;
- tie start/stop evidence survives parsing;
- the second measure reaches a four-note active sonority.

## Explicit boundary

P1C does **not** join ties across measures yet. The tie fixture therefore validates preservation of source tie evidence, not a cross-measure sustained-note object.

P1C also does not claim broad MuseScore/Guitar Pro/Bach compatibility from two fixtures. New exporter families must enter through pinned provenance + expected-result tests rather than ad-hoc parser changes.

## Promotion rule

A compatibility profile may be marked supported only when:

1. the fixture provenance is pinned;
2. input passes P1A unchanged;
3. P1B parses without guessing unsupported semantics;
4. P0 timing/sonority assertions pass;
5. exact-head CI is green.

# Repository reality

Fresh-read scope: current `stage/v1c-isolated-capability-expansion` branch, source/tests, package scripts, CI, internal compatibility fixtures, committed V1B Engine evidence, pinned V1C external evidence, and the active progressive-capability directive as of 2026-09-16.

This document describes repository reality, not general production capability claims for `musicxml-to-guitar-tab-engine`.

## Current architecture

```text
internal MusicXML
  -> P1A bounded input gate
  -> P1B partwise parser
  -> P0 measure timeline / sonority spans
  -> Lab semantic snapshot -------------------------+
                                                      |
Pinned production Engine evidence                    |
  -> PolyphonicSourceModel 1.0.0 -------------------+
                                                      |
                                                      v
                                           V1B comparator
                                                      |
                                                      v
                                          deterministic report

pinned external MusicXML corpus
  -> raw trust-boundary observations
  -> pinned offline semantic probes
  -> Lab + pinned Engine production compatibility chain
  -> V1C local capability report
  -> V2 failure intelligence input

P0 facts may also feed:
  -> P2A fretboard candidates
  -> P2B distinct-string assignments
  -> sustained/grace research verifiers
  -> fixtures / hashes / benchmark evidence
```

Technique provenance is a parallel metadata/source-evidence sidecar and currently has no authority to alter physical candidates or production behavior.

## Implemented contracts

| Module | Current role | Failure / authority boundary |
|---|---|---|
| `src/musicxml/inputGate.js` | bounded UTF-8 / hostile-XML trust gate | rejects invalid or unsafe input before parsing |
| `src/musicxml/partwiseParser.js` | bounded MusicXML semantic extraction | evidence layer does not guess unsupported shapes |
| `src/polyphony/measureTimeline.js` | cursor/voice/chord timeline and active sonority reconstruction | deterministic per-measure reference semantics |
| `src/verification/semanticComparator.js` | Lab ↔ Engine semantic snapshot normalization/comparison | accepts only reviewed Engine evidence contract `PolyphonicSourceModel 1.0.0` |
| `src/corpus/v1cCapabilityCorpus.js` | validates schema-v2 pinned external corpus provenance, hashes, per-case transform and local outcomes | rejects unpinned/observational manifest entries; local musical unsupported states remain valid evidence |
| `scripts/run-v1c-capability-corpus.mjs` | CI-only raw/probe observation against pinned external source and pinned Engine compatibility chain | raw security stays unchanged; transform/provenance/outcome drift fails |
| `scripts/verify-v1c-committed-report.mjs` | verifies hash-pinned V1C evidence shards and reconstructs committed report | shard/path/hash/case drift fails |
| `src/guitar/tuningConfiguration.js` | six-string tuning/capo configuration | bounded deterministic research contract |
| `src/guitar/fretboardCandidates.js` | physical string/fret candidates per pitch | impossible pitch yields factual no-candidate evidence |
| `src/guitar/sonorityAssignments.js` | bounded distinct-string assignments | strict physical feasibility; not arrangement authority |
| sustained/grace verifier modules | deterministic research baselines | experimental; not production path authority |
| `src/musicxml/guitarTechniqueProvenance.js` | source technique metadata/provenance | no physical-solver authority |

## V1B real Engine evidence

Pinned production repository and commit:

```text
khfy7wpr5p-maker/musicxml-to-guitar-tab-engine
1d8ced644f544f7e991f7275eda77a2ce557774e
```

Committed V1B evidence:

| Fixture | Fixture SHA-256 | Artifact SHA-256 |
|---|---|---|
| `fixtures/compat/ps6-counterpoint-2v.musicxml` | `33a477a500e654a5731980f494ee16d8d0b7a83048114788976f4804e3332bf7` | `967352508ca5e9f64efbdde79e74ed2167e00824064f4d16fbfa0081b6708bf4` |
| `fixtures/compat/ps6-counterpoint-4v-tie.musicxml` | `47122b0aa38b6f9a7fdc974ec47c436ee1b2cead4f822d242b1712b399638c1a` | `be5a61a0e46314242584fbbc5a903e1aa97e241341e95836eb24f080a56ed8b1` |

Files live under `artifacts/v1b-engine/`, with provenance in its manifest. `test/v1bEngineArtifacts.test.js` validates fixture/artifact hashes, Engine identity, contract identity, and zero semantic mismatches for the approved slice.

## V1C external capability evidence

Pinned external source:

```text
repository: w3c-cg/musicxmlTestSuite
commit:     77c19f7e819154c70ca1a1992e80dcda8ff82fea
license:    MIT
```

The V1C schema-v2 manifest contains 22 pinned cases. Each case pins source Git blob SHA, raw SHA-256, semantic-probe SHA-256, approved per-case probe transform, raw Lab/Engine outcome, probe Lab/Engine outcome, and semantic comparison outcome.

All 22 currently pinned upstream files carry an external MusicXML DOCTYPE, so raw trust-boundary behavior remains intentionally:

```text
Lab:    UNSUPPORTED_LOCAL / DOCTYPE_NOT_ALLOWED
Engine: UNSUPPORTED_LOCAL / UNSAFE_XML_DECLARATION
```

This is security-boundary evidence, not a musical support result.

For semantic observation, V1C permits only an explicit transform allowlist. The current DOCTYPE-bearing cases use `REMOVE_VERIFIED_MUSICXML_PARTWISE_EXTERNAL_DOCTYPE`, which accepts only one structurally verified Recordare `score-partwise` PUBLIC declaration with the expected system URI. Arbitrary/multiple declarations and entities are rejected. `IDENTITY_NO_DOCTYPE` is allowed for future already-safe fixtures. Raw P1A/Engine behavior is not modified.

The Engine probe path is the pinned production compatibility normalization chain, not the bare low-level projector:

```text
parseParsedMusicXmlDocument
  -> projectParsedMusicXmlThroughPolyProductionCompatibilityChain
```

Current 22-case probe summary:

| Observation | Count |
|---|---:|
| Lab `SUPPORTED` | 17 |
| Lab `UNSUPPORTED_LOCAL` | 5 |
| Engine `SUPPORTED` | 5 |
| Engine `UNSUPPORTED_LOCAL` | 17 |
| semantic `EQUAL` | 5 |
| semantic `MISMATCH` | 0 |
| semantic `NOT_COMPARABLE` | 17 |

The five exact equality cases are:

- `03b` backup/polyphony;
- `21a` basic chord;
- `33b` simple tie;
- `43a` piano/multistaff;
- `43i` single-voice multistaff staff change.

This is an exact-fixture baseline, not a general support percentage or conformance score.

Committed V1C evidence is sharded:

```text
artifacts/v1c/capability-report.json
artifacts/v1c/cases-01.json
artifacts/v1c/cases-02.json
artifacts/v1c/cases-03.json
artifacts/v1c/cases-04.json
```

The index pins each shard SHA-256. CI reconstructs the committed report and compares it with the freshly generated report.

Detailed contract: `docs/V1C-EXTERNAL-CAPABILITY-CORPUS.md`.

## CI reality

`.github/workflows/ci.yml` runs for PRs to `main` and pushes to `stage/**`.

Current CI performs:

1. locked Lab install;
2. syntax checks;
3. complete Node test suite;
4. checkout exact pinned Engine SHA;
5. locked Engine dependency install;
6. real V1B Engine artifact generation;
7. byte-for-byte V1B evidence reproduction;
8. checkout exact external V1C corpus commit;
9. verify V1C source/blob/raw/probe provenance;
10. run all 22 V1C raw and semantic-probe observations through Lab and pinned Engine production compatibility chain;
11. fail on pinned outcome drift;
12. verify every committed V1C shard hash and reconstruct the full expected report;
13. semantically compare regenerated V1C report with the reconstructed committed baseline;
14. upload regenerated V1B and V1C evidence.

The temporary V1C discovery workflow has been removed after promotion. These remain CI evidence dependencies only; the Lab runtime/package does not import the Engine or external corpus as runtime dependencies.

## Polyphony / capability coverage

| Feature | Current reality |
|---|---|
| 2-voice sustained overlap | ✅ internal pinned fixture + V1B real Engine evidence |
| 3-voice external shape | 🟡 V1C `42b`: Lab parses probe, pinned Engine records local unsupported projection feature |
| 4-voice/tie evidence | ✅ internal pinned fixture + V1B real Engine evidence |
| backup/polyphony external shape | ✅ V1C equality for exact `03b` fixture |
| basic chord external shape | ✅ V1C equality for exact `21a` fixture |
| simple tie external shape | ✅ V1C equality for exact `33b` fixture |
| piano/multistaff external shape | ✅ V1C equality for exact `43a` fixture |
| single-voice staff change | ✅ V1C equality for exact `43i` fixture |
| tuplets | 🟡 `23a`/`23d` expose local Engine triplet-time-modification limits; `23b` additionally exposes time-signature-display limit |
| grace notation | 🟡 `24a`/`24b`/`24c`/`24h` remain local unsupported evidence in current Lab/Engine paths |
| metronome / direction metadata | 🟡 `31c` Lab-supported probe; pinned Engine generic local projection gap |
| octave-shift direction/spanner | 🟡 `33d` Lab-supported probe; pinned Engine generic local projection gap |
| simple/alternative/multiple repeat structures | 🟡 current pinned Engine records local repeat-barline limits |
| fretboard/frame metadata | 🟡 `71c`/`71d` isolate current pinned Engine projection gaps; not a claim about all guitar metadata |
| multipart TAB-staff stress fixture | 🟡 `71e` remains mixed; Lab requires part selection and Engine encounters grace limitation first |
| Lab ↔ Engine semantic comparator | ✅ V1B approved slice + five equal V1C external probes |
| cross-measure sustain-chain joining | ⚠️ outside V1B/V1C semantic comparison contract |
| six-string candidate enumeration | ✅ deterministic Lab research contract |
| distinct-string sonority assignment | ✅ deterministic Lab research contract |
| production arrangement transformations | ❌ not implemented in Lab as production authority |
| MIDI/audio runtime evidence | ❌ not current runtime capability |
| learned guitar evidence | 📋 V4 research direction |

## Comparator boundary

V1B/V1C semantic comparison covers source-note identity, written pitch, onset/duration divisions, voice, staff, tie start/stop evidence, active-sonority membership and peak polyphony.

It does not compare cross-measure sustain chains, physical string/fret state, arrangement/reduction decisions, Canonical TAB, rendering, playback, OMR, or MIDI.

## Progressive-capability reality

The active architecture directive prevents treating verification boundaries as the permanent product ceiling.

Future capability contracts are expected to distinguish:

- `SUPPORTED`;
- `APPROXIMATE`;
- `REVIEW_REQUIRED`;
- `UNSUPPORTED_LOCAL`;
- `BLOCKED_GLOBAL`.

V1C records strict evidence states for exact fixtures and deliberately keeps musical unsupported states local to each case. It does not itself implement production approximation/recovery; it provides reproducible inputs to V2 and later product recovery work.

Unsupported musical detail should ultimately be localized to the smallest truthful scope when surrounding facts remain usable. Global blocking is reserved for genuine global trust/parse/invariant failures or an explicitly strict operation whose global precondition is absent.

## Current continuation point

**V1B is complete and V1C now has a reproducible 22-case pinned external baseline.**

The principal continuation is **V2 Failure Intelligence**. Additional V1C fixtures may still be added incrementally for `.mxl` transport, transposition, microtones, more guitar technical metadata and further isolated presentation forms, but they no longer gate starting V2.

```text
V2 localized failure intelligence
  -> V3 independent strict feasibility oracle
  -> explicit arrangement / N-best alternatives
  -> V4 ergonomic + learned evidence in shadow mode
```

## Remaining known work

- V2: replace broad/generic failure observations with a stable localized failure/recovery taxonomy where evidence justifies specificity.
- V2: classify source-feature, normalization, projection, search and downstream recovery layers without conflating them.
- V2: attach narrowest truthful scope and safe recovery metadata so local uncertainty need not become global blocking.
- Add further V1C fixtures incrementally, especially `.mxl`, transposition, microtones and guitar technical metadata.
- V3 independent feasibility oracle.
- Explicit arrangement contracts and provenance-tracked transformations.
- V4 TabCNN/FretNet/ergonomic evidence providers after benchmark/calibration gates.
- Repository protection/ruleset enforcement remains a separate repository-administration concern.

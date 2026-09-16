# Repository reality

Fresh-read scope: current `stage/v2-failure-intelligence-foundation` branch, source/tests, package scripts, CI, internal compatibility fixtures, committed V1B Engine evidence, pinned V1C external evidence, V2A failure-intelligence evidence, and the active progressive-capability directive as of 2026-09-16.

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
  -> V2A failure intelligence
       family / layer / scope / handling

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
| `src/failures/v2FailureIntelligence.js` | deterministic mapping from observed failure codes to family/layer/scope/handling evidence | semantic failures cannot become global blocks; unknown codes remain local and unrefined |
| `scripts/run-v2-failure-intelligence.mjs` | derives V2A evidence from V1C shards and verifies Lab/Engine code-emission anchors | pinned Engine identity, source-anchor drift and unmapped observed codes fail |
| `scripts/verify-v2-failure-intelligence-report.mjs` | projects regenerated V2 report to the committed stable baseline | context-only fixture metadata is excluded from causal baseline comparison |
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

The five exact equality cases are `03b`, `21a`, `33b`, `43a`, and `43i`. This is an exact-fixture baseline, not a general support percentage or conformance score.

Committed V1C evidence is sharded under `artifacts/v1c/`, and the report index pins each shard SHA-256.

Detailed contract: `docs/V1C-EXTERNAL-CAPABILITY-CORPUS.md`.

## V2A failure intelligence evidence

V2A classifies every currently observed V1C unsupported result.

Committed baseline:

```text
artifacts/v2/failure-intelligence-baseline.json
```

Current summary:

| Observation | Count |
|---|---:|
| total failure observations | 66 |
| raw input trust-boundary failures | 44 |
| semantic-probe capability failures | 22 |
| semantic `REVIEW_REQUIRED` candidates | 16 |
| semantic `UNSUPPORTED_LOCAL` pending refinement | 6 |
| unclassified observed failures | 0 |

Current family counts:

| Failure family | Count |
|---|---:|
| `INPUT_SECURITY` | 44 |
| `GENERIC_PROJECTION_CAPABILITY` | 6 |
| `ORNAMENT_COMPATIBILITY` | 5 |
| `SOURCE_SEMANTIC_CAPABILITY` | 4 |
| `PLAYBACK_STRUCTURE` | 3 |
| `RHYTHM_COMPATIBILITY` | 2 |
| `SOURCE_SELECTION` | 1 |
| `PRESENTATION_COMPATIBILITY` | 1 |

The raw trust-boundary codes are the only current `BLOCKED_GLOBAL` candidates. All semantic-probe classifications are prevented from becoming global blocks.

Six `UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE` observations remain intentionally generic:

```text
failureFamily: GENERIC_PROJECTION_CAPABILITY
layer: PROJECTION_OR_COMPATIBILITY
scopeClass: UNKNOWN_LOCAL
handlingClass: NEEDS_FEATURE_REFINEMENT
progressiveStateCandidate: UNSUPPORTED_LOCAL
```

Their fixture categories and feature tags are context, not causal proof.

Detailed contract: `docs/V2-FAILURE-INTELLIGENCE.md`.

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
11. fail on pinned V1C outcome drift;
12. verify every committed V1C shard hash and reconstruct the full expected V1C report;
13. compare regenerated V1C report with committed V1C baseline;
14. generate V2A failure-intelligence report from the verified V1C evidence;
15. verify every V2 taxonomy source anchor against Lab or the exact pinned Engine checkout;
16. fail if any currently observed failure is unclassified;
17. enforce the no-semantic-global-block invariant;
18. compare the regenerated stable V2 projection with the committed V2 baseline;
19. upload regenerated V1B, V1C and V2 evidence.

These remain CI evidence dependencies only. The Lab runtime/package does not import the Engine or external corpus as runtime dependencies.

## Polyphony / capability coverage

| Feature | Current reality |
|---|---|
| 2-voice sustained overlap | ✅ internal pinned fixture + V1B real Engine evidence |
| 3-voice external shape | 🟡 V1C `42b`: Lab parses probe, pinned Engine records generic local projection gap; V2B refinement required |
| 4-voice/tie evidence | ✅ internal pinned fixture + V1B real Engine evidence |
| backup/polyphony external shape | ✅ V1C equality for exact `03b` fixture |
| basic chord external shape | ✅ V1C equality for exact `21a` fixture |
| simple tie external shape | ✅ V1C equality for exact `33b` fixture |
| piano/multistaff external shape | ✅ V1C equality for exact `43a` fixture |
| single-voice staff change | ✅ V1C equality for exact `43i` fixture |
| tuplets | 🟡 V2A classifies triplet/time-modification as local rhythm compatibility; `23b` time-signature display is local presentation compatibility |
| grace notation | 🟡 V2A separates Lab source-semantic grace limitation from Engine ornament compatibility limitation |
| metronome / direction metadata | 🟡 generic projection gap; V2B must collect live cause details before narrowing |
| octave-shift direction/spanner | 🟡 generic projection gap; V2B must collect live cause details before narrowing |
| repeat structures | 🟡 V2A classifies current repeat-barline failures as measure-region playback-structure review candidates |
| fretboard/frame metadata | 🟡 generic projection gap; V2B refinement required |
| multipart TAB-staff stress fixture | 🟡 V2A separates Lab part-selection requirement from Engine grace limitation |
| Lab ↔ Engine semantic comparator | ✅ V1B approved slice + five equal V1C external probes |
| cross-measure sustain-chain joining | ⚠️ outside V1B/V1C semantic comparison contract |
| six-string candidate enumeration | ✅ deterministic Lab research contract |
| distinct-string sonority assignment | ✅ deterministic Lab research contract |
| production arrangement transformations | ❌ not implemented in Lab as production authority |
| MIDI/audio runtime evidence | ❌ not current runtime capability |
| learned guitar evidence | 📋 V4 research direction |

## Progressive-capability reality

The active architecture directive prevents treating verification boundaries as the permanent product ceiling.

V2A now provides evidence-level candidates for `REVIEW_REQUIRED`, `UNSUPPORTED_LOCAL`, and raw-operation `BLOCKED_GLOBAL`, but these are not production runtime decisions.

Unsupported musical detail should ultimately be localized to the smallest truthful scope when surrounding facts remain usable. Global blocking is reserved for genuine global trust/parse/invariant failures or an explicitly strict operation whose global precondition is absent.

## Current continuation point

**V1B, V1C, and V2A are implemented as reproducible evidence layers.**

The principal continuation is **V2B bounded cause/location refinement** for the six generic projection observations. Additional V1C fixtures may still be added incrementally but do not gate V2B.

```text
V2B live bounded failure detail/location refinement
  -> V3 independent strict feasibility oracle
  -> explicit arrangement / N-best alternatives
  -> V4 ergonomic + learned evidence in shadow mode
```

## Remaining known work

- V2B: capture bounded live Engine `error.name`, safe `error.details`, and location evidence for generic projection cases.
- V2B: split generic projection observations only where exact runtime evidence proves the cause/layer.
- V2B: preserve `UNKNOWN_LOCAL` when exact cause or scope cannot be proven.
- V2C: semantic mismatch classification if/when mismatch evidence exists.
- Add further V1C fixtures incrementally, especially `.mxl`, transposition, microtones and guitar technical metadata.
- V3 independent feasibility oracle.
- Explicit arrangement contracts and provenance-tracked transformations.
- V4 TabCNN/FretNet/ergonomic evidence providers after benchmark/calibration gates.
- Repository protection/ruleset enforcement remains a separate repository-administration concern.

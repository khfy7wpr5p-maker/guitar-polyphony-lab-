# Repository reality

Fresh-read scope: current `stage/v1b-semantic-comparator` branch relative to `main`, current source tree, package scripts, 15 Node test files, GitHub Actions workflow, fixture registries, and open GitHub work as of this refresh. This document describes this repository only; references to other repositories are integration boundaries, not imported runtime behavior.

## Architecture

```text
MusicXML string / UTF-8 bytes
  -> P1A input gate
  -> P1B partwise parser
  -> P0 measure timeline and sonority spans
  -> Lab semantic snapshot ----------------------+
                                                   |
Engine-produced PolyphonicSourceModel 1.0.0       |
  -> Engine semantic snapshot --------------------+
                                                   |
                                                   v
                                      V1B semantic comparator
                                                   |
                                                   v
                                      deterministic mismatch report

P0 note/sonority facts may also feed:
  -> configuration-aware candidates (P2A)
  -> distinct-string assignments (P2B)
  -> optional sustained/grace research verification
  -> fixtures, snapshots, hashes, and research evidence
```

Technique provenance is a parallel sidecar. It may be validated against logical note identity but is intentionally not fed into candidate generation, assignment enumeration, research-verifier ranking, or V1B physical meaning.

## Implemented contracts

| Module | Input | Processing / decision | Output | Failure behavior |
|---|---|---|---|---|
| `src/musicxml/inputGate.js` | string or `Uint8Array` | UTF-8, 5 MiB default / 20 MiB hard cap, root and hostile-XML checks | frozen `{ xml, byteLength, rootKind }` | rejects invalid UTF-8, NUL, DTD/entity/XInclude, and non-partwise input |
| `src/musicxml/partwiseParser.js` | gated MusicXML | SAX parsing and bounded semantic extraction | frozen parts → measures → ordered events | rejects unsupported timing/pitch/XML forms; no partial result |
| `src/polyphony/measureTimeline.js` | one measure's events | cursor, `backup`, `forward`, chord-onset reuse, interval and active-span construction | sorted notes, sonority spans, measure end | deterministic explicit errors |
| `src/verification/semanticComparator.js` | MusicXML reference input and/or Engine `PolyphonicSourceModel 1.0.0` evidence | normalizes source-note facts, derives sonorities, compares deterministic semantic snapshots | immutable semantic snapshot / mismatch report | rejects unsupported Engine contracts, malformed evidence, duplicate semantic identities, and ambiguous multipart selection |
| `src/guitar/tuningConfiguration.js` | Standard/Drop D/custom tuning and optional capo | validates six strings, pitches/MIDI, bounds, relative-capo semantics | immutable `GuitarConfiguration` | rejects malformed or contradictory configuration |
| `src/guitar/fretboardCandidates.js` | pitch + configuration | spelling-to-MIDI then enumerate valid string/fret positions | immutable candidates; optional attached note intervals | invalid pitch fails; unplayable pitch returns `[]` |
| `src/guitar/sonorityAssignments.js` | notes with candidates | enumerate distinct-string assignments, canonical traversal | all valid assignments | invalid data and >6 notes fail; impossible sonority returns `[]`; >limit fails closed |
| `src/guitar/sustainedTuningVerifier.js` | ordered research points + configuration | holds prior physical positions and selects a lexicographic distinct-string baseline | deterministic research result or blocked result | does not mutate source points; blocks unresolved states |
| `src/guitar/graceTuningVerifier.js` | grace transition evidence + configuration | reserves held strings and applies a lexicographic transition baseline | deterministic research result or blocked result | does not create grace timing/duration |
| `src/musicxml/guitarTechniqueProvenance.js` | bounded technique source facts | validates sidecar and deterministic pair identity | immutable provenance record | rejects musical facts and physical-solver authority |

All listed algorithms are deterministic within their bounded inputs. The code does not expose confidence scores, probabilistic ranking, automatic correction, source mutation, or a reversible patch protocol.

## Data model

| Contract | Required fields / purpose | Producers | Consumers |
|---|---|---|---|
| ordered event | `type`; notes require `id`, `pitch`, `duration`; optional `voice`, `staff`, `chord`, tie flags | partwise parser or caller | measure timeline |
| note interval | `id`, `pitch`, `voice`, `staff`, `duration`, `onset`, `end` | measure timeline | sonority spans, candidate attachment |
| sonority span | `start`, `end`, `activeNoteIds`, `activeNotes` | measure timeline | P2A/P2B and verifier inputs assembled by callers |
| semantic snapshot | `partId`, measure identity, zero-based source-note identity, written pitch, onset/duration divisions, voice/staff/ties, active sonorities, peak polyphony | Lab snapshot builder or Engine-source-model adapter | V1B comparator |
| semantic comparison report | producer identities, compared counts, deterministic mismatch list | V1B comparator | review / failure reproduction / later production evidence |
| GuitarConfiguration | six tuning entries plus `capoFret`; default is Standard | configuration module, MusicXML provenance/serializer | candidates, verifiers, serializer |
| candidate | `string`, `fret`, `pitch`, `pitchMidi`, `openPitch` | P2A | P2B, sustained/grace verifiers |
| assignment entry | `noteId`, `pitch`, `string`, `fret`; carries voice/staff/MIDI when present | P2B | research baselines and benchmarks |
| technique provenance | `documentType`, kind/state/source shape and capability class | provenance module | metadata-invariance benchmark |

## Polyphony and physical coverage

| Feature | Corpus fixture | Direct automated test | Current status |
|---|---|---|---|
| 2 voices / sustained overlap | yes | yes | ✅ PRODUCTION |
| 3 voices | no dedicated fixture | verifier scenarios only | 🟡 PARTIAL |
| 4 voices / tie evidence | yes | yes | ✅ PRODUCTION per measure |
| Lab ↔ Engine semantic comparator core | synthetic Engine evidence in unit tests | yes | 🟡 PARTIAL — real pinned Engine artifacts pending |
| cross-measure tie joining | source evidence only | no join contract | ⚠️ FAIL-CLOSED / not implemented |
| repeated pitch / same-pitch concurrent notes | assignment impossibility test | yes | 🟡 PARTIAL |
| string/fret mapping | Standard, Drop D, custom, capo scenarios | yes | ✅ PRODUCTION research contract |
| sustained physical path | benchmark scenarios | yes | 🧪 EXPERIMENTAL |
| grace physical transition | benchmark scenarios | yes | 🧪 EXPERIMENTAL |
| MIDI | no | no | ❌ UNSUPPORTED |

The compatibility registry contains exactly two committed MusicXML fixtures. Technique source files are external-only; two minimal synthetic MusicXML fragments are committed. That is not a representative performance corpus.

## V1B comparator reality

`src/verification/semanticComparator.js` currently provides three explicit operations:

- `buildLabSemanticSnapshot()` — MusicXML → P1A/P1B/P0 → Lab semantic snapshot;
- `adaptEnginePolyphonicSourceModel()` — Engine-produced `PolyphonicSourceModel 1.0.0` data → semantic snapshot;
- `compareSemanticSnapshots()` — deterministic semantic mismatch report.

The matching identity is `partId + measureIndex + sourceNoteIndex`. Source rests consume `sourceNoteIndex` positions even though they are not emitted as P0 pitched-note intervals. Current comparison covers written pitch, onset, duration, voice, staff, tie flags, sonority membership and peak polyphony.

Cross-measure sustain chains, physical string/fret state, technique semantics, reduction decisions and Canonical TAB are not compared by this contract.

No Engine package or runtime module is imported. The outstanding V1B evidence gap is the absence of committed/pinned **real Engine-generated** `PolyphonicSourceModel 1.0.0` artifacts for the approved compatibility fixtures.

## Guitar techniques and ambiguity

The verified capability is source provenance, not physical interpretation. Empty/unspecified harmonic, simple hammer-on, slide, natural-harmonic role, straight mute, position, fingering, and pluck can pass the metadata-only benchmark when their shape matches the retained evidence. They remain unable to alter pitch, duration, timing, candidates, assignment ranking, or physical path.

Reused hammer-on numbers are not unique pairing keys. Artificial harmonic pitch-role chord projection, let-ring scope, pull-off, bend, palm mute, tap, malformed endpoints, and producer-unknown structures are blocked. No technique currently has physical-semantics authorization (`PHYSICAL_SEMANTICS_RESEARCH_GATE.json`).

## Test and CI reality

`npm run check` performs JavaScript syntax checks for the explicit source list, now including the V1B comparator. `npm test` runs Node's test runner. The current suite covers gates, parser boundaries, timeline semantics, corpus provenance, configurations, candidates, assignments, technique sidecars, metadata invariance, research gates, and V1B semantic comparison behavior.

The V1B tests use synthetic values shaped as Engine `PolyphonicSourceModel 1.0.0` evidence. They verify comparator mechanics and contract boundaries but are not a substitute for pinned artifacts actually generated by the production Engine.

The suite still does not run linting, TypeScript, build, browser/runtime E2E, link checking, schema-generator validation, mutation testing, or a live cross-repository Engine invocation.

`.github/workflows/ci.yml` runs locked dependency installation, `npm run check`, and `npm test` for pull requests to `main` and pushes to `stage/**`. This branch therefore receives branch-push CI as well as pull-request CI once a PR is opened.

## Integration boundary

`musicxml-to-guitar-tab-engine` is named as the production authority and supplies the two pinned compatibility fixtures. V1B accepts an Engine-owned data contract (`PolyphonicSourceModel 1.0.0`) as external evidence, but the Lab exports no package/API contract to the Engine and must not be a production runtime dependency. There is no repository code or fixture contract for ST Score Restore, ST OMR Correction Engine, ST Score Rendering Layer, ScoreMosaic, SesliTab, Guitar Harmony Engine, Guitar AI, or MIDI.

## Open work observed at refresh

- **V1B real artifact integration:** comparator core is implemented; real Engine-generated source-model artifacts are not yet pinned in Lab CI.
- **V1C external licensed compatibility corpus:** planned; external evidence is not committed as corpus fixtures.
- **Physical technique semantics:** explicitly blocked pending a separately approved research implementation.
- **Main protection:** repository issue #2 reports that protection/ruleset enforcement remains absent.
- **Guitar Pro `technical/down-bow` provenance:** repository issue #17 remains research-only and fail-closed.

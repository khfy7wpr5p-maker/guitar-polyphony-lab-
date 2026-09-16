# Architecture

## Project purpose

`guitar-polyphony-lab` is an independent research and verification laboratory for guitar polyphony.

It exists to produce deterministic, reproducible evidence about:

- MusicXML source facts and active polyphony;
- guitar physical feasibility under declared tuning/capo;
- differences between Lab reference semantics and production Engine semantics;
- why a current capability fails and at what scope;
- whether a production failure is a strict physical impossibility or a search/capability limitation;
- future arrangement alternatives and soft ergonomic/learned ranking evidence.

The Lab does **not** own production TAB output. Production authority remains `musicxml-to-guitar-tab-engine`.

## Governing architecture policy

The end product must be broad-capability rather than safe-by-refusal.

The architecture separates:

1. **source truth** — immutable facts from the input;
2. **strict physical feasibility** — what can be realized without changing musical content;
3. **capability availability** — what the current implementation can interpret;
4. **failure intelligence** — family, layer, reliable scope and recovery class;
5. **local approximation/review** — recoverable uncertainty that must not erase unrelated valid output;
6. **arrangement transformation** — explicit musical changes such as omission or octave displacement;
7. **soft ranking/evidence** — ergonomics, style, player profile, or learned evidence;
8. **teacher edits** — human replacement of provisional decisions;
9. **export readiness** — independent from provisional on-screen visibility.

Verification contracts may fail closed on malformed evidence or trust-boundary violations. That does not imply that a future product should globally block a score because one musical feature is unsupported.

The active policy is documented in `handoffs/guitar_polyphony_lab_progressive_capability_developer_prompt_2026-09-16.json`.

## Authority boundary

The production polyphony/TAB authority is `musicxml-to-guitar-tab-engine`.

The Lab must not become a production runtime dependency. Evidence may move toward production through licensed/internal fixtures, pinned production artifacts, semantic snapshots, deterministic mismatch reports, capability reports, failure-intelligence reports, benchmark results, independent feasibility evidence and separately reviewed production changes.

The Lab does not own production reduction policy, arrangement authority, sustained-path selection, Canonical TAB contracts, writer behavior, rendering, playback, OMR, or application UI.

## Existing modules

- **P0** — measure timeline / sonority reference semantics
- **P1A** — bounded MusicXML trust/input gate
- **P1B** — partwise parser adapter
- **P1C** — internal compatibility corpus foundation
- **P2A** — deterministic fretboard candidates
- **P2B** — bounded distinct-string sonority assignments
- **V1A** — corpus provenance/licensing/expectation registry
- **V1B** — Lab snapshot ↔ Engine `PolyphonicSourceModel 1.0.0` comparator
- **V1C** — 22-case pinned external MusicXML capability regression with raw-input and semantic-probe observations
- **V2A** — deterministic failure-family / layer / scope / handling taxonomy over current V1C failures
- **configuration research** — Standard / Drop D / custom tuning / capo
- **technique provenance** — metadata/source evidence with no automatic physical authority

## Current architecture map

```text
                       GUITAR POLYPHONY LAB

LICENSED / INTERNAL MusicXML
            |
            v
     +---------------+
     | P1A INPUT GATE|
     +-------+-------+
             |
             v
     +---------------+
     | P1B PARSER    |
     +-------+-------+
             |
             v
     +---------------+
     | P0 POLYPHONY  |
     +---+-------+---+
         |       |
         |       +--------------------------+
         |                                  |
         v                                  v
Lab semantic snapshot              P2A candidates
         |                                  |
         |                                  v
         |                           P2B assignments
         |                                  |
         |                                  v
         |                     strict feasibility evidence
         |
         |           SAME APPROVED SOURCE FIXTURE
         |                     |
         |                     v
         |       musicxml-to-guitar-tab-engine
         |          parser / projector
         |                     |
         |                     v
         |       PolyphonicSourceModel 1.0.0
         |                     |
         +----------+----------+
                    |
                    v
             V1B COMPARATOR
                    |
                    v
       deterministic equality/mismatch

PINNED EXTERNAL MusicXML CORPUS
                    |
          +---------+---------+
          |                   |
          v                   v
  raw trust-boundary      offline semantic probe
     observation          approved per-case transform
                              |
                    +---------+---------+
                    |                   |
                    v                   v
                  Lab               Engine
                                      production
                                      compatibility chain
                    |                   |
                    +---------+---------+
                              |
                              v
                    V1C capability report
                              |
                              v
                    V2A FAILURE INTELLIGENCE
                    family / layer / scope / handling
                              |
                              +--> exact local review candidates
                              |
                              +--> generic projection cases
                                   remain UNKNOWN_LOCAL
```

## V1B — closed reproducible slice

The approved two-fixture V1B loop is implemented.

Pinned Engine commit:

```text
1d8ced644f544f7e991f7275eda77a2ce557774e
```

Evidence files are committed under `artifacts/v1b-engine/` with fixture hashes, Engine identity and artifact hashes. CI checks out the exact Engine SHA, regenerates both artifacts, requires byte-for-byte reproduction, and runs Lab semantic-comparison tests.

V1B comparison covers source-note identity, written pitch, onset/duration divisions, voice, staff, tie evidence, active-sonority membership and peak polyphony. Cross-measure sustain joining, guitar string/fret state, arrangement decisions and Canonical TAB remain outside this comparator contract.

## V1C — 22-case external capability baseline

V1C has a reproducible 22-case baseline from `w3c-cg/musicxmlTestSuite`, pinned to external commit:

```text
77c19f7e819154c70ca1a1992e80dcda8ff82fea
```

Raw-input rejection remains separate from musical-semantic capability and the raw P1A/Engine security boundaries remain unchanged. Offline probes use an explicit per-case transform allowlist. For DOCTYPE-bearing fixtures the transform accepts only one structurally verified Recordare MusicXML `score-partwise` declaration and rejects arbitrary/multiple declarations or entities.

Pinned summary:

```text
cases:                    22
probe Lab supported:      17
probe Engine supported:    5
semantic EQUAL:            5
semantic MISMATCH:         0
semantic NOT_COMPARABLE:  17
```

Committed V1C report evidence is sharded and hash-verified. CI regenerates the full report from the pinned corpus and Engine revision and requires exact local-outcome and committed-report agreement.

See `docs/V1C-EXTERNAL-CAPABILITY-CORPUS.md`.

## V2A — failure intelligence foundation

V2A is implemented for every unsupported observation in the current V1C baseline.

Current deterministic evidence:

```text
failure observations:             66
raw trust-boundary failures:       44
semantic capability failures:      22
semantic REVIEW_REQUIRED candidates:16
semantic UNSUPPORTED_LOCAL refined-later: 6
unclassified observed failures:     0
```

Eight current failure families are represented:

- `INPUT_SECURITY`;
- `SOURCE_SELECTION`;
- `SOURCE_SEMANTIC_CAPABILITY`;
- `RHYTHM_COMPATIBILITY`;
- `ORNAMENT_COMPATIBILITY`;
- `PLAYBACK_STRUCTURE`;
- `PRESENTATION_COMPATIBILITY`;
- `GENERIC_PROJECTION_CAPABILITY`.

V2A enforces one critical invariant:

```text
SEMANTIC_PROBE failure -> never BLOCKED_GLOBAL in Lab taxonomy
```

The only current `BLOCKED_GLOBAL` candidate is a raw trust-boundary rejection at score-input scope.

`UNSUPPORTED_POLYPHONIC_PROJECTION_FEATURE` remains deliberately generic because the code has multiple emitters. The six current cases are `UNKNOWN_LOCAL / NEEDS_FEATURE_REFINEMENT`; case names and feature tags are context, not causal proof.

CI verifies mapped error-code source anchors in the pinned Engine checkout, regenerates the full V2 report, and requires exact agreement with `artifacts/v2/failure-intelligence-baseline.json` after context-only metadata is projected out.

See `docs/V2-FAILURE-INTELLIGENCE.md`.

## Current continuation point — V2B cause/location refinement

```text
V1B reproducible evidence loop ✅
        |
        v
V1C 22-case external capability baseline ✅
        |
        v
V2A deterministic failure taxonomy ✅
        |
        v
V2B GENERIC CAUSE + LOCATION REFINEMENT  <--- NEXT
        |
        +--> capture bounded error.name / error.details
        +--> prove exact feature cause where available
        +--> narrow scope to event / measure / region when evidence permits
        +--> keep UNKNOWN_LOCAL when evidence is insufficient
        |
        v
V3 independent strict feasibility oracle
        |
        v
explicit arrangement / N-best research
        |
        v
V4 learned/ergonomic evidence in shadow mode
```

Further V1C corpus growth remains additive and does not block V2B.

## P1 trust boundary

P1A remains authoritative before XML parsing. It enforces bounded UTF-8 input, `score-partwise`, no DTD/entity/XInclude input, no NUL bytes, and explicit resource limits.

V1C semantic transforms are offline regression probes only. They are not production sanitization rules and must never bypass raw trust-boundary evidence.

P1B extracts only bounded semantic facts required by the Lab. At this evidence layer, unsupported or malformed source shapes may fail closed rather than being guessed.

## P0 polyphony boundary

P0 owns deterministic per-measure reference reconstruction: cursor movement, chord onset reuse, backup/forward voice overlap, note intervals, active-sonority spans and deterministic validation. P0 does not own production arrangement or final guitar realization.

## P2 physical feasibility boundary

P2A answers where a pitch can physically exist on the declared six-string configuration. P2B answers whether simultaneously active notes can occupy distinct strings and enumerates bounded assignments.

Physical validity is a hard constraint. A future arrangement layer may transform the musical problem explicitly, but a soft score or ML provider may never relabel an impossible untransformed candidate as physically valid.

## Progressive capability states

Shared architecture contracts use or plan around:

- `SUPPORTED`
- `APPROXIMATE`
- `REVIEW_REQUIRED`
- `UNSUPPORTED_LOCAL`
- `BLOCKED_GLOBAL`

The narrowest truthful scope should be used: note, event, voice, measure, region, capability, export operation, part, or score. `REVIEW_REQUIRED` is not intended to be a global TAB lock.

V2A `progressiveStateCandidate` is evidence-only architecture metadata. Production recovery behavior remains separately reviewed work.

## Arrangement direction

Future arrangement work is allowed to create transformed alternatives while preserving original source facts separately. Candidate transformations include voice prioritization, melody/bass preservation, inner-voice reduction, omission, octave displacement, register compression, arpeggiation, N-best alternatives and teacher/style/skill profiles.

Every transformation must record before/after facts, reason, provider/policy and editability/reversibility. A transformation must never masquerade as original MusicXML truth.

## V3 independent feasibility oracle

An offline/CI oracle may later distinguish true guitar impossibility from production-search failure. It remains evidence only and must not become an accidental production runtime dependency.

## V4 learned evidence

TabCNN/FretNet-style systems are future evidence providers, not current production authority.

The intended hierarchy is:

```text
source truth
   > hard physical constraints
   > explicit arrangement policy
   > soft ergonomic / learned ranking evidence
```

A learned provider may eventually rank already-valid candidates or explicit arrangement alternatives under a reviewed policy. It may not invent hard source facts, override tuning/capo, or convert physical impossibility into validity.

## Roadmap

- **V1A** corpus registry — ✅
- **V1B** real Engine/Lab semantic evidence — ✅
- **V1C** external MusicXML capability classification — ✅ 22-case pinned baseline
- **V2A** failure taxonomy + deterministic baseline — ✅
- **V2B** live bounded cause/location refinement — **NEXT**
- **V2C** semantic mismatch classification — pending mismatch evidence
- **V3** independent feasibility oracle
- **Arrangement / N-best** explicit transformed alternatives
- **V4** ergonomic and learned evidence providers in shadow mode

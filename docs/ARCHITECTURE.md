# Architecture

## Project purpose

`guitar-polyphony-lab` is an independent research and verification laboratory for guitar polyphony.

It exists to produce deterministic, reproducible evidence about:

- MusicXML source facts and active polyphony;
- guitar physical feasibility under declared tuning/capo;
- differences between Lab reference semantics and production Engine semantics;
- whether a production failure is a strict physical impossibility or a search/capability limitation;
- future arrangement alternatives and soft ergonomic/learned ranking evidence.

The Lab does **not** own production TAB output. Production authority remains `musicxml-to-guitar-tab-engine`.

## Governing architecture policy

The end product must be broad-capability rather than safe-by-refusal.

The architecture separates:

1. **source truth** — immutable facts from the input;
2. **strict physical feasibility** — what can be realized without changing musical content;
3. **capability availability** — what the current implementation can interpret;
4. **local approximation/review** — recoverable uncertainty that must not erase unrelated valid output;
5. **arrangement transformation** — explicit musical changes such as omission or octave displacement;
6. **soft ranking/evidence** — ergonomics, style, player profile, or learned evidence;
7. **teacher edits** — human replacement of provisional decisions;
8. **export readiness** — independent from provisional on-screen visibility.

Verification contracts may fail closed on malformed evidence or trust-boundary violations. That does not imply that a future product should globally block a score because one musical feature is unsupported.

The active policy is documented in `handoffs/guitar_polyphony_lab_progressive_capability_developer_prompt_2026-09-16.json`.

## Authority boundary

The production polyphony/TAB authority is `musicxml-to-guitar-tab-engine`.

The Lab must not become a production runtime dependency. Evidence may move toward production through:

- licensed/internal fixtures;
- pinned production artifacts;
- semantic snapshots and deterministic mismatch reports;
- capability reports and reproducible failure classifications;
- benchmark results;
- independent feasibility evidence;
- separately reviewed production changes.

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
                    local supported / unsupported
                    + semantic equality evidence
                              |
                              v
                    V2 FAILURE INTELLIGENCE
                    layer / scope / recovery reason
```

## V1B — closed reproducible slice

The approved two-fixture V1B loop is implemented.

Pinned Engine commit:

```text
1d8ced644f544f7e991f7275eda77a2ce557774e
```

Evidence files are committed under `artifacts/v1b-engine/` with fixture hashes, Engine identity and artifact hashes. `test/v1bEngineArtifacts.test.js` requires semantic equality between each pinned Engine artifact and the Lab snapshot.

CI additionally checks out the exact Engine SHA, regenerates both artifacts, requires byte-for-byte reproduction, and uploads the regenerated evidence. No Engine module is imported by the Lab runtime/package.

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

The five equality fixtures are exact evidence for:

- backup/polyphony (`03b`);
- basic chord (`21a`);
- simple tie (`33b`);
- piano/multistaff (`43a`);
- single-voice multistaff staff-change (`43i`).

These are fixture-specific observations, not general MusicXML support claims.

Committed V1C report evidence is sharded and hash-verified. CI regenerates the full 22-case report from the pinned corpus and Engine revision, verifies exact expected local outcomes, verifies shard hashes, reconstructs the committed report, and requires semantic equality with the regenerated report.

See `docs/V1C-EXTERNAL-CAPABILITY-CORPUS.md`.

## Current continuation point — V2 Failure Intelligence

```text
V1B reproducible evidence loop ✅
        |
        v
V1C 22-case external capability baseline ✅
        |
        +--> further corpus growth remains additive
        |    (.mxl, transposition, microtones, more guitar metadata)
        |
        v
V2 FAILURE INTELLIGENCE  <--- CURRENT NEXT STAGE
        |
        +--> stable localized failure/recovery taxonomy
        +--> classify source / normalization / projection / search failures
        +--> narrowest truthful scope
        +--> preserve provisional downstream work where safe
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

V1C broadens evidence without weakening source-truth validation. V2 must now convert that evidence into precise, local, machine-readable failure intelligence rather than turning unsupported musical details into whole-score blocking.

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

Future shared contracts should be able to represent at least:

- `SUPPORTED`
- `APPROXIMATE`
- `REVIEW_REQUIRED`
- `UNSUPPORTED_LOCAL`
- `BLOCKED_GLOBAL`

The narrowest truthful scope should be used: note, event, voice, measure, region, capability, export operation, part, or score. `REVIEW_REQUIRED` is not intended to be a global TAB lock.

V1C records strict `SUPPORTED` or `UNSUPPORTED_LOCAL` evidence for exact fixtures. V2 is the next layer that must classify why a capability failed and what recovery scope is safe. Production recovery behavior remains separately reviewed work.

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

- **V1A** corpus registry — ✅ initial slice
- **V1B** real Engine/Lab semantic evidence — ✅ approved two-fixture reproducible slice
- **V1C** external MusicXML capability classification — ✅ 22-case pinned baseline; further expansion additive
- **V2** localized failure intelligence — **NEXT**
- **V3** independent feasibility oracle
- **Arrangement / N-best** explicit transformed alternatives
- **V4** ergonomic and learned evidence providers in shadow mode

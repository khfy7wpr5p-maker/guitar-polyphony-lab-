# Architecture

## Project purpose

`guitar-polyphony-lab` is an **independent research and verification laboratory for guitar polyphony**.

Its job is to answer, with deterministic and reproducible evidence:

- what polyphonic facts a MusicXML source actually contains;
- which notes are active at the same time;
- which guitar string/fret realizations are physically possible under a declared tuning/capo;
- whether bounded sonorities have valid distinct-string assignments;
- whether production `musicxml-to-guitar-tab-engine` semantics agree with an independent reference model;
- whether a reported production failure is a true physical/musical impossibility or a production-search limitation;
- later, which physically valid realizations are more plausible/ergonomic according to research evidence.

The Lab does **not** own production TAB output. It produces verification evidence that may justify separately reviewed production changes.

## Authority boundary

The production polyphony/TAB authority is `musicxml-to-guitar-tab-engine`.

The Lab must not become a runtime dependency of the production Engine. Evidence moves from the Lab to production only through:

- licensed/internal fixtures;
- semantic snapshots;
- deterministic mismatch reports;
- benchmark results;
- failure reproductions;
- independent feasibility evidence;
- separately reviewed production PRs.

The Lab does not own production reduction policy, sustained-path selection, Canonical TAB contracts, writer behavior, rendering, playback, OMR, MIDI transcription, or application UI.

## Existing Lab modules and bounded roles

- **P0 measure timeline / sonority semantics** — reference semantic oracle
- **P1A bounded MusicXML input gate** — security / hostile-input validation
- **P1B parser adapter** — differential parser oracle
- **P1C compatibility corpus** — corpus / regression foundation
- **P2A fretboard candidate generation** — deterministic physical candidate oracle
- **P2B distinct-string sonority assignment** — bounded sonority feasibility oracle
- **V1A corpus registry** — provenance, hashes, licensing and expected semantic facts
- **V1B semantic comparator** — Lab snapshot ↔ Engine `PolyphonicSourceModel 1.0.0` evidence comparison
- **configuration-aware research verification** — Standard / Drop D / custom tuning / capo plus sustained and grace verifiers
- **technique provenance** — metadata-only source evidence with an explicit physical-semantics gate

These modules may challenge production behavior, but none becomes production authority merely because equivalent behavior exists in the Lab.

## Current architecture map

```text
                           GUITAR POLYPHONY LAB

LICENSED / INTERNAL MusicXML FIXTURE
                |
                v
        +-------------------+
        | P1A INPUT GATE    |  size / UTF-8 / hostile XML
        +---------+---------+
                  |
                  v
        +-------------------+
        | P1B PARSER        |  note / rest / voice / staff / tie
        +---------+---------+
                  |
                  v
        +-------------------+
        | P0 POLYPHONY      |  timeline / overlap / sonority spans
        +----+---------+----+
             |         |
             |         +-------------------------------+
             |                                         |
             v                                         v
 +-----------------------+                    +----------------------+
 | Lab semantic snapshot |                    | P2A fret candidates  |
 +-----------+-----------+                    +----------+-----------+
             |                                           |
             |                                           v
             |                                +----------------------+
             |                                | P2B assignments      |
             |                                | distinct strings     |
             |                                +----------+-----------+
             |                                           |
             |                                           v
             |                                research feasibility /
             |                                sustained/grace evidence
             |
             |                  SAME SOURCE FIXTURE
             |                          |
             |                          v
             |             musicxml-to-guitar-tab-engine
             |                  parser / projector
             |                          |
             |                          v
             |             Engine PolyphonicSourceModel
             |                          |
             +-------------+------------+
                           |
                           v
                  +-------------------+
                  | V1B COMPARATOR    |
                  +---------+---------+
                            |
                            v
                deterministic mismatch report
                            |
                            v
                  reviewed production PR
```

## Current continuation point — YOU ARE HERE

V1B comparator core is implemented. The deterministic verification loop is **not yet closed** because approved compatibility fixtures do not yet have pinned, real Engine-generated `PolyphonicSourceModel 1.0.0` artifacts consumed by Lab CI.

The next implementation slice is therefore:

```text
V1B comparator core ✅
        |
        v
1. select approved existing compatibility fixtures
        |
        v
2. generate PolyphonicSourceModel 1.0.0 in production Engine
        |
        v
3. pin artifacts + Engine commit SHA + fixture hash
        |
        v
4. validate artifact shape/version/provenance fail-closed
        |
        v
5. compare Lab snapshot vs Engine artifact in Lab CI
        |
        v
6. deterministic mismatch/equality evidence
        |
        v
V1B COMPLETE
```

Do not skip this step in order to start learned ranking or a new solver. Closing this loop creates the evidence foundation for the later roadmap.

## P1A trust boundary

P1A remains authoritative before XML parsing. It enforces bounded UTF-8 input, a `score-partwise` root, no DOCTYPE/entity/XInclude input, no NUL bytes, and explicit resource limits.

P1B must not weaken or bypass P1A.

## P1B parser boundary

P1B extracts only the bounded semantic facts required by the Lab. It supports pitched notes, duration, voice, staff, chord membership, rests as provenance-carrying cursor movement, backup/forward, tie/tied evidence and inherited divisions.

Unsupported timing/pitch/XML forms fail closed instead of inventing musical meaning.

## P0 polyphony boundary

P0 owns deterministic per-measure reference reconstruction:

- cursor movement;
- chord onset reuse;
- overlapping voices through backup/forward;
- note intervals;
- active-sonority spans;
- deterministic validation.

It does not own cross-measure production tie joining, grace duration invention, tuplets/ornaments, final string/fret choice, production fingering, TAB serialization, rendering or playback.

## P2 physical feasibility boundary

P2A answers: **where can this pitch physically exist on this declared six-string guitar configuration?**

P2B answers: **can the simultaneously active notes be assigned to distinct strings, and what bounded assignments exist?**

Hard physical validity remains deterministic. A future learned component is never allowed to create candidates that P2A rejects.

## Configuration and technique boundaries

`src/guitar/tuningConfiguration.js` is the Lab configuration authority for six strings and optional capo. Standard, Drop D and bounded custom tuning research use the same normalized contract.

Technique provenance remains a sidecar. Current research authorizes zero guitar techniques to alter candidate generation, assignment ranking or sustained-path behavior. Physical technique semantics require a separate reviewed gate.

## V1B comparator boundary

`src/verification/semanticComparator.js` compares a versioned Lab semantic snapshot with Engine-produced `PolyphonicSourceModel 1.0.0` evidence supplied as data.

Current comparison surface includes:

- source-note identity: `partId + measureIndex + sourceNoteIndex`;
- written pitch;
- onset/duration in divisions;
- voice;
- staff;
- tie start/stop evidence;
- active-sonority membership;
- peak polyphony.

The Lab does not import Engine runtime code. Unsupported Engine evidence contracts fail closed. Cross-measure sustain-chain comparison remains outside the current contract.

## Future independent feasibility oracle — V3

After V1/V2 verification infrastructure is mature, an offline/CI independent constraint solver such as CP-SAT may answer:

> Is this guitar realization truly impossible, or did the production search fail to find a valid path?

Such an oracle is evidence only. It must not become a production runtime dependency or silently replace the production solver.

## FretNet / learned evidence boundary — V4

FretNet research is documented in `docs/FRETNET_RESEARCH.md`.

The authoritative academic reference inspected is `cwitkowitz/guitar-transcription-continuous` (ICASSP 2023). It provides audio-driven string-aware tablature and continuous pitch evidence.

FretNet-style evidence fits the Lab only as a future **shadow research ranking/evidence layer**:

```text
P2A deterministic valid candidates --------+
                                            |
P2B deterministic valid assignments -------+----> SHADOW RANKER
                                            |          |
audio -> FretNet-style evidence ------------+          v
                                               benchmark report
```

Authority rule:

```text
hard physical constraints > learned ranking/evidence
```

A learned layer may eventually score or rank already-valid candidates. It may not alter source musical truth, tuning/capo facts, candidate validity, or production authority.

The separate 2026 `HansYap/FretNet` repository is research inspiration only; it is not the authoritative ICASSP implementation and no repository license was observed during review.

## Evidence-to-production boundary

```text
guitar-polyphony-lab
    |
    | fixture / benchmark / comparator report
    | failure reproduction / oracle evidence
    v
separately reviewed production change
    |
    v
musicxml-to-guitar-tab-engine
    |
    v
production CI + Canonical / writer gates
```

No Lab module should be imported by the production runtime.

## Roadmap

- **V1 — Polyphony Verification Foundation**
  - V1A Corpus Registry ✅ initial slice
  - V1B Engine/Lab Semantic Comparator 🟡 core implemented; real Engine artifact CI integration is next
  - V1C External MusicXML Polyphony Compatibility Corpus 📋 after licensing/provenance verification
- **V2 — Failure Intelligence**
  - mismatch classification
  - unplayable-reason analysis
  - regression classification
  - reproducible failure fixtures
- **V3 — Independent Feasibility Oracle**
  - CP-SAT or equivalent offline/CI oracle
  - distinguish true infeasibility from production search limitations
- **V4 — Guitar Research**
  - ergonomic benchmarks
  - alternate tuning/capo/future guitar profiles
  - technique-aware sustain corpora
  - N-best fingering research
  - FretNet-style audio evidence
  - learned candidate/assignment ranking in shadow mode only
  - learned evidence never overrides hard physical constraints

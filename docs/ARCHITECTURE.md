# Architecture

## Authority boundary

`guitar-polyphony-lab` is a research and verification repository. It does not own production TAB output, production MusicXML projection, reduction policy, sustained path selection, Canonical TAB contracts, or MusicXML/TAB writing.

The production polyphony authority is `musicxml-to-guitar-tab-engine`.

The Lab must not become a runtime dependency of the production Engine. Evidence moves from the Lab into production only through fixtures, benchmark results, deterministic mismatch reports, failure reproductions, research evidence, and separately reviewed production PRs.

## Existing Lab modules and bounded roles

Existing work is retained rather than deleted, but its role is explicitly non-production:

- **P0 measure timeline / sonority semantics:** reference semantic oracle
- **P1A bounded MusicXML input gate:** security and hostile-input validation
- **P1B parser adapter:** differential parser oracle
- **P1C compatibility corpus:** corpus / regression foundation
- **P2A fretboard candidate generation:** fretboard reference/oracle
- **P2B distinct-string sonority assignment:** sonority-assignment reference/oracle

These modules may be compared with production behavior. They must not be promoted to production authority merely because equivalent behavior exists in the Lab.

## Current verification layer map

```text
UNTRUSTED / LICENSED FIXTURE INPUT
MusicXML bytes/string
    |
    | P1A — size / UTF-8 / root / security gate
    v
bounded score-partwise XML
    |
    | P1B — exact-pinned parser adapter
    v
Lab reference semantic events
    |
    | P0
    v
reference note intervals / sonority spans
    |
    +-------------------------------+
    |                               |
    |                               | same fixture
    |                               v
    |                    musicxml-to-guitar-tab-engine
    |                    parser / projector authority
    |                               |
    +---------------+---------------+
                    |
                    | V1B
                    v
          semantic comparator
                    |
                    v
       deterministic mismatch report
                    |
                    v
        reviewed production PR
```

P2A/P2B may provide independent reference facts for fretboard feasibility and bounded sonority assignment. They do not extend into a Lab-owned production path solver.

## Production sustained-path authority

The Lab does not implement a second production P3 sustained path solver.

Production sustained polyphony remains in `musicxml-to-guitar-tab-engine`, including its PS-1 through PS-6 pipeline and PS-5 sustained path selection. Lab research may challenge or verify production results, but it may not silently replace or override that authority.

An independent feasibility oracle may be researched later under V3, including a possible offline/CI constraint solver. Such an oracle is evidence only and must remain independent of the production Node runtime.

## P1A trust boundary

P1A remains authoritative inside the Lab before its XML library executes. It enforces:

- UTF-8 string/byte input;
- bounded input size;
- `score-partwise` root;
- no DOCTYPE;
- no entity declarations;
- no XInclude;
- no NUL bytes.

P1B must not weaken or bypass this gate.

## P1B parser adapter

P1B uses an isolated SAX-style parser to verify well-formed XML and extract only the semantic fields needed by the Lab reference model. Raw parser objects are not part of the Lab data contract.

The adapter produces per-part, per-measure ordered events and preserves `divisions` separately. It supports:

- pitched notes;
- duration;
- voice;
- staff;
- chord membership;
- rests as `forward` cursor movement with `sourceKind=rest` provenance;
- backup/forward cursor movement;
- tie/tied evidence;
- inherited divisions across measures.

It fails closed for currently unsupported grace, cue, unpitched, non-integer microtonal alteration, XML 1.1, missing required timing fields, excessive semantic depth, or malformed XML.

## Parser dependency boundary

`saxes@6.0.0` is exact-pinned and is used only behind P1A. Its event stream is normalized into project-owned reference semantic objects.

The upstream repository is archived, so this dependency is not permanent architecture authority. Replacement must remain possible without changing the meaning of P0 or downstream verification evidence.

## P0 contract

P0 receives one measure at a time as ordered semantic events.

Supported event types:

- `note`
- `backup`
- `forward`

A `note` can carry `chord=true`, `voice`, `staff`, and tie evidence. Rest provenance may be carried on a `forward` event; P0 consumes only its cursor semantics.

P0 is responsible for deterministic measure cursor movement, chord onset reuse, voice-overlap reconstruction through `backup`, gap/rest cursor movement, note interval production, sonority-span production, and fail-closed validation.

P0 is not responsible for production XML syntax authority, cross-measure production tie joining, grace timing, tuplets, ornaments, final fret/string assignment, production fingering optimization, TAB serialization, rendering, or playback.

## V1 corpus and comparator boundary

V1A records corpus provenance and expectations. External fixtures require source and license metadata before they are eligible for registry promotion.

V1B compares semantic facts, not visual output. The comparison surface should remain deterministic and versioned, including where available:

- source-note identity;
- pitch;
- onset;
- duration;
- voice;
- staff;
- tie start/stop;
- sustain-chain membership;
- active-sonority membership;
- peak polyphony.

A mismatch report is evidence. It does not itself authorize a production behavior change.

## Evidence-to-production boundary

The intended direction is one-way evidence promotion rather than repository import coupling:

```text
guitar-polyphony-lab
    |
    | fixture / benchmark / semantic expectation
    | failure reproduction / oracle evidence
    v
reviewed production change
    |
    v
musicxml-to-guitar-tab-engine
    |
    v
production CI + Canonical / writer gates
```

No Lab module should be imported by the production runtime. Any production adoption must be implemented and tested inside the Engine under its own authority and release gates.

## Research roadmap

- **V1 — Polyphony Verification Foundation**
  - V1A Corpus Registry
  - V1B Engine/Lab Semantic Comparator
  - V1C External MusicXML Polyphony Compatibility Corpus
- **V2 — Failure Intelligence**
  - semantic mismatch classifier
  - unplayable-reason analysis
  - regression classification
  - reproducible failure fixtures
- **V3 — Independent Feasibility Oracle**
  - possible CP-SAT or equivalent independent constraint oracle
  - offline / CI / research only
  - no production runtime dependency
- **V4 — Guitar Research**
  - ergonomic benchmark
  - alternate tuning / capo / future guitar profiles
  - technique-aware sustain corpus
  - N-best fingering research
  - learned ranking research, never authority over hard physical constraints

# P1B MusicXML Parser Adapter

## Decision

P1B introduces one runtime dependency:

```text
saxes@6.0.0
```

The version is exact-pinned in `package.json` and locked with integrity hashes in `package-lock.json`.

## Why this parser

The P1B requirement is narrow: verify well-formed XML and expose ordered SAX events without making a third-party DOM/object model part of the lab contract.

`saxes` was selected because it is strict about XML well-formedness, has a small dependency surface, and does not automatically interpret user-defined DTD entities. The existing P1A boundary rejects DOCTYPE and entity declarations before `saxes` executes.

## Alternatives reviewed

### fast-xml-parser

Not selected for P1B. It is actively maintained and widely used, but its parser/builder ecosystem had multiple XML entity/DOCTYPE security advisories during 2026. Current releases include fixes, but P1B favors the smaller SAX event surface and avoids features that are not needed by this lab.

### newer/forked SAX packages

Not selected for the first production-like lab slice because their package adoption/provenance is materially smaller. They may be reconsidered if the current dependency becomes unsuitable.

## Known residual risk

The upstream `saxes` repository was archived at the end of 2025. This is a maintenance risk even though the pinned release is mature and no current project dependency on its internal API is allowed.

Mitigations:

1. exact version pin;
2. lockfile integrity hashes;
3. `npm ci --ignore-scripts` in CI;
4. P1A rejects DTD/entity/XInclude input before parser execution;
5. bounded total input size;
6. bounded semantic element depth and capture sizes;
7. parser errors abort without returning partial semantic output;
8. adapter-owned output contract so the parser can be replaced later;
9. Dependabot remains enabled;
10. no XML builder/serializer functionality from the dependency is used.

## P1B output

The adapter returns a project-owned structure:

```text
ScorePartwise
  Part[]
    Measure[]
      divisions
      OrderedMeasureEvent[]
```

No raw `saxes` node or parser object escapes the adapter.

## Supported extraction

- part id
- measure number
- divisions and same-part inheritance
- pitch step / integer alter / octave
- duration
- voice
- staff
- chord membership
- rest timing
- backup/forward
- tie/tied evidence

## Fail-closed boundaries

P1B deliberately rejects instead of guessing:

- malformed XML;
- XML 1.1;
- grace notes;
- cue notes;
- unpitched notes;
- non-integer/microtonal alter values;
- missing timing units;
- invalid/missing durations;
- unsupported tie variants;
- pathological semantic depth/counts.

## Non-goals

P1B does not perform:

- XSD validation;
- DTD loading;
- entity declaration processing;
- network/file resolution;
- cross-measure tie joining;
- tuplets;
- transposition;
- guitar mapping;
- path solving;
- TAB serialization.

## Promotion gate

P1B is complete only when the exact PR head passes locked dependency installation, syntax checks, all existing tests, new parser tests, and diff review. Exporter-specific fixtures belong to P1C rather than being silently added to parser behavior.

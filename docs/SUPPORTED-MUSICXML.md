# Supported MusicXML Semantics

This document describes the current bounded semantic support of the lab. It must not be read as a claim that raw MusicXML parsing is implemented.

## P0 supported after XML decoding

- measure-local ordered note events
- integer `duration` values
- `voice`
- `staff`
- `<chord/>` semantics represented as `chord=true`
- `<backup>` semantics
- `<forward>` semantics
- tie start/stop flags preserved as evidence
- simultaneous attacks
- sustained overlap reconstructed through measure cursor movement

## P0 intentionally not implemented

- raw XML parsing
- DTD or entity processing
- external entities
- cross-measure tie joining
- grace-note timing
- tuplets and time-modification
- ornaments
- transposition interpretation
- multiple part synchronization
- repeats/navigation expansion
- guitar string/fret assignment
- TAB writing

## P1 parser gate

A future parser adapter must be reviewed as an untrusted-input boundary. At minimum it must:

1. enforce an input-size limit;
2. reject or safely disable DTD/entity expansion features;
3. avoid network/file resolution from XML input;
4. preserve document order needed for note/chord/backup/forward semantics;
5. normalize parser output into the P0 event contract;
6. fail closed when semantic meaning is ambiguous or unsupported;
7. carry source location/evidence where practical for diagnostics.

Parser support will be documented only after exact fixtures and CI demonstrate it.

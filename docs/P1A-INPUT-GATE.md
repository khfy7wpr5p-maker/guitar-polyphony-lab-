# P1A MusicXML Input Gate

P1A adds a bounded raw-input security gate without adding an XML parser dependency.

## Accepted input

- UTF-8 string or `Uint8Array`
- default maximum size: 5 MiB
- hard maximum configurable size: 20 MiB
- `score-partwise` root only
- optional UTF-8 BOM
- optional XML declaration
- optional leading XML comments

## Rejected at the boundary

- invalid UTF-8
- NUL bytes
- `DOCTYPE`
- entity declarations
- XInclude
- `score-timewise`
- unsupported roots
- caller attempts to raise the size limit above the hard cap

## Compatibility note

Some legitimate MusicXML exporters include a `DOCTYPE`. P1A intentionally rejects it rather than interpreting or resolving external DTDs. A later compatibility slice may prove a safe, deterministic DOCTYPE-removal normalization, but no such behavior is claimed here.

## Non-goals

P1A does not parse elements, attributes, pitch, duration, voices, or measures. It only establishes the trust boundary that any later parser adapter must sit behind.

The next parser stage must remain separately reviewable and must not weaken these guarantees silently.

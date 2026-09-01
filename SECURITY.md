# Security Policy and Trust Boundaries

## Current status

P0 contains no raw XML parser and no external runtime dependency. It operates only on already-decoded semantic events. Raw MusicXML first passes the implemented P1A gate and P1B parser adapter.

## Trust boundaries

MusicXML input is untrusted. Parser and corpus ingestion code must assume malformed, adversarial, or unexpectedly large input.

The XML boundary must not:

- resolve network resources;
- read local files referenced by input;
- permit unbounded entity expansion;
- accept unbounded nesting or file size;
- silently coerce unsupported musical semantics into plausible-looking output.

## Fail-closed policy

Unsupported event types, invalid durations, invalid cursor movement, duplicate note identifiers, and invalid chord anchoring fail with explicit deterministic error codes.

A failure is preferable to inventing timing, voice relationships, or guitar positions.

## Dependency policy

New runtime dependencies require a dedicated review that records:

- exact pinned version;
- purpose and narrower alternatives considered;
- parser/entity behavior relevant to untrusted XML;
- known security advisories at review time;
- lockfile update;
- exact-head CI evidence.

GitHub Actions used by this repository should be pinned to immutable commit SHAs.

## Corpus policy

Only fixtures with clear provenance and redistribution rights may be committed. Private, licensed, or large local corpora belong in ignored local corpus paths and must not be uploaded accidentally.

## Secrets

No secrets are required for P0. `.env` files remain ignored. Workflows must use minimum GitHub token permissions.

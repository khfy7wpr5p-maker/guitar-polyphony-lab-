import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MUSICXML_INPUT_LIMITS,
  MusicXmlInputError,
  gateMusicXmlInput,
} from '../src/musicxml/inputGate.js';

const valid = '<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"></score-partwise>';

test('accepts bounded score-partwise MusicXML', () => {
  const result = gateMusicXmlInput(valid);
  assert.equal(result.rootKind, 'score-partwise');
  assert.equal(result.xml, valid);
  assert.ok(result.byteLength > 0);
});

test('accepts UTF-8 bytes and strips BOM from returned XML', () => {
  const bytes = new TextEncoder().encode(`\uFEFF${valid}`);
  const result = gateMusicXmlInput(bytes);
  assert.equal(result.xml, valid);
});

test('rejects input above configured byte limit', () => {
  assert.throws(
    () => gateMusicXmlInput(valid, { maxBytes: 16 }),
    (error) => error instanceof MusicXmlInputError && error.code === 'INPUT_TOO_LARGE',
  );
});

test('rejects DOCTYPE declarations fail closed', () => {
  const xml = '<!DOCTYPE score-partwise SYSTEM "http://example.test/musicxml.dtd"><score-partwise></score-partwise>';
  assert.throws(
    () => gateMusicXmlInput(xml),
    (error) => error instanceof MusicXmlInputError && error.code === 'DOCTYPE_NOT_ALLOWED',
  );
});

test('rejects entity declarations fail closed', () => {
  const xml = '<!ENTITY x "boom"><score-partwise></score-partwise>';
  assert.throws(
    () => gateMusicXmlInput(xml),
    (error) =>
      error instanceof MusicXmlInputError && error.code === 'ENTITY_DECLARATION_NOT_ALLOWED',
  );
});

test('rejects XInclude', () => {
  const xml = '<score-partwise><xi:include href="file:///etc/passwd"/></score-partwise>';
  assert.throws(
    () => gateMusicXmlInput(xml),
    (error) => error instanceof MusicXmlInputError && error.code === 'XINCLUDE_NOT_ALLOWED',
  );
});

test('rejects unsupported score-timewise root', () => {
  assert.throws(
    () => gateMusicXmlInput('<score-timewise></score-timewise>'),
    (error) => error instanceof MusicXmlInputError && error.code === 'UNSUPPORTED_ROOT',
  );
});

test('rejects invalid UTF-8 bytes', () => {
  assert.throws(
    () => gateMusicXmlInput(Uint8Array.from([0xc3, 0x28])),
    (error) => error instanceof MusicXmlInputError && error.code === 'INVALID_UTF8',
  );
});

test('rejects NUL bytes', () => {
  assert.throws(
    () => gateMusicXmlInput('<score-partwise>\u0000</score-partwise>'),
    (error) => error instanceof MusicXmlInputError && error.code === 'NUL_BYTE',
  );
});

test('hard input limit cannot be disabled by caller', () => {
  assert.throws(
    () => gateMusicXmlInput(valid, { maxBytes: MUSICXML_INPUT_LIMITS.hardMaxBytes + 1 }),
    (error) => error instanceof MusicXmlInputError && error.code === 'INVALID_MAX_BYTES',
  );
});

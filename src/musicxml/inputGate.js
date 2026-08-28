const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const HARD_MAX_BYTES = 20 * 1024 * 1024;

export class MusicXmlInputError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'MusicXmlInputError';
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new MusicXmlInputError(code, message, details);
}

function normalizeMaxBytes(value) {
  const maxBytes = value ?? DEFAULT_MAX_BYTES;
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > HARD_MAX_BYTES) {
    fail('INVALID_MAX_BYTES', 'maxBytes must be a positive safe integer within the hard limit.', {
      hardMaxBytes: HARD_MAX_BYTES,
      value: maxBytes,
    });
  }
  return maxBytes;
}

function decodeInput(input) {
  if (typeof input === 'string') {
    return { xml: input, byteLength: new TextEncoder().encode(input).byteLength };
  }

  if (input instanceof Uint8Array) {
    try {
      return {
        xml: new TextDecoder('utf-8', { fatal: true }).decode(input),
        byteLength: input.byteLength,
      };
    } catch {
      fail('INVALID_UTF8', 'MusicXML bytes must be valid UTF-8.');
    }
  }

  fail('INVALID_INPUT_TYPE', 'MusicXML input must be a string or Uint8Array.');
}

function stripLeadingMetadata(xml) {
  let probe = xml.replace(/^\uFEFF/, '').trimStart();

  if (probe.startsWith('<?xml')) {
    const end = probe.indexOf('?>');
    if (end === -1) fail('MALFORMED_XML_DECLARATION', 'XML declaration is not terminated.');
    probe = probe.slice(end + 2).trimStart();
  }

  while (probe.startsWith('<!--')) {
    const end = probe.indexOf('-->');
    if (end === -1) fail('MALFORMED_COMMENT', 'Leading XML comment is not terminated.');
    probe = probe.slice(end + 3).trimStart();
  }

  return probe;
}

export function gateMusicXmlInput(input, options = {}) {
  const maxBytes = normalizeMaxBytes(options.maxBytes);
  const decoded = decodeInput(input);

  if (decoded.byteLength > maxBytes) {
    fail('INPUT_TOO_LARGE', 'MusicXML input exceeds the configured byte limit.', {
      actualBytes: decoded.byteLength,
      maxBytes,
    });
  }

  const xml = decoded.xml.replace(/^\uFEFF/, '');

  if (xml.includes('\u0000')) fail('NUL_BYTE', 'MusicXML input contains a NUL byte.');
  if (/<!DOCTYPE\b/i.test(xml)) fail('DOCTYPE_NOT_ALLOWED', 'DOCTYPE is not allowed at the P1A boundary.');
  if (/<!ENTITY\b/i.test(xml)) fail('ENTITY_DECLARATION_NOT_ALLOWED', 'Entity declarations are not allowed.');
  if (/<\s*xi:include\b/i.test(xml)) fail('XINCLUDE_NOT_ALLOWED', 'XInclude is not allowed.');

  const probe = stripLeadingMetadata(xml);
  if (!/^<score-partwise(?:\s|>)/.test(probe)) {
    fail('UNSUPPORTED_ROOT', 'P1A accepts only score-partwise MusicXML documents.');
  }

  return Object.freeze({
    xml,
    byteLength: decoded.byteLength,
    rootKind: 'score-partwise',
  });
}

export const MUSICXML_INPUT_LIMITS = Object.freeze({
  defaultMaxBytes: DEFAULT_MAX_BYTES,
  hardMaxBytes: HARD_MAX_BYTES,
});

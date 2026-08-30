import {
  STANDARD_TUNING_CONFIGURATION,
  createGuitarTuningConfiguration,
  resolveGuitarTuningConfiguration,
} from '../guitar/tuningConfiguration.js';

const ALTER_TO_ACCIDENTAL = Object.freeze({
  '-2': 'bb',
  '-1': 'b',
  0: '',
  1: '#',
  2: '##',
});

export class StaffTuningSerializationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'StaffTuningSerializationError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new StaffTuningSerializationError(code, message, details);
}

function pitchParts(pitch) {
  const match = /^([A-G])(bb|##|b|#)?([0-9])$/.exec(pitch);
  if (!match) fail('INVALID_TUNING_PITCH', 'Tuning pitch cannot be serialized.', { pitch });
  const [, step, accidental = '', octave] = match;
  const alter = Object.freeze({ bb: -2, b: -1, '': 0, '#': 1, '##': 2 })[accidental];
  return Object.freeze({ step, alter, octave: Number(octave) });
}

function tuningXml(line, pitch) {
  const parsed = pitchParts(pitch);
  const parts = [
    `<staff-tuning line="${line}">`,
    `<tuning-step>${parsed.step}</tuning-step>`,
  ];
  if (parsed.alter !== 0) parts.push(`<tuning-alter>${parsed.alter}</tuning-alter>`);
  parts.push(`<tuning-octave>${parsed.octave}</tuning-octave>`);
  parts.push('</staff-tuning>');
  return parts.join('');
}

export function serializeStaffTuning(
  tuningConfiguration = STANDARD_TUNING_CONFIGURATION,
) {
  const configuration = resolveGuitarTuningConfiguration(tuningConfiguration);
  const lines = [
    '<staff-details>',
    '<staff-type>alternate</staff-type>',
    '<staff-lines>6</staff-lines>',
  ];
  for (let line = 1; line <= 6; line += 1) {
    const stringNumber = 7 - line;
    const entry = configuration.strings[stringNumber - 1];
    lines.push(tuningXml(line, entry.pitch));
  }
  lines.push('</staff-details>');
  return lines.join('\n');
}

function tagText(block, tag, required = true) {
  const expression = new RegExp(`<${tag}>([^<]+)</${tag}>`, 'g');
  const matches = [...block.matchAll(expression)];
  if (matches.length === 0 && !required) return null;
  if (matches.length !== 1) {
    fail('INVALID_STAFF_TUNING_XML', `Expected exactly one ${tag} element.`, { tag });
  }
  return matches[0][1].trim();
}

export function parseStaffTuningFragment(xml) {
  if (typeof xml !== 'string' || xml.length === 0 || xml.length > 16_384) {
    fail('INVALID_STAFF_TUNING_XML', 'staff-tuning XML must be a bounded string.');
  }
  if (/<!DOCTYPE|<!ENTITY|<xi:include\b/i.test(xml)) {
    fail('INVALID_STAFF_TUNING_XML', 'DTD, entity and XInclude syntax is not accepted.');
  }

  const pattern = /<staff-tuning\s+line="([1-6])">([\s\S]*?)<\/staff-tuning>/g;
  const matches = [...xml.matchAll(pattern)];
  if (matches.length !== 6) {
    fail('INVALID_STAFF_TUNING_XML', 'Exactly six staff-tuning elements are required.', {
      observed: matches.length,
    });
  }

  const byLine = new Map();
  for (const match of matches) {
    const line = Number(match[1]);
    if (byLine.has(line)) {
      fail('INVALID_STAFF_TUNING_XML', 'staff-tuning line numbers must be unique.', { line });
    }
    const block = match[2];
    const step = tagText(block, 'tuning-step');
    const octaveText = tagText(block, 'tuning-octave');
    const alterText = tagText(block, 'tuning-alter', false);
    if (!/^[A-G]$/.test(step) || !/^[0-9]$/.test(octaveText)) {
      fail('INVALID_STAFF_TUNING_XML', 'staff-tuning contains an invalid step or octave.', {
        line,
        step,
        octaveText,
      });
    }
    const alter = alterText === null ? 0 : Number(alterText);
    if (!Number.isInteger(alter) || !Object.hasOwn(ALTER_TO_ACCIDENTAL, String(alter))) {
      fail('INVALID_STAFF_TUNING_XML', 'staff-tuning alter must be an integer from -2 to 2.', {
        line,
        alter,
      });
    }
    byLine.set(line, `${step}${ALTER_TO_ACCIDENTAL[String(alter)]}${octaveText}`);
  }

  const tuning = [];
  for (let string = 1; string <= 6; string += 1) {
    const line = 7 - string;
    const pitch = byLine.get(line);
    if (!pitch) {
      fail('INVALID_STAFF_TUNING_XML', 'staff-tuning is missing a required line.', { line });
    }
    tuning.push({ string, pitch });
  }
  return createGuitarTuningConfiguration(tuning);
}

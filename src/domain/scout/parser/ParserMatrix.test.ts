import { describe, expect, it } from 'vitest';
import type { ParseError } from '../../../core/errors/ParseError';
import type { Result } from '../../../core/result/Result';
import { defaultCompactV1 } from '../../../profiles/code/default-compact/defaultCompactV1';
import { dataVolleyBasicV1 } from '../../../profiles/code/data-volley/dataVolleyBasicV1';
import type { CodeProfile } from '../../../profiles/types';
import { Normalizer } from '../normalizer/Normalizer';
import { Tokenizer } from '../tokenizer/Tokenizer';
import type { ParsedScoutCode } from './ParsedScoutCode';
import { Parser } from './Parser';

const normalizer = new Normalizer();
const tokenizer = new Tokenizer();
const parser = new Parser();

function parseCode(
  rawCode: string,
  profile: CodeProfile = defaultCompactV1,
): Result<ParsedScoutCode, ParseError> {
  const normalized = normalizer.normalize({ rawCode }, profile);
  const tokenized = tokenizer.tokenize(normalized, profile);
  return tokenized.ok ? parser.parse(tokenized.value) : tokenized;
}

const skillCases = [
  ['S', '+'],
  ['R', '#'],
  ['A', '='],
  ['B', '#'],
] as const;

const validCases = Array.from({ length: 52 }, (_, index) => {
  const player = index + 1;
  const [skill, evaluation] = skillCases[index % skillCases.length];
  return { code: `${String(player).padStart(2, '0')}${skill}${evaluation}`, player };
});

const invalidCases = [
  ...Array.from({ length: 10 }, (_, index) => `${String(index + 1).padStart(2, '0')}X#`),
  ...Array.from({ length: 10 }, (_, index) => `${String(index + 1).padStart(2, '0')}A`),
  ...Array.from({ length: 10 }, (_, index) => `${String(index + 1).padStart(2, '0')}A?`),
];

const boundaryCases = Array.from({ length: 20 }, (_, index) => {
  const player = index % 2 === 0 ? 1 : 99;
  const code =
    index % 4 < 2 ? ` ${String(player).padStart(2, '0')}a# ` : `${player === 1 ? '01' : '99'}S+`;
  return { code, player };
});

describe('Parser valid matrix', () => {
  it.each(validCases)('parses valid code $code', ({ code, player }) => {
    const result = parseCode(code);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.playerNumber).toBe(player);
  });
});

describe('Parser invalid matrix', () => {
  it.each(invalidCases)('rejects invalid code %s', (code) => {
    expect(parseCode(code).ok).toBe(false);
  });

  it.each(['', '   ', '00A#', '100A#', '01$#', '01A##'])('rejects structural input %s', (code) => {
    expect(parseCode(code).ok).toBe(false);
  });
});

describe('Parser boundary matrix', () => {
  it.each(boundaryCases)('normalizes and parses boundary code $code', ({ code, player }) => {
    const result = parseCode(code);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.playerNumber).toBe(player);
  });

  it('tokenizes the canonical example without roster knowledge', () => {
    const normalized = normalizer.normalize({ rawCode: '08A#' }, defaultCompactV1);
    const result = tokenizer.tokenize(normalized, defaultCompactV1);

    expect(result.ok && result.value).toEqual([
      { type: 'PLAYER', value: '08', position: 0 },
      { type: 'SKILL', value: 'A', position: 2 },
      { type: 'EVALUATION', value: '#', position: 3 },
    ]);
  });

  it('parses Data Volley home and visiting team prefixes', () => {
    expect(parseCode('*08S#', dataVolleyBasicV1)).toMatchObject({
      ok: true,
      value: { playerNumber: 8, skillCode: 'S', evaluationCode: '#' },
    });
    expect(parseCode('a12E+', dataVolleyBasicV1)).toMatchObject({
      ok: true,
      value: { playerNumber: 12, skillCode: 'E', evaluationCode: '+' },
    });
  });

  it('supports a different data-driven grammar and multi-character skill', () => {
    const profile: CodeProfile = {
      ...defaultCompactV1,
      id: 'test_verbose_v1',
      grammar: ['skill', 'player', 'evaluation'],
      skills: { AT: 'attack' },
      evaluations: { '3': 'excellent' },
    };

    const result = parseCode('AT083', profile);

    expect(result.ok && result.value).toEqual({
      playerNumber: 8,
      skillCode: 'AT',
      evaluationCode: '3',
    });
  });

  it('reports a profile grammar unsupported by this macro stage', () => {
    const profile: CodeProfile = {
      ...defaultCompactV1,
      id: 'test_tactical_code',
      grammar: ['player', 'skill', 'originZone', 'evaluation'],
    };

    const normalized = normalizer.normalize({ rawCode: '08A4#' }, profile);
    const result = tokenizer.tokenize(normalized, profile);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe('unsupported_grammar_field');
  });
});

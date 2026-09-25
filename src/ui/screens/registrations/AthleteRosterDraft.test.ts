import { describe, expect, it } from 'vitest';
import {
  normalizeAthleteName,
  parseAthletePaste,
  validateAthleteDraftRows,
} from './AthleteRosterDraft';

describe('athlete roster draft', () => {
  it('preserves compound identities while normalizing only edge and repeated spaces', () => {
    expect(normalizeAthleteName("  Ana   D'Ávila-Souza  ")).toBe("Ana D'Ávila-Souza");
  });

  it('parses CRLF, blank lines, numbered, semicolon and TSV rows into an editable preview', () => {
    const preview = parseAthletePaste('8 Ana Souza\r\n\r\n9;Bia Lima\r\n10\tCaio Melo\tforward');
    expect(preview.rows).toMatchObject([
      { number: '8', name: 'Ana Souza' },
      { number: '9', name: 'Bia Lima' },
      { number: '10', name: 'Caio Melo', position: 'forward' },
    ]);
  });

  it('does not silently split comma-containing names and accepts legacy commas only explicitly', () => {
    expect(parseAthletePaste('8 Ana, Souza').rows[0]?.issues[0]).toContain('vírgula');
    expect(parseAthletePaste('8 Ana, 9 Bia', { legacyComma: true }).rows).toMatchObject([
      { number: '8', name: 'Ana' },
      { number: '9', name: 'Bia' },
    ]);
    expect(parseAthletePaste('8 Ana, Souza', { legacyComma: true }).rows[0]?.issues[0]).toContain('ambíguo');
  });

  it('keeps homonyms and reports duplicate shirts only inside the draft', () => {
    const rows = parseAthletePaste('8 Ana Souza\n8 Ana Souza').rows;
    const checked = validateAthleteDraftRows(rows, 'football');
    expect(checked.every((row) => row.issues.some((issue) => issue.includes('Camisa repetida')))).toBe(true);
  });
});

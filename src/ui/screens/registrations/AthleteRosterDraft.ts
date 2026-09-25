import type { AthleteRegistrationSport } from '../../../domain/match/entities/Registration';

export type AthleteDraftColumn = 'number' | 'name' | 'position';

export interface AthleteRosterDraftRow {
  readonly clientRowId: string;
  readonly athleteId?: string;
  readonly number: string;
  readonly name: string;
  readonly position: string;
  readonly issues: readonly string[];
}

export interface PasteOptions {
  readonly legacyComma?: boolean;
  readonly hasHeader?: boolean;
  readonly columnOrder?: readonly AthleteDraftColumn[];
}

export interface PastePreview {
  readonly rows: readonly AthleteRosterDraftRow[];
  readonly detectedHeader: boolean;
  readonly columnOrder: readonly AthleteDraftColumn[];
}

export const DEFAULT_COLUMN_ORDER: readonly AthleteDraftColumn[] = ['number', 'name', 'position'];

export function normalizeAthleteName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function emptyAthleteDraftRow(): AthleteRosterDraftRow {
  return { clientRowId: crypto.randomUUID(), number: '', name: '', position: '', issues: [] };
}

function row(
  values: Partial<Record<AthleteDraftColumn, string>>,
  issues: readonly string[] = [],
): AthleteRosterDraftRow {
  const rawNumber = values.number?.trim() ?? '';
  const parsedNumber = rawNumber === '' ? '' : rawNumber;
  return {
    clientRowId: crypto.randomUUID(),
    number: parsedNumber,
    name: normalizeAthleteName(values.name ?? ''),
    position: (values.position ?? '').trim(),
    issues,
  };
}

function headerColumn(value: string): AthleteDraftColumn | undefined {
  const normalized = value.trim().toLocaleLowerCase('pt-BR');
  if (['camisa', 'número', 'numero', 'nº'].includes(normalized)) return 'number';
  if (['nome', 'atleta', 'jogador'].includes(normalized)) return 'name';
  if (['posição', 'posicao', 'função', 'funcao', 'papel'].includes(normalized)) return 'position';
  return undefined;
}

function splitDelimitedLine(line: string): readonly string[] | undefined {
  if (line.includes('\t')) return line.split('\t');
  if (line.includes(';')) return line.split(';');
  return undefined;
}

function parseLine(
  line: string,
  columnOrder: readonly AthleteDraftColumn[],
): AthleteRosterDraftRow {
  const columns = splitDelimitedLine(line);
  if (columns) {
    if (columns.length > columnOrder.length) {
      return row({ name: line }, ['Há mais colunas do que a prévia suporta. Corrija esta linha.']);
    }
    const values: Partial<Record<AthleteDraftColumn, string>> = {};
    columns.forEach((value, index) => {
      values[columnOrder[index]] = value;
    });
    return row(values);
  }

  if (line.includes(',')) {
    return row(
      { name: line },
      ['Linha ambígua: vírgula não separa atletas automaticamente. Use linhas, ponto e vírgula ou TSV.'],
    );
  }

  const numbered = line.match(/^\s*(\d{1,3})\s+(.+)$/);
  return numbered ? row({ number: numbered[1], name: numbered[2] }) : row({ name: line });
}

function parseLegacyComma(text: string): readonly AthleteRosterDraftRow[] {
  const entries = text.split(',').map((entry) => entry.trim()).filter(Boolean);
  if (!entries.length) return [];
  if (!entries.every((entry) => /^\d{1,3}\s+.+/.test(entry))) {
    return [
      row(
        { name: text },
        ['Formato legado ambíguo: cada item separado por vírgula deve começar pela camisa.'],
      ),
    ];
  }
  return entries.map((entry) => parseLine(entry, DEFAULT_COLUMN_ORDER));
}

export function parseAthletePaste(text: string, options: PasteOptions = {}): PastePreview {
  const nonEmptyLines = text.replace(/\r\n?/g, '\n').split('\n').filter((line) => line.trim());
  if (options.legacyComma && nonEmptyLines.length === 1 && nonEmptyLines[0].includes(',')) {
    return { rows: parseLegacyComma(nonEmptyLines[0]), detectedHeader: false, columnOrder: DEFAULT_COLUMN_ORDER };
  }

  const requestedOrder = options.columnOrder ?? DEFAULT_COLUMN_ORDER;
  const firstColumns = nonEmptyLines[0] ? splitDelimitedLine(nonEmptyLines[0]) : undefined;
  const headerOrder = firstColumns?.map(headerColumn);
  const detectedHeader = Boolean(
    firstColumns && headerOrder?.length && headerOrder.every((column) => column !== undefined),
  );
  const hasHeader = options.hasHeader ?? detectedHeader;
  const columnOrder = detectedHeader ? (headerOrder as AthleteDraftColumn[]) : requestedOrder;
  const lines = hasHeader ? nonEmptyLines.slice(1) : nonEmptyLines;
  return { rows: lines.map((line) => parseLine(line, columnOrder)), detectedHeader, columnOrder };
}

export function validateAthleteDraftRows(
  rows: readonly AthleteRosterDraftRow[],
  sport: AthleteRegistrationSport | '',
): readonly AthleteRosterDraftRow[] {
  const numbers = new Map<number, number>();
  rows.forEach((entry) => {
    const value = Number(entry.number);
    if (entry.number.trim() && Number.isInteger(value) && value >= 1 && value <= 999) {
      numbers.set(value, (numbers.get(value) ?? 0) + 1);
    }
  });
  return rows.map((entry) => {
    const issues = [...entry.issues];
    const number = entry.number.trim();
    const numericNumber = Number(number);
    if (!normalizeAthleteName(entry.name)) issues.push('Informe o nome do atleta.');
    if (!sport) issues.push('Escolha a modalidade deste elenco.');
    if (number && (!Number.isInteger(numericNumber) || numericNumber < 1 || numericNumber > 999)) {
      issues.push('A camisa deve ser um número de 1 a 999.');
    }
    if (number && numbers.get(numericNumber)! > 1) {
      issues.push('Camisa repetida neste elenco. Use números distintos antes de salvar.');
    }
    return { ...entry, issues: [...new Set(issues)] };
  });
}

export const REPORT_SECTIONS = [
  { id: 'summary', label: 'Resumo da partida' },
  { id: 'charts', label: 'Gráficos selecionados' },
] as const;

// Retain legacy section identifiers for imported/programmatic drafts.
export type ReportSectionId =
  | (typeof REPORT_SECTIONS)[number]['id']
  | 'players'
  | 'attack'
  | 'serve'
  | 'rotations'
  | 'distribution';

export interface ReportDraft {
  readonly title: string;
  readonly subtitle: string;
  readonly author: string;
  readonly notes: string;
  readonly sections: readonly ReportSectionId[];
}

export function createReportDraft(): ReportDraft {
  return {
    title: 'Relatório pós-jogo',
    subtitle: 'Análise de desempenho',
    author: '',
    notes: '',
    sections: REPORT_SECTIONS.map((section) => section.id),
  };
}

export function parseReportDraft(value: unknown): ReportDraft | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const draft = value as Record<string, unknown>;
  if (!['title', 'subtitle', 'author', 'notes'].every((key) => typeof draft[key] === 'string'))
    return undefined;
  if (
    !Array.isArray(draft.sections) ||
    !draft.sections.length ||
    !draft.sections.every(
      (id: unknown) =>
        typeof id === 'string' &&
        ['summary', 'charts', 'players', 'attack', 'serve', 'rotations', 'distribution'].includes(
          id,
        ),
    )
  )
    return undefined;
  return {
    title: (draft.title as string).slice(0, 120),
    subtitle: (draft.subtitle as string).slice(0, 180),
    author: (draft.author as string).slice(0, 100),
    notes: (draft.notes as string).slice(0, 12000),
    // Older drafts enabled every statistical table by default. Preserve their text,
    // but migrate the report to the analyst's selected graphics.
    sections: draft.sections.includes('summary') ? ['summary', 'charts'] : ['charts'],
  };
}

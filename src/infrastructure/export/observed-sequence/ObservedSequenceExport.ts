import { analyzeObservedSequences, observedDurationMs } from '../../../domain/analytics/observed-sequence/ObservedSequenceAnalysis';
import type { ObservedSequence, ObservedStep } from '../../../domain/analytics/observed-sequence/ObservedSequence';
import { PdfDocument } from '../pdf/PdfDocument';

function cell(value: string | number | undefined): string {
  const text = value === undefined ? '' : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
function coordinate(point: ObservedStep['position']): string {
  return point ? `${point.x},${point.y}` : '';
}

/** CSV contains every unit and every observed step, even when the UI displays only a page. */
export function exportObservedSequencesCsv(units: readonly ObservedSequence[]): string {
  const analysis = analyzeObservedSequences(units);
  const rows: (string | number | undefined)[][] = [['secao', 'versao', 'unidade_id', 'modalidade', 'contexto', 'equipe', 'ordem', 'acao', 'desfecho', 'cobertura', 'motivos', 'elegivel', 'comprimento', 'duracao_ms', 'origem_id', 'revisao_id', 'tempo_ms', 'posicao', 'destino']];
  rows.push(['resumo', analysis.version, '', '', '', '', '', 'total', analysis.total, '', '', analysis.eligible, '', '', '', '', '', '', '']);
  for (const variant of analysis.exactVariants) rows.push(['variante_exata', analysis.version, variant.unitIds.join('|'), '', '', '', '', variant.label, Object.entries(variant.outcomeCounts).map(([key, n]) => `${key}:${n}`).join('|'), '', `incompletas:${variant.incomplete}`, variant.eligible, variant.length, '', '', '', '', '', '']);
  for (const variant of analysis.categorizedVariants) rows.push(['variante_categoria', analysis.version, variant.unitIds.join('|'), '', '', '', '', variant.label, Object.entries(variant.outcomeCounts).map(([key, n]) => `${key}:${n}`).join('|'), '', `incompletas:${variant.incomplete}`, variant.eligible, variant.length, '', '', '', '', '', '']);
  for (const unit of units) {
    rows.push(['unidade', analysis.version, unit.unitId, unit.sport, `${unit.context.kind}:${unit.context.number}`, unit.teamId, '', `${unit.start.reason} → ${unit.end?.reason ?? 'aberto'}`, unit.outcome, unit.coverage, unit.censorReasons.join('|'), Number(unit.eligibleForOutcome), unit.steps.length, observedDurationMs(unit), unit.start.sourceId, unit.end?.sourceId, '', '', '']);
    unit.steps.forEach((step, index) => rows.push(['passo', analysis.version, unit.unitId, unit.sport, `${unit.context.kind}:${unit.context.number}`, step.teamId, index + 1, `${step.role}:${step.kind}`, '', unit.coverage, '', '', '', '', step.sourceId, step.effectiveHistoryId, step.elapsedMs, coordinate(step.position), coordinate(step.destination)]));
  }
  return `\uFEFF${rows.map(row => row.map(cell).join(';')).join('\r\n')}`;
}

export function exportObservedSequencesJson(units: readonly ObservedSequence[]): string {
  return JSON.stringify({ analysis: analyzeObservedSequences(units), units }, null, 2);
}

/** PDF is a navigable summary; CSV/JSON carry every step without pagination loss. */
export function renderObservedSequencesPdf(matchName: string, units: readonly ObservedSequence[]): string {
  const analysis = analyzeObservedSequences(units);
  const pdf = new PdfDocument(matchName);
  pdf.page('Trajetorias completas observadas');
  pdf.paragraph(`Metodo ${analysis.version}. ${analysis.total} unidades distintas; ${analysis.eligible} elegiveis para desfecho; ${analysis.incomplete} incompletas/conflitantes.`);
  pdf.paragraph('Cada linha abaixo aponta para um ID de unidade. CSV e JSON incluem todos os passos, IDs de origem, revisoes e coordenadas. Taxas de desfecho usam apenas unidades elegiveis.');
  pdf.heading('Comprimento e desfecho');
  pdf.table(['Faixa', 'Unidades', 'Elegiveis', 'Desfechos'], analysis.lengthBands.map(band => [band.label, String(band.n), String(band.eligible), Object.entries(band.outcomes).map(([key, n]) => `${key} ${n}`).join(', ') || '-']));
  pdf.heading('Variantes categorizadas mais frequentes');
  pdf.table(['Trajetoria', 'n', 'Elegiveis', 'IDs'], analysis.categorizedVariants.slice(0, 20).map(row => [row.label, String(row.n), String(row.eligible), row.unitIds.slice(0, 3).join(', ') + (row.unitIds.length > 3 ? ' ...' : '')]));
  if (analysis.categorizedVariants.length > 20) pdf.paragraph(`PDF resume 20 de ${analysis.categorizedVariants.length} variantes. A lista completa consta no CSV/JSON.`);
  pdf.heading('Indice de unidades');
  pdf.table(['ID', 'Periodo/set', 'n acoes', 'Desfecho', 'Cobertura'], units.map(unit => [unit.unitId, String(unit.context.number), String(unit.steps.length), unit.outcome ?? '-', unit.coverage]));
  return pdf.build();
}

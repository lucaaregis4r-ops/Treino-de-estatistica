import type { FutsalAnalytics } from '../../../domain/futsal/FutsalAnalytics';
import { PdfDocument } from '../pdf/PdfDocument';

function cell(value: string | number | undefined): string {
  const text = value === undefined ? '' : String(value);
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportFutsalAnalyticsCsv(report: FutsalAnalytics, teamNames: Readonly<Record<string, string>>): string {
  const rows: (string | number | undefined)[][] = [['modalidade', 'secao', 'periodo', 'equipe', 'metrica', 'numerador', 'denominador', 'valor', 'cobertura']];
  for (const team of report.teams) {
    rows.push(['futsal', 'equipe', '', teamNames[team.teamId] ?? team.teamId, 'placar', team.score, '', team.score, '']);
    rows.push(['futsal', 'equipe', '', teamNames[team.teamId] ?? team.teamId, 'finalizacoes', team.shots, '', team.shots, '']);
    rows.push(['futsal', 'finalizacao', '', teamNames[team.teamId] ?? team.teamId, 'com_origem', team.shotsWithPosition, team.shots, team.shots ? team.shotsWithPosition / team.shots : '', team.shots ? team.shotsWithPosition / team.shots : '']);
    rows.push(['futsal', 'posse_classificada', '', teamNames[team.teamId] ?? team.teamId, 'posses_com_finalizacao', team.classifiedPossessionsWithShot, team.classifiedPossessions, team.classifiedPossessions ? team.classifiedPossessionsWithShot / team.classifiedPossessions : '', 'somente episodios delimitados por controle continuo observado']);
    rows.push(['futsal', 'posse_classificada', '', teamNames[team.teamId] ?? team.teamId, 'finalizacoes_por_posse', team.shotsInClassifiedPossessions, team.classifiedPossessions, team.shotsPerClassifiedPossession ?? '', 'somente episodios delimitados por controle continuo observado']);
    for (const [outcome, count] of Object.entries(team.shotsByOutcome)) rows.push(['futsal', 'finalizacao', '', teamNames[team.teamId] ?? team.teamId, outcome, count, team.shots, team.shots ? count / team.shots : '', '']);
  }
  for (const row of report.periodCounts) {
    rows.push(['futsal', 'periodo', `${row.period}º`, teamNames[row.teamId] ?? row.teamId, 'faltas_acumulaveis', row.accumulatedFouls, '', row.accumulatedFouls, '']);
    rows.push(['futsal', 'periodo', `${row.period}º`, teamNames[row.teamId] ?? row.teamId, 'faltas_nao_acumulaveis', row.fouls - row.accumulatedFouls, '', row.fouls - row.accumulatedFouls, '']);
    rows.push(['futsal', 'periodo', `${row.period}º`, teamNames[row.teamId] ?? row.teamId, 'substituicoes_registradas', row.substitutions, '', row.substitutions, '']);
  }
  for (const row of report.periodScores) rows.push(['futsal', 'placar_por_periodo', `${row.period}º`, teamNames[row.teamId] ?? row.teamId, 'gols_registrados', row.goals, '', row.goals, '']);
  for (const row of report.periodShots) rows.push(['futsal', 'finalizacoes_por_periodo', `${row.period}º`, teamNames[row.teamId] ?? row.teamId, 'finalizacoes', row.shots, '', row.shots, '']);
  for (const [restart, count] of Object.entries(report.restarts)) rows.push(['futsal', 'reinicio', '', '', restart, count, '', count, '']);
  for (const row of report.controlTime) rows.push(['futsal', 'controle_observado', `${row.period}º`, row.teamId ? teamNames[row.teamId] ?? row.teamId : '', row.state, row.observedMs, '', row.observedMs, 'intervalos consecutivos cobertos']);
  for (const row of report.contextCoverage) rows.push(['futsal', 'contexto_tatico', '', '', `${row.dimension}:${row.category}`, row.shots, row.eligibleShots, row.goals, row.coverage ?? 'indisponivel']);
  for (const point of report.shotPoints) rows.push(['futsal', 'coordenada_finalizacao', `${point.period}º`, teamNames[point.teamId] ?? point.teamId, point.outcome, point.x, point.y, '', 'origem observada; coordenadas normalizadas']);
  for (const lineup of report.compositions) rows.push(['futsal', 'composicao', `${lineup.period}º`, teamNames[lineup.teamId] ?? lineup.teamId, lineup.certainty, lineup.playerIds.join('|'), '', '', 'observacao registrada']);
  for (const interval of report.flyingGoalkeeperIntervals) rows.push(['futsal', 'goleiro_linha', `${interval.period}º`, teamNames[interval.teamId] ?? interval.teamId, 'duracao_ms', interval.durationMs, '', interval.durationMs, interval.durationMs === undefined ? 'intervalo aberto; duracao desconhecida' : 'inicio e fim observados']);
  return `\uFEFF${rows.map(row => row.map(cell).join(';')).join('\r\n')}`;
}

export function renderFutsalAnalyticsPdf(matchName: string, report: FutsalAnalytics, teamNames: Readonly<Record<string, string>>): string {
  const pdf = new PdfDocument(matchName);
  pdf.page('Relatorio descritivo de futsal');
  pdf.paragraph('Modalidade: Futsal. Os resultados contam somente fatos registrados e exibem os denominadores observados. Dados ausentes nao sao tratados como zero.', 10);
  pdf.heading('Resumo por equipe');
  pdf.table(['Equipe', 'Placar', 'Finalizacoes', 'Gols', 'Finalizacoes/posse'], report.teams.map(team => [teamNames[team.teamId] ?? team.teamId, String(team.score), String(team.shots), String(team.goalsFor), team.shotsPerClassifiedPossession === null ? 'indisponivel' : team.shotsPerClassifiedPossession.toFixed(2)]));
  pdf.paragraph('Posse classificada: episodio com inicio e encerramento observados do controle continuo. A contagem nao estima trechos sem cobertura.');
  pdf.heading('Finalizacoes e origem');
  pdf.table(['Equipe', 'Com origem', 'Sem origem', 'Resultados registrados'], report.teams.map(team => [teamNames[team.teamId] ?? team.teamId, String(team.shotsWithPosition), String(team.shotsWithoutPosition), Object.entries(team.shotsByOutcome).filter(([, count]) => count).map(([label, count]) => `${label} ${count}`).join(', ') || 'sem finalizacoes']));
  pdf.heading('Contexto tatico anotado');
  pdf.table(['Dimensao', 'Categoria', 'Finalizacoes n/N', 'Gols', 'Cobertura'], report.contextCoverage.map(row => [row.dimension, row.category, `${row.shots}/${row.eligibleShots}`, String(row.goals), row.coverage === null ? 'indisponivel' : `${Math.round(row.coverage * 100)}%`]));
  pdf.heading('Faltas, substituicoes e reinicios');
  pdf.table(['Periodo', 'Equipe', 'Gols registrados'], report.periodScores.map(row => [`${row.period}º`, teamNames[row.teamId] ?? row.teamId, String(row.goals)]));
  pdf.table(['Periodo', 'Equipe', 'Finalizacoes'], report.periodShots.map(row => [`${row.period}º`, teamNames[row.teamId] ?? row.teamId, String(row.shots)]));
  pdf.table(['Periodo', 'Equipe', 'Faltas', 'Acumulaveis', 'Substituicoes'], report.periodCounts.map(row => [`${row.period}º`, teamNames[row.teamId] ?? row.teamId, String(row.fouls), String(row.accumulatedFouls), String(row.substitutions)]));
  pdf.paragraph(`Reinicios identificados: ${Object.entries(report.restarts).map(([kind, count]) => `${kind} ${count}`).join('; ') || 'nenhum registrado'}.`);
  pdf.heading('Controle e goleiro-linha observados');
  pdf.table(['Periodo', 'Estado', 'Equipe', 'Duracao observada (ms)'], report.controlTime.map(row => [`${row.period}º`, row.state, row.teamId ? teamNames[row.teamId] ?? row.teamId : '-', String(row.observedMs)]));
  pdf.table(['Periodo', 'Equipe', 'Duracao goleiro-linha (ms)'], report.flyingGoalkeeperIntervals.map(row => [`${row.period}º`, teamNames[row.teamId] ?? row.teamId, row.durationMs === undefined ? 'aberto/indeterminada' : String(row.durationMs)]));
  return pdf.build();
}

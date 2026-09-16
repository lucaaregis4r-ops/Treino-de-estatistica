import type { MatchReportModel } from '../../../application/reporting/MatchReportModel';
import type { ReportDraft } from '../../../application/reporting/ReportDraft';
import { PdfDocument, PDF_COLORS as colors } from './PdfDocument';
import type { ReportChartConfiguration } from '../../../domain/reporting/ReportChartConfiguration';
import { drawSelectedReportChart } from './ReportCharts';

export function drawSummary(pdf: PdfDocument, report: MatchReportModel) {
  const [a, b] = report.teams;
  pdf.rect(36, pdf.y - 102, 523, 116, colors.surface);
  pdf.text('PLACAR DO SET ATUAL / ÚLTIMO SET', 54, pdf.y - 7, 8, true, colors.accent);
  pdf.lines(a?.name ?? 'Equipe A', 54, pdf.y - 36, 162, 14, true, colors.blue);
  pdf.text(`${report.score.teamA} : ${report.score.teamB}`, 241, pdf.y - 44, 26, true, '1 1 1');
  pdf.lines(b?.name ?? 'Equipe B', 379, pdf.y - 36, 162, 14, true, colors.purple);
  const setsA = report.sets.filter((set) => set.winnerTeamId === a?.id).length;
  const setsB = report.sets.filter((set) => set.winnerTeamId === b?.id).length;
  pdf.text(`Sets vencidos: ${setsA} × ${setsB}`, 54, pdf.y - 84, 9, false, '1 1 1');
  pdf.y -= 128;
  pdf.paragraph(
    `${new Date(report.metadata.createdAt).toLocaleDateString('pt-BR')} / ${report.eventCount} ações efetivas / ${report.players.length} atletas`,
    9,
  );
  if (report.coverage)
    pdf.paragraph(
      `Identificação: ${report.coverage.identifiedActions} ações com atleta / ${report.coverage.unidentifiedActions} sem atleta identificado.`,
      8,
    );
  pdf.table(
    ['Set', a?.name ?? 'Equipe A', b?.name ?? 'Equipe B', 'Situação'],
    report.sets.map((set) => [
      String(set.setNumber),
      String(set.score.teamA),
      String(set.score.teamB),
      set.completed ? 'Encerrado' : 'Em andamento',
    ]),
  );
  pdf.ensure(284);
  pdf.heading('DESEMPENHO DAS EQUIPES');
  for (let index = 0; index < report.teamSummary.length; index += 2) {
    const teams = report.teamSummary.slice(index, index + 2);
    pdf.ensure(237);
    const top = pdf.y;
    teams.forEach((team, column) => {
      const x = 36 + column * 269;
      pdf.rect(x, top - 217, 254, 233, colors.pale);
      pdf.rect(x, top + 12, 254, 4, column === 0 ? colors.blue : colors.purple);
      pdf.lines(
        report.teams.find((item) => item.id === team.teamId)?.name ?? team.teamId,
        x + 12,
        top - 7,
        230,
        12,
        true,
      );
      const metrics = [
        ['Ataque / eficiência', team.attackEfficiency],
        ['Saque / eficiência', team.serveEfficiency],
        ['Recepção positiva', team.receptionPositive],
        ['Recepção excelente', team.receptionExcellent],
        ['Sideout', team.sideout],
        ['Breakpoint', team.breakpoint],
      ] as const;
      metrics.forEach(([label, metric], i) => {
        const y = top - 45 - i * 24;
        const value = metric.value === null ? '-' : `${(metric.value * 100).toFixed(1)}%`;
        pdf.text(label, x + 12, y, 9, false, colors.muted);
        pdf.text(`${value} [${metric.numerator}/${metric.denominator}]`, x + 137, y, 8, true);
      });
      pdf.text(
        `${team.blocks} bloqueios / ${team.aces} aces / ${team.errors} erros`,
        x + 12,
        top - 200,
        9,
        true,
      );
    });
    pdf.y = top - 240;
  }
  pdf.paragraph(
    'Percentuais acompanhados de [numerador/denominador]. “-” indica ausência de amostra.',
    8,
  );
}

export function drawReportPages(
  pages: readonly (readonly string[])[],
  report: MatchReportModel,
  draft?: ReportDraft,
  charts: readonly ReportChartConfiguration[] = [],
): string {
  const pdf = new PdfDocument(report.metadata.name);
  pages.forEach(([title, ...lines], index) => {
    const isSummary = title === 'SCOUT TRAINER - RELATORIO POS-JOGO';
    pdf.page(isSummary ? draft?.title.trim() || 'Relatório pós-jogo' : title);
    if (index === 0) {
      if (!isSummary && draft?.title.trim()) pdf.paragraph(draft.title, 12);
      if (draft?.subtitle) pdf.paragraph(draft.subtitle, 11);
      if (draft?.author.trim()) pdf.paragraph(`Responsável: ${draft.author}`, 9);
    }
    if (isSummary) drawSummary(pdf, report);
    else {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) {
          pdf.y -= 8;
          continue;
        }
        if (line.includes('|')) {
          const group = [line.split('|').map((cell) => cell.trim())];
          while (lines[i + 1]?.includes('|'))
            group.push(lines[++i].split('|').map((cell) => cell.trim()));
          // Only known table headings are headers; metadata and advanced metrics are prose.
          if (/^(Atleta|Equipe \||Rotacao|Sequencia|SAQUE -|RECEPCAO -)/.test(line)) {
            const [headers, ...rows] = group;
            pdf.table(headers, rows);
          } else group.forEach((cells) => pdf.paragraph(cells.join(' / '), 9));
        } else if (/^[A-Z0-9][-A-Z0-9 ./%+]+$/.test(line)) pdf.heading(line);
        else pdf.paragraph(line, 9);
      }
    }
    if (index === 0 && draft?.notes.trim()) {
      pdf.heading('OBSERVAÇÕES DA ANÁLISE');
      pdf.paragraph(draft.notes);
    }
  });
  if (!pages.length && (draft?.notes.trim() || !charts.length)) {
    pdf.page(draft?.title.trim() || 'Relatório pós-jogo');
    if (draft?.author) pdf.paragraph(`Responsável: ${draft.author}`);
    if (draft?.notes) pdf.paragraph(draft.notes);
  }
  for (const chart of [...charts].sort((left, right) => left.order - right.order)) {
    drawSelectedReportChart(pdf, report, chart);
  }
  if (!charts.length) {
    pdf.ensure(70);
    pdf.paragraph(
      'Nenhum gráfico selecionado. Na tela Análise, marque os gráficos que deseja incluir no relatório.',
      10,
    );
  }
  return pdf.build();
}

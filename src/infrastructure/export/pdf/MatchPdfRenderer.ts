import type {
  AuditableMetric,
  MatchReportModel,
} from '../../../application/reporting/MatchReportModel';
import type { ReportChartConfiguration } from '../../../domain/reporting/ReportChartConfiguration';

function ascii(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, (character) => (character === '×' ? 'x' : '-'));
}

function escapePdf(value: string): string {
  return ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function percent(metric: AuditableMetric): string {
  return metric.value === null ? '-' : `${(metric.value * 100).toFixed(1)}%`;
}

function audit(metric: AuditableMetric): string {
  return `${percent(metric)} [${metric.numerator}/${metric.denominator}]`;
}

function advancedAudit(
  metric: AuditableMetric & { available: boolean; reasonUnavailable?: string },
): string {
  return metric.available
    ? audit(metric)
    : `indisponivel (${metric.reasonUnavailable ?? 'sem amostra'})`;
}

function playerName(report: MatchReportModel, playerId: string): string {
  const player = report.players.find((candidate) => candidate.id === playerId);
  return player ? `#${String(player.number).padStart(2, '0')} ${player.name}` : playerId;
}

function teamName(report: MatchReportModel, teamId: string): string {
  return report.teams.find((team) => team.id === teamId)?.name ?? teamId;
}

function pdfText(
  value: string,
  x: number,
  y: number,
  size: number,
  font: 'F1' | 'F2' = 'F1',
  color = '0.08 0.13 0.11',
): string {
  return `BT /${font} ${size} Tf ${color} rg ${x} ${y} Td (${escapePdf(value)}) Tj ET`;
}

function pageStream(lines: readonly string[], pageNumber: number, totalPages: number): string {
  const [title = 'SCOUT TRAINER', ...content] = lines;
  const commands = [
    'q 0.97 0.98 0.97 rg 0 0 595 842 re f Q',
    'q 0.035 0.12 0.095 rg 0 768 595 74 re f Q',
    'q 0.89 1 0.31 rg 0 763 595 5 re f Q',
    pdfText(title, 38, 800, 18, 'F2', '1 1 1'),
    pdfText(reportSubtitle(pageNumber, title), 40, 781, 8, 'F1', '0.70 0.82 0.77'),
  ];
  let y = 738;
  content.slice(0, 42).forEach((line, index) => {
    if (!line) {
      y -= 9;
      return;
    }
    const section = /^[A-Z0-9][-A-Z0-9 ./%+]+$/.test(ascii(line)) && !line.includes('|');
    const tableRow = line.includes('|');
    if (section) {
      y -= 4;
      commands.push('q 0.88 0.94 0.91 rg 34 ' + (y - 5) + ' 527 22 re f Q');
      commands.push(pdfText(line.slice(0, 86), 42, y + 1, 11, 'F2', '0.05 0.27 0.20'));
      y -= 27;
      return;
    }
    if (tableRow && index % 2 === 0) {
      commands.push(`q 0.93 0.96 0.94 rg 34 ${y - 5} 527 17 re f Q`);
    }
    commands.push(pdfText(line.slice(0, 92), 42, y, tableRow ? 8 : 9, index === 0 ? 'F2' : 'F1'));
    y -= tableRow ? 17 : 14;
  });
  commands.push('q 0.12 0.32 0.25 RG 34 38 m 561 38 l S Q');
  commands.push(pdfText(`Scout Trainer 0.2`, 38, 23, 8, 'F2', '0.12 0.32 0.25'));
  commands.push(pdfText(`pagina ${pageNumber}/${totalPages}`, 500, 23, 8, 'F1', '0.35 0.43 0.40'));
  return commands.join('\n');
}

function reportSubtitle(pageNumber: number, title: string): string {
  return (
    [
      'Visao executiva da partida',
      'Desempenho individual auditavel',
      'Ataque por posicao atual do levantador',
      'Pressao de saque e qualidade de recepcao',
      'Eficiencia por rotacao',
      'Distribuicao da bola e direcoes P1-P6',
    ][pageNumber - 1] ?? `Grafico selecionado: ${ascii(title).slice(0, 70)}`
  );
}

function createPdf(pages: readonly (readonly string[])[]): string {
  const fontObjectId = pages.length * 2 + 3;
  const boldFontObjectId = fontObjectId + 1;
  const objects = new Map<number, string>();
  objects.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
  const pageIds = pages.map((_, index) => 3 + index * 2);
  objects.set(
    2,
    `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`,
  );
  pages.forEach((lines, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const stream = pageStream(lines, index + 1, pages.length);
    objects.set(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectId} 0 R /F2 ${boldFontObjectId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objects.set(contentId, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  objects.set(fontObjectId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects.set(boldFontObjectId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  let document = '%PDF-1.4\n%ScoutTrainer\n';
  const offsets = [0];
  for (let id = 1; id <= boldFontObjectId; id += 1) {
    offsets[id] = document.length;
    document += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
  }
  const xrefOffset = document.length;
  document += `xref\n0 ${boldFontObjectId + 1}\n`;
  document += '0000000000 65535 f \n';
  for (let id = 1; id <= boldFontObjectId; id += 1) {
    document += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  document += `trailer\n<< /Size ${boldFontObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return document;
}

function selectedChartLines(
  report: MatchReportModel,
  configuration: ReportChartConfiguration,
): readonly string[] {
  const teamId = configuration.filters.teamId;
  const playerId = configuration.filters.playerId;
  switch (configuration.type) {
    case 'win_probability':
      return [
        'Sequencia | Placar | Equipe A | Equipe B | Impacto',
        ...(report.winProbability?.points ?? []).map(
          (point) =>
            `${point.sequence} | ${point.scoreTeamA} x ${point.scoreTeamB} | ${(point.teamA * 100).toFixed(1)}% | ${(point.teamB * 100).toFixed(1)}% | ${((point.actionImpact ?? 0) * 100).toFixed(1)}%`,
        ),
      ];
    case 'team_performance':
      return [
        'Equipe | Ataque Ef. | Saque Ef. | Recepcao + | Sideout | Breakpoint | Bloqueios | Aces | Erros',
        ...report.teamSummary.map(
          (row) =>
            `${teamName(report, row.teamId)} | ${audit(row.attackEfficiency)} | ${audit(row.serveEfficiency)} | ${audit(row.receptionPositive)} | ${audit(row.sideout)} | ${audit(row.breakpoint)} | ${row.blocks} | ${row.aces} | ${row.errors}`,
        ),
      ];
    case 'rotation_performance':
      return [
        'Rotacao | Sideout | Breakpoint | Atq Ef. | Rec+ | Aces | Erros',
        ...report.rotations
          .filter((row) => !teamId || row.teamId === teamId)
          .map(
            (row) =>
              `${teamName(report, row.teamId)} | R${row.rotation} | ${audit(row.sideout)} | ${audit(row.breakpoint)} | ${audit(row.attackEfficiency)} | ${audit(row.receptionPositive)} | ${row.aces} | ${row.errors}`,
          ),
      ];
    case 'setter_distribution':
      return [
        'Equipe | Lev P | Atacante | Zona | Combinacao | Volume | Distribuicao',
        ...report.setterDistribution
          .filter((row) => (!teamId || row.teamId === teamId) && (!playerId || row.attackerPlayerId === playerId))
          .map(
            (row) =>
              `${teamName(report, row.teamId)} | P${row.setterPosition} | ${playerName(report, row.attackerPlayerId)} | Z${row.attackZone ?? '-'} | ${row.attackCombination ?? '-'} | ${row.volume} | ${audit(row.share)}`,
          ),
      ];
    case 'attack_evenness':
      return [
        'Equipe | Rotacao | Lev P | Fase | Recepcao | Equilibrio',
        ...report.advanced.attackEvenness
          .filter((row) => !teamId || row.teamId === teamId)
          .map(
            (row) =>
              `${teamName(report, row.teamId)} | R${row.rotation ?? '-'} | P${row.setterPosition ?? '-'} | ${row.phase ?? '-'} | ${row.receptionGrade ?? '-'} | ${advancedAudit(row.evenness)}`,
          ),
      ];
    case 'setter_repetition':
      return [
        'Equipe | Levantador | Atacante | Categoria | Repeticoes',
        ...report.advanced.setterRepetition
          .filter((row) => (!teamId || row.teamId === teamId) && (!playerId || row.attackerPlayerId === playerId))
          .map(
            (row) =>
              `${teamName(report, row.teamId)} | ${playerName(report, row.setterPlayerId)} | ${playerName(report, row.attackerPlayerId)} | ${row.category} | ${audit(row.repeatRate)}`,
          ),
      ];
  }
}

export class MatchPdfRenderer {
  render(
    report: MatchReportModel,
    selectedCharts?: readonly ReportChartConfiguration[],
  ): string {
    const [teamA, teamB] = report.teams;
    const summary = report.teamSummary.flatMap((team) => [
      '',
      teamName(report, team.teamId),
      `Ataque Ef. ${audit(team.attackEfficiency)} | Saque Ef. ${audit(team.serveEfficiency)}`,
      `Recepcao + ${audit(team.receptionPositive)} | Recepcao # ${audit(team.receptionExcellent)}`,
      `Sideout ${audit(team.sideout)} | Breakpoint ${audit(team.breakpoint)}`,
      ...(team.identifiedActions !== undefined
        ? [`Acoes identificadas ${team.identifiedActions} | Sem atleta identificado ${team.unidentifiedActions ?? 0}`]
        : []),
      `Bloqueios ${team.blocks} | Aces ${team.aces} | Erros ${team.errors}`,
    ]);
    const page1 = [
      'SCOUT TRAINER - RELATORIO POS-JOGO',
      '1. RESUMO',
      '',
      report.metadata.name,
      `${teamA?.name ?? 'Equipe A'} ${report.score.teamA} x ${report.score.teamB} ${teamB?.name ?? 'Equipe B'}`,
      `Criada em: ${new Date(report.metadata.createdAt).toISOString()}`,
      `Competicao: ${report.metadata.competitionProfileId ?? report.metadata.complexityProfileId}`,
      `Eventos efetivos: ${report.eventCount}`,
      ...(report.coverage
        ? [
            `Cobertura: ${report.coverage.modes.join(' + ')} | Identificadas ${report.coverage.identifiedActions} | Sem atleta ${report.coverage.unidentifiedActions}`,
          ]
        : []),
      `Duracao observada: ${Math.round(report.durationMs / 60000)} min`,
      '',
      'SETS',
      ...report.sets.map(
        (set) =>
          `Set ${set.setNumber}: ${set.score.teamA} x ${set.score.teamB}${set.completed ? ' (encerrado)' : ''}`,
      ),
      ...summary,
    ];
    const page2 = [
      '2. BOX SCORE POR ATLETA',
      'Atleta | ATA TOT PTS ERR BLK EF% | SRV TOT ACE ERR | REC TOT POS EXC ERR | BLK PTS',
      ...report.players.map((player) => {
        const attack = report.attack.find((row) => row.playerId === player.id);
        const serve = report.serve.find((row) => row.playerId === player.id);
        const reception = report.reception.find((row) => row.playerId === player.id);
        const block = report.block.find((row) => row.playerId === player.id);
        return `${teamName(report, player.teamId)} ${playerName(report, player.id)} | ${attack?.volume ?? 0} ${attack?.points ?? 0} ${attack?.errors ?? 0} ${attack?.blocked ?? 0} ${attack ? audit(attack.efficiency) : '- [0/0]'} | ${serve?.volume ?? 0} ${serve?.aces ?? 0} ${serve?.errors ?? 0} | ${reception?.volume ?? 0} ${reception ? audit(reception.positiveRate) : '- [0/0]'} ${reception ? audit(reception.excellentRate) : '- [0/0]'} ${reception?.errors ?? 0} | ${block?.points ?? 0}`;
      }),
    ];
    const page3 = [
      '3. ATAQUE POR POSICAO DO LEVANTADOR',
      'EFICIENCIA DO ATACANTE EM CADA P',
      'Atleta | Lev P | Volume | Pontos | Erros | Bloqueados | Eficiencia',
      ...report.tactical.attackBySetterPosition.map(
        (row) =>
          `${playerName(report, row.playerId)} | P${row.setterPosition} | ${row.volume} | ${row.points} | ${row.errors} | ${row.blocked} | ${audit(row.efficiency)}`,
      ),
      '',
      'DIRECIONAMENTO DO ATAQUE EM CADA P',
      'Atleta | Lev P | Direcao | Volume | Distribuicao | Eficiencia',
      ...report.tactical.directionsBySetterPosition.map(
        (row) =>
          `${playerName(report, row.playerId)} | P${row.setterPosition} | ${row.direction} | ${row.volume} | ${audit(row.share)} | ${audit(row.efficiency)}`,
      ),
    ];
    const page4 = [
      '4. SAQUE E RECEPCAO',
      'SAQUE - Atleta | Total | Ace | Erro | Eficiencia',
      ...report.serve.map(
        (row) =>
          `${playerName(report, row.playerId)} | ${row.volume} | ${row.aces} | ${row.errors} | ${audit(row.efficiency)}`,
      ),
      '',
      'RECEPCAO - Atleta | Total | A/B/C/Erro | Positiva | Excelente',
      ...report.reception.map(
        (row) =>
          `${playerName(report, row.playerId)} | ${row.volume} | ${row.A}/${row.B}/${row.C}/${row.errors} | ${audit(row.positiveRate)} | ${audit(row.excellentRate)}`,
      ),
    ];
    const page5 = [
      '5. SIDEOUT / BREAKPOINT POR ROTACAO',
      'Equipe | Rotacao | Sideout | Breakpoint | Atq Ef. | Rec+ | Ace | Erro',
      ...report.rotations.map(
        (row) =>
          `${teamName(report, row.teamId)} | R${row.rotation} | ${audit(row.sideout)} | ${audit(row.breakpoint)} | ${audit(row.attackEfficiency)} | ${audit(row.receptionPositive)} | ${row.aces} | ${row.errors}`,
      ),
    ];
    const page6 = [
      '6. DISTRIBUICAO DA BOLA P1-P6',
      'ANALYTICS AVANCADO',
      ...report.advanced.expectedSideout
        .filter((row) => !row.playerId)
        .map(
          (row) =>
            `${teamName(report, row.teamId)} | Expected Sideout | ${advancedAudit(row.rate)}`,
        ),
      ...report.advanced.expectedBreakpoint
        .filter((row) => !row.playerId)
        .map(
          (row) =>
            `${teamName(report, row.teamId)} | Expected Breakpoint | ${advancedAudit(row.rate)}`,
        ),
      ...report.advanced.attackEvenness
        .filter((row) => !row.rotation && !row.setterPosition && !row.phase && !row.receptionGrade)
        .map(
          (row) =>
            `${teamName(report, row.teamId)} | Attack Evenness | ${advancedAudit(row.evenness)}`,
        ),
      ...report.advanced.setterRepetition
        .slice(0, 6)
        .map(
          (row) =>
            `Setter Repetition | ${playerName(report, row.setterPlayerId)} | ${playerName(report, row.attackerPlayerId)} | ${row.category} | ${audit(row.repeatRate)}`,
        ),
      ...report.advanced.setterAttackConversion
        .slice(0, 6)
        .map(
          (row) =>
            `Setter Attack Conversion | ${playerName(report, row.setterPlayerId)} | P${row.setterPosition} | ${playerName(report, row.attackerPlayerId)} | Kill ${audit(row.killRate)} | Ef ${audit(row.attackEfficiency)}`,
        ),
      '',
      'DISTRIBUICAO DO LEVANTADOR EM CADA POSICAO',
      'Equipe | Lev P | Recepcao | Atacante | Zona | Combinacao | Volume | Distribuicao',
      ...report.setterDistribution.map(
        (row) =>
          `${teamName(report, row.teamId)} | P${row.setterPosition} | ${row.receptionGrade ?? '-'} | ${playerName(report, row.attackerPlayerId)} | Z${row.attackZone ?? '-'} | ${row.attackCombination ?? '-'} | ${row.volume} | ${audit(row.share)}`,
      ),
    ];
    if (selectedCharts === undefined) return createPdf([page1, page2, page3, page4, page5, page6]);
    const selectedPages = [...selectedCharts]
      .sort((left, right) => left.order - right.order)
      .map((configuration, index) => [
        `${index + 3}. ${configuration.title}`,
        `Tipo: ${configuration.type}`,
        `Amostra: ${configuration.sample.totalActions} acoes | Identificadas ${configuration.sample.identifiedActions} | Sem atleta ${configuration.sample.unidentifiedActions}`,
        ...(configuration.coverage
          ? [`Cobertura: ${configuration.coverage.modes.join(' + ')} | Identificadas ${configuration.coverage.identifiedActions} | Sem atleta ${configuration.coverage.unidentifiedActions}`]
          : []),
        '',
        ...selectedChartLines(report, configuration),
      ]);
    return createPdf([page1, page2, ...selectedPages]);
  }
}

import { describe, expect, it } from 'vitest';
import type {
  AuditableMetric,
  MatchReportModel,
} from '../../application/reporting/MatchReportModel';
import { DEFAULT_INDOOR_SCORING_RULES } from '../../domain/match/rules/SetScoringRules';
import { createReportChartConfiguration } from '../../domain/reporting/ReportChartConfiguration';
import { StatisticsCsvExporter } from './csv/StatisticsCsvExporter';
import { MatchPdfRenderer } from './pdf/MatchPdfRenderer';
import { createReportDraft } from '../../application/reporting/ReportDraft';
import { matchPdfPreviewPages } from './pdf/MatchPdfPreview';
import { buildReportChartModel } from '../../application/reporting/ReportChartModel';
import { parseReportDraft } from '../../application/reporting/ReportDraft';
import { PdfDocument } from './pdf/PdfDocument';

const decoded = (pdf: string) => pdf.replace(/\\([0-7]{3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)));

const rate = (numerator: number, denominator: number): AuditableMetric => ({
  value: denominator ? numerator / denominator : null,
  numerator,
  denominator,
});

const report: MatchReportModel = {
  metadata: {
    id: 'match_1',
    name: 'Equipe Á x Equipe B',
    teamAId: 'team_a',
    teamBId: 'team_b',
    createdAt: Date.UTC(2026, 7, 25),
    status: 'finished',
    initialServingTeamId: 'team_a',
    scoringRules: DEFAULT_INDOOR_SCORING_RULES,
    codeProfileId: 'default_compact_v1',
    codeProfileVersion: '1.0.0',
    complexityProfileId: 'tactical',
  },
  eventCount: 150,
  durationMs: 5_400_000,
  score: { teamA: 25, teamB: 21 },
  sets: [
    { setNumber: 1, score: { teamA: 25, teamB: 21 }, completed: true, winnerTeamId: 'team_a' },
  ],
  teams: [
    { id: 'team_a', name: 'Equipe Á' },
    { id: 'team_b', name: 'Equipe B' },
  ],
  players: [{ id: 'player_a', teamId: 'team_a', number: 7, name: 'João' }],
  attack: [
    {
      playerId: 'player_a',
      teamId: 'team_a',
      volume: 10,
      points: 5,
      errors: 2,
      blocked: 1,
      continuity: 2,
      pointRate: rate(5, 10),
      errorRate: rate(2, 10),
      blockedRate: rate(1, 10),
      efficiency: rate(2, 10),
    },
  ],
  serve: [
    {
      playerId: 'player_a',
      teamId: 'team_a',
      volume: 10,
      aces: 2,
      errors: 1,
      continuity: 7,
      aceRate: rate(2, 10),
      errorRate: rate(1, 10),
      efficiency: rate(1, 10),
    },
  ],
  reception: [
    {
      playerId: 'player_a',
      teamId: 'team_a',
      volume: 10,
      A: 4,
      B: 3,
      C: 2,
      errors: 1,
      positiveRate: rate(7, 10),
      excellentRate: rate(4, 10),
    },
  ],
  block: [
    {
      playerId: 'player_a',
      teamId: 'team_a',
      points: 2,
      touches: 1,
      errors: 0,
      pointsPerSet: rate(2, 1),
    },
  ],
  rotations: [
    {
      teamId: 'team_a',
      rotation: 1,
      sideout: rate(3, 5),
      breakpoint: rate(2, 4),
      attackEfficiency: rate(2, 10),
      receptionPositive: rate(7, 10),
      aces: 2,
      errors: 3,
    },
  ],
  sideout: [{ teamId: 'team_a', rate: rate(3, 5) }],
  breakpoint: [{ teamId: 'team_a', rate: rate(2, 4) }],
  setterDistribution: [
    {
      teamId: 'team_a',
      setterPosition: 1,
      receptionGrade: 'A',
      attackerPlayerId: 'player_a',
      attackZone: '4',
      attackCombination: 'X1',
      volume: 10,
      share: rate(10, 10),
    },
  ],
  teamSummary: [
    {
      teamId: 'team_a',
      attackEfficiency: rate(2, 10),
      serveEfficiency: rate(1, 10),
      receptionPositive: rate(7, 10),
      receptionExcellent: rate(4, 10),
      sideout: rate(3, 5),
      breakpoint: rate(2, 4),
      blocks: 2,
      aces: 2,
      errors: 3,
    },
  ],
  advanced: {
    expectedSideout: [
      {
        teamId: 'team_a',
        rate: { ...rate(7, 10), available: true, referenceSampleSize: 250 },
      },
      {
        teamId: 'team_b',
        rate: {
          ...rate(0, 0),
          available: false,
          reasonUnavailable: 'insufficient_reference_sample',
          referenceSampleSize: 0,
        },
      },
    ],
    expectedBreakpoint: [
      {
        teamId: 'team_a',
        rate: { ...rate(4, 10), available: true, referenceSampleSize: 300 },
      },
    ],
    attackEvenness: [
      {
        teamId: 'team_a',
        evenness: { ...rate(8, 10), available: true },
        distribution: [],
      },
    ],
    setterRepetition: [
      {
        teamId: 'team_a',
        setterPlayerId: 'setter_a',
        attackerPlayerId: 'player_a',
        category: 'overall',
        opportunities: 5,
        repeats: 2,
        repeatRate: rate(2, 5),
      },
    ],
    setterAttackConversion: [
      {
        teamId: 'team_a',
        setterPlayerId: 'setter_a',
        setterPosition: 1,
        attackerPlayerId: 'player_a',
        receptionGrade: 'A',
        phase: 'sideout',
        attackCombination: 'X1',
        volume: 10,
        points: 5,
        errors: 2,
        blocked: 1,
        killRate: rate(5, 10),
        attackEfficiency: rate(2, 10),
      },
    ],
  },
  tactical: {
    attackDirections: [
      {
        teamId: 'team_a',
        setNumber: 1,
        playerId: 'player_a',
        setterPlayerId: 'setter_a',
        setterPosition: 1,
        originZone: '4',
        targetZone: '1',
        direction: 'diagonal',
        attackType: 'potência',
        attackCombination: 'X1',
        phase: 'sideout',
        receptionGrade: 'A',
        blockersCount: 2,
        volume: 10,
        points: 5,
        errors: 2,
        blocked: 1,
        efficiency: rate(2, 10),
      },
    ],
    attackBySetterPosition: [
      {
        teamId: 'team_a',
        playerId: 'player_a',
        setterPosition: 1,
        volume: 10,
        points: 5,
        errors: 2,
        blocked: 1,
        efficiency: rate(2, 10),
      },
    ],
    directionsBySetterPosition: [
      {
        teamId: 'team_a',
        playerId: 'player_a',
        setterPosition: 1,
        direction: 'diagonal',
        volume: 10,
        points: 5,
        errors: 2,
        blocked: 1,
        efficiency: rate(2, 10),
        share: rate(10, 10),
      },
    ],
  },
};

describe('Match report exporters', () => {
  it('renders a valid paginated PDF with accented names and auditable metrics', () => {
    const pdf = new MatchPdfRenderer().render(report);

    expect(pdf).toMatch(/^%PDF-1\.4/);
    expect(decoded(pdf)).toContain('Relatório pós-jogo');
    expect(decoded(pdf)).not.toContain('Desempenho por atleta');
    expect(decoded(pdf)).not.toContain('Distribuição da bola / P1-P6');
    expect(decoded(pdf)).toContain('Nenhum gráfico selecionado');
    expect(pdf).toContain('/BaseFont /Helvetica-Bold');
    expect(pdf).not.toContain('DIRECIONAMENTO DO ATAQUE EM CADA P');
    expect(pdf).not.toContain('ANALYTICS AVANCADO');
    expect(pdf).toContain('20.0% [2/10]');
    expect(pdf).toMatch(/xref[\s\S]+startxref[\s\S]+%%EOF$/);
    expect([...pdf].every((character) => character.charCodeAt(0) < 128)).toBe(true);
  });

  it('renders only the report charts selected by the analyst', () => {
    const pdf = new MatchPdfRenderer().render(report, [
      createReportChartConfiguration({
        id: 'chart_1',
        matchId: 'match_1',
        type: 'rotation_performance',
        title: 'Rotação de saque',
        filters: { teamId: 'team_a' },
        order: 0,
        sample: { totalActions: 150, identifiedActions: 120, unidentifiedActions: 30 },
      }),
    ]);

    expect(pdf).toContain('/Type /Pages /Count 2');
    expect(decoded(pdf)).toContain('Rotação de saque');
    expect(pdf).toContain('Sideout');
    expect(pdf).not.toContain('3. ATAQUE POR POSICAO DO LEVANTADOR');
    expect(matchPdfPreviewPages(pdf)[1]).toContain('<polyline');
  });

  it('renders exactly the selected graphics in saved order, keeping filters and negative bars', () => {
    const configuration = (type: 'setter_distribution' | 'team_performance', order: number, title: string) => createReportChartConfiguration({ id: title, matchId: 'match_1', type, title, order, filters: { teamId: 'team_a', playerId: 'player_a', setterPosition: 1 }, sample: { totalActions: 150, identifiedActions: 150, unidentifiedActions: 0 } });
    const first = configuration('setter_distribution', 0, 'Bolas de João em P1');
    const second = configuration('team_performance', 1, 'Performance escolhida');
    const filtered = buildReportChartModel({ ...report, setterDistribution: [...report.setterDistribution, { ...report.setterDistribution[0], setterPosition: 2, volume: 999 }] }, first);
    expect(filtered.categories).toEqual(['P1']);
    expect(filtered.series[0].values).toEqual([10]);
    const pdf = new MatchPdfRenderer().render(report, [second, first], undefined, { ...createReportDraft(), sections: ['charts'] });
    const pages = matchPdfPreviewPages(pdf);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toContain('Bolas de João em P1');
    expect(pages[1]).toContain('Performance escolhida');
    expect(decoded(pdf)).not.toContain('Probabilidade de vitória');
    expect(decoded(pdf)).not.toContain('Desempenho por atleta');
    const negative = { ...report, teamSummary: [{ ...report.teamSummary[0], attackEfficiency: rate(-2, 10) }] };
    const negativePdf = new MatchPdfRenderer().render(negative, [second], undefined, { ...createReportDraft(), sections: ['charts'] });
    expect(negativePdf).toContain('-20.0%');
    expect(negativePdf).not.toMatch(/NaN|Infinity/);
  });

  it('keeps old draft text but removes formerly automatic tables', () => {
    const draft = parseReportDraft({ ...createReportDraft(), notes: 'Minha análise', sections: ['summary', 'players', 'attack', 'serve', 'rotations', 'distribution', 'charts'] });
    expect(draft?.notes).toBe('Minha análise');
    expect(draft?.sections).toEqual(['summary', 'charts']);
  });

  it('keeps separate values for two versions of the same chart', () => {
    const data: MatchReportModel = { ...report, setterDistribution: [
      ...report.setterDistribution,
      { ...report.setterDistribution[0], setterPosition: 2, volume: 7 },
    ] };
    const versions = [1, 2].map((position, index) => createReportChartConfiguration({ id: `variation_${position}`, matchId: 'match_1', type: 'setter_distribution', title: `Distribuição P${position}`, filters: { teamId: 'team_a', playerId: 'player_a', setterPosition: position }, order: index, sample: { totalActions: 150, identifiedActions: 150, unidentifiedActions: 0 } }));
    expect(buildReportChartModel(data, versions[0]).series[0].values).toEqual([10]);
    expect(buildReportChartModel(data, versions[1]).series[0].values).toEqual([7]);
    const pdf = new MatchPdfRenderer().render(data, versions, undefined, { ...createReportDraft(), sections: ['charts'] });
    const pages = matchPdfPreviewPages(pdf);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toContain('Distribuição P1');
    expect(pages[1]).toContain('Distribuição P2');
    expect(versions[0].filters.setterPosition).toBe(1);
  });

  it.each(['win_probability', 'team_performance', 'rotation_performance', 'setter_distribution', 'attack_evenness', 'setter_repetition'] as const)('draws the selected %s as vector graphics in PDF and preview', (type) => {
    const chart = createReportChartConfiguration({ id: type, matchId: 'match_1', type, title: `Gráfico ${type}`, filters: { teamId: 'team_a' }, order: 0, sample: { totalActions: 150, identifiedActions: 150, unidentifiedActions: 0 } });
    const data: MatchReportModel = { ...report,
      advanced: { ...report.advanced, attackEvenness: [{ ...report.advanced.attackEvenness[0], setterPosition: 1 }] },
      winProbability: { teamA: .6, teamB: .4, setTeamA: .6, setTeamB: .4, points: [
        { sequence: 1, setNumber: 1, scoreTeamA: 0, scoreTeamB: 0, teamA: .5, teamB: .5 },
        { sequence: 2, setNumber: 1, scoreTeamA: 1, scoreTeamB: 0, teamA: .6, teamB: .4 },
      ] },
    };
    const pdf = new MatchPdfRenderer().render(data, [chart], undefined, { ...createReportDraft(), sections: ['charts'] });
    const pages = matchPdfPreviewPages(pdf);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toContain('<polyline');
    expect(decoded(pdf)).not.toContain('Sem amostra suficiente');
    expect(decoded(pdf)).toContain(`Gráfico ${type}`);
    expect(decoded(pdf)).not.toContain('BOX SCORE');
    if (type === 'win_probability') expect(pdf).toMatch(/RG 2 w [^\n]+ l S Q/);
  });

  it('retains every row across page breaks and writes byte-correct xref offsets', () => {
    const players = Array.from({ length: 100 }, (_, i) => ({ id: `player_${i}`, teamId: 'team_a', number: i, name: `Atleta ${i} com nome bastante longo para quebrar linha` }));
    const document = new PdfDocument('Teste de paginação');
    document.page('Tabela extensa');
    document.table(['Atleta', 'Número'], players.map((player) => [player.name, String(player.number)]));
    const pdf = document.build();
    expect(Number(pdf.match(/\/Type \/Pages \/Count (\d+)/)?.[1])).toBeGreaterThan(1);
    for (let i = 0; i < 100; i++) expect(pdf).toContain(`Atleta ${i}`);
    const xref = Number(pdf.match(/startxref\n(\d+)/)?.[1]);
    expect(pdf.slice(xref, xref + 4)).toBe('xref');
    const offsets = pdf.slice(xref).split('\n').slice(3).filter((line) => /^\d{10} 00000 n/.test(line));
    offsets.forEach((line, index) => expect(pdf.slice(Number(line.slice(0, 10)))).toMatch(new RegExp(`^${index + 1} 0 obj`)));
    for (const match of pdf.matchAll(/\/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g)) expect(match[2].length).toBe(Number(match[1]));
  });

  it('exports edited text and selected sections without changing the report data', () => {
    const original = JSON.stringify(report);
    const pdf = new MatchPdfRenderer().render(report, [], undefined, { ...createReportDraft(), title: 'Revisão técnica', author: 'Comissão', notes: 'Ajustar (bloqueio) e saque.\nÚltima observação.', sections: ['summary'] });
    expect(decoded(pdf)).toContain('Revisão técnica');
    expect(decoded(pdf)).toContain('Comissão');
    expect(decoded(pdf)).toContain('Ajustar \\(bloqueio\\) e saque.');
    expect(decoded(pdf)).toContain('Última observação.');
    expect(decoded(pdf)).not.toContain('Desempenho por atleta');
    expect(JSON.stringify(report)).toBe(original);
  });

  it('previews the exported pages with accented text and escaped XML', () => {
    const pdf = new MatchPdfRenderer().render(report, [], undefined, { ...createReportDraft(), title: 'Análise <Equipe> & comissão', sections: ['summary'] });
    const pages = matchPdfPreviewPages(pdf);
    expect(pages).toHaveLength(Number(pdf.match(/\/Type \/Pages \/Count (\d+)/)?.[1]));
    expect(pages.join('')).toContain('Análise &lt;Equipe&gt; &amp; comissão');
    expect(pages.join('')).toContain('20.0% [2/10]');
    expect(pages.join('')).not.toContain('<Equipe>');
  });

  it('exports the same auditable report values to statistics CSV', () => {
    const csv = new StatisticsCsvExporter().export(report);

    expect(csv).toContain('section,team_id,player_id,rotation,metric,numerator,denominator,value');
    expect(csv).toContain('attack,team_a,player_a,,efficiency,2,10,0.2');
    expect(csv).toContain('rotation,team_a,,1,sideout,3,5,0.6');
    expect(csv).toContain('advanced_expected_sideout,team_a,,,expected_sideout,7,10,0.7');
    expect(csv).toContain(
      'advanced_expected_sideout,team_b,,,expected_sideout,0,0,,false,insufficient_reference_sample,0',
    );
    expect(csv).toContain('advanced_setter_repetition,team_a,player_a,,overall,2,5,0.4');
    expect(csv).toContain(
      'advanced_setter_conversion,team_a,player_a,1,attack_efficiency,2,10,0.2',
    );
  });
});

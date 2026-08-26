import { describe, expect, it } from 'vitest';
import type {
  AuditableMetric,
  MatchReportModel,
} from '../../application/reporting/MatchReportModel';
import { DEFAULT_INDOOR_SCORING_RULES } from '../../domain/match/rules/SetScoringRules';
import { StatisticsCsvExporter } from './csv/StatisticsCsvExporter';
import { MatchPdfRenderer } from './pdf/MatchPdfRenderer';

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
  tactical: {
    attackDirections: [
      {
        teamId: 'team_a',
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
  it('renders a valid six-page PDF from the report model', () => {
    const pdf = new MatchPdfRenderer().render(report);

    expect(pdf).toMatch(/^%PDF-1\.4/);
    expect(pdf).toContain('/Type /Pages /Count 6');
    expect(pdf).toContain('1. RESUMO');
    expect(pdf).toContain('2. BOX SCORE POR ATLETA');
    expect(pdf).toContain('6. DISTRIBUICAO DA BOLA P1-P6');
    expect(pdf).toContain('/BaseFont /Helvetica-Bold');
    expect(pdf).toContain('DIRECIONAMENTO DO ATAQUE EM CADA P');
    expect(pdf).toContain('20.0% [2/10]');
    expect(pdf).toMatch(/xref[\s\S]+startxref[\s\S]+%%EOF$/);
    expect([...pdf].every((character) => character.charCodeAt(0) < 128)).toBe(true);
  });

  it('exports the same auditable report values to statistics CSV', () => {
    const csv = new StatisticsCsvExporter().export(report);

    expect(csv).toContain('section,team_id,player_id,rotation,metric,numerator,denominator,value');
    expect(csv).toContain('attack,team_a,player_a,,efficiency,2,10,0.2');
    expect(csv).toContain('rotation,team_a,,1,sideout,3,5,0.6');
  });
});

import { describe, expect, it } from 'vitest';
import { analyzeBasketballTacticalMarkov, extractBasketballTacticalPossessions } from './BasketballTacticalMarkov';
import type { BasketballFact } from './BasketballScout';

describe('BasketballTacticalMarkov', () => {
  const sampleFacts: BasketballFact[] = [
    {
      id: 'f1',
      period: 1,
      timestamp: 1000,
      teamId: 'team_a',
      kind: 'shot',
      value: 2,
      outcome: 'made',
      tactic: 'pick_roll',
      rhythm: 'set_offense',
      position: { x: 0.06, y: 0.5 }, // Rim
      originPosition: { x: 0.32, y: 0.5 },
    },
    {
      id: 'f2',
      period: 1,
      timestamp: 2000,
      teamId: 'team_a',
      kind: 'shot',
      value: 3,
      outcome: 'missed',
      tactic: 'drive_kick',
      rhythm: 'transition',
      position: { x: 0.05, y: 0.04 }, // Corner 3
    },
    {
      id: 'f3',
      period: 1,
      timestamp: 2500,
      teamId: 'team_b',
      kind: 'rebound',
      side: 'defensive',
    },
    {
      id: 'f4',
      period: 1,
      timestamp: 3000,
      teamId: 'team_a',
      kind: 'turnover',
      cause: 'bad_pass',
      tactic: 'isolation',
      rhythm: 'set_offense',
    },
  ];

  it('extrai corretamente posses táticas', () => {
    const possessions = extractBasketballTacticalPossessions(sampleFacts, 'team_a');
    expect(possessions).toHaveLength(3);
    expect(possessions[0]).toMatchObject({
      trigger: 'pick_roll',
      rhythm: 'set_offense',
      zone: 'rim',
      outcome: 'made',
      points: 2,
    });
    expect(possessions[1]).toMatchObject({
      trigger: 'drive_kick',
      rhythm: 'transition',
      zone: 'corner_3',
      outcome: 'missed',
      points: 0,
    });
    expect(possessions[2]).toMatchObject({
      trigger: 'isolation',
      rhythm: 'set_offense',
      zone: 'turnover',
      outcome: 'turnover',
      points: 0,
    });
  });

  it('calcula métricas de eficiência (PPP, eFG%, volumes) e nós da árvore de Markov', () => {
    const model = analyzeBasketballTacticalMarkov(sampleFacts, 'team_a');
    expect(model.sampleCount).toBe(3);
    expect(model.totalPoints).toBe(2);
    // 2 points in 3 possessions = 0.67 PPP
    expect(model.pointsPerPossession).toBeCloseTo(0.667, 2);
    expect(model.turnoversCount).toBe(1);

    // Nodes contain Stage 1 (Rhythms), Stage 2 (Triggers), Stage 3 (Zones)
    const stage1 = model.nodes.filter((n) => n.stage === 1);
    expect(stage1.map((n) => n.id)).toContain('rhythm_set_offense');
    expect(stage1.map((n) => n.id)).toContain('rhythm_transition');

    const stage2 = model.nodes.filter((n) => n.stage === 2);
    expect(stage2.map((n) => n.id)).toContain('trigger_pick_roll');
    expect(stage2.map((n) => n.id)).toContain('trigger_drive_kick');

    const stage3 = model.nodes.filter((n) => n.stage === 3);
    expect(stage3.map((n) => n.id)).toContain('zone_rim');
    expect(stage3.map((n) => n.id)).toContain('zone_corner_3');
    expect(stage3.map((n) => n.id)).toContain('zone_turnover');

    // Vectors and events created
    expect(model.vectors).toHaveLength(1);
    expect(model.courtEvents).toHaveLength(2);
    expect(model.coachBriefing.narrative).toContain('PPP');
  });

  it('filtra por nó selecionado na árvore', () => {
    const modelFiltered = analyzeBasketballTacticalMarkov(sampleFacts, 'team_a', {
      selectedNodeId: 'trigger_pick_roll',
    });
    // Vectors should only reflect the pick_roll possession
    expect(modelFiltered.vectors).toHaveLength(1);
    expect(modelFiltered.vectors[0].label).toContain('Aro');
  });

  it('conta rebote ofensivo e segunda tentativa na mesma posse, sem inventar trajetória', () => {
    const facts: BasketballFact[] = [
      { id: 'p', period: 1, timestamp: 1, teamId: 'team_a', kind: 'possession' },
      { id: 's1', period: 1, timestamp: 2, teamId: 'team_a', kind: 'shot', value: 2, outcome: 'missed', position: { x: .1, y: .5 } },
      { id: 'r', period: 1, timestamp: 3, teamId: 'team_a', kind: 'rebound', side: 'offensive' },
      { id: 's2', period: 1, timestamp: 4, teamId: 'team_a', kind: 'shot', value: 2, outcome: 'made', position: { x: .1, y: .5 } },
      { id: 'ft', period: 1, timestamp: 5, teamId: 'team_a', kind: 'shot', value: 1, outcome: 'made' },
    ];
    const model = analyzeBasketballTacticalMarkov(facts, 'team_a');
    expect(model.sampleCount).toBe(2);
    expect(model.pointsPerPossession).toBe(1.5);
    expect(model.fieldGoalPercentage).toBe(50);
    expect(model.vectors).toHaveLength(0);
    expect(model.courtEvents).toHaveLength(2);
    expect(model.zoneSummary[0].points).toBe(2);
  });
});

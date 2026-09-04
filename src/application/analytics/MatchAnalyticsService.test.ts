import { describe, expect, it } from 'vitest';
import type { MatchMetadata } from '../../domain/match/entities/MatchMetadata';
import type { Player } from '../../domain/match/entities/Player';
import { createInitialMatchState } from '../../domain/match/state/MatchState';
import type { TacticalRallyProjection } from '../../domain/rally/context/TacticalRallyProjection';
import type { ScoutEvent } from '../../domain/scout/events/ScoutEvent';
import { DEFAULT_INDOOR_SCORING_RULES } from '../../domain/match/rules/SetScoringRules';
import { createDefaultMetricRegistry } from '../../domain/statistics/registry/createDefaultMetricRegistry';
import { StatisticsEngine } from '../../domain/statistics/StatisticsEngine';
import { MatchAnalyticsService, type MatchAnalyticsInput } from './MatchAnalyticsService';

const metadata: MatchMetadata = {
  id: 'match_1',
  name: 'Equipe A x Equipe B',
  teamAId: 'team_a',
  teamBId: 'team_b',
  createdAt: 1,
  status: 'in_progress',
  initialServingTeamId: 'team_b',
  scoringRules: DEFAULT_INDOOR_SCORING_RULES,
  codeProfileId: 'default_compact_v1',
  codeProfileVersion: '1.0.0',
  complexityProfileId: 'tactical',
};

function scout(
  id: string,
  rallyId: string,
  sequence: number,
  skill: ScoutEvent['skill'],
  teamId: string,
  playerId: string,
  outcome: string,
  setterPosition: 1 | 2 | 3 | 4 | 5 | 6,
  metadataValue?: ScoutEvent['metadata'],
): ScoutEvent {
  return {
    id,
    matchId: metadata.id,
    rallyId,
    sequence,
    teamId,
    playerId,
    setterPlayerId: 'setter_a',
    setterPosition,
    skill,
    outcome,
    evaluation: outcome,
    setNumber: 1,
    scoreBefore: { teamA: 0, teamB: 0 },
    timestamp: sequence,
    rawCode: id,
    codeProfileId: metadata.codeProfileId,
    codeProfileVersion: metadata.codeProfileVersion,
    complexityProfileId: metadata.complexityProfileId,
    ...(metadataValue ? { metadata: metadataValue } : {}),
  };
}

function completeRotationInput(): MatchAnalyticsInput {
  const events: ScoutEvent[] = [];
  const contacts: TacticalRallyProjection['contacts'][number][] = [];
  const rallies: TacticalRallyProjection['rallies'][number][] = [];
  let sequence = 0;
  for (const rotation of [1, 2, 3, 4, 5, 6] as const) {
    const sideoutRally = `sideout_${rotation}`;
    const reception = scout(
      `reception_${rotation}`,
      sideoutRally,
      ++sequence,
      'reception',
      'team_a',
      'attacker_a',
      'perfect',
      rotation,
      { receptionGrade: 'A' },
    );
    const attack = scout(
      `attack_${rotation}`,
      sideoutRally,
      ++sequence,
      'attack',
      'team_a',
      'attacker_a',
      'point',
      rotation,
      {
        originZone: 4,
        targetZone: rotation,
        direction: 'diagonal',
        skillType: 'potência',
        attackCombination: 'X1',
        blockersCount: 2,
      },
    );
    const breakpointRally = `breakpoint_${rotation}`;
    const serve = scout(
      `serve_${rotation}`,
      breakpointRally,
      ++sequence,
      'serve',
      'team_a',
      'attacker_a',
      rotation <= 3 ? 'ace' : 'continuation',
      rotation,
    );
    events.push(reception, attack, serve);
    contacts.push(
      {
        sourceEventId: reception.id,
        historyEventId: reception.id,
        rallyId: sideoutRally,
        teamId: reception.teamId,
        skill: reception.skill,
        phase: 'sideout',
        servingTeamId: 'team_b',
        rotation,
        setterPlayerId: 'setter_a',
        setterPosition: rotation,
      },
      {
        sourceEventId: attack.id,
        historyEventId: attack.id,
        rallyId: sideoutRally,
        teamId: attack.teamId,
        skill: attack.skill,
        phase: 'sideout',
        servingTeamId: 'team_b',
        rotation,
        setterPlayerId: 'setter_a',
        setterPosition: rotation,
        receptionForAttack: { receptionEventId: reception.id, grade: 'A' },
      },
      {
        sourceEventId: serve.id,
        historyEventId: serve.id,
        rallyId: breakpointRally,
        teamId: serve.teamId,
        skill: serve.skill,
        phase: 'breakpoint',
        servingTeamId: 'team_a',
        rotation,
        setterPlayerId: 'setter_a',
        setterPosition: rotation,
      },
    );
    rallies.push(
      {
        rallyId: sideoutRally,
        servingTeamId: 'team_b',
        winnerTeamId: 'team_a',
        transitionTeamIds: [],
      },
      {
        rallyId: breakpointRally,
        servingTeamId: 'team_a',
        winnerTeamId: rotation <= 3 ? 'team_a' : 'team_b',
        transitionTeamIds: [],
      },
    );
  }
  const roster: Player[] = [
    { id: 'attacker_a', teamId: 'team_a', number: 7, name: 'João' },
    { id: 'setter_a', teamId: 'team_a', number: 1, name: 'Levantador' },
    { id: 'player_b', teamId: 'team_b', number: 8, name: 'Pedro' },
  ];
  return {
    events,
    state: createInitialMatchState(metadata),
    roster,
    teams: [
      { id: 'team_a', name: 'Equipe A' },
      { id: 'team_b', name: 'Equipe B' },
    ],
    lineups: [],
    tacticalRally: {
      contacts,
      rallies,
      servingTeamId: 'team_a',
      rotationByTeamId: { team_a: 6 },
    },
    expectedSideoutReferences: {
      team_a: [{ key: 'A', opportunities: 100, successes: 80, rate: 0.8 }],
    },
    expectedBreakpointReferences: {
      team_a: [
        { key: 'ace', opportunities: 20, successes: 20, rate: 1 },
        { key: 'continuation', opportunities: 80, successes: 20, rate: 0.25 },
      ],
    },
    attackEvennessReferences: {
      team_a: [
        { playerId: 'attacker_a', expectedShare: 0.5 },
        { playerId: 'setter_a', expectedShare: 0.5 },
      ],
    },
  };
}

describe('MatchAnalyticsService', () => {
  const service = new MatchAnalyticsService(new StatisticsEngine(createDefaultMetricRegistry()));

  it('builds auditable player, rally, rotation and setter-position analytics', () => {
    const input = completeRotationInput();
    const report = service.build(input);
    const attack = report.attack.find((row) => row.playerId === 'attacker_a');
    const serve = report.serve.find((row) => row.playerId === 'attacker_a');
    const reception = report.reception.find((row) => row.playerId === 'attacker_a');
    const sideout = report.sideout.find(
      (row) => row.teamId === 'team_a' && !row.playerId && !row.setNumber && !row.rotation,
    );
    const breakpoint = report.breakpoint.find(
      (row) => row.teamId === 'team_a' && !row.playerId && !row.setNumber && !row.rotation,
    );

    expect(attack).toMatchObject({
      volume: 6,
      points: 6,
      efficiency: { value: 1, numerator: 6, denominator: 6 },
    });
    expect(serve).toMatchObject({ volume: 6, aces: 3, aceRate: { value: 0.5 } });
    expect(reception).toMatchObject({ volume: 6, A: 6, positiveRate: { value: 1 } });
    expect(sideout?.rate).toEqual({ value: 1, numerator: 6, denominator: 6 });
    expect(breakpoint?.rate).toEqual({ value: 0.5, numerator: 3, denominator: 6 });
    expect(report.rotations.filter((row) => row.teamId === 'team_a')).toHaveLength(6);
    expect(
      report.rotations.filter((row) => row.teamId === 'team_a').map((row) => row.rotation),
    ).toEqual([1, 2, 3, 4, 5, 6]);
    expect(report.tactical.attackDirections).toHaveLength(6);
    expect(report.tactical.attackDirections.every((row) => row.setNumber === 1)).toBe(true);
    expect(report.tactical.attackBySetterPosition).toHaveLength(6);
    expect(report.tactical.directionsBySetterPosition).toHaveLength(6);
    expect(report.tactical.directionsBySetterPosition[3]).toMatchObject({
      setterPosition: 4,
      direction: 'diagonal',
      share: { value: 1, numerator: 1, denominator: 1 },
    });
    expect(report.setterDistribution.every((row) => row.share.denominator === 1)).toBe(true);
    const expectedSideout = report.advanced.expectedSideout.find(
      (row) => row.teamId === 'team_a' && !row.playerId,
    )?.rate;
    expect(expectedSideout).toMatchObject({
      numerator: 4.8,
      denominator: 6,
      available: true,
    });
    expect(expectedSideout?.value).toBeCloseTo(0.8);
    expect(
      report.advanced.expectedBreakpoint.find((row) => row.teamId === 'team_a' && !row.playerId)
        ?.rate,
    ).toMatchObject({ value: 0.625, numerator: 3.75, denominator: 6, available: true });
    expect(
      report.advanced.attackEvenness.find(
        (row) => row.teamId === 'team_a' && !row.rotation && !row.setterPosition && !row.phase,
      ),
    ).toMatchObject({
      evenness: { value: 0.5, denominator: 6, available: true },
      distribution: [
        { playerId: 'attacker_a', volume: 6, observedShare: 1, expectedShare: 0.5 },
        { playerId: 'setter_a', volume: 0, observedShare: 0, expectedShare: 0.5 },
      ],
    });
    expect(
      report.advanced.setterRepetition.find(
        (row) => row.attackerPlayerId === 'attacker_a' && row.category === 'overall',
      ),
    ).toMatchObject({ opportunities: 5, repeats: 5, repeatRate: { value: 1 } });
    expect(report.advanced.setterAttackConversion).toHaveLength(6);
    expect(report.advanced.setterAttackConversion[0]).toMatchObject({
      setterPlayerId: 'setter_a',
      volume: 1,
      points: 1,
      killRate: { value: 1 },
      attackEfficiency: { value: 1 },
    });
  });

  it('drills down by athlete, current setter position and every tactical dimension', () => {
    const input = completeRotationInput();
    const selected = service.queryAttacks(input, {
      teamId: 'team_a',
      playerId: 'attacker_a',
      setterPlayerId: 'setter_a',
      setterPosition: 4,
      originZone: '4',
      targetZone: '4',
      direction: 'diagonal',
      attackType: 'potência',
      attackCombination: 'X1',
      phase: 'sideout',
      receptionGrade: 'A',
      blockersCount: 2,
    });

    expect(selected.map((event) => event.id)).toEqual(['attack_4']);
  });
});

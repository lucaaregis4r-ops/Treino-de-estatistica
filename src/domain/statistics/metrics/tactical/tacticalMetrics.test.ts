import { describe, expect, it } from 'vitest';
import type { TacticalRallyProjection } from '../../../rally/context/TacticalRallyProjection';
import type { ScoutEvent, ScoutEventMetadata } from '../../../scout/events/ScoutEvent';
import { StatisticsEngine } from '../../StatisticsEngine';
import { createDefaultMetricRegistry } from '../../registry/createDefaultMetricRegistry';
import { TACTICAL_METRIC_IDS } from './tacticalMetrics';

const score = { teamA: 0, teamB: 0 };

function metadata(tactical: NonNullable<ScoutEventMetadata['tactical']>): ScoutEventMetadata {
  return { schemaVersion: '2.0.0', tactical };
}

function scout(
  id: string,
  rallyId: string,
  sequence: number,
  teamId: string,
  skill: ScoutEvent['skill'],
  tactical: NonNullable<ScoutEventMetadata['tactical']>,
  outcome?: string,
): ScoutEvent {
  return {
    id,
    matchId: 'match-1',
    rallyId,
    sequence,
    teamId,
    skill,
    ...(outcome ? { outcome } : {}),
    setNumber: 1,
    scoreBefore: score,
    timestamp: sequence,
    rawCode: id,
    codeProfileId: 'test',
    codeProfileVersion: '1.0.0',
    complexityProfileId: 'tactical',
    metadata: metadata(tactical),
  };
}

const events: readonly ScoutEvent[] = [
  scout('s1', 'r1', 1, 'A', 'serve', {
    serve: {
      serveType: 'jump',
      trajectory: {
        origin: { zoneId: '1' },
        target: { zoneId: '5' },
        direction: 'diagonal',
      },
    },
  }),
  scout('r1', 'r1', 2, 'B', 'reception', {
    reception: { contactLocation: { zoneId: '5' }, grade: 'A' },
  }),
  scout('l1', 'r1', 3, 'B', 'set', {
    set: {
      targetPlayerId: 'p4',
      targetLocation: { zoneId: '4' },
      setterCall: 'X',
    },
  }),
  scout(
    'a1',
    'r1',
    4,
    'B',
    'attack',
    {
      attack: {
        attackType: 'power',
        trajectory: {
          origin: { zoneId: '4' },
          target: { zoneId: '1' },
          direction: 'parallel',
        },
        combination: '31',
        blockersCount: 2,
      },
    },
    'point',
  ),
  scout('s2', 'r2', 5, 'A', 'serve', {
    serve: {
      serveType: 'float',
      trajectory: {
        origin: { zoneId: '1' },
        target: { zoneId: '6' },
        direction: 'line',
      },
    },
  }),
  scout('r2', 'r2', 6, 'B', 'reception', {
    reception: { contactLocation: { zoneId: '6' }, grade: 'C' },
  }),
  scout('l2', 'r2', 7, 'B', 'set', {
    set: {
      targetPlayerId: 'p2',
      targetLocation: { zoneId: '2' },
      setterCall: 'Y',
    },
  }),
  scout(
    'a2',
    'r2',
    8,
    'B',
    'attack',
    {
      attack: {
        attackType: 'tip',
        trajectory: {
          origin: { zoneId: '2' },
          target: { zoneId: '5' },
          direction: 'diagonal',
        },
        combination: 'X',
        blockersCount: 1,
      },
    },
    'error',
  ),
  scout('s3', 'r3', 9, 'A', 'serve', {
    serve: {
      trajectory: {
        origin: { zoneId: '1' },
        target: { zoneId: '5' },
        direction: 'diagonal',
      },
    },
  }),
  scout('r3', 'r3', 10, 'B', 'reception', {
    reception: { contactLocation: { zoneId: '5' }, grade: 'B' },
  }),
  scout('l3', 'r3', 11, 'B', 'set', {
    set: {
      targetPlayerId: 'p4',
      targetLocation: { zoneId: '4' },
      setterCall: 'X',
    },
  }),
  scout(
    'a3',
    'r3',
    12,
    'B',
    'attack',
    {
      attack: {
        attackType: 'power',
        trajectory: {
          origin: { zoneId: '4' },
          target: { zoneId: '1' },
          direction: 'parallel',
        },
        combination: '31',
        blockersCount: 2,
      },
    },
    'point',
  ),
];

const contacts: TacticalRallyProjection['contacts'] = events.map((event) => ({
  sourceEventId: event.id,
  historyEventId: `h-${event.id}`,
  rallyId: event.rallyId,
  teamId: event.teamId,
  skill: event.skill,
  phase: event.rallyId === 'r3' ? 'transition' : 'sideout',
  servingTeamId: 'A',
  rotation: event.rallyId === 'r2' ? 2 : 1,
}));

const tacticalRally: TacticalRallyProjection = {
  contacts,
  rallies: [
    { rallyId: 'r1', servingTeamId: 'A', winnerTeamId: 'B', transitionTeamIds: [] },
    { rallyId: 'r2', servingTeamId: 'A', winnerTeamId: 'A', transitionTeamIds: [] },
    { rallyId: 'r3', servingTeamId: 'A', winnerTeamId: 'B', transitionTeamIds: ['B'] },
  ],
  rotationByTeamId: { A: 1, B: 1 },
};

function calculate(metricId: string) {
  return new StatisticsEngine(createDefaultMetricRegistry()).calculate([metricId], {
    events,
    tacticalRally,
  })[0];
}

describe('tactical metrics', () => {
  it('registers and calculates all 24 tactical metrics with auditable data', () => {
    const results = new StatisticsEngine(createDefaultMetricRegistry()).calculate(
      TACTICAL_METRIC_IDS,
      { events, tacticalRally },
    );

    expect(results).toHaveLength(24);
    expect(results.every((metric) => metric.available)).toBe(true);
    expect(
      results.every(
        (metric) =>
          metric.numerator !== undefined &&
          metric.denominator !== undefined &&
          metric.components !== undefined &&
          metric.breakdown !== undefined,
      ),
    ).toBe(true);
  });

  it('calculates distributions, reception pressure and grouped quality exactly', () => {
    expect(calculate('tactical.serve.origin_distribution').breakdown).toEqual([
      expect.objectContaining({ key: '1', numerator: 3, denominator: 3, value: 1 }),
    ]);
    expect(calculate('tactical.serve.impact_reception')).toMatchObject({
      numerator: 1,
      denominator: 3,
      components: { A: 1, B: 1, C: 1, errors: 0, linkedReceptions: 3 },
    });
    expect(calculate('tactical.reception.quality_by_zone').breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: '5', numerator: 2, denominator: 2, value: 1 }),
        expect.objectContaining({ key: '6', numerator: 0, denominator: 1, value: 0 }),
      ]),
    );
  });

  it('calculates attack efficiency and setter distributions from linked context', () => {
    expect(calculate('tactical.attack.efficiency_by_direction').breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'parallel', numerator: 2, denominator: 2, value: 1 }),
        expect.objectContaining({ key: 'diagonal', numerator: -1, denominator: 1, value: -1 }),
      ]),
    );
    expect(calculate('tactical.setter.by_attacker').breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'p4', numerator: 2, denominator: 3 }),
        expect.objectContaining({ key: 'p2', numerator: 1, denominator: 3 }),
      ]),
    );
    expect(calculate('tactical.setter.by_reception_quality').breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'A', numerator: 1 }),
        expect.objectContaining({ key: 'B', numerator: 1 }),
        expect.objectContaining({ key: 'C', numerator: 1 }),
      ]),
    );
  });

  it('calculates sideout, breakpoint and transition from rally summaries', () => {
    expect(calculate('tactical.rally.sideout')).toMatchObject({ numerator: 2, denominator: 3 });
    expect(calculate('tactical.rally.breakpoint')).toMatchObject({ numerator: 1, denominator: 3 });
    expect(calculate('tactical.rally.transition')).toMatchObject({ numerator: 1, denominator: 1 });
  });
});

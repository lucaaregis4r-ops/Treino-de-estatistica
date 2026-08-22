import { describe, expect, it } from 'vitest';
import type { Skill } from '../scout/entities/Skill';
import type { ReceptionGrade, ScoutEvent } from '../scout/events/ScoutEvent';
import { StatisticsEngine } from './StatisticsEngine';
import { CBV_METRIC_IDS } from './metrics/volleyball/volleyballMetrics';
import { createDefaultMetricRegistry } from './registry/createDefaultMetricRegistry';

let sequence = 0;

function event(
  skill: Skill,
  outcome: string,
  options: {
    rallyId?: string;
    grade?: ReceptionGrade;
    playerId?: string;
    setNumber?: number;
    teamId?: string;
  } = {},
): ScoutEvent {
  sequence += 1;
  return {
    id: `event_${sequence}`,
    matchId: 'match_1',
    rallyId: options.rallyId ?? `rally_${sequence}`,
    sequence,
    teamId: options.teamId ?? 'team_a',
    playerId: options.playerId ?? 'player_1',
    skill,
    outcome,
    evaluation: outcome,
    setNumber: options.setNumber ?? 1,
    scoreBefore: { teamA: 0, teamB: 0 },
    timestamp: sequence,
    rawCode: '',
    codeProfileId: 'test',
    codeProfileVersion: '1.0.0',
    complexityProfileId: 'tactical',
    ...(options.grade ? { metadata: { receptionGrade: options.grade } } : {}),
  };
}

function value(results: readonly { metricId: string; value: number | null }[], id: string) {
  return results.find((result) => result.metricId === id)?.value;
}

describe('StatisticsEngine volleyball metrics', () => {
  const engine = new StatisticsEngine(createDefaultMetricRegistry());

  it('calculates attack success and CBV efficiency from artificial data', () => {
    sequence = 0;
    const events = [
      ...Array.from({ length: 5 }, () => event('attack', 'point')),
      ...Array.from({ length: 2 }, () => event('attack', 'error')),
      event('attack', 'blocked'),
      ...Array.from({ length: 2 }, () => event('attack', 'continuation')),
    ];
    const results = engine.calculate(['cbv.2025_26.attack', 'cbv.2025_26.attack_efficiency'], {
      events,
    });

    expect(value(results, 'cbv.2025_26.attack')).toBe(0.5);
    expect(value(results, 'cbv.2025_26.attack_efficiency')).toBe(0.2);
  });

  it('relates each serve to the next reception in the same rally', () => {
    sequence = 0;
    const events: ScoutEvent[] = [];
    for (let index = 0; index < 10; index += 1) {
      const rallyId = `rally_${index}`;
      const outcome = index < 2 ? 'ace' : index === 9 ? 'error' : 'continuation';
      events.push(event('serve', outcome, { rallyId }));
      if (index >= 2 && index < 5) {
        events.push(event('reception', 'negative', { rallyId, grade: 'C', teamId: 'team_b' }));
      }
    }
    const results = engine.calculate(['cbv.2025_26.serve', 'cbv.2025_26.serve_efficiency'], {
      events,
      scope: { teamId: 'team_a' },
    });

    expect(value(results, 'cbv.2025_26.serve')).toBe(2);
    expect(value(results, 'cbv.2025_26.serve_efficiency')).toBe(0.5);
  });

  it('calculates CBV pass efficiency using reception grades A and B', () => {
    sequence = 0;
    const events = [
      ...Array.from({ length: 8 }, () => event('reception', 'perfect', { grade: 'A' })),
      ...Array.from({ length: 6 }, () => event('reception', 'positive', { grade: 'B' })),
      ...Array.from({ length: 4 }, () => event('reception', 'negative', { grade: 'C' })),
      ...Array.from({ length: 2 }, () => event('reception', 'error', { grade: 'ERROR' })),
    ];
    const results = engine.calculate(['cbv.2025_26.pass_efficiency'], { events });

    expect(value(results, 'cbv.2025_26.pass_efficiency')).toBe(0.7);
  });

  it('calculates block points per explicitly reported sets played', () => {
    sequence = 0;
    const events = Array.from({ length: 12 }, () => event('block', 'point'));
    const playerSetParticipations = Array.from({ length: 8 }, (_, index) => ({
      playerId: 'player_1',
      setNumber: index + 1,
    }));
    const results = engine.calculate(['cbv.2025_26.block_efficiency'], {
      events,
      scope: { playerId: 'player_1' },
      playerSetParticipations,
    });

    expect(value(results, 'cbv.2025_26.block_efficiency')).toBe(1.5);
  });

  it('returns unavailable metrics instead of dividing by zero', () => {
    const results = engine.calculate(CBV_METRIC_IDS, { events: [] });
    const attack = results.find((result) => result.metricId === 'cbv.2025_26.attack');

    expect(attack).toMatchObject({ available: false, value: null, denominator: 0 });
  });
});

import { describe, expect, it } from 'vitest';
import type { ObservedSequence, ObservedSport } from './ObservedSequence';
import { analyzeSequenceContextModel } from './SequenceContextModel';

function unit(matchIndex: number, index: number, actions: readonly string[], outcome: string, sport: ObservedSport = 'football'): ObservedSequence {
  const unitId = `${sport}:match-${matchIndex}:unit-${index}`;
  return {
    unitId, sport, matchId: `match-${matchIndex}`, context: { kind: sport === 'volleyball' ? 'set' : 'period', number: 1 },
    ...(sport === 'volleyball' ? {} : { teamId: 'team-a' }), participantTeamIds: ['team-a', 'team-b'],
    steps: actions.map((value, order) => { const [kind, side] = value.split('@'); return { sourceId: `${unitId}:step-${order}`, order, kind, role: 'action' as const, teamId: side === 'opponent' ? 'team-b' : 'team-a' }; }),
    start: { sourceId: `${unitId}:start`, reason: 'observed_start' },
    end: { sourceId: `${unitId}:terminal`, reason: outcome }, outcome,
    coverage: 'complete', censorReasons: [], eligibleForOutcome: true,
  };
}

function patternedCorpus(matchCount: number, perContextPerMatch: number, long = false): ObservedSequence[] {
  const units: ObservedSequence[] = [];
  for (let match = 0; match < matchCount; match++) {
    for (let index = 0; index < perContextPerMatch; index++) {
      const prefix = long ? [...Array.from({ length: 18 }, () => 'control'), 'pass', 'shot'] : ['pass', 'shot'];
      units.push(unit(match, index, prefix, index < Math.floor(perContextPerMatch * .7) ? 'goal' : 'turnover'));
    }
    for (let index = 0; index < perContextPerMatch; index++) {
      const prefix = long ? [...Array.from({ length: 18 }, () => 'control'), 'carry', 'shot'] : ['carry', 'shot'];
      units.push(unit(match, perContextPerMatch + index, prefix, index < Math.floor(perContextPerMatch * .3) ? 'goal' : 'turnover'));
    }
  }
  return units;
}

describe('variable-context outcome model', () => {
  it('uses the full 20-action context when histories ending in the same action have different outcomes', () => {
    const result = analyzeSequenceContextModel(patternedCorpus(6, 100, true));

    expect(result.status).toBe('available');
    expect(result.contextLengthUsage?.['20']).toBe(1200);
    expect(result.metrics?.variableContext.brier).toBeLessThan(result.metrics!.globalBaseline.brier);
    expect(result.metrics?.variableContext.logLoss).toBeLessThan(result.metrics!.firstOrder.logLoss);
    expect(result.predictions?.every(prediction => prediction.trainingMatchCount === result.matchCount - 1)).toBe(true);

    const contexts = result.states?.filter(state => state.contextLength === 20 && state.context.at(-1) === 'shot:own');
    expect(contexts).toHaveLength(2);
    expect(contexts?.map(state => state.context.at(-2))).toEqual(['pass:own', 'carry:own']);
    expect(contexts?.[0].probabilities.goal.probability).toBeGreaterThan(contexts?.[1].probabilities.goal.probability ?? 1);
    expect(contexts?.every(state => state.support >= 20 && state.matchSupport >= 3)).toBe(true);
  });

  it('declines the model when there are too few matches or eligible units', () => {
    expect(analyzeSequenceContextModel(patternedCorpus(4, 30)).reason).toBe('too_few_matches');
    expect(analyzeSequenceContextModel(patternedCorpus(5, 9)).reason).toBe('too_few_units');
  });

  it('does not use a final volleyball fault as a predictor of the point result', () => {
    const units = Array.from({ length: 120 }, (_, index) => {
      const match = Math.floor(index / 20);
      const wins = index % 2 === 0;
      const first = unit(match, index, ['serve', 'fault@opponent'], `point:${wins ? 'team-a' : 'team-b'}`, 'volleyball');
      return { ...first, outcome: `point:${wins ? 'team-a' : 'team-b'}` };
    });
    const result = analyzeSequenceContextModel(units);

    expect(result.status).toBe('unavailable');
    expect(result.reason).toBe('not_better_than_baselines');
    expect(result.contextLengthUsage).toEqual({ '1': 120 });
  });
});

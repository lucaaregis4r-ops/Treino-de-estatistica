import { describe, expect, it } from 'vitest';
import type { MatchState } from '../../domain/match/state/MatchState';
import { buildWinProbability } from './WinProbabilityService';

describe('WinProbabilityService', () => {
  it('returns a bounded neutral estimate when there are no effective events', () => {
    const report = buildWinProbability(
      [],
      { score: { teamA: 0, teamB: 0 }, sets: [] } as unknown as MatchState,
      ['team_a', 'team_b'],
    );

    expect(report.teamA).toBe(0.5);
    expect(report.teamB).toBe(0.5);
    expect(report.points).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { buildFutsalAnalytics } from './FutsalAnalytics';
import { projectFutsalScout, type FutsalFact, type FutsalFactRegisteredEvent } from './FutsalScout';

const base = { period: 1 as const, observation: 'observed' as const };
function event(id: string, sequence: number, fact: FutsalFact): FutsalFactRegisteredEvent { return { type: 'futsal_fact_registered', id: `e-${id}`, matchId: 'm', sequence, timestamp: sequence, fact }; }

describe('futsal descriptive analytics and exports', () => {
  it('uses a tackle as the boundary between observed control episodes', () => {
    const projection = projectFutsalScout([
      event('a', 1, { ...base, id: 'a', elapsedMs: 1000, kind: 'control', state: 'team', controlledTeamId: 'a', coverage: 'continuous' }),
      event('t', 2, { ...base, id: 't', elapsedMs: 3000, kind: 'tackle', winningTeamId: 'b', losingTeamId: 'a', position: { x: .5, y: .5 } }),
      event('s', 3, { ...base, id: 's', elapsedMs: 4000, kind: 'shot', shootingTeamId: 'b', outcome: 'saved' }),
      event('end', 4, { ...base, id: 'end', elapsedMs: 5000, kind: 'control', state: 'dead_ball', coverage: 'continuous' }),
    ]);
    const report = buildFutsalAnalytics(projection, ['a', 'b']);
    expect(report.controlTime).toContainEqual({ period: 1, state: 'team', teamId: 'a', observedMs: 2000 });
    expect(report.controlTime).toContainEqual({ period: 1, state: 'team', teamId: 'b', observedMs: 2000 });
    expect(report.teams.find(team => team.teamId === 'b')).toMatchObject({ classifiedPossessions: 1, shotsInClassifiedPossessions: 1 });
  });
  it('counts only closed continuous control episodes and keeps unknown shot origins out of the map', () => {
    const facts = [
      event('c1', 1, { ...base, id: 'c1', elapsedMs: 1000, kind: 'control', state: 'team', controlledTeamId: 'a', coverage: 'continuous' }),
      event('s1', 2, { ...base, id: 's1', elapsedMs: 2000, kind: 'shot', shootingTeamId: 'a', outcome: 'saved', position: { x: .2, y: .5 } }),
      event('s2', 3, { ...base, id: 's2', elapsedMs: 3000, kind: 'shot', shootingTeamId: 'a', outcome: 'goal', beneficiaryTeamId: 'b' }),
      event('c2', 4, { ...base, id: 'c2', elapsedMs: 4000, kind: 'control', state: 'contested', coverage: 'continuous' }),
      event('c3', 5, { ...base, id: 'c3', elapsedMs: 5000, kind: 'control', state: 'team', controlledTeamId: 'a', coverage: 'continuous' }),
      event('s3', 6, { ...base, id: 's3', elapsedMs: 6000, kind: 'shot', shootingTeamId: 'a', outcome: 'off_target' }),
    ];
    const report = buildFutsalAnalytics(projectFutsalScout(facts), ['a', 'b']);
    expect(report.teams[0]).toMatchObject({ shots: 3, goalsAgainst: 1, shotsWithPosition: 1, shotsWithoutPosition: 2, classifiedPossessions: 1, classifiedPossessionsWithShot: 1, shotsInClassifiedPossessions: 2, shotsPerClassifiedPossession: 2 });
    expect(report.teams[1]).toMatchObject({ score: 1, goalsFor: 1 });
    expect(report.shotPoints.map(point => point.factId)).toEqual(['s1']);
    expect(report.periodShots).toContainEqual({ period: 1, teamId: 'a', shots: 3 });
    expect(report.controlTime).toContainEqual({ period: 1, state: 'team', teamId: 'a', observedMs: 2000 });
    expect(report.controlTime).toContainEqual({ period: 1, state: 'dead_ball', observedMs: 1000 });
  });

  it('reports tactical coverage against all eligible shots', () => {
    const shot1: FutsalFact = { ...base, id: 's1', period: 1, elapsedMs: 1200, kind: 'shot', shootingTeamId: 'a', outcome: 'goal', beneficiaryTeamId: 'a' };
    const shot2: FutsalFact = { ...base, id: 's2', period: 1, elapsedMs: 1800, kind: 'shot', shootingTeamId: 'a', outcome: 'saved' };
    const tag: FutsalFact = { ...base, id: 't1', period: 1, elapsedMs: 1900, kind: 'tactical_annotation', scope: 'event', targetFactId: 's2', organization: 'transition' };
    const projection = projectFutsalScout([event('s1', 1, shot1), event('s2', 2, shot2), event('t1', 3, tag)]);
    const report = buildFutsalAnalytics(projection, ['a', 'b']);
    expect(report.contextCoverage).toContainEqual({ dimension: 'organization', category: 'transition', shots: 1, goals: 0, eligibleShots: 2, coverage: .5 });
  });

  it('closes a classified possession at a confirmed goal', () => {
    const projection = projectFutsalScout([
      event('control', 1, { ...base, id: 'control', elapsedMs: 1000, kind: 'control', state: 'team', controlledTeamId: 'a', coverage: 'continuous' }),
      event('goal', 2, { ...base, id: 'goal', elapsedMs: 3000, kind: 'shot', shootingTeamId: 'a', outcome: 'goal', beneficiaryTeamId: 'a' }),
      event('restart', 3, { ...base, id: 'restart', elapsedMs: 4000, kind: 'control', state: 'team', controlledTeamId: 'b', coverage: 'continuous' }),
    ]);
    const report = buildFutsalAnalytics(projection, ['a', 'b']);
    expect(report.teams.find(team => team.teamId === 'a')?.classifiedPossessions).toBe(1);
    expect(report.controlTime).toContainEqual({ period: 1, state: 'team', teamId: 'a', observedMs: 2000 });
  });
});

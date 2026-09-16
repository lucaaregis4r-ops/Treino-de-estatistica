import { describe, expect, it } from 'vitest';
import { defaultTacticalInput } from '../../../profiles/code/default-compact/defaultTacticalInput';
import type { ScoutEvent } from '../../scout/events/ScoutEvent';
import { buildRallySequences } from '../sequence/RallySequenceBuilder';
import { MarkovAnalyzer } from './MarkovAnalyzer';
import { SequencePatternAnalyzer } from './SequencePatternAnalyzer';
import { SpatialMarkovAnalyzer } from './SpatialMarkovAnalyzer';

function event(
  id: string,
  rallyId: string,
  sequence: number,
  skill: ScoutEvent['skill'],
  metadata?: ScoutEvent['metadata'],
): ScoutEvent {
  return {
    id,
    matchId: 'match',
    rallyId,
    sequence,
    teamId: 'team_a',
    skill,
    outcome: 'continuation',
    setNumber: 1,
    scoreBefore: { teamA: 0, teamB: 0 },
    timestamp: sequence,
    rawCode: id,
    codeProfileId: 'default_compact_v1',
    codeProfileVersion: '1.0.0',
    complexityProfileId: 'tactical',
    ...(metadata ? { metadata } : {}),
  };
}

function sequencesFor(events: readonly ScoutEvent[], winners: readonly string[]) {
  return buildRallySequences(events, {
    zoneSystem: defaultTacticalInput.zoneSystem,
    winnerByRallyId: new Map(winners.map((winner, index) => [`r${index + 1}`, winner])),
  });
}

describe('M2 Markov and spatial value', () => {
  it('builds a manually verifiable matrix, terminal probabilities and 2/3-state patterns', () => {
    const events = Array.from({ length: 4 }, (_, index) => [
      event(`r${index + 1}-reception`, `r${index + 1}`, 1, 'reception'),
      event(`r${index + 1}-attack`, `r${index + 1}`, 2, 'attack'),
    ]).flat();
    const sequences = sequencesFor(events, ['team_a', 'team_a', 'team_a', 'team_b']);
    const analysis = new MarkovAnalyzer().analyze(sequences, 'team_a');
    const receptionAttack = analysis.transitions.find((item) => item.id === 'reception->attack');
    const attackWin = analysis.transitions.find((item) => item.id === 'attack->terminal_win');

    expect(receptionAttack).toMatchObject({ count: 4, probability: 1, sampleSize: 4 });
    expect(attackWin).toMatchObject({ count: 3, probability: 0.75 });
    expect(analysis.stateValues.find((item) => item.stateId === 'attack')).toMatchObject({
      n: 4,
      wins: 3,
      losses: 1,
      pointProbability: 0.75,
      available: false,
      warning: 'small_sample',
    });
    expect(new SequencePatternAnalyzer().analyze(sequences, 'team_a', 2)).toContainEqual(
      expect.objectContaining({ pattern: ['reception', 'attack'], occurrences: 4, wins: 3, losses: 1 }),
    );
    expect(new SequencePatternAnalyzer().analyze(sequences, 'team_a', 3)).toHaveLength(0);
  });

  it('calculates reception destination value against 10/20 baseline and keeps small samples out of ranking', () => {
    const events = Array.from({ length: 20 }, (_, index) => {
      const rallyId = `r${index + 1}`;
      const inRegionThree = index < 8;
      return event(`reception-${index + 1}`, rallyId, 1, 'reception', {
        spatial: {
          origin: { surface: 'court', x: 0.2, y: 0.75 },
          destination: {
            surface: 'court',
            x: inRegionThree ? 0.5 : 0.16,
            y: inRegionThree ? 0.25 : 0.75,
          },
        },
      });
    });
    const winners = Array.from({ length: 20 }, (_, index) =>
      index < 6 || (index >= 8 && index < 12) ? 'team_a' : 'team_b',
    );
    const sequences = sequencesFor(events, winners);
    const findings = new SpatialMarkovAnalyzer().analyze(sequences, 'team_a', 'reception').regions;
    const regionThree = findings.find((finding) => finding.regionId === '3');

    expect(regionThree).toMatchObject({
      sampleUnit: 'event',
      n: 8,
      wins: 6,
      losses: 2,
      empiricalPointProbability: 0.75,
      baselinePointProbability: 0.5,
      deltaVsBaseline: 0.25,
      available: true,
    });
    expect(findings.every((finding) => finding.deltaVsBaseline !== null)).toBe(true);
  });

  it('reports attack origin, destination and trajectory, while keeping absent coordinates unavailable', () => {
    const events = [
      event('a1', 'r1', 1, 'attack', {
        spatial: {
          origin: { surface: 'court', x: 1 / 6, y: 1 / 4 },
          destination: { surface: 'court', x: 5 / 6, y: 3 / 4 },
        },
      }),
      event('a2', 'r2', 1, 'attack', {
        spatial: {
          origin: { surface: 'court', x: 1 / 6, y: 1 / 4 },
          destination: { surface: 'court', x: 1 / 6, y: 3 / 4 },
        },
      }),
      event('a3', 'r3', 1, 'attack'),
    ];
    const sequences = sequencesFor(events, ['team_a', 'team_b', 'team_a']);
    const estimator = new SpatialMarkovAnalyzer();
    const findings = estimator.analyze(sequences, 'team_a', 'attack').regions;
    const trajectory = findings.find((finding) => finding.spatialRole === 'trajectory');
    const cells = estimator.analyze(sequences, 'team_a', 'attack', 'target', 2).cells;

    expect(findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ spatialRole: 'origin', regionId: '4', n: 2 }),
      expect.objectContaining({ spatialRole: 'target', regionId: '1', n: 1 }),
      expect.objectContaining({ spatialRole: 'target', regionId: '5', n: 1 }),
    ]));
    expect(trajectory).toMatchObject({
      spatialRole: 'trajectory',
      originRegionId: '4',
      targetRegionId: '1',
      sampleUnit: 'event',
      n: 1,
      empiricalPointProbability: 1,
      available: false,
    });
    expect(cells).toHaveLength(2);
    expect(findings.find((finding) => finding.regionId === '1')?.deltaVsBaseline).toBeCloseTo(1 / 3);
  });
});

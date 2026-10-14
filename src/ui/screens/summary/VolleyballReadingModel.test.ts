import { describe, expect, it } from 'vitest';
import type { ScoutEvent } from '../../../domain/scout/events/ScoutEvent';
import { buildVolleyballReading } from './VolleyballReadingModel';

function event(id: string, setNumber: number, skill: ScoutEvent['skill'], outcome: string): ScoutEvent {
  return {
    id, matchId: 'match', rallyId: `rally-${id}`, sequence: Number(id.split('-').at(-1)),
    teamId: 'home', playerId: 'athlete', skill, outcome, setNumber,
    scoreBefore: { teamA: 0, teamB: 0 }, timestamp: 0, rawCode: id,
    codeProfileId: 'code', codeProfileVersion: '1', complexityProfileId: 'basic',
  };
}

function source() {
  const actions = [
    event('attack-1', 1, 'attack', 'point'),
    event('attack-2', 1, 'attack', 'error'),
    event('serve-3', 2, 'serve', 'ace'),
  ];
  return {
    teams: [{ id: 'home', name: 'Olympico' }, { id: 'away', name: 'Adversário' }],
    players: [{ id: 'athlete', teamId: 'home', number: 8, name: 'Ana' }],
    timeline: actions.map((action) => ({ event: action, sourceEventId: action.id })),
    report: {
      sideout: [{ teamId: 'home', setNumber: 1, rate: { numerator: 1, denominator: 2, value: .5 } }],
      breakpoint: [], rotations: [],
    },
    tacticalRally: {
      contacts: [{ sourceEventId: 'attack-1', rotation: 2 }, { sourceEventId: 'attack-2', rotation: 2 }],
      rallies: [],
    },
    state: { sets: [{ setNumber: 1 }, { setNumber: 2 }] },
  } as unknown as Parameters<typeof buildVolleyballReading>[0];
}

describe('buildVolleyballReading', () => {
  it('uses observed actions for each set and keeps the unobserved team empty', () => {
    const firstSet = buildVolleyballReading(source(), 1);
    const home = firstSet.teams[0];
    expect(home.attack).toMatchObject({ attempts: 2, points: 1, errors: 1 });
    expect(home.serve.attempts).toBe(0);
    expect(home.sideout).toEqual({ numerator: 1, denominator: 2, value: .5 });
    expect(home.athletes[0]).toMatchObject({ pointContributions: 1, improvementCount: 1 });
    expect(home.rotations[1].attacks).toBe(2);
    expect(firstSet.teams[1].actions).toBe(0);
    expect(firstSet.teams[1].reception.positiveRate.value).toBeNull();
    const secondSet = buildVolleyballReading(source(), 2);
    expect(secondSet.teams[0].attack.attempts).toBe(0);
    expect(secondSet.teams[0].serve.aces).toBe(1);
    expect(secondSet.teams[0].sideout.value).toBeNull();
  });

  it('keeps the rotation of a corrected scout action', () => {
    const original = source();
    const corrected = {
      ...original,
      timeline: original.timeline.map((entry, index) => index === 0
        ? { ...entry, event: { ...entry.event, id: 'corrected-1' } }
        : entry),
    };
    expect(buildVolleyballReading(corrected, 1).teams[0].rotations[1].attacks).toBe(2);
  });
});

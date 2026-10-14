import { describe, expect, it } from 'vitest';
import { spatialContextForEvent } from './SpatialContext';
import { defaultTacticalInput } from '../../../profiles/code/default-compact/defaultTacticalInput';
import type { ScoutEvent } from '../../scout/events/ScoutEvent';

const event: ScoutEvent = {
  id: 'action', matchId: 'match', rallyId: 'rally', sequence: 1, teamId: 'home',
  skill: 'attack', setNumber: 1, scoreBefore: { teamA: 0, teamB: 0 }, timestamp: 0,
  rawCode: '', codeProfileId: 'test', codeProfileVersion: '1', complexityProfileId: 'basic',
};

describe('spatial region orientation', () => {
  it('matches the six displayed zones on both sides without changing coordinates', () => {
    const left = [[5, 4], [6, 3], [1, 2]];
    const right = [[2, 1], [3, 6], [4, 5]];
    for (let row = 0; row < 3; row++) for (let column = 0; column < 4; column++) {
      const origin = { surface: 'court' as const, x: (column + .5) / 4, y: (row + .5) / 3 };
      const context = spatialContextForEvent({ ...event, metadata: { spatial: { origin, destination: origin } } }, defaultTacticalInput.zoneSystem);
      expect(context.origin).toEqual(origin);
      expect(context.originRegionId).toBe(String((column < 2 ? left : right)[row][column % 2]));
    }
  });
  it('does not assign a court zone to an out-of-court action', () => {
    const context = spatialContextForEvent({ ...event, metadata: { spatial: { origin: { surface: 'outZone', x: .1, y: .1 }, destination: { surface: 'outZone', x: .9, y: .9 } } } }, defaultTacticalInput.zoneSystem);
    expect(context.originRegionId).toBeUndefined();
  });
});

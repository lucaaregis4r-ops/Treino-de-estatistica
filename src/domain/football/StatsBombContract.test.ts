import { describe, expect, it } from 'vitest';
import { createFootballPass, deriveSpatialDistance, deriveSpatialZone, normalizedToStatsBomb, observedPlayPattern, observedShotEnd, orientStatsBombLocation, statsBombToNormalized } from './StatsBombContract';
import { lateralStartsNewPossession } from './FootballPossessionService';

const a = { id: 1, name: 'A' };
const b = { id: 2, name: 'B' };
const context = { matchId: 'm', nextIndex: 4, period: 1 as const, timestamp: '00:01:00.000', minute: 1, second: 0, possession: 3, possessionTeam: a, captureSequence: 4 };

describe('StatsBomb football F2 contract', () => {
  it('round trips and mirrors coordinates', () => {
    expect(statsBombToNormalized(normalizedToStatsBomb(.25, .75))).toEqual([.25, .75]);
    expect(orientStatsBombLocation([20, 10], 'x0')).toEqual([100, 70]);
  });
  it('keeps observed same-team touch without inventing success', () => {
    const result = createFootballPass({ ...context }, { id: 'p', team: a, observation: { result: 'touched_without_control', controller: 'same_team', controllerTeam: a, receiptObserved: true, receiptLocation: [60, 40], lossObserved: true } });
    expect(result.events.map((event) => event.type.id)).toEqual([30, 42, 38]);
    expect(result.events[1].ball_receipt?.outcome?.id).toBe(9);
    expect(result.events[0].pass?.outcome).toBeUndefined();
  });
  it('does not create receipt when the pass was intercepted before the teammate', () => {
    const result = createFootballPass(context, { id: 'p2', team: a, observation: { result: 'intercepted', controller: 'opponent', controllerTeam: b } });
    expect(result.events).toHaveLength(1);
    expect(result.nextPossession).toBe(4);
  });
  it('starts a new possession for a same-team lateral', () => {
    const next = lateralStartsNewPossession({ next: 3, team: a, pending: false, sequence: 4 }, a, 5);
    expect(next).toMatchObject({ next: 4, team: a, pending: false });
  });
  it('qualifies only an observed restart and keeps structure local', () => {
    expect(observedPlayPattern('corner')).toEqual({ id: 2, name: 'From Corner' });
    expect(observedPlayPattern('recovery')).toBeUndefined();
  });
  it('derives zones and spatial distance without calling it meters', () => {
    expect(deriveSpatialZone([80, 20])).toEqual({ third: 'attacking', corridor: 'left' });
    expect(deriveSpatialDistance([0, 0], [3, 4])).toBe(5);
  });
  it('preserves lateral target without fabricating height', () => {
    expect(observedShotEnd({ y: 40 })).toEqual([120, 40]);
    expect(observedShotEnd({ y: 40, z: 1.5 })).toEqual([120, 40, 1.5]);
  });
});

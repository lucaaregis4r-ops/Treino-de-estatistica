import { describe, expect, it } from 'vitest';
import { dangerousPossessions, densityPoints, selectFootballEvents, selectFootballPossessions, trajectoryEvents } from './FootballAnalytics';
import type { CanonicalFootballEvent } from './StatsBombContract';

const base = (index: number, possession: number, type: number, location?: readonly [number, number]): CanonicalFootballEvent => ({ id: String(index), index, period: 1, timestamp: '00:00:00.000', minute: 0, second: index, type: { id: type, name: String(type) }, team: { id: 1, name: 'A' }, possession, possession_team: { id: 1, name: 'A' }, ...(location ? { location } : {}), scout_trainer: { schema_version: '1.0.0', modality: 'football', match_id: 'm', capture_sequence: index } });

describe('football F4 selectors', () => {
  it('keeps multiple actions and two shots in one possession', () => {
    const events = [
      { ...base(1, 1, 30, [20, 40]), pass: { end_location: [40, 40] as const } },
      { ...base(2, 1, 30, [40, 40]), pass: { end_location: [70, 40] as const } },
      { ...base(3, 1, 16, [105, 40]), shot: { outcome: 'Saved' } },
      { ...base(4, 1, 16, [110, 40]), shot: { outcome: 'Goal' } },
      base(5, 2, 30, [10, 40]),
    ];
    expect(selectFootballPossessions(events, {}).map((p) => p.events.length)).toEqual([4, 1]);
    expect(dangerousPossessions(events, 'had_goal')).toHaveLength(1);
    expect(trajectoryEvents(events)).toHaveLength(2);
  });
  it('does not bridge events removed by a type filter', () => {
    const events = [base(1, 1, 30, [20, 40]), base(2, 1, 42), base(3, 1, 43, [60, 40])];
    expect(selectFootballEvents(events, { typeId: 30 })).toHaveLength(1);
    expect(densityPoints(events)).toHaveLength(2);
  });
  it('counts a partial open possession and excludes missing coordinates from density', () => {
    const events = [base(1, 1, 30), base(2, 2, 16, [119, 40])];
    expect(selectFootballPossessions(events, {}).filter((p) => !p.complete)).toHaveLength(2);
    expect(densityPoints(events)).toEqual([[119, 40]]);
  });
});

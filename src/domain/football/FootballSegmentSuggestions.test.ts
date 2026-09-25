import { expect, it } from 'vitest';
import type { ControlSegment } from './FootballObservation';
import { createCanonicalFootballEvent, formatFootballTimestamp } from './FootballRecorder';
import { selectFootballSegmentSuggestions } from './FootballSegmentSuggestions';

function segment(points: readonly { readonly id: string; readonly at: number; readonly x?: number; readonly y?: number }[], shots: readonly { readonly id: string; readonly at: number; readonly x?: number; readonly y?: number }[] = []): ControlSegment {
  const events = shots.map((shot, index) => createCanonicalFootballEvent({
    id: shot.id, matchId: 'match', index: points.length + index + 1, period: 1, elapsedMs: shot.at,
    action: 'shot', outcome: 'pending', team: { id: 1, name: 'A' },
    ...(shot.x === undefined || shot.y === undefined ? {} : { location: [shot.x, shot.y] as const }),
  }));
  return {
    id: 1, teamId: 'team-a', period: 1, events,
    marks: points.map((point, index) => ({ eventId: point.id, captureSequence: index + 1, period: 1, timestamp: formatFootballTimestamp(point.at), before: { kind: 'controlled', teamId: 'team-a' } as const, after: { kind: 'controlled', teamId: 'team-a' } as const, ...(point.x === undefined || point.y === undefined ? {} : { position: [point.x, point.y] as const, precision: 'point' as const }), coverage: 'continuous' as const })),
    complete: false, completeness: { temporal: 'partial', spatial: 'observed', contextual: 'not_observed' },
  };
}

const withPitch = (value: ControlSegment, direction: 'x120' | 'x0' | undefined = 'x120') => selectFootballSegmentSuggestions([value], { pitch: { length: 120, width: 80 }, orientationFor: () => direction });

it('selects an observed forward advance, but not a long retreat or a lateral displacement outside the area', () => {
  expect(withPitch(segment([{ id: 'a', at: 0, x: 45, y: 40 }, { id: 'b', at: 4_000, x: 82, y: 40 }]))).toMatchObject([{ targetEventId: 'b', reasons: ['advance_to_attacking_third'] }]);
  expect(withPitch(segment([{ id: 'a', at: 0, x: 100, y: 40 }, { id: 'b', at: 4_000, x: 50, y: 40 }]))).toEqual([]);
  expect(withPitch(segment([{ id: 'a', at: 0, x: 30, y: 10 }, { id: 'b', at: 4_000, x: 30, y: 70 }]))).toEqual([]);
});

it('selects area entry only with calibrated dimensions, supports inverted sides, and does not use a gap as movement', () => {
  const entry = segment([{ id: 'a', at: 0, x: 70, y: 10 }, { id: 'b', at: 4_000, x: 104, y: 20 }]);
  expect(withPitch(entry)).toMatchObject([{ targetEventId: 'b', reasons: expect.arrayContaining(['advance_to_attacking_third', 'movement_into_area']) }]);
  expect(withPitch(entry)).toHaveLength(1);
  expect(selectFootballSegmentSuggestions([entry], { orientationFor: () => 'x120' })).toEqual([]);
  expect(withPitch(segment([{ id: 'a', at: 0, x: 100, y: 40 }, { id: 'b', at: 4_000, x: 30, y: 40 }]), 'x0')).toMatchObject([{ targetEventId: 'b', reasons: ['advance_to_attacking_third'] }]);
  expect(withPitch(segment([{ id: 'a', at: 0, x: 40, y: 40 }, { id: 'b', at: 9_000, x: 90, y: 40 }]))).toEqual([]);
});

it('keeps a shot reviewable without inventing displacement and keeps two overlapping shots distinct', () => {
  const suggestions = withPitch(segment([{ id: 'm1', at: 0, x: 30, y: 40 }, { id: 'm2', at: 5_000, x: 55, y: 40 }], [{ id: 'shot-1', at: 7_000 }, { id: 'shot-2', at: 8_000 }]));
  expect(suggestions.filter(item => item.reasons.includes('before_shot'))).toMatchObject([
    { targetEventId: 'shot-1', sourceEventIds: expect.arrayContaining(['m1', 'm2', 'shot-1']) },
    { targetEventId: 'shot-2', sourceEventIds: expect.arrayContaining(['m1', 'm2', 'shot-2']) },
  ]);
  expect(suggestions[0]).toMatchObject({ targetEventId: 'shot-1', priority: 1 });
  const withoutPosition = withPitch(segment([], [{ id: 'shot-alone', at: 7_000 }]));
  expect(withoutPosition).toMatchObject([{ targetEventId: 'shot-alone', reasons: ['before_shot'], sourceEventIds: ['shot-alone'] }]);
});

it('folds a movement into its overlapping shot candidate while retaining each shot identity', () => {
  const suggestions = withPitch(segment([{ id: 'm1', at: 0, x: 45, y: 40 }, { id: 'm2', at: 4_000, x: 84, y: 40 }], [{ id: 'shot-1', at: 6_000 }, { id: 'shot-2', at: 7_000 }]));
  expect(suggestions).toHaveLength(2);
  expect(suggestions).toMatchObject([
    { targetEventId: 'shot-1', reasons: expect.arrayContaining(['before_shot', 'advance_to_attacking_third']) },
    { targetEventId: 'shot-2', reasons: expect.arrayContaining(['before_shot', 'advance_to_attacking_third']) },
  ]);
});

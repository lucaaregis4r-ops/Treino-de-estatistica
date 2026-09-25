import { timestampMs, type ControlSegment } from './FootballObservation';
import type { StatsBombLocation } from './StatsBombContract';

/** Pilot hypotheses only. They deliberately are not exposed as scout settings. */
export const FOOTBALL_SEGMENT_SUGGESTION_RULE_VERSION = 't06.1' as const;
const MAX_SHOT_LOOKBACK_MS = 10_000;
const MAX_ADVANCE_INTERVAL_MS = 8_000;
const MIN_DISTANCE_RATIO = .2;

export type FootballSegmentSuggestionReason = 'before_shot' | 'advance_to_attacking_third' | 'movement_into_area';

export interface FootballSegmentSuggestion {
  readonly kind: 'segment_to_complete';
  readonly segmentId: number;
  readonly targetEventId: string;
  readonly teamId: string;
  readonly sourceEventIds: readonly string[];
  readonly reasons: readonly FootballSegmentSuggestionReason[];
  /** Used only for the unobtrusive field hint; absence never invents a path. */
  readonly start?: StatsBombLocation;
  readonly end?: StatsBombLocation;
  readonly priority: 1 | 2;
}

export interface FootballSegmentSuggestionOptions {
  readonly pitch?: { readonly length: number; readonly width: number };
  readonly orientationFor?: (period: number, teamId: string) => 'x120' | 'x0' | undefined;
}

type PositionedMark = Extract<ControlSegment['marks'][number], { readonly position?: StatsBombLocation }> & { readonly position: StatsBombLocation };

function positionMarks(segment: ControlSegment): readonly PositionedMark[] {
  return segment.marks.filter((mark): mark is PositionedMark => Boolean(mark.position) && mark.coverage === 'continuous');
}

function areaAt(location: StatsBombLocation, dimensions: { readonly length: number; readonly width: number }): boolean {
  const [x, y] = location;
  // StatsBomb's penalty-box proportions, scaled rather than assumed from a view.
  return (x <= dimensions.length * .15 || x >= dimensions.length * .85) && y >= dimensions.width * .225 && y <= dimensions.width * .775;
}

function orientedX(location: StatsBombLocation, direction: 'x120' | 'x0', length: number): number {
  return direction === 'x120' ? location[0] : length - location[0];
}

function sourceIds(ids: readonly string[]): readonly string[] {
  return [...new Set(ids)].sort();
}

function add(suggestions: Map<string, FootballSegmentSuggestion>, next: FootballSegmentSuggestion): void {
  const key = `${next.targetEventId}|${next.sourceEventIds.join('|')}`;
  const prior = suggestions.get(key);
  if (!prior) { suggestions.set(key, next); return; }
  suggestions.set(key, {
    ...prior,
    reasons: [...new Set([...prior.reasons, ...next.reasons])],
    priority: Math.min(prior.priority, next.priority) as 1 | 2,
    ...(prior.start ? {} : { start: next.start }),
    ...(prior.end ? {} : { end: next.end }),
  });
}

/**
 * Selects reviewable observed intervals. It never creates a pass, carry,
 * trajectory, player, or pressure episode; consumers persist only candidates.
 */
export function selectFootballSegmentSuggestions(
  segments: readonly ControlSegment[],
  options: FootballSegmentSuggestionOptions = {},
): readonly FootballSegmentSuggestion[] {
  const dimensions = options.pitch;
  const suggestions = new Map<string, FootballSegmentSuggestion>();

  for (const segment of segments) {
    const marks = positionMarks(segment);
    const shots = segment.events.filter(event => event.type.id === 16);
    for (const shot of shots) {
      const shotAt = timestampMs(shot.timestamp);
      const sourceMarks = marks.filter(mark => {
        const observedAt = timestampMs(mark.timestamp);
        return observedAt <= shotAt && shotAt - observedAt <= MAX_SHOT_LOOKBACK_MS;
      }).slice(-3);
      const origin = shot.location ?? sourceMarks.at(-1)?.position;
      add(suggestions, {
        kind: 'segment_to_complete', targetEventId: shot.id, teamId: segment.teamId,
        segmentId: segment.id,
        sourceEventIds: sourceIds([...sourceMarks.map(mark => mark.eventId), shot.id]),
        reasons: ['before_shot'], start: sourceMarks[0]?.position, end: origin, priority: 1,
      });
    }

    if (!dimensions) continue;
    for (let index = 1; index < marks.length; index += 1) {
      const start = marks[index - 1], end = marks[index];
      if (timestampMs(end.timestamp) - timestampMs(start.timestamp) > MAX_ADVANCE_INTERVAL_MS) continue;
      const distance = Math.hypot(end.position[0] - start.position[0], end.position[1] - start.position[1]);
      if (distance < dimensions.length * MIN_DISTANCE_RATIO) continue;
      const sources = sourceIds([start.eventId, end.eventId]);
      const direction = options.orientationFor?.(segment.period, segment.teamId);
      const reachedAttackingThird = direction !== undefined && orientedX(end.position, direction, dimensions.length) >= dimensions.length * (2 / 3);
      const advanced = direction !== undefined && orientedX(end.position, direction, dimensions.length) - orientedX(start.position, direction, dimensions.length) >= dimensions.length * MIN_DISTANCE_RATIO;
      const intoArea = !areaAt(start.position, dimensions) && areaAt(end.position, dimensions);
      if (!reachedAttackingThird && !(intoArea && distance >= dimensions.length * MIN_DISTANCE_RATIO)) continue;
      add(suggestions, {
        kind: 'segment_to_complete', targetEventId: end.eventId, teamId: segment.teamId, sourceEventIds: sources,
        segmentId: segment.id,
        reasons: [
          ...(advanced && reachedAttackingThird ? ['advance_to_attacking_third' as const] : []),
          ...(intoArea ? ['movement_into_area' as const] : []),
        ],
        start: start.position, end: end.position, priority: 2,
      });
    }
  }
  const values = [...suggestions.values()];
  const mergedMovementIds = new Set<string>();
  const mergedShots = new Map<string, FootballSegmentSuggestion>();
  for (const movement of values.filter(item => !item.reasons.includes('before_shot'))) {
    const relatedShots = values.filter(item => item.segmentId === movement.segmentId && item.reasons.includes('before_shot') && item.sourceEventIds.some(id => movement.sourceEventIds.includes(id)));
    if (!relatedShots.length) continue;
    mergedMovementIds.add(`${movement.targetEventId}|${movement.sourceEventIds.join('|')}`);
    for (const shot of relatedShots) {
      mergedShots.set(shot.targetEventId, {
        ...shot,
        sourceEventIds: sourceIds([...shot.sourceEventIds, ...movement.sourceEventIds]),
        reasons: [...new Set([...shot.reasons, ...movement.reasons])],
        start: movement.start ?? shot.start,
        end: movement.end ?? shot.end,
      });
    }
  }
  return values
    .filter(item => !mergedMovementIds.has(`${item.targetEventId}|${item.sourceEventIds.join('|')}`))
    .map(item => mergedShots.get(item.targetEventId) ?? item)
    .sort((left, right) => left.priority - right.priority || left.targetEventId.localeCompare(right.targetEventId) || left.sourceEventIds.join('|').localeCompare(right.sourceEventIds.join('|')));
}

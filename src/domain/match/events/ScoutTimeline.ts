import type {
  MatchEvent,
  ScoutCorrectedEvent,
  ScoutRegisteredEvent,
  ScoutUndoneEvent,
} from './MatchEvent';
import { matchEventId, matchEventSequence } from './MatchEvent';
import type { ScoutEvent } from '../../scout/events/ScoutEvent';

export interface ProjectedScoutEvent {
  readonly sourceEventId: string;
  readonly historyEventId: string;
  readonly originalSequence: number;
  readonly event: ScoutEvent;
  readonly corrected: boolean;
}

interface HistoryActivity {
  readonly latestUndoByTarget: ReadonlyMap<string, ScoutUndoneEvent>;
  readonly redoneUndoIds: ReadonlySet<string>;
}

function historyActivity(events: readonly MatchEvent[]): HistoryActivity {
  const latestUndoByTarget = new Map<string, ScoutUndoneEvent>();
  const redoneUndoIds = new Set<string>();
  for (const event of events) {
    if (event.type === 'scout_undone') latestUndoByTarget.set(event.targetHistoryEventId, event);
    if (event.type === 'scout_redone') redoneUndoIds.add(event.targetUndoEventId);
  }
  return { latestUndoByTarget, redoneUndoIds };
}

function actionIsActive(actionId: string, activity: HistoryActivity): boolean {
  const latestUndo = activity.latestUndoByTarget.get(actionId);
  return !latestUndo || activity.redoneUndoIds.has(latestUndo.id);
}

export function isHistoryActionActive(actionId: string, events: readonly MatchEvent[]): boolean {
  return actionIsActive(actionId, historyActivity(events));
}

export function projectScoutTimeline(
  events: readonly MatchEvent[],
): readonly ProjectedScoutEvent[] {
  const ordered = [...events].sort(
    (left, right) => matchEventSequence(left) - matchEventSequence(right),
  );
  const activity = historyActivity(ordered);
  const registrations = ordered.filter(
    (event): event is ScoutRegisteredEvent =>
      event.type === 'scout_registered' && actionIsActive(event.event.id, activity),
  );

  const correctionsByTarget = new Map<string, ScoutCorrectedEvent>();
  for (const event of ordered) {
    if (event.type === 'scout_corrected' && actionIsActive(event.id, activity)) {
      correctionsByTarget.set(event.targetEventId, event);
    }
  }

  return registrations.map((registration) => {
    const correction = correctionsByTarget.get(registration.event.id);
    return {
      sourceEventId: registration.event.id,
      historyEventId: correction?.id ?? registration.event.id,
      originalSequence: registration.event.sequence,
      event: correction?.replacementEvent ?? registration.event,
      corrected: correction !== undefined,
    };
  });
}

export function projectEffectiveMatchEvents(events: readonly MatchEvent[]): readonly MatchEvent[] {
  const timeline = projectScoutTimeline(events);
  const activity = historyActivity(events);
  const originalSequenceByScout = new Map(
    timeline.map((projected) => [projected.sourceEventId, projected.originalSequence]),
  );
  const effectiveHistoryByScout = new Map(
    timeline.map((projected) => [projected.sourceEventId, projected.historyEventId]),
  );
  const systemEvents = events.filter((event) => {
    if (
      event.type === 'scout_registered' ||
      event.type === 'scout_corrected' ||
      event.type === 'scout_undone' ||
      event.type === 'scout_redone'
    )
      return false;
    if (event.type === 'match_correction' || event.type === 'substitution_made')
      return actionIsActive(event.id, activity);
    if (event.type === 'rally_started' && event.sourceHistoryEventId) {
      return event.targetScoutEventId
        ? effectiveHistoryByScout.has(event.targetScoutEventId)
        : actionIsActive(event.sourceHistoryEventId, activity);
    }
    if (
      (event.type === 'rally_result' || event.type === 'set_finished') &&
      event.sourceHistoryEventId
    ) {
      return event.targetScoutEventId
        ? effectiveHistoryByScout.get(event.targetScoutEventId) === event.sourceHistoryEventId
        : actionIsActive(event.sourceHistoryEventId, activity);
    }
    return true;
  });
  const effectiveScoutEvents: MatchEvent[] = timeline.map((projected) => ({
    type: 'scout_registered',
    event: {
      ...projected.event,
      id: projected.sourceEventId,
      sequence: projected.originalSequence,
    },
  }));
  const logicalPosition = (event: MatchEvent): readonly [number, number] => {
    if (
      (event.type === 'rally_started' ||
        event.type === 'rally_result' ||
        event.type === 'set_finished') &&
      event.targetScoutEventId
    ) {
      const anchor = originalSequenceByScout.get(event.targetScoutEventId);
      if (anchor !== undefined) {
        const rank = event.type === 'rally_started' ? 0 : event.type === 'rally_result' ? 2 : 3;
        return [anchor, rank];
      }
    }
    return [matchEventSequence(event), event.type === 'scout_registered' ? 1 : 0];
  };
  return Object.freeze(
    [...systemEvents, ...effectiveScoutEvents].sort((left, right) => {
      const leftPosition = logicalPosition(left);
      const rightPosition = logicalPosition(right);
      return leftPosition[0] - rightPosition[0] || leftPosition[1] - rightPosition[1];
    }),
  );
}

export function findUndoTarget(events: readonly MatchEvent[]): string | undefined {
  const activity = historyActivity(events);
  const target = [...events]
    .reverse()
    .find(
      (event) =>
        (event.type === 'scout_registered' ||
          event.type === 'scout_corrected' ||
          event.type === 'match_correction' ||
          event.type === 'substitution_made') &&
        actionIsActive(matchEventId(event), activity),
    );
  return target ? matchEventId(target) : undefined;
}

export function findRedoTarget(events: readonly MatchEvent[]): string | undefined {
  const activity = historyActivity(events);
  return [...events]
    .reverse()
    .find(
      (event): event is ScoutUndoneEvent =>
        event.type === 'scout_undone' && !activity.redoneUndoIds.has(event.id),
    )?.id;
}

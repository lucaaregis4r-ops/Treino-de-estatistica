import { outcomeName, projectControl, timestampMs, type ControlSegment } from '../../football/FootballObservation';
import { statsBombToNormalized, type CanonicalFootballEvent, type StatsBombLocation } from '../../football/StatsBombContract';
import { matchEventSequence, type MatchEvent } from '../../match/events/MatchEvent';
import { coverageFor, uniqueReasons, type ObservedBoundary, type ObservedSequence, type ObservedSequenceProjection, type ObservedStep, type SequenceCensorReason } from './ObservedSequence';

function normalized(location: StatsBombLocation | undefined) {
  if (!location) return undefined;
  const [x, y] = statsBombToNormalized(location);
  return { x, y };
}

function destinationFor(event: CanonicalFootballEvent) {
  const shotEnd = event.shot?.end_location;
  return normalized(event.pass?.end_location ?? event.carry?.end_location ?? event.scout_trainer.essential_destination ?? (Array.isArray(shotEnd) && typeof shotEnd[0] === 'number' && typeof shotEnd[1] === 'number' ? shotEnd as unknown as StatsBombLocation : undefined));
}

function effectiveHistoryIds(history: readonly MatchEvent[]) {
  const ordered = [...history].sort((a, b) => matchEventSequence(a) - matchEventSequence(b));
  const undone = new Set(ordered.filter((event): event is Extract<MatchEvent, { type: 'football_event_undone' }> => event.type === 'football_event_undone').map(event => event.targetHistoryEventId));
  const ids = new Map<string, string>();
  for (const event of ordered) {
    if (event.type === 'football_event_registered' && !undone.has(event.id)) ids.set(event.event.id, event.id);
    if (event.type === 'football_event_corrected' && !undone.has(event.id) && ids.has(event.targetEventId)) ids.set(event.targetEventId, event.id);
  }
  return ids;
}

function stepFor(event: CanonicalFootballEvent, role: ObservedStep['role'], historyId?: string): ObservedStep {
  const obs = event.scout_trainer?.observation;
  const teamId = role === 'control' && obs?.after?.kind === 'controlled' ? obs.after.teamId : obs?.teamId ?? (obs?.before?.kind === 'controlled' ? obs.before.teamId : undefined);
  const position = normalized(obs?.position ?? event.location);
  const destination = destinationFor(event);
  return {
    sourceId: event.id, ...(historyId ? { effectiveHistoryId: historyId } : {}), order: event.index,
    kind: role === 'control' ? 'control' : event.type.name.toLowerCase().replaceAll(' ', '_'), role,
    ...(teamId ? { teamId } : {}), elapsedMs: timestampMs(event.timestamp),
    ...(position ? { position } : {}), ...(destination ? { destination } : {}),
  };
}

function segmentEvents(segment: ControlSegment, allById: ReadonlyMap<string, CanonicalFootballEvent>) {
  const actionIds = new Set(segment.events.map(event => event.id));
  const ids = [...new Set([...segment.events.map(event => event.id), ...segment.marks.map(mark => mark.eventId)])];
  return ids.flatMap(id => {
    const event = allById.get(id);
    return event ? [{ event, role: actionIds.has(id) ? 'action' as const : 'control' as const }] : [];
  }).sort((a, b) => a.event.index - b.event.index || a.event.id.localeCompare(b.event.id));
}

function eventBoundary(event: CanonicalFootballEvent, ownerId: string): { readonly end: ObservedBoundary; readonly outcome: string; readonly reason?: SequenceCensorReason } | undefined {
  const obs = event.scout_trainer?.observation;
  const elapsedMs = timestampMs(event.timestamp);
  if (obs?.coverage === 'suspended') return { end: { sourceId: event.id, reason: 'suspended', elapsedMs }, outcome: 'suspended', reason: 'suspended' };
  if (outcomeName(event) === 'Goal' && obs?.outcomeKnownAtCapture !== false) return { end: { sourceId: event.id, reason: 'goal', elapsedMs }, outcome: 'goal' };
  const after = obs?.after;
  if (after?.kind === 'dead_ball') return { end: { sourceId: event.id, reason: 'dead_ball', elapsedMs }, outcome: 'dead_ball' };
  if (after?.kind === 'controlled' && after.teamId !== ownerId) return { end: { sourceId: event.id, reason: 'turnover', elapsedMs, teamId: after.teamId }, outcome: 'turnover' };
  if (after?.kind === 'contested') return { end: { sourceId: event.id, reason: 'contested', elapsedMs }, outcome: 'contested' };
  if (after?.kind === 'unknown') return { end: { sourceId: event.id, reason: 'unknown_control', elapsedMs }, outcome: 'unknown_control', reason: 'unknown_control' };
  return undefined;
}

/** Adapts observed control segments, splitting any disputed or suspended interval inside a legacy segment. */
export function projectFootballObservedSequences(matchId: string, events: readonly CanonicalFootballEvent[], history: readonly MatchEvent[] = [], teamIdByName: ReadonlyMap<string, string> = new Map()): ObservedSequenceProjection {
  const ordered = [...events].sort((a, b) => a.index - b.index || (a.scout_trainer?.capture_sequence ?? a.index) - (b.scout_trainer?.capture_sequence ?? b.index));
  const allById = new Map(ordered.map(event => [event.id, event]));
  const historyIds = effectiveHistoryIds(history);
  const segments = projectControl(ordered).segments;
  const seen = new Set<string>();
  const units: ObservedSequence[] = [];

  segments.forEach((segment, segmentIndex) => {
    const entries = segmentEvents(segment, allById);
    const nextSegment = segments[segmentIndex + 1];
    let steps: ObservedStep[] = [];
    let reasons: SequenceCensorReason[] = [];
    let start: ObservedBoundary | undefined;
    const emit = (end?: ObservedBoundary, outcome?: string, addedReasons: readonly SequenceCensorReason[] = []) => {
      if (!steps.length || !start) return;
      const censorReasons = uniqueReasons([...reasons, ...addedReasons, ...(!end ? ['missing_end' as const] : [])]);
      const coverage = coverageFor(censorReasons);
      units.push({
        unitId: `football:${matchId}:${segment.period}:${encodeURIComponent(segment.teamId)}:${encodeURIComponent(start.sourceId ?? '')}`,
        sport: 'football', matchId, context: { kind: 'period', number: segment.period }, teamId: segment.teamId,
        participantTeamIds: [...new Set([segment.teamId, ...steps.flatMap(step => step.teamId ? [step.teamId] : [])])],
        steps: [...steps], start,
        ...(end ? { end } : {}), ...(outcome ? { outcome } : {}),
        coverage, censorReasons, eligibleForOutcome: coverage === 'complete' && Boolean(outcome),
      });
      steps = []; reasons = []; start = undefined;
    };
    for (const { event, role } of entries) {
      seen.add(event.id);
      const step = stepFor(event, role, historyIds.get(event.id));
      if (!steps.length) {
        const obs = event.scout_trainer?.observation;
        const explicitStart = role === 'control' && obs?.after?.kind === 'controlled' && obs.after.teamId === segment.teamId || obs?.restart === true || obs?.before?.kind === 'contested' && obs?.after?.kind === 'controlled' && obs.after.teamId === segment.teamId;
        start = { sourceId: event.id, reason: explicitStart ? 'observed_control' : 'first_recorded_action', elapsedMs: step.elapsedMs };
        if (!explicitStart) reasons.push('missing_start');
      }
      steps.push(step);
      const boundary = eventBoundary(event, segment.teamId);
      if (boundary) emit(boundary.end, boundary.outcome, boundary.reason ? [boundary.reason] : []);
    }
    if (steps.length) {
      const nextEntry = nextSegment ? segmentEvents(nextSegment, allById)[0]?.event : undefined;
      const nextPeriodEvent = ordered.find(event => event.period !== segment.period && event.index > (entries.at(-1)?.event.index ?? -1));
      if (nextEntry && nextSegment?.period === segment.period) {
        const reason = nextEntry.scout_trainer?.observation?.restart ? 'restart' : 'turnover';
        emit({ sourceId: nextEntry.id, reason, elapsedMs: timestampMs(nextEntry.timestamp), teamId: nextSegment.teamId }, reason);
      } else if (nextPeriodEvent) emit({ sourceId: nextPeriodEvent.id, reason: 'period_boundary', elapsedMs: timestampMs(nextPeriodEvent.timestamp) }, 'period_boundary', ['period_boundary']);
      else emit();
    }
  });
  let group: CanonicalFootballEvent[] = [];
  const emitLegacy = (next?: CanonicalFootballEvent) => {
    if (!group.length) return;
    const first = group[0], last = group.at(-1)!;
    const owner = teamIdByName.get(first.possession_team!.name) ?? first.possession_team!.name;
    const steps = group.map(event => stepFor(event, event.type.id === 1000 ? 'control' : 'action', historyIds.get(event.id)));
    const goal = outcomeName(last) === 'Goal';
    const end = goal ? { sourceId: last.id, reason: 'goal', elapsedMs: timestampMs(last.timestamp) }
      : next ? { sourceId: next.id, reason: next.period === first.period ? 'provider_possession_boundary' : 'period_boundary', elapsedMs: timestampMs(next.timestamp) } : undefined;
    const censorReasons: SequenceCensorReason[] = ['missing_start', ...(!end ? ['missing_end' as const] : []), ...(next && next.period !== first.period ? ['period_boundary' as const] : [])];
    units.push({
      unitId: `football:${matchId}:${first.period}:${encodeURIComponent(owner)}:${encodeURIComponent(first.id)}`,
      sport: 'football', matchId, context: { kind: 'period', number: first.period }, teamId: owner,
      participantTeamIds: [owner], steps, start: { sourceId: first.id, reason: 'first_provider_event', elapsedMs: timestampMs(first.timestamp) },
      ...(end ? { end } : {}), ...(goal ? { outcome: 'goal' } : next ? { outcome: 'provider_possession_boundary' } : {}),
      coverage: 'censored', censorReasons, eligibleForOutcome: false,
    });
    group = [];
  };
  for (const event of ordered) {
    if (seen.has(event.id) || event.possession === undefined || !event.possession_team) { emitLegacy(); continue; }
    const first = group[0];
    if (first && (first.period !== event.period || first.possession !== event.possession || first.possession_team?.id !== event.possession_team?.id)) emitLegacy(event);
    group.push(event);
    seen.add(event.id);
  }
  emitLegacy();
  units.sort((a, b) => (a.steps[0]?.order ?? 0) - (b.steps[0]?.order ?? 0));
  const unassigned = ordered.filter(event => !seen.has(event.id)).map(event => stepFor(event, event.type.id === 1000 ? 'control' : 'action', historyIds.get(event.id)));
  return { units, unassigned };
}

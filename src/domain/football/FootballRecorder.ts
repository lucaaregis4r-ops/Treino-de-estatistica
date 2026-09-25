import { outcomeName, type FootballObservation } from './FootballObservation';
import type { MatchEvent } from '../match/events/MatchEvent';
import type { CanonicalFootballEvent, FootballAction, StatsBombEntity, StatsBombLocation } from './StatsBombContract';

export type FootballOutcome = 'complete' | 'incomplete' | 'pending' | 'goal' | 'saved' | 'blocked' | 'off_target' | 'post' | 'won' | 'lost' | 'observed';
export interface FootballClockState { readonly period: 1 | 2; readonly elapsedMs: number; readonly running: boolean; readonly referenceTimestamp: number; }
export interface FootballProjection { readonly events: readonly CanonicalFootballEvent[]; readonly historyIds: readonly string[]; readonly score: { readonly teamA: number; readonly teamB: number }; readonly clock: FootballClockState; }
export interface FootballDraftData { readonly shotContext?: import('./StatsBombContract').FootballShotContext; readonly observation?: FootballObservation; readonly action: FootballAction; readonly team: StatsBombEntity; readonly player?: StatsBombEntity; readonly relatedPlayer?: StatsBombEntity; readonly location?: StatsBombLocation; readonly endLocation?: StatsBombLocation; readonly outcome: FootballOutcome; }

const TYPE_BY_ACTION: Record<FootballAction, { readonly id: number; readonly name: string }> = {
  pass: { id: 30, name: 'Pass' }, carry: { id: 43, name: 'Carry' }, dribble: { id: 14, name: 'Dribble' },
  duel: { id: 4, name: 'Duel' }, interception: { id: 10, name: 'Interception' }, ball_recovery: { id: 2, name: 'Ball Recovery' },
  loss: { id: 3, name: 'Dispossessed' }, shot: { id: 16, name: 'Shot' },
  foul: { id: 22, name: 'Foul Committed' }, substitution: { id: 19, name: 'Substitution' },
};

const OUTCOMES: Record<FootballOutcome, { readonly id: number; readonly name: string }> = {
  complete: { id: 1, name: 'Complete' }, incomplete: { id: 9, name: 'Incomplete' }, pending: { id: 0, name: 'Pending' }, goal: { id: 97, name: 'Goal' },
  saved: { id: 100, name: 'Saved' }, blocked: { id: 96, name: 'Blocked' }, off_target: { id: 98, name: 'Off T' },
  post: { id: 101, name: 'Post' }, won: { id: 4, name: 'Won' }, lost: { id: 8, name: 'Lost' }, observed: { id: 0, name: 'Observed' },
};

export function formatFootballTimestamp(elapsedMs: number): string {
  const total = Math.max(0, Math.floor(elapsedMs));
  const hours = Math.floor(total / 3_600_000), minutes = Math.floor(total / 60_000) % 60, seconds = Math.floor(total / 1000) % 60, milliseconds = total % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

export function effectiveElapsed(clock: FootballClockState, now: number): number {
  return clock.elapsedMs + (clock.running ? Math.max(0, now - clock.referenceTimestamp) : 0);
}

export function createCanonicalFootballEvent(input: FootballDraftData & { readonly id: string; readonly matchId: string; readonly index: number; readonly period: 1 | 2; readonly elapsedMs: number; readonly possession?: number; readonly possessionTeam?: StatsBombEntity; readonly captureSequence?: number }): CanonicalFootballEvent {
  const location = input.location;
  const end = input.endLocation;
  const outcome = OUTCOMES[input.outcome];
  const minute = (input.period === 2 ? 45 : 0) + Math.floor(input.elapsedMs / 60_000);
  const second = Math.floor(input.elapsedMs / 1000) % 60;
  return {
    id: input.id, index: input.index, period: input.period, timestamp: formatFootballTimestamp(input.elapsedMs), minute, second,
    type: TYPE_BY_ACTION[input.action], team: input.team, ...(input.player ? { player: input.player } : {}), ...(location ? { location } : {}), ...(input.possession !== undefined ? { possession: input.possession } : {}), ...(input.possessionTeam ? { possession_team: input.possessionTeam } : {}),
    ...(input.action === 'pass' ? { pass: { ...(end ? { end_location: end } : {}), ...(input.outcome === 'incomplete' ? { outcome } : {}) } } : {}),
    ...(input.action === 'carry' ? { carry: { ...(end ? { end_location: end } : {}) } } : {}),
    ...(input.action === 'shot' ? { shot: { ...(input.outcome === 'pending' ? {} : { outcome }), ...(end ? { end_location: end } : {}) } } : {}),
    ...(input.action === 'dribble' ? { dribble: { outcome } } : {}),
    ...(input.action === 'duel' ? { duel: { outcome } } : {}),
    ...(input.action === 'substitution' ? { substitution: { ...(input.relatedPlayer ? { replacement: input.relatedPlayer } : {}) } } : {}),
    scout_trainer: { schema_version: '1.1.0', modality: 'football', match_id: input.matchId, capture_sequence: input.captureSequence ?? input.index, position_observed: location !== undefined, ...(input.shotContext ? { shot_context: input.shotContext } : {}), ...(input.observation ? { observation: input.observation, tactical_context: input.observation.tactical } : {}) },
  };
}

export function projectFootball(events: readonly MatchEvent[], teamAId: string, teamBId: string, teamAName: string, teamBName: string, now: number): FootballProjection {
  const ordered = [...events].sort((a, b) => ('sequence' in a ? a.sequence : a.event.sequence) - ('sequence' in b ? b.sequence : b.event.sequence));
  const undone = new Set(ordered.filter((event) => event.type === 'football_event_undone').map((event) => event.targetHistoryEventId));
  const corrections = new Map(ordered.filter((event): event is Extract<MatchEvent, { type: 'football_event_corrected' }> => event.type === 'football_event_corrected' && !undone.has(event.id)).map((event) => [event.targetEventId, event] as const));
  const registrations = ordered.filter((event): event is Extract<MatchEvent, { type: 'football_event_registered' }> => event.type === 'football_event_registered' && !undone.has(event.id));
  const projected = registrations.map((registration) => corrections.get(registration.event.id)?.replacementEvent ?? registration.event);
  /** Undo follows the latest effective history operation, not the last event by capture index. */
  const historyIds = ordered
    .filter((event): event is Extract<MatchEvent, { type: 'football_event_registered' | 'football_event_corrected' }> =>
      (event.type === 'football_event_registered' || event.type === 'football_event_corrected') && !undone.has(event.id))
    .map((event) => event.id);
  const goalScore = projected.reduce((value, event) => {
    if (outcomeName(event) !== 'Goal') return value;
    return { teamA: value.teamA + ((event.scout_trainer?.observation?.teamId ? event.scout_trainer.observation.teamId === teamAId : event.team?.name === teamAName) ? 1 : 0), teamB: value.teamB + ((event.scout_trainer?.observation?.teamId ? event.scout_trainer.observation.teamId === teamBId : event.team?.name === teamBName) ? 1 : 0) };
  }, { teamA: 0, teamB: 0 });
  const score = ordered.filter((event): event is Extract<MatchEvent, { type: 'score_adjustment' }> => event.type === 'score_adjustment' && event.reason?.startsWith('football_manual:') === true).reduce((value, event) => ({ teamA: value.teamA + (event.teamId === teamAId ? event.delta : 0), teamB: value.teamB + (event.teamId === teamBId ? event.delta : 0) }), goalScore);
  const latestClock = [...ordered].reverse().find((event) => event.type === 'football_clock_changed');
  const clock: FootballClockState = latestClock?.type === 'football_clock_changed'
    ? { period: latestClock.period, elapsedMs: latestClock.elapsedMs, running: latestClock.running, referenceTimestamp: latestClock.referenceTimestamp }
    : { period: 1, elapsedMs: 0, running: false, referenceTimestamp: now };
  return { events: projected, historyIds, score, clock };
}

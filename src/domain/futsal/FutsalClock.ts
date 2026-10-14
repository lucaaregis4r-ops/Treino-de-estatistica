import { matchEventSequence, type MatchEvent, type FutsalClockChangedEvent, type FutsalClockStatus } from '../match/events/MatchEvent';

export const DEFAULT_FUTSAL_PERIOD_DURATION_MS = 20 * 60_000;

export interface FutsalClockState {
  readonly period: 1 | 2;
  readonly elapsedMs: number;
  readonly periodDurationMs: number;
  readonly status: FutsalClockStatus;
  readonly referenceTimestamp: number;
  readonly lastCommandAt?: number;
}

export function effectiveFutsalElapsed(clock: FutsalClockState, now: number): number {
  const elapsed = clock.elapsedMs + (clock.status === 'running' ? Math.max(0, now - clock.referenceTimestamp) : 0);
  return Math.min(clock.periodDurationMs, Math.max(0, elapsed));
}

export function accumulatedFutsalElapsed(clock: FutsalClockState, now: number): number {
  return (clock.period === 2 ? clock.periodDurationMs : 0) + effectiveFutsalElapsed(clock, now);
}

export function formatFutsalRemaining(clock: FutsalClockState, now: number): string {
  const remaining = Math.max(0, clock.periodDurationMs - effectiveFutsalElapsed(clock, now));
  const seconds = Math.ceil(remaining / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function projectFutsalClock(
  events: readonly MatchEvent[],
  configuredDurationMs: number | undefined,
  now: number,
  reconcileOnOpen = false,
): FutsalClockState {
  const last = [...events].sort((left, right) => matchEventSequence(left) - matchEventSequence(right)).reverse().find((event): event is FutsalClockChangedEvent => event.type === 'futsal_clock_changed');
  if (!last) return { period: 1, elapsedMs: 0, periodDurationMs: configuredDurationMs ?? DEFAULT_FUTSAL_PERIOD_DURATION_MS, status: 'ready', referenceTimestamp: now };
  return {
    period: last.period,
    elapsedMs: last.elapsedMs,
    periodDurationMs: last.periodDurationMs || configuredDurationMs || DEFAULT_FUTSAL_PERIOD_DURATION_MS,
    status: reconcileOnOpen && last.status === 'running' ? 'needs_reconciliation' : last.status,
    referenceTimestamp: last.referenceTimestamp,
    lastCommandAt: last.timestamp,
  };
}

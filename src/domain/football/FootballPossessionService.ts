import type { CanonicalFootballEvent, FootballCaptureContext, StatsBombEntity } from './StatsBombContract';

export interface PossessionState { readonly next: number; readonly team?: StatsBombEntity; readonly pending: boolean; readonly sequence: number; }

export function newPossession(state: PossessionState, team: StatsBombEntity | undefined, sequence: number): PossessionState {
  return { next: state.next + 1, team, pending: team === undefined, sequence };
}

export function lateralStartsNewPossession(state: PossessionState, team: StatsBombEntity, sequence: number): PossessionState {
  return newPossession(state, team, sequence);
}

export function contextFor(state: PossessionState, base: Omit<FootballCaptureContext, 'possession' | 'possessionTeam' | 'captureSequence'>): FootballCaptureContext {
  return { ...base, possession: state.pending ? undefined : state.next, ...(state.team ? { possessionTeam: state.team } : {}), captureSequence: state.sequence };
}

export function hasObservedControl(event: CanonicalFootballEvent): boolean {
  return event.type.id === 42 && event.ball_receipt?.outcome === undefined;
}

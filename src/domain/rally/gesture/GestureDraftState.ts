import type { SpatialMetadata } from '../../scout/spatial/SpatialMetadata';
import type { GestureExpectedAction } from './GestureExpectedActionResolver';

export type GestureDraftStatus =
  | 'awaiting_gesture'
  | 'awaiting_player'
  | 'ready_to_commit'
  | 'committing'
  | 'error';

export interface GestureDraftState {
  readonly status: GestureDraftStatus;
  readonly expectedAction?: GestureExpectedAction;
  readonly trajectory?: SpatialMetadata;
  readonly playerId?: string;
  readonly playerSelection?: 'identified' | 'unidentified';
  readonly outcome?: '#' | '=';
  readonly error?: string;
}

export function createGestureDraftState(
  expectedAction?: GestureExpectedAction,
  automaticPlayerId?: string,
): GestureDraftState {
  return {
    status: 'awaiting_gesture',
    ...(expectedAction ? { expectedAction } : {}),
    ...(automaticPlayerId
      ? { playerId: automaticPlayerId, playerSelection: 'identified' as const }
      : {}),
  };
}

export function setGestureTrajectory(
  state: GestureDraftState,
  trajectory: SpatialMetadata,
): GestureDraftState {
  if (!state.expectedAction) return state;
  return {
    ...state,
    trajectory,
    status: state.playerId ? 'ready_to_commit' : 'awaiting_player',
    error: undefined,
  };
}

export function selectGesturePlayer(
  state: GestureDraftState,
  playerId?: string,
): GestureDraftState {
  return {
    ...state,
    ...(playerId
      ? { playerId, playerSelection: 'identified' as const }
      : { playerId: undefined, playerSelection: 'unidentified' as const }),
    status: state.trajectory ? 'ready_to_commit' : 'awaiting_gesture',
    error: undefined,
  };
}

export function setGestureOutcome(
  state: GestureDraftState,
  outcome?: '#' | '=',
): GestureDraftState {
  return {
    ...state,
    ...(outcome ? { outcome } : { outcome: undefined }),
    error: undefined,
  };
}

export function beginGestureCommit(state: GestureDraftState): GestureDraftState {
  if (!state.trajectory) return { ...state, status: 'error', error: 'Trace a trajetória da bola.' };
  return { ...state, status: 'committing', error: undefined };
}

export function completeGestureCommit(
  nextExpectedAction?: GestureExpectedAction,
  automaticPlayerId?: string,
): GestureDraftState {
  return createGestureDraftState(nextExpectedAction, automaticPlayerId);
}

export function failGestureCommit(state: GestureDraftState, error: string): GestureDraftState {
  return { ...state, status: 'error', error };
}

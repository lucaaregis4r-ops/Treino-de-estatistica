import type { SpatialPoint } from '../../scout/spatial/SpatialMetadata';

export type GestureRallyPhase =
  | 'waiting_serve'
  | 'waiting_reception'
  | 'waiting_attack'
  | 'waiting_defense'
  | 'waiting_free_ball_target'
  | 'rally_closed';

export type GestureAction =
  | { readonly skill: 'serve' }
  | { readonly skill: 'reception' }
  | { readonly skill: 'attack'; readonly outcome?: '#' | '='; readonly target?: SpatialPoint }
  | { readonly skill: 'dig'; readonly crossesNet?: boolean }
  | { readonly skill: 'free_ball' };

export type GestureAttackInference =
  | 'attack_point'
  | 'attack_error'
  | 'continuation'
  | 'defended'
  | 'forced_free_ball'
  | 'attack_out'
  | 'block_out';

export interface GestureRallyState {
  readonly phase: GestureRallyPhase;
  readonly pendingAttack?: {
    readonly target?: SpatialPoint;
    readonly inference: 'continuation' | 'attack_out';
  };
}

export interface GestureTransition {
  readonly state: GestureRallyState;
  readonly attackInference?: GestureAttackInference;
  readonly qualifiesPreviousAttack?: boolean;
}

export const INITIAL_GESTURE_RALLY_STATE: GestureRallyState = Object.freeze({
  phase: 'waiting_serve',
});

export class GestureRallyEngine {
  transition(state: GestureRallyState, action: GestureAction): GestureTransition {
    if (state.phase === 'rally_closed') return { state };

    if (action.skill === 'serve' && state.phase === 'waiting_serve') {
      return { state: { phase: 'waiting_reception' } };
    }
    if (action.skill === 'reception' && state.phase === 'waiting_reception') {
      return { state: { phase: 'waiting_attack' } };
    }
    if (action.skill === 'attack' && state.phase === 'waiting_attack') {
      if (action.outcome === '#') {
        return {
          state: { phase: 'rally_closed' },
          attackInference: action.target?.surface === 'outZone' ? 'block_out' : 'attack_point',
        };
      }
      if (action.outcome === '=') {
        return {
          state: { phase: 'rally_closed' },
          attackInference: action.target?.surface === 'outZone' ? 'attack_out' : 'attack_error',
        };
      }
      return {
        state: {
          phase: 'waiting_defense',
          pendingAttack: { target: action.target, inference: 'continuation' },
        },
        attackInference: 'continuation',
      };
    }
    if (action.skill === 'dig' && state.phase === 'waiting_defense') {
      return {
        state: { phase: 'waiting_attack' },
        attackInference: action.crossesNet ? 'forced_free_ball' : 'defended',
        qualifiesPreviousAttack: action.crossesNet,
      };
    }
    if (action.skill === 'free_ball' && state.phase === 'waiting_defense') {
      return {
        state: { phase: 'waiting_reception' },
        attackInference: 'forced_free_ball',
        qualifiesPreviousAttack: true,
      };
    }
    return { state };
  }
}

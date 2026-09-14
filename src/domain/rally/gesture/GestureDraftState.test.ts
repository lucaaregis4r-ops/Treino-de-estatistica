import { describe, expect, it } from 'vitest';
import {
  beginGestureCommit,
  completeGestureCommit,
  createGestureDraftState,
  selectGesturePlayer,
  setGestureOutcome,
  setGestureTrajectory,
} from './GestureDraftState';

const trajectory = {
  origin: { surface: 'court' as const, x: 0.1, y: 0.2 },
  destination: { surface: 'court' as const, x: 0.8, y: 0.7 },
};

describe('GestureDraftState', () => {
  it('moves through gesture, player and commit without inventing a player', () => {
    const initial = createGestureDraftState({ skill: 'reception', teamId: 'B' });
    const drawn = setGestureTrajectory(initial, trajectory);
    expect(drawn.status).toBe('awaiting_player');
    expect(drawn.playerId).toBeUndefined();
    const selected = selectGesturePlayer(drawn, 'player-b5');
    const qualified = setGestureOutcome(selected, '#');
    expect(qualified).toMatchObject({ status: 'ready_to_commit', outcome: '#' });
    expect(beginGestureCommit(qualified).status).toBe('committing');
  });

  it('accepts an explicit automatic P1 player for serve', () => {
    const state = setGestureTrajectory(
      createGestureDraftState({ skill: 'serve', teamId: 'A' }, 'player-a1'),
      trajectory,
    );
    expect(state).toMatchObject({ status: 'ready_to_commit', playerId: 'player-a1' });
  });

  it('clears trajectory, player and expected action after a terminal rally', () => {
    const terminal = completeGestureCommit(undefined);
    expect(terminal).toEqual({ status: 'awaiting_gesture' });
  });

  it('allows committing a trajectory without identifying an athlete', () => {
    const state = setGestureTrajectory(
      createGestureDraftState({ skill: 'reception', teamId: 'B' }),
      trajectory,
    );
    expect(beginGestureCommit(state)).toMatchObject({ status: 'committing', trajectory });
  });
});

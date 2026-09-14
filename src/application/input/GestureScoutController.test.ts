import { describe, expect, it } from 'vitest';
import { GestureScoutController } from './GestureScoutController';

describe('GestureScoutController', () => {
  it('uses the existing visual mapper boundary and advances the gesture state once', () => {
    const controller = new GestureScoutController();
    const draft = GestureScoutController.trajectoryDraft(
      { teamId: 'team-a', playerNumber: 1, skill: 'serve', evaluation: 'excellent' },
      {
        origin: { surface: 'court', x: 0.1, y: 0.5 },
        destination: { surface: 'court', x: 0.8, y: 0.4 },
      },
    );
    expect(draft.spatial?.origin.surface).toBe('court');
    expect(controller.currentState.phase).toBe('waiting_serve');
    expect(controller.advance({ skill: 'serve' }).state.phase).toBe('waiting_reception');
  });

  it('keeps the late qualification represented as a transition result', () => {
    const controller = new GestureScoutController();
    controller.advance({ skill: 'serve' });
    controller.advance({ skill: 'reception' });
    controller.advance({ skill: 'attack' });
    const result = controller.advance({ skill: 'dig', crossesNet: true });
    expect(result.qualifiesPreviousAttack).toBe(true);
    expect(result.attackInference).toBe('forced_free_ball');
  });
});

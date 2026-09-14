import { describe, expect, it } from 'vitest';
import {
  GestureRallyEngine,
  INITIAL_GESTURE_RALLY_STATE,
  type GestureAction,
  type GestureRallyState,
} from './GestureRallyEngine';

function run(...actions: Parameters<GestureRallyEngine['transition']>[1][]): ReturnType<GestureRallyEngine['transition']> {
  const engine = new GestureRallyEngine();
  let state: GestureRallyState = INITIAL_GESTURE_RALLY_STATE;
  let result: ReturnType<GestureRallyEngine['transition']> = { state };
  for (const action of actions) {
    result = engine.transition(state, action);
    state = result.state;
  }
  return result;
}

describe('GestureRallyEngine', () => {
  it('transitions serve → reception → attack without requiring set', () => {
    expect(run({ skill: 'serve' }, { skill: 'reception' }).state.phase).toBe('waiting_attack');
  });

  it('transitions dig → attack', () => {
    expect(
      run({ skill: 'serve' }, { skill: 'reception' }, { skill: 'attack' }, { skill: 'dig' }).state.phase,
    ).toBe('waiting_attack');
  });

  it.each([
    [{ skill: 'attack', outcome: '#' as const }, 'attack_point'],
    [{ skill: 'attack', outcome: '=' as const }, 'attack_error'],
  ])('closes the rally for attack result %s', (action, inference) => {
    const result = run({ skill: 'serve' }, { skill: 'reception' }, action as GestureAction);
    expect(result.state.phase).toBe('rally_closed');
    expect(result.attackInference).toBe(inference);
  });

  it('keeps a result-less attack open and treats normal defense as continuation', () => {
    const result = run(
      { skill: 'serve' },
      { skill: 'reception' },
      { skill: 'attack' },
      { skill: 'dig' },
    );
    expect(result.attackInference).toBe('defended');
    expect(result.qualifiesPreviousAttack).toBeUndefined();
  });

  it('qualifies a cross-net defense and an explicit free ball as forced free ball', () => {
    const crossed = run(
      { skill: 'serve' },
      { skill: 'reception' },
      { skill: 'attack' },
      { skill: 'dig', crossesNet: true },
    );
    const freeBall = run(
      { skill: 'serve' },
      { skill: 'reception' },
      { skill: 'attack' },
      { skill: 'free_ball' },
    );
    expect(crossed.attackInference).toBe('forced_free_ball');
    expect(crossed.qualifiesPreviousAttack).toBe(true);
    expect(freeBall.qualifiesPreviousAttack).toBe(true);
  });

  it('distinguishes attack out and block out', () => {
    const target = { surface: 'outZone' as const, x: 0.9, y: 0.5 };
    expect(run({ skill: 'serve' }, { skill: 'reception' }, { skill: 'attack', outcome: '=', target }).attackInference).toBe('attack_out');
    expect(run({ skill: 'serve' }, { skill: 'reception' }, { skill: 'attack', outcome: '#', target }).attackInference).toBe('block_out');
  });
});

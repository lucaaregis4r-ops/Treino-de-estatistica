import type { Skill } from '../../scout/entities/Skill';
import type { ExpectedNextAction } from '../context/ExpectedNextAction';

export interface GestureExpectedAction {
  readonly skill: Skill;
  readonly teamId?: string;
}

const GESTURE_SKILL: Readonly<Record<Skill, Skill>> = {
  serve: 'serve',
  reception: 'reception',
  set: 'attack',
  attack: 'attack',
  block: 'dig',
  dig: 'dig',
  free_ball: 'free_ball',
};

/** Translates canonical rally expectations into the reduced gesture workflow. */
export class GestureExpectedActionResolver {
  resolve(expected: ExpectedNextAction | undefined): GestureExpectedAction | undefined {
    if (!expected) return undefined;
    return {
      skill: expected.reason === 'free_ball_sent' ? 'dig' : GESTURE_SKILL[expected.skill],
      ...(expected.teamId ? { teamId: expected.teamId } : {}),
    };
  }
}

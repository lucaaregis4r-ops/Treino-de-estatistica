import type { Skill } from '../../scout/entities/Skill';

export const SEQUENCE_STATE_IDS = [
  'serve',
  'reception',
  'attack',
  'block',
  'defense',
  'free_ball',
  'other',
  'terminal_win',
  'terminal_loss',
] as const;

export type SequenceStateId = (typeof SEQUENCE_STATE_IDS)[number];

/** Maps the existing volleyball vocabulary to the deliberately small V1 state space. */
export function sequenceStateForSkill(skill: Skill): SequenceStateId {
  switch (skill) {
    case 'serve':
    case 'reception':
    case 'attack':
    case 'block':
    case 'free_ball':
      return skill;
    case 'dig':
      return 'defense';
    case 'set':
      return 'other';
  }
}

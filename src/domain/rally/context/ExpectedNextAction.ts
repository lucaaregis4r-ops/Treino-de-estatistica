import type { Skill } from '../../scout/entities/Skill';

export type ExpectedActionReason =
  | 'rally_start'
  | 'serve_received'
  | 'reception_completed'
  | 'set_completed'
  | 'attack_defense'
  | 'block_defense'
  | 'defense_completed'
  | 'free_ball_sent';

export interface ExpectedNextAction {
  readonly skill: Skill;
  readonly teamId?: string;
  readonly reason: ExpectedActionReason;
  readonly derivedFromEventId?: string;
}

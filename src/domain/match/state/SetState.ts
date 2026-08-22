import type { ScoreSnapshot } from '../score/Score';

export interface SetState {
  readonly setNumber: number;
  readonly score: ScoreSnapshot;
  readonly completed: boolean;
  readonly winnerTeamId?: string;
}

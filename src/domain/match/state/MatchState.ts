import type { MatchMetadata } from '../entities/MatchMetadata';
import type { ScoreSnapshot } from '../score/Score';
import type { SetState } from './SetState';
import type { RallyState } from '../../rally/state/RallyState';
import type { SetLineup } from '../lineup/SetLineup';

export interface MatchState {
  readonly metadata: MatchMetadata;
  readonly currentSet: number;
  readonly score: ScoreSnapshot;
  readonly servingTeamId?: string;
  readonly currentRally: RallyState;
  readonly sets: readonly SetState[];
  readonly lineups: readonly SetLineup[];
  readonly matchCompleted: boolean;
  readonly processedEventIds: readonly string[];
  readonly lastSequence: number;
}

export function createInitialMatchState(metadata: MatchMetadata): MatchState {
  const score = Object.freeze({ teamA: 0, teamB: 0 });
  return {
    metadata,
    currentSet: 1,
    score,
    ...(metadata.initialServingTeamId ? { servingTeamId: metadata.initialServingTeamId } : {}),
    currentRally: Object.freeze({ status: 'idle', phase: 'idle', eventIds: Object.freeze([]) }),
    sets: Object.freeze([{ setNumber: 1, score, completed: false }]),
    lineups: Object.freeze([]),
    matchCompleted: false,
    processedEventIds: Object.freeze([]),
    lastSequence: 0,
  };
}

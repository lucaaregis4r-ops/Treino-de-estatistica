import type { ScoreSnapshot } from '../../match/score/Score';
import type { PlayerLineupContext, SetLineup } from '../../match/lineup/SetLineup';
import type { CourtRotationPosition } from '../../match/lineup/SetLineup';
import type { FormationState } from '../../match/tactical/TacticalState';

export interface RosterPlayer {
  readonly id: string;
  readonly teamId: string;
  readonly number: number;
  readonly active?: boolean;
}

export interface ScoutValidationContext {
  readonly matchId: string;
  readonly rallyId: string;
  readonly teamId: string;
  readonly setNumber: number;
  readonly scoreBefore: ScoreSnapshot;
  readonly sequence: number;
  readonly previousSequence?: number;
  readonly roster: readonly RosterPlayer[];
  readonly lineup?: SetLineup;
  readonly lineupContext?: PlayerLineupContext;
  readonly setterPlayerId?: string;
  readonly setterPosition?: CourtRotationPosition;
  readonly formationState?: FormationState;
  readonly enforceRegisteredPlayers?: boolean;
}

import type { CourtRotationPosition } from '../../match/lineup/SetLineup';
import type { RallyPhase } from '../../scout/events/ScoutEvent';
import type { Skill } from '../../scout/entities/Skill';
import type { ExpectedNextAction } from './ExpectedNextAction';
import type { ReceptionAttackContext } from './ReceptionContextResolver';
import type { FormationState } from '../../match/tactical/TacticalState';

export interface TacticalContactContext {
  readonly sourceEventId: string;
  readonly historyEventId: string;
  readonly rallyId: string;
  readonly teamId: string;
  readonly skill: Skill;
  readonly phase: RallyPhase;
  readonly servingTeamId?: string;
  readonly rotation?: CourtRotationPosition;
  readonly setterPlayerId?: string;
  readonly setterPosition?: CourtRotationPosition;
  readonly formationState?: FormationState;
  readonly receptionForAttack?: ReceptionAttackContext;
  readonly expectedNextAction?: ExpectedNextAction;
}

export interface TacticalRallySummary {
  readonly rallyId: string;
  readonly servingTeamId?: string;
  readonly winnerTeamId?: string;
  readonly transitionTeamIds: readonly string[];
}

export interface TacticalRallyProjection {
  readonly contacts: readonly TacticalContactContext[];
  readonly rallies: readonly TacticalRallySummary[];
  readonly currentRallyId?: string;
  readonly servingTeamId?: string;
  readonly rotationByTeamId: Readonly<Record<string, CourtRotationPosition>>;
  readonly expectedNextAction?: ExpectedNextAction;
}

import type { ScoutEvent } from '../../scout/events/ScoutEvent';
import type { MetricResult } from '../metrics/MetricResult';
import type { Skill } from '../../scout/entities/Skill';
import type { RallyPhase, ReceptionGrade } from '../../scout/events/ScoutEvent';
import type { TacticalRallyProjection } from '../../rally/context/TacticalRallyProjection';
import type { CourtRotationPosition } from '../../match/lineup/SetLineup';
import type { FormationState } from '../../match/tactical/TacticalState';

export interface StatisticsScope {
  readonly teamId?: string;
  readonly playerId?: string;
  readonly setNumber?: number;
  readonly skill?: Skill;
  readonly rotation?: number;
  readonly phase?: RallyPhase;
  readonly direction?: string;
  readonly originZone?: string;
  readonly targetZone?: string;
  readonly attackType?: string;
  readonly attackCombination?: string;
  readonly receptionGrade?: ReceptionGrade;
  readonly blockersCount?: number;
  readonly setterPlayerId?: string;
  readonly setterPosition?: CourtRotationPosition;
  readonly formationState?: FormationState;
}

export interface PlayerSetParticipation {
  readonly playerId: string;
  readonly setNumber: number;
}

export interface MetricContext {
  readonly events: readonly ScoutEvent[];
  readonly scope?: StatisticsScope;
  readonly playerSetParticipations?: readonly PlayerSetParticipation[];
  readonly tacticalRally?: TacticalRallyProjection;
}

export interface MetricDefinition {
  readonly id: string;
  readonly name: string;
  readonly requiredFields: readonly string[];
  calculate(context: MetricContext): MetricResult;
}

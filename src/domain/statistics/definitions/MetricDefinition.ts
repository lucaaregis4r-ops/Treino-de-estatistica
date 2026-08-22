import type { ScoutEvent } from '../../scout/events/ScoutEvent';
import type { MetricResult } from '../metrics/MetricResult';
import type { Skill } from '../../scout/entities/Skill';
import type { RallyPhase } from '../../scout/events/ScoutEvent';
import type { TacticalRallyProjection } from '../../rally/context/TacticalRallyProjection';

export interface StatisticsScope {
  readonly teamId?: string;
  readonly playerId?: string;
  readonly setNumber?: number;
  readonly skill?: Skill;
  readonly rotation?: number;
  readonly phase?: RallyPhase;
  readonly direction?: string;
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

import type { MatchMetadata } from '../../domain/match/entities/MatchMetadata';
import type { CourtRotationPosition } from '../../domain/match/lineup/SetLineup';
import type { ScoreSnapshot } from '../../domain/match/score/Score';
import type { SetState } from '../../domain/match/state/SetState';
import type { RallyPhase, ReceptionGrade } from '../../domain/scout/events/ScoutEvent';

export interface AuditableMetric {
  readonly value: number | null;
  readonly numerator: number;
  readonly denominator: number;
}

export interface ReportTeam {
  readonly id: string;
  readonly name: string;
}

export interface ReportPlayer {
  readonly id: string;
  readonly teamId: string;
  readonly number: number;
  readonly name: string;
}

export interface PlayerAttackReport {
  readonly playerId: string;
  readonly teamId: string;
  readonly volume: number;
  readonly points: number;
  readonly errors: number;
  readonly blocked: number;
  readonly continuity: number;
  readonly pointRate: AuditableMetric;
  readonly errorRate: AuditableMetric;
  readonly blockedRate: AuditableMetric;
  readonly efficiency: AuditableMetric;
}

export interface PlayerServeReport {
  readonly playerId: string;
  readonly teamId: string;
  readonly volume: number;
  readonly aces: number;
  readonly errors: number;
  readonly continuity: number;
  readonly aceRate: AuditableMetric;
  readonly errorRate: AuditableMetric;
  readonly efficiency: AuditableMetric;
}

export interface PlayerReceptionReport {
  readonly playerId: string;
  readonly teamId: string;
  readonly volume: number;
  readonly A: number;
  readonly B: number;
  readonly C: number;
  readonly errors: number;
  readonly positiveRate: AuditableMetric;
  readonly excellentRate: AuditableMetric;
}

export interface PlayerBlockReport {
  readonly playerId: string;
  readonly teamId: string;
  readonly points: number;
  readonly touches: number;
  readonly errors: number;
  readonly pointsPerSet: AuditableMetric;
}

export interface RallyRateReport {
  readonly teamId: string;
  readonly playerId?: string;
  readonly setNumber?: number;
  readonly rotation?: CourtRotationPosition;
  readonly rate: AuditableMetric;
}

export interface RotationReport {
  readonly teamId: string;
  readonly rotation: CourtRotationPosition;
  readonly sideout: AuditableMetric;
  readonly breakpoint: AuditableMetric;
  readonly attackEfficiency: AuditableMetric;
  readonly receptionPositive: AuditableMetric;
  readonly aces: number;
  readonly errors: number;
}

export interface AttackDirectionReport {
  readonly teamId: string;
  readonly playerId: string;
  readonly setterPlayerId?: string;
  readonly setterPosition: CourtRotationPosition;
  readonly originZone?: string;
  readonly targetZone?: string;
  readonly direction?: string;
  readonly attackType?: string;
  readonly attackCombination?: string;
  readonly phase: RallyPhase;
  readonly receptionGrade?: ReceptionGrade;
  readonly blockersCount?: number;
  readonly volume: number;
  readonly points: number;
  readonly errors: number;
  readonly blocked: number;
  readonly efficiency: AuditableMetric;
}

export interface SetterPositionAttackReport {
  readonly teamId: string;
  readonly playerId: string;
  readonly setterPosition: CourtRotationPosition;
  readonly volume: number;
  readonly points: number;
  readonly errors: number;
  readonly blocked: number;
  readonly efficiency: AuditableMetric;
}

export interface SetterPositionDirectionReport extends SetterPositionAttackReport {
  readonly direction: string;
  readonly share: AuditableMetric;
}

export interface SetterDistributionReport {
  readonly teamId: string;
  readonly setterPosition: CourtRotationPosition;
  readonly receptionGrade?: ReceptionGrade;
  readonly attackerPlayerId: string;
  readonly attackZone?: string;
  readonly attackCombination?: string;
  readonly volume: number;
  readonly share: AuditableMetric;
}

export interface TeamSummaryReport {
  readonly teamId: string;
  readonly attackEfficiency: AuditableMetric;
  readonly serveEfficiency: AuditableMetric;
  readonly receptionPositive: AuditableMetric;
  readonly receptionExcellent: AuditableMetric;
  readonly sideout: AuditableMetric;
  readonly breakpoint: AuditableMetric;
  readonly blocks: number;
  readonly aces: number;
  readonly errors: number;
}

export interface MatchReportModel {
  readonly metadata: MatchMetadata;
  readonly eventCount: number;
  readonly durationMs: number;
  readonly score: ScoreSnapshot;
  readonly sets: readonly SetState[];
  readonly teams: readonly ReportTeam[];
  readonly players: readonly ReportPlayer[];
  readonly attack: readonly PlayerAttackReport[];
  readonly serve: readonly PlayerServeReport[];
  readonly reception: readonly PlayerReceptionReport[];
  readonly block: readonly PlayerBlockReport[];
  readonly rotations: readonly RotationReport[];
  readonly sideout: readonly RallyRateReport[];
  readonly breakpoint: readonly RallyRateReport[];
  readonly setterDistribution: readonly SetterDistributionReport[];
  readonly teamSummary: readonly TeamSummaryReport[];
  readonly tactical: {
    readonly attackDirections: readonly AttackDirectionReport[];
    readonly attackBySetterPosition: readonly SetterPositionAttackReport[];
    readonly directionsBySetterPosition: readonly SetterPositionDirectionReport[];
  };
}

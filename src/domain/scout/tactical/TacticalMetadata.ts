import type { RallyPhase, ReceptionGrade } from '../events/ScoutEvent';
import type { CourtOrientation } from './CourtGeometry';

export const TACTICAL_METADATA_SCHEMA_VERSION = '2.0.0' as const;

export interface CourtLocation {
  readonly zoneId?: string;
  readonly x?: number;
  readonly y?: number;
}

export type TrajectoryCaptureMethod = 'typed' | 'selected' | 'drawn' | 'derived';

export interface BallTrajectory {
  readonly origin?: CourtLocation;
  readonly target?: CourtLocation;
  readonly direction?: string;
  readonly captureMethod?: TrajectoryCaptureMethod;
}

export interface ServeTacticalData {
  readonly serveType?: string;
  readonly trajectory?: BallTrajectory;
}

export interface ReceptionTacticalData {
  readonly contactLocation?: CourtLocation;
  readonly grade?: ReceptionGrade;
}

export interface SetTacticalData {
  readonly setterCall?: string;
  readonly targetPlayerId?: string;
  readonly targetLocation?: CourtLocation;
  readonly setType?: string;
}

export type AttackBlockOutcome = 'none' | 'point' | 'tool' | 'soft_touch';

export interface AttackBlockData {
  readonly outcome: AttackBlockOutcome;
  readonly blockerIds?: readonly string[];
}

export interface AttackTacticalData {
  readonly attackType?: string;
  readonly trajectory?: BallTrajectory;
  readonly combination?: string;
  readonly tempo?: string;
  readonly blockersCount?: number;
  readonly blockTouchLocation?: CourtLocation;
  readonly block?: AttackBlockData;
}

export interface BlockTacticalData {
  readonly blockersCount?: number;
  readonly touchLocation?: CourtLocation;
}

export interface TacticalMetadata {
  readonly trajectory?: BallTrajectory;
  readonly serve?: ServeTacticalData;
  readonly reception?: ReceptionTacticalData;
  readonly set?: SetTacticalData;
  readonly attack?: AttackTacticalData;
  readonly block?: BlockTacticalData;
  readonly rotation?: number;
  readonly setterPosition?: number;
  readonly phase?: RallyPhase;
}

export interface TacticalMetadataEnvelope {
  readonly schemaVersion: typeof TACTICAL_METADATA_SCHEMA_VERSION;
  readonly tactical: TacticalMetadata;
}

/** Transient capture input removed when SemanticMapper creates canonical V2 metadata. */
export interface TacticalCaptureDraft {
  readonly origin?: CourtLocation;
  readonly target?: CourtLocation;
  readonly direction?: string;
  readonly captureMethod?: TrajectoryCaptureMethod;
  readonly skillType?: string;
  readonly receptionGrade?: ReceptionGrade;
  readonly setterCall?: string;
  readonly tempo?: string;
  readonly combination?: string;
  readonly blockersCount?: number;
  readonly blockOutcome?: AttackBlockOutcome;
  readonly blockerIds?: readonly string[];
  readonly setterPosition?: number;
  readonly phase?: RallyPhase;
  readonly orientation?: CourtOrientation;
}

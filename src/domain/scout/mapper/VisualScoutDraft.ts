import type { Skill } from '../entities/Skill';
import type { RallyPhase, ReceptionGrade } from '../events/ScoutEvent';
import type { CourtLocation, TrajectoryCaptureMethod } from '../tactical/TacticalMetadata';
import type { CourtOrientation } from '../tactical/CourtGeometry';
import type { SpatialMetadata } from '../spatial/SpatialMetadata';

export interface VisualScoutDraft {
  readonly teamId: string;
  readonly playerNumber: number;
  readonly skill: Skill;
  readonly evaluation: string;
  readonly spatial?: SpatialMetadata;
  readonly origin?: CourtLocation;
  readonly target?: CourtLocation;
  readonly contactLocation?: CourtLocation;
  readonly skillType?: string;
  readonly direction?: string;
  readonly receptionGrade?: ReceptionGrade;
  readonly setterCall?: string;
  readonly setterPosition?: number;
  readonly attackTempo?: string;
  readonly attackCombination?: string;
  readonly blockersCount?: number;
  readonly phase?: RallyPhase;
  readonly captureMethod?: TrajectoryCaptureMethod;
  readonly orientation?: CourtOrientation;
}

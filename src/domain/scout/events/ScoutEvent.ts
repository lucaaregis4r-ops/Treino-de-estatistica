import type { ScoreSnapshot } from '../../match/score/Score';
import type { Skill } from '../entities/Skill';
import type { PlayerLineupContext } from '../../match/lineup/SetLineup';
import type { CompletenessResult } from '../completeness/CompletenessResult';
import type {
  AttackBlockOutcome,
  TacticalCaptureDraft,
  TacticalMetadata,
} from '../tactical/TacticalMetadata';
import type { CourtRotationPosition } from '../../match/lineup/SetLineup';
import type { FormationState } from '../../match/tactical/TacticalState';
import type { SpatialMetadata } from '../spatial/SpatialMetadata';

export type RallyPhase = 'sideout' | 'breakpoint' | 'transition';
export type ReceptionGrade = 'A' | 'B' | 'C' | 'ERROR';
export type ScoutInputMode = 'typed' | 'visual' | 'hybrid';

export type ScoutCoverageMode = 'both' | 'team_a' | 'team_b';

export interface ScoutCoverage {
  readonly mode: ScoutCoverageMode;
  readonly observedTeamIds: readonly string[];
}

export interface SubstitutionMetadata {
  readonly playerOutId: string;
  readonly playerInId: string;
}

export interface ScoutEventMetadata {
  readonly coverage?: ScoutCoverage;
  readonly spatial?: SpatialMetadata;
  /** Derived terminal semantics kept alongside the canonical point/error outcome. */
  readonly terminalCause?: 'attack_out' | 'block_out';
  readonly blockTouch?: boolean;
  /** Structured block outcome attached to an attack; absent means legacy/no block. */
  readonly blockOutcome?: AttackBlockOutcome;
  readonly blockerIds?: readonly string[];
  /** Canonical tactical metadata. Legacy flat fields below remain readable during V1 compatibility. */
  readonly schemaVersion?: '2.0.0';
  readonly tactical?: TacticalMetadata;
  readonly captureDraft?: TacticalCaptureDraft;
  readonly skillType?: string;
  readonly originZone?: number;
  readonly targetZone?: number;
  readonly direction?: string;
  readonly receptionGrade?: ReceptionGrade;
  readonly lineup?: readonly string[];
  readonly substitution?: SubstitutionMetadata;
  readonly rotation?: number;
  readonly setterPosition?: number;
  readonly setterCall?: string;
  readonly attackTempo?: string;
  readonly attackCombination?: string;
  readonly blockersCount?: number;
  readonly phase?: RallyPhase;
  readonly transition?: string;
}

export interface ScoutEvent {
  readonly id: string;
  readonly matchId: string;
  readonly rallyId: string;
  readonly sequence: number;
  readonly teamId: string;
  readonly playerId?: string;
  readonly lineupContext?: PlayerLineupContext;
  readonly setterPlayerId?: string;
  readonly setterPosition?: CourtRotationPosition;
  readonly formationState?: FormationState;
  readonly skill: Skill;
  readonly outcome?: string;
  readonly evaluation?: string;
  readonly setNumber: number;
  readonly scoreBefore: ScoreSnapshot;
  readonly timestamp: number;
  /** Missing on legacy events and interpreted as `typed` without rewriting stored history. */
  readonly inputMode?: ScoutInputMode;
  readonly rawCode: string;
  readonly normalizedCode?: string;
  readonly codeProfileId: string;
  readonly codeProfileVersion: string;
  readonly complexityProfileId: string;
  readonly competitionProfileId?: string;
  readonly competitionProfileVersion?: string;
  readonly metadata?: ScoutEventMetadata;
  readonly completeness?: CompletenessResult;
}

export function scoutInputMode(event: Pick<ScoutEvent, 'inputMode'>): ScoutInputMode {
  return event.inputMode ?? 'typed';
}

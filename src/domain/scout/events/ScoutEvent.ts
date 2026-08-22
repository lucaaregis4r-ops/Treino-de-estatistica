import type { ScoreSnapshot } from '../../match/score/Score';
import type { Skill } from '../entities/Skill';
import type { PlayerLineupContext } from '../../match/lineup/SetLineup';
import type { CompletenessResult } from '../completeness/CompletenessResult';
import type { TacticalCaptureDraft, TacticalMetadata } from '../tactical/TacticalMetadata';

export type RallyPhase = 'sideout' | 'breakpoint' | 'transition';
export type ReceptionGrade = 'A' | 'B' | 'C' | 'ERROR';

export interface SubstitutionMetadata {
  readonly playerOutId: string;
  readonly playerInId: string;
}

export interface ScoutEventMetadata {
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
  readonly skill: Skill;
  readonly outcome?: string;
  readonly evaluation?: string;
  readonly setNumber: number;
  readonly scoreBefore: ScoreSnapshot;
  readonly timestamp: number;
  readonly rawCode: string;
  readonly codeProfileId: string;
  readonly codeProfileVersion: string;
  readonly complexityProfileId: string;
  readonly competitionProfileId?: string;
  readonly competitionProfileVersion?: string;
  readonly metadata?: ScoutEventMetadata;
  readonly completeness?: CompletenessResult;
}

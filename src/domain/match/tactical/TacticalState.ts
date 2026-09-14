import type { CourtRotationPosition } from '../lineup/SetLineup';
import type { ScoreSnapshot } from '../score/Score';

export type FormationState = 'normal' | 'five_one_inversion' | 'unknown' | 'custom';

export interface DerivedTacticalState {
  readonly teamId: string;
  readonly primarySetterPlayerId?: string;
  readonly activeSetterPlayerId?: string;
  readonly activeSetterPosition?: CourtRotationPosition;
  readonly formationState: FormationState;
}

export interface SubstitutionWindowEntry {
  readonly eventId: string;
  readonly playerOutId: string;
  readonly playerInId: string;
  readonly playerOutRole: string;
  readonly playerInRole: string;
}

export interface SubstitutionWindow {
  readonly teamId: string;
  readonly setNumber: number;
  readonly score: ScoreSnapshot;
  readonly activeSetterBeforeWindow?: string;
  readonly formationBeforeWindow: FormationState;
  readonly entries: readonly SubstitutionWindowEntry[];
}

export interface DerivedSubstitutionGroup {
  readonly id: string;
  readonly pattern: 'five_one_inversion' | 'five_one_return';
  readonly teamId: string;
  readonly setNumber: number;
  readonly score: ScoreSnapshot;
  readonly eventIds: readonly string[];
}

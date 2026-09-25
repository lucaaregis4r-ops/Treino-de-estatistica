import type { PlayerRole } from '../roles/PlayerRole';

export type AthleteRegistrationSport = 'volleyball' | 'football';

export type FootballRegistrationPosition =
  | 'goalkeeper'
  | 'defender'
  | 'fullback'
  | 'midfielder'
  | 'winger'
  | 'forward'
  | 'custom';

/**
 * This is an optional registration preference, not a match lineup role.  Older
 * registrations intentionally have no sport and remain unclassified.
 */
export type AthleteRegistrationPosition = PlayerRole | FootballRegistrationPosition;

export interface AthleteRegistration {
  readonly id: string;
  readonly name: string;
  readonly sport?: AthleteRegistrationSport;
  readonly number?: number;
  readonly position?: AthleteRegistrationPosition;
  readonly active: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface TeamRegistration {
  readonly id: string;
  readonly name: string;
  /** Explicit for new teams; records without it are legacy and never inferred. */
  readonly sport?: AthleteRegistrationSport;
  readonly shortName?: string;
  readonly category?: string;
  /**
   * Team-specific shirt/role snapshot. `athleteIds` remains for legacy data and
   * is kept in sync when this structured roster is saved.
   */
  readonly roster?: readonly TeamRosterMember[];
  readonly athleteIds: readonly string[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface TeamRosterMember {
  readonly athleteId: string;
  readonly number?: number;
  readonly position?: AthleteRegistrationPosition;
}

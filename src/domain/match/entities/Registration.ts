import type { PlayerRole } from '../roles/PlayerRole';

export interface AthleteRegistration {
  readonly id: string;
  readonly name: string;
  readonly number?: number;
  readonly position?: PlayerRole;
  readonly active: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface TeamRegistration {
  readonly id: string;
  readonly name: string;
  readonly shortName?: string;
  readonly category?: string;
  readonly athleteIds: readonly string[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

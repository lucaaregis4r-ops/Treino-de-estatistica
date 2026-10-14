export type MatchStatus = 'created' | 'in_progress' | 'finished';

import type { SetScoringRules } from '../rules/SetScoringRules';
import type { MatchSport } from './MatchSport';

export interface MatchMetadata {
  readonly id: string;
  readonly name: string;
  readonly teamAId: string;
  readonly teamBId: string;
  readonly createdAt: number;
  readonly status: MatchStatus;
  readonly initialServingTeamId?: string;
  readonly scoringRules?: SetScoringRules;
  readonly liberoPlayerIds?: readonly string[];
  readonly codeProfileId: string;
  readonly codeProfileVersion: string;
  readonly complexityProfileId: string;
  readonly competitionProfileId?: string;
  readonly competitionProfileVersion?: string;
  /** Absent in legacy backups; infer volleyball only from persisted volleyball evidence. */
  readonly sport?: MatchSport;
  readonly footballOrientation?: readonly FootballPeriodOrientation[];
  readonly futsalOrientation?: readonly MatchPeriodOrientation[];
  readonly futsalSettings?: FutsalMatchSettings;
}

export interface FutsalMatchSettings {
  readonly ruleset: 'fifa-2025-26' | 'competition-custom';
  readonly periodDurationMs: number;
  readonly courtMeters?: { readonly length: number; readonly width: number };
}

export type FootballPeriodOrientation = MatchPeriodOrientation;

export interface MatchPeriodOrientation {
  readonly period: 1 | 2;
  readonly teamAAttacksTo?: 'x120' | 'x0';
  readonly teamBAttacksTo?: 'x120' | 'x0';
  readonly physicalSideKnown?: boolean;
}

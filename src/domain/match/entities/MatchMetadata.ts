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
  /** Absent in legacy volleyball backups; absence is intentionally read as volleyball. */
  readonly sport?: MatchSport;
  readonly footballOrientation?: readonly FootballPeriodOrientation[];
}

export interface FootballPeriodOrientation {
  readonly period: 1 | 2;
  readonly teamAAttacksTo?: 'x120' | 'x0';
  readonly teamBAttacksTo?: 'x120' | 'x0';
  readonly physicalSideKnown?: boolean;
}

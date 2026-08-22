export type MatchStatus = 'created' | 'in_progress' | 'finished';

import type { SetScoringRules } from '../rules/SetScoringRules';

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
}

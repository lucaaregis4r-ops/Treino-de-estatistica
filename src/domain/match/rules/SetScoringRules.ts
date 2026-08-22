import type { ScoreSnapshot } from '../score/Score';

export interface SetScoringRules {
  readonly regularSetTarget: number;
  readonly decidingSetTarget: number;
  readonly minimumLead: number;
  readonly setsToWin: number;
}

export const DEFAULT_INDOOR_SCORING_RULES: SetScoringRules = Object.freeze({
  regularSetTarget: 25,
  decidingSetTarget: 15,
  minimumLead: 2,
  setsToWin: 3,
});

export function setWinner(
  score: ScoreSnapshot,
  setNumber: number,
  rules: SetScoringRules,
  teamAId: string,
  teamBId: string,
): string | undefined {
  const target =
    setNumber === rules.setsToWin * 2 - 1 ? rules.decidingSetTarget : rules.regularSetTarget;
  const lead = Math.abs(score.teamA - score.teamB);
  if (Math.max(score.teamA, score.teamB) < target || lead < rules.minimumLead) return undefined;
  return score.teamA > score.teamB ? teamAId : teamBId;
}

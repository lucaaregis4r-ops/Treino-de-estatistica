import type { MatchMetadata } from '../match/entities/MatchMetadata';

export function futsalAttackDirection(metadata: MatchMetadata, period: 1 | 2, teamId: string): 'x120' | 'x0' | undefined {
  const orientation = metadata.futsalOrientation?.find(entry => entry.period === period);
  return teamId === metadata.teamAId ? orientation?.teamAAttacksTo : teamId === metadata.teamBId ? orientation?.teamBAttacksTo : undefined;
}

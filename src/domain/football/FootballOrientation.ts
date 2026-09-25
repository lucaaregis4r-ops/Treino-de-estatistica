import { observedTeamId } from './FootballObservation';
import type { MatchMetadata } from '../match/entities/MatchMetadata';
import type { CanonicalFootballEvent } from './StatsBombContract';

export function footballOrientation(metadata: MatchMetadata, period: number, teamId: string | undefined) {
  const orientation = metadata.footballOrientation?.find(p => p.period === period);
  return teamId === metadata.teamAId ? orientation?.teamAAttacksTo : teamId === metadata.teamBId ? orientation?.teamBAttacksTo : undefined;
}
export function withFootballOrientation(events: readonly CanonicalFootballEvent[], metadata: MatchMetadata) {
  return events.map(event => {
    const teamId = observedTeamId(event) ?? (event.team?.id === 1 ? metadata.teamAId : event.team?.id === 2 ? metadata.teamBId : undefined);
    const direction = footballOrientation(metadata, event.period, teamId);
    return direction && event.scout_trainer ? { ...event, scout_trainer: { ...event.scout_trainer, observation: { ...event.scout_trainer.observation, attacksTo: direction } } } : event;
  });
}

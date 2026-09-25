import type { CanonicalFootballEvent } from './StatsBombContract';
import { outcomeName } from './FootballObservation';

export function pressureEpisodes(events: readonly CanonicalFootballEvent[]) {
  const episodes: { id: string; events: CanonicalFootballEvent[]; outcome: 'beaten' | 'not_beaten' | 'interrupted' | 'censored'; start: CanonicalFootballEvent; end?: CanonicalFootballEvent }[] = [];
  let active: typeof episodes[number] | undefined;
  for (const event of events) {
    const observation = event.scout_trainer?.observation;
    const pressure = observation?.pressure;
    if (active && (event.period !== active.start.period || observation?.coverage === 'suspended' || observation?.restart || (pressure?.episodeId && pressure.episodeId !== active.id))) { active.end = event; active = undefined; }
    if (active && pressure?.kind === 'none') { active.end = event; active = undefined; }
    if (pressure?.episodeId) {
      if (!active) { active = { id: pressure.episodeId, events: [], outcome: 'censored', start: event }; episodes.push(active); }
      active.events.push(event);
    }
    if (!active) continue;
    const after = observation?.after;
    if (observation?.pressureBeaten === 'yes' || observation?.pressureBeaten === 'no') { active.outcome = observation.pressureBeaten === 'yes' ? 'beaten' : 'not_beaten'; active.end = event; active = undefined; }
    else if (after?.kind === 'dead_ball' || outcomeName(event) === 'Goal') { active.outcome = 'interrupted'; active.end = event; active = undefined; }
    else if ((after?.kind === 'controlled' && after.teamId !== active.start.scout_trainer?.observation?.pressure?.pressedTeamId) || after?.kind === 'unknown') { active.end = event; active = undefined; }
  }
  return { episodes, active };
}

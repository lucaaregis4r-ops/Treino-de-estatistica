import { pressureEpisodes } from './FootballPressureEpisode';
import type { CanonicalFootballEvent } from './StatsBombContract';
import { orientStatsBombLocation } from './StatsBombContract';
import { projectControl } from './FootballObservation';

export function pressureKind(event: CanonicalFootballEvent) {
  return event.scout_trainer?.observation?.pressure?.kind ?? ((event as CanonicalFootballEvent & { under_pressure?: boolean }).under_pressure === true ? 'present_unspecified' : 'unknown');
}
export function pressureAnalytics(events: readonly CanonicalFootballEvent[], fullHistory = events) {
  const known = events.filter(e => pressureKind(e) !== 'unknown');
  const pressed = known.filter(e => pressureKind(e) !== 'none');
  const zones = Array.from({ length: 96 }, (_, index) => ({ index, total: 0, known: 0, pressed: 0, eventIds: [] as string[] }));
  let spatialExcluded = 0;
  for (const event of events) {
    const direction = event.scout_trainer?.observation?.attacksTo;
    if (!event.location || !direction) { spatialExcluded++; continue; }
    const [x, y] = orientStatsBombLocation(event.location, direction);
    const zone = zones[Math.min(7, Math.floor(y / 10)) * 12 + Math.min(11, Math.floor(x / 10))];
    zone.total++; zone.eventIds.push(event.id);
    if (pressureKind(event) !== 'unknown') zone.known++;
    if (!['unknown', 'none'].includes(pressureKind(event))) zone.pressed++;
  }
  const withControl = pressed.filter(e => ['controlled', 'dead_ball', 'contested'].includes(e.scout_trainer?.observation?.after?.kind ?? 'unknown'));
  const maintained = withControl.filter(e => { const o = e.scout_trainer?.observation; return o?.after?.kind === 'controlled' && o.after.teamId === o.teamId; });
  const lost = withControl.filter(e => { const o = e.scout_trainer?.observation; return o?.after?.kind === 'controlled' && o.after.teamId !== o.teamId; });
  const possessions = projectControl(fullHistory).segments.filter(p => p.events.some(e => pressed.includes(e)));
  const complete = possessions.filter(p => p.complete);
  const episodeData = pressureEpisodes(fullHistory).episodes.filter(p => p.events.some(e => pressed.includes(e)));
  return { episodeData, known, pressed, zones, spatialExcluded, withControl, maintained, lost,
    episodes: new Set(pressed.flatMap(e => e.scout_trainer?.observation?.pressure?.episodeId ? [e.scout_trainer.observation.pressure.episodeId] : [])),
    possessions, complete, reachedShot: complete.filter(p => p.events.some(e => e.type.id === 16)) };
}

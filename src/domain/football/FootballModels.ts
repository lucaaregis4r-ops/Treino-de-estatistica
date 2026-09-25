import xgArtifact from '../../../reference/football-models/xg.json';
import xtArtifact from '../../../reference/football-models/xt.json';
import type { CanonicalFootballEvent, StatsBombLocation } from './StatsBombContract';
import { orientStatsBombLocation } from './StatsBombContract';
import { outcomeName, projectControl } from './FootballObservation';

export interface FootballEstimate { eventId: string; value?: number; modelId: string; modelVersion: string; source: string; eligible: boolean; missingReasons: string[] }
export function estimateXg(event: CanonicalFootballEvent): FootballEstimate {
  const base = { eventId: event.id, modelId: xgArtifact.id, modelVersion: xgArtifact.version, source: 'local' };
  if (event.type.id !== 16) return { ...base, eligible: false, missingReasons: ['Não é finalização'] };
  const imported = event.shot?.statsbomb_xg;
  if (typeof imported === 'number' && Number.isFinite(imported) && imported >= 0 && imported <= 1) return { ...base, modelId: 'statsbomb-imported', modelVersion: 'provider-unspecified', source: 'StatsBomb', eligible: true, value: imported, missingReasons: [] };
  const direction = event.scout_trainer?.observation?.attacksTo;
  if (!event.location || !direction) return { ...base, eligible: false, missingReasons: [!event.location ? 'Sem posição' : 'Sem orientação observada'] };
  const [x, y] = orientStatsBombLocation(event.location, direction);
  const dx = (120 - x) * 105 / 120, dy = (y - 40) * 68 / 80;
  const features = [1, Math.hypot(dx, dy) / 30, Math.atan2(7.32 * dx, dx * dx + dy * dy - (7.32 / 2) ** 2)];
  const logit = features.reduce((sum, feature, i) => sum + feature * xgArtifact.coefficients[i], 0);
  return { ...base, eligible: true, value: 1 / (1 + Math.exp(-logit)), missingReasons: [] };
}
export interface XtGrid { id: string; version: string; width: number; height: number; values: readonly number[]; counts: readonly number[] }
export function estimateXt(event: CanonicalFootballEvent, grid: XtGrid = xtArtifact): FootballEstimate & { start?: number; end?: number } {
  const base = { eventId: event.id, modelId: grid.id, modelVersion: grid.version, source: 'local' };
  const direction = event.scout_trainer?.observation?.attacksTo;
  const end = event.pass?.end_location ?? event.carry?.end_location;
  const obs = event.scout_trainer?.observation;
  const reasons: string[] = [];
  if (![30, 43].includes(event.type.id) || (event.type.id === 30 && outcomeName(event) !== 'Complete')) reasons.push('Progressão não elegível');
  if (!event.location || !end) reasons.push('Origem ou destino ausente');
  if (!direction) reasons.push('Sem orientação observada');
  if (obs?.after?.kind !== 'controlled' || obs.after.teamId !== obs.teamId) reasons.push('Manutenção de controle não observada');
  if (reasons.length || !event.location || !end || !direction) return { ...base, eligible: false, missingReasons: reasons };
  const cell = (loc: StatsBombLocation) => { const [x, y] = orientStatsBombLocation(loc, direction); return Math.min(grid.height - 1, Math.floor(y / 80 * grid.height)) * grid.width + Math.min(grid.width - 1, Math.floor(x / 120 * grid.width)); };
  const startIndex = cell(event.location), endIndex = cell(end);
  if (!grid.counts[startIndex] || !grid.counts[endIndex]) return { ...base, eligible: false, missingReasons: ['Célula sem suporte no treino'] };
  const start = grid.values[startIndex], finish = grid.values[endIndex];
  return { ...base, eligible: true, value: finish - start, start, end: finish, missingReasons: [] };
}
/** At most one creator per shot; a shot consumes the link, including rebounds. */
export function attributeChances(events: readonly CanonicalFootballEvent[]) {
  const attribution = new Map<string, string>();
  for (const possession of projectControl(events).segments) {
    let creator: CanonicalFootballEvent | undefined;
    for (const event of possession.events) {
      if (event.scout_trainer?.observation?.coverage === 'suspended') creator = undefined;
      if (event.type.id === 16) { if (creator) attribution.set(event.id, creator.id); creator = undefined; }
      else if (estimateXt(event).eligible) creator = event;
      else creator = undefined;
    }
  }
  return events.filter(e => e.type.id === 16).map(event => ({ shotId: event.id, creatorId: attribution.get(event.id), estimate: estimateXg(event) }));
}

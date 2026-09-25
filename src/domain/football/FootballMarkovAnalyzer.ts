import type { CanonicalFootballEvent } from './StatsBombContract';
import { orientStatsBombLocation } from './StatsBombContract';
import { projectControl } from './FootballObservation';

export const TACTICAL_PATH_VERSION = 'observed-v1';
export function tacticalState(event: CanonicalFootballEvent): string | undefined {
  if (event.type.id === 16) return 'Finalização';
  if (event.type.id === 3) return 'Perda';
  const direction = event.scout_trainer?.observation?.attacksTo;
  const end = event.pass?.end_location ?? event.carry?.end_location ?? event.scout_trainer?.observation?.position ?? event.location;
  if (!direction || !end) return undefined;
  const [x, y] = orientStatsBombLocation(end, direction);
  if (x >= 102 && y >= 18 && y <= 62) return 'Área';
  return x >= 80 ? 'Último terço' : x >= 40 ? 'Progressão' : 'Construção';
}
export type FootballMarkovMode = 'zones' | 'actions';
const actionStates: Record<number, string> = { 30: 'Passe', 43: 'Condução', 14: 'Drible', 4: 'Desarme', 10: 'Interceptação', 2: 'Recuperação', 3: 'Perda', 16: 'Finalização', 22: 'Falta' };
export function analyzeMarkov(events: readonly CanonicalFootballEvent[], includedIds = new Set(events.map(e => e.id)), mode: FootballMarkovMode = 'zones') {
  const possessions = projectControl(events).segments;
  const byId = new Map(events.map(event => [event.id, event]));
  const transitions: { from: string; to: string; eventIds: string[]; possession: number }[] = [];
  for (const possession of possessions) {
    let previous: { state: string; id: string } | undefined;
    const ids = new Set([...possession.events.map(event => event.id), ...possession.marks.map(mark => mark.eventId)]);
    const sequence = [...ids].map(id => byId.get(id)).filter((event): event is CanonicalFootballEvent => Boolean(event));
    for (const event of [...sequence].sort((a, b) => a.index - b.index)) {
      if (!includedIds.has(event.id) || event.scout_trainer?.observation?.coverage === 'suspended') { previous = undefined; continue; }
      const observation = event.scout_trainer?.observation;
      if (event.type.id === 1000 && observation?.after?.kind !== 'controlled') { previous = undefined; continue; }
      // Non-spatial control/pressure updates are not invented spatial states.
      if (event.type.id === 1000 && (mode === 'actions' || !(observation?.position ?? event.location))) continue;
      const state = mode === 'actions' ? actionStates[event.type.id] : tacticalState(event);
      if (!state) { previous = undefined; continue; }
      if (previous) transitions.push({ from: previous.state, to: state, eventIds: [previous.id, event.id], possession: possession.id });
      previous = ['Finalização', 'Perda', 'Falta'].includes(state) || observation?.after?.kind === 'unknown' || observation?.after?.kind === 'contested' || observation?.after?.kind === 'dead_ball' ? undefined : { state, id: event.id };
    }
  }
  const states = [...new Set(transitions.flatMap(t => [t.from, t.to]))];
  const matrix = states.flatMap(from => states.map(to => {
    const evidence = transitions.filter(t => t.from === from && t.to === to);
    const total = transitions.filter(t => t.from === from).length;
    return { from, to, count: evidence.length, total, probability: total ? evidence.length / total : undefined, evidence };
  }));
  const cohorts = ['3+1', '3+2', 'other', 'not_observed'].map(structure => {
    const selected = possessions.filter(p => {
      const observed = p.events.find(e => e.scout_trainer?.tactical_context?.build_structure)?.scout_trainer?.tactical_context?.build_structure ?? 'not_observed';
      return (structure === 'other' ? !['3+1', '3+2', 'not_observed'].includes(observed) : observed === structure) && p.events.some(e => includedIds.has(e.id));
    });
    const eligible = selected.filter(p => p.complete);
    const reached = eligible.filter(p => p.events.some(e => e.type.id === 16));
    return { structure, denominator: eligible.length, numerator: reached.length, incomplete: selected.length - eligible.length, evidence: eligible };
  });
  return { states, matrix, transitions, cohorts };
}

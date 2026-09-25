import { outcomeName, projectControl } from './FootballObservation';
import type { CanonicalFootballEvent, FootballTacticalContext, StatsBombLocation } from './StatsBombContract';
import { deriveSpatialZone, orientStatsBombLocation } from './StatsBombContract';

export type FootballReadMode = 'actions' | 'trajectories' | 'density';
export type DangerousCriterion = 'entered_area' | 'had_shot' | 'had_goal';
export interface FootballEventFilter { readonly teamId?: number; readonly period?: 1 | 2; readonly typeId?: number; readonly buildStructure?: FootballTacticalContext['build_structure']; readonly playPatternId?: number; readonly origin?: FootballTacticalContext['origin']; readonly pressure?: FootballTacticalContext['pressure']; readonly third?: 'defensive' | 'middle' | 'attacking'; readonly outcome?: string; }
export interface FootballPossession { readonly number?: number; readonly teamId?: number; readonly events: readonly CanonicalFootballEvent[]; readonly complete: boolean; readonly startLocation?: StatsBombLocation; readonly tacticalContext?: FootballTacticalContext; }
export interface PossessionMetric { readonly numerator: number; readonly denominator: number; readonly label: string; readonly eligible: number; }

export function buildPossessions(events: readonly CanonicalFootballEvent[]): readonly FootballPossession[] {
  if (events.some(e => e.scout_trainer?.observation?.after)) {
    const projected = projectControl(events).segments.filter(p => p.events.length);
    return projected.map(p => ({ number: p.id, teamId: p.events.find(e => e.scout_trainer?.observation?.teamId === p.teamId)?.team?.id, events: p.events, complete: p.complete, startLocation: p.events.find(e => e.location)?.location, tacticalContext: p.events.find(e => e.scout_trainer?.tactical_context)?.scout_trainer?.tactical_context }));
  }
  const map = new Map<string, CanonicalFootballEvent[]>();
  for (const event of [...events].sort((a, b) => a.index - b.index)) {
    const key = event.possession === undefined ? `open:${event.index}` : ` ${event.period}:${event.possession_team?.id ?? "?"}:${event.possession}`;
    const current = map.get(key) ?? []; current.push(event); map.set(key, current);
  }
  return [...map.entries()].map(([key, grouped]) => ({ number: key.startsWith('open:') ? undefined : grouped[0].possession, teamId: grouped.find((e) => e.possession_team)?.possession_team?.id, events: grouped, complete: grouped.some((e) => e.scout_trainer?.possession_closed === true), startLocation: grouped.find((e) => e.location)?.location, tacticalContext: grouped.find((e) => e.scout_trainer?.tactical_context)?.scout_trainer.tactical_context }));
}

function locationFor(event: CanonicalFootballEvent): StatsBombLocation | undefined { return event.location; }
function matches(event: CanonicalFootballEvent, filter: FootballEventFilter): boolean {
  const context = event.scout_trainer?.tactical_context;
  const zone = deriveSpatialZone(locationFor(event));
  return (filter.teamId === undefined || event.team?.id === filter.teamId) && (filter.period === undefined || event.period === filter.period) && (filter.typeId === undefined || event.type.id === filter.typeId) && (filter.buildStructure === undefined || context?.build_structure === filter.buildStructure) && (filter.playPatternId === undefined || event.play_pattern?.id === filter.playPatternId) && (filter.origin === undefined || context?.origin === filter.origin) && (filter.pressure === undefined || context?.pressure === filter.pressure) && (filter.third === undefined || zone?.third === filter.third) && (filter.outcome === undefined || outcomeName(event) === filter.outcome);
}

/** Filters events without connecting the remaining first/last points. */
export function selectFootballEvents(events: readonly CanonicalFootballEvent[], filter: FootballEventFilter): readonly CanonicalFootballEvent[] { return events.filter((event) => matches(event, filter)).sort((a, b) => a.index - b.index); }
export function selectFootballPossessions(events: readonly CanonicalFootballEvent[], filter: FootballEventFilter): readonly FootballPossession[] { return buildPossessions(events).filter((possession) => possession.events.some((event) => matches(event, filter))); }
export function trajectoryEvents(events: readonly CanonicalFootballEvent[]): readonly CanonicalFootballEvent[] { return events.filter((event) => (event.type.id === 30 || event.type.id === 43) && event.location && (event.pass?.end_location || event.carry?.end_location)); }
export function densityPoints(events: readonly CanonicalFootballEvent[]): readonly StatsBombLocation[] { return events.flatMap((event) => event.location ? [event.location] : []); }

export function dangerousPossessions(events: readonly CanonicalFootballEvent[], criterion: DangerousCriterion): readonly FootballPossession[] {
  return buildPossessions(events).filter((possession) => possession.events.some((event) => criterion === 'had_shot' ? event.type.id === 16 : criterion === 'had_goal' ? event.type.id === 16 && outcomeName(event) === 'Goal' : enteredArea(event)));
}

export function metric(label: string, numerator: number, denominator: number, eligible = denominator): PossessionMetric { return { label, numerator, denominator, eligible }; }

function enteredArea(event: CanonicalFootballEvent): boolean {
  const end = event.pass?.end_location ?? event.carry?.end_location;
  const direction = event.scout_trainer?.observation?.attacksTo;
  if (!end || !direction) return false;
  const [x,y] = orientStatsBombLocation(end,direction);
  return x >= 102 && y >= 18 && y <= 62;
}

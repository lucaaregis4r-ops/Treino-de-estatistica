import type { MatchEvent } from '../../match/events/MatchEvent';
import { matchEventSequence } from '../../match/events/MatchEvent';
import { projectEffectiveMatchEvents } from '../../match/events/ScoutTimeline';
import type { ScoreSnapshot } from '../../match/score/Score';
import type { TacticalRallyProjection } from '../../rally/context/TacticalRallyProjection';
import type { ScoutEvent } from '../../scout/events/ScoutEvent';
import type { Skill } from '../../scout/entities/Skill';
import { spatialContextForEvent, type SpatialContext } from '../sequence/SpatialContext';
import type { ZoneSystemProfile } from '../../scout/tactical/ZoneSystemProfile';

export type RallyPathInput = readonly ScoutEvent[] | readonly MatchEvent[];
/** Skills present in scout events plus explicit analytical labels used by fixtures/imports. */
export type RallyPathSkill = Skill | 'defense' | 'fault';

export interface PathStateDescriptor {
  readonly key: string;
  readonly teamId: string;
  readonly skill: RallyPathSkill | 'terminal';
  readonly quality?: string;
  readonly terminal?: boolean;
}

export interface RallyPathContact {
  readonly sourceEventId: string;
  readonly teamId: string;
  readonly skill: RallyPathSkill;
  readonly quality?: string;
  readonly state: PathStateDescriptor;
  readonly setNumber: number;
  readonly sequence: number;
  readonly playerId?: string;
  readonly rotation?: string | number;
  readonly spatial: SpatialContext;
  readonly scoreBefore?: ScoreSnapshot;
  readonly event?: ScoutEvent;
  readonly faultType?: string;
}

export interface RallyPathTerminal {
  readonly state: PathStateDescriptor;
  readonly winnerTeamId: string;
  readonly sourceEventId?: string;
  readonly cause?: string;
}

export interface RallyPathRally {
  readonly rallyId: string;
  readonly setNumber: number;
  readonly contacts: readonly RallyPathContact[];
  readonly terminal?: RallyPathTerminal;
  readonly status: 'eligible' | 'incomplete' | 'excluded';
  readonly exclusionReason?:
    'missing_winner' | 'conflicting_winner' | 'invalid_order' | 'empty_rally';
}

export interface RallyPathBuildResult {
  readonly rallies: readonly RallyPathRally[];
  readonly eligible: readonly RallyPathRally[];
  readonly excluded: readonly RallyPathRally[];
}

export interface PathModelTransition {
  readonly id: string;
  readonly from: PathStateDescriptor;
  readonly to: PathStateDescriptor;
  readonly count: number;
  readonly probability: number;
}

export interface RallyPathModel {
  readonly referenceTeamId: string;
  readonly setNumber?: number;
  readonly status: 'available' | 'unavailable';
  readonly reason?: 'no_completed_rallies' | 'closed_class' | 'not_converged' | 'invalid_residue';
  readonly states: readonly PathStateDescriptor[];
  readonly transitions: readonly PathModelTransition[];
  readonly values: Readonly<Record<string, number | null>>;
  readonly eligibleRallies: readonly RallyPathRally[];
  readonly excludedRallies: readonly RallyPathRally[];
  readonly contextRallyCount: number;
  readonly matrixDimension: number;
  readonly iterations: number;
}

export interface RallyPathFocusFilters {
  readonly teamId: string;
  readonly skill: RallyPathSkill;
  readonly quality?: string;
  readonly playerId?: string;
  readonly rotation?: string | number;
  readonly spatialRole?: 'origin' | 'target';
  readonly spatialRegionId?: string;
}

export interface RallyPathOccurrence {
  readonly id: string;
  readonly rally: RallyPathRally;
  readonly contact: RallyPathContact;
  readonly contactIndex: number;
  readonly path: readonly PathStateDescriptor[];
  readonly nextState: PathStateDescriptor;
}

export interface RallyPathFocusResult {
  readonly filters: RallyPathFocusFilters;
  readonly occurrences: readonly RallyPathOccurrence[];
  readonly occurrenceCount: number;
  readonly rallyIds: readonly string[];
  readonly observedWins: number;
  readonly observedLosses: number;
  readonly observedPointRate: number | null;
  readonly potential: number | null;
  readonly inputDistribution: readonly PathModelTransition[];
  readonly availableForHeadline: boolean;
}

export interface FlowNode {
  readonly id: string;
  readonly depth: number;
  readonly kind: 'state' | 'other';
  readonly state?: PathStateDescriptor;
  readonly count: number;
  readonly occurrenceIds: readonly string[];
  readonly nextDistribution: readonly PathModelTransition[];
  readonly potential: number | null;
}

export interface FlowLink {
  readonly id: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly count: number;
  readonly prefixCount: number;
  readonly localProbability: number;
  readonly occurrenceIds: readonly string[];
  readonly groupedComponents?: readonly string[];
}

export interface RallyPathFlow {
  readonly horizon: 1 | 2;
  readonly nodes: readonly FlowNode[];
  readonly links: readonly FlowLink[];
}

export interface QualityComparison {
  readonly quality?: string;
  readonly occurrences: number;
  readonly rallies: number;
  readonly observedWins: number;
  readonly observedPointRate: number | null;
  readonly potential: number | null;
  readonly differenceVsReference: number | null;
  readonly availableForHeadline: boolean;
}

function isMatchEventInput(input: RallyPathInput): input is readonly MatchEvent[] {
  const first = input[0] as MatchEvent | ScoutEvent | undefined;
  return Boolean(first && 'type' in first);
}

function stateKey(teamId: string, skill: RallyPathSkill | 'terminal', quality?: string): string {
  return JSON.stringify([teamId, skill, quality ?? null]);
}

function state(
  teamId: string,
  skill: RallyPathSkill | 'terminal',
  quality?: string,
  terminal = false,
): PathStateDescriptor {
  return Object.freeze({
    key: stateKey(teamId, skill, quality),
    teamId,
    skill,
    ...(quality !== undefined ? { quality } : {}),
    ...(terminal ? { terminal: true } : {}),
  });
}

function rotationFor(event: ScoutEvent): string | number | undefined {
  return event.lineupContext?.rotationPosition ?? event.setterPosition ?? event.metadata?.rotation;
}

function eventContact(event: ScoutEvent, zoneSystem: ZoneSystemProfile): RallyPathContact {
  const quality = event.evaluation;
  return Object.freeze({
    sourceEventId: event.id,
    teamId: event.teamId,
    skill: event.skill,
    ...(quality !== undefined ? { quality } : {}),
    state: state(event.teamId, event.skill, quality),
    setNumber: event.setNumber,
    sequence: event.sequence,
    ...(event.playerId ? { playerId: event.playerId } : {}),
    ...(rotationFor(event) !== undefined ? { rotation: rotationFor(event) } : {}),
    spatial: spatialContextForEvent(event, zoneSystem),
    scoreBefore: event.scoreBefore,
    event,
  });
}

function faultContact(
  event: Extract<MatchEvent, { type: 'fault' }>,
  setNumber: number,
): RallyPathContact {
  return Object.freeze({
    sourceEventId: event.id,
    teamId: event.teamId,
    skill: 'fault',
    quality: event.faultType,
    state: state(event.teamId, 'fault', event.faultType),
    setNumber,
    sequence: event.sequence,
    ...(event.athleteId ? { playerId: event.athleteId } : {}),
    spatial: Object.freeze({ coordinateSystemVersion: 'none' }),
    faultType: event.faultType,
  });
}

type TerminalCandidate = {
  readonly winnerTeamId: string;
  readonly sourceEventId?: string;
  readonly cause?: string;
};

function terminalCandidates(
  input: RallyPathInput,
  tacticalRally: TacticalRallyProjection | undefined,
): ReadonlyMap<string, readonly TerminalCandidate[]> {
  const candidates = new Map<string, TerminalCandidate[]>();
  const add = (rallyId: string, candidate: TerminalCandidate) => {
    const current = candidates.get(rallyId) ?? [];
    if (
      !current.some(
        (item) => item.winnerTeamId === candidate.winnerTeamId && item.cause === candidate.cause,
      )
    )
      candidates.set(rallyId, [...current, candidate]);
  };
  if (isMatchEventInput(input)) {
    projectEffectiveMatchEvents(input).forEach((event) => {
      if (event.type === 'rally_result')
        add(event.rallyId, {
          winnerTeamId: event.winnerTeamId,
          sourceEventId: event.id,
          cause: event.reason,
        });
      if (event.type === 'rally_ended' && event.winningTeamId)
        add(event.rallyId, { winnerTeamId: event.winningTeamId, sourceEventId: event.id });
      if (event.type === 'fault')
        add(event.rallyId, {
          winnerTeamId: event.pointFor,
          sourceEventId: event.id,
          cause: event.faultType,
        });
      if (event.type === 'match_correction')
        add(event.correction.rallyId, {
          winnerTeamId: event.correction.teamId,
          sourceEventId: event.id,
          cause: 'correction',
        });
    });
  }
  tacticalRally?.rallies.forEach((rally) => {
    if (rally.winnerTeamId) add(rally.rallyId, { winnerTeamId: rally.winnerTeamId });
  });
  return candidates;
}

export function buildRallyPathRallies(
  input: RallyPathInput,
  tacticalRally: TacticalRallyProjection | undefined,
  zoneSystem: ZoneSystemProfile,
): RallyPathBuildResult {
  const scouts: readonly ScoutEvent[] = isMatchEventInput(input)
    ? projectEffectiveMatchEvents(input).flatMap((event) =>
        event.type === 'scout_registered' ? [event.event] : [],
      )
    : input;
  const effective = isMatchEventInput(input) ? projectEffectiveMatchEvents(input) : [];
  const currentSetBySequence = new Map<number, number>();
  let currentSet = 1;
  effective.forEach((event) => {
    if (event.type === 'set_started') currentSet = event.setNumber;
    currentSetBySequence.set(matchEventSequence(event), currentSet);
  });
  const groups = new Map<
    string,
    { scouts: ScoutEvent[]; faults: Extract<MatchEvent, { type: 'fault' }>[] }
  >();
  scouts.forEach((event) => {
    const current = groups.get(event.rallyId) ?? { scouts: [], faults: [] };
    current.scouts.push(event);
    groups.set(event.rallyId, current);
  });
  if (isMatchEventInput(input)) {
    effective.forEach((event) => {
      if (event.type !== 'fault') return;
      const current = groups.get(event.rallyId) ?? { scouts: [], faults: [] };
      current.faults.push(event);
      groups.set(event.rallyId, current);
    });
  }
  const candidates = terminalCandidates(input, tacticalRally);
  const rallies = [...groups.entries()].map(([rallyId, group]) => {
    const ordered = [
      ...group.scouts.map((event) => eventContact(event, zoneSystem)),
      ...group.faults.map((event) =>
        faultContact(
          event,
          group.scouts[0]?.setNumber ?? currentSetBySequence.get(event.sequence) ?? currentSet,
        ),
      ),
    ].sort(
      (left, right) =>
        left.sequence - right.sequence || left.sourceEventId.localeCompare(right.sourceEventId),
    );
    const duplicateOrder = ordered.some(
      (item, index) => index > 0 && item.sequence === ordered[index - 1]?.sequence,
    );
    const terminalOptions = candidates.get(rallyId) ?? [];
    const winnerIds = [...new Set(terminalOptions.map((item) => item.winnerTeamId))];
    const terminalOption = terminalOptions[0];
    const setNumber = ordered[0]?.setNumber ?? currentSet;
    if (ordered.length === 0)
      return {
        rallyId,
        setNumber,
        contacts: [],
        status: 'excluded' as const,
        exclusionReason: 'empty_rally' as const,
      };
    if (duplicateOrder)
      return {
        rallyId,
        setNumber,
        contacts: Object.freeze(ordered),
        status: 'excluded' as const,
        exclusionReason: 'invalid_order' as const,
      };
    if (winnerIds.length > 1)
      return {
        rallyId,
        setNumber,
        contacts: Object.freeze(ordered),
        status: 'excluded' as const,
        exclusionReason: 'conflicting_winner' as const,
      };
    if (!terminalOption)
      return {
        rallyId,
        setNumber,
        contacts: Object.freeze(ordered),
        status: 'incomplete' as const,
        exclusionReason: 'missing_winner' as const,
      };
    const terminalState = state(terminalOption.winnerTeamId, 'terminal', undefined, true);
    return {
      rallyId,
      setNumber,
      contacts: Object.freeze(ordered),
      terminal: Object.freeze({
        state: terminalState,
        winnerTeamId: terminalOption.winnerTeamId,
        ...(terminalOption.sourceEventId ? { sourceEventId: terminalOption.sourceEventId } : {}),
        ...(terminalOption.cause ? { cause: terminalOption.cause } : {}),
      }),
      status: 'eligible' as const,
    };
  });
  return Object.freeze({
    rallies: Object.freeze(rallies),
    eligible: Object.freeze(rallies.filter((rally) => rally.status === 'eligible')),
    excluded: Object.freeze(rallies.filter((rally) => rally.status !== 'eligible')),
  });
}

function stateDescriptorMap(
  rallies: readonly RallyPathRally[],
): ReadonlyMap<string, PathStateDescriptor> {
  const states = new Map<string, PathStateDescriptor>();
  rallies.forEach((rally) => {
    rally.contacts.forEach((contact) => states.set(contact.state.key, contact.state));
    if (rally.terminal) states.set(rally.terminal.state.key, rally.terminal.state);
  });
  return states;
}

function scopedRallies(
  rallies: readonly RallyPathRally[],
  setNumber?: number,
): {
  readonly eligible: readonly RallyPathRally[];
  readonly excluded: readonly RallyPathRally[];
  readonly contextCount: number;
} {
  const scoped = rallies.filter(
    (rally) => setNumber === undefined || rally.setNumber === setNumber,
  );
  return {
    eligible: scoped.filter((rally) => rally.status === 'eligible'),
    excluded: scoped.filter((rally) => rally.status !== 'eligible'),
    contextCount: scoped.length,
  };
}

function recordValues(
  states: ReadonlyMap<string, number | null>,
): Readonly<Record<string, number | null>> {
  return Object.freeze(Object.fromEntries(states.entries()));
}

export function buildRallyPathModel(
  rallies: readonly RallyPathRally[],
  referenceTeamId: string,
  setNumber?: number,
): RallyPathModel {
  const scoped = scopedRallies(rallies, setNumber);
  const descriptors = stateDescriptorMap(scoped.eligible);
  const counts = new Map<
    string,
    { from: PathStateDescriptor; to: PathStateDescriptor; count: number }
  >();
  const rowTotals = new Map<string, number>();
  scoped.eligible.forEach((rally) => {
    const states = [
      ...rally.contacts.map((contact) => contact.state),
      ...(rally.terminal ? [rally.terminal.state] : []),
    ];
    states.slice(0, -1).forEach((from, index) => {
      const to = states[index + 1];
      if (!to) return;
      const key = `${from.key}->${to.key}`;
      const current = counts.get(key);
      counts.set(key, { from, to, count: (current?.count ?? 0) + 1 });
      rowTotals.set(from.key, (rowTotals.get(from.key) ?? 0) + 1);
    });
  });
  const transient = [...descriptors.values()].filter((item) => !item.terminal);
  const terminal = [...descriptors.values()].filter((item) => item.terminal);
  if (scoped.eligible.length === 0) {
    return {
      referenceTeamId,
      ...(setNumber !== undefined ? { setNumber } : {}),
      status: 'unavailable',
      reason: 'no_completed_rallies',
      states: Object.freeze([...descriptors.values()]),
      transitions: Object.freeze([]),
      values: Object.freeze({}),
      eligibleRallies: Object.freeze([]),
      excludedRallies: Object.freeze(scoped.excluded),
      contextRallyCount: scoped.contextCount,
      matrixDimension: 0,
      iterations: 0,
    };
  }
  const adjacency = new Map<string, readonly string[]>();
  counts.forEach((item) =>
    adjacency.set(item.from.key, [...(adjacency.get(item.from.key) ?? []), item.to.key]),
  );
  const canReachTerminal = (start: string): boolean => {
    const visited = new Set<string>();
    const stack = [start];
    while (stack.length) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      if (descriptors.get(current)?.terminal) return true;
      (adjacency.get(current) ?? []).forEach((next) => stack.push(next));
    }
    return false;
  };
  if (transient.some((item) => !canReachTerminal(item.key))) {
    return {
      referenceTeamId,
      ...(setNumber !== undefined ? { setNumber } : {}),
      status: 'unavailable',
      reason: 'closed_class',
      states: Object.freeze([...descriptors.values()]),
      transitions: Object.freeze(
        [...counts.values()].map((item) => ({
          id: `${item.from.key}->${item.to.key}`,
          ...item,
          probability: item.count / (rowTotals.get(item.from.key) ?? 1),
        })),
      ),
      values: Object.freeze({}),
      eligibleRallies: Object.freeze(scoped.eligible),
      excludedRallies: Object.freeze(scoped.excluded),
      contextRallyCount: scoped.contextCount,
      matrixDimension: transient.length,
      iterations: 0,
    };
  }
  const values = new Map<string, number | null>();
  terminal.forEach((item) => values.set(item.key, item.teamId === referenceTeamId ? 1 : 0));
  transient.forEach((item) => values.set(item.key, 0));
  let iterations: number;
  let converged = false;
  for (iterations = 1; iterations <= 10000; iterations += 1) {
    const next = new Map(values);
    let maxDifference = 0;
    transient.forEach((from) => {
      const denominator = rowTotals.get(from.key) ?? 0;
      if (!denominator) return;
      const value = [...counts.values()]
        .filter((item) => item.from.key === from.key)
        .reduce(
          (sum, item) => sum + (item.count / denominator) * (values.get(item.to.key) ?? 0),
          0,
        );
      next.set(from.key, value);
      maxDifference = Math.max(maxDifference, Math.abs(value - (values.get(from.key) ?? 0)));
    });
    values.clear();
    next.forEach((value, key) => values.set(key, value));
    if (maxDifference < 1e-10) {
      converged = true;
      break;
    }
  }
  const residual = transient.reduce((max, from) => {
    const denominator = rowTotals.get(from.key) ?? 0;
    const expected = [...counts.values()]
      .filter((item) => item.from.key === from.key)
      .reduce((sum, item) => sum + (item.count / denominator) * (values.get(item.to.key) ?? 0), 0);
    return Math.max(max, Math.abs(expected - (values.get(from.key) ?? 0)));
  }, 0);
  const validValues = [...values.values()].every(
    (value) => value !== null && value >= -1e-12 && value <= 1 + 1e-12,
  );
  const available = converged && residual < 1e-8 && validValues;
  const transitions = [...counts.values()].map((item) => ({
    id: `${item.from.key}->${item.to.key}`,
    ...item,
    probability: item.count / (rowTotals.get(item.from.key) ?? 1),
  }));
  return {
    referenceTeamId,
    ...(setNumber !== undefined ? { setNumber } : {}),
    status: available ? 'available' : 'unavailable',
    ...(available
      ? {}
      : { reason: converged ? ('invalid_residue' as const) : ('not_converged' as const) }),
    states: Object.freeze([...descriptors.values()]),
    transitions: Object.freeze(transitions),
    values: available ? recordValues(values) : Object.freeze({}),
    eligibleRallies: Object.freeze(scoped.eligible),
    excludedRallies: Object.freeze(scoped.excluded),
    contextRallyCount: scoped.contextCount,
    matrixDimension: transient.length,
    iterations,
  };
}

function matchesFocus(contact: RallyPathContact, filters: RallyPathFocusFilters): boolean {
  if (contact.teamId !== filters.teamId || contact.skill !== filters.skill) return false;
  if (filters.quality !== undefined && (contact.quality ?? '__missing__') !== filters.quality)
    return false;
  if (filters.playerId !== undefined && contact.playerId !== filters.playerId) return false;
  if (filters.rotation !== undefined && contact.rotation !== filters.rotation) return false;
  if (filters.spatialRegionId !== undefined) {
    const point =
      filters.spatialRole === 'origin' ? contact.spatial.origin : contact.spatial.target;
    if (filters.spatialRegionId === '__outside__') {
      if (point?.surface !== 'outZone') return false;
    } else {
      const region =
        filters.spatialRole === 'origin'
          ? contact.spatial.originRegionId
          : contact.spatial.targetRegionId;
      if (region !== filters.spatialRegionId) return false;
    }
  }
  return true;
}

function terminalFor(rally: RallyPathRally): PathStateDescriptor | undefined {
  return rally.terminal?.state;
}

export function selectRallyPathFocus(
  model: RallyPathModel,
  filters: RallyPathFocusFilters,
): RallyPathFocusResult {
  const occurrences: RallyPathOccurrence[] = [];
  model.eligibleRallies.forEach((rally) => {
    rally.contacts.forEach((contact, index) => {
      if (!matchesFocus(contact, filters)) return;
      const nextState = rally.contacts[index + 1]?.state ?? terminalFor(rally);
      if (!nextState) return;
      const path = [
        contact.state,
        ...rally.contacts.slice(index + 1).map((item) => item.state),
        ...(rally.terminal ? [rally.terminal.state] : []),
      ];
      occurrences.push({
        id: `${rally.rallyId}:${contact.sourceEventId}`,
        rally,
        contact,
        contactIndex: index,
        path: Object.freeze(path),
        nextState,
      });
    });
  });
  const rallyIds = [...new Set(occurrences.map((item) => item.rally.rallyId))];
  const observedWins = rallyIds.filter(
    (id) =>
      occurrences.find((item) => item.rally.rallyId === id)?.rally.terminal?.winnerTeamId ===
      model.referenceTeamId,
  ).length;
  const value = (key: string): number | null => model.values[key] ?? null;
  const distributionMap = new Map<string, PathModelTransition>();
  occurrences.forEach((occurrence) => {
    const current = distributionMap.get(occurrence.nextState.key);
    distributionMap.set(occurrence.nextState.key, {
      id: `${occurrence.contact.state.key}->${occurrence.nextState.key}`,
      from: occurrence.contact.state,
      to: occurrence.nextState,
      count: (current?.count ?? 0) + 1,
      probability: 0,
    });
  });
  const inputDistribution = [...distributionMap.values()].map((item) => ({
    ...item,
    probability: item.count / occurrences.length,
  }));
  const potential =
    model.status === 'available' && occurrences.length
      ? inputDistribution.reduce(
          (sum, item) =>
            sum +
            item.probability *
              (item.to.terminal
                ? item.to.teamId === model.referenceTeamId
                  ? 1
                  : 0
                : (value(item.to.key) ?? 0)),
          0,
        )
      : null;
  return {
    filters,
    occurrences: Object.freeze(occurrences),
    occurrenceCount: occurrences.length,
    rallyIds: Object.freeze(rallyIds),
    observedWins,
    observedLosses: rallyIds.length - observedWins,
    observedPointRate: rallyIds.length ? observedWins / rallyIds.length : null,
    potential,
    inputDistribution: Object.freeze(inputDistribution),
    availableForHeadline: rallyIds.length >= 10,
  };
}

function prefixId(path: readonly PathStateDescriptor[], depth: number): string {
  return path
    .slice(0, depth + 1)
    .map((item) => item.key)
    .join('>');
}

function flowNodesForOccurrences(
  occurrences: readonly RallyPathOccurrence[],
  model: RallyPathModel,
  horizon: 1 | 2,
): { readonly nodes: Map<string, FlowNode>; readonly links: Map<string, FlowLink> } {
  const nodes = new Map<
    string,
    { depth: number; state?: PathStateDescriptor; count: number; occurrenceIds: Set<string> }
  >();
  const links = new Map<
    string,
    { from: string; to: string; count: number; occurrenceIds: Set<string>; components: Set<string> }
  >();
  occurrences.forEach((occurrence) => {
    const path = occurrence.path.slice(0, horizon + 1);
    path.forEach((item, depth) => {
      const id = prefixId(path, depth);
      const node = nodes.get(id) ?? {
        depth,
        state: item,
        count: 0,
        occurrenceIds: new Set<string>(),
      };
      node.count += 1;
      node.occurrenceIds.add(occurrence.id);
      nodes.set(id, node);
    });
    path.slice(0, -1).forEach((_, depth) => {
      const fromId = prefixId(path, depth);
      const toId = prefixId(path, depth + 1);
      const id = `${fromId}->${toId}`;
      const link = links.get(id) ?? {
        from: fromId,
        to: toId,
        count: 0,
        occurrenceIds: new Set<string>(),
        components: new Set<string>(),
      };
      link.count += 1;
      link.occurrenceIds.add(occurrence.id);
      links.set(id, link);
    });
  });
  const groupedLinks = new Map<string, FlowLink>();
  links.forEach((link, key) => {
    const parentLinks = [...links.values()].filter((candidate) => candidate.from === link.from);
    const top = parentLinks
      .sort((left, right) => right.count - left.count || left.to.localeCompare(right.to))
      .slice(0, 3);
    if (top.some((candidate) => candidate.to === link.to)) {
      groupedLinks.set(key, {
        id: key,
        fromNodeId: link.from,
        toNodeId: link.to,
        count: link.count,
        prefixCount: nodes.get(link.from)?.count ?? link.count,
        localProbability: link.count / (nodes.get(link.from)?.count ?? link.count),
        occurrenceIds: Object.freeze([...link.occurrenceIds]),
      });
    } else {
      const otherId = `${link.from}::other`;
      const current = groupedLinks.get(otherId);
      groupedLinks.set(otherId, {
        id: otherId,
        fromNodeId: link.from,
        toNodeId: otherId,
        count: (current?.count ?? 0) + link.count,
        prefixCount: nodes.get(link.from)?.count ?? link.count,
        localProbability: 0,
        occurrenceIds: Object.freeze([...(current?.occurrenceIds ?? []), ...link.occurrenceIds]),
        groupedComponents: Object.freeze([...(current?.groupedComponents ?? []), link.to]),
      });
    }
  });
  const nodeValues = new Map<string, FlowNode>();
  nodes.forEach((node, id) => {
    const nextDistribution = [...groupedLinks.values()]
      .filter((link) => link.fromNodeId === id)
      .map((link) => {
        const target = nodes.get(link.toNodeId);
        return target?.state
          ? {
              id: link.id,
              from: node.state!,
              to: target.state,
              count: link.count,
              probability: link.localProbability,
            }
          : undefined;
      })
      .filter((item): item is PathModelTransition => item !== undefined);
    nodeValues.set(id, {
      id,
      depth: node.depth,
      kind: 'state',
      state: node.state,
      count: node.count,
      occurrenceIds: Object.freeze([...node.occurrenceIds]),
      nextDistribution: Object.freeze(nextDistribution),
      potential: node.state?.terminal
        ? node.state.teamId === model.referenceTeamId
          ? 1
          : 0
        : (model.values[node.state?.key ?? ''] ?? null),
    });
  });
  groupedLinks.forEach((link) => {
    if (!nodeValues.has(link.toNodeId)) {
      const depth = (nodeValues.get(link.fromNodeId)?.depth ?? 0) + 1;
      nodeValues.set(link.toNodeId, {
        id: link.toNodeId,
        depth,
        kind: 'other',
        count: link.count,
        occurrenceIds: link.occurrenceIds,
        nextDistribution: Object.freeze([]),
        potential: null,
      });
    }
  });
  groupedLinks.forEach((link) => {
    if (link.localProbability === 0) {
      const total = nodeValues.get(link.fromNodeId)?.count ?? link.count;
      groupedLinks.set(link.id, { ...link, localProbability: link.count / total });
    }
  });
  return { nodes: nodeValues, links: groupedLinks };
}

export function buildRallyPathFlow(
  focus: RallyPathFocusResult,
  model: RallyPathModel,
  horizon: 1 | 2,
): RallyPathFlow {
  const raw = flowNodesForOccurrences(focus.occurrences, model, horizon);
  const ordered = [...raw.nodes.values()].sort(
    (left, right) =>
      left.depth - right.depth || right.count - left.count || left.id.localeCompare(right.id),
  );
  const keep = new Set(
    ordered
      .filter((node) => node.kind === 'state')
      .slice(0, 12)
      .map((node) => node.id),
  );
  const remap = (id: string): string =>
    keep.has(id) || raw.nodes.get(id)?.kind === 'other'
      ? id
      : `depth-${raw.nodes.get(id)?.depth ?? 0}::other`;
  const linksMap = new Map<string, FlowLink>();
  [...raw.links.values()].forEach((link) => {
    const fromNodeId = remap(link.fromNodeId);
    const toNodeId = remap(link.toNodeId);
    const id = `${fromNodeId}->${toNodeId}`;
    const current = linksMap.get(id);
    linksMap.set(id, {
      id,
      fromNodeId,
      toNodeId,
      count: (current?.count ?? 0) + link.count,
      prefixCount: current?.prefixCount ?? link.prefixCount,
      localProbability: 0,
      occurrenceIds: Object.freeze([...(current?.occurrenceIds ?? []), ...link.occurrenceIds]),
      ...(link.groupedComponents
        ? {
            groupedComponents: Object.freeze([
              ...(current?.groupedComponents ?? []),
              ...link.groupedComponents,
            ]),
          }
        : {}),
    });
  });
  const displayNodes = new Map<string, FlowNode>();
  [...raw.nodes.values()].forEach((node) => {
    if (keep.has(node.id) || node.kind === 'other') displayNodes.set(node.id, node);
  });
  linksMap.forEach((link) => {
    if (!displayNodes.has(link.fromNodeId)) {
      const depth = raw.nodes.get(link.fromNodeId)?.depth ?? 0;
      displayNodes.set(link.fromNodeId, {
        id: link.fromNodeId,
        depth,
        kind: 'other',
        count: 0,
        occurrenceIds: [],
        nextDistribution: [],
        potential: null,
      });
    }
    if (!displayNodes.has(link.toNodeId)) {
      const depth =
        raw.nodes.get(link.toNodeId)?.depth ?? (displayNodes.get(link.fromNodeId)?.depth ?? 0) + 1;
      displayNodes.set(link.toNodeId, {
        id: link.toNodeId,
        depth,
        kind: 'other',
        count: 0,
        occurrenceIds: [],
        nextDistribution: [],
        potential: null,
      });
    }
  });
  const finalNodes = [...displayNodes.values()].map((node) => {
    const incoming = [...linksMap.values()].filter((link) => link.toNodeId === node.id);
    const outgoing = [...linksMap.values()].filter((link) => link.fromNodeId === node.id);
    const occurrenceIds = [
      ...new Set([
        ...node.occurrenceIds,
        ...incoming.flatMap((link) => link.occurrenceIds),
        ...outgoing.flatMap((link) => link.occurrenceIds),
      ]),
    ];
    return {
      ...node,
      count:
        node.kind === 'other' ? incoming.reduce((sum, link) => sum + link.count, 0) : node.count,
      occurrenceIds: Object.freeze(occurrenceIds),
    };
  });
  const finalLinks = [...linksMap.values()].map((link) => {
    const prefixCount =
      finalNodes.find((node) => node.id === link.fromNodeId)?.count ?? link.prefixCount;
    return { ...link, prefixCount, localProbability: prefixCount ? link.count / prefixCount : 0 };
  });
  return { horizon, nodes: Object.freeze(finalNodes), links: Object.freeze(finalLinks) };
}

export function compareRallyPathQualities(
  model: RallyPathModel,
  filters: RallyPathFocusFilters,
): readonly QualityComparison[] {
  const base = selectRallyPathFocus(model, { ...filters, quality: undefined });
  const qualities = [
    ...new Set(
      model.eligibleRallies.flatMap((rally) =>
        rally.contacts
          .filter((contact) => contact.teamId === filters.teamId && contact.skill === filters.skill)
          .map((contact) => contact.quality ?? '__missing__'),
      ),
    ),
  ].sort();
  return Object.freeze(
    qualities.map((quality) => {
      const result = selectRallyPathFocus(model, { ...filters, quality });
      return {
        ...(quality !== '__missing__' ? { quality } : {}),
        occurrences: result.occurrenceCount,
        rallies: result.rallyIds.length,
        observedWins: result.observedWins,
        observedPointRate: result.observedPointRate,
        potential: result.potential,
        differenceVsReference:
          result.potential === null || base.potential === null
            ? null
            : result.potential - base.potential,
        availableForHeadline: result.availableForHeadline,
      };
    }),
  );
}

export function pathStateLabel(
  stateValue: PathStateDescriptor,
  teamName: string,
  skillLabel: string,
  qualityLabel?: string,
): string {
  if (stateValue.terminal) return `Ponto ${teamName}`;
  return `${teamName} · ${skillLabel} ${qualityLabel ?? 'Sem avaliação'}`;
}

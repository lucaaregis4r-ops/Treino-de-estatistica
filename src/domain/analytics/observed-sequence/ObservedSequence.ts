export type ObservedSport = 'volleyball' | 'football' | 'futsal';
export type SequenceCoverage = 'complete' | 'censored' | 'conflict';
export type SequenceCensorReason = 'missing_start' | 'missing_end' | 'missing_terminal' | 'suspended' | 'unknown_control' | 'contested' | 'period_boundary' | 'invalid_order' | 'conflicting_terminal' | 'unattributed';

/** A source fact can be a boundary in two units, but it keeps the same source ID. */
export interface ObservedStep {
  readonly sourceId: string;
  readonly effectiveHistoryId?: string;
  readonly order: number;
  readonly kind: string;
  readonly role: 'action' | 'control' | 'context' | 'terminal';
  readonly teamId?: string;
  readonly elapsedMs?: number;
  readonly position?: { readonly x: number; readonly y: number };
  readonly destination?: { readonly x: number; readonly y: number };
}

export interface ObservedBoundary {
  readonly sourceId?: string;
  readonly reason: string;
  readonly elapsedMs?: number;
  readonly teamId?: string;
}

/** Derived only. No unit ID is persisted or added to the backup schema. */
export interface ObservedSequence {
  readonly unitId: string;
  readonly sport: ObservedSport;
  readonly matchId: string;
  readonly context: { readonly kind: 'set' | 'period'; readonly number: number };
  /** Possession owner; omitted for a rally, which contains both teams. */
  readonly teamId?: string;
  readonly participantTeamIds: readonly string[];
  readonly steps: readonly ObservedStep[];
  readonly start: ObservedBoundary;
  readonly end?: ObservedBoundary;
  readonly outcome?: string;
  readonly coverage: SequenceCoverage;
  readonly censorReasons: readonly SequenceCensorReason[];
  readonly eligibleForOutcome: boolean;
}

export interface ObservedSequenceProjection {
  readonly units: readonly ObservedSequence[];
  /** Effective facts not attributable to a rally or observed possession. */
  readonly unassigned: readonly ObservedStep[];
}

export interface ObservedSequenceFilter {
  readonly teamId?: string;
  readonly period?: number;
  readonly setNumber?: number;
  readonly outcome?: string;
  readonly actionKind?: string;
  readonly coverage?: SequenceCoverage;
}

/** Select whole units. Action filters never strip intervening evidence. */
export function selectObservedSequences(units: readonly ObservedSequence[], filter: ObservedSequenceFilter): readonly ObservedSequence[] {
  return units.filter(unit =>
    (filter.teamId === undefined || unit.teamId === filter.teamId || unit.sport === 'volleyball' && unit.participantTeamIds.includes(filter.teamId)) &&
    (filter.period === undefined || unit.context.kind === 'period' && unit.context.number === filter.period) &&
    (filter.setNumber === undefined || unit.context.kind === 'set' && unit.context.number === filter.setNumber) &&
    (filter.outcome === undefined || unit.outcome === filter.outcome) &&
    (filter.actionKind === undefined || unit.steps.some(step => step.kind === filter.actionKind)) &&
    (filter.coverage === undefined || unit.coverage === filter.coverage));
}

/** Rally count uses one ID per rally, even when both team perspectives are available. */
export function countObservedUnits(units: readonly ObservedSequence[], eligibleOnly = false): number {
  return new Set(units.filter(unit => !eligibleOnly || unit.eligibleForOutcome).map(unit => unit.unitId)).size;
}

export function coverageFor(reasons: readonly SequenceCensorReason[]): SequenceCoverage {
  return reasons.some(reason => reason === 'invalid_order' || reason === 'conflicting_terminal') ? 'conflict' : reasons.length ? 'censored' : 'complete';
}

export function uniqueReasons(reasons: readonly SequenceCensorReason[]): readonly SequenceCensorReason[] {
  return [...new Set(reasons)];
}

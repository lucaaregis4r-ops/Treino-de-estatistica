import type { CanonicalFootballEvent, StatsBombLocation } from './StatsBombContract';

/** Local, versioned annotations. They never manufacture StatsBomb actions. */
export const FOOTBALL_ASSISTED_RECORDING_SCHEMA_VERSION = '1.0.0' as const;

export type FootballAssistedCandidateState = 'pending' | 'ignored' | 'not_observed' | 'confirmed' | 'invalid';
export type FootballPressureHeight = 'high' | 'medium' | 'low' | 'not_observed' | 'not_applicable';
export type FootballPressureForm = 'individual' | 'collective' | 'present_unspecified' | 'none' | 'unknown';

export interface FootballAssistedObservation {
  readonly id: string;
  readonly matchId: string;
  readonly period: 1 | 2;
  /** Existing event that anchors the observed control/possession fact. */
  readonly targetEventId: string;
  readonly possession?: number;
  readonly controlledTeamId?: string;
  readonly observedAt: string;
  readonly position?: StatsBombLocation;
  readonly positionPrecision?: 'point' | 'zone' | 'not_observed';
  readonly provenance: 'operator_observed' | 'review_observed';
}

export interface FootballAssistedDetail {
  readonly id: string;
  readonly observationId: string;
  readonly type: string;
  readonly targetId: string;
  readonly value: string | number | boolean | 'unknown' | 'not_observed';
  readonly teamId?: string;
  /** The instant the fact applies to, never the later form-fill instant. */
  readonly targetObservedAt: string;
  readonly filledAt: string;
  readonly provenance: 'operator_observed' | 'review_observed';
}

export interface FootballAssistedPressure {
  readonly id: string;
  readonly observationId: string;
  /** T04 form is occasional; T05 snapshots may intentionally repeat. */
  readonly kind?: 'detail_form' | 'fixed_snapshot';
  /** Observed instant of a fixed snapshot, separate from form-fill time. */
  readonly observedAt?: string;
  readonly pressingTeamId?: string;
  readonly ballTeamId?: string;
  /** Height and form are deliberately independent dimensions. */
  readonly height: FootballPressureHeight;
  readonly form: FootballPressureForm;
  readonly pointEventId?: string;
  readonly pointAgeMs?: number;
  readonly position?: StatsBombLocation;
  readonly positionState: 'linked_point' | 'aged_point' | 'not_observed';
  /** Direction of the pressing team when known; unknown direction never blocks capture. */
  readonly pressingOrientation?: 'x120' | 'x0';
  readonly provenance: 'operator_observed' | 'review_observed';
}

export interface FootballAssistedSourceRevision {
  readonly eventId: string;
  readonly revision: string;
}

export interface FootballAssistedCandidate {
  readonly key: string;
  readonly kind: string;
  readonly targetObservationId: string;
  readonly sourceRevisions: readonly FootballAssistedSourceRevision[];
  readonly reasons: readonly string[];
  readonly ruleVersion: string;
  readonly state: FootballAssistedCandidateState;
}

export interface FootballAssistedAuthor {
  readonly role: 'operator' | 'reviewer' | 'coach' | 'system';
  readonly id?: string;
}

/** A voluntary description remains local evidence, never a canonical event. */
export interface FootballAssistedDescribedAction {
  readonly id: string;
  readonly kind: 'pass' | 'carry' | 'receipt' | 'loss';
  readonly passerId?: string;
  readonly receiverId?: string;
  readonly carrierId?: string;
  readonly recipientId?: string;
  /** Loss cause is local evidence; it never implies opponent control. */
  readonly lossKind?: 'pass_incomplete' | 'intercepted' | 'out' | 'tackle' | 'miscontrol' | 'other' | 'not_observed';
  readonly responsibleId?: string;
  readonly recovererId?: string;
}

/** A confirmation points to local details/pressure; it is not a football action. */
export interface FootballAssistedConfirmation {
  readonly id: string;
  readonly candidateKey: string;
  readonly actions: readonly ({ readonly kind: 'detail'; readonly detailId: string } | { readonly kind: 'pressure'; readonly pressureId: string })[];
  readonly segmentEventIds: readonly string[];
  readonly observedAt: string;
  readonly filledAt: string;
  readonly spatialPrecision: 'point' | 'zone' | 'not_observed';
  readonly temporalPrecision: 'instant' | 'interval' | 'not_observed';
  readonly provenance: 'operator_confirmed' | 'review_confirmed';
  readonly author?: FootballAssistedAuthor;
  /** Several observed actions may coexist; omitted means an older local confirmation. */
  readonly describedActions?: readonly FootballAssistedDescribedAction[];
}

export interface FootballAssistedRecording {
  readonly schema_version: typeof FOOTBALL_ASSISTED_RECORDING_SCHEMA_VERSION;
  readonly observations: readonly FootballAssistedObservation[];
  readonly details: readonly FootballAssistedDetail[];
  readonly pressures: readonly FootballAssistedPressure[];
  readonly candidates: readonly FootballAssistedCandidate[];
  readonly confirmations: readonly FootballAssistedConfirmation[];
}

export interface ResolvedFootballAssistedCandidate extends FootballAssistedCandidate {
  readonly effectiveState: FootballAssistedCandidateState;
  readonly invalidSourceIds: readonly string[];
}

export interface ResolvedFootballAssistedConfirmation extends FootballAssistedConfirmation {
  readonly reviewRequired: boolean;
  readonly eligible: boolean;
}

export interface ResolvedFootballAssistedRecording {
  readonly candidates: readonly ResolvedFootballAssistedCandidate[];
  readonly confirmations: readonly ResolvedFootballAssistedConfirmation[];
}

function stableText(value: string): string { return value.trim().replaceAll('|', '%7C'); }

/** Stable across render/reload; revisions live beside the key, not inside it. */
export function footballAssistedCandidateKey(input: Pick<FootballAssistedCandidate, 'kind' | 'targetObservationId'> & { readonly sourceEventIds: readonly string[] }): string {
  return [stableText(input.kind), stableText(input.targetObservationId), ...[...new Set(input.sourceEventIds)].sort().map(stableText)].join('|');
}

/** A compact revision of the observed source, used only for local dependency checks. */
export function footballAssistedSourceRevision(event: CanonicalFootballEvent): string {
  return JSON.stringify({
    id: event.id, index: event.index, period: event.period, timestamp: event.timestamp,
    type: event.type, team: event.team, player: event.player, possession: event.possession,
    location: event.location, pass: event.pass, carry: event.carry, shot: event.shot,
    observation: event.scout_trainer.observation,
  });
}

/**
 * Future rule engines provide proposals. This deterministic reconciliation is
 * intentionally side-effect free and never turns a proposal into an action.
 */
export function reconcileFootballAssistedCandidates(
  current: readonly FootballAssistedCandidate[],
  proposed: readonly Omit<FootballAssistedCandidate, 'state'>[],
): readonly FootballAssistedCandidate[] {
  const existing = new Map(current.map(candidate => [candidate.key, candidate]));
  return [...proposed]
    .sort((left, right) => left.key.localeCompare(right.key))
    .map(candidate => {
      const prior = existing.get(candidate.key);
      return { ...candidate, state: prior?.state ?? 'pending' };
    });
}

/** Confirmation retries replace the same candidate response instead of appending an action. */
export function upsertFootballAssistedConfirmation(
  recording: FootballAssistedRecording,
  confirmation: FootballAssistedConfirmation,
): FootballAssistedRecording {
  const candidates = recording.candidates.map(candidate => candidate.key === confirmation.candidateKey ? { ...candidate, state: 'confirmed' as const } : candidate);
  const confirmations = [...recording.confirmations.filter(item => item.candidateKey !== confirmation.candidateKey), confirmation]
    .sort((left, right) => left.candidateKey.localeCompare(right.candidateKey));
  return { ...recording, candidates, confirmations };
}

/** Ignored and not-observed are explicit, reversible candidate answers. */
export function setFootballAssistedCandidateState(
  recording: FootballAssistedRecording,
  candidateKey: string,
  state: Exclude<FootballAssistedCandidateState, 'invalid'>,
): FootballAssistedRecording {
  const candidates = recording.candidates.map(candidate => candidate.key === candidateKey ? { ...candidate, state } : candidate);
  const confirmations = state === 'pending' ? recording.confirmations : recording.confirmations.filter(confirmation => confirmation.candidateKey !== candidateKey);
  return { ...recording, candidates, confirmations };
}

export function resolveFootballAssistedRecording(
  recording: FootballAssistedRecording | undefined,
  events: readonly CanonicalFootballEvent[],
): ResolvedFootballAssistedRecording {
  if (!recording) return { candidates: [], confirmations: [] };
  const sources = new Map(events.map(event => [event.id, footballAssistedSourceRevision(event)]));
  const candidates = recording.candidates.map(candidate => {
    const invalidSourceIds = candidate.sourceRevisions
      .filter(source => sources.get(source.eventId) !== source.revision)
      .map(source => source.eventId);
    return { ...candidate, effectiveState: invalidSourceIds.length ? 'invalid' : candidate.state, invalidSourceIds };
  });
  const byKey = new Map(candidates.map(candidate => [candidate.key, candidate]));
  const confirmations = recording.confirmations.map(confirmation => {
    const candidate = byKey.get(confirmation.candidateKey);
    const eligible = candidate?.effectiveState === 'confirmed';
    return { ...confirmation, eligible, reviewRequired: !eligible };
  });
  return { candidates, confirmations };
}

/** Consumers must use this selector so orphaned/review-required answers are excluded. */
export function eligibleFootballAssistedConfirmations(recording: FootballAssistedRecording | undefined, events: readonly CanonicalFootballEvent[]): readonly ResolvedFootballAssistedConfirmation[] {
  return resolveFootballAssistedRecording(recording, events).confirmations.filter(confirmation => confirmation.eligible);
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isText(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function hasUniqueIds(values: readonly unknown[]): boolean {
  const ids = values.map(value => isRecord(value) ? value.id : undefined);
  return ids.every(isText) && new Set(ids).size === ids.length;
}
function validLocation(value: unknown): boolean { return Array.isArray(value) && (value.length === 2 || value.length === 3) && value.every(Number.isFinite); }

/** Structural validation for complete backups; semantic links are checked by the service. */
export function isValidFootballAssistedRecording(value: unknown): value is FootballAssistedRecording {
  if (!isRecord(value) || value.schema_version !== FOOTBALL_ASSISTED_RECORDING_SCHEMA_VERSION ||
      !Array.isArray(value.observations) || !Array.isArray(value.details) || !Array.isArray(value.pressures) || !Array.isArray(value.candidates) || !Array.isArray(value.confirmations) ||
      !hasUniqueIds(value.observations) || !hasUniqueIds(value.details) || !hasUniqueIds(value.pressures) || !hasUniqueIds(value.confirmations)) return false;
  const observations = value.observations, details = value.details, pressures = value.pressures, candidates = value.candidates, confirmations = value.confirmations;
  if (!observations.every(item => isRecord(item) && isText(item.id) && isText(item.matchId) && (item.period === 1 || item.period === 2) && isText(item.targetEventId) && isText(item.observedAt) && ['operator_observed', 'review_observed'].includes(String(item.provenance)) && (item.position === undefined || validLocation(item.position)) && (item.positionPrecision === undefined || ['point', 'zone', 'not_observed'].includes(String(item.positionPrecision))))) return false;
  if (!details.every(item => isRecord(item) && isText(item.id) && isText(item.observationId) && isText(item.type) && isText(item.targetId) && isText(item.targetObservedAt) && isText(item.filledAt) && ['operator_observed', 'review_observed'].includes(String(item.provenance)))) return false;
  if (!pressures.every(item => isRecord(item) && isText(item.id) && isText(item.observationId) && (item.kind === undefined || item.kind === 'detail_form' || item.kind === 'fixed_snapshot') && (item.observedAt === undefined || isText(item.observedAt)) && ['high', 'medium', 'low', 'not_observed', 'not_applicable'].includes(String(item.height)) && ['individual', 'collective', 'present_unspecified', 'none', 'unknown'].includes(String(item.form)) && ['linked_point', 'aged_point', 'not_observed'].includes(String(item.positionState)) && (item.pressingOrientation === undefined || item.pressingOrientation === 'x120' || item.pressingOrientation === 'x0') && ['operator_observed', 'review_observed'].includes(String(item.provenance)) && (item.position === undefined || validLocation(item.position)))) return false;
  if (!candidates.every(item => isRecord(item) && isText(item.key) && isText(item.kind) && isText(item.targetObservationId) && Array.isArray(item.sourceRevisions) && item.sourceRevisions.every(source => isRecord(source) && isText(source.eventId) && isText(source.revision)) && Array.isArray(item.reasons) && item.reasons.every(isText) && isText(item.ruleVersion) && ['pending', 'ignored', 'not_observed', 'confirmed', 'invalid'].includes(String(item.state)))) return false;
  return confirmations.every(item => {
    if (!isRecord(item)) return false;
    const author = item.author;
    const validAuthor = author === undefined || (isRecord(author) && ['operator', 'reviewer', 'coach', 'system'].includes(String(author.role)) && (author.id === undefined || isText(author.id)));
    const described = item.describedActions;
    const validDescriptions = described === undefined || (Array.isArray(described) && described.length > 0 && hasUniqueIds(described) && described.every(action => isRecord(action) && isText(action.id) && ['pass', 'carry', 'receipt', 'loss'].includes(String(action.kind)) && ['passerId', 'receiverId', 'carrierId', 'recipientId', 'responsibleId', 'recovererId'].every(key => action[key] === undefined || isText(action[key])) && (action.kind !== 'loss' || ['pass_incomplete', 'intercepted', 'out', 'tackle', 'miscontrol', 'other', 'not_observed'].includes(String(action.lossKind)))));
    return isText(item.id) && isText(item.candidateKey) && Array.isArray(item.actions) && item.actions.every(action => isRecord(action) && ((action.kind === 'detail' && isText(action.detailId)) || (action.kind === 'pressure' && isText(action.pressureId)))) && Array.isArray(item.segmentEventIds) && item.segmentEventIds.every(isText) && isText(item.observedAt) && isText(item.filledAt) && ['point', 'zone', 'not_observed'].includes(String(item.spatialPrecision)) && ['instant', 'interval', 'not_observed'].includes(String(item.temporalPrecision)) && ['operator_confirmed', 'review_confirmed'].includes(String(item.provenance)) && validAuthor && validDescriptions;
  });
}

import type { CanonicalFootballEvent, FootballAction, FootballTacticalContext, StatsBombLocation } from './StatsBombContract';
import type { FootballOutcome } from './FootballRecorder';

export type BallControl = { readonly kind: 'controlled'; readonly teamId: string; readonly playerId?: string } | { readonly kind: 'contested' | 'unknown' } | { readonly kind: 'dead_ball'; readonly restartTeamId?: string };
export const FOOTBALL_POSSESSION_PROTOCOL = {
  name: 'scout_trainer.possession',
  version: '1.0.0',
} as const;

/**
 * A mark records what the operator actually observed at one instant.  It is
 * deliberately not a pass, carry, or inferred trajectory.
 */
export interface FootballObservationProtocol {
  readonly name: typeof FOOTBALL_POSSESSION_PROTOCOL.name;
  readonly version: typeof FOOTBALL_POSSESSION_PROTOCOL.version;
  readonly mode: 'control_mark';
}
export interface ObservationContext {
  readonly validity: 'observed' | 'partial' | 'not_observed';
  readonly outcome?: 'continuing' | 'lost' | 'recovered' | 'shot' | 'goal' | 'stopped';
}
export interface ActionPressure {
  readonly kind: 'unknown' | 'none' | 'individual' | 'collective' | 'present_unspecified';
  readonly pressingTeamId?: string;
  readonly pressedTeamId?: string;
  readonly episodeId?: string;
  readonly provenance: 'operator_observed' | 'provider_imported';
}
export interface FootballObservation {
  /** Omitted only by pre-M4 records; all new marks use this protocol. */
  readonly protocol?: FootballObservationProtocol;
  readonly teamId?: string;
  readonly playerId?: string;
  readonly recipientId?: string;
  readonly before?: BallControl;
  readonly after?: BallControl;
  readonly pressure?: ActionPressure;
  readonly tactical?: FootballTacticalContext;
  readonly pressureBeaten?: 'yes' | 'no' | 'unknown';
  readonly lineBreak?: 'none' | 'first' | 'middle' | 'last' | 'multiple' | 'unknown';
  readonly reception?: 'front' | 'between' | 'behind' | 'unknown';
  readonly touch?: 'controlled' | 'touched_without_control' | 'intercepted' | 'out' | 'unknown';
  readonly reaction?: 'counterpress' | 'delay' | 'recover_shape' | 'unknown';
  readonly attacksTo?: 'x120' | 'x0';
  /** StatsBomb pitch coordinates at this observed instant, never interpolated. */
  readonly position?: StatsBombLocation;
  readonly precision?: 'point' | 'zone';
  readonly coverage?: 'continuous' | 'suspended';
  /** False only when a shot was saved before its result was known. */
  readonly outcomeKnownAtCapture?: boolean;
  readonly restart?: boolean;
  readonly context?: ObservationContext;
}

/** Resolve the observed ball team without treating an opponent's action as possession. */
export function observedTeamId(event: CanonicalFootballEvent): string | undefined {
  const observation = event.scout_trainer?.observation;
  return observation?.teamId ?? (observation?.after?.kind === 'controlled' ? observation.after.teamId : observation?.before?.kind === 'controlled' ? observation.before.teamId : undefined);
}

export function outcomeName(event: CanonicalFootballEvent): string | undefined {
  const value = event.pass?.outcome ?? event.shot?.outcome ?? event.dribble?.outcome ?? event.duel?.outcome;
  return typeof value === 'string' ? value : value && typeof value === 'object' && 'name' in value ? String(value.name) : event.type.id === 30 ? 'Complete' : undefined;
}
export function readFootballOutcome(event: CanonicalFootballEvent): FootballOutcome {
  const names: Record<string, FootballOutcome> = { Complete: 'complete', Incomplete: 'incomplete', Goal: 'goal', Saved: 'saved', Blocked: 'blocked', 'Off T': 'off_target', Post: 'post', Won: 'won', Lost: 'lost' };
  return names[outcomeName(event) ?? ''] ?? 'observed';
}
export const allowedOutcomes: Record<FootballAction, readonly FootballOutcome[]> = {
  pass: ['complete', 'incomplete'], carry: ['observed'], dribble: ['won', 'lost'], duel: ['won', 'lost'], shot: ['pending', 'goal', 'saved', 'blocked', 'off_target', 'post'], interception: ['observed'], ball_recovery: ['observed'], loss: ['observed'], foul: ['observed'], substitution: ['observed'],
};
export function validateFootballDraft(input: { action: FootballAction; outcome: FootballOutcome; location?: { x: number; y: number }; endLocation?: { x: number; y: number } }): string | undefined {
  if (!allowedOutcomes[input.action]?.includes(input.outcome)) return 'Resultado incompatível com a ação.';
  if (!['loss', 'foul', 'substitution', 'shot'].includes(input.action) && !input.location) return 'Marque a localização.';
  if (['pass', 'carry'].includes(input.action) && !input.endLocation) return 'Marque origem e destino.';
  if ([input.location, input.endLocation].some(p => p && (![p.x, p.y].every(Number.isFinite) || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1))) return 'Coordenadas fora do campo.';
}
export function timestampMs(timestamp: string): number {
  const [h, m, s] = timestamp.split(':').map(Number);
  return (h * 3600 + m * 60 + s) * 1000;
}
export interface PossessionCompleteness {
  readonly temporal: 'complete' | 'partial';
  readonly spatial: 'observed' | 'partial' | 'not_observed';
  readonly contextual: 'observed' | 'partial' | 'not_observed';
}
export interface PossessionMark {
  readonly eventId: string;
  readonly captureSequence: number;
  readonly period: number;
  readonly timestamp: string;
  readonly before: BallControl;
  readonly after: BallControl;
  readonly position?: StatsBombLocation;
  readonly precision?: 'point' | 'zone';
  readonly coverage?: 'continuous' | 'suspended';
  readonly carrierId?: string;
  readonly context?: ObservationContext;
}
export interface ControlSegment {
  id: number;
  teamId: string;
  period: number;
  events: CanonicalFootballEvent[];
  marks: PossessionMark[];
  complete: boolean;
  completeness: PossessionCompleteness;
}

function markFor(event: CanonicalFootballEvent, before: BallControl, after: BallControl): PossessionMark | undefined {
  const observation = event.scout_trainer?.observation;
  if (!observation && event.type.id !== 1000) return;
  const position = observation?.position ?? event.location;
  return {
    eventId: event.id,
    captureSequence: event.scout_trainer.capture_sequence,
    period: event.period,
    timestamp: event.timestamp,
    before,
    after,
    ...(position ? { position } : {}),
    ...(observation?.precision ? { precision: observation.precision } : {}),
    ...(observation?.coverage ? { coverage: observation.coverage } : {}),
    ...(after.kind === 'controlled' && after.playerId ? { carrierId: after.playerId } : {}),
    ...(observation?.context ? { context: observation.context } : {}),
  };
}

function finish(segment: ControlSegment | undefined, complete: boolean): void {
  if (!segment) return;
  segment.complete = complete;
  // Seeing an end cannot retroactively prove that a possession began in view.
  segment.completeness = { ...segment.completeness, temporal: complete && segment.completeness.temporal === 'complete' ? 'complete' : 'partial' };
}

function createSegment(id: number, teamId: string, period: number, startedAtKnownBoundary: boolean): ControlSegment {
  return {
    id, teamId, period, events: [], marks: [], complete: false,
    completeness: { temporal: startedAtKnownBoundary ? 'complete' : 'partial', spatial: 'not_observed', contextual: 'not_observed' },
  };
}

function noteCompleteness(segment: ControlSegment, mark: PossessionMark): void {
  const spatial = mark.position ? (segment.completeness.spatial === 'not_observed' ? 'observed' : segment.completeness.spatial) : segment.completeness.spatial === 'observed' ? 'partial' : segment.completeness.spatial;
  const contextual = mark.context?.validity === 'observed'
    ? (segment.completeness.contextual === 'not_observed' ? 'observed' : segment.completeness.contextual)
    : mark.context?.validity === 'partial' && segment.completeness.contextual === 'observed' ? 'partial' : segment.completeness.contextual;
  segment.completeness = { ...segment.completeness, spatial, contextual };
}
/** Only explicitly continuous observations contribute time; legacy clicks never imply coverage. */
export function projectControl(events: readonly CanonicalFootballEvent[]) {
  let ballControl: BallControl = { kind: 'unknown' };
  let segment: ControlSegment | undefined;
  let previous: CanonicalFootballEvent | undefined;
  const segments: ControlSegment[] = [];
  const controlledMs: Record<string, number> = {};
  let excludedMs = 0;
  let position: { location: StatsBombLocation; timestamp: string; eventId: string } | undefined;
  for (const event of [...events].sort((left, right) => left.index - right.index || left.scout_trainer.capture_sequence - right.scout_trainer.capture_sequence)) {
    const obs: FootballObservation | undefined = event.scout_trainer.observation;
    const samePeriod = previous?.period === event.period;
    if (!samePeriod) { finish(segment, true); segment = undefined; ballControl = { kind: 'unknown' }; }
    if (obs?.restart) { finish(segment, true); segment = undefined; ballControl = { kind: 'dead_ball', restartTeamId: obs.before?.kind === 'controlled' ? obs.before.teamId : undefined }; }
    if (previous && samePeriod && obs?.coverage !== undefined && previous.scout_trainer?.observation?.coverage === 'continuous') {
      const duration = Math.max(0, timestampMs(event.timestamp) - timestampMs(previous.timestamp));
      if (ballControl.kind === 'controlled') controlledMs[ballControl.teamId] = (controlledMs[ballControl.teamId] ?? 0) + duration;
      else excludedMs += duration;
    }
    const before: BallControl = obs?.before === undefined ? ballControl : obs.before;
    if (before.kind === 'controlled' && (!segment || segment.teamId !== before.teamId)) {
      finish(segment, segment !== undefined);
      segment = createSegment(segments.length + 1, before.teamId, event.period, Boolean(obs?.restart || ballControl.kind === 'dead_ball'));
      segments.push(segment);
    }
    const actionSegment = segment;
    if (event.type.id !== 1000) actionSegment?.events.push(event);
    let after: BallControl = obs?.after === undefined ? before : obs.after;
    if (outcomeName(event) === 'Goal' && obs?.outcomeKnownAtCapture !== false) after = { kind: 'dead_ball' };
    if (after.kind === 'controlled' && (!segment || segment.teamId !== after.teamId)) {
      finish(segment, segment !== undefined);
      segment = createSegment(segments.length + 1, after.teamId, event.period, Boolean(obs?.restart || ballControl.kind === 'dead_ball'));
      segments.push(segment);
    }
    const mark = markFor(event, before, after);
    if (mark && segment) { segment.marks.push(mark); noteCompleteness(segment, mark); }
    if (obs?.coverage === 'suspended') { finish(segment, false); segment = undefined; ballControl = { kind: 'unknown' }; }
    else if (after.kind === 'dead_ball') { finish(segment, true); segment = undefined; ballControl = after; }
    else ballControl = after;
    const location = obs?.position ?? event.location;
    if (location) position = { location, timestamp: event.timestamp, eventId: event.id };
    previous = event;
  }
  return { ballControl, segments, controlledMs, excludedMs, position };
}

/** Replace edited action fields while preserving provider metadata and unknown extensions. */
export function mergeFootballCorrection(previous: CanonicalFootballEvent, next: CanonicalFootballEvent): CanonicalFootballEvent {
  const merged = { ...previous, ...next };
  for (const key of ['pass', 'carry', 'shot', 'dribble', 'duel', 'substitution', 'player', 'location'] as const) {
    if (!(key in next)) delete merged[key];
  }
  if (previous.type.id === next.type.id) {
    if (next.shot) merged.shot = { ...previous.shot, ...next.shot };
    if (next.pass) { merged.pass = { ...previous.pass, ...next.pass }; if (!next.pass.outcome) delete (merged.pass as { outcome?: unknown }).outcome; }
  }
  const tactical = next.scout_trainer.tactical_context ?? previous.scout_trainer?.tactical_context;
  return { ...merged, scout_trainer: { ...previous.scout_trainer, ...next.scout_trainer,
    ...(tactical ? { tactical_context: tactical } : {}),
    observation: { ...previous.scout_trainer?.observation, ...next.scout_trainer.observation } } };
}

/** Internal IDs are authoritative; numeric IDs are stable interchange aliases. */
export function footballNumericId(id: string): number {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) + 1;
}

import type { FootballObservation } from './FootballObservation';
import type { FootballAssistedRecording } from './FootballAssistedRecording';
export const STATSBOMB_PITCH = { width: 120, height: 80 } as const;

export type StatsBombLocation = readonly [number, number] | readonly [number, number, number];

export interface StatsBombEntity { readonly id: number; readonly name: string }

export interface ScoutTrainerFootballExtension {
  /** 1.0.0 is retained for backups produced before the possession protocol. */
  readonly schema_version: '1.0.0' | '1.1.0';
  readonly modality: 'football';
  readonly observation?: FootballObservation;
  readonly match_id: string;
  readonly capture_sequence: number;
  readonly position_observed?: boolean;
  readonly tactical_context?: FootballTacticalContext;
  readonly shot_context?: FootballShotContext;
  readonly possession_closed?: boolean;
  readonly observed_loss?: boolean;
  /** Local assisted-review facts; omitted from pure StatsBomb interchange. */
  readonly assisted_recording?: FootballAssistedRecording;
}

export interface FootballTacticalContext {
  readonly provenance: 'operator_observed';
  readonly origin?: 'recovery' | 'goal_kick' | 'keeper_distribution' | 'throw_in' | 'corner' | 'free_kick' | 'kick_off' | 'other';
  readonly recovery_zone?: SpatialDerivedZone;
  readonly build_structure?: '2+1' | '2+2' | '3+1' | '3+2' | '2+3' | '4+1' | 'direct' | 'other' | 'not_observed';
  readonly pressure?: 'low' | 'medium' | 'high' | 'not_observed';
  readonly block?: 'high' | 'middle' | 'low' | 'unknown';
  readonly defensive_shape?: 'organized' | 'disorganized' | 'not_observed';
  readonly progression?: 'short_pass' | 'long_pass' | 'carry' | 'combination' | 'not_observed';
  readonly line_break_observed?: boolean;
  readonly relevant_reception?: boolean;
  readonly advantage?: boolean;
  readonly note?: string;
}
export interface FootballShotContext { readonly provenance: 'operator_observed'; readonly perceived_force?: 'low' | 'medium' | 'high'; readonly pressure?: 'low' | 'medium' | 'high' | 'not_observed'; readonly first_touch?: boolean; readonly note?: string; }
export type SpatialDerivedZone = { readonly third: 'defensive' | 'middle' | 'attacking'; readonly corridor: 'left' | 'center' | 'right'; };

export interface CanonicalFootballEvent {
  readonly id: string;
  readonly index: number;
  readonly period: 1 | 2;
  /** Relative to the period, HH:MM:SS.mmm. */
  readonly timestamp: string;
  /** Cumulative match minute/second, with period two starting at minute 45. */
  readonly minute: number;
  readonly second: number;
  readonly type: StatsBombEntity;
  readonly team?: StatsBombEntity;
  readonly player?: StatsBombEntity;
  readonly possession?: number;
  readonly possession_team?: StatsBombEntity;
  readonly play_pattern?: StatsBombEntity;
  readonly location?: StatsBombLocation;
  readonly pass?: { readonly end_location?: StatsBombLocation; readonly outcome?: StatsBombEntity };
  readonly dribble?: { readonly outcome?: StatsBombEntity | string };
  readonly duel?: { readonly outcome?: StatsBombEntity | string };
  readonly carry?: { readonly end_location?: StatsBombLocation };
  readonly shot?: Record<string, unknown>;
  readonly substitution?: { readonly replacement?: StatsBombEntity };
  readonly ball_receipt?: { readonly outcome?: StatsBombEntity };
  readonly related_events?: readonly string[];
  readonly scout_trainer: ScoutTrainerFootballExtension;
}

export type FootballAction = 'pass' | 'carry' | 'dribble' | 'duel' | 'interception' | 'ball_recovery' | 'loss' | 'shot' | 'foul' | 'substitution';
export type PassTouchResult = 'controlled' | 'touched_without_control' | 'intercepted' | 'out' | 'not_observed';
export type TouchController = 'same_team' | 'opponent' | 'out' | 'undefined';

export interface FootballCaptureContext {
  readonly matchId: string;
  readonly nextIndex: number;
  readonly period: 1 | 2;
  readonly timestamp: string;
  readonly minute: number;
  readonly second: number;
  readonly possession?: number;
  readonly possessionTeam?: StatsBombEntity;
  readonly captureSequence: number;
}

export interface PassObservation {
  readonly result: PassTouchResult;
  readonly controller?: TouchController;
  readonly controllerTeam?: StatsBombEntity;
  readonly receiptLocation?: StatsBombLocation;
  readonly receiptPlayer?: StatsBombEntity;
  readonly receiptObserved?: boolean;
  readonly lossObserved?: boolean;
}

export interface FootballEventBundle { readonly events: readonly CanonicalFootballEvent[]; readonly nextPossession: number; }

const TYPES = {
  pass: { id: 30, name: 'Pass' }, ball_receipt: { id: 42, name: 'Ball Receipt*' },
  miscontrol: { id: 38, name: 'Miscontrol' }, interception: { id: 10, name: 'Interception' },
  duel: { id: 4, name: 'Duel' }, ball_recovery: { id: 2, name: 'Ball Recovery' },
  carry: { id: 43, name: 'Carry' }, dribble: { id: 14, name: 'Dribble' },
  dispossessed: { id: 3, name: 'Dispossessed' }, shot: { id: 16, name: 'Shot' },
} as const;

export function createFootballPass(context: FootballCaptureContext, input: {
  readonly id: string; readonly team: StatsBombEntity; readonly player?: StatsBombEntity;
  readonly location?: StatsBombLocation; readonly endLocation?: StatsBombLocation;
  readonly observation: PassObservation;
}): FootballEventBundle {
  const possession = context.possession;
  const base = { id: input.id, index: context.nextIndex, period: context.period, timestamp: context.timestamp, minute: context.minute, second: context.second, team: input.team, ...(input.player ? { player: input.player } : {}), ...(possession === undefined ? {} : { possession }), ...(context.possessionTeam ? { possession_team: context.possessionTeam } : {}), ...(input.location ? { location: input.location } : {}), scout_trainer: { schema_version: '1.0.0' as const, modality: 'football' as const, match_id: context.matchId, capture_sequence: context.captureSequence } };
  const related: string[] = [];
  const pass: CanonicalFootballEvent = { ...base, type: TYPES.pass, ...(input.endLocation ? { pass: { end_location: input.endLocation } } : {}), scout_trainer: { ...base.scout_trainer, ...(input.observation.result === 'touched_without_control' ? { touched_without_control: true } : {}) } };
  const events: CanonicalFootballEvent[] = [pass];
  let index = context.nextIndex + 1;
  if (input.observation.receiptObserved && input.observation.receiptLocation && input.observation.controllerTeam) {
    const receiptId = `${input.id}:receipt`; related.push(receiptId);
    events.push({ ...base, id: receiptId, index: index++, type: TYPES.ball_receipt, team: input.observation.controllerTeam, ...(input.observation.receiptPlayer ? { player: input.observation.receiptPlayer } : {}), location: input.observation.receiptLocation, ball_receipt: { outcome: input.observation.result === 'controlled' ? undefined : { id: 9, name: 'Incomplete' } }, related_events: [input.id], scout_trainer: { ...base.scout_trainer, ...(input.observation.result === 'touched_without_control' ? { observed: true } : {}) } });
  }
  if (input.observation.result === 'touched_without_control' && input.observation.lossObserved) {
    const miscontrolId = `${input.id}:miscontrol`; related.push(miscontrolId);
    events.push({ ...base, id: miscontrolId, index, type: TYPES.miscontrol, related_events: [input.id], scout_trainer: { ...base.scout_trainer, observed_loss: true } });
  }
  const nextPossession = input.observation.controller === 'opponent' ? (possession ?? 0) + 1 : possession ?? 0;
  return { events: events.map((event) => related.length ? { ...event, related_events: event.related_events ?? related.filter((id) => id !== event.id) } : event), nextPossession };
}

export function normalizedToStatsBomb(x: number, y: number): [number, number] {
  return [clamp(x) * STATSBOMB_PITCH.width, clamp(y) * STATSBOMB_PITCH.height];
}

export function statsBombToNormalized(location: StatsBombLocation): [number, number] {
  return [clamp(location[0] / STATSBOMB_PITCH.width), clamp(location[1] / STATSBOMB_PITCH.height)];
}

export function deriveSpatialZone(location: StatsBombLocation | undefined): SpatialDerivedZone | undefined {
  if (!location) return undefined;
  const x = location[0], y = location[1];
  return { third: x < 40 ? 'defensive' : x < 80 ? 'middle' : 'attacking', corridor: y < 26.6667 ? 'left' : y < 53.3334 ? 'center' : 'right' };
}

export function deriveSpatialDistance(start: StatsBombLocation | undefined, end: StatsBombLocation | undefined): number | undefined {
  if (!start || !end) return undefined;
  return Math.hypot(end[0] - start[0], end[1] - start[1]);
}

export type SafePlayPattern = 'Regular Play' | 'From Corner' | 'From Free Kick' | 'From Throw In' | 'From Goal Kick' | 'From Keeper' | 'From Kick Off';
export function observedPlayPattern(origin: FootballTacticalContext['origin'] | undefined): { readonly id: number; readonly name: SafePlayPattern } | undefined {
  const map: Partial<Record<NonNullable<FootballTacticalContext['origin']>, { readonly id: number; readonly name: SafePlayPattern }>> = { corner: { id: 2, name: 'From Corner' }, free_kick: { id: 3, name: 'From Free Kick' }, throw_in: { id: 4, name: 'From Throw In' }, goal_kick: { id: 7, name: 'From Goal Kick' }, keeper_distribution: { id: 8, name: 'From Keeper' }, kick_off: { id: 9, name: 'From Kick Off' } };
  return origin === 'other' || origin === 'recovery' ? undefined : origin ? map[origin] : undefined;
}

export function observedShotEnd(target: { readonly y: number; readonly z?: number } | undefined): StatsBombLocation | undefined {
  if (!target) return undefined;
  const y = Math.max(0, Math.min(80, target.y));
  return target.z === undefined ? [120, y] : [120, y, Math.max(0, Math.min(2.67, target.z))];
}

export function orientStatsBombLocation(location: StatsBombLocation, attacksTo: 'x120' | 'x0'): StatsBombLocation {
  if (attacksTo === 'x120') return location;
  return location.length === 3
    ? [STATSBOMB_PITCH.width - location[0], STATSBOMB_PITCH.height - location[1], location[2]]
    : [STATSBOMB_PITCH.width - location[0], STATSBOMB_PITCH.height - location[1]];
}

function clamp(value: number): number { return Math.max(0, Math.min(1, value)); }

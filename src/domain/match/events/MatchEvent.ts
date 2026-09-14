import type { ScoreSnapshot } from '../score/Score';
import type { ScoutEvent } from '../../scout/events/ScoutEvent';
import type { CourtRotationPosition, SetLineup } from '../lineup/SetLineup';
import type { PlayerRole } from '../roles/PlayerRole';
import type { CourtOrientation } from '../state/CourtOrientation';

interface MatchSystemEvent {
  readonly id: string;
  readonly matchId: string;
  readonly sequence: number;
  readonly timestamp: number;
}

export interface ScoutRegisteredEvent {
  readonly type: 'scout_registered';
  readonly event: ScoutEvent;
}

export interface ScoutCorrectedEvent extends MatchSystemEvent {
  readonly type: 'scout_corrected';
  readonly targetEventId: string;
  readonly previousRawCode: string;
  readonly newRawCode: string;
  readonly replacementEvent: ScoutEvent;
}

export interface ScoutUndoneEvent extends MatchSystemEvent {
  readonly type: 'scout_undone';
  readonly targetHistoryEventId: string;
}

export interface ScoutRedoneEvent extends MatchSystemEvent {
  readonly type: 'scout_redone';
  readonly targetUndoEventId: string;
}

export interface SetStartedEvent extends MatchSystemEvent {
  readonly type: 'set_started';
  readonly setNumber: number;
  readonly initialScore: ScoreSnapshot;
  readonly servingTeamId?: string;
  readonly courtOrientation?: CourtOrientation;
}

export interface ScoreChangedEvent extends MatchSystemEvent {
  readonly type: 'score_changed';
  readonly setNumber: number;
  readonly score: ScoreSnapshot;
}

export interface ScoreAdjustmentEvent extends MatchSystemEvent {
  readonly type: 'score_adjustment';
  readonly setNumber: number;
  readonly teamId: string;
  readonly delta: number;
  readonly reason?: string;
}

export interface ServingTeamChangedEvent extends MatchSystemEvent {
  readonly type: 'serving_team_changed';
  readonly servingTeamId: string;
}

export interface RallyStartedEvent extends MatchSystemEvent {
  readonly type: 'rally_started';
  readonly rallyId: string;
  readonly targetScoutEventId?: string;
  readonly sourceHistoryEventId?: string;
}

export interface RallyEndedEvent extends MatchSystemEvent {
  readonly type: 'rally_ended';
  readonly rallyId: string;
  readonly winningTeamId?: string;
}

export interface SetLineupConfirmedEvent extends MatchSystemEvent {
  readonly type: 'set_lineup_confirmed';
  readonly lineup: SetLineup;
}

export interface RallyResultEvent extends MatchSystemEvent {
  readonly type: 'rally_result';
  readonly rallyId: string;
  readonly winnerTeamId: string;
  readonly previousServingTeamId: string;
  readonly reason?: string;
  readonly targetScoutEventId?: string;
  readonly sourceHistoryEventId?: string;
}

export interface SetFinishedEvent extends MatchSystemEvent {
  readonly type: 'set_finished';
  readonly setNumber: number;
  readonly winnerTeamId: string;
  readonly finalScore: ScoreSnapshot;
  readonly targetScoutEventId?: string;
  readonly sourceHistoryEventId?: string;
}

export interface MatchCorrectionEvent extends MatchSystemEvent {
  readonly type: 'match_correction';
  readonly correction: {
    readonly kind: 'award_point';
    readonly teamId: string;
    readonly rallyId: string;
    readonly previousServingTeamId: string;
  };
}

export interface SubstitutionEvent extends MatchSystemEvent {
  readonly type: 'substitution_made';
  readonly teamId: string;
  readonly setNumber: number;
  readonly slotId: string;
  readonly playerOutId: string;
  readonly playerInId: string;
  readonly rotationPositionAtSubstitution: CourtRotationPosition;
  readonly score: ScoreSnapshot;
  readonly playerOutRole: PlayerRole;
  readonly playerInRole: PlayerRole;
}

export type MatchEvent =
  | ScoutRegisteredEvent
  | ScoutCorrectedEvent
  | ScoutUndoneEvent
  | ScoutRedoneEvent
  | SetStartedEvent
  | ScoreChangedEvent
  | ScoreAdjustmentEvent
  | ServingTeamChangedEvent
  | RallyStartedEvent
  | RallyEndedEvent
  | SetLineupConfirmedEvent
  | RallyResultEvent
  | SetFinishedEvent
  | MatchCorrectionEvent
  | SubstitutionEvent;

export function matchEventId(event: MatchEvent): string {
  return event.type === 'scout_registered' ? event.event.id : event.id;
}

export function matchEventMatchId(event: MatchEvent): string {
  return event.type === 'scout_registered' ? event.event.matchId : event.matchId;
}

export function matchEventSequence(event: MatchEvent): number {
  return event.type === 'scout_registered' ? event.event.sequence : event.sequence;
}

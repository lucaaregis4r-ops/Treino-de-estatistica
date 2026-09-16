import type { MatchEvent } from '../../match/events/MatchEvent';
import type { ScoutEvent } from '../../scout/events/ScoutEvent';
import { IDLE_RALLY_STATE, type RallyPhase, type RallyState } from '../state/RallyState';

function phaseForScoutEvent(event: ScoutEvent): RallyPhase {
  switch (event.skill) {
    case 'serve':
      return 'serve';
    case 'reception':
      return 'reception';
    case 'set':
      return 'set';
    case 'attack':
    case 'block':
      return 'attack';
    case 'dig':
    case 'free_ball':
      return 'transition';
  }
}

export function reduceRally(state: RallyState, event: MatchEvent): RallyState {
  if (event.type === 'rally_started') {
    return {
      rallyId: event.rallyId,
      status: 'active',
      phase: 'serve',
      eventIds: Object.freeze([]),
    };
  }

  if (
    (event.type === 'rally_ended' ||
      event.type === 'rally_result' ||
      event.type === 'match_correction' ||
      event.type === 'fault') &&
    (state.rallyId === (event.type === 'match_correction' ? event.correction.rallyId : event.rallyId) ||
      (event.type === 'fault' && state.status === 'idle'))
  ) {
    const winningTeamId =
      event.type === 'rally_result'
        ? event.winnerTeamId
        : event.type === 'match_correction'
          ? event.correction.teamId
          : event.type === 'fault'
            ? event.pointFor
          : event.winningTeamId;
    return {
      ...state,
      status: 'ended',
      phase: 'ended',
      ...(event.type === 'fault' ? { eventIds: Object.freeze([...state.eventIds, event.id]) } : {}),
      ...(winningTeamId ? { winningTeamId } : {}),
    };
  }

  if (event.type === 'scout_registered') {
    const scout = event.event;
    const matchingState = state.rallyId === scout.rallyId ? state : IDLE_RALLY_STATE;
    return {
      rallyId: scout.rallyId,
      status: 'active',
      phase: phaseForScoutEvent(scout),
      eventIds: Object.freeze([...matchingState.eventIds, scout.id]),
    };
  }

  return state;
}

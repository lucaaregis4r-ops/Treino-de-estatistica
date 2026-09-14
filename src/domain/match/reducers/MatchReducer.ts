import { reduceRally } from '../../rally/reducers/RallyReducer';
import {
  matchEventId,
  matchEventMatchId,
  matchEventSequence,
  type MatchEvent,
} from '../events/MatchEvent';
import type { MatchState } from '../state/MatchState';
import type { SetState } from '../state/SetState';
import { RotationEngine } from '../lineup/RotationEngine';
import type { SetLineup } from '../lineup/SetLineup';
import { playerRoleForTacticalRole } from '../lineup/SetLineup';
import { DEFAULT_INDOOR_SCORING_RULES } from '../rules/SetScoringRules';
import { ActiveSetterResolver } from '../tactical/ActiveSetterResolver';
import { TacticalPatternDetector } from '../tactical/TacticalPatternDetector';
import type { DerivedTacticalState, SubstitutionWindow } from '../tactical/TacticalState';
import { swapCourtOrientation } from '../state/CourtOrientation';

const rotationEngine = new RotationEngine();
const activeSetterResolver = new ActiveSetterResolver();
const tacticalPatternDetector = new TacticalPatternDetector();

function updateSet(
  sets: readonly SetState[],
  setNumber: number,
  update: (set: SetState) => SetState,
): readonly SetState[] {
  const existing = sets.find((set) => set.setNumber === setNumber);
  const target = existing ?? { setNumber, score: { teamA: 0, teamB: 0 }, completed: false };
  return Object.freeze(
    [...sets.filter((set) => set.setNumber !== setNumber), update(target)].sort(
      (left, right) => left.setNumber - right.setNumber,
    ),
  );
}

function replaceLineup(lineups: readonly SetLineup[], lineup: SetLineup): readonly SetLineup[] {
  return Object.freeze([
    ...lineups.filter(
      (candidate) => candidate.setNumber !== lineup.setNumber || candidate.teamId !== lineup.teamId,
    ),
    lineup,
  ]);
}

function tacticalStateForLineup(
  lineup: SetLineup,
  previous?: DerivedTacticalState,
): DerivedTacticalState {
  const setter = activeSetterResolver.resolve(lineup);
  return {
    teamId: lineup.teamId,
    ...(previous?.primarySetterPlayerId || setter?.playerId
      ? { primarySetterPlayerId: previous?.primarySetterPlayerId ?? setter?.playerId }
      : {}),
    ...(setter
      ? { activeSetterPlayerId: setter.playerId, activeSetterPosition: setter.position }
      : {}),
    formationState: setter ? (previous?.formationState ?? 'normal') : 'unknown',
  };
}

function replaceTacticalState(
  states: MatchState['tacticalStateByTeamId'],
  state: DerivedTacticalState,
): MatchState['tacticalStateByTeamId'] {
  return Object.freeze({ ...states, [state.teamId]: Object.freeze(state) });
}

function sameScore(
  left: { teamA: number; teamB: number },
  right: { teamA: number; teamB: number },
) {
  return left.teamA === right.teamA && left.teamB === right.teamB;
}

export function reduceMatch(previous: MatchState, event: MatchEvent): MatchState {
  if (matchEventMatchId(event) !== previous.metadata.id) return previous;
  if (previous.processedEventIds.includes(matchEventId(event))) return previous;

  const sequence = matchEventSequence(event);
  const base: MatchState = {
    ...previous,
    currentRally: reduceRally(previous.currentRally, event),
    processedEventIds: Object.freeze([...previous.processedEventIds, matchEventId(event)]),
    lastSequence: Math.max(previous.lastSequence, sequence),
  };

  switch (event.type) {
    case 'set_started': {
      const sets = previous.sets.map((set) =>
        set.setNumber === previous.currentSet ? { ...set, completed: true } : set,
      );
      return {
        ...base,
        currentSet: event.setNumber,
        score: { ...event.initialScore },
        courtOrientation: event.courtOrientation ?? swapCourtOrientation(previous.courtOrientation),
        ...(event.servingTeamId ? { servingTeamId: event.servingTeamId } : {}),
        sets: updateSet(sets, event.setNumber, () => ({
          setNumber: event.setNumber,
          score: { ...event.initialScore },
          completed: false,
        })),
        substitutionWindows: Object.freeze({}),
      };
    }
    case 'score_changed':
      return {
        ...base,
        currentSet: event.setNumber,
        score: { ...event.score },
        sets: updateSet(previous.sets, event.setNumber, (set) => ({
          ...set,
          score: { ...event.score },
        })),
      };
    case 'score_adjustment': {
      const score = {
        teamA: previous.score.teamA + (event.teamId === previous.metadata.teamAId ? event.delta : 0),
        teamB: previous.score.teamB + (event.teamId === previous.metadata.teamBId ? event.delta : 0),
      };
      return {
        ...base,
        currentSet: event.setNumber,
        score,
        sets: updateSet(previous.sets, event.setNumber, (set) => ({ ...set, score })),
      };
    }
    case 'serving_team_changed':
      return { ...base, servingTeamId: event.servingTeamId };
    case 'set_lineup_confirmed': {
      const tacticalState = tacticalStateForLineup(event.lineup);
      return {
        ...base,
        lineups: replaceLineup(previous.lineups, event.lineup),
        tacticalStateByTeamId: replaceTacticalState(previous.tacticalStateByTeamId, tacticalState),
      };
    }
    case 'rally_started':
      return { ...base, substitutionWindows: Object.freeze({}) };
    case 'rally_result':
    case 'match_correction': {
      const winnerTeamId =
        event.type === 'rally_result' ? event.winnerTeamId : event.correction.teamId;
      const recordedPreviousServingTeamId =
        event.type === 'rally_result'
          ? event.previousServingTeamId
          : event.correction.previousServingTeamId;
      const previousServingTeamId =
        previous.servingTeamId ??
        previous.metadata.initialServingTeamId ??
        recordedPreviousServingTeamId;
      const winnerIsTeamA = winnerTeamId === previous.metadata.teamAId;
      const score = {
        teamA: previous.score.teamA + (winnerIsTeamA ? 1 : 0),
        teamB: previous.score.teamB + (winnerIsTeamA ? 0 : 1),
      };
      const receivingTeamWon = winnerTeamId !== previousServingTeamId;
      const currentLineup = previous.lineups.find(
        (lineup) => lineup.setNumber === previous.currentSet && lineup.teamId === winnerTeamId,
      );
      const lineups =
        receivingTeamWon && currentLineup
          ? replaceLineup(previous.lineups, rotationEngine.rotate(currentLineup))
          : previous.lineups;
      const rotatedLineup = lineups.find(
        (lineup) => lineup.setNumber === previous.currentSet && lineup.teamId === winnerTeamId,
      );
      const tacticalStateByTeamId = rotatedLineup
        ? replaceTacticalState(
            previous.tacticalStateByTeamId,
            tacticalStateForLineup(rotatedLineup, previous.tacticalStateByTeamId[winnerTeamId]),
          )
        : previous.tacticalStateByTeamId;
      return {
        ...base,
        score,
        servingTeamId: winnerTeamId,
        lineups,
        tacticalStateByTeamId,
        substitutionWindows: Object.freeze({}),
        sets: updateSet(previous.sets, previous.currentSet, (set) => ({ ...set, score })),
      };
    }
    case 'substitution_made': {
      const lineup = previous.lineups.find(
        (candidate) => candidate.setNumber === event.setNumber && candidate.teamId === event.teamId,
      );
      const slot = lineup?.slots[event.slotId];
      if (!lineup || !slot || slot.playerId !== event.playerOutId) return base;
      const playerOutRole =
        event.playerOutRole ?? slot.activeRole ?? playerRoleForTacticalRole(slot.tacticalRole);
      const playerInRole = event.playerInRole ?? slot.activeRole ?? playerOutRole;
      const updatedLineup: SetLineup = {
        ...lineup,
        slots: {
          ...lineup.slots,
          [event.slotId]: { ...slot, playerId: event.playerInId, activeRole: playerInRole },
        },
      };
      const previousTacticalState =
        previous.tacticalStateByTeamId[event.teamId] ?? tacticalStateForLineup(lineup);
      const score = event.score ?? previous.score;
      const openWindow = previous.substitutionWindows[event.teamId];
      const continuesWindow =
        openWindow &&
        openWindow.setNumber === event.setNumber &&
        sameScore(openWindow.score, score);
      const window: SubstitutionWindow = {
        teamId: event.teamId,
        setNumber: event.setNumber,
        score: { ...score },
        activeSetterBeforeWindow: continuesWindow
          ? openWindow.activeSetterBeforeWindow
          : previousTacticalState.activeSetterPlayerId,
        formationBeforeWindow: continuesWindow
          ? openWindow.formationBeforeWindow
          : previousTacticalState.formationState,
        entries: Object.freeze([
          ...(continuesWindow ? openWindow.entries : []),
          {
            eventId: event.id,
            playerOutId: event.playerOutId,
            playerInId: event.playerInId,
            playerOutRole,
            playerInRole,
          },
        ]),
      };
      let tacticalState = tacticalStateForLineup(updatedLineup, previousTacticalState);
      const pattern = tacticalPatternDetector.detect(window, tacticalState);
      if (pattern) {
        tacticalState = {
          ...tacticalState,
          formationState: pattern === 'five_one_inversion' ? 'five_one_inversion' : 'normal',
        };
      }
      const derivedSubstitutionGroups = pattern
        ? Object.freeze([
            ...previous.derivedSubstitutionGroups,
            Object.freeze({
              id: `derived:${window.entries.map((entry) => entry.eventId).join(':')}`,
              pattern,
              teamId: event.teamId,
              setNumber: event.setNumber,
              score: { ...score },
              eventIds: Object.freeze(window.entries.map((entry) => entry.eventId)),
            }),
          ])
        : previous.derivedSubstitutionGroups;
      return {
        ...base,
        lineups: replaceLineup(previous.lineups, updatedLineup),
        tacticalStateByTeamId: replaceTacticalState(previous.tacticalStateByTeamId, tacticalState),
        substitutionWindows: Object.freeze({
          ...previous.substitutionWindows,
          [event.teamId]: Object.freeze(window),
        }),
        derivedSubstitutionGroups,
      };
    }
    case 'set_finished': {
      const sets = updateSet(previous.sets, event.setNumber, (set) => ({
        ...set,
        score: { ...event.finalScore },
        completed: true,
        winnerTeamId: event.winnerTeamId,
      }));
      const rules = previous.metadata.scoringRules ?? DEFAULT_INDOOR_SCORING_RULES;
      const wins = sets.filter((set) => set.winnerTeamId === event.winnerTeamId).length;
      return { ...base, sets, matchCompleted: wins >= rules.setsToWin };
    }
    default:
      return base;
  }
}

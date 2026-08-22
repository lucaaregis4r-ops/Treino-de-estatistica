import { reduceRally } from '../../rally/reducers/RallyReducer';
import type { MatchMetadata } from '../entities/MatchMetadata';
import {
  matchEventId,
  matchEventMatchId,
  matchEventSequence,
  type MatchEvent,
} from '../events/MatchEvent';
import { projectEffectiveMatchEvents } from '../events/ScoutTimeline';
import { createInitialMatchState, type MatchState } from '../state/MatchState';
import type { SetState } from '../state/SetState';
import { RotationEngine } from '../lineup/RotationEngine';
import type { SetLineup } from '../lineup/SetLineup';
import { DEFAULT_INDOOR_SCORING_RULES } from '../rules/SetScoringRules';

const rotationEngine = new RotationEngine();

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
        ...(event.servingTeamId ? { servingTeamId: event.servingTeamId } : {}),
        sets: updateSet(sets, event.setNumber, () => ({
          setNumber: event.setNumber,
          score: { ...event.initialScore },
          completed: false,
        })),
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
    case 'serving_team_changed':
      return { ...base, servingTeamId: event.servingTeamId };
    case 'set_lineup_confirmed':
      return { ...base, lineups: replaceLineup(previous.lineups, event.lineup) };
    case 'rally_result': {
      const winnerIsTeamA = event.winnerTeamId === previous.metadata.teamAId;
      const score = {
        teamA: previous.score.teamA + (winnerIsTeamA ? 1 : 0),
        teamB: previous.score.teamB + (winnerIsTeamA ? 0 : 1),
      };
      const receivingTeamWon = event.winnerTeamId !== event.previousServingTeamId;
      const currentLineup = previous.lineups.find(
        (lineup) =>
          lineup.setNumber === previous.currentSet && lineup.teamId === event.winnerTeamId,
      );
      const lineups =
        receivingTeamWon && currentLineup
          ? replaceLineup(previous.lineups, rotationEngine.rotate(currentLineup))
          : previous.lineups;
      return {
        ...base,
        score,
        servingTeamId: event.winnerTeamId,
        lineups,
        sets: updateSet(previous.sets, previous.currentSet, (set) => ({ ...set, score })),
      };
    }
    case 'substitution_made': {
      const lineup = previous.lineups.find(
        (candidate) => candidate.setNumber === event.setNumber && candidate.teamId === event.teamId,
      );
      const slot = lineup?.slots[event.slotId];
      if (!lineup || !slot || slot.playerId !== event.playerOutId) return base;
      return {
        ...base,
        lineups: replaceLineup(previous.lineups, {
          ...lineup,
          slots: {
            ...lineup.slots,
            [event.slotId]: { ...slot, playerId: event.playerInId },
          },
        }),
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

export function replayMatch(metadata: MatchMetadata, events: readonly MatchEvent[]): MatchState {
  const state = projectEffectiveMatchEvents(events).reduce(
    reduceMatch,
    createInitialMatchState(metadata),
  );

  return {
    ...state,
    processedEventIds: Object.freeze(
      [...events]
        .sort((left, right) => matchEventSequence(left) - matchEventSequence(right))
        .map(matchEventId),
    ),
    lastSequence: events.reduce(
      (last, event) => Math.max(last, matchEventSequence(event)),
      state.lastSequence,
    ),
  };
}

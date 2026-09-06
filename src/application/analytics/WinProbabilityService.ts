import type { MatchState } from '../../domain/match/state/MatchState';
import type { ScoutEvent } from '../../domain/scout/events/ScoutEvent';

export interface WinProbabilityPoint {
  readonly sequence: number;
  readonly setNumber: number;
  readonly scoreTeamA: number;
  readonly scoreTeamB: number;
  readonly teamA: number;
  readonly teamB: number;
  readonly actionTeamId?: string;
  readonly actionSkill?: ScoutEvent['skill'];
  readonly actionImpact?: number;
}

export interface WinProbabilityReport {
  readonly teamA: number;
  readonly teamB: number;
  readonly setTeamA: number;
  readonly setTeamB: number;
  readonly points: readonly WinProbabilityPoint[];
}

function sigmoid(value: number) { return 1 / (1 + Math.exp(-value)); }
function estimate(scoreA: number, scoreB: number, setDiff: number) { return sigmoid((scoreA - scoreB) * 0.18 + setDiff * 0.75); }

/** Transparent score-based estimate; it is deliberately labelled an estimate until calibrated with historical matches. */
export function buildWinProbability(events: readonly ScoutEvent[], state: MatchState, teamIds: readonly [string, string]): WinProbabilityReport {
  const [teamAId, teamBId] = teamIds;
  const setDiff = state.sets.filter(set => set.winnerTeamId === teamAId).length - state.sets.filter(set => set.winnerTeamId === teamBId).length;
  const pointEvents = events.filter((event, index) => index === 0 || event.setNumber !== events[index - 1].setNumber || event.scoreBefore.teamA !== events[index - 1].scoreBefore.teamA || event.scoreBefore.teamB !== events[index - 1].scoreBefore.teamB);
  const points = pointEvents.map((event, index) => {
    const current = estimate(event.scoreBefore.teamA, event.scoreBefore.teamB, setDiff);
    const previous = pointEvents[index - 1]?.scoreBefore;
    const before = previous ? estimate(previous.teamA, previous.teamB, setDiff) : .5;
    return { sequence: event.sequence, setNumber: event.setNumber, scoreTeamA: event.scoreBefore.teamA, scoreTeamB: event.scoreBefore.teamB, teamA: current, teamB: 1 - current, ...(event.teamId ? { actionTeamId: event.teamId } : {}), actionSkill: event.skill, actionImpact: current - before } satisfies WinProbabilityPoint;
  });
  const currentDiff = state.score.teamA - state.score.teamB;
  const setsA = state.sets.filter(set => set.winnerTeamId === teamAId).length;
  const setsB = state.sets.filter(set => set.winnerTeamId === teamBId).length;
  const current = sigmoid(currentDiff * .18 + (setsA - setsB) * .75);
  return { teamA: current, teamB: 1 - current, setTeamA: sigmoid(currentDiff * .18), setTeamB: 1 - sigmoid(currentDiff * .18), points };
}

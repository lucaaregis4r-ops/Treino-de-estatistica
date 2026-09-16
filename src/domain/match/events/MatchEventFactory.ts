import { createEntityId } from '../../../core/ids/entityId';
import type { Team } from '../entities/Team';
import type { ScoutEvent } from '../../scout/events/ScoutEvent';
import type { MatchState } from '../state/MatchState';
import { RallyOutcomeResolver } from '../../rally/rules/RallyOutcomeResolver';
import { DEFAULT_INDOOR_SCORING_RULES, setWinner } from '../rules/SetScoringRules';
import type {
  MatchCorrectionEvent,
  FaultEvent,
  FaultType,
  MatchEvent,
  ScoreAdjustmentEvent,
  RallyStartedEvent,
  ScoutCorrectedEvent,
  ScoutRedoneEvent,
  ScoutUndoneEvent,
} from './MatchEvent';

export interface MatchEventFactoryDependencies {
  readonly createId: () => string;
  readonly now: () => number;
}

const DEFAULT_DEPENDENCIES: MatchEventFactoryDependencies = {
  createId: createEntityId,
  now: Date.now,
};

interface DerivedScoutEventsInput {
  readonly state: MatchState;
  readonly teams: readonly [Team, Team];
  readonly scout: ScoutEvent;
  readonly sourceHistoryEventId: string;
  readonly firstSequence: number;
  readonly targetScoutEventId?: string;
}

interface PointCorrectionInput {
  readonly state: MatchState;
  readonly teams: readonly [Team, Team];
  readonly teamId: string;
  readonly rallyId: string;
  readonly firstSequence: number;
  readonly startsRally: boolean;
}

interface FaultInput {
  readonly state: MatchState;
  readonly teamId: string;
  readonly athleteId?: string;
  readonly faultType: FaultType;
  readonly rallyId: string;
  readonly pointFor: string;
  readonly firstSequence: number;
}

export class MatchEventFactory {
  constructor(
    private readonly dependencies = DEFAULT_DEPENDENCIES,
    private readonly rallyOutcomeResolver = new RallyOutcomeResolver(),
  ) {}

  rallyStarted(
    matchId: string,
    rallyId: string,
    sequence: number,
    source?: { readonly targetScoutEventId?: string; readonly sourceHistoryEventId: string },
  ): RallyStartedEvent {
    return {
      type: 'rally_started',
      id: this.dependencies.createId(),
      matchId,
      rallyId,
      sequence,
      timestamp: this.dependencies.now(),
      ...(source ?? {}),
    };
  }

  derivedFromScout(input: DerivedScoutEventsInput): readonly MatchEvent[] {
    const outcome = this.rallyOutcomeResolver.resolve(input.scout, input.teams);
    if (!outcome) return [];
    const previousServingTeamId =
      input.state.servingTeamId ?? input.state.metadata.initialServingTeamId ?? input.teams[0].id;
    const targetScoutEventId = input.targetScoutEventId ?? input.scout.id;
    const result: MatchEvent = {
      type: 'rally_result',
      id: this.dependencies.createId(),
      matchId: input.state.metadata.id,
      rallyId: input.scout.rallyId,
      winnerTeamId: outcome.winnerTeamId,
      previousServingTeamId,
      reason: outcome.reason,
      targetScoutEventId,
      sourceHistoryEventId: input.sourceHistoryEventId,
      sequence: input.firstSequence,
      timestamp: this.dependencies.now(),
    };
    return this.withSetFinished(
      input.state,
      input.teams,
      outcome.winnerTeamId,
      result,
      input.firstSequence + 1,
      {
        targetScoutEventId,
        sourceHistoryEventId: input.sourceHistoryEventId,
      },
    );
  }

  pointCorrection(input: PointCorrectionInput): readonly MatchEvent[] {
    let sequence = input.firstSequence;
    const correctionId = this.dependencies.createId();
    const correction: MatchCorrectionEvent = {
      type: 'match_correction',
      id: correctionId,
      matchId: input.state.metadata.id,
      correction: {
        kind: 'award_point',
        teamId: input.teamId,
        rallyId: input.rallyId,
        previousServingTeamId:
          input.state.servingTeamId ??
          input.state.metadata.initialServingTeamId ??
          input.teams[0].id,
      },
      sequence: sequence + (input.startsRally ? 1 : 0),
      timestamp: this.dependencies.now(),
    };
    const events: MatchEvent[] = [];
    if (input.startsRally) {
      events.push(
        this.rallyStarted(input.state.metadata.id, input.rallyId, sequence, {
          sourceHistoryEventId: correctionId,
        }),
      );
      sequence += 1;
    }
    events.push(correction);
    return [
      ...events,
      ...this.setFinishedEvents(input.state, input.teams, input.teamId, sequence + 1, {
        sourceHistoryEventId: correctionId,
      }),
    ];
  }

  scoutCorrection(input: {
    readonly matchId: string;
    readonly targetEventId: string;
    readonly previousRawCode: string;
    readonly newRawCode: string;
    readonly replacementEvent: ScoutEvent;
    readonly sequence: number;
  }): ScoutCorrectedEvent {
    return {
      type: 'scout_corrected',
      id: this.dependencies.createId(),
      timestamp: this.dependencies.now(),
      ...input,
    };
  }

  fault(input: FaultInput): FaultEvent {
    return {
      type: 'fault',
      id: this.dependencies.createId(),
      matchId: input.state.metadata.id,
      sequence: input.firstSequence,
      timestamp: this.dependencies.now(),
      faultType: input.faultType,
      teamId: input.teamId,
      ...(input.athleteId ? { athleteId: input.athleteId } : {}),
      rallyId: input.rallyId,
      terminal: true,
      pointFor: input.pointFor,
      previousServingTeamId:
        input.state.servingTeamId ??
        input.state.metadata.initialServingTeamId ??
        input.pointFor,
    };
  }

  derivedFromFault(input: {
    readonly state: MatchState;
    readonly teams: readonly [Team, Team];
    readonly fault: FaultEvent;
    readonly sequence: number;
  }): readonly MatchEvent[] {
    return this.setFinishedEvents(
      input.state,
      input.teams,
      input.fault.pointFor,
      input.sequence,
      { sourceHistoryEventId: input.fault.id },
    );
  }

  scoreAdjustment(input: {
    readonly matchId: string;
    readonly setNumber: number;
    readonly teamId: string;
    readonly delta: number;
    readonly reason?: string;
    readonly sequence: number;
  }): ScoreAdjustmentEvent {
    return {
      type: 'score_adjustment',
      id: this.dependencies.createId(),
      timestamp: this.dependencies.now(),
      ...input,
    };
  }

  undo(matchId: string, targetHistoryEventId: string, sequence: number): ScoutUndoneEvent {
    return {
      type: 'scout_undone',
      id: this.dependencies.createId(),
      matchId,
      targetHistoryEventId,
      sequence,
      timestamp: this.dependencies.now(),
    };
  }

  redo(matchId: string, targetUndoEventId: string, sequence: number): ScoutRedoneEvent {
    return {
      type: 'scout_redone',
      id: this.dependencies.createId(),
      matchId,
      targetUndoEventId,
      sequence,
      timestamp: this.dependencies.now(),
    };
  }

  private withSetFinished(
    state: MatchState,
    teams: readonly [Team, Team],
    winnerTeamId: string,
    result: MatchEvent,
    setFinishedSequence: number,
    source: { readonly targetScoutEventId?: string; readonly sourceHistoryEventId: string },
  ): readonly MatchEvent[] {
    return [
      result,
      ...this.setFinishedEvents(state, teams, winnerTeamId, setFinishedSequence, source),
    ];
  }

  private setFinishedEvents(
    state: MatchState,
    teams: readonly [Team, Team],
    rallyWinnerTeamId: string,
    sequence: number,
    source: { readonly targetScoutEventId?: string; readonly sourceHistoryEventId: string },
  ): readonly MatchEvent[] {
    const score = {
      teamA: state.score.teamA + (rallyWinnerTeamId === teams[0].id ? 1 : 0),
      teamB: state.score.teamB + (rallyWinnerTeamId === teams[1].id ? 1 : 0),
    };
    const winner = setWinner(
      score,
      state.currentSet,
      state.metadata.scoringRules ?? DEFAULT_INDOOR_SCORING_RULES,
      teams[0].id,
      teams[1].id,
    );
    if (!winner) return [];
    return [
      {
        type: 'set_finished',
        id: this.dependencies.createId(),
        matchId: state.metadata.id,
        setNumber: state.currentSet,
        winnerTeamId: winner,
        finalScore: score,
        sequence,
        timestamp: this.dependencies.now(),
        ...source,
      },
    ];
  }
}

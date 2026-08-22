import { ValidationError } from '../../../core/errors/ValidationError';
import { createEntityId } from '../../../core/ids/entityId';
import { failure, type Result, success } from '../../../core/result/Result';
import type { ResolvedProfileContext } from '../../../profiles/ProfileResolver';
import type { CanonicalScoutEventCandidate } from '../mapper/CanonicalScoutEventCandidate';
import type { ScoutValidationContext } from '../validators/ScoutValidationContext';
import type { ValidationResult } from '../validators/validation';
import type { ScoutEvent } from './ScoutEvent';
import { playerLineupContext } from '../../match/lineup/SetLineup';
import { RosterPlayerResolver } from '../../match/roster/TeamRoster';
import type { CompletenessResult } from '../completeness/CompletenessResult';

export interface EventFactoryDependencies {
  readonly createId: () => string;
  readonly now: () => number;
}

const DEFAULT_DEPENDENCIES: EventFactoryDependencies = {
  createId: createEntityId,
  now: Date.now,
};

export class EventFactory {
  private readonly rosterResolver = new RosterPlayerResolver();
  constructor(private readonly dependencies = DEFAULT_DEPENDENCIES) {}

  create(
    candidate: CanonicalScoutEventCandidate,
    context: ScoutValidationContext,
    profiles: ResolvedProfileContext,
    validation: ValidationResult,
    completeness: CompletenessResult,
  ): Result<ScoutEvent, ValidationError> {
    if (!validation.valid) {
      return failure(new ValidationError('Scout event candidate is invalid.', validation.issues));
    }

    const playerId = this.rosterResolver.resolve(
      { teamId: context.teamId, players: context.roster },
      candidate.playerNumber,
    )?.id;
    const lineupContext =
      context.lineupContext ??
      (playerId ? playerLineupContext(context.lineup, playerId) : undefined);

    return success({
      id: this.dependencies.createId(),
      matchId: context.matchId,
      rallyId: context.rallyId,
      sequence: context.sequence,
      teamId: context.teamId,
      ...(playerId ? { playerId } : {}),
      ...(lineupContext ? { lineupContext } : {}),
      skill: candidate.skill,
      outcome: candidate.outcome,
      evaluation: candidate.evaluation,
      setNumber: context.setNumber,
      scoreBefore: { ...context.scoreBefore },
      timestamp: this.dependencies.now(),
      rawCode: candidate.rawCode,
      codeProfileId: profiles.codeProfile.id,
      codeProfileVersion: profiles.codeProfile.version,
      complexityProfileId: profiles.complexityProfile.id,
      ...(profiles.competitionProfile
        ? {
            competitionProfileId: profiles.competitionProfile.id,
            competitionProfileVersion: profiles.competitionProfile.version,
          }
        : {}),
      ...(candidate.metadata ? { metadata: candidate.metadata } : {}),
      completeness,
    });
  }
}

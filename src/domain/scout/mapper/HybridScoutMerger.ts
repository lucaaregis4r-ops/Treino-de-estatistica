import { ValidationError } from '../../../core/errors/ValidationError';
import { failure, type Result, success } from '../../../core/result/Result';
import type { CodeProfile } from '../../../profiles/types';
import type { ScoutEventMetadata } from '../events/ScoutEvent';
import type { TacticalMetadata } from '../tactical/TacticalMetadata';
import { normalizeTacticalMetadata, toTacticalMetadata } from '../tactical/TacticalMetadataAdapter';
import type { CanonicalScoutEventCandidate } from './CanonicalScoutEventCandidate';
import type { VisualScoutDraft } from './VisualScoutDraft';
import { VisualScoutMapper } from './VisualScoutMapper';

export interface HybridScoutMergeInput {
  readonly typedTeamId: string;
  readonly typedCandidate: CanonicalScoutEventCandidate;
  readonly visualDraft: VisualScoutDraft;
  readonly codeProfile: CodeProfile;
}

function mergedMetadata(
  typed: ScoutEventMetadata | undefined,
  visual: ScoutEventMetadata | undefined,
): ScoutEventMetadata | undefined {
  if (!typed) return visual;
  if (!visual) return typed;
  const primary = toTacticalMetadata(typed);
  const enrichment = toTacticalMetadata(visual);
  const merged: TacticalMetadata = {
    ...enrichment,
    ...primary,
    trajectory: { ...enrichment.trajectory, ...primary.trajectory },
    serve: {
      ...enrichment.serve,
      ...primary.serve,
      trajectory: { ...enrichment.serve?.trajectory, ...primary.serve?.trajectory },
    },
    reception: { ...enrichment.reception, ...primary.reception },
    set: { ...enrichment.set, ...primary.set },
    attack: {
      ...enrichment.attack,
      ...primary.attack,
      trajectory: { ...enrichment.attack?.trajectory, ...primary.attack?.trajectory },
    },
    block: { ...enrichment.block, ...primary.block },
  };
  return normalizeTacticalMetadata({
    ...visual,
    ...typed,
    spatial: typed.spatial ?? visual.spatial,
    schemaVersion: '2.0.0',
    tactical: merged,
  });
}

export class HybridScoutMerger {
  constructor(private readonly visualMapper = new VisualScoutMapper()) {}

  merge(input: HybridScoutMergeInput): Result<CanonicalScoutEventCandidate, ValidationError> {
    const conflicts = [
      input.typedTeamId !== input.visualDraft.teamId ? 'teamId' : undefined,
      input.typedCandidate.playerNumber !== input.visualDraft.playerNumber
        ? 'playerNumber'
        : undefined,
      input.typedCandidate.skill !== input.visualDraft.skill ? 'skill' : undefined,
      input.typedCandidate.evaluation !== input.visualDraft.evaluation ? 'evaluation' : undefined,
    ].filter((field): field is string => field !== undefined);
    if (conflicts.length > 0) {
      return failure(
        new ValidationError(
          'Typed and visual scout data conflict.',
          conflicts.map((field) => ({
            code: 'hybrid_scout_conflict',
            message: `O campo ${field} diverge entre a digitação e a seleção visual.`,
            path: field,
          })),
        ),
      );
    }

    const visual = this.visualMapper.map(input.visualDraft, input.codeProfile);
    return success({
      ...input.typedCandidate,
      metadata: mergedMetadata(input.typedCandidate.metadata, visual.metadata),
    });
  }
}

import { ProfileError } from '../core/errors/ProfileError';
import { failure, type Result, success } from '../core/result/Result';
import type { ProfileRegistry } from './ProfileRegistry';
import type { CodeProfile, CompetitionProfile, ComplexityProfile, TrainingProfile } from './types';

export interface ProfileReference {
  readonly id: string;
  readonly version?: string;
}

export interface ProfileSelection {
  readonly code: ProfileReference;
  readonly complexity: ProfileReference;
  readonly competition?: ProfileReference;
  readonly training?: ProfileReference;
}

export interface ResolvedProfileContext {
  readonly codeProfile: CodeProfile;
  readonly complexityProfile: ComplexityProfile;
  readonly competitionProfile?: CompetitionProfile;
  readonly trainingProfile?: TrainingProfile;
}

export class ProfileResolver {
  constructor(private readonly registry: ProfileRegistry) {}

  resolve(selection: ProfileSelection): Result<ResolvedProfileContext, ProfileError> {
    const code = this.registry.resolve('code', selection.code.id, selection.code.version);
    if (!code.ok) return failure(code.error);

    const complexity = this.registry.resolve(
      'complexity',
      selection.complexity.id,
      selection.complexity.version,
    );
    if (!complexity.ok) return failure(complexity.error);

    const competition = selection.competition
      ? this.registry.resolve(
          'competition',
          selection.competition.id,
          selection.competition.version,
        )
      : undefined;
    if (competition && !competition.ok) return failure(competition.error);

    const training = selection.training
      ? this.registry.resolve('training', selection.training.id, selection.training.version)
      : undefined;
    if (training && !training.ok) return failure(training.error);

    return success({
      codeProfile: code.value,
      complexityProfile: complexity.value,
      ...(competition?.ok ? { competitionProfile: competition.value } : {}),
      ...(training?.ok ? { trainingProfile: training.value } : {}),
    });
  }
}

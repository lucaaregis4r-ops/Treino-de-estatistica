import type { ComplexityProfile, ScoutField } from '../../../profiles/types';
import type { CanonicalScoutEventCandidate } from '../mapper/CanonicalScoutEventCandidate';
import type { ScoutValidationContext } from '../validators/ScoutValidationContext';
import type { CaptureRequirement } from './CaptureNeed';
import type { CompletenessResult } from './CompletenessResult';
import { hasScoutField } from './ScoutFieldPresence';

const SKILL_SPECIFIC_RECOMMENDATIONS = {
  serve: ['skillType', 'targetZone'],
  reception: ['originZone'],
  set: ['targetZone', 'setterCall'],
  attack: [
    'originZone',
    'targetZone',
    'direction',
    'attackCombination',
    'attackTempo',
    'blockersCount',
  ],
  block: ['blockersCount'],
  dig: ['originZone'],
  free_ball: ['originZone', 'targetZone'],
} as const satisfies Readonly<Record<CanonicalScoutEventCandidate['skill'], readonly ScoutField[]>>;

export function captureRequirementFor(
  profile: ComplexityProfile,
  field: ScoutField,
): CaptureRequirement {
  return (
    profile.captureRequirements?.[field] ??
    (profile.requiredFields.includes(field) ? 'blocking' : 'optional')
  );
}

export class CompletenessEvaluator {
  evaluate(
    candidate: CanonicalScoutEventCandidate,
    profile: ComplexityProfile,
    context: ScoutValidationContext,
  ): CompletenessResult {
    const fields = new Set<ScoutField>([
      ...profile.requiredFields,
      ...profile.optionalFields,
      ...(Object.keys(profile.captureRequirements ?? {}) as ScoutField[]),
    ]);
    const applicableRecommendations = new Set<ScoutField>(
      SKILL_SPECIFIC_RECOMMENDATIONS[candidate.skill],
    );
    const missingRecommendedFields = [...fields].filter(
      (field) =>
        captureRequirementFor(profile, field) === 'recommended' &&
        applicableRecommendations.has(field) &&
        !hasScoutField(field, candidate, context),
    );
    return {
      status: missingRecommendedFields.length > 0 ? 'partial' : 'complete',
      missingRecommendedFields,
    };
  }
}

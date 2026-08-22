import type { ComplexityProfile, ScoutField } from '../../../profiles/types';
import type { CanonicalScoutEventCandidate } from '../mapper/CanonicalScoutEventCandidate';
import type { ScoutValidationContext } from './ScoutValidationContext';
import { type ValidationIssue, type ValidationResult, validationResult } from './validation';
import { captureRequirementFor } from '../completeness/CompletenessEvaluator';
import { hasScoutField } from '../completeness/ScoutFieldPresence';

export class ProfileValidator {
  validate(
    candidate: CanonicalScoutEventCandidate,
    profile: ComplexityProfile,
    context: ScoutValidationContext,
  ): ValidationResult {
    const fields = new Set<ScoutField>([
      ...profile.requiredFields,
      ...(Object.keys(profile.captureRequirements ?? {}) as ScoutField[]),
    ]);
    const missingFields = [...fields].filter(
      (field) =>
        captureRequirementFor(profile, field) === 'blocking' &&
        !hasScoutField(field, candidate, context),
    );
    const issues: ValidationIssue[] = missingFields.map((field) => ({
      code: 'profile_required_field_missing',
      message: `The active complexity profile requires ${field}.`,
      path: field,
    }));

    return validationResult(issues);
  }
}

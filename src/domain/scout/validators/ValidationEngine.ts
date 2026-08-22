import type { ComplexityProfile } from '../../../profiles/types';
import type { CanonicalScoutEventCandidate } from '../mapper/CanonicalScoutEventCandidate';
import { ProfileValidator } from './ProfileValidator';
import { RosterValidator } from './RosterValidator';
import type { ScoutValidationContext } from './ScoutValidationContext';
import { SequenceValidator } from './SequenceValidator';
import { SyntaxValidator } from './SyntaxValidator';
import { TacticalMetadataValidator } from './TacticalMetadataValidator';
import type { ValidationResult, ValidationSeverity } from './validation';

const SEVERITY_RANK: Readonly<Record<ValidationSeverity, number>> = {
  ok: 0,
  warning: 1,
  error: 2,
};

export class ValidationEngine {
  constructor(
    private readonly syntaxValidator = new SyntaxValidator(),
    private readonly profileValidator = new ProfileValidator(),
    private readonly rosterValidator = new RosterValidator(),
    private readonly sequenceValidator = new SequenceValidator(),
    private readonly tacticalMetadataValidator = new TacticalMetadataValidator(),
  ) {}

  validate(
    candidate: CanonicalScoutEventCandidate,
    profile: ComplexityProfile,
    context: ScoutValidationContext,
  ): ValidationResult {
    const results = [
      this.syntaxValidator.validate(candidate),
      this.profileValidator.validate(candidate, profile, context),
      this.rosterValidator.validate(candidate, context),
      this.sequenceValidator.validate(context),
      this.tacticalMetadataValidator.validate(candidate, profile),
    ];
    const severity = results.reduce<ValidationSeverity>(
      (current, result) =>
        SEVERITY_RANK[result.severity] > SEVERITY_RANK[current] ? result.severity : current,
      'ok',
    );

    return {
      valid: severity !== 'error',
      severity,
      issues: results.flatMap((result) => result.issues),
    };
  }
}

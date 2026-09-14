import { ValidationError } from '../../../core/errors/ValidationError';
import { failure, type Result, success } from '../../../core/result/Result';
import { CompletenessEvaluator } from '../../../domain/scout/completeness/CompletenessEvaluator';
import type { CompletenessResult } from '../../../domain/scout/completeness/CompletenessResult';
import { EventFactory } from '../../../domain/scout/events/EventFactory';
import type { ScoutEvent, ScoutInputMode } from '../../../domain/scout/events/ScoutEvent';
import type { CanonicalScoutEventCandidate } from '../../../domain/scout/mapper/CanonicalScoutEventCandidate';
import { AttackOriginResolver } from '../../../domain/scout/tactical/AttackOriginResolver';
import type { ScoutValidationContext } from '../../../domain/scout/validators/ScoutValidationContext';
import { ValidationEngine } from '../../../domain/scout/validators/ValidationEngine';
import type { ValidationResult } from '../../../domain/scout/validators/validation';
import type { ResolvedProfileContext } from '../../../profiles/ProfileResolver';

export interface ValidateAndCreateScoutEventInput {
  readonly candidate: CanonicalScoutEventCandidate;
  readonly inputMode: ScoutInputMode;
  readonly profiles: ResolvedProfileContext;
  readonly context: ScoutValidationContext;
}

export interface ValidateAndCreateScoutEventOutput {
  readonly event: ScoutEvent;
  readonly validation: ValidationResult;
  readonly completeness: CompletenessResult;
}

/** Common candidate-to-event boundary shared by every scout input mode. */
export class ValidateAndCreateScoutEventUseCase {
  constructor(
    private readonly validationEngine = new ValidationEngine(),
    private readonly completenessEvaluator = new CompletenessEvaluator(),
    private readonly eventFactory = new EventFactory(),
    private readonly attackOriginResolver = new AttackOriginResolver(),
  ) {}

  execute(
    input: ValidateAndCreateScoutEventInput,
  ): Result<ValidateAndCreateScoutEventOutput, ValidationError> {
    const candidate = this.attackOriginResolver.resolve(input.candidate, input.context);
    const validation = this.validationEngine.validate(
      candidate,
      input.profiles.complexityProfile,
      input.context,
    );
    if (!validation.valid) {
      return failure(new ValidationError('Scout event validation failed.', validation.issues));
    }

    const completeness = this.completenessEvaluator.evaluate(
      candidate,
      input.profiles.complexityProfile,
      input.context,
    );
    const event = this.eventFactory.create(
      candidate,
      input.context,
      input.profiles,
      validation,
      completeness,
      input.inputMode,
    );
    if (!event.ok) return failure(event.error);

    return success({ event: event.value, validation, completeness });
  }
}

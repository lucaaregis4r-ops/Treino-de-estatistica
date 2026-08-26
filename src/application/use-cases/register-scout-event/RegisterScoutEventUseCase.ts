import type { ParseError } from '../../../core/errors/ParseError';
import { ValidationError } from '../../../core/errors/ValidationError';
import { failure, type Result, success } from '../../../core/result/Result';
import { EventFactory } from '../../../domain/scout/events/EventFactory';
import type { ScoutEvent, ScoutEventMetadata } from '../../../domain/scout/events/ScoutEvent';
import { SemanticMapper } from '../../../domain/scout/mapper/SemanticMapper';
import { Normalizer } from '../../../domain/scout/normalizer/Normalizer';
import { Parser } from '../../../domain/scout/parser/Parser';
import { Tokenizer } from '../../../domain/scout/tokenizer/Tokenizer';
import type { ScoutValidationContext } from '../../../domain/scout/validators/ScoutValidationContext';
import { ValidationEngine } from '../../../domain/scout/validators/ValidationEngine';
import type { ValidationResult } from '../../../domain/scout/validators/validation';
import type { ResolvedProfileContext } from '../../../profiles/ProfileResolver';
import { CompletenessEvaluator } from '../../../domain/scout/completeness/CompletenessEvaluator';
import type { CompletenessResult } from '../../../domain/scout/completeness/CompletenessResult';
import { AttackOriginResolver } from '../../../domain/scout/tactical/AttackOriginResolver';

export interface RegisterScoutEventInput {
  readonly rawCode: string;
  readonly profiles: ResolvedProfileContext;
  readonly context: ScoutValidationContext;
  readonly metadata?: ScoutEventMetadata;
}

export interface RegisterScoutEventOutput {
  readonly event: ScoutEvent;
  readonly normalizedCode: string;
  readonly validation: ValidationResult;
  readonly completeness: CompletenessResult;
}

export class RegisterScoutEventUseCase {
  constructor(
    private readonly normalizer = new Normalizer(),
    private readonly tokenizer = new Tokenizer(),
    private readonly parser = new Parser(),
    private readonly mapper = new SemanticMapper(),
    private readonly validationEngine = new ValidationEngine(),
    private readonly completenessEvaluator = new CompletenessEvaluator(),
    private readonly eventFactory = new EventFactory(),
    private readonly attackOriginResolver = new AttackOriginResolver(),
  ) {}

  execute(
    input: RegisterScoutEventInput,
  ): Result<RegisterScoutEventOutput, ParseError | ValidationError> {
    const normalized = this.normalizer.normalize(
      { rawCode: input.rawCode },
      input.profiles.codeProfile,
    );
    const tokenized = this.tokenizer.tokenize(normalized, input.profiles.codeProfile);
    if (!tokenized.ok) return failure(tokenized.error);

    const parsed = this.parser.parse(tokenized.value);
    if (!parsed.ok) return failure(parsed.error);

    const mapped = this.mapper.map(
      parsed.value,
      normalized,
      input.profiles.codeProfile,
      input.metadata,
    );
    if (!mapped.ok) return failure(mapped.error);

    const candidate = this.attackOriginResolver.resolve(mapped.value, input.context);

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
    );
    if (!event.ok) return failure(event.error);

    return success({
      event: event.value,
      normalizedCode: normalized.normalizedCode,
      validation,
      completeness,
    });
  }
}

import type { ParseError } from '../../../core/errors/ParseError';
import { failure, type Result, success } from '../../../core/result/Result';
import type { ScoutEvent, ScoutEventMetadata } from '../../../domain/scout/events/ScoutEvent';
import type { CanonicalScoutEventCandidate } from '../../../domain/scout/mapper/CanonicalScoutEventCandidate';
import { SemanticMapper } from '../../../domain/scout/mapper/SemanticMapper';
import { Normalizer } from '../../../domain/scout/normalizer/Normalizer';
import { Parser } from '../../../domain/scout/parser/Parser';
import { Tokenizer } from '../../../domain/scout/tokenizer/Tokenizer';
import type { ScoutValidationContext } from '../../../domain/scout/validators/ScoutValidationContext';
import type { ValidationResult } from '../../../domain/scout/validators/validation';
import type { ResolvedProfileContext } from '../../../profiles/ProfileResolver';
import type { CompletenessResult } from '../../../domain/scout/completeness/CompletenessResult';
import { ValidateAndCreateScoutEventUseCase } from './ValidateAndCreateScoutEventUseCase';
import type { ValidationError } from '../../../core/errors/ValidationError';

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

export interface MapTypedScoutCandidateOutput {
  readonly candidate: CanonicalScoutEventCandidate;
  readonly normalizedCode: string;
}

export class RegisterScoutEventUseCase {
  constructor(
    private readonly normalizer = new Normalizer(),
    private readonly tokenizer = new Tokenizer(),
    private readonly parser = new Parser(),
    private readonly mapper = new SemanticMapper(),
    private readonly validateAndCreate = new ValidateAndCreateScoutEventUseCase(),
  ) {}

  mapCandidate(input: RegisterScoutEventInput): Result<MapTypedScoutCandidateOutput, ParseError> {
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

    return success({ candidate: mapped.value, normalizedCode: normalized.normalizedCode });
  }

  execute(
    input: RegisterScoutEventInput,
  ): Result<RegisterScoutEventOutput, ParseError | ValidationError> {
    const mapped = this.mapCandidate(input);
    if (!mapped.ok) return failure(mapped.error);

    const created = this.validateAndCreate.execute({
      candidate: mapped.value.candidate,
      inputMode: 'typed',
      profiles: input.profiles,
      context: input.context,
    });
    if (!created.ok) return failure(created.error);

    return success({
      event: created.value.event,
      normalizedCode: mapped.value.normalizedCode,
      validation: created.value.validation,
      completeness: created.value.completeness,
    });
  }
}

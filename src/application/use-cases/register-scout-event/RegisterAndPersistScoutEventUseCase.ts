import type { EventRepository } from '../../ports/repositories/EventRepository';
import type { ParseError } from '../../../core/errors/ParseError';
import type { RepositoryError } from '../../../core/errors/RepositoryError';
import type { ValidationError } from '../../../core/errors/ValidationError';
import { failure, type Result, success } from '../../../core/result/Result';
import type { ScoutRegisteredEvent } from '../../../domain/match/events/MatchEvent';
import {
  RegisterScoutEventUseCase,
  type RegisterScoutEventInput,
  type RegisterScoutEventOutput,
} from './RegisterScoutEventUseCase';

export class RegisterAndPersistScoutEventUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly register = new RegisterScoutEventUseCase(),
  ) {}

  async execute(
    input: RegisterScoutEventInput,
  ): Promise<Result<RegisterScoutEventOutput, ParseError | ValidationError | RepositoryError>> {
    const registered = this.register.execute(input);
    if (!registered.ok) return failure(registered.error);

    const event: ScoutRegisteredEvent = {
      type: 'scout_registered',
      event: registered.value.event,
    };
    const persisted = await this.events.append(event);
    if (!persisted.ok) return failure(persisted.error);

    return success(registered.value);
  }
}

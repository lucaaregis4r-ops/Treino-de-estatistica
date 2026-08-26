import type { EventRepository } from '../../ports/repositories/EventRepository';
import type { MatchRepository } from '../../ports/repositories/MatchRepository';
import { RepositoryError } from '../../../core/errors/RepositoryError';
import { failure, type Result, success } from '../../../core/result/Result';
import { replayMatch } from '../../../domain/match/replay/MatchReplayService';
import type { MatchState } from '../../../domain/match/state/MatchState';

export class OpenMatchUseCase {
  constructor(
    private readonly matches: MatchRepository,
    private readonly events: EventRepository,
  ) {}

  async execute(matchId: string): Promise<Result<MatchState, RepositoryError>> {
    const metadata = await this.matches.findById(matchId);
    if (!metadata.ok) return failure(metadata.error);
    if (!metadata.value) {
      return failure(new RepositoryError('entity_not_found', `Match ${matchId} was not found.`));
    }

    const events = await this.events.listByMatch(matchId);
    if (!events.ok) return failure(events.error);

    return success(replayMatch(metadata.value, events.value));
  }
}

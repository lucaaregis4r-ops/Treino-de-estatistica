import type { EventRepository } from '../../../application/ports/repositories/EventRepository';
import { RepositoryError } from '../../../core/errors/RepositoryError';
import { failure, type Result, success } from '../../../core/result/Result';
import {
  matchEventId,
  matchEventMatchId,
  matchEventSequence,
  type MatchEvent,
} from '../../../domain/match/events/MatchEvent';
import { STORE_NAMES, type ScoutTrainerDatabase } from '../indexeddb/ScoutTrainerDatabase';
import { requestResult, transactionDone } from '../indexeddb/idbRequests';

interface StoredMatchEvent {
  readonly id: string;
  readonly matchId: string;
  readonly sequence: number;
  readonly event: MatchEvent;
}

export class IndexedDbEventRepository implements EventRepository {
  constructor(private readonly database: ScoutTrainerDatabase) {}

  async append(event: MatchEvent): Promise<Result<void, RepositoryError>> {
    try {
      const database = await this.database.open();
      const transaction = database.transaction(STORE_NAMES.events, 'readwrite');
      const stored: StoredMatchEvent = {
        id: matchEventId(event),
        matchId: matchEventMatchId(event),
        sequence: matchEventSequence(event),
        event,
      };
      transaction.objectStore(STORE_NAMES.events).add(stored);
      await transactionDone(transaction, 'append match event');
      return success(undefined);
    } catch (error) {
      return failure(this.repositoryError(error, 'Could not append match event.'));
    }
  }

  async appendMany(events: readonly MatchEvent[]): Promise<Result<void, RepositoryError>> {
    if (events.length === 0) return success(undefined);
    try {
      const database = await this.database.open();
      const transaction = database.transaction(STORE_NAMES.events, 'readwrite');
      const store = transaction.objectStore(STORE_NAMES.events);
      for (const event of events) {
        store.add({
          id: matchEventId(event),
          matchId: matchEventMatchId(event),
          sequence: matchEventSequence(event),
          event,
        } satisfies StoredMatchEvent);
      }
      await transactionDone(transaction, 'append many match events');
      return success(undefined);
    } catch (error) {
      return failure(this.repositoryError(error, 'Could not append match events.'));
    }
  }

  async listByMatch(matchId: string): Promise<Result<readonly MatchEvent[], RepositoryError>> {
    try {
      const database = await this.database.open();
      const transaction = database.transaction(STORE_NAMES.events, 'readonly');
      const index = transaction.objectStore(STORE_NAMES.events).index('matchId');
      const records = await requestResult(
        index.getAll(IDBKeyRange.only(matchId)) as IDBRequest<StoredMatchEvent[]>,
        'list match events',
      );
      return success(
        records.sort((left, right) => left.sequence - right.sequence).map((record) => record.event),
      );
    } catch (error) {
      return failure(this.repositoryError(error, 'Could not list match events.'));
    }
  }

  private repositoryError(error: unknown, message: string): RepositoryError {
    return error instanceof RepositoryError
      ? error
      : new RepositoryError('database_operation_failed', message, error);
  }
}

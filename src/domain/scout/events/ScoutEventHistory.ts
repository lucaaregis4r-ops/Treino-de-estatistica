import { ValidationError } from '../../../core/errors/ValidationError';
import { createEntityId } from '../../../core/ids/entityId';
import { failure, type Result, success } from '../../../core/result/Result';
import type { ScoutEvent } from './ScoutEvent';

export interface CorrectionEvent {
  readonly type: 'correction';
  readonly id: string;
  readonly targetEventId: string;
  readonly previousRawCode: string;
  readonly newRawCode: string;
  readonly correctedAt: number;
}

export interface UndoEvent {
  readonly type: 'undo';
  readonly id: string;
  readonly targetHistoryEventId: string;
  readonly undoneAt: number;
}

export interface RedoEvent {
  readonly type: 'redo';
  readonly id: string;
  readonly targetUndoEventId: string;
  readonly redoneAt: number;
}

export interface RegisteredScoutEvent {
  readonly type: 'scout';
  readonly id: string;
  readonly event: ScoutEvent;
}

export type ScoutHistoryEvent = RegisteredScoutEvent | CorrectionEvent | UndoEvent | RedoEvent;

interface HistoryDependencies {
  readonly createId: () => string;
  readonly now: () => number;
}

const DEFAULT_DEPENDENCIES: HistoryDependencies = { createId: createEntityId, now: Date.now };

export class ScoutEventHistory {
  private constructor(
    readonly entries: readonly ScoutHistoryEvent[],
    private readonly dependencies: HistoryDependencies,
  ) {}

  static empty(dependencies: HistoryDependencies = DEFAULT_DEPENDENCIES): ScoutEventHistory {
    return new ScoutEventHistory(Object.freeze([]), dependencies);
  }

  register(event: ScoutEvent): ScoutEventHistory {
    return this.append({ type: 'scout', id: event.id, event });
  }

  correct(targetEventId: string, newRawCode: string): Result<ScoutEventHistory, ValidationError> {
    const previousRawCode = this.effectiveRawCode(targetEventId);
    if (previousRawCode === undefined || newRawCode.trim().length === 0) {
      return failure(
        new ValidationError('Correction target and new raw code must be valid.', [
          {
            code:
              previousRawCode === undefined ? 'history_event_not_found' : 'empty_correction_code',
            message:
              previousRawCode === undefined
                ? `Scout event ${targetEventId} was not found.`
                : 'Correction code cannot be empty.',
          },
        ]),
      );
    }

    return success(
      this.append({
        type: 'correction',
        id: this.dependencies.createId(),
        targetEventId,
        previousRawCode,
        newRawCode,
        correctedAt: this.dependencies.now(),
      }),
    );
  }

  undo(targetHistoryEventId: string): Result<ScoutEventHistory, ValidationError> {
    if (!this.entries.some((entry) => entry.id === targetHistoryEventId)) {
      return failure(
        new ValidationError(`History event ${targetHistoryEventId} was not found.`, [
          { code: 'history_event_not_found', message: 'Undo target was not found.' },
        ]),
      );
    }

    return success(
      this.append({
        type: 'undo',
        id: this.dependencies.createId(),
        targetHistoryEventId,
        undoneAt: this.dependencies.now(),
      }),
    );
  }

  redo(targetUndoEventId: string): Result<ScoutEventHistory, ValidationError> {
    const target = this.entries.find(
      (entry): entry is UndoEvent => entry.type === 'undo' && entry.id === targetUndoEventId,
    );
    if (!target) {
      return failure(
        new ValidationError(`Undo event ${targetUndoEventId} was not found.`, [
          { code: 'undo_event_not_found', message: 'Redo target was not found.' },
        ]),
      );
    }

    return success(
      this.append({
        type: 'redo',
        id: this.dependencies.createId(),
        targetUndoEventId,
        redoneAt: this.dependencies.now(),
      }),
    );
  }

  effectiveRawCode(targetEventId: string): string | undefined {
    const registration = this.entries.find(
      (entry): entry is RegisteredScoutEvent =>
        entry.type === 'scout' && entry.event.id === targetEventId,
    );
    if (!registration) return undefined;

    return this.entries.reduce((rawCode, entry) => {
      if (
        entry.type === 'correction' &&
        entry.targetEventId === targetEventId &&
        this.isActionActive(entry.id)
      ) {
        return entry.newRawCode;
      }
      return rawCode;
    }, registration.event.rawCode);
  }

  private isActionActive(actionId: string): boolean {
    const undo = [...this.entries]
      .reverse()
      .find(
        (entry): entry is UndoEvent =>
          entry.type === 'undo' && entry.targetHistoryEventId === actionId,
      );
    if (!undo) return true;
    return this.entries.some(
      (entry) => entry.type === 'redo' && entry.targetUndoEventId === undo.id,
    );
  }

  private append(entry: ScoutHistoryEvent): ScoutEventHistory {
    return new ScoutEventHistory(
      Object.freeze([...this.entries, Object.freeze(entry)]),
      this.dependencies,
    );
  }
}

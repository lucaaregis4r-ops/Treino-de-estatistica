import { RepositoryError } from '../../../core/errors/RepositoryError';

export function requestResult<T>(request: IDBRequest<T>, operation: string): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new RepositoryError(
          request.error?.name === 'ConstraintError'
            ? 'duplicate_event_sequence'
            : 'database_operation_failed',
          `IndexedDB operation failed: ${operation}.`,
          request.error,
        ),
      );
  });
}

export function transactionDone(transaction: IDBTransaction, operation: string): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(
        new RepositoryError(
          transaction.error?.name === 'ConstraintError'
            ? 'duplicate_event_sequence'
            : 'database_operation_failed',
          `IndexedDB transaction failed: ${operation}.`,
          transaction.error,
        ),
      );
    transaction.onerror = () => undefined;
  });
}

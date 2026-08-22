import { RepositoryError } from '../core/errors/RepositoryError';
import { ValidationError } from '../core/errors/ValidationError';
import { failure, success, type Result } from '../core/result/Result';
import { createEntityId } from '../core/ids/entityId';
import type { FreeLogSession } from '../domain/free-log/FreeLogSession';
import type { FreeLogSessionRepository } from './ports/repositories/FreeLogSessionRepository';

type FreeLogError = RepositoryError | ValidationError;

export interface FreeLogServiceDependencies {
  readonly createId: () => string;
  readonly now: () => number;
}

const DEFAULT_DEPENDENCIES: FreeLogServiceDependencies = {
  createId: createEntityId,
  now: Date.now,
};

function escapeCsv(value: string | number): string {
  const serialized = String(value);
  return /[",\r\n]/.test(serialized) ? `"${serialized.replaceAll('"', '""')}"` : serialized;
}

export class FreeLogService {
  constructor(
    private readonly sessions: FreeLogSessionRepository,
    private readonly dependencies = DEFAULT_DEPENDENCIES,
  ) {}

  async list(): Promise<Result<readonly FreeLogSession[], RepositoryError>> {
    const result = await this.sessions.list();
    return result.ok
      ? success([...result.value].sort((left, right) => right.updatedAt - left.updatedAt))
      : result;
  }

  async load(id: string): Promise<Result<FreeLogSession, FreeLogError>> {
    const result = await this.sessions.findById(id);
    if (!result.ok) return failure(result.error);
    return result.value
      ? success(result.value)
      : failure(new ValidationError('Registro livre não encontrado.', []));
  }

  async start(name?: string): Promise<Result<FreeLogSession, RepositoryError>> {
    const now = this.dependencies.now();
    const session: FreeLogSession = {
      id: this.dependencies.createId(),
      name: name?.trim() || `Registro livre ${new Date(now).toLocaleString('pt-BR')}`,
      createdAt: now,
      updatedAt: now,
      entries: Object.freeze([]),
    };
    const saved = await this.sessions.save(session);
    return saved.ok ? success(session) : failure(saved.error);
  }

  async register(id: string, rawValue: string): Promise<Result<FreeLogSession, FreeLogError>> {
    const loaded = await this.load(id);
    if (!loaded.ok) return loaded;
    const value = rawValue.trim();
    if (!value) return failure(new ValidationError('Digite um registro antes de salvar.', []));
    const now = this.dependencies.now();
    const updated: FreeLogSession = {
      ...loaded.value,
      updatedAt: now,
      entries: Object.freeze([
        ...loaded.value.entries,
        {
          id: this.dependencies.createId(),
          sequence: loaded.value.entries.length + 1,
          value,
          createdAt: now,
        },
      ]),
    };
    const saved = await this.sessions.save(updated);
    return saved.ok ? success(updated) : failure(saved.error);
  }

  exportTxt(session: FreeLogSession): string {
    return session.entries.map((entry) => entry.value).join('\n');
  }

  exportCsv(session: FreeLogSession): string {
    return [
      'sequence,timestamp,value',
      ...session.entries.map((entry) =>
        [entry.sequence, new Date(entry.createdAt).toISOString(), entry.value]
          .map(escapeCsv)
          .join(','),
      ),
    ].join('\r\n');
  }
}

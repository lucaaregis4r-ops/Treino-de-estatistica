import type { ProfileRepository } from '../ports/repositories/ProfileRepository';
import type { RepositoryError } from '../../core/errors/RepositoryError';
import type { ProfileError } from '../../core/errors/ProfileError';
import { ValidationError } from '../../core/errors/ValidationError';
import { failure, type Result, success } from '../../core/result/Result';
import type { ProfileRegistry } from '../../profiles/ProfileRegistry';
import type { CodeProfile, ScoutField, TacticalInputProfile } from '../../profiles/types';
import type { Skill } from '../../domain/scout/entities/Skill';

export interface SerializedCodeProfileInput {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly grammar: string;
  readonly skillsJson: string;
  readonly evaluationsJson: string;
  readonly aliasesJson: string;
  readonly tacticalInputJson?: string;
}

type ProfileEditorError = RepositoryError | ProfileError | ValidationError;
const SUPPORTED_GRAMMAR = new Set<ScoutField>(['player', 'skill', 'evaluation']);

function stringRecord(serialized: string, field: string): Record<string, string> {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new ValidationError(`${field} must be valid JSON.`, [
      { code: 'invalid_json', message: `${field} deve ser um objeto JSON válido.`, path: field },
    ]);
  }
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.values(value).some((item) => typeof item !== 'string')
  ) {
    throw new ValidationError(`${field} must map strings to strings.`, [
      { code: 'invalid_mapping', message: `${field} deve mapear textos para textos.`, path: field },
    ]);
  }
  return value as Record<string, string>;
}

function tacticalInput(serialized: string | undefined): TacticalInputProfile | undefined {
  if (!serialized?.trim()) return undefined;
  try {
    const value: unknown = JSON.parse(serialized);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error();
    return value as TacticalInputProfile;
  } catch {
    throw new ValidationError('tacticalInput must be valid JSON.', [
      {
        code: 'invalid_json',
        message: 'tacticalInput deve ser um objeto JSON válido.',
        path: 'tacticalInput',
      },
    ]);
  }
}

export class ProfileEditorService {
  private initialized = false;

  constructor(
    private readonly repository: ProfileRepository,
    private readonly registry: ProfileRegistry,
  ) {}

  list(): readonly CodeProfile[] {
    return this.registry.list('code');
  }

  async initialize(): Promise<Result<readonly CodeProfile[], ProfileEditorError>> {
    if (this.initialized) return success(this.list());
    const stored = await this.repository.list('code');
    if (!stored.ok) return failure(stored.error);
    for (const profile of stored.value) {
      if (profile.kind !== 'code') continue;
      const existing = this.registry.resolve('code', profile.id, profile.version);
      if (!existing.ok) {
        const registered = this.registry.register(profile);
        if (!registered.ok) return failure(registered.error);
      }
    }
    this.initialized = true;
    return success(this.list());
  }

  async save(input: SerializedCodeProfileInput): Promise<Result<CodeProfile, ProfileEditorError>> {
    try {
      const grammar = input.grammar.split(/[\s,;]+/).filter(Boolean) as ScoutField[];
      const unsupported = grammar.find((field) => !SUPPORTED_GRAMMAR.has(field));
      if (unsupported) {
        return failure(
          new ValidationError('Unsupported grammar field.', [
            {
              code: 'unsupported_grammar_field',
              message: `O tokenizer atual não suporta ${unsupported}.`,
              path: 'grammar',
            },
          ]),
        );
      }
      const parsedTacticalInput = tacticalInput(input.tacticalInputJson);
      const profile: CodeProfile = {
        kind: 'code',
        id: input.id.trim(),
        version: input.version.trim(),
        name: input.name.trim(),
        grammar,
        skills: stringRecord(input.skillsJson, 'skills') as Record<string, Skill>,
        evaluations: stringRecord(input.evaluationsJson, 'evaluations'),
        aliases: stringRecord(input.aliasesJson || '{}', 'aliases'),
        ...(parsedTacticalInput ? { tacticalInput: parsedTacticalInput } : {}),
      };
      const registered = this.registry.register(profile);
      if (!registered.ok) return failure(registered.error);
      const persisted = await this.repository.save(profile);
      return persisted.ok ? success(profile) : failure(persisted.error);
    } catch (error) {
      return failure(
        error instanceof ValidationError
          ? error
          : new ValidationError('Profile input could not be read.', [
              { code: 'invalid_profile_input', message: 'Não foi possível interpretar o profile.' },
            ]),
      );
    }
  }
}

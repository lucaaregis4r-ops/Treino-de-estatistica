import type { MatchMetadata, MatchStatus } from '../../../domain/match/entities/MatchMetadata';

const PROFILE_LABELS: Readonly<Record<string, string>> = {
  basic: 'Básico',
  operational: 'Operacional',
  tactical: 'Tático',
  advanced: 'Avançado',
  cbv: 'CBV 2025/26',
};

export const MATCH_STATUS_LABELS: Readonly<Record<MatchStatus, string>> = {
  created: 'Criada',
  in_progress: 'Em andamento',
  finished: 'Finalizada',
};

export function matchProfileLabel(profileId: string): string {
  return PROFILE_LABELS[profileId] ?? `Perfil não traduzido (${profileId})`;
}

export function matchDateLabel(createdAt: number): string {
  return new Date(createdAt).toLocaleDateString('pt-BR');
}

export function sortMatchesByCreation(matches: readonly MatchMetadata[]): MatchMetadata[] {
  return [...matches].sort((left, right) => right.createdAt - left.createdAt);
}

export function normalizeMatchSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

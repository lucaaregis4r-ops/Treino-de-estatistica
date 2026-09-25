import type { MatchMetadata } from './MatchMetadata';

export type MatchSport = 'volleyball' | 'football';

/**
 * Resolves legacy volleyball only when persisted volleyball evidence is present.
 * An absent sport without that evidence is ambiguous and must be recovered by the UI.
 */
export function resolveMatchSport(metadata: MatchMetadata): MatchSport | undefined {
  if (metadata.sport === 'volleyball' || metadata.sport === 'football') return metadata.sport;
  if (
    metadata.initialServingTeamId ||
    metadata.scoringRules ||
    metadata.liberoPlayerIds?.length ||
    metadata.codeProfileId.toLocaleLowerCase().includes('volley')
  ) return 'volleyball';
  return undefined;
}

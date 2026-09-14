export const ANALYTICS_SCHEMA_VERSION = 1;

export interface MatchAnalyticsSnapshot {
  readonly matchId: string;
  readonly schemaVersion: number;
  readonly eventCount: number;
  readonly lastSequence: number;
  readonly generatedAt: number;
  readonly teamSummary: ReadonlyArray<{
    readonly teamId: string;
    readonly attackEfficiencyNumerator: number;
    readonly attackEfficiencyDenominator: number;
    readonly serveEfficiencyNumerator: number;
    readonly serveEfficiencyDenominator: number;
    readonly receptionPositiveNumerator: number;
    readonly receptionPositiveDenominator: number;
    readonly receptionExcellentNumerator: number;
    readonly receptionExcellentDenominator: number;
    readonly sideoutNumerator: number;
    readonly sideoutDenominator: number;
    readonly breakpointNumerator: number;
    readonly breakpointDenominator: number;
    readonly blocks: number;
    readonly aces: number;
    readonly errors: number;
  }>;
  readonly playerSummary: ReadonlyArray<{
    readonly playerId: string;
    readonly teamId: string;
    readonly skill: 'attack' | 'serve' | 'reception' | 'block';
    readonly volume: number;
    readonly points: number;
    readonly errors: number;
    readonly blocked: number;
    readonly numerator: number;
    readonly denominator: number;
  }>;
}

export function createMatchAnalyticsSnapshot(
  matchId: string,
  eventCount: number,
  lastSequence: number,
  generatedAt: number,
  teamSummary: MatchAnalyticsSnapshot['teamSummary'],
  playerSummary: MatchAnalyticsSnapshot['playerSummary'],
): MatchAnalyticsSnapshot {
  return Object.freeze({
    matchId,
    schemaVersion: ANALYTICS_SCHEMA_VERSION,
    eventCount,
    lastSequence,
    generatedAt,
    teamSummary,
    playerSummary,
  });
}

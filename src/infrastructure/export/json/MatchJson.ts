import { ImportError } from '../../../core/errors/ImportError';
import { failure, type Result, success } from '../../../core/result/Result';
import type { Player } from '../../../domain/match/entities/Player';
import type { Team } from '../../../domain/match/entities/Team';
import type { MatchMetadata } from '../../../domain/match/entities/MatchMetadata';
import type { MatchEvent } from '../../../domain/match/events/MatchEvent';
import {
  ANALYSIS_CONFIGURATION_SCHEMA_VERSION,
  type AnalysisConfiguration,
} from '../../../domain/analytics/AnalysisConfiguration';
import {
  REPORT_CHART_CONFIGURATION_SCHEMA_VERSION,
  type ReportChartConfiguration,
} from '../../../domain/reporting/ReportChartConfiguration';
import type { CodeProfile, CompetitionProfile, ComplexityProfile } from '../../../profiles/types';
import type { DerivedAnalyticsReport } from '../../../application/reporting/DerivedAnalyticsReport';
import { ProfileValidator } from '../../../profiles/ProfileValidator';
import { isSkill } from '../../../domain/scout/entities/Skill';

export const MATCH_EXPORT_SCHEMA_VERSION = '1.0.0';
export const MAX_MATCH_IMPORT_BYTES = 50_000_000;

export interface MatchProfileSnapshot {
  readonly code: CodeProfile;
  readonly complexity: ComplexityProfile;
  readonly competition?: CompetitionProfile;
}

export interface MatchExport {
  readonly schemaVersion: typeof MATCH_EXPORT_SCHEMA_VERSION;
  readonly match: MatchMetadata;
  readonly teams: readonly Team[];
  readonly players: readonly Player[];
  readonly profiles: MatchProfileSnapshot;
  readonly events: readonly MatchEvent[];
  readonly analysisConfigurations?: readonly AnalysisConfiguration[];
  readonly reportChartConfigurations?: readonly ReportChartConfiguration[];
  /** Opt-in derived analytics; raw events remain the canonical backup. */
  readonly derivedAnalytics?: DerivedAnalyticsReport;
}

export class JsonMatchExporter {
  export(data: Omit<MatchExport, 'schemaVersion'>): string {
    return JSON.stringify({ schemaVersion: MATCH_EXPORT_SCHEMA_VERSION, ...data }, null, 2);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

const PLAYER_ROLES = new Set([
  'setter',
  'opposite',
  'outside',
  'middle',
  'libero',
  'defensive_specialist',
  'custom',
]);
const FORMATION_STATES = new Set(['normal', 'five_one_inversion', 'unknown', 'custom']);
const SCOUT_COVERAGE_MODES = new Set(['both', 'team_a', 'team_b']);

function validCompleteness(value: unknown): boolean {
  return (
    value === undefined ||
    (isRecord(value) &&
      (value.status === 'complete' || value.status === 'partial') &&
      Array.isArray(value.missingRecommendedFields) &&
      value.missingRecommendedFields.every(isText))
  );
}

function validCourtCoordinates(value: unknown): boolean {
  if (Array.isArray(value)) return value.every(validCourtCoordinates);
  if (!isRecord(value)) return true;
  for (const [key, nested] of Object.entries(value)) {
    if (
      (key === 'x' || key === 'y') &&
      (typeof nested !== 'number' || !Number.isFinite(nested) || nested < 0 || nested > 1)
    )
      return false;
    if (!validCourtCoordinates(nested)) return false;
  }
  return true;
}

function validScoutCoverage(value: unknown, teamIds: ReadonlySet<string>): boolean {
  return (
    value === undefined ||
    (isRecord(value) &&
      typeof value.mode === 'string' &&
      SCOUT_COVERAGE_MODES.has(value.mode) &&
      Array.isArray(value.observedTeamIds) &&
      value.observedTeamIds.every((teamId) => isText(teamId) && teamIds.has(teamId)))
  );
}

function validScoutEvent(
  value: unknown,
  matchId: string,
  teamIds: ReadonlySet<string>,
  playerIds: ReadonlySet<string>,
): boolean {
  if (!isRecord(value) || !isRecord(value.scoreBefore)) return false;
  return (
    isText(value.id) &&
    value.matchId === matchId &&
    isText(value.rallyId) &&
    Number.isSafeInteger(value.sequence) &&
    (value.sequence as number) > 0 &&
    isText(value.teamId) &&
    teamIds.has(value.teamId) &&
    (value.playerId === undefined || (isText(value.playerId) && playerIds.has(value.playerId))) &&
    isText(value.skill) &&
    isSkill(value.skill) &&
    Number.isSafeInteger(value.setNumber) &&
    isFiniteNumber(value.scoreBefore.teamA) &&
    isFiniteNumber(value.scoreBefore.teamB) &&
    isFiniteNumber(value.timestamp) &&
    (value.inputMode === undefined ||
      value.inputMode === 'typed' ||
      value.inputMode === 'visual' ||
      value.inputMode === 'hybrid') &&
    typeof value.rawCode === 'string' &&
    (value.normalizedCode === undefined || typeof value.normalizedCode === 'string') &&
    isText(value.codeProfileId) &&
    isText(value.codeProfileVersion) &&
    isText(value.complexityProfileId) &&
    (value.setterPlayerId === undefined ||
      (isText(value.setterPlayerId) && playerIds.has(value.setterPlayerId))) &&
    (value.setterPosition === undefined ||
      (Number.isInteger(value.setterPosition) &&
        (value.setterPosition as number) >= 1 &&
        (value.setterPosition as number) <= 6)) &&
    (value.formationState === undefined ||
      (typeof value.formationState === 'string' && FORMATION_STATES.has(value.formationState))) &&
    (value.metadata === undefined ||
      (isRecord(value.metadata) &&
        validCourtCoordinates(value.metadata) &&
        validScoutCoverage(value.metadata.coverage, teamIds))) &&
    validCompleteness(value.completeness)
  );
}

function validAnalysisConfiguration(
  value: unknown,
  matchId: string,
  teamIds: ReadonlySet<string>,
): value is AnalysisConfiguration {
  if (!isRecord(value) || !isRecord(value.filters) || !isRecord(value.chart)) return false;
  const filters = value.filters;
  const chart = value.chart;
  return (
    isText(value.id) &&
    value.matchId === matchId &&
    value.schemaVersion === ANALYSIS_CONFIGURATION_SCHEMA_VERSION &&
    isText(value.name) &&
    isFiniteNumber(value.updatedAt) &&
    isText(filters.teamId) &&
    teamIds.has(filters.teamId) &&
    isText(filters.skill) &&
    (filters.skill === 'all' || isSkill(filters.skill)) &&
    (filters.evaluations === null ||
      (Array.isArray(filters.evaluations) && filters.evaluations.every(isText))) &&
    isText(filters.playerId) &&
    isText(filters.setNumber) &&
    isText(filters.rotation) &&
    (filters.coordinate === 'origin' || filters.coordinate === 'target') &&
    (filters.origin === undefined || isText(filters.origin)) &&
    (filters.destination === undefined || isText(filters.destination)) &&
    (chart.viewMode === 'points' || chart.viewMode === 'plays' || chart.viewMode === 'heatmap') &&
    isFiniteNumber(chart.radius) &&
    chart.radius >= 0 &&
    chart.radius <= 1 &&
    isFiniteNumber(chart.intensity) &&
    chart.intensity >= 0
  );
}

function validReportChartConfiguration(
  value: unknown,
  matchId: string,
  teamIds: ReadonlySet<string>,
): value is ReportChartConfiguration {
  if (!isRecord(value) || !isRecord(value.filters) || !isRecord(value.parameters) || !isRecord(value.sample)) {
    return false;
  }
  const filters = value.filters;
  const sample = value.sample;
  const coverage = value.coverage;
  const validType = [
    'win_probability',
    'team_performance',
    'rotation_performance',
    'setter_distribution',
    'attack_evenness',
    'setter_repetition',
  ].includes(String(value.type));
  return (
    isText(value.id) &&
    value.matchId === matchId &&
    value.schemaVersion === REPORT_CHART_CONFIGURATION_SCHEMA_VERSION &&
    validType &&
    isText(value.title) &&
    (filters.teamId === undefined || (isText(filters.teamId) && teamIds.has(filters.teamId))) &&
    (filters.playerId === undefined || isText(filters.playerId)) &&
    (filters.setterPosition === undefined ||
      (isFiniteNumber(filters.setterPosition) && filters.setterPosition >= 1 && filters.setterPosition <= 6)) &&
    isFiniteNumber(value.order) &&
    value.order >= 0 &&
    isFiniteNumber(sample.totalActions) &&
    sample.totalActions >= 0 &&
    isFiniteNumber(sample.identifiedActions) &&
    sample.identifiedActions >= 0 &&
    isFiniteNumber(sample.unidentifiedActions) &&
    sample.unidentifiedActions >= 0 &&
    (coverage === undefined ||
      (isRecord(coverage) &&
        Array.isArray(coverage.modes) &&
        coverage.modes.every(isText) &&
        isFiniteNumber(coverage.identifiedActions) &&
        coverage.identifiedActions >= 0 &&
        isFiniteNumber(coverage.unidentifiedActions) &&
        coverage.unidentifiedActions >= 0))
  );
}

const MATCH_EVENT_TYPES = new Set([
  'rally_started',
  'rally_ended',
  'fault',
  'score_changed',
  'score_adjustment',
  'set_started',
  'serving_team_changed',
  'scout_registered',
  'scout_corrected',
  'scout_undone',
  'scout_redone',
  'set_lineup_confirmed',
  'rally_result',
  'set_finished',
  'match_correction',
  'substitution_made',
]);

function validateMatchExport(
  value: Record<string, unknown>,
): value is Record<string, unknown> & MatchExport {
  if (!isRecord(value.match) || !isRecord(value.profiles)) return false;
  const match = value.match;
  if (
    !isText(match.id) ||
    !isText(match.name) ||
    !isText(match.teamAId) ||
    !isText(match.teamBId) ||
    match.teamAId === match.teamBId ||
    !isFiniteNumber(match.createdAt) ||
    !['created', 'in_progress', 'finished'].includes(String(match.status)) ||
    !isText(match.codeProfileId) ||
    !isText(match.codeProfileVersion) ||
    !isText(match.complexityProfileId)
  )
    return false;

  if (!Array.isArray(value.teams) || value.teams.length !== 2) return false;
  const teams = value.teams;
  if (teams.some((team) => !isRecord(team) || !isText(team.id) || !isText(team.name))) return false;
  const teamIds = new Set(teams.map((team) => (team as Record<string, unknown>).id as string));
  if (teamIds.size !== 2 || !teamIds.has(match.teamAId) || !teamIds.has(match.teamBId))
    return false;

  if (!Array.isArray(value.players)) return false;
  const players = value.players;
  if (
    players.some(
      (player) =>
        !isRecord(player) ||
        !isText(player.id) ||
        !isText(player.teamId) ||
        !teamIds.has(player.teamId) ||
        !Number.isSafeInteger(player.number),
    )
  )
    return false;
  if (
    players.some(
      (player) =>
        isRecord(player) &&
        player.registeredRole !== undefined &&
        (typeof player.registeredRole !== 'string' || !PLAYER_ROLES.has(player.registeredRole)),
    )
  )
    return false;
  const playerIds = new Set(
    players.map((player) => (player as Record<string, unknown>).id as string),
  );
  if (playerIds.size !== players.length) return false;

  const { code, complexity, competition } = value.profiles;
  if (
    !isRecord(code) ||
    code.kind !== 'code' ||
    code.id !== match.codeProfileId ||
    code.version !== match.codeProfileVersion ||
    !Array.isArray(code.grammar) ||
    !isRecord(code.skills) ||
    !isRecord(code.evaluations) ||
    !isText(code.name)
  )
    return false;
  if (
    !isRecord(complexity) ||
    complexity.kind !== 'complexity' ||
    complexity.id !== match.complexityProfileId ||
    !Array.isArray(complexity.requiredFields) ||
    !Array.isArray(complexity.optionalFields) ||
    !isText(complexity.name)
  )
    return false;
  if (complexity.captureRequirements !== undefined && !isRecord(complexity.captureRequirements))
    return false;
  if (
    match.competitionProfileId !== undefined &&
    (!isRecord(competition) ||
      competition.kind !== 'competition' ||
      competition.id !== match.competitionProfileId)
  )
    return false;
  const profileValidator = new ProfileValidator();
  if (
    !profileValidator.validate(code as unknown as CodeProfile).valid ||
    !profileValidator.validate(complexity as unknown as ComplexityProfile).valid
  )
    return false;
  if (
    competition &&
    (!isRecord(competition) ||
      !Array.isArray(competition.metricIds) ||
      !Array.isArray(competition.requiredFields) ||
      !Array.isArray(competition.sourceReferences) ||
      !profileValidator.validate(competition as unknown as CompetitionProfile).valid)
  )
    return false;

  if (!Array.isArray(value.events)) return false;
  const eventIds = new Set<string>();
  const sequences = new Set<number>();
  for (const item of value.events) {
    if (!isRecord(item) || !isText(item.type) || !MATCH_EVENT_TYPES.has(item.type)) return false;
    const envelope = item.type === 'scout_registered' ? item.event : item;
    if (
      !isRecord(envelope) ||
      !isText(envelope.id) ||
      envelope.matchId !== match.id ||
      !Number.isSafeInteger(envelope.sequence) ||
      !isFiniteNumber(envelope.timestamp)
    )
      return false;
    if (eventIds.has(envelope.id) || sequences.has(envelope.sequence as number)) return false;
    eventIds.add(envelope.id);
    sequences.add(envelope.sequence as number);
    if (
      item.type === 'scout_registered' &&
      !validScoutEvent(item.event, match.id, teamIds, playerIds)
    )
      return false;
    if (
      item.type === 'scout_corrected' &&
      !validScoutEvent(item.replacementEvent, match.id, teamIds, playerIds)
    )
      return false;
    if (item.type === 'match_correction') {
      if (
        !isRecord(item.correction) ||
        item.correction.kind !== 'award_point' ||
        !isText(item.correction.teamId) ||
        !teamIds.has(item.correction.teamId) ||
        !isText(item.correction.rallyId) ||
        !isText(item.correction.previousServingTeamId) ||
        !teamIds.has(item.correction.previousServingTeamId)
      )
        return false;
    }
    if (item.type === 'score_adjustment') {
      if (
        !Number.isSafeInteger(item.setNumber) ||
        (item.setNumber as number) < 1 ||
        !isText(item.teamId) ||
        !teamIds.has(item.teamId) ||
        !Number.isSafeInteger(item.delta) ||
        item.delta === 0 ||
        (item.reason !== undefined && typeof item.reason !== 'string')
      )
        return false;
    }
    if (item.type === 'fault') {
      if (
        !isText(item.faultType) ||
        !new Set(['net_touch', 'invasion', 'double_touch', 'rotation_error']).has(item.faultType) ||
        !isText(item.teamId) ||
        !teamIds.has(item.teamId) ||
        !isText(item.rallyId) ||
        item.terminal !== true ||
        !isText(item.pointFor) ||
        !teamIds.has(item.pointFor) ||
        item.pointFor === item.teamId ||
        !isText(item.previousServingTeamId) ||
        !teamIds.has(item.previousServingTeamId) ||
        (item.athleteId !== undefined &&
          (!isText(item.athleteId) || !playerIds.has(item.athleteId)))
      )
        return false;
    }
    if (item.type === 'set_started' && item.courtOrientation !== undefined) {
      if (
        !isRecord(item.courtOrientation) ||
        !isText(item.courtOrientation.leftTeamId) ||
        !teamIds.has(item.courtOrientation.leftTeamId) ||
        !isText(item.courtOrientation.rightTeamId) ||
        !teamIds.has(item.courtOrientation.rightTeamId) ||
        item.courtOrientation.leftTeamId === item.courtOrientation.rightTeamId
      )
        return false;
    }
    if (item.type === 'substitution_made') {
      if (
        !isText(item.teamId) ||
        !teamIds.has(item.teamId) ||
        !Number.isSafeInteger(item.setNumber) ||
        !isText(item.slotId) ||
        !isText(item.playerOutId) ||
        !playerIds.has(item.playerOutId) ||
        !isText(item.playerInId) ||
        !playerIds.has(item.playerInId) ||
        !Number.isInteger(item.rotationPositionAtSubstitution) ||
        (item.rotationPositionAtSubstitution as number) < 1 ||
        (item.rotationPositionAtSubstitution as number) > 6 ||
        (item.score !== undefined &&
          (!isRecord(item.score) ||
            !isFiniteNumber(item.score.teamA) ||
            !isFiniteNumber(item.score.teamB))) ||
        (item.playerOutRole !== undefined &&
          (typeof item.playerOutRole !== 'string' || !PLAYER_ROLES.has(item.playerOutRole))) ||
        (item.playerInRole !== undefined &&
          (typeof item.playerInRole !== 'string' || !PLAYER_ROLES.has(item.playerInRole)))
      )
        return false;
    }
  }
  if (
    value.analysisConfigurations !== undefined &&
    (!Array.isArray(value.analysisConfigurations) ||
      value.analysisConfigurations.some(
        (configuration) => !validAnalysisConfiguration(configuration, match.id as string, teamIds),
      ))
  )
    return false;
  if (
    value.reportChartConfigurations !== undefined &&
    (!Array.isArray(value.reportChartConfigurations) ||
      value.reportChartConfigurations.some(
        (configuration) => !validReportChartConfiguration(configuration, match.id as string, teamIds),
      ))
  )
    return false;
  return true;
}

export class JsonMatchImporter {
  import(serialized: string): Result<MatchExport, ImportError> {
    if (new Blob([serialized]).size > MAX_MATCH_IMPORT_BYTES) {
      return failure(
        new ImportError('invalid_schema', 'The match backup exceeds the supported size.'),
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized);
    } catch (error) {
      return failure(new ImportError('invalid_json', 'The match export is not valid JSON.', error));
    }

    if (
      !isRecord(parsed) ||
      parsed.schemaVersion !== MATCH_EXPORT_SCHEMA_VERSION ||
      !isRecord(parsed.match) ||
      !Array.isArray(parsed.teams) ||
      !Array.isArray(parsed.players) ||
      !isRecord(parsed.profiles) ||
      !Array.isArray(parsed.events) ||
      !validateMatchExport(parsed)
    ) {
      return failure(
        new ImportError('invalid_schema', 'The match export does not match schema version 1.0.0.'),
      );
    }

    return success(parsed as unknown as MatchExport);
  }
}

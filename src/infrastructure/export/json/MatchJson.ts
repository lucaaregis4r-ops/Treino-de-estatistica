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
import type { CanonicalFootballEvent } from '../../../domain/football/StatsBombContract';
import { isValidFootballAssistedRecording } from '../../../domain/football/FootballAssistedRecording';

export const MATCH_EXPORT_SCHEMA_VERSION = '1.2.0';
export const LEGACY_MATCH_EXPORT_SCHEMA_VERSIONS = new Set(['1.0.0', '1.1.0']);
export const MAX_MATCH_IMPORT_BYTES = 50_000_000;

export interface MatchProfileSnapshot {
  readonly code: CodeProfile;
  readonly complexity: ComplexityProfile;
  readonly competition?: CompetitionProfile;
}

export interface MatchExport {
  readonly schemaVersion: typeof MATCH_EXPORT_SCHEMA_VERSION;
  readonly modality: 'volleyball' | 'football' | 'unknown';
  readonly compatibility: MatchCompatibilityManifest;
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

export interface MatchCompatibilityManifest {
  readonly backupContract: typeof MATCH_EXPORT_SCHEMA_VERSION;
  readonly footballEventContract: 'statsbomb-open-data-4.0.0-subset' | 'not_applicable';
  readonly extrasNamespace: 'scout_trainer';
  readonly preservesUnknownEventFields: true;
  readonly limitations: readonly string[];
}

function manifest(modality: MatchExport['modality']): MatchCompatibilityManifest {
  return {
    backupContract: MATCH_EXPORT_SCHEMA_VERSION,
    footballEventContract: modality === 'football' ? 'statsbomb-open-data-4.0.0-subset' : 'not_applicable',
    extrasNamespace: 'scout_trainer',
    preservesUnknownEventFields: true,
    limitations: modality === 'football'
      ? ['Scout Trainer backup is lossless; pure StatsBomb export only includes the documented observed subset.', 'Missing coordinates, players, possession and outcomes remain absent.']
      : ['Scout Trainer JSON is the lossless backup format; provider interchange is not implied.'],
  };
}

export class JsonMatchExporter {
  export(data: Omit<MatchExport, 'schemaVersion' | 'modality' | 'compatibility'>): string {
    const modality = data.match.sport ?? 'unknown';
    return JSON.stringify({ schemaVersion: MATCH_EXPORT_SCHEMA_VERSION, modality, compatibility: manifest(modality), ...data }, null, 2);
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

function validStatsBombEntity(value: unknown): boolean {
  return isRecord(value) && Number.isFinite(value.id) && isText(value.name);
}

function validStatsBombLocation(value: unknown): boolean {
  return Array.isArray(value) && (value.length === 2 || value.length === 3) && value.every(isFiniteNumber) &&
    value[0] >= 0 && value[0] <= 120 && value[1] >= 0 && value[1] <= 80 && (value.length === 2 || value[2] >= 0);
}

function validCanonicalFootballEvent(value: unknown, matchId: string): value is CanonicalFootballEvent {
  if (!isRecord(value) || !isRecord(value.scout_trainer)) return false;
  const extension = value.scout_trainer;
  if (!isText(value.id) || !Number.isSafeInteger(value.index) || (value.index as number) < 1 ||
      (value.period !== 1 && value.period !== 2) || typeof value.timestamp !== 'string' ||
      !/^\d{2}:\d{2}:\d{2}\.\d{3}$/.test(value.timestamp) || !Number.isSafeInteger(value.minute) ||
      !Number.isSafeInteger(value.second) || !validStatsBombEntity(value.type) ||
      !['1.0.0', '1.1.0'].includes(String(extension.schema_version)) || extension.modality !== 'football' ||
      extension.match_id !== matchId || !Number.isSafeInteger(extension.capture_sequence)) return false;
  if (value.team !== undefined && !validStatsBombEntity(value.team)) return false;
  if (value.player !== undefined && !validStatsBombEntity(value.player)) return false;
  if (value.possession_team !== undefined && !validStatsBombEntity(value.possession_team)) return false;
  if (value.possession !== undefined && (!Number.isSafeInteger(value.possession) || (value.possession as number) < 1)) return false;
  if (value.location !== undefined && !validStatsBombLocation(value.location)) return false;
  for (const detailName of ['pass', 'carry', 'shot'] as const) {
    const detail = value[detailName];
    if (detail !== undefined && (!isRecord(detail) || (detail.end_location !== undefined && !validStatsBombLocation(detail.end_location)))) return false;
  }
  const observation = extension.observation;
  if (extension.assisted_recording !== undefined && !isValidFootballAssistedRecording(extension.assisted_recording)) return false;
  if (observation !== undefined) {
    if (!isRecord(observation)) return false;
    if (observation.position !== undefined && !validStatsBombLocation(observation.position)) return false;
    if (observation.precision !== undefined && observation.precision !== 'point' && observation.precision !== 'zone') return false;
    if (observation.coverage !== undefined && observation.coverage !== 'continuous' && observation.coverage !== 'suspended') return false;
    if (observation.protocol !== undefined &&
      (!isRecord(observation.protocol) || observation.protocol.name !== 'scout_trainer.possession' || observation.protocol.version !== '1.0.0' || observation.protocol.mode !== 'control_mark')) return false;
    if (observation.context !== undefined &&
      (!isRecord(observation.context) || !['observed', 'partial', 'not_observed'].includes(String(observation.context.validity)) ||
        (observation.context.outcome !== undefined && (typeof observation.context.outcome !== 'string' || !['continuing', 'lost', 'recovered', 'shot', 'goal', 'stopped'].includes(observation.context.outcome))))) return false;
  }
  return true;
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
  'football_event_registered',
  'football_event_corrected',
  'football_event_undone',
  'football_clock_changed',
]);

function validateMatchExport(
  value: Record<string, unknown>,
): value is Record<string, unknown> & MatchExport {
  if (!isRecord(value.match) || !isRecord(value.profiles)) return false;
  if (!['volleyball', 'football', 'unknown'].includes(String(value.modality)) || !isRecord(value.compatibility) || value.compatibility.backupContract !== MATCH_EXPORT_SCHEMA_VERSION) return false;
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
  if (
    match.sport !== undefined &&
    match.sport !== 'volleyball' &&
    match.sport !== 'football'
  ) return false;
  if ((match.sport === 'football' || match.sport === 'volleyball') && value.modality !== match.sport) return false;

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
    if (item.type === 'football_event_registered' && (!validCanonicalFootballEvent(item.event, match.id) || item.event.id !== item.id)) return false;
    if (item.type === 'football_event_corrected' && (!isText(item.targetEventId) || !validCanonicalFootballEvent(item.replacementEvent, match.id) || item.replacementEvent.id !== item.targetEventId)) return false;
    if (item.type === 'football_event_undone' && !isText(item.targetHistoryEventId)) return false;
    if (item.type === 'football_clock_changed' && ((item.period !== 1 && item.period !== 2) || !isFiniteNumber(item.elapsedMs) || item.elapsedMs < 0 || typeof item.running !== 'boolean' || !isFiniteNumber(item.referenceTimestamp))) return false;
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
  for (const item of value.events) {
    if (!isRecord(item)) return false;
    if (item.type === 'football_event_corrected' && (!isText(item.targetEventId) || !eventIds.has(item.targetEventId))) return false;
    if (item.type === 'football_event_undone' && (!isText(item.targetHistoryEventId) || !eventIds.has(item.targetHistoryEventId))) return false;
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

    if (isRecord(parsed) && LEGACY_MATCH_EXPORT_SCHEMA_VERSIONS.has(String(parsed.schemaVersion)) && isRecord(parsed.match)) {
      const modality = parsed.match.sport === 'football' || parsed.match.sport === 'volleyball' ? parsed.match.sport : 'unknown';
      parsed = { ...parsed, schemaVersion: MATCH_EXPORT_SCHEMA_VERSION, modality, compatibility: manifest(modality) };
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
        new ImportError('invalid_schema', `The match export does not match schema version ${MATCH_EXPORT_SCHEMA_VERSION}.`),
      );
    }

    return success(parsed as unknown as MatchExport);
  }
}

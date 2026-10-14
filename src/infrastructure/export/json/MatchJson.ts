import { ImportError } from '../../../core/errors/ImportError';
import { failure, type Result, success } from '../../../core/result/Result';
import type { Player } from '../../../domain/match/entities/Player';
import type { Team } from '../../../domain/match/entities/Team';
import type { MatchMetadata } from '../../../domain/match/entities/MatchMetadata';
import { validateBasketballFact, type BasketballFact } from '../../../domain/basketball/BasketballScout';
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
import { ESSENTIAL_CODES, FOOTBALL_ESSENTIAL_RESTART_TYPES, FUTSAL_ESSENTIAL_RESTART_TYPES, validateEssentialDraft, type EssentialActionCode, type EssentialScoutDraft } from '../../../domain/essential/EssentialScout';

export const MATCH_EXPORT_SCHEMA_VERSION = '1.3.0';
export const LEGACY_MATCH_EXPORT_SCHEMA_VERSIONS = new Set(['1.0.0', '1.1.0', '1.2.0']);
export const MAX_MATCH_IMPORT_BYTES = 50_000_000;

export interface MatchProfileSnapshot {
  readonly code: CodeProfile;
  readonly complexity: ComplexityProfile;
  readonly competition?: CompetitionProfile;
}

export interface MatchExport {
  readonly schemaVersion: typeof MATCH_EXPORT_SCHEMA_VERSION;
  readonly modality: 'volleyball' | 'football' | 'futsal' | 'basketball' | 'unknown';
  readonly compatibility: MatchCompatibilityManifest;
  readonly match: MatchMetadata;
  readonly teams: readonly Team[];
  readonly players: readonly Player[];
  readonly profiles: MatchProfileSnapshot;
  readonly events: readonly MatchEvent[];
  /** Snapshot metadata only; raw futsal facts remain the canonical source and round-trip unchanged. */
  readonly futsalCoverage?: { readonly facts: number; readonly shots: number; readonly shotsWithPosition: number; readonly controlMarkers: number; readonly continuousControlMarkers: number; readonly shotsWithTacticalContext: number };
  readonly analysisConfigurations?: readonly AnalysisConfiguration[];
  readonly reportChartConfigurations?: readonly ReportChartConfiguration[];
  /** Opt-in derived analytics; raw events remain the canonical backup. */
  readonly derivedAnalytics?: DerivedAnalyticsReport;
}

export interface MatchCompatibilityManifest {
  readonly backupContract: typeof MATCH_EXPORT_SCHEMA_VERSION;
  readonly footballEventContract: 'statsbomb-open-data-4.0.0-subset' | 'not_applicable';
  readonly futsalEventContract: 'scout-trainer-futsal-facts-0.6' | 'not_applicable';
  readonly extrasNamespace: 'scout_trainer';
  readonly preservesUnknownEventFields: true;
  readonly limitations: readonly string[];
}

function manifest(modality: MatchExport['modality']): MatchCompatibilityManifest {
  return {
    backupContract: MATCH_EXPORT_SCHEMA_VERSION,
    footballEventContract: modality === 'football' ? 'statsbomb-open-data-4.0.0-subset' : 'not_applicable',
    futsalEventContract: modality === 'futsal' ? 'scout-trainer-futsal-facts-0.6' : 'not_applicable',
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

function validEssentialExtras(code: EssentialActionCode, extras: Record<string, unknown>, hasOrigin: boolean, hasDestination: boolean): boolean {
  const draft = {
    code, teamId: 'backup-validation',
    ...(hasOrigin ? { position: { x: 0, y: 0 } } : {}),
    ...(hasDestination ? { destination: { x: 0, y: 0 } } : {}),
    ...(code === 'F' ? { outcome: 'gol' } : {}),
    ...extras,
  } as EssentialScoutDraft;
  return validateEssentialDraft(draft) === undefined;
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

function validFutsalFact(value: unknown, teamIds: ReadonlySet<string>, playerTeamIds: ReadonlyMap<string, string>): boolean {
  if (!isRecord(value) || !isRecord(value.position) && value.position !== undefined) return false;
  if (!isText(value.id) || (value.period !== 1 && value.period !== 2) || !isFiniteNumber(value.elapsedMs) || value.elapsedMs < 0 ||
      !['observed', 'partial', 'not_observed'].includes(String(value.observation))) return false;
  if (value.position !== undefined && (!isFiniteNumber(value.position.x) || !isFiniteNumber(value.position.y) || value.position.x < 0 || value.position.x > 1 || value.position.y < 0 || value.position.y > 1)) return false;
  if (value.observation === 'not_observed' && value.position !== undefined) return false;
  if (value.essentialCode !== undefined) {
    const expected = value.kind === 'shot' ? 'F' : value.kind === 'pass' ? 'P' : value.kind === 'chance_pass' ? 'PF' : value.kind === 'progression' ? 'C' : value.kind === 'possession_loss' ? 'PP' : value.kind === 'ball_recovery' ? 'RP' : value.kind === 'foul' ? 'FL' : value.kind === 'restart' ? 'RE' : undefined;
    if (!ESSENTIAL_CODES.includes(value.essentialCode as typeof ESSENTIAL_CODES[number]) || value.essentialCode !== expected) return false;
    const extras = { shirtNumber: value.essentialShirtNumber, third: value.essentialThird, thirdAnchor: value.essentialThirdAnchor, qualifiers: value.essentialQualifiers,
      passResult: value.kind === 'pass' || value.kind === 'chance_pass' ? value.passResult : undefined,
      progressionType: value.kind === 'progression' ? value.progressionType : undefined,
      progressionResult: value.kind === 'progression' ? value.progressionResult : undefined,
      foulCard: value.kind === 'foul' ? value.card : undefined,
      foulAccumulated: value.kind === 'foul' ? value.accumulated : undefined,
      restartType: value.kind === 'restart' ? value.restart : undefined };
    if (!validEssentialExtras(value.essentialCode as EssentialActionCode, extras, value.position !== undefined, value.destination !== undefined)) return false;
    if (value.kind === 'restart' && !FUTSAL_ESSENTIAL_RESTART_TYPES.includes(value.restart as typeof FUTSAL_ESSENTIAL_RESTART_TYPES[number])) return false;
    if (value.kind === 'shot' && (value.position === undefined && value.essentialThird === undefined || value.outcome === 'pending')) return false;
  } else if (value.kind === 'chance_pass' || value.kind === 'pass' || value.kind === 'progression' || value.kind === 'possession_loss' || value.kind === 'ball_recovery' || value.essentialShirtNumber !== undefined || value.essentialThird !== undefined || value.essentialThirdAnchor !== undefined || value.essentialQualifiers !== undefined) return false;
  const validPlayer = (playerId: unknown, teamId: unknown) => playerId === undefined || (isText(playerId) && isText(teamId) && playerTeamIds.get(playerId) === teamId);
  if (value.kind === 'chance_pass' || value.kind === 'pass' || value.kind === 'progression' || value.kind === 'possession_loss' || value.kind === 'ball_recovery') return isText(value.teamId) && teamIds.has(value.teamId) && validPlayer(value.playerId, value.teamId) &&
    (value.destination === undefined || isRecord(value.destination) && isFiniteNumber(value.destination.x) && isFiniteNumber(value.destination.y) && value.destination.x >= 0 && value.destination.x <= 1 && value.destination.y >= 0 && value.destination.y <= 1);
  if (value.kind === 'control') return ['team', 'contested', 'dead_ball', 'unknown'].includes(String(value.state)) && ['continuous', 'suspended'].includes(String(value.coverage)) &&
    (value.state === 'team' ? isText(value.controlledTeamId) && teamIds.has(value.controlledTeamId) && value.observation !== 'not_observed' : value.controlledTeamId === undefined);
  if (value.kind === 'shot') return isText(value.shootingTeamId) && teamIds.has(value.shootingTeamId) && validPlayer(value.playerId, value.shootingTeamId) &&
    (value.destination === undefined || isRecord(value.destination) && value.position !== undefined && isFiniteNumber(value.destination.x) && isFiniteNumber(value.destination.y) && value.destination.x >= 0 && value.destination.x <= 1 && value.destination.y >= 0 && value.destination.y <= 1) &&
    ['pending', 'goal', 'saved', 'blocked', 'off_target', 'post'].includes(String(value.outcome)) &&
    (value.outcome === 'goal' ? isText(value.beneficiaryTeamId) && teamIds.has(value.beneficiaryTeamId) : value.beneficiaryTeamId === undefined);
  if (value.kind === 'tackle') return isText(value.winningTeamId) && teamIds.has(value.winningTeamId) && isText(value.losingTeamId) && teamIds.has(value.losingTeamId) && value.winningTeamId !== value.losingTeamId && validPlayer(value.playerId, value.winningTeamId) && value.observation !== 'not_observed';
  if (value.kind === 'restart') return ['kick_in', 'corner', 'goal_clearance', 'free_kick', 'ten_meter_kick', 'penalty', 'kick_off', 'other', 'unknown'].includes(String(value.restart)) && (value.teamId === undefined || isText(value.teamId) && teamIds.has(value.teamId)) && validPlayer(value.playerId, value.teamId);
  if (value.kind === 'foul') return isText(value.offendingTeamId) && teamIds.has(value.offendingTeamId) && typeof value.accumulated === 'boolean' && validPlayer(value.playerId, value.offendingTeamId) && (value.card === undefined || value.card === 'yellow' || value.card === 'red');
  if (value.kind === 'composition') return isText(value.teamId) && teamIds.has(value.teamId) && Array.isArray(value.playerIds) && value.playerIds.length <= 5 && new Set(value.playerIds).size === value.playerIds.length && value.playerIds.every(id => validPlayer(id, value.teamId)) && ['complete', 'partial'].includes(String(value.certainty)) && (value.shortHanded === undefined || typeof value.shortHanded === 'boolean') && !(value.certainty === 'complete' && value.playerIds.length < 5 && value.shortHanded !== true) && !(value.certainty === 'partial' && value.shortHanded === true);
  if (value.kind === 'substitution') return isText(value.teamId) && teamIds.has(value.teamId) && validPlayer(value.playerOutId, value.teamId) && validPlayer(value.playerInId, value.teamId) && !(value.playerOutId !== undefined && value.playerInId !== undefined && value.playerOutId === value.playerInId) && ['complete', 'partial'].includes(String(value.certainty)) && (value.certainty === 'complete' ? value.playerOutId !== undefined && value.playerInId !== undefined : true);
  if (value.kind === 'tactical_context') return isText(value.teamId) && teamIds.has(value.teamId) && ['own_flying_goalkeeper', 'opponent_flying_goalkeeper'].includes(String(value.numericalSituation)) && typeof value.active === 'boolean';
  if (value.kind === 'tactical_annotation') {
    const optionalEnum = (candidate: unknown, choices: readonly string[]) => candidate === undefined || isText(candidate) && choices.includes(candidate);
    return ['event', 'interval'].includes(String(value.scope)) &&
      (value.teamId === undefined || isText(value.teamId) && teamIds.has(value.teamId)) &&
      (value.targetFactId === undefined || isText(value.targetFactId)) &&
      (value.startFactId === undefined || isText(value.startFactId)) &&
      (value.endFactId === undefined || isText(value.endFactId)) &&
      optionalEnum(value.organization, ['positional', 'transition', 'set_piece', 'other', 'not_observed']) &&
      optionalEnum(value.restartOrigin, ['kick_in', 'corner', 'goal_clearance', 'free_kick', 'ten_meter_kick', 'penalty', 'kick_off', 'other', 'unknown']) &&
      optionalEnum(value.numericalSituation, ['regular', 'own_flying_goalkeeper', 'opponent_flying_goalkeeper', 'short_handed', 'other', 'not_observed']) &&
      optionalEnum(value.defensiveContext, ['pressure', 'block_high', 'block_medium', 'block_low', 'recovery', 'goalkeeper_save', 'not_observed']) &&
      optionalEnum(value.attackingStructure, ['3-1', '4-0', '2-2', 'other', 'not_observed']) &&
      (value.note === undefined || isText(value.note) && value.note.length <= 200) &&
      (value.removed === undefined || value.removed === true) &&
      (value.removed === true || [value.organization, value.restartOrigin, value.numericalSituation, value.defensiveContext, value.attackingStructure].some(item => item !== undefined)) &&
      (value.scope === 'event' ? isText(value.targetFactId) && value.startFactId === undefined && value.endFactId === undefined : isText(value.startFactId) && isText(value.endFactId) && value.targetFactId === undefined);
  }
  if (value.kind === 'score_adjustment') return isText(value.beneficiaryTeamId) && teamIds.has(value.beneficiaryTeamId) && (value.delta === -1 || value.delta === 1) && isText(value.reason);
  return false;
}

function validFutsalFactReferences(value: unknown, facts: ReadonlyMap<string, { readonly fact: Record<string, unknown>; readonly sequence: number }>): boolean {
  if (!isRecord(value) || value.kind !== 'tactical_annotation') return true;
  const eligible = (id: unknown) => {
    if (!isText(id)) return undefined;
    const found = facts.get(id);
    return found && ['control', 'tackle', 'shot', 'restart', 'foul'].includes(String(found.fact.kind)) ? found : undefined;
  };
  if (value.scope === 'event') return Boolean(eligible(value.targetFactId));
  const start = eligible(value.startFactId), end = eligible(value.endFactId);
  return Boolean(start && end && start.fact.period === end.fact.period && start.sequence <= end.sequence);
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
  if (extension.essential_code !== undefined) {
    const expectedType = extension.essential_code === 'F' ? 16 : extension.essential_code === 'P' || extension.essential_code === 'PF' ? 30 : extension.essential_code === 'C' ? extension.essential_progression_type === 'dribble' ? 14 : 43 : extension.essential_code === 'PP' ? 1001 : extension.essential_code === 'RP' ? 2 : extension.essential_code === 'FL' ? 22 : extension.essential_code === 'RE' ? 1002 : undefined;
    if (!ESSENTIAL_CODES.includes(extension.essential_code as typeof ESSENTIAL_CODES[number]) || !isRecord(value.type) || value.type.id !== expectedType || !isRecord(extension.observation) || !isText(extension.observation.teamId) || extension.observation.coverage !== 'suspended') return false;
    const extras = { shirtNumber: extension.essential_shirt_number, third: extension.essential_third, thirdAnchor: extension.essential_third_anchor, qualifiers: extension.essential_qualifiers,
      passResult: extension.essential_pass_result, progressionType: extension.essential_progression_type, progressionResult: extension.essential_progression_result,
      foulCard: extension.essential_foul_card, restartType: extension.essential_restart_type };
    const hasDestination = isRecord(value.pass) && value.pass.end_location !== undefined || isRecord(value.carry) && value.carry.end_location !== undefined || isRecord(value.shot) && value.shot.end_location !== undefined || extension.essential_destination !== undefined;
    if (!validEssentialExtras(extension.essential_code as EssentialActionCode, extras, value.location !== undefined, hasDestination)) return false;
    if (extension.essential_destination !== undefined && (extension.essential_code !== 'C' || extension.essential_progression_type !== 'dribble' || !validStatsBombLocation(extension.essential_destination))) return false;
    if (extension.essential_code === 'RE' && !FOOTBALL_ESSENTIAL_RESTART_TYPES.includes(extension.essential_restart_type as typeof FOOTBALL_ESSENTIAL_RESTART_TYPES[number])) return false;
    if (extension.essential_code === 'F' && (value.location === undefined && extension.essential_third === undefined || !isRecord(value.shot) || !isRecord(value.shot.outcome) || !['Goal', 'Saved', 'Off T', 'Blocked', 'Post'].includes(String(value.shot.outcome.name)))) return false;
    if (extension.essential_code === 'P' || extension.essential_code === 'PF') {
      if (!isRecord(value.pass) || (extension.essential_pass_result === 'incomplete' ? !isRecord(value.pass.outcome) || value.pass.outcome.name !== 'Incomplete' : value.pass.outcome !== undefined)) return false;
    }
    if (extension.essential_code === 'C' && extension.essential_progression_type === 'dribble') {
      const expectedOutcome = extension.essential_progression_result === 'retained' ? 'Won' : extension.essential_progression_result === 'lost' ? 'Lost' : 'Observed';
      if (!isRecord(value.dribble) || !isRecord(value.dribble.outcome) || value.dribble.outcome.name !== expectedOutcome) return false;
    }
    if (extension.essential_code === 'C' && extension.essential_progression_type === 'carry' && !isRecord(value.carry)) return false;
  } else if (extension.essential_shirt_number !== undefined || extension.essential_third !== undefined || extension.essential_third_anchor !== undefined || extension.essential_qualifiers !== undefined || extension.essential_pass_result !== undefined || extension.essential_progression_type !== undefined || extension.essential_progression_result !== undefined || extension.essential_foul_card !== undefined || extension.essential_restart_type !== undefined || extension.essential_destination !== undefined) return false;
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
  'court_orientation_changed',
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
  'futsal_clock_changed',
  'futsal_fact_registered',
  'futsal_fact_corrected',
  'futsal_fact_undone',
  'basketball_fact_registered',
  'basketball_fact_corrected',
  'basketball_fact_undone',
]);

function validateMatchExport(
  value: Record<string, unknown>,
): value is Record<string, unknown> & MatchExport {
  if (!isRecord(value.match) || !isRecord(value.profiles)) return false;
  if (!['volleyball', 'football', 'futsal', 'basketball', 'unknown'].includes(String(value.modality)) || !isRecord(value.compatibility) || value.compatibility.backupContract !== MATCH_EXPORT_SCHEMA_VERSION) return false;
  if (value.compatibility.futsalEventContract !== (value.modality === 'futsal' ? 'scout-trainer-futsal-facts-0.6' : 'not_applicable')) return false;
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
    match.sport !== 'football' &&
    match.sport !== 'futsal' &&
    match.sport !== 'basketball'
  ) return false;
  if (match.futsalSettings !== undefined && (!isRecord(match.futsalSettings) || !['fifa-2025-26', 'competition-custom'].includes(String(match.futsalSettings.ruleset)) || !isFiniteNumber(match.futsalSettings.periodDurationMs) || match.futsalSettings.periodDurationMs <= 0 || (match.futsalSettings.courtMeters !== undefined && (!isRecord(match.futsalSettings.courtMeters) || !isFiniteNumber(match.futsalSettings.courtMeters.length) || match.futsalSettings.courtMeters.length <= 0 || !isFiniteNumber(match.futsalSettings.courtMeters.width) || match.futsalSettings.courtMeters.width <= 0)))) return false;
  if ((match.sport === 'football' || match.sport === 'volleyball' || match.sport === 'futsal' || match.sport === 'basketball') && value.modality !== match.sport) return false;

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
  const basketballFactIds = new Set<string>();
  const basketballOperationIds = new Set<string>();
  const basketballUndoneIds = new Set<string>();
  const futsalFactIds = new Set<string>();
  const futsalFacts = new Map<string, { readonly fact: Record<string, unknown>; readonly sequence: number }>();
  const futsalOperationIds = new Set<string>();
  const futsalUndoneOperationIds = new Set<string>();
  const playerTeamIds = new Map((value.players as Player[]).map(player => [player.id, player.teamId]));
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
    if (item.type === 'basketball_fact_registered' || item.type === 'basketball_fact_corrected') {
      if (match.sport !== 'basketball') return false;
      const fact = item.type === 'basketball_fact_registered' ? item.fact : item.replacementFact;
      if (!isRecord(fact) || validateBasketballFact(fact as unknown as BasketballFact, teamIds, playerTeamIds)) return false;
      if (item.type === 'basketball_fact_registered') {
        if (basketballFactIds.has(String(fact.id))) return false;
        basketballFactIds.add(String(fact.id));
      } else if (!isText(item.targetFactId) || !basketballFactIds.has(item.targetFactId) || fact.id !== item.targetFactId) return false;
      basketballOperationIds.add(String(item.id));
    }
    if (item.type === 'basketball_fact_undone') {
      if (match.sport !== 'basketball' || !isText(item.targetHistoryEventId) || !basketballOperationIds.has(item.targetHistoryEventId) || basketballUndoneIds.has(item.targetHistoryEventId)) return false;
      basketballUndoneIds.add(item.targetHistoryEventId);
    }
    if (item.type === 'futsal_clock_changed') {
      if (match.sport !== 'futsal') return false;
      const commands = ['start', 'pause', 'adjust', 'await_final_kick', 'finish_period', 'advance_period', 'reconcile'];
      const statuses = ['ready', 'running', 'paused', 'awaiting_final_kick', 'period_finished', 'match_finished'];
      if ((item.period !== 1 && item.period !== 2) || !commands.includes(String(item.command)) || !statuses.includes(String(item.status)) || !isFiniteNumber(item.elapsedMs) || item.elapsedMs < 0 || !isFiniteNumber(item.periodDurationMs) || item.periodDurationMs <= 0 || item.elapsedMs > item.periodDurationMs || !isFiniteNumber(item.referenceTimestamp)) return false;
      if (['adjust', 'reconcile', 'await_final_kick'].includes(String(item.command)) && !isText(item.reason)) return false;
    }
    if (item.type === 'futsal_fact_registered') {
      if (match.sport !== 'futsal' || !validFutsalFact(item.fact, teamIds, playerTeamIds) || !validFutsalFactReferences(item.fact, futsalFacts) || futsalFactIds.has(String((item.fact as Record<string, unknown>).id)) || eventIds.has(String((item.fact as Record<string, unknown>).id))) return false;
      futsalFactIds.add(String((item.fact as Record<string, unknown>).id));
      eventIds.add(String((item.fact as Record<string, unknown>).id));
      futsalFacts.set(String((item.fact as Record<string, unknown>).id), { fact: item.fact as Record<string, unknown>, sequence: item.sequence as number });
      futsalOperationIds.add(String(item.id));
    }
    if (item.type === 'futsal_fact_corrected') {
      if (match.sport !== 'futsal' || !isText(item.targetFactId) || !futsalFactIds.has(item.targetFactId) || !validFutsalFact(item.replacementFact, teamIds, playerTeamIds) || !validFutsalFactReferences(item.replacementFact, new Map([...futsalFacts].filter(([id]) => id !== item.targetFactId))) || (item.replacementFact as Record<string, unknown>).id !== item.targetFactId) return false;
      futsalFacts.set(item.targetFactId, { fact: item.replacementFact as Record<string, unknown>, sequence: futsalFacts.get(item.targetFactId)!.sequence });
      futsalOperationIds.add(String(item.id));
    }
    if (item.type === 'futsal_fact_undone') {
      if (match.sport !== 'futsal' || !isText(item.targetHistoryEventId) || !futsalOperationIds.has(item.targetHistoryEventId) || futsalUndoneOperationIds.has(item.targetHistoryEventId)) return false;
      futsalUndoneOperationIds.add(item.targetHistoryEventId);
    }
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
    if ((item.type === 'set_started' && item.courtOrientation !== undefined) || item.type === 'court_orientation_changed') {
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
      const modality = parsed.match.sport === 'football' || parsed.match.sport === 'volleyball' || parsed.match.sport === 'futsal' || parsed.match.sport === 'basketball' ? parsed.match.sport : 'unknown';
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

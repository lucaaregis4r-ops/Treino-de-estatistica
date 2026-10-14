import { FOOTBALL_POSSESSION_PROTOCOL, projectControl, footballNumericId, mergeFootballCorrection, timestampMs, validateFootballDraft, type FootballObservation } from '../domain/football/FootballObservation';
import type { EventRepository } from './ports/repositories/EventRepository';
import type { MatchRepository } from './ports/repositories/MatchRepository';
import type { PlayerRepository } from './ports/repositories/PlayerRepository';
import type { TeamRepository } from './ports/repositories/TeamRepository';
import { OpenMatchUseCase } from './use-cases/open-match/OpenMatchUseCase';
import { RegisterScoutEventUseCase } from './use-cases/register-scout-event/RegisterScoutEventUseCase';
import type { ParseError } from '../core/errors/ParseError';
import type { ImportError } from '../core/errors/ImportError';
import type { ProfileError } from '../core/errors/ProfileError';
import { RepositoryError } from '../core/errors/RepositoryError';
import { ValidationError } from '../core/errors/ValidationError';
import { createEntityId } from '../core/ids/entityId';
import { failure, type Result, success } from '../core/result/Result';
import type { MatchMetadata } from '../domain/match/entities/MatchMetadata';
import type { Player } from '../domain/match/entities/Player';
import type { Team } from '../domain/match/entities/Team';
import {
  findRedoTarget,
  findUndoTarget,
  projectEffectiveMatchEvents,
  projectScoutTimeline,
  type ProjectedScoutEvent,
} from '../domain/match/events/ScoutTimeline';
import { type FaultType, type MatchEvent, type FutsalClockCommand } from '../domain/match/events/MatchEvent';
import { MatchEventFactory } from '../domain/match/events/MatchEventFactory';
import type { MatchState } from '../domain/match/state/MatchState';
import { swapCourtOrientation } from '../domain/match/state/CourtOrientation';
import { JsonMatchExporter } from '../infrastructure/export/json/MatchJson';
import { JsonMatchImporter } from '../infrastructure/export/json/MatchJson';
import type { MatchBackupRepository } from './ports/backup/MatchBackupRepository';
import type { AnalysisConfigurationRepository } from './ports/repositories/AnalysisConfigurationRepository';
import type { AnalyticsSnapshotRepository } from './ports/repositories/AnalyticsSnapshotRepository';
import type { ReportChartConfigurationRepository } from './ports/repositories/ReportChartConfigurationRepository';
import { CsvMatchExporter } from '../infrastructure/export/csv/MatchCsv';
import { TxtMatchExporter } from '../infrastructure/export/txt/MatchTxt';
import type { ProfileRegistry } from '../profiles/ProfileRegistry';
import { ProfileResolver, type ResolvedProfileContext } from '../profiles/ProfileResolver';
import type {
  ScoutCoverage,
  ScoutEvent,
  ScoutEventMetadata,
} from '../domain/scout/events/ScoutEvent';
import type { ScoutValidationContext } from '../domain/scout/validators/ScoutValidationContext';
import type { VisualScoutDraft } from '../domain/scout/mapper/VisualScoutDraft';
import { VisualScoutMapper } from '../domain/scout/mapper/VisualScoutMapper';
import { HybridScoutMerger } from '../domain/scout/mapper/HybridScoutMerger';
import { ValidateAndCreateScoutEventUseCase } from './use-cases/register-scout-event/ValidateAndCreateScoutEventUseCase';
import {
  ROTATION_POSITIONS,
  createDefaultLineup,
  type CourtRotationPosition,
  type SetLineup,
  type TacticalRole,
  playerRoleForTacticalRole,
} from '../domain/match/lineup/SetLineup';
import { RotationEngine } from '../domain/match/lineup/RotationEngine';
import type { PlayerRole } from '../domain/match/roles/PlayerRole';
import {
  DEFAULT_INDOOR_SCORING_RULES,
  type SetScoringRules,
} from '../domain/match/rules/SetScoringRules';
import { MatchReplayService, replayMatch } from '../domain/match/replay/MatchReplayService';
import { StatisticsEngine } from '../domain/statistics/StatisticsEngine';
import type { MetricResult } from '../domain/statistics/metrics/MetricResult';
import { BASIC_METRIC_IDS } from '../domain/statistics/metrics/volleyball/volleyballMetrics';
import { createDefaultMetricRegistry } from '../domain/statistics/registry/createDefaultMetricRegistry';
import {
  buildStatisticsDashboard,
  type StatisticsDashboardViewModel,
} from './view-models/StatisticsDashboardViewModel';
import { RallyContextResolver } from '../domain/rally/context/RallyContextResolver';
import type { TacticalRallyProjection } from '../domain/rally/context/TacticalRallyProjection';
import { TACTICAL_METRIC_IDS } from '../domain/statistics/metrics/tactical/tacticalMetrics';
import {
  buildTacticalAnalytics,
  type TacticalAnalyticsViewModel,
} from './view-models/TacticalAnalyticsViewModel';
import { MatchAnalyticsService } from './analytics/MatchAnalyticsService';
import { SequenceAnalyticsService, type SequenceAnalytics } from './analytics/SequenceAnalyticsService';
import type { MatchReportModel } from './reporting/MatchReportModel';
import type { ReportDraft } from './reporting/ReportDraft';
import { buildDerivedAnalyticsReport } from './reporting/DerivedAnalyticsReport';
import { MatchPdfRenderer } from '../infrastructure/export/pdf/MatchPdfRenderer';
import { StatisticsCsvExporter } from '../infrastructure/export/csv/StatisticsCsvExporter';
import { resolveMatchSport } from '../domain/match/entities/MatchSport';
import { projectBasketball, validateBasketballFact, type BasketballFact, type BasketballFactDraft, type BasketballProjection } from '../domain/basketball/BasketballScout';
import { buildFutsalAnalytics } from '../domain/futsal/FutsalAnalytics';
import { exportFutsalAnalyticsCsv, renderFutsalAnalyticsPdf } from '../infrastructure/export/futsal/FutsalReportExporters';
import { createCanonicalFootballEvent, effectiveElapsed, formatFootballTimestamp, projectFootball, type FootballOutcome, type FootballProjection } from '../domain/football/FootballRecorder';
import { normalizedToStatsBomb, type FootballAction } from '../domain/football/StatsBombContract';
import { exportCanonicalStatsBomb, OPEN_DATA_VERSION } from '../domain/football/StatsBombOpenData';
import { footballAssistedCandidateKey, footballAssistedSourceRevision, isValidFootballAssistedRecording, type FootballAssistedRecording } from '../domain/football/FootballAssistedRecording';
import { DEFAULT_FUTSAL_PERIOD_DURATION_MS, effectiveFutsalElapsed, projectFutsalClock, type FutsalClockState } from '../domain/futsal/FutsalClock';
import { projectFutsalScout, validateFutsalFact, validateFutsalFactReferences, type FutsalFact, type FutsalFactDraft, type FutsalScoutProjection } from '../domain/futsal/FutsalScout';
import { analyzeSequenceContextModel as fitSequenceContextModel, projectFootballObservedSequences, projectFutsalObservedSequences, projectVolleyballObservedSequences, type ObservedSequenceProjection, type SequenceContextModelResult } from '../domain/analytics/observed-sequence';
import type { ObservedSport, ObservedSequence } from '../domain/analytics/observed-sequence/ObservedSequence';
import { FOOTBALL_ESSENTIAL_RESTART_TYPES, FUTSAL_ESSENTIAL_RESTART_TYPES, projectEssentialFootballActions, projectEssentialFutsalActions, validateEssentialDraft, type EssentialActionCode, type EssentialFoulCard, type EssentialOutcome, type EssentialPassResult, type EssentialProgressionResult, type EssentialProgressionType, type EssentialQualifier, type EssentialRestartType, type EssentialThird, type EssentialThirdAnchor, type EssentialScoutDraft, type EssentialScoutRecord } from '../domain/essential/EssentialScout';

function futsalBackupCoverage(projection: FutsalScoutProjection) {
  const facts = projection.facts;
  const shots = facts.filter(item => item.fact.kind === 'shot');
  const annotations = facts.filter(item => item.fact.kind === 'tactical_annotation');
  const shotsWithTacticalContext = shots.filter(shot => annotations.some(annotation => {
    if (annotation.fact.kind !== 'tactical_annotation') return false;
    if (annotation.fact.scope === 'event') return annotation.fact.targetFactId === shot.fact.id;
    const startFactId = annotation.fact.startFactId;
    const endFactId = annotation.fact.endFactId;
    const start = facts.find(item => item.fact.id === startFactId)?.sequence;
    const end = facts.find(item => item.fact.id === endFactId)?.sequence;
    return start !== undefined && end !== undefined && shot.sequence >= start && shot.sequence <= end;
  })).length;
  const controls = facts.filter(item => item.fact.kind === 'control');
  return { facts: facts.length, shots: shots.length, shotsWithPosition: shots.filter(item => item.fact.kind === 'shot' && !!item.fact.position).length, controlMarkers: controls.length, continuousControlMarkers: controls.filter(item => item.fact.kind === 'control' && item.fact.coverage === 'continuous').length, shotsWithTacticalContext };
}

export interface PlayerRegistrationInput {
  readonly number: number;
  readonly name?: string;
  readonly active?: boolean;
  readonly libero?: boolean;
  readonly registeredRole?: PlayerRole;
}

export interface MatchContextAdjustmentInput {
  readonly servingTeamId: string;
  readonly positionOneByTeam: Readonly<Record<string, string>>;
  readonly score: { readonly teamA: number; readonly teamB: number };
  readonly resumeFromServe?: boolean;
}

export interface RegisterFaultInput {
  readonly teamId: string;
  readonly faultType: FaultType;
  readonly athleteId?: string;
}

export interface LineupPositionInput {
  readonly position: CourtRotationPosition;
  readonly tacticalRole: TacticalRole;
  readonly playerNumber: number;
}

export interface StartNextSetInput {
  readonly servingTeamId?: string;
  readonly teamALineup?: readonly LineupPositionInput[];
  readonly teamBLineup?: readonly LineupPositionInput[];
}

export interface CreateMatchInput {
  readonly sport?: 'volleyball' | 'football' | 'futsal' | 'basketball';
  readonly name?: string;
  readonly teamAName: string;
  readonly teamBName: string;
  readonly teamAPlayers: readonly (number | PlayerRegistrationInput)[];
  readonly teamBPlayers: readonly (number | PlayerRegistrationInput)[];
  readonly teamALineup?: readonly LineupPositionInput[];
  readonly teamBLineup?: readonly LineupPositionInput[];
  readonly initialServingTeam?: 'teamA' | 'teamB';
  readonly scoringRules?: SetScoringRules;
  readonly complexityProfileId: 'basic' | 'operational' | 'tactical' | 'advanced' | 'cbv';
  readonly codeProfileId?: string;
}

export interface TeamStatistics {
  readonly teamId: string;
  readonly results: readonly MetricResult[];
}

export interface MatchExportBundle {
  readonly folderName: string;
  readonly files: Readonly<Record<string, string>>;
}

export interface MatchWorkspace {
  readonly state: MatchState;
  readonly teams: readonly [Team, Team];
  readonly players: readonly Player[];
  readonly events: readonly MatchEvent[];
  readonly timeline: readonly ProjectedScoutEvent[];
  readonly profiles: ResolvedProfileContext;
  readonly statistics: readonly TeamStatistics[];
  readonly dashboard: StatisticsDashboardViewModel;
  readonly tacticalStatistics: readonly TeamStatistics[];
  readonly tacticalAnalytics: TacticalAnalyticsViewModel;
  readonly currentLineups: readonly SetLineup[];
  readonly tacticalRally: TacticalRallyProjection;
  readonly sequenceAnalytics?: SequenceAnalytics;
  readonly report: MatchReportModel;
  readonly coverage: ScoutCoverage;
  readonly football?: FootballProjection;
  readonly futsalClock?: FutsalClockState;
  readonly futsalScout?: FutsalScoutProjection;
  readonly basketball?: BasketballProjection;
  readonly observedSequences: ObservedSequenceProjection;
  readonly essentialActions: readonly EssentialScoutRecord[];
}

export interface RegisterFootballEventInput {
  readonly shotContext?: import('../domain/football/StatsBombContract').FootballShotContext;
  readonly observation?: FootballObservation;
  readonly capturedElapsedMs?: number;
  readonly teamId: string;
  readonly playerId?: string;
  readonly relatedPlayerId?: string;
  readonly action: FootballAction;
  readonly outcome: FootballOutcome;
  readonly location?: { readonly x: number; readonly y: number };
  readonly endLocation?: { readonly x: number; readonly y: number };
  readonly possessionTeamId?: string;
  readonly essentialCode?: EssentialActionCode;
  readonly essentialShirtNumber?: number;
  readonly essentialThird?: EssentialThird;
  readonly essentialThirdAnchor?: EssentialThirdAnchor;
  readonly essentialQualifiers?: readonly EssentialQualifier[];
  readonly essentialPassResult?: EssentialPassResult;
  readonly essentialProgressionType?: EssentialProgressionType;
  readonly essentialProgressionResult?: EssentialProgressionResult;
  readonly essentialFoulCard?: EssentialFoulCard;
  readonly essentialRestartType?: EssentialRestartType;
}

/** T03 has no screen: callers persist one versioned local review record at a time. */
export interface SaveFootballAssistedRecordingInput {
  readonly recording: FootballAssistedRecording;
}

/** Capture time is kept out of the persisted observation extension. */
export type ObserveFootballControlInput = FootballObservation & {
  readonly capturedElapsedMs?: number;
};

type ServiceError = RepositoryError | ValidationError | ParseError | ProfileError | ImportError;

export interface ServiceDependencies {
  readonly createId: () => string;
  readonly now: () => number;
}

const DEFAULT_DEPENDENCIES: ServiceDependencies = { createId: createEntityId, now: Date.now };

function normalizePlayerInput(input: number | PlayerRegistrationInput): PlayerRegistrationInput {
  return typeof input === 'number' ? { number: input } : input;
}

function duplicateNumber(players: readonly PlayerRegistrationInput[]): number | undefined {
  const seen = new Set<number>();
  return players.find((player) => {
    if (seen.has(player.number)) return true;
    seen.add(player.number);
    return false;
  })?.number;
}

function localExportTimestamp(value: number): string {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(
    date.getHours(),
  )}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${String(date.getMilliseconds()).padStart(
    3,
    '0',
  )}`;
}

const ESSENTIAL_TO_FOOTBALL_OUTCOME: Record<EssentialOutcome, FootballOutcome> = {
  gol: 'goal', defesa: 'saved', fora: 'off_target', bloqueada: 'blocked', trave: 'post',
};
const ESSENTIAL_TO_FUTSAL_OUTCOME: Record<EssentialOutcome, 'goal' | 'saved' | 'off_target' | 'blocked' | 'post'> = {
  gol: 'goal', defesa: 'saved', fora: 'off_target', bloqueada: 'blocked', trave: 'post',
};

function essentialFootballInput(draft: EssentialScoutDraft, capturedElapsedMs?: number): RegisterFootballEventInput {
  const action: FootballAction = draft.code === 'F' ? 'shot' : draft.code === 'P' || draft.code === 'PF' ? 'pass' : draft.code === 'C' ? draft.progressionType === 'dribble' ? 'dribble' : 'carry' : draft.code === 'PP' ? 'loss' : draft.code === 'RP' ? 'ball_recovery' : draft.code === 'FL' ? 'foul' : 'restart';
  const outcome: FootballOutcome = draft.code === 'F' ? ESSENTIAL_TO_FOOTBALL_OUTCOME[draft.outcome!] : draft.code === 'P' || draft.code === 'PF' ? draft.passResult === 'incomplete' ? 'incomplete' : draft.passResult === 'unknown' ? 'observed' : 'complete' : draft.code === 'C' && draft.progressionType === 'dribble' ? draft.progressionResult === 'retained' ? 'won' : draft.progressionResult === 'lost' ? 'lost' : 'observed' : 'observed';
  return {
    teamId: draft.teamId, ...(draft.playerId ? { playerId: draft.playerId } : {}),
    action, outcome,
    essentialCode: draft.code,
    ...(draft.shirtNumber !== undefined ? { essentialShirtNumber: draft.shirtNumber } : {}),
    ...(draft.third ? { essentialThird: draft.third } : {}),
    ...(draft.thirdAnchor ? { essentialThirdAnchor: draft.thirdAnchor } : {}),
    ...(draft.qualifiers ? { essentialQualifiers: [...draft.qualifiers] } : {}),
    ...(draft.passResult ? { essentialPassResult: draft.passResult } : {}),
    ...(draft.progressionType ? { essentialProgressionType: draft.progressionType } : {}),
    ...(draft.progressionResult ? { essentialProgressionResult: draft.progressionResult } : {}),
    ...(draft.foulCard ? { essentialFoulCard: draft.foulCard } : {}),
    ...(draft.restartType ? { essentialRestartType: draft.restartType } : {}),
    ...(draft.position ? { location: draft.position } : {}),
    ...(draft.destination ? { endLocation: draft.destination } : {}),
    ...(capturedElapsedMs !== undefined ? { capturedElapsedMs } : {}),
    observation: { before: { kind: 'unknown' }, coverage: 'suspended', context: { validity: 'partial' } },
  };
}

function essentialFutsalDraft(draft: EssentialScoutDraft): FutsalFactDraft {
  const base = { observation: 'observed' as const, essentialCode: draft.code, ...(draft.position ? { position: draft.position } : {}),
    ...(draft.shirtNumber !== undefined ? { essentialShirtNumber: draft.shirtNumber } : {}),
    ...(draft.third ? { essentialThird: draft.third } : {}),
    ...(draft.thirdAnchor ? { essentialThirdAnchor: draft.thirdAnchor } : {}),
    ...(draft.qualifiers ? { essentialQualifiers: [...draft.qualifiers] } : {}),
  };
  const player = draft.playerId ? { playerId: draft.playerId } : {};
  switch (draft.code) {
    case 'F': return { ...base, ...player, kind: 'shot', shootingTeamId: draft.teamId, outcome: ESSENTIAL_TO_FUTSAL_OUTCOME[draft.outcome!], ...(draft.outcome === 'gol' ? { beneficiaryTeamId: draft.teamId } : {}), ...(draft.destination ? { destination: draft.destination } : {}) };
    case 'P': return { ...base, ...player, kind: 'pass', teamId: draft.teamId, passResult: draft.passResult!, ...(draft.destination ? { destination: draft.destination } : {}) };
    case 'PF': return { ...base, ...player, kind: 'chance_pass', teamId: draft.teamId, ...(draft.passResult ? { passResult: draft.passResult } : {}), ...(draft.destination ? { destination: draft.destination } : {}) };
    case 'C': return { ...base, ...player, kind: 'progression', teamId: draft.teamId, progressionType: draft.progressionType!, progressionResult: draft.progressionResult!, ...(draft.destination ? { destination: draft.destination } : {}) };
    case 'PP': return { ...base, ...player, kind: 'possession_loss', teamId: draft.teamId };
    case 'RP': return { ...base, ...player, kind: 'ball_recovery', teamId: draft.teamId };
    case 'FL': return { ...base, ...player, kind: 'foul', offendingTeamId: draft.teamId, accumulated: draft.foulAccumulated!, ...(draft.foulCard ? { card: draft.foulCard } : {}) };
    case 'RE': return { ...base, ...player, kind: 'restart', teamId: draft.teamId, restart: draft.restartType as import('../domain/futsal/FutsalScout').FutsalRestart };
  }
}

function validateEssentialSportDraft(draft: EssentialScoutDraft, sport: 'football' | 'futsal'): string | undefined {
  if (draft.code === 'RE' && !(sport === 'football' ? FOOTBALL_ESSENTIAL_RESTART_TYPES : FUTSAL_ESSENTIAL_RESTART_TYPES).includes(draft.restartType!)) return 'Tipo de reinício incompatível com a modalidade.';
  if (draft.code === 'FL' && sport === 'futsal' && draft.foulAccumulated === undefined) return 'Informe se a falta acumula no período.';
  if (draft.code === 'FL' && sport === 'football' && draft.foulAccumulated !== undefined) return 'Falta acumulada se aplica apenas ao futsal.';
}

function validateEssentialIdentity(draft: EssentialScoutDraft, workspace: MatchWorkspace): string | undefined {
  if (!workspace.teams.some(team => team.id === draft.teamId)) return 'Equipe da ação essencial inválida.';
  if (!draft.playerId) return;
  const player = workspace.players.find(item => item.id === draft.playerId && item.teamId === draft.teamId);
  if (!player) return 'Atleta da ação essencial não pertence à equipe.';
  if (draft.shirtNumber !== undefined && player.number !== draft.shirtNumber) return 'Camisa e atleta informado não correspondem.';
}

export class ScoutTrainerService {
  private readonly futsalClockSessions = new Set<string>();
  private readonly futsalClockReconciliationPending = new Set<string>();
  private readonly resolver: ProfileResolver;
  private readonly openMatch: OpenMatchUseCase;
  private readonly statisticsEngine = new StatisticsEngine(createDefaultMetricRegistry());
  private readonly matchAnalytics = new MatchAnalyticsService(this.statisticsEngine);
  private readonly sequenceAnalyticsService = new SequenceAnalyticsService();
  private readonly matchEventFactory: MatchEventFactory;
  private readonly matchReplayService = new MatchReplayService();
  private readonly rallyContextResolver = new RallyContextResolver();
  private backupRepository?: MatchBackupRepository;

  constructor(
    private readonly matches: MatchRepository,
    private readonly events: EventRepository,
    private readonly teams: TeamRepository,
    private readonly players: PlayerRepository,
    private readonly profileRegistry: ProfileRegistry,
    private readonly dependencies = DEFAULT_DEPENDENCIES,
    private readonly analysisConfigurations?: AnalysisConfigurationRepository,
    private readonly analyticsSnapshots?: AnalyticsSnapshotRepository,
    private readonly reportCharts?: ReportChartConfigurationRepository,
  ) {
    this.resolver = new ProfileResolver(profileRegistry);
    this.openMatch = new OpenMatchUseCase(matches, events);
    this.matchEventFactory = new MatchEventFactory(dependencies);
  }

  private async invalidateAnalytics(matchId: string): Promise<void> {
    await this.analyticsSnapshots?.deleteByMatchId(matchId);
  }

  enableBackupRestore(repository: MatchBackupRepository): this {
    this.backupRepository = repository;
    return this;
  }

  async listMatches(): Promise<Result<readonly MatchMetadata[], RepositoryError>> {
    const result = await this.matches.list();
    return result.ok
      ? success([...result.value].sort((left, right) => right.createdAt - left.createdAt))
      : result;
  }

  /** Reads only same-sport history and validates by holding out whole matches. No projection is persisted. */
  async analyzeSequenceContextModel(sport: ObservedSport): Promise<Result<SequenceContextModelResult, ServiceError>> {
    const listed = await this.matches.list();
    if (!listed.ok) return failure(listed.error);
    const metadata = listed.value.filter(match => resolveMatchSport(match) === sport);
    const projected = await Promise.all(metadata.map(async match => {
      const history = await this.events.listByMatch(match.id);
      if (!history.ok) return failure(history.error);
      if (sport === 'futsal') return success<readonly ObservedSequence[]>(projectFutsalObservedSequences(match.id, history.value).units);
      if (sport === 'volleyball') return success<readonly ObservedSequence[]>(projectVolleyballObservedSequences(match.id, history.value).units);
      const [teamA, teamB] = await Promise.all([this.teams.findById(match.teamAId), this.teams.findById(match.teamBId)]);
      if (!teamA.ok) return failure(teamA.error);
      if (!teamB.ok) return failure(teamB.error);
      if (!teamA.value || !teamB.value) return failure(new RepositoryError('entity_not_found', 'Partida histórica sem equipes disponíveis.'));
      const football = projectFootball(history.value, teamA.value.id, teamB.value.id, teamA.value.name, teamB.value.name, this.dependencies.now());
      return success<readonly ObservedSequence[]>(projectFootballObservedSequences(match.id, football.events, history.value, new Map([[teamA.value.name, teamA.value.id], [teamB.value.name, teamB.value.id]])).units);
    }));
    const failed = projected.find(result => !result.ok);
    if (failed && !failed.ok) return failure(failed.error);
    const units = projected.flatMap(result => result.ok ? result.value : []);
    return success(fitSequenceContextModel(units));
  }

  listCodeProfiles() {
    return this.profileRegistry.list('code');
  }

  async createMatch(input: CreateMatchInput): Promise<Result<MatchWorkspace, ServiceError>> {
    if (!input.teamAName.trim() || !input.teamBName.trim()) {
      return failure(
        new ValidationError('Both team names are required.', [
          { code: 'team_name_required', message: 'Informe o nome das duas equipes.' },
        ]),
      );
    }
    const sport = input.sport ?? 'volleyball';
    const teamARegistrations = input.teamAPlayers.map(normalizePlayerInput);
    const teamBRegistrations = input.teamBPlayers.map(normalizePlayerInput);
    const invalidNumber = [...teamARegistrations, ...teamBRegistrations].find(
      (player) => !Number.isSafeInteger(player.number) || player.number < (sport === 'basketball' ? 0 : 1) || player.number > 99,
    );
    if (invalidNumber !== undefined) {
      return failure(
        new ValidationError('Player numbers must be between 1 and 99.', [
          {
            code: 'invalid_player_number',
            message: `Número inválido: ${invalidNumber.number}.`,
          },
        ]),
      );
    }
    const duplicate = duplicateNumber(teamARegistrations) ?? duplicateNumber(teamBRegistrations);
    if (duplicate !== undefined) {
      return failure(
        new ValidationError('Player numbers must be unique inside each team.', [
          { code: 'duplicate_player_number', message: `Camisa ${duplicate} repetida na equipe.` },
        ]),
      );
    }
    const selectedCodeProfile = this.profileRegistry.resolve(
      'code',
      input.codeProfileId ?? 'default_compact_v1',
    );
    if (!selectedCodeProfile.ok) return failure(selectedCodeProfile.error);

    const teamA: Team = { id: this.dependencies.createId(), name: input.teamAName.trim() };
    const teamB: Team = { id: this.dependencies.createId(), name: input.teamBName.trim() };
    const complexityProfileId =
      input.complexityProfileId === 'cbv' ? 'tactical' : input.complexityProfileId;
    const metadata: MatchMetadata = {
      id: this.dependencies.createId(),
      name: input.name?.trim() || `${teamA.name} x ${teamB.name}`,
      teamAId: teamA.id,
      teamBId: teamB.id,
      createdAt: this.dependencies.now(),
      status: 'in_progress',
      ...(sport === 'volleyball'
        ? {
            initialServingTeamId: input.initialServingTeam === 'teamB' ? teamB.id : teamA.id,
            scoringRules: input.scoringRules ?? DEFAULT_INDOOR_SCORING_RULES,
          }
        : {}),
      codeProfileId: selectedCodeProfile.value.id,
      codeProfileVersion: selectedCodeProfile.value.version,
      complexityProfileId,
      sport,
      ...(sport === 'football'
        ? { footballOrientation: [{ period: 1 as const }, { period: 2 as const }] }
        : {}),
      ...(sport === 'futsal'
        ? { futsalOrientation: [{ period: 1 as const }, { period: 2 as const }], futsalSettings: { ruleset: 'fifa-2025-26' as const, periodDurationMs: DEFAULT_FUTSAL_PERIOD_DURATION_MS } }
        : {}),
      ...(input.complexityProfileId === 'cbv'
        ? {
            competitionProfileId: 'cbv_superliga_reference_2025_26',
            competitionProfileVersion: '1.0.0',
          }
        : {}),
    };
    const playerEntities: Player[] = [
      ...teamARegistrations.map((player) => ({
        id: this.dependencies.createId(),
        teamId: teamA.id,
        number: player.number,
        name: player.name?.trim() || `Jogador ${player.number}`,
        active: player.active !== false,
        ...(player.registeredRole ? { registeredRole: player.registeredRole } : {}),
      })),
      ...teamBRegistrations.map((player) => ({
        id: this.dependencies.createId(),
        teamId: teamB.id,
        number: player.number,
        name: player.name?.trim() || `Jogador ${player.number}`,
        active: player.active !== false,
        ...(player.registeredRole ? { registeredRole: player.registeredRole } : {}),
      })),
    ];
    const liberoPlayerIds = sport === 'volleyball' ? [
      ...teamARegistrations.flatMap((player) => {
        const entity = playerEntities.find(
          (candidate) => candidate.teamId === teamA.id && candidate.number === player.number,
        );
        return (player.libero || player.registeredRole === 'libero') && entity ? [entity.id] : [];
      }),
      ...teamBRegistrations.flatMap((player) => {
        const entity = playerEntities.find(
          (candidate) => candidate.teamId === teamB.id && candidate.number === player.number,
        );
        return (player.libero || player.registeredRole === 'libero') && entity ? [entity.id] : [];
      }),
    ] : [];
    const persistedMetadata: MatchMetadata =
      liberoPlayerIds.length > 0 ? { ...metadata, liberoPlayerIds } : metadata;
    const teamALineup = sport === 'volleyball'
      ? this.createLineup(teamA.id, 1, playerEntities, input.teamALineup)
      : undefined;
    const teamBLineup = sport === 'volleyball'
      ? this.createLineup(teamB.id, 1, playerEntities, input.teamBLineup)
      : undefined;
    if (
      sport === 'volleyball' &&
      ((input.teamALineup && !teamALineup) || (input.teamBLineup && !teamBLineup))
    ) {
      return failure(
        new ValidationError('The initial lineup is invalid.', [
          {
            code: 'invalid_initial_lineup',
            message: 'Cada posição P1-P6 deve ter um atleta único e inscrito.',
          },
        ]),
      );
    }
    const lineups = [teamALineup, teamBLineup].filter(
      (lineup): lineup is SetLineup => lineup !== undefined,
    );

    for (const operation of [
      this.teams.save(teamA),
      this.teams.save(teamB),
      ...playerEntities.map((player) => this.players.save(player)),
      this.matches.save(persistedMetadata),
    ]) {
      const result = await operation;
      if (!result.ok) return failure(result.error);
    }

    if (lineups.length > 0) {
      const persisted = await this.events.appendMany(
        lineups.map((lineup, index) => ({
          type: 'set_lineup_confirmed' as const,
          id: this.dependencies.createId(),
          matchId: metadata.id,
          lineup,
          sequence: index + 1,
          timestamp: this.dependencies.now(),
        })),
      );
      if (!persisted.ok) return failure(persisted.error);
    }

    return this.loadMatch(metadata.id);
  }

  private createLineup(
    teamId: string,
    setNumber: number,
    allPlayers: readonly Player[],
    configured?: readonly LineupPositionInput[],
  ): SetLineup | undefined {
    const teamPlayers = allPlayers.filter(
      (player) => player.teamId === teamId && player.active !== false,
    );
    if (!configured) {
      return createDefaultLineup(teamId, setNumber, teamPlayers);
    }
    if (configured.length !== 6) return undefined;
    const positions = {} as Record<CourtRotationPosition, string>;
    const slots: Record<string, SetLineup['slots'][string]> = {};
    const usedPlayers = new Set<string>();
    for (const entry of configured) {
      const player = teamPlayers.find((candidate) => candidate.number === entry.playerNumber);
      if (!player || usedPlayers.has(player.id) || positions[entry.position]) {
        return undefined;
      }
      usedPlayers.add(player.id);
      const slotId = this.dependencies.createId();
      positions[entry.position] = slotId;
      slots[slotId] = {
        slotId,
        tacticalRole: entry.tacticalRole,
        playerId: player.id,
        originalPlayerId: player.id,
        activeRole: playerRoleForTacticalRole(entry.tacticalRole),
      };
    }
    return { teamId, setNumber, positions, slots };
  }

  async loadMatch(matchId: string): Promise<Result<MatchWorkspace, ServiceError>> {
    const state = await this.openMatch.execute(matchId);
    if (!state.ok) return failure(state.error);
    const [teamA, teamB, teamAPlayers, teamBPlayers, events] = await Promise.all([
      this.teams.findById(state.value.metadata.teamAId),
      this.teams.findById(state.value.metadata.teamBId),
      this.players.listByTeam(state.value.metadata.teamAId),
      this.players.listByTeam(state.value.metadata.teamBId),
      this.events.listByMatch(matchId),
    ]);
    for (const result of [teamA, teamB, teamAPlayers, teamBPlayers, events]) {
      if (!result.ok) return failure(result.error);
    }
    if (!teamA.ok || !teamB.ok || !teamA.value || !teamB.value) {
      return failure(new RepositoryError('entity_not_found', 'Match teams were not found.'));
    }
    if (!teamAPlayers.ok || !teamBPlayers.ok || !events.ok) {
      return failure(new RepositoryError('database_operation_failed', 'Workspace could not load.'));
    }

    const profiles = this.resolveProfiles(state.value.metadata);
    if (!profiles.ok) return failure(profiles.error);
    const loadedTeamA = teamA.value;
    const loadedTeamB = teamB.value;

    const timeline = projectScoutTimeline(events.value);
    const effectiveEvents = projectEffectiveMatchEvents(events.value);
    const effectiveScouts = effectiveEvents.flatMap((event) =>
      event.type === 'scout_registered' ? [event.event] : [],
    );
    const coverage = [...effectiveScouts]
      .reverse()
      .find((event) => event.metadata?.coverage)?.metadata?.coverage ?? {
      mode: 'both' as const,
      observedTeamIds: [loadedTeamA.id, loadedTeamB.id],
    };
    const tacticalRally = this.rallyContextResolver.project(state.value.metadata, events.value);
    const metricIds = profiles.value.competitionProfile?.metricIds ?? BASIC_METRIC_IDS;
    const statistics = [loadedTeamA, loadedTeamB].map((team) => ({
      teamId: team.id,
      results: this.statisticsEngine.calculate(metricIds, {
        events: timeline.map((item) => item.event),
        scope: { teamId: team.id },
      }),
    }));
    const dashboard = buildStatisticsDashboard(
      statistics.map((teamStatistics) => ({
        teamId: teamStatistics.teamId,
        teamName: teamStatistics.teamId === loadedTeamA.id ? loadedTeamA.name : loadedTeamB.name,
        results: teamStatistics.results,
      })),
    );
    const tacticalStatistics = [loadedTeamA, loadedTeamB].map((team) => ({
      teamId: team.id,
      results: this.statisticsEngine.calculate(TACTICAL_METRIC_IDS, {
        events: effectiveScouts,
        scope: { teamId: team.id },
        tacticalRally,
      }),
    }));
    const tacticalAnalytics = buildTacticalAnalytics(
      tacticalStatistics.map((teamStatistics) => ({
        teamId: teamStatistics.teamId,
        teamName: teamStatistics.teamId === loadedTeamA.id ? loadedTeamA.name : loadedTeamB.name,
        results: teamStatistics.results,
      })),
    );
    const persistedCurrentLineups = state.value.lineups.filter(
      (lineup) => lineup.setNumber === state.value.currentSet,
    );
    const currentLineups = [loadedTeamA, loadedTeamB].flatMap((team) => {
      const persisted = persistedCurrentLineups.find((lineup) => lineup.teamId === team.id);
      if (persisted) return [persisted];
      const fallback = createDefaultLineup(team.id, state.value.currentSet, [
        ...teamAPlayers.value,
        ...teamBPlayers.value,
      ]);
      return fallback ? [fallback] : [];
    });
    const report = this.matchAnalytics.build({
      events: effectiveScouts,
      state: state.value,
      roster: [...teamAPlayers.value, ...teamBPlayers.value],
      teams: [loadedTeamA, loadedTeamB],
      lineups: [
        ...state.value.lineups,
        ...currentLineups.filter(
          (lineup) =>
            !state.value.lineups.some(
              (persisted) =>
                persisted.teamId === lineup.teamId && persisted.setNumber === lineup.setNumber,
            ),
        ),
      ],
      tacticalRally,
      ...(profiles.value.codeProfile.tacticalInput?.zoneSystem
        ? { zoneSystem: profiles.value.codeProfile.tacticalInput.zoneSystem }
        : {}),
    });
    const zoneSystem = profiles.value.codeProfile.tacticalInput?.zoneSystem;
    const sequenceAnalytics = zoneSystem && resolveMatchSport(state.value.metadata) !== 'basketball'
      ? this.sequenceAnalyticsService.build(
          events.value,
          [loadedTeamA, loadedTeamB],
          tacticalRally,
          zoneSystem,
        )
      : undefined;

    const football = resolveMatchSport(state.value.metadata) === 'football'
      ? projectFootball(events.value, loadedTeamA.id, loadedTeamB.id, loadedTeamA.name, loadedTeamB.name, this.dependencies.now())
      : undefined;
    const isFutsal = resolveMatchSport(state.value.metadata) === 'futsal';
    const firstFutsalLoad = isFutsal && !this.futsalClockSessions.has(matchId);
    const futsalClock = isFutsal
      ? projectFutsalClock(events.value, state.value.metadata.futsalSettings?.periodDurationMs, this.dependencies.now(), firstFutsalLoad || this.futsalClockReconciliationPending.has(matchId))
      : undefined;
    const futsalScout = isFutsal ? projectFutsalScout(events.value) : undefined;
    const basketball = resolveMatchSport(state.value.metadata) === 'basketball' ? projectBasketball(events.value) : undefined;
    const essentialActions = football ? projectEssentialFootballActions(football.events) : futsalScout ? projectEssentialFutsalActions(futsalScout) : [];
    const observedSequences = football
      ? projectFootballObservedSequences(matchId, football.events, events.value, new Map([[loadedTeamA.name, loadedTeamA.id], [loadedTeamB.name, loadedTeamB.id]]))
      : futsalScout
        ? projectFutsalObservedSequences(matchId, events.value, futsalScout)
        : basketball ? { units: [], unassigned: [] }
        : projectVolleyballObservedSequences(matchId, events.value, tacticalRally, zoneSystem);
    if (isFutsal) {
      this.futsalClockSessions.add(matchId);
      if (futsalClock?.status === 'needs_reconciliation') this.futsalClockReconciliationPending.add(matchId);
    }
    return success({
      state: state.value,
      teams: [loadedTeamA, loadedTeamB],
      players: [...teamAPlayers.value, ...teamBPlayers.value],
      events: events.value,
      timeline,
      profiles: profiles.value,
      statistics,
      dashboard,
      tacticalStatistics,
      tacticalAnalytics,
      currentLineups,
      tacticalRally,
      ...(sequenceAnalytics ? { sequenceAnalytics } : {}),
      report,
      coverage,
      ...(football ? { football } : {}),
      ...(futsalClock ? { futsalClock } : {}),
      ...(futsalScout ? { futsalScout } : {}),
      ...(basketball ? { basketball } : {}),
      observedSequences,
      essentialActions,
    });
  }

  async setFootballOrientation(matchId: string, period: 1 | 2, teamId: string, direction: 'x120' | 'x0' | undefined): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    const metadata = workspace.value.state.metadata;
    if (!workspace.value.football || !workspace.value.teams.some(t => t.id === teamId)) return failure(new ValidationError('Equipe de futebol inválida.', []));
    const prior = metadata.footballOrientation ?? [];
    const updated = { ...prior.find(p => p.period === period), period, [teamId === metadata.teamAId ? 'teamAAttacksTo' : 'teamBAttacksTo']: direction };
    const saved = await this.matches.save({ ...metadata, footballOrientation: [...prior.filter(p => p.period !== period), updated] });
    if (!saved.ok) return failure(saved.error);
    await this.invalidateAnalytics(matchId);
    return this.loadMatch(matchId);
  }

  async setFutsalOrientation(matchId: string, period: 1 | 2, teamId: string, direction: 'x120' | 'x0' | undefined): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    const metadata = workspace.value.state.metadata;
    if (resolveMatchSport(metadata) !== 'futsal' || !workspace.value.teams.some(team => team.id === teamId))
      return failure(new ValidationError('Equipe de futsal inválida.', []));
    const prior = metadata.futsalOrientation ?? [];
    const updated = { ...prior.find(entry => entry.period === period), period, [teamId === metadata.teamAId ? 'teamAAttacksTo' : 'teamBAttacksTo']: direction };
    const saved = await this.matches.save({ ...metadata, futsalOrientation: [...prior.filter(entry => entry.period !== period), updated] });
    if (!saved.ok) return failure(saved.error);
    return this.loadMatch(matchId);
  }

  async observeFootballControl(matchId: string, input: ObserveFootballControlInput): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    if (!workspace.value.football) return failure(new ValidationError('Futebol indisponível.', []));
    const { capturedElapsedMs, ...observation } = input;
    if (capturedElapsedMs !== undefined && (!Number.isFinite(capturedElapsedMs) || capturedElapsedMs < 0))
      return failure(new ValidationError('Horário inválido.', []));
    const invalid = validateFootballObservation(observation, workspace.value);
    if (invalid) return failure(new ValidationError(invalid, []));
    const clock = workspace.value.football.clock;
    const elapsed = capturedElapsedMs ?? effectiveElapsed(clock, this.dependencies.now());
    const id = this.dependencies.createId();
    const normalizedObservation: FootballObservation = {
      ...observation,
      protocol: observation.protocol ?? { ...FOOTBALL_POSSESSION_PROTOCOL, mode: 'control_mark' },
    };
    const history: MatchEvent = { type: 'football_event_registered', id, matchId, sequence: workspace.value.state.lastSequence + 1, timestamp: this.dependencies.now(), event: {
      id, index: workspace.value.football.events.length + 1, period: clock.period, timestamp: formatFootballTimestamp(elapsed), minute: (clock.period === 2 ? 45 : 0) + Math.floor(elapsed / 60000), second: Math.floor(elapsed / 1000) % 60,
      type: { id: 1000, name: 'Observação de controle' }, ...(normalizedObservation.position ? { location: normalizedObservation.position } : {}), scout_trainer: { schema_version: '1.1.0', modality: 'football', match_id: matchId, capture_sequence: workspace.value.state.lastSequence + 1, position_observed: normalizedObservation.position !== undefined, observation: normalizedObservation },
    } };
    const saved = await this.events.append(history);
    if (!saved.ok) return failure(saved.error);
    await this.invalidateAnalytics(matchId);
    return this.loadMatch(matchId);
  }

  async registerFootballEvent(matchId: string, input: RegisterFootballEventInput): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    if (resolveMatchSport(workspace.value.state.metadata) !== 'football' || !workspace.value.football)
      return failure(new ValidationError('Football event cannot be registered in this match.', []));
    const teamIndex = workspace.value.teams.findIndex((team) => team.id === input.teamId);
    const playerIndex = input.playerId ? workspace.value.players.findIndex((player) => player.id === input.playerId) : -1;
    const relatedPlayerIndex = input.relatedPlayerId ? workspace.value.players.findIndex((player) => player.id === input.relatedPlayerId) : -1;
    if (input.action === 'substitution' && (!input.playerId || !input.relatedPlayerId || input.playerId === input.relatedPlayerId))
      return failure(new ValidationError('Invalid football substitution.', [{ code: 'invalid_football_substitution', message: 'Informe atletas diferentes para saída e entrada.' }]));
    if (teamIndex < 0 || (input.playerId && (playerIndex < 0 || workspace.value.players[playerIndex].teamId !== input.teamId)) || (input.relatedPlayerId && (relatedPlayerIndex < 0 || workspace.value.players[relatedPlayerIndex].teamId !== input.teamId)))
      return failure(new ValidationError('Football team or player was not found.', []));
    const draftIssue = (input.capturedElapsedMs !== undefined && (!Number.isFinite(input.capturedElapsedMs) || input.capturedElapsedMs < 0) ? 'Horário inválido.' : undefined) ?? validateFootballEssentialInput(input) ?? validateFootballDraft(input) ?? validateFootballObservation(input.observation, workspace.value);
    if (draftIssue) return failure(new ValidationError(draftIssue, []));
    const requiresEnd = (input.action === 'pass' || input.action === 'carry') && !input.essentialCode;
    const requiresLocation = !['loss', 'foul', 'restart', 'substitution', 'shot'].includes(input.action) && !input.essentialCode;
    if ((requiresLocation && !input.location) || (requiresEnd && !input.endLocation))
      return failure(new ValidationError('Football event location is incomplete.', [{ code: 'football_location_incomplete', message: requiresEnd ? 'Marque origem e destino.' : 'Marque a localização.' }]));
    const clock = workspace.value.football.clock;
    const elapsedMs = input.capturedElapsedMs ?? effectiveElapsed(clock, this.dependencies.now());
    const eventId = this.dependencies.createId();
    const possessionTeamIndex = input.possessionTeamId ? workspace.value.teams.findIndex((team) => team.id === input.possessionTeamId) : -1;
    const previousPossession = [...workspace.value.football.events].reverse().find((event) => event.possession !== undefined);
    const possessionTeam = possessionTeamIndex >= 0 ? { id: possessionTeamIndex + 1, name: workspace.value.teams[possessionTeamIndex].name } : undefined;
    const possession = possessionTeam ? (previousPossession?.period === clock.period && previousPossession?.possession_team?.id === possessionTeam.id && previousPossession.scout_trainer?.observation?.after?.kind !== 'dead_ball' ? previousPossession.possession : (previousPossession?.possession ?? 0) + 1) : undefined;
    const canonical = createCanonicalFootballEvent({
      id: eventId, matchId, index: workspace.value.football.events.length + 1, period: clock.period, elapsedMs,
      captureSequence: workspace.value.state.lastSequence + 1,
      action: input.action, outcome: input.outcome, essentialCode: input.essentialCode, essentialShirtNumber: input.essentialShirtNumber, essentialThird: input.essentialThird, essentialThirdAnchor: input.essentialThirdAnchor, essentialQualifiers: input.essentialQualifiers, essentialPassResult: input.essentialPassResult, essentialProgressionType: input.essentialProgressionType, essentialProgressionResult: input.essentialProgressionResult, essentialFoulCard: input.essentialFoulCard, essentialRestartType: input.essentialRestartType, shotContext: input.shotContext, observation: { before: input.possessionTeamId ? { kind: 'controlled', teamId: input.possessionTeamId } : projectControl(workspace.value.football?.events ?? []).ballControl, ...input.observation, teamId: input.teamId, playerId: input.playerId, recipientId: input.relatedPlayerId },
      team: { id: teamIndex + 1, name: workspace.value.teams[teamIndex].name },
      ...(possession !== undefined ? { possession, possessionTeam } : {}),
      ...(playerIndex >= 0 ? { player: { id: footballNumericId(workspace.value.players[playerIndex].id), name: workspace.value.players[playerIndex].name ?? `Jogador ${workspace.value.players[playerIndex].number}` } } : {}),
      ...(relatedPlayerIndex >= 0 ? { relatedPlayer: { id: footballNumericId(workspace.value.players[relatedPlayerIndex].id), name: workspace.value.players[relatedPlayerIndex].name ?? `Jogador ${workspace.value.players[relatedPlayerIndex].number}` } } : {}),
      ...(input.location ? { location: normalizedToStatsBomb(input.location.x, input.location.y) } : {}),
      ...(input.endLocation ? { endLocation: normalizedToStatsBomb(input.endLocation.x, input.endLocation.y) } : {}),
    });
    const historyEvent: MatchEvent = { type: 'football_event_registered', id: eventId, matchId, sequence: workspace.value.state.lastSequence + 1, timestamp: this.dependencies.now(), event: canonical };
    const saved = await this.events.append(historyEvent);
    if (!saved.ok) return failure(saved.error);
    await this.invalidateAnalytics(matchId);
    return this.loadMatch(matchId);
  }

  async correctFootballEvent(matchId: string, targetEventId: string, input: RegisterFootballEventInput): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    const target = workspace.value.football?.events.find((event) => event.id === targetEventId);
    if (!target) return failure(new ValidationError('Football event was not found.', []));
    if (target.scout_trainer.essential_code && !input.essentialCode)
      return failure(new ValidationError('Use a correção do scout essencial para este lance.', []));
    const draftIssue = (input.capturedElapsedMs !== undefined && (!Number.isFinite(input.capturedElapsedMs) || input.capturedElapsedMs < 0) ? 'Horário inválido.' : undefined) ?? validateFootballEssentialInput(input) ?? validateFootballDraft(input) ?? validateFootballObservation(input.observation, workspace.value);
    if (draftIssue) return failure(new ValidationError(draftIssue, []));
    const team = workspace.value.teams.find((candidate) => candidate.id === input.teamId);
    const player = input.playerId ? workspace.value.players.find((candidate) => candidate.id === input.playerId && candidate.teamId === input.teamId) : undefined;
    const relatedPlayer = input.relatedPlayerId ? workspace.value.players.find((candidate) => candidate.id === input.relatedPlayerId && candidate.teamId === input.teamId) : undefined;
    if (input.action === 'substitution' && (!input.playerId || !input.relatedPlayerId || input.playerId === input.relatedPlayerId))
      return failure(new ValidationError('Invalid football substitution.', [{ code: 'invalid_football_substitution', message: 'Informe atletas diferentes para saída e entrada.' }]));
    if (!team || (input.playerId && !player) || (input.relatedPlayerId && !relatedPlayer)) return failure(new ValidationError('Football team or player was not found.', []));
    const teamIndex = workspace.value.teams.findIndex((candidate) => candidate.id === team.id);
    const playerIndex = player ? workspace.value.players.findIndex((candidate) => candidate.id === player.id) : -1;
    const relatedPlayerIndex = relatedPlayer ? workspace.value.players.findIndex((candidate) => candidate.id === relatedPlayer.id) : -1;
    const possessionTeamIndex = input.possessionTeamId ? workspace.value.teams.findIndex((candidate) => candidate.id === input.possessionTeamId) : -1;
    const possessionTeam = possessionTeamIndex >= 0 ? { id: possessionTeamIndex + 1, name: workspace.value.teams[possessionTeamIndex].name } : undefined;
    const replacement = createCanonicalFootballEvent({ id: target.id, matchId, index: target.index, period: target.period, elapsedMs: input.capturedElapsedMs ?? timestampMs(target.timestamp), captureSequence: target.scout_trainer.capture_sequence, action: input.action, outcome: input.outcome, essentialCode: input.essentialCode, essentialShirtNumber: input.essentialShirtNumber, essentialThird: input.essentialThird, essentialThirdAnchor: input.essentialThirdAnchor, essentialQualifiers: input.essentialQualifiers, essentialPassResult: input.essentialPassResult, essentialProgressionType: input.essentialProgressionType, essentialProgressionResult: input.essentialProgressionResult, essentialFoulCard: input.essentialFoulCard, essentialRestartType: input.essentialRestartType, shotContext: input.shotContext, observation: { ...input.observation, teamId: input.teamId, playerId: input.playerId, recipientId: input.relatedPlayerId }, team: { id: teamIndex + 1, name: team.name }, ...(player ? { player: { id: footballNumericId(workspace.value.players[playerIndex].id), name: player.name ?? `Jogador ${player.number}` } } : {}), ...(relatedPlayer ? { relatedPlayer: { id: footballNumericId(workspace.value.players[relatedPlayerIndex].id), name: relatedPlayer.name ?? `Jogador ${relatedPlayer.number}` } } : {}), ...(input.location ? { location: normalizedToStatsBomb(input.location.x, input.location.y) } : {}), ...(input.endLocation ? { endLocation: normalizedToStatsBomb(input.endLocation.x, input.endLocation.y) } : {}), ...(possessionTeam ? { possession: target.possession ?? 1, possessionTeam } : {}) });
    const correction: MatchEvent = { type: 'football_event_corrected', id: this.dependencies.createId(), matchId, sequence: workspace.value.state.lastSequence + 1, timestamp: this.dependencies.now(), targetEventId, replacementEvent: mergeFootballCorrection(target, replacement) };
    const saved = await this.events.append(correction);
    if (!saved.ok) return failure(saved.error);
    await this.invalidateAnalytics(matchId);
    return this.loadMatch(matchId);
  }

  async correctFootballObservation(matchId: string, targetEventId: string, observation: FootballObservation): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    if (!workspace.value.football) return failure(new ValidationError('Futebol indisponível.', []));
    const target = workspace.value.football.events.find((event) => event.id === targetEventId);
    if (!target || target.type.id !== 1000) return failure(new ValidationError('Observação de controle não encontrada.', []));
    const invalid = validateFootballObservation(observation, workspace.value);
    if (invalid) return failure(new ValidationError(invalid, []));
    const normalizedObservation: FootballObservation = { ...observation, protocol: observation.protocol ?? { ...FOOTBALL_POSSESSION_PROTOCOL, mode: 'control_mark' } };
    const replacement = {
      ...target,
      ...(normalizedObservation.position ? { location: normalizedObservation.position } : {}),
      scout_trainer: { ...target.scout_trainer, schema_version: '1.1.0' as const, position_observed: normalizedObservation.position !== undefined, observation: normalizedObservation },
    };
    if (!normalizedObservation.position) delete (replacement as { location?: unknown }).location;
    const correction: MatchEvent = { type: 'football_event_corrected', id: this.dependencies.createId(), matchId, sequence: workspace.value.state.lastSequence + 1, timestamp: this.dependencies.now(), targetEventId, replacementEvent: mergeFootballCorrection(target, replacement) };
    const saved = await this.events.append(correction);
    if (!saved.ok) return failure(saved.error);
    await this.invalidateAnalytics(matchId);
    return this.loadMatch(matchId);
  }

  async saveFootballAssistedRecording(matchId: string, targetEventId: string, input: SaveFootballAssistedRecordingInput): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    if (!workspace.value.football) return failure(new ValidationError('Futebol indisponível.', []));
    const target = workspace.value.football.events.find(event => event.id === targetEventId);
    if (!target) return failure(new ValidationError('Evento de futebol não encontrado.', []));
    const invalid = validateFootballAssistedRecording(input.recording, workspace.value);
    if (invalid) return failure(new ValidationError(invalid, []));
    // A retry of the same confirmation is idempotent at the event-history boundary.
    if (JSON.stringify(target.scout_trainer.assisted_recording) === JSON.stringify(input.recording)) return success(workspace.value);
    const replacement = {
      ...target,
      scout_trainer: { ...target.scout_trainer, assisted_recording: input.recording },
    };
    const correction: MatchEvent = {
      type: 'football_event_corrected', id: this.dependencies.createId(), matchId,
      sequence: workspace.value.state.lastSequence + 1, timestamp: this.dependencies.now(),
      targetEventId, replacementEvent: mergeFootballCorrection(target, replacement),
    };
    const saved = await this.events.append(correction);
    if (!saved.ok) return failure(saved.error);
    await this.invalidateAnalytics(matchId);
    return this.loadMatch(matchId);
  }

  async undoFootballEvent(matchId: string): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    const targetHistoryEventId = workspace.value.football?.historyIds.at(-1);
    if (!targetHistoryEventId) return failure(new ValidationError('There is no football event to undo.', []));
    const undo: MatchEvent = { type: 'football_event_undone', id: this.dependencies.createId(), matchId, sequence: workspace.value.state.lastSequence + 1, timestamp: this.dependencies.now(), targetHistoryEventId };
    const saved = await this.events.append(undo);
    if (!saved.ok) return failure(saved.error);
    await this.invalidateAnalytics(matchId);
    return this.loadMatch(matchId);
  }

  async setFootballClock(matchId: string, change: { readonly kind: 'start' | 'pause' | 'adjust' | 'period'; readonly elapsedMs?: number; readonly period?: 1 | 2 }): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    if (!workspace.value.football) return failure(new ValidationError('Football clock is unavailable.', []));
    const now = this.dependencies.now(), current = workspace.value.football.clock;
    const elapsedMs = change.kind === 'adjust' ? Math.max(0, change.elapsedMs ?? 0) : change.kind === 'period' ? 0 : effectiveElapsed(current, now);
    const period = change.kind === 'period' ? (change.period ?? current.period) : current.period;
    const running = change.kind === 'start' ? true : change.kind === 'pause' || change.kind === 'period' ? false : current.running;
    const event: MatchEvent = { type: 'football_clock_changed', id: this.dependencies.createId(), matchId, sequence: workspace.value.state.lastSequence + 1, timestamp: now, period, elapsedMs, running, referenceTimestamp: now };
    const saved = await this.events.append(event);
    if (!saved.ok) return failure(saved.error);
    return this.loadMatch(matchId);
  }

  async setFutsalClock(matchId: string, change: {
    readonly kind: FutsalClockCommand;
    readonly elapsedMs?: number;
    readonly reason?: string;
    readonly resumeAfterReconciliation?: boolean;
  }): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    if (resolveMatchSport(workspace.value.state.metadata) !== 'futsal' || !workspace.value.futsalClock)
      return failure(new ValidationError('Relógio de futsal indisponível.', []));
    const current = workspace.value.futsalClock;
    const now = this.dependencies.now();
    const elapsedNow = effectiveFutsalElapsed(current, now);
    const duration = current.periodDurationMs || DEFAULT_FUTSAL_PERIOD_DURATION_MS;
    const reason = change.reason?.trim();
    let command: FutsalClockCommand = change.kind;
    let status: Exclude<import('../domain/match/events/MatchEvent').FutsalClockStatus, 'needs_reconciliation'> = current.status === 'needs_reconciliation' ? 'paused' : current.status;
    let period = current.period;
    let elapsedMs = elapsedNow;
    const referenceTimestamp = now;

    switch (change.kind) {
      case 'start':
        if (current.status !== 'ready' && current.status !== 'paused') return failure(new ValidationError('O período não pode ser iniciado neste estado.', []));
        if (elapsedNow >= duration) return failure(new ValidationError('O período terminou. Finalize-o ou autorize a cobrança final.', []));
        status = 'running';
        break;
      case 'pause':
        if (current.status !== 'running') return failure(new ValidationError('O relógio não está rodando.', []));
        if (elapsedNow >= duration) { command = 'finish_period'; status = period === 2 ? 'match_finished' : 'period_finished'; elapsedMs = duration; }
        else status = 'paused';
        break;
      case 'finish_period':
        if (current.status === 'awaiting_final_kick') { status = period === 2 ? 'match_finished' : 'period_finished'; elapsedMs = duration; }
        else if (current.status === 'running' && elapsedNow >= duration) { status = period === 2 ? 'match_finished' : 'period_finished'; elapsedMs = duration; }
        else return failure(new ValidationError('O período só termina em 00:00 ou após a cobrança final.', []));
        break;
      case 'await_final_kick':
        if ((current.status !== 'period_finished' && current.status !== 'match_finished') || elapsedNow < duration) return failure(new ValidationError('A cobrança final só pode ser autorizada quando o período terminar.', []));
        status = 'awaiting_final_kick'; elapsedMs = duration;
        break;
      case 'advance_period':
        if (current.status !== 'period_finished' || current.period !== 1) return failure(new ValidationError('O segundo período só começa após o fim do primeiro.', []));
        period = 2; elapsedMs = 0; status = 'ready';
        break;
      case 'adjust':
        if (current.status === 'running' || current.status === 'needs_reconciliation') return failure(new ValidationError('Pause ou reconcilie o relógio antes de ajustar.', []));
        if (!reason) return failure(new ValidationError('Informe o motivo do ajuste do relógio.', []));
        if (!Number.isFinite(change.elapsedMs) || (change.elapsedMs ?? -1) < 0 || (change.elapsedMs ?? duration + 1) > duration)
          return failure(new ValidationError('O tempo ajustado deve ficar entre 00:00 e o limite do período.', []));
        elapsedMs = change.elapsedMs!;
        status = elapsedMs >= duration ? period === 2 ? 'match_finished' : 'period_finished' : 'paused';
        break;
      case 'reconcile':
        if (current.status !== 'needs_reconciliation') return failure(new ValidationError('Este relógio não precisa de reconciliação.', []));
        if (!reason) return failure(new ValidationError('Informe a decisão tomada ao reabrir a partida.', []));
        if (change.resumeAfterReconciliation && elapsedNow < duration) status = 'running';
        else status = elapsedNow >= duration ? period === 2 ? 'match_finished' : 'period_finished' : 'paused';
        break;
    }

    if ((change.kind === 'adjust' || change.kind === 'reconcile') && !reason)
      return failure(new ValidationError('Informe o motivo da operação do relógio.', []));
    const event: MatchEvent = {
      type: 'futsal_clock_changed', id: this.dependencies.createId(), matchId,
      sequence: workspace.value.state.lastSequence + 1, timestamp: now, command,
      period, elapsedMs, periodDurationMs: duration, status, referenceTimestamp,
      ...((change.kind === 'adjust' || change.kind === 'reconcile' || change.kind === 'await_final_kick') && reason ? { reason } : {}),
    };
    const saved = await this.events.append(event);
    if (!saved.ok) return failure(saved.error);
    this.futsalClockSessions.add(matchId);
    if (change.kind === 'reconcile') this.futsalClockReconciliationPending.delete(matchId);
    return this.loadMatch(matchId);
  }

  async registerFutsalFact(matchId: string, draft: FutsalFactDraft, capturedElapsedMs?: number): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    const clock = workspace.value.futsalClock;
    if (resolveMatchSport(workspace.value.state.metadata) !== 'futsal' || !clock || !workspace.value.futsalScout)
      return failure(new ValidationError('Scout de futsal indisponível.', []));
    if (clock.status === 'needs_reconciliation' || clock.status === 'period_finished' || clock.status === 'match_finished')
      return failure(new ValidationError('Reconcilie ou avance o relógio antes de registrar novos fatos.', []));
    const elapsedMs = capturedElapsedMs ?? effectiveFutsalElapsed(clock, this.dependencies.now());
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs > clock.periodDurationMs)
      return failure(new ValidationError('Tempo capturado está fora do período.', []));
    const fact = { ...draft, id: this.dependencies.createId(), period: clock.period, elapsedMs } as FutsalFact;
    const previousControl = workspace.value.futsalScout.control;
    if (fact.kind === 'tackle' && previousControl?.period === clock.period && previousControl.kind === 'control' && previousControl.state === 'team' && previousControl.controlledTeamId !== fact.losingTeamId)
      return failure(new ValidationError('A equipe desarmada deve ser a que controlava a bola.', []));
    const teamIds = new Set(workspace.value.teams.map(team => team.id));
    const playerIdsByTeam = new Map(workspace.value.teams.map(team => [team.id, new Set(workspace.value.players.filter(player => player.teamId === team.id).map(player => player.id))]));
    const invalid = validateFutsalFact(fact, teamIds, playerIdsByTeam);
    if (invalid) return failure(new ValidationError(invalid, []));
    const invalidReference = validateFutsalFactReferences(fact, workspace.value.futsalScout.facts);
    if (invalidReference) return failure(new ValidationError(invalidReference, []));
    if (fact.kind === 'substitution') {
      const composition = workspace.value.futsalScout.compositions[fact.teamId];
      if (composition?.certainty === 'complete' && fact.playerOutId && !composition.playerIds.includes(fact.playerOutId))
        return failure(new ValidationError('O atleta que sai não está na composição completa observada.', []));
      if (composition?.playerIds.includes(fact.playerInId ?? ''))
        return failure(new ValidationError('O atleta que entra já consta em quadra.', []));
      const projectedIds = new Set(composition?.playerIds ?? []);
      if (fact.certainty === 'partial' && !fact.playerOutId) projectedIds.clear();
      else if (fact.playerOutId) projectedIds.delete(fact.playerOutId);
      if (fact.playerInId) projectedIds.add(fact.playerInId);
      if (projectedIds.size > 5) return failure(new ValidationError('A composição observada não pode ultrapassar cinco atletas.', []));
    }
    if (fact.kind === 'score_adjustment' && fact.delta < 0 && (workspace.value.futsalScout.score[fact.beneficiaryTeamId] ?? 0) < 1)
      return failure(new ValidationError('O ajuste não pode deixar o placar abaixo de zero.', []));
    const event: MatchEvent = { type: 'futsal_fact_registered', id: this.dependencies.createId(), matchId, fact, sequence: workspace.value.state.lastSequence + 1, timestamp: this.dependencies.now() };
    const saved = await this.events.append(event);
    if (!saved.ok) return failure(saved.error);
    return this.loadMatch(matchId);
  }

  async correctFutsalFact(matchId: string, factId: string, replacement: FutsalFactDraft): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    if (!workspace.value.futsalScout) return failure(new ValidationError('Scout de futsal indisponível.', []));
    const target = workspace.value.futsalScout.facts.find(item => item.fact.id === factId)?.fact;
    if (!target) return failure(new ValidationError('Fato de futsal não encontrado.', []));
    const corrected = { ...replacement, id: target.id, period: target.period, elapsedMs: target.elapsedMs } as FutsalFact;
    const teamIds = new Set(workspace.value.teams.map(team => team.id));
    const playerIdsByTeam = new Map(workspace.value.teams.map(team => [team.id, new Set(workspace.value.players.filter(player => player.teamId === team.id).map(player => player.id))]));
    const invalid = validateFutsalFact(corrected, teamIds, playerIdsByTeam);
    if (invalid) return failure(new ValidationError(invalid, []));
    const invalidReference = validateFutsalFactReferences(corrected, workspace.value.futsalScout.facts.filter(item => item.fact.id !== factId));
    if (invalidReference) return failure(new ValidationError(invalidReference, []));
    const targetSequence = workspace.value.futsalScout.facts.find(item => item.fact.id === factId)?.sequence ?? Number.POSITIVE_INFINITY;
    const compositionBeforeTarget: Record<string, { playerIds: string[]; certainty: 'complete' | 'partial'; shortHanded: boolean }> = {};
    for (const { fact } of workspace.value.futsalScout.facts.filter(item => item.sequence < targetSequence)) {
      if (fact.kind === 'composition') compositionBeforeTarget[fact.teamId] = { playerIds: [...fact.playerIds], certainty: fact.certainty, shortHanded: fact.shortHanded === true };
      if (fact.kind === 'substitution' && compositionBeforeTarget[fact.teamId]) {
        const state = compositionBeforeTarget[fact.teamId];
        if (fact.certainty === 'partial' && !fact.playerOutId) state.playerIds = fact.playerInId ? [fact.playerInId] : [];
        else { if (fact.playerOutId) state.playerIds = state.playerIds.filter(id => id !== fact.playerOutId); if (fact.playerInId && !state.playerIds.includes(fact.playerInId)) state.playerIds.push(fact.playerInId); }
        if (fact.certainty === 'partial') { state.certainty = 'partial'; state.shortHanded = false; }
      }
    }
    if (corrected.kind === 'substitution') {
      const composition = compositionBeforeTarget[corrected.teamId];
      if (composition?.certainty === 'complete' && corrected.playerOutId && !composition.playerIds.includes(corrected.playerOutId))
        return failure(new ValidationError('O atleta que sai não está na composição completa observada.', []));
      if (composition?.playerIds.includes(corrected.playerInId ?? '')) return failure(new ValidationError('O atleta que entra já consta em quadra.', []));
      const projectedIds = new Set(composition?.playerIds ?? []);
      if (corrected.certainty === 'partial' && !corrected.playerOutId) projectedIds.clear();
      else if (corrected.playerOutId) projectedIds.delete(corrected.playerOutId);
      if (corrected.playerInId) projectedIds.add(corrected.playerInId);
      if (projectedIds.size > 5) return failure(new ValidationError('A composição observada não pode ultrapassar cinco atletas.', []));
    }
    const event: MatchEvent = { type: 'futsal_fact_corrected', id: this.dependencies.createId(), matchId, targetFactId: factId, replacementFact: corrected, sequence: workspace.value.state.lastSequence + 1, timestamp: this.dependencies.now() };
    const saved = await this.events.append(event);
    if (!saved.ok) return failure(saved.error);
    return this.loadMatch(matchId);
  }

  async undoFutsalFact(matchId: string, factId?: string): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    const projection = workspace.value.futsalScout;
    const targetHistoryEventId = factId ? projection?.facts.find(item => item.fact.id === factId)?.sourceEventId : projection?.undoTargetHistoryEventId;
    if (!targetHistoryEventId) return failure(new ValidationError('Não há fato de futsal para desfazer.', []));
    const event: MatchEvent = { type: 'futsal_fact_undone', id: this.dependencies.createId(), matchId, targetHistoryEventId, sequence: workspace.value.state.lastSequence + 1, timestamp: this.dependencies.now() };
    const saved = await this.events.append(event);
    if (!saved.ok) return failure(saved.error);
    return this.loadMatch(matchId);
  }

  async registerBasketballFact(matchId: string, period: number, draft: BasketballFactDraft): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    if (!workspace.value.basketball) return failure(new ValidationError('Scout de basquete indisponível.', []));
    const fact = { ...draft, id: this.dependencies.createId(), period, timestamp: this.dependencies.now() } as BasketballFact;
    const invalid = validateBasketballFact(fact, new Set(workspace.value.teams.map(team => team.id)), new Map(workspace.value.players.map(player => [player.id, player.teamId])));
    if (invalid) return failure(new ValidationError(invalid, []));
    const event: MatchEvent = { type: 'basketball_fact_registered', id: this.dependencies.createId(), matchId, sequence: workspace.value.state.lastSequence + 1, timestamp: this.dependencies.now(), fact };
    const saved = await this.events.append(event);
    return saved.ok ? this.loadMatch(matchId) : failure(saved.error);
  }

  async correctBasketballFact(matchId: string, factId: string, draft: BasketballFactDraft): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    const target = workspace.value.basketball?.facts.find(fact => fact.id === factId);
    if (!target) return failure(new ValidationError('Lance de basquete não encontrado.', []));
    const replacementFact = { ...draft, id: target.id, period: target.period, timestamp: target.timestamp } as BasketballFact;
    const invalid = validateBasketballFact(replacementFact, new Set(workspace.value.teams.map(team => team.id)), new Map(workspace.value.players.map(player => [player.id, player.teamId])));
    if (invalid) return failure(new ValidationError(invalid, []));
    const event: MatchEvent = { type: 'basketball_fact_corrected', id: this.dependencies.createId(), matchId, sequence: workspace.value.state.lastSequence + 1, timestamp: this.dependencies.now(), targetFactId: factId, replacementFact };
    const saved = await this.events.append(event);
    return saved.ok ? this.loadMatch(matchId) : failure(saved.error);
  }

  async undoBasketballFact(matchId: string): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    const targetHistoryEventId = workspace.value.basketball?.undoTargetHistoryEventId;
    if (!targetHistoryEventId) return failure(new ValidationError('Não há lance de basquete para desfazer.', []));
    const event: MatchEvent = { type: 'basketball_fact_undone', id: this.dependencies.createId(), matchId, sequence: workspace.value.state.lastSequence + 1, timestamp: this.dependencies.now(), targetHistoryEventId };
    const saved = await this.events.append(event);
    return saved.ok ? this.loadMatch(matchId) : failure(saved.error);
  }

  async registerEssentialAction(matchId: string, draft: EssentialScoutDraft): Promise<Result<MatchWorkspace, ServiceError>> {
    const invalid = validateEssentialDraft(draft);
    if (invalid) return failure(new ValidationError(invalid, []));
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    const identityIssue = validateEssentialIdentity(draft, workspace.value);
    if (identityIssue) return failure(new ValidationError(identityIssue, []));
    const sport = resolveMatchSport(workspace.value.state.metadata);
    if (sport !== 'football' && sport !== 'futsal') return failure(new ValidationError('Scout essencial disponível apenas para futebol e futsal.', []));
    const sportIssue = validateEssentialSportDraft(draft, sport);
    if (sportIssue) return failure(new ValidationError(sportIssue, []));
    if (sport === 'football') return this.registerFootballEvent(matchId, essentialFootballInput(draft, draft.capturedElapsedMs));
    return this.registerFutsalFact(matchId, essentialFutsalDraft(draft), draft.capturedElapsedMs);
  }

  async correctEssentialAction(matchId: string, id: string, draft: EssentialScoutDraft): Promise<Result<MatchWorkspace, ServiceError>> {
    const invalid = validateEssentialDraft(draft);
    if (invalid) return failure(new ValidationError(invalid, []));
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    const identityIssue = validateEssentialIdentity(draft, workspace.value);
    if (identityIssue) return failure(new ValidationError(identityIssue, []));
    const target = workspace.value.essentialActions.find(action => action.id === id);
    if (!target) return failure(new ValidationError('Ação essencial não encontrada.', []));
    const sport = resolveMatchSport(workspace.value.state.metadata);
    if (sport === 'football' || sport === 'futsal') {
      const sportIssue = validateEssentialSportDraft(draft, sport);
      if (sportIssue) return failure(new ValidationError(sportIssue, []));
    }
    if (sport === 'football') return this.correctFootballEvent(matchId, id, essentialFootballInput(draft, target.elapsedMs));
    if (sport === 'futsal') return this.correctFutsalFact(matchId, id, essentialFutsalDraft(draft));
    return failure(new ValidationError('Scout essencial disponível apenas para futebol e futsal.', []));
  }

  async deleteEssentialAction(matchId: string, id: string): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    if (!workspace.value.essentialActions.some(action => action.id === id)) return failure(new ValidationError('Ação essencial não encontrada.', []));
    const sport = resolveMatchSport(workspace.value.state.metadata);
    const registration = workspace.value.events.find((event): event is Extract<MatchEvent, { type: 'football_event_registered' | 'futsal_fact_registered' }> => sport === 'football'
      ? event.type === 'football_event_registered' && event.event.id === id && event.event.scout_trainer.essential_code !== undefined
      : event.type === 'futsal_fact_registered' && event.fact.id === id && event.fact.essentialCode !== undefined);
    if (!registration) return failure(new ValidationError('Inscrição original da ação essencial não encontrada.', []));
    const event: MatchEvent = sport === 'football'
      ? { type: 'football_event_undone', id: this.dependencies.createId(), matchId, sequence: workspace.value.state.lastSequence + 1, timestamp: this.dependencies.now(), targetHistoryEventId: registration.id }
      : { type: 'futsal_fact_undone', id: this.dependencies.createId(), matchId, sequence: workspace.value.state.lastSequence + 1, timestamp: this.dependencies.now(), targetHistoryEventId: registration.id };
    const saved = await this.events.append(event);
    if (!saved.ok) return failure(saved.error);
    await this.invalidateAnalytics(matchId);
    return this.loadMatch(matchId);
  }

  async adjustFootballScore(matchId: string, teamId: string, delta: -1 | 1): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    const teamIndex = workspace.value.teams.findIndex((team) => team.id === teamId);
    if (!workspace.value.football || teamIndex < 0) return failure(new ValidationError('Football score is unavailable.', []));
    const current = teamIndex === 0 ? workspace.value.football.score.teamA : workspace.value.football.score.teamB;
    if (current + delta < 0) return failure(new ValidationError('Score cannot be negative.', []));
    const event = this.matchEventFactory.scoreAdjustment({ matchId, setNumber: workspace.value.football.clock.period, teamId, delta, reason: 'football_manual:operator', sequence: workspace.value.state.lastSequence + 1 });
    const saved = await this.events.append(event);
    if (!saved.ok) return failure(saved.error);
    return this.loadMatch(matchId);
  }

  async registerScout(
    matchId: string,
    teamId: string,
    rawCode: string,
    metadata?: ScoutEventMetadata,
  ): Promise<Result<MatchWorkspace, ServiceError>> {
    return this.registerResolvedScout(matchId, teamId, (workspace, context) =>
      new RegisterScoutEventUseCase().execute({
        rawCode,
        profiles: workspace.profiles,
        context,
        ...(metadata ? { metadata } : {}),
      }),
    );
  }

  async registerVisualScout(
    matchId: string,
    draft: VisualScoutDraft,
  ): Promise<Result<MatchWorkspace, ServiceError>> {
    return this.registerResolvedScout(matchId, draft.teamId, (workspace, context) =>
      new ValidateAndCreateScoutEventUseCase().execute({
        candidate: new VisualScoutMapper().map(draft, workspace.profiles.codeProfile),
        inputMode: 'visual',
        profiles: workspace.profiles,
        context,
      }),
    );
  }

  async registerHybridScout(
    matchId: string,
    teamId: string,
    rawCode: string,
    visualDraft: VisualScoutDraft,
  ): Promise<Result<MatchWorkspace, ServiceError>> {
    return this.registerResolvedScout(matchId, teamId, (workspace, context) => {
      const register = new RegisterScoutEventUseCase();
      const typed = register.mapCandidate({ rawCode, profiles: workspace.profiles, context });
      if (!typed.ok) return failure(typed.error);
      const merged = new HybridScoutMerger().merge({
        typedTeamId: teamId,
        typedCandidate: typed.value.candidate,
        visualDraft,
        codeProfile: workspace.profiles.codeProfile,
      });
      if (!merged.ok) return failure(merged.error);
      return new ValidateAndCreateScoutEventUseCase().execute({
        candidate: merged.value,
        inputMode: 'hybrid',
        profiles: workspace.profiles,
        context,
      });
    });
  }

  async registerFault(
    matchId: string,
    input: RegisterFaultInput,
  ): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    const { state, teams, players, currentLineups } = workspace.value;
    if (state.matchCompleted || state.sets.some((set) => set.setNumber === state.currentSet && set.completed)) {
      return failure(new ValidationError('The current set is finished.', []));
    }
    if (!teams.some((team) => team.id === input.teamId)) {
      return failure(new ValidationError('Fault team was not found.', []));
    }
    if (!['net_touch', 'invasion', 'double_touch', 'rotation_error'].includes(input.faultType)) {
      return failure(new ValidationError('Unknown fault type.', []));
    }
    if (input.athleteId !== undefined && !players.some(
      (player) => player.id === input.athleteId && player.teamId === input.teamId,
    )) {
      return failure(new ValidationError('Fault athlete was not found in the selected team.', []));
    }

    let sequence = state.lastSequence;
    const bootstrapLineups = currentLineups.filter(
      (lineup) => !state.lineups.some(
        (persisted) => persisted.teamId === lineup.teamId && persisted.setNumber === lineup.setNumber,
      ),
    );
    const bootstrapEvents: MatchEvent[] = bootstrapLineups.map((lineup) => ({
      type: 'set_lineup_confirmed',
      id: this.dependencies.createId(),
      matchId,
      lineup,
      sequence: ++sequence,
      timestamp: this.dependencies.now(),
    }));
    const baseState = bootstrapEvents.length > 0
      ? replayMatch(state.metadata, [...workspace.value.events, ...bootstrapEvents])
      : state;
    const startsRally = baseState.currentRally.status !== 'active' || !baseState.currentRally.rallyId;
    const rallyId = startsRally ? this.dependencies.createId() : baseState.currentRally.rallyId;
    if (!rallyId) return failure(new ValidationError('Rally could not be identified.', []));
    const pointFor = teams.find((team) => team.id !== input.teamId)?.id;
    if (!pointFor) return failure(new ValidationError('Opponent team was not found.', []));
    const fault = this.matchEventFactory.fault({
      state: baseState,
      teamId: input.teamId,
      faultType: input.faultType,
      rallyId,
      pointFor,
      firstSequence: sequence + (startsRally ? 2 : 1),
      ...(input.athleteId ? { athleteId: input.athleteId } : {}),
    });
    const eventsToPersist: MatchEvent[] = [...bootstrapEvents];
    if (startsRally) {
      eventsToPersist.push(this.matchEventFactory.rallyStarted(matchId, rallyId, sequence + 1, {
        sourceHistoryEventId: fault.id,
      }));
    }
    eventsToPersist.push(fault, ...this.matchEventFactory.derivedFromFault({
      state: baseState,
      teams,
      fault,
      sequence: fault.sequence + 1,
    }));
    const persisted = await this.events.appendMany(eventsToPersist);
    if (!persisted.ok) return failure(persisted.error);
    await this.invalidateAnalytics(matchId);
    return this.loadMatch(matchId);
  }

  private async registerResolvedScout(
    matchId: string,
    teamId: string,
    createEvent: (
      workspace: MatchWorkspace,
      context: ScoutValidationContext,
    ) => Result<{ readonly event: ScoutEvent }, ParseError | ValidationError>,
  ): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    if (
      workspace.value.state.sets.find((set) => set.setNumber === workspace.value.state.currentSet)
        ?.completed
    ) {
      return failure(
        new ValidationError('The current set is finished.', [
          {
            code: 'set_finished',
            message: 'Confirme a escalação do próximo set antes de continuar.',
          },
        ]),
      );
    }
    let sequence = workspace.value.state.lastSequence;
    const bootstrapLineups = workspace.value.currentLineups.filter(
      (lineup) =>
        !workspace.value.state.lineups.some(
          (persisted) =>
            persisted.teamId === lineup.teamId && persisted.setNumber === lineup.setNumber,
        ),
    );
    const bootstrapEvents: MatchEvent[] = bootstrapLineups.map((lineup) => ({
      type: 'set_lineup_confirmed',
      id: this.dependencies.createId(),
      matchId,
      lineup,
      sequence: ++sequence,
      timestamp: this.dependencies.now(),
    }));
    const baseState =
      bootstrapEvents.length > 0
        ? replayMatch(workspace.value.state.metadata, [
            ...workspace.value.events,
            ...bootstrapEvents,
          ])
        : workspace.value.state;
    let rallyId = baseState.currentRally.rallyId;
    const startsRally = baseState.currentRally.status !== 'active' || !rallyId;

    if (startsRally) {
      rallyId = this.dependencies.createId();
    }
    if (!rallyId) {
      return failure(
        new ValidationError('Rally could not be identified.', [
          { code: 'rally_id_missing', message: 'Não foi possível identificar o rally.' },
        ]),
      );
    }

    const scoutSequence = sequence + (startsRally ? 2 : 1);
    const context: ScoutValidationContext = {
      matchId,
      rallyId,
      teamId,
      setNumber: workspace.value.state.currentSet,
      scoreBefore: workspace.value.state.score,
      sequence: scoutSequence,
      previousSequence: scoutSequence - 1,
      roster: workspace.value.players,
      lineup: workspace.value.currentLineups.find((lineup) => lineup.teamId === teamId),
      ...this.scoutTacticalContext(workspace.value.state, teamId),
      enforceRegisteredPlayers: true,
      allowUnidentifiedPlayer: true,
    };
    const registered = createEvent(workspace.value, context);
    if (!registered.ok) return failure(registered.error);

    const eventsToPersist: MatchEvent[] = [...bootstrapEvents];
    if (startsRally) {
      eventsToPersist.push({
        ...this.matchEventFactory.rallyStarted(matchId, rallyId, sequence + 1, {
          targetScoutEventId: registered.value.event.id,
          sourceHistoryEventId: registered.value.event.id,
        }),
      });
    }
    eventsToPersist.push({
      type: 'scout_registered',
      event: registered.value.event,
    });
    eventsToPersist.push(
      ...this.matchEventFactory.derivedFromScout({
        state: baseState,
        teams: workspace.value.teams,
        scout: registered.value.event,
        sourceHistoryEventId: registered.value.event.id,
        firstSequence: scoutSequence + 1,
      }),
    );
    const persisted = await this.events.appendMany(eventsToPersist);
    if (!persisted.ok) return failure(persisted.error);
    await this.invalidateAnalytics(matchId);
    return this.loadMatch(matchId);
  }

  async awardPoint(matchId: string, teamId: string): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    if (!workspace.value.teams.some((team) => team.id === teamId)) {
      return failure(new ValidationError('Point correction team was not found.', []));
    }
    const startsRally = workspace.value.state.currentRally.status !== 'active';
    const rallyId = startsRally
      ? this.dependencies.createId()
      : workspace.value.state.currentRally.rallyId;
    if (!rallyId) {
      return failure(new ValidationError('Rally could not be identified.', []));
    }
    const events = this.matchEventFactory.pointCorrection({
      state: workspace.value.state,
      teams: workspace.value.teams,
      teamId,
      rallyId,
      firstSequence: workspace.value.state.lastSequence + 1,
      startsRally,
    });
    const persisted = await this.events.appendMany(events);
    if (!persisted.ok) return failure(persisted.error);
    await this.invalidateAnalytics(matchId);
    return this.loadMatch(matchId);
  }

  async adjustScore(
    matchId: string,
    teamId: string,
    delta: number,
    reason?: string,
  ): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    if (!workspace.value.teams.some((team) => team.id === teamId)) {
      return failure(new ValidationError('Score adjustment team was not found.', []));
    }
    if (!Number.isSafeInteger(delta) || delta === 0) {
      return failure(new ValidationError('Score adjustment must be a non-zero integer.', []));
    }
    const currentScore = teamId === workspace.value.teams[0].id
      ? workspace.value.state.score.teamA
      : workspace.value.state.score.teamB;
    if (currentScore + delta < 0) {
      return failure(new ValidationError('Score cannot be negative.', []));
    }
    const event = this.matchEventFactory.scoreAdjustment({
      matchId,
      setNumber: workspace.value.state.currentSet,
      teamId,
      delta,
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
      sequence: workspace.value.state.lastSequence + 1,
    });
    const persisted = await this.events.append(event);
    if (!persisted.ok) return failure(persisted.error);
    await this.invalidateAnalytics(matchId);
    return this.loadMatch(matchId);
  }

  /** Operator correction: append existing auditable events, never rewrite prior contacts. */
  async adjustMatchContext(matchId: string, input: MatchContextAdjustmentInput): Promise<Result<MatchWorkspace, ServiceError>> {
    const loaded = await this.loadMatch(matchId);
    if (!loaded.ok) return loaded;
    const { state, teams, currentLineups } = loaded.value;
    if (state.matchCompleted || state.sets.some((set) => set.setNumber === state.currentSet && set.completed)) {
      return failure(new ValidationError('Ajuste disponível somente no set em andamento.', []));
    }
    if (!teams.some((team) => team.id === input.servingTeamId) ||
      ![input.score.teamA, input.score.teamB].every((score) => Number.isSafeInteger(score) && score >= 0) ||
      Object.keys(input.positionOneByTeam).some((id) => !teams.some((team) => team.id === id))) {
      return failure(new ValidationError('Confira a equipe sacadora e o placar informado.', []));
    }
    const changes: MatchEvent[] = [];
    const identity = () => ({ id: this.dependencies.createId(), matchId,
      timestamp: this.dependencies.now(), sequence: state.lastSequence + changes.length + 1 });
    for (const team of teams) {
      const selected = input.positionOneByTeam[team.id];
      if (!selected) continue;
      const lineup = currentLineups.find((item) => item.teamId === team.id);
      const offset = lineup ? ROTATION_POSITIONS.findIndex((position) =>
        lineup.slots[lineup.positions[position]]?.playerId === selected) : -1;
      if (!lineup || offset < 0) return failure(new ValidationError('O atleta de P1 precisa estar na escalação atual.', []));
      if (offset === 0) continue;
      const positions = Object.fromEntries(ROTATION_POSITIONS.map((position, index) =>
        [position, lineup.positions[ROTATION_POSITIONS[(index + offset) % 6]]])) as SetLineup['positions'];
      const rotatedLineup = new RotationEngine().rotate(
        { ...lineup, positions },
        state.metadata.liberoPlayerIds,
      );
      changes.push({ ...identity(), type: 'set_lineup_confirmed', lineup: rotatedLineup });
    }
    for (const [index, team] of teams.entries()) {
      const key = index === 0 ? 'teamA' : 'teamB';
      const delta = input.score[key] - state.score[key];
      if (delta) changes.push({ ...identity(), type: 'score_adjustment', setNumber: state.currentSet,
        teamId: team.id, delta, reason: 'Ajuste rápido do scout' });
    }
    if (input.servingTeamId !== state.servingTeamId) {
      changes.push({ ...identity(), type: 'serving_team_changed', servingTeamId: input.servingTeamId });
    }
    if (input.resumeFromServe && state.currentRally.status === 'active' && state.currentRally.rallyId) {
      changes.push({ ...identity(), type: 'rally_ended', rallyId: state.currentRally.rallyId });
    }
    if (!changes.length) return loaded;
    const saved = await this.events.appendMany(changes);
    if (!saved.ok) return failure(saved.error);
    await this.invalidateAnalytics(matchId);
    return this.loadMatch(matchId);
  }

  async swapVolleyballCourtSides(matchId: string): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    const { state } = workspace.value;
    if (resolveMatchSport(state.metadata) !== 'volleyball') {
      return failure(new ValidationError('A troca de lados está disponível para partidas de vôlei.', []));
    }
    if (state.matchCompleted || state.sets.some((set) => set.setNumber === state.currentSet && set.completed)) {
      return failure(new ValidationError('A troca de lados está disponível durante o set em andamento.', []));
    }
    const persisted = await this.events.append({
      type: 'court_orientation_changed',
      id: this.dependencies.createId(),
      matchId,
      courtOrientation: swapCourtOrientation(state.courtOrientation),
      sequence: state.lastSequence + 1,
      timestamp: this.dependencies.now(),
    });
    if (!persisted.ok) return failure(persisted.error);
    return this.loadMatch(matchId);
  }

  async startNextSet(
    matchId: string,
    input: StartNextSetInput = {},
  ): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    const currentSet = workspace.value.state.sets.find(
      (set) => set.setNumber === workspace.value.state.currentSet,
    );
    if (!currentSet?.completed) {
      return failure(
        new ValidationError('The current set is not finished.', [
          { code: 'set_not_finished', message: 'O set atual ainda não terminou.' },
        ]),
      );
    }
    if (workspace.value.state.matchCompleted) {
      return failure(
        new ValidationError('The match is finished.', [
          { code: 'match_finished', message: 'A partida já foi encerrada.' },
        ]),
      );
    }
    const setNumber = workspace.value.state.currentSet + 1;
    let sequence = workspace.value.state.lastSequence;
    const events: MatchEvent[] = [
      {
        type: 'set_started',
        id: this.dependencies.createId(),
        matchId,
        setNumber,
        initialScore: { teamA: 0, teamB: 0 },
        servingTeamId: input.servingTeamId ?? workspace.value.teams[0].id,
        courtOrientation: swapCourtOrientation(workspace.value.state.courtOrientation),
        sequence: ++sequence,
        timestamp: this.dependencies.now(),
      },
    ];
    const [teamA, teamB] = workspace.value.teams;
    const configuredTeamA = input.teamALineup
      ? this.createLineup(teamA.id, setNumber, workspace.value.players, input.teamALineup)
      : undefined;
    const configuredTeamB = input.teamBLineup
      ? this.createLineup(teamB.id, setNumber, workspace.value.players, input.teamBLineup)
      : undefined;
    if ((input.teamALineup && !configuredTeamA) || (input.teamBLineup && !configuredTeamB)) {
      return failure(
        new ValidationError('The next set lineup is invalid.', [
          {
            code: 'invalid_next_set_lineup',
            message: 'Cada posição P1-P6 deve ter um atleta único e inscrito.',
          },
        ]),
      );
    }
    const lineups = [
      configuredTeamA ??
        workspace.value.currentLineups.find((lineup) => lineup.teamId === teamA.id) ??
        createDefaultLineup(teamA.id, setNumber, workspace.value.players),
      configuredTeamB ??
        workspace.value.currentLineups.find((lineup) => lineup.teamId === teamB.id) ??
        createDefaultLineup(teamB.id, setNumber, workspace.value.players),
    ].flatMap((lineup) => (lineup ? [{ ...lineup, setNumber }] : []));
    events.push(
      ...lineups.map((lineup) => ({
        type: 'set_lineup_confirmed' as const,
        id: this.dependencies.createId(),
        matchId,
        lineup,
        sequence: ++sequence,
        timestamp: this.dependencies.now(),
      })),
    );
    const persisted = await this.events.appendMany(events);
    if (!persisted.ok) return failure(persisted.error);
    await this.invalidateAnalytics(matchId);
    return this.loadMatch(matchId);
  }

  async substitute(
    matchId: string,
    teamId: string,
    slotId: string,
    playerInId: string,
  ): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    const lineup = workspace.value.currentLineups.find((candidate) => candidate.teamId === teamId);
    const slot = lineup?.slots[slotId];
    const playerIn = workspace.value.players.find(
      (player) => player.id === playerInId && player.teamId === teamId && player.active !== false,
    );
    const occupied =
      lineup && playerIn
        ? Object.values(lineup.slots).some((candidate) => candidate.playerId === playerIn.id)
        : false;
    const position = lineup
      ? ROTATION_POSITIONS.find((candidate) => lineup.positions[candidate] === slotId)
      : undefined;
    if (!lineup || !slot || !playerIn || occupied || !position) {
      return failure(
        new ValidationError('Invalid substitution.', [
          {
            code: 'invalid_substitution',
            message: 'A substituição não é válida para esta escalação.',
          },
        ]),
      );
    }
    const isVolleyball = workspace.value.state.metadata.sport === 'volleyball';
    const isLiberoIn =
      playerIn.registeredRole === 'libero' ||
      (workspace.value.state.metadata.liberoPlayerIds &&
        workspace.value.state.metadata.liberoPlayerIds.includes(playerIn.id));
    if (isVolleyball && isLiberoIn && [2, 3, 4].includes(position)) {
      return failure(
        new ValidationError('Libero cannot play in front row.', [
          {
            code: 'libero_front_row',
            message: 'O líbero não pode entrar em posições de rede (posições 2, 3 e 4).',
          },
        ]),
      );
    }
    const event: MatchEvent = {
      type: 'substitution_made',
      id: this.dependencies.createId(),
      matchId,
      teamId,
      setNumber: workspace.value.state.currentSet,
      slotId,
      playerOutId: slot.playerId,
      playerInId,
      rotationPositionAtSubstitution: position,
      score: { ...workspace.value.state.score },
      playerOutRole: slot.activeRole ?? playerRoleForTacticalRole(slot.tacticalRole),
      playerInRole:
        playerIn.registeredRole ?? slot.activeRole ?? playerRoleForTacticalRole(slot.tacticalRole),
      sequence: workspace.value.state.lastSequence + 1,
      timestamp: this.dependencies.now(),
    };
    const persisted = await this.events.append(event);
    if (!persisted.ok) return failure(persisted.error);
    await this.invalidateAnalytics(matchId);
    return this.loadMatch(matchId);
  }

  async correctScout(
    matchId: string,
    sourceEventId: string,
    newRawCode: string,
    metadata?: ScoutEventMetadata,
  ): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    const target = workspace.value.timeline.find((item) => item.sourceEventId === sourceEventId);
    if (!target) {
      return failure(new ValidationError('Scout event was not found.', []));
    }
    const registered = new RegisterScoutEventUseCase().execute({
      rawCode: newRawCode,
      profiles: workspace.value.profiles,
      ...((metadata ?? target.event.metadata)
        ? { metadata: { ...target.event.metadata, ...metadata } }
        : {}),
      context: {
        matchId,
        rallyId: target.event.rallyId,
        teamId: target.event.teamId,
        setNumber: target.event.setNumber,
        scoreBefore: target.event.scoreBefore,
        sequence: workspace.value.state.lastSequence + 1,
        previousSequence: workspace.value.state.lastSequence,
        roster: workspace.value.players,
        ...(target.event.lineupContext ? { lineupContext: target.event.lineupContext } : {}),
        lineup: workspace.value.currentLineups.find(
          (lineup) => lineup.teamId === target.event.teamId,
        ),
        ...(target.event.setterPlayerId ? { setterPlayerId: target.event.setterPlayerId } : {}),
        ...(target.event.setterPosition ? { setterPosition: target.event.setterPosition } : {}),
        ...(target.event.formationState ? { formationState: target.event.formationState } : {}),
        enforceRegisteredPlayers: true,
        allowUnidentifiedPlayer: true,
      },
    });
    if (!registered.ok) return failure(registered.error);

    const correction = this.matchEventFactory.scoutCorrection({
      matchId,
      targetEventId: sourceEventId,
      previousRawCode: target.event.rawCode,
      newRawCode,
      replacementEvent: registered.value.event,
      sequence: workspace.value.state.lastSequence + 1,
    });
    const baseState = this.matchReplayService.stateBeforeScout(
      workspace.value.state.metadata,
      [...workspace.value.events, correction],
      sourceEventId,
    );
    const events: MatchEvent[] = [
      correction,
      ...this.matchEventFactory.derivedFromScout({
        state: baseState,
        teams: workspace.value.teams,
        scout: registered.value.event,
        sourceHistoryEventId: correction.id,
        firstSequence: correction.sequence + 1,
        targetScoutEventId: sourceEventId,
      }),
    ];
    const persisted = await this.events.appendMany(events);
    if (!persisted.ok) return failure(persisted.error);
    await this.invalidateAnalytics(matchId);
    return this.loadMatch(matchId);
  }

  async undo(matchId: string): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    const targetHistoryEventId = findUndoTarget(workspace.value.events);
    if (!targetHistoryEventId) {
      return failure(new ValidationError('There is no scout action to undo.', []));
    }
    const event = this.matchEventFactory.undo(
      matchId,
      targetHistoryEventId,
      workspace.value.state.lastSequence + 1,
    );
    const persisted = await this.events.append(event);
    if (!persisted.ok) return failure(persisted.error);
    await this.invalidateAnalytics(matchId);
    return this.loadMatch(matchId);
  }

  async redo(matchId: string): Promise<Result<MatchWorkspace, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    const targetUndoEventId = findRedoTarget(workspace.value.events);
    if (!targetUndoEventId) {
      return failure(new ValidationError('There is no scout action to redo.', []));
    }
    const event = this.matchEventFactory.redo(
      matchId,
      targetUndoEventId,
      workspace.value.state.lastSequence + 1,
    );
    const persisted = await this.events.append(event);
    if (!persisted.ok) return failure(persisted.error);
    await this.invalidateAnalytics(matchId);
    return this.loadMatch(matchId);
  }

  async exportJson(matchId: string, options: { readonly includeDerivedAnalytics?: boolean } = {}): Promise<Result<string, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    const configurations = this.analysisConfigurations
      ? await this.analysisConfigurations.listByMatchId(matchId)
      : undefined;
    if (configurations && !configurations.ok) return failure(configurations.error);
    const reportCharts = this.reportCharts
      ? await this.reportCharts.listByMatchId(matchId)
      : undefined;
    if (reportCharts && !reportCharts.ok) return failure(reportCharts.error);
    return success(
      new JsonMatchExporter().export({
        match: workspace.value.state.metadata,
        teams: workspace.value.teams,
        players: workspace.value.players,
        profiles: {
          code: workspace.value.profiles.codeProfile,
          complexity: workspace.value.profiles.complexityProfile,
          ...(workspace.value.profiles.competitionProfile
            ? { competition: workspace.value.profiles.competitionProfile }
            : {}),
        },
        events: workspace.value.events,
        ...(workspace.value.futsalScout ? { futsalCoverage: futsalBackupCoverage(workspace.value.futsalScout) } : {}),
        ...(configurations ? { analysisConfigurations: configurations.value } : {}),
        ...(reportCharts ? { reportChartConfigurations: reportCharts.value } : {}),
        ...(resolveMatchSport(workspace.value.state.metadata) !== 'futsal' && resolveMatchSport(workspace.value.state.metadata) !== 'basketball' && options.includeDerivedAnalytics && workspace.value.sequenceAnalytics && workspace.value.profiles.codeProfile.tacticalInput?.zoneSystem
          ? { derivedAnalytics: buildDerivedAnalyticsReport(workspace.value.sequenceAnalytics, workspace.value.profiles.codeProfile.tacticalInput.zoneSystem) }
          : {}),
      }),
    );
  }

  async exportFootballOpenData(matchId: string): Promise<Result<string, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    if (!workspace.value.football) return failure(new ValidationError('Football events are unavailable.', []));
    const exported = exportCanonicalStatsBomb(workspace.value.football.events);
    return success(JSON.stringify({ openDataVersion: OPEN_DATA_VERSION, modality: 'football', ...exported }, null, 2));
  }

  async exportCsv(matchId: string): Promise<Result<string, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    if (workspace.value.futsalScout) {
      const analytics = buildFutsalAnalytics(workspace.value.futsalScout, workspace.value.teams.map(team => team.id));
      return success(exportFutsalAnalyticsCsv(analytics, Object.fromEntries(workspace.value.teams.map(team => [team.id, team.name]))));
    }
    return success(
      new CsvMatchExporter().export(workspace.value.timeline.map((item) => item.event)),
    );
  }

  async exportTxt(matchId: string): Promise<Result<string, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    return success(
      new TxtMatchExporter().export(workspace.value.timeline.map((item) => item.event)),
    );
  }

  async exportPdf(matchId: string, options: { readonly includeDerivedAnalytics?: boolean; readonly reportDraft?: ReportDraft } = {}): Promise<Result<string, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    if (workspace.value.futsalScout) {
      const analytics = buildFutsalAnalytics(workspace.value.futsalScout, workspace.value.teams.map(team => team.id));
      return success(renderFutsalAnalyticsPdf(workspace.value.state.metadata.name, analytics, Object.fromEntries(workspace.value.teams.map(team => [team.id, team.name]))));
    }
    const reportCharts = this.reportCharts
      ? await this.reportCharts.listByMatchId(matchId)
      : undefined;
    if (reportCharts && !reportCharts.ok) return failure(reportCharts.error);
    const derived = resolveMatchSport(workspace.value.state.metadata) !== 'futsal' && resolveMatchSport(workspace.value.state.metadata) !== 'basketball' && options.includeDerivedAnalytics && workspace.value.sequenceAnalytics && workspace.value.profiles.codeProfile.tacticalInput?.zoneSystem
      ? buildDerivedAnalyticsReport(workspace.value.sequenceAnalytics, workspace.value.profiles.codeProfile.tacticalInput.zoneSystem)
      : undefined;
    return success(new MatchPdfRenderer().render(workspace.value.report, reportCharts?.value, derived, options.reportDraft));
  }

  async exportBundle(matchId: string, options: { readonly includeDerivedAnalytics?: boolean; readonly reportDraft?: ReportDraft } = {}): Promise<Result<MatchExportBundle, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    const configurations = this.analysisConfigurations
      ? await this.analysisConfigurations.listByMatchId(matchId)
      : undefined;
    if (configurations && !configurations.ok) return failure(configurations.error);
    const reportCharts = this.reportCharts
      ? await this.reportCharts.listByMatchId(matchId)
      : undefined;
    if (reportCharts && !reportCharts.ok) return failure(reportCharts.error);
    const json = new JsonMatchExporter().export({
      match: workspace.value.state.metadata,
      teams: workspace.value.teams,
      players: workspace.value.players,
      profiles: {
        code: workspace.value.profiles.codeProfile,
        complexity: workspace.value.profiles.complexityProfile,
        ...(workspace.value.profiles.competitionProfile
          ? { competition: workspace.value.profiles.competitionProfile }
          : {}),
      },
      events: workspace.value.events,
      ...(workspace.value.futsalScout ? { futsalCoverage: futsalBackupCoverage(workspace.value.futsalScout) } : {}),
      ...(configurations ? { analysisConfigurations: configurations.value } : {}),
      ...(reportCharts ? { reportChartConfigurations: reportCharts.value } : {}),
      ...(resolveMatchSport(workspace.value.state.metadata) !== 'futsal' && resolveMatchSport(workspace.value.state.metadata) !== 'basketball' && options.includeDerivedAnalytics && workspace.value.sequenceAnalytics && workspace.value.profiles.codeProfile.tacticalInput?.zoneSystem
        ? { derivedAnalytics: buildDerivedAnalyticsReport(workspace.value.sequenceAnalytics, workspace.value.profiles.codeProfile.tacticalInput.zoneSystem) }
        : {}),
    });
    const effectiveEvents = workspace.value.timeline.map((item) => item.event);
    const timestamp = localExportTimestamp(this.dependencies.now());
    const matchup = workspace.value.teams
      .map((team) =>
        team.name
          .trim()
          .replace(/[^\p{L}\p{N}]+/gu, '-')
          .replace(/^-|-$/g, ''),
      )
      .join('-x-');
    return success({
      folderName: `${matchup}_${timestamp}`,
      files: Object.freeze({
        'partida.json': json,
        'eventos.csv': new CsvMatchExporter().export(effectiveEvents),
        'scout.txt': new TxtMatchExporter().export(effectiveEvents),
        'estatisticas.csv': workspace.value.futsalScout
          ? exportFutsalAnalyticsCsv(buildFutsalAnalytics(workspace.value.futsalScout, workspace.value.teams.map(team => team.id)), Object.fromEntries(workspace.value.teams.map(team => [team.id, team.name])))
          : new StatisticsCsvExporter().export(workspace.value.report),
        'relatorio.pdf': workspace.value.futsalScout
          ? renderFutsalAnalyticsPdf(workspace.value.state.metadata.name, buildFutsalAnalytics(workspace.value.futsalScout, workspace.value.teams.map(team => team.id)), Object.fromEntries(workspace.value.teams.map(team => [team.id, team.name])))
          : new MatchPdfRenderer().render(workspace.value.report, reportCharts?.value,
          resolveMatchSport(workspace.value.state.metadata) !== 'futsal' && resolveMatchSport(workspace.value.state.metadata) !== 'basketball' && options.includeDerivedAnalytics && workspace.value.sequenceAnalytics && workspace.value.profiles.codeProfile.tacticalInput?.zoneSystem
            ? buildDerivedAnalyticsReport(workspace.value.sequenceAnalytics, workspace.value.profiles.codeProfile.tacticalInput.zoneSystem)
            : undefined, options.reportDraft),
      }),
    });
  }

  async importJson(serialized: string): Promise<Result<MatchWorkspace, ServiceError>> {
    const imported = new JsonMatchImporter().import(serialized);
    if (!imported.ok) return failure(imported.error);
    if (!this.backupRepository) {
      return failure(
        new RepositoryError('database_operation_failed', 'Backup restore is not configured.'),
      );
    }
    const restored = await this.backupRepository.restore(imported.value);
    if (!restored.ok) return failure(restored.error);
    for (const profile of [
      imported.value.profiles.code,
      imported.value.profiles.complexity,
      ...(imported.value.profiles.competition ? [imported.value.profiles.competition] : []),
    ]) {
      const existing = this.profileRegistry.resolve(profile.kind, profile.id, profile.version);
      if (!existing.ok) {
        const registered = this.profileRegistry.register(profile);
        if (!registered.ok) return failure(registered.error);
      }
    }
    return this.loadMatch(imported.value.match.id);
  }

  private resolveProfiles(metadata: MatchMetadata): Result<ResolvedProfileContext, ProfileError> {
    return this.resolver.resolve({
      code: { id: metadata.codeProfileId, version: metadata.codeProfileVersion },
      complexity: { id: metadata.complexityProfileId },
      ...(metadata.competitionProfileId
        ? {
            competition: {
              id: metadata.competitionProfileId,
              version: metadata.competitionProfileVersion,
            },
          }
        : {}),
    });
  }

  private scoutTacticalContext(state: MatchState, teamId: string) {
    const tactical = state.tacticalStateByTeamId[teamId];
    return {
      ...(tactical?.activeSetterPlayerId ? { setterPlayerId: tactical.activeSetterPlayerId } : {}),
      ...(tactical?.activeSetterPosition ? { setterPosition: tactical.activeSetterPosition } : {}),
      ...(tactical?.formationState ? { formationState: tactical.formationState } : {}),
    };
  }
}

function validateFootballObservation(observation: FootballObservation | undefined, workspace: MatchWorkspace): string | undefined {
  if (!observation) return;
  const ids = workspace.teams.map(team => team.id);
  for (const control of [observation.before, observation.after]) {
    if (control?.kind === 'controlled' && (!ids.includes(control.teamId) || (control.playerId && !workspace.players.some(p => p.id === control.playerId && p.teamId === control.teamId)))) return 'Controle ou atleta inválido.';
    if (control?.kind === 'dead_ball' && control.restartTeamId && !ids.includes(control.restartTeamId)) return 'Equipe de reinício inválida.';
  }
  const pressure = observation.pressure;
  if (pressure && ((pressure.pressingTeamId && !ids.includes(pressure.pressingTeamId)) || (pressure.pressedTeamId && !ids.includes(pressure.pressedTeamId)) || (pressure.pressedTeamId && pressure.pressedTeamId === pressure.pressingTeamId))) return 'Equipes da pressão inválidas.';
}

function validateFootballEssentialInput(input: RegisterFootballEventInput): string | undefined {
  if (!input.essentialCode) {
    if (input.essentialShirtNumber !== undefined || input.essentialThird !== undefined || input.essentialThirdAnchor !== undefined || input.essentialQualifiers !== undefined || input.essentialPassResult !== undefined || input.essentialProgressionType !== undefined || input.essentialProgressionResult !== undefined || input.essentialFoulCard !== undefined || input.essentialRestartType !== undefined) return 'Metadados essenciais exigem código essencial.';
    return;
  }
  const expectedAction = input.essentialCode === 'F' ? 'shot' : input.essentialCode === 'P' || input.essentialCode === 'PF' ? 'pass' : input.essentialCode === 'C' ? input.essentialProgressionType === 'dribble' ? 'dribble' : 'carry' : input.essentialCode === 'PP' ? 'loss' : input.essentialCode === 'RP' ? 'ball_recovery' : input.essentialCode === 'FL' ? 'foul' : 'restart';
  if (input.action !== expectedAction || input.observation?.coverage !== 'suspended' || input.possessionTeamId !== undefined) return 'Ação essencial incompatível com seu marcador ou cobertura.';
  if (input.essentialCode === 'RE' && !FOOTBALL_ESSENTIAL_RESTART_TYPES.includes(input.essentialRestartType!)) return 'Tipo de reinício incompatível com futebol.';
  if (input.endLocation && !['F', 'P', 'PF', 'C'].includes(input.essentialCode)) return 'Destino incompatível com o fundamento.';
  if (input.endLocation && !input.location && input.essentialCode === 'F') return 'Alvo da finalização exige origem observada.';
  if (input.essentialCode === 'P' || input.essentialCode === 'PF') {
    const expectedOutcome = input.essentialPassResult === 'incomplete' ? 'incomplete' : input.essentialPassResult === 'unknown' ? 'observed' : 'complete';
    if (input.outcome !== expectedOutcome) return 'Resultado do passe incompatível com o fato.';
  }
  if (input.essentialCode === 'C' && input.essentialProgressionType === 'dribble') {
    const expectedOutcome = input.essentialProgressionResult === 'retained' ? 'won' : input.essentialProgressionResult === 'lost' ? 'lost' : 'observed';
    if (input.outcome !== expectedOutcome) return 'Resultado do drible incompatível com o fato.';
  }
  const outcome = input.essentialCode === 'F' ? (Object.keys(ESSENTIAL_TO_FOOTBALL_OUTCOME) as EssentialOutcome[]).find(key => ESSENTIAL_TO_FOOTBALL_OUTCOME[key] === input.outcome) : undefined;
  return validateEssentialDraft({
    code: input.essentialCode, teamId: input.teamId,
    ...(input.playerId ? { playerId: input.playerId } : {}),
    ...(input.essentialShirtNumber !== undefined ? { shirtNumber: input.essentialShirtNumber } : {}),
    ...(input.location ? { position: input.location } : {}),
    ...(input.endLocation ? { destination: input.endLocation } : {}),
    ...(input.essentialThird !== undefined ? { third: input.essentialThird } : {}),
    ...(input.essentialThirdAnchor !== undefined ? { thirdAnchor: input.essentialThirdAnchor } : {}),
    ...(input.essentialQualifiers !== undefined ? { qualifiers: input.essentialQualifiers } : {}),
    ...(input.essentialPassResult !== undefined ? { passResult: input.essentialPassResult } : {}),
    ...(input.essentialProgressionType !== undefined ? { progressionType: input.essentialProgressionType } : {}),
    ...(input.essentialProgressionResult !== undefined ? { progressionResult: input.essentialProgressionResult } : {}),
    ...(input.essentialFoulCard !== undefined ? { foulCard: input.essentialFoulCard } : {}),
    ...(input.essentialRestartType !== undefined ? { restartType: input.essentialRestartType } : {}),
    ...(outcome ? { outcome } : {}),
  });
}

function validateFootballAssistedRecording(recording: FootballAssistedRecording, workspace: MatchWorkspace): string | undefined {
  if (!isValidFootballAssistedRecording(recording)) return 'Contrato assistido inválido.';
  const events = workspace.football?.events ?? [];
  const byEventId = new Map(events.map(event => [event.id, event]));
  const teamIds = new Set(workspace.teams.map(team => team.id));
  const observations = new Map(recording.observations.map(observation => [observation.id, observation]));
  const details = new Set(recording.details.map(detail => detail.id));
  const pressures = new Set(recording.pressures.map(pressure => pressure.id));
  for (const observation of recording.observations) {
    const target = byEventId.get(observation.targetEventId);
    if (observation.matchId !== workspace.state.metadata.id || !target || target.period !== observation.period ||
        (observation.controlledTeamId !== undefined && !teamIds.has(observation.controlledTeamId))) return 'Observação assistida sem vínculo seguro.';
  }
  for (const detail of recording.details) {
    if (!observations.has(detail.observationId) || (detail.teamId !== undefined && !teamIds.has(detail.teamId))) return 'Detalhe assistido sem observação ou equipe válida.';
  }
  for (const pressure of recording.pressures) {
    if (!observations.has(pressure.observationId) ||
        (pressure.pressingTeamId !== undefined && !teamIds.has(pressure.pressingTeamId)) ||
        (pressure.ballTeamId !== undefined && !teamIds.has(pressure.ballTeamId)) ||
        (pressure.pressingTeamId !== undefined && pressure.pressingTeamId === pressure.ballTeamId) ||
        (pressure.pointEventId !== undefined && !byEventId.has(pressure.pointEventId)) ||
        (pressure.pointAgeMs !== undefined && (!Number.isFinite(pressure.pointAgeMs) || pressure.pointAgeMs < 0))) return 'Pressão assistida sem vínculo seguro.';
  }
  const candidates = new Map(recording.candidates.map(candidate => [candidate.key, candidate]));
  if (candidates.size !== recording.candidates.length) return 'Chave de candidato duplicada.';
  for (const candidate of recording.candidates) {
    if (!observations.has(candidate.targetObservationId) || candidate.key !== footballAssistedCandidateKey({ kind: candidate.kind, targetObservationId: candidate.targetObservationId, sourceEventIds: candidate.sourceRevisions.map(source => source.eventId) }) ||
        candidate.sourceRevisions.some(source => {
          const event = byEventId.get(source.eventId);
          return !event || footballAssistedSourceRevision(event) !== source.revision;
        })) return 'Candidato assistido desatualizado ou sem fonte.';
  }
  for (const confirmation of recording.confirmations) {
    if (!candidates.has(confirmation.candidateKey) ||
        confirmation.actions.some(action => action.kind === 'detail' ? !details.has(action.detailId) : !pressures.has(action.pressureId)) ||
        confirmation.segmentEventIds.some(id => !byEventId.has(id)) ||
        confirmation.describedActions?.some(action => [action.passerId, action.receiverId, action.carrierId, action.recipientId, action.responsibleId, action.recovererId].some(id => id !== undefined && !workspace.players.some(player => player.id === id)))) return 'Confirmação assistida sem vínculo seguro.';
  }
}

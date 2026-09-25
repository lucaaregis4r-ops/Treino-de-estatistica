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
import { type FaultType, type MatchEvent } from '../domain/match/events/MatchEvent';
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
import { createCanonicalFootballEvent, effectiveElapsed, formatFootballTimestamp, projectFootball, type FootballOutcome, type FootballProjection } from '../domain/football/FootballRecorder';
import { normalizedToStatsBomb, type FootballAction } from '../domain/football/StatsBombContract';
import { exportCanonicalStatsBomb, OPEN_DATA_VERSION } from '../domain/football/StatsBombOpenData';
import { footballAssistedCandidateKey, footballAssistedSourceRevision, isValidFootballAssistedRecording, type FootballAssistedRecording } from '../domain/football/FootballAssistedRecording';

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
  readonly sport?: 'volleyball' | 'football';
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

export class ScoutTrainerService {
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
      (player) => !Number.isSafeInteger(player.number) || player.number < 1 || player.number > 99,
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
        return player.libero && entity ? [entity.id] : [];
      }),
      ...teamBRegistrations.flatMap((player) => {
        const entity = playerEntities.find(
          (candidate) => candidate.teamId === teamB.id && candidate.number === player.number,
        );
        return player.libero && entity ? [entity.id] : [];
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
    const sequenceAnalytics = zoneSystem
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
    if (teamIndex < 0 || (input.playerId && (playerIndex < 0 || workspace.value.players[playerIndex].teamId !== input.teamId)) || (input.relatedPlayerId && (relatedPlayerIndex < 0 || workspace.value.players[relatedPlayerIndex].teamId !== input.teamId)))
      return failure(new ValidationError('Football team or player was not found.', []));
    const draftIssue = (input.capturedElapsedMs !== undefined && (!Number.isFinite(input.capturedElapsedMs) || input.capturedElapsedMs < 0) ? 'Horário inválido.' : undefined) ?? validateFootballDraft(input) ?? validateFootballObservation(input.observation, workspace.value);
    if (draftIssue) return failure(new ValidationError(draftIssue, []));
    const requiresEnd = input.action === 'pass' || input.action === 'carry';
    const requiresLocation = !['loss', 'foul', 'substitution', 'shot'].includes(input.action);
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
      action: input.action, outcome: input.outcome, shotContext: input.shotContext, observation: { before: input.possessionTeamId ? { kind: 'controlled', teamId: input.possessionTeamId } : projectControl(workspace.value.football?.events ?? []).ballControl, ...input.observation, teamId: input.teamId, playerId: input.playerId, recipientId: input.relatedPlayerId },
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
    const draftIssue = (input.capturedElapsedMs !== undefined && (!Number.isFinite(input.capturedElapsedMs) || input.capturedElapsedMs < 0) ? 'Horário inválido.' : undefined) ?? validateFootballDraft(input) ?? validateFootballObservation(input.observation, workspace.value);
    if (draftIssue) return failure(new ValidationError(draftIssue, []));
    const target = workspace.value.football?.events.find((event) => event.id === targetEventId);
    if (!target) return failure(new ValidationError('Football event was not found.', []));
    const team = workspace.value.teams.find((candidate) => candidate.id === input.teamId);
    const player = input.playerId ? workspace.value.players.find((candidate) => candidate.id === input.playerId && candidate.teamId === input.teamId) : undefined;
    const relatedPlayer = input.relatedPlayerId ? workspace.value.players.find((candidate) => candidate.id === input.relatedPlayerId && candidate.teamId === input.teamId) : undefined;
    if (!team || (input.playerId && !player) || (input.relatedPlayerId && !relatedPlayer)) return failure(new ValidationError('Football team or player was not found.', []));
    const teamIndex = workspace.value.teams.findIndex((candidate) => candidate.id === team.id);
    const playerIndex = player ? workspace.value.players.findIndex((candidate) => candidate.id === player.id) : -1;
    const relatedPlayerIndex = relatedPlayer ? workspace.value.players.findIndex((candidate) => candidate.id === relatedPlayer.id) : -1;
    const possessionTeamIndex = input.possessionTeamId ? workspace.value.teams.findIndex((candidate) => candidate.id === input.possessionTeamId) : -1;
    const possessionTeam = possessionTeamIndex >= 0 ? { id: possessionTeamIndex + 1, name: workspace.value.teams[possessionTeamIndex].name } : undefined;
    const replacement = createCanonicalFootballEvent({ id: target.id, matchId, index: target.index, period: target.period, elapsedMs: input.capturedElapsedMs ?? timestampMs(target.timestamp), captureSequence: target.scout_trainer.capture_sequence, action: input.action, outcome: input.outcome, shotContext: input.shotContext, observation: { ...input.observation, teamId: input.teamId, playerId: input.playerId, recipientId: input.relatedPlayerId }, team: { id: teamIndex + 1, name: team.name }, ...(player ? { player: { id: footballNumericId(workspace.value.players[playerIndex].id), name: player.name ?? `Jogador ${player.number}` } } : {}), ...(relatedPlayer ? { relatedPlayer: { id: footballNumericId(workspace.value.players[relatedPlayerIndex].id), name: relatedPlayer.name ?? `Jogador ${relatedPlayer.number}` } } : {}), ...(input.location ? { location: normalizedToStatsBomb(input.location.x, input.location.y) } : {}), ...(input.endLocation ? { endLocation: normalizedToStatsBomb(input.endLocation.x, input.endLocation.y) } : {}), ...(possessionTeam ? { possession: target.possession ?? 1, possessionTeam } : {}) });
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
      changes.push({ ...identity(), type: 'set_lineup_confirmed', lineup: { ...lineup, positions } });
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
        ...(configurations ? { analysisConfigurations: configurations.value } : {}),
        ...(reportCharts ? { reportChartConfigurations: reportCharts.value } : {}),
        ...(options.includeDerivedAnalytics && workspace.value.sequenceAnalytics && workspace.value.profiles.codeProfile.tacticalInput?.zoneSystem
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
    const reportCharts = this.reportCharts
      ? await this.reportCharts.listByMatchId(matchId)
      : undefined;
    if (reportCharts && !reportCharts.ok) return failure(reportCharts.error);
    const derived = options.includeDerivedAnalytics && workspace.value.sequenceAnalytics && workspace.value.profiles.codeProfile.tacticalInput?.zoneSystem
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
      ...(configurations ? { analysisConfigurations: configurations.value } : {}),
      ...(reportCharts ? { reportChartConfigurations: reportCharts.value } : {}),
      ...(options.includeDerivedAnalytics && workspace.value.sequenceAnalytics && workspace.value.profiles.codeProfile.tacticalInput?.zoneSystem
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
        'estatisticas.csv': new StatisticsCsvExporter().export(workspace.value.report),
        'relatorio.pdf': new MatchPdfRenderer().render(workspace.value.report, reportCharts?.value,
          options.includeDerivedAnalytics && workspace.value.sequenceAnalytics && workspace.value.profiles.codeProfile.tacticalInput?.zoneSystem
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

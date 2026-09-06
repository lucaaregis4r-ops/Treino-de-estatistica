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
import { type MatchEvent } from '../domain/match/events/MatchEvent';
import { MatchEventFactory } from '../domain/match/events/MatchEventFactory';
import type { MatchState } from '../domain/match/state/MatchState';
import { JsonMatchExporter } from '../infrastructure/export/json/MatchJson';
import { JsonMatchImporter } from '../infrastructure/export/json/MatchJson';
import type { MatchBackupRepository } from './ports/backup/MatchBackupRepository';
import { CsvMatchExporter } from '../infrastructure/export/csv/MatchCsv';
import { TxtMatchExporter } from '../infrastructure/export/txt/MatchTxt';
import type { ProfileRegistry } from '../profiles/ProfileRegistry';
import { ProfileResolver, type ResolvedProfileContext } from '../profiles/ProfileResolver';
import type { ScoutEvent, ScoutEventMetadata } from '../domain/scout/events/ScoutEvent';
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
import type { MatchReportModel } from './reporting/MatchReportModel';
import { MatchPdfRenderer } from '../infrastructure/export/pdf/MatchPdfRenderer';
import { StatisticsCsvExporter } from '../infrastructure/export/csv/StatisticsCsvExporter';

export interface PlayerRegistrationInput {
  readonly number: number;
  readonly name?: string;
  readonly active?: boolean;
  readonly libero?: boolean;
  readonly registeredRole?: PlayerRole;
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
  readonly report: MatchReportModel;
}

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
  ) {
    this.resolver = new ProfileResolver(profileRegistry);
    this.openMatch = new OpenMatchUseCase(matches, events);
    this.matchEventFactory = new MatchEventFactory(dependencies);
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
      initialServingTeamId: input.initialServingTeam === 'teamB' ? teamB.id : teamA.id,
      scoringRules: input.scoringRules ?? DEFAULT_INDOOR_SCORING_RULES,
      codeProfileId: selectedCodeProfile.value.id,
      codeProfileVersion: selectedCodeProfile.value.version,
      complexityProfileId,
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
    const liberoPlayerIds = [
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
    ];
    const persistedMetadata: MatchMetadata =
      liberoPlayerIds.length > 0 ? { ...metadata, liberoPlayerIds } : metadata;
    const teamALineup = this.createLineup(teamA.id, 1, playerEntities, input.teamALineup);
    const teamBLineup = this.createLineup(teamB.id, 1, playerEntities, input.teamBLineup);
    if ((input.teamALineup && !teamALineup) || (input.teamBLineup && !teamBLineup)) {
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
      report,
    });
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
    return persisted.ok ? this.loadMatch(matchId) : failure(persisted.error);
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
    return persisted.ok ? this.loadMatch(matchId) : failure(persisted.error);
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
    return persisted.ok ? this.loadMatch(matchId) : failure(persisted.error);
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
    return persisted.ok ? this.loadMatch(matchId) : failure(persisted.error);
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
    return persisted.ok ? this.loadMatch(matchId) : failure(persisted.error);
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
    return persisted.ok ? this.loadMatch(matchId) : failure(persisted.error);
  }

  async exportJson(matchId: string): Promise<Result<string, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
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
      }),
    );
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

  async exportPdf(matchId: string): Promise<Result<string, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
    return success(new MatchPdfRenderer().render(workspace.value.report));
  }

  async exportBundle(matchId: string): Promise<Result<MatchExportBundle, ServiceError>> {
    const workspace = await this.loadMatch(matchId);
    if (!workspace.ok) return workspace;
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
        'relatorio.pdf': new MatchPdfRenderer().render(workspace.value.report),
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

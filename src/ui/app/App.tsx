import { withFootballOrientation } from '../../domain/football/FootballOrientation';
import { FootballAnalyticsPanel } from '../screens/summary/FootballAnalyticsPanel';
import { useEffect, useRef, useState } from 'react';
import {
  ScoutTrainerService,
  type CreateMatchInput,
  type MatchWorkspace,
} from '../../application/ScoutTrainerService';
import type { MatchMetadata } from '../../domain/match/entities/MatchMetadata';
import { HomeScreen } from '../screens/home/HomeScreen';
import { MatchesScreen } from '../screens/matches/MatchesScreen';
import { DEFAULT_MATCH_FILTERS, type MatchFilters } from '../screens/matches/MatchesScreen';
import { RegistrationsScreen } from '../screens/registrations/RegistrationsScreen';
import { NewMatchScreen } from '../screens/match-setup/NewMatchScreen';
import { ScoutScreen } from '../screens/scout/ScoutScreen';
import {
  FootballScoutScreen,
  type FootballScoutPresentation,
} from '../screens/scout/football/FootballScoutScreen';
import { BasketballScoutScreen } from '../screens/scout/BasketballScoutScreen';
import { BasketballAnalyticsScreen } from '../screens/summary/BasketballAnalyticsScreen';
import { FutsalScoutScreen } from '../screens/scout/FutsalScoutScreen';
import { EssentialScoutScreen } from '../screens/scout/EssentialScoutScreen';
import { resolveMatchSport, type MatchSport } from '../../domain/match/entities/MatchSport';
import { SummaryScreen } from '../screens/summary/SummaryScreen';
import type { ReportDraft } from '../../application/reporting/ReportDraft';
import { MatchAnalyticsPanel } from '../screens/summary/MatchAnalyticsPanel';
import { VolleyballReading } from '../screens/summary/VolleyballReading';
import { FutsalAnalyticsScreen } from '../screens/summary/FutsalAnalyticsScreen';
import { ObservedSequencePanel } from '../screens/summary/ObservedSequencePanel';
import type { SequenceContextModelResult } from '../../domain/analytics/observed-sequence/SequenceContextModel';
import { TrainingScreen } from '../screens/training/TrainingScreen';
import {
  browserAnalysisConfigurationRepository,
  browserReportChartConfigurationRepository,
  browserDirectoryExporter,
  browserFreeLogService,
  browserScoutTrainerService,
  browserTrainingService,
} from './createBrowserService';
import { TrainingService, type TrainingWorkspace } from '../../application/TrainingService';
import type { TrainingAttempt } from '../../domain/training/attempts/TrainingAttempt';
import type { TrainingSession } from '../../domain/training/entities/TrainingSession';
import {
  ProfileEditorService,
  type SerializedCodeProfileInput,
} from '../../application/profile-editor/ProfileEditorService';
import { browserProfileEditorService } from './createBrowserService';
import type { CodeProfile } from '../../profiles/types';
import { ProfileEditorScreen } from '../screens/profile-editor/ProfileEditorScreen';
import { FreeLogScreen } from '../screens/free-log/FreeLogScreen';
import { FreeLogService } from '../../application/FreeLogService';
import type { FreeLogSession } from '../../domain/free-log/FreeLogSession';
import type { DirectoryExportPort } from '../../application/ports/export/DirectoryExportPort';
import type { AnalysisConfiguration } from '../../domain/analytics/AnalysisConfiguration';
import type { AnalysisConfigurationRepository } from '../../application/ports/repositories/AnalysisConfigurationRepository';
import type { ReportChartConfiguration } from '../../domain/reporting/ReportChartConfiguration';
import type { ReportChartConfigurationRepository } from '../../application/ports/repositories/ReportChartConfigurationRepository';
import { ManualScreen } from '../screens/manual/ManualScreen';

type Screen =
  | 'matches'
  | 'registrations'
  | 'home'
  | 'new-match'
  | 'scout'
  | 'summary'
  | 'analysis'
  | 'training'
  | 'free-log'
  | 'profile-editor'
  | 'manual';

interface AppProps {
  readonly service?: ScoutTrainerService;
  readonly trainingService?: TrainingService;
  readonly profileEditorService?: ProfileEditorService;
  readonly freeLogService?: FreeLogService;
  readonly directoryExporter?: DirectoryExportPort;
  readonly analysisConfigurationRepository?: AnalysisConfigurationRepository;
  readonly reportChartConfigurationRepository?: ReportChartConfigurationRepository;
}

export function App({
  service = browserScoutTrainerService,
  trainingService = browserTrainingService,
  profileEditorService = browserProfileEditorService,
  freeLogService = browserFreeLogService,
  directoryExporter = browserDirectoryExporter,
  analysisConfigurationRepository = browserAnalysisConfigurationRepository,
  reportChartConfigurationRepository = browserReportChartConfigurationRepository,
}: AppProps) {
  const [volleyAnalysisView, setVolleyAnalysisView] = useState<'reading' | 'maps'>('reading');
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedSport, setSelectedSport] = useState<MatchSport>();
  const [showUnidentifiedMatches, setShowUnidentifiedMatches] = useState(false);
  const [matches, setMatches] = useState<readonly MatchMetadata[]>([]);
  const [matchFilters, setMatchFilters] = useState<MatchFilters>(DEFAULT_MATCH_FILTERS);
  const [workspace, setWorkspace] = useState<MatchWorkspace>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [trainingWorkspace, setTrainingWorkspace] = useState<TrainingWorkspace>();
  const [trainingFeedback, setTrainingFeedback] = useState<TrainingAttempt>();
  const [trainingSessions, setTrainingSessions] = useState<readonly TrainingSession[]>([]);
  const [codeProfiles, setCodeProfiles] = useState<readonly CodeProfile[]>(
    profileEditorService.list(),
  );
  const [freeLogSessions, setFreeLogSessions] = useState<readonly FreeLogSession[]>([]);
  const [freeLogSession, setFreeLogSession] = useState<FreeLogSession>();
  const [connectedDirectory, setConnectedDirectory] = useState<string>();
  const [manualReturnScreen, setManualReturnScreen] = useState<Screen>('home');
  const [registrationReturnScreen, setRegistrationReturnScreen] = useState<Screen>();
  const [newMatchDirty, setNewMatchDirty] = useState(false);
  const [footballPresentation, setFootballPresentation] =
    useState<FootballScoutPresentation>('minimal');
  const [advancedControlsOpen, setAdvancedControlsOpen] = useState(false);
  const advancedControlsRef = useRef<HTMLElement>(null);
  const [analysisConfigurations, setAnalysisConfigurations] = useState<readonly AnalysisConfiguration[]>([]);
  const [reportChartConfigurations, setReportChartConfigurations] = useState<readonly ReportChartConfiguration[]>([]);
  const [configurationMatchId, setConfigurationMatchId] = useState<string>();
  const [sequenceContextState, setSequenceContextState] = useState<{ readonly sport: 'volleyball' | 'football' | 'futsal'; readonly model?: SequenceContextModelResult; readonly loading: boolean; readonly error?: string }>();

  function openManual() {
    if (screen === 'manual') return;
    if (!leaveNewMatchDraft('manual')) return;
    setManualReturnScreen(screen === 'new-match' ? 'matches' : screen);
    setScreen('manual');
  }

  function openSportPicker() {
    if (!leaveNewMatchDraft('home')) return;
    setSelectedSport(undefined);
    setShowUnidentifiedMatches(false);
  }

  function selectSport(sport: MatchSport) {
    setSelectedSport(sport);
    setShowUnidentifiedMatches(false);
    setMatchFilters({ ...DEFAULT_MATCH_FILTERS, sport });
    setScreen('matches');
    void refreshMatches();
  }

  function openUnidentifiedMatches() {
    setSelectedSport(undefined);
    setShowUnidentifiedMatches(true);
    setMatchFilters({ ...DEFAULT_MATCH_FILTERS, sport: 'unknown' });
    setScreen('matches');
  }

  function openMatches() {
    if (!leaveNewMatchDraft('matches')) return;
    void refreshMatches();
  }

  function openRegistrations(returnScreen?: Screen) {
    if (!leaveNewMatchDraft('registrations')) return;
    setRegistrationReturnScreen(returnScreen);
  }

  function leaveNewMatchDraft(next: Screen): boolean {
    if (screen === 'new-match' && newMatchDirty && !window.confirm('Há um rascunho de partida não salvo. Descartar e sair?')) {
      return false;
    }
    if (screen === 'new-match') setNewMatchDirty(false);
    setScreen(next);
    return true;
  }

  async function refreshMatches() {
    const result = await service.listMatches();
    if (result.ok) setMatches(result.value);
    else setMessage(result.error.message);
  }

  useEffect(() => {
    let active = true;
    void service.listMatches().then((result) => {
      if (!active) return;
      if (result.ok) setMatches(result.value);
      else setMessage(result.error.message);
    });
    return () => {
      active = false;
    };
  }, [service]);

  useEffect(() => {
    let active = true;
    void profileEditorService.initialize().then((result) => {
      if (!active) return;
      if (result.ok) setCodeProfiles(result.value);
      else setMessage(result.error.message);
    });
    return () => {
      active = false;
    };
  }, [profileEditorService]);

  const activeConfigurationMatchId = workspace?.state.metadata.id;
  useEffect(() => {
    if (!activeConfigurationMatchId) return;
    let active = true;
    void Promise.all([
      analysisConfigurationRepository.listByMatchId(activeConfigurationMatchId),
      reportChartConfigurationRepository.listByMatchId(activeConfigurationMatchId),
    ]).then(([analysisResult, reportChartResult]) => {
      if (!active) return;
      if (analysisResult.ok) setAnalysisConfigurations(analysisResult.value);
      else setMessage(analysisResult.error.message);
      if (reportChartResult.ok) setReportChartConfigurations(reportChartResult.value);
      else setMessage(reportChartResult.error.message);
      setConfigurationMatchId(activeConfigurationMatchId);
    });
    return () => {
      active = false;
    };
  }, [analysisConfigurationRepository, reportChartConfigurationRepository, activeConfigurationMatchId]);

  const visibleAnalysisConfigurations = configurationMatchId === activeConfigurationMatchId ? analysisConfigurations : [];
  const visibleReportChartConfigurations = configurationMatchId === activeConfigurationMatchId ? reportChartConfigurations : [];

  async function saveAnalysisConfiguration(configuration: AnalysisConfiguration) {
    const result = await analysisConfigurationRepository.save(configuration);
    if (result.ok) {
      setAnalysisConfigurations((current) =>
        [...current.filter((item) => item.id !== configuration.id), configuration].sort(
          (left, right) => right.updatedAt - left.updatedAt,
        ),
      );
      setMessage(`Análise "${configuration.name}" salva.`);
    } else setMessage(result.error.message);
  }

  async function deleteAnalysisConfiguration(id: string) {
    const result = await analysisConfigurationRepository.delete(id);
    if (result.ok) setAnalysisConfigurations((current) => current.filter((item) => item.id !== id));
    else setMessage(result.error.message);
  }

  async function saveReportChartConfiguration(configuration: ReportChartConfiguration) {
    const result = await reportChartConfigurationRepository.save(configuration);
    if (result.ok) {
      setReportChartConfigurations((current) =>
        [...current.filter((item) => item.id !== configuration.id), configuration].sort(
          (left, right) => left.order - right.order,
        ),
      );
      setMessage(`Gráfico "${configuration.title}" adicionado ao relatório.`);
    } else setMessage(result.error.message);
  }

  async function deleteReportChartConfiguration(id: string) {
    const result = await reportChartConfigurationRepository.delete(id);
    if (result.ok) setReportChartConfigurations((current) => current.filter((item) => item.id !== id));
    else setMessage(result.error.message);
  }

  async function runWorkspaceAction(
    action: () => Promise<{ ok: boolean; value?: MatchWorkspace; error?: Error }>,
    options?: { readonly rejectOnFailure?: boolean; readonly successMessage?: string },
  ) {
    setBusy(true);
    setMessage(undefined);
    const result = await action();
    setBusy(false);
    if (result.ok && result.value) {
      setWorkspace(result.value);
      if (options?.successMessage) setMessage(options.successMessage);
    }
    else {
      const error = result.error ?? new Error('Não foi possível concluir a operação.');
      setMessage(error.message);
      if (options?.rejectOnFailure) throw error;
    }
  }

  async function createMatch(input: CreateMatchInput) {
    setBusy(true);
    setMessage(undefined);
    const result = await service.createMatch(input);
    setBusy(false);
    if (result.ok) {
      setWorkspace(result.value);
      setSelectedSport(input.sport ?? 'volleyball');
      setShowUnidentifiedMatches(false);
      setFootballPresentation('minimal');
      setAdvancedControlsOpen(false);
      setScreen('scout');
      window.scrollTo({ top: 0, behavior: 'auto' });
      await refreshMatches();
    } else setMessage(result.error.message);
  }

  async function openMatch(matchId: string, summary = false) {
    setBusy(true);
    const result = await service.loadMatch(matchId);
    setBusy(false);
    if (result.ok) {
      setWorkspace(result.value);
      setFootballPresentation('minimal');
      setAdvancedControlsOpen(false);
      const sport = resolveMatchSport(result.value.state.metadata);
      setSelectedSport(sport);
      setShowUnidentifiedMatches(sport === undefined);
      setScreen(summary && sport === 'volleyball' ? 'summary' : 'scout');
      window.scrollTo({ top: 0, behavior: 'auto' });
    } else setMessage(result.error.message);
  }

  async function importBackup(serialized: string) {
    setBusy(true);
    setMessage(undefined);
    const result = await service.importJson(serialized);
    setBusy(false);
    if (result.ok) {
      setWorkspace(result.value);
      setSelectedSport(resolveMatchSport(result.value.state.metadata));
      setShowUnidentifiedMatches(resolveMatchSport(result.value.state.metadata) === undefined);
      setAdvancedControlsOpen(false);
      setScreen('scout');
      await refreshMatches();
      setMessage('Backup restaurado e validado com sucesso.');
    } else setMessage(result.error.message);
  }

  async function exportMatch(format: 'json' | 'csv' | 'txt' | 'pdf' = 'json', reportDraft?: ReportDraft) {
    if (!workspace) return;
    const result = await (format === 'json'
      ? service.exportJson(workspace.state.metadata.id)
      : format === 'csv'
        ? service.exportCsv(workspace.state.metadata.id)
        : format === 'txt'
          ? service.exportTxt(workspace.state.metadata.id)
          : service.exportPdf(workspace.state.metadata.id, { reportDraft }));
    if (!result.ok) {
      setMessage(result.error.message);
      return;
    }
    const mime =
      format === 'json'
        ? 'application/json;charset=utf-8'
        : format === 'csv'
          ? 'text/csv;charset=utf-8'
          : format === 'pdf'
            ? 'application/pdf'
            : 'text/plain;charset=utf-8';
    const blob = new Blob([result.value], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${workspace.state.metadata.name.replace(/\W+/g, '-').toLowerCase()}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage(`Exportação ${format.toUpperCase()} preparada.`);
  }

  async function exportFootballOpenData() {
    if (!workspace) return;
    const result = await service.exportFootballOpenData(workspace.state.metadata.id);
    if (!result.ok) { setMessage(result.error.message); return; }
    const url = URL.createObjectURL(new Blob([result.value], { type: 'application/json;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${workspace.state.metadata.name.replace(/\W+/g, '-').toLowerCase()}-statsbomb.json`; anchor.click(); URL.revokeObjectURL(url);
    setMessage('Exportação StatsBomb preparada com manifesto de compatibilidade.');
  }

  async function connectExportDirectory() {
    const result = await directoryExporter.connect();
    if (result.ok) {
      setConnectedDirectory(result.value);
      setMessage(`Pasta ${result.value} conectada.`);
    } else setMessage(result.error.message);
  }

  async function exportMatchBundle(reportDraft?: ReportDraft) {
    if (!workspace) return;
    setBusy(true);
    setMessage(undefined);
    if (!directoryExporter.connectedDirectoryName) {
      const connected = await directoryExporter.connect();
      if (!connected.ok) {
        setBusy(false);
        setMessage(connected.error.message);
        return;
      }
      setConnectedDirectory(connected.value);
    }
    const bundle = await service.exportBundle(workspace.state.metadata.id, { reportDraft });
    if (!bundle.ok) {
      setBusy(false);
      setMessage(bundle.error.message);
      return;
    }
    const written = await directoryExporter.write(bundle.value);
    setBusy(false);
    setMessage(written.ok ? `Pacote salvo em ${written.value}.` : written.error.message);
  }

  function disconnectExportDirectory() {
    directoryExporter.disconnect();
    setConnectedDirectory(undefined);
    setMessage('Pasta desconectada.');
  }

  async function openFreeLog() {
    const result = await freeLogService.list();
    if (result.ok) setFreeLogSessions(result.value);
    else setMessage(result.error.message);
    setScreen('free-log');
  }

  async function startFreeLog(name: string) {
    const result = await freeLogService.start(name);
    if (result.ok) {
      setFreeLogSession(result.value);
      const sessions = await freeLogService.list();
      if (sessions.ok) setFreeLogSessions(sessions.value);
    } else setMessage(result.error.message);
  }

  async function openFreeLogSession(id: string) {
    const result = await freeLogService.load(id);
    if (result.ok) setFreeLogSession(result.value);
    else setMessage(result.error.message);
  }

  async function registerFreeLog(value: string) {
    if (!freeLogSession) return;
    const result = await freeLogService.register(freeLogSession.id, value);
    if (result.ok) setFreeLogSession(result.value);
    else setMessage(result.error.message);
  }

  function exportFreeLog(format: 'csv' | 'txt') {
    if (!freeLogSession) return;
    const contents =
      format === 'csv'
        ? freeLogService.exportCsv(freeLogSession)
        : freeLogService.exportTxt(freeLogSession);
    const blob = new Blob([contents], {
      type: `${format === 'csv' ? 'text/csv' : 'text/plain'};charset=utf-8`,
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${freeLogSession.name.replace(/\W+/g, '-').toLowerCase()}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function saveCodeProfile(input: SerializedCodeProfileInput) {
    setBusy(true);
    setMessage(undefined);
    const result = await profileEditorService.save(input);
    setBusy(false);
    if (result.ok) {
      setCodeProfiles(profileEditorService.list());
      setMessage(`Perfil ${result.value.name} salvo e ativado.`);
    } else setMessage(result.error.message);
  }

  function exportCodeProfile(profile: CodeProfile) {
    const blob = new Blob([JSON.stringify(profile, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${profile.id}-${profile.version}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function openTraining() {
    const result = await trainingService.listSessions();
    if (result.ok) setTrainingSessions(result.value);
    else setMessage(result.error.message);
    setScreen('training');
  }

  async function startTraining(profileId: string) {
    setBusy(true);
    setMessage(undefined);
    const result = await trainingService.startSession(profileId);
    setBusy(false);
    if (result.ok) {
      setTrainingWorkspace(result.value);
      setTrainingFeedback(undefined);
    } else setMessage(result.error.message);
  }

  async function resumeTraining(sessionId: string) {
    setBusy(true);
    const result = await trainingService.loadSession(sessionId);
    setBusy(false);
    if (result.ok) {
      setTrainingWorkspace(result.value);
      setTrainingFeedback(undefined);
    } else setMessage(result.error.message);
  }

  async function submitTraining(rawInput: string) {
    if (!trainingWorkspace) return;
    setBusy(true);
    const result = await trainingService.submit(trainingWorkspace.session.id, rawInput);
    setBusy(false);
    if (result.ok) {
      setTrainingWorkspace(result.value.workspace);
      setTrainingFeedback(result.value.attempt);
      if (result.value.workspace.session.status === 'completed') {
        const sessions = await trainingService.listSessions();
        if (sessions.ok) setTrainingSessions(sessions.value);
      }
    } else setMessage(result.error.message);
  }

  async function continueTraining() {
    if (!trainingWorkspace) return;
    const result = await trainingService.continueSession(trainingWorkspace.session.id);
    if (result.ok) {
      setTrainingWorkspace(result.value);
      setTrainingFeedback(undefined);
    } else setMessage(result.error.message);
  }

  const matchId = workspace?.state.metadata.id;
  const inMatchWorkspace = (screen === 'scout' || screen === 'summary' || screen === 'analysis') && Boolean(workspace);
  const matchTeamA = workspace?.teams[0];
  const matchTeamB = workspace?.teams[1];
  const workspaceSport = workspace ? resolveMatchSport(workspace.state.metadata) : undefined;
  const sequenceModelActive = (screen === 'summary' || screen === 'analysis') && Boolean(workspaceSport && workspaceSport !== 'basketball');
  const currentSequenceContextState = sequenceContextState?.sport === workspaceSport ? sequenceContextState : undefined;
  const sequenceContextModel = currentSequenceContextState?.model;
  const sequenceContextLoading = sequenceModelActive && (!currentSequenceContextState || currentSequenceContextState.loading);
  const sequenceContextError = currentSequenceContextState?.error;
  useEffect(() => {
    if ((screen !== 'summary' && screen !== 'analysis') || !workspaceSport || workspaceSport === 'basketball') return;
    let active = true;
    const sport = workspaceSport;
    void service.analyzeSequenceContextModel(sport).then(result => {
      if (!active) return;
      if (result.ok) setSequenceContextState({ sport, model: result.value, loading: false });
      else setSequenceContextState({ sport, loading: false, error: result.error.message });
    }).catch(error => {
      if (!active) return;
      setSequenceContextState({ sport, loading: false, error: error instanceof Error ? error.message : 'Falha inesperada ao avaliar o histórico da modalidade.' });
    });
    return () => { active = false; };
  }, [service, workspaceSport, screen]);
  const matchTeamASets = workspace
    ? workspace.state.sets.filter((set) => set.winnerTeamId === matchTeamA?.id).length
    : 0;
  const matchTeamBSets = workspace
    ? workspace.state.sets.filter((set) => set.winnerTeamId === matchTeamB?.id).length
    : 0;
  const selectedSportLabel = selectedSport === 'volleyball' ? 'Vôlei' : selectedSport === 'football' ? 'Futebol' : selectedSport === 'futsal' ? 'Futsal' : selectedSport === 'basketball' ? 'Basquete' : undefined;

  return (
    <div className="app-shell">
      {!inMatchWorkspace && <header className="app-nav">
        <button className="brand" type="button" onClick={openSportPicker}>
          <span>ST</span> Scout Trainer
        </button>
        <nav aria-label="Navegação principal">
          <button
            type="button"
            aria-current={screen === 'home' ? 'page' : undefined}
            onClick={openSportPicker}
          >
            Modalidades
          </button>
          {(selectedSport || showUnidentifiedMatches) && <button
            type="button"
            aria-current={screen === 'matches' ? 'page' : undefined}
            onClick={openMatches}
          >
            {selectedSportLabel ? `Partidas · ${selectedSportLabel}` : 'Partidas sem modalidade'}
          </button>}
          {selectedSport && <button
            type="button"
            aria-current={
              screen === 'registrations' || screen === 'profile-editor' ? 'page' : undefined
            }
            onClick={() => openRegistrations()}
          >
            Equipes e atletas
          </button>}
          {selectedSport === 'volleyball' && <button
            type="button"
            aria-current={screen === 'training' ? 'page' : undefined}
            onClick={() => void openTraining()}
          >
            Treino
          </button>}
          {selectedSport && <button
            type="button"
            aria-current={screen === 'manual' ? 'page' : undefined}
            onClick={openManual}
          >
            Manual de {selectedSportLabel}
          </button>}
        </nav>
      </header>}

      {inMatchWorkspace && workspace && (
        <header className="match-workspace-nav" aria-label="Navegação da partida">
          <button className="button ghost" type="button" onClick={openMatches}>
            ← Partidas
          </button>
          <div className="match-workspace-title" aria-label="Placar da partida">
            <strong>{workspace.state.metadata.name}</strong>
            <span className="match-workspace-teams">
              {matchTeamA?.name} × {matchTeamB?.name}
            </span>
            <span className="match-workspace-score">
              <><b>{workspaceSport === 'football' ? workspace.football?.score.teamA ?? 0 : workspaceSport === 'futsal' ? workspace.futsalScout?.score[workspace.teams[0].id] ?? 0 : workspaceSport === 'basketball' ? workspace.basketball?.score[workspace.teams[0].id] ?? 0 : workspace.state.score.teamA}</b><i>×</i><b>{workspaceSport === 'football' ? workspace.football?.score.teamB ?? 0 : workspaceSport === 'futsal' ? workspace.futsalScout?.score[workspace.teams[1].id] ?? 0 : workspaceSport === 'basketball' ? workspace.basketball?.score[workspace.teams[1].id] ?? 0 : workspace.state.score.teamB}</b></>
              {workspaceSport === 'volleyball' && <small>
                VÔLEI · SET {workspace.state.currentSet} · Sets {matchTeamASets} : {matchTeamBSets}
              </small>}
              {workspaceSport === 'football' && <small>Futebol · {workspace.football?.clock.period ?? 1}º período</small>}
              {workspaceSport === 'futsal' && <small>Futsal · {workspace.futsalClock?.period ?? 1}º período</small>}
              {workspaceSport === 'basketball' && <small>Basquete</small>}
              {workspaceSport === undefined && <small>Modalidade precisa ser identificada</small>}
            </span>
          </div>
          <nav className="match-workspace-tabs" aria-label="Seções da partida">
            <button type="button" aria-current={screen === 'scout' ? 'page' : undefined} onClick={() => setScreen('scout')}>Registro</button>
            {workspaceSport && <button type="button" aria-current={screen === 'summary' ? 'page' : undefined} onClick={() => setScreen('summary')}>Resumo</button>}
            {workspaceSport && <button type="button" aria-current={screen === 'analysis' ? 'page' : undefined} onClick={() => setScreen('analysis')}>Análise</button>}
            <details className="match-workspace-more">
              <summary>Mais</summary>
              <div>
                <button type="button" onClick={() => openRegistrations('scout')}>
                  Equipes e atletas
                </button>
                {workspaceSport && <button type="button" onClick={openManual}>Manual da modalidade</button>}
                <button type="button" onClick={() => void exportMatch('json')}>Exportar JSON</button>
                {workspaceSport === 'futsal' && <><button type="button" onClick={() => void exportMatch('csv')}>Exportar análise CSV</button><button type="button" onClick={() => void exportMatch('pdf')}>Exportar relatório PDF</button></>}
                {workspaceSport === 'football' && (
                  <button
                    type="button"
                    onClick={() => {
                      setFootballPresentation('review');
                      setAdvancedControlsOpen(true);
                      setScreen('scout');
                    }}
                  >
                    Revisar sugestões
                  </button>
                )}
              </div>
            </details>
          </nav>
        </header>
      )}

      {message && (
        <div className="app-message" role="status">
          {message}
          <button type="button" onClick={() => setMessage(undefined)}>
            ×
          </button>
        </div>
      )}

      {screen === 'home' && (
        <HomeScreen
          matches={matches}
          busy={busy}
          onSelectSport={selectSport}
          onUnidentifiedMatches={openUnidentifiedMatches}
          onImportBackup={importBackup}
        />
      )}
      {screen === 'matches' && (
        <MatchesScreen
          matches={matches}
          busy={busy}
          onNewMatch={selectedSport ? () => { setNewMatchDirty(false); setScreen('new-match'); } : undefined}
          onOpenMatch={openMatch}
          filters={matchFilters}
          onFiltersChange={setMatchFilters}
          selectedSport={selectedSport}
          unidentifiedOnly={showUnidentifiedMatches}
        />
      )}
      {screen === 'registrations' && (
        <RegistrationsScreen
          onProfiles={() => setScreen('profile-editor')}
          onReturnToMatch={
            registrationReturnScreen
              ? () => {
                  setScreen(registrationReturnScreen);
                  setRegistrationReturnScreen(undefined);
                }
              : undefined
          }
        />
      )}
      {screen === 'new-match' && (
        <NewMatchScreen
          busy={busy}
          codeProfiles={codeProfiles}
          onCancel={() => leaveNewMatchDraft('matches')}
          onCreate={createMatch}
          onDraftChange={setNewMatchDirty}
          initialSport={selectedSport}
        />
      )}
      {screen === 'scout' && workspace && workspaceSport === 'basketball' && <BasketballScoutScreen workspace={workspace} busy={busy} onRegister={(period, draft) => runWorkspaceAction(() => service.registerBasketballFact(workspace.state.metadata.id, period, draft), { rejectOnFailure: true })} onCorrect={(id, draft) => runWorkspaceAction(() => service.correctBasketballFact(workspace.state.metadata.id, id, draft), { rejectOnFailure: true })} onUndo={() => runWorkspaceAction(() => service.undoBasketballFact(workspace.state.metadata.id), { rejectOnFailure: true })} />}
      {screen === 'scout' && workspace && (workspaceSport === 'football' || workspaceSport === 'futsal') && (
        <div hidden={advancedControlsOpen}><EssentialScoutScreen
          workspace={workspace}
          busy={busy}
          shortcutsEnabled={!advancedControlsOpen}
          onOpenAdvanced={() => {
            setAdvancedControlsOpen(true);
            window.requestAnimationFrame(() => advancedControlsRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }));
          }}
          onRegister={(draft) => runWorkspaceAction(() => service.registerEssentialAction(workspace.state.metadata.id, draft), { rejectOnFailure: true })}
          onCorrect={(id, draft) => runWorkspaceAction(() => service.correctEssentialAction(workspace.state.metadata.id, id, draft), { rejectOnFailure: true })}
          onDelete={(id) => runWorkspaceAction(() => service.deleteEssentialAction(workspace.state.metadata.id, id), { rejectOnFailure: true })}
          onSetOrientation={(direction) => runWorkspaceAction(async () => {
            const matchId = workspace.state.metadata.id;
            const period = workspaceSport === 'futsal' ? workspace.futsalClock?.period ?? 1 : workspace.football?.clock.period ?? 1;
            const opposite = direction === 'x120' ? 'x0' : 'x120';
            const first = workspaceSport === 'futsal'
              ? await service.setFutsalOrientation(matchId, period, workspace.teams[0].id, direction)
              : await service.setFootballOrientation(matchId, period, workspace.teams[0].id, direction);
            if (!first.ok) return first;
            return workspaceSport === 'futsal'
              ? service.setFutsalOrientation(matchId, period, workspace.teams[1].id, opposite)
              : service.setFootballOrientation(matchId, period, workspace.teams[1].id, opposite);
          }, { rejectOnFailure: true })}
          onClockToggle={() => workspaceSport === 'football'
            ? runWorkspaceAction(() => service.setFootballClock(workspace.state.metadata.id, { kind: workspace.football?.clock.running ? 'pause' : 'start' }), { rejectOnFailure: true })
            : runWorkspaceAction(() => service.setFutsalClock(workspace.state.metadata.id, { kind: workspace.futsalClock?.status === 'running' ? 'pause' : 'start' }), { rejectOnFailure: true })}
        /></div>
      )}
      {screen === 'scout' && workspace && (workspaceSport === 'football' || workspaceSport === 'futsal') && (
        <section
          ref={advancedControlsRef}
          className="advanced-recording-panel page-section"
          hidden={!advancedControlsOpen}
        >
          <header className="advanced-recording-heading"><h2>Ajustes da partida</h2><button type="button" className="button secondary" onClick={() => setAdvancedControlsOpen(false)}>← Voltar à quadra</button></header>
          <p>Configurações e registros detalhados da partida, quando precisar deles.</p>
          {advancedControlsOpen && workspaceSport === 'football' && (
        <FootballScoutScreen
          workspace={workspace}
          busy={busy}
          onOrientation={(period, teamId, direction) => runWorkspaceAction(() => service.setFootballOrientation(workspace.state.metadata.id, period, teamId, direction), { rejectOnFailure: true })}
          onObserve={(observation) => runWorkspaceAction(() => service.observeFootballControl(workspace.state.metadata.id, observation), { rejectOnFailure: true })}
          onRegister={(input) => runWorkspaceAction(() => service.registerFootballEvent(workspace.state.metadata.id, input), { rejectOnFailure: true, successMessage: 'Evento de futebol registrado.' })}
          onCorrect={(eventId, input) => runWorkspaceAction(() => service.correctFootballEvent(workspace.state.metadata.id, eventId, input), { rejectOnFailure: true, successMessage: 'Evento de futebol corrigido.' })}
          onUndo={() => runWorkspaceAction(() => service.undoFootballEvent(workspace.state.metadata.id), { rejectOnFailure: true, successMessage: 'Último evento de futebol desfeito.' })}
          onSaveAssisted={(eventId, input, options) => runWorkspaceAction(() => service.saveFootballAssistedRecording(workspace.state.metadata.id, eventId, input), { rejectOnFailure: true, ...(options?.silent ? {} : { successMessage: 'Detalhe opcional registrado.' }) })}
          onClock={(change) => runWorkspaceAction(() => service.setFootballClock(workspace.state.metadata.id, change), { rejectOnFailure: true })}
          onScoreAdjust={(teamId, delta) => runWorkspaceAction(() => service.adjustFootballScore(workspace.state.metadata.id, teamId, delta), { rejectOnFailure: true, successMessage: 'Ajuste manual de placar registrado.' })}
          onExportBackup={() => void exportMatch('json')}
          onExportStatsBomb={() => void exportFootballOpenData()}
          presentation={footballPresentation}
          onPresentationChange={setFootballPresentation}
        />
          )}
          {advancedControlsOpen && workspaceSport === 'futsal' && matchId && <FutsalScoutScreen workspace={workspace} busy={busy} onOrientation={(period, teamId, direction) => runWorkspaceAction(() => service.setFutsalOrientation(matchId, period, teamId, direction), { rejectOnFailure: true })} onClock={(change) => runWorkspaceAction(() => service.setFutsalClock(matchId, change), { rejectOnFailure: true })} onFact={(draft, capturedElapsedMs) => runWorkspaceAction(() => service.registerFutsalFact(matchId, draft, capturedElapsedMs), { rejectOnFailure: true })} onCorrectFact={(factId, draft) => runWorkspaceAction(() => service.correctFutsalFact(matchId, factId, draft), { rejectOnFailure: true })} onUndoFact={(factId) => runWorkspaceAction(() => service.undoFutsalFact(matchId, factId), { rejectOnFailure: true })} />}
        </section>
      )}
      {screen === 'scout' && workspace && workspaceSport === undefined && (
        <section className="page-section" aria-labelledby="recover-sport-title">
          <h1 id="recover-sport-title">Identifique a modalidade desta partida</h1>
          <p>Os dados antigos não contêm evidência suficiente para escolher Futebol ou Vôlei com segurança. Nenhum dado foi convertido ou apagado.</p>
        </section>
      )}
      {screen === 'scout' && workspace && workspaceSport === 'volleyball' && matchId && (
        <ScoutScreen
          workspace={workspace}
          busy={busy}
          onRegister={(teamId, rawCode, metadata) =>
            runWorkspaceAction(() => service.registerScout(matchId, teamId, rawCode, metadata), {
              rejectOnFailure: true,
              successMessage: 'Ação registrada.',
            })
          }
          onRegisterVisual={(draft) =>
            runWorkspaceAction(() => service.registerVisualScout(matchId, draft), {
              rejectOnFailure: true,
              successMessage: 'Ação registrada.',
            })
          }
          onRegisterHybrid={(teamId, rawCode, draft) =>
            runWorkspaceAction(() => service.registerHybridScout(matchId, teamId, rawCode, draft), {
              rejectOnFailure: true,
              successMessage: 'Ação registrada.',
            })
          }
          onRegisterFault={(input) =>
            runWorkspaceAction(() => service.registerFault(matchId, input), {
              rejectOnFailure: true,
              successMessage: 'Infração registrada.',
            })
          }
          onCorrect={(sourceId, rawCode, metadata) =>
            runWorkspaceAction(() => service.correctScout(matchId, sourceId, rawCode, metadata), {
              rejectOnFailure: true,
              successMessage: 'Ação corrigida.',
            })
          }
          onUndo={() => runWorkspaceAction(() => service.undo(matchId), { successMessage: 'Última ação desfeita.' })}
          onRedo={() => runWorkspaceAction(() => service.redo(matchId), { successMessage: 'Ação refeita.' })}
          onScoreAdjust={(teamId, delta) =>
            runWorkspaceAction(() => service.adjustScore(matchId, teamId, delta), {
              rejectOnFailure: true,
              successMessage: 'Placar ajustado.',
            })
          }
          onAdjustContext={(input) => runWorkspaceAction(() => service.adjustMatchContext(matchId, input), {
            rejectOnFailure: true, successMessage: 'Rotação, saque e placar ajustados.',
          })}
          onSubstitute={(teamId, slotId, playerInId) =>
            runWorkspaceAction(() => service.substitute(matchId, teamId, slotId, playerInId), {
              rejectOnFailure: true,
              successMessage: 'Troca aplicada.',
            })
          }
          onNextSet={(input) => runWorkspaceAction(() => service.startNextSet(matchId, input))}
          onSwapCourtSides={() => runWorkspaceAction(() => service.swapVolleyballCourtSides(matchId), {
            rejectOnFailure: true,
            successMessage: 'Lados da quadra trocados.',
          })}
          onExport={() => exportMatch('json')}
        />
      )}
      {(screen === 'summary' || screen === 'analysis') && workspace && workspaceSport === 'football' && <main className="page-section football-analysis"><ObservedSequencePanel projection={workspace.observedSequences} teams={workspace.teams} history={workspace.events} sportHint="football" contextModel={sequenceContextModel} modelLoading={sequenceContextLoading} modelError={sequenceContextError} /><FootballAnalyticsPanel events={withFootballOrientation(workspace.football?.events ?? [], workspace.state.metadata)} summary={screen === 'summary'} teams={workspace.teams} players={workspace.players} /></main>}
      {(screen === 'summary' || screen === 'analysis') && workspace && workspaceSport === 'basketball' && <BasketballAnalyticsScreen workspace={workspace} />}
      {(screen === 'summary' || screen === 'analysis') && workspace && workspaceSport === 'futsal' && <FutsalAnalyticsScreen workspace={workspace} contextModel={sequenceContextModel} modelLoading={sequenceContextLoading} modelError={sequenceContextError} onExport={(format) => void exportMatch(format)} />}
      {screen === 'analysis' && workspace && workspaceSport === 'volleyball' && <main className="page-section analysis-page">
        <nav className="court-workbench-nav analysis-destinations" aria-label="Visualização da análise">
          <button type="button" aria-pressed={volleyAnalysisView === 'reading'} onClick={() => setVolleyAnalysisView('reading')}>Leitura da partida</button>
          <button type="button" aria-pressed={volleyAnalysisView === 'maps'} onClick={() => setVolleyAnalysisView('maps')}>Mapas e sequências</button>
        </nav>
        {volleyAnalysisView === 'reading' && <VolleyballReading workspace={workspace} />}
        {volleyAnalysisView === 'maps' && <section className="volleyball-analysis-advanced">
          <p className="summary-note">Dados completos da partida; os filtros da leitura acima se aplicam apenas ao painel principal.</p>
          <ObservedSequencePanel projection={workspace.observedSequences} teams={workspace.teams} history={workspace.events} sportHint="volleyball" contextModel={sequenceContextModel} modelLoading={sequenceContextLoading} modelError={sequenceContextError} />
          <MatchAnalyticsPanel key={workspace.state.metadata.id} report={workspace.report} sequenceAnalytics={workspace.sequenceAnalytics} matchId={workspace.state.metadata.id} analysisConfigurations={visibleAnalysisConfigurations} onSaveAnalysisConfiguration={saveAnalysisConfiguration} onDeleteAnalysisConfiguration={deleteAnalysisConfiguration} reportChartConfigurations={visibleReportChartConfigurations} onSaveReportChartConfiguration={saveReportChartConfiguration} onDeleteReportChartConfiguration={deleteReportChartConfiguration}/>
        </section>}
      </main>}
      {screen === 'summary' && workspace && workspaceSport === 'volleyball' && (
        <SummaryScreen
          key={workspace.state.metadata.id}
          reportCharts={visibleReportChartConfigurations}
          workspace={workspace}
          onBack={() => setScreen('scout')}
          onAnalysis={() => setScreen('analysis')}
          onHome={() => setScreen('matches')}
          onExport={exportMatch}
          directoryExportSupported={directoryExporter.supported}
          connectedDirectory={connectedDirectory}
          busy={busy}
          onConnectDirectory={connectExportDirectory}
          onDisconnectDirectory={disconnectExportDirectory}
          onExportBundle={exportMatchBundle}
        />
      )}
      {screen === 'training' && (
        <>
          <div className="hero-actions">
            <button className="button secondary" onClick={() => void openFreeLog()}>
              Registro livre
            </button>
          </div>
          <TrainingScreen
            profiles={trainingService.listProfiles()}
            sessions={trainingSessions}
            workspace={trainingWorkspace}
            feedback={trainingFeedback}
            busy={busy}
            onBack={openSportPicker}
            onStart={startTraining}
            onResume={resumeTraining}
            onSubmit={submitTraining}
            onContinue={continueTraining}
            onReset={() => {
              setTrainingWorkspace(undefined);
              setTrainingFeedback(undefined);
            }}
            onManual={openManual}
          />
        </>
      )}
      {screen === 'profile-editor' && (
        <ProfileEditorScreen
          profiles={codeProfiles}
          busy={busy}
          onBack={() => setScreen('registrations')}
          onSave={saveCodeProfile}
          onExport={exportCodeProfile}
        />
      )}
      {screen === 'manual' && <ManualScreen sport={selectedSport ?? workspaceSport} onBack={() => setScreen(manualReturnScreen)} />}
      {screen === 'free-log' && (
        <FreeLogScreen
          sessions={freeLogSessions}
          session={freeLogSession}
          busy={busy}
          onBack={openSportPicker}
          onStart={startFreeLog}
          onOpen={openFreeLogSession}
          onRegister={registerFreeLog}
          onExport={exportFreeLog}
          onCloseSession={() => setFreeLogSession(undefined)}
        />
      )}
    </div>
  );
}

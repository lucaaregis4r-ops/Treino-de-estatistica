import { useEffect, useState } from 'react';
import {
  ScoutTrainerService,
  type CreateMatchInput,
  type MatchWorkspace,
} from '../../application/ScoutTrainerService';
import type { MatchMetadata } from '../../domain/match/entities/MatchMetadata';
import { HomeScreen } from '../screens/home/HomeScreen';
import { MatchesScreen } from '../screens/matches/MatchesScreen';
import { RegistrationsScreen } from '../screens/registrations/RegistrationsScreen';
import { NewMatchScreen } from '../screens/match-setup/NewMatchScreen';
import { ScoutScreen } from '../screens/scout/ScoutScreen';
import { SummaryScreen } from '../screens/summary/SummaryScreen';
import { MatchAnalyticsPanel } from '../screens/summary/MatchAnalyticsPanel';
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
  const [screen, setScreen] = useState<Screen>('home');
  const [matches, setMatches] = useState<readonly MatchMetadata[]>([]);
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
  const [analysisConfigurations, setAnalysisConfigurations] = useState<readonly AnalysisConfiguration[]>([]);
  const [reportChartConfigurations, setReportChartConfigurations] = useState<readonly ReportChartConfiguration[]>([]);

  function openManual() {
    setManualReturnScreen(screen === 'scout' || screen === 'summary' ? screen : 'home');
    setScreen('manual');
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

  useEffect(() => {
    if (!workspace) {
      setAnalysisConfigurations([]);
      setReportChartConfigurations([]);
      return;
    }
    let active = true;
    void Promise.all([
      analysisConfigurationRepository.listByMatchId(workspace.state.metadata.id),
      reportChartConfigurationRepository.listByMatchId(workspace.state.metadata.id),
    ]).then(([analysisResult, reportChartResult]) => {
      if (!active) return;
      if (analysisResult.ok) setAnalysisConfigurations(analysisResult.value);
      else setMessage(analysisResult.error.message);
      if (reportChartResult.ok) setReportChartConfigurations(reportChartResult.value);
      else setMessage(reportChartResult.error.message);
    });
    return () => {
      active = false;
    };
  }, [analysisConfigurationRepository, reportChartConfigurationRepository, workspace?.state.metadata.id]);

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
      setScreen('scout');
      await refreshMatches();
    } else setMessage(result.error.message);
  }

  async function openMatch(matchId: string, summary = false) {
    setBusy(true);
    const result = await service.loadMatch(matchId);
    setBusy(false);
    if (result.ok) {
      setWorkspace(result.value);
      setScreen(summary ? 'summary' : 'scout');
    } else setMessage(result.error.message);
  }

  async function importBackup(serialized: string) {
    setBusy(true);
    setMessage(undefined);
    const result = await service.importJson(serialized);
    setBusy(false);
    if (result.ok) {
      setWorkspace(result.value);
      setScreen('scout');
      await refreshMatches();
      setMessage('Backup restaurado e validado com sucesso.');
    } else setMessage(result.error.message);
  }

  async function exportMatch(format: 'json' | 'csv' | 'txt' | 'pdf' = 'json') {
    if (!workspace) return;
    const result = await (format === 'json'
      ? service.exportJson(workspace.state.metadata.id)
      : format === 'csv'
        ? service.exportCsv(workspace.state.metadata.id)
        : format === 'txt'
          ? service.exportTxt(workspace.state.metadata.id)
          : service.exportPdf(workspace.state.metadata.id));
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

  async function connectExportDirectory() {
    const result = await directoryExporter.connect();
    if (result.ok) {
      setConnectedDirectory(result.value);
      setMessage(`Pasta ${result.value} conectada.`);
    } else setMessage(result.error.message);
  }

  async function exportMatchBundle() {
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
    const bundle = await service.exportBundle(workspace.state.metadata.id);
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
  const matchTeamASets = workspace
    ? workspace.state.sets.filter((set) => set.winnerTeamId === matchTeamA?.id).length
    : 0;
  const matchTeamBSets = workspace
    ? workspace.state.sets.filter((set) => set.winnerTeamId === matchTeamB?.id).length
    : 0;

  return (
    <div className="app-shell">
      {!inMatchWorkspace && <header className="app-nav">
        <button className="brand" type="button" onClick={() => setScreen('home')}>
          <span>ST</span> Scout Trainer
        </button>
        <nav aria-label="Navegação principal">
          <button
            type="button"
            aria-current={screen === 'home' ? 'page' : undefined}
            onClick={() => setScreen('home')}
          >
            Início
          </button>
          <button
            type="button"
            aria-current={screen === 'matches' ? 'page' : undefined}
            onClick={() => {
              void refreshMatches();
              setScreen('matches');
            }}
          >
            Partidas
          </button>
          <button
            type="button"
            aria-current={
              screen === 'registrations' || screen === 'profile-editor' ? 'page' : undefined
            }
            onClick={() => setScreen('registrations')}
          >
            Cadastros
          </button>
          <button type="button" onClick={() => void openTraining()}>
            Treino
          </button>
          <button type="button" onClick={openManual}>
            Manual
          </button>
        </nav>
      </header>}

      {inMatchWorkspace && workspace && (
        <header className="match-workspace-nav" aria-label="Navegação da partida">
          <button className="button ghost" type="button" onClick={() => setScreen('matches')}>
            ← Partidas
          </button>
          <div className="match-workspace-title" aria-label="Placar da partida">
            <strong>{workspace.state.metadata.name}</strong>
            <span className="match-workspace-teams">
              {matchTeamA?.name} × {matchTeamB?.name}
            </span>
            <span className="match-workspace-score">
              <b>{workspace.state.score.teamA}</b>
              <i>×</i>
              <b>{workspace.state.score.teamB}</b>
              <small>
                SET {workspace.state.currentSet} · Sets {matchTeamASets} : {matchTeamBSets}
              </small>
            </span>
          </div>
          <nav className="match-workspace-tabs" aria-label="Seções da partida">
            <button type="button" aria-current={screen === 'scout' ? 'page' : undefined} onClick={() => setScreen('scout')}>Registro</button>
            <button type="button" aria-current={screen === 'summary' ? 'page' : undefined} onClick={() => setScreen('summary')}>Resumo</button>
            <button type="button" aria-current={screen === 'analysis' ? 'page' : undefined} onClick={() => setScreen('analysis')}>Análise</button>
            <button type="button" onClick={openManual}>Manual</button>
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
          onNewMatch={() => setScreen('new-match')}
          onTraining={() => void openTraining()}
          onAllMatches={() => {
            void refreshMatches();
            setScreen('matches');
          }}
          onOpenMatch={openMatch}
          onImportBackup={importBackup}
        />
      )}
      {screen === 'matches' && (
        <MatchesScreen
          matches={matches}
          busy={busy}
          onNewMatch={() => setScreen('new-match')}
          onOpenMatch={openMatch}
        />
      )}
      {screen === 'registrations' && (
        <RegistrationsScreen onProfiles={() => setScreen('profile-editor')} />
      )}
      {screen === 'new-match' && (
        <NewMatchScreen
          busy={busy}
          codeProfiles={codeProfiles}
          onCancel={() => setScreen('home')}
          onCreate={createMatch}
        />
      )}
      {screen === 'scout' && workspace && matchId && (
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
          onExport={() => exportMatch('json')}
        />
      )}
      {screen === 'analysis' && workspace && <main className="page-section analysis-page"><MatchAnalyticsPanel key={workspace.state.metadata.id} report={workspace.report} matchId={workspace.state.metadata.id} analysisConfigurations={analysisConfigurations} onSaveAnalysisConfiguration={saveAnalysisConfiguration} onDeleteAnalysisConfiguration={deleteAnalysisConfiguration} reportChartConfigurations={reportChartConfigurations} onSaveReportChartConfiguration={saveReportChartConfiguration} onDeleteReportChartConfiguration={deleteReportChartConfiguration}/></main>}
      {screen === 'summary' && workspace && (
        <SummaryScreen
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
            onBack={() => setScreen('home')}
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
      {screen === 'manual' && <ManualScreen onBack={() => setScreen(manualReturnScreen)} />}
      {screen === 'free-log' && (
        <FreeLogScreen
          sessions={freeLogSessions}
          session={freeLogSession}
          busy={busy}
          onBack={() => setScreen('home')}
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

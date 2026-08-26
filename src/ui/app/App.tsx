import { useEffect, useState } from 'react';
import {
  ScoutTrainerService,
  type CreateMatchInput,
  type MatchWorkspace,
} from '../../application/ScoutTrainerService';
import type { MatchMetadata } from '../../domain/match/entities/MatchMetadata';
import { HomeScreen } from '../screens/home/HomeScreen';
import { NewMatchScreen } from '../screens/match-setup/NewMatchScreen';
import { ScoutScreen } from '../screens/scout/ScoutScreen';
import { SummaryScreen } from '../screens/summary/SummaryScreen';
import { TrainingScreen } from '../screens/training/TrainingScreen';
import {
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
import { ManualScreen } from '../screens/manual/ManualScreen';

type Screen =
  | 'home'
  | 'new-match'
  | 'scout'
  | 'summary'
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
}

export function App({
  service = browserScoutTrainerService,
  trainingService = browserTrainingService,
  profileEditorService = browserProfileEditorService,
  freeLogService = browserFreeLogService,
  directoryExporter = browserDirectoryExporter,
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

  async function runWorkspaceAction(
    action: () => Promise<{ ok: boolean; value?: MatchWorkspace; error?: Error }>,
  ) {
    setBusy(true);
    setMessage(undefined);
    const result = await action();
    setBusy(false);
    if (result.ok && result.value) setWorkspace(result.value);
    else setMessage(result.error?.message ?? 'Não foi possível concluir a operação.');
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

  async function openMatch(matchId: string) {
    setBusy(true);
    const result = await service.loadMatch(matchId);
    setBusy(false);
    if (result.ok) {
      setWorkspace(result.value);
      setScreen('scout');
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

  return (
    <div className="app-shell">
      <header className="app-nav">
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
          <button type="button" onClick={() => setScreen('new-match')}>
            Nova partida
          </button>
          <button type="button" onClick={() => void openTraining()}>
            Treino
          </button>
          <button type="button" onClick={() => void openFreeLog()}>
            Livre
          </button>
          <button type="button" onClick={() => setScreen('profile-editor')}>
            Perfis
          </button>
          <button type="button" onClick={openManual}>
            Manual
          </button>
          {workspace && (
            <button type="button" onClick={() => setScreen('scout')}>
              Scout
            </button>
          )}
          {workspace && (
            <button type="button" onClick={() => setScreen('summary')}>
              Resumo
            </button>
          )}
        </nav>
      </header>

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
          onOpenMatch={openMatch}
          onImportBackup={importBackup}
        />
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
          onBack={() => setScreen('home')}
          onSummary={() => setScreen('summary')}
          onRegister={(teamId, rawCode, metadata) =>
            runWorkspaceAction(() => service.registerScout(matchId, teamId, rawCode, metadata))
          }
          onCorrect={(sourceId, rawCode, metadata) =>
            runWorkspaceAction(() => service.correctScout(matchId, sourceId, rawCode, metadata))
          }
          onUndo={() => runWorkspaceAction(() => service.undo(matchId))}
          onRedo={() => runWorkspaceAction(() => service.redo(matchId))}
          onPoint={(teamId) => runWorkspaceAction(() => service.awardPoint(matchId, teamId))}
          onSubstitute={(teamId, slotId, playerInId) =>
            runWorkspaceAction(() => service.substitute(matchId, teamId, slotId, playerInId))
          }
          onNextSet={(input) => runWorkspaceAction(() => service.startNextSet(matchId, input))}
          onExport={() => exportMatch('json')}
        />
      )}
      {screen === 'summary' && workspace && (
        <SummaryScreen
          workspace={workspace}
          onBack={() => setScreen('scout')}
          onHome={() => setScreen('home')}
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
      )}
      {screen === 'profile-editor' && (
        <ProfileEditorScreen
          profiles={codeProfiles}
          busy={busy}
          onBack={() => setScreen('home')}
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

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { MatchWorkspace } from '../../../application/ScoutTrainerService';
import {
  ContinuousInputController,
  type ContinuousInputUpdate,
} from '../../../application/input/ContinuousInputController';
import type { ReceptionGrade, ScoutEventMetadata } from '../../../domain/scout/events/ScoutEvent';
import type { InputCandidateState } from '../../../domain/scout/input/InputCandidateState';
import type { Skill } from '../../../domain/scout/entities/Skill';
import { tacticalValue } from '../../../domain/scout/tactical/TacticalMetadataAdapter';
import type { CourtLocation } from '../../../domain/scout/tactical/TacticalMetadata';
import { DirectionResolver } from '../../../domain/scout/tactical/DirectionResolver';
import { TacticalInputInterpreter } from '../../../domain/scout/input/TacticalInputInterpreter';
import { TacticalCourt, type CourtSelectionMode } from './TacticalCourt';
import { matchesShortcut } from './keyboardShortcut';

interface ScoutScreenProps {
  readonly workspace: MatchWorkspace;
  readonly busy: boolean;
  readonly onBack: () => void;
  readonly onSummary: () => void;
  readonly onRegister: (
    teamId: string,
    rawCode: string,
    metadata?: ScoutEventMetadata,
  ) => Promise<void>;
  readonly onCorrect: (
    sourceEventId: string,
    rawCode: string,
    metadata?: ScoutEventMetadata,
  ) => Promise<void>;
  readonly onUndo: () => Promise<void>;
  readonly onRedo: () => Promise<void>;
  readonly onPoint: (teamId: string) => Promise<void>;
  readonly onNextSet: () => Promise<void>;
  readonly onExport: () => Promise<void>;
}

const skillLabels: Readonly<Record<string, string>> = {
  serve: 'Saque',
  reception: 'Recepção',
  set: 'Levantamento',
  attack: 'Ataque',
  block: 'Bloqueio',
  dig: 'Defesa',
  free_ball: 'Free ball',
};

const outcomeLabels: Readonly<Record<string, string>> = {
  ace: 'ace',
  point: 'ponto',
  positive: 'positivo',
  neutral: 'neutro',
  negative: 'negativo',
  perfect: 'perfeito',
  playable: 'jogável',
  overpass: 'bola passada',
  blocked: 'bloqueado',
  error: 'erro',
};

const tacticalRoleLabels: Readonly<Record<string, string>> = {
  setter: 'levantador',
  opposite: 'oposto',
  outside_1: 'ponteiro 1',
  outside_2: 'ponteiro 2',
  middle_1: 'central 1',
  middle_2: 'central 2',
  custom: 'personalizado',
};

const HISTORY_PAGE_SIZE = 200;
const directionResolver = new DirectionResolver();

const candidateLabels: Readonly<Record<InputCandidateState, string>> = {
  empty: 'Pronto',
  prefix: 'Digitando',
  core_complete: 'Código completo',
  enriching: 'Detalhes',
  complete: 'Registrado',
  invalid: 'Código inválido',
};

const completenessFieldLabels: Readonly<Record<string, string>> = {
  skillType: 'tipo da ação',
  originZone: 'zona de origem',
  targetZone: 'zona de destino',
  direction: 'direção',
  setterPosition: 'posição do levantador',
  setterCall: 'chamada do levantador',
  attackCombination: 'combinação',
  attackTempo: 'tempo de ataque',
  blockersCount: 'bloqueadores',
  phase: 'fase',
  transition: 'transição',
};

export function ScoutScreen({
  workspace,
  busy,
  onBack,
  onSummary,
  onRegister,
  onCorrect,
  onUndo,
  onRedo,
  onPoint,
  onNextSet,
  onExport,
}: ScoutScreenProps) {
  const [buffer, setBuffer] = useState('');
  const [stream, setStream] = useState(() =>
    workspace.timeline.map((entry) => entry.event.rawCode).join(''),
  );
  const [candidateState, setCandidateState] = useState<InputCandidateState>('empty');
  const [activeTeamId, setActiveTeamId] = useState(workspace.teams[0].id);
  const [editingId, setEditingId] = useState<string>();
  const [originZone, setOriginZone] = useState('');
  const [targetZone, setTargetZone] = useState('');
  const [skillType, setSkillType] = useState('');
  const [direction, setDirection] = useState('');
  const [receptionGrade, setReceptionGrade] = useState<ReceptionGrade | ''>('');
  const [setterPosition, setSetterPosition] = useState('');
  const [setterCall, setSetterCall] = useState('');
  const [attackTempo, setAttackTempo] = useState('');
  const [attackCombination, setAttackCombination] = useState('');
  const [blockersCount, setBlockersCount] = useState('');
  const [phase, setPhase] = useState<'' | 'sideout' | 'breakpoint' | 'transition'>('');
  const [courtMode, setCourtMode] = useState<CourtSelectionMode>('origin');
  const [drawnOrigin, setDrawnOrigin] = useState<CourtLocation>();
  const [drawnTarget, setDrawnTarget] = useState<CourtLocation>();
  const [quickEditorOpen, setQuickEditorOpen] = useState(false);
  const [quickCommand, setQuickCommand] = useState('');
  const [quickError, setQuickError] = useState('');
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE_SIZE);
  const inputRef = useRef<HTMLInputElement>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const commitQueueRef = useRef<Promise<void>>(Promise.resolve());
  const servePrefillKeyRef = useRef<string | undefined>(undefined);
  const servePrefillValueRef = useRef<string | undefined>(undefined);
  const controllerKey = `${workspace.profiles.codeProfile.id}@${workspace.profiles.codeProfile.version}`;
  const controllerRef = useRef<
    | {
        readonly key: string;
        readonly controller: ContinuousInputController;
      }
    | undefined
  >(undefined);
  if (!controllerRef.current || controllerRef.current.key !== controllerKey) {
    controllerRef.current = {
      key: controllerKey,
      controller: new ContinuousInputController(workspace.profiles.codeProfile),
    };
  }
  const inputController = controllerRef.current.controller;
  const [teamA, teamB] = workspace.teams;
  const tactical = ['tactical', 'advanced'].includes(workspace.profiles.complexityProfile.level);
  const advanced = workspace.profiles.complexityProfile.level === 'advanced';
  const tacticalInput = workspace.profiles.codeProfile.tacticalInput;
  const teamCodes = workspace.profiles.codeProfile.teamCodes;
  const tacticalInterpreter = useRef(new TacticalInputInterpreter()).current;
  const directionOptions = [
    ...new Set([
      'diagonal',
      'paralela',
      'centro',
      ...Object.values(tacticalInput?.fields.direction.values ?? {}),
      ...(direction ? [direction] : []),
    ]),
  ];
  const setCompleted = workspace.state.sets.find(
    (set) => set.setNumber === workspace.state.currentSet,
  )?.completed;
  const servingTeam = workspace.teams.find((team) => team.id === workspace.state.servingTeamId);
  const servingLineup = workspace.currentLineups.find(
    (lineup) => lineup.teamId === workspace.state.servingTeamId,
  );
  const serverSlot = servingLineup?.slots[servingLineup.positions[1]];
  const server = workspace.players.find((player) => player.id === serverSlot?.playerId);

  useEffect(() => inputRef.current?.focus(), [workspace.events.length]);
  useEffect(() => {
    if (
      !server ||
      setCompleted ||
      editingId ||
      buffer.trim() ||
      workspace.state.currentRally.status === 'active'
    )
      return;
    const serveCode = Object.entries(workspace.profiles.codeProfile.skills).find(
      ([, skill]) => skill === 'serve',
    )?.[0];
    if (!serveCode) return;
    const prefillKey = [
      workspace.state.currentSet,
      workspace.state.score.teamA,
      workspace.state.score.teamB,
      workspace.state.servingTeamId,
      server.id,
    ].join(':');
    if (servePrefillKeyRef.current === prefillKey) return;
    const teamPrefix = teamCodes
      ? server.teamId === workspace.teams[0]?.id
        ? teamCodes.home
        : teamCodes.away.toLocaleLowerCase()
      : '';
    const prefill = `${teamPrefix}${String(server.number).padStart(2, '0')}${serveCode}`;
    const update = inputController.replace(prefill);
    servePrefillKeyRef.current = prefillKey;
    servePrefillValueRef.current = prefill;
    setActiveTeamId(server.teamId);
    setStream((current) => `${current}${prefill}`);
    setBuffer(update.buffer);
    setCandidateState(update.state);
  }, [
    buffer,
    editingId,
    inputController,
    server,
    setCompleted,
    workspace.profiles.codeProfile.skills,
    teamCodes,
    workspace.teams,
    workspace.state.currentSet,
    workspace.state.currentRally.status,
    workspace.state.score.teamA,
    workspace.state.score.teamB,
    workspace.state.servingTeamId,
  ]);
  useEffect(
    () => () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    },
    [],
  );

  function courtLocation(zoneId: string) {
    if (!zoneId) return undefined;
    const zone = tacticalInput?.zoneSystem.zones.find((candidate) => candidate.id === zoneId);
    return {
      zoneId,
      ...(zone?.x !== undefined ? { x: zone.x } : {}),
      ...(zone?.y !== undefined ? { y: zone.y } : {}),
    };
  }

  function metadata(): ScoutEventMetadata | undefined {
    if (!tactical) return undefined;
    const origin = drawnOrigin ?? courtLocation(originZone);
    const target = drawnTarget ?? courtLocation(targetZone);
    const resolvedDirection =
      direction ||
      (origin && target && tacticalInput
        ? directionResolver.resolve({ origin, target }, tacticalInput.zoneSystem).direction
        : undefined);
    const captureDraft = {
      ...(origin ? { origin } : {}),
      ...(target ? { target } : {}),
      ...(skillType.trim() ? { skillType: skillType.trim() } : {}),
      ...(resolvedDirection ? { direction: resolvedDirection } : {}),
      ...(receptionGrade ? { receptionGrade } : {}),
      ...(drawnOrigin && drawnTarget
        ? { captureMethod: 'drawn' as const }
        : resolvedDirection && !direction
          ? { captureMethod: 'derived' as const }
          : origin || target
            ? { captureMethod: 'selected' as const }
            : {}),
      ...(setterCall.trim() ? { setterCall: setterCall.trim() } : {}),
      ...(advanced
        ? {
            ...(setterPosition ? { setterPosition: Number(setterPosition) } : {}),
            ...(attackTempo.trim() ? { tempo: attackTempo.trim() } : {}),
            ...(attackCombination.trim() ? { combination: attackCombination.trim() } : {}),
            ...(blockersCount ? { blockersCount: Number(blockersCount) } : {}),
            ...(phase ? { phase } : {}),
          }
        : {}),
    };
    return Object.keys(captureDraft).length > 0 ? { captureDraft } : undefined;
  }

  function inlineMetadata(tokens: readonly string[]): ScoutEventMetadata | undefined {
    if (tokens.length === 0) return undefined;
    const interpreted = tacticalInterpreter.interpret(
      tokens.join(' '),
      workspace.profiles.codeProfile,
    );
    if (!interpreted.ok) return undefined;
    const values = interpreted.value;
    const origin = values.originZoneId ? courtLocation(values.originZoneId) : undefined;
    const target = values.targetZoneId ? courtLocation(values.targetZoneId) : undefined;
    const resolvedDirection =
      values.direction ||
      (origin && target && tacticalInput
        ? directionResolver.resolve({ origin, target }, tacticalInput.zoneSystem).direction
        : undefined);
    return {
      captureDraft: {
        ...(origin ? { origin } : {}),
        ...(target ? { target } : {}),
        ...(resolvedDirection ? { direction: resolvedDirection } : {}),
        captureMethod: 'typed',
        ...(values.skillType ? { skillType: values.skillType } : {}),
        ...(values.setterCall ? { setterCall: values.setterCall } : {}),
        ...(values.combination ? { combination: values.combination } : {}),
        ...(values.tempo ? { tempo: values.tempo } : {}),
        ...(values.blockers !== undefined ? { blockersCount: values.blockers } : {}),
      },
    };
  }

  function mergeMetadata(
    selected: ScoutEventMetadata | undefined,
    inline: ScoutEventMetadata | undefined,
  ): ScoutEventMetadata | undefined {
    if (!selected) return inline;
    if (!inline) return selected;
    return {
      ...selected,
      ...inline,
      captureDraft: { ...selected.captureDraft, ...inline.captureDraft },
    };
  }

  function clearTacticalCapture() {
    setOriginZone('');
    setTargetZone('');
    setSkillType('');
    setDirection('');
    setReceptionGrade('');
    setSetterPosition('');
    setSetterCall('');
    setAttackTempo('');
    setAttackCombination('');
    setBlockersCount('');
    setPhase('');
    setDrawnOrigin(undefined);
    setDrawnTarget(undefined);
  }

  function enqueueCodes(codes: readonly string[]) {
    if (codes.length === 0) return;
    const teamIdForCode = (code: string) => {
      if (!teamCodes) return activeTeamId;
      const normalizedPrefix = code.trim().charAt(0).toLocaleUpperCase();
      if (normalizedPrefix === teamCodes.home.toLocaleUpperCase())
        return workspace.teams[0]?.id ?? activeTeamId;
      if (normalizedPrefix === teamCodes.away.toLocaleUpperCase())
        return workspace.teams[1]?.id ?? activeTeamId;
      return activeTeamId;
    };
    const capturedMetadata = metadata();
    const decodedCodes = codes.map(
      (code) => inputController.decode(code) ?? { coreCode: code, tacticalTokens: [] },
    );
    clearTacticalCapture();
    commitQueueRef.current = commitQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        for (const [index, decoded] of decodedCodes.entries()) {
          const eventMetadata = mergeMetadata(
            index === 0 ? capturedMetadata : undefined,
            inlineMetadata(decoded.tacticalTokens),
          );
          await onRegister(teamIdForCode(decoded.coreCode), decoded.coreCode, eventMetadata);
        }
      });
  }

  function applyInputUpdate(update: ContinuousInputUpdate, scheduleIdle = true) {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setBuffer(update.buffer);
    setCandidateState(update.state);
    enqueueCodes(update.committedCodes);
    if (scheduleIdle && (update.state === 'complete' || update.state === 'core_complete')) {
      idleTimerRef.current = setTimeout(() => {
        applyInputUpdate(inputController.idleCommit(), false);
      }, inputController.policy.idleMs);
    }
  }

  function updateContinuousStream(value: string) {
    const pending = inputController.current().buffer;
    const committedLength = Math.max(0, stream.length - pending.length);
    const committedPrefix = stream.slice(0, committedLength);
    if (!value.startsWith(committedPrefix)) {
      setCandidateState('invalid');
      return;
    }
    setStream(value);
    applyInputUpdate(inputController.replace(value.slice(committedLength)));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!buffer.trim()) return;
    if (editingId) {
      if (busy) return;
      await onCorrect(editingId, buffer, metadata());
      setBuffer('');
      setEditingId(undefined);
      setCandidateState('empty');
      clearTacticalCapture();
      inputRef.current?.focus();
      return;
    }
    applyInputUpdate(inputController.manualCommit(), false);
  }

  function edit(
    sourceEventId: string,
    rawCode: string,
    skill: Skill,
    eventMetadata?: ScoutEventMetadata,
  ) {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    inputController.clear();
    setEditingId(sourceEventId);
    setBuffer(rawCode.trim());
    setCandidateState('empty');
    setOriginZone(tacticalValue.originZoneId(eventMetadata, skill) ?? '');
    setTargetZone(tacticalValue.targetZoneId(eventMetadata, skill) ?? '');
    const eventOrigin = tacticalValue.originLocation(eventMetadata, skill);
    const eventTarget = tacticalValue.targetLocation(eventMetadata, skill);
    setDrawnOrigin(eventOrigin?.zoneId ? undefined : eventOrigin);
    setDrawnTarget(eventTarget?.zoneId ? undefined : eventTarget);
    setSkillType(tacticalValue.skillType(eventMetadata, skill) ?? '');
    setDirection(tacticalValue.direction(eventMetadata, skill) ?? '');
    setReceptionGrade(tacticalValue.receptionGrade(eventMetadata) ?? '');
    setSetterPosition(tacticalValue.setterPosition(eventMetadata)?.toString() ?? '');
    setSetterCall(tacticalValue.setterCall(eventMetadata) ?? '');
    setAttackTempo(tacticalValue.attackTempo(eventMetadata) ?? '');
    setAttackCombination(tacticalValue.attackCombination(eventMetadata) ?? '');
    setBlockersCount(tacticalValue.blockersCount(eventMetadata, skill)?.toString() ?? '');
    setPhase(tacticalValue.phase(eventMetadata) ?? '');
    inputRef.current?.focus();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (
      !editingId &&
      /^[\d*aA]$/.test(event.key) &&
      servePrefillValueRef.current &&
      inputController.current().buffer === servePrefillValueRef.current
    ) {
      event.preventDefault();
      const suggestionLength = servePrefillValueRef.current.length;
      const nextStream = `${stream.slice(0, Math.max(0, stream.length - suggestionLength))}${event.key}`;
      inputController.clear();
      servePrefillValueRef.current = undefined;
      setStream(nextStream);
      applyInputUpdate(inputController.replace(event.key));
      return;
    }
    if (event.key === 'Escape') {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (!editingId) {
        setStream((current) => current.slice(0, Math.max(0, current.length - buffer.length)));
      }
      inputController.clear();
      setBuffer('');
      setCandidateState('empty');
      setEditingId(undefined);
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) void onRedo();
      else void onUndo();
    }
  }

  function openQuickEditor() {
    setQuickEditorOpen(true);
    setQuickError('');
    setTimeout(() => quickInputRef.current?.focus(), 0);
  }

  function applyQuickCommand(event: FormEvent) {
    event.preventDefault();
    const interpreted = tacticalInterpreter.interpret(quickCommand, workspace.profiles.codeProfile);
    if (!interpreted.ok) {
      setQuickError(interpreted.error.message);
      return;
    }
    const values = interpreted.value;
    if (values.originZoneId) {
      setOriginZone(values.originZoneId);
      setDrawnOrigin(undefined);
    }
    if (values.targetZoneId) {
      setTargetZone(values.targetZoneId);
      setDrawnTarget(undefined);
    }
    if (values.direction) setDirection(values.direction);
    if (values.skillType) setSkillType(values.skillType);
    if (values.setterCall) setSetterCall(values.setterCall);
    if (values.combination) setAttackCombination(values.combination);
    if (values.tempo) setAttackTempo(values.tempo);
    if (values.blockers !== undefined) setBlockersCount(String(values.blockers));
    setQuickCommand('');
    setQuickError('');
    setQuickEditorOpen(false);
    inputRef.current?.focus();
  }

  function handleScreenKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (!tactical || !tacticalInput || event.defaultPrevented) return;
    const shortcuts = tacticalInput.shortcuts;
    if (matchesShortcut(event, shortcuts.quickEditor)) {
      event.preventDefault();
      openQuickEditor();
      return;
    }
    if (matchesShortcut(event, shortcuts.focusScout)) {
      event.preventDefault();
      inputRef.current?.focus();
      return;
    }
    if (matchesShortcut(event, shortcuts.selectOrigin)) {
      event.preventDefault();
      setCourtMode('origin');
      return;
    }
    if (matchesShortcut(event, shortcuts.selectTarget)) {
      event.preventDefault();
      setCourtMode('target');
      return;
    }
    if (
      matchesShortcut(event, shortcuts.editLast) &&
      event.target === inputRef.current &&
      buffer.length === 0
    ) {
      const last = workspace.timeline.at(-1);
      if (last) {
        event.preventDefault();
        edit(last.sourceEventId, last.event.rawCode, last.event.skill, last.event.metadata);
      }
    }
  }

  return (
    <section className="scout-screen" aria-labelledby="scout-title" onKeyDown={handleScreenKeyDown}>
      <h1 id="scout-title" className="sr-only">
        Scout de {workspace.state.metadata.name}
      </h1>
      <header className="scout-header">
        <button
          className="icon-button"
          type="button"
          onClick={onBack}
          aria-label="Voltar para início"
        >
          ←
        </button>
        <div className="score-team">
          <strong>{teamA.name}</strong>
          <button type="button" onClick={() => void onPoint(teamA.id)} disabled={busy}>
            Corrigir +1
          </button>
        </div>
        <div className="score-center">
          <span>{workspace.state.score.teamA}</span>
          <small>×</small>
          <span>{workspace.state.score.teamB}</span>
          <p>SET {workspace.state.currentSet}</p>
        </div>
        <div className="score-team align-right">
          <strong>{teamB.name}</strong>
          <button type="button" onClick={() => void onPoint(teamB.id)} disabled={busy}>
            Corrigir +1
          </button>
        </div>
        <button className="icon-button" type="button" onClick={onSummary} aria-label="Abrir resumo">
          ≡
        </button>
      </header>
      <div className="scout-grid">
        <main className="scout-workspace">
          <div className="context-row">
            {teamCodes ? (
              <span className="team-code-key">
                <code>{teamCodes.home}</code> {teamA.name} · <code>a</code> {teamB.name}
              </span>
            ) : (
              <div className="team-toggle" aria-label="Equipe do próximo evento">
                {[teamA, teamB].map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    aria-pressed={activeTeamId === team.id}
                    onClick={() => setActiveTeamId(team.id)}
                  >
                    {team.name}
                  </button>
                ))}
              </div>
            )}
            <span>
              Rally {workspace.state.currentRally.status === 'active' ? 'ativo' : 'próximo'}
            </span>
            <span className="serving-inline">
              Saque: <strong>{servingTeam?.name ?? 'não definido'}</strong>
              {server ? ` · #${String(server.number).padStart(2, '0')} ${server.name ?? ''}` : ''}
            </span>
            <button
              className="text-button"
              type="button"
              onClick={() => void onNextSet()}
              disabled={busy || !setCompleted}
            >
              {setCompleted ? 'Confirmar próximo set' : 'Set em andamento'}
            </button>
          </div>
          {tactical && (
            <details className="tactical-panel" open={editingId !== undefined || quickEditorOpen}>
              <summary>{editingId ? 'Corrigir detalhes' : 'Detalhes'}</summary>
              {tacticalInput && (
                <div className="quick-tactical-toolbar">
                  <button type="button" onClick={openQuickEditor}>
                    Editor rápido <kbd>{tacticalInput.shortcuts.quickEditor}</kbd>
                  </button>
                </div>
              )}
              {quickEditorOpen && (
                <form className="quick-tactical-editor" onSubmit={applyQuickCommand}>
                  <label htmlFor="quick-tactical-command">Comando tático</label>
                  <input
                    ref={quickInputRef}
                    id="quick-tactical-command"
                    value={quickCommand}
                    onChange={(event) => setQuickCommand(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        setQuickEditorOpen(false);
                        setQuickError('');
                        inputRef.current?.focus();
                      }
                    }}
                    placeholder="o4 t1 dd ypower c31 qfast b2"
                    autoComplete="off"
                  />
                  <button type="submit">Aplicar e voltar</button>
                  {quickError && <small role="alert">{quickError}</small>}
                </form>
              )}
              <div className="tactical-fields">
                <label>
                  Zona de origem
                  {tacticalInput ? (
                    <select
                      value={originZone}
                      onChange={(event) => {
                        setOriginZone(event.target.value);
                        setDirection('');
                        setDrawnOrigin(undefined);
                      }}
                    >
                      <option value="">Não informada</option>
                      {tacticalInput.zoneSystem.zones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={originZone}
                      onChange={(event) => {
                        setOriginZone(event.target.value);
                        setDrawnOrigin(undefined);
                      }}
                    />
                  )}
                </label>
                <label>
                  Zona de destino
                  {tacticalInput ? (
                    <select
                      value={targetZone}
                      onChange={(event) => {
                        setTargetZone(event.target.value);
                        const selectedTarget = courtLocation(event.target.value);
                        const selectedOrigin = courtLocation(originZone);
                        setDirection(
                          selectedOrigin && selectedTarget
                            ? (directionResolver.resolve(
                                { origin: selectedOrigin, target: selectedTarget },
                                tacticalInput.zoneSystem,
                              ).direction ?? '')
                            : '',
                        );
                        setDrawnTarget(undefined);
                      }}
                    >
                      <option value="">Não informada</option>
                      {tacticalInput.zoneSystem.zones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={targetZone}
                      onChange={(event) => {
                        setTargetZone(event.target.value);
                        setDrawnTarget(undefined);
                      }}
                    />
                  )}
                </label>
                <label>
                  Tipo da ação
                  <input value={skillType} onChange={(event) => setSkillType(event.target.value)} />
                </label>
                <label>
                  Direção
                  <select value={direction} onChange={(event) => setDirection(event.target.value)}>
                    <option value="">Não informado</option>
                    {directionOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Nota da recepção
                  <select
                    value={receptionGrade}
                    onChange={(event) =>
                      setReceptionGrade(event.target.value as ReceptionGrade | '')
                    }
                  >
                    <option value="">Não informada</option>
                    <option>A</option>
                    <option>B</option>
                    <option>C</option>
                    <option>ERROR</option>
                  </select>
                </label>
                <label>
                  Chamada do levantador
                  <input
                    value={setterCall}
                    onChange={(event) => setSetterCall(event.target.value)}
                  />
                </label>
                {advanced && (
                  <>
                    <label>
                      Posição do levantador
                      <input
                        type="number"
                        min="1"
                        max="6"
                        value={setterPosition}
                        onChange={(event) => setSetterPosition(event.target.value)}
                      />
                    </label>
                    <label>
                      Tempo de ataque
                      <input
                        value={attackTempo}
                        onChange={(event) => setAttackTempo(event.target.value)}
                      />
                    </label>
                    <label>
                      Combinação
                      <input
                        value={attackCombination}
                        onChange={(event) => setAttackCombination(event.target.value)}
                      />
                    </label>
                    <label>
                      Bloqueadores
                      <input
                        type="number"
                        min="0"
                        max="3"
                        value={blockersCount}
                        onChange={(event) => setBlockersCount(event.target.value)}
                      />
                    </label>
                    <label>
                      Fase
                      <select
                        value={phase}
                        onChange={(event) => setPhase(event.target.value as typeof phase)}
                      >
                        <option value="">Não informada</option>
                        <option value="sideout">Sideout</option>
                        <option value="breakpoint">Breakpoint</option>
                        <option value="transition">Transição</option>
                      </select>
                    </label>
                  </>
                )}
              </div>
              {tacticalInput && (
                <TacticalCourt
                  profile={tacticalInput.zoneSystem}
                  mode={courtMode}
                  originZoneId={originZone}
                  targetZoneId={targetZone}
                  drawnOrigin={drawnOrigin}
                  drawnTarget={drawnTarget}
                  onModeChange={setCourtMode}
                  onSelect={(zoneId) => {
                    if (courtMode === 'origin') {
                      setOriginZone(zoneId);
                      setDirection('');
                      setDrawnOrigin(undefined);
                      setCourtMode('target');
                    } else {
                      setTargetZone(zoneId);
                      const selectedOrigin = courtLocation(originZone);
                      const selectedTarget = courtLocation(zoneId);
                      setDirection(
                        selectedOrigin && selectedTarget
                          ? (directionResolver.resolve(
                              { origin: selectedOrigin, target: selectedTarget },
                              tacticalInput.zoneSystem,
                            ).direction ?? '')
                          : '',
                      );
                      setDrawnTarget(undefined);
                    }
                  }}
                  onDraw={(origin, target) => {
                    setOriginZone('');
                    setTargetZone('');
                    setDrawnOrigin(origin);
                    setDrawnTarget(target);
                  }}
                />
              )}
            </details>
          )}
          <form
            className={editingId ? 'scout-input editing' : 'scout-input'}
            onSubmit={(event) => void submit(event)}
          >
            <label htmlFor="scout-code">
              {editingId ? 'Corrigindo evento' : 'Digite o código'}
            </label>
            <div>
              <span aria-hidden="true">›</span>
              <input
                ref={inputRef}
                id="scout-code"
                value={editingId ? buffer : stream}
                onChange={(event) => {
                  if (editingId) setBuffer(event.target.value);
                  else updateContinuousStream(event.target.value);
                }}
                onKeyDown={handleKeyDown}
                placeholder={teamCodes ? '*08A#' : '08A#'}
                autoComplete="off"
                autoCapitalize="characters"
                aria-describedby={editingId ? undefined : 'input-candidate-state'}
              />
              <kbd>Enter</kbd>
            </div>
            {!editingId && (
              <small
                id="input-candidate-state"
                className={`input-candidate-state ${candidateState}`}
              >
                {candidateLabels[candidateState]}
              </small>
            )}
          </form>
          <div className="history-heading">
            <h2>Histórico</h2>
            <div className="history-actions">
              <button type="button" onClick={() => void onUndo()} disabled={busy}>
                Desfazer
              </button>
              <button type="button" onClick={() => void onRedo()} disabled={busy}>
                Refazer
              </button>
            </div>
          </div>
          {workspace.timeline.length === 0 ? (
            <p className="history-empty">O primeiro evento aparecerá aqui.</p>
          ) : (
            <>
              {workspace.timeline.length > HISTORY_PAGE_SIZE && (
                <p className="history-count">
                  {Math.min(historyLimit, workspace.timeline.length)} de {workspace.timeline.length}
                </p>
              )}
              <ol className="event-list">
                {workspace.timeline
                  .slice(-historyLimit)
                  .reverse()
                  .map((item) => (
                    <li key={item.sourceEventId}>
                      <span className="event-sequence">
                        {String(item.event.sequence).padStart(2, '0')}
                      </span>
                      <code>{item.event.rawCode.trim()}</code>
                      <span className="event-meaning">
                        <strong>{skillLabels[item.event.skill]}</strong>
                        {item.event.outcome
                          ? (outcomeLabels[item.event.outcome] ?? item.event.outcome)
                          : ''}
                      </span>
                      <span className="event-flags">
                        {item.corrected && <span className="corrected-badge">corrigido</span>}
                        {item.event.completeness?.status === 'partial' && (
                          <span
                            className="partial-badge"
                            title={`Faltam: ${item.event.completeness.missingRecommendedFields
                              .map((field) => completenessFieldLabels[field] ?? field)
                              .join(', ')}`}
                          >
                            parcial · faltam{' '}
                            {item.event.completeness.missingRecommendedFields
                              .map((field) => completenessFieldLabels[field] ?? field)
                              .join(', ')}
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          edit(
                            item.sourceEventId,
                            item.event.rawCode,
                            item.event.skill,
                            item.event.metadata,
                          )
                        }
                      >
                        {item.event.completeness?.status === 'partial' ? 'Completar' : 'Corrigir'}
                      </button>
                    </li>
                  ))}
              </ol>
              {historyLimit < workspace.timeline.length && (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setHistoryLimit((current) => current + HISTORY_PAGE_SIZE)}
                >
                  Carregar eventos anteriores
                </button>
              )}
            </>
          )}
        </main>
        <aside className="scout-sidebar">
          <div className="profile-block">
            <h3>
              {workspace.profiles.competitionProfile?.name ??
                workspace.profiles.complexityProfile.name}
            </h3>
            <small>{workspace.profiles.codeProfile.name}</small>
          </div>
          <div className="lineup-live" aria-label="Escalações em quadra">
            <p className="eyebrow">Saque e rotação</p>
            {workspace.teams.map((team) => {
              const lineup = workspace.currentLineups.find(
                (candidate) => candidate.teamId === team.id,
              );
              const setterSlot = lineup
                ? Object.values(lineup.slots).find((slot) => slot.tacticalRole === 'setter')
                : undefined;
              const setterPosition =
                lineup && setterSlot
                  ? ([1, 2, 3, 4, 5, 6] as const).find(
                      (position) => lineup.positions[position] === setterSlot.slotId,
                    )
                  : undefined;
              return (
                <section
                  key={team.id}
                  className={team.id === workspace.state.servingTeamId ? 'serving' : ''}
                >
                  <strong>
                    {team.name} {setterPosition ? `· R${setterPosition}` : ''}
                  </strong>
                  <ol>
                    {([1, 2, 3, 4, 5, 6] as const).map((position) => {
                      const slot = lineup?.slots[lineup.positions[position]];
                      const player = workspace.players.find(
                        (candidate) => candidate.id === slot?.playerId,
                      );
                      return (
                        <li key={position}>
                          <span>P{position}</span>
                          <b>#{player ? String(player.number).padStart(2, '0') : '—'}</b>
                          <small>
                            {slot ? (tacticalRoleLabels[slot.tacticalRole] ?? slot.tacticalRole) : 'vazio'}
                          </small>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              );
            })}
          </div>
          <button
            className="button secondary export-button"
            type="button"
            onClick={() => void onExport()}
          >
            Exportar JSON
          </button>
        </aside>
      </div>
    </section>
  );
}

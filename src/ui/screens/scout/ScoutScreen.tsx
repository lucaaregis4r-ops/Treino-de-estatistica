import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { MatchWorkspace, StartNextSetInput, MatchContextAdjustmentInput } from '../../../application/ScoutTrainerService';
import {
  ContinuousInputController,
  type ContinuousInputUpdate,
} from '../../../application/input/ContinuousInputController';
import type {
  ReceptionGrade,
  ScoutEventMetadata,
  ScoutInputMode,
  ScoutCoverage,
  ScoutCoverageMode,
} from '../../../domain/scout/events/ScoutEvent';
import type { VisualScoutDraft } from '../../../domain/scout/mapper/VisualScoutDraft';
import type { InputCandidateState } from '../../../domain/scout/input/InputCandidateState';
import type { Skill } from '../../../domain/scout/entities/Skill';
import { tacticalValue } from '../../../domain/scout/tactical/TacticalMetadataAdapter';
import type {
  AttackBlockOutcome,
  CourtLocation,
} from '../../../domain/scout/tactical/TacticalMetadata';
import { DirectionResolver } from '../../../domain/scout/tactical/DirectionResolver';
import { TacticalInputInterpreter } from '../../../domain/scout/input/TacticalInputInterpreter';
import type { SpatialMetadata } from '../../../domain/scout/spatial/SpatialMetadata';
import { SpatialCourtInputV2 } from './SpatialCourtInputV2';
import { matchesShortcut } from './keyboardShortcut';
import { MatchContextBar } from './MatchContextBar';
import { CourtLineup } from './CourtLineup';
import { ScoutInput } from './ScoutInput';
import { EventTimeline } from './EventTimeline';
import { TacticalQuickEditor } from './TacticalQuickEditor';
import { ScoutCaptureHelp } from './ScoutCaptureHelp';
import { NextSetLineupEditor } from './NextSetLineupEditor';
import { ATTACK_COMBINATION_OPTIONS } from './attackCombinationOptions';
import { ScoutModeSelector } from './ScoutModeSelector';
import { VisualScoutForm } from './VisualScoutForm';
import { VolleyballVisualScout } from './VolleyballVisualScout';
import { GestureScout } from './gesture/GestureScout';
import { GesturePlayerSuggestionResolver } from '../../../domain/rally/gesture/GesturePlayerSuggestion';
import { GestureExpectedActionResolver } from '../../../domain/rally/gesture/GestureExpectedActionResolver';
import {
  beginGestureCommit,
  createGestureDraftState,
  failGestureCommit,
  selectGesturePlayer,
  setGestureOutcome,
  setGestureBlock,
  setGestureBlockers,
  setGestureTrajectory,
  type GestureDraftState,
} from '../../../domain/rally/gesture/GestureDraftState';
import { shouldCommitGestureKey } from './gesture/gestureCommitKey';
import { GestureRotationCard } from './gesture/GestureRotationCard';
import { SKILL_LABELS } from './presentationLabels';
import type { FaultType } from '../../../domain/match/events/MatchEvent';
import { isHistoryActionActive } from '../../../domain/match/events/ScoutTimeline';
import type { QuickAction } from './gesture/QuickActionRail';
import { AttackBlockSelector, type AttackBlockerOption } from './AttackBlockSelector';
import { visualCourtPlayers } from './visualCourtPlayers';

interface ScoutScreenProps {
  readonly workspace: MatchWorkspace;
  readonly busy: boolean;
  readonly onRegister: (
    teamId: string,
    rawCode: string,
    metadata?: ScoutEventMetadata,
  ) => Promise<void>;
  readonly onRegisterVisual: (draft: VisualScoutDraft) => Promise<void>;
  readonly onRegisterHybrid: (
    teamId: string,
    rawCode: string,
    draft: VisualScoutDraft,
  ) => Promise<void>;
  readonly onRegisterFault: (input: {
    readonly teamId: string;
    readonly faultType: FaultType;
    readonly athleteId?: string;
  }) => Promise<void>;
  readonly onCorrect: (
    sourceEventId: string,
    rawCode: string,
    metadata?: ScoutEventMetadata,
  ) => Promise<void>;
  readonly onUndo: () => Promise<void>;
  readonly onRedo: () => Promise<void>;
  readonly onScoreAdjust: (teamId: string, delta: number) => Promise<void>;
  readonly onAdjustContext?: (input: MatchContextAdjustmentInput) => Promise<void>;
  readonly onSubstitute: (teamId: string, slotId: string, playerInId: string) => Promise<void>;
  readonly onNextSet: (input: StartNextSetInput) => Promise<void>;
  readonly onExport: () => Promise<void>;
}

const HISTORY_PAGE_SIZE = 200;
const directionResolver = new DirectionResolver();

function scoutCoverage(
  teams: readonly { readonly id: string }[],
  mode: ScoutCoverageMode,
): ScoutCoverage {
  const observedTeamIds = mode === 'both'
    ? teams.map((team) => team.id)
    : [teams[mode === 'team_a' ? 0 : 1]?.id].filter((id): id is string => id !== undefined);
  return { mode, observedTeamIds };
}

export function ScoutScreen({
  workspace,
  busy,
  onRegister,
  onRegisterVisual,
  onRegisterHybrid,
  onRegisterFault,
  onCorrect,
  onUndo,
  onRedo,
  onScoreAdjust,
  onAdjustContext,
  onSubstitute,
  onNextSet,
  onExport,
}: ScoutScreenProps) {
  const [buffer, setBuffer] = useState('');
  const [stream, setStream] = useState(() =>
    workspace.timeline.map((entry) => entry.event.rawCode).join(''),
  );
  const [candidateState, setCandidateState] = useState<InputCandidateState>('empty');
  const [activeTeamId, setActiveTeamId] = useState(workspace.teams[0].id);
  const [inputMode, setInputMode] = useState<ScoutInputMode>('typed');
  const [gestureMode, setGestureMode] = useState(false);
  const [coverageMode, setCoverageMode] = useState<ScoutCoverageMode>(workspace.coverage.mode);
  const [recoveryAction, setRecoveryAction] = useState<{ skill: Skill; teamId: string }>();
  const [rapidGesture, setRapidGesture] = useState(false);
  const [gestureDraft, setGestureDraft] = useState<GestureDraftState>(() =>
    createGestureDraftState(),
  );
  const [gestureDraftKey, setGestureDraftKey] = useState(0);
  const [pendingFault, setPendingFault] = useState<FaultType>();
  const gestureCommittingRef = useRef(false);
  const handledSubstitutionRef = useRef<string | undefined>(undefined);
  const [visualPlayerNumber, setVisualPlayerNumber] = useState(
    String(
      workspace.players.find((player) => player.teamId === workspace.teams[0].id)?.number ?? '',
    ),
  );
  const [visualSkill, setVisualSkill] = useState<Skill>(
    workspace.tacticalRally.expectedNextAction?.skill ?? 'serve',
  );
  const [visualEvaluation, setVisualEvaluation] = useState('excellent');
  const [hybridCode, setHybridCode] = useState('');
  const [hybridSubmitting, setHybridSubmitting] = useState(false);
  const [hybridSubmitStatus, setHybridSubmitStatus] = useState('');
  const [hybridSubmitError, setHybridSubmitError] = useState('');
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
  const [attackBlockOutcome, setAttackBlockOutcome] = useState<AttackBlockOutcome>('none');
  const [attackBlockerIds, setAttackBlockerIds] = useState<readonly string[]>([]);
  const [phase, setPhase] = useState<'' | 'sideout' | 'breakpoint' | 'transition'>('');
  const [drawnOrigin, setDrawnOrigin] = useState<CourtLocation>();
  const [drawnTarget, setDrawnTarget] = useState<CourtLocation>();
  const [captureDirection, setCaptureDirection] = useState(true);
  const [spatialCapture, setSpatialCapture] = useState<{ key: string; value: SpatialMetadata }>();
  const [captureCycle, setCaptureCycle] = useState(0);
  const [quickEditorOpen, setQuickEditorOpen] = useState(false);
  const [quickCommand, setQuickCommand] = useState('');
  const [quickError, setQuickError] = useState('');
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE_SIZE);
  const [captureHelpEnabled, setCaptureHelpEnabled] = useState(false);
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
  const decodedCapture = inputController.decode(buffer);
  const captureEvaluation = decodedCapture
    ? Object.keys(workspace.profiles.codeProfile.evaluations).find((symbol) =>
        decodedCapture.coreCode.endsWith(symbol),
      )
    : undefined;
  const captureWithoutEvaluation =
    decodedCapture && captureEvaluation
      ? decodedCapture.coreCode.slice(0, -captureEvaluation.length)
      : undefined;
  const activeCaptureSkill =
    inputMode === 'typed'
      ? ((captureWithoutEvaluation
          ? Object.entries(workspace.profiles.codeProfile.skills)
              .sort(([left], [right]) => right.length - left.length)
              .find(([code]) => captureWithoutEvaluation.endsWith(code))?.[1]
          : undefined) ?? workspace.tacticalRally.expectedNextAction?.skill)
      : visualSkill;
  const typedCoreSkill = decodedCapture
    ? (() => {
        const evaluationSymbols = Object.keys(workspace.profiles.codeProfile.evaluations).sort(
          (left, right) => right.length - left.length,
        );
        let core = decodedCapture.coreCode;
        for (const symbol of evaluationSymbols) {
          if (core.endsWith(symbol)) {
            core = core.slice(0, -symbol.length);
            break;
          }
        }
        return Object.entries(workspace.profiles.codeProfile.skills)
          .sort(([left], [right]) => right.length - left.length)
          .find(([code]) => core.endsWith(code))?.[1];
      })()
    : undefined;
  const [teamA, teamB] = workspace.teams;
  const tactical = ['tactical', 'advanced'].includes(workspace.profiles.complexityProfile.level);
  const advanced = workspace.profiles.complexityProfile.level === 'advanced';
  const tacticalInput = workspace.profiles.codeProfile.tacticalInput;
  const teamCodes = workspace.profiles.codeProfile.teamCodes;
  const spatialSkill = inputMode === 'typed' ? typedCoreSkill : visualSkill;
  const spatialCourtOpen = tactical && captureDirection && spatialSkill !== undefined &&
    ['serve', 'attack', 'reception', 'set', 'dig'].includes(spatialSkill);
  const spatialCode = inputMode === 'typed' ? buffer :
    `${visualSkill}:${visualPlayerNumber}:${visualEvaluation}:${hybridCode}`;
  const spatialKey = JSON.stringify([inputMode, editingId, activeTeamId, spatialCode, captureCycle]);
  const confirmedSpatial = spatialCourtOpen && spatialCapture?.key === spatialKey
    ? spatialCapture.value : undefined;
  const codePrefix = buffer.trim().charAt(0).toLocaleUpperCase();
  const executingTeamId = inputMode === 'typed' && teamCodes
    ? codePrefix === teamCodes.home.toLocaleUpperCase() ? teamA.id
      : codePrefix === teamCodes.away.toLocaleUpperCase() ? teamB.id : activeTeamId
    : activeTeamId;
  const tacticalInterpreter = useRef(new TacticalInputInterpreter()).current;
  const directionOptions = [
    ...new Set([
      'diagonal',
      'paralela',
      'paragonal',
      ...Object.values(tacticalInput?.fields.direction.values ?? {}),
      ...(direction ? [direction] : []),
    ]),
  ];
  const setCompleted = workspace.state.sets.find(
    (set) => set.setNumber === workspace.state.currentSet,
  )?.completed;
  const servingLineup = workspace.currentLineups.find(
    (lineup) => lineup.teamId === workspace.state.servingTeamId,
  );
  const serverSlot = servingLineup?.slots[servingLineup.positions[1]];
  const server = workspace.players.find((player) => player.id === serverSlot?.playerId);
  const visualSkills = [...new Set(Object.values(workspace.profiles.codeProfile.skills))];
  const visualEvaluations = [...new Set(Object.values(workspace.profiles.codeProfile.evaluations))];
  const visualTeamPlayers = workspace.players.filter(
    (player) => player.teamId === activeTeamId && player.active !== false,
  );
  const resolvedGestureExpected = new GestureExpectedActionResolver().resolve(
    workspace.tacticalRally.expectedNextAction,
  );
  const gestureExpected = recoveryAction ?? resolvedGestureExpected;
  const gestureSkill = gestureExpected?.skill ?? 'serve';
  const gestureTeamId = gestureSkill === 'serve'
    ? workspace.state.servingTeamId ?? activeTeamId
    : gestureExpected?.teamId ?? activeTeamId;
  const gestureLineup = workspace.currentLineups.find((lineup) => lineup.teamId === gestureTeamId);
  const gestureTeam = workspace.teams.find((team) => team.id === gestureTeamId);
  const gestureOpponentId = workspace.teams.find((team) => team.id !== gestureTeamId)?.id;
  const gestureOpponentNet = gestureOpponentId
    ? visualCourtPlayers(workspace, gestureOpponentId).filter(({ position, player }) =>
        [2, 3, 4].includes(position) && player,
      )
    : [];
  const gestureBlockers: readonly AttackBlockerOption[] = [
    ...gestureOpponentNet.map(({ position, player }) => ({
      id: player!.id,
      position,
      label: `#${player!.number} ${player!.name ?? `Jogador ${player!.number}`}`,
    })),
    ...(gestureOpponentId
      ? workspace.players
          .filter((player) => player.teamId === gestureOpponentId && player.active !== false)
          .filter((player) => !gestureOpponentNet.some(({ player: netPlayer }) => netPlayer?.id === player.id))
          .map((player) => ({ id: player.id, label: `#${player.number} ${player.name ?? `Jogador ${player.number}`}` }))
      : []),
  ];
  const gestureSuggestion = new GesturePlayerSuggestionResolver().resolve(gestureLineup, gestureSkill);
  const gesturePlayerLabels = Object.fromEntries(
    workspace.players.map((player) => [player.id, `#${String(player.number).padStart(2, '0')}`]),
  );
  const gesturePlayerTitles = Object.fromEntries(
    workspace.players.map((player) => [
      player.id,
      `#${String(player.number).padStart(2, '0')}${player.name ? ` ${player.name}` : ''}`,
    ]),
  );
  const selectedVisualPlayerNumber = visualPlayerNumber === ''
    ? ''
    : visualTeamPlayers.some((player) => String(player.number) === visualPlayerNumber)
      ? visualPlayerNumber
      : String(visualTeamPlayers[0]?.number ?? '');
  const selectedVisualEvaluation = visualEvaluations.includes(visualEvaluation)
    ? visualEvaluation
    : (visualEvaluations[0] ?? '');
  const visualOpponentId = workspace.teams.find((team) => team.id !== activeTeamId)?.id;
  const visualOpponentNet = visualOpponentId
    ? visualCourtPlayers(workspace, visualOpponentId).filter(({ position, player }) =>
        [2, 3, 4].includes(position) && player,
      )
    : [];
  const attackBlockers: readonly AttackBlockerOption[] = [
    ...visualOpponentNet.map(({ position, player }) => ({
      id: player!.id,
      position,
      label: `#${player!.number} ${player!.name ?? `Jogador ${player!.number}`}`,
    })),
    ...(visualOpponentId
      ? workspace.players
          .filter((player) => player.teamId === visualOpponentId && player.active !== false)
          .filter((player) => !visualOpponentNet.some(({ player: netPlayer }) => netPlayer?.id === player.id))
          .map((player) => ({
            id: player.id,
            label: `#${player.number} ${player.name ?? `Jogador ${player.number}`}`,
          }))
      : []),
  ];

  useEffect(() => {
    if (!gestureMode) return;
    const expectedAction = { skill: gestureSkill, teamId: gestureTeamId } as const;
    setGestureDraft((current) => {
      const sameAction = current.expectedAction?.skill === expectedAction.skill &&
        current.expectedAction?.teamId === expectedAction.teamId;
      if (sameAction) {
        if (!current.playerId &&
          current.playerSelection !== 'unidentified' &&
          gestureSuggestion.automatic) {
          return { ...current, playerId: gestureSuggestion.automatic };
        }
        return current;
      }
      return createGestureDraftState(expectedAction, gestureSuggestion.automatic);
    });
  }, [gestureMode, gestureSkill, gestureTeamId, gestureSuggestion.automatic, gestureDraftKey]);

  useEffect(() => {
    if (inputMode === 'typed') inputRef.current?.focus();
  }, [inputMode, workspace.events.length]);

  useEffect(() => {
    const substitution = [...workspace.events]
      .reverse()
      .find((event) => event.type === 'substitution_made');
    if (!substitution || substitution.id === handledSubstitutionRef.current) return;
    handledSubstitutionRef.current = substitution.id;
    const playerOut = workspace.players.find((player) => player.id === substitution.playerOutId);
    if (!playerOut) return;
    setVisualPlayerNumber((current) =>
      current === String(playerOut.number) ? '' : current,
    );
    setGestureDraft((current) =>
      current.playerId === playerOut.id ? selectGesturePlayer(current) : current,
    );
  }, [workspace.events, workspace.players]);
  function clearGestureDraft() {
    setRecoveryAction(undefined);
    setPendingFault(undefined);
    setGestureDraft(createGestureDraftState());
    setGestureDraftKey((key) => key + 1);
  }

  function chooseGestureAction(skill?: Skill) {
    const next = skill ? { skill, teamId: gestureTeamId } : undefined;
    setRecoveryAction(next);
    setGestureDraft((current) => ({ ...current, outcome: undefined,
      expectedAction: next ?? resolvedGestureExpected ?? { skill: 'serve', teamId: workspace.state.servingTeamId },
    }));
  }

  async function commitCurrentGesture(preparedDraft = gestureDraft) {
    if (gestureCommittingRef.current || busy) return;
    if (pendingFault) {
      const playerId = preparedDraft.playerSelection === 'unidentified'
        ? undefined
        : preparedDraft.playerId ?? gestureSuggestion.automatic;
      gestureCommittingRef.current = true;
      try {
        await onRegisterFault({
          teamId: gestureTeamId,
          faultType: pendingFault,
          ...(playerId ? { athleteId: playerId } : {}),
        });
        clearGestureDraft();
      } catch (error) {
        setGestureDraft(failGestureCommit(
          preparedDraft,
          error instanceof Error ? error.message : 'Não foi possível registrar a infração.',
        ));
      } finally {
        gestureCommittingRef.current = false;
      }
      return;
    }
    let draft = preparedDraft;
    if (!draft.expectedAction) {
      draft = createGestureDraftState(
        { skill: gestureSkill, teamId: gestureTeamId },
        gestureSuggestion.automatic,
      );
    }
    if (!draft.playerId && draft.playerSelection !== 'unidentified' && gestureSuggestion.automatic) {
      draft = selectGesturePlayer(draft, gestureSuggestion.automatic);
    }
    const checked = beginGestureCommit(draft);
    if (checked.status === 'error') {
      setGestureDraft(checked);
      return;
    }
    const player = checked.playerId
      ? workspace.players.find((candidate) => candidate.id === checked.playerId)
      : undefined;
    if (!checked.trajectory || (checked.playerId && !player)) {
      setGestureDraft(failGestureCommit(checked, 'Não foi possível preparar a ação.'));
      return;
    }
    gestureCommittingRef.current = true;
    setGestureDraft(checked);
    try {
      await onRegisterVisual({
        teamId: gestureTeamId,
        ...(player ? { playerNumber: player.number } : {}),
        coverage: scoutCoverage(workspace.teams, coverageMode),
        skill: gestureSkill,
        evaluation: checked.outcome === '#' ? 'excellent' : checked.outcome === '=' ? 'error' : 'neutral',
        spatial: checked.trajectory,
        ...(gestureSkill === 'attack' && checked.blockOutcome && checked.blockOutcome !== 'none'
          ? { blockOutcome: checked.blockOutcome, blockerIds: checked.blockerIds ?? [] }
          : {}),
      });
      clearGestureDraft();
    } catch {
      setGestureDraft(failGestureCommit(checked, 'Não foi possível registrar. Rascunho mantido; use Registrar para tentar novamente.'));
    } finally {
      gestureCommittingRef.current = false;
    }
  }
  useEffect(() => {
    if (editingId || !inputRef.current) return;
    inputRef.current.setSelectionRange(stream.length, stream.length);
    inputRef.current.scrollLeft = inputRef.current.scrollWidth;
  }, [editingId, stream]);
  useEffect(() => {
    if (
      !server ||
      inputMode !== 'typed' ||
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
    inputMode,
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
    const origin = confirmedSpatial ? undefined : drawnOrigin ?? courtLocation(originZone);
    const target = confirmedSpatial ? undefined : drawnTarget ?? courtLocation(targetZone);
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
      ...(!confirmedSpatial && drawnOrigin && drawnTarget
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
      ...(activeCaptureSkill === 'attack' && attackBlockOutcome !== 'none'
        ? { blockOutcome: attackBlockOutcome, blockerIds: attackBlockerIds }
        : {}),
    };
    return Object.keys(captureDraft).length > 0 || confirmedSpatial
      ? { coverage: scoutCoverage(workspace.teams, coverageMode),
          ...(Object.keys(captureDraft).length > 0 ? { captureDraft } : {}),
          ...(confirmedSpatial ? { spatial: confirmedSpatial } : {}) }
      : { coverage: scoutCoverage(workspace.teams, coverageMode) };
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
    setSpatialCapture(undefined);
    setCaptureCycle((cycle) => cycle + 1);
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
    setAttackBlockOutcome('none');
    setAttackBlockerIds([]);
    setPhase('');
    setDrawnOrigin(undefined);
    setDrawnTarget(undefined);
  }

  function changeInputMode(mode: ScoutInputMode) {
    if (editingId || mode === inputMode) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (inputMode === 'typed' && buffer.length > 0) {
      setStream((current) => current.slice(0, Math.max(0, current.length - buffer.length)));
    }
    inputController.clear();
    setBuffer('');
    setCandidateState('empty');
    setInputMode(mode);
    clearTacticalCapture();
    const suggestion = workspace.tacticalRally.expectedNextAction;
    if (suggestion?.teamId && workspace.teams.some((team) => team.id === suggestion.teamId)) {
      setActiveTeamId(suggestion.teamId);
      const first = workspace.players.find(
        (player) => player.teamId === suggestion.teamId && player.active !== false,
      );
      setVisualPlayerNumber(String(first?.number ?? ''));
    }
    if (suggestion?.skill) setVisualSkill(suggestion.skill);
  }

  function buildVisualDraft(): VisualScoutDraft | undefined {
    const parsedPlayerNumber = selectedVisualPlayerNumber
      ? Number(selectedVisualPlayerNumber)
      : undefined;
    if (!activeTeamId || (parsedPlayerNumber !== undefined && !Number.isInteger(parsedPlayerNumber))) return undefined;
    const coverage = scoutCoverage(workspace.teams, coverageMode);
    const capture = metadata()?.captureDraft;
    const contactLocation = capture?.origin ?? capture?.target;
    return {
      teamId: activeTeamId,
      ...(parsedPlayerNumber !== undefined ? { playerNumber: parsedPlayerNumber } : {}),
      coverage,
      skill: visualSkill,
      evaluation: selectedVisualEvaluation,
      ...(confirmedSpatial ? { spatial: confirmedSpatial } : {}),
      ...(visualSkill === 'reception' || visualSkill === 'block'
        ? contactLocation
          ? { contactLocation }
          : {}
        : {
            ...(capture?.origin ? { origin: capture.origin } : {}),
            ...(capture?.target ? { target: capture.target } : {}),
          }),
      ...(capture?.skillType ? { skillType: capture.skillType } : {}),
      ...(capture?.direction ? { direction: capture.direction } : {}),
      ...(capture?.receptionGrade ? { receptionGrade: capture.receptionGrade } : {}),
      ...(capture?.setterCall ? { setterCall: capture.setterCall } : {}),
      ...(capture?.setterPosition !== undefined ? { setterPosition: capture.setterPosition } : {}),
      ...(capture?.tempo ? { attackTempo: capture.tempo } : {}),
      ...(capture?.combination ? { attackCombination: capture.combination } : {}),
      ...(capture?.blockersCount !== undefined ? { blockersCount: capture.blockersCount } : {}),
      ...(visualSkill === 'attack' && attackBlockOutcome !== 'none'
        ? { blockOutcome: attackBlockOutcome, blockerIds: attackBlockerIds }
        : {}),
      ...(capture?.phase ? { phase: capture.phase } : {}),
      ...(capture?.captureMethod ? { captureMethod: capture.captureMethod } : {}),
    };
  }

  async function submitVisual(event: FormEvent) {
    event.preventDefault();
    if (busy || hybridSubmitting) return;
    const draft = buildVisualDraft();
    if (!draft) return;
    try {
      if (inputMode === 'hybrid') {
        if (!hybridCode.trim()) return;
        setHybridSubmitting(true);
        setHybridSubmitStatus('Registrando…');
        setHybridSubmitError('');
        await onRegisterHybrid(activeTeamId, hybridCode, draft);
        setHybridCode('');
      } else {
        await onRegisterVisual(draft);
      }
    } catch {
      if (inputMode === 'hybrid') {
        setHybridSubmitStatus('');
        setHybridSubmitError('Não foi possível registrar a ação. O rascunho foi preservado; tente novamente.');
      }
      return;
    } finally {
      if (inputMode === 'hybrid') setHybridSubmitting(false);
    }
    if (inputMode === 'hybrid') setHybridSubmitStatus('Ação registrada.');
    clearTacticalCapture();
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
    commitQueueRef.current = commitQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        for (const [index, decoded] of decodedCodes.entries()) {
          const selectedMetadata = mergeMetadata(
            index === 0 ? capturedMetadata : undefined,
            inlineMetadata(decoded.tacticalTokens),
          );
          const eventMetadata: ScoutEventMetadata = {
            coverage: scoutCoverage(workspace.teams, coverageMode),
            ...(selectedMetadata ?? {}),
          };
          await onRegister(teamIdForCode(decoded.coreCode), decoded.coreCode, eventMetadata);
        }
        clearTacticalCapture();
      });
  }

  function applyInputUpdate(update: ContinuousInputUpdate, scheduleIdle = true) {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setBuffer(update.buffer);
    setCandidateState(update.state);
    enqueueCodes(update.committedCodes);
    if (update.buffer !== buffer) setSpatialCapture(undefined);
    const nextSkill = inputController.decode(update.buffer)?.coreCode;
    // Leave supported actions available for explicit spatial confirmation or typed submission.
    const awaitingSpatial = tactical && captureDirection && nextSkill !== undefined &&
      Object.entries(workspace.profiles.codeProfile.skills).some(([code, skill]) =>
        ['serve', 'attack', 'reception', 'set', 'dig'].includes(skill) &&
        Object.keys(workspace.profiles.codeProfile.evaluations).some((evaluation) => nextSkill.endsWith(`${code}${evaluation}`)),
      );
    if (scheduleIdle && !awaitingSpatial && (update.state === 'complete' || update.state === 'core_complete')) {
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

  function commitTypedBuffer() {
    applyInputUpdate(inputController.manualCommit(), false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!buffer.trim()) return;
    if (editingId) {
      if (busy) return;
      try {
        await onCorrect(editingId, buffer, metadata());
      } catch {
        return;
      }
      setBuffer('');
      setEditingId(undefined);
      setCandidateState('empty');
      clearTacticalCapture();
      inputRef.current?.focus();
      return;
    }
    commitTypedBuffer();
  }

  function edit(
    sourceEventId: string,
    rawCode: string,
    skill: Skill,
    eventMetadata?: ScoutEventMetadata,
  ) {
    const original = workspace.timeline.find(entry => entry.sourceEventId === sourceEventId)?.event;
    const eventTeamId = original?.teamId ?? activeTeamId;
    if (original && rawCode.startsWith('[VISUAL]')) {
      const profile = workspace.profiles.codeProfile;
      const player = workspace.players.find(p=>p.id===original.playerId);
      const tokens: Record<string,string> = {
        player: String(player?.number ?? '').padStart(2,'0'),
        skill: Object.entries(profile.skills).find(([,value])=>value===original.skill)?.[0] ?? '',
        evaluation: Object.entries(profile.evaluations).find(([,value])=>value===original.evaluation)?.[0] ?? '',
        team: (original.teamId===workspace.teams[0].id ? profile.teamCodes?.home : profile.teamCodes?.away) ?? '',
      };
      rawCode = profile.grammar.map(field=>tokens[field] ?? '').join('');
    }
    setActiveTeamId(eventTeamId);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setInputMode('typed');
    inputController.clear();
    setEditingId(sourceEventId);
    setBuffer(rawCode.trim());
    setSpatialCapture(eventMetadata?.spatial ? {
      key: JSON.stringify(['typed', sourceEventId, eventTeamId, rawCode.trim(), captureCycle]),
      value: eventMetadata.spatial,
    } : undefined);
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
    setAttackBlockOutcome(skill === 'attack' ? tacticalValue.blockOutcome(eventMetadata) ?? 'none' : 'none');
    setAttackBlockerIds(skill === 'attack' ? tacticalValue.blockerIds(eventMetadata) ?? [] : []);
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
      clearTacticalCapture();
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
    const target = event.target as HTMLElement;
    if (tactical && tacticalInput && matchesShortcut(event, tacticalInput.shortcuts.quickEditor)) {
      event.preventDefault();
      openQuickEditor();
      return;
    }
    if (target.closest('button,input,select,textarea,[contenteditable="true"],[data-native-keys]')) {
      return;
    }
    if (gestureMode) {
      if (shouldCommitGestureKey(
        event.key,
        event.repeat,
        gestureCommittingRef.current || gestureDraft.status === 'committing',
      )) {
        event.preventDefault();
        void commitCurrentGesture();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        clearGestureDraft();
        return;
      }
    }
    if (!tactical || !tacticalInput || event.defaultPrevented) return;
    const shortcuts = tacticalInput.shortcuts;
    if (matchesShortcut(event, shortcuts.focusScout)) {
      event.preventDefault();
      inputRef.current?.focus();
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

  const workspaceSkill = gestureMode ? gestureSkill : activeCaptureSkill ?? visualSkill;
  const workspaceTeam = workspace.teams.find(
    (team) => team.id === (gestureMode ? gestureTeamId : activeTeamId),
  );

  return (
    <section className="scout-screen" aria-labelledby="scout-title" onKeyDown={handleScreenKeyDown}>
      <h1 id="scout-title" className="sr-only">
        Scout de {workspace.state.metadata.name}
      </h1>
      <MatchContextBar
        workspace={workspace}
        activeTeamId={activeTeamId}
        observedTeamId={gestureMode ? gestureTeamId : activeTeamId}
        busy={busy}
        {...(teamCodes ? { teamCodes } : {})}
        onActiveTeamChange={(teamId) => {
          setActiveTeamId(teamId);
          setSpatialCapture(undefined);
        }}
        onScoreAdjust={onScoreAdjust}
        onAdjustContext={onAdjustContext ? async (input) => { await onAdjustContext(input); clearGestureDraft(); } : undefined}
        onRecoverySkillChange={chooseGestureAction}
        coverageMode={coverageMode}
        onCoverageModeChange={setCoverageMode}
      />
      {setCompleted && !workspace.state.matchCompleted && (
        <NextSetLineupEditor
          key={workspace.state.currentSet}
          workspace={workspace}
          busy={busy}
          onConfirm={onNextSet}
        />
      )}
      <main className={`match-workspace${inputMode === 'visual' ? ' visual-workspace' : ''}${gestureMode ? ' gesture-workspace' : ''}`}>
        <section className="dual-court" aria-label="Lineups da partida">
          {gestureMode ? (
            <>
              <GestureRotationCard workspace={workspace} teamId={teamA.id} />
              <GestureRotationCard workspace={workspace} teamId={teamB.id} />
            </>
          ) : (
            <>
              <CourtLineup
                workspace={workspace}
                teamId={teamA.id}
                side="home"
                busy={busy}
                onSubstitute={onSubstitute}
              />
              <CourtLineup
                workspace={workspace}
                teamId={teamB.id}
                side="away"
                busy={busy}
                onSubstitute={onSubstitute}
              />
            </>
          )}
        </section>
        <section className="capture-workspace" aria-label="Captura do scout">
          <div className="capture-heading">
            <div>
              <p className="eyebrow">Registro da ação</p>
              <h2>
                Ação atual: {SKILL_LABELS[workspaceSkill]}
                <span> — {workspaceTeam?.name ?? 'equipe não definida'}</span>
              </h2>
            </div>
            <span className="capture-heading-context">
              {workspace.state.currentRally.status === 'active' ? 'Rally ativo' : 'Próximo rally'}
            </span>
          </div>
          <ScoutModeSelector
            mode={gestureMode ? 'gesture' : inputMode}
            disabled={editingId !== undefined}
            onChange={(mode) => {
              if (mode === 'gesture') {
                setGestureMode(true);
                setInputMode('visual');
                return;
              }
              setGestureMode(false);
              changeInputMode(mode);
            }}
          />
          {gestureMode && <GestureScout
            phase={gestureSkill}
            skill={gestureSkill}
            teamName={gestureTeam?.name}
            trajectoryReady={gestureDraft.trajectory !== undefined}
            suggestion={gestureSuggestion}
            playerLabels={gesturePlayerLabels}
            playerTitles={gesturePlayerTitles}
            playerNames={Object.fromEntries(workspace.players.map((player) => [player.id, player.name ?? 'Atleta sem nome']))}
            rapid={rapidGesture}
            onRapidChange={setRapidGesture}
            freeBallSelected={gestureSkill === 'free_ball'}
            lineup={gestureLineup}
            rosterIds={workspace.players.filter((player) => player.teamId === gestureTeamId && player.active !== false).map((player) => player.id)}
            liberoIds={workspace.players.filter((player) => player.registeredRole === 'libero' || workspace.state.metadata.liberoPlayerIds?.includes(player.id)).map((player) => player.id)}
            courtTeamNames={[
              workspace.teams.find((team) => team.id === workspace.state.courtOrientation.leftTeamId)?.name ?? 'Esquerda',
              workspace.teams.find((team) => team.id === workspace.state.courtOrientation.rightTeamId)?.name ?? 'Direita',
            ]}
            selectedPlayerId={gestureDraft.playerId}
            playerSelection={gestureDraft.playerSelection}
            outcome={gestureDraft.outcome}
            blockOutcome={gestureDraft.blockOutcome}
            blockerIds={gestureDraft.blockerIds}
            blockers={gestureBlockers}
            committing={busy || gestureDraft.status === 'committing'}
            error={gestureDraft.error}
            draftKey={gestureDraftKey}
            onTrajectory={(spatial) => {
              if (gestureCommittingRef.current || busy) return;
              const next = setGestureTrajectory(gestureDraft, spatial);
              setGestureDraft(next);
              if (rapidGesture && gestureDraft.status !== 'error') void commitCurrentGesture(next);
            }}
            onPlayerSelected={(playerId) => {
              setGestureDraft((current) => selectGesturePlayer(current, playerId));
              const player = playerId
                ? workspace.players.find((candidate) => candidate.id === playerId)
                : undefined;
              if (player) setVisualPlayerNumber(String(player.number));
              else if (!playerId) setVisualPlayerNumber('');
            }}
            onAttackOutcome={(outcome) => {
              setGestureDraft((current) => setGestureOutcome(current, outcome));
            }}
            onBlockOutcome={(outcome) => {
              setGestureDraft((current) => setGestureBlock(current, outcome));
            }}
            onBlockersChange={(ids) => {
              setGestureDraft((current) => setGestureBlockers(current, ids));
            }}
            onQuickAction={(action) => {
              const faultByAction: Partial<Record<QuickAction, FaultType>> = {
                net_touch: 'net_touch',
                invasion: 'invasion',
                double_touch: 'double_touch',
                rotation_error: 'rotation_error',
              };
              const fault = faultByAction[action];
              if (fault) {
                setPendingFault((current) => current === fault ? undefined : fault);
                return;
              }
              setPendingFault(undefined);
              if (action === 'free_ball') chooseGestureAction(gestureSkill === 'free_ball' ? undefined : 'free_ball');
            }}
            faultPointTeamName={workspace.teams.find((team) => team.id !== gestureTeamId)?.name}
            onCancelQuickAction={() => setPendingFault(undefined)}
            onUndo={() => void onUndo()}
            onCommit={() => void commitCurrentGesture()}
          />}
          {!gestureMode && inputMode === 'visual' && <VolleyballVisualScout
            key={`${workspace.state.metadata.id}:${workspace.timeline.length}`}
            workspace={workspace} busy={busy} onRegister={onRegisterVisual}
            onUndo={onUndo} onRedo={onRedo}
            coverage={scoutCoverage(workspace.teams, coverageMode)}
            onEdit={entry => edit(entry.sourceEventId, entry.event.rawCode, entry.event.skill, entry.event.metadata)}
          />}
          {inputMode === 'hybrid' && (
            <VisualScoutForm
              mode={inputMode}
              teams={workspace.teams}
              players={workspace.players}
              teamId={activeTeamId}
              playerNumber={selectedVisualPlayerNumber}
              skill={visualSkill}
              evaluation={selectedVisualEvaluation}
              skills={visualSkills}
              evaluations={visualEvaluations}
              hybridCode={hybridCode}
              busy={busy || hybridSubmitting}
              statusMessage={hybridSubmitStatus}
              errorMessage={hybridSubmitError}
              suggestion={workspace.tacticalRally.expectedNextAction?.skill}
              onTeamChange={(teamId) => {
                setActiveTeamId(teamId);
                setSpatialCapture(undefined);
                setHybridSubmitStatus('');
                setHybridSubmitError('');
                const first = workspace.players.find(
                  (player) => player.teamId === teamId && player.active !== false,
                );
                setVisualPlayerNumber(String(first?.number ?? ''));
              }}
              onPlayerChange={(value) => { setVisualPlayerNumber(value); setSpatialCapture(undefined); setHybridSubmitStatus(''); setHybridSubmitError(''); }}
              onSkillChange={(value) => {
                setVisualSkill(value);
                if (value !== 'attack') {
                  setAttackBlockOutcome('none');
                  setAttackBlockerIds([]);
                }
                setSpatialCapture(undefined); setHybridSubmitStatus(''); setHybridSubmitError('');
              }}
              onEvaluationChange={(value) => { setVisualEvaluation(value); setSpatialCapture(undefined); setHybridSubmitStatus(''); setHybridSubmitError(''); }}
              onHybridCodeChange={(value) => { setHybridCode(value); setSpatialCapture(undefined); setHybridSubmitStatus(''); setHybridSubmitError(''); }}
              blockOutcome={attackBlockOutcome}
              blockerIds={attackBlockerIds}
              blockers={attackBlockers}
              onBlockOutcomeChange={(value) => {
                setAttackBlockOutcome(value);
                if (value === 'none') setAttackBlockerIds([]);
              }}
              onBlockersChange={setAttackBlockerIds}
              onSubmit={(event) => void submitVisual(event)}
            />
          )}
          {tactical && inputMode !== 'visual' && (
            <details
              className="tactical-panel"
              open={inputMode !== 'typed' || editingId !== undefined || quickEditorOpen}
            >
              <summary>{editingId ? 'Corrigir detalhes' : 'Detalhes'}</summary>
              {tacticalInput && (
                <TacticalQuickEditor
                  open={quickEditorOpen}
                  shortcut={tacticalInput.shortcuts.quickEditor}
                  inputRef={quickInputRef}
                  command={quickCommand}
                  error={quickError}
                  onOpen={openQuickEditor}
                  onChange={setQuickCommand}
                  onSubmit={applyQuickCommand}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setQuickEditorOpen(false);
                      setQuickError('');
                      inputRef.current?.focus();
                    }
                  }}
                />
              )}
              <div className="tactical-fields">
                {activeCaptureSkill === 'attack' && inputMode === 'typed' && (
                  <AttackBlockSelector
                    value={attackBlockOutcome}
                    blockerIds={attackBlockerIds}
                    blockers={attackBlockers}
                    onChange={(value) => {
                      setAttackBlockOutcome(value);
                      if (value === 'none') setAttackBlockerIds([]);
                    }}
                    onBlockersChange={setAttackBlockerIds}
                  />
                )}
                <label>
                  {activeCaptureSkill === 'attack' && inputMode === 'typed'
                    ? 'Exceção de origem'
                    : 'Zona de origem'}
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
                  {activeCaptureSkill === 'attack' && inputMode === 'typed' && (
                    <small>
                      Inferida pela posição atual. Altere somente em uma jogada atípica.
                    </small>
                  )}
                </label>
                {(activeCaptureSkill !== 'attack' || inputMode !== 'typed') && (
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
                )}
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
                        list="attack-combination-options"
                        value={attackCombination}
                        onChange={(event) => setAttackCombination(event.target.value)}
                        placeholder="Opcional: INV, CRZ, PIPE..."
                      />
                      <datalist id="attack-combination-options">
                        {ATTACK_COMBINATION_OPTIONS.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.description}
                          </option>
                        ))}
                      </datalist>
                      <small className="combination-glossary">
                        {ATTACK_COMBINATION_OPTIONS.map(
                          (option) => `${option.code}: ${option.description}`,
                        ).join(' · ')}
                      </small>
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
                      <small>Quantidade enfrentada; use avaliação / se o ataque foi abafado.</small>
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
            </details>
          )}
          {spatialCourtOpen && inputMode !== 'visual' && (
            <SpatialCourtInputV2
              key={spatialKey}
              skill={spatialSkill}
              executingLabel={workspace.teams.find((team) => team.id === executingTeamId)?.name ?? 'Executor'}
              isEnabled={!busy}
              onConfirm={(value) => setSpatialCapture({ key: spatialKey, value })}
              onCancel={() => setSpatialCapture(undefined)}
            />
          )}
          {inputMode === 'typed' && (
            <ScoutInput
              inputRef={inputRef}
              value={editingId ? buffer : stream}
              editing={editingId !== undefined}
              candidateState={candidateState}
              placeholder={teamCodes ? '*08A#' : '08A#'}
              onSubmit={(event) => void submit(event)}
              onChange={(event) => {
                if (editingId) {
                  setBuffer(event.target.value);
                  setSpatialCapture(undefined);
                }
                else updateContinuousStream(event.target.value);
              }}
              onKeyDown={handleKeyDown}
            />
          )}
          {inputMode === 'typed' && (
            <ScoutCaptureHelp
              enabled={captureHelpEnabled}
              rawCode={buffer}
              profile={workspace.profiles.codeProfile}
              onToggle={() => setCaptureHelpEnabled((current) => !current)}
            />
          )}
          {tactical && inputMode !== 'visual' && (
            <label className="capture-direction-toggle">
              <input
                type="checkbox"
                checked={captureDirection}
                onChange={(event) => {
                  setCaptureDirection(event.target.checked);
                  setSpatialCapture(undefined);
                }}
              />
              Capturar direção das ações
            </label>
          )}
        </section>
        <EventTimeline
          timeline={workspace.timeline}
          faults={workspace.events.filter(
            (event): event is import('../../../domain/match/events/MatchEvent').FaultEvent =>
              event.type === 'fault' && isHistoryActionActive(event.id, workspace.events),
          )}
          teams={workspace.teams}
          players={workspace.players}
          historyLimit={historyLimit}
          pageSize={HISTORY_PAGE_SIZE}
          busy={busy}
          onUndo={onUndo}
          onRedo={onRedo}
          onEdit={edit}
          onLoadMore={() => setHistoryLimit((current) => current + HISTORY_PAGE_SIZE)}
        />
        <footer className="workspace-footer">
          <span>
            {workspace.profiles.competitionProfile?.name ??
              workspace.profiles.complexityProfile.name}
          </span>
          <strong>{workspace.profiles.codeProfile.name}</strong>
          <button className="button secondary" type="button" onClick={() => void onExport()}>
            Exportar JSON
          </button>
        </footer>
      </main>
    </section>
  );
}

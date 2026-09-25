import { useEffect, useRef, useState } from 'react';
import { footballOrientation } from '../../../../domain/football/FootballOrientation';
import { outcomeName, projectControl, timestampMs, type ActionPressure, validateFootballDraft, type BallControl } from '../../../../domain/football/FootballObservation';
import { effectiveElapsed, formatFootballTimestamp, type FootballOutcome } from '../../../../domain/football/FootballRecorder';
import { statsBombToNormalized, type FootballAction, type CanonicalFootballEvent } from '../../../../domain/football/StatsBombContract';
import { FOOTBALL_SEGMENT_SUGGESTION_RULE_VERSION, selectFootballSegmentSuggestions, type FootballSegmentSuggestion } from '../../../../domain/football/FootballSegmentSuggestions';
import type { MatchWorkspace, ObserveFootballControlInput, RegisterFootballEventInput, SaveFootballAssistedRecordingInput } from '../../../../application/ScoutTrainerService';
import { GestureCourtInput } from '../GestureCourtInput';
import { footballAssistedCandidateKey, footballAssistedSourceRevision, reconcileFootballAssistedCandidates, type FootballAssistedCandidate, type FootballAssistedDetail, type FootballAssistedObservation, type FootballAssistedPressure, type FootballAssistedRecording, type FootballPressureForm } from '../../../../domain/football/FootballAssistedRecording';
import type { FootballScoutScreenProps } from './FootballScoutScreen';
import './FootballMinimalScoutScreen.css';

export interface FootballMinimalScoutScreenProps {
  readonly workspace: MatchWorkspace;
  readonly busy?: boolean;
  readonly onObserve: (observation: ObserveFootballControlInput) => Promise<void>;
  readonly onRegister: (input: RegisterFootballEventInput) => Promise<void>;
  readonly onCorrect: (eventId: string, input: RegisterFootballEventInput) => Promise<void>;
  readonly onUndo: () => Promise<void>;
  readonly onSaveAssisted: (eventId: string, input: SaveFootballAssistedRecordingInput, options?: { readonly silent?: boolean }) => Promise<void>;
  readonly onClock?: FootballScoutScreenProps['onClock'];
  readonly onOrientation?: FootballScoutScreenProps['onOrientation'];
  readonly onScoreAdjust?: FootballScoutScreenProps['onScoreAdjust'];
  readonly onExportBackup?: () => void;
  readonly onExportStatsBomb?: () => void;
  readonly onReview: () => void;
}

type PendingMark = ObserveFootballControlInput & { readonly point?: { readonly x: number; readonly y: number } };
type ShotDraft = { readonly teamId: string; readonly playerId?: string; readonly pressure?: ActionPressure; readonly before: BallControl; readonly origin?: { readonly x: number; readonly y: number }; readonly originResolved?: boolean; readonly capturedElapsedMs: number };
type PendingShot = CanonicalFootballEvent;
type ShotResult = 'goal' | 'saved' | 'off_target' | 'blocked' | 'post';
type DetailKind = 'menu' | 'pressure' | 'exit' | 'structure' | 'turnover' | 'player';
type DetailTarget = { readonly anchor: CanonicalFootballEvent; readonly teamId: string; readonly point?: CanonicalFootballEvent; readonly turnover?: CanonicalFootballEvent };
type DetailPanel = { readonly kind: DetailKind; readonly target: DetailTarget };

function controlName(control: BallControl, workspace: MatchWorkspace) {
  if (control.kind === 'controlled') return `${workspace.teams.find((team) => team.id === control.teamId)?.name ?? 'Equipe'} com a bola`;
  if (control.kind === 'contested') return 'Bola em disputa';
  if (control.kind === 'dead_ball') return 'Bola parada';
  return 'Controle não observado';
}

function resultLabel(outcome: ShotResult) {
  return ({ goal: 'Gol', saved: 'Defendida', off_target: 'Fora', blocked: 'Bloqueada', post: 'Trave' } as const)[outcome];
}

function eventTeamId(event: CanonicalFootballEvent, workspace: MatchWorkspace): string | undefined {
  const observation = event.scout_trainer.observation;
  return observation?.teamId ?? (observation?.after?.kind === 'controlled' ? observation.after.teamId : undefined) ?? (observation?.before?.kind === 'controlled' ? observation.before.teamId : undefined) ?? workspace.teams[(event.team?.id ?? 0) - 1]?.id;
}

function latestDetailTarget(events: readonly CanonicalFootballEvent[], workspace: MatchWorkspace, teamId: string | undefined, period: 1 | 2): DetailTarget | undefined {
  if (!teamId) return;
  const relevant = events.filter(event => event.period === period);
  const anchor = [...relevant].reverse().find(event => eventTeamId(event, workspace) === teamId || event.scout_trainer.observation?.after?.kind === 'controlled' && event.scout_trainer.observation.after.teamId === teamId);
  if (!anchor) return;
  const point = [...relevant].reverse().find(event => eventTeamId(event, workspace) === teamId && Boolean(event.scout_trainer.observation?.position ?? event.location));
  let previousControlledTeamId: string | undefined;
  let turnover: CanonicalFootballEvent | undefined;
  for (const event of relevant) {
    const observation = event.scout_trainer.observation;
    if (observation?.coverage === 'suspended' || observation?.restart || observation?.after?.kind === 'dead_ball') { previousControlledTeamId = undefined; continue; }
    if (observation?.after?.kind !== 'controlled') continue;
    if (observation.after.teamId === teamId && previousControlledTeamId && previousControlledTeamId !== teamId) turnover = event;
    previousControlledTeamId = observation.after.teamId;
  }
  return { anchor, teamId, ...(point ? { point } : {}), ...(turnover ? { turnover } : {}) };
}

function detailLabel(kind: Exclude<DetailKind, 'menu'>): string {
  return ({ pressure: 'Forma da pressão', exit: 'Saída', structure: 'Estrutura da saída', turnover: 'Roubada', player: 'Jogador deste ponto' } as const)[kind];
}

const suggestionReasons: Readonly<Record<FootballSegmentSuggestion['reasons'][number], string>> = {
  before_shot: 'Antes do chute',
  advance_to_attacking_third: 'Avanço para o terço ofensivo',
  movement_into_area: 'Deslocamento para a área',
};

function emptyAssistedRecording(): FootballAssistedRecording {
  return { schema_version: '1.0.0', observations: [], details: [], pressures: [], candidates: [], confirmations: [] };
}

function suggestionRecording(
  recording: FootballAssistedRecording | undefined,
  suggestion: FootballSegmentSuggestion,
  target: CanonicalFootballEvent,
  events: readonly CanonicalFootballEvent[],
  matchId: string,
): FootballAssistedRecording | undefined {
  const current = recording ?? emptyAssistedRecording();
  const staleAutomaticCandidate = current.candidates
    .filter(candidate => candidate.kind === suggestion.kind)
    .some(candidate => candidate.sourceRevisions.some(source => {
      const event = events.find(item => item.id === source.eventId);
      return !event || footballAssistedSourceRevision(event) !== source.revision;
    }));
  // A correction must remain invalid for voluntary review; it cannot be silently reopened by this selector.
  if (staleAutomaticCandidate) return;
  const sourceEvents = suggestion.sourceEventIds.map(id => events.find(event => event.id === id)).filter((event): event is CanonicalFootballEvent => Boolean(event));
  if (sourceEvents.length !== suggestion.sourceEventIds.length) return;
  const observation = current.observations.find(item => item.targetEventId === target.id) ?? {
    id: `suggestion-observation:${target.id}`, matchId, period: target.period, targetEventId: target.id,
    ...(target.possession === undefined ? {} : { possession: target.possession }), controlledTeamId: suggestion.teamId,
    observedAt: target.timestamp,
    ...(target.location ? { position: target.location, positionPrecision: 'point' as const } : { positionPrecision: 'not_observed' as const }),
    provenance: 'operator_observed' as const,
  };
  const proposal: Omit<FootballAssistedCandidate, 'state'> = {
    kind: suggestion.kind,
    targetObservationId: observation.id,
    sourceRevisions: sourceEvents.map(event => ({ eventId: event.id, revision: footballAssistedSourceRevision(event) })),
    reasons: suggestion.reasons.map(reason => suggestionReasons[reason]),
    ruleVersion: FOOTBALL_SEGMENT_SUGGESTION_RULE_VERSION,
    key: footballAssistedCandidateKey({ kind: suggestion.kind, targetObservationId: observation.id, sourceEventIds: sourceEvents.map(event => event.id) }),
  };
  const automatic = current.candidates.filter(candidate => candidate.kind === suggestion.kind);
  const candidates = [
    ...current.candidates.filter(candidate => candidate.kind !== suggestion.kind),
    ...reconcileFootballAssistedCandidates(automatic, [proposal]),
  ].sort((left, right) => left.key.localeCompare(right.key));
  const observations = current.observations.some(item => item.id === observation.id) ? current.observations : [...current.observations, observation];
  const next = { ...current, observations, candidates };
  return JSON.stringify(next) === JSON.stringify(current) ? undefined : next;
}

function suggestionIsAvailable(suggestion: FootballSegmentSuggestion, target: CanonicalFootballEvent | undefined, events: readonly CanonicalFootballEvent[]): boolean {
  const recording = target?.scout_trainer.assisted_recording;
  if (!recording) return true;
  const candidate = recording.candidates.find(item => item.kind === suggestion.kind && item.sourceRevisions.length === suggestion.sourceEventIds.length && item.sourceRevisions.every(source => suggestion.sourceEventIds.includes(source.eventId)));
  if (!candidate) return true;
  return candidate.state === 'pending' && candidate.sourceRevisions.every(source => {
    const event = events.find(item => item.id === source.eventId);
    return event !== undefined && footballAssistedSourceRevision(event) === source.revision;
  });
}

const quickActions: readonly [FootballAction, string, string, FootballOutcome][] = [
  ['pass', 'Passe certo', 'a', 'complete'], ['pass', 'Passe errado', 'q', 'incomplete'],
  ['carry', 'Condução', 'c', 'observed'], ['dribble', 'Drible certo', 'd', 'won'],
  ['dribble', 'Drible errado', 'e', 'lost'], ['duel', 'Desarme ganho', 't', 'won'],
  ['duel', 'Desarme perdido', 'b', 'lost'], ['interception', 'Interceptação', 'i', 'observed'],
  ['ball_recovery', 'Recuperação', 'r', 'observed'], ['loss', 'Perda', 'l', 'observed'], ['foul', 'Falta', 'v', 'observed'],
];
type QuickDraft = { action: FootballAction; outcome: FootballOutcome; location?: { x: number; y: number }; endLocation?: { x: number; y: number }; capturedElapsedMs: number };


/** Live control, actions and players share the same pitch. */
export function FootballMinimalScoutScreen({ workspace, busy = false, onObserve, onRegister, onCorrect, onUndo, onSaveAssisted, onClock, onOrientation, onScoreAdjust, onExportBackup, onExportStatsBomb, onReview }: FootballMinimalScoutScreenProps) {
  const football = workspace.football;
  const control = projectControl(football?.events ?? []);
  const [optimisticControl, setOptimisticControl] = useState<BallControl>(control.ballControl);
  const [pending, setPending] = useState<PendingMark>();
  const [queuedCount, setQueuedCount] = useState(0);
  const [locallyPaused, setLocallyPaused] = useState(false);
  const [shotDraft, setShotDraft] = useState<ShotDraft>();
  const [reviewShot, setReviewShot] = useState<PendingShot>();
  const [detailPanel, setDetailPanel] = useState<DetailPanel>();
  const [quickDraft, setQuickDraft] = useState<QuickDraft>();
  const [quickSaveFailed, setQuickSaveFailed] = useState(false);
  const quickSaveInFlight = useRef(false);
  const [playerId, setPlayerId] = useState('');
  const [ballPressure, setBallPressure] = useState<ActionPressure['kind']>('unknown');
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(false);
  const [feedback, setFeedback] = useState('Toque no campo para registrar a bola.');
  const [now, setNow] = useState(() => Date.now());
  const capturedElapsed = useRef<number | undefined>(undefined);
  const queue = useRef(Promise.resolve());
  const detailSequence = useRef(0);
  const suggestionPreferenceLoadedFor = useRef<string | undefined>(undefined);
  const suggestionSaveInFlight = useRef<string | undefined>(undefined);
  const controlRef = useRef<BallControl>(control.ballControl);
  const lastObservation = football?.events.at(-1)?.scout_trainer?.observation;
  const paused = locallyPaused || lastObservation?.coverage === 'suspended';
  const activeControl = queuedCount ? optimisticControl : control.ballControl;
  const activeTeam = activeControl.kind === 'controlled' ? workspace.teams.find((team) => team.id === activeControl.teamId) : undefined;
  const direction = activeTeam ? footballOrientation(workspace.state.metadata, football?.clock.period ?? 1, activeTeam.id) : undefined;
  const activeSegment = control.ballControl.kind === 'controlled' && control.segments.at(-1)?.teamId === control.ballControl.teamId && control.segments.at(-1)?.period === football?.clock.period ? control.segments.at(-1) : undefined;
  const recentPoints = (activeSegment?.marks ?? []).filter((mark) => mark.position).slice(-5).map((mark) => ({ x: mark.position![0] / 120, y: mark.position![1] / 80 }));
  const segmentPosition = activeSegment?.marks.filter((mark) => mark.position).at(-1);
  const unclassifiedPosition = control.ballControl.kind === 'unknown' && lastObservation?.coverage !== 'suspended' && football?.events.find((event) => event.id === control.position?.eventId)?.period === football?.clock.period && control.position ? { timestamp: control.position.timestamp } : undefined;
  const currentPosition = segmentPosition ?? unclassifiedPosition;
  const positionAge = currentPosition ? Math.max(0, effectiveElapsed(football!.clock, now) - timestampMs(currentPosition.timestamp)) : undefined;
  const pendingShots = (football?.events ?? []).filter((event): event is PendingShot => event.type.id === 16 && !outcomeName(event));
  const detailTarget = latestDetailTarget(football?.events ?? [], workspace, activeControl.kind === 'controlled' ? activeControl.teamId : undefined, football?.clock.period ?? 1);
  const suggestionPreferenceKey = `scout-trainer:football:segment-suggestions:${workspace.state.metadata.id}`;
  const segmentSuggestions = selectFootballSegmentSuggestions(control.segments, {
    pitch: { length: 120, width: 80 },
    orientationFor: (period, teamId) => footballOrientation(workspace.state.metadata, period, teamId),
  });
  const fieldSuggestion = suggestionsEnabled && !shotDraft && !reviewShot && !pendingShots.length && activeSegment
    ? segmentSuggestions.find(suggestion => suggestion.segmentId === activeSegment.id && suggestion.start && suggestion.end && suggestionIsAvailable(suggestion, football?.events.find(event => event.id === suggestion.targetEventId), football?.events ?? []))
    : undefined;
  const reviewCandidateCount = (football?.events ?? []).reduce((count, event) => count + (event.scout_trainer.assisted_recording?.candidates.length ?? 0), 0);

  useEffect(() => {
    if (!queuedCount) controlRef.current = control.ballControl;
  }, [control.ballControl, queuedCount]);

  useEffect(() => {
    if (!football?.clock.running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [football?.clock.running]);

  useEffect(() => {
    function cancelShot(event: KeyboardEvent) {
      if (event.key !== 'Escape' || !shotDraft) return;
      event.preventDefault();
      setShotDraft(undefined);
      setFeedback('Intenção de finalização cancelada.');
    }
    window.addEventListener('keydown', cancelShot);
    return () => window.removeEventListener('keydown', cancelShot);
  }, [shotDraft]);

  useEffect(() => {
    if (suggestionPreferenceLoadedFor.current === suggestionPreferenceKey) return;
    suggestionPreferenceLoadedFor.current = suggestionPreferenceKey;
    try { setSuggestionsEnabled(window.localStorage.getItem(suggestionPreferenceKey) === 'enabled'); }
    catch { setSuggestionsEnabled(false); }
  }, [suggestionPreferenceKey]);

  useEffect(() => {
    if (!suggestionsEnabled || !football || suggestionSaveInFlight.current) return;
    const next = segmentSuggestions
      .map(suggestion => {
        const target = football.events.find(event => event.id === suggestion.targetEventId);
        if (!target) return;
        const recording = suggestionRecording(target.scout_trainer.assisted_recording, suggestion, target, football.events, workspace.state.metadata.id);
        return recording ? { target, recording } : undefined;
      })
      .find((value): value is { target: CanonicalFootballEvent; recording: FootballAssistedRecording } => Boolean(value));
    if (!next) return;
    suggestionSaveInFlight.current = next.target.id;
    void enqueue(async () => {
      try { await onSaveAssisted(next.target.id, { recording: next.recording }, { silent: true }); }
      finally { suggestionSaveInFlight.current = undefined; }
    });
  }, [football, onSaveAssisted, segmentSuggestions, suggestionsEnabled, workspace.state.metadata.id]);

  useEffect(() => {
    function cancelDetails(event: KeyboardEvent) {
      if (event.key !== 'Escape' || !detailPanel) return;
      event.preventDefault();
      setDetailPanel(undefined);
      setFeedback('Detalhe opcional cancelado; nenhum dado foi criado.');
    }
    window.addEventListener('keydown', cancelDetails);
    return () => window.removeEventListener('keydown', cancelDetails);
  }, [detailPanel]);

  function elapsedNow() { return football ? effectiveElapsed(football.clock, Date.now()) : 0; }

  function enqueue(work: () => Promise<void>) {
    setQueuedCount((count) => count + 1);
    const next = queue.current.catch(() => undefined).then(work);
    queue.current = next.catch(() => undefined).finally(() => setQueuedCount((count) => count - 1));
    return queue.current;
  }

  function observe(input: ObserveFootballControlInput, success: string, failure: string, retry?: PendingMark) {
    void enqueue(async () => {
      try { await onObserve(input); setPending(undefined); setFeedback(success); }
      catch { setPending(retry ?? input); setFeedback(failure); throw new Error(failure); }
    });
  }

  function recordControl(after: BallControl) {
    setDetailPanel(undefined);
    const before = controlRef.current;
    if (paused && after.kind !== 'controlled') { setFeedback('Para retomar, informe a equipe que controla a bola.'); return; }
    if (before.kind === 'controlled' && after.kind === 'controlled' && before.teamId === after.teamId) { setFeedback('A mesma equipe continua com a bola; nenhuma nova posse foi criada.'); return; }
    setQuickDraft(undefined);
    setPlayerId('');
    setBallPressure('unknown');
    const restart = before.kind === 'dead_ball' && after.kind === 'controlled';
    controlRef.current = after;
    setOptimisticControl(after);
    setLocallyPaused(false);
    observe({ before, after, coverage: 'continuous', ...(restart ? { restart: true } : {}), capturedElapsedMs: elapsedNow() }, restart ? 'Reinício registrado.' : `${controlName(after, workspace)} registrado.`, 'Não foi possível registrar a troca. Tente novamente.');
  }

  function saveMark(point: { readonly x: number; readonly y: number }, retry?: PendingMark) {
    if (busy || paused || shotDraft) return;
    setDetailPanel(undefined);
    const input = retry ?? { before: controlRef.current, after: controlRef.current, coverage: 'continuous' as const, ...captureContext(), position: [point.x * 120, point.y * 80] as const, precision: 'point' as const, capturedElapsedMs: capturedElapsed.current ?? elapsedNow(), point };
    observe(input, 'Marco salvo.', 'Não foi possível salvar o marco. Ele foi preservado para tentar novamente.', input);
  }

  function armShot() {
    if (activeControl.kind !== 'controlled' || paused || busy || queuedCount) { setFeedback('Informe a equipe com a bola antes de finalizar.'); return; }
    setDetailPanel(undefined);
    setReviewShot(undefined);
    setQuickDraft(undefined);
    setShotDraft({ teamId: activeControl.teamId, playerId: playerId || undefined, pressure: captureContext().pressure, before: controlRef.current, capturedElapsedMs: elapsedNow() });
    setFeedback('Marque a origem da finalização ou escolha “Origem não observada”.');
  }

  function shotInput(draft: ShotDraft, outcome: FootballOutcome, knownAtCapture: boolean): RegisterFootballEventInput {
    const after: BallControl = outcome === 'goal' && knownAtCapture ? { kind: 'dead_ball' } : draft.before;
    return { teamId: draft.teamId, playerId: draft.playerId, action: 'shot', outcome, capturedElapsedMs: draft.capturedElapsedMs, possessionTeamId: draft.teamId, ...(draft.origin ? { location: draft.origin } : {}), observation: { coverage: 'continuous', pressure: draft.pressure, attacksTo: direction, before: draft.before, after, teamId: draft.teamId, outcomeKnownAtCapture: knownAtCapture, context: { validity: draft.origin ? 'observed' : 'partial', outcome: outcome === 'goal' ? 'goal' : 'shot' } } };
  }

  function saveShot(outcome: FootballOutcome) {
    if (!shotDraft || busy || queuedCount) return;
    const draft = shotDraft;
    setShotDraft(undefined);
    if (outcome === 'goal') { controlRef.current = { kind: 'dead_ball' }; setOptimisticControl(controlRef.current); }
    void enqueue(async () => {
      try { await onRegister(shotInput(draft, outcome, outcome !== 'pending')); setPlayerId(''); if (outcome === 'goal') setBallPressure('unknown'); setFeedback(outcome === 'pending' ? 'Chute salvo; resultado para revisar depois.' : `Finalização registrada: ${resultLabel(outcome as ShotResult)}.`); }
      catch { setShotDraft(draft); setFeedback('Não foi possível salvar a finalização. A intenção foi preservada para tentar novamente.'); throw new Error('shot save failed'); }
    });
  }

  function completeOldShot(outcome: ShotResult) {
    if (!reviewShot) return;
    const target = reviewShot, observation = target.scout_trainer.observation ?? {};
    const teamId = observation.teamId ?? workspace.teams[(target.team?.id ?? 1) - 1]?.id;
    if (!teamId) return;
    setReviewShot(undefined);
    const input: RegisterFootballEventInput = {
      teamId, playerId: observation?.playerId, action: 'shot', outcome, capturedElapsedMs: timestampMs(target.timestamp),
      ...(target.location ? { location: { x: statsBombToNormalized(target.location)[0], y: statsBombToNormalized(target.location)[1] } } : {}),
      ...(target.possession_team ? { possessionTeamId: workspace.teams.find((_, index) => index + 1 === target.possession_team?.id)?.id } : {}),
      observation: { ...observation, teamId, outcomeKnownAtCapture: false, context: { validity: target.location ? 'observed' : 'partial', outcome: outcome === 'goal' ? 'goal' : 'shot' } },
    };
    void enqueue(async () => {
      try { await onCorrect(target.id, input); setFeedback(`Resultado do chute de ${target.timestamp.slice(3, 8)}: ${resultLabel(outcome)}.`); }
      catch { setReviewShot(target); setFeedback('Não foi possível completar o chute. Tente novamente.'); throw new Error('shot correction failed'); }
    });
  }

  function nextDetailId(prefix: string, recording: FootballAssistedRecording): string {
    const occupied = new Set([...recording.observations, ...recording.details, ...recording.pressures].map(item => item.id));
    let id: string;
    do { id = `${prefix}:${Date.now().toString(36)}:${++detailSequence.current}`; } while (occupied.has(id));
    return id;
  }

  function observationFor(recording: FootballAssistedRecording, target: DetailTarget): FootballAssistedObservation {
    const existing = recording.observations.find(observation => observation.targetEventId === target.anchor.id);
    if (existing) return existing;
    const position = target.anchor.scout_trainer.observation?.position ?? target.anchor.location;
    return {
      id: nextDetailId('observation', recording), matchId: workspace.state.metadata.id, period: target.anchor.period,
      targetEventId: target.anchor.id, ...(target.anchor.possession !== undefined ? { possession: target.anchor.possession } : {}),
      controlledTeamId: target.teamId, observedAt: target.anchor.timestamp,
      ...(position ? { position, positionPrecision: target.anchor.scout_trainer.observation?.precision ?? 'point' } : { positionPrecision: 'not_observed' }),
      provenance: 'operator_observed',
    };
  }

  function upsertDetail(recording: FootballAssistedRecording, observation: FootballAssistedObservation, type: string, target: CanonicalFootballEvent, value: FootballAssistedDetail['value'], teamId = detailPanel?.target.teamId): readonly FootballAssistedDetail[] {
    const current = recording.details.find(detail => detail.type === type && detail.targetId === target.id);
    const next: FootballAssistedDetail = {
      id: current?.id ?? nextDetailId('detail', recording), observationId: observation.id, type, targetId: target.id, value,
      ...(teamId ? { teamId } : {}), targetObservedAt: target.timestamp, filledAt: new Date().toISOString(), provenance: 'operator_observed',
    };
    return [...recording.details.filter(detail => detail !== current), next];
  }

  function saveOptionalDetail(kind: Exclude<DetailKind, 'menu' | 'structure'>, value: string) {
    const panel = detailPanel;
    if (!panel || busy) return;
    const recording = panel.target.anchor.scout_trainer.assisted_recording ?? { schema_version: '1.0.0' as const, observations: [], details: [], pressures: [], candidates: [], confirmations: [] };
    const observation = observationFor(recording, panel.target);
    let details = recording.details;
    let pressures = recording.pressures;
    if (kind === 'pressure') {
      const form: FootballPressureForm = value === 'free' ? 'none' : value === 'individual' ? 'individual' : value === 'collective' ? 'collective' : 'unknown';
      const prior = pressures.find(pressure => pressure.observationId === observation.id && pressure.kind !== 'fixed_snapshot');
      const point = panel.target.point;
      const position = point?.scout_trainer.observation?.position ?? point?.location;
      const pressure: FootballAssistedPressure = {
        id: prior?.id ?? nextDetailId('pressure', recording), observationId: observation.id, kind: 'detail_form',
        ...(form === 'none' ? {} : { pressingTeamId: workspace.teams.find(team => team.id !== panel.target.teamId)?.id }), ballTeamId: panel.target.teamId,
        height: form === 'none' ? 'not_applicable' : 'not_observed', form,
        ...(point ? { pointEventId: point.id, pointAgeMs: Math.max(0, elapsedNow() - timestampMs(point.timestamp)) } : {}),
        ...(position ? { position } : {}), positionState: point ? 'linked_point' : 'not_observed', provenance: 'operator_observed',
      };
      pressures = [...pressures.filter(pressure => pressure !== prior), pressure];
    } else if (kind === 'exit') {
      details = upsertDetail(recording, observation, 'build_exit', panel.target.anchor, value === 'not_observed' ? 'not_observed' : value, panel.target.teamId);
      if (value === 'transition') details = upsertDetail({ ...recording, details }, observation, 'build_structure', panel.target.anchor, 'not_observed', panel.target.teamId);
    } else if (kind === 'turnover' && panel.target.turnover) {
      details = upsertDetail(recording, observation, 'turnover_kind', panel.target.turnover, value === 'not_observed' ? 'not_observed' : value, panel.target.teamId);
    } else if (kind === 'player' && panel.target.point) {
      details = upsertDetail(recording, observation, 'observed_player', panel.target.point, value === 'not_identified' ? 'not_observed' : value, panel.target.teamId);
    } else return;
    const next: FootballAssistedRecording = { ...recording, observations: recording.observations.some(item => item.id === observation.id) ? recording.observations : [...recording.observations, observation], details, pressures };
    setDetailPanel(undefined);
    void enqueue(async () => {
      try { await onSaveAssisted(panel.target.anchor.id, { recording: next }); setFeedback(`${detailLabel(kind)} registrado.`); }
      catch { setDetailPanel(panel); setFeedback('Não foi possível salvar o detalhe. A escolha foi preservada para tentar novamente.'); throw new Error('optional detail save failed'); }
    });
  }

  function saveStructure(value: string) {
    const panel = detailPanel;
    if (!panel || busy) return;
    const recording = panel.target.anchor.scout_trainer.assisted_recording ?? { schema_version: '1.0.0' as const, observations: [], details: [], pressures: [], candidates: [], confirmations: [] };
    const observation = observationFor(recording, panel.target);
    const details = upsertDetail(recording, observation, 'build_structure', panel.target.anchor, value === 'not_observed' ? 'not_observed' : value, panel.target.teamId);
    const next: FootballAssistedRecording = { ...recording, observations: recording.observations.some(item => item.id === observation.id) ? recording.observations : [...recording.observations, observation], details };
    setDetailPanel(undefined);
    void enqueue(async () => {
      try { await onSaveAssisted(panel.target.anchor.id, { recording: next }); setFeedback('Estrutura da saída registrada.'); }
      catch { setDetailPanel(panel); setFeedback('Não foi possível salvar o detalhe. A escolha foi preservada para tentar novamente.'); throw new Error('optional structure save failed'); }
    });
  }

  function setSuggestionsVisible(visible: boolean) {
    suggestionPreferenceLoadedFor.current = suggestionPreferenceKey;
    setSuggestionsEnabled(visible);
    try { window.localStorage.setItem(suggestionPreferenceKey, visible ? 'enabled' : 'disabled'); }
    catch { /* A local convenience cannot prevent collection. */ }
    setFeedback(visible ? 'Sugestões locais ativadas; a coleta continua igual.' : 'Sugestões locais desativadas; respostas e candidatos foram preservados.');
  }

  function togglePause() {
    if (busy || queuedCount || paused) { if (paused) setFeedback('Selecione a equipe que controla a bola para retomar a coleta.'); return; }
    setDetailPanel(undefined);
    setQuickDraft(undefined);
    setShotDraft(undefined);
    setBallPressure('unknown');
    setPlayerId('');
    const before = controlRef.current;
    setLocallyPaused(true);
    controlRef.current = { kind: 'unknown' };
    setOptimisticControl(controlRef.current);
    observe({ before, after: before, coverage: 'suspended', capturedElapsedMs: elapsedNow() }, 'Coleta pausada.', 'Não foi possível pausar a coleta. Tente novamente.');
  }

  function undo() {
    if (busy || queuedCount || !(football?.events.length)) return;
    void enqueue(async () => {
      try { await onUndo(); setShotDraft(undefined); setReviewShot(undefined); setQuickDraft(undefined); setBallPressure('unknown'); setPlayerId(''); setFeedback('Último registro desfeito.'); }
      catch { setFeedback('Não foi possível desfazer o último registro.'); throw new Error('undo failed'); }
    });
  }

  function captureContext(kind = ballPressure) {
    return { teamId: activeTeam?.id, playerId: playerId || undefined, attacksTo: direction, pressure: { kind, pressedTeamId: activeTeam?.id, ...(kind === 'present_unspecified' ? { pressingTeamId: workspace.teams.find(t => t.id !== activeTeam?.id)?.id } : {}), provenance: 'operator_observed' as const } };
  }

  function recordPressure(kind: ActionPressure['kind']) {
    if (busy || queuedCount || paused || !activeTeam || shotDraft || reviewShot) return;
    const previous = ballPressure;
    setBallPressure(kind);
    void enqueue(async () => {
      try { await onObserve({ before: controlRef.current, after: controlRef.current, coverage: 'continuous', ...captureContext(kind), capturedElapsedMs: elapsedNow() }); setFeedback(kind === 'none' ? 'Sem pressão registrada.' : kind === 'unknown' ? 'Pressão não observada.' : 'Pressão na bola registrada.'); }
      catch { setBallPressure(previous); setFeedback('Não foi possível salvar a pressão. Tente novamente.'); }
    });
  }

  function chooseAction(action: FootballAction, outcome: FootballOutcome) {
    if (!activeTeam || paused || busy || queuedCount || quickSaveInFlight.current || shotDraft || reviewShot) return;
    const draft: QuickDraft = { action, outcome, capturedElapsedMs: elapsedNow() };
    setQuickSaveFailed(false);
    setQuickDraft(draft);
    if (['loss', 'foul'].includes(action)) { saveQuickAction(draft); return; }
    setFeedback(['pass', 'carry'].includes(action) ? 'Marque origem e destino; o último clique salva automaticamente.' : 'Clique no campo para salvar a ação automaticamente.');
  }

  function saveQuickAction(draft: QuickDraft) {
    if (!activeTeam || paused || busy || queuedCount || quickSaveInFlight.current || validateFootballDraft(draft)) return;
    quickSaveInFlight.current = true;
    setQuickSaveFailed(false);
    const before = controlRef.current;
    const after: BallControl = draft.action === 'loss' || draft.outcome === 'lost' || draft.outcome === 'incomplete' ? { kind: 'unknown' } : draft.action === 'foul' ? { kind: 'dead_ball' } : before;
    const input: RegisterFootballEventInput = { ...draft, teamId: activeTeam.id, playerId: playerId || undefined, possessionTeamId: activeTeam.id, observation: { ...captureContext(), before, after, coverage: 'continuous' } };
    void enqueue(async () => {
      try { await onRegister(input); controlRef.current = after; setOptimisticControl(after); setQuickDraft(undefined); setPlayerId(''); if (after.kind !== 'controlled') setBallPressure('unknown'); setFeedback('Ação registrada.'); }
      catch { setQuickDraft(draft); setQuickSaveFailed(true); setFeedback('Não foi possível salvar a ação. Dados preservados para tentar novamente.'); }
      finally { quickSaveInFlight.current = false; }
    });
  }

  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      const key = event.key.toLowerCase();
      if (key === 'Escape') { setQuickDraft(undefined); return; }
      if (key === 'j') { document.querySelector<HTMLSelectElement>('[aria-label="Jogador da ação"]')?.focus(); event.preventDefault(); return; }
      if (key === 'f') { event.preventDefault(); if (!shotDraft && !reviewShot && !queuedCount) armShot(); return; }
      const pressureKeys: Record<string, ActionPressure['kind']> = { p: 'present_unspecified', s: 'none', n: 'unknown' };
      if (pressureKeys[key]) { event.preventDefault(); recordPressure(pressureKeys[key]); return; }
      if (key === 'z') { event.preventDefault(); undo(); return; }
      if ((key === '1' || key === '2') && !shotDraft && !reviewShot && !busy && !queuedCount) { event.preventDefault(); recordControl({ kind: 'controlled', teamId: workspace.teams[Number(key) - 1].id }); return; }
      const action = quickActions.find(([, , shortcut]) => shortcut === key);
      if (action) { event.preventDefault(); chooseAction(action[0], action[3]); }
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  });

  const resultOptions: readonly ShotResult[] = ['goal', 'saved', 'off_target', 'blocked', 'post'];
  const displayedShot = shotDraft || reviewShot;

  return (
    <section className="scout-screen football-minimal-screen" aria-labelledby="football-minimal-title">
      <header className="football-minimal-header">
        <div className="football-minimal-score" aria-label="Equipes e placar"><span>{workspace.teams[0].name}</span><strong>{football?.score.teamA ?? 0} × {football?.score.teamB ?? 0}</strong><span>{workspace.teams[1].name}</span></div>
        <div className="football-minimal-clock" aria-label="Período e tempo"><span>{football?.clock.period ?? 1}º período · {football ? formatFootballTimestamp(effectiveElapsed(football.clock, now)).slice(3, 8) : '00:00'}</span>{onClock && <button type="button" disabled={busy || queuedCount > 0} onClick={() => void onClock({ kind: football?.clock.running ? 'pause' : 'start' })}>{football?.clock.running ? 'Pausar relógio' : 'Iniciar relógio'}</button>}<button type="button" onClick={togglePause} disabled={busy || queuedCount > 0}>{paused ? 'Retomar coleta' : 'Pausar coleta'}</button></div>
      </header>

      <div className="football-minimal-field-head"><strong id="football-minimal-title">{paused ? 'Coleta pausada' : shotDraft ? 'Finalização em preparação' : controlName(activeControl, workspace)}</strong><span>{activeTeam && direction ? `${activeTeam.name} ataca ${direction === 'x120' ? '→' : '←'}` : 'Direção não observada'}</span></div>
      <GestureCourtInput
        key={quickDraft ? `${quickDraft.action}:${quickDraft.outcome}` : shotDraft ? 'shot' : 'mark'} sport="football" captureMode={quickDraft && ['pass', 'carry'].includes(quickDraft.action) ? 'trajectory' : 'point'} pointHint={quickDraft ? 'Clique para registrar a ação automaticamente.' : shotDraft ? 'Marque a origem da finalização.' : 'Toque no campo para registrar a bola.'} disabledHint="Coleta pausada. Retome informando a equipe com a bola."
        isEnabled={!busy && !paused && queuedCount === 0} flipped={direction === 'x0'} recentPoints={recentPoints}
        {...(fieldSuggestion?.start && fieldSuggestion.end ? { suggestedSegment: { origin: { x: fieldSuggestion.start[0] / 120, y: fieldSuggestion.start[1] / 80 }, destination: { x: fieldSuggestion.end[0] / 120, y: fieldSuggestion.end[1] / 80 } } } : {})}
        teamNames={direction === 'x0' ? [workspace.teams[1].name, workspace.teams[0].name] : [workspace.teams[0].name, workspace.teams[1].name]}
        onCaptureStart={() => { capturedElapsed.current = elapsedNow(); }}
        onCancel={() => { setQuickDraft(undefined); if (shotDraft) { setShotDraft(undefined); setFeedback('Intenção de finalização cancelada.'); } }}
        onTrajectory={(trajectory) => { const point = { x: trajectory.origin.x, y: trajectory.origin.y }; if (shotDraft) { setShotDraft({ ...shotDraft, origin: point, originResolved: true, capturedElapsedMs: capturedElapsed.current ?? shotDraft.capturedElapsedMs }); setFeedback('Escolha o resultado da finalização.'); } else if (quickDraft) { const draft = { ...quickDraft, location: point, ...(['pass', 'carry'].includes(quickDraft.action) ? { endLocation: { x: trajectory.destination.x, y: trajectory.destination.y } } : {}), capturedElapsedMs: capturedElapsed.current ?? quickDraft.capturedElapsedMs }; setQuickDraft(draft); saveQuickAction(draft); } else saveMark(point); }}
      />

      <div className="football-minimal-toolbar" aria-label="Controle observado">
        <span>Controle</span>
        {workspace.teams.map((team) => <button type="button" key={team.id} disabled={busy || queuedCount > 0 || !!shotDraft} aria-pressed={activeControl.kind === 'controlled' && activeControl.teamId === team.id} onClick={() => recordControl({ kind: 'controlled', teamId: team.id })}>{team.name}</button>)}
        <button type="button" disabled={busy || queuedCount > 0 || !!shotDraft || paused} aria-pressed={activeControl.kind === 'contested'} onClick={() => recordControl({ kind: 'contested' })}>Disputa</button>
        <button type="button" disabled={busy || queuedCount > 0 || !!shotDraft || paused} aria-pressed={activeControl.kind === 'dead_ball'} onClick={() => recordControl({ kind: 'dead_ball' })}>Parada</button>
        <button type="button" disabled={busy || queuedCount > 0 || !!shotDraft || paused} aria-pressed={activeControl.kind === 'unknown'} onClick={() => recordControl({ kind: 'unknown' })}>?</button>
        <button type="button" className="football-minimal-shot" disabled={busy || queuedCount > 0 || paused || activeControl.kind !== 'controlled'} onClick={armShot}>Finalizar</button>
        <button type="button" className="football-minimal-quiet" disabled={busy || queuedCount > 0 || !(football?.events.length)} onClick={undo}>Desfazer</button>
      </div>

      <div className="football-minimal-result-space" aria-label="Resultado contextual da finalização">
        {shotDraft && !shotDraft.originResolved && <button type="button" className="football-minimal-quiet" onClick={() => { setShotDraft({ ...shotDraft, originResolved: true }); setFeedback('Origem não observada; escolha o resultado ou deixe para depois.'); }}>Origem não observada</button>}
        {shotDraft?.originResolved && <><span>{shotDraft.origin ? 'Resultado da finalização' : 'Escolha o resultado ou deixe para depois'}</span>{resultOptions.map((outcome) => <button key={outcome} type="button" disabled={busy || queuedCount > 0} onClick={() => saveShot(outcome)}>{resultLabel(outcome)}</button>)}<button type="button" className="football-minimal-quiet" disabled={busy || queuedCount > 0} onClick={() => saveShot('pending')}>Depois</button></>}
        {!shotDraft && reviewShot && <><span>Completar chute de {reviewShot.timestamp.slice(3, 8)}</span>{resultOptions.map((outcome) => <button key={outcome} type="button" onClick={() => completeOldShot(outcome)}>{resultLabel(outcome)}</button>)}</>}
        {!displayedShot && pendingShots.length > 0 && <><span>{pendingShots.length} chute{pendingShots.length === 1 ? '' : 's'} pendente{pendingShots.length === 1 ? '' : 's'}</span>{pendingShots.map((event) => <button type="button" key={event.id} className="football-minimal-quiet" onClick={() => setReviewShot(event)}>Chute {event.timestamp.slice(3, 8)}</button>)}</>}
      </div>
      <div className="football-minimal-fixed-pressure" aria-label="Pressão sobre a bola">
        <strong>Sobre a bola</strong>
        {([['present_unspecified', 'Pressão na bola', 'p'], ['none', 'Sem pressão', 's'], ['unknown', 'Não observada', 'n']] as const).map(([value, label, key]) => <button key={value} type="button" aria-pressed={ballPressure === value} aria-keyshortcuts={key} disabled={busy || queuedCount > 0 || paused || !activeTeam || !!shotDraft || !!reviewShot} onClick={() => recordPressure(value)}>{label} <kbd>{key.toUpperCase()}</kbd></button>)}
        <small>Vale para os próximos registros até mudar; reinicia ao trocar o controle ou reabrir o registro.</small>
      </div>
      <div className="football-quick-actions" aria-label="Registro de ação e jogador">
        <label>Jogador<select aria-label="Jogador da ação" value={playerId} disabled={!activeTeam || busy || !!shotDraft || queuedCount > 0} onChange={e => setPlayerId(e.target.value)}><option value="">Não identificado</option>{workspace.players.filter(p => p.teamId === activeTeam?.id && p.active !== false).map(p => <option key={p.id} value={p.id}>#{p.number}{p.name ? ` ${p.name}` : ''}</option>)}</select></label>
        <div className="football-quick-action-buttons">{quickActions.map(([action, label, key, outcome]) => <button type="button" key={key} aria-pressed={quickDraft?.action === action && quickDraft.outcome === outcome} aria-keyshortcuts={key} disabled={!activeTeam || busy || paused || queuedCount > 0 || !!shotDraft || !!reviewShot} onClick={() => chooseAction(action, outcome)}>{label} <kbd>{key.toUpperCase()}</kbd></button>)}</div>
        {quickDraft && <div className="football-quick-result"><strong>{quickActions.find(([action, , , outcome]) => action === quickDraft.action && outcome === quickDraft.outcome)?.[1]}</strong><span>{quickSaveFailed ? 'O registro não foi salvo.' : queuedCount ? 'Salvando…' : ['pass', 'carry'].includes(quickDraft.action) ? 'Origem → destino: salva no último clique.' : 'Clique no campo: salva na hora.'}</span>{quickSaveFailed && <button type="button" disabled={busy || queuedCount > 0} onClick={() => saveQuickAction(quickDraft)}>Tentar salvar ação</button>}<button type="button" className="football-minimal-quiet" disabled={queuedCount > 0} onClick={() => setQuickDraft(undefined)}>Cancelar</button></div>}
        <small>Salva automaticamente · F: finalizar · J: jogador · 1/2: equipe · Z: desfazer · Esc: cancelar</small>
      </div>
      <div className="football-minimal-context" aria-live="polite"><span>{currentPosition ? `Última posição observada há ${Math.floor((positionAge ?? 0) / 1000)} s` : control.position ? 'Última posição pertence a um segmento anterior' : 'Ainda sem posição observada'}</span><span>{feedback}</span>{pending && <button type="button" onClick={() => saveMark(pending.point ?? { x: (pending.position?.[0] ?? 60) / 120, y: (pending.position?.[1] ?? 40) / 80 }, pending)} disabled={busy}>Tentar salvar marco</button>}<button type="button" className="football-minimal-quiet football-minimal-details-entry" aria-pressed={suggestionsEnabled} onClick={() => setSuggestionsVisible(!suggestionsEnabled)}>Sugerir trechos para completar</button>{reviewCandidateCount > 0 && <button type="button" className="football-minimal-quiet football-minimal-details-entry" onClick={onReview}>Revisar sugestões ({reviewCandidateCount})</button>}<button type="button" className="football-minimal-quiet football-minimal-details-entry" aria-expanded={Boolean(detailPanel)} aria-controls="football-optional-details" disabled={busy || !detailTarget || !!shotDraft || !!reviewShot} onClick={() => detailTarget && setDetailPanel({ kind: 'menu', target: detailTarget })}>Detalhes</button></div>
      {detailPanel && <div id="football-optional-details" className="football-minimal-details" aria-label="Detalhe opcional">
        {detailPanel.kind === 'menu' && <><strong>Detalhes opcionais</strong><button type="button" onClick={() => setDetailPanel({ ...detailPanel, kind: 'pressure' })}>Pressão</button><button type="button" onClick={() => setDetailPanel({ ...detailPanel, kind: 'exit' })}>Saída</button><button type="button" disabled={!detailPanel.target.turnover} onClick={() => setDetailPanel({ ...detailPanel, kind: 'turnover' })}>Roubada</button><button type="button" disabled={!detailPanel.target.point} onClick={() => setDetailPanel({ ...detailPanel, kind: 'player' })}>Jogador</button></>}
        {detailPanel.kind === 'pressure' && <><strong>{detailLabel('pressure')} · {workspace.teams.find(team => team.id === detailPanel.target.teamId)?.name}</strong><button type="button" onClick={() => saveOptionalDetail('pressure', 'free')}>Livre</button><button type="button" onClick={() => saveOptionalDetail('pressure', 'individual')}>Individual</button><button type="button" onClick={() => saveOptionalDetail('pressure', 'collective')}>Coletiva</button><button type="button" onClick={() => saveOptionalDetail('pressure', 'not_observed')}>Não observada</button></>}
        {detailPanel.kind === 'exit' && <><strong>{detailLabel('exit')}</strong><button type="button" onClick={() => saveOptionalDetail('exit', 'short')}>Curta</button><button type="button" onClick={() => saveOptionalDetail('exit', 'direct')}>Direta</button><button type="button" onClick={() => saveOptionalDetail('exit', 'mixed')}>Mista</button><button type="button" onClick={() => saveOptionalDetail('exit', 'transition')}>Transição</button><button type="button" onClick={() => saveOptionalDetail('exit', 'not_observed')}>Não observada</button><button type="button" className="football-minimal-quiet" disabled={!detailPanel.target.anchor.scout_trainer.assisted_recording?.details.some(detail => detail.type === 'build_exit' && detail.targetId === detailPanel.target.anchor.id && detail.value !== 'transition')} onClick={() => setDetailPanel({ ...detailPanel, kind: 'structure' })}>Estrutura…</button></>}
        {detailPanel.kind === 'structure' && <><strong>{detailLabel('structure')}</strong><button type="button" onClick={() => saveStructure('2+2')}>2+2</button><button type="button" onClick={() => saveStructure('3+1')}>3+1</button><button type="button" onClick={() => saveStructure('3+2')}>3+2</button><button type="button" onClick={() => saveStructure('other')}>Outra</button><button type="button" onClick={() => saveStructure('not_observed')}>Não observada</button></>}
        {detailPanel.kind === 'turnover' && <><strong>{detailLabel('turnover')}</strong><button type="button" onClick={() => saveOptionalDetail('turnover', 'tackle')}>Desarme</button><button type="button" onClick={() => saveOptionalDetail('turnover', 'interception')}>Interceptação</button><button type="button" onClick={() => saveOptionalDetail('turnover', 'loose_ball')}>Bola solta</button><button type="button" onClick={() => saveOptionalDetail('turnover', 'opponent_error')}>Erro adversário</button><button type="button" onClick={() => saveOptionalDetail('turnover', 'not_observed')}>Não observado</button></>}
        {detailPanel.kind === 'player' && <><strong>{detailLabel('player')} · {workspace.teams.find(team => team.id === detailPanel.target.teamId)?.name}</strong>{workspace.players.filter(player => player.teamId === detailPanel.target.teamId && player.active !== false).map(player => <button type="button" key={player.id} onClick={() => saveOptionalDetail('player', player.id)}>#{player.number}{player.name ? ` ${player.name}` : ''}</button>)}<button type="button" onClick={() => saveOptionalDetail('player', 'not_identified')}>Não identificado</button></>}
        <button type="button" className="football-minimal-quiet" onClick={() => { setDetailPanel(undefined); setFeedback('Detalhe opcional fechado; nenhum dado foi criado.'); }}>Fechar</button>
      </div>}
      <details className="football-match-settings"><summary>Ajustes da partida</summary>
        {onClock && <div><button type="button" disabled={busy || queuedCount > 0 || !!shotDraft || !!quickDraft} onClick={() => { setPlayerId(''); setBallPressure('unknown'); void onClock({ kind: 'period', period: football?.clock.period === 2 ? 1 : 2 }); }}>Trocar período</button><button type="button" disabled={busy} onClick={() => { const value = window.prompt('Minutos do período', String(Math.floor(elapsedNow() / 60000))); if (value !== null && value.trim() && Number.isFinite(Number(value)) && Number(value) >= 0) void onClock({ kind: 'adjust', elapsedMs: Number(value) * 60000 }); }}>Ajustar tempo</button></div>}
        {workspace.teams.map(team => <div key={team.id}><strong>{team.name}</strong>{onOrientation && <label>Direção de ataque<select aria-label={`Direção de ataque de ${team.name}`} value={footballOrientation(workspace.state.metadata, football?.clock.period ?? 1, team.id) ?? ''} onChange={e => void onOrientation(football?.clock.period ?? 1, team.id, (e.target.value || undefined) as 'x120' | 'x0' | undefined)}><option value="">Não observada</option><option value="x120">→ Direita</option><option value="x0">← Esquerda</option></select></label>}{onScoreAdjust && <><button type="button" disabled={busy} onClick={() => void onScoreAdjust(team.id, -1)}>−1 gol</button><button type="button" disabled={busy} onClick={() => void onScoreAdjust(team.id, 1)}>+1 gol</button></>}</div>)}
        {onExportBackup && <button type="button" onClick={onExportBackup}>Exportar backup</button>}{onExportStatsBomb && <button type="button" onClick={onExportStatsBomb}>Exportar StatsBomb</button>}
      </details>
    </section>
  );
}

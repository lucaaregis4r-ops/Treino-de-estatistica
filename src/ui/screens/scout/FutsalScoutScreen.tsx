import { useCallback, useEffect, useRef, useState } from 'react';
import type { MatchWorkspace } from '../../../application/ScoutTrainerService';
import { futsalAttackDirection } from '../../../domain/futsal/FutsalOrientation';
import { effectiveFutsalElapsed, formatFutsalRemaining, type FutsalClockState } from '../../../domain/futsal/FutsalClock';
import type { FutsalAttackingStructure, FutsalControlCoverage, FutsalDefensiveContext, FutsalFact, FutsalFactDraft, FutsalOrganization, FutsalRestart, FutsalShotOutcome } from '../../../domain/futsal/FutsalScout';
import type { FutsalClockCommand } from '../../../domain/match/events/MatchEvent';
import { GestureCourtInput } from './GestureCourtInput';
import './FutsalScoutScreen.css';

const restartLabels: Record<FutsalRestart, string> = {
  kick_in: 'Lateral', corner: 'Escanteio', goal_clearance: 'Arremesso de meta', free_kick: 'Tiro livre',
  ten_meter_kick: 'Tiro de 10 m', penalty: 'Pênalti', kick_off: 'Saída', other: 'Outro', unknown: 'Desconhecido',
};
const outcomeLabels: Record<FutsalShotOutcome, string> = {
  pending: 'Pendente', goal: 'Gol confirmado', saved: 'Defendida', blocked: 'Bloqueada', off_target: 'Fora', post: 'Trave',
};
const organizationLabels: Record<FutsalOrganization, string> = { positional: 'Ataque posicional', transition: 'Transição / contra-ataque', set_piece: 'Bola parada', other: 'Outra organização', not_observed: 'Não observado' };
const defensiveLabels: Record<FutsalDefensiveContext, string> = { pressure: 'Pressão na bola', block_high: 'Bloco alto', block_medium: 'Bloco médio', block_low: 'Bloco baixo', recovery: 'Recuperação observada', goalkeeper_save: 'Defesa do goleiro', not_observed: 'Não observado' };
const structureLabels: Record<FutsalAttackingStructure, string> = { '3-1': '3–1', '4-0': '4–0', '2-2': '2–2', other: 'Outra estrutura', not_observed: 'Não observado' };
const numericalSituationLabels = { regular: 'Igualdade numérica observada', own_flying_goalkeeper: 'Goleiro-linha próprio', opponent_flying_goalkeeper: 'Goleiro-linha adversário', short_handed: 'Inferioridade / expulsão observada', other: 'Outra situação', not_observed: 'Não observado' } as const;

function elapsedAtInteraction(clock: FutsalClockState) { return effectiveFutsalElapsed(clock, Date.now()); }

export function FutsalScoutScreen({ workspace, onOrientation, onClock, onFact, onCorrectFact, onUndoFact, busy = false }: {
  readonly workspace: MatchWorkspace;
  readonly onOrientation: (period: 1 | 2, teamId: string, direction: 'x120' | 'x0' | undefined) => Promise<void>;
  readonly onClock: (change: { readonly kind: FutsalClockCommand; readonly elapsedMs?: number; readonly reason?: string; readonly resumeAfterReconciliation?: boolean }) => Promise<void>;
  readonly onFact: (draft: FutsalFactDraft, capturedElapsedMs?: number) => Promise<void>;
  readonly onCorrectFact: (factId: string, draft: FutsalFactDraft) => Promise<void>;
  readonly onUndoFact: (factId?: string) => Promise<void>;
  readonly busy?: boolean;
}) {
  const clock = workspace.futsalClock!;
  const [period, setPeriod] = useState<1 | 2>(clock.period);
  const [now, setNow] = useState(() => Date.now());
  const [clockSaving, setClockSaving] = useState(false);
  const [clockError, setClockError] = useState('');
  const [factError, setFactError] = useState('');
  const [adjustMinutes, setAdjustMinutes] = useState<string | undefined>();
  const [adjustReason, setAdjustReason] = useState('');
  const [teamId, setTeamId] = useState(workspace.teams[0].id);
  const [beneficiaryTeamId, setBeneficiaryTeamId] = useState(workspace.teams[0].id);
  const [playerId, setPlayerId] = useState('');
  const [restart, setRestart] = useState<FutsalRestart>('kick_in');
  const [accumulated, setAccumulated] = useState(true);
  const [controlCoverage, setControlCoverage] = useState<FutsalControlCoverage>('continuous');
  const [pendingFact, setPendingFact] = useState<FutsalFactDraft | null>(null);
  const [shotLocation, setShotLocation] = useState<{ readonly origin?: { readonly x: number; readonly y: number }; readonly destination?: { readonly x: number; readonly y: number }; readonly capturedElapsedMs: number } | null>(null);
  const [retryFact, setRetryFact] = useState<{ readonly draft: FutsalFactDraft; readonly capturedElapsedMs: number } | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [goalkeeperOpen, setGoalkeeperOpen] = useState(false);
  const [substitutionOpen, setSubstitutionOpen] = useState(false);
  const [substitutionTeamId, setSubstitutionTeamId] = useState(workspace.teams[0].id);
  const [playerOutId, setPlayerOutId] = useState('');
  const [playerInId, setPlayerInId] = useState('');
  const [substitutionPartial, setSubstitutionPartial] = useState(false);
  const [substitutionCorrectionFactId, setSubstitutionCorrectionFactId] = useState<string>();
  const [compositionTeamId, setCompositionTeamId] = useState(workspace.teams[0].id);
  const [compositionPlayerIds, setCompositionPlayerIds] = useState<string[]>([]);
  const [compositionPartial, setCompositionPartial] = useState(false);
  const [compositionShortHanded, setCompositionShortHanded] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewScope, setReviewScope] = useState<'event' | 'interval'>('event');
  const [reviewTeamId, setReviewTeamId] = useState('');
  const [reviewTargetFactId, setReviewTargetFactId] = useState('');
  const [reviewStartFactId, setReviewStartFactId] = useState('');
  const [reviewEndFactId, setReviewEndFactId] = useState('');
  const [reviewOrganization, setReviewOrganization] = useState<FutsalOrganization | ''>('');
  const [reviewRestart, setReviewRestart] = useState<FutsalRestart | ''>('');
  const [reviewNumericalSituation, setReviewNumericalSituation] = useState<'regular' | 'own_flying_goalkeeper' | 'opponent_flying_goalkeeper' | 'short_handed' | 'other' | 'not_observed' | ''>('');
  const [reviewDefense, setReviewDefense] = useState<FutsalDefensiveContext | ''>('');
  const [reviewStructure, setReviewStructure] = useState<FutsalAttackingStructure | ''>('');
  const [reviewNote, setReviewNote] = useState('');
  const [editingAnnotationId, setEditingAnnotationId] = useState<string>();
  const commandInFlight = useRef(false);
  const factInFlight = useRef(false);
  const boundaryCommandSent = useRef(false);
  const capturedElapsed = useRef(0);
  const elapsedMs = effectiveFutsalElapsed(clock, now);
  const adjustMinuteValue = adjustMinutes ?? String((clock.elapsedMs / 60_000).toFixed(2));
  const facts = workspace.futsalScout?.facts ?? [];
  const score = workspace.futsalScout?.score ?? {};
  const fouls = workspace.futsalScout?.accumulatedFouls ?? {};
  const compositions = workspace.futsalScout?.compositions ?? {};
  const flyingGoalkeeperTeams = workspace.futsalScout?.flyingGoalkeeperTeams ?? [];
  const clockFinished = ['period_finished', 'match_finished'].includes(clock.status);
  const clockUnreconciled = clock.status === 'needs_reconciliation';

  const submitClock = useCallback(async (change: { readonly kind: FutsalClockCommand; readonly elapsedMs?: number; readonly reason?: string; readonly resumeAfterReconciliation?: boolean }) => {
    if (commandInFlight.current || busy) return;
    commandInFlight.current = true; setClockSaving(true); setClockError('');
    try {
      await onClock(change);
      setNow(Date.now());
      if (change.kind === 'advance_period') setPeriod(2);
      if (change.kind === 'adjust' || change.kind === 'advance_period') setAdjustMinutes(undefined);
      if (change.kind !== 'finish_period') boundaryCommandSent.current = false;
    }
    catch { setClockError('Não foi possível salvar o relógio. O estado anterior foi preservado. Tente novamente.'); }
    finally { commandInFlight.current = false; setClockSaving(false); }
  }, [busy, onClock]);

  useEffect(() => {
    if (clock.status !== 'running') { boundaryCommandSent.current = false; return; }
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [clock.status, clock.referenceTimestamp]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (event.key.toLowerCase() !== 't' || event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || event.isComposing || target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], dialog')) return;
      event.preventDefault();
      if (busy || clockSaving || clockUnreconciled || clockFinished || clock.status === 'awaiting_final_kick') return;
      void submitClock({ kind: clock.status === 'running' ? 'pause' : 'start' });
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, clock.status, clockSaving, clockFinished, clockUnreconciled, submitClock]);

  useEffect(() => {
    if (busy || clock.status !== 'running' || elapsedMs < clock.periodDurationMs || boundaryCommandSent.current) return;
    boundaryCommandSent.current = true;
    void submitClock({ kind: 'finish_period' });
  }, [busy, clock.status, clock.elapsedMs, clock.referenceTimestamp, clock.periodDurationMs, elapsedMs, submitClock]);

  async function recordFact(draft: FutsalFactDraft, captured?: number) {
    if (busy || factInFlight.current) return false;
    factInFlight.current = true;
    const capturedElapsedMs = captured ?? elapsedAtInteraction(clock);
    setFactError('');
    try {
      await onFact(draft, capturedElapsedMs);
      setPendingFact(null);
      setShotLocation(null);
      setRetryFact(null);
      const nextTeamId = draft.kind === 'tackle' ? draft.winningTeamId : draft.kind === 'control' && draft.state === 'team' ? draft.controlledTeamId : undefined;
      if (nextTeamId) { setTeamId(nextTeamId); setBeneficiaryTeamId(nextTeamId); setPlayerId(''); }
      return true;
    }
    catch { setRetryFact({ draft, capturedElapsedMs }); setFactError('Não foi possível salvar. O registro foi preservado para tentar novamente.'); return false; }
    finally { factInFlight.current = false; }
  }

  async function saveSubstitution() {
    const draft: FutsalFactDraft = { kind: 'substitution', teamId: substitutionTeamId, ...(playerOutId ? { playerOutId } : {}), ...(playerInId ? { playerInId } : {}), certainty: substitutionPartial ? 'partial' : 'complete', observation: substitutionPartial ? 'partial' : 'observed' };
    if (!substitutionCorrectionFactId) { if (await recordFact(draft)) setSubstitutionOpen(false); return; }
    setFactError('');
    try { await onCorrectFact(substitutionCorrectionFactId, draft); setSubstitutionCorrectionFactId(undefined); setSubstitutionOpen(false); }
    catch { setFactError('Não foi possível salvar a correção. O registro anterior foi preservado.'); }
  }

  async function saveTacticalAnnotation() {
    const draft: FutsalFactDraft = { kind: 'tactical_annotation', scope: reviewScope, ...(reviewTeamId ? { teamId: reviewTeamId } : {}), ...(reviewScope === 'event' ? { targetFactId: reviewTargetFactId } : { startFactId: reviewStartFactId, endFactId: reviewEndFactId }), ...(reviewOrganization ? { organization: reviewOrganization } : {}), ...(reviewRestart ? { restartOrigin: reviewRestart } : {}), ...(reviewNumericalSituation ? { numericalSituation: reviewNumericalSituation } : {}), ...(reviewDefense ? { defensiveContext: reviewDefense } : {}), ...(reviewStructure ? { attackingStructure: reviewStructure } : {}), ...(reviewNote.trim() ? { note: reviewNote.trim() } : {}), observation: 'observed' };
    setFactError('');
    try {
      if (editingAnnotationId) await onCorrectFact(editingAnnotationId, draft);
      else if (!(await recordFact(draft))) return;
      setEditingAnnotationId(undefined); setReviewOrganization(''); setReviewRestart(''); setReviewNumericalSituation(''); setReviewDefense(''); setReviewStructure(''); setReviewNote('');
    } catch { setFactError('Não foi possível salvar a revisão. O histórico original foi preservado.'); }
  }

  async function removeTacticalAnnotation(fact: Extract<FutsalFact, { kind: 'tactical_annotation' }>) {
    try {
      await onCorrectFact(fact.id, { kind: 'tactical_annotation', scope: fact.scope, ...(fact.teamId ? { teamId: fact.teamId } : {}), ...(fact.targetFactId ? { targetFactId: fact.targetFactId } : {}), ...(fact.startFactId ? { startFactId: fact.startFactId } : {}), ...(fact.endFactId ? { endFactId: fact.endFactId } : {}), ...(fact.organization ? { organization: fact.organization } : {}), ...(fact.restartOrigin ? { restartOrigin: fact.restartOrigin } : {}), ...(fact.numericalSituation ? { numericalSituation: fact.numericalSituation } : {}), ...(fact.defensiveContext ? { defensiveContext: fact.defensiveContext } : {}), ...(fact.attackingStructure ? { attackingStructure: fact.attackingStructure } : {}), ...(fact.note ? { note: fact.note } : {}), removed: true, observation: fact.observation });
    } catch { setFactError('Não foi possível remover o contexto. A anotação anterior foi preservada.'); }
  }

  function queueControl(state: 'team' | 'contested' | 'dead_ball' | 'unknown', controlledTeamId?: string) {
    if (retryFact) return;
    setPendingFact(null);
    setShotLocation(null);
    void recordFact({ kind: 'control', state, ...(controlledTeamId ? { controlledTeamId } : {}), coverage: controlCoverage, observation: 'observed' });
  }
  function queueShot() {
    if (retryFact) return;
    setShotLocation(null);
    setPendingFact({ kind: 'shot', shootingTeamId: teamId, outcome: 'pending', observation: 'observed' });
  }
  function saveShot(outcome: FutsalShotOutcome) {
    if (pendingFact?.kind !== 'shot' || !shotLocation) return;
    void recordFact({ kind: 'shot', shootingTeamId: teamId, ...(playerId ? { playerId } : {}), outcome, ...(outcome === 'goal' ? { beneficiaryTeamId } : {}), ...(shotLocation.origin ? { position: shotLocation.origin } : {}), ...(shotLocation.destination ? { destination: shotLocation.destination } : {}), observation: shotLocation.origin ? 'observed' : 'partial' }, shotLocation.capturedElapsedMs);
  }
  function currentPendingDraft(): FutsalFactDraft | null {
    if (!pendingFact) return null;
    if (pendingFact.kind === 'restart') return { kind: 'restart', restart, teamId, observation: 'observed' };
    if (pendingFact.kind === 'foul') return { kind: 'foul', offendingTeamId: teamId, ...(playerId ? { playerId } : {}), accumulated, observation: 'observed' };
    return pendingFact;
  }
  function captureCourt(origin: { readonly x: number; readonly y: number }, destination: { readonly x: number; readonly y: number }, captured: number) {
    if (retryFact) return;
    if (pendingFact?.kind === 'shot') { setShotLocation({ origin, destination, capturedElapsedMs: captured }); return; }
    const draft = currentPendingDraft();
    if (draft) { void recordFact({ ...draft, position: origin }, captured); return; }
    const control = workspace.futsalScout?.control;
    const controlSource = facts.find(item => item.fact.id === control?.id)?.fact;
    if (control?.kind !== 'control' || control.period !== clock.period || control.state === 'dead_ball' && controlSource?.kind === 'shot' && controlSource.outcome === 'goal') return;
    void recordFact({ kind: 'control', state: control.state, ...(control.state === 'team' && control.controlledTeamId ? { controlledTeamId: control.controlledTeamId } : {}), coverage: controlCoverage, observation: 'observed', position: origin }, captured);
  }
  async function undoLast() {
    if (busy || !workspace.futsalScout?.undoTargetHistoryEventId) return;
    try { await onUndoFact(); setFactError(''); setPendingFact(null); setShotLocation(null); }
    catch { setFactError('Não foi possível desfazer o último fato.'); }
  }
  function queueTackle() {
    if (retryFact) return;
    const control = workspace.futsalScout?.control;
    if (control?.kind !== 'control' || control.period !== clock.period || control.state !== 'team' || !control.controlledTeamId) {
      setFactError('Selecione primeiro a equipe que controla a bola.');
      return;
    }
    const winningTeam = workspace.teams.find(team => team.id !== control.controlledTeamId);
    if (!winningTeam) return;
    setFactError('');
    setShotLocation(null);
    setPendingFact({ kind: 'tackle', winningTeamId: winningTeam.id, losingTeamId: control.controlledTeamId, observation: 'observed' });
  }
  function changeTeam(nextTeamId: string) { setTeamId(nextTeamId); setPlayerId(''); setBeneficiaryTeamId(nextTeamId); }
  function factSummary(fact: FutsalFact): string {
    const teamName = (id?: string) => workspace.teams.find(team => team.id === id)?.name ?? 'Equipe não observada';
    if (fact.kind === 'control') return fact.state === 'team' ? `Controle observado: ${teamName(fact.controlledTeamId)}` : ({ contested: 'Bola disputada', dead_ball: 'Bola parada', unknown: 'Controle desconhecido' }[fact.state]);
    if (fact.kind === 'shot') return `Finalização de ${teamName(fact.shootingTeamId)} · ${outcomeLabels[fact.outcome]}${fact.outcome === 'goal' ? ` para ${teamName(fact.beneficiaryTeamId)}` : ''}`;
    if (fact.kind === 'chance_pass') return `Passe para finalização de ${teamName(fact.teamId)}`;
    if (fact.kind === 'pass') return `Passe de ${teamName(fact.teamId)} · ${fact.passResult === 'complete' ? 'certo' : fact.passResult === 'incomplete' ? 'errado' : 'resultado não observado'}`;
    if (fact.kind === 'progression') return `${fact.progressionType === 'carry' ? 'Condução' : 'Drible'} de ${teamName(fact.teamId)} · ${fact.progressionResult === 'retained' ? 'posse mantida' : fact.progressionResult === 'lost' ? 'posse perdida' : 'resultado não observado'}`;
    if (fact.kind === 'possession_loss' || fact.kind === 'ball_recovery') return `${fact.kind === 'possession_loss' ? 'Perda de posse' : 'Recuperação de posse'} de ${teamName(fact.teamId)}`;
    if (fact.kind === 'tackle') return `Desarme de ${teamName(fact.winningTeamId)} · posse recuperada de ${teamName(fact.losingTeamId)}`;
    if (fact.kind === 'restart') return `Reinício: ${restartLabels[fact.restart]}`;
    if (fact.kind === 'foul') return `Falta de ${teamName(fact.offendingTeamId)} · ${fact.accumulated ? 'acumulável' : 'não acumulável'}`;
    if (fact.kind === 'composition') return `Composição ${fact.certainty === 'complete' ? 'completa' : 'parcial'} de ${teamName(fact.teamId)} · ${fact.playerIds.length} atleta(s)${fact.shortHanded ? ' · inferioridade numérica' : ''}`;
    if (fact.kind === 'substitution') return `Substituição ${teamName(fact.teamId)} · ${fact.playerOutId ? `sai #${workspace.players.find(player => player.id === fact.playerOutId)?.number ?? '?'}` : 'saída não identificada'} → ${fact.playerInId ? `entra #${workspace.players.find(player => player.id === fact.playerInId)?.number ?? '?'}` : 'entrada não identificada'}${fact.certainty === 'partial' ? ' · parcial' : ''}`;
    if (fact.kind === 'tactical_context') return `${teamName(fact.teamId)} ${fact.active ? 'passa a usar' : 'encerra'} goleiro-linha observado`;
    if (fact.kind === 'tactical_annotation') return `${fact.scope === 'interval' ? 'Intervalo' : 'Lance'} · revisão tática${fact.organization ? ` · ${organizationLabels[fact.organization]}` : ''}${fact.numericalSituation ? ` · ${numericalSituationLabels[fact.numericalSituation]}` : ''}${fact.defensiveContext ? ` · ${defensiveLabels[fact.defensiveContext]}` : ''}${fact.attackingStructure ? ` · estrutura ${structureLabels[fact.attackingStructure]}` : ''}${fact.restartOrigin ? ` · origem ${restartLabels[fact.restartOrigin]}` : ''}`;
    if (fact.kind === 'score_adjustment') return `Ajuste de placar para ${teamName(fact.beneficiaryTeamId)} (${fact.delta > 0 ? '+' : ''}${fact.delta})`;
    return 'Fato não reconhecido';
  }
  function pendingSummary(fact: FutsalFactDraft): string {
    switch (fact.kind) {
      case 'control': return 'Marco de controle';
      case 'shot': return `Finalização · ${outcomeLabels[fact.outcome]}`;
      case 'chance_pass': return 'Passe para finalização';
      case 'pass': return 'Passe';
      case 'progression': return 'Progressão';
      case 'possession_loss': return 'Perda de posse';
      case 'ball_recovery': return 'Recuperação de posse';
      case 'tackle': return 'Desarme · troca automática da posse';
      case 'restart': return `Reinício · ${restartLabels[fact.restart]}`;
      case 'foul': return `Falta · ${fact.accumulated ? 'acumulável' : 'não acumulável'}`;
      case 'composition': return 'Composição observada';
      case 'substitution': return 'Substituição';
      case 'tactical_context': return 'Goleiro-linha';
      case 'tactical_annotation': return 'Revisão tática';
      case 'score_adjustment': return `Ajuste de placar · ${fact.delta}`;
    }
  }

  useEffect(() => {
    function shortcuts(event: KeyboardEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || event.isComposing || target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], dialog')) return;
      const key = event.key.toLowerCase();
      if (!['f', 'd', 'r', 'v', '1', '2', 'z', 'escape'].includes(key)) return;
      event.preventDefault();
      if (key === 'escape') { setPendingFact(null); setShotLocation(null); setRetryFact(null); setFactError(''); return; }
      if (retryFact) return;
      if (busy || clockFinished || clockUnreconciled) return;
      if (key === 'f') queueShot();
      if (key === 'd') queueTackle();
      if (key === 'r') { setShotLocation(null); setPendingFact({ kind: 'restart', restart, teamId, observation: 'observed' }); }
      if (key === 'v') { setShotLocation(null); setPendingFact({ kind: 'foul', offendingTeamId: teamId, ...(playerId ? { playerId } : {}), accumulated, observation: 'observed' }); }
      if (key === '1' || key === '2') queueControl('team', workspace.teams[Number(key) - 1].id);
      if (key === 'z') void undoLast();
    }
    window.addEventListener('keydown', shortcuts);
    return () => window.removeEventListener('keydown', shortcuts);
  });

  const teamA = workspace.teams[0], teamB = workspace.teams[1];
  const substitutionRoster = workspace.players.filter(player => player.teamId === substitutionTeamId && player.active !== false);
  const reviewableFacts = facts.filter(({ fact }) => ['control', 'tackle', 'shot', 'restart', 'foul'].includes(fact.kind));
  const currentComposition = compositions[substitutionTeamId];
  const substitutionCourtIds = currentComposition?.certainty === 'complete' ? currentComposition.playerIds : undefined;
  const substitutionOutOptions = substitutionCourtIds ? substitutionRoster.filter(player => substitutionCourtIds.includes(player.id)) : substitutionRoster;
  const substitutionInOptions = substitutionRoster.filter(player => !currentComposition?.playerIds.includes(player.id));
  const teamAFouls = fouls[`${clock.period}:${teamA.id}`] ?? 0;
  const teamBFouls = fouls[`${clock.period}:${teamB.id}`] ?? 0;
  const projectedControl = workspace.futsalScout?.control;
  const currentControlTeamId = projectedControl?.kind === 'control' && projectedControl.period === clock.period && projectedControl.state === 'team' ? projectedControl.controlledTeamId : undefined;
  const currentControlState = projectedControl?.kind === 'control' && projectedControl.period === clock.period ? projectedControl.state : undefined;
  const controlSource = facts.find(item => item.fact.id === projectedControl?.id)?.fact;
  const goalAwaitingControl = currentControlState === 'dead_ball' && controlSource?.kind === 'shot' && controlSource.outcome === 'goal';
  const canRecord = !busy && !clockFinished && !clockUnreconciled && !retryFact;
  const courtEnabled = canRecord && (pendingFact ? !shotLocation : Boolean(currentControlState) && !goalAwaitingControl);
  const courtFlipped = futsalAttackDirection(workspace.state.metadata, clock.period, teamA.id) === 'x0';
  const latestLocatedFact = [...facts].reverse().find(({ fact }) => fact.period === clock.period && (fact.position || fact.kind === 'shot' && fact.destination))?.fact;
  const lastPosition = latestLocatedFact?.kind === 'shot' ? latestLocatedFact.destination ?? latestLocatedFact.position : latestLocatedFact?.position;
  const displayPosition = lastPosition ? { x: lastPosition.x, y: lastPosition.y } : undefined;
  const stateLabel = clock.status === 'running' ? 'Relógio rodando' : clockUnreconciled ? 'Precisa reconciliar após reabertura' : clock.status === 'awaiting_final_kick' ? 'Aguardando cobrança final' : clockFinished ? 'Período encerrado' : 'Relógio parado';

  return <main className="page-section futsal-scout-screen" aria-labelledby="futsal-scout-title">
    <header className="section-heading"><h1 id="futsal-scout-title">{workspace.state.metadata.name}</h1></header>
    <section className="futsal-match-score" aria-label="Placar e faltas"><div><span>{teamA.name}</span><strong>{score[teamA.id] ?? 0}</strong><span>{teamB.name}</span><strong>{score[teamB.id] ?? 0}</strong></div><p>{clock.period}º período · {formatFutsalRemaining(clock, now)}</p><div className="futsal-fouls"><span>{teamA.name}: <b>{teamAFouls}</b> faltas acumuladas</span><span>{teamB.name}: <b>{teamBFouls}</b> faltas acumuladas</span></div>
      {(teamAFouls >= 5 || teamBFouls >= 5) && <p className="futsal-foul-warning" role="status">{teamAFouls >= 5 ? `${teamA.name}: ${teamAFouls >= 6 ? '6ª ou mais' : '5ª'} falta acumulada. Confira a regra da competição para o tiro de 10 m.` : ''}{teamAFouls >= 5 && teamBFouls >= 5 ? ' · ' : ''}{teamBFouls >= 5 ? `${teamB.name}: ${teamBFouls >= 6 ? '6ª ou mais' : '5ª'} falta acumulada. Confira a regra da competição para o tiro de 10 m.` : ''}</p>}
    </section>
    <section className="futsal-clock" aria-label="Relógio da partida">
      <div className="futsal-clock-display"><span>{clock.period}º período</span><strong aria-live="off">{formatFutsalRemaining(clock, now)}</strong><span role="status">{clockSaving ? 'Salvando…' : stateLabel}</span></div>
      {!clockUnreconciled && !['period_finished', 'awaiting_final_kick', 'match_finished'].includes(clock.status) && <button type="button" className="button primary" aria-keyshortcuts="T" disabled={busy || clockSaving} onClick={() => void submitClock({ kind: clock.status === 'running' ? 'pause' : 'start' })}>{clockSaving ? 'Salvando…' : clock.status === 'running' ? 'Pausar relógio (T)' : 'Iniciar relógio (T)'}</button>}
      {clockUnreconciled && <div className="futsal-clock-actions"><p>O app foi reaberto com o relógio em andamento. O tempo ficou congelado no último registro.</p><button type="button" className="button primary" disabled={clockSaving} onClick={() => void submitClock({ kind: 'reconcile', resumeAfterReconciliation: true, reason: 'Retomar do último tempo registrado após reabertura' })}>Retomar desde o último tempo</button><button type="button" className="button secondary" disabled={clockSaving} onClick={() => void submitClock({ kind: 'reconcile', resumeAfterReconciliation: false, reason: 'Manter parado após reabertura' })}>Manter parado</button></div>}
      {(clock.status === 'period_finished' || clock.status === 'match_finished') && <div className="futsal-clock-actions"><button type="button" className="button secondary" disabled={clockSaving} onClick={() => void submitClock({ kind: 'await_final_kick', reason: 'Cobrança final autorizada pelo cronometrista' })}>Autorizar cobrança final</button>{clock.status === 'period_finished' && clock.period === 1 && <button type="button" className="button primary" disabled={clockSaving} onClick={() => { if (window.confirm('Confirma o início do segundo período?')) void submitClock({ kind: 'advance_period' }); }}>Iniciar 2º período</button>}</div>}
      {clock.status === 'awaiting_final_kick' && <button type="button" className="button primary" disabled={clockSaving} onClick={() => void submitClock({ kind: 'finish_period' })}>Finalizar período após a cobrança</button>}
      {clock.status === 'running' && elapsedMs >= clock.periodDurationMs && <button type="button" className="button secondary" disabled={clockSaving} onClick={() => void submitClock({ kind: 'finish_period' })}>Registrar fim do período</button>}
      {clock.lastCommandAt && <small>Último comando salvo às {new Date(clock.lastCommandAt).toLocaleTimeString('pt-BR')}</small>}
      {clockError && <p role="alert">{clockError}</p>}
    </section>

    <section className="futsal-control-panel" aria-label="Controle da bola">
      <div className="futsal-possession-heading">
        <strong>Posse da bola</strong>
        <span role="status">{goalAwaitingControl ? 'Gol confirmado · escolha o novo controle' : currentControlTeamId ? `${workspace.teams.find(team => team.id === currentControlTeamId)?.name ?? 'Equipe'} com a bola` : currentControlState === 'contested' ? 'Bola em disputa' : currentControlState === 'dead_ball' ? 'Bola parada' : currentControlState === 'unknown' ? 'Controle não observado' : 'Escolha quem controla a bola'}</span>
      </div>
      <div className="futsal-control-buttons" aria-label="Controle observado">
        <button type="button" aria-label={`${teamA.name} controla`} aria-keyshortcuts="1" aria-pressed={currentControlTeamId === teamA.id} disabled={!canRecord} onClick={() => queueControl('team', teamA.id)}>{teamA.name} <kbd aria-hidden="true">1</kbd></button>
        <button type="button" aria-label={`${teamB.name} controla`} aria-keyshortcuts="2" aria-pressed={currentControlTeamId === teamB.id} disabled={!canRecord} onClick={() => queueControl('team', teamB.id)}>{teamB.name} <kbd aria-hidden="true">2</kbd></button>
        <button type="button" aria-pressed={currentControlState === 'contested'} disabled={!canRecord} onClick={() => queueControl('contested')}>Disputada</button>
        <button type="button" aria-pressed={currentControlState === 'dead_ball'} disabled={!canRecord} onClick={() => queueControl('dead_ball')}>Parada</button>
        <button type="button" aria-label="Controle não observado" aria-pressed={currentControlState === 'unknown'} disabled={!canRecord} onClick={() => queueControl('unknown')}>?</button>
      </div>
    </section>

    <GestureCourtInput key={`${pendingFact?.kind ?? 'ball'}:${clock.period}`} sport="futsal" isEnabled={courtEnabled} captureMode={pendingFact?.kind === 'shot' ? 'trajectory' : 'point'} flipped={courtFlipped} teamNames={courtFlipped ? [teamB.name, teamA.name] : [teamA.name, teamB.name]} initialOrigin={displayPosition} initialDestination={displayPosition} pointHint={pendingFact ? 'Toque na quadra para registrar a ação.' : 'Toque na quadra para registrar a posição da bola.'} disabledHint={goalAwaitingControl ? 'Gol confirmado. Escolha a equipe que controla a bola após a saída.' : retryFact ? 'Resolva o registro pendente antes de continuar.' : 'Escolha o controle da bola para começar.'} onCaptureStart={() => { capturedElapsed.current = elapsedAtInteraction(clock); }} onCancel={() => { setPendingFact(null); setShotLocation(null); }} onTrajectory={trajectory => captureCourt({ x: trajectory.origin.x, y: trajectory.origin.y }, { x: trajectory.destination.x, y: trajectory.destination.y }, capturedElapsed.current)} />

    <section className="futsal-scout-panel" aria-label="Ações do scout">
      <div className="futsal-main-actions" aria-label="Ações principais">
        <button type="button" aria-label="Preparar finalização" aria-keyshortcuts="F" aria-pressed={pendingFact?.kind === 'shot'} disabled={!canRecord} onClick={queueShot}>Finalizar <kbd aria-hidden="true">F</kbd></button>
        <button type="button" aria-label="Registrar desarme" aria-keyshortcuts="D" aria-pressed={pendingFact?.kind === 'tackle'} disabled={!canRecord || !currentControlTeamId} onClick={queueTackle}>Desarme <kbd aria-hidden="true">D</kbd></button>
        <button type="button" aria-label="Preparar reinício" aria-keyshortcuts="R" aria-pressed={pendingFact?.kind === 'restart'} disabled={!canRecord} onClick={() => { setShotLocation(null); setPendingFact({ kind: 'restart', restart, teamId, observation: 'observed' }); }}>Reinício <kbd aria-hidden="true">R</kbd></button>
        <button type="button" aria-label="Preparar falta observada" aria-keyshortcuts="V" aria-pressed={pendingFact?.kind === 'foul'} disabled={!canRecord} onClick={() => { setShotLocation(null); setPendingFact({ kind: 'foul', offendingTeamId: teamId, accumulated, observation: 'observed' }); }}>Falta <kbd aria-hidden="true">V</kbd></button>
        <button type="button" aria-label="Substituição" aria-expanded={moreOpen && substitutionOpen} disabled={!canRecord} onClick={() => { setMoreOpen(true); setSubstitutionOpen(true); }}>Substituir</button>
        <button type="button" aria-expanded={goalkeeperOpen} disabled={!canRecord} onClick={() => setGoalkeeperOpen(open => !open)}>Goleiro-linha</button>
        <button type="button" aria-label="Desfazer último fato" aria-keyshortcuts="Z" disabled={busy || !workspace.futsalScout?.undoTargetHistoryEventId} onClick={() => void undoLast()}>Desfazer <kbd aria-hidden="true">Z</kbd></button>
        <button type="button" aria-expanded={moreOpen} aria-controls="futsal-more-panels" onClick={() => setMoreOpen(open => !open)}>Mais</button>
      </div>
      {goalkeeperOpen && <div className="futsal-context-actions" aria-label="Goleiro-linha observado">{workspace.teams.map(team => <button type="button" key={team.id} disabled={!canRecord} onClick={() => void recordFact({ kind: 'tactical_context', teamId: team.id, numericalSituation: 'own_flying_goalkeeper', active: !flyingGoalkeeperTeams.includes(team.id), observation: 'observed' })}>{team.name}: {flyingGoalkeeperTeams.includes(team.id) ? 'Encerrar goleiro-linha' : 'Marcar goleiro-linha'}</button>)}</div>}
      {pendingFact && <div className="futsal-pending-fact" role="status">
        <strong>{pendingSummary(pendingFact)}</strong>
        {pendingFact.kind === 'shot' && <div className="futsal-action-config"><label>Equipe que finaliza<select value={teamId} onChange={event => changeTeam(event.target.value)}>{workspace.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><div className="futsal-quick-players"><button type="button" className={`player-chip ${!playerId ? 'selected' : ''}`} onClick={() => setPlayerId('')}>Ø Geral</button>{workspace.players.filter(player => player.teamId === teamId).map(player => <button key={player.id} type="button" className={`player-chip ${playerId === player.id ? 'selected' : ''}`} onClick={() => setPlayerId(player.id)}>#{player.number} {player.name}</button>)}</div><label>Atleta (opcional)<select value={playerId} onChange={event => setPlayerId(event.target.value)}><option value="">Não identificado</option>{workspace.players.filter(player => player.teamId === teamId).map(player => <option key={player.id} value={player.id}>#{player.number} {player.name}</option>)}</select></label></div>}
        {pendingFact.kind === 'restart' && <div className="futsal-action-config"><label>Tipo de reinício<select value={restart} onChange={event => setRestart(event.target.value as FutsalRestart)}>{Object.entries(restartLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Equipe<select value={teamId} onChange={event => changeTeam(event.target.value)}>{workspace.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label></div>}
        {pendingFact.kind === 'foul' && <div className="futsal-action-config"><label>Equipe infratora<select value={teamId} onChange={event => changeTeam(event.target.value)}>{workspace.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><div className="futsal-quick-players"><button type="button" className={`player-chip ${!playerId ? 'selected' : ''}`} onClick={() => setPlayerId('')}>Ø Geral</button>{workspace.players.filter(player => player.teamId === teamId).map(player => <button key={player.id} type="button" className={`player-chip ${playerId === player.id ? 'selected' : ''}`} onClick={() => setPlayerId(player.id)}>#{player.number} {player.name}</button>)}</div><label>Atleta (opcional)<select value={playerId} onChange={event => setPlayerId(event.target.value)}><option value="">Não identificado</option>{workspace.players.filter(player => player.teamId === teamId).map(player => <option key={player.id} value={player.id}>#{player.number} {player.name}</option>)}</select></label><label className="futsal-checkbox"><input type="checkbox" checked={accumulated} onChange={event => setAccumulated(event.target.checked)} /> Acumulável</label></div>}
        {pendingFact.kind === 'shot' && shotLocation ? <><span>Trajetória {shotLocation.origin ? 'marcada' : 'não observada'}. Escolha o resultado.</span><label>Gol para<select value={beneficiaryTeamId} onChange={event => setBeneficiaryTeamId(event.target.value)}>{workspace.teams.map(team => <option key={team.id} value={team.id}>{team.name}{team.id !== teamId ? ' (gol contra)' : ''}</option>)}</select></label><div className="futsal-result-buttons">{(['goal', 'saved', 'blocked', 'off_target', 'post', 'pending'] as const).map(outcome => <button type="button" key={outcome} data-outcome={outcome} disabled={busy || Boolean(retryFact)} onClick={() => saveShot(outcome)}>{outcomeLabels[outcome]}</button>)}</div></> : <><span>{pendingFact.kind === 'shot' ? 'Marque origem e destino na quadra.' : 'Toque uma vez na quadra para registrar o ponto.'}</span><button type="button" disabled={busy || Boolean(retryFact)} onClick={() => { if (pendingFact.kind === 'shot') setShotLocation({ capturedElapsedMs: elapsedAtInteraction(clock) }); else { const draft = currentPendingDraft(); if (draft) void recordFact(draft); } }}>Registrar sem localização</button></>}
        <button type="button" onClick={() => { setPendingFact(null); setShotLocation(null); setFactError(''); }}>Cancelar</button>
      </div>}
      {retryFact && <div className="futsal-retry" role="alert"><span>Registro pendente preservado.</span><button type="button" disabled={busy} onClick={() => void recordFact(retryFact.draft, retryFact.capturedElapsedMs)}>Tentar novamente</button><button type="button" onClick={() => { setRetryFact(null); setPendingFact(null); setShotLocation(null); setFactError(''); }}>Descartar rascunho</button></div>}
      {factError && <p role="alert" className="futsal-fact-error">{factError}</p>}
    </section>
    {moreOpen && <div id="futsal-more-panels" className="futsal-more-panels">
    <section className="futsal-substitutions" aria-label="Substituições e composição">
      <h2>Substituições e composição</h2>
      <button type="button" className="button secondary" aria-expanded={substitutionOpen} onClick={() => setSubstitutionOpen(value => !value)}>{substitutionOpen ? 'Ocultar troca' : 'Mostrar troca'}</button>
      <p>Trocas podem ser registradas com o relógio rodando. A composição só muda quando uma troca ou observação é salva.</p>
      {substitutionOpen && <div className="futsal-substitution-form">
        <label>Equipe<select aria-label="Equipe da substituição" value={substitutionTeamId} onChange={event => { setSubstitutionTeamId(event.target.value); setPlayerOutId(''); setPlayerInId(''); }}>{workspace.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
        <label>Atleta que sai<select aria-label="Atleta que sai" value={playerOutId} onChange={event => setPlayerOutId(event.target.value)}><option value="">Não identificado</option>{substitutionOutOptions.map(player => <option key={player.id} value={player.id}>#{player.number} {player.name}</option>)}</select></label>
        <label>Atleta que entra<select aria-label="Atleta que entra" value={playerInId} onChange={event => setPlayerInId(event.target.value)}><option value="">Não identificado</option>{substitutionInOptions.map(player => <option key={player.id} value={player.id}>#{player.number} {player.name}</option>)}</select></label>
        {currentComposition && <small>Composição {currentComposition.certainty === 'complete' ? 'completa' : 'parcial'} observada · {currentComposition.playerIds.length} em quadra</small>}
        <label className="futsal-checkbox"><input type="checkbox" checked={substitutionPartial} onChange={event => setSubstitutionPartial(event.target.checked)} /> Registrar como parcial</label>
        <button type="button" className="button primary" disabled={busy || clockFinished || clockUnreconciled || (!substitutionPartial && (!playerOutId || !playerInId)) || Boolean(playerOutId && playerInId && playerOutId === playerInId)} onClick={() => void saveSubstitution()}>{substitutionCorrectionFactId ? 'Salvar correção' : 'Registrar troca'}</button>
      </div>}
      <details className="futsal-composition-form"><summary>Observar composição em quadra</summary><div className="futsal-action-config"><label>Equipe<select aria-label="Equipe da composição" value={compositionTeamId} onChange={event => { setCompositionTeamId(event.target.value); setCompositionPlayerIds([]); }}>{workspace.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label className="futsal-checkbox"><input type="checkbox" checked={compositionPartial} onChange={event => setCompositionPartial(event.target.checked)} /> Sei apenas parte da composição</label>{!compositionPartial && <label className="futsal-checkbox"><input type="checkbox" checked={compositionShortHanded} onChange={event => setCompositionShortHanded(event.target.checked)} /> Inferioridade numérica observada</label>}</div><div className="futsal-roster-checks">{workspace.players.filter(player => player.teamId === compositionTeamId && player.active !== false).map(player => <label key={player.id}><input type="checkbox" checked={compositionPlayerIds.includes(player.id)} onChange={event => setCompositionPlayerIds(ids => event.target.checked ? [...ids, player.id] : ids.filter(id => id !== player.id))} /> #{player.number} {player.name}</label>)}</div><button type="button" className="button secondary" disabled={busy || clockFinished || clockUnreconciled || compositionPlayerIds.length > 5 || (!compositionPartial && compositionPlayerIds.length < 5 && !compositionShortHanded)} onClick={() => void recordFact({ kind: 'composition', teamId: compositionTeamId, playerIds: compositionPlayerIds, certainty: compositionPartial ? 'partial' : 'complete', ...(!compositionPartial && compositionShortHanded ? { shortHanded: true } : {}), observation: compositionPartial ? 'partial' : 'observed' })}>Salvar composição observada</button></details>
      <div className="futsal-current-composition">{workspace.teams.map(team => { const composition = compositions[team.id]; return <p key={team.id}><strong>{team.name}:</strong> {composition ? `${composition.certainty === 'complete' ? 'completa' : 'parcial'} · ${composition.playerIds.map(id => `#${workspace.players.find(player => player.id === id)?.number ?? '?'}`).join(', ') || 'nenhum atleta identificado'}${composition.shortHanded ? ' · inferioridade numérica' : ''}` : 'não observada'}{flyingGoalkeeperTeams.includes(team.id) ? ' · goleiro-linha observado' : ''}</p>; })}</div>
    </section>
    <section className="futsal-review" aria-label="Revisão tática voluntária">
      <h2>Revisão tática</h2>
      <p>Opcional e descritiva: os estudos usam estas categorias em contextos competitivos diferentes; não são metas nem previsões para esta partida.</p>
      <button type="button" className="button secondary" aria-expanded={reviewOpen} onClick={() => setReviewOpen(value => !value)}>Detalhes de revisão</button>
      {reviewOpen && <div className="futsal-review-form">
        <label>Aplicar a<select value={reviewScope} onChange={event => setReviewScope(event.target.value as 'event' | 'interval')}><option value="event">Um lance observado</option><option value="interval">Intervalo entre lances</option></select></label>
        {reviewScope === 'event' ? <label>Lance<select aria-label="Lance observado" value={reviewTargetFactId} onChange={event => setReviewTargetFactId(event.target.value)}><option value="">Selecione um lance</option>{reviewableFacts.map(({ fact }) => <option key={fact.id} value={fact.id}>{fact.period}º · {String(Math.floor(fact.elapsedMs / 60_000)).padStart(2, '0')}:{String(Math.floor(fact.elapsedMs / 1000) % 60).padStart(2, '0')} · {factSummary(fact)}</option>)}</select></label> : <><label>Início do intervalo<select value={reviewStartFactId} onChange={event => setReviewStartFactId(event.target.value)}><option value="">Selecione o primeiro lance</option>{reviewableFacts.map(({ fact }) => <option key={fact.id} value={fact.id}>{fact.period}º · {String(Math.floor(fact.elapsedMs / 60_000)).padStart(2, '0')}:{String(Math.floor(fact.elapsedMs / 1000) % 60).padStart(2, '0')} · {factSummary(fact)}</option>)}</select></label><label>Fim do intervalo<select value={reviewEndFactId} onChange={event => setReviewEndFactId(event.target.value)}><option value="">Selecione o último lance</option>{reviewableFacts.map(({ fact }) => <option key={fact.id} value={fact.id}>{fact.period}º · {String(Math.floor(fact.elapsedMs / 60_000)).padStart(2, '0')}:{String(Math.floor(fact.elapsedMs / 1000) % 60).padStart(2, '0')} · {factSummary(fact)}</option>)}</select></label></>}
        <label>Equipe (opcional)<select value={reviewTeamId} onChange={event => setReviewTeamId(event.target.value)}><option value="">Não especificada</option>{workspace.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
        <label>Organização ofensiva<select value={reviewOrganization} onChange={event => setReviewOrganization(event.target.value as FutsalOrganization | '')}><option value="">Sem anotação</option>{Object.entries(organizationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Origem da bola parada<select value={reviewRestart} onChange={event => setReviewRestart(event.target.value as FutsalRestart | '')}><option value="">Sem anotação</option>{Object.entries(restartLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Situação numérica<select value={reviewNumericalSituation} onChange={event => setReviewNumericalSituation(event.target.value as typeof reviewNumericalSituation)}><option value="">Sem anotação</option>{Object.entries(numericalSituationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Defesa e goleiro<select value={reviewDefense} onChange={event => setReviewDefense(event.target.value as FutsalDefensiveContext | '')}><option value="">Sem anotação</option>{Object.entries(defensiveLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Estrutura ofensiva<select value={reviewStructure} onChange={event => setReviewStructure(event.target.value as FutsalAttackingStructure | '')}><option value="">Sem anotação</option>{Object.entries(structureLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Nota observacional (opcional)<input maxLength={200} value={reviewNote} onChange={event => setReviewNote(event.target.value)} /></label>
        <button type="button" className="button primary" disabled={busy || (!reviewOrganization && !reviewRestart && !reviewNumericalSituation && !reviewDefense && !reviewStructure) || (reviewScope === 'event' ? !reviewTargetFactId : !reviewStartFactId || !reviewEndFactId)} onClick={() => void saveTacticalAnnotation()}>{editingAnnotationId ? 'Salvar reclassificação' : 'Salvar contexto'}</button>
        {editingAnnotationId && <button type="button" className="button secondary" onClick={() => setEditingAnnotationId(undefined)}>Cancelar reclassificação</button>}
      </div>}
    </section>
    <section className="futsal-orientation" aria-label="Orientação da quadra"><h2>Direção de ataque</h2><p>Defina o lado atacado por equipe. Sem essa informação, a direção permanece não observada.</p><label>Período<select aria-label="Período da orientação" value={period} onChange={event => setPeriod(Number(event.target.value) as 1 | 2)}><option value="1">1º período</option><option value="2">2º período</option></select></label>{workspace.teams.map(team => <label key={team.id}>{team.name}<select aria-label={`Direção de ataque de ${team.name}`} value={futsalAttackDirection(workspace.state.metadata, period, team.id) ?? ''} onChange={event => void onOrientation(period, team.id, (event.target.value || undefined) as 'x120' | 'x0' | undefined)}><option value="">Não observada</option><option value="x120">→ Direita</option><option value="x0">← Esquerda</option></select></label>)}</section>
      <label className="futsal-coverage-setting">Cobertura do controle<select value={controlCoverage} onChange={event => setControlCoverage(event.target.value as FutsalControlCoverage)}><option value="continuous">Cobertura contínua</option><option value="suspended">Cobertura suspensa</option></select></label>
      <details className="futsal-clock-adjust"><summary>Ajustar tempo com justificativa</summary><form onSubmit={event => { event.preventDefault(); const minutes = Number(adjustMinuteValue); if (!adjustReason.trim() || !Number.isFinite(minutes)) return; void submitClock({ kind: 'adjust', elapsedMs: Math.round(minutes * 60_000), reason: adjustReason }); }}><label>Minutos decorridos<input type="number" min="0" max={clock.periodDurationMs / 60_000} step="0.01" value={adjustMinuteValue} disabled={clockSaving || clock.status === 'running' || clockUnreconciled} onChange={event => setAdjustMinutes(event.target.value)} /></label><label>Motivo<input value={adjustReason} disabled={clockSaving || clock.status === 'running' || clockUnreconciled} onChange={event => setAdjustReason(event.target.value)} /></label><button type="submit" className="button secondary" disabled={clockSaving || clock.status === 'running' || clockUnreconciled || !adjustReason.trim()}>Salvar ajuste</button></form></details>
    </div>}
    <section className="futsal-timeline" aria-label="Linha do tempo de futsal"><header><h2>Eventos recentes</h2></header>
      {facts.length === 0 ? <p>Nenhum fato registrado ainda.</p> : <ol>{facts.slice(-12).reverse().map(({ fact, sourceEventId }) => <li key={fact.id}>
        <span>{fact.period}º · {String(Math.floor(fact.elapsedMs / 60_000)).padStart(2, '0')}:{String(Math.floor(fact.elapsedMs / 1000) % 60).padStart(2, '0')} · {factSummary(fact)}</span>
        {fact.kind === 'foul' && <button className="button secondary" disabled={busy} onClick={() => void onCorrectFact(fact.id, { kind: 'foul', offendingTeamId: fact.offendingTeamId, ...(fact.playerId ? { playerId: fact.playerId } : {}), accumulated: !fact.accumulated, observation: fact.observation, ...(fact.position ? { position: fact.position } : {}) })}>Marcar como {fact.accumulated ? 'não acumulável' : 'acumulável'}</button>}
        {fact.kind === 'substitution' && <button className="button secondary" disabled={busy} onClick={() => { setMoreOpen(true); setSubstitutionCorrectionFactId(fact.id); setSubstitutionOpen(true); setSubstitutionTeamId(fact.teamId); setPlayerOutId(fact.playerOutId ?? ''); setPlayerInId(fact.playerInId ?? ''); setSubstitutionPartial(fact.certainty === 'partial'); }}>Corrigir substituição</button>}
        {fact.kind === 'tactical_annotation' && <><button className="button secondary" disabled={busy} onClick={() => { setMoreOpen(true); setReviewOpen(true); setEditingAnnotationId(fact.id); setReviewScope(fact.scope); setReviewTeamId(fact.teamId ?? ''); setReviewTargetFactId(fact.targetFactId ?? ''); setReviewStartFactId(fact.startFactId ?? ''); setReviewEndFactId(fact.endFactId ?? ''); setReviewOrganization(fact.organization ?? ''); setReviewRestart(fact.restartOrigin ?? ''); setReviewNumericalSituation(fact.numericalSituation ?? ''); setReviewDefense(fact.defensiveContext ?? ''); setReviewStructure(fact.attackingStructure ?? ''); setReviewNote(fact.note ?? ''); }}>Reclassificar contexto</button><button className="button secondary" disabled={busy} onClick={() => void removeTacticalAnnotation(fact)}>Remover contexto</button></>}
        <small>#{sourceEventId.slice(0, 6)}</small>
      </li>)}</ol>}
    </section>
  </main>;
}

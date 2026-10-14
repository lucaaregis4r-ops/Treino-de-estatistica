import { useEffect, useId, useRef, useState } from 'react';
import type { MatchWorkspace } from '../../../application/ScoutTrainerService';
import {
  ESSENTIAL_CODES,
  ESSENTIAL_OUTCOMES,
  ESSENTIAL_QUALIFIERS_BY_CODE,
  ESSENTIAL_PASS_RESULTS,
  ESSENTIAL_PROGRESSION_RESULTS,
  ESSENTIAL_PROGRESSION_TYPES,
  FOOTBALL_ESSENTIAL_RESTART_TYPES,
  FUTSAL_ESSENTIAL_RESTART_TYPES,
  essentialThirdFromPosition,
  type EssentialActionCode,
  type EssentialOutcome,
  type EssentialPosition,
  type EssentialQualifier,
  type EssentialPassResult,
  type EssentialProgressionResult,
  type EssentialProgressionType,
  type EssentialRestartType,
  type EssentialScoutDraft,
  type EssentialScoutRecord,
} from '../../../domain/essential/EssentialScout';
import { effectiveElapsed } from '../../../domain/football/FootballRecorder';
import { footballOrientation } from '../../../domain/football/FootballOrientation';
import { effectiveFutsalElapsed, formatFutsalRemaining } from '../../../domain/futsal/FutsalClock';
import { futsalAttackDirection } from '../../../domain/futsal/FutsalOrientation';
import { resolveMatchSport } from '../../../domain/match/entities/MatchSport';
import { GestureCourtInput } from './GestureCourtInput';
import './EssentialScoutScreen.css';

export interface EssentialScoutScreenProps {
  readonly workspace: MatchWorkspace;
  readonly busy?: boolean;
  readonly onRegister: (draft: EssentialScoutDraft) => Promise<void>;
  readonly onCorrect: (id: string, draft: EssentialScoutDraft) => Promise<void>;
  readonly onDelete: (id: string) => Promise<void>;
  readonly onClockToggle: () => Promise<void>;
  readonly onSetOrientation: (direction: 'x120' | 'x0') => Promise<void>;
  readonly shortcutsEnabled?: boolean;
  readonly onOpenAdvanced?: () => void;
}

interface PendingAction {
  readonly code: EssentialActionCode;
  readonly position?: EssentialPosition;
  readonly destination?: EssentialPosition;
  readonly outcome?: EssentialOutcome;
  readonly passResult?: EssentialPassResult;
  readonly progressionType?: EssentialProgressionType;
  readonly progressionResult?: EssentialProgressionResult;
  readonly foulCard?: 'yellow' | 'red';
  readonly foulAccumulated?: boolean;
  readonly restartType?: EssentialRestartType;
  readonly third?: 'defensive' | 'middle' | 'attacking';
  readonly thirdAnchor?: 'origin' | 'destination';
  readonly qualifiers?: readonly EssentialQualifier[];
  readonly capturedElapsedMs?: number;
  readonly editingId?: string;
}

const CODE_LABELS: Readonly<Record<EssentialActionCode, string>> = {
  F: 'Finalização',
  P: 'Passe',
  PF: 'Passe para finalização',
  C: 'Progressão',
  PP: 'Perda de posse',
  RP: 'Recuperação de posse',
  FL: 'Falta',
  RE: 'Reinício',
};

const PASS_RESULT_LABELS: Readonly<Record<EssentialPassResult, string>> = {
  complete: 'Certo', incomplete: 'Errado', unknown: 'Não observado',
};
const PROGRESSION_TYPE_LABELS: Readonly<Record<EssentialProgressionType, string>> = {
  carry: 'Condução', dribble: 'Drible',
};
const PROGRESSION_RESULT_LABELS: Readonly<Record<EssentialProgressionResult, string>> = {
  retained: 'Manteve a posse', lost: 'Perdeu a posse', unknown: 'Não observado',
};
const RESTART_LABELS: Readonly<Record<EssentialRestartType, string>> = {
  throw_in: 'Lateral', kick_in: 'Lateral', corner: 'Escanteio', goal_kick: 'Tiro de meta', goal_clearance: 'Arremesso de meta',
  free_kick: 'Tiro livre', ten_meter_kick: 'Tiro de 10 m', penalty: 'Pênalti', kick_off: 'Saída', other: 'Outro', unknown: 'Não observado',
};
const RESTART_KEYS: Readonly<Record<EssentialRestartType, string>> = {
  throw_in: 'L', kick_in: 'L', corner: 'C', goal_kick: 'M', goal_clearance: 'M',
  free_kick: 'F', ten_meter_kick: 'D', penalty: 'P', kick_off: 'I', other: 'O', unknown: 'U',
};

const OUTCOME_LABELS: Readonly<Record<EssentialOutcome, { readonly label: string; readonly key: string }>> = {
  gol: { label: 'Gol', key: 'G' },
  defesa: { label: 'Defesa', key: 'D' },
  fora: { label: 'Fora', key: 'O' },
  bloqueada: { label: 'Bloqueada', key: 'B' },
  trave: { label: 'Trave', key: 'V' },
};

type EssentialThird = 'defensive' | 'middle' | 'attacking';
const THIRDS: readonly EssentialThird[] = ['defensive', 'middle', 'attacking'];
const THIRD_LABELS: Readonly<Record<EssentialThird, string>> = {
  defensive: 'Defensivo', middle: 'Central', attacking: 'Ofensivo',
};
const THIRD_SHORTCUTS: Readonly<Record<EssentialThird, string>> = {
  defensive: '3', middle: '4', attacking: '5',
};
const QUALIFIER_LABELS: Readonly<Record<string, string>> = {
  unmarked: 'Livre', under_pressure: 'Sob pressão', first_touch: 'Primeiro toque', transition: 'Transição', set_piece: 'Bola parada',
  through_ball: 'Ruptura', cross: 'Cruzamento', pivot: 'Pivô',
  bad_pass: 'Erro de passe', tackled: 'Desarmado', bad_control: 'Mau domínio', carry: 'Condução', out_of_play: 'Bola fora',
  tackle: 'Desarme', interception: 'Interceptação', rebound: 'Rebote', opponent_error: 'Erro adversário', pressing: 'Pressão', goalkeeper_save: 'Defesa do goleiro',
  long_pass: 'Passe longo', line_break: 'Quebra de linha', halfway_cross: 'Cruza a metade', handball: 'Mão', dangerous_play: 'Jogo perigoso', quick_restart: 'Rápido',
};
const QUALIFIER_KEYS: Readonly<Record<EssentialActionCode, Readonly<Record<string, EssentialQualifier>>>> = {
  F: { L: 'unmarked', P: 'under_pressure', T: 'first_touch', C: 'transition', R: 'set_piece' },
  P: { R: 'through_ball', C: 'cross', V: 'pivot', T: 'transition', B: 'set_piece', L: 'long_pass', Q: 'line_break', H: 'halfway_cross' },
  PF: { R: 'through_ball', C: 'cross', V: 'pivot', T: 'transition', B: 'set_piece', L: 'long_pass', Q: 'line_break', H: 'halfway_cross' },
  C: { P: 'under_pressure', T: 'transition', Q: 'line_break', H: 'halfway_cross' },
  PP: { E: 'bad_pass', D: 'tackled', M: 'bad_control', C: 'carry', F: 'out_of_play', P: 'under_pressure' },
  RP: { D: 'tackle', I: 'interception', R: 'rebound', E: 'opponent_error', P: 'pressing', G: 'goalkeeper_save' },
  FL: { D: 'tackle', M: 'handball', J: 'dangerous_play' },
  RE: { Q: 'quick_restart' },
};

interface CompactAction {
  readonly code: EssentialActionCode;
  readonly shirtNumber?: number;
  readonly outcome?: EssentialOutcome;
  readonly passResult?: EssentialPassResult;
  readonly progressionType?: EssentialProgressionType;
  readonly progressionResult?: EssentialProgressionResult;
  readonly foulCard?: 'yellow' | 'red';
  readonly foulAccumulated?: boolean;
  readonly restartType?: EssentialRestartType;
  readonly qualifiers: readonly EssentialQualifier[];
  readonly third?: EssentialThird;
}

function parseCompactAction(raw: string, sport: 'football' | 'futsal'): CompactAction | string {
  const value = raw.toUpperCase().replace(/\s+/g, '');
  const match = /^(\d{1,3})?(PF|PP|RP|FL|RE|F|P|C)([A-Z]*)([123])?$/.exec(value);
  if (!match) return 'Use camisa + fundamento + qualificação + terço, por exemplo 09FG3.';
  const code = match[2] as EssentialActionCode;
  const shirtNumber = match[1] === undefined ? undefined : Number(match[1]);
  const letters = match[3];
  let qualifierLetters = letters;
  let outcome: EssentialOutcome | undefined;
  let passResult: EssentialPassResult | undefined;
  let progressionType: EssentialProgressionType | undefined;
  let progressionResult: EssentialProgressionResult | undefined;
  let foulCard: 'yellow' | 'red' | undefined;
  let foulAccumulated: boolean | undefined;
  let restartType: EssentialRestartType | undefined;
  if (code === 'F' && letters.length > 0) {
    outcome = ESSENTIAL_OUTCOMES.find(item => OUTCOME_LABELS[item].key === letters[0]);
    if (!outcome) return 'Após F, informe primeiro o resultado: G, D, O, B ou V.';
    qualifierLetters = letters.slice(1);
  }
  if (code === 'F' && match[4] && !outcome) return 'Para finalização com terço, informe o resultado antes de 1, 2 ou 3.';
  if (code === 'P' && /^[SIU]/.test(qualifierLetters)) {
    passResult = { S: 'complete', I: 'incomplete', U: 'unknown' }[qualifierLetters[0]] as EssentialPassResult;
    qualifierLetters = qualifierLetters.slice(1);
  }
  if (code === 'C' && /^[CD][MNU]/.test(qualifierLetters)) {
    progressionType = qualifierLetters[0] === 'C' ? 'carry' : 'dribble';
    progressionResult = { M: 'retained', N: 'lost', U: 'unknown' }[qualifierLetters[1]] as EssentialProgressionResult;
    qualifierLetters = qualifierLetters.slice(2);
  }
  if (code === 'FL' && sport === 'futsal' && /^[AN]/.test(qualifierLetters)) {
    foulAccumulated = qualifierLetters[0] === 'A';
    qualifierLetters = qualifierLetters.slice(1);
  }
  if (code === 'FL' && /^[YR]/.test(qualifierLetters)) {
    foulCard = qualifierLetters[0] === 'Y' ? 'yellow' : 'red';
    qualifierLetters = qualifierLetters.slice(1);
  }
  if (code === 'RE' && qualifierLetters) {
    const types = sport === 'futsal' ? FUTSAL_ESSENTIAL_RESTART_TYPES : FOOTBALL_ESSENTIAL_RESTART_TYPES;
    restartType = types.find(item => RESTART_KEYS[item] === qualifierLetters[0]);
    if (restartType) qualifierLetters = qualifierLetters.slice(1);
  }
  const qualifiers: EssentialQualifier[] = [];
  for (const letter of qualifierLetters) {
    const qualifier = QUALIFIER_KEYS[code][letter];
    if (!qualifier) return `Qualificador ${letter} não existe para ${code}.`;
    if (qualifiers.includes(qualifier)) return `Qualificador ${letter} repetido.`;
    qualifiers.push(qualifier);
  }
  return {
    code, ...(shirtNumber !== undefined ? { shirtNumber } : {}), ...(outcome ? { outcome } : {}),
    ...(passResult ? { passResult } : {}), ...(progressionType ? { progressionType } : {}),
    ...(progressionResult ? { progressionResult } : {}), ...(foulAccumulated !== undefined ? { foulAccumulated } : {}),
    ...(foulCard ? { foulCard } : {}),
    ...(restartType ? { restartType } : {}), qualifiers,
    ...(match[4] ? { third: THIRDS[Number(match[4]) - 1] } : {}),
  };
}

function hasRequiredDetail(action: PendingAction, sport: 'football' | 'futsal'): boolean {
  if (action.code === 'F') return Boolean(action.outcome);
  if (action.code === 'P') return Boolean(action.passResult);
  if (action.code === 'C') return Boolean(action.progressionType && action.progressionResult);
  if (action.code === 'FL' && sport === 'futsal') return action.foulAccumulated !== undefined;
  if (action.code === 'RE') return Boolean(action.restartType);
  return true;
}

function hasLocation(action: PendingAction): boolean {
  return Boolean(action.position || action.third || (['P', 'PF', 'C'].includes(action.code) && action.destination));
}

function qualifierKey(code: EssentialActionCode, qualifier: EssentialQualifier): string {
  return Object.entries(QUALIFIER_KEYS[code]).find(([, value]) => value === qualifier)?.[0] ?? '';
}

function formatElapsed(elapsedMs: number): string {
  const seconds = Math.floor(Math.max(0, elapsedMs) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatPoint(point: EssentialPosition): string {
  return `${Math.round(point.x * 100)}%, ${Math.round(point.y * 100)}%`;
}

function interactionNow(): number {
  return Date.now();
}

/** Selective live capture. The existing football and futsal recorders remain separate. */
export function EssentialScoutScreen({ workspace, busy = false, onRegister, onCorrect, onDelete, onClockToggle, onSetOrientation, shortcutsEnabled = true, onOpenAdvanced }: EssentialScoutScreenProps) {
  const sport = resolveMatchSport(workspace.state.metadata) === 'futsal' ? 'futsal' : 'football';
  const footballClock = workspace.football?.clock;
  const futsalClock = workspace.futsalClock;
  const period = sport === 'futsal' ? futsalClock?.period ?? 1 : footballClock?.period ?? 1;
  const teamA = workspace.teams[0];
  const teamB = workspace.teams[1];
  const attackDirection = sport === 'futsal'
    ? futsalAttackDirection(workspace.state.metadata, period, teamA.id)
    : footballOrientation(workspace.state.metadata, period, teamA.id);
  const flipped = attackDirection === 'x0';
  const orderedActions: readonly EssentialScoutRecord[] = [...(workspace.essentialActions ?? [])]
    .sort((left, right) => left.sequence - right.sequence);
  const lastAction = orderedActions.at(-1);
  const scoreA = sport === 'futsal' ? workspace.futsalScout?.score[teamA.id] ?? 0 : workspace.football?.score.teamA ?? 0;
  const scoreB = sport === 'futsal' ? workspace.futsalScout?.score[teamB.id] ?? 0 : workspace.football?.score.teamB ?? 0;

  const [workbenchView, setWorkbenchView] = useState<'court' | 'history'>('court');
  const [initialActionId] = useState(lastAction?.id);
  const [teamId, setTeamId] = useState(teamA.id);
  const [shirtNumber, setShirtNumber] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [pending, setPending] = useState<PendingAction>();
  const pendingCode = pending?.code;
  const pendingEditingId = pending?.editingId;
  const [spatialMode, setSpatialMode] = useState<'origin' | 'destination' | 'trajectory'>('origin');
  const [courtRevision, setCourtRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string>();
  const [clockSaving, setClockSaving] = useState(false);
  const [orientationSaving, setOrientationSaving] = useState(false);
  const [notice, setNotice] = useState('Escolha um fundamento ou digite um código para começar.');
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [shortcutPrefix, setShortcutPrefix] = useState<'P' | 'R'>();
  const shirtRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLElement>(null);
  const captureStartedAt = useRef<number | undefined>(undefined);
  const savingRef = useRef(false);
  const prefixRef = useRef<'P' | 'R' | undefined>(undefined);
  const prefixTimeoutRef = useRef<number | undefined>(undefined);
  const shirtListId = useId();
  const operationBusy = busy || saving || Boolean(deletingId) || clockSaving || orientationSaving;
  const teamPlayers = workspace.players.filter(player => player.teamId === teamId);
  const numericShirt = shirtNumber.trim() ? Number(shirtNumber) : undefined;
  const shirtInvalid = numericShirt !== undefined && (!Number.isInteger(numericShirt) || numericShirt < 0 || numericShirt > 999);
  const selectedPlayer = numericShirt !== undefined && !shirtInvalid
    ? teamPlayers.find(player => player.number === numericShirt)
    : undefined;
  const actionAttackDirection = sport === 'futsal'
    ? futsalAttackDirection(workspace.state.metadata, period, teamId)
    : footballOrientation(workspace.state.metadata, period, teamId);
  const actionAttacksScreenRight = actionAttackDirection ? (actionAttackDirection === 'x120') !== flipped : undefined;
  const displayedThirds = actionAttacksScreenRight === undefined ? undefined
    : actionAttacksScreenRight ? THIRDS : [...THIRDS].reverse();
  const pendingAnchorPoint = ['P', 'PF', 'C'].includes(pending?.code ?? '') && spatialMode === 'destination'
    ? pending?.destination : pending?.position ?? pending?.destination;
  const pendingThird = pending?.third ?? (pendingAnchorPoint && actionAttackDirection
    ? essentialThirdFromPosition(pendingAnchorPoint, actionAttackDirection) : undefined);
  const selectedVisualThird = pendingThird && displayedThirds ? displayedThirds.indexOf(pendingThird) + 1 : 0;
  const clockRunning = sport === 'futsal' ? futsalClock?.status === 'running' : Boolean(footballClock?.running);
  const clockCanToggle = sport === 'futsal'
    ? futsalClock?.status === 'running' || futsalClock?.status === 'paused' || futsalClock?.status === 'ready'
    : Boolean(footballClock);
  const clockText = sport === 'futsal'
    ? futsalClock ? formatFutsalRemaining(futsalClock, now) : '--:--'
    : footballClock ? formatElapsed(effectiveElapsed(footballClock, now)) : '--:--';

  useEffect(() => {
    if (!clockRunning) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [clockRunning]);

  useEffect(() => () => window.clearTimeout(prefixTimeoutRef.current), []);

  useEffect(() => {
    if (!pendingCode || typeof window.matchMedia !== 'function' || !window.matchMedia('(max-width: 640px)').matches) return;
    const frame = window.requestAnimationFrame(() => captureRef.current?.scrollIntoView?.({ block: 'start', behavior: 'auto' }));
    return () => window.cancelAnimationFrame(frame);
  }, [pendingCode, pendingEditingId]);

  function elapsedAtInteraction(): number {
    return sport === 'futsal'
      ? futsalClock ? effectiveFutsalElapsed(futsalClock, interactionNow()) : 0
      : footballClock ? effectiveElapsed(footballClock, interactionNow()) : 0;
  }

  function clearPrefix() {
    prefixRef.current = undefined;
    window.clearTimeout(prefixTimeoutRef.current);
    setShortcutPrefix(undefined);
  }

  function beginPrefix(value: 'P' | 'R') {
    clearPrefix();
    prefixRef.current = value;
    setShortcutPrefix(value);
    prefixTimeoutRef.current = window.setTimeout(() => {
      prefixRef.current = undefined;
      setShortcutPrefix(undefined);
    }, 1200);
  }

  function beginAction(code: EssentialActionCode) {
    setWorkbenchView('court');
    clearPrefix();
    captureStartedAt.current = undefined;
    setSpatialMode(code === 'P' || code === 'PF' || code === 'C' ? 'trajectory' : 'origin');
    setPending(previous => ({ code, qualifiers: [], ...(previous?.editingId ? { editingId: previous.editingId } : {}) }));
    setCodeInput(code);
    setCourtRevision(revision => revision + 1);
    setError('');
    setNotice(`${code} · ${CODE_LABELS[code]}: escolha qualificadores; depois toque no terço ou marque o ponto exato.`);
  }

  function editAction(record: EssentialScoutRecord) {
    setWorkbenchView('court');
    clearPrefix();
    captureStartedAt.current = undefined;
    setTeamId(record.teamId);
    const player = workspace.players.find(item => item.id === record.playerId);
    setShirtNumber(record.shirtNumber !== undefined ? String(record.shirtNumber) : player ? String(player.number) : '');
    setCodeInput(record.code);
    setSpatialMode(record.position && record.destination ? 'trajectory' : record.destination || record.thirdAnchor === 'destination' ? 'destination' : 'origin');
    setPending({ code: record.code, editingId: record.id, qualifiers: record.qualifiers ?? [], ...(record.position ? { position: record.position } : {}), ...(record.destination ? { destination: record.destination } : {}), ...(record.outcome ? { outcome: record.outcome } : {}), ...(record.passResult ? { passResult: record.passResult } : {}), ...(record.progressionType ? { progressionType: record.progressionType } : {}), ...(record.progressionResult ? { progressionResult: record.progressionResult } : {}), ...(record.foulCard ? { foulCard: record.foulCard } : {}), ...(record.foulAccumulated !== undefined ? { foulAccumulated: record.foulAccumulated } : {}), ...(record.restartType ? { restartType: record.restartType } : {}), ...(record.third ? { third: record.third } : {}), ...(record.thirdAnchor ? { thirdAnchor: record.thirdAnchor } : {}) });
    setCourtRevision(revision => revision + 1);
    setError('');
    setNotice(`Editando ${record.code} do ${record.period}º período, ${formatElapsed(record.elapsedMs)}.`);
  }

  function cancelPending() {
    clearPrefix();
    captureStartedAt.current = undefined;
    setPending(undefined);
    setCodeInput('');
    setCourtRevision(revision => revision + 1);
    setError('');
    setNotice('Ação cancelada. Nenhum registro foi criado.');
  }

  function chooseTypedCode(): boolean {
    const parsed = parseCompactAction(codeInput, sport);
    if (typeof parsed === 'string') { setError(parsed); return false; }
    clearPrefix();
    captureStartedAt.current = undefined;
    setSpatialMode(parsed.code === 'P' || parsed.code === 'PF' || parsed.code === 'C' ? 'trajectory' : 'origin');
    if (parsed.shirtNumber !== undefined) setShirtNumber(String(parsed.shirtNumber));
    const next: PendingAction = {
      code: parsed.code, qualifiers: parsed.qualifiers,
      ...(parsed.outcome ? { outcome: parsed.outcome } : {}),
      ...(parsed.passResult ? { passResult: parsed.passResult } : {}),
      ...(parsed.progressionType ? { progressionType: parsed.progressionType } : {}),
      ...(parsed.progressionResult ? { progressionResult: parsed.progressionResult } : {}),
      ...(parsed.foulAccumulated !== undefined ? { foulAccumulated: parsed.foulAccumulated } : {}),
      ...(parsed.foulCard ? { foulCard: parsed.foulCard } : {}),
      ...(parsed.restartType ? { restartType: parsed.restartType } : {}),
      ...(parsed.third ? { third: parsed.third, ...(['P', 'PF', 'C'].includes(parsed.code) ? { thirdAnchor: 'origin' as const } : {}) } : {}),
      capturedElapsedMs: elapsedAtInteraction(),
      ...(pending?.editingId ? { editingId: pending.editingId } : {}),
    };
    setPending(next);
    setCourtRevision(revision => revision + 1);
    setError('');
    setNotice(parsed.third ? `${parsed.code} · ${THIRD_LABELS[parsed.third]}: ${next.editingId ? 'confira e salve a correção.' : 'registrando…'}` : `${parsed.code}: toque no terço ou marque o ponto exato.`);
    if (parsed.third && !next.editingId && hasRequiredDetail(next, sport)) void saveAction(false, next, parsed.shirtNumber);
    return true;
  }

  function onCourtCapture(origin: EssentialPosition, destination: EssentialPosition) {
    if (!pending || operationBusy || savingRef.current) return;
    const capturedElapsedMs = captureStartedAt.current ?? elapsedAtInteraction();
    captureStartedAt.current = undefined;
    const next: PendingAction = {
      ...pending,
      position: ['P', 'PF', 'C'].includes(pending.code) && spatialMode === 'destination' ? undefined : origin,
      destination: ['F', 'P', 'PF', 'C'].includes(pending.code) && spatialMode !== 'origin'
        ? spatialMode === 'destination' ? origin : destination
        : undefined,
      third: undefined,
      thirdAnchor: undefined,
      ...(!pending.editingId ? { capturedElapsedMs } : {}),
    };
    setPending(next);
    setError('');
    if (!next.editingId && hasRequiredDetail(next, sport)) void saveAction(false, next);
    else setNotice(!hasRequiredDetail(next, sport) ? 'Ponto marcado. Complete a qualificação do fundamento.' : 'Ponto exato marcado. Confira e salve a correção.');
  }

  function chooseOutcome(outcome: EssentialOutcome) {
    if (!pending || operationBusy) return;
    const next = { ...pending, outcome };
    setPending(next);
    setError('');
    if (!next.editingId && hasLocation(next)) void saveAction(false, next);
    else setNotice(next.position || next.third ? 'Resultado selecionado. Salve a correção.' : 'Resultado selecionado. Toque no terço ou marque o ponto exato.');
  }

  function chooseDetail(changes: Partial<PendingAction>) {
    if (!pending || operationBusy) return;
    const next = { ...pending, ...changes };
    setPending(next);
    setError('');
    if (!next.editingId && hasLocation(next) && hasRequiredDetail(next, sport)) void saveAction(false, next);
    else setNotice(hasRequiredDetail(next, sport) ? 'Qualificação pronta. Marque o terço ou o ponto exato.' : 'Complete a qualificação antes de registrar.');
  }

  function toggleQualifier(qualifier: EssentialQualifier) {
    if (!pending || operationBusy) return;
    const existing = pending.qualifiers ?? [];
    const qualifiers = existing.includes(qualifier) ? existing.filter(item => item !== qualifier) : [...existing, qualifier];
    setPending({ ...pending, qualifiers });
    setError('');
  }

  function chooseThird(third: EssentialThird) {
    if (!pending || operationBusy) return;
    const next: PendingAction = {
      ...pending, third, position: undefined, destination: undefined,
      thirdAnchor: ['P', 'PF', 'C'].includes(pending.code) ? spatialMode === 'destination' ? 'destination' : 'origin' : undefined,
      ...(!pending.editingId ? { capturedElapsedMs: elapsedAtInteraction() } : {}),
    };
    setPending(next);
    setCourtRevision(revision => revision + 1);
    setError('');
    if (!next.editingId && hasRequiredDetail(next, sport)) void saveAction(false, next);
    else setNotice(!hasRequiredDetail(next, sport) ? `${THIRD_LABELS[third]} marcado. Complete a qualificação.` : `${THIRD_LABELS[third]} marcado. Salve a correção.`);
  }

  async function saveAction(withoutLocation = false, source = pending, shirtOverride?: number) {
    if (!source || operationBusy || savingRef.current) return;
    const actionShirt = shirtOverride ?? numericShirt;
    if (actionShirt !== undefined && (!Number.isInteger(actionShirt) || actionShirt < 0 || actionShirt > 999)) {
      setError('Camisa deve ser um número de 0 a 999.'); return;
    }
    if (!hasRequiredDetail(source, sport)) {
      setError('Complete o resultado ou o tipo obrigatório deste fundamento.');
      return;
    }
    if (source.code === 'F' && !source.position && !source.third) {
      setError('Marque a origem ou o terço da finalização.');
      return;
    }
    if (!withoutLocation && !hasLocation(source)) {
      setError('Escolha o terço, marque o ponto ou use “Salvar sem localização”.');
      return;
    }
    const actionPlayer = actionShirt === undefined ? undefined : teamPlayers.find(player => player.number === actionShirt);
    const hasExactPoint = Boolean(source.position || source.destination);
    const draft: EssentialScoutDraft = {
      code: source.code,
      teamId,
      ...(actionShirt !== undefined ? { shirtNumber: actionShirt } : {}),
      ...(actionPlayer ? { playerId: actionPlayer.id } : {}),
      ...(!withoutLocation && source.position ? { position: source.position } : {}),
      ...(!withoutLocation && ['F', 'P', 'PF', 'C'].includes(source.code) && source.destination ? { destination: source.destination } : {}),
      ...(!withoutLocation && !hasExactPoint && source.third ? { third: source.third, ...(['P', 'PF', 'C'].includes(source.code) ? { thirdAnchor: source.thirdAnchor ?? 'origin' } : {}) } : {}),
      ...(source.code === 'F' && source.outcome ? { outcome: source.outcome } : {}),
      ...(source.code === 'PF' ? { passResult: 'complete' as const } : source.code === 'P' && source.passResult ? { passResult: source.passResult } : {}),
      ...(source.code === 'C' && source.progressionType ? { progressionType: source.progressionType } : {}),
      ...(source.code === 'C' && source.progressionResult ? { progressionResult: source.progressionResult } : {}),
      ...(source.code === 'FL' && source.foulCard ? { foulCard: source.foulCard } : {}),
      ...(source.code === 'FL' && source.foulAccumulated !== undefined ? { foulAccumulated: source.foulAccumulated } : {}),
      ...(source.code === 'RE' && source.restartType ? { restartType: source.restartType } : {}),
      ...(source.qualifiers?.length ? { qualifiers: source.qualifiers } : {}),
      ...(!source.editingId ? { capturedElapsedMs: source.capturedElapsedMs ?? elapsedAtInteraction() } : {}),
    };
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      if (source.editingId) await onCorrect(source.editingId, draft);
      else await onRegister(draft);
      setPending(undefined);
      setCodeInput('');
      setCourtRevision(revision => revision + 1);
      setNotice(source.editingId ? 'Correção salva.' : `${source.code} registrado.`);
    } catch {
      setError('Não foi possível salvar. A ação pendente foi preservada para tentar novamente.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function deleteAction(record: EssentialScoutRecord) {
    if (operationBusy) return;
    setDeletingId(record.id);
    setError('');
    try {
      await onDelete(record.id);
      if (pending?.editingId === record.id) cancelPending();
      setNotice(`${record.code} excluído do Scout Essencial.`);
    } catch {
      setError('Não foi possível excluir. O registro e a ação pendente foram preservados.');
    } finally {
      setDeletingId(undefined);
    }
  }

  async function toggleClock() {
    if (operationBusy || !clockCanToggle) return;
    setClockSaving(true);
    setError('');
    try {
      await onClockToggle();
      setNow(interactionNow());
    } catch {
      setError('Não foi possível alterar o relógio. Confira o estado da partida e tente novamente.');
    } finally {
      setClockSaving(false);
    }
  }

  async function setOrientation(direction: 'x120' | 'x0') {
    if (operationBusy || direction === attackDirection) return;
    setOrientationSaving(true);
    setError('');
    try {
      await onSetOrientation(direction);
      setNotice(`Direção de ataque de ${teamA.name} atualizada para o ${period}º período.`);
    } catch {
      setError('Não foi possível salvar a direção de ataque. Tente novamente.');
    } finally {
      setOrientationSaving(false);
    }
  }

  useEffect(() => {
    if (!shortcutsEnabled) return;
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.isComposing || target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], dialog')) return;
      const key = event.key.toLowerCase();
      if (event.shiftKey && key === 't' && pending && !operationBusy) {
        const qualifier = QUALIFIER_KEYS[pending.code].T;
        if (qualifier) { event.preventDefault(); toggleQualifier(qualifier); }
        return;
      }
      if (event.shiftKey && key === 'f' && !operationBusy) { event.preventDefault(); beginAction('FL'); return; }
      if (event.shiftKey && key === 'r' && !operationBusy) { event.preventDefault(); beginAction('RE'); return; }
      if (event.shiftKey) return;
      if (key === 'escape') { event.preventDefault(); if (!operationBusy) cancelPending(); return; }
      if (key === 'j') { event.preventDefault(); clearPrefix(); shirtRef.current?.focus(); return; }
      if (key === 't') { event.preventDefault(); clearPrefix(); void toggleClock(); return; }
      if (key === 'z') { event.preventDefault(); clearPrefix(); if (lastAction) void deleteAction(lastAction); return; }
      if ((key === '1' || key === '2') && !operationBusy) {
        event.preventDefault(); clearPrefix(); setTeamId(workspace.teams[Number(key) - 1].id); setShirtNumber(''); return;
      }
      if (pending && !operationBusy && (key === '3' || key === '4' || key === '5')) {
        event.preventDefault(); clearPrefix(); chooseThird(THIRDS[Number(key) - 3]); return;
      }
      if (pending?.code === 'F' && !operationBusy) {
        const outcome = ESSENTIAL_OUTCOMES.find(value => OUTCOME_LABELS[value].key.toLowerCase() === key);
        if (outcome) { event.preventDefault(); clearPrefix(); chooseOutcome(outcome); return; }
      }
      const prefix = prefixRef.current;
      if (prefix === 'P' && (key === 'f' || key === 'p')) {
        event.preventDefault(); beginAction(key === 'f' ? 'PF' : 'PP'); return;
      }
      if (prefix === 'R' && key === 'p') {
        event.preventDefault(); beginAction('RP'); return;
      }
      if (prefix) clearPrefix();
      if (pending?.code === 'P' && !operationBusy) {
        const passResult = { s: 'complete', i: 'incomplete', u: 'unknown' }[key] as EssentialPassResult | undefined;
        if (passResult) { event.preventDefault(); chooseDetail({ passResult }); return; }
      }
      if (pending?.code === 'C' && !operationBusy) {
        const progressionType = { c: 'carry', d: 'dribble' }[key] as EssentialProgressionType | undefined;
        const progressionResult = { m: 'retained', n: 'lost', u: 'unknown' }[key] as EssentialProgressionResult | undefined;
        if (progressionType || progressionResult) { event.preventDefault(); chooseDetail({ ...(progressionType ? { progressionType } : {}), ...(progressionResult ? { progressionResult } : {}) }); return; }
      }
      if (pending?.code === 'FL' && !operationBusy) {
        if (sport === 'futsal' && (key === 'a' || key === 'n')) { event.preventDefault(); chooseDetail({ foulAccumulated: key === 'a' }); return; }
        if (key === 'y' || key === 'r') { event.preventDefault(); chooseDetail({ foulCard: key === 'y' ? 'yellow' : 'red' }); return; }
      }
      if (pending?.code === 'RE' && !operationBusy) {
        const types = sport === 'futsal' ? FUTSAL_ESSENTIAL_RESTART_TYPES : FOOTBALL_ESSENTIAL_RESTART_TYPES;
        const restartType = types.find(item => RESTART_KEYS[item].toLowerCase() === key);
        if (restartType) { event.preventDefault(); chooseDetail({ restartType }); return; }
      }
      if (pending && !operationBusy) {
        const qualifier = QUALIFIER_KEYS[pending.code][key.toUpperCase()];
        if (qualifier) { event.preventDefault(); clearPrefix(); toggleQualifier(qualifier); return; }
      }
      if (operationBusy) return;
      if (key === 'f') { event.preventDefault(); beginAction('F'); }
      else if (key === 'p') { event.preventDefault(); beginAction('P'); beginPrefix('P'); }
      else if (key === 'c') { event.preventDefault(); beginAction('C'); }
      else if (key === 'r') { event.preventDefault(); beginAction('RE'); beginPrefix('R'); }
    }
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  });

  return <main className="page-section essential-scout-screen" aria-label="Scout Essencial" data-sport={sport} data-view={workbenchView}>
    <header className="essential-scout-header">
      <div className="essential-scout-score" aria-label="Placar do Scout Essencial">
        <span>{teamA.name}</span><strong>{scoreA} × {scoreB}</strong><span>{teamB.name}</span>
      </div>
      <div className="essential-scout-clock" aria-label="Relógio do Scout Essencial">
        <span>{period}º período · {clockText} {sport === 'futsal' ? 'restantes' : 'decorridos'}</span>
        <button type="button" aria-keyshortcuts="T" disabled={operationBusy || !clockCanToggle} onClick={() => void toggleClock()}>{clockSaving ? 'Salvando…' : clockRunning ? 'Pausar tempo (T)' : 'Iniciar tempo (T)'}</button>
        {!clockCanToggle && <small>Use Registro para os controles avançados do relógio.</small>}
      </div>
    </header>

    <nav className="court-workbench-nav" aria-label="Ferramentas de registro">
      <button type="button" aria-pressed={workbenchView === 'court'} onClick={() => setWorkbenchView('court')}>Quadra</button>
      <button type="button" aria-pressed={workbenchView === 'history'} onClick={() => setWorkbenchView('history')}>Histórico <small>{orderedActions.length}</small></button>
      {onOpenAdvanced && <button type="button" onClick={onOpenAdvanced}>Ajustes da partida</button>}
      <span className="court-live-indicator">{sport === 'futsal' ? 'Futsal' : 'Futebol'} · {period}º período</span>
    </nav>
    <div className="essential-scout-layout">

    <div className="essential-scout-orientation">
      <label>Direção de ataque da Equipe A
        <select aria-label="Direção de ataque da Equipe A" value={attackDirection ?? ''} disabled={operationBusy} onChange={event => { if (event.target.value === 'x120' || event.target.value === 'x0') void setOrientation(event.target.value); }}>
          <option value="">Não definida</option>
          <option value="x120">{teamA.name} ataca →</option>
          <option value="x0">{teamA.name} ataca ←</option>
        </select>
      </label>
      <small>{period}º período · define os lados dos terços no campo; trocar a equipe do registro não vira a quadra.</small>

    </div>

    <div className="essential-scout-identity">
      <label>Equipe
        <select aria-label="Equipe" value={teamId} disabled={operationBusy} onChange={event => { setTeamId(event.target.value); setShirtNumber(''); }}>
          {workspace.teams.map((team, index) => <option key={team.id} value={team.id}>{team.name} ({index + 1})</option>)}
        </select>
      </label>
      <label>Camisa
        <input ref={shirtRef} aria-label="Camisa" aria-keyshortcuts="J" type="text" inputMode="numeric" autoComplete="off" list={shirtListId} maxLength={3} value={shirtNumber} disabled={operationBusy} onChange={event => setShirtNumber(event.target.value.replace(/\D/g, ''))} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} placeholder="0–999 · J" />
        <datalist id={shirtListId}>{teamPlayers.map(player => <option key={player.id} value={String(player.number)} label={player.name || `#${player.number}`} />)}</datalist>
      </label>
      <span className="essential-scout-player-status" key={`${teamId}:${shirtNumber}`} role="status">{shirtInvalid ? 'Camisa deve estar entre 0 e 999' : selectedPlayer ? `#${selectedPlayer.number}${selectedPlayer.name ? ` · ${selectedPlayer.name}` : ''}` : numericShirt !== undefined ? `#${numericShirt} · número observado; atleta sem cadastro` : 'Camisa opcional'}</span>
    </div>

    <div className="essential-scout-actions" role="group" aria-label="Ações do Scout Essencial">
      <h2>Fundamentos</h2>
      {ESSENTIAL_CODES.map(code => <button key={code} type="button" aria-label={`${code} · ${CODE_LABELS[code]}`} aria-keyshortcuts={code === 'FL' ? 'Shift+F' : code === 'RE' ? 'Shift+R' : code.length === 1 ? code : undefined} aria-pressed={pending?.code === code} disabled={operationBusy} onClick={() => beginAction(code)}><kbd>{code}</kbd><span>{CODE_LABELS[code]}</span></button>)}
    </div>

    <div className="essential-scout-guidance" role="status">
      <span>{notice}</span>
      {shortcutPrefix && <strong>{shortcutPrefix === 'P' ? 'P… pressione F para PF ou P para PP.' : 'R… pressione P para RP.'}</strong>}
    </div>

    {error && <p className="essential-scout-error" role="alert">{error}</p>}
    <div className="essential-scout-capture">
      {pending && <section ref={captureRef} className="essential-scout-pending" aria-label="Ação pendente">
        <div className="essential-scout-pending-summary"><strong>{pending.editingId ? `Editar ${pending.code}` : `${pending.code} · ${CODE_LABELS[pending.code]}`}</strong><span>{pending.third ? `Terço ${THIRD_LABELS[pending.third].toLowerCase()}${['P', 'PF', 'C'].includes(pending.code) ? ` · ${pending.thirdAnchor === 'destination' ? 'destino' : 'origem'}` : ''}` : pending.position ? `Ponto ${formatPoint(pending.position)}` : pending.destination ? `Destino ${formatPoint(pending.destination)}` : 'Selecione o terço ou marque um ponto'}{pending.destination && pending.position ? ` → ${formatPoint(pending.destination)}` : ''}</span></div>
        {['F', 'P', 'PF', 'C'].includes(pending.code) && <div className="essential-scout-pf-location" role="group" aria-label="Pontos da ação">{(pending.code === 'F' ? ['origin', 'trajectory'] as const : ['origin', 'destination', 'trajectory'] as const).map(mode => <button type="button" key={mode} aria-pressed={spatialMode === mode} disabled={operationBusy} onClick={() => { setSpatialMode(mode); setPending(current => current ? { ...current, position: undefined, destination: undefined, third: undefined, thirdAnchor: undefined } : current); setCourtRevision(revision => revision + 1); }}>{mode === 'origin' ? 'Origem' : mode === 'destination' ? 'Destino' : 'Origem → destino'}</button>)}</div>}
        {pending.code === 'F' && <fieldset className="essential-scout-outcomes"><legend>Resultado da finalização</legend>{ESSENTIAL_OUTCOMES.map(outcome => <button type="button" key={outcome} aria-label={OUTCOME_LABELS[outcome].label} aria-keyshortcuts={OUTCOME_LABELS[outcome].key} aria-pressed={pending.outcome === outcome} disabled={operationBusy} onClick={() => chooseOutcome(outcome)}>{OUTCOME_LABELS[outcome].label} <kbd>{OUTCOME_LABELS[outcome].key}</kbd></button>)}</fieldset>}
        {pending.code === 'P' && <fieldset className="essential-scout-outcomes"><legend>Resultado do passe · obrigatório</legend>{ESSENTIAL_PASS_RESULTS.map(result => <button type="button" key={result} aria-pressed={pending.passResult === result} disabled={operationBusy} onClick={() => chooseDetail({ passResult: result })}>{PASS_RESULT_LABELS[result]} <kbd>{result === 'complete' ? 'S' : result === 'incomplete' ? 'I' : 'U'}</kbd></button>)}</fieldset>}
        {pending.code === 'PF' && <p className="essential-scout-fixed-result">Passe para finalização · passe completo observado.</p>}
        {pending.code === 'C' && <><fieldset className="essential-scout-outcomes"><legend>Como avançou · obrigatório</legend>{ESSENTIAL_PROGRESSION_TYPES.map(type => <button type="button" key={type} aria-pressed={pending.progressionType === type} disabled={operationBusy} onClick={() => chooseDetail({ progressionType: type })}>{PROGRESSION_TYPE_LABELS[type]} <kbd>{type === 'carry' ? 'C' : 'D'}</kbd></button>)}</fieldset><fieldset className="essential-scout-outcomes"><legend>Resultado da progressão · obrigatório</legend>{ESSENTIAL_PROGRESSION_RESULTS.map(result => <button type="button" key={result} aria-pressed={pending.progressionResult === result} disabled={operationBusy} onClick={() => chooseDetail({ progressionResult: result })}>{PROGRESSION_RESULT_LABELS[result]} <kbd>{result === 'retained' ? 'M' : result === 'lost' ? 'N' : 'U'}</kbd></button>)}</fieldset></>}
        {pending.code === 'FL' && <><fieldset className="essential-scout-outcomes"><legend>Cartão observado · opcional</legend>{(['yellow', 'red'] as const).map(card => <button type="button" key={card} aria-pressed={pending.foulCard === card} disabled={operationBusy} onClick={() => chooseDetail({ foulCard: pending.foulCard === card ? undefined : card })}>{card === 'yellow' ? 'Amarelo' : 'Vermelho'} <kbd>{card === 'yellow' ? 'Y' : 'R'}</kbd></button>)}</fieldset>{sport === 'futsal' && <fieldset className="essential-scout-outcomes"><legend>Falta acumulada · obrigatório</legend><button type="button" aria-pressed={pending.foulAccumulated === true} disabled={operationBusy} onClick={() => chooseDetail({ foulAccumulated: true })}>Sim <kbd>A</kbd></button><button type="button" aria-pressed={pending.foulAccumulated === false} disabled={operationBusy} onClick={() => chooseDetail({ foulAccumulated: false })}>Não <kbd>N</kbd></button></fieldset>}</>}
        {pending.code === 'RE' && <fieldset className="essential-scout-outcomes"><legend>Tipo de reinício · obrigatório</legend>{(sport === 'futsal' ? FUTSAL_ESSENTIAL_RESTART_TYPES : FOOTBALL_ESSENTIAL_RESTART_TYPES).map(type => <button type="button" key={type} aria-pressed={pending.restartType === type} disabled={operationBusy} onClick={() => chooseDetail({ restartType: type })}>{RESTART_LABELS[type]} <kbd>{RESTART_KEYS[type]}</kbd></button>)}</fieldset>}
        <fieldset className="essential-scout-qualifiers"><legend>Qualificadores observados · opcionais</legend>{ESSENTIAL_QUALIFIERS_BY_CODE[pending.code].map(qualifier => <button type="button" key={qualifier} aria-label={QUALIFIER_LABELS[qualifier]} aria-keyshortcuts={qualifierKey(pending.code, qualifier) === 'T' ? 'Shift+T' : qualifierKey(pending.code, qualifier)} aria-pressed={Boolean(pending.qualifiers?.includes(qualifier))} disabled={operationBusy} onClick={() => toggleQualifier(qualifier)}>{QUALIFIER_LABELS[qualifier]} <kbd>{qualifierKey(pending.code, qualifier) === 'T' ? '⇧T' : qualifierKey(pending.code, qualifier)}</kbd></button>)}</fieldset>
        <div className="essential-scout-thirds" role="group" aria-label="Terço do campo ou da quadra">
          {THIRDS.map(third => <button type="button" key={third} aria-label={`Terço ${THIRD_LABELS[third].toLowerCase()} (${THIRD_SHORTCUTS[third]})`} aria-keyshortcuts={THIRD_SHORTCUTS[third]} aria-pressed={pending.third === third} disabled={operationBusy || shirtInvalid} onClick={() => chooseThird(third)}><span>{THIRD_LABELS[third]}</span><kbd>{THIRD_SHORTCUTS[third]}</kbd></button>)}
        </div>
        <div className="essential-scout-pending-buttons">
          <button type="button" className="button primary" disabled={operationBusy || shirtInvalid || !hasLocation(pending) || !hasRequiredDetail(pending, sport)} onClick={() => void saveAction()}>{saving ? 'Salvando…' : pending.editingId ? 'Salvar correção' : 'Registrar ação'}</button>
          {pending.code !== 'F' && <button type="button" className="button secondary" disabled={operationBusy || shirtInvalid || !hasRequiredDetail(pending, sport)} onClick={() => void saveAction(true)}>Salvar sem localização</button>}
          <button type="button" className="button ghost" disabled={operationBusy} onClick={cancelPending}>{pending.editingId ? 'Cancelar edição' : 'Cancelar ação'}</button>
        </div>
      </section>}

      <div className="essential-scout-court" data-selected-visual-third={selectedVisualThird || undefined}>
        <h2>{sport === 'futsal' ? 'Quadra de futsal' : 'Campo de futebol'}</h2>
        <div className="essential-scout-court-third-labels" aria-hidden="true">{(displayedThirds ?? THIRDS).map((third, index) => <span key={`${third}-${index}`}>{actionAttackDirection ? THIRD_LABELS[third] : index === 1 ? 'Centro' : 'Direção ?'}</span>)}</div>
        <GestureCourtInput
          key={`${pending?.code ?? 'idle'}:${pending?.editingId ?? 'new'}:${spatialMode}:${courtRevision}`}
          sport={sport}
          zoneLabels={displayedThirds?.map(third => `Terço ${THIRD_LABELS[third].toLowerCase()}`)}
          captureMode={pending && ['F', 'P', 'PF', 'C'].includes(pending.code) && spatialMode === 'trajectory' ? 'trajectory' : 'point'}
          isEnabled={Boolean(pending) && !operationBusy}
          flipped={flipped}
          teamNames={flipped ? [teamB.name, teamA.name] : [teamA.name, teamB.name]}
          initialOrigin={pending?.position}
          initialDestination={pending?.destination ?? pending?.position}
          pointHint={pending && ['F', 'P', 'PF', 'C'].includes(pending.code) ? spatialMode === 'trajectory' ? 'Toque na origem e no destino, ou arraste.' : spatialMode === 'origin' ? 'Toque apenas na origem.' : 'Toque apenas no destino.' : 'Toque no ponto exato observado.'}
          disabledHint={pending ? 'Aguarde a conclusão da operação.' : 'Escolha uma ação para marcar o campo ou a quadra.'}
          onCaptureStart={() => { captureStartedAt.current = elapsedAtInteraction(); }}
          onTrajectory={trajectory => onCourtCapture(trajectory.origin, trajectory.destination)}
          onCancel={() => { if (!operationBusy) cancelPending(); }}
        />
        {pending && !actionAttackDirection && <small>Direção de ataque não definida: o ponto exato será salvo sem terço derivado.</small>}
        {pending && pendingAnchorPoint && pendingThird && <small>Ponto exato no terço {THIRD_LABELS[pendingThird].toLowerCase()} da equipe selecionada.</small>}
      </div>
    </div>

    <div className="essential-scout-code-entry">
      <label>Código rápido
        <input aria-label="Código" value={codeInput} disabled={operationBusy} onChange={event => { setCodeInput(event.target.value.toUpperCase()); setError(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (chooseTypedCode()) event.currentTarget.blur(); } }} placeholder="09FG3 · 09PS3 · 09CCM3" maxLength={24} autoComplete="off" />
      </label>
      <button type="button" disabled={operationBusy} onClick={chooseTypedCode}>Aplicar código</button>
      <small>Camisa + fundamento + resultado + qualificadores + terço (1 defensivo · 2 central · 3 ofensivo). Ex.: <strong>09PS3</strong> = passe certo de #9 no terço ofensivo.</small>
    </div>
    </div>

    {lastAction && <div className="court-receipt" key={lastAction.id} data-fresh={initialActionId !== lastAction.id} role="status">
      <span className="court-receipt-check" aria-hidden="true">✓</span><div><small>Última ação salva</small><strong>{CODE_LABELS[lastAction.code]} · {workspace.teams.find(team => team.id === lastAction.teamId)?.name}{lastAction.shirtNumber !== undefined ? ` · #${lastAction.shirtNumber}` : ''}</strong></div>
      <b>{lastAction.outcome ? OUTCOME_LABELS[lastAction.outcome].label : 'Registrada'}</b>
    </div>}
    <div className="essential-scout-shortcuts">Atalhos: F finalização · P passe (PF/PP em sequência) · C progressão · R reinício (RP em sequência) · ⇧F falta · 1/2 equipe · 3/4/5 terço · J camisa · T tempo · Z desfazer · Esc cancelar. Use as letras exibidas nas opções para qualificar.</div>
    <section className="essential-scout-history" aria-label="Histórico do Scout Essencial">
      <header><h2>Histórico do Scout Essencial</h2><button type="button" disabled={operationBusy || !lastAction} aria-keyshortcuts="Z" onClick={() => { if (lastAction) void deleteAction(lastAction); }}>Desfazer último registro <kbd>Z</kbd></button></header>
      {orderedActions.length === 0 ? <p>Nenhuma ação essencial registrada.</p> : <ol>{orderedActions.map(record => {
        const team = workspace.teams.find(item => item.id === record.teamId);
        const player = workspace.players.find(item => item.id === record.playerId);
        const recordDirection = sport === 'futsal'
          ? futsalAttackDirection(workspace.state.metadata, record.period, record.teamId)
          : footballOrientation(workspace.state.metadata, record.period, record.teamId);
        const anchorPoint = record.thirdAnchor === 'destination' ? record.destination : record.position ?? record.destination;
        const recordThird = record.third ?? (anchorPoint && recordDirection ? essentialThirdFromPosition(anchorPoint, recordDirection) : undefined);
        const recordShirt = record.shirtNumber ?? player?.number;
        return <li key={record.id} data-fact-id={record.id}>
          <div className="essential-scout-history-info"><strong>{record.code} · {CODE_LABELS[record.code]}</strong><span>{record.period}º · {formatElapsed(record.elapsedMs)} · {team?.name ?? 'Equipe não identificada'}{recordShirt !== undefined ? ` · #${recordShirt}${player?.name ? ` ${player.name}` : ''}` : ''}</span><small>{[
            record.outcome ? OUTCOME_LABELS[record.outcome].label : undefined,
            record.passResult ? `Passe ${PASS_RESULT_LABELS[record.passResult].toLowerCase()}` : undefined,
            record.progressionType ? PROGRESSION_TYPE_LABELS[record.progressionType] : undefined,
            record.progressionResult ? PROGRESSION_RESULT_LABELS[record.progressionResult] : undefined,
            record.foulCard ? `Cartão ${record.foulCard === 'yellow' ? 'amarelo' : 'vermelho'}` : undefined,
            record.foulAccumulated !== undefined ? `Acumulada: ${record.foulAccumulated ? 'sim' : 'não'}` : undefined,
            record.restartType ? RESTART_LABELS[record.restartType] : undefined,
            recordThird ? `Terço ${THIRD_LABELS[recordThird].toLowerCase()}${['P', 'PF', 'C'].includes(record.code) && record.third ? ` · ${record.thirdAnchor === 'destination' ? 'destino' : 'origem'}` : ''}` : undefined,
            ...(record.qualifiers ?? []).map(qualifier => QUALIFIER_LABELS[qualifier]),
          ].filter(Boolean).join(' · ')}{record.position ? ` · ponto ${formatPoint(record.position)}` : ''}{record.destination ? `${record.position ? ' → ' : ' · destino '}${formatPoint(record.destination)}` : ''}{!record.position && !record.destination && !record.third ? ' · sem localização' : ''}</small></div>
          <div className="essential-scout-history-buttons"><button type="button" disabled={operationBusy} onClick={() => editAction(record)}>Editar</button><button type="button" disabled={operationBusy} onClick={() => void deleteAction(record)}>{deletingId === record.id ? 'Excluindo…' : 'Excluir'}</button></div>
        </li>;
      })}</ol>}
    </section>
  </main>;
}

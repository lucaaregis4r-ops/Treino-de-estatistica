import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { MatchWorkspace } from '../../../application/ScoutTrainerService';
import {
  basketballPossessions,
  type BasketballFact,
  type BasketballFactDraft,
  type BasketballPressure,
  type BasketballRhythm,
  type BasketballTactic,
  type Point,
} from '../../../domain/basketball/BasketballScout';
import {
  classifyBasketballShotZone,
  BASKETBALL_ZONE_LABELS,
} from '../../../domain/basketball/BasketballGeometry';
import { basketballPressures, basketballTactics } from './BasketballLabels';
import './BasketballScoutScreen.css';

const kinds = {
  shot: 'Arremesso',
  turnover: 'Perda de posse',
  rebound: 'Rebote',
  foul: 'Falta',
  tactic: 'Ação tática',
  pass: 'Passe',
  possession: 'Posse',
} as const;

type Kind = keyof typeof kinds;
type Shortcut =
  | 'save'
  | 'shot'
  | 'turnover'
  | 'rebound'
  | 'pass'
  | 'possession'
  | 'timer'
  | 'reset24'
  | 'reset14';

const shortcutLabels: Record<Shortcut, string> = {
  save: 'Registrar lance',
  shot: 'Arremesso',
  turnover: 'Perda',
  rebound: 'Rebote',
  pass: 'Passe',
  possession: 'Iniciar posse',
  timer: 'Iniciar / pausar relógios',
  reset24: 'Repor 24 s',
  reset14: 'Repor 14 s',
};

const shortcutDefaults: Record<Shortcut, string> = {
  save: 'R',
  shot: 'A',
  turnover: 'P',
  rebound: 'B',
  pass: 'S',
  possession: 'O',
  timer: 'T',
  reset24: 'V',
  reset14: 'Q',
};

function loadShortcuts(): Record<Shortcut, string> {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem('basketball-shortcuts') ?? '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return shortcutDefaults;
    const merged = { ...shortcutDefaults };
    for (const action of Object.keys(shortcutDefaults) as Shortcut[]) {
      const value = (saved as Record<string, unknown>)[action];
      if (typeof value === 'string' && /^[A-Z0-9]$/.test(value)) merged[action] = value;
    }
    return new Set(Object.values(merged)).size === Object.keys(merged).length ? merged : shortcutDefaults;
  } catch {
    return shortcutDefaults;
  }
}

type BasketballClock = { game: number; shot: number; running: boolean };

function loadPeriod(matchId: string, fallback: number): number {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(`basketball-clock-${matchId}`) ?? '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      const period = (saved as Record<string, unknown>).period;
      if (typeof period === 'number' && Number.isInteger(period) && period >= 1 && period <= 10)
        return period;
    }
  } catch {
    /* Use the last registered period. */
  }
  return fallback;
}

function loadClock(matchId: string, latest?: BasketballFact): BasketballClock {
  const fallback: BasketballClock = {
    game: latest?.gameSeconds ?? (latest && latest.period > 4 ? 300 : 600),
    shot:
      latest?.kind === 'rebound' && latest.side === 'offensive' && latest.rimTouched
        ? 14
        : latest?.kind === 'turnover' ||
            (latest?.kind === 'shot' && latest.outcome === 'made' && latest.possessionEnds !== false) ||
            (latest?.kind === 'rebound' && latest.side === 'defensive')
          ? 24
          : latest?.shotSeconds ?? 24,
    running: false,
  };
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(`basketball-clock-${matchId}`) ?? '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return fallback;
    const stored = saved as Record<string, unknown>;
    return {
      game:
        typeof stored.game === 'number' &&
        Number.isInteger(stored.game) &&
        stored.game >= 0 &&
        stored.game <= 600
          ? stored.game
          : fallback.game,
      shot:
        typeof stored.shot === 'number' &&
        Number.isInteger(stored.shot) &&
        stored.shot >= 0 &&
        stored.shot <= 24
          ? stored.shot
          : fallback.shot,
      running: false,
    };
  } catch {
    return fallback;
  }
}

function clockText(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function factName(fact: BasketballFact): string {
  if (fact.kind === 'shot')
    return `${fact.outcome === 'made' ? 'Cesta' : fact.outcome === 'blocked' ? 'Toco' : 'Arremesso errado'} · ${fact.value} ponto${fact.value > 1 ? 's' : ''}${fact.assistPlayerId ? ' · assistência' : ''}${fact.tactic ? ` · ${basketballTactics[fact.tactic]}` : ''}`;
  if (fact.kind === 'turnover')
    return `Perda de posse${fact.tactic ? ` · ${basketballTactics[fact.tactic]}` : ''}`;
  if (fact.kind === 'rebound')
    return `Rebote ${fact.side === 'offensive' ? 'ofensivo' : 'defensivo'}`;
  if (fact.kind === 'foul')
    return `Falta ${fact.category === 'personal' ? 'pessoal' : fact.category === 'technical' ? 'técnica' : 'antidesportiva'}`;
  if (fact.kind === 'pass') return 'Passe';
  if (fact.kind === 'possession') return 'Início de posse';
  return basketballTactics[fact.tactic];
}

export function BasketballCourtMarkings() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth=".09" aria-hidden="true">
      <rect x=".05" y=".05" width="27.9" height="14.9" />
      <line x1="14" y1="0" x2="14" y2="15" />
      <circle cx="14" cy="7.5" r="1.8" />
      <rect x="0" y="4.55" width="5.8" height="5.9" />
      <rect x="22.2" y="4.55" width="5.8" height="5.9" />
      <circle cx="5.8" cy="7.5" r="1.8" />
      <circle cx="22.2" cy="7.5" r="1.8" />
      <path d="M 0 .9 L 2.99 .9 A 6.75 6.75 0 0 1 2.99 14.1 L 0 14.1 M 28 .9 L 25.01 .9 A 6.75 6.75 0 0 0 25.01 14.1 L 28 14.1" />
      <path d="M 1.575 6.25 A 1.25 1.25 0 0 1 1.575 8.75 M 26.425 6.25 A 1.25 1.25 0 0 0 26.425 8.75" />
      <line x1="1.2" y1="6.6" x2="1.2" y2="8.4" />
      <circle cx="1.575" cy="7.5" r=".22" />
      <line x1="26.8" y1="6.6" x2="26.8" y2="8.4" />
      <circle cx="26.425" cy="7.5" r=".22" />
      <path d="M 0 6.25 L .4 6.25 L .4 8.75 L 0 8.75 M 28 6.25 L 27.6 6.25 L 27.6 8.75 L 28 8.75" />
    </g>
  );
}

export function BasketballScoutScreen({
  workspace,
  busy,
  onRegister,
  onCorrect,
  onUndo,
}: {
  readonly workspace: MatchWorkspace;
  readonly busy: boolean;
  readonly onRegister: (period: number, draft: BasketballFactDraft) => Promise<void>;
  readonly onCorrect: (id: string, draft: BasketballFactDraft) => Promise<void>;
  readonly onUndo: () => Promise<void>;
}) {
  const projection = workspace.basketball!;
  const matchId = workspace.state.metadata.id;
  const [period, setPeriod] = useState(() => loadPeriod(matchId, projection.facts.at(-1)?.period ?? 1));
  const [teamId, setTeamId] = useState(
    () =>
      basketballPossessions(
        projection.facts,
        workspace.teams.map((team) => team.id)
      ).at(-1)?.teamId ?? workspace.teams[0].id
  );
  const [playerId, setPlayerId] = useState('');
  const [kind, setKind] = useState<Kind>('shot');
  const [value, setValue] = useState<1 | 2 | 3>(2);
  const [outcome, setOutcome] = useState<'made' | 'missed' | 'blocked'>('made');
  const [rhythm, setRhythm] = useState<BasketballRhythm>('set_offense');
  const [possessionEnds, setPossessionEnds] = useState(true);
  const [cause, setCause] = useState<
    'bad_pass' | 'lost_ball' | 'violation' | 'offensive_foul' | 'other'
  >('bad_pass');
  const [side, setSide] = useState<'offensive' | 'defensive'>('offensive');
  const [rimTouched, setRimTouched] = useState(false);
  const [category, setCategory] = useState<'personal' | 'technical' | 'unsportsmanlike'>('personal');
  const [tactic, setTactic] = useState<BasketballTactic | ''>('');
  const [pressure, setPressure] = useState<BasketballPressure | ''>('');
  const [assistPlayerId, setAssistPlayerId] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [position, setPosition] = useState<Point>();
  const [originPosition, setOriginPosition] = useState<Point>();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);
  const [dragCurrentPoint, setDragCurrentPoint] = useState<Point | null>(null);

  const [cursor, setCursor] = useState<Point>({ x: 0.5, y: 0.5 });
  const [courtFocused, setCourtFocused] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [beforeEdit, setBeforeEdit] = useState<{
    period: number;
    teamId: string;
    playerId: string;
    clock: { game: number; shot: number; running: boolean };
    pressure: BasketballPressure | '';
  }>();
  const [view, setView] = useState<'court' | 'history' | 'shortcuts'>('court');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState('');
  const savingRef = useRef(false);
  const [shortcuts, setShortcuts] = useState(loadShortcuts);
  const [adjustingClock, setAdjustingClock] = useState(false);
  const [clock, setClock] = useState<BasketballClock>(() =>
    loadClock(matchId, projection.facts.at(-1))
  );

  const players = workspace.players.filter(
    (player) => player.teamId === teamId && player.active !== false
  );

  useEffect(() => {
    localStorage.setItem(
      `basketball-clock-${matchId}`,
      JSON.stringify({ period, game: clock.game, shot: clock.shot })
    );
  }, [clock.game, clock.shot, matchId, period]);

  useEffect(() => {
    if (!clock.running) return;
    let last = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - last) / 1000);
      if (elapsed < 1) return;
      last += elapsed * 1000;
      setClock((current) => {
        const game = Math.max(0, current.game - elapsed);
        const shot = Math.max(0, current.shot - elapsed);
        return { game, shot, running: game > 0 && shot > 0 && current.running };
      });
    }, 250);
    return () => window.clearInterval(timer);
  }, [clock.running]);

  useEffect(() => {
    const pause = () => {
      if (document.hidden) setClock((current) => ({ ...current, running: false }));
    };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);

  function changePeriod(next: number) {
    setPeriod(next);
    setClock({ game: next <= 4 ? 600 : 300, shot: 24, running: false });
    setPressure('');
  }

  function draft(): BasketballFactDraft {
    const base = {
      teamId,
      gameSeconds: clock.game,
      shotSeconds: clock.shot,
      rhythm,
      ...(playerId ? { playerId } : {}),
      ...(position ? { position } : {}),
      ...(originPosition ? { originPosition } : {}),
      ...(pressure ? { pressure } : {}),
    };

    if (kind === 'shot')
      return {
        ...base,
        kind,
        value,
        outcome,
        possessionEnds,
        ...(tactic ? { tactic } : {}),
        ...(outcome === 'made' && assistPlayerId ? { assistPlayerId } : {}),
      };
    if (kind === 'turnover') return { ...base, kind, cause, ...(tactic ? { tactic } : {}) };
    if (kind === 'rebound')
      return { ...base, kind, side, ...(side === 'offensive' ? { rimTouched } : {}) };
    if (kind === 'foul') return { ...base, kind, category };
    if (kind === 'pass') return { ...base, kind, ...(receiverId ? { receiverId } : {}) };
    if (kind === 'possession') return { ...base, kind };
    return { ...base, kind, tactic: tactic || 'other' };
  }

  function edit(fact: BasketballFact) {
    setBeforeEdit({ period, teamId, playerId, clock: { ...clock, running: false }, pressure });
    setEditingId(fact.id);
    setView('court');
    setPeriod(fact.period);
    setTeamId(fact.teamId);
    setPlayerId(fact.playerId ?? '');
    setKind(fact.kind);
    setPosition(fact.position);
    setOriginPosition(fact.originPosition);
    setRhythm(fact.rhythm ?? 'set_offense');
    setTactic('tactic' in fact ? fact.tactic ?? '' : '');
    setPressure(fact.pressure ?? '');
    setClock((current) => ({ ...current, running: false }));
    if (fact.gameSeconds !== undefined || fact.shotSeconds !== undefined)
      setClock({
        game: fact.gameSeconds ?? clock.game,
        shot: fact.shotSeconds ?? clock.shot,
        running: false,
      });
    if (fact.kind === 'shot') {
      setValue(fact.value);
      setOutcome(fact.outcome);
      setPossessionEnds(fact.possessionEnds !== false);
      setAssistPlayerId(fact.assistPlayerId ?? '');
    }
    if (fact.kind === 'turnover') setCause(fact.cause);
    if (fact.kind === 'rebound') {
      setSide(fact.side);
      setRimTouched(fact.rimTouched === true);
    }
    if (fact.kind === 'foul') setCategory(fact.category);
    if (fact.kind === 'pass') setReceiverId(fact.receiverId ?? '');
  }

  async function save(override?: BasketballFactDraft) {
    if (busy || savingRef.current) return;
    savingRef.current = true;
    setError('');
    const current = override ?? draft();
    try {
      if (editingId) await onCorrect(editingId, current);
      else await onRegister(period, current);
      setReceipt(
        `${kinds[current.kind]} salvo para ${workspace.teams.find((team) => team.id === current.teamId)?.name}.`
      );
      setEditingId(undefined);
      setPosition(undefined);
      setOriginPosition(undefined);
      if (editingId && beforeEdit) {
        setPeriod(beforeEdit.period);
        setTeamId(beforeEdit.teamId);
        setPlayerId(beforeEdit.playerId);
        setClock(beforeEdit.clock);
        setPressure(beforeEdit.pressure);
        setBeforeEdit(undefined);
      }
      if (!editingId) {
        if (current.kind === 'pass' && current.receiverId) {
          setPlayerId(current.receiverId);
          setReceiverId('');
        }
        const transfer =
          current.kind === 'turnover' ||
          (current.kind === 'shot' &&
            current.outcome === 'made' &&
            current.possessionEnds !== false) ||
          (current.kind === 'rebound' && current.side === 'defensive');
        if (transfer) {
          const next =
            current.kind === 'rebound'
              ? current.teamId
              : workspace.teams.find((team) => team.id !== current.teamId)?.id;
          if (next) setTeamId(next);
          setPlayerId('');
          setAssistPlayerId('');
          setReceiverId('');
          setPressure('');
          setClock((previous) => ({ ...previous, shot: 24 }));
        } else if (current.kind === 'rebound' && current.side === 'offensive' && current.rimTouched)
          setClock((previous) => ({ ...previous, shot: 14 }));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar. O lance foi preservado.');
    } finally {
      savingRef.current = false;
    }
  }

  // Pointer drag & tap handlers for the court
  function onCourtPointerDown(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const pt: Point = {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
    setIsDragging(true);
    setDragStartPoint(pt);
    setDragCurrentPoint(pt);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onCourtPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isDragging || !dragStartPoint) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const pt: Point = {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
    setDragCurrentPoint(pt);
  }

  function onCourtPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!isDragging || !dragStartPoint) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const endPt: Point = {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };

    const dx = (endPt.x - dragStartPoint.x) * rect.width;
    const dy = (endPt.y - dragStartPoint.y) * rect.height;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 16) {
      // Operator dragged: start is creation/advantage, end is shot release
      setOriginPosition(dragStartPoint);
      setPosition(endPt);
    } else {
      // Single tap: end point is shot release
      setOriginPosition(undefined);
      setPosition(endPt);
    }

    setKind('shot');
    setIsDragging(false);
    setDragStartPoint(null);
    setDragCurrentPoint(null);
  }

  function courtKey(event: KeyboardEvent<HTMLDivElement>) {
    const delta = event.shiftKey ? 0.01 : 0.025;
    const next = { ...cursor };
    if (event.key === 'ArrowLeft') next.x = Math.max(0, next.x - delta);
    else if (event.key === 'ArrowRight') next.x = Math.min(1, next.x + delta);
    else if (event.key === 'ArrowUp') next.y = Math.max(0, next.y - delta);
    else if (event.key === 'ArrowDown') next.y = Math.min(1, next.y + delta);
    else if (event.key === 'Enter' || event.key === ' ') {
      setOriginPosition(undefined);
      setPosition(cursor);
    } else return;
    event.preventDefault();
    setCursor(next);
  }

  // Desktop keyboard shortcuts
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.repeat ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLTextAreaElement ||
        view !== 'court'
      )
        return;

      const upper = event.key.toUpperCase();

      // Number keys 1..5 for quick player select
      if (['1', '2', '3', '4', '5'].includes(event.key)) {
        const idx = Number(event.key) - 1;
        if (players[idx]) {
          event.preventDefault();
          setPlayerId(players[idx].id);
          return;
        }
      }

      // Space or Enter: Cesta rápida
      if (event.code === 'Space') {
        event.preventDefault();
        void save({ ...draft(), kind: 'shot', value, outcome: 'made' });
        return;
      }
      if (upper === 'X') {
        event.preventDefault();
        void save({ ...draft(), kind: 'shot', value, outcome: 'missed' });
        return;
      }

      const action = (Object.keys(shortcuts) as Shortcut[]).find(
        (key) => shortcuts[key] === upper
      );
      if (!action) return;
      event.preventDefault();

      if (action === 'save') void save();
      else if (action === 'timer')
        setClock((current) => ({ ...current, running: !current.running }));
      else if (action === 'reset24') setClock((current) => ({ ...current, shot: 24 }));
      else if (action === 'reset14') setClock((current) => ({ ...current, shot: 14 }));
      else if (action === 'possession')
        void save({
          teamId,
          kind: 'possession',
          gameSeconds: clock.game,
          shotSeconds: clock.shot,
          rhythm,
          ...(pressure ? { pressure } : {}),
        });
      else setKind(action);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function changeShortcut(action: Shortcut, key: string) {
    const upper = key.toUpperCase().trim();
    if (
      !/^[A-Z0-9]$/.test(upper) ||
      Object.entries(shortcuts).some(([name, assigned]) => name !== action && assigned === upper)
    ) {
      setError('Use uma letra ou número livre para cada atalho.');
      return;
    }
    const updated = { ...shortcuts, [action]: upper };
    setShortcuts(updated);
    localStorage.setItem('basketball-shortcuts', JSON.stringify(updated));
    setError('');
  }

  const score = projection.score;
  const currentZone = position ? classifyBasketballShotZone(position) : null;
  const activeTeam = workspace.teams.find((t) => t.id === teamId);

  return (
    <main className="page-section basketball-screen" data-sport="basketball">
      {/* Top Header: Scoreboard and Period */}
      <header className="basketball-header">
        <div>
          <p className="eyebrow">Basquete · Registro Tático</p>
          <h1>Quadra e Posse de Jogo</h1>
        </div>
        <div className="basketball-score" aria-label="Placar">
          <span className={teamId === workspace.teams[0].id ? 'active-possession' : ''}>
            {workspace.teams[0].name}
          </span>
          <strong>{score[workspace.teams[0].id] ?? 0}</strong>
          <span>×</span>
          <strong>{score[workspace.teams[1].id] ?? 0}</strong>
          <span className={teamId === workspace.teams[1].id ? 'active-possession' : ''}>
            {workspace.teams[1].name}
          </span>
        </div>
      </header>

      {/* Clocks, Reset & Rhythm Bar */}
      <section className="basketball-clock-bar" aria-label="Relógios e ritmo da partida">
        <div className="clock-col">
          <select
            value={period}
            disabled={!!editingId}
            className="quick-period-select"
            aria-label="Período da partida"
            onChange={(e) => changePeriod(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n <= 4 ? `${n}º quarto` : `${n - 4}ª prorr.`}
              </option>
            ))}
          </select>
          <strong aria-label="Tempo do período">{clockText(clock.game)}</strong>
        </div>
        <div className="clock-col">
          <small>24 segundos</small>
          <strong
            aria-label="Relógio de arremesso"
            className={clock.shot <= 5 ? 'text-coral' : 'text-mint'}
          >
            {clock.shot}
          </strong>
        </div>

        <button
          type="button"
          className="clock-btn"
          onClick={() => setClock((current) => ({ ...current, running: !current.running }))}
        >
          {clock.running ? '⏸️ Pausar' : '▶️ Iniciar'} <kbd>{shortcuts.timer}</kbd>
        </button>
        <button
          type="button"
          className="clock-btn"
          onClick={() => setClock((current) => ({ ...current, shot: 24 }))}
        >
          24 s <kbd>{shortcuts.reset24}</kbd>
        </button>
        <button
          type="button"
          className="clock-btn"
          onClick={() => setClock((current) => ({ ...current, shot: 14 }))}
        >
          14 s <kbd>{shortcuts.reset14}</kbd>
        </button>

        {/* Rhythm Toggle */}
        <div className="rhythm-toggle-group" role="group" aria-label="Ritmo da posse">
          <button
            type="button"
            className={`rhythm-chip ${rhythm === 'transition' ? 'active' : ''}`}
            onClick={() => setRhythm('transition')}
          >
            ⚡ Transição
          </button>
          <button
            type="button"
            className={`rhythm-chip ${rhythm === 'set_offense' ? 'active' : ''}`}
            onClick={() => setRhythm('set_offense')}
          >
            🛡️ Posicionado
          </button>
        </div>

        <button
          type="button"
          className="clock-btn clock-adjust-toggle"
          aria-expanded={adjustingClock}
          onClick={() => {
            setClock((current) => ({ ...current, running: false }));
            setAdjustingClock(!adjustingClock);
          }}
        >
          ⚙️ Ajustar
        </button>
      </section>

      {adjustingClock && (
        <section className="basketball-clock-adjust" aria-label="Ajustar relógios">
          <label>
            Minutos do quarto
            <input
              type="number"
              min="0"
              max={period <= 4 ? 10 : 5}
              value={Math.floor(clock.game / 60)}
              onChange={(e) =>
                setClock((current) => ({
                  ...current,
                  game: Math.min(
                    period <= 4 ? 600 : 300,
                    Math.max(0, Number(e.target.value) * 60 + (current.game % 60))
                  ),
                }))
              }
            />
          </label>
          <label>
            Segundos do quarto
            <input
              type="number"
              min="0"
              max="59"
              value={clock.game % 60}
              onChange={(e) =>
                setClock((current) => ({
                  ...current,
                  game: Math.min(
                    period <= 4 ? 600 : 300,
                    Math.floor(current.game / 60) * 60 +
                      Math.max(0, Math.min(59, Number(e.target.value)))
                  ),
                }))
              }
            />
          </label>
          <label>
            Relógio de arremesso
            <input
              type="number"
              min="0"
              max="24"
              value={clock.shot}
              onChange={(e) =>
                setClock((current) => ({
                  ...current,
                  shot: Math.max(0, Math.min(24, Number(e.target.value))),
                }))
              }
            />
          </label>
          <button type="button" onClick={() => setAdjustingClock(false)}>
            Concluir
          </button>
        </section>
      )}

      {/* Navigation tabs */}
      <nav className="court-workbench-nav" aria-label="Destinos do registro">
        <button
          type="button"
          aria-pressed={view === 'court'}
          onClick={() => setView('court')}
        >
          Quadra Tática
        </button>
        <button
          type="button"
          aria-pressed={view === 'history'}
          onClick={() => setView('history')}
        >
          Histórico <small>{projection.facts.length}</small>
        </button>
        <button
          type="button"
          aria-pressed={view === 'shortcuts'}
          onClick={() => setView('shortcuts')}
        >
          Atalhos
        </button>
      </nav>

      {/* Main Touch & Thumb-Zone Layout */}
      {view === 'court' && (
        <div className="basketball-fluid-scout-grid">
          {/* Left Thumb Rail: Tactical Advantage Triggers */}
          <aside className="scout-left-rail" aria-label="Gatilho tático da posse">
            <span className="rail-heading">Gatilho / Vantagem</span>
            <div className="trigger-buttons-stack">
              <button
                type="button"
                className={`tactical-trigger-btn ${tactic === 'pick_roll' ? 'active' : ''}`}
                onClick={() => setTactic(tactic === 'pick_roll' ? '' : 'pick_roll')}
              >
                <strong>P&R</strong>
                <small>Bloqueio direto</small>
              </button>
              <button
                type="button"
                className={`tactical-trigger-btn ${tactic === 'drive_kick' ? 'active' : ''}`}
                onClick={() => setTactic(tactic === 'drive_kick' ? '' : 'drive_kick')}
              >
                <strong>Infiltração</strong>
                <small>Drive & Kick</small>
              </button>
              <button
                type="button"
                className={`tactical-trigger-btn ${tactic === 'isolation' ? 'active' : ''}`}
                onClick={() => setTactic(tactic === 'isolation' ? '' : 'isolation')}
              >
                <strong>1v1 Iso</strong>
                <small>Perímetro</small>
              </button>
              <button
                type="button"
                className={`tactical-trigger-btn ${tactic === 'low_post' ? 'active' : ''}`}
                onClick={() => setTactic(tactic === 'low_post' ? '' : 'low_post')}
              >
                <strong>Poste</strong>
                <small>Garrafão</small>
              </button>
              <button
                type="button"
                className={`tactical-trigger-btn ${tactic === 'cut' ? 'active' : ''}`}
                onClick={() => setTactic(tactic === 'cut' ? '' : 'cut')}
              >
                <strong>Corte</strong>
                <small>Give & Go</small>
              </button>
              <button
                type="button"
                className={`tactical-trigger-btn ${tactic === 'spot_up' ? 'active' : ''}`}
                onClick={() => setTactic(tactic === 'spot_up' ? '' : 'spot_up')}
              >
                <strong>Spot-up</strong>
                <small>Passe extra</small>
              </button>
              <button
                type="button"
                className={`tactical-trigger-btn ${!tactic ? 'active' : ''}`}
                onClick={() => setTactic('')}
              >
                <strong>⚪ Fluido</strong>
                <small>Ação direta</small>
              </button>
            </div>
          </aside>

          {/* Center: Interactive Court (with Drag-to-Vector & Tap-to-Shoot) */}
          <section className="scout-center-court-area" aria-label="Quadra interativa">
            {/* Context bar above court */}
            <div className="court-context-bar">
              <div className="team-indicator-chip">
                <span>Posse:</span>
                <strong>{activeTeam?.name}</strong>
                <select
                  value={teamId}
                  className="quick-team-switch"
                  aria-label="Trocar equipe com posse"
                  onChange={(e) => {
                    setTeamId(e.target.value);
                    setPlayerId('');
                  }}
                >
                  {workspace.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {position && (
                <div className="shot-zone-badge">
                  <span className={value === 3 ? 'text-cyan' : 'text-mint'}>
                    {value === 3 ? '🎯 3 PTS' : '🏀 2 PTS'}
                  </span>
                  <small>{currentZone ? BASKETBALL_ZONE_LABELS[currentZone] : ''}</small>
                </div>
              )}
            </div>

            {/* The SVG Court Surface */}
            <div
              className="basketball-interactive-court"
              role="region"
              aria-label="Quadra interativa de basquete. Toque ou arraste para registrar trajetória."
              tabIndex={0}
              onPointerDown={onCourtPointerDown}
              onPointerMove={onCourtPointerMove}
              onPointerUp={onCourtPointerUp}
              onKeyDown={courtKey}
              onFocus={() => setCourtFocused(true)}
              onBlur={() => setCourtFocused(false)}
            >
              <svg viewBox="0 0 28 15" preserveAspectRatio="none">
                <BasketballCourtMarkings />

                {/* Dynamic live dragging arrow */}
                {isDragging && dragStartPoint && dragCurrentPoint && (
                  <g className="live-drag-vector">
                    <line
                      x1={dragStartPoint.x * 28}
                      y1={dragStartPoint.y * 15}
                      x2={dragCurrentPoint.x * 28}
                      y2={dragCurrentPoint.y * 15}
                      stroke="#38BDF8"
                      strokeWidth="0.18"
                      strokeDasharray="0.3 0.15"
                    />
                    <circle
                      cx={dragStartPoint.x * 28}
                      cy={dragStartPoint.y * 15}
                      r="0.25"
                      fill="#FFFFFF"
                      stroke="#38BDF8"
                      strokeWidth="0.08"
                    />
                    <circle
                      cx={dragCurrentPoint.x * 28}
                      cy={dragCurrentPoint.y * 15}
                      r="0.32"
                      fill="#38BDF8"
                    />
                  </g>
                )}

                {/* Render confirmed origin -> release vector if present */}
                {originPosition && position && (
                  <g className="confirmed-shot-vector">
                    <line
                      x1={originPosition.x * 28}
                      y1={originPosition.y * 15}
                      x2={position.x * 28}
                      y2={position.y * 15}
                      stroke="#10B981"
                      strokeWidth="0.16"
                    />
                    <circle
                      cx={originPosition.x * 28}
                      cy={originPosition.y * 15}
                      r="0.22"
                      fill="#FFFFFF"
                      stroke="#10B981"
                      strokeWidth="0.08"
                    />
                  </g>
                )}
              </svg>

              {courtFocused && (
                <span
                  className="basketball-key-cursor"
                  style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}
                />
              )}

              {position && (
                <span
                  className={`basketball-location-pin ${value === 3 ? 'is-three' : ''}`}
                  style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
                >
                  <small>{value}pt</small>
                </span>
              )}
            </div>

            {/* Instant HUD directly below court */}
            <div className="scout-court-hud" role="group" aria-label="Ações rápidas de posse">
              <button
                type="button"
                className="hud-action-btn reb-def"
                onClick={() => void save({ ...draft(), kind: 'rebound', side: 'defensive' })}
                disabled={busy}
              >
                🛡️ Reb Def
              </button>
              <button
                type="button"
                className="hud-action-btn reb-of"
                onClick={() =>
                  void save({
                    ...draft(),
                    kind: 'rebound',
                    side: 'offensive',
                    rimTouched: true,
                  })
                }
                disabled={busy}
              >
                ⚔️ Reb Of (14s)
              </button>
              <button
                type="button"
                className="hud-action-btn turnover"
                onClick={() =>
                  void save({ ...draft(), kind: 'turnover', cause: 'bad_pass' })
                }
                disabled={busy}
              >
                ⚠️ Perda de Posse
              </button>
              {position && (
                <button
                  type="button"
                  className="hud-action-btn clear-pos"
                  onClick={() => {
                    setPosition(undefined);
                    setOriginPosition(undefined);
                  }}
                >
                  ✕ Limpar Posição
                </button>
              )}
            </div>
          </section>

          {/* Right Thumb Rail: Active Players & Large Outcome Buttons */}
          <aside className="scout-right-rail" aria-label="Atleta e desfecho">
            <span className="rail-heading">Atleta da Finalização</span>
            <div className="player-chips-stack" role="group" aria-label="Atletas em quadra">
              <button
                type="button"
                className={`scout-player-chip ${!playerId ? 'selected' : ''}`}
                onClick={() => setPlayerId('')}
              >
                <strong>Ø</strong>
                <span>Geral</span>
              </button>
              {players.slice(0, 7).map((player) => (
                <button
                  key={player.id}
                  type="button"
                  className={`scout-player-chip ${playerId === player.id ? 'selected' : ''}`}
                  onClick={() => setPlayerId(player.id)}
                >
                  <strong>#{player.number}</strong>
                  <span>{player.name ?? `Atleta ${player.number}`}</span>
                </button>
              ))}
            </div>

            {/* Value Override Segmented */}
            <div className="shot-value-override" role="group" aria-label="Pontuação do arremesso">
              <button
                type="button"
                className={value === 1 ? 'active' : ''}
                onClick={() => {
                  setValue(1);
                  setKind('shot');
                }}
              >
                1 pt (LL)
              </button>
              <button
                type="button"
                className={value === 2 ? 'active' : ''}
                onClick={() => {
                  setValue(2);
                  setKind('shot');
                }}
              >
                2 pts
              </button>
              <button
                type="button"
                className={value === 3 ? 'active' : ''}
                onClick={() => {
                  setValue(3);
                  setKind('shot');
                }}
              >
                3 pts
              </button>
            </div>

            {/* Giant Outcome Action Buttons */}
            <div className="scout-outcome-buttons" role="group" aria-label="Desfecho do arremesso">
              <button
                type="button"
                className="outcome-btn btn-made"
                disabled={busy}
                onClick={() =>
                  void save({
                    ...draft(),
                    kind: 'shot',
                    value,
                    outcome: 'made',
                  })
                }
              >
                <span className="outcome-icon">✅</span>
                <strong>CESTA</strong>
                <small>+{value} pts</small>
              </button>

              <button
                type="button"
                className="outcome-btn btn-missed"
                disabled={busy}
                onClick={() =>
                  void save({
                    ...draft(),
                    kind: 'shot',
                    value,
                    outcome: 'missed',
                  })
                }
              >
                <span className="outcome-icon">❌</span>
                <strong>ERRO</strong>
                <small>Rebote em disputa</small>
              </button>

              <button
                type="button"
                className="outcome-btn btn-blocked"
                disabled={busy}
                onClick={() =>
                  void save({
                    ...draft(),
                    kind: 'shot',
                    value,
                    outcome: 'blocked',
                  })
                }
              >
                <span className="outcome-icon">🛑</span>
                <strong>TOCO</strong>
                <small>Arremesso bloqueado</small>
              </button>

              <button
                type="button"
                className="outcome-btn btn-foul"
                disabled={busy}
                onClick={() =>
                  void save({
                    ...draft(),
                    kind: 'foul',
                    category: 'personal',
                  })
                }
              >
                <span className="outcome-icon">⚠️</span>
                <strong>FALTA</strong>
                <small>Pessoal / And-1</small>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Status / Receipt */}
      {receipt && (
        <div className="court-receipt" role="status">
          <span className="court-receipt-check">✓</span>
          <strong>{receipt}</strong>
        </div>
      )}
      {error && (
        <p className="basketball-error" role="alert">
          {error}
        </p>
      )}

      {/* History view */}
      {view === 'history' && (
        <section className="basketball-history">
          <div className="basketball-history-heading">
            <h2>Lances registrados</h2>
            <button
              className="button secondary"
              disabled={busy || !projection.undoTargetHistoryEventId}
              onClick={() => void onUndo()}
            >
              Desfazer último
            </button>
          </div>
          {projection.facts.length ? (
            <ol>
              {[...projection.facts].reverse().map((fact) => (
                <li key={fact.id}>
                  <span>
                    <b>
                      {fact.period <= 4
                        ? `${fact.period}º quarto`
                        : `${fact.period - 4}ª prorrogação`}
                    </b>
                    {fact.gameSeconds !== undefined ? ` · ${clockText(fact.gameSeconds)}` : ''}
                    {fact.shotSeconds !== undefined ? ` · ${fact.shotSeconds}s` : ''} ·{' '}
                    {workspace.teams.find((team) => team.id === fact.teamId)?.name} ·{' '}
                    {fact.playerId
                      ? workspace.players.find((player) => player.id === fact.playerId)?.name +
                        ' · '
                      : ''}
                    {factName(fact)}
                    {fact.pressure ? ` · ${basketballPressures[fact.pressure]}` : ''}
                  </span>
                  <button type="button" onClick={() => edit(fact)}>
                    Corrigir
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p>Nenhum lance registrado.</p>
          )}
        </section>
      )}

      {/* Shortcuts view */}
      {view === 'shortcuts' && (
        <section className="basketball-shortcuts">
          <h2>Atalhos de teclado</h2>
          <p>
            Atalhos funcionam fora de campos de edição. Cada letra ou número deve ser único. As
            escolhas ficam neste dispositivo.
          </p>
          <div>
            {(Object.keys(shortcuts) as Shortcut[]).map((action) => (
              <label key={action}>
                {shortcutLabels[action]}
                <input
                  aria-label={`Atalho: ${shortcutLabels[action]}`}
                  maxLength={1}
                  value={shortcuts[action]}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => changeShortcut(action, event.target.value)}
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setShortcuts(shortcutDefaults);
              localStorage.removeItem('basketball-shortcuts');
            }}
          >
            Restaurar atalhos padrão
          </button>
        </section>
      )}
    </main>
  );
}

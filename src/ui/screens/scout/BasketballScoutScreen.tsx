import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { MatchWorkspace } from '../../../application/ScoutTrainerService';
import { basketballPossessions, type BasketballFact, type BasketballFactDraft, type BasketballPressure, type BasketballTactic, type Point } from '../../../domain/basketball/BasketballScout';
import { basketballPressures, basketballTactics } from './BasketballLabels';
import './BasketballScoutScreen.css';

const kinds = { shot: 'Arremesso', turnover: 'Perda de posse', rebound: 'Rebote', foul: 'Falta', tactic: 'Ação tática', pass: 'Passe', possession: 'Posse' } as const;
type Kind = keyof typeof kinds;
type Shortcut = 'save' | 'shot' | 'turnover' | 'rebound' | 'pass' | 'possession' | 'timer' | 'reset24' | 'reset14';
const shortcutLabels: Record<Shortcut, string> = { save: 'Registrar lance', shot: 'Arremesso', turnover: 'Perda', rebound: 'Rebote', pass: 'Passe', possession: 'Iniciar posse', timer: 'Iniciar / pausar relógios', reset24: 'Repor 24 s', reset14: 'Repor 14 s' };
const shortcutDefaults: Record<Shortcut, string> = { save: 'R', shot: 'A', turnover: 'P', rebound: 'B', pass: 'S', possession: 'O', timer: 'T', reset24: 'V', reset14: 'Q' };
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
  } catch { return shortcutDefaults; }
}
type BasketballClock = { game: number; shot: number; running: boolean };
function loadPeriod(matchId: string, fallback: number): number {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(`basketball-clock-${matchId}`) ?? '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      const period = (saved as Record<string, unknown>).period;
      if (typeof period === 'number' && Number.isInteger(period) && period >= 1 && period <= 10) return period;
    }
  } catch { /* Use the last registered period. */ }
  return fallback;
}
function loadClock(matchId: string, latest?: BasketballFact): BasketballClock {
  const fallback: BasketballClock = { game: latest?.gameSeconds ?? (latest && latest.period > 4 ? 300 : 600), shot: latest?.kind === 'rebound' && latest.side === 'offensive' && latest.rimTouched ? 14 : latest?.kind === 'turnover' || (latest?.kind === 'shot' && latest.outcome === 'made' && latest.possessionEnds !== false) || (latest?.kind === 'rebound' && latest.side === 'defensive') ? 24 : latest?.shotSeconds ?? 24, running: false };
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(`basketball-clock-${matchId}`) ?? '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return fallback;
    const stored = saved as Record<string, unknown>;
    return { game: typeof stored.game === 'number' && Number.isInteger(stored.game) && stored.game >= 0 && stored.game <= 600 ? stored.game : fallback.game, shot: typeof stored.shot === 'number' && Number.isInteger(stored.shot) && stored.shot >= 0 && stored.shot <= 24 ? stored.shot : fallback.shot, running: false };
  } catch { return fallback; }
}
function clockText(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`; }
function factName(fact: BasketballFact): string {
  if (fact.kind === 'shot') return `${fact.outcome === 'made' ? 'Cesta' : fact.outcome === 'blocked' ? 'Toco' : 'Arremesso errado'} · ${fact.value} ponto${fact.value > 1 ? 's' : ''}${fact.assistPlayerId ? ' · assistência' : ''}${fact.tactic ? ` · ${basketballTactics[fact.tactic]}` : ''}`;
  if (fact.kind === 'turnover') return `Perda de posse${fact.tactic ? ` · ${basketballTactics[fact.tactic]}` : ''}`;
  if (fact.kind === 'rebound') return `Rebote ${fact.side === 'offensive' ? 'ofensivo' : 'defensivo'}`;
  if (fact.kind === 'foul') return `Falta ${fact.category === 'personal' ? 'pessoal' : fact.category === 'technical' ? 'técnica' : 'antidesportiva'}`;
  if (fact.kind === 'pass') return 'Passe';
  if (fact.kind === 'possession') return 'Início de posse';
  return basketballTactics[fact.tactic];
}
export function BasketballCourtMarkings() {
  return <g fill="none" stroke="currentColor" strokeWidth=".09" aria-hidden="true">
    <rect x=".05" y=".05" width="27.9" height="14.9" /><line x1="14" y1="0" x2="14" y2="15" /><circle cx="14" cy="7.5" r="1.8" />
    <rect x="0" y="4.55" width="5.8" height="5.9" /><rect x="22.2" y="4.55" width="5.8" height="5.9" />
    <circle cx="5.8" cy="7.5" r="1.8" /><circle cx="22.2" cy="7.5" r="1.8" />
    <path d="M 0 .9 L 2.99 .9 A 6.75 6.75 0 0 1 2.99 14.1 L 0 14.1 M 28 .9 L 25.01 .9 A 6.75 6.75 0 0 0 25.01 14.1 L 28 14.1" />
    <path d="M 1.575 6.25 A 1.25 1.25 0 0 1 1.575 8.75 M 26.425 6.25 A 1.25 1.25 0 0 0 26.425 8.75" />
    <line x1="1.2" y1="6.6" x2="1.2" y2="8.4" /><circle cx="1.575" cy="7.5" r=".22" /><line x1="26.8" y1="6.6" x2="26.8" y2="8.4" /><circle cx="26.425" cy="7.5" r=".22" />
    <path d="M 0 6.25 L .4 6.25 L .4 8.75 L 0 8.75 M 28 6.25 L 27.6 6.25 L 27.6 8.75 L 28 8.75" />
  </g>;
}
export function BasketballScoutScreen({ workspace, busy, onRegister, onCorrect, onUndo }: { readonly workspace: MatchWorkspace; readonly busy: boolean; readonly onRegister: (period: number, draft: BasketballFactDraft) => Promise<void>; readonly onCorrect: (id: string, draft: BasketballFactDraft) => Promise<void>; readonly onUndo: () => Promise<void> }) {
  const projection = workspace.basketball!;
  const matchId = workspace.state.metadata.id;
  const [period, setPeriod] = useState(() => loadPeriod(matchId, projection.facts.at(-1)?.period ?? 1));
  const [teamId, setTeamId] = useState(() => basketballPossessions(projection.facts, workspace.teams.map(team => team.id)).at(-1)?.teamId ?? workspace.teams[0].id);
  const [playerId, setPlayerId] = useState('');
  const [kind, setKind] = useState<Kind>('shot');
  const [value, setValue] = useState<1 | 2 | 3>(2);
  const [outcome, setOutcome] = useState<'made' | 'missed' | 'blocked'>('made');
  const [possessionEnds, setPossessionEnds] = useState(true);
  const [cause, setCause] = useState<'bad_pass' | 'lost_ball' | 'violation' | 'offensive_foul' | 'other'>('bad_pass');
  const [side, setSide] = useState<'offensive' | 'defensive'>('offensive');
  const [rimTouched, setRimTouched] = useState(false);
  const [category, setCategory] = useState<'personal' | 'technical' | 'unsportsmanlike'>('personal');
  const [tactic, setTactic] = useState<BasketballTactic | ''>('');
  const [pressure, setPressure] = useState<BasketballPressure | ''>('');
  const [assistPlayerId, setAssistPlayerId] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [position, setPosition] = useState<Point>();
  const [cursor, setCursor] = useState<Point>({ x: .5, y: .5 });
  const [courtFocused, setCourtFocused] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [beforeEdit, setBeforeEdit] = useState<{ period: number; teamId: string; playerId: string; clock: { game: number; shot: number; running: boolean }; pressure: BasketballPressure | '' }>();
  const [view, setView] = useState<'court' | 'history' | 'shortcuts'>('court');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState('');
  const savingRef = useRef(false);
  const [shortcuts, setShortcuts] = useState(loadShortcuts);
  const [adjustingClock, setAdjustingClock] = useState(false);
  const [clock, setClock] = useState<BasketballClock>(() => loadClock(matchId, projection.facts.at(-1)));
  const players = workspace.players.filter(player => player.teamId === teamId && player.active !== false);
  useEffect(() => { localStorage.setItem(`basketball-clock-${matchId}`, JSON.stringify({ period, game: clock.game, shot: clock.shot })); }, [clock.game, clock.shot, matchId, period]);
  useEffect(() => { if (!clock.running) return; let last = Date.now(); const timer = window.setInterval(() => { const now = Date.now(); const elapsed = Math.floor((now - last) / 1000); if (elapsed < 1) return; last += elapsed * 1000; setClock(current => { const game = Math.max(0, current.game - elapsed); const shot = Math.max(0, current.shot - elapsed); return { game, shot, running: game > 0 && shot > 0 && current.running }; }); }, 250); return () => window.clearInterval(timer); }, [clock.running]);
  useEffect(() => { const pause = () => { if (document.hidden) setClock(current => ({ ...current, running: false })); }; document.addEventListener('visibilitychange', pause); return () => document.removeEventListener('visibilitychange', pause); }, []);
  function changePeriod(next: number) { setPeriod(next); setClock({ game: next <= 4 ? 600 : 300, shot: 24, running: false }); setPressure(''); }
  function draft(): BasketballFactDraft {
    const base = { teamId, gameSeconds: clock.game, shotSeconds: clock.shot, ...(playerId ? { playerId } : {}), ...(position ? { position } : {}), ...(pressure ? { pressure } : {}) };
    if (kind === 'shot') return { ...base, kind, value, outcome, possessionEnds, ...(tactic ? { tactic } : {}), ...(outcome === 'made' && assistPlayerId ? { assistPlayerId } : {}) };
    if (kind === 'turnover') return { ...base, kind, cause, ...(tactic ? { tactic } : {}) };
    if (kind === 'rebound') return { ...base, kind, side, ...(side === 'offensive' ? { rimTouched } : {}) };
    if (kind === 'foul') return { ...base, kind, category };
    if (kind === 'pass') return { ...base, kind, ...(receiverId ? { receiverId } : {}) };
    if (kind === 'possession') return { ...base, kind };
    return { ...base, kind, tactic: tactic || 'other' };
  }
  function edit(fact: BasketballFact) {
    setBeforeEdit({ period, teamId, playerId, clock: { ...clock, running: false }, pressure });
    setEditingId(fact.id); setView('court'); setPeriod(fact.period); setTeamId(fact.teamId); setPlayerId(fact.playerId ?? ''); setKind(fact.kind); setPosition(fact.position);
    setTactic('tactic' in fact ? fact.tactic ?? '' : ''); setPressure(fact.pressure ?? '');
    setClock(current => ({ ...current, running: false }));
    if (fact.gameSeconds !== undefined || fact.shotSeconds !== undefined) setClock({ game: fact.gameSeconds ?? clock.game, shot: fact.shotSeconds ?? clock.shot, running: false });
    if (fact.kind === 'shot') { setValue(fact.value); setOutcome(fact.outcome); setPossessionEnds(fact.possessionEnds !== false); setAssistPlayerId(fact.assistPlayerId ?? ''); }
    if (fact.kind === 'turnover') setCause(fact.cause);
    if (fact.kind === 'rebound') { setSide(fact.side); setRimTouched(fact.rimTouched === true); }
    if (fact.kind === 'foul') setCategory(fact.category);
    if (fact.kind === 'pass') setReceiverId(fact.receiverId ?? '');
  }
  async function save(override?: BasketballFactDraft) {
    if (busy || savingRef.current) return; savingRef.current = true; setError(''); const current = override ?? draft();
    try {
      if (editingId) await onCorrect(editingId, current); else await onRegister(period, current);
      setReceipt(`${kinds[current.kind]} salvo para ${workspace.teams.find(team => team.id === current.teamId)?.name}.`);
      setEditingId(undefined); setPosition(undefined);
      if (editingId && beforeEdit) { setPeriod(beforeEdit.period); setTeamId(beforeEdit.teamId); setPlayerId(beforeEdit.playerId); setClock(beforeEdit.clock); setPressure(beforeEdit.pressure); setBeforeEdit(undefined); }
      if (!editingId) {
        if (current.kind === 'pass' && current.receiverId) { setPlayerId(current.receiverId); setReceiverId(''); }
        const transfer = current.kind === 'turnover' || (current.kind === 'shot' && current.outcome === 'made' && current.possessionEnds !== false) || (current.kind === 'rebound' && current.side === 'defensive');
        if (transfer) {
          const next = current.kind === 'rebound' ? current.teamId : workspace.teams.find(team => team.id !== current.teamId)?.id;
          if (next) setTeamId(next);
          setPlayerId(''); setAssistPlayerId(''); setReceiverId(''); setPressure(''); setClock(previous => ({ ...previous, shot: 24 }));
        } else if (current.kind === 'rebound' && current.side === 'offensive' && current.rimTouched) setClock(previous => ({ ...previous, shot: 14 }));
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao salvar. O lance foi preservado.'); }
    finally { savingRef.current = false; }
  }
  function courtPointer(event: PointerEvent<HTMLDivElement>) { const rect = event.currentTarget.getBoundingClientRect(); setPosition({ x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) }); }
  function courtKey(event: KeyboardEvent<HTMLDivElement>) { const delta = event.shiftKey ? .01 : .025; const next = { ...cursor }; if (event.key === 'ArrowLeft') next.x = Math.max(0, next.x - delta); else if (event.key === 'ArrowRight') next.x = Math.min(1, next.x + delta); else if (event.key === 'ArrowUp') next.y = Math.max(0, next.y - delta); else if (event.key === 'ArrowDown') next.y = Math.min(1, next.y + delta); else if (event.key === 'Enter' || event.key === ' ') setPosition(cursor); else return; event.preventDefault(); setCursor(next); }
  useEffect(() => { const onKey = (event: globalThis.KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement || view !== 'court') return;
    const action = (Object.keys(shortcuts) as Shortcut[]).find(key => shortcuts[key] === event.key.toUpperCase()); if (!action) return;
    event.preventDefault();
    if (action === 'save') void save(); else if (action === 'timer') setClock(current => ({ ...current, running: !current.running })); else if (action === 'reset24') setClock(current => ({ ...current, shot: 24 })); else if (action === 'reset14') setClock(current => ({ ...current, shot: 14 })); else if (action === 'possession') void save({ teamId, kind: 'possession', gameSeconds: clock.game, shotSeconds: clock.shot, ...(pressure ? { pressure } : {}) }); else setKind(action);
  }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); });
  function changeShortcut(action: Shortcut, key: string) { const value = key.toUpperCase().trim(); if (!/^[A-Z0-9]$/.test(value) || Object.entries(shortcuts).some(([name, assigned]) => name !== action && assigned === value)) { setError('Use uma letra ou número livre para cada atalho.'); return; } const updated = { ...shortcuts, [action]: value }; setShortcuts(updated); localStorage.setItem('basketball-shortcuts', JSON.stringify(updated)); setError(''); }
  const score = projection.score;
  const lastPass = [...projection.facts].reverse().find(fact => fact.kind === 'pass' || fact.kind === 'shot' || fact.kind === 'turnover' || fact.kind === 'rebound');
  const assistSuggestion = lastPass?.kind === 'pass' && lastPass.period === period && lastPass.teamId === teamId && lastPass.receiverId === playerId ? lastPass.playerId : undefined;
  return <main className="page-section basketball-screen" data-sport="basketball">
    <header className="basketball-header"><div><p className="eyebrow">Basquete · registro</p><h1>Quadra de jogo</h1></div><div className="basketball-score" aria-label="Placar">{workspace.teams[0].name} <strong>{score[workspace.teams[0].id] ?? 0}</strong><span>×</span><strong>{score[workspace.teams[1].id] ?? 0}</strong> {workspace.teams[1].name}</div></header>
    <section className="basketball-clock-bar" aria-label="Relógios da partida"><div><small>{period <= 4 ? `${period}º quarto` : `${period - 4}ª prorrogação`}</small><strong aria-label="Tempo do período">{clockText(clock.game)}</strong></div><div><small>24 segundos</small><strong aria-label="Relógio de arremesso">{clock.shot}</strong></div><button type="button" onClick={() => setClock(current => ({ ...current, running: !current.running }))}>{clock.running ? 'Pausar' : 'Iniciar'} <kbd>{shortcuts.timer}</kbd></button><button type="button" onClick={() => setClock(current => ({ ...current, shot: 24 }))}>24 s <kbd>{shortcuts.reset24}</kbd></button><button type="button" onClick={() => setClock(current => ({ ...current, shot: 14 }))}>14 s <kbd>{shortcuts.reset14}</kbd></button><button type="button" onClick={() => void save({ kind: 'possession', teamId, gameSeconds: clock.game, shotSeconds: clock.shot, ...(pressure ? { pressure } : {}) })} disabled={busy}>Iniciar posse <kbd>{shortcuts.possession}</kbd></button><button type="button" aria-expanded={adjustingClock} onClick={() => { setClock(current => ({ ...current, running: false })); setAdjustingClock(!adjustingClock); }}>Ajustar relógios</button></section>
    {adjustingClock && <section className="basketball-clock-adjust" aria-label="Ajustar relógios"><label>Minutos do quarto<input type="number" min="0" max={period <= 4 ? 10 : 5} value={Math.floor(clock.game / 60)} onChange={event => setClock(current => ({ ...current, game: Math.min(period <= 4 ? 600 : 300, Math.max(0, Number(event.target.value) * 60 + current.game % 60)) }))} /></label><label>Segundos do quarto<input type="number" min="0" max="59" value={clock.game % 60} onChange={event => setClock(current => ({ ...current, game: Math.min(period <= 4 ? 600 : 300, Math.floor(current.game / 60) * 60 + Math.max(0, Math.min(59, Number(event.target.value)))) }))} /></label><label>Relógio de arremesso<input type="number" min="0" max="24" value={clock.shot} onChange={event => setClock(current => ({ ...current, shot: Math.max(0, Math.min(24, Number(event.target.value))) }))} /></label><button type="button" onClick={() => setAdjustingClock(false)}>Concluir</button></section>}
    <nav className="court-workbench-nav" aria-label="Destinos do registro"><button type="button" aria-pressed={view === 'court'} onClick={() => setView('court')}>Quadra</button><button type="button" aria-pressed={view === 'history'} onClick={() => setView('history')}>Histórico <small>{projection.facts.length}</small></button><button type="button" aria-pressed={view === 'shortcuts'} onClick={() => setView('shortcuts')}>Atalhos</button></nav>
    {view === 'court' && <div className="basketball-layout"><section className="basketball-court-panel" aria-label="Localização do lance"><h2>Local do lance <small>opcional</small></h2><p>Toque na quadra para marcar a posição observada. Use setas e Enter pelo teclado.</p><div className="basketball-court" role="button" tabIndex={0} aria-label="Marcar posição na quadra de basquete" onPointerDown={courtPointer} onKeyDown={courtKey} onFocus={() => setCourtFocused(true)} onBlur={() => setCourtFocused(false)}><svg viewBox="0 0 28 15" preserveAspectRatio="none"><BasketballCourtMarkings /></svg>{courtFocused && <span className="basketball-key-cursor" style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }} />}{position && <span className="basketball-location" style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }} />}</div><div className="basketball-position-row"><span>{position ? `Posição marcada: ${Math.round(position.x * 100)}%, ${Math.round(position.y * 100)}%` : 'Sem localização marcada'}</span>{position && <button type="button" onClick={() => setPosition(undefined)}>Remover posição</button>}</div><div className="basketball-court-quick-hud" role="group" aria-label="Registro rápido em 1 toque"><button type="button" onClick={() => void save({ ...draft(), kind: 'shot', value: 2, outcome: 'made' })} disabled={busy}>⚡ +2 Cesta</button><button type="button" onClick={() => void save({ ...draft(), kind: 'shot', value: 3, outcome: 'made' })} disabled={busy}>⚡ +3 Cesta</button><button type="button" onClick={() => void save({ ...draft(), kind: 'shot', value: 2, outcome: 'missed' })} disabled={busy}>✗ Erro 2pts</button><button type="button" onClick={() => void save({ ...draft(), kind: 'rebound', side: 'defensive' })} disabled={busy}>🛡️ Reb Def</button><button type="button" onClick={() => void save({ ...draft(), kind: 'rebound', side: 'offensive', rimTouched: true })} disabled={busy}>⚔️ Reb Of</button><button type="button" onClick={() => void save({ ...draft(), kind: 'turnover', cause: 'bad_pass' })} disabled={busy}>⚠️ Perda</button></div><p className="basketball-court-note">A cesta de 3 pontos é escolhida no formulário; a marcação espacial não altera a pontuação automaticamente.</p></section>
    <section className="basketball-form" aria-label="Registrar lance"><h2>{editingId ? 'Corrigir lance' : 'Novo lance'}</h2><div className="basketball-form-row"><label>Período<select value={period} disabled={!!editingId} onChange={event => changePeriod(Number(event.target.value))}>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(number => <option key={number} value={number}>{number <= 4 ? `${number}º quarto` : `${number - 4}ª prorrogação`}</option>)}</select></label><label>Equipe<select value={teamId} onChange={event => { setTeamId(event.target.value); setPlayerId(''); setAssistPlayerId(''); setReceiverId(''); }}>{workspace.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label></div><div className="basketball-quick-players" role="group" aria-label="Seleção rápida de atleta"><button type="button" className={`player-chip ${!playerId ? 'selected' : ''}`} onClick={() => setPlayerId('')}>Ø Geral</button>{players.map(player => <button key={player.id} type="button" className={`player-chip ${playerId === player.id ? 'selected' : ''}`} onClick={() => setPlayerId(player.id)}>#{player.number} {player.name}</button>)}</div><label>Atleta <small>opcional</small><select value={playerId} onChange={event => setPlayerId(event.target.value)}><option value="">Não identificado</option>{players.map(player => <option key={player.id} value={player.id}>#{player.number} {player.name}</option>)}</select></label>
    <fieldset className="basketball-kind"><legend>Lance observado</legend>{(Object.entries(kinds) as [Kind, string][]).filter(([key]) => key !== 'possession' || kind === 'possession').map(([key, label]) => <button key={key} type="button" aria-pressed={kind === key} onClick={() => setKind(key)}>{label}</button>)}</fieldset>
    {kind === 'shot' && <><div className="basketball-segmented-row"><div className="segmented-control" role="group" aria-label="Valor"><button type="button" className={value === 1 ? 'active' : ''} onClick={() => setValue(1)}>1 pt (LL)</button><button type="button" className={value === 2 ? 'active' : ''} onClick={() => setValue(2)}>2 pts</button><button type="button" className={value === 3 ? 'active' : ''} onClick={() => setValue(3)}>3 pts</button></div><div className="segmented-control" role="group" aria-label="Resultado"><button type="button" className={`outcome-chip made ${outcome === 'made' ? 'active' : ''}`} onClick={() => setOutcome('made')}>✓ Cesta</button><button type="button" className={`outcome-chip missed ${outcome === 'missed' ? 'active' : ''}`} onClick={() => setOutcome('missed')}>✗ Errado</button><button type="button" className={`outcome-chip blocked ${outcome === 'blocked' ? 'active' : ''}`} onClick={() => setOutcome('blocked')}>🛑 Toco</button></div></div><div className="basketball-form-row"><label>Valor<select value={value} onChange={event => setValue(Number(event.target.value) as 1 | 2 | 3)}><option value="1">Lance livre · 1</option><option value="2">Cesta de 2</option><option value="3">Cesta de 3</option></select></label><label>Resultado<select value={outcome} onChange={event => setOutcome(event.target.value as typeof outcome)}><option value="made">Convertido</option><option value="missed">Errado</option><option value="blocked">Bloqueado</option></select></label></div>{outcome === 'made' && <><label>Assistência <small>opcional, somente passe direto para a cesta</small><select value={assistPlayerId} onChange={event => setAssistPlayerId(event.target.value)}><option value="">Não observada</option>{players.filter(player => player.id !== playerId).map(player => <option key={player.id} value={player.id}>#{player.number} {player.name}</option>)}</select></label><label className="basketball-check"><input type="checkbox" checked={possessionEnds} onChange={event => setPossessionEnds(event.target.checked)} /> Cesta encerra a posse <small>Desmarque em lance livre intermediário ou cesta com lance livre adicional.</small></label>{assistSuggestion && !assistPlayerId && <button type="button" onClick={() => setAssistPlayerId(assistSuggestion)}>Usar último passe como assistência</button>}</>}</>}
    {kind === 'turnover' && <label>Tipo de perda<select value={cause} onChange={event => setCause(event.target.value as typeof cause)}><option value="bad_pass">Passe errado</option><option value="lost_ball">Bola perdida</option><option value="violation">Violação</option><option value="offensive_foul">Falta de ataque</option><option value="other">Outra</option></select></label>}
    {kind === 'rebound' && <><label>Tipo de rebote<select value={side} onChange={event => setSide(event.target.value as typeof side)}><option value="offensive">Ofensivo</option><option value="defensive">Defensivo</option></select></label>{side === 'offensive' && <label className="basketball-check"><input type="checkbox" checked={rimTouched} onChange={event => setRimTouched(event.target.checked)} /> Bola tocou o aro <small>Repõe 14 segundos ao registrar.</small></label>}</>}
    {kind === 'foul' && <label>Tipo de falta<select value={category} onChange={event => setCategory(event.target.value as typeof category)}><option value="personal">Pessoal</option><option value="technical">Técnica</option><option value="unsportsmanlike">Antidesportiva</option></select></label>}
    {kind === 'pass' && <label>Para quem? <small>opcional</small><select value={receiverId} onChange={event => setReceiverId(event.target.value)}><option value="">Não identificado</option>{players.filter(player => player.id !== playerId).map(player => <option key={player.id} value={player.id}>#{player.number} {player.name}</option>)}</select></label>}
    {(kind === 'shot' || kind === 'turnover' || kind === 'tactic') && <label>Ação tática {kind !== 'tactic' && <small>opcional</small>}<select value={tactic} onChange={event => setTactic(event.target.value as BasketballTactic | '')}>{kind !== 'tactic' && <option value="">Não observada</option>}{Object.entries(basketballTactics).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>}
    <label>Pressão da defesa adversária <small>opcional</small><select value={pressure} onChange={event => setPressure(event.target.value as BasketballPressure | '')}><option value="">Não avaliada</option>{Object.entries(basketballPressures).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
    {kind === 'tactic' && <p>Registra a ação sem presumir arremesso, pontos ou fim da posse.</p>}<button className="button primary basketball-save" type="button" disabled={busy} onClick={() => void save()}>{busy ? 'Salvando…' : editingId ? 'Salvar correção' : 'Registrar lance'} <kbd>{shortcuts.save}</kbd></button>{editingId && <button className="button secondary" type="button" onClick={() => { setEditingId(undefined); if (beforeEdit) { setPeriod(beforeEdit.period); setTeamId(beforeEdit.teamId); setPlayerId(beforeEdit.playerId); setClock(beforeEdit.clock); setPressure(beforeEdit.pressure); setBeforeEdit(undefined); } }}>Cancelar correção</button>}</section></div>}
    {receipt && <div className="court-receipt" role="status"><span className="court-receipt-check">✓</span><strong>{receipt}</strong></div>}{error && <p className="basketball-error" role="alert">{error}</p>}
    {view === 'history' && <section className="basketball-history"><div className="basketball-history-heading"><h2>Lances registrados</h2><button className="button secondary" disabled={busy || !projection.undoTargetHistoryEventId} onClick={() => void onUndo()}>Desfazer último</button></div>{projection.facts.length ? <ol>{[...projection.facts].reverse().map(fact => <li key={fact.id}><span><b>{fact.period <= 4 ? `${fact.period}º quarto` : `${fact.period - 4}ª prorrogação`}</b>{fact.gameSeconds !== undefined ? ` · ${clockText(fact.gameSeconds)}` : ''}{fact.shotSeconds !== undefined ? ` · ${fact.shotSeconds}s` : ''} · {workspace.teams.find(team => team.id === fact.teamId)?.name} · {fact.playerId ? workspace.players.find(player => player.id === fact.playerId)?.name + ' · ' : ''}{factName(fact)}{fact.pressure ? ` · ${basketballPressures[fact.pressure]}` : ''}</span><button type="button" onClick={() => edit(fact)}>Corrigir</button></li>)}</ol> : <p>Nenhum lance registrado.</p>}</section>}
    {view === 'shortcuts' && <section className="basketball-shortcuts"><h2>Atalhos de teclado</h2><p>Atalhos funcionam fora de campos de edição. Cada letra ou número deve ser único. As escolhas ficam neste dispositivo.</p><div>{(Object.keys(shortcuts) as Shortcut[]).map(action => <label key={action}>{shortcutLabels[action]}<input aria-label={`Atalho: ${shortcutLabels[action]}`} maxLength={1} value={shortcuts[action]} onFocus={event => event.currentTarget.select()} onChange={event => changeShortcut(action, event.target.value)} /></label>)}</div><button type="button" onClick={() => { setShortcuts(shortcutDefaults); localStorage.removeItem('basketball-shortcuts'); }}>Restaurar atalhos padrão</button></section>}
  </main>;
}

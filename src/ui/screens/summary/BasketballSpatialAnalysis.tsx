import { useMemo, useState, type KeyboardEvent } from 'react';
import type { BasketballFact } from '../../../domain/basketball/BasketballScout';
import { BasketballCourtMarkings } from '../scout/BasketballScoutScreen';
import { basketballTactics } from '../scout/BasketballLabels';
import { heatDensity } from './heatmap';

const actionLabels: Record<Exclude<BasketballFact['kind'], 'possession'>, string> = {
  shot: 'Arremesso', turnover: 'Perda de posse', rebound: 'Rebote', foul: 'Falta', tactic: 'Ação tática', pass: 'Passe',
};
type ActionKind = keyof typeof actionLabels;
type Mode = 'actions' | 'heat';
const heatWidth = 56;
const heatHeight = 30;

function actionDetail(fact: BasketballFact, teamName: string): string {
  const action = fact.kind === 'shot' ? `${fact.outcome === 'made' ? 'Cesta' : fact.outcome === 'blocked' ? 'Arremesso bloqueado' : 'Arremesso errado'} de ${fact.value}`
    : fact.kind === 'rebound' ? `Rebote ${fact.side === 'offensive' ? 'ofensivo' : 'defensivo'}`
    : fact.kind === 'tactic' ? basketballTactics[fact.tactic]
    : fact.kind === 'turnover' ? 'Perda de posse'
    : fact.kind === 'pass' ? 'Passe'
    : fact.kind === 'foul' ? 'Falta' : 'Início de posse';
  return `${teamName} · ${fact.period}º período · ${action}${'tactic' in fact && fact.kind !== 'tactic' && fact.tactic ? ` · ${basketballTactics[fact.tactic]}` : ''}`;
}

function ActionMarker({ fact, label, selected, onSelect }: { readonly fact: BasketballFact; readonly label: string; readonly selected: boolean; readonly onSelect: () => void }) {
  if (!fact.position) return null;
  const x = fact.position.x * 28;
  const y = fact.position.y * 15;
  const marker = fact.kind === 'shot' ? fact.outcome === 'made' ? 'made' : 'missed' : fact.kind;
  function keyDown(event: KeyboardEvent<SVGGElement>) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(); } }
  return <g className={`basketball-action-marker basketball-action-${marker}${selected ? ' selected' : ''}`} data-fact-id={fact.id} role="button" tabIndex={0} aria-label={label} onClick={onSelect} onKeyDown={keyDown}>
    {fact.kind === 'turnover' ? <path d={`M ${x} ${y - .3} L ${x + .3} ${y} L ${x} ${y + .3} L ${x - .3} ${y} Z`} />
      : fact.kind === 'rebound' ? <rect x={x - .27} y={y - .27} width=".54" height=".54" />
      : fact.kind === 'pass' ? <path d={`M ${x} ${y - .32} L ${x + .32} ${y + .25} L ${x - .32} ${y + .25} Z`} />
      : <circle cx={x} cy={y} r=".27" />}
    <title>{label}</title>
  </g>;
}

export function BasketballSpatialAnalysis({ facts, teams, players }: { readonly facts: readonly BasketballFact[]; readonly teams: readonly { id: string; name: string }[]; readonly players: readonly { id: string; teamId: string; name?: string; number: number }[] }) {
  const [teamId, setTeamId] = useState('all');
  const [kind, setKind] = useState<ActionKind | 'all'>('all');
  const [period, setPeriod] = useState('all');
  const [playerId, setPlayerId] = useState('all');
  const [mode, setMode] = useState<Mode>('actions');
  const [selectedId, setSelectedId] = useState('');
  const periods = [...new Set(facts.map(fact => fact.period))].sort((a, b) => a - b);
  const filtered = facts.filter(fact => fact.kind !== 'possession' && (teamId === 'all' || fact.teamId === teamId) && (kind === 'all' || fact.kind === kind) && (period === 'all' || fact.period === Number(period)) && (playerId === 'all' || fact.playerId === playerId));
  const located = filtered.filter(fact => !!fact.position);
  const selected = located.find(fact => fact.id === selectedId);
  const density = useMemo(() => heatDensity(located.map(fact => fact.position!), heatWidth, heatHeight, .22), [located]);
  const maxDensity = Math.max(0, ...density);
  return <section className="basketball-visual-section" aria-label="Mapas de ações do basquete">
    <div className="basketball-visual-heading"><div><h2>Mapa de ações e calor</h2><p>Posições marcadas na quadra original. O calor mostra frequência de ações observadas, não eficiência nem trajetória.</p></div><div className="basketball-map-mode" aria-label="Tipo de mapa"><button type="button" aria-pressed={mode === 'actions'} onClick={() => setMode('actions')}>Ações</button><button type="button" aria-pressed={mode === 'heat'} onClick={() => setMode('heat')}>Calor</button></div></div>
    <div className="basketball-map-filters"><label>Equipe<select value={teamId} onChange={event => { setTeamId(event.target.value); setPlayerId('all'); }}><option value="all">Ambas</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label>Ação<select value={kind} onChange={event => setKind(event.target.value as ActionKind | 'all')}><option value="all">Todas</option>{Object.entries(actionLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Período<select value={period} onChange={event => setPeriod(event.target.value)}><option value="all">Todos</option>{periods.map(number => <option key={number} value={number}>{number <= 4 ? `${number}º quarto` : `${number - 4}ª prorrogação`}</option>)}</select></label><label>Atleta<select value={playerId} onChange={event => setPlayerId(event.target.value)}><option value="all">Todos</option>{players.filter(player => teamId === 'all' || player.teamId === teamId).map(player => <option key={player.id} value={player.id}>#{player.number} {player.name ?? 'Sem nome'}</option>)}</select></label></div>
    <p className="basketball-map-coverage">{located.length} de {filtered.length} ações do filtro com posição · {filtered.length - located.length} sem posição não aparecem no mapa.</p>
    <div className="basketball-analysis-court"><svg viewBox="0 0 28 15" preserveAspectRatio="none" role="img" aria-label={mode === 'heat' ? 'Mapa de calor das ações registradas na quadra de basquete' : 'Mapa de ações registradas na quadra de basquete'}>
      {mode === 'heat' && maxDensity > 0 && Array.from(density, (value, index) => value > .015 ? <rect key={index} x={(index % heatWidth) * 28 / heatWidth} y={Math.floor(index / heatWidth) * 15 / heatHeight} width={28 / heatWidth + .01} height={15 / heatHeight + .01} className="basketball-heat-cell" opacity={.06 + .78 * Math.sqrt(value / maxDensity)} /> : null)}
      <BasketballCourtMarkings />
      {mode === 'actions' && located.map(fact => <ActionMarker key={fact.id} fact={fact} selected={selectedId === fact.id} label={actionDetail(fact, teams.find(team => team.id === fact.teamId)?.name ?? 'Equipe')} onSelect={() => setSelectedId(fact.id)} />)}
    </svg></div>
    {mode === 'actions' && <div className="basketball-map-legend"><span className="made">● Cesta</span><span className="missed">○ Arremesso não convertido</span><span className="turnover">◆ Perda</span><span className="rebound">■ Rebote</span><span className="pass">▲ Passe</span><span className="other">● Tática/falta</span></div>}
    {selected && mode === 'actions' && <p role="status" className="basketball-map-selection">{actionDetail(selected, teams.find(team => team.id === selected.teamId)?.name ?? 'Equipe')}{selected.playerId ? ` · ${players.find(player => player.id === selected.playerId)?.name ?? 'Atleta não identificado'}` : ''}</p>}
    {!located.length && <p>Nenhuma posição observada para este filtro.</p>}
  </section>;
}

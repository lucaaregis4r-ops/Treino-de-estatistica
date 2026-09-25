import { useId } from 'react';
import type { CanonicalFootballEvent } from '../../../domain/football/StatsBombContract';
import { outcomeName } from '../../../domain/football/FootballObservation';

export function FootballPitchPlot({ events, mode, cells, onSelect }: {
  readonly events: readonly CanonicalFootballEvent[];
  readonly mode: 'actions' | 'trajectories' | 'density';
  readonly cells?: readonly { index: number; value: number; label: string }[];
  readonly onSelect?: (id: string) => void;
}) {
  const markerId = useId().replaceAll(':', '');
  const counts = Array.from({ length: 96 }, (_, index) => ({ index, value: 0, label: '' }));
  for (const event of events) if (event.location && event.location.every(Number.isFinite) && event.location[0] >= 0 && event.location[1] >= 0 && event.location[0] <= 120 && event.location[1] <= 80) counts[Math.min(7, Math.floor(event.location[1] / 10)) * 12 + Math.min(11, Math.floor(event.location[0] / 10))].value++;
  const grid = cells ?? counts.map(c => ({ ...c, label: `${c.value} posições registradas` }));
  const max = Math.max(1, ...grid.map(c => c.value));
  return <><svg className="football-pitch-plot" viewBox="-3 -3 126 86" role="img" aria-label={mode === 'density' ? 'Mapa de calor do campo de futebol' : 'Mapa do campo de futebol 120 por 80'}>
    <defs><marker id={markerId} markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4" fill="#f5cf65" /></marker></defs>
    <rect width="120" height="80" fill="#153e32" stroke="#c2d9cb" strokeWidth=".4" />
    <path d="M60 0V80 M0 18H18V62H0 M120 18H102V62H120 M0 30H6V50H0 M120 30H114V50H120" fill="none" stroke="#c2d9cb" strokeWidth=".4" /><circle cx="60" cy="40" r="9.15" fill="none" stroke="#c2d9cb" strokeWidth=".4" />
    {mode === 'density' ? grid.filter(c => c.value > 0).map(c => <g key={c.index} tabIndex={0}><title>{c.label}</title><rect x={(c.index % 12) * 10} y={Math.floor(c.index / 12) * 10} width="10" height="10" fill={`hsl(${160 - 145 * c.value / max} 75% ${38 + 15 * c.value / max}%)`} opacity={.85} stroke="#fff" strokeWidth=".15" /><text x={(c.index % 12) * 10 + 5} y={Math.floor(c.index / 12) * 10 + 6} textAnchor="middle" fontSize="3" fill="#fff">{Math.round(c.value * 100) / 100}</text></g>) : events.map(e => {
      if (!e.location) return null;
      const end = e.pass?.end_location ?? e.carry?.end_location;
      if (mode === 'trajectories' && (!end || ![30, 43].includes(e.type.id))) return null;
      return <g key={e.id} tabIndex={0} role="button" aria-label={`${e.timestamp} ${e.team?.name} ${e.type.name}`} onClick={() => onSelect?.(e.id)} onKeyDown={key => { if (key.key === 'Enter' || key.key === ' ') onSelect?.(e.id); }}><title>{e.timestamp} · {e.team?.name} · {e.player?.name ?? 'Não identificado'} · {e.type.name} · {outcomeName(e)} · {e.scout_trainer?.observation?.pressure?.kind ?? 'Pressão não observada'}</title>{mode === 'trajectories' && end && <line x1={e.location[0]} y1={e.location[1]} x2={end[0]} y2={end[1]} stroke="#f5cf65" strokeWidth=".6" markerEnd={`url(#${markerId})`} />}<circle cx={e.location[0]} cy={e.location[1]} r={e.type.id === 16 ? 1.7 : 1} fill={e.type.id === 3 ? '#fa8e88' : e.type.id === 16 ? '#f5cf65' : '#80e2ed'} stroke="#111" strokeWidth=".3" /></g>;
    })}
  </svg>{mode === 'density' && <><div className="football-heatmap-legend"><span>0</span><i aria-hidden="true" /><span>{Math.max(0, ...grid.map(c => c.value)).toFixed(cells ? 1 : 0)} · máximo por célula</span></div>{!grid.some(c => c.value > 0) && <p role="status">Sem posições elegíveis para este mapa de calor.</p>}</>}</>;
}

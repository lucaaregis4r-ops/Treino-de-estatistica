import { useId } from 'react';
import type { analyzeMarkov } from '../../../domain/football/FootballMarkovAnalyzer';

export function FootballMarkovDiagram({ paths, onSelect }: { readonly paths: ReturnType<typeof analyzeMarkov>; readonly onSelect: (id: string) => void }) {
  const marker = useId().replaceAll(':', '');
  if (!paths.transitions.length) return <p role="status">Ainda sem transições elegíveis. Registre pelo menos dois estados consecutivos na mesma posse; para zonas, informe a direção de ataque em Ajustes da partida.</p>;
  const width = 760, height = 540, cx = width / 2, cy = height / 2;
  const positions = paths.states.map((_, i) => { const angle = i * 2 * Math.PI / paths.states.length - Math.PI / 2; return { x: cx + 265 * Math.cos(angle), y: cy + 185 * Math.sin(angle) }; });
  return <div className="football-markov"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Diagrama de Markov com probabilidades e contagens">
    <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#80e2cd" /></marker></defs>
    {paths.matrix.filter(edge => edge.count).map(edge => {
      const from = positions[paths.states.indexOf(edge.from)], to = positions[paths.states.indexOf(edge.to)];
      const self = edge.from === edge.to;
      const distance = Math.hypot(to.x - from.x, to.y - from.y) || 1;
      const ux = (to.x - from.x) / distance, uy = (to.y - from.y) / distance;
      const start = { x: from.x + ux * 57, y: from.y + uy * 29 }, end = { x: to.x - ux * 62, y: to.y - uy * 33 };
      const bend = { x: (from.x + to.x) / 2 - uy * 65, y: (from.y + to.y) / 2 + ux * 65 };
      const d = self ? `M${from.x - 26},${from.y - 20} C${from.x - 90},${from.y - 95} ${from.x + 90},${from.y - 95} ${from.x + 26},${from.y - 20}` : `M${start.x},${start.y} Q${bend.x},${bend.y} ${end.x},${end.y}`;
      const label = self ? { x: from.x, y: from.y - 72 } : { x: (start.x + 2 * bend.x + end.x) / 4, y: (start.y + 2 * bend.y + end.y) / 4 };
      const title = `${edge.from} → ${edge.to}: ${((edge.probability ?? 0) * 100).toFixed(1)}% (${edge.count}/${edge.total})`;
      return <g key={`${edge.from}-${edge.to}`} role="button" tabIndex={0} aria-label={title} onClick={() => onSelect(edge.evidence[0].eventIds[0])} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(edge.evidence[0].eventIds[0]); } }}><title>{title}</title><path d={d} fill="none" stroke="#80e2cd" strokeWidth={1.5 + (edge.probability ?? 0) * 3} markerEnd={`url(#${marker})`} /><rect x={label.x - 39} y={label.y - 11} width="78" height="22" rx="5" fill="#10271f" /><text x={label.x} y={label.y + 4} fill="#effbf5" textAnchor="middle" fontSize="12">{((edge.probability ?? 0) * 100).toFixed(0)}% · {edge.count}</text></g>;
    })}
    {paths.states.map((state, index) => <g key={state}><rect x={positions[index].x - 58} y={positions[index].y - 23} width="116" height="46" rx="14" fill="#1e493d" stroke="#80e2cd" /><text x={positions[index].x} y={positions[index].y + 5} textAnchor="middle" fill="#effbf5" fontSize="14">{state}</text></g>)}
  </svg><p>{paths.transitions.length} transições observadas · selecione uma seta para consultar a sequência.</p></div>;
}

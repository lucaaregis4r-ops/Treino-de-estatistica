import { useState } from 'react';
import type { MatchReportModel } from '../../../application/reporting/MatchReportModel';
import type { SpatialHeatmapPreset } from '../../../domain/scout/spatial/SpatialProjection';

interface SpatialAnalyticsPanelProps {
  readonly report: MatchReportModel;
  readonly teamId: string;
}

const PRESETS: readonly {
  readonly id: SpatialHeatmapPreset;
  readonly label: string;
  readonly skill: 'attack' | 'serve' | 'reception';
}[] = [
  { id: 'attack_target', label: 'Alvo de ataque', skill: 'attack' },
  { id: 'serve_target', label: 'Alvo de saque', skill: 'serve' },
  { id: 'reception_contact', label: 'Contato de recepção', skill: 'reception' },
];

function percent(value: number): string {
  return `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
}

export function SpatialAnalyticsPanel({ report, teamId }: SpatialAnalyticsPanelProps) {
  const [preset, setPreset] = useState<SpatialHeatmapPreset>('attack_target');
  const [viewMode, setViewMode] = useState<'heatmap' | 'plays'>('heatmap');
  const definition = PRESETS.find((item) => item.id === preset) ?? PRESETS[0];
  const spatial = report.spatial ?? { samples: [], density: [], trajectories: [], matrix: [] };
  const density = spatial.density.filter(
    (cell) => cell.teamId === teamId && cell.preset === preset,
  );
  const trajectories = spatial.trajectories.filter(
    (trajectory) => trajectory.teamId === teamId && trajectory.skill === definition.skill,
  );
  const individualTrajectories = spatial.samples.filter(
    (sample) =>
      sample.teamId === teamId &&
      sample.skill === definition.skill &&
      sample.origin?.x !== undefined &&
      sample.origin.y !== undefined &&
      sample.target?.x !== undefined &&
      sample.target.y !== undefined,
  );
  const matrix = spatial.matrix.filter(
    (cell) => cell.teamId === teamId && cell.skill === definition.skill,
  );
  const total = density.reduce((sum, cell) => sum + cell.attempts, 0);
  const maxCount = Math.max(1, ...density.map((cell) => cell.count));
  const maxPointRate = Math.max(1, ...density.map((cell) => cell.pointRate ?? 0));
  const maxSideoutRate = Math.max(1, ...density.map((cell) => cell.sideoutRate ?? 0));
  const strongest = [...density].sort(
    (left, right) =>
      (right[definition.skill === 'reception' ? 'sideoutRate' : 'pointRate'] ?? 0) -
      (left[definition.skill === 'reception' ? 'sideoutRate' : 'pointRate'] ?? 0),
  )[0];
  const attackHeatmap = preset === 'attack_target';
  const receptionHeatmap = preset === 'reception_contact';

  return (
    <section id="spatial-analytics" className="spatial-analytics" aria-labelledby="spatial-title">
      <div className="analytics-section-heading spatial-heading">
        <div>
          <p className="eyebrow">Spatial Analytics</p>
          <h3 id="spatial-title">Densidade e trajetórias na quadra</h3>
          <p>
            {total === 0
              ? 'Ainda não há coordenadas para este recorte.'
              : attackHeatmap
                ? `${total} ataques. Melhor taxa por região: ${strongest?.zoneId ? `Z${strongest.zoneId}, ` : ''}${percent(strongest?.pointRate ?? 0)}.`
                : receptionHeatmap
                  ? `${total} recepções. Melhor sideout por região: ${strongest?.zoneId ? `Z${strongest.zoneId}, ` : ''}${percent(strongest?.sideoutRate ?? 0)}.`
                  : `${total} contatos. Maior concentração: ${strongest?.zoneId ? `Z${strongest.zoneId}, ` : ''}${strongest?.count ?? 0} (${percent((strongest?.count ?? 0) / total)}).`}
          </p>
        </div>
        <label>
          Mapa
          <select
            value={preset}
            onChange={(event) => setPreset(event.target.value as SpatialHeatmapPreset)}
          >
            {PRESETS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="spatial-view-toggle" aria-label="Modo de visualização espacial">
          <button
            type="button"
            aria-pressed={viewMode === 'heatmap'}
            onClick={() => setViewMode('heatmap')}
          >
            Heatmap
          </button>
          <button
            type="button"
            aria-pressed={viewMode === 'plays'}
            onClick={() => setViewMode('plays')}
          >
            Jogadas
          </button>
        </div>
      </div>

      <div className="spatial-visual-grid">
        {viewMode === 'heatmap' && (
          <figure className="spatial-court-card">
            <svg
              className="volleyball-court"
              viewBox="0 0 120 72"
              role="img"
              aria-label={`Heatmap: ${definition.label}`}
            >
              <rect className="spatial-court-floor" x="4" y="4" width="112" height="64" rx="2" />
              <line className="spatial-court-line net" x1="60" y1="4" x2="60" y2="68" />
              <line className="spatial-court-line muted" x1="41.33" y1="4" x2="41.33" y2="68" />
              <line className="spatial-court-line muted" x1="78.67" y1="4" x2="78.67" y2="68" />
              <text className="spatial-zone-label" x="22" y="20">
                4
              </text>
              <text className="spatial-zone-label" x="34" y="20">
                3
              </text>
              <text className="spatial-zone-label" x="48" y="20">
                2
              </text>
              <text className="spatial-zone-label" x="22" y="56">
                5
              </text>
              <text className="spatial-zone-label" x="34" y="56">
                6
              </text>
              <text className="spatial-zone-label" x="48" y="56">
                1
              </text>
              {attackHeatmap || receptionHeatmap
                ? density.map((cell) => (
                    <rect
                      key={`${cell.x}-${cell.y}`}
                      className="spatial-density-cell"
                      x={4 + (cell.x - 1 / 12) * 112}
                      y={4 + (cell.y - 1 / 12) * 64}
                      width={112 / 6}
                      height={64 / 6}
                      opacity={
                        0.15 +
                        ((receptionHeatmap ? (cell.sideoutRate ?? 0) : (cell.pointRate ?? 0)) /
                          (receptionHeatmap ? maxSideoutRate : maxPointRate)) *
                          0.8
                      }
                    >
                      <title>
                        {receptionHeatmap
                          ? `${cell.receptions ?? 0} recepções · ${cell.sideouts ?? 0} sideouts · ${percent(cell.sideoutRate ?? 0)}`
                          : `${cell.attempts} ataques · ${cell.points} pontos · ${percent(cell.pointRate ?? 0)}`}
                      </title>
                    </rect>
                  ))
                : density.map((cell) => (
                    <circle
                      key={`${cell.x}-${cell.y}`}
                      className="spatial-density"
                      cx={2 + cell.x * 96}
                      cy={2 + cell.y * 96}
                      r={5 + (cell.count / maxCount) * 10}
                      opacity={0.35 + (cell.count / maxCount) * 0.55}
                    />
                  ))}
            </svg>
            <figcaption>
              {attackHeatmap
                ? 'Cada região mostra a taxa de ponto; a amostra acompanha a intensidade.'
                : receptionHeatmap
                  ? 'Cada região mostra a taxa de sideout; a amostra acompanha a intensidade.'
                  : `${definition.label}; círculos maiores representam mais contatos.`}
            </figcaption>
          </figure>
        )}

        <figure className="spatial-court-card">
          <svg
            className="volleyball-court"
            viewBox="0 0 120 72"
            role="img"
            aria-label={
              viewMode === 'plays' ? 'Mapa de jogadas individuais' : 'Mapa agregado de trajetórias'
            }
          >
            <defs>
              <marker
                id="spatial-arrow"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" />
              </marker>
            </defs>
            <rect className="spatial-court-floor" x="4" y="4" width="112" height="64" rx="2" />
            <line className="spatial-court-line net" x1="60" y1="4" x2="60" y2="68" />
            <line className="spatial-court-line muted" x1="41.33" y1="4" x2="41.33" y2="68" />
            <line className="spatial-court-line muted" x1="78.67" y1="4" x2="78.67" y2="68" />
            <text className="spatial-zone-label" x="22" y="20">
              4
            </text>
            <text className="spatial-zone-label" x="34" y="20">
              3
            </text>
            <text className="spatial-zone-label" x="48" y="20">
              2
            </text>
            <text className="spatial-zone-label" x="22" y="56">
              5
            </text>
            <text className="spatial-zone-label" x="34" y="56">
              6
            </text>
            <text className="spatial-zone-label" x="48" y="56">
              1
            </text>
            {viewMode === 'plays'
              ? individualTrajectories.map((sample) => (
                  <g key={sample.eventId}>
                    <line
                      className="spatial-route"
                      x1={4 + (sample.origin?.x ?? 0) * 112}
                      y1={4 + (sample.origin?.y ?? 0) * 64}
                      x2={4 + (sample.target?.x ?? 0) * 112}
                      y2={4 + (sample.target?.y ?? 0) * 64}
                      strokeWidth="1"
                      markerEnd="url(#spatial-arrow)"
                    />
                    <title>{`Evento ${sample.eventId}: origem → destino`}</title>
                  </g>
                ))
              : trajectories.map((trajectory, index) => (
                  <line
                    key={`${trajectory.origin.x}-${trajectory.origin.y}-${trajectory.target.x}-${trajectory.target.y}-${index}`}
                    className="spatial-route"
                    x1={4 + (trajectory.origin.x ?? 0) * 112}
                    y1={4 + (trajectory.origin.y ?? 0) * 64}
                    x2={4 + (trajectory.target.x ?? 0) * 112}
                    y2={4 + (trajectory.target.y ?? 0) * 64}
                    strokeWidth={1 + Math.min(5, trajectory.count)}
                    markerEnd="url(#spatial-arrow)"
                  />
                ))}
          </svg>
          <figcaption>
            {viewMode === 'plays'
              ? `${individualTrajectories.length} jogadas com origem e destino registrados.`
              : `${trajectories.length} rotas agregadas com origem e destino.`}
          </figcaption>
        </figure>
      </div>

      {viewMode === 'heatmap' && (
        <div className="analytics-table-scroll">
          <table className="analytics-table" aria-label="Dados espaciais equivalentes ao heatmap">
            <thead>
              <tr>
                <th>Zona</th>
                <th>X</th>
                <th>Y</th>
                <th>{attackHeatmap ? 'Ataques' : receptionHeatmap ? 'Recepções' : 'Contatos'}</th>
                <th>{attackHeatmap ? 'Pontos' : receptionHeatmap ? 'Sideouts' : 'Participação'}</th>
                {(attackHeatmap || receptionHeatmap) && (
                  <th>{attackHeatmap ? 'Taxa de ponto' : 'Taxa de sideout'}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {density.map((cell) => (
                <tr key={`${cell.x}-${cell.y}`}>
                  <th scope="row">{cell.zoneId ? `Z${cell.zoneId}` : 'Grade'}</th>
                  <td>{cell.x.toFixed(2)}</td>
                  <td>{cell.y.toFixed(2)}</td>
                  <td>
                    {attackHeatmap
                      ? cell.attempts
                      : receptionHeatmap
                        ? cell.receptions
                        : cell.count}
                  </td>
                  <td>
                    {attackHeatmap
                      ? cell.points
                      : receptionHeatmap
                        ? cell.sideouts
                        : total
                          ? percent(cell.count / total)
                          : '—'}
                  </td>
                  {(attackHeatmap || receptionHeatmap) && (
                    <td>
                      {percent(receptionHeatmap ? (cell.sideoutRate ?? 0) : (cell.pointRate ?? 0))}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="analytics-table-scroll">
        <table className="analytics-table" aria-label="Matriz espacial de origem por destino">
          <thead>
            <tr>
              <th>Origem</th>
              <th>Destino</th>
              <th>Contatos</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((cell) => (
              <tr key={`${cell.originZoneId}-${cell.targetZoneId}`}>
                <th scope="row">Z{cell.originZoneId}</th>
                <td>Z{cell.targetZoneId}</td>
                <td>{cell.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

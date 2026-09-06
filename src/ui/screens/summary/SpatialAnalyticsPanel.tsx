import { useState } from 'react';
import type { MatchReportModel } from '../../../application/reporting/MatchReportModel';
import { SKILLS, type Skill } from '../../../domain/scout/entities/Skill';
import type {
  SpatialLocation,
  SpatialSample,
} from '../../../domain/scout/spatial/SpatialProjection';
import './SpatialAnalyticsPanel.css';
import { HeatmapLayer } from './HeatmapLayer';

interface SpatialAnalyticsPanelProps {
  readonly report: MatchReportModel;
  readonly teamId: string;
}

type Coordinate = 'origin' | 'target';
type ViewMode = 'points' | 'plays' | 'heatmap';

const SKILL_LABELS: Readonly<Record<Skill, string>> = {
  serve: 'Saque',
  reception: 'Recepção',
  set: 'Levantamento',
  attack: 'Ataque',
  block: 'Bloqueio',
  dig: 'Defesa',
  free_ball: 'Free ball',
};

function pointFor(sample: SpatialSample, coordinate: Coordinate): SpatialLocation | undefined {
  const point = sample[coordinate];
  return point?.surface === 'court' && point.x !== undefined && point.y !== undefined
    ? point
    : undefined;
}

function PointCourt({
  points,
  heatmap = false,
}: {
  readonly points: readonly { x: number; y: number; label: string }[];
  heatmap?: boolean;
}) {
  return (
    <svg
      className="spatial-points-court"
      viewBox="0 0 200 100"
      role="img"
      aria-label={heatmap ? 'Mapa de calor' : 'Mapa de pontos'}
    >
      {!heatmap && <rect className="spatial-points-floor" x="0" y="0" width="200" height="100" />}
      {[200 / 3, 100, 400 / 3].map((x) => (
        <line
          key={x}
          className={x === 100 ? 'spatial-points-net' : 'spatial-points-attack-line'}
          x1={x}
          y1="0"
          x2={x}
          y2="100"
        />
      ))}
      <rect className="spatial-points-border" x="0" y="0" width="200" height="100" />
      {!heatmap &&
        points.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}-${index}`}
            className="spatial-point"
            cx={point.x * 200}
            cy={point.y * 100}
            r="2.4"
          >
            <title>{point.label}</title>
          </circle>
        ))}
    </svg>
  );
}

function TrajectoryCourt({ samples }: { readonly samples: readonly SpatialSample[] }) {
  return (
    <svg
      className="spatial-points-court"
      viewBox="0 0 200 100"
      role="img"
      aria-label="Mapa de jogadas"
    >
      <rect className="spatial-points-floor" x="0" y="0" width="200" height="100" />
      {[200 / 3, 100, 400 / 3].map((x) => (
        <line
          key={x}
          className={x === 100 ? 'spatial-points-net' : 'spatial-points-attack-line'}
          x1={x}
          y1="0"
          x2={x}
          y2="100"
        />
      ))}
      {samples.map((sample) => {
        const origin = pointFor(sample, 'origin');
        const target = pointFor(sample, 'target');
        if (!origin || !target) return null;
        return (
          <g key={sample.eventId}>
            <line
              className="spatial-play-line"
              x1={origin.x! * 200}
              y1={origin.y! * 100}
              x2={target.x! * 200}
              y2={target.y! * 100}
            >
              <title>
                {SKILL_LABELS[sample.skill]} · Set {sample.setNumber}
              </title>
            </line>
            <circle
              className="spatial-play-origin"
              cx={origin.x! * 200}
              cy={origin.y! * 100}
              r="2"
            />
            <circle
              className="spatial-play-target"
              cx={target.x! * 200}
              cy={target.y! * 100}
              r="2"
            />
          </g>
        );
      })}
      <rect className="spatial-points-border" x="0" y="0" width="200" height="100" />
    </svg>
  );
}

export function SpatialAnalyticsPanel({ report, teamId }: SpatialAnalyticsPanelProps) {
  const [skill, setSkill] = useState<Skill | 'all'>('attack');
  const [evaluations, setEvaluations] = useState<readonly string[] | null>(null);
  const [coordinate, setCoordinate] = useState<Coordinate>('origin');
  const [viewMode, setViewMode] = useState<ViewMode>('points');
  const [playerId, setPlayerId] = useState('all');
  const [setNumber, setSetNumber] = useState('all');
  const [rotation, setRotation] = useState('all');
  const [radius, setRadius] = useState(0.16);
  const [intensity, setIntensity] = useState(1);
  const samples = (report.spatial?.samples ?? []).filter(
    (sample) => sample.teamId === teamId && sample.source === 'spatial',
  );
  const availableSkills = SKILLS.filter((value) =>
    samples.some((sample) => sample.skill === value),
  );
  const selectedSkill =
    skill === 'all' || availableSkills.includes(skill) ? skill : (availableSkills[0] ?? skill);
  const availableEvaluations = [
    ...new Set(
      samples
        .map((sample) => sample.evaluation)
        .filter((value): value is string => value !== undefined),
    ),
  ];
  const activeEvaluations =
    evaluations === null
      ? availableEvaluations
      : evaluations.filter((value) => availableEvaluations.includes(value));
  const filteredSamples = samples
    .filter((sample) => selectedSkill === 'all' || sample.skill === selectedSkill)
    .filter((sample) => playerId === 'all' || sample.playerId === playerId)
    .filter((sample) => setNumber === 'all' || String(sample.setNumber) === setNumber)
    .filter((sample) => rotation === 'all' || String(sample.setterPosition) === rotation)
    .filter(
      (sample) =>
        evaluations === null ||
        (sample.evaluation !== undefined && activeEvaluations.includes(sample.evaluation)),
    );
  const filteredPoints = filteredSamples.flatMap((sample) => {
    const point = pointFor(sample, coordinate);
    return point
      ? [
          {
            x: point.x!,
            y: point.y!,
            label: [
              `${SKILL_LABELS[sample.skill]}${sample.evaluation ? ` ${sample.evaluation}` : ''}`,
              playerLabel(sample.playerId),
              `Set ${sample.setNumber}`,
            ]
              .filter(Boolean)
              .join(' · '),
          },
        ]
      : [];
  });
  const filteredPlays = filteredSamples.filter(
    (sample) => pointFor(sample, 'origin') && pointFor(sample, 'target'),
  );
  const players = [
    ...new Set(
      samples.map((sample) => sample.playerId).filter((value): value is string => Boolean(value)),
    ),
  ];
  const sets = [...new Set(samples.map((sample) => sample.setNumber))].sort((a, b) => a - b);
  const positions = [
    ...new Set(samples.flatMap((s) => (s.setterPosition ? [s.setterPosition] : []))),
  ].sort();
  function playerLabel(id?: string) {
    const player = report.players?.find((p) => p.id === id);
    return player
      ? `#${player.number} ${player.name}`
      : id
        ? 'Atleta ' + (samples.findIndex((s) => s.playerId === id) + 1)
        : 'Não informado';
  }

  function changeSkill(value: Skill | 'all') {
    setSkill(value);
  }

  function toggleEvaluation(value: string) {
    setEvaluations((current) =>
      (current ?? availableEvaluations).includes(value)
        ? (current ?? availableEvaluations).filter((item) => item !== value)
        : [...(current ?? availableEvaluations), value],
    );
  }

  return (
    <section className="spatial-points-panel" aria-labelledby="spatial-points-title">
      <div className="spatial-points-heading">
        <div>
          <p className="eyebrow">Análise espacial</p>
          <h3 id="spatial-points-title">Distribuição em quadra</h3>
        </div>
        <span className="spatial-points-count">
          {viewMode === 'plays' ? filteredPlays.length : filteredPoints.length} ações
        </span>
      </div>

      <div className="spatial-points-filters">
        <label>
          Ação
          <select
            value={selectedSkill}
            onChange={(event) => changeSkill(event.target.value as Skill | 'all')}
          >
            <option value="all">Todas</option>
            {availableSkills.map((value) => (
              <option key={value} value={value}>
                {SKILL_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Avaliação</legend>
          {availableEvaluations.map((value) => (
            <label key={value}>
              <input
                type="checkbox"
                checked={activeEvaluations.includes(value)}
                onChange={() => toggleEvaluation(value)}
              />
              {value}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Coordenada</legend>
          <label>
            <input
              type="radio"
              checked={coordinate === 'origin'}
              onChange={() => setCoordinate('origin')}
            />{' '}
            Origem
          </label>
          <label>
            <input
              type="radio"
              checked={coordinate === 'target'}
              onChange={() => setCoordinate('target')}
            />{' '}
            Destino
          </label>
        </fieldset>
        <label>
          Atleta
          <select value={playerId} onChange={(event) => setPlayerId(event.target.value)}>
            <option value="all">Todos</option>
            {players.map((value) => (
              <option key={value} value={value}>
                {playerLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Set
          <select value={setNumber} onChange={(event) => setSetNumber(event.target.value)}>
            <option value="all">Todos</option>
            {sets.map((value) => (
              <option key={value} value={value}>
                Set {value}
              </option>
            ))}
          </select>
        </label>
        {positions.length > 0 && (
          <label>
            P do levantador
            <select value={rotation} onChange={(e) => setRotation(e.target.value)}>
              <option value="all">Todos</option>
              {positions.map((p) => (
                <option key={p} value={p}>
                  P{p}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="analysis-toolbar">
        <div role="group" aria-label="Visualização">
          {(
            [
              ['points', 'Pontos'],
              ['heatmap', 'Heatmap'],
              ['plays', 'Jogadas'],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={viewMode === value}
              onClick={() => setViewMode(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setSkill('all');
            setEvaluations(null);
            setPlayerId('all');
            setSetNumber('all');
            setRotation('all');
          }}
        >
          Limpar filtros
        </button>
      </div>
      <div className="analysis-metrics">
        {availableEvaluations.map((q) => (
          <span key={q}>
            {filteredSamples.filter((s) => s.evaluation === q).length} {q}
          </span>
        ))}
      </div>
      {viewMode === 'heatmap' && (
        <details className="analysis-adjustments">
          <summary>Ajustes do heatmap</summary>
          <label>
            Raio
            <input
              type="range"
              min="0.04"
              max="0.35"
              step="0.01"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            />
          </label>
          <label>
            Intensidade
            <input
              type="range"
              min="0.2"
              max="3"
              step="0.1"
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
            />
          </label>
          <small>Densidade: menor → maior</small>
        </details>
      )}

      {viewMode === 'heatmap' && filteredPoints.length > 0 ? (
        <div className="analysis-heat-court">
          <HeatmapLayer points={filteredPoints} radius={radius} intensity={intensity} />
          <PointCourt points={[]} heatmap />
        </div>
      ) : viewMode === 'points' && filteredPoints.length > 0 ? (
        <PointCourt points={filteredPoints} />
      ) : viewMode === 'plays' && filteredPlays.length > 0 ? (
        <TrajectoryCourt samples={filteredPlays} />
      ) : (
        <p className="spatial-points-empty">Nenhuma ação corresponde aos filtros selecionados.</p>
      )}
      {viewMode === 'plays' && <small>● Origem (amarelo) → destino (verde)</small>}
      <details className="analysis-adjustments">
        <summary>Ver tabela detalhada · {filteredSamples.length} ações</summary>
        <div className="analytics-table-scroll">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Atleta</th>
                <th>Ação</th>
                <th>Qualidade</th>
                <th>Set</th>
                <th>P</th>
                <th>Origem</th>
                <th>Destino</th>
              </tr>
            </thead>
            <tbody>
              {filteredSamples.map((s) => (
                <tr key={s.eventId}>
                  <td>{playerLabel(s.playerId)}</td>
                  <td>{SKILL_LABELS[s.skill]}</td>
                  <td>{s.evaluation ?? '—'}</td>
                  <td>{s.setNumber}</td>
                  <td>{s.setterPosition ?? '—'}</td>
                  <td>{s.origin ? `${s.origin.x}, ${s.origin.y}` : '—'}</td>
                  <td>{s.target ? `${s.target.x}, ${s.target.y}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

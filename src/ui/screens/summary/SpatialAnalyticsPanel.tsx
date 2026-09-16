import { useState, type KeyboardEvent } from 'react';
import type { MatchReportModel } from '../../../application/reporting/MatchReportModel';
import {
  createAnalysisConfiguration,
  type AnalysisConfiguration,
} from '../../../domain/analytics/AnalysisConfiguration';
import { createEntityId } from '../../../core/ids/entityId';
import { SKILLS, type Skill } from '../../../domain/scout/entities/Skill';
import type {
  SpatialLocation,
  SpatialSample,
} from '../../../domain/scout/spatial/SpatialProjection';
import './SpatialAnalyticsPanel.css';
import { HeatmapLayer } from './HeatmapLayer';
import { SKILL_LABELS } from '../scout/presentationLabels';

interface SpatialAnalyticsPanelProps {
  readonly report: MatchReportModel;
  readonly teamId: string;
  readonly matchId?: string;
  readonly analysisConfigurations?: readonly AnalysisConfiguration[];
  readonly onSaveAnalysisConfiguration?: (configuration: AnalysisConfiguration) => Promise<void>;
  readonly onDeleteAnalysisConfiguration?: (id: string) => Promise<void>;
}

type Coordinate = 'origin' | 'target';
type ViewMode = 'points' | 'plays' | 'heatmap';
export type MarkerKind = 'point' | 'neutral' | 'error';

function markerKind(evaluation?: string): MarkerKind {
  if (evaluation === 'excellent' || evaluation === '#') return 'point';
  if (evaluation === 'error' || evaluation === '=') return 'error';
  return 'neutral';
}

function locationLabel(location?: SpatialLocation): string {
  if (!location) return 'não registrada';
  if (location.x !== undefined && location.y !== undefined)
    return `${location.x.toFixed(2)}, ${location.y.toFixed(2)}`;
  return location.zoneId ?? 'não registrada';
}

function blockLabel(sample: SpatialSample, playerLabel: (id?: string) => string): string {
  if (sample.skill !== 'attack' || !sample.blockOutcome || sample.blockOutcome === 'none') {
    return 'Sem bloqueio';
  }
  const outcome = {
    point: 'Ponto de bloqueio',
    tool: 'Bloqueio explorado',
    soft_touch: 'Bloqueio amortecido',
    none: 'Sem bloqueio',
  }[sample.blockOutcome];
  const blockers = sample.blockerIds?.map((id) => playerLabel(id)).join(', ');
  return `${outcome}${blockers ? ` · ${blockers}` : ''}`;
}

function sampleDetail(sample: SpatialSample, playerLabel: (id?: string) => string): string {
  return [
    playerLabel(sample.playerId),
    SKILL_LABELS[sample.skill],
    sample.evaluation ? `Avaliação: ${sample.evaluation}` : undefined,
    `Origem: ${locationLabel(sample.origin)}`,
    `Destino: ${locationLabel(sample.target)}`,
    blockLabel(sample, playerLabel),
    `Set ${sample.setNumber}`,
  ].filter(Boolean).join(' · ');
}

function pointFor(sample: SpatialSample, coordinate: Coordinate): SpatialLocation | undefined {
  const point = sample[coordinate];
  return point?.surface === 'court' && point.x !== undefined && point.y !== undefined
    ? point
    : undefined;
}

function currentTimestamp(): number {
  return Date.now();
}

export interface SpatialAnalysisPoint {
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly marker: MarkerKind;
  readonly eventId?: string;
}

export function SpatialAnalysisCourt({
  points,
  heatmap = false,
  onSelect,
}: {
  readonly points: readonly SpatialAnalysisPoint[];
  heatmap?: boolean;
  readonly onSelect?: (eventId: string) => void;
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
        points.map((point, index) => {
          const x = point.x * 200;
          const y = point.y * 100;
          const common = {
            className: 'spatial-point-hit',
            onClick: () => point.eventId && onSelect?.(point.eventId),
            onKeyDown: (event: KeyboardEvent<SVGGElement>) => {
              if (event.key === 'Enter' || event.key === ' ') onSelect?.(point.eventId ?? '');
            },
          };
          return (
            <g
              key={point.eventId ?? `${point.x}-${point.y}-${index}`}
              {...common}
              tabIndex={point.eventId ? 0 : undefined}
              role={point.eventId ? 'button' : undefined}
              aria-label={point.label}
            >
              <circle className={`spatial-point spatial-point-${point.marker}`} cx={x} cy={y} r={point.marker === 'point' ? 3 : 0} />
              {point.marker === 'neutral' && <polygon className="spatial-point-neutral" points={`${x},${y - 3.2} ${x + 3.2},${y} ${x},${y + 3.2} ${x - 3.2},${y}`} />}
              {point.marker === 'error' && (
                <>
                  <line className="spatial-point-error" x1={x - 2.8} y1={y - 2.8} x2={x + 2.8} y2={y + 2.8} />
                  <line className="spatial-point-error" x1={x + 2.8} y1={y - 2.8} x2={x - 2.8} y2={y + 2.8} />
                </>
              )}
              <title>{point.label}</title>
            </g>
          );
        })}
    </svg>
  );
}

function TrajectoryCourt({
  samples,
  onSelect,
  playerLabel,
}: {
  readonly samples: readonly SpatialSample[];
  readonly onSelect?: (eventId: string) => void;
  readonly playerLabel: (id?: string) => string;
}) {
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
          <g
            key={sample.eventId}
            tabIndex={0}
            role="button"
            aria-label={sampleDetail(sample, playerLabel)}
            onClick={() => onSelect?.(sample.eventId)}
          >
            <line
              className={`spatial-play-line spatial-play-${markerKind(sample.evaluation)}`}
              x1={origin.x! * 200}
              y1={origin.y! * 100}
              x2={target.x! * 200}
              y2={target.y! * 100}
            >
              <title>
                {sampleDetail(sample, playerLabel)}
              </title>
            </line>
            <circle className="spatial-play-origin" cx={origin.x! * 200} cy={origin.y! * 100} r="2" />
            {markerKind(sample.evaluation) === 'point' && <circle className="spatial-point-point" cx={target.x! * 200} cy={target.y! * 100} r="3" />}
            {markerKind(sample.evaluation) === 'neutral' && <polygon className="spatial-point-neutral" points={`${target.x! * 200},${target.y! * 100 - 3.2} ${target.x! * 200 + 3.2},${target.y! * 100} ${target.x! * 200},${target.y! * 100 + 3.2} ${target.x! * 200 - 3.2},${target.y! * 100}`} />}
            {markerKind(sample.evaluation) === 'error' && <g className="spatial-point-error"><line x1={target.x! * 200 - 2.8} y1={target.y! * 100 - 2.8} x2={target.x! * 200 + 2.8} y2={target.y! * 100 + 2.8} /><line x1={target.x! * 200 + 2.8} y1={target.y! * 100 - 2.8} x2={target.x! * 200 - 2.8} y2={target.y! * 100 + 2.8} /></g>}
          </g>
        );
      })}
      <rect className="spatial-points-border" x="0" y="0" width="200" height="100" />
    </svg>
  );
}

export function SpatialAnalyticsPanel({
  report,
  teamId,
  matchId,
  analysisConfigurations = [],
  onSaveAnalysisConfiguration,
  onDeleteAnalysisConfiguration,
}: SpatialAnalyticsPanelProps) {
  const analysisMatchId = matchId ?? report.metadata?.id ?? '';
  const [skill, setSkill] = useState<Skill | 'all'>('attack');
  const [evaluations, setEvaluations] = useState<readonly string[] | null>(null);
  const [coordinate, setCoordinate] = useState<Coordinate>('origin');
  const [viewMode, setViewMode] = useState<ViewMode>('points');
  const [playerId, setPlayerId] = useState('all');
  const [setNumber, setSetNumber] = useState('all');
  const [rotation, setRotation] = useState('all');
  const [radius, setRadius] = useState(0.16);
  const [intensity, setIntensity] = useState(1);
  const [analysisName, setAnalysisName] = useState('');
  const [selectedConfigurationId, setSelectedConfigurationId] = useState('');
  const [selectedSampleId, setSelectedSampleId] = useState<string>();
  const effectiveTeamId = teamId;
  const selectedConfiguration = analysisConfigurations.find(
    (configuration) => configuration.id === selectedConfigurationId,
  );
  const visibleConfigurations = analysisConfigurations.filter(
    (configuration) =>
      configuration.matchId === analysisMatchId && configuration.filters.teamId === effectiveTeamId,
  );
  function applyConfiguration(configuration: AnalysisConfiguration) {
    setSelectedConfigurationId(configuration.id);
    setAnalysisName(configuration.name);
    setSkill(configuration.filters.skill);
    setEvaluations(configuration.filters.evaluations ? [...configuration.filters.evaluations] : null);
    setCoordinate(configuration.filters.coordinate);
    setPlayerId(configuration.filters.playerId);
    setSetNumber(configuration.filters.setNumber);
    setRotation(configuration.filters.rotation);
    setViewMode(configuration.chart.viewMode);
    setRadius(configuration.chart.radius);
    setIntensity(configuration.chart.intensity);
  }
  async function saveConfiguration() {
    if (!onSaveAnalysisConfiguration || !analysisName.trim()) return;
    const configuration = createAnalysisConfiguration({
      id: selectedConfiguration?.id ?? createEntityId(),
      matchId: analysisMatchId,
      name: analysisName,
      updatedAt: currentTimestamp(),
      filters: {
        teamId: effectiveTeamId,
        skill: selectedSkill,
        evaluations,
        playerId,
        setNumber,
        rotation,
        coordinate,
      },
      chart: { viewMode, radius, intensity },
    });
    await onSaveAnalysisConfiguration(configuration);
    setSelectedConfigurationId(configuration.id);
  }
  const samples = (report.spatial?.samples ?? []).filter(
    (sample) => sample.teamId === effectiveTeamId && sample.source === 'spatial',
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
            eventId: sample.eventId,
            marker: markerKind(sample.evaluation),
            label: [
              sampleDetail(sample, playerLabel),
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
  const selectedCoordinateLabel = coordinate === 'origin' ? 'origem' : 'destino';
  const registeredCoordinateCount = filteredSamples.filter((sample) => Boolean(pointFor(sample, coordinate))).length;
  const selectedSample = filteredSamples.find((sample) => sample.eventId === selectedSampleId);
  const isSavedConfigurationCurrent = selectedConfiguration
    ? selectedConfiguration.matchId === analysisMatchId &&
      selectedConfiguration.filters.teamId === effectiveTeamId &&
      selectedConfiguration.filters.skill === selectedSkill &&
      JSON.stringify(selectedConfiguration.filters.evaluations) === JSON.stringify(evaluations) &&
      selectedConfiguration.filters.playerId === playerId &&
      selectedConfiguration.filters.setNumber === setNumber &&
      selectedConfiguration.filters.rotation === rotation &&
      selectedConfiguration.filters.coordinate === coordinate &&
      selectedConfiguration.chart.viewMode === viewMode &&
      selectedConfiguration.chart.radius === radius &&
      selectedConfiguration.chart.intensity === intensity
    : true;
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
        <div className="spatial-points-count">
          <strong>{filteredSamples.length} ações no recorte</strong>
          <span>{registeredCoordinateCount} com {selectedCoordinateLabel} registrado</span>
        </div>
      </div>

      {onSaveAnalysisConfiguration && (
        <section className="analysis-configurations" aria-label="Análises salvas">
          <label>
            Análise salva
            <select
              value={selectedConfigurationId}
              onChange={(event) => {
                const configuration = analysisConfigurations.find(
                  (item) => item.id === event.target.value,
                );
                if (configuration) applyConfiguration(configuration);
                else setSelectedConfigurationId('');
              }}
            >
              <option value="">Configuração atual</option>
              {visibleConfigurations.map((configuration) => (
                <option key={configuration.id} value={configuration.id}>
                  {configuration.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nome
            <input
              value={analysisName}
              onChange={(event) => setAnalysisName(event.target.value)}
              placeholder="Ex.: Ataques da Equipe A"
            />
          </label>
          <button type="button" onClick={() => void saveConfiguration()} disabled={!analysisName.trim()}>
            Salvar análise
          </button>
          {selectedConfiguration && !isSavedConfigurationCurrent && (
            <small role="status">Alterações não salvas</small>
          )}
          {selectedConfiguration && onDeleteAnalysisConfiguration && (
            <button
              type="button"
              onClick={() => {
                void onDeleteAnalysisConfiguration(selectedConfiguration.id);
                setSelectedConfigurationId('');
              }}
            >
              Excluir
            </button>
          )}
        </section>
      )}

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
          <details className="analysis-more-filters">
            <summary>Mais filtros</summary>
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
          </details>
        )}
      </div>
      <div className="analysis-toolbar">
        <div role="group" aria-label="Visualização">
          {(
            [
              ['points', 'Pontos'],
              ['heatmap', 'Mapa de calor'],
              ['plays', 'Trajetórias'],
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
      <div className="spatial-marker-legend" aria-label="Legenda de avaliação">
        <span><i className="legend-marker legend-marker-point" aria-hidden="true" /> # Ponto</span>
        <span><i className="legend-marker legend-marker-neutral" aria-hidden="true" /> Avaliação neutra</span>
        <span><i className="legend-marker legend-marker-error" aria-hidden="true" /> = Erro</span>
      </div>
      {viewMode === 'heatmap' && (
        <details className="analysis-adjustments">
          <summary>Ajustar mapa de calor</summary>
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
          <div className="analysis-heat-legend" aria-label="Legenda de intensidade do mapa de calor">
            <span>Menor concentração</span><i aria-hidden="true" /><span>Maior concentração</span>
          </div>
        </details>
      )}

      {viewMode === 'heatmap' && filteredPoints.length > 0 ? (
        <div className="analysis-heat-court">
          <HeatmapLayer points={filteredPoints} radius={radius} intensity={intensity} />
          <SpatialAnalysisCourt points={[]} heatmap />
        </div>
      ) : viewMode === 'points' && filteredPoints.length > 0 ? (
        <SpatialAnalysisCourt points={filteredPoints} onSelect={setSelectedSampleId} />
      ) : viewMode === 'plays' && filteredPlays.length > 0 ? (
        <TrajectoryCourt samples={filteredPlays} onSelect={setSelectedSampleId} playerLabel={playerLabel} />
      ) : (
        <p className="spatial-points-empty">Nenhuma ação corresponde aos filtros selecionados.</p>
      )}
      {viewMode === 'plays' && <small>● Origem (amarelo) → destino (verde)</small>}
      {selectedSample && (
        <p className="spatial-sample-detail" role="status">
          {sampleDetail(selectedSample, playerLabel)}
        </p>
      )}
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
                <th>Bloqueio</th>
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
                  <td>{blockLabel(s, playerLabel)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

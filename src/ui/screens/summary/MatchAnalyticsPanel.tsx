import { useState } from 'react';
import type { MatchReportModel } from '../../../application/reporting/MatchReportModel';
import type { AnalysisConfiguration } from '../../../domain/analytics/AnalysisConfiguration';
import { createEntityId } from '../../../core/ids/entityId';
import {
  createReportChartConfiguration,
  type ReportChartConfiguration,
  type ReportChartType,
} from '../../../domain/reporting/ReportChartConfiguration';
import type { CourtRotationPosition } from '../../../domain/match/lineup/SetLineup';
import { AttackEvennessChart } from './charts/AttackEvennessChart';
import { RotationPerformanceChart } from './charts/RotationPerformanceChart';
import { SetterDistributionChart } from './charts/SetterDistributionChart';
import { SetterRepetitionChart } from './charts/SetterRepetitionChart';
import { TeamPerformanceChart } from './charts/TeamPerformanceChart';
import { SpatialAnalyticsPanel } from './SpatialAnalyticsPanel';

interface MatchAnalyticsPanelProps {
  readonly report: MatchReportModel;
  readonly matchId?: string;
  readonly analysisConfigurations?: readonly AnalysisConfiguration[];
  readonly onSaveAnalysisConfiguration?: (configuration: AnalysisConfiguration) => Promise<void>;
  readonly onDeleteAnalysisConfiguration?: (id: string) => Promise<void>;
  readonly reportChartConfigurations?: readonly ReportChartConfiguration[];
  readonly onSaveReportChartConfiguration?: (configuration: ReportChartConfiguration) => Promise<void>;
  readonly onDeleteReportChartConfiguration?: (id: string) => Promise<void>;
}

function percentage(value: number | null): string {
  return value === null
    ? '—'
    : `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function audit(metric: { readonly numerator: number; readonly denominator: number }): string {
  return `${metric.numerator}/${metric.denominator}`;
}

function coverageLabel(mode: string): string {
  if (mode === 'team_a') return 'somente Equipe A';
  if (mode === 'team_b') return 'somente Equipe B';
  return 'ambas as equipes';
}

const REPORT_CHART_OPTIONS: readonly { readonly type: ReportChartType; readonly label: string }[] = [
  { type: 'win_probability', label: 'Probabilidade de vitória' },
  { type: 'team_performance', label: 'Performance das equipes' },
  { type: 'rotation_performance', label: 'Desempenho por rotação' },
  { type: 'setter_distribution', label: 'Distribuição do levantador' },
  { type: 'attack_evenness', label: 'Equilíbrio do ataque' },
  { type: 'setter_repetition', label: 'Repetição do levantador' },
];

export function MatchAnalyticsPanel({
  report,
  matchId = report.metadata.id,
  analysisConfigurations = [],
  onSaveAnalysisConfiguration,
  onDeleteAnalysisConfiguration,
  reportChartConfigurations = [],
  onSaveReportChartConfiguration,
  onDeleteReportChartConfiguration,
}: MatchAnalyticsPanelProps) {
  const winProbability = report.winProbability ?? { teamA: .5, teamB: .5, setTeamA: .5, setTeamB: .5, points: [] };
  const [activeSection, setActiveSection] = useState<'court' | 'performance' | 'distribution' | 'evolution'>('court');
  const [teamId, setTeamId] = useState(report.teams[0]?.id ?? '');
  const teamPlayers = report.players.filter((player) => player.teamId === teamId);
  const [playerId, setPlayerId] = useState('');
  const [setterPosition, setSetterPosition] = useState<'' | CourtRotationPosition>('');
  const selectedPlayerId = teamPlayers.some((player) => player.id === playerId)
    ? playerId
    : (teamPlayers[0]?.id ?? '');
  const directions = report.tactical.attackDirections.filter(
    (row) =>
      row.teamId === teamId &&
      row.playerId === selectedPlayerId &&
      (!setterPosition || row.setterPosition === setterPosition),
  );
  const distributions = report.setterDistribution.filter(
    (row) =>
      row.teamId === teamId &&
      row.attackerPlayerId === selectedPlayerId &&
      (!setterPosition || row.setterPosition === setterPosition),
  );
  const [reportChartTitle, setReportChartTitle] = useState('');
  const orderedReportCharts = [...reportChartConfigurations].sort((left, right) => left.order - right.order);

  async function addReportChart(type: ReportChartType, label: string) {
    if (!onSaveReportChartConfiguration) return;
    const configuration = createReportChartConfiguration({
      id: createEntityId(),
      matchId,
      type,
      title: reportChartTitle.trim() || label,
      filters: {
        ...(type !== 'win_probability' ? { teamId } : {}),
        ...(selectedPlayerId ? { playerId: selectedPlayerId } : {}),
        ...(setterPosition ? { setterPosition } : {}),
      },
      parameters: {
        teamId,
        playerId: selectedPlayerId,
        setterPosition: setterPosition || null,
      },
      order: orderedReportCharts.length,
      sample: {
        totalActions: report.eventCount,
        identifiedActions: report.coverage?.identifiedActions ?? report.eventCount,
        unidentifiedActions: report.coverage?.unidentifiedActions ?? 0,
      },
      ...(report.coverage
        ? {
            coverage: {
              modes: report.coverage.modes,
              identifiedActions: report.coverage.identifiedActions,
              unidentifiedActions: report.coverage.unidentifiedActions,
            },
          }
        : {}),
    });
    await onSaveReportChartConfiguration(configuration);
    setReportChartTitle('');
  }

  async function removeReportChart(id: string) {
    if (onDeleteReportChartConfiguration) await onDeleteReportChartConfiguration(id);
  }

  function reportChartMatchesScope(configuration: ReportChartConfiguration, type: ReportChartType) {
    return (
      configuration.type === type &&
      (type === 'win_probability' || configuration.filters.teamId === teamId) &&
      (!selectedPlayerId || configuration.filters.playerId === selectedPlayerId) &&
      (!setterPosition || configuration.filters.setterPosition === setterPosition)
    );
  }

  async function toggleReportChart(type: ReportChartType, label: string, included: boolean) {
    const current = orderedReportCharts.find((configuration) => reportChartMatchesScope(configuration, type));
    if (included) await addReportChart(type, label);
    else if (current) await removeReportChart(current.id);
  }

  async function moveReportChart(index: number, direction: -1 | 1) {
    if (!onSaveReportChartConfiguration) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= orderedReportCharts.length) return;
    const current = orderedReportCharts[index];
    const target = orderedReportCharts[targetIndex];
    await onSaveReportChartConfiguration({ ...current, order: target.order });
    await onSaveReportChartConfiguration({ ...target, order: current.order });
  }

  async function renameReportChart(configuration: ReportChartConfiguration, title: string) {
    if (!onSaveReportChartConfiguration || !title.trim()) return;
    await onSaveReportChartConfiguration({ ...configuration, title: title.trim() });
  }

  return (
    <section
      id="visual-analytics"
      className="match-analytics"
      aria-labelledby="match-analytics-title"
    >
      <div className="tactical-analytics-heading">
        <div>
          <p className="eyebrow">Estatísticas da partida</p>
          <h2 id="match-analytics-title">Análise</h2>
        </div>
        <label>
          Equipe
          <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
            {report.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <nav className="analysis-tabs" aria-label="Seções da análise">
        {([
          ['court', 'Quadra'],
          ['performance', 'Desempenho'],
          ['distribution', 'Distribuição'],
          ['evolution', 'Evolução'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={activeSection === value}
            onClick={() => setActiveSection(value)}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className="analysis-section" hidden={activeSection !== 'evolution'} aria-labelledby="win-probability-title">
        <div className="win-probability-heading"><div><p className="eyebrow">Estimativa por estado do jogo</p><h3 id="win-probability-title">Probabilidade de vitória</h3></div><strong>{winProbability.teamA.toLocaleString('pt-BR',{style:'percent',maximumFractionDigits:1})} × {winProbability.teamB.toLocaleString('pt-BR',{style:'percent',maximumFractionDigits:1})}</strong></div>
        <div className="probability-axis" aria-hidden="true"><span>100%</span><span>50%</span><span>0%</span></div>
        <svg className="win-probability-chart" viewBox="0 0 600 180" role="img" aria-label="Gráfico de probabilidade de vitória, de zero a cem por cento"><line className="probability-midline" x1="0" y1="90" x2="600" y2="90" /><polyline className="probability-line-a" points={winProbability.points.map((point,index)=>`${winProbability.points.length < 2 ? 0 : index*600/(winProbability.points.length-1)},${180-point.teamA*180}`).join(' ')} /><polyline className="probability-line-b" points={winProbability.points.map((point,index)=>`${winProbability.points.length < 2 ? 0 : index*600/(winProbability.points.length-1)},${180-point.teamB*180}`).join(' ')} />{winProbability.points.map((point,index)=><circle key={point.sequence} className={point.actionImpact && point.actionImpact >= 0 ? 'probability-point-a' : 'probability-point-b'} cx={winProbability.points.length < 2 ? 0 : index*600/(winProbability.points.length-1)} cy={180-point.teamA*180} r="2"><title>Ponto {point.sequence} · {point.scoreTeamA}–{point.scoreTeamB} · impacto {(point.actionImpact ?? 0).toLocaleString('pt-BR',{style:'percent',maximumFractionDigits:1})}</title></circle>)}</svg>
        <div className="probability-legend"><span><i className="probability-dot-a" />{report.teams[0]?.name}</span><span><i className="probability-dot-b" />{report.teams[1]?.name}</span><small>Estimativa baseada no placar atual; calibrar com histórico para uso preditivo.</small></div>
        <div className="probability-impacts"><strong>Maiores variações</strong>{winProbability.points.slice().sort((a,b)=>Math.abs(b.actionImpact ?? 0)-Math.abs(a.actionImpact ?? 0)).slice(0,3).map(point=><span key={point.sequence}>Ponto {point.sequence} · {point.actionSkill ?? 'ação'}: {(point.actionImpact ?? 0).toLocaleString('pt-BR',{style:'percent',signDisplay:'always',maximumFractionDigits:1})}</span>)}</div>
      </section>

      <section className="analysis-section" hidden={activeSection !== 'court'} aria-labelledby="spatial-analysis-section-title">
        <h3 id="spatial-analysis-section-title" className="visually-hidden">Quadra</h3>
        <SpatialAnalyticsPanel
          key={teamId}
          report={report}
          teamId={teamId}
          matchId={matchId}
          analysisConfigurations={analysisConfigurations}
          onSaveAnalysisConfiguration={onSaveAnalysisConfiguration}
          onDeleteAnalysisConfiguration={onDeleteAnalysisConfiguration}
        />
        {report.coverage && (
          <p className="analytics-coverage-note">
            Cobertura da amostra: {report.coverage.modes.map(coverageLabel).join(' + ')} · {report.coverage.identifiedActions}{' '}
            ações identificadas · {report.coverage.unidentifiedActions} sem atleta identificado.
          </p>
        )}
      </section>
      {onSaveReportChartConfiguration && (
        <section className="report-chart-selection" aria-labelledby="report-chart-selection-title">
          <div className="analytics-section-heading">
            <p className="eyebrow">Relatório PDF</p>
            <h3 id="report-chart-selection-title">Gráficos selecionados</h3>
            <p>Adicione o gráfico com os filtros atuais. O mesmo tipo pode ser adicionado mais de uma vez.</p>
          </div>
          <label>
            Título personalizado
            <input
              value={reportChartTitle}
              onChange={(event) => setReportChartTitle(event.target.value)}
              placeholder="Opcional"
            />
          </label>
          <div className="report-chart-options" aria-label="Gráficos disponíveis para o relatório">
            {REPORT_CHART_OPTIONS.map((option) => {
              const included = orderedReportCharts.some((configuration) =>
                reportChartMatchesScope(configuration, option.type),
              );
              return (
                <label key={option.type} className="report-chart-option">
                  <input
                    type="checkbox"
                    checked={included}
                    onChange={(event) => void toggleReportChart(option.type, option.label, event.target.checked)}
                  />
                  <span>Incluir no relatório · {option.label}</span>
                </label>
              );
            })}
          </div>
          <p className="report-chart-count" role="status">
            {orderedReportCharts.length} {orderedReportCharts.length === 1 ? 'gráfico selecionado' : 'gráficos selecionados'} para exportação.
          </p>
          {orderedReportCharts.length > 0 ? (
            <ol className="report-chart-list" aria-label="Gráficos selecionados para o relatório">
              {orderedReportCharts.map((configuration, index) => (
                <li key={configuration.id}>
                  <input
                    aria-label={`Título do gráfico ${index + 1}`}
                    defaultValue={configuration.title}
                    onBlur={(event) => void renameReportChart(configuration, event.target.value)}
                  />
                  <small>
                    {REPORT_CHART_OPTIONS.find((option) => option.type === configuration.type)?.label ?? configuration.type}
                    {configuration.filters.teamId ? ` · ${report.teams.find((team) => team.id === configuration.filters.teamId)?.name ?? configuration.filters.teamId}` : ''}
                  </small>
                  <button type="button" onClick={() => void moveReportChart(index, -1)} disabled={index === 0}>↑</button>
                  <button type="button" onClick={() => void moveReportChart(index, 1)} disabled={index === orderedReportCharts.length - 1}>↓</button>
                  {onDeleteReportChartConfiguration && (
                    <button type="button" onClick={() => void removeReportChart(configuration.id)}>Remover</button>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="summary-note">Nenhum gráfico será incluído até você adicionar um.</p>
          )}
        </section>
      )}
      <section className="analysis-section" hidden={activeSection !== 'performance'} aria-labelledby="performance-section-title">
        <div className="analytics-section-heading"><p className="eyebrow">Desempenho</p><h3 id="performance-section-title">Equipe e rotação</h3><p>Percentuais auditáveis do recorte atual.</p></div>
        <div className="visual-analytics-grid">
          <TeamPerformanceChart report={report} />
          <RotationPerformanceChart report={report} teamId={teamId} />
        </div>
      </section>

      <section className="analysis-section" hidden={activeSection !== 'distribution'} aria-labelledby="distribution-section-title">
        <div className="analytics-section-heading"><p className="eyebrow">Distribuição</p><h3 id="distribution-section-title">Levantamento e ataque</h3><p>Distribuições, repetição e equilíbrio preservando os dados observados.</p></div>
        <div className="visual-analytics-grid">
          <SetterDistributionChart report={report} teamId={teamId} />
          <AttackEvennessChart report={report} teamId={teamId} />
          <SetterRepetitionChart report={report} teamId={teamId} />
        </div>
      </section>

      <details className="analysis-adjustments"><summary>Tabelas estatísticas da partida</summary><div id="audit-tables" className="analytics-section-heading">
        <p className="eyebrow">Conferência detalhada</p>
        <h3>Tabelas auditáveis</h3>
        <p>
          Os valores completos e seus numeradores/denominadores permanecem disponíveis para
          conferência.
        </p>
      </div>

      <div className="analytics-table-scroll">
        <table className="analytics-table" aria-label="Box score por atleta">
          <thead>
            <tr>
              <th>Atleta</th>
              <th>ATA TOT</th>
              <th>PTS</th>
              <th>ERR</th>
              <th>BLK</th>
              <th>EF%</th>
              <th>SRV TOT</th>
              <th>ACE</th>
              <th>ERR</th>
              <th>REC TOT</th>
              <th>POS%</th>
              <th>EXC%</th>
              <th>BLK PTS</th>
            </tr>
          </thead>
          <tbody>
            {teamPlayers.map((player) => {
              const attack = report.attack.find((row) => row.playerId === player.id);
              const serve = report.serve.find((row) => row.playerId === player.id);
              const reception = report.reception.find((row) => row.playerId === player.id);
              const block = report.block.find((row) => row.playerId === player.id);
              return (
                <tr key={player.id}>
                  <th scope="row">
                    #{String(player.number).padStart(2, '0')} {player.name}
                  </th>
                  <td>{attack?.volume ?? 0}</td>
                  <td>{attack?.points ?? 0}</td>
                  <td>{attack?.errors ?? 0}</td>
                  <td>{attack?.blocked ?? 0}</td>
                  <td title={attack ? audit(attack.efficiency) : '0/0'}>
                    {percentage(attack?.efficiency.value ?? null)}
                  </td>
                  <td>{serve?.volume ?? 0}</td>
                  <td>{serve?.aces ?? 0}</td>
                  <td>{serve?.errors ?? 0}</td>
                  <td>{reception?.volume ?? 0}</td>
                  <td title={reception ? audit(reception.positiveRate) : '0/0'}>
                    {percentage(reception?.positiveRate.value ?? null)}
                  </td>
                  <td title={reception ? audit(reception.excellentRate) : '0/0'}>
                    {percentage(reception?.excellentRate.value ?? null)}
                  </td>
                  <td>{block?.points ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="analytics-table-scroll">
        <table className="analytics-table" aria-label="Estatísticas por rotação">
          <thead>
            <tr>
              <th>Rotação</th>
              <th>Sideout</th>
              <th>Breakpoint</th>
              <th>Atq Ef.</th>
              <th>Rec+</th>
              <th>Ace</th>
              <th>Erro</th>
            </tr>
          </thead>
          <tbody>
            {report.rotations
              .filter((row) => row.teamId === teamId)
              .map((row) => (
                <tr key={row.rotation}>
                  <th scope="row">R{row.rotation}</th>
                  <td title={audit(row.sideout)}>{percentage(row.sideout.value)}</td>
                  <td title={audit(row.breakpoint)}>{percentage(row.breakpoint.value)}</td>
                  <td title={audit(row.attackEfficiency)}>
                    {percentage(row.attackEfficiency.value)}
                  </td>
                  <td title={audit(row.receptionPositive)}>
                    {percentage(row.receptionPositive.value)}
                  </td>
                  <td>{row.aces}</td>
                  <td>{row.errors}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="analytics-drilldown">
        <div className="tactical-filters" aria-label="Filtros de ataque e levantador">
          <label>
            Atacante
            <select value={selectedPlayerId} onChange={(event) => setPlayerId(event.target.value)}>
              {teamPlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  #{String(player.number).padStart(2, '0')} {player.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Levantador
            <select
              value={setterPosition}
              onChange={(event) =>
                setSetterPosition(
                  event.target.value ? (Number(event.target.value) as CourtRotationPosition) : '',
                )
              }
            >
              <option value="">P1–P6</option>
              {[1, 2, 3, 4, 5, 6].map((position) => (
                <option key={position} value={position}>
                  P{position}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="analytics-table-scroll">
          <table className="analytics-table" aria-label="Direcionamento por atacante e levantador">
            <thead>
              <tr>
                <th>Levantador</th>
                <th>Origem</th>
                <th>Destino</th>
                <th>Direção</th>
                <th>Volume</th>
                <th>Eficiência</th>
                <th>Distribuição</th>
              </tr>
            </thead>
            <tbody>
              {directions.map((row, index) => {
                const distribution = distributions.find(
                  (item) =>
                    item.setterPosition === row.setterPosition &&
                    item.attackZone === row.originZone &&
                    item.attackCombination === row.attackCombination,
                );
                return (
                  <tr
                    key={`${row.setterPosition}-${row.originZone}-${row.targetZone}-${row.direction}-${index}`}
                  >
                    <td>P{row.setterPosition}</td>
                    <td>{row.originZone ? `Z${row.originZone}` : '—'}</td>
                    <td>{row.targetZone ? `Z${row.targetZone}` : '—'}</td>
                    <td>{row.direction ?? '—'}</td>
                    <td>{row.volume}</td>
                    <td title={audit(row.efficiency)}>{percentage(row.efficiency.value)}</td>
                    <td title={distribution ? audit(distribution.share) : '0/0'}>
                      {percentage(distribution?.share.value ?? null)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {directions.length === 0 && (
          <p className="tactical-empty">Ainda não há ataques com contexto neste recorte.</p>
        )}
      </div>
      </details>
    </section>
  );
}

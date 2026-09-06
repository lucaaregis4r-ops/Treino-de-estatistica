import { useState } from 'react';
import type { MatchReportModel } from '../../../application/reporting/MatchReportModel';
import type { CourtRotationPosition } from '../../../domain/match/lineup/SetLineup';
import { AttackEvennessChart } from './charts/AttackEvennessChart';
import { RotationPerformanceChart } from './charts/RotationPerformanceChart';
import { SetterDistributionChart } from './charts/SetterDistributionChart';
import { SetterRepetitionChart } from './charts/SetterRepetitionChart';
import { TeamPerformanceChart } from './charts/TeamPerformanceChart';
import { SpatialAnalyticsPanel } from './SpatialAnalyticsPanel';

interface MatchAnalyticsPanelProps {
  readonly report: MatchReportModel;
}

function percentage(value: number | null): string {
  return value === null
    ? '—'
    : `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function audit(metric: { readonly numerator: number; readonly denominator: number }): string {
  return `${metric.numerator}/${metric.denominator}`;
}

export function MatchAnalyticsPanel({ report }: MatchAnalyticsPanelProps) {
  const winProbability = report.winProbability ?? { teamA: .5, teamB: .5, setTeamA: .5, setTeamB: .5, points: [] };
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
      <section className="win-probability-card" aria-labelledby="win-probability-title">
        <div className="win-probability-heading"><div><p className="eyebrow">Estimativa por estado do jogo</p><h3 id="win-probability-title">Probabilidade de vitória</h3></div><strong>{winProbability.teamA.toLocaleString('pt-BR',{style:'percent',maximumFractionDigits:1})} × {winProbability.teamB.toLocaleString('pt-BR',{style:'percent',maximumFractionDigits:1})}</strong></div>
        <svg className="win-probability-chart" viewBox="0 0 600 180" role="img" aria-label="Gráfico de probabilidade de vitória"><line className="probability-midline" x1="0" y1="90" x2="600" y2="90" /><polyline className="probability-line-a" points={winProbability.points.map((point,index)=>`${winProbability.points.length < 2 ? 0 : index*600/(winProbability.points.length-1)},${180-point.teamA*180}`).join(' ')} /><polyline className="probability-line-b" points={winProbability.points.map((point,index)=>`${winProbability.points.length < 2 ? 0 : index*600/(winProbability.points.length-1)},${180-point.teamB*180}`).join(' ')} />{winProbability.points.map((point,index)=><circle key={point.sequence} className={point.actionImpact && point.actionImpact >= 0 ? 'probability-point-a' : 'probability-point-b'} cx={winProbability.points.length < 2 ? 0 : index*600/(winProbability.points.length-1)} cy={180-point.teamA*180} r="2"><title>Ponto {point.sequence} · {point.scoreTeamA}–{point.scoreTeamB} · impacto {(point.actionImpact ?? 0).toLocaleString('pt-BR',{style:'percent',maximumFractionDigits:1})}</title></circle>)}</svg>
        <div className="probability-legend"><span><i className="probability-dot-a" />{report.teams[0]?.name}</span><span><i className="probability-dot-b" />{report.teams[1]?.name}</span><small>Estimativa baseada no placar atual; calibrar com histórico para uso preditivo.</small></div>
        <div className="probability-impacts"><strong>Maiores variações</strong>{winProbability.points.slice().sort((a,b)=>Math.abs(b.actionImpact ?? 0)-Math.abs(a.actionImpact ?? 0)).slice(0,3).map(point=><span key={point.sequence}>Ponto {point.sequence} · {point.actionSkill ?? 'ação'}: {(point.actionImpact ?? 0).toLocaleString('pt-BR',{style:'percent',signDisplay:'always',maximumFractionDigits:1})}</span>)}</div>
      </section>

      <SpatialAnalyticsPanel key={teamId} report={report} teamId={teamId} />
      <details className="analysis-adjustments"><summary>Indicadores de desempenho</summary><div className="visual-analytics-grid">
        <TeamPerformanceChart report={report} />
        <RotationPerformanceChart report={report} teamId={teamId} />
        <SetterDistributionChart report={report} teamId={teamId} />
        <AttackEvennessChart report={report} teamId={teamId} />
        <SetterRepetitionChart report={report} teamId={teamId} />
      </div></details>

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

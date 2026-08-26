import { useState } from 'react';
import type { MatchReportModel } from '../../../application/reporting/MatchReportModel';
import type { CourtRotationPosition } from '../../../domain/match/lineup/SetLineup';

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
    <section className="match-analytics" aria-labelledby="match-analytics-title">
      <div className="tactical-analytics-heading">
        <div>
          <p className="eyebrow">Analytics auditável</p>
          <h2 id="match-analytics-title">Atletas, rotações e levantador</h2>
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
    </section>
  );
}

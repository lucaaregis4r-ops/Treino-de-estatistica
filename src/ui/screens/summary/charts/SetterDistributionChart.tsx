import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MatchReportModel } from '../../../../application/reporting/MatchReportModel';
import { AnalyticsTooltip } from './AnalyticsTooltip';

interface SetterDistributionChartProps {
  readonly report: MatchReportModel;
  readonly teamId: string;
}
const COLORS = ['#e3ff4f', '#50ddcf', '#ffb45e', '#a98bff', '#ff7d6e', '#72a7ff'];

export function SetterDistributionChart({ report, teamId }: SetterDistributionChartProps) {
  const [setterId, setSetterId] = useState('');
  const [reception, setReception] = useState('');
  const [setNumber, setSetNumber] = useState('');
  const [phase, setPhase] = useState('');
  const source = report.tactical.attackDirections.filter((row) => row.teamId === teamId);
  const unique = (values: readonly (string | number | undefined)[]) => [
    ...new Set(values.filter((value): value is string | number => value !== undefined)),
  ];
  const setters = unique(source.map((row) => row.setterPlayerId));
  const receptions = unique(source.map((row) => row.receptionGrade));
  const sets = unique(source.map((row) => row.setNumber)).sort();
  const phases = unique(source.map((row) => row.phase));
  const filtered = source.filter(
    (row) =>
      (!setterId || row.setterPlayerId === setterId) &&
      (!reception || row.receptionGrade === reception) &&
      (!setNumber || row.setNumber === Number(setNumber)) &&
      (!phase || row.phase === phase),
  );
  const attackerIds = unique(filtered.map((row) => row.playerId)).map(String);
  const data = [1, 2, 3, 4, 5, 6].map((position) => {
    const rows = filtered.filter((row) => row.setterPosition === position);
    return {
      position: `P${position}`,
      ...Object.fromEntries(
        attackerIds.map((attackerId) => [
          attackerId,
          rows
            .filter((row) => row.playerId === attackerId)
            .reduce((sum, row) => sum + row.volume, 0),
        ]),
      ),
    };
  });
  const playerName = (id: string) => report.players.find((player) => player.id === id)?.name ?? id;
  const volumes = attackerIds
    .map((id) => ({
      id,
      volume: filtered
        .filter((row) => row.playerId === id)
        .reduce((sum, row) => sum + row.volume, 0),
    }))
    .sort((a, b) => b.volume - a.volume);
  const total = volumes.reduce((sum, item) => sum + item.volume, 0);

  return (
    <article
      className="analytics-chart-card analytics-chart-card--wide"
      aria-labelledby="setter-distribution-title"
    >
      <p className="eyebrow">Levantador</p>
      <h3 id="setter-distribution-title">Distribuição ofensiva por P1–P6</h3>
      <div className="analytics-chart-filters" aria-label="Filtros da distribuição do levantador">
        <label>
          Levantador
          <select value={setterId} onChange={(event) => setSetterId(event.target.value)}>
            <option value="">Todos</option>
            {setters.map((id) => (
              <option key={id} value={id}>
                {playerName(String(id))}
              </option>
            ))}
          </select>
        </label>
        <label>
          Recepção
          <select value={reception} onChange={(event) => setReception(event.target.value)}>
            <option value="">Todas</option>
            {receptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Set
          <select value={setNumber} onChange={(event) => setSetNumber(event.target.value)}>
            <option value="">Todos</option>
            {sets.map((value) => (
              <option key={value} value={value}>
                Set {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fase
          <select value={phase} onChange={(event) => setPhase(event.target.value)}>
            <option value="">Todas</option>
            {phases.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="chart-summary">
        {volumes[0] && total
          ? `Maior concentração: ${playerName(volumes[0].id)}, ${volumes[0].volume} de ${total} ataques (${Math.round((volumes[0].volume / total) * 100)}%).`
          : 'Nenhum ataque encontrado neste recorte.'}
      </p>
      <div
        className="analytics-chart"
        role="img"
        aria-label="Barras empilhadas da distribuição ofensiva por posição do levantador"
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={280}>
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" stroke="#263832" />
            <XAxis dataKey="position" stroke="#879992" />
            <YAxis allowDecimals={false} stroke="#879992" />
            <Tooltip content={<AnalyticsTooltip valueKind="count" />} />
            <Legend />
            {attackerIds.map((id, index) => (
              <Bar
                key={id}
                dataKey={id}
                stackId="volume"
                name={playerName(id)}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="analytics-table-scroll analytics-chart-table">
        <table className="analytics-table" aria-label="Dados auditáveis da distribuição ofensiva">
          <thead>
            <tr>
              <th>Atacante</th>
              <th>Volume</th>
              <th>Participação</th>
            </tr>
          </thead>
          <tbody>
            {volumes.map((item) => (
              <tr key={item.id}>
                <th scope="row">{playerName(item.id)}</th>
                <td>{item.volume}</td>
                <td>
                  {total
                    ? `${((item.volume / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% (${item.volume}/${total})`
                    : 'N/D'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

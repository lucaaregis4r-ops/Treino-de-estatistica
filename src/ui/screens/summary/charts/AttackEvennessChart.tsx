import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MatchReportModel } from '../../../../application/reporting/MatchReportModel';
import { AnalyticsTooltip } from './AnalyticsTooltip';
import { formatAudit, formatPercent } from './chartFormatters';

interface AttackEvennessChartProps {
  readonly report: MatchReportModel;
  readonly teamId: string;
}

export function AttackEvennessChart({ report, teamId }: AttackEvennessChartProps) {
  const rows = report.advanced.attackEvenness.filter(
    (row) => row.teamId === teamId && row.setterPosition,
  );
  const data = rows.map((row) => ({
    position: `P${row.setterPosition}`,
    evenness: row.evenness.value,
    evennessNumerator: row.evenness.numerator,
    evennessDenominator: row.evenness.denominator,
  }));
  const available = rows
    .filter((row) => row.evenness.available && row.evenness.value !== null)
    .sort((a, b) => (b.evenness.value ?? -1) - (a.evenness.value ?? -1));
  const best = available[0];
  const worst = available[available.length - 1];
  const playerName = (id: string) => report.players.find((player) => player.id === id)?.name ?? id;

  return (
    <article className="analytics-chart-card" aria-labelledby="attack-evenness-title">
      <p className="eyebrow">Concentração ofensiva</p>
      <h3 id="attack-evenness-title">Uniformidade do ataque</h3>
      <p className="chart-summary">
        {best && worst
          ? `Mais uniforme em P${best.setterPosition} (${formatPercent(best.evenness.value)}); menos uniforme em P${worst.setterPosition} (${formatPercent(worst.evenness.value)}).`
          : 'A métrica exige uma referência ofensiva compatível com os atacantes.'}
      </p>
      <div
        className="analytics-chart analytics-chart--compact"
        role="img"
        aria-label="Uniformidade ofensiva por posição do levantador"
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={240}>
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" stroke="#263832" />
            <XAxis dataKey="position" stroke="#879992" />
            <YAxis
              domain={[0, 1]}
              tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
              stroke="#879992"
            />
            <Tooltip content={<AnalyticsTooltip />} />
            <Bar dataKey="evenness" name="Uniformidade" fill="#ffb45e" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="analytics-table-scroll analytics-chart-table">
        <table className="analytics-table" aria-label="Dados auditáveis da uniformidade ofensiva">
          <thead>
            <tr>
              <th>Posição</th>
              <th>Índice</th>
              <th>Volume</th>
              <th>Observado → referência</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.setterPosition}>
                <th scope="row">P{row.setterPosition}</th>
                <td>
                  {formatPercent(row.evenness.value)}{' '}
                  <small>{formatAudit(row.evenness.numerator, row.evenness.denominator)}</small>
                </td>
                <td>{row.evenness.denominator}</td>
                <td>
                  {row.distribution.length
                    ? row.distribution
                        .map(
                          (item) =>
                            `${playerName(item.playerId)} ${formatPercent(item.observedShare)}→${formatPercent(item.expectedShare)}`,
                        )
                        .join('; ')
                    : 'Referência insuficiente'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

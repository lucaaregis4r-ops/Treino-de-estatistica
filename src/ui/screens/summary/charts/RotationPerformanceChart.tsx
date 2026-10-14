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
import { formatAudit, formatPercent } from './chartFormatters';

interface RotationPerformanceChartProps {
  readonly report: MatchReportModel;
  readonly teamId: string;
}

const SERIES = [
  { key: 'sideout', label: 'Sideout', color: '#e3ff4f' },
  { key: 'breakpoint', label: 'Breakpoint', color: '#50ddcf' },
  { key: 'attackEfficiency', label: 'Eficiência de ataque', color: '#ffb45e' },
  { key: 'receptionPositive', label: 'Recepção positiva', color: '#a98bff' },
] as const;

export function RotationPerformanceChart({ report, teamId }: RotationPerformanceChartProps) {
  const rotations = report.rotations.filter((row) => row.teamId === teamId);
  const data = rotations.map((row) => ({
    rotation: `P${row.rotation}`,
    ...Object.fromEntries(
      SERIES.flatMap(({ key }) => [
        [key, row[key].value],
        [`${key}Numerator`, row[key].numerator],
        [`${key}Denominator`, row[key].denominator],
      ]),
    ),
  }));
  const comparable = rotations.filter((row) => row.sideout.value !== null);
  const best = comparable.reduce<(typeof rotations)[number] | undefined>(
    (current, row) =>
      !current || (row.sideout.value ?? -1) > (current.sideout.value ?? -1) ? row : current,
    undefined,
  );
  const worst = comparable.reduce<(typeof rotations)[number] | undefined>(
    (current, row) =>
      !current || (row.sideout.value ?? 2) < (current.sideout.value ?? 2) ? row : current,
    undefined,
  );

  return (
    <article
      className="analytics-chart-card analytics-chart-card--wide"
      aria-labelledby="rotation-chart-title"
    >
      <div className="analytics-chart-heading">
        <div>
          <p className="eyebrow">Rotação</p>
          <h3 id="rotation-chart-title">Desempenho por P1–P6</h3>
        </div>
      </div>
      <p className="chart-summary">
        {best && worst
          ? `Melhor sideout: P${best.rotation} (${formatPercent(best.sideout.value)}). Menor sideout: P${worst.rotation} (${formatPercent(worst.sideout.value)}).`
          : 'Ainda não há amostra suficiente para comparar as rotações.'}
      </p>
      <div
        className="analytics-chart"
        role="img"
        aria-label="Gráfico de barras do desempenho por rotação"
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={280}>
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" stroke="#263832" />
            <XAxis dataKey="rotation" stroke="#879992" />
            <YAxis
              tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
              stroke="#879992"
              domain={[-1, 1]}
            />
            <Tooltip content={<AnalyticsTooltip />} />
            <Legend />
            {SERIES.map((series) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                name={series.label}
                fill={series.color}
                radius={[3, 3, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="analytics-table-scroll analytics-chart-table">
        <table className="analytics-table" aria-label="Dados auditáveis do desempenho por rotação">
          <thead>
            <tr>
              <th>Rotação</th>
              {SERIES.map((series) => (
                <th key={series.key}>{series.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rotations.map((row) => (
              <tr key={row.rotation}>
                <th scope="row">P{row.rotation}</th>
                {SERIES.map(({ key }) => (
                  <td key={key}>
                    {formatPercent(row[key].value)}{' '}
                    <small>{formatAudit(row[key].numerator, row[key].denominator)}</small>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

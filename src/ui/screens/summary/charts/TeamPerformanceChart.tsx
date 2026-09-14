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

interface TeamPerformanceChartProps {
  readonly report: MatchReportModel;
}

const METRICS = [
  ['attackEfficiency', 'Ataque'],
  ['serveEfficiency', 'Saque'],
  ['receptionPositive', 'Recepção+'],
  ['sideout', 'Sideout'],
  ['breakpoint', 'Breakpoint'],
] as const;
const COLORS = ['#e3ff4f', '#50ddcf', '#ffb45e', '#a98bff'];

export function TeamPerformanceChart({ report }: TeamPerformanceChartProps) {
  const data = METRICS.map(([key, label]) => ({
    metric: label,
    ...Object.fromEntries(
      report.teamSummary.flatMap((row) => {
        const metric = row[key];
        return [
          [row.teamId, metric.value],
          [`${row.teamId}Numerator`, metric.numerator],
          [`${row.teamId}Denominator`, metric.denominator],
        ];
      }),
    ),
  }));
  const leaders = report.teamSummary
    .filter((row) => row.attackEfficiency.value !== null)
    .sort((a, b) => (b.attackEfficiency.value ?? -1) - (a.attackEfficiency.value ?? -1));
  const leader = leaders[0];
  const teamName = (id: string) => report.teams.find((team) => team.id === id)?.name ?? id;

  return (
    <article
      className="analytics-chart-card analytics-chart-card--wide"
      aria-labelledby="team-chart-title"
    >
      <p className="eyebrow">Visão geral</p>
      <h3 id="team-chart-title">Performance das equipes</h3>
      <p className="chart-summary">
        {leader
          ? `${teamName(leader.teamId)} lidera a eficiência de ataque com ${formatPercent(leader.attackEfficiency.value)}.`
          : 'Ainda não há amostra suficiente para uma comparação geral.'}
      </p>
      <div
        className="analytics-chart"
        role="img"
        aria-label="Gráfico comparativo da performance das equipes"
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={280}>
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" stroke="#263832" />
            <XAxis dataKey="metric" stroke="#879992" />
            <YAxis
              tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
              stroke="#879992"
              domain={[-1, 1]}
            />
            <Tooltip content={<AnalyticsTooltip />} />
            <Legend />
            {report.teams.map((team, index) => (
              <Bar
                key={team.id}
                dataKey={team.id}
                name={team.name}
                fill={COLORS[index % COLORS.length]}
                radius={[3, 3, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="analytics-table-scroll analytics-chart-table">
        <table className="analytics-table" aria-label="Dados auditáveis da performance das equipes">
          <thead>
            <tr>
              <th>Equipe</th>
              <th>Ações identificadas</th>
              <th>Sem atleta identificado</th>
              {METRICS.map(([, label]) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.teamSummary.map((row) => (
              <tr key={row.teamId}>
                <th scope="row">{teamName(row.teamId)}</th>
                <td>{row.identifiedActions ?? '—'}</td>
                <td>{row.unidentifiedActions ?? '—'}</td>
                {METRICS.map(([key]) => (
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

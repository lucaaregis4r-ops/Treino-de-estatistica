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
import type {
  MatchReportModel,
  SetterRepeatCategory,
} from '../../../../application/reporting/MatchReportModel';
import { AnalyticsTooltip } from './AnalyticsTooltip';
import { formatAudit, formatPercent } from './chartFormatters';

interface SetterRepetitionChartProps {
  readonly report: MatchReportModel;
  readonly teamId: string;
}
const CATEGORIES: readonly { key: SetterRepeatCategory; label: string; color: string }[] = [
  { key: 'overall', label: 'Geral', color: '#e3ff4f' },
  { key: 'after_point', label: 'Após ponto', color: '#50ddcf' },
  { key: 'after_error', label: 'Após erro', color: '#ff7d6e' },
  { key: 'after_blocked', label: 'Após bloqueio', color: '#a98bff' },
];

export function SetterRepetitionChart({ report, teamId }: SetterRepetitionChartProps) {
  const rows = report.advanced.setterRepetition.filter(
    (row) => row.teamId === teamId && CATEGORIES.some((category) => category.key === row.category),
  );
  const attackerIds = [...new Set(rows.map((row) => row.attackerPlayerId))];
  const playerName = (id: string) => report.players.find((player) => player.id === id)?.name ?? id;
  const data = attackerIds.map((id) => ({
    attacker: playerName(id),
    ...Object.fromEntries(
      CATEGORIES.flatMap(({ key }) => {
        const row = rows.find((item) => item.attackerPlayerId === id && item.category === key);
        return [
          [key, row?.repeatRate.value ?? null],
          [`${key}Numerator`, row?.repeats ?? 0],
          [`${key}Denominator`, row?.opportunities ?? 0],
        ];
      }),
    ),
  }));
  const general = rows
    .filter((row) => row.category === 'overall' && row.repeatRate.value !== null)
    .sort((a, b) => (b.repeatRate.value ?? -1) - (a.repeatRate.value ?? -1))[0];

  return (
    <article className="analytics-chart-card" aria-labelledby="setter-repetition-title">
      <p className="eyebrow">Padrão do levantador</p>
      <h3 id="setter-repetition-title">Repetição por atacante</h3>
      <p className="chart-summary">
        {general
          ? `Maior repetição geral: ${playerName(general.attackerPlayerId)}, ${formatPercent(general.repeatRate.value)} em ${general.opportunities} oportunidades.`
          : 'Ainda não há sequências suficientes para medir repetição.'}
      </p>
      <div
        className="analytics-chart analytics-chart--compact"
        role="img"
        aria-label="Taxa de repetição do levantador por atacante e contexto"
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={240}>
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" stroke="#263832" />
            <XAxis dataKey="attacker" stroke="#879992" />
            <YAxis
              domain={[0, 1]}
              tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
              stroke="#879992"
            />
            <Tooltip content={<AnalyticsTooltip />} />
            <Legend />
            {CATEGORIES.map((category) => (
              <Bar
                key={category.key}
                dataKey={category.key}
                name={category.label}
                fill={category.color}
                radius={[3, 3, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="analytics-table-scroll analytics-chart-table">
        <table className="analytics-table" aria-label="Dados auditáveis da repetição do levantador">
          <thead>
            <tr>
              <th>Atacante</th>
              <th>Contexto</th>
              <th>Taxa</th>
              <th>Oportunidades</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.setterPlayerId}-${row.attackerPlayerId}-${row.category}`}>
                <th scope="row">{playerName(row.attackerPlayerId)}</th>
                <td>{CATEGORIES.find((category) => category.key === row.category)?.label}</td>
                <td>
                  {formatPercent(row.repeatRate.value)}{' '}
                  <small>{formatAudit(row.repeats, row.opportunities)}</small>
                </td>
                <td>{row.opportunities}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

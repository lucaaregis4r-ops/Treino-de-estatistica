interface TooltipPayloadItem {
  readonly name?: string;
  readonly dataKey?: string | number;
  readonly value?: number | string;
  readonly color?: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}

interface AnalyticsTooltipProps {
  readonly active?: boolean;
  readonly label?: string | number;
  readonly payload?: readonly TooltipPayloadItem[];
  readonly valueKind?: 'percent' | 'count';
}

import { formatAudit, formatPercent } from './chartFormatters';

export function AnalyticsTooltip({
  active,
  label,
  payload = [],
  valueKind = 'percent',
}: AnalyticsTooltipProps) {
  if (!active || payload.length === 0) return null;

  return (
    <div className="analytics-tooltip" role="status" aria-live="polite">
      <strong>{label}</strong>
      {payload.map((item, index) => {
        const rawValue = typeof item.value === 'number' ? item.value : null;
        const source = item.payload;
        const dataKey = String(item.dataKey ?? '');
        const numerator = source?.[`${dataKey}Numerator`];
        const denominator = source?.[`${dataKey}Denominator`];
        return (
          <span key={`${item.name ?? 'série'}-${index}`} style={{ color: item.color }}>
            {item.name}: {valueKind === 'percent' ? formatPercent(rawValue) : (rawValue ?? 'N/D')}
            {typeof numerator === 'number' && typeof denominator === 'number'
              ? ` (${formatAudit(numerator, denominator)})`
              : ''}
          </span>
        );
      })}
    </div>
  );
}

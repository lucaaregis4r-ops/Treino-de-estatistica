export function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined
    ? 'N/D'
    : `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

export function formatAudit(numerator: number, denominator: number): string {
  return `${numerator}/${denominator}`;
}

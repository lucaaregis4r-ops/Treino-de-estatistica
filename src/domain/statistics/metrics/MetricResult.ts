export interface MetricBreakdownItem {
  readonly key: string;
  readonly label: string;
  readonly value: number | null;
  readonly numerator: number;
  readonly denominator: number;
  readonly components?: Readonly<Record<string, number>>;
}

export interface MetricResult {
  readonly metricId: string;
  readonly value: number | null;
  readonly numerator?: number;
  readonly denominator?: number;
  readonly components?: Readonly<Record<string, number>>;
  readonly breakdown?: readonly MetricBreakdownItem[];
  readonly available: boolean;
  readonly reasonUnavailable?: string;
}

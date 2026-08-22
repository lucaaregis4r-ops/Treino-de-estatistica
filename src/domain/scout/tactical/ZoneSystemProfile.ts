export interface ZoneDefinition {
  readonly id: string;
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly x?: number;
  readonly y?: number;
}

export interface ZoneDirectionRule {
  readonly id: string;
  readonly originZoneIds?: readonly string[];
  readonly targetZoneIds: readonly string[];
}

export interface ZoneSystemProfile {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly zones: readonly ZoneDefinition[];
  readonly directionRules?: readonly ZoneDirectionRule[];
}

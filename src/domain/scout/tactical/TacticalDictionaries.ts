export interface SetterCallDefinition {
  readonly id: string;
  readonly label: string;
  readonly aliases?: readonly string[];
  readonly targetZoneId?: string;
}

export interface SetterCallDictionary {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly entries: readonly SetterCallDefinition[];
}

export interface AttackCombinationDefinition {
  readonly id: string;
  readonly label: string;
  readonly aliases?: readonly string[];
  readonly tempo?: string;
  readonly targetZoneId?: string;
}

export interface AttackCombinationDictionary {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly entries: readonly AttackCombinationDefinition[];
}

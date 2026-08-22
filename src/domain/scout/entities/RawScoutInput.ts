export interface RawScoutInput {
  readonly rawCode: string;
}

export interface NormalizedScoutInput extends RawScoutInput {
  readonly normalizedCode: string;
}

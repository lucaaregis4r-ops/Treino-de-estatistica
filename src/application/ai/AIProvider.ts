import type { TacticalExplanationPayload } from './TacticalExplanationPayload';

export interface AIProvider {
  explain(payload: TacticalExplanationPayload, options?: { readonly signal?: AbortSignal }): Promise<unknown>;
}

export type TacticalExplanation = {
  readonly summary: string;
  readonly observations: readonly {
    readonly findingId: string;
    readonly explanation: string;
  }[];
  readonly cautions: readonly string[];
};

export type TacticalExplanationResult =
  | { readonly status: 'available'; readonly payload: TacticalExplanationPayload; readonly explanation: TacticalExplanation }
  | { readonly status: 'unavailable'; readonly payload: TacticalExplanationPayload; readonly reason: 'missing_api_key' | 'timeout' | 'cancelled' | 'unauthorized' | 'forbidden' | 'invalid_response' | 'provider_error' };

export class AIProviderError extends Error {
  constructor(
    readonly code: 'unauthorized' | 'forbidden' | 'invalid_response' | 'provider_error',
    message: string,
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

import { AIProviderError, type AIProvider } from '../../../application/ai/AIProvider';
import type { TacticalExplanationPayload } from '../../../application/ai/TacticalExplanationPayload';

export interface GeminiProviderOptions {
  readonly apiKey: string;
  readonly model?: string;
  readonly endpoint?: string;
}

function responseText(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }> };
  const text = candidate.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === 'string' ? text : null;
}

function parseJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(cleaned) as unknown; } catch { throw new AIProviderError('invalid_response', 'Gemini returned invalid structured JSON'); }
}

/** BYOK adapter. The key is retained only in this instance memory and is never serialized or logged. */
export class GeminiProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly endpoint: string;

  constructor(options: GeminiProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? 'gemini-2.0-flash';
    this.endpoint = options.endpoint ?? `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
  }

  async explain(payload: TacticalExplanationPayload, options: { readonly signal?: AbortSignal } = {}): Promise<unknown> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': this.apiKey },
      signal: options.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Interpret the following local analytics DTO. Return JSON with summary, observations[{findingId,explanation}], and cautions. Do not infer causality.\n' + JSON.stringify(payload) }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });
    if (!response.ok) {
      if (response.status === 401) throw new AIProviderError('unauthorized', 'Gemini authentication failed');
      if (response.status === 403) throw new AIProviderError('forbidden', 'Gemini access was forbidden');
      throw new AIProviderError('provider_error', `Gemini request failed with status ${response.status}`);
    }
    const text = responseText(await response.json() as unknown);
    if (!text) throw new AIProviderError('invalid_response', 'Gemini response had no structured text');
    return parseJson(text);
  }
}

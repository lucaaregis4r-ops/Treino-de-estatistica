import type { TacticalQuestionAnswer } from '../analytics/TacticalQuestionService';
import { AIProviderError, type AIProvider, type TacticalExplanation, type TacticalExplanationResult } from './AIProvider';
import { buildTacticalExplanationPayload } from './TacticalExplanationPayload';

function validExplanation(value: unknown, findingIds: ReadonlySet<string>): value is TacticalExplanation {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.summary !== 'string' || !Array.isArray(candidate.observations) || !Array.isArray(candidate.cautions)) return false;
  if (!candidate.observations.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const observation = item as Record<string, unknown>;
    return typeof observation.findingId === 'string' && findingIds.has(observation.findingId) && typeof observation.explanation === 'string';
  })) return false;
  return candidate.cautions.every((item) => typeof item === 'string');
}

export class TacticalExplanationService {
  constructor(private readonly provider?: AIProvider, private readonly timeoutMs = 10_000) {}

  async explain(answer: TacticalQuestionAnswer, signal?: AbortSignal): Promise<TacticalExplanationResult> {
    const payload = buildTacticalExplanationPayload(answer);
    if (!this.provider) return { status: 'unavailable', payload, reason: 'missing_api_key' };

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, this.timeoutMs);
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    try {
      const raw = await this.provider.explain(payload, { signal: controller.signal });
      if (!validExplanation(raw, new Set(payload.findings.map((finding) => finding.findingId)))) {
        return { status: 'unavailable', payload, reason: 'invalid_response' };
      }
      return { status: 'available', payload, explanation: raw };
    } catch (error) {
      if (timedOut) return { status: 'unavailable', payload, reason: 'timeout' };
      if (signal?.aborted) return { status: 'unavailable', payload, reason: 'cancelled' };
      const code = error instanceof AIProviderError
        ? error.code
        : 'provider_error';
      return { status: 'unavailable', payload, reason: code };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }
}

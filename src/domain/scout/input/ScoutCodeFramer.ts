import type { CodeProfile, ScoutField } from '../../../profiles/types';
import { Normalizer } from '../normalizer/Normalizer';
import { isCommitReady, type InputCandidateState } from './InputCandidateState';
import { tokenizeInlineTactical } from './InlineTacticalTokenizer';

export interface FramedScoutInput {
  readonly committedCodes: readonly string[];
  readonly remainingBuffer: string;
  readonly state: InputCandidateState;
}

export interface DecodedInlineScoutInput {
  readonly coreCode: string;
  readonly tacticalTokens: readonly string[];
}

function playerNumbers(): readonly string[] {
  return Array.from({ length: 99 }, (_, index) => String(index + 1).padStart(2, '0'));
}

export class ScoutCodeFramer {
  private readonly languageCache = new WeakMap<CodeProfile, readonly string[]>();

  constructor(private readonly normalizer = new Normalizer()) {}

  inspect(rawBuffer: string, profile: CodeProfile): InputCandidateState {
    const normalized = this.normalizer.normalize({ rawCode: rawBuffer }, profile).normalizedCode;
    if (!normalized) return 'empty';

    const language = this.language(profile);
    const exact = language.includes(normalized);
    const extendable = language.some(
      (candidate) => candidate !== normalized && candidate.startsWith(normalized),
    );

    if (exact && (extendable || profile.tacticalInput)) return 'core_complete';
    if (exact) return 'complete';
    const coreCode = this.corePrefix(normalized, profile);
    if (coreCode) {
      const suffix = normalized.slice(coreCode.length);
      const tokenized = tokenizeInlineTactical(suffix, profile);
      if (tokenized.state === 'complete') return 'complete';
      if (tokenized.state === 'prefix') return 'enriching';
    }
    if (extendable) return 'prefix';
    return 'invalid';
  }

  decode(raw: string, profile: CodeProfile): DecodedInlineScoutInput | undefined {
    const normalized = this.normalizer.normalize({ rawCode: raw }, profile).normalizedCode;
    return this.decodeInlineNormalized(normalized, profile);
  }

  frame(
    rawBuffer: string,
    profile: CodeProfile,
    commitOnNextEventPrefix: boolean,
  ): FramedScoutInput {
    const committedCodes: string[] = [];
    let remainingBuffer = rawBuffer;

    if (commitOnNextEventPrefix) {
      let boundary = this.nextBoundary(remainingBuffer, profile);
      while (boundary !== undefined) {
        committedCodes.push(remainingBuffer.slice(0, boundary).trim());
        remainingBuffer = remainingBuffer.slice(boundary).trimStart();
        boundary = this.nextBoundary(remainingBuffer, profile);
      }
    }

    return {
      committedCodes,
      remainingBuffer,
      state: this.inspect(remainingBuffer, profile),
    };
  }

  private nextBoundary(rawBuffer: string, profile: CodeProfile): number | undefined {
    if (this.inspect(rawBuffer, profile) !== 'invalid') return undefined;
    for (let index = 1; index < rawBuffer.length; index += 1) {
      const previousState = this.inspect(rawBuffer.slice(0, index), profile);
      if (!isCommitReady(previousState)) continue;
      if (this.canStartEvent(rawBuffer.slice(index), profile)) return index;
    }
    return undefined;
  }

  private canStartEvent(rawBuffer: string, profile: CodeProfile): boolean {
    for (let length = 1; length <= rawBuffer.length; length += 1) {
      const state = this.inspect(rawBuffer.slice(0, length), profile);
      if (state === 'empty') continue;
      return state !== 'invalid';
    }
    return false;
  }

  private decodeInlineNormalized(
    normalized: string,
    profile: CodeProfile,
  ): DecodedInlineScoutInput | undefined {
    const coreCode = this.corePrefix(normalized, profile);
    if (!coreCode) return undefined;
    const suffix = normalized.slice(coreCode.length);
    const tokenized = tokenizeInlineTactical(suffix, profile);
    if (tokenized.state !== 'complete') return undefined;
    return { coreCode, tacticalTokens: tokenized.tokens };
  }

  private corePrefix(normalized: string, profile: CodeProfile): string | undefined {
    return this.language(profile)
      .filter((candidate) => normalized.startsWith(candidate))
      .sort((left, right) => right.length - left.length)[0];
  }

  private language(profile: CodeProfile): readonly string[] {
    const cached = this.languageCache.get(profile);
    if (cached) return cached;
    let candidates: readonly string[] = [''];
    for (const field of profile.grammar) {
      const values = this.valuesFor(field, profile);
      if (values.length === 0) return [];
      candidates = candidates.flatMap((prefix) => values.map((value) => `${prefix}${value}`));
    }
    const language = [...new Set(candidates)];
    this.languageCache.set(profile, language);
    return language;
  }

  private valuesFor(field: ScoutField, profile: CodeProfile): readonly string[] {
    const rawValues =
      field === 'team'
        ? Object.values(profile.teamCodes ?? {})
        : field === 'player'
          ? playerNumbers()
          : field === 'skill'
            ? Object.keys(profile.skills)
            : field === 'evaluation'
              ? Object.keys(profile.evaluations)
              : [];
    return rawValues.map(
      (value) => this.normalizer.normalize({ rawCode: value }, profile).normalizedCode,
    );
  }
}

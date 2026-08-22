import type { CodeProfile } from '../../../profiles/types';
import type { NormalizedScoutInput, RawScoutInput } from '../entities/RawScoutInput';

function replaceConfiguredValues(
  value: string,
  replacements: Readonly<Record<string, string>>,
): string {
  return Object.entries(replacements)
    .sort(([left], [right]) => right.length - left.length)
    .reduce((current, [source, target]) => current.split(source.toUpperCase()).join(target), value);
}

export class Normalizer {
  normalize(input: RawScoutInput, profile: CodeProfile): NormalizedScoutInput {
    const compact = input.rawCode.trim().replace(/\s+/g, '').toUpperCase();
    const equivalent = replaceConfiguredValues(compact, profile.characterEquivalents ?? {});
    const normalizedCode = replaceConfiguredValues(equivalent, profile.aliases ?? {});

    return {
      rawCode: input.rawCode,
      normalizedCode,
    };
  }
}

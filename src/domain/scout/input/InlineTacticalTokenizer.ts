import type { CodeProfile, TacticalInputField } from '../../../profiles/types';

export interface InlineTacticalTokenization {
  readonly state: 'complete' | 'prefix' | 'invalid';
  readonly tokens: readonly string[];
}

function normalizedValues(field: TacticalInputField, profile: CodeProfile): readonly string[] {
  const definition = profile.tacticalInput?.fields[field];
  if (!definition) return [];
  if (field === 'origin' || field === 'target') {
    return profile.tacticalInput?.zoneSystem.zones
      .flatMap((zone) => [zone.id, ...(zone.aliases ?? [])])
      .map((value) => value.toUpperCase())
      .sort((left, right) => right.length - left.length);
  }
  if (field === 'direction') {
    return Object.keys(definition.values ?? {})
      .map((value) => value.toUpperCase())
      .sort((left, right) => right.length - left.length);
  }
  if (field === 'blockers') return ['0', '1', '2', '3'];
  return [];
}

/** Tokenizes the compact tactical suffix used in the continuous scout line (for example YHT5). */
export function tokenizeInlineTactical(
  raw: string,
  profile: CodeProfile,
): InlineTacticalTokenization {
  const tactical = profile.tacticalInput;
  if (!tactical) return { state: raw ? 'invalid' : 'complete', tokens: [] };
  const compact = raw.replace(/\s+/g, '').toUpperCase();
  if (!compact) return { state: 'complete', tokens: [] };
  const definitions = Object.entries(tactical.fields)
    .map(([field, definition]) => ({
      field: field as TacticalInputField,
      prefix: definition.prefix.toUpperCase(),
    }))
    .sort((left, right) => right.prefix.length - left.prefix.length);
  const tokens: string[] = [];
  let cursor = 0;

  while (cursor < compact.length) {
    const definition = definitions.find(({ prefix }) => compact.startsWith(prefix, cursor));
    if (!definition) return { state: 'invalid', tokens };
    const valueStart = cursor + definition.prefix.length;
    if (valueStart >= compact.length) return { state: 'prefix', tokens };
    const remainder = compact.slice(valueStart);
    const configuredValues = normalizedValues(definition.field, profile);
    let value = configuredValues.find((candidate) => remainder.startsWith(candidate));

    if (!value && (definition.field === 'skillType' || definition.field === 'tempo')) {
      value = remainder.slice(0, 1);
    }
    if (!value && (definition.field === 'setterCall' || definition.field === 'combination')) {
      const nextPrefix = definitions
        .flatMap(({ prefix }) => {
          const index = remainder.indexOf(prefix, 1);
          return index > 0 ? [index] : [];
        })
        .sort((left, right) => left - right)[0];
      value = remainder.slice(0, nextPrefix ?? remainder.length);
    }
    if (!value) return { state: 'invalid', tokens };

    tokens.push(`${definition.prefix}${value}`);
    cursor = valueStart + value.length;
  }

  return { state: 'complete', tokens };
}

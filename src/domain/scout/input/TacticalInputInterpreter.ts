import { ParseError } from '../../../core/errors/ParseError';
import { failure, type Result, success } from '../../../core/result/Result';
import type { CodeProfile, TacticalInputField } from '../../../profiles/types';

export interface TacticalQuickValues {
  readonly originZoneId?: string;
  readonly targetZoneId?: string;
  readonly direction?: string;
  readonly skillType?: string;
  readonly setterCall?: string;
  readonly combination?: string;
  readonly tempo?: string;
  readonly blockers?: number;
}

function zoneId(value: string, profile: CodeProfile): string | undefined {
  const normalized = value.toLocaleLowerCase();
  return profile.tacticalInput?.zoneSystem.zones.find(
    (zone) =>
      zone.id.toLocaleLowerCase() === normalized ||
      zone.aliases?.some((alias) => alias.toLocaleLowerCase() === normalized),
  )?.id;
}

export class TacticalInputInterpreter {
  interpret(raw: string, profile: CodeProfile): Result<TacticalQuickValues, ParseError> {
    const tactical = profile.tacticalInput;
    if (!tactical) {
      return failure(
        new ParseError('tactical_input_not_configured', 'Tactical input is not configured.'),
      );
    }
    const tokens = raw.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0)
      return failure(new ParseError('empty_input', 'Tactical command is empty.'));
    const values: Partial<Record<TacticalInputField, string>> = {};
    const orderedFields = Object.entries(tactical.fields).sort(
      ([, left], [, right]) => right.prefix.length - left.prefix.length,
    ) as [TacticalInputField, (typeof tactical.fields)[TacticalInputField]][];

    for (const token of tokens) {
      const match = orderedFields.find(([, definition]) =>
        token.toLocaleLowerCase().startsWith(definition.prefix.toLocaleLowerCase()),
      );
      if (!match)
        return failure(
          new ParseError('unknown_tactical_token', `Unknown tactical token ${token}.`),
        );
      const [field, definition] = match;
      const rawValue = token.slice(definition.prefix.length);
      if (!rawValue)
        return failure(new ParseError('missing_tactical_value', `Missing value for ${field}.`));
      const mapped = definition.values?.[rawValue.toLocaleLowerCase()] ?? rawValue;
      values[field] = mapped;
    }

    const originZoneId = values.origin ? zoneId(values.origin, profile) : undefined;
    const targetZoneId = values.target ? zoneId(values.target, profile) : undefined;
    if (values.origin && !originZoneId)
      return failure(
        new ParseError('unknown_tactical_zone', `Unknown origin zone ${values.origin}.`),
      );
    if (values.target && !targetZoneId)
      return failure(
        new ParseError('unknown_tactical_zone', `Unknown target zone ${values.target}.`),
      );
    const blockers = values.blockers === undefined ? undefined : Number(values.blockers);
    if (blockers !== undefined && (!Number.isInteger(blockers) || blockers < 0 || blockers > 3))
      return failure(new ParseError('invalid_blockers_count', 'Blockers must be between 0 and 3.'));

    return success({
      ...(originZoneId ? { originZoneId } : {}),
      ...(targetZoneId ? { targetZoneId } : {}),
      ...(values.direction ? { direction: values.direction } : {}),
      ...(values.skillType ? { skillType: values.skillType } : {}),
      ...(values.setterCall ? { setterCall: values.setterCall } : {}),
      ...(values.combination ? { combination: values.combination } : {}),
      ...(values.tempo ? { tempo: values.tempo } : {}),
      ...(blockers !== undefined ? { blockers } : {}),
    });
  }
}

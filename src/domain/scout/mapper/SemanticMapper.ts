import { ParseError } from '../../../core/errors/ParseError';
import { failure, type Result, success } from '../../../core/result/Result';
import type { CodeProfile } from '../../../profiles/types';
import type { NormalizedScoutInput } from '../entities/RawScoutInput';
import type { ParsedScoutCode } from '../parser/ParsedScoutCode';
import type { ScoutEventMetadata } from '../events/ScoutEvent';
import type { CanonicalScoutEventCandidate } from './CanonicalScoutEventCandidate';
import { normalizeTacticalMetadata } from '../tactical/TacticalMetadataAdapter';

export class SemanticMapper {
  map(
    parsed: ParsedScoutCode,
    input: NormalizedScoutInput,
    profile: CodeProfile,
    metadata?: ScoutEventMetadata,
  ): Result<CanonicalScoutEventCandidate, ParseError> {
    const skill = profile.skills[parsed.skillCode];
    const evaluation = profile.evaluations[parsed.evaluationCode];

    if (!skill || !evaluation) {
      return failure(
        new ParseError(
          'semantic_mapping_failed',
          'The parsed code has no semantic mapping in the active profile.',
        ),
      );
    }

    const outcome = profile.outcomeMappings?.[skill]?.[parsed.evaluationCode] ?? evaluation;

    return success({
      playerNumber: parsed.playerNumber,
      skill,
      evaluation,
      outcome,
      rawCode: input.rawCode,
      normalizedCode: input.normalizedCode,
      ...(metadata
        ? {
            metadata: normalizeTacticalMetadata(metadata, skill, profile.tacticalInput?.zoneSystem),
          }
        : {}),
    });
  }
}

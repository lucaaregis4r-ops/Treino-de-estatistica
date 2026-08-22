import type { ScoutField } from '../../../profiles/types';
import type { CanonicalScoutEventCandidate } from '../mapper/CanonicalScoutEventCandidate';
import type { ScoutValidationContext } from '../validators/ScoutValidationContext';
import { tacticalValue } from '../tactical/TacticalMetadataAdapter';

export function hasScoutField(
  field: ScoutField,
  candidate: CanonicalScoutEventCandidate,
  context: ScoutValidationContext,
): boolean {
  const values: Partial<Record<ScoutField, unknown>> = {
    team: context.teamId,
    player: candidate.playerNumber,
    skill: candidate.skill,
    evaluation: candidate.evaluation,
    rally: context.rallyId,
    set: context.setNumber,
    skillType: tacticalValue.skillType(candidate.metadata, candidate.skill),
    originZone: tacticalValue.originZone(candidate.metadata, candidate.skill),
    targetZone: tacticalValue.targetZone(candidate.metadata, candidate.skill),
    direction: tacticalValue.direction(candidate.metadata, candidate.skill),
    lineup: candidate.metadata?.lineup ?? context.lineup,
    rotation: tacticalValue.rotation(candidate.metadata),
    setterPosition: tacticalValue.setterPosition(candidate.metadata),
    setterCall: tacticalValue.setterCall(candidate.metadata),
    attackCombination: tacticalValue.attackCombination(candidate.metadata),
    attackTempo: tacticalValue.attackTempo(candidate.metadata),
    blockersCount: tacticalValue.blockersCount(candidate.metadata, candidate.skill),
    phase: tacticalValue.phase(candidate.metadata),
    substitutions: candidate.metadata?.substitution,
    transition: candidate.metadata?.transition,
  };
  const value = values[field];
  return value !== undefined && value !== null && value !== '';
}

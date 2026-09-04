import type { CodeProfile } from '../../../profiles/types';
import type { ScoutEventMetadata } from '../events/ScoutEvent';
import { normalizeTacticalMetadata } from '../tactical/TacticalMetadataAdapter';
import type { TacticalCaptureDraft } from '../tactical/TacticalMetadata';
import type { CanonicalScoutEventCandidate } from './CanonicalScoutEventCandidate';
import type { VisualScoutDraft } from './VisualScoutDraft';

function outcomeFor(draft: VisualScoutDraft, profile: CodeProfile): string {
  const evaluationCode = Object.entries(profile.evaluations).find(
    ([, evaluation]) => evaluation === draft.evaluation,
  )?.[0];
  return (
    (evaluationCode && profile.outcomeMappings?.[draft.skill]?.[evaluationCode]) ?? draft.evaluation
  );
}

function metadataFor(
  draft: VisualScoutDraft,
  profile: CodeProfile,
): ScoutEventMetadata | undefined {
  const captureDraft: TacticalCaptureDraft = {
    ...(draft.skill === 'reception' && draft.contactLocation
      ? { origin: draft.contactLocation }
      : draft.skill === 'block' && draft.contactLocation
        ? { target: draft.contactLocation }
        : {
            ...(draft.origin ? { origin: draft.origin } : {}),
            ...(draft.target ? { target: draft.target } : {}),
          }),
    ...(draft.skillType ? { skillType: draft.skillType } : {}),
    ...(draft.direction ? { direction: draft.direction } : {}),
    ...(draft.receptionGrade ? { receptionGrade: draft.receptionGrade } : {}),
    ...(draft.setterCall ? { setterCall: draft.setterCall } : {}),
    ...(draft.setterPosition !== undefined ? { setterPosition: draft.setterPosition } : {}),
    ...(draft.attackTempo ? { tempo: draft.attackTempo } : {}),
    ...(draft.attackCombination ? { combination: draft.attackCombination } : {}),
    ...(draft.blockersCount !== undefined ? { blockersCount: draft.blockersCount } : {}),
    ...(draft.phase ? { phase: draft.phase } : {}),
    ...(draft.orientation ? { orientation: draft.orientation } : {}),
    ...(draft.origin || draft.target || draft.contactLocation
      ? { captureMethod: draft.captureMethod ?? ('selected' as const) }
      : {}),
  };
  return Object.keys(captureDraft).length > 0
    ? normalizeTacticalMetadata({ captureDraft }, draft.skill, profile.tacticalInput?.zoneSystem)
    : undefined;
}

export class VisualScoutMapper {
  map(draft: VisualScoutDraft, profile: CodeProfile): CanonicalScoutEventCandidate {
    const description = `[VISUAL] ${draft.teamId} #${String(draft.playerNumber).padStart(2, '0')} ${draft.skill} ${draft.evaluation}`;
    const metadata = metadataFor(draft, profile);
    return {
      playerNumber: draft.playerNumber,
      skill: draft.skill,
      evaluation: draft.evaluation,
      outcome: outcomeFor(draft, profile),
      rawCode: description,
      normalizedCode: `[VISUAL:${draft.teamId}:${draft.playerNumber}:${draft.skill}:${draft.evaluation}]`,
      ...(metadata ? { metadata } : {}),
    };
  }
}

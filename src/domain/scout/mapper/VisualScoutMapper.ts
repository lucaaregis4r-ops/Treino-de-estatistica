import type { CodeProfile } from '../../../profiles/types';
import type { ScoutEventMetadata } from '../events/ScoutEvent';
import { normalizeTacticalMetadata } from '../tactical/TacticalMetadataAdapter';
import type { TacticalCaptureDraft } from '../tactical/TacticalMetadata';
import type { CanonicalScoutEventCandidate } from './CanonicalScoutEventCandidate';
import type { VisualScoutDraft } from './VisualScoutDraft';

function outcomeFor(draft: VisualScoutDraft, profile: CodeProfile): string {
  if (draft.skill === 'attack') {
    if (draft.blockOutcome === 'point') return 'blocked';
    if (draft.blockOutcome === 'tool') return 'point';
    if (draft.blockOutcome === 'soft_touch') return 'continuation';
  }
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
  const attackOutMetadata: Pick<ScoutEventMetadata, 'terminalCause' | 'blockTouch'> =
    draft.skill === 'attack' && draft.spatial?.destination.surface === 'outZone'
      ? draft.evaluation === 'excellent'
        ? { terminalCause: 'block_out', blockTouch: true }
        : draft.evaluation === 'error'
          ? { terminalCause: 'attack_out', blockTouch: false }
          : {}
      : {};
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
    ...(draft.skill === 'attack' && draft.blockOutcome !== undefined
      ? {
          blockOutcome: draft.blockOutcome,
          ...(draft.blockerIds?.length ? { blockerIds: draft.blockerIds } : {}),
        }
      : {}),
    ...(draft.phase ? { phase: draft.phase } : {}),
    ...(draft.orientation ? { orientation: draft.orientation } : {}),
    ...(draft.origin || draft.target || draft.contactLocation
      ? { captureMethod: draft.captureMethod ?? ('selected' as const) }
      : {}),
  };
  return Object.keys(captureDraft).length > 0 ||
    draft.spatial !== undefined ||
    Object.keys(attackOutMetadata).length > 0 ||
    draft.coverage !== undefined
    ? normalizeTacticalMetadata(
        {
          captureDraft,
          ...(draft.spatial !== undefined ? { spatial: draft.spatial } : {}),
          ...(draft.coverage !== undefined ? { coverage: draft.coverage } : {}),
          ...attackOutMetadata,
        },
        draft.skill,
        profile.tacticalInput?.zoneSystem,
      )
    : undefined;
}

export class VisualScoutMapper {
  map(draft: VisualScoutDraft, profile: CodeProfile): CanonicalScoutEventCandidate {
    const playerLabel = draft.playerNumber === undefined
      ? 'Sem atleta identificado'
      : `#${String(draft.playerNumber).padStart(2, '0')}`;
    const normalizedPlayer = draft.playerNumber === undefined ? 'unidentified' : draft.playerNumber;
    const description = `[VISUAL] ${draft.teamId} ${playerLabel} ${draft.skill} ${draft.evaluation}`;
    const metadata = metadataFor(draft, profile);
    return {
      playerNumber: draft.playerNumber,
      skill: draft.skill,
      evaluation: draft.evaluation,
      outcome: outcomeFor(draft, profile),
      rawCode: description,
      normalizedCode: `[VISUAL:${draft.teamId}:${normalizedPlayer}:${draft.skill}:${draft.evaluation}]`,
      ...(metadata ? { metadata } : {}),
    };
  }
}

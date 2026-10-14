import { buildRallyPathRallies, type RallyPathInput } from '../markov/RallyPathAnalyzer';
import type { MatchEvent } from '../../match/events/MatchEvent';
import { projectScoutTimeline } from '../../match/events/ScoutTimeline';
import type { TacticalRallyProjection } from '../../rally/context/TacticalRallyProjection';
import type { ZoneSystemProfile } from '../../scout/tactical/ZoneSystemProfile';
import { coverageFor, uniqueReasons, type ObservedSequence, type ObservedSequenceProjection, type ObservedStep, type SequenceCensorReason } from './ObservedSequence';

const evidenceOnlyZoneSystem: ZoneSystemProfile = { id: 'observed-sequence', version: 'none', name: 'Sem classificação espacial', zones: [] };

/** One global unit per rallyId, with both teams' contacts in capture order. */
export function projectVolleyballObservedSequences(
  matchId: string,
  input: RallyPathInput,
  tacticalRally?: TacticalRallyProjection,
  zoneSystem: ZoneSystemProfile = evidenceOnlyZoneSystem,
): ObservedSequenceProjection {
  const history = input.length > 0 && 'type' in input[0] ? input as readonly MatchEvent[] : [];
  const historyByScoutId = new Map(projectScoutTimeline(history).map(item => [item.sourceEventId, item.historyEventId]));
  const paths = buildRallyPathRallies(input, tacticalRally, zoneSystem);
  const units: ObservedSequence[] = paths.rallies.map(rally => {
    const steps: ObservedStep[] = rally.contacts.map(contact => ({
      sourceId: contact.sourceEventId,
      ...(historyByScoutId.has(contact.sourceEventId) ? { effectiveHistoryId: historyByScoutId.get(contact.sourceEventId) } : {}),
      order: contact.sequence,
      kind: contact.skill,
      role: 'action',
      teamId: contact.teamId,
      ...(contact.event ? { elapsedMs: contact.event.timestamp } : {}),
    }));
    const first = steps[0], last = steps.at(-1);
    const lastContact = rally.contacts.at(-1);
    const fallbackWinner = lastContact?.event?.outcome === 'point' || lastContact?.event?.outcome === 'ace' ? lastContact.teamId : undefined;
    const winnerTeamId = rally.terminal?.winnerTeamId ?? fallbackWinner;
    const reasons: SequenceCensorReason[] = [];
    if (rally.exclusionReason === 'invalid_order' || new Set(rally.contacts.map(contact => contact.setNumber)).size > 1) reasons.push('invalid_order');
    if (rally.exclusionReason === 'conflicting_winner') reasons.push('conflicting_terminal');
    if (!winnerTeamId && reasons.length === 0) reasons.push('missing_terminal');
    const censorReasons = uniqueReasons(reasons);
    const coverage = coverageFor(censorReasons);
    const participantTeamIds = [...new Set([...steps.flatMap(step => step.teamId ? [step.teamId] : []), ...(winnerTeamId ? [winnerTeamId] : [])])];
    return {
      unitId: `volleyball:${matchId}:${rally.setNumber}:${encodeURIComponent(rally.rallyId)}`,
      sport: 'volleyball', matchId,
      context: { kind: 'set', number: rally.setNumber },
      participantTeamIds,
      steps,
      start: { sourceId: first?.sourceId, reason: 'first_contact', ...(first?.elapsedMs !== undefined ? { elapsedMs: first.elapsedMs } : {}) },
      ...(winnerTeamId ? { end: { sourceId: rally.terminal?.sourceEventId ?? last?.sourceId, reason: rally.terminal?.cause ?? 'point', teamId: winnerTeamId, ...(last?.elapsedMs !== undefined ? { elapsedMs: last.elapsedMs } : {}) }, outcome: `point:${winnerTeamId}` } : {}),
      coverage, censorReasons,
      eligibleForOutcome: coverage === 'complete' && Boolean(winnerTeamId),
    } satisfies ObservedSequence;
  });
  return { units, unassigned: [] };
}

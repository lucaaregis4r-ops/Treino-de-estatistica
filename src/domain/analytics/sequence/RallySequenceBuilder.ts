import type { TacticalRallyProjection } from '../../rally/context/TacticalRallyProjection';
import type { ScoutEvent } from '../../scout/events/ScoutEvent';
import type { ZoneSystemProfile } from '../../scout/tactical/ZoneSystemProfile';
import { sequenceStateForSkill, type SequenceStateId } from './SequenceState';
import { spatialContextForEvent, type SpatialContext } from './SpatialContext';

export interface SequenceObservation {
  readonly sourceEventId: string;
  readonly sequence: number;
  readonly stateId: Exclude<SequenceStateId, 'terminal_win' | 'terminal_loss'>;
  readonly event: ScoutEvent;
  readonly spatial: SpatialContext;
}

export interface SequenceTerminal {
  readonly stateId: 'terminal_win' | 'terminal_loss';
  readonly winnerTeamId: string;
  readonly referenceTeamId: string;
}

export interface RallySequence {
  readonly rallyId: string;
  readonly setNumber: number;
  readonly referenceTeamId: string;
  readonly observations: readonly SequenceObservation[];
  readonly states: readonly SequenceStateId[];
  readonly terminal?: SequenceTerminal;
  readonly status: 'complete' | 'incomplete';
}

export interface RallySequenceBuildOptions {
  readonly zoneSystem: ZoneSystemProfile;
  readonly tacticalRally?: TacticalRallyProjection;
  readonly winnerByRallyId?: ReadonlyMap<string, string>;
  readonly referenceTeamId?: string;
}

function winnerFor(
  rallyId: string,
  events: readonly ScoutEvent[],
  options: RallySequenceBuildOptions,
): string | undefined {
  const explicit = options.winnerByRallyId?.get(rallyId);
  if (explicit) return explicit;
  const projected = options.tacticalRally?.rallies.find((rally) => rally.rallyId === rallyId);
  if (projected?.winnerTeamId) return projected.winnerTeamId;
  const last = events.at(-1);
  if (last?.outcome === 'point' || last?.outcome === 'ace') return last.teamId;
  return undefined;
}

export class RallySequenceBuilder {
  build(events: readonly ScoutEvent[], options: RallySequenceBuildOptions): readonly RallySequence[] {
    const grouped = new Map<string, ScoutEvent[]>();
    events.forEach((event) => {
      const rally = grouped.get(event.rallyId) ?? [];
      rally.push(event);
      grouped.set(event.rallyId, rally);
    });

    return Object.freeze(
      [...grouped.entries()].map(([rallyId, rallyEvents]) => {
        const ordered = [...rallyEvents].sort(
          (left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id),
        );
        const referenceTeamId = options.referenceTeamId ?? ordered[0]?.teamId ?? '';
        const observations: SequenceObservation[] = ordered.map((event) => ({
          sourceEventId: event.id,
          sequence: event.sequence,
          stateId: sequenceStateForSkill(event.skill) as SequenceObservation['stateId'],
          event,
          spatial: spatialContextForEvent(event, options.zoneSystem),
        }));
        const winnerTeamId = winnerFor(rallyId, ordered, options);
        const terminal: SequenceTerminal | undefined =
          winnerTeamId && referenceTeamId
            ? {
                stateId: winnerTeamId === referenceTeamId ? 'terminal_win' : 'terminal_loss',
                winnerTeamId,
                referenceTeamId,
              }
            : undefined;
        const states: SequenceStateId[] = [
          ...observations.map((observation) => observation.stateId),
          ...(terminal ? [terminal.stateId] : []),
        ];
        return Object.freeze({
          rallyId,
          setNumber: ordered[0]?.setNumber ?? 0,
          referenceTeamId,
          observations: Object.freeze(observations),
          states: Object.freeze(states),
          ...(terminal ? { terminal: Object.freeze(terminal) } : {}),
          status: terminal ? 'complete' : 'incomplete',
        });
      }),
    );
  }
}

export function buildRallySequences(
  events: readonly ScoutEvent[],
  options: RallySequenceBuildOptions,
): readonly RallySequence[] {
  return new RallySequenceBuilder().build(events, options);
}

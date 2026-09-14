import type { MatchMetadata } from '../entities/MatchMetadata';
import { matchEventId, matchEventSequence, type MatchEvent } from '../events/MatchEvent';
import { projectEffectiveMatchEvents } from '../events/ScoutTimeline';
import { reduceMatch } from '../reducers/MatchReducer';
import { createInitialMatchState, type MatchState } from '../state/MatchState';

export class MatchReplayService {
  replay(metadata: MatchMetadata, events: readonly MatchEvent[]): MatchState {
    const ordered = [...events].sort(
      (left, right) => matchEventSequence(left) - matchEventSequence(right),
    );
    const state = projectEffectiveMatchEvents(ordered).reduce(
      reduceMatch,
      createInitialMatchState(metadata),
    );

    return {
      ...state,
      processedEventIds: Object.freeze(ordered.map(matchEventId)),
      lastSequence: ordered.reduce(
        (last, event) => Math.max(last, matchEventSequence(event)),
        state.lastSequence,
      ),
    };
  }

  stateBeforeScout(
    metadata: MatchMetadata,
    events: readonly MatchEvent[],
    sourceScoutEventId: string,
  ): MatchState {
    let state = createInitialMatchState(metadata);
    for (const event of projectEffectiveMatchEvents(events)) {
      if (event.type === 'scout_registered' && event.event.id === sourceScoutEventId) return state;
      state = reduceMatch(state, event);
    }
    return state;
  }
}

const defaultReplayService = new MatchReplayService();

export function replayMatch(metadata: MatchMetadata, events: readonly MatchEvent[]): MatchState {
  return defaultReplayService.replay(metadata, events);
}

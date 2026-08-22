export type RallyPhase = 'idle' | 'serve' | 'reception' | 'set' | 'attack' | 'transition' | 'ended';

export interface RallyState {
  readonly rallyId?: string;
  readonly status: 'idle' | 'active' | 'ended';
  readonly phase: RallyPhase;
  readonly eventIds: readonly string[];
  readonly winningTeamId?: string;
}

export const IDLE_RALLY_STATE: RallyState = Object.freeze({
  status: 'idle',
  phase: 'idle',
  eventIds: Object.freeze([]),
});

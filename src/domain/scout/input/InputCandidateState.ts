export type InputCandidateState =
  'empty' | 'prefix' | 'core_complete' | 'enriching' | 'complete' | 'invalid';

export function isCommitReady(state: InputCandidateState): boolean {
  return state === 'core_complete' || state === 'complete';
}

import { expect, it } from 'vitest';
import { createCanonicalFootballEvent } from './FootballRecorder';
import type { StatsBombLocation } from './StatsBombContract';
import {
  eligibleFootballAssistedConfirmations,
  footballAssistedCandidateKey,
  footballAssistedSourceRevision,
  reconcileFootballAssistedCandidates,
  resolveFootballAssistedRecording,
  setFootballAssistedCandidateState,
  upsertFootballAssistedConfirmation,
  type FootballAssistedRecording,
} from './FootballAssistedRecording';

function event(id: string, index: number, end: StatsBombLocation = [60, 40]) {
  return createCanonicalFootballEvent({ id, matchId: 'match', index, period: 1, elapsedMs: index * 1000, action: 'pass', outcome: 'complete', location: [20, 40], endLocation: end, team: { id: 1, name: 'A' } });
}

it('keeps an ignored deterministic candidate suppressed and invalidates a confirmed answer when its source changes', () => {
  const source = event('source', 1);
  const target = event('target', 2);
  const key = footballAssistedCandidateKey({ kind: 'supporting_detail', targetObservationId: 'observation-1', sourceEventIds: [source.id] });
  const candidate = { key, kind: 'supporting_detail', targetObservationId: 'observation-1', sourceRevisions: [{ eventId: source.id, revision: footballAssistedSourceRevision(source) }], reasons: ['two observed instants'], ruleVersion: 't03.1' };
  expect(reconcileFootballAssistedCandidates([{ ...candidate, state: 'ignored' }], [candidate])).toEqual([{ ...candidate, state: 'ignored' }]);

  const base: FootballAssistedRecording = {
    schema_version: '1.0.0',
    observations: [{ id: 'observation-1', matchId: 'match', period: 1, targetEventId: target.id, possession: 1, controlledTeamId: 'team-a', observedAt: target.timestamp, provenance: 'operator_observed' }],
    details: [{ id: 'detail-1', observationId: 'observation-1', type: 'support', targetId: source.id, value: 'unknown', teamId: 'team-a', targetObservedAt: source.timestamp, filledAt: target.timestamp, provenance: 'review_observed' }],
    pressures: [], candidates: [{ ...candidate, state: 'pending' }], confirmations: [],
  };
  const confirmed = upsertFootballAssistedConfirmation(base, {
    id: 'confirmation-1', candidateKey: key, actions: [{ kind: 'detail', detailId: 'detail-1' }], segmentEventIds: [source.id, target.id], observedAt: source.timestamp, filledAt: target.timestamp,
    spatialPrecision: 'not_observed', temporalPrecision: 'interval', provenance: 'review_confirmed',
  });
  const retry = upsertFootballAssistedConfirmation(confirmed, { ...confirmed.confirmations[0], id: 'confirmation-retry' });
  expect(retry.confirmations).toHaveLength(1);
  expect(eligibleFootballAssistedConfirmations(retry, [source, target])).toHaveLength(1);

  const changedSource = event('source', 1, [80, 40]);
  const invalidated = resolveFootballAssistedRecording(retry, [changedSource, target]);
  expect(invalidated.candidates[0]).toMatchObject({ effectiveState: 'invalid', invalidSourceIds: ['source'] });
  expect(invalidated.confirmations[0]).toMatchObject({ reviewRequired: true, eligible: false });
  expect(resolveFootballAssistedRecording(retry, [target]).confirmations[0].reviewRequired).toBe(true);
});

it('keeps voluntary reviewed actions local and makes ignored/not-observed answers reversible', () => {
  const source = event('source-review', 1);
  const target = event('target-review', 2);
  const key = footballAssistedCandidateKey({ kind: 'segment_to_complete', targetObservationId: 'observation-review', sourceEventIds: [source.id, target.id] });
  const recording: FootballAssistedRecording = {
    schema_version: '1.0.0', observations: [{ id: 'observation-review', matchId: 'match', period: 1, targetEventId: target.id, observedAt: target.timestamp, provenance: 'operator_observed' }], details: [], pressures: [], confirmations: [],
    candidates: [{ key, kind: 'segment_to_complete', targetObservationId: 'observation-review', sourceRevisions: [source, target].map(item => ({ eventId: item.id, revision: footballAssistedSourceRevision(item) })), reasons: ['Antes do chute'], ruleVersion: 't06.1', state: 'pending' }],
  };
  const ignored = setFootballAssistedCandidateState(recording, key, 'ignored');
  expect(ignored.candidates[0].state).toBe('ignored');
  const reopened = setFootballAssistedCandidateState(ignored, key, 'pending');
  const confirmed = upsertFootballAssistedConfirmation(reopened, { id: 'review-confirmation', candidateKey: key, actions: [], describedActions: [{ id: 'review-pass', kind: 'pass', passerId: 'player-a', receiverId: 'player-b' }, { id: 'review-receipt', kind: 'receipt' }, { id: 'review-loss', kind: 'loss', lossKind: 'intercepted', responsibleId: 'player-a' }], segmentEventIds: [source.id, target.id], observedAt: source.timestamp, filledAt: target.timestamp, spatialPrecision: 'not_observed', temporalPrecision: 'interval', provenance: 'review_confirmed' });
  expect(confirmed.candidates[0].state).toBe('confirmed');
  expect(confirmed.confirmations[0].describedActions).toHaveLength(3);
  expect(setFootballAssistedCandidateState(confirmed, key, 'not_observed')).toMatchObject({ candidates: [{ state: 'not_observed' }], confirmations: [] });
});

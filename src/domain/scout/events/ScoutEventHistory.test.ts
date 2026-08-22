import { describe, expect, it } from 'vitest';
import type { ScoutEvent } from './ScoutEvent';
import { ScoutEventHistory } from './ScoutEventHistory';

const event: ScoutEvent = {
  id: 'event_1',
  matchId: 'match_1',
  rallyId: 'rally_1',
  sequence: 1,
  teamId: 'team_a',
  playerId: 'team_a_08',
  skill: 'attack',
  outcome: 'point',
  evaluation: 'excellent',
  setNumber: 1,
  scoreBefore: { teamA: 0, teamB: 0 },
  timestamp: 1,
  rawCode: '08A#',
  codeProfileId: 'default_compact_v1',
  codeProfileVersion: '1.0.0',
  complexityProfileId: 'basic',
};

describe('ScoutEventHistory', () => {
  it('corrects, undoes, and redoes without losing immutable history', () => {
    let nextId = 1;
    const original = ScoutEventHistory.empty({
      createId: () => `history_${nextId++}`,
      now: () => 1000 + nextId,
    }).register(event);

    const correction = original.correct(event.id, '08A+');
    expect(correction.ok).toBe(true);
    if (!correction.ok) return;
    const correctionId = correction.value.entries.at(-1)?.id;
    expect(correction.value.effectiveRawCode(event.id)).toBe('08A+');

    const undone = correction.value.undo(correctionId!);
    expect(undone.ok).toBe(true);
    if (!undone.ok) return;
    const undoId = undone.value.entries.at(-1)?.id;
    expect(undone.value.effectiveRawCode(event.id)).toBe('08A#');

    const redone = undone.value.redo(undoId!);
    expect(redone.ok).toBe(true);
    if (!redone.ok) return;
    expect(redone.value.effectiveRawCode(event.id)).toBe('08A+');
    expect(redone.value.entries).toHaveLength(4);
    expect(original.entries).toHaveLength(1);
    expect(original.effectiveRawCode(event.id)).toBe('08A#');
  });
});

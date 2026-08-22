import { describe, expect, it } from 'vitest';
import scoutEventFixture from '../tests/fixtures/scout-event.json';
import { createEntityId, isEntityId } from '../core/ids/entityId';
import { isProfileVersion } from '../core/schema/version';
import { isScore } from './match/score/Score';
import type { ScoutEvent } from './scout/events/ScoutEvent';

describe('domain contracts', () => {
  it('serializes and restores a canonical scout event without losing raw input', () => {
    const event: ScoutEvent = scoutEventFixture as ScoutEvent;
    const restored = JSON.parse(JSON.stringify(event)) as ScoutEvent;

    expect(restored).toEqual(event);
    expect(restored.rawCode).toBe('08A#');
  });

  it('creates UUID entity ids', () => {
    expect(isEntityId(createEntityId())).toBe(true);
  });

  it.each(['1.0.0', '2.1.3-beta.1'])('accepts semantic profile version %s', (version) => {
    expect(isProfileVersion(version)).toBe(true);
  });

  it('rejects invalid scores and versions', () => {
    expect(isScore({ teamA: 25, teamB: 23 })).toBe(true);
    expect(isScore({ teamA: -1, teamB: 0 })).toBe(false);
    expect(isProfileVersion('v1')).toBe(false);
  });
});

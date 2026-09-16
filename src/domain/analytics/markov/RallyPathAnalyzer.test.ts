import { describe, expect, it } from 'vitest';
import {
  buildRallyPathFlow,
  buildRallyPathModel,
  compareRallyPathQualities,
  selectRallyPathFocus,
  type PathStateDescriptor,
  type RallyPathContact,
  type RallyPathRally,
} from './RallyPathAnalyzer';

function state(
  teamId: string,
  skill: RallyPathContact['skill'] | 'terminal',
  quality?: string,
  terminal = false,
): PathStateDescriptor {
  return {
    key: JSON.stringify([teamId, skill, quality ?? null]),
    teamId,
    skill,
    ...(quality === undefined ? {} : { quality }),
    ...(terminal ? { terminal: true } : {}),
  };
}

function rally(
  rallyId: string,
  contacts: readonly { teamId: string; skill: RallyPathContact['skill']; quality?: string }[],
  winnerTeamId: string | undefined,
): RallyPathRally {
  const mapped = contacts.map((item, index) => ({
    sourceEventId: `${rallyId}-${index}`,
    teamId: item.teamId,
    skill: item.skill,
    ...(item.quality === undefined ? {} : { quality: item.quality }),
    state: state(item.teamId, item.skill, item.quality),
    setNumber: 1,
    sequence: index + 1,
    spatial: { coordinateSystemVersion: 'test' },
  }));
  return {
    rallyId,
    setNumber: 1,
    contacts: mapped,
    ...(winnerTeamId
      ? {
          terminal: {
            state: state(winnerTeamId, 'terminal', undefined, true),
            winnerTeamId,
          },
          status: 'eligible' as const,
        }
      : { status: 'incomplete' as const, exclusionReason: 'missing_winner' as const }),
  };
}

const focus = (quality?: string) => ({
  teamId: 'a',
  skill: 'attack' as const,
  ...(quality === undefined ? {} : { quality }),
});

describe('RallyPathAnalyzer', () => {
  it('resolves direct absorption and a cycle with simultaneous fixed-point updates', () => {
    const direct = [
      ...Array.from({ length: 6 }, (_, index) =>
        rally(`win-${index}`, [{ teamId: 'a', skill: 'attack' }], 'a'),
      ),
      ...Array.from({ length: 4 }, (_, index) =>
        rally(`loss-${index}`, [{ teamId: 'a', skill: 'attack' }], 'b'),
      ),
    ];
    const directModel = buildRallyPathModel(direct, 'a');
    const directFocus = selectRallyPathFocus(directModel, focus());
    expect(directFocus.potential).toBeCloseTo(0.6);

    const chain = [
      ...Array.from({ length: 3 }, (_, index) =>
        rally(
          `chain-win-${index}`,
          [
            { teamId: 'a', skill: 'attack' },
            { teamId: 'a', skill: 'block' },
          ],
          'a',
        ),
      ),
      rally(
        'chain-loss',
        [
          { teamId: 'a', skill: 'attack' },
          { teamId: 'a', skill: 'block' },
        ],
        'b',
      ),
    ];
    const chainModel = buildRallyPathModel(chain, 'a');
    expect(selectRallyPathFocus(chainModel, { teamId: 'a', skill: 'block' }).potential).toBeCloseTo(
      0.75,
    );
    expect(selectRallyPathFocus(chainModel, focus()).potential).toBeCloseTo(0.75);

    const cycleStates = [
      rally(
        'cycle-1',
        [
          { teamId: 'a', skill: 'attack' },
          { teamId: 'a', skill: 'block' },
          { teamId: 'a', skill: 'attack' },
        ],
        undefined,
      ),
    ].map((item) => ({
      ...item,
      status: 'eligible' as const,
      terminal: undefined,
    }));
    const cycleModel = buildRallyPathModel(cycleStates, 'a');
    expect(cycleModel.status).toBe('unavailable');
    expect(selectRallyPathFocus(cycleModel, focus()).potential).toBeNull();
  });

  it('uses the observed first transition for a mixed focus and keeps rally frequency distinct', () => {
    const rallies = [
      ...Array.from({ length: 5 }, (_, index) =>
        rally(`high-${index}`, [{ teamId: 'a', skill: 'attack', quality: '+' }], 'a'),
      ),
      ...Array.from({ length: 5 }, (_, index) =>
        rally(`low-${index}`, [{ teamId: 'a', skill: 'attack', quality: '-' }], 'b'),
      ),
    ];
    const model = buildRallyPathModel(rallies, 'a');
    expect(selectRallyPathFocus(model, focus('+')).potential).toBeCloseTo(1);
    expect(selectRallyPathFocus(model, focus('-')).potential).toBeCloseTo(0);
    expect(selectRallyPathFocus(model, focus()).potential).toBeCloseTo(0.5);
    const comparisons = compareRallyPathQualities(model, focus());
    expect(comparisons.map((item) => item.quality)).toEqual(['+', '-']);
  });

  it('preserves real prefixes, groups only the long tail, and counts repeated occurrences once per contact', () => {
    const rallies = [
      rally(
        'repeat',
        [
          { teamId: 'a', skill: 'attack', quality: '+' },
          { teamId: 'b', skill: 'defense', quality: '-' },
          { teamId: 'a', skill: 'attack', quality: '+' },
        ],
        'a',
      ),
      rally(
        'other',
        [
          { teamId: 'a', skill: 'attack', quality: '+' },
          { teamId: 'b', skill: 'defense', quality: '+' },
        ],
        'b',
      ),
    ];
    const model = buildRallyPathModel(rallies, 'a');
    const selected = selectRallyPathFocus(model, focus('+'));
    expect(selected.occurrenceCount).toBe(3);
    expect(selected.rallyIds).toHaveLength(2);
    const flow = buildRallyPathFlow(selected, model, 2);
    expect(flow.links.every((link) => link.count <= link.prefixCount)).toBe(true);
    expect(flow.nodes.some((node) => node.kind === 'other')).toBe(false);
  });
});

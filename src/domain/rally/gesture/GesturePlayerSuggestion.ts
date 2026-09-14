import type { CourtRotationPosition, SetLineup } from '../../match/lineup/SetLineup';
import type { Skill } from '../../scout/entities/Skill';

export interface GesturePlayerSuggestion {
  readonly automatic?: string;
  readonly highlighted: readonly string[];
  readonly others: readonly string[];
}

const PRIORITY_BY_SKILL: Readonly<Partial<Record<Skill, readonly CourtRotationPosition[]>>> = {
  serve: [1],
  reception: [5, 6, 1],
  attack: [4, 3, 2],
  block: [4, 3, 2],
};

/** Suggests players by current rotation without restricting any player selection. */
export class GesturePlayerSuggestionResolver {
  resolve(lineup: SetLineup | undefined, skill: Skill): GesturePlayerSuggestion {
    if (!lineup) return { highlighted: [], others: [] };

    const playerByPosition = new Map<CourtRotationPosition, string>();
    for (const position of [1, 2, 3, 4, 5, 6] as const) {
      const slot = lineup.slots[lineup.positions[position]];
      if (slot) playerByPosition.set(position, slot.playerId);
    }

    const allPlayers = [...playerByPosition.values()];
    const priorityPositions = PRIORITY_BY_SKILL[skill] ?? [];
    const highlighted = priorityPositions
      .map((position) => playerByPosition.get(position))
      .filter((playerId): playerId is string => playerId !== undefined);
    const highlightedSet = new Set(highlighted);
    const others = allPlayers.filter((playerId) => !highlightedSet.has(playerId));

    return {
      ...(skill === 'serve' && highlighted[0] ? { automatic: highlighted[0] } : {}),
      highlighted,
      others,
    };
  }
}

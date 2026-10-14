import type { CourtRotationPosition, SetLineup } from './SetLineup';
import { playerRoleForTacticalRole } from './SetLineup';

const ROTATED_FROM: Readonly<Record<CourtRotationPosition, CourtRotationPosition>> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: 1,
};

export class RotationEngine {
  rotate(lineup: SetLineup, liberoPlayerIds?: readonly string[]): SetLineup {
    const rotatedPositions: Record<CourtRotationPosition, string> = {
      1: lineup.positions[ROTATED_FROM[1]],
      2: lineup.positions[ROTATED_FROM[2]],
      3: lineup.positions[ROTATED_FROM[3]],
      4: lineup.positions[ROTATED_FROM[4]],
      5: lineup.positions[ROTATED_FROM[5]],
      6: lineup.positions[ROTATED_FROM[6]],
    };

    // Posições da rede: 4, 3, 2. O líbero NUNCA pode ocupar a rede.
    // Se o slot que foi para a rede estiver com o líbero, restauramos o titular original do slot.
    const frontRowPositions: readonly CourtRotationPosition[] = [4, 3, 2];
    let slots = lineup.slots;
    for (const position of frontRowPositions) {
      const slotId = rotatedPositions[position];
      const slot = slots[slotId];
      if (!slot) continue;
      const isLibero =
        slot.activeRole === 'libero' || (liberoPlayerIds && liberoPlayerIds.includes(slot.playerId));
      if (isLibero) {
        const canRestoreOriginal =
          slot.originalPlayerId &&
          slot.originalPlayerId !== slot.playerId &&
          (!liberoPlayerIds || !liberoPlayerIds.includes(slot.originalPlayerId));
        if (canRestoreOriginal) {
          slots = {
            ...slots,
            [slotId]: {
              ...slot,
              playerId: slot.originalPlayerId!,
              activeRole: playerRoleForTacticalRole(slot.tacticalRole),
            },
          };
        } else {
          slots = {
            ...slots,
            [slotId]: {
              ...slot,
              activeRole: playerRoleForTacticalRole(slot.tacticalRole),
            },
          };
        }
      }
    }

    return {
      ...lineup,
      positions: rotatedPositions,
      slots,
    };
  }
}

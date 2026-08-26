import {
  ROTATION_POSITIONS,
  playerRoleForTacticalRole,
  type CourtRotationPosition,
  type SetLineup,
} from '../lineup/SetLineup';

export interface ActiveSetter {
  readonly playerId: string;
  readonly slotId: string;
  readonly position: CourtRotationPosition;
}

export class ActiveSetterResolver {
  resolve(lineup: SetLineup | undefined): ActiveSetter | undefined {
    if (!lineup) return undefined;
    const setters = Object.values(lineup.slots).filter(
      (slot) => (slot.activeRole ?? playerRoleForTacticalRole(slot.tacticalRole)) === 'setter',
    );
    if (setters.length !== 1) return undefined;
    const setter = setters[0];
    const position = ROTATION_POSITIONS.find(
      (candidate) => lineup.positions[candidate] === setter.slotId,
    );
    return position ? { playerId: setter.playerId, slotId: setter.slotId, position } : undefined;
  }
}

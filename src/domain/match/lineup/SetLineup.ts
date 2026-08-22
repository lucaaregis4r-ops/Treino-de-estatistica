import type { Player } from '../entities/Player';

export type CourtRotationPosition = 1 | 2 | 3 | 4 | 5 | 6;

export type TacticalRole =
  'setter' | 'opposite' | 'outside_1' | 'outside_2' | 'middle_1' | 'middle_2' | 'custom';

export interface LineupSlot {
  readonly slotId: string;
  readonly tacticalRole: TacticalRole;
  readonly playerId: string;
}

export interface SetLineup {
  readonly setNumber: number;
  readonly teamId: string;
  readonly positions: Readonly<Record<CourtRotationPosition, string>>;
  readonly slots: Readonly<Record<string, LineupSlot>>;
}

export interface PlayerLineupContext {
  readonly slotId: string;
  readonly tacticalRole: TacticalRole;
  readonly rotationPosition: CourtRotationPosition;
}

export const ROTATION_POSITIONS = Object.freeze([1, 2, 3, 4, 5, 6] as const);
export const DEFAULT_TACTICAL_ROLES = Object.freeze([
  'setter',
  'outside_1',
  'middle_1',
  'opposite',
  'outside_2',
  'middle_2',
] as const satisfies readonly TacticalRole[]);

export function playerLineupContext(
  lineup: SetLineup | undefined,
  playerId: string,
): PlayerLineupContext | undefined {
  if (!lineup) return undefined;
  const slot = Object.values(lineup.slots).find((candidate) => candidate.playerId === playerId);
  if (!slot) return undefined;
  const position = ROTATION_POSITIONS.find(
    (candidate) => lineup.positions[candidate] === slot.slotId,
  );
  return position
    ? { slotId: slot.slotId, tacticalRole: slot.tacticalRole, rotationPosition: position }
    : undefined;
}

export function createDefaultLineup(
  teamId: string,
  setNumber: number,
  players: readonly Player[],
): SetLineup | undefined {
  const active = players
    .filter((player) => player.teamId === teamId && player.active !== false)
    .slice()
    .sort((left, right) => left.number - right.number)
    .slice(0, 6);
  if (active.length < 6) return undefined;
  const slots = Object.fromEntries(
    active.map((player, index) => {
      const slotId = `${teamId}_set_${setNumber}_slot_${index + 1}`;
      return [slotId, { slotId, tacticalRole: DEFAULT_TACTICAL_ROLES[index], playerId: player.id }];
    }),
  );
  const slotIds = Object.keys(slots);
  return {
    teamId,
    setNumber,
    positions: {
      1: slotIds[0],
      2: slotIds[1],
      3: slotIds[2],
      4: slotIds[3],
      5: slotIds[4],
      6: slotIds[5],
    },
    slots,
  };
}

import type { CourtRotationPosition, SetLineup } from './SetLineup';

const ROTATED_FROM: Readonly<Record<CourtRotationPosition, CourtRotationPosition>> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: 1,
};

export class RotationEngine {
  rotate(lineup: SetLineup): SetLineup {
    return {
      ...lineup,
      positions: {
        1: lineup.positions[ROTATED_FROM[1]],
        2: lineup.positions[ROTATED_FROM[2]],
        3: lineup.positions[ROTATED_FROM[3]],
        4: lineup.positions[ROTATED_FROM[4]],
        5: lineup.positions[ROTATED_FROM[5]],
        6: lineup.positions[ROTATED_FROM[6]],
      },
    };
  }
}

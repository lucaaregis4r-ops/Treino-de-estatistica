/** Court: executor baseline x=0, net x=0.5, opponent baseline x=1; y runs top to bottom.
 * serviceZone uses independent local coordinates in the external strip left of the court.
 */
export type SpatialPoint = {
  readonly surface: 'court' | 'serviceZone' | 'outZone';
  readonly x: number;
  readonly y: number;
};

/** A pointer-independent trajectory captured by the gesture layer. */
export type GestureTrajectory = {
  readonly points: readonly SpatialPoint[];
};

/** Primary captured coordinates; never replace these with derived zone centers. */
export type SpatialMetadata = {
  readonly origin: SpatialPoint;
  readonly destination: SpatialPoint;
};

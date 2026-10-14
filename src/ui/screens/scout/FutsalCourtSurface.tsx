import type { Ref } from 'react';
import type { SpatialCourtDisplayPoint } from './SpatialCourtSurface';
import './FutsalCourtSurface.css';

/** Nominal 40 × 20 futsal diagram; coordinates stored by the scout remain normalized. */
export function FutsalCourtSurface({ surfaceRef, origin, destination, flipped = false }: {
  readonly surfaceRef?: Ref<HTMLDivElement>;
  readonly origin?: SpatialCourtDisplayPoint | null;
  readonly destination?: SpatialCourtDisplayPoint | null;
  readonly flipped?: boolean;
}) {
  return <div ref={surfaceRef} className="futsal-surface" data-flipped={flipped || undefined} aria-label="Quadra de futsal">
    <svg className="futsal-court-lines" viewBox="0 0 40 20" preserveAspectRatio="none" aria-hidden="true">
      <FutsalCourtMarkings />
    </svg>
    {origin && destination && <svg className="futsal-trajectory" aria-hidden="true"><line x1={`${origin.x * 100}%`} y1={`${origin.y * 100}%`} x2={`${destination.x * 100}%`} y2={`${destination.y * 100}%`} /></svg>}
    {origin && <span className="futsal-marker" style={{ left: `${origin.x * 100}%`, top: `${origin.y * 100}%` }} />}
    {destination && <span className="futsal-marker futsal-marker-destination" style={{ left: `${destination.x * 100}%`, top: `${destination.y * 100}%` }} />}
  </div>;
}

/** Shared by capture and analytics; viewBox 0 0 40 20. */
export function FutsalCourtMarkings() {
  return <g className="futsal-court-markings" aria-hidden="true">
      <rect className="futsal-court-boundary" x="0" y="0" width="40" height="20" />
      <line x1="20" y1="0" x2="20" y2="20" />
      <circle cx="20" cy="10" r="3" />
      <circle className="futsal-court-spot" cx="20" cy="10" r=".06" />
      <path d="M 0 2.5 A 6 6 0 0 1 6 8.5 L 6 11.5 A 6 6 0 0 1 0 17.5 M 40 2.5 A 6 6 0 0 0 34 8.5 L 34 11.5 A 6 6 0 0 0 40 17.5" />
      <circle className="futsal-court-spot" cx="6" cy="10" r=".06" />
      <circle className="futsal-court-spot" cx="34" cy="10" r=".06" />
      <circle className="futsal-court-spot futsal-ten-metre-spot" cx="10" cy="10" r=".06" />
      <circle className="futsal-court-spot futsal-distance-mark" cx="10" cy="5" r=".04" />
      <circle className="futsal-court-spot futsal-distance-mark" cx="10" cy="15" r=".04" />
      <circle className="futsal-court-spot futsal-ten-metre-spot" cx="30" cy="10" r=".06" />
      <circle className="futsal-court-spot futsal-distance-mark" cx="30" cy="5" r=".04" />
      <circle className="futsal-court-spot futsal-distance-mark" cx="30" cy="15" r=".04" />
      <path d="M 5 9.8 L 5 10.2 M 35 9.8 L 35 10.2" />
      <path d="M 0 0 A .25 .25 0 0 0 .25 .25 M 39.75 0 A .25 .25 0 0 0 40 .25 M 40 19.75 A .25 .25 0 0 0 39.75 20 M .25 20 A .25 .25 0 0 0 0 19.75" />
      <rect className="futsal-goal" x="0" y="8.5" width=".5" height="3" />
      <rect className="futsal-goal" x="39.5" y="8.5" width=".5" height="3" />
  </g>;
}

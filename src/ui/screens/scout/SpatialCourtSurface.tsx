import { useId } from 'react';
import { VolleyballCourtOverlay } from '../../components/VolleyballCourtZones';
import type { HTMLAttributes, Ref } from 'react';
import './SpatialCourtInputV2.css';

export interface SpatialCourtDisplayPoint {
  readonly x: number;
  readonly y: number;
}

interface SpatialCourtSurfaceProps {
  readonly activeZone?: string;
  readonly origin?: SpatialCourtDisplayPoint | null;
  readonly destination?: SpatialCourtDisplayPoint | null;
  readonly allowOutZone?: boolean;
  readonly surfaceRef?: Ref<HTMLDivElement>;
  readonly surfaceProps?: Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children'>;
}

/** Shared visual surface. Interaction and scout rules remain in the consumer. */
export function SpatialCourtSurface({
  activeZone,
  origin,
  destination,
  allowOutZone,
  surfaceRef,
  surfaceProps,
}: SpatialCourtSurfaceProps) {
  const arrowId = useId();
  return (
    <div
      ref={surfaceRef}
      className={`spatial-v2-surface${allowOutZone ? ' spatial-v2-out-zone' : ''}`}
      {...surfaceProps}
    >
      <VolleyballCourtOverlay activeZone={activeZone} />
      <span className="spatial-v2-attack-line" style={{ left: '33.3333%' }} />
      <span className="spatial-v2-net" />
      <span className="spatial-v2-attack-line" style={{ left: '66.6667%' }} />
      {origin && destination && (
        <svg className="spatial-v2-trajectory" aria-hidden="true">
          <defs><marker id={arrowId} markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="none" stroke="var(--st-court-marker)" /></marker></defs>
          <line markerEnd={`url(#${arrowId})`}
            x1={`${origin.x * 100}%`}
            y1={`${origin.y * 100}%`}
            x2={`${destination.x * 100}%`}
            y2={`${destination.y * 100}%`}
          />
        </svg>
      )}
      {origin && (
        <span
          className="spatial-v2-marker"
          aria-label="Origem"
          style={{ left: `${origin.x * 100}%`, top: `${origin.y * 100}%` }}
        />
      )}
      {destination && (
        <span
          className="spatial-v2-marker spatial-v2-destination"
          aria-label="Destino"
          style={{ left: `${destination.x * 100}%`, top: `${destination.y * 100}%` }}
        />
      )}
    </div>
  );
}

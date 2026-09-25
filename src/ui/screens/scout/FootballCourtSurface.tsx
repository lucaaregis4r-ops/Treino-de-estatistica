import type { Ref } from 'react';
import type { SpatialCourtDisplayPoint } from './SpatialCourtSurface';
import './FootballCourtSurface.css';

export function FootballCourtSurface({ surfaceRef, origin, destination, flipped = false, recentPoints = [], suggestedSegment }: { surfaceRef?: Ref<HTMLDivElement>; origin?: SpatialCourtDisplayPoint | null; destination?: SpatialCourtDisplayPoint | null; flipped?: boolean; recentPoints?: readonly SpatialCourtDisplayPoint[]; suggestedSegment?: { readonly origin: SpatialCourtDisplayPoint; readonly destination: SpatialCourtDisplayPoint } }) {
  return <div ref={surfaceRef} className="football-surface" data-flipped={flipped || undefined} aria-label="Campo de futebol">
    <svg className="football-pitch-lines" viewBox="0 0 120 80" preserveAspectRatio="none" aria-hidden="true">
      <rect className="football-pitch-boundary" x="0" y="0" width="120" height="80" />
      <line x1="60" y1="0" x2="60" y2="80" />
      <circle cx="60" cy="40" r="10" />
      <circle className="football-pitch-spot" cx="60" cy="40" r=".7" />
      <rect x="0" y="18" width="18" height="44" />
      <rect x="102" y="18" width="18" height="44" />
      <rect x="0" y="30" width="6" height="20" />
      <rect x="114" y="30" width="6" height="20" />
      <circle className="football-pitch-spot" cx="12" cy="40" r=".7" />
      <circle className="football-pitch-spot" cx="108" cy="40" r=".7" />
      <path d="M 18 31 A 10 10 0 0 1 18 49" />
      <path d="M 102 31 A 10 10 0 0 0 102 49" />
      <path d="M 0 2 A 2 2 0 0 0 2 0 M 118 0 A 2 2 0 0 0 120 2 M 120 78 A 2 2 0 0 0 118 80 M 2 80 A 2 2 0 0 0 0 78" />
      <rect className="football-pitch-goal" x="0" y="36" width="2" height="8" />
      <rect className="football-pitch-goal" x="118" y="36" width="2" height="8" />
    </svg>
    {recentPoints.length > 1 && <svg className="football-recent-path" aria-hidden="true"><polyline points={recentPoints.map((point) => `${point.x * 100},${point.y * 100}`).join(' ')} /></svg>}
    {recentPoints.slice(0, -1).map((point, index) => <span key={`${point.x}-${point.y}-${index}`} className="football-recent-marker" style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }} />)}
    {suggestedSegment && <svg className="football-suggested-segment" aria-label="Trecho sugerido para completar"><line x1={`${suggestedSegment.origin.x * 100}%`} y1={`${suggestedSegment.origin.y * 100}%`} x2={`${suggestedSegment.destination.x * 100}%`} y2={`${suggestedSegment.destination.y * 100}%`} /><circle cx={`${suggestedSegment.destination.x * 100}%`} cy={`${suggestedSegment.destination.y * 100}%`} r=".9" /></svg>}
    {origin && destination && <svg className="football-trajectory" aria-hidden="true"><line x1={`${origin.x * 100}%`} y1={`${origin.y * 100}%`} x2={`${destination.x * 100}%`} y2={`${destination.y * 100}%`} /></svg>}
    {origin && <span className="football-marker" style={{ left: `${origin.x * 100}%`, top: `${origin.y * 100}%` }} />}
    {destination && <span className="football-marker football-marker-destination" style={{ left: `${destination.x * 100}%`, top: `${destination.y * 100}%` }} />}
  </div>;
}

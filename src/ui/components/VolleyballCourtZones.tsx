import { VOLLEYBALL_COURT_SECTORS } from './volleyballCourtGeometry';
import './VolleyballCourtZones.css';

/** Can be embedded in an existing SVG without changing captured coordinates. */
export function VolleyballCourtMarkings({ activeZone, labels = true }: { activeZone?: string; labels?: boolean }) {
  return <g className="volleyball-markings" aria-hidden="true">
    {VOLLEYBALL_COURT_SECTORS.map((zone) => <g key={zone.key}>
      <rect className={`volleyball-sector${zone.key === activeZone ? ' is-active' : ''}`}
        x={(zone.x - .125) * 200} y={(zone.y - 1 / 6) * 100} width="50" height={100 / 3} />
      {labels && <text x={zone.x * 200} y={zone.y * 100} dominantBaseline="central" textAnchor="middle">{zone.id}</text>}
    </g>)}
    {[200 / 3, 400 / 3].map((x) => <line key={x} className="volleyball-attack-line" x1={x} x2={x} y1="0" y2="100" />)}
    <line className="volleyball-net" x1="100" x2="100" y1="0" y2="100" />
    <rect className="volleyball-boundary" x="0" y="0" width="200" height="100" />
  </g>;
}

export function VolleyballCourtOverlay({ activeZone, labels = true }: { activeZone?: string; labels?: boolean }) {
  return <svg className="volleyball-court-overlay" viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true">
    <VolleyballCourtMarkings activeZone={activeZone} labels={labels} />
  </svg>;
}

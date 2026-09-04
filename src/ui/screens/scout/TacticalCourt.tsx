import { useRef, type PointerEvent } from 'react';
import type { CourtLocation } from '../../../domain/scout/tactical/TacticalMetadata';
import type {
  ZoneDefinition,
  ZoneSystemProfile,
} from '../../../domain/scout/tactical/ZoneSystemProfile';
import { normalizedCourtPoint } from './courtGeometry';
import {
  courtLocationToDisplayPoint,
  displayPointToCourtLocation,
} from '../../../domain/scout/tactical/CourtGeometry';

export type CourtSelectionMode = 'origin' | 'target';

interface TacticalCourtProps {
  readonly profile: ZoneSystemProfile;
  readonly mode: CourtSelectionMode;
  readonly originZoneId: string;
  readonly targetZoneId: string;
  readonly drawnOrigin?: CourtLocation;
  readonly drawnTarget?: CourtLocation;
  readonly onModeChange: (mode: CourtSelectionMode) => void;
  readonly onSelect: (zoneId: string) => void;
  readonly onDraw: (origin: CourtLocation, target: CourtLocation) => void;
}

function zonePosition(zone: ZoneDefinition, side: CourtSelectionMode) {
  const lateralPosition = zone.x ?? 0.5;
  const distanceFromNet = zone.y ?? 0.5;
  return side === 'origin'
    ? { left: `${(1 - distanceFromNet) * 50}%`, top: `${lateralPosition * 100}%` }
    : { left: `${50 + distanceFromNet * 50}%`, top: `${(1 - lateralPosition) * 100}%` };
}

export function TacticalCourt({
  profile,
  mode,
  originZoneId,
  targetZoneId,
  drawnOrigin,
  drawnTarget,
  onModeChange,
  onSelect,
  onDraw,
}: TacticalCourtProps) {
  const drawStartRef = useRef<CourtLocation | undefined>(undefined);

  function point(event: PointerEvent<HTMLDivElement>, side: CourtSelectionMode): CourtLocation {
    const displayed = normalizedCourtPoint(
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
    );
    return displayPointToCourtLocation(displayed, side, profile);
  }

  function startsOnZone(event: PointerEvent<HTMLDivElement>): boolean {
    return event.target instanceof HTMLElement && event.target.closest('button') !== null;
  }

  function zones(side: CourtSelectionMode) {
    return profile.zones.map((zone) => {
      const active = mode === side;
      const selected = side === 'origin' ? zone.id === originZoneId : zone.id === targetZoneId;
      const className = `court-zone ${side} ${selected ? 'selected' : ''}`.trim();
      const style = zonePosition(zone, side);

      if (!active) {
        return (
          <span key={`${side}-${zone.id}`} className={`${className} inactive`} style={style}>
            {zone.id}
          </span>
        );
      }

      return (
        <button
          key={`${side}-${zone.id}`}
          type="button"
          className={className}
          style={style}
          onClick={() => onSelect(zone.id)}
          aria-label={zone.name}
        >
          {zone.id}
        </button>
      );
    });
  }

  return (
    <section className="tactical-court-panel" aria-label="Seleção tática pela quadra">
      <div className="court-mode-toggle">
        <button
          type="button"
          aria-pressed={mode === 'origin'}
          onClick={() => onModeChange('origin')}
        >
          Origem
        </button>
        <button
          type="button"
          aria-pressed={mode === 'target'}
          onClick={() => onModeChange('target')}
        >
          Destino
        </button>
      </div>
      <div
        className="tactical-court"
        aria-label={profile.name}
        onPointerDown={(event) => {
          if (startsOnZone(event)) return;
          drawStartRef.current = point(event, 'origin');
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drawStart = drawStartRef.current;
          if (drawStart && event.buttons === 1) onDraw(drawStart, point(event, 'target'));
        }}
        onPointerUp={(event) => {
          const drawStart = drawStartRef.current;
          if (!drawStart || startsOnZone(event)) return;
          const target = point(event, 'target');
          drawStartRef.current = undefined;
          event.currentTarget.releasePointerCapture(event.pointerId);
          onDraw(drawStart, target);
        }}
      >
        <span className="court-team-label origin" aria-hidden="true">
          origem
        </span>
        <span className="court-team-label target" aria-hidden="true">
          destino
        </span>
        <span className="court-net" aria-hidden="true" />
        <span className="court-attack-line origin" aria-hidden="true" />
        <span className="court-attack-line target" aria-hidden="true" />
        {drawnOrigin?.x !== undefined &&
          drawnOrigin.y !== undefined &&
          drawnTarget?.x !== undefined &&
          drawnTarget.y !== undefined && (
            <svg
              className="drawn-trajectory"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="trajectory-arrow"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6 Z" />
                </marker>
              </defs>
              <line
                x1={(courtLocationToDisplayPoint(drawnOrigin, 'origin', profile).x ?? 0) * 100}
                y1={(courtLocationToDisplayPoint(drawnOrigin, 'origin', profile).y ?? 0) * 100}
                x2={(courtLocationToDisplayPoint(drawnTarget, 'target', profile).x ?? 1) * 100}
                y2={(courtLocationToDisplayPoint(drawnTarget, 'target', profile).y ?? 1) * 100}
                markerEnd="url(#trajectory-arrow)"
              />
            </svg>
          )}
        {zones('origin')}
        {zones('target')}
        {originZoneId && targetZoneId && (
          <span className="court-trajectory-label" aria-live="polite">
            {originZoneId} → {targetZoneId}
          </span>
        )}
        {drawnOrigin && drawnTarget && (
          <span className="court-trajectory-label" aria-live="polite">
            Trajetória desenhada
          </span>
        )}
      </div>
      <small>
        {mode === 'origin' ? 'Marque onde a ação começou.' : 'Marque onde a bola terminou.'} Arraste
        para registrar uma trajetória precisa.
      </small>
    </section>
  );
}

import { useState, type MouseEvent } from 'react';
import type { Skill } from '../../../domain/scout/entities/Skill';
import type { SpatialMetadata } from '../../../domain/scout/spatial/SpatialMetadata';
import './SpatialCourtInputV2.css';

export interface SpatialCourtInputV2Props {
  // These props remain for the existing consumer; this geometry-only stage does not use them.
  readonly skill?: Skill;
  readonly isEnabled: boolean;
  readonly executingLabel?: string;
  readonly onConfirm?: (spatial: SpatialMetadata) => void;
  readonly onCancel?: () => void;
}

export type CourtPoint = {
  readonly x: number;
  readonly y: number;
};

type CaptureState = {
  readonly origin: CourtPoint | null;
  readonly destination: CourtPoint | null;
};

function clamp(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

export function SpatialCourtInputV2({ isEnabled, onConfirm, onCancel }: SpatialCourtInputV2Props) {
  const [capture, setCapture] = useState<CaptureState>({ origin: null, destination: null });

  if (!isEnabled) return null;

  function handleSurfaceClick(event: MouseEvent<HTMLDivElement>) {
    const surface = event.currentTarget;
    const rect = surface.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const x = clamp((event.clientX - rect.left) / rect.width);
    const y = clamp((event.clientY - rect.top) / rect.height);
    setCapture(
      capture.origin === null
        ? { origin: { x, y }, destination: null }
        : { origin: capture.origin, destination: { x, y } },
    );
    if (capture.origin)
      onConfirm?.({
        origin: { surface: 'court', ...capture.origin },
        destination: { surface: 'court', x, y },
      });
  }

  const { origin, destination } = capture;
  const phase = origin === null ? 'origin' : destination === null ? 'destination' : 'ready';

  function resetCapture() {
    setCapture({ origin: null, destination: null });
    onCancel?.();
  }

  return (
    <section className="spatial-v2" aria-label="Quadra espacial">
      <div className="spatial-v2-labels" aria-hidden="true">
        <span>SEU LADO</span>
        <span>ADVERSÁRIO</span>
      </div>
      <div
        className="spatial-v2-surface"
        role="button"
        tabIndex={0}
        aria-label="Quadra espacial clicável"
        onClick={handleSurfaceClick}
      >
        <span className="spatial-v2-attack-line" style={{ left: '33.3333%' }} />
        <span className="spatial-v2-net" />
        <span className="spatial-v2-attack-line" style={{ left: '66.6667%' }} />
        {origin && destination && (
          <svg className="spatial-v2-trajectory" aria-hidden="true">
            <line
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
      <p className="spatial-v2-instruction" role="status">
        {phase === 'origin'
          ? 'Marque a origem'
          : phase === 'destination'
            ? 'Marque o destino'
            : 'Trajetória registrada'}
      </p>
      <div className="spatial-v2-controls">
        <button type="button" onClick={resetCapture}>
          Refazer
        </button>
        <button type="button" onClick={resetCapture}>
          Cancelar
        </button>
      </div>
    </section>
  );
}

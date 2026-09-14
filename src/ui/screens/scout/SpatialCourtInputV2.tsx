import { useState, type MouseEvent } from 'react';
import type { Skill } from '../../../domain/scout/entities/Skill';
import type { SpatialMetadata } from '../../../domain/scout/spatial/SpatialMetadata';
import { SpatialCourtSurface } from './SpatialCourtSurface';

export interface SpatialCourtInputV2Props {
  // These props remain for the existing consumer; this geometry-only stage does not use them.
  readonly skill?: Skill;
  readonly isEnabled: boolean;
  readonly executingLabel?: string;
  readonly onConfirm?: (spatial: SpatialMetadata) => void;
  readonly onReset?: () => void;
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

export function SpatialCourtInputV2({ isEnabled, onConfirm, onReset, onCancel }: SpatialCourtInputV2Props) {
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

  function resetCapture(callback?: () => void) {
    setCapture({ origin: null, destination: null });
    callback?.();
  }

  return (
    <section className="spatial-v2" aria-label="Quadra espacial">
      <div className="spatial-v2-labels" aria-hidden="true">
        <span>SEU LADO</span>
        <span>ADVERSÁRIO</span>
      </div>
      <SpatialCourtSurface
        origin={origin}
        destination={destination}
        surfaceProps={{
          role: 'button',
          tabIndex: 0,
          'aria-label': 'Quadra espacial clicável',
          onClick: handleSurfaceClick,
        }}
      />
      <p className="spatial-v2-instruction" role="status">
        {phase === 'origin'
          ? 'Marque a origem'
          : phase === 'destination'
            ? 'Marque o destino'
            : 'Trajetória registrada'}
      </p>
      <div className="spatial-v2-controls">
        <button type="button" aria-label="Refazer trajetória" onClick={() => resetCapture(onReset)}>
          Refazer trajetória
        </button>
        <button type="button" onClick={() => resetCapture(onCancel)}>
          Cancelar rascunho
        </button>
      </div>
    </section>
  );
}

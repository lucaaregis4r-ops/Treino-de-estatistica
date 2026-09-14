import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { framePointToSpatialPoint, type CourtRectangle } from '../../../domain/scout/tactical/CourtGeometry';
import type { SpatialMetadata, SpatialPoint } from '../../../domain/scout/spatial/SpatialMetadata';
import { SpatialCourtSurface } from './SpatialCourtSurface';
import './GestureCourtInput.css';

export interface GestureCourtInputProps {
  readonly isEnabled?: boolean;
  readonly onTrajectory?: (trajectory: SpatialMetadata) => void;
  readonly teamNames?: readonly [string, string];
}

type CapturedPoint = {
  readonly spatial: SpatialPoint;
  readonly display: { readonly x: number; readonly y: number };
  readonly clientX: number;
  readonly clientY: number;
};
type GesturePoints = { readonly origin: CapturedPoint; readonly destination: CapturedPoint };
const MINIMUM_DRAG_DISTANCE = 4;

function rectangle(element: HTMLElement): CourtRectangle {
  const bounds = element.getBoundingClientRect();
  return { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height };
}

export function GestureCourtInput({ isEnabled = true, onTrajectory, teamNames }: GestureCourtInputProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const courtRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const startRef = useRef<CapturedPoint | null>(null);
  const [draft, setDraft] = useState<GesturePoints | null>(null);
  const [dragging, setDragging] = useState(false);

  if (!isEnabled) return null;

  function point(event: ReactPointerEvent<HTMLDivElement>): CapturedPoint | undefined {
    const frame = frameRef.current;
    const court = courtRef.current;
    if (!frame || !court) return undefined;
    const frameRectangle = rectangle(frame);
    const courtRectangle = rectangle(court);
    return {
      spatial: framePointToSpatialPoint(event.clientX, event.clientY, {
        frame: frameRectangle,
        court: courtRectangle,
      }),
      display: {
        x: courtRectangle.width > 0 ? (event.clientX - courtRectangle.left) / courtRectangle.width : 0,
        y: courtRectangle.height > 0 ? (event.clientY - courtRectangle.top) / courtRectangle.height : 0,
      },
      clientX: event.clientX,
      clientY: event.clientY,
    };
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerId.current !== null) return;
    const next = point(event);
    if (!next) return;
    pointerId.current = event.pointerId;
    startRef.current = next;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
    setDraft({ origin: next, destination: next });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = startRef.current;
    if (pointerId.current !== event.pointerId || !start) return;
    const next = point(event);
    if (next) setDraft({ origin: start, destination: next });
  }

  function finish(event: ReactPointerEvent<HTMLDivElement>) {
    const start = startRef.current;
    if (pointerId.current !== event.pointerId || !start) return;
    const next = point(event);
    pointerId.current = null;
    startRef.current = null;
    setDragging(false);
    const distance = next ? Math.hypot(next.clientX - start.clientX, next.clientY - start.clientY) : 0;
    if (next && distance >= MINIMUM_DRAG_DISTANCE) {
      const trajectory = { origin: start.spatial, destination: next.spatial };
      setDraft({ origin: start, destination: next });
      onTrajectory?.(trajectory);
    } else setDraft(null);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function cancel(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerId.current !== event.pointerId) return;
    pointerId.current = null;
    startRef.current = null;
    setDragging(false);
    setDraft(null);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  return (
    <section className="gesture-court" aria-label="Quadra para registrar trajetória gestual">
      {teamNames && <div className="gesture-court-teams"><span>{teamNames[0]} · esquerda</span><span>{teamNames[1]} · direita</span></div>}
      <div
        ref={frameRef}
        className="gesture-court-frame"
        data-dragging={dragging || undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finish}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
        role="application"
        aria-label="Arraste para desenhar uma trajetória"
      >
        <SpatialCourtSurface
          surfaceRef={courtRef}
          allowOutZone
          origin={draft?.origin.display}
          destination={draft?.destination.display}
          surfaceProps={{ 'aria-hidden': true }}
        />
      </div>
      <p className="gesture-court-hint" role="status">Arraste da origem até o destino</p>
    </section>
  );
}

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { framePointToSpatialPoint, type CourtRectangle } from '../../../domain/scout/tactical/CourtGeometry';
import type { SpatialMetadata, SpatialPoint } from '../../../domain/scout/spatial/SpatialMetadata';
import { SpatialCourtSurface } from './SpatialCourtSurface';
import './GestureCourtInput.css';
import { FootballCourtSurface } from './FootballCourtSurface';

export interface GestureCourtInputProps {
  readonly initialOrigin?: { readonly x: number; readonly y: number };
  readonly initialDestination?: { readonly x: number; readonly y: number };
  readonly isEnabled?: boolean;
  readonly onTrajectory?: (trajectory: SpatialMetadata) => void;
  readonly teamNames?: readonly [string, string];
  readonly sport?: 'volleyball' | 'football';
  readonly flipped?: boolean;
  readonly captureMode?: 'trajectory' | 'point';
  /** Called as soon as a valid field gesture begins, before its request is queued. */
  readonly onCaptureStart?: () => void;
  /** A deliberately short, non-tracking trail rendered behind the active gesture. */
  readonly recentPoints?: readonly { readonly x: number; readonly y: number }[];
  /** An optional local-review cue, never an inferred trajectory. */
  readonly suggestedSegment?: { readonly origin: { readonly x: number; readonly y: number }; readonly destination: { readonly x: number; readonly y: number } };
  readonly pointHint?: string;
  readonly disabledHint?: string;
  readonly onCancel?: () => void;
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

export function GestureCourtInput({ initialOrigin, initialDestination, isEnabled = true, onTrajectory, teamNames, sport = 'volleyball', flipped = false, captureMode = 'trajectory', onCaptureStart, recentPoints, suggestedSegment, pointHint, disabledHint, onCancel }: GestureCourtInputProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const courtRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const startRef = useRef<CapturedPoint | null>(null);
  const clickOriginRef = useRef<CapturedPoint | null>(null);
  const [draft, setDraft] = useState<GesturePoints | null>(null);
  const [dragging, setDragging] = useState(false);
  const [originPending, setOriginPending] = useState(false);
  const [keyboardPoint, setKeyboardPoint] = useState({ x: .5, y: .5 });

  if (!isEnabled && sport !== 'football') return null;

  function point(event: ReactPointerEvent<HTMLDivElement>): CapturedPoint | undefined {
    const frame = frameRef.current;
    const court = courtRef.current;
    if (!frame || !court) return undefined;
    const frameRectangle = rectangle(frame);
    const courtRectangle = rectangle(court);
    const rawSpatial = framePointToSpatialPoint(event.clientX, event.clientY, {
        frame: frameRectangle,
        court: courtRectangle,
      });
    const rawDisplay = {
      x: courtRectangle.width > 0 ? Math.max(0, Math.min(1, (event.clientX - courtRectangle.left) / courtRectangle.width)) : 0,
      y: courtRectangle.height > 0 ? Math.max(0, Math.min(1, (event.clientY - courtRectangle.top) / courtRectangle.height)) : 0,
    };
    const shouldFlip = sport === 'football' && flipped;
    return {
      spatial: shouldFlip ? { ...rawSpatial, x: 1 - rawSpatial.x, y: 1 - rawSpatial.y } : rawSpatial,
      display: shouldFlip ? { x: 1 - rawDisplay.x, y: 1 - rawDisplay.y } : rawDisplay,
      clientX: event.clientX,
      clientY: event.clientY,
    };
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isEnabled) return;
    if (pointerId.current !== null) return;
    const next = point(event);
    if (!next) return;
    pointerId.current = event.pointerId;
    startRef.current = next;
    onCaptureStart?.();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
    setDraft({ origin: clickOriginRef.current ?? next, destination: next });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isEnabled) return;
    const start = startRef.current;
    if (pointerId.current !== event.pointerId || !start) return;
    const next = point(event);
    if (next) setDraft({ origin: start, destination: next });
  }

  function finish(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isEnabled) return;
    const start = startRef.current;
    if (pointerId.current !== event.pointerId || !start) return;
    const next = point(event);
    pointerId.current = null;
    startRef.current = null;
    setDragging(false);
    const distance = next ? Math.hypot(next.clientX - start.clientX, next.clientY - start.clientY) : 0;
    if (next && distance >= MINIMUM_DRAG_DISTANCE) {
      clickOriginRef.current = null;
      setOriginPending(false);
      const trajectory = { origin: start.spatial, destination: next.spatial };
      setDraft({ origin: start, destination: next });
      onTrajectory?.(trajectory);
    } else if (next && sport === 'football' && captureMode === 'point') {
      clickOriginRef.current = null;
      setOriginPending(false);
      setDraft({ origin: next, destination: next });
      onTrajectory?.({ origin: next.spatial, destination: next.spatial });
    } else if (next && sport === 'football') {
      const clickOrigin = clickOriginRef.current;
      if (clickOrigin) {
        clickOriginRef.current = null;
        setOriginPending(false);
        setDraft({ origin: clickOrigin, destination: next });
        onTrajectory?.({ origin: clickOrigin.spatial, destination: next.spatial });
      } else {
        clickOriginRef.current = next;
        setOriginPending(true);
        setDraft({ origin: next, destination: next });
      }
    } else setDraft(null);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function cancel(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerId.current !== event.pointerId) return;
    pointerId.current = null;
    startRef.current = null;
    setDragging(false);
    clickOriginRef.current = null;
    setOriginPending(false);
    setDraft(null);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  return (
    <section className="gesture-court" data-sport={sport} aria-label={sport === 'football' ? 'Campo para registrar localização' : 'Quadra para registrar trajetória gestual'}>
      {teamNames && <div className="gesture-court-teams"><span>{teamNames[0]} · esquerda</span><span>{teamNames[1]} · direita</span></div>}
      <div
        ref={frameRef}
        className="gesture-court-frame"
        data-dragging={dragging || undefined}
        data-disabled={!isEnabled || undefined}
        data-sport={sport}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finish}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            clickOriginRef.current = null;
            setOriginPending(false);
            setDraft(null);
            onCancel?.();
            return;
          }
          if (sport !== 'football' || captureMode !== 'point' || !isEnabled) return;
          const delta = .04;
          const next = event.key === 'ArrowLeft' ? { ...keyboardPoint, x: Math.max(0, keyboardPoint.x - delta) }
            : event.key === 'ArrowRight' ? { ...keyboardPoint, x: Math.min(1, keyboardPoint.x + delta) }
              : event.key === 'ArrowUp' ? { ...keyboardPoint, y: Math.max(0, keyboardPoint.y - delta) }
                : event.key === 'ArrowDown' ? { ...keyboardPoint, y: Math.min(1, keyboardPoint.y + delta) }
                  : undefined;
          if (next) {
            event.preventDefault();
            setKeyboardPoint(next);
            setDraft({ origin: { spatial: { surface: 'court', ...next }, display: next, clientX: 0, clientY: 0 }, destination: { spatial: { surface: 'court', ...next }, display: next, clientX: 0, clientY: 0 } });
            return;
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onCaptureStart?.();
            const stored = flipped ? { x: 1 - keyboardPoint.x, y: 1 - keyboardPoint.y } : keyboardPoint;
            onTrajectory?.({ origin: { surface: 'court', ...stored }, destination: { surface: 'court', ...stored } });
          }
        }}
        tabIndex={isEnabled ? 0 : -1}
        role="application"
        aria-disabled={!isEnabled || undefined}
        aria-label={sport === 'football' ? (captureMode === 'point' ? 'Campo: clique para registrar um marco; use setas e Enter no teclado' : 'Campo: clique origem e destino ou arraste') : 'Arraste para desenhar uma trajetória'}
      >
        {sport === 'football' ? <FootballCourtSurface surfaceRef={courtRef} origin={draft?.origin.display ?? initialOrigin} destination={draft?.destination.display ?? initialDestination} flipped={flipped} recentPoints={recentPoints} suggestedSegment={suggestedSegment} /> :
          <SpatialCourtSurface surfaceRef={courtRef} allowOutZone origin={draft?.origin.display} destination={draft?.destination.display} surfaceProps={{ 'aria-hidden': true }} />}
      </div>
      <p className="gesture-court-hint" role="status">
        {sport === 'football' ? (!isEnabled ? (disabledHint ?? 'Campo visível. Escolha uma ação espacial para marcar.') : captureMode === 'point' ? (pointHint ?? 'Clique na localização da ação.') : originPending ? 'Origem marcada. Clique no destino ou pressione Escape.' : 'Clique na origem e no destino, ou arraste.') : 'Arraste da origem até o destino'}
      </p>
    </section>
  );
}

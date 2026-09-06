import type { PointerEvent } from 'react';
import type { Skill } from '../../../domain/scout/entities/Skill';
import {
  courtLocationToDisplayPoint,
  displayPointToCourtLocation,
} from '../../../domain/scout/tactical/CourtGeometry';
import type { ZoneSystemProfile } from '../../../domain/scout/tactical/ZoneSystemProfile';
import type { CourtLocation } from '../../../domain/scout/tactical/TacticalMetadata';
import { normalizedCourtPoint } from './courtGeometry';

/** Interaction step of the contextual mini court. */
export type MiniCourtStep = 'hidden' | 'awaitingOrigin' | 'awaitingPoint' | 'awaitingDestination' | 'readyToConfirm';

export interface MiniCourtCapture {
  readonly origin: CourtLocation;
  readonly target: CourtLocation;
}

interface MiniCourtProps {
  readonly profile: ZoneSystemProfile;
  readonly skill: Skill;
  readonly captureMode: 'point' | 'trajectory';
  readonly step: MiniCourtStep;
  readonly origin?: CourtLocation;
  readonly target?: CourtLocation;
  readonly onOrigin: (location: CourtLocation) => void;
  readonly onTarget: (location: CourtLocation) => void;
  readonly onConfirm: (capture: MiniCourtCapture) => void;
  readonly onCancel: () => void;
  readonly onReset: () => void;
}

function hint(step: MiniCourtStep, skill: Skill): string {
  switch (step) {
    case 'awaitingOrigin':
      return `Toque na quadra para marcar a origem de ${skill}`;
    case 'awaitingDestination':
      return 'Toque onde a bola terminou para marcar o destino';
    case 'readyToConfirm':
      return 'Enter confirma · Esc cancela · R refaz';
    default:
      return '';
  }
}

function displayedPoint(
  location: CourtLocation | undefined,
  side: 'origin' | 'target',
  profile: ZoneSystemProfile,
): { x: number; y: number } | undefined {
  if (!location) return undefined;
  const point = courtLocationToDisplayPoint(location, side, profile);
  if (point.x === undefined || point.y === undefined) return undefined;
  return { x: point.x * 100, y: point.y * 100 };
}

export function MiniCourt({
  profile,
  skill,
  step,
  origin,
  target,
  onOrigin,
  onTarget,
  onConfirm,
  onCancel,
  onReset,
}: MiniCourtProps) {
  function locate(event: PointerEvent<HTMLDivElement>, side: 'origin' | 'target'): CourtLocation {
    const displayed = normalizedCourtPoint(
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
    );
    return displayPointToCourtLocation(displayed, side, profile);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (step === 'awaitingOrigin') {
      onOrigin(locate(event, 'origin'));
      return;
    }
    if (step === 'awaitingDestination') {
      onTarget(locate(event, 'target'));
    }
  }

  const originPoint = displayedPoint(origin, 'origin', profile);
  const targetPoint = displayedPoint(target, 'target', profile);

  return (
    <section className="mini-court" aria-label={`Captura espacial de ${skill}`}>
      <div
        className="mini-court-canvas"
        role="button"
        tabIndex={0}
        aria-label={hint(step, skill)}
        onPointerDown={handlePointerDown}
      >
        <span className="court-net" aria-hidden="true" />
        <span className="court-team-label origin" aria-hidden="true">
          origem
        </span>
        <span className="court-team-label target" aria-hidden="true">
          destino
        </span>
        {originPoint && (
          <span
            className="mini-point origin"
            style={{ left: `${originPoint.x}%`, top: `${originPoint.y}%` }}
            aria-hidden="true"
          />
        )}
        {targetPoint && (
          <span
            className="mini-point target"
            style={{ left: `${targetPoint.x}%`, top: `${targetPoint.y}%` }}
            aria-hidden="true"
          />
        )}
        {originPoint && targetPoint && (
          <svg
            className="mini-line"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line x1={originPoint.x} y1={originPoint.y} x2={targetPoint.x} y2={targetPoint.y} />
          </svg>
        )}
      </div>
      <div className="mini-court-legend" aria-label="Referência das zonas da quadra">
        <span>Rede</span>
        <strong>Frente: 4 · 3 · 2</strong>
        <strong>Fundo: 5 · 6 · 1</strong>
      </div>
      <small className="mini-court-hint" aria-live="polite">
        {hint(step, skill)}
      </small>
      <div className="mini-court-actions">
        <button type="button" onClick={onReset} disabled={step !== 'readyToConfirm'}>
          Refazer
        </button>
        <button type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button
          type="button"
          className="button primary"
          onClick={() => origin && target && onConfirm({ origin, target })}
          disabled={step !== 'readyToConfirm'}
        >
          Confirmar
        </button>
      </div>
    </section>
  );
}
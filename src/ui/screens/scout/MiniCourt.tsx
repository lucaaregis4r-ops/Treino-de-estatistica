import type { PointerEvent } from 'react';
import type { Skill } from '../../../domain/scout/entities/Skill';
import { canonicalCourtLocation } from '../../../domain/scout/tactical/CourtGeometry';
import type { CourtLocation } from '../../../domain/scout/tactical/TacticalMetadata';
import type { ZoneSystemProfile } from '../../../domain/scout/tactical/ZoneSystemProfile';
import { normalizedCourtPoint } from './courtGeometry';

export type MiniCourtStep =
  | 'hidden'
  | 'awaitingPoint'
  | 'awaitingOrigin'
  | 'awaitingDestination'
  | 'readyToConfirm';

export interface MiniCourtCapture {
  readonly origin: CourtLocation;
  readonly target?: CourtLocation;
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
  readonly executingTeamSide: 'left' | 'right';
  readonly opposingTeamSide: 'left' | 'right';
}

const ZONES = [
  ['4', 16.7, 25],
  ['3', 50, 25],
  ['2', 83.3, 25],
  ['5', 16.7, 75],
  ['6', 50, 75],
  ['1', 83.3, 75],
] as const;

function getSideX(side: 'left' | 'right'): number {
  return side === 'left' ? 8 : 92;
}

function hint(step: MiniCourtStep, skill: Skill, captureMode: 'point' | 'trajectory'): string {
  if (step === 'awaitingPoint') return `Clique no local do contato de ${skill}`;
  if (step === 'awaitingOrigin') return 'Clique na origem';
  if (step === 'awaitingDestination') return 'Clique no destino';
  if (step === 'readyToConfirm') return 'Enter confirma · Esc cancela · R refaz';
  return captureMode === 'point' ? 'Marque o local do contato' : 'Marque a origem';
}

function displayedPoint(location: CourtLocation | undefined) {
  if (location?.x === undefined || location.y === undefined) return undefined;
  return { x: location.x * 100, y: location.y * 100 };
}

function applyCourtSideRule(
  location: CourtLocation,
  executingSide: 'left' | 'right',
  mode: 'point' | 'trajectory',
): CourtLocation {
  if (!location.x && !location.y) return location;
  const x = location.x ?? 0.5;
  const y = location.y ?? 0.5;
  // For trajectory: if origin is on executing side, destination must be on opposing side
  // Simple normalization: ensure origin x is on the correct side
  const adjustedX = mode === 'trajectory' && x !== undefined
    ? (executingSide === 'left' ? Math.min(x, 0.5) : Math.max(x, 0.5))
    : x;
  return { ...location, x: adjustedX, y };
}

export function MiniCourt({
  profile,
  skill,
  captureMode,
  step,
  origin,
  target,
  onOrigin,
  onTarget,
  onConfirm,
  onCancel,
  onReset,
  executingTeamSide,
  opposingTeamSide,
}: MiniCourtProps) {
  function locate(event: PointerEvent<HTMLDivElement>): CourtLocation {
    const point = normalizedCourtPoint(
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
    );
    return canonicalCourtLocation(point, 'canonical', profile);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (step === 'awaitingPoint' || step === 'awaitingOrigin') {
      onOrigin(applyCourtSideRule(locate(event), executingTeamSide, captureMode!));
    } else if (step === 'awaitingDestination') {
      onTarget(applyCourtSideRule(locate(event), executingTeamSide, captureMode!));
    }
  }

  const originPoint = displayedPoint(origin);
  const targetPoint = displayedPoint(target);
  const message = hint(step, skill, captureMode);

  const sideLabelClass = (side: 'team' | 'opponent') => {
    const cssSide = side === 'team' ? 'team' : 'opponent';
    return `mini-court-side-label ${cssSide}`;
  };

  return (
    <section className="mini-court" aria-label={`Captura espacial de ${skill}`}>
      <div className="mini-court-canvas" role="button" tabIndex={0} aria-label={message} onPointerDown={handlePointerDown}>
        <span className="mini-court-net" aria-hidden="true" />
        <span className={sideLabelClass('team')} aria-hidden="true" style={{ left: `${getSideX(executingTeamSide)}%` }}>Seu lado</span>
        <span className={sideLabelClass('opponent')} aria-hidden="true" style={{ left: `${getSideX(opposingTeamSide)}%` }}>Lado adversário</span>
        <span className="mini-court-side-label front" aria-hidden="true">frente</span>
        <span className="mini-court-side-label back" aria-hidden="true">fundo</span>
        {ZONES.map(([zone, x, y]) => (
          <span key={zone} className={`mini-court-zone-label z${zone}`} style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true">
            {zone}
          </span>
        ))}
        {originPoint && (
          <span className={`mini-point ${executingTeamSide === 'left' ? 'origin-left' : 'origin-right'}`} style={{ left: `${originPoint.x}%`, top: `${originPoint.y}%` }} aria-hidden="true" />
        )}
        {targetPoint && (
          <span className={`mini-point ${captureMode === 'trajectory' ? (targetPoint.x! < 50 ? 'target-opponent' : 'target-team') : 'target'}`} style={{ left: `${targetPoint.x}%`, top: `${targetPoint.y}%` }} aria-hidden="true" />
        )}
        {originPoint && targetPoint && captureMode === 'trajectory' && (
          <svg className="mini-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line x1={originPoint.x} y1={originPoint.y} x2={targetPoint.x} y2={targetPoint.y} stroke="currentColor" strokeWidth={1} />
          </svg>
        )}
      </div>
      <div className="mini-court-legend" aria-label="Referência das zonas da quadra">
        <span>Rede</span>
        <strong>Frente: 4 · 3 · 2</strong>
        <strong>Fundo: 5 · 6 · 1</strong>
      </div>
      <small className="mini-court-hint" aria-live="polite">{message}</small>
      <div className="mini-court-actions">
        <button type="button" onClick={onReset} disabled={step !== 'readyToConfirm'}>Refazer</button>
        <button type="button" onClick={onCancel}>Cancelar</button>
        <button type="button" className="button primary" onClick={() => origin && onConfirm({ origin, ...(target ? { target } : {}) })} disabled={step !== 'readyToConfirm'}>
          Confirmar
        </button>
      </div>
    </section>
  );
}

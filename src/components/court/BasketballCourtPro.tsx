import React, { useEffect, useRef, useState } from 'react';
import type { CourtEventPoint, CourtVector } from './VolleyballCourtPro';
import './BasketballCourtPro.css';

export interface BasketballZoneSummaryItem {
  readonly zone: string;
  readonly name: string;
  readonly total: number;
  readonly made: number;
  readonly missed: number;
  readonly points: number;
  readonly fgPercent: number;
}

export interface BasketballCourtProProps {
  readonly events: readonly CourtEventPoint[];
  readonly vectors?: readonly CourtVector[];
  readonly title?: string;
  readonly teamName?: string;
  readonly opponentName?: string;
  readonly zoneSummary?: readonly BasketballZoneSummaryItem[];
  readonly onCourtClick?: (coords: { x: number; y: number }) => void;
  readonly selectedVectorIndex?: number;
}

export const BasketballCourtPro: React.FC<BasketballCourtProProps> = ({
  events,
  vectors = [],
  title,
  teamName = 'Nossa Equipe',
  opponentName = 'Adversário',
  zoneSummary = [],
  onCourtClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredEvent, setHoveredEvent] = useState<CourtEventPoint | null>(null);
  const [displayMode, setDisplayMode] = useState<'both' | 'vectors' | 'heat'>('both');

  const madeCount = events.filter((e) => e.type === 'point').length;
  const missedCount = events.filter((e) => e.type === 'error').length;
  const otherCount = events.filter((e) => e.type === 'rally').length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (displayMode === 'vectors') return;

    // Thermal density radial gradients
    events.forEach((pt) => {
      const px = pt.xNorm * w;
      const py = pt.yNorm * h;
      const radius = Math.max(22, 34 * pt.weight);

      const grad = ctx.createRadialGradient(px, py, 2, px, py, radius);
      if (pt.type === 'point') {
        grad.addColorStop(0, 'rgba(16, 185, 129, 0.45)'); // Menta
        grad.addColorStop(0.5, 'rgba(16, 185, 129, 0.16)');
        grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      } else if (pt.type === 'error') {
        grad.addColorStop(0, 'rgba(244, 63, 94, 0.48)'); // Coral
        grad.addColorStop(0.5, 'rgba(244, 63, 94, 0.18)');
        grad.addColorStop(1, 'rgba(244, 63, 94, 0)');
      } else {
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.45)'); // Ciano / turnover
        grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.16)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [events, displayMode]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onCourtClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onCourtClick({ x, y });
  };

  return (
    <div className="basketball-court-pro-wrap">
      {/* Header with Title and Mode Switcher */}
      <div className="basketball-court-pro-header">
        {title && <span className="basketball-court-pro-title">{title}</span>}
        <div className="court-mode-toggle" role="group" aria-label="Modo de visualização da quadra">
          <button
            type="button"
            className={`court-mode-btn ${displayMode === 'both' ? 'active' : ''}`}
            onClick={() => setDisplayMode('both')}
          >
            Vetores + Calor
          </button>
          <button
            type="button"
            className={`court-mode-btn ${displayMode === 'vectors' ? 'active' : ''}`}
            onClick={() => setDisplayMode('vectors')}
          >
            Setas Táticas
          </button>
          <button
            type="button"
            className={`court-mode-btn ${displayMode === 'heat' ? 'active' : ''}`}
            onClick={() => setDisplayMode('heat')}
          >
            Mapa Térmico
          </button>
        </div>
      </div>

      {/* Court Team Sides Indicator */}
      <div className="court-team-sides" aria-label="Lados e estatísticas rápidas">
        <div className="court-side-badge side-left">
          <span className="side-arrow" aria-hidden="true">🏀</span>
          <div className="side-info">
            <strong>{teamName}</strong>
            <span className="side-role">{events.length} lances mapeados</span>
          </div>
        </div>

        <div className="court-summary-stats">
          <span className="badge-made">✓ {madeCount} Cestas</span>
          <span className="badge-missed">✗ {missedCount} Erros</span>
          {otherCount > 0 && <span className="badge-other">◆ {otherCount} Perdas</span>}
        </div>

        <div className="court-side-badge side-right">
          <div className="side-info text-right">
            <strong>{opponentName}</strong>
            <span className="side-role">Adversário</span>
          </div>
        </div>
      </div>

      {/* Interactive Court Container (28x15 aspect ratio) */}
      <div
        className="basketball-court-pro-canvas-container"
        onPointerDown={handlePointerDown}
      >
        {/* Layer 0: Official FIBA Court Lines (SVG 280 x 150) */}
        <svg
          className="basketball-court-pro-lines"
          viewBox="0 0 280 150"
          aria-hidden="true"
        >
          {/* Court Surface */}
          <rect x="0" y="0" width="280" height="150" fill="#151E2E" />

          {/* Paint Zones Fill (Garrafões) */}
          <rect x="0" y="45.5" width="58" height="59" fill="#1E293B" opacity="0.8" />
          <rect x="222" y="45.5" width="58" height="59" fill="#1E293B" opacity="0.8" />

          {/* Boundary and Center Line */}
          <rect x="0.5" y="0.5" width="279" height="149" fill="none" stroke="#475569" strokeWidth="1.5" />
          <line x1="140" y1="0" x2="140" y2="150" stroke="#475569" strokeWidth="1.5" />
          <circle cx="140" cy="75" r="18" fill="none" stroke="#475569" strokeWidth="1.5" />

          {/* Free Throw Keys and Circles */}
          <rect x="0" y="45.5" width="58" height="59" fill="none" stroke="#64748B" strokeWidth="1.2" />
          <rect x="222" y="45.5" width="58" height="59" fill="none" stroke="#64748B" strokeWidth="1.2" />
          <circle cx="58" cy="75" r="18" fill="none" stroke="#64748B" strokeWidth="1.2" />
          <circle cx="222" cy="75" r="18" fill="none" stroke="#64748B" strokeWidth="1.2" />

          {/* FIBA 3-Point Lines (6.75m arc + 0.9m straight corner lines) */}
          <path
            d="M 0 9 L 29.9 9 A 67.5 67.5 0 0 1 29.9 141 L 0 141 M 280 9 L 250.1 9 A 67.5 67.5 0 0 0 250.1 141 L 280 141"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1.6"
          />

          {/* Restricted Area Arcs (1.25m) */}
          <path d="M 15.75 62.5 A 12.5 12.5 0 0 1 15.75 87.5" fill="none" stroke="#64748B" strokeWidth="1" />
          <path d="M 264.25 62.5 A 12.5 12.5 0 0 0 264.25 87.5" fill="none" stroke="#64748B" strokeWidth="1" />

          {/* Backboards & Rims */}
          <line x1="12" y1="66" x2="12" y2="84" stroke="#CBD5E1" strokeWidth="2" />
          <circle cx="15.75" cy="75" r="2.2" fill="#F97316" stroke="#FFFFFF" strokeWidth="0.8" />
          <line x1="268" y1="66" x2="268" y2="84" stroke="#CBD5E1" strokeWidth="2" />
          <circle cx="264.25" cy="75" r="2.2" fill="#F97316" stroke="#FFFFFF" strokeWidth="0.8" />

          {/* Zone Guide Annotations */}
          <text x="26" y="24" className="court-zone-guide">3PT CANTO</text>
          <text x="26" y="132" className="court-zone-guide">3PT CANTO</text>
          <text x="75" y="77" className="court-zone-guide">GARRAFÃO</text>
          <text x="105" y="45" className="court-zone-guide">MEIA DISTÂNCIA</text>
          <text x="105" y="112" className="court-zone-guide">MEIA DISTÂNCIA</text>
        </svg>

        {/* Layer 1: Heatmap Canvas */}
        <canvas
          ref={canvasRef}
          width={840}
          height={450}
          className="basketball-court-pro-canvas"
        />

        {/* Layer 2: Vector Arrows and Event Dots (SVG 280 x 150) */}
        <svg
          className="basketball-court-pro-vector-overlay"
          viewBox="0 0 280 150"
          aria-hidden="true"
        >
          <defs>
            {/* Arrowhead Markers */}
            <marker
              id="basket-arrow-made"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#10B981" />
            </marker>
            <marker
              id="basket-arrow-missed"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#F43F5E" />
            </marker>
            <marker
              id="basket-arrow-other"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#38BDF8" />
            </marker>
          </defs>

          {/* Advantage Creation -> Finish Vector Arrows */}
          {(displayMode === 'both' || displayMode === 'vectors') &&
            vectors.map((vec, idx) => {
              const x1 = vec.from[0] * 280;
              const y1 = vec.from[1] * 150;
              const x2 = vec.to[0] * 280;
              const y2 = vec.to[1] * 150;

              const strokeColor =
                vec.outcome === 'kill'
                  ? '#10B981'
                  : vec.outcome === 'error'
                    ? '#F43F5E'
                    : '#38BDF8';

              const markerId =
                vec.outcome === 'kill'
                  ? 'basket-arrow-made'
                  : vec.outcome === 'error'
                    ? 'basket-arrow-missed'
                    : 'basket-arrow-other';

              return (
                <g key={`b-vec-${idx}`} className="court-vector-group">
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={strokeColor}
                    strokeWidth="2.4"
                    strokeDasharray={vec.outcome === 'rally' ? '4 2' : undefined}
                    markerEnd={`url(#${markerId})`}
                    opacity="0.9"
                  />
                  {/* Origin Circle */}
                  <circle
                    cx={x1}
                    cy={y1}
                    r="2.4"
                    fill="#FFFFFF"
                    stroke={strokeColor}
                    strokeWidth="1.2"
                  />
                </g>
              );
            })}

          {/* Shot Markers */}
          {events.map((pt, idx) => {
            const cx = pt.xNorm * 280;
            const cy = pt.yNorm * 150;
            const fillColor =
              pt.type === 'point'
                ? '#10B981'
                : pt.type === 'error'
                  ? '#F43F5E'
                  : '#38BDF8';

            return (
              <g
                key={`b-pt-${idx}`}
                className="court-event-point-group"
                onMouseEnter={() => setHoveredEvent(pt)}
                onMouseLeave={() => setHoveredEvent(null)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r="3.2"
                  fill={fillColor}
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredEvent && (
          <div
            className="court-hover-tooltip"
            style={{
              left: `${hoveredEvent.xNorm * 100}%`,
              top: `${hoveredEvent.yNorm * 100}%`,
            }}
          >
            <strong>{hoveredEvent.label ?? (hoveredEvent.type === 'point' ? 'Cesta' : 'Erro')}</strong>
          </div>
        )}
      </div>

      {/* Directional Zone Summary Cards */}
      {zoneSummary.length > 0 && (
        <div className="court-zone-summary-grid">
          {zoneSummary.map((item) => (
            <div key={item.zone} className="court-zone-card">
              <span className="zone-name">{item.name}</span>
              <div className="zone-metric">
                <strong className={item.fgPercent >= 50 ? 'text-mint' : item.fgPercent >= 35 ? 'text-cyan' : 'text-coral'}>
                  {item.fgPercent}%
                </strong>
                <small>{item.made}/{item.total} FGs · {item.points} pts</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

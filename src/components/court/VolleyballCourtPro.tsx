import React, { useEffect, useRef, useState } from 'react';
import './VolleyballCourtPro.css';

export interface CourtEventPoint {
  xNorm: number; // 0.0 (linha de fundo esquerda) a 1.0 (linha de fundo direita)
  yNorm: number; // 0.0 (lateral superior) a 1.0 (lateral inferior)
  weight: number; // Peso estatístico (1.0 normal, 1.8 para ponto)
  type: 'point' | 'error' | 'rally';
  label?: string;
}

export interface CourtVector {
  from: [number, number]; // [xNorm, yNorm]
  to: [number, number];   // [xNorm, yNorm]
  outcome: 'kill' | 'error' | 'rally';
  label?: string;
  count?: number;
}

export interface DirectionalSummaryItem {
  zone: string;
  name: string;
  total: number;
  kills: number;
  errors: number;
  continuity: number;
  killRate: number;
}

export interface VolleyballCourtProProps {
  events: CourtEventPoint[];
  vectors?: CourtVector[];
  selectedVector?: CourtVector; // Retrocompatibilidade
  title?: string;
  leftTeamLabel?: string;
  rightTeamLabel?: string;
  leftRoleLabel?: string;
  rightRoleLabel?: string;
  directionalSummary?: DirectionalSummaryItem[];
  subViewToggle?: {
    label: string;
    options: { id: string; label: string }[];
    activeId: string;
    onSelect: (id: string) => void;
  };
  onCourtClick?: (coords: { x: number; y: number }) => void;
}

export const VolleyballCourtPro: React.FC<VolleyballCourtProProps> = ({
  events,
  vectors,
  selectedVector,
  title,
  leftTeamLabel = 'Nossa Equipe',
  rightTeamLabel = 'Adversário',
  leftRoleLabel = 'Ataque',
  rightRoleLabel = 'Defesa / Alvo',
  directionalSummary = [],
  subViewToggle,
  onCourtClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredEvent, setHoveredEvent] = useState<CourtEventPoint | null>(null);

  // Unifica vetores múltiplos com o vetor único retrocompatível
  const allVectors: CourtVector[] = vectors && vectors.length > 0
    ? vectors
    : (selectedVector ? [selectedVector] : []);

  // Contagens dos tipos de desfecho
  const pointCount = events.filter((e) => e.type === 'point').length;
  const errorCount = events.filter((e) => e.type === 'error').length;
  const rallyCount = events.filter((e) => e.type === 'rally').length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Limpar o canvas
    ctx.clearRect(0, 0, w, h);

    // Pintar gradientes de densidade térmica direta (sem screen-blend para manter cores puras)
    events.forEach((pt) => {
      const px = pt.xNorm * w;
      const py = pt.yNorm * h;
      const radius = Math.max(20, 32 * pt.weight);

      const grad = ctx.createRadialGradient(px, py, 2, px, py, radius);
      if (pt.type === 'point') {
        grad.addColorStop(0, 'rgba(16, 185, 129, 0.45)'); // Menta vibrante
        grad.addColorStop(0.5, 'rgba(16, 185, 129, 0.18)');
        grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      } else if (pt.type === 'error') {
        grad.addColorStop(0, 'rgba(244, 63, 94, 0.50)'); // Coral erro
        grad.addColorStop(0.5, 'rgba(244, 63, 94, 0.20)');
        grad.addColorStop(1, 'rgba(244, 63, 94, 0)');
      } else {
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.45)'); // Ciano continuidade
        grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.18)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [events]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onCourtClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onCourtClick({ x, y });
  };

  return (
    <div className="volleyball-court-pro-wrap">
      {/* Cabeçalho do Card */}
      {title && <div className="volleyball-court-pro-title">{title}</div>}

      {/* Alternância de Sub-Visualização (ex: Ataques vs Passes) */}
      {subViewToggle && (
        <div className="court-subview-toggle" role="group" aria-label={subViewToggle.label}>
          {subViewToggle.options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`court-subview-btn ${subViewToggle.activeId === opt.id ? 'active' : ''}`}
              onClick={() => subViewToggle.onSelect(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Indicação Clara dos Lados da Quadra */}
      <div className="court-team-sides" aria-label="Orientação da quadra">
        <div className="court-side-badge side-left">
          <span className="side-arrow" aria-hidden="true">⬅️</span>
          <div className="side-info">
            <strong>{leftTeamLabel}</strong>
            <span className="side-role">{leftRoleLabel}</span>
          </div>
        </div>

        <div className="court-net-indicator">
          <span className="net-line-dash" />
          <span className="net-label">REDE CENTRAL</span>
          <span className="net-line-dash" />
        </div>

        <div className="court-side-badge side-right">
          <div className="side-info text-right">
            <strong>{rightTeamLabel}</strong>
            <span className="side-role">{rightRoleLabel}</span>
          </div>
          <span className="side-arrow" aria-hidden="true">➡️</span>
        </div>
      </div>

      {/* Área da Quadra Interativa */}
      <div
        className="volleyball-court-pro-canvas-container"
        onPointerDown={handlePointerDown}
      >
        {/* Camada 0: Linhas Oficiais da Quadra de Vôlei (SVG 180x90) */}
        <svg
          className="volleyball-court-pro-lines"
          viewBox="0 0 180 90"
          aria-hidden="true"
        >
          {/* Piso Esportivo Terracota Oficial */}
          <rect x="0" y="0" width="180" height="90" fill="#B8531E" />

          {/* Bordas e Linhas Limítrofes (5cm FIVB) */}
          <rect
            x="0"
            y="0"
            width="180"
            height="90"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.5"
          />

          {/* Linha Central / Rede */}
          <line
            x1="90"
            y1="0"
            x2="90"
            y2="90"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeDasharray="4 2"
          />

          {/* Postes da Rede */}
          <circle cx="90" cy="0" r="2" fill="#E2E8F0" />
          <circle cx="90" cy="90" r="2" fill="#E2E8F0" />

          {/* Linhas de 3 Metros (Linhas de Ataque FIVB) */}
          <line
            x1="60"
            y1="0"
            x2="60"
            y2="90"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="1.8"
          />
          <line
            x1="120"
            y1="0"
            x2="120"
            y2="90"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="1.8"
          />

          {/* Rótulos das Zonas FIVB Oficiais */}
          {/* Lado Esquerdo (Nossa Equipe): Fundo (x=30), Rede (x=75) */}
          <text x="30" y="24" className="zone-label">Z5</text>
          <text x="30" y="48" className="zone-label">Z6</text>
          <text x="30" y="72" className="zone-label">Z1</text>
          <text x="75" y="24" className="zone-label">Z4</text>
          <text x="75" y="48" className="zone-label">Z3</text>
          <text x="75" y="72" className="zone-label">Z2</text>

          {/* Lado Direito (Adversário / Alvo): Rede (x=105), Fundo (x=150) */}
          <text x="105" y="24" className="zone-label">Z2</text>
          <text x="105" y="48" className="zone-label">Z3</text>
          <text x="105" y="72" className="zone-label">Z4</text>
          <text x="150" y="24" className="zone-label">Z1</text>
          <text x="150" y="48" className="zone-label">Z6</text>
          <text x="150" y="72" className="zone-label">Z5</text>
        </svg>

        {/* Camada 1: Canvas de Densidade Térmica (Heatmap suave) */}
        <canvas
          ref={canvasRef}
          width={720}
          height={360}
          className="volleyball-court-pro-canvas"
        />

        {/* Camada 2: Vetores de Trajetória e Marcadores Nítidos (SVG 180x90 Unificado) */}
        <svg
          className="volleyball-court-pro-vector-overlay"
          viewBox="0 0 180 90"
          aria-hidden="true"
        >
          <defs>
            {/* Marcadores de Seta por Desfecho */}
            <marker
              id="arrow-kill"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#10B981" />
            </marker>
            <marker
              id="arrow-error"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#F43F5E" />
            </marker>
            <marker
              id="arrow-rally"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#38BDF8" />
            </marker>
          </defs>

          {/* Feixes de Trajetórias da Bola */}
          {allVectors.map((vec, idx) => {
            const x1 = vec.from[0] * 180;
            const y1 = vec.from[1] * 90;
            const x2 = vec.to[0] * 180;
            const y2 = vec.to[1] * 90;
            const markerId = vec.outcome === 'kill'
              ? 'arrow-kill'
              : vec.outcome === 'error'
                ? 'arrow-error'
                : 'arrow-rally';
            const strokeColor = vec.outcome === 'kill'
              ? '#10B981'
              : vec.outcome === 'error'
                ? '#F43F5E'
                : '#38BDF8';

            return (
              <g key={`vector-${idx}`} className="court-vector-group">
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={strokeColor}
                  strokeWidth="2.2"
                  strokeDasharray={vec.outcome === 'rally' ? '4 2' : undefined}
                  markerEnd={`url(#${markerId})`}
                  opacity="0.9"
                />
                {/* Ponto de Origem do Golpe */}
                <circle
                  cx={x1}
                  cy={y1}
                  r="2.2"
                  fill="#FFFFFF"
                  stroke={strokeColor}
                  strokeWidth="1"
                />
              </g>
            );
          })}

          {/* Marcadores Nítidos de Impacto no Chão */}
          {events.map((pt, idx) => {
            const cx = pt.xNorm * 180;
            const cy = pt.yNorm * 90;
            const fillColor = pt.type === 'point'
              ? '#10B981'
              : pt.type === 'error'
                ? '#F43F5E'
                : '#38BDF8';

            return (
              <g
                key={`target-${idx}`}
                className="court-target-dot"
                onMouseEnter={() => setHoveredEvent(pt)}
                onMouseLeave={() => setHoveredEvent(null)}
              >
                {/* Anel de impacto */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={pt.type === 'point' ? 4 : 3.5}
                  fill={fillColor}
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                />
                {/* Ponto central */}
                <circle cx={cx} cy={cy} r="1.5" fill="#FFFFFF" />
              </g>
            );
          })}
        </svg>

        {/* Tooltip ao passar o cursor sobre o impacto */}
        {hoveredEvent && (
          <div
            className="court-point-tooltip"
            style={{
              left: `${hoveredEvent.xNorm * 100}%`,
              top: `${hoveredEvent.yNorm * 100}%`,
            }}
          >
            <strong>
              {hoveredEvent.type === 'point'
                ? '🟢 Ponto Direto (Kill)'
                : hoveredEvent.type === 'error'
                  ? '🔴 Erro / Bloqueado'
                  : '🔵 Continuidade / Defesa'}
            </strong>
            {hoveredEvent.label && <span>{hoveredEvent.label}</span>}
          </div>
        )}
      </div>

      {/* Legenda de Desfechos com Contagens */}
      <div className="volleyball-court-pro-legend">
        <span>
          <i className="dot dot-kill" /> Ponto (Kill): <strong>{pointCount}</strong>
        </span>
        <span>
          <i className="dot dot-error" /> Erro / Bloqueio: <strong>{errorCount}</strong>
        </span>
        <span>
          <i className="dot dot-rally" /> Continuidade: <strong>{rallyCount}</strong>
        </span>
      </div>

      {/* Painel Tático de Tendências Direcionais */}
      {directionalSummary.length > 0 && (
        <div className="court-directional-summary">
          <div className="summary-heading">
            <span>🎯 Tendências de Direção ({directionalSummary.reduce((acc, s) => acc + s.total, 0)} bolas):</span>
          </div>
          <div className="summary-cards-grid">
            {directionalSummary.map((item) => (
              <div key={item.zone} className="summary-direction-card">
                <div className="dir-header">
                  <strong>{item.name}</strong>
                  <span
                    className={`dir-badge ${
                      item.killRate >= 50
                        ? 'high-rate'
                        : item.killRate > 0
                          ? 'mid-rate'
                          : 'low-rate'
                    }`}
                  >
                    {Math.round(item.killRate)}% Kill
                  </span>
                </div>
                <div className="dir-counts">
                  <span className="dir-vol">
                    {item.total} {item.total === 1 ? 'bola' : 'bolas'}
                  </span>
                  <div className="dir-pills">
                    {item.kills > 0 && <span className="pill pill-kill">{item.kills} pts</span>}
                    {item.continuity > 0 && <span className="pill pill-rally">{item.continuity} ralis</span>}
                    {item.errors > 0 && <span className="pill pill-error">{item.errors} err</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

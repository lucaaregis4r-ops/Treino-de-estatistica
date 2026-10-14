import React, { useMemo, useState } from 'react';
import type { WinProbabilityPoint, WinProbabilityReport } from '../../application/analytics/WinProbabilityService';
import './WinProbabilityChart.css';

export interface WinProbabilityChartProps {
  readonly winProbability?: WinProbabilityReport;
  readonly teams: readonly { id: string; name: string }[];
  readonly currentSet?: number | 'all';
  readonly onSelectPoint?: (point: WinProbabilityPoint) => void;
}

export const WinProbabilityChart: React.FC<WinProbabilityChartProps> = ({
  winProbability,
  teams,
  currentSet: initialSet = 'all',
  onSelectPoint,
}) => {
  const [selectedSet, setSelectedSet] = useState<number | 'all'>(initialSet);
  const [hoveredPoint, setHoveredPoint] = useState<WinProbabilityPoint | null>(null);

  const teamA = teams[0] ?? { id: 'team-a', name: 'Equipe A' };
  const teamB = teams[1] ?? { id: 'team-b', name: 'Equipe B' };

  const allPoints = winProbability?.points ?? [];

  const availableSets = useMemo(() => {
    return [...new Set(allPoints.map((p) => p.setNumber))].sort((a, b) => a - b);
  }, [allPoints]);

  const filteredPoints = useMemo(() => {
    if (selectedSet === 'all') return allPoints;
    return allPoints.filter((p) => p.setNumber === selectedSet);
  }, [allPoints, selectedSet]);

  const currentProbA = winProbability ? winProbability.teamA : 0.5;
  const currentProbB = winProbability ? winProbability.teamB : 0.5;

  // Maiores viradas / pontos decisivos
  const turningPoints = useMemo(() => {
    return filteredPoints
      .slice()
      .sort((a, b) => Math.abs(b.actionImpact ?? 0) - Math.abs(a.actionImpact ?? 0))
      .slice(0, 3);
  }, [filteredPoints]);

  if (!allPoints.length) {
    return (
      <div className="win-prob-empty">
        <p>Ainda não há dados suficientes de ralis para traçar a probabilidade de vitória.</p>
      </div>
    );
  }

  const width = 600;
  const height = 180;
  const paddingX = 12;
  const plotWidth = width - paddingX * 2;
  const n = filteredPoints.length;

  const getX = (index: number) => {
    if (n <= 1) return width / 2;
    return paddingX + (index / (n - 1)) * plotWidth;
  };

  const getY = (prob: number) => {
    return height - Math.max(0, Math.min(1, prob)) * height;
  };

  const lineAPath = filteredPoints.map((p, i) => `${getX(i)},${getY(p.teamA)}`).join(' ');
  const lineBPath = filteredPoints.map((p, i) => `${getX(i)},${getY(p.teamB)}`).join(' ');

  const areaAPath = n > 1
    ? `M ${getX(0)},${height / 2} ` +
      filteredPoints.map((p, i) => `L ${getX(i)},${getY(p.teamA)}`).join(' ') +
      ` L ${getX(n - 1)},${height / 2} Z`
    : '';

  return (
    <section className="win-prob-card" aria-label="Momentum e Probabilidade de Vitória">
      <header className="win-prob-header">
        <div>
          <span className="win-prob-eyebrow">Leitura Tática de Momentum</span>
          <h3 className="win-prob-title">Curva de Probabilidade de Vitória</h3>
          <p className="win-prob-subtitle">
            Evolução do favoritismo da partida rali a rali de acordo com a pontuação e os desfechos.
          </p>
        </div>

        <div className="win-prob-score-badge">
          <div className="win-prob-team-stat">
            <span className="team-name text-cobalt">{teamA.name}</span>
            <strong className="team-percent">{Math.round(currentProbA * 100)}%</strong>
          </div>
          <span className="score-vs">×</span>
          <div className="win-prob-team-stat">
            <strong className="team-percent">{Math.round(currentProbB * 100)}%</strong>
            <span className="team-name text-mint">{teamB.name}</span>
          </div>
        </div>

        {availableSets.length > 1 && (
          <div className="win-prob-set-filter" role="group" aria-label="Filtrar por set">
            <button
              type="button"
              className={selectedSet === 'all' ? 'active' : ''}
              onClick={() => setSelectedSet('all')}
            >
              Jogo Todo
            </button>
            {availableSets.map((s) => (
              <button
                key={s}
                type="button"
                className={selectedSet === s ? 'active' : ''}
                onClick={() => setSelectedSet(s)}
              >
                Set {s}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Gráfico SVG */}
      <div className="win-prob-chart-wrap">
        <svg
          className="win-prob-svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Gráfico de momentum da pontuação ao longo dos ralis"
        >
          <defs>
            <linearGradient id="gradTeamA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Linha Neutra 50% */}
          <line
            x1="0"
            y1={height / 2}
            x2={width}
            y2={height / 2}
            className="win-prob-midline"
            strokeDasharray="4 3"
          />

          {/* Rótulos dos eixos */}
          <text x="8" y="18" className="win-prob-axis-label">100% {teamA.name}</text>
          <text x="8" y={height / 2 - 4} className="win-prob-axis-label">50% Equilíbrio</text>
          <text x="8" y={height - 6} className="win-prob-axis-label">100% {teamB.name}</text>

          {/* Área sob a curva */}
          {areaAPath && <path d={areaAPath} fill="url(#gradTeamA)" />}

          {/* Linhas de Probabilidade */}
          <polyline className="win-prob-line win-prob-line-a" points={lineAPath} />
          <polyline className="win-prob-line win-prob-line-b" points={lineBPath} />

          {/* Pontos Interativos */}
          {filteredPoints.map((point, index) => {
            const cx = getX(index);
            const cy = getY(point.teamA);
            const isHovered = hoveredPoint === point;
            const isHighImpact = Math.abs(point.actionImpact ?? 0) >= 0.08;

            return (
              <g
                key={point.sequence}
                className="win-prob-point-group"
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
                onClick={() => onSelectPoint?.(point)}
                tabIndex={0}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6 : isHighImpact ? 4 : 2.5}
                  className={`win-prob-dot ${point.actionImpact && point.actionImpact >= 0 ? 'win-prob-dot-a' : 'win-prob-dot-b'} ${isHighImpact ? 'high-impact' : ''}`}
                />
              </g>
            );
          })}
        </svg>

        {hoveredPoint && (
          <div className="win-prob-tooltip">
            <strong>Set {hoveredPoint.setNumber} · Ponto #{hoveredPoint.sequence}</strong>
            <span>Placar: {hoveredPoint.scoreTeamA} × {hoveredPoint.scoreTeamB}</span>
            {hoveredPoint.actionSkill && <span>Fundamento: {hoveredPoint.actionSkill}</span>}
            <span>
              Impacto no jogo:{' '}
              <b className={hoveredPoint.actionImpact && hoveredPoint.actionImpact >= 0 ? 'text-cobalt' : 'text-coral'}>
                {(hoveredPoint.actionImpact ?? 0) > 0 ? '+' : ''}
                {Math.round((hoveredPoint.actionImpact ?? 0) * 100)}%
              </b>
            </span>
          </div>
        )}
      </div>

      {/* Momentos Decisivos / Turning Points */}
      {turningPoints.length > 0 && (
        <div className="win-prob-turning-points">
          <span className="turning-title">⚡ Momentos Decisivos no Recorte:</span>
          <div className="turning-list">
            {turningPoints.map((pt) => {
              const impact = pt.actionImpact ?? 0;
              const isPositive = impact >= 0;
              const benefTeam = isPositive ? teamA.name : teamB.name;
              return (
                <div key={pt.sequence} className="turning-item">
                  <span className="turning-badge">Set {pt.setNumber} ({pt.scoreTeamA}×{pt.scoreTeamB})</span>
                  <span className="turning-desc">
                    {pt.actionSkill ? `${pt.actionSkill.toUpperCase()} decisivo` : 'Virada de bola'} ·{' '}
                    <b className={isPositive ? 'text-cobalt' : 'text-mint'}>
                      {isPositive ? '+' : ''}{Math.round(impact * 100)}% para {benefTeam}
                    </b>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { MarkovLink, MarkovNode } from '../../domain/analytics/MarkovGraph';
import './MarkovTree.css';

export type { MarkovLink, MarkovNode } from '../../domain/analytics/MarkovGraph';

export interface MarkovTreeProps {
  nodes: readonly MarkovNode[];
  links: readonly MarkovLink[];
  onSelectNode?: (node: MarkovNode) => void;
  selectedNodeId?: string;
  onSelectLink?: (link: MarkovLink) => void;
  selectedLinkId?: string;
}

interface CalculatedPath {
  d: string;
  stroke: string;
  width: number;
  midX: number;
  midY: number;
  label: string;
  link: MarkovLink;
}

export const MarkovTree: React.FC<MarkovTreeProps> = ({
  nodes,
  links,
  onSelectNode,
  selectedNodeId,
  onSelectLink,
  selectedLinkId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<CalculatedPath[]>([]);

  // Recalcula as curvas de Bézier entre nós renderizados no DOM
  const updatePaths = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    if (containerRect.width === 0 && containerRect.height === 0) {
      return;
    }

    const calculated = links
      .map((link) => {
        const fromEl = document.getElementById(`markov-node-${link.fromId}`);
        const toEl = document.getElementById(`markov-node-${link.toId}`);
        if (!fromEl || !toEl) return null;

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        // Ponto de saída na direita do nó de origem
        const x1 = fromRect.right - containerRect.left;
        const y1 = fromRect.top + fromRect.height / 2 - containerRect.top;

        // Ponto de entrada na esquerda do nó de destino
        const x2 = toRect.left - containerRect.left;
        const y2 = toRect.top + toRect.height / 2 - containerRect.top;

        // Curva cúbica suave
        const dx = Math.max(30, (x2 - x1) * 0.45);
        const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

        // Ponto médio da curva para exibir o indicador
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        // Cor funcional pelo desfecho
        const stroke =
          link.type === 'kill'
            ? '#10B981'
            : link.type === 'rally'
            ? '#38BDF8'
            : '#F43F5E';

        const width = Math.max(2, Math.min(8, Math.log2(link.volume + 1) * 2.2));
        const label = `${Math.round(link.probability * 100)}% (n=${link.volume})`;

        return { d, stroke, width, midX, midY, label, link };
      })
      .filter(Boolean) as CalculatedPath[];

    setPaths(calculated);
  }, [links]);

  useEffect(() => {
    updatePaths();
    const handleResize = () => updatePaths();
    window.addEventListener('resize', handleResize);
    const raf = typeof requestAnimationFrame !== 'undefined'
      ? requestAnimationFrame(updatePaths)
      : undefined;
    return () => {
      window.removeEventListener('resize', handleResize);
      if (raf !== undefined && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(raf);
      }
    };
  }, [updatePaths, nodes]);

  const stage1Nodes = nodes.filter((n) => n.stage === 1);
  const stage2Nodes = nodes.filter((n) => n.stage === 2);
  const stage3Nodes = nodes.filter((n) => n.stage === 3);

  return (
    <div
      ref={containerRef}
      className="markov-tree-container"
      aria-label="Árvore Tática Preditiva de Markov"
    >
      {/* Camada SVG dos Conectores Sankey */}
      <svg className="markov-svg-overlay" aria-hidden="true">
        <defs>
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {paths.map((p, idx) => {
          const isSelected =
            selectedLinkId &&
            selectedLinkId === `${p.link.fromId}->${p.link.toId}`;
          return (
            <g key={idx} className="markov-link-group">
              <path
                d={p.d}
                fill="none"
                stroke={p.stroke}
                strokeWidth={isSelected ? p.width + 3 : p.width}
                strokeOpacity={isSelected ? 1 : 0.65}
                strokeLinecap="round"
                className="markov-path-curve"
                onClick={() => onSelectLink && onSelectLink(p.link)}
              />
            </g>
          );
        })}
      </svg>

      {/* Grid de 3 Fases dos Nós */}
      <div className="markov-columns-grid">
        {/* Coluna 1: Gatilho Inicial */}
        <div className="markov-column">
          <div className="markov-column-header text-stage-1">
            <span className="stage-num">1</span> Início da Jogada
          </div>
          <div className="markov-nodes-stack">
            {stage1Nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              return (
                <div
                  key={node.id}
                  id={`markov-node-${node.id}`}
                  className={`markov-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectNode?.(node)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSelectNode?.(node);
                  }}
                >
                  <div className="markov-card-top">
                    <div>
                      <h4 className="markov-card-title">{node.title}</h4>
                      <p className="markov-card-subtitle">{node.subtitle}</p>
                    </div>
                    <span className="markov-metric-rate text-mint">
                      {node.rateLabel === 'PPP' ? node.rate.toFixed(2) : `${node.rate.toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="markov-card-bottom">
                    <span className="markov-sample">N={node.sampleN}</span>
                    <span className="markov-rate-label">{node.rateLabel ?? 'Taxa de Ponto'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna 2: Reação / Transição */}
        <div className="markov-column">
          <div className="markov-column-header text-stage-2">
            <span className="stage-num">2</span> Distribuição
          </div>
          <div className="markov-nodes-stack">
            {stage2Nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              return (
                <div
                  key={node.id}
                  id={`markov-node-${node.id}`}
                  className={`markov-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectNode?.(node)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSelectNode?.(node);
                  }}
                >
                  <div className="markov-card-top">
                    <div>
                      <h4 className="markov-card-title">{node.title}</h4>
                      <p className="markov-card-subtitle">{node.subtitle}</p>
                    </div>
                    <span className="markov-metric-rate text-cobalt">
                      {node.rate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="markov-card-bottom">
                    <span className="markov-sample">Volume: {node.sampleN}</span>
                    <span className="markov-rate-label">Eficácia</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna 3: Desfecho Terminal Consolidado */}
        <div className="markov-column">
          <div className="markov-column-header text-stage-3">
            <span className="stage-num">3</span> Desfecho do Ataque
          </div>
          <div className="markov-nodes-stack">
            {stage3Nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const statusClass =
                node.status === 'positive'
                  ? 'status-positive'
                  : node.status === 'negative'
                  ? 'status-negative'
                  : 'status-warning';
              return (
                <div
                  key={node.id}
                  id={`markov-node-${node.id}`}
                  className={`markov-card markov-card-terminal ${statusClass} ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectNode?.(node)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSelectNode?.(node);
                  }}
                >
                  <div className="markov-card-top">
                    <div>
                      <h4 className="markov-card-title">{node.title}</h4>
                      <p className="markov-card-subtitle">{node.subtitle}</p>
                    </div>
                    <div className="markov-metric-terminal">
                      {node.rate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="markov-card-bottom">
                    <span className="markov-sample">N={node.sampleN}</span>
                    <span className="markov-rate-label">% do Desfecho</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

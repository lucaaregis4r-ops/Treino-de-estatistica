import { useMemo, useState } from 'react';
import type { BasketballFact } from '../../../domain/basketball/BasketballScout';
import { analyzeBasketballTacticalMarkov } from '../../../domain/basketball/BasketballTacticalMarkov';
import { MarkovTree } from '../../../components/analysis/MarkovTree';
import { BasketballCourtPro } from '../../../components/court/BasketballCourtPro';

export function BasketballMarkovAnalysis({
  facts,
  teams,
}: {
  readonly facts: readonly BasketballFact[];
  readonly teams: readonly { id: string; name: string }[];
}) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? '');
  const [periodFilter, setPeriodFilter] = useState<'all' | number>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string>();

  const currentTeam = teams.find((t) => t.id === teamId) ?? teams[0];
  const opponentTeam = teams.find((t) => t.id !== teamId);

  const model = useMemo(
    () =>
      analyzeBasketballTacticalMarkov(facts, teamId, {
        period: periodFilter === 'all' ? undefined : periodFilter,
        selectedNodeId,
      }),
    [facts, teamId, periodFilter, selectedNodeId]
  );

  const periods = [...new Set(facts.map((f) => f.period))].sort((a, b) => a - b);

  return (
    <section className="basketball-markov-pro" aria-label="Análise tática descritiva das posses">
      {/* Heading & Filters */}
      <div className="basketball-markov-heading">
        <div>
          <h2>Caminhos táticos observados e finalizações</h2>
          <p>
            Resumo descritivo de posses completas em 3 estágios: <strong>Ritmo da Posse</strong> →{' '}
            <strong>Gatilho de Vantagem</strong> → <strong>Zona e Desfecho</strong>.
            As curvas mostram frequências condicionais observadas. Clique em um nó para filtrar a quadra. Vetores aparecem somente quando a origem foi registrada.
          </p>
        </div>
        <div className="basketball-map-filters">
          <label>
            Equipe
            <select
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                setSelectedNodeId(undefined);
              }}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Período
            <select
              value={periodFilter}
              onChange={(e) =>
                setPeriodFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
            >
              <option value="all">Todos os quartos</option>
              {periods.map((p) => (
                <option key={p} value={p}>
                  {p <= 4 ? `${p}º quarto` : `${p - 4}ª prorrogação`}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Coach Tactical Briefing Card */}
      <div className="briefing-card" aria-label="Briefing tático do treinador">
        <div className="briefing-header">
          <span className="briefing-tag">📋 Briefing Tático do Treinador</span>
          <div className="briefing-stat-row">
            <div className="stat-pill">
              <span className="label">Amostra:</span>
              <strong className="value">{model.coachBriefing.sampleCount} posses</strong>
            </div>
            <div className="stat-pill">
              <span className="label">Eficiência:</span>
              <strong className="value text-cyan">
                {model.coachBriefing.ppp.toFixed(2)} PPP
              </strong>
            </div>
            <div className="stat-pill">
              <span className="label">Pontos Feitos:</span>
              <strong className="value text-mint">{model.coachBriefing.totalPoints} pts</strong>
            </div>
            <div className="stat-pill">
              <span className="label">Perdas (TOs):</span>
              <strong className="value text-coral">{model.coachBriefing.turnoversCount}</strong>
            </div>
          </div>
        </div>
        <p className="briefing-narrative">{model.coachBriefing.narrative}</p>
      </div>

      {/* Markov Pro Workbench: Tree (left) + Tactical Court (right) */}
      <div className="markov-pro-workbench">
        <div className="markov-pro-tree-area">
          <div className="markov-tree-legend-bar">
            <span>
              <b>Fase 1:</b> Ritmo da Posse
            </span>
            <span>
              <b>Fase 2:</b> Gatilho Tático
            </span>
            <span>
              <b>Fase 3:</b> Zona & Desfecho
            </span>
          </div>

          {model.nodes.length > 0 ? (
            <MarkovTree
              nodes={model.nodes}
              links={model.links}
              onSelectNode={(node) =>
                setSelectedNodeId(node.id === selectedNodeId ? undefined : node.id)
              }
              selectedNodeId={selectedNodeId}
            />
          ) : (
            <p className="markov-empty-notice">
              Registre arremessos ou perdas de posse para gerar a árvore preditiva.
            </p>
          )}

          {selectedNodeId && (
            <div className="markov-filter-status">
              <span>
                Filtro ativo:{' '}
                <strong>
                  {model.nodes.find((n) => n.id === selectedNodeId)?.title ?? selectedNodeId}
                </strong>
              </span>
              <button type="button" onClick={() => setSelectedNodeId(undefined)}>
                Limpar filtro
              </button>
            </div>
          )}
        </div>

        <div className="markov-pro-court-area">
          <BasketballCourtPro
            events={model.courtEvents}
            vectors={model.vectors}
            teamName={currentTeam?.name ?? 'Equipe'}
            opponentName={opponentTeam?.name ?? 'Adversário'}
            zoneSummary={model.zoneSummary}
            title={
              selectedNodeId
                ? `Quadra Filtrada: ${model.nodes.find((n) => n.id === selectedNodeId)?.title}`
                : 'Mapa Vetorial e Térmico de Finalizações'
            }
          />
        </div>
      </div>
    </section>
  );
}

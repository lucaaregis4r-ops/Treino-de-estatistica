import { useMemo, useState } from 'react';
import type { MatchWorkspace } from '../../../application/ScoutTrainerService';
import type {
  TacticalMetricGroup,
  TacticalMetricViewModel,
} from '../../../application/view-models/TacticalAnalyticsViewModel';

interface SummaryScreenProps {
  readonly workspace: MatchWorkspace;
  readonly onBack: () => void;
  readonly onAnalysis: () => void;
  readonly onHome: () => void;
  readonly onExport: (format: 'json' | 'csv' | 'txt' | 'pdf') => Promise<void>;
  readonly directoryExportSupported: boolean;
  readonly connectedDirectory?: string;
  readonly busy: boolean;
  readonly onConnectDirectory: () => Promise<void>;
  readonly onDisconnectDirectory: () => void;
  readonly onExportBundle: () => Promise<void>;
}

export function SummaryScreen({
  workspace,
  onBack,
  onAnalysis,
  onHome,
  onExport,
  directoryExportSupported,
  connectedDirectory,
  busy,
  onConnectDirectory,
  onDisconnectDirectory,
  onExportBundle,
}: SummaryScreenProps) {
  const [teamA, teamB] = workspace.teams;
  const [tacticalTeamId, setTacticalTeamId] = useState(teamA.id);
  const [tacticalGroup, setTacticalGroup] = useState<TacticalMetricGroup>('serve');
  const tacticalMetrics = useMemo(
    () =>
      (
        workspace.tacticalAnalytics.teams.find((team) => team.teamId === tacticalTeamId)?.metrics ??
        []
      ).filter((metric) => metric.group === tacticalGroup),
    [tacticalGroup, tacticalTeamId, workspace.tacticalAnalytics.teams],
  );
  return (
    <section className="page-section summary-screen" aria-labelledby="summary-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Resumo estatístico</p>
          <h1 id="summary-title">{workspace.state.metadata.name}</h1>
        </div>
        <div className="summary-heading-actions">
          <button className="button secondary" type="button" onClick={onAnalysis}>
            Abrir análise
          </button>
          <button className="button ghost" type="button" onClick={onBack}>
            Voltar ao scout
          </button>
        </div>
      </div>
      <div className="summary-score">
        <strong>{teamA.name}</strong>
        <span>{workspace.state.score.teamA}</span>
        <small>SET {workspace.state.currentSet}</small>
        <span>{workspace.state.score.teamB}</span>
        <strong>{teamB.name}</strong>
      </div>

      <section className="set-scoreboard" aria-labelledby="set-scoreboard-title">
        <div>
          <p className="eyebrow">Placar completo</p>
          <h2 id="set-scoreboard-title">Sets da partida</h2>
        </div>
        <div className="set-score-grid">
          {workspace.state.sets.map((set) => (
            <article key={set.setNumber} className={set.completed ? 'completed' : ''}>
              <small>Set {set.setNumber}</small>
              <strong>
                {set.score.teamA} × {set.score.teamB}
              </strong>
              <span>{set.completed ? 'Encerrado' : 'Em andamento'}</span>
            </article>
          ))}
        </div>
      </section>
      <div className="statistics-board">
        {workspace.dashboard.teams.map((team) => (
          <section
            key={team.teamId}
            className="team-statistics"
            aria-labelledby={`stats-${team.teamId}`}
          >
            <div className="statistics-heading">
              <p className="eyebrow">Desempenho</p>
              <h2 id={`stats-${team.teamId}`}>{team.teamName}</h2>
            </div>
            <div className="metric-grid">
              {team.metrics.map((metric) => (
                <article key={metric.id} className={metric.available ? '' : 'metric-unavailable'}>
                  <small>{metric.label}</small>
                  <strong>{metric.displayValue}</strong>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="summary-cards">
        <article>
          <small>Eventos ativos</small>
          <strong>{workspace.timeline.length}</strong>
        </article>
        <article>
          <small>Eventos no log</small>
          <strong>{workspace.events.length}</strong>
        </article>
        <article>
          <small>Perfil</small>
          <strong>
            {workspace.profiles.competitionProfile?.name ??
              workspace.profiles.complexityProfile.name}
          </strong>
        </article>
      </div>
      <section className="tactical-analytics" aria-labelledby="tactical-analytics-title">
        <div className="tactical-analytics-heading">
          <div>
            <p className="eyebrow">Leitura tática</p>
            <h2 id="tactical-analytics-title">Distribuições e eficiência</h2>
          </div>
          <div className="tactical-filters" aria-label="Filtros das métricas táticas">
            <label>
              Equipe
              <select
                value={tacticalTeamId}
                onChange={(event) => setTacticalTeamId(event.target.value)}
              >
                {workspace.tacticalAnalytics.teams.map((team) => (
                  <option key={team.teamId} value={team.teamId}>
                    {team.teamName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Grupo
              <select
                value={tacticalGroup}
                onChange={(event) => setTacticalGroup(event.target.value as TacticalMetricGroup)}
              >
                <option value="serve">Saque</option>
                <option value="reception">Recepção</option>
                <option value="attack">Ataque</option>
                <option value="setter">Levantador</option>
                <option value="rally">Rali</option>
              </select>
            </label>
          </div>
        </div>
        {tacticalMetrics.length === 0 ? (
          <p className="tactical-empty">Ainda não há dados suficientes neste recorte.</p>
        ) : (
          <div className="tactical-metric-grid">
            {tacticalMetrics.map((metric) => (
              <TacticalMetricCard key={metric.id} metric={metric} />
            ))}
          </div>
        )}
      </section>
      <section className="folder-export" aria-labelledby="folder-export-title">
        <div>
          <h2 id="folder-export-title">Exportar pacote para uma pasta</h2>
          <p>
            Cada exportação cria uma pasta com equipes e data contendo a partida mestre, eventos,
            scout, estatísticas auditáveis e o relatório PDF.
          </p>
        </div>
        {directoryExportSupported ? (
          <div className="folder-export-actions">
            <span className={connectedDirectory ? 'folder-connected' : ''}>
              {connectedDirectory ? `Conectada: ${connectedDirectory}` : 'Nenhuma pasta conectada'}
            </span>
            {!connectedDirectory ? (
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                onClick={() => void onConnectDirectory()}
              >
                Conectar pasta
              </button>
            ) : (
              <button className="button ghost" type="button" onClick={onDisconnectDirectory}>
                Desconectar
              </button>
            )}
            <button
              className="button primary"
              type="button"
              disabled={busy}
              onClick={() => void onExportBundle()}
            >
              Exportar pacote agora
            </button>
          </div>
        ) : (
          <p className="summary-note">
            Este navegador não conecta pastas. Os downloads individuais continuam disponíveis.
          </p>
        )}
      </section>
      <div className="summary-actions">
        <details className="summary-export-menu">
          <summary className="button primary">Exportar</summary>
          <div className="summary-export-options" aria-label="Formatos de exportação">
            <button className="button primary" type="button" disabled={busy} onClick={() => void onExport('pdf')}>
              Exportar PDF
            </button>
            <button className="button primary" type="button" disabled={busy} onClick={() => void onExport('json')}>
              Exportar JSON
            </button>
            <button className="button secondary" type="button" disabled={busy} onClick={() => void onExport('csv')}>
              Exportar CSV
            </button>
            <button className="button secondary" type="button" disabled={busy} onClick={() => void onExport('txt')}>
              Exportar TXT
            </button>
          </div>
        </details>
        <button className="button secondary" type="button" onClick={onHome}>
          Voltar ao início
        </button>
      </div>
    </section>
  );
}

function TacticalMetricCard({ metric }: { readonly metric: TacticalMetricViewModel }) {
  return (
    <article className="tactical-metric-card">
      <div className="tactical-metric-title">
        <h3>{metric.label}</h3>
        <small>{metric.visualization.replace('-', ' ')}</small>
      </div>
      {metric.visualization === 'zone-matrix' ? (
        <div className="zone-matrix" aria-label={`Matriz de zonas: ${metric.label}`}>
          {metric.rows.map((row) => (
            <div key={row.key} className="zone-cell">
              <span>Z{row.label}</span>
              <strong>{row.displayValue}</strong>
              <small>{row.audit}</small>
            </div>
          ))}
        </div>
      ) : metric.visualization === 'direction-map' ? (
        <div className="direction-map" aria-label={`Mapa de direções: ${metric.label}`}>
          {metric.rows.map((row) => (
            <div key={row.key}>
              <span className="direction-arrow">→</span>
              <span>{row.label}</span>
              <strong>{row.displayValue}</strong>
              <small>{row.audit}</small>
            </div>
          ))}
        </div>
      ) : (
        <table className="tactical-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Resultado</th>
              <th title="Numerador / denominador">N/D</th>
            </tr>
          </thead>
          <tbody>
            {metric.rows.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td>{row.displayValue}</td>
                <td>{row.audit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </article>
  );
}

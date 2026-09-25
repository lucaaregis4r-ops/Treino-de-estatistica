import { useMemo, useState } from 'react';
import type { MatchMetadata, MatchStatus } from '../../../domain/match/entities/MatchMetadata';
import { resolveMatchSport, type MatchSport } from '../../../domain/match/entities/MatchSport';
import {
  MATCH_STATUS_LABELS,
  matchDateLabel,
  matchProfileLabel,
  normalizeMatchSearch,
  sortMatchesByCreation,
} from './matchPresentation';

type MatchFilter = 'all' | MatchStatus;
type SportFilter = 'all' | MatchSport | 'unknown';

export interface MatchFilters {
  readonly query: string;
  readonly status: MatchFilter;
  readonly sport: SportFilter;
}

export const DEFAULT_MATCH_FILTERS: MatchFilters = {
  query: '',
  status: 'all',
  sport: 'all',
};

export function MatchesScreen({
  matches,
  busy,
  onNewMatch,
  onOpenMatch,
  filters,
  onFiltersChange,
}: {
  readonly matches: readonly MatchMetadata[];
  readonly busy: boolean;
  readonly onNewMatch: () => void;
  readonly onOpenMatch: (id: string, summary?: boolean) => Promise<void>;
  readonly filters?: MatchFilters;
  readonly onFiltersChange?: (filters: MatchFilters) => void;
}) {
  const [localFilters, setLocalFilters] = useState<MatchFilters>(DEFAULT_MATCH_FILTERS);
  const currentFilters = filters ?? localFilters;
  const updateFilters = (next: MatchFilters) => {
    if (onFiltersChange) onFiltersChange(next);
    else setLocalFilters(next);
  };
  const normalizedQuery = normalizeMatchSearch(currentFilters.query);
  const filteredMatches = useMemo(
    () =>
      sortMatchesByCreation(matches).filter((match) => {
        const matchesName = normalizeMatchSearch(match.name).includes(normalizedQuery);
        const matchesStatus =
          currentFilters.status === 'all' || match.status === currentFilters.status;
        const matchesSport =
          currentFilters.sport === 'all' ||
          resolveMatchSport(match) ===
            (currentFilters.sport === 'unknown' ? undefined : currentFilters.sport);
        return matchesName && matchesStatus && matchesSport;
      }),
    [currentFilters.sport, currentFilters.status, matches, normalizedQuery],
  );

  return (
    <main className="page-section matches-screen" aria-labelledby="matches-title">
      <header className="section-heading matches-heading">
        <div>
          <p className="eyebrow">Histórico local</p>
          <h1 id="matches-title">Partidas</h1>
        </div>
        <button className="button primary" type="button" onClick={onNewMatch} disabled={busy}>
          Nova partida
        </button>
      </header>

      <div className="matches-toolbar" role="search" aria-label="Filtrar partidas">
        <label>
          Buscar por nome
          <input
            type="search"
            value={currentFilters.query}
            placeholder="Ex.: semifinal"
            onChange={(event) =>
              updateFilters({ ...currentFilters, query: event.target.value })
            }
          />
        </label>
        <label>
          Estado
          <select
            value={currentFilters.status}
            onChange={(event) =>
              updateFilters({ ...currentFilters, status: event.target.value as MatchFilter })
            }
          >
            <option value="all">Todas</option>
            <option value="in_progress">Em andamento</option>
            <option value="finished">Finalizadas</option>
            <option value="created">Criadas</option>
          </select>
        </label>
        <label>
          Modalidade
          <select
            value={currentFilters.sport}
            onChange={(event) =>
              updateFilters({ ...currentFilters, sport: event.target.value as SportFilter })
            }
          >
            <option value="all">Todas</option>
            <option value="volleyball">Vôlei</option>
            <option value="football">Futebol</option>
            <option value="unknown">Não identificada</option>
          </select>
        </label>
        <p className="matches-count" aria-live="polite">
          {filteredMatches.length}{' '}
          {filteredMatches.length === 1 ? 'partida encontrada' : 'partidas encontradas'}
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="matches-empty-state">
          <h2>Nenhuma partida ainda</h2>
          <p>Crie uma partida para começar a registrar o scout.</p>
          <button className="button primary" type="button" onClick={onNewMatch} disabled={busy}>
            Criar partida
          </button>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="matches-empty-state">
          <h2>Nenhum resultado para este filtro</h2>
          <p>Ajuste a busca ou selecione outro estado.</p>
        </div>
      ) : (
        <ul className="matches-list" aria-label="Lista de partidas">
          {filteredMatches.map((match) => (
            <li key={match.id} className="match-row">
              <div className="match-row-name">
                <button
                  className="match-name-button"
                  type="button"
                  onClick={() => void onOpenMatch(match.id)}
                  disabled={busy}
                >
                  {match.name}
                </button>
              </div>
              <span className="match-row-date">{matchDateLabel(match.createdAt)}</span>
              <span className="match-row-profile">{matchProfileLabel(match.complexityProfileId)}</span>
              <span className={`match-row-status status-${match.status}`}>
                {MATCH_STATUS_LABELS[match.status]}
              </span>
              <div className="match-row-actions">
                <button
                  className="button secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => void onOpenMatch(match.id)}
                >
                  {match.status === 'in_progress' ? 'Continuar' : 'Abrir'}
                </button>
                <button
                  className="button ghost"
                  type="button"
                  disabled={busy}
                  onClick={() => void onOpenMatch(match.id, true)}
                >
                  Resumo
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

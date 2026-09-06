import type { MatchMetadata } from '../../../domain/match/entities/MatchMetadata';

const statuses = { created: 'Criada', in_progress: 'Em andamento', finished: 'Finalizada' };
const profiles: Record<string, string> = {
  basic: 'Básico',
  operational: 'Operacional',
  tactical: 'Tático',
  advanced: 'Avançado',
};

export function MatchesScreen({
  matches,
  busy,
  onNewMatch,
  onOpenMatch,
}: {
  readonly matches: readonly MatchMetadata[];
  readonly busy: boolean;
  readonly onNewMatch: () => void;
  readonly onOpenMatch: (id: string, summary?: boolean) => Promise<void>;
}) {
  return (
    <section className="page-section">
      <div className="section-heading">
        <h1>Partidas</h1>
        <button className="button primary" onClick={onNewMatch}>
          Nova partida
        </button>
      </div>
      {!matches.length && <p>Nenhuma partida ainda.</p>}
      <ul className="registration-list">
        {matches.map((match) => (
          <li key={match.id}>
            <div>
              <strong>{match.name}</strong>
              <p>
                {new Date(match.createdAt).toLocaleDateString('pt-BR')} · Perfil{' '}
                {profiles[match.complexityProfileId] ?? match.complexityProfileId} ·{' '}
                {statuses[match.status]}
              </p>
            </div>
            <div className="hero-actions">
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void onOpenMatch(match.id)}
              >
                {match.status === 'in_progress' ? 'Continuar' : 'Abrir'}
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => void onOpenMatch(match.id, true)}
              >
                Consultar resumo
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

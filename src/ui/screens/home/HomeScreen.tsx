import { useRef } from 'react';
import type { MatchMetadata } from '../../../domain/match/entities/MatchMetadata';
import { resolveMatchSport, type MatchSport } from '../../../domain/match/entities/MatchSport';

interface HomeScreenProps {
  readonly matches: readonly MatchMetadata[];
  readonly busy: boolean;
  readonly onSelectSport: (sport: MatchSport) => void;
  readonly onUnidentifiedMatches: () => void;
  readonly onImportBackup: (serialized: string) => Promise<void>;
}

const SPORTS: readonly { id: MatchSport; label: string; description: string; mark: string }[] = [
  { id: 'volleyball', label: 'Vôlei', description: 'Rallies, fundamentos e rotações', mark: 'VB' },
  { id: 'football', label: 'Futebol', description: 'Posse, ações e campo', mark: 'FB' },
  { id: 'futsal', label: 'Futsal', description: 'Jogo, ações e quadra', mark: 'FS' },
  { id: 'basketball', label: 'Basquete', description: 'Cestas, posse e quadra', mark: 'BQ' },
];

export function HomeScreen({
  matches,
  busy,
  onSelectSport,
  onUnidentifiedMatches,
  onImportBackup,
}: HomeScreenProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const unidentifiedCount = matches.filter((match) => !resolveMatchSport(match)).length;

  return (
    <main className="page-section home-screen sport-home" aria-labelledby="home-title">
      <header className="home-heading sport-home-heading">
        <div>
          <p className="eyebrow">Scout Trainer</p>
          <h1 id="home-title">Escolha a modalidade</h1>
          <p>Depois, acesse as partidas e o manual do esporte escolhido.</p>
        </div>
      </header>

      <div className="sport-picker" aria-label="Modalidades">
        {SPORTS.map((sport) => {
          const count = matches.filter((match) => resolveMatchSport(match) === sport.id).length;
          return (
            <button
              className={`sport-tile sport-tile-${sport.id}`}
              key={sport.id}
              type="button"
              onClick={() => onSelectSport(sport.id)}
              disabled={busy}
              aria-label={`${sport.label}: abrir partidas e manual`}
            >
              <span className="sport-tile-mark" aria-hidden="true">{sport.mark}</span>
              <span className="sport-tile-content">
                <strong>{sport.label}</strong>
                <small>{sport.description}</small>
              </span>
              <span className="sport-tile-footer">
                <span>{count} {count === 1 ? 'partida' : 'partidas'}</span>
                <span aria-hidden="true">↗</span>
              </span>
            </button>
          );
        })}

      </div>

      <section className="sport-home-utilities" aria-label="Outras opções">
        <button className="button secondary" type="button" onClick={() => importInputRef.current?.click()} disabled={busy}>
          Importar backup
        </button>
        <input
          ref={importInputRef}
          className="sr-only"
          id="home-import-backup"
          type="file"
          accept="application/json,.json"
          disabled={busy}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void file.text().then(onImportBackup);
            event.currentTarget.value = '';
          }}
        />
        {unidentifiedCount > 0 && (
          <button className="button ghost" type="button" onClick={onUnidentifiedMatches}>
            {unidentifiedCount} {unidentifiedCount === 1 ? 'partida sem modalidade' : 'partidas sem modalidade'}
          </button>
        )}
      </section>
    </main>
  );
}

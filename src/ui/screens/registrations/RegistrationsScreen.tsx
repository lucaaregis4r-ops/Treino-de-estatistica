import { useEffect, useState, type FormEvent } from 'react';
import type {
  AthleteRegistration,
  TeamRegistration,
} from '../../../domain/match/entities/Registration';
import {
  browserAthleteRegistrations as athletesRepository,
  browserTeamRegistrations as teamsRepository,
} from '../../app/createBrowserService';
import './registrations.css';

const roles = {
  setter: 'Levantador',
  opposite: 'Oposto',
  outside: 'Ponteiro',
  middle: 'Central',
  libero: 'Líbero',
  defensive_specialist: 'Defensivo',
  custom: 'Outra',
} as const;

export function RegistrationsScreen({ onProfiles }: { readonly onProfiles: () => void }) {
  const [tab, setTab] = useState<'athletes' | 'teams'>('athletes');
  const [athletes, setAthletes] = useState<readonly AthleteRegistration[]>([]);
  const [teams, setTeams] = useState<readonly TeamRegistration[]>([]);
  const [athlete, setAthlete] = useState<Partial<AthleteRegistration>>({ active: true });
  const [team, setTeam] = useState<Partial<TeamRegistration>>({ athleteIds: [] });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void Promise.all([athletesRepository.list(), teamsRepository.list()]).then(([a, t]) => {
      if (!active) return;
      if (a.ok) setAthletes(a.value);
      else setError(a.error.message);
      if (t.ok) setTeams(t.value);
      else setError(t.error.message);
      setBusy(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function saveAthlete(event?: FormEvent, value = athlete) {
    event?.preventDefault();
    if (
      !value.name?.trim() ||
      (value.number !== undefined &&
        (!Number.isInteger(value.number) || value.number < 1 || value.number > 99))
    ) {
      setError('Informe um nome e, se preenchida, uma camisa de 1 a 99.');
      return;
    }
    const now = Date.now();
    const saved: AthleteRegistration = {
      ...value,
      id: value.id ?? crypto.randomUUID(),
      name: value.name.trim(),
      active: value.active ?? true,
      createdAt: value.createdAt ?? now,
      updatedAt: now,
    };
    setBusy(true);
    setError('');
    const result = await athletesRepository.save(saved);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setAthletes((current) => [...current.filter((item) => item.id !== saved.id), saved]);
    setAthlete({ active: true });
  }

  async function saveTeam(event: FormEvent) {
    event.preventDefault();
    if (!team.name?.trim()) {
      setError('Informe o nome da equipe.');
      return;
    }
    const now = Date.now();
    const saved: TeamRegistration = {
      ...team,
      id: team.id ?? crypto.randomUUID(),
      name: team.name.trim(),
      athleteIds: team.athleteIds ?? [],
      createdAt: team.createdAt ?? now,
      updatedAt: now,
    };
    setBusy(true);
    setError('');
    const result = await teamsRepository.save(saved);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setTeams((current) => [...current.filter((item) => item.id !== saved.id), saved]);
    setTeam({ athleteIds: [] });
  }

  return (
    <section className="page-section registrations-screen">
      <h1>Cadastros</h1>
      <nav className="hero-actions" aria-label="Cadastros">
        <button
          className="button secondary"
          aria-pressed={tab === 'athletes'}
          onClick={() => setTab('athletes')}
        >
          Atletas
        </button>
        <button
          className="button secondary"
          aria-pressed={tab === 'teams'}
          onClick={() => setTab('teams')}
        >
          Equipes
        </button>
        <button className="button secondary" onClick={onProfiles}>
          Perfis
        </button>
      </nav>
      {error && <p role="alert">{error}</p>}
      {tab === 'athletes' ? (
        <>
          <h2>{athlete.id ? 'Editar atleta' : 'Cadastrar atleta'}</h2>
          <form onSubmit={(event) => void saveAthlete(event)}>
            <fieldset disabled={busy} className="registration-fields">
              <label>
                Nome
                <input
                  required
                  value={athlete.name ?? ''}
                  onChange={(e) => setAthlete({ ...athlete, name: e.target.value })}
                />
              </label>
              <label>
                Camisa (opcional)
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={athlete.number ?? ''}
                  onChange={(e) =>
                    setAthlete({
                      ...athlete,
                      number: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Posição
                <select
                  value={athlete.position ?? ''}
                  onChange={(e) =>
                    setAthlete({
                      ...athlete,
                      position: (e.target.value as AthleteRegistration['position']) || undefined,
                    })
                  }
                >
                  <option value="">Não informada</option>
                  {Object.entries(roles).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button primary">Salvar atleta</button>
              {athlete.id && (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setAthlete({ active: true })}
                >
                  Cancelar edição
                </button>
              )}
            </fieldset>
          </form>
          <ul className="registration-list">
            {athletes.map((item) => (
              <li key={item.id}>
                <span>
                  <strong>
                    {item.number ? `${item.number} · ` : ''}
                    {item.name}
                  </strong>{' '}
                  · {item.position ? roles[item.position] : 'Sem posição'} ·{' '}
                  {item.active ? 'Ativo' : 'Inativo'}
                </span>
                <div className="hero-actions">
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => setAthlete(item)}
                  >
                    Editar
                  </button>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void saveAthlete(undefined, { ...item, active: !item.active })}
                  >
                    {item.active ? 'Desativar' : 'Reativar'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {!busy && !athletes.length && <p>Nenhum atleta cadastrado.</p>}
        </>
      ) : (
        <>
          <h2>{team.id ? 'Editar equipe' : 'Cadastrar equipe'}</h2>
          <form onSubmit={(event) => void saveTeam(event)}>
            <fieldset disabled={busy} className="registration-fields">
              <label>
                Nome da equipe
                <input
                  required
                  value={team.name ?? ''}
                  onChange={(e) => setTeam({ ...team, name: e.target.value })}
                />
              </label>
              <label>
                Sigla
                <input
                  value={team.shortName ?? ''}
                  onChange={(e) => setTeam({ ...team, shortName: e.target.value })}
                />
              </label>
              <label>
                Categoria
                <input
                  value={team.category ?? ''}
                  onChange={(e) => setTeam({ ...team, category: e.target.value })}
                />
              </label>
              <fieldset>
                <legend>Atletas do elenco</legend>
                {athletes.map((item) => (
                  <label className="athlete-option" key={item.id}>
                    <input
                      type="checkbox"
                      checked={team.athleteIds?.includes(item.id) ?? false}
                      onChange={(e) =>
                        setTeam({
                          ...team,
                          athleteIds: e.target.checked
                            ? [...(team.athleteIds ?? []), item.id]
                            : team.athleteIds?.filter((id) => id !== item.id),
                        })
                      }
                    />
                    {item.name}
                    {!item.active && ' (inativo)'}
                  </label>
                ))}
                {!athletes.length && <p>Cadastre atletas na aba Atletas.</p>}
              </fieldset>
              <button className="button primary">Salvar equipe</button>
              {team.id && (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setTeam({ athleteIds: [] })}
                >
                  Cancelar edição
                </button>
              )}
            </fieldset>
          </form>
          <ul className="registration-list">
            {teams.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.name}</strong> {item.shortName} {item.category}
                  <p>
                    Elenco:{' '}
                    {item.athleteIds
                      .map((id) => {
                        const a = athletes.find((candidate) => candidate.id === id);
                        return a
                          ? `${a.name}${a.active ? '' : ' (inativo)'}`
                          : 'Atleta indisponível';
                      })
                      .join(', ') || 'Nenhum atleta'}
                  </p>
                </div>
                <button className="button secondary" disabled={busy} onClick={() => setTeam(item)}>
                  Editar
                </button>
              </li>
            ))}
          </ul>
          {!busy && !teams.length && <p>Nenhuma equipe cadastrada.</p>}
        </>
      )}
    </section>
  );
}

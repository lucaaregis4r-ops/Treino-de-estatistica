import { useState, type FormEvent } from 'react';
import type {
  CreateMatchInput,
  LineupPositionInput,
  PlayerRegistrationInput,
} from '../../../application/ScoutTrainerService';
import type { CodeProfile } from '../../../profiles/types';
import type { TacticalRole } from '../../../domain/match/lineup/SetLineup';
import type { PlayerRole } from '../../../domain/match/roles/PlayerRole';

const playerRoleAliases: Readonly<Record<string, PlayerRole>> = {
  levantador: 'setter',
  setter: 'setter',
  oposto: 'opposite',
  opposite: 'opposite',
  ponteiro: 'outside',
  outside: 'outside',
  central: 'middle',
  middle: 'middle',
  libero: 'libero',
  líbero: 'libero',
  defensivo: 'defensive_specialist',
  custom: 'custom',
};

function playerRegistrations(value: string): PlayerRegistrationInput[] {
  return value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = /^(\d{1,2})(?:\s+([^|]+?))?(?:\s*\|\s*(.+))?$/.exec(entry);
      const registeredRole = match?.[3]
        ? playerRoleAliases[match[3].trim().toLocaleLowerCase()]
        : undefined;
      return {
        number: Number(match?.[1] ?? Number.NaN),
        ...(match?.[2] ? { name: match[2].trim() } : {}),
        ...(registeredRole ? { registeredRole } : {}),
      };
    });
}

const tacticalRoles: readonly { value: TacticalRole; label: string }[] = [
  { value: 'setter', label: 'Levantador' },
  { value: 'outside_1', label: 'Ponteiro 1' },
  { value: 'middle_1', label: 'Central 1' },
  { value: 'opposite', label: 'Oposto' },
  { value: 'outside_2', label: 'Ponteiro 2' },
  { value: 'middle_2', label: 'Central 2' },
];

const defaultLineup = (firstNumber: number): LineupPositionInput[] =>
  tacticalRoles.map((role, index) => ({
    position: (index + 1) as LineupPositionInput['position'],
    tacticalRole: role.value,
    playerNumber: firstNumber + index,
  }));

interface NewMatchScreenProps {
  readonly busy: boolean;
  readonly onCancel: () => void;
  readonly onCreate: (input: CreateMatchInput) => Promise<void>;
  readonly codeProfiles: readonly CodeProfile[];
}

const profileOptions: readonly {
  id: CreateMatchInput['complexityProfileId'];
  name: string;
}[] = [
  { id: 'basic', name: 'Básico' },
  { id: 'operational', name: 'Operacional' },
  { id: 'tactical', name: 'Tático' },
  { id: 'advanced', name: 'Avançado' },
  { id: 'cbv', name: 'CBV 2025/26' },
];

export function NewMatchScreen({ busy, onCancel, onCreate, codeProfiles }: NewMatchScreenProps) {
  const [teamAName, setTeamAName] = useState('Equipe A');
  const [teamBName, setTeamBName] = useState('Equipe B');
  const [teamAPlayers, setTeamAPlayers] = useState(
    '1 Jogador 1, 2 Jogador 2, 3 Jogador 3, 4 Jogador 4, 5 Jogador 5, 6 Jogador 6',
  );
  const [teamBPlayers, setTeamBPlayers] = useState(
    '7 Jogador 7, 8 Jogador 8, 9 Jogador 9, 10 Jogador 10, 11 Jogador 11, 12 Jogador 12',
  );
  const [teamALineup, setTeamALineup] = useState<readonly LineupPositionInput[]>(defaultLineup(1));
  const [teamBLineup, setTeamBLineup] = useState<readonly LineupPositionInput[]>(defaultLineup(7));
  const [teamALibero, setTeamALibero] = useState<number | undefined>();
  const [teamBLibero, setTeamBLibero] = useState<number | undefined>();
  const [initialServingTeam, setInitialServingTeam] = useState<'teamA' | 'teamB'>('teamA');
  const [complexityProfileId, setComplexityProfileId] =
    useState<CreateMatchInput['complexityProfileId']>('basic');
  const [codeProfileId, setCodeProfileId] = useState('data_volley_basic_v1');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const withLibero = (
      players: readonly PlayerRegistrationInput[],
      liberoNumber: number | undefined,
    ): PlayerRegistrationInput[] =>
      players.map((player) =>
        player.number === liberoNumber
          ? { ...player, libero: true, registeredRole: player.registeredRole ?? 'libero' }
          : player,
      );
    await onCreate({
      teamAName,
      teamBName,
      teamAPlayers: withLibero(playerRegistrations(teamAPlayers), teamALibero),
      teamBPlayers: withLibero(playerRegistrations(teamBPlayers), teamBLibero),
      teamALineup,
      teamBLineup,
      initialServingTeam,
      complexityProfileId,
      codeProfileId,
    });
  }

  return (
    <section className="page-section setup-screen" aria-labelledby="setup-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Configuração</p>
          <h1 id="setup-title">Nova partida</h1>
        </div>
        <button className="button ghost" type="button" onClick={onCancel}>
          Voltar
        </button>
      </div>
      <form className="setup-form" onSubmit={(event) => void submit(event)}>
        <div className="team-form-card">
          <span className="team-marker">A</span>
          <label>
            Nome da equipe
            <input
              value={teamAName}
              onChange={(event) => setTeamAName(event.target.value)}
              required
            />
          </label>
          <label>
            Atletas (camisa e nome)
            <textarea
              value={teamAPlayers}
              onChange={(event) => setTeamAPlayers(event.target.value)}
              aria-describedby="players-help"
              required
            />
          </label>
        </div>
        <div className="versus" aria-hidden="true">
          ×
        </div>
        <div className="team-form-card team-b">
          <span className="team-marker">B</span>
          <label>
            Nome da equipe
            <input
              value={teamBName}
              onChange={(event) => setTeamBName(event.target.value)}
              required
            />
          </label>
          <label>
            Atletas (camisa e nome)
            <textarea
              value={teamBPlayers}
              onChange={(event) => setTeamBPlayers(event.target.value)}
              required
            />
          </label>
        </div>
        <p id="players-help" className="form-help">
          Separe por vírgula ou linha: <code>8 Ana Souza</code>. Para reservas, a função pode ser
          informada após <code>|</code>: <code>14 Rafael | levantador</code>. A posição de rotação e
          a função ativa continuam pertencendo à escalação do set.
        </p>
        <div className="lineup-setup-grid">
          {(
            [
              {
                key: 'A',
                title: teamAName,
                roster: playerRegistrations(teamAPlayers),
                lineup: teamALineup,
                setLineup: setTeamALineup,
                libero: teamALibero,
                setLibero: setTeamALibero,
              },
              {
                key: 'B',
                title: teamBName,
                roster: playerRegistrations(teamBPlayers),
                lineup: teamBLineup,
                setLineup: setTeamBLineup,
                libero: teamBLibero,
                setLibero: setTeamBLibero,
              },
            ] as const
          ).map((team) => (
            <fieldset key={team.key} className="lineup-card">
              <legend>Escalação inicial · {team.title}</legend>
              <label className="libero-select">
                Líbero (opcional)
                <select
                  aria-label={`${team.key} líbero`}
                  value={team.libero ?? ''}
                  onChange={(event) =>
                    team.setLibero(event.target.value ? Number(event.target.value) : undefined)
                  }
                >
                  <option value="">Sem líbero definido</option>
                  {team.roster.map((player) => (
                    <option key={player.number} value={player.number}>
                      {String(player.number).padStart(2, '0')} {player.name}
                    </option>
                  ))}
                </select>
              </label>
              {team.lineup.map((entry, index) => (
                <div key={entry.position} className="lineup-row">
                  <strong>P{entry.position}</strong>
                  <label>
                    Função
                    <select
                      aria-label={`${team.key} P${entry.position} função`}
                      value={entry.tacticalRole}
                      onChange={(event) =>
                        team.setLineup(
                          team.lineup.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, tacticalRole: event.target.value as TacticalRole }
                              : item,
                          ),
                        )
                      }
                    >
                      {tacticalRoles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Atleta
                    <select
                      aria-label={`${team.key} P${entry.position} atleta`}
                      value={entry.playerNumber}
                      onChange={(event) =>
                        team.setLineup(
                          team.lineup.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, playerNumber: Number(event.target.value) }
                              : item,
                          ),
                        )
                      }
                    >
                      {team.roster.map((player) => (
                        <option key={player.number} value={player.number}>
                          {String(player.number).padStart(2, '0')} {player.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ))}
            </fieldset>
          ))}
        </div>
        <fieldset className="serving-choice">
          <legend>Quem começa sacando?</legend>
          <label>
            <input
              type="radio"
              name="initial-server"
              checked={initialServingTeam === 'teamA'}
              onChange={() => setInitialServingTeam('teamA')}
            />
            {teamAName}
          </label>
          <label>
            <input
              type="radio"
              name="initial-server"
              checked={initialServingTeam === 'teamB'}
              onChange={() => setInitialServingTeam('teamB')}
            />
            {teamBName}
          </label>
        </fieldset>
        <fieldset className="profile-choice">
          <legend>Perfil de complexidade</legend>
          {profileOptions.map((profile) => (
            <label
              key={profile.id}
              className={complexityProfileId === profile.id ? 'selected' : ''}
            >
              <input
                type="radio"
                name="profile"
                value={profile.id}
                checked={complexityProfileId === profile.id}
                onChange={() => setComplexityProfileId(profile.id)}
              />
              <span>
                <strong>{profile.name}</strong>
              </span>
            </label>
          ))}
        </fieldset>
        <label className="code-profile-select">
          Linguagem de código
          <select value={codeProfileId} onChange={(event) => setCodeProfileId(event.target.value)}>
            {codeProfiles.map((profile) => (
              <option key={`${profile.id}@${profile.version}`} value={profile.id}>
                {profile.name} · v{profile.version}
              </option>
            ))}
          </select>
        </label>
        <button className="button primary submit-match" disabled={busy}>
          {busy ? 'Criando…' : 'Criar e iniciar scout'}
        </button>
      </form>
    </section>
  );
}

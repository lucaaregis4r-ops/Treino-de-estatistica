import type { FormEventHandler } from 'react';
import type { Player } from '../../../domain/match/entities/Player';
import type { Team } from '../../../domain/match/entities/Team';
import type { Skill } from '../../../domain/scout/entities/Skill';
import type { ScoutInputMode } from '../../../domain/scout/events/ScoutEvent';

interface VisualScoutFormProps {
  readonly mode: Exclude<ScoutInputMode, 'typed'>;
  readonly teams: readonly Team[];
  readonly players: readonly Player[];
  readonly teamId: string;
  readonly playerNumber: string;
  readonly skill: Skill;
  readonly evaluation: string;
  readonly skills: readonly Skill[];
  readonly evaluations: readonly string[];
  readonly hybridCode: string;
  readonly busy: boolean;
  readonly suggestion?: string;
  readonly onTeamChange: (teamId: string) => void;
  readonly onPlayerChange: (playerNumber: string) => void;
  readonly onSkillChange: (skill: Skill) => void;
  readonly onEvaluationChange: (evaluation: string) => void;
  readonly onHybridCodeChange: (code: string) => void;
  readonly onSubmit: FormEventHandler<HTMLFormElement>;
}

const SKILL_LABELS: Readonly<Record<Skill, string>> = {
  serve: 'Saque',
  reception: 'Recepção',
  set: 'Levantamento observado',
  attack: 'Ataque',
  block: 'Bloqueio',
  dig: 'Defesa',
  free_ball: 'Bola de graça',
};

export function VisualScoutForm({
  mode,
  teams,
  players,
  teamId,
  playerNumber,
  skill,
  evaluation,
  skills,
  evaluations,
  hybridCode,
  busy,
  suggestion,
  onTeamChange,
  onPlayerChange,
  onSkillChange,
  onEvaluationChange,
  onHybridCodeChange,
  onSubmit,
}: VisualScoutFormProps) {
  const teamPlayers = players.filter(
    (player) => player.teamId === teamId && player.active !== false,
  );
  return (
    <form className="visual-scout-form" onSubmit={onSubmit}>
      <div className="visual-scout-heading">
        <div>
          <p className="eyebrow">Entrada {mode === 'visual' ? 'visual' : 'híbrida'}</p>
          <h2>{mode === 'visual' ? 'Registrar contato' : 'Confirmar e enriquecer código'}</h2>
        </div>
        {suggestion && <small>Próxima ação sugerida: {suggestion}</small>}
      </div>
      {mode === 'hybrid' && (
        <label className="visual-scout-code">
          Código digitado
          <input
            value={hybridCode}
            onChange={(event) => onHybridCodeChange(event.target.value)}
            placeholder="*08A#"
            autoComplete="off"
            autoCapitalize="characters"
            required
          />
        </label>
      )}
      <div className="visual-scout-fields">
        <label>
          Equipe
          <select value={teamId} onChange={(event) => onTeamChange(event.target.value)} required>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Atleta
          <select
            value={playerNumber}
            onChange={(event) => onPlayerChange(event.target.value)}
            required
          >
            {teamPlayers.map((player) => (
              <option key={player.id} value={player.number}>
                #{String(player.number).padStart(2, '0')}{' '}
                {player.name ?? `Jogador ${player.number}`}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fundamento
          <select
            value={skill}
            onChange={(event) => onSkillChange(event.target.value as Skill)}
            required
          >
            {skills.map((value) => (
              <option key={value} value={value}>
                {SKILL_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Avaliação
          <select
            value={evaluation}
            onChange={(event) => onEvaluationChange(event.target.value)}
            required
          >
            {evaluations.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="capture-help-note">
        Coordenadas e detalhes são opcionais. O levantamento normal continua implícito.
      </p>
      <button className="button primary" type="submit" disabled={busy || !playerNumber}>
        Confirmar um evento
      </button>
    </form>
  );
}

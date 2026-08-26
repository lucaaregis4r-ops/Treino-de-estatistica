import { useState, type FormEvent } from 'react';
import type {
  LineupPositionInput,
  MatchWorkspace,
  StartNextSetInput,
} from '../../../application/ScoutTrainerService';
import {
  ROTATION_POSITIONS,
  type CourtRotationPosition,
  type TacticalRole,
} from '../../../domain/match/lineup/SetLineup';
import type { Player } from '../../../domain/match/entities/Player';

interface NextSetLineupEditorProps {
  readonly workspace: MatchWorkspace;
  readonly busy: boolean;
  readonly onConfirm: (input: StartNextSetInput) => Promise<void>;
}

type Selection = Record<CourtRotationPosition, string>;

function initialSelection(workspace: MatchWorkspace, teamId: string): Selection {
  const lineup = workspace.currentLineups.find((candidate) => candidate.teamId === teamId);
  return Object.fromEntries(
    ROTATION_POSITIONS.map((position) => {
      const slotId = lineup?.positions[position];
      return [position, slotId ? (lineup?.slots[slotId]?.playerId ?? '') : ''];
    }),
  ) as Selection;
}

function registeredRole(player: Player | undefined): TacticalRole {
  if (player?.registeredRole === 'setter' || player?.registeredRole === 'opposite') {
    return player.registeredRole;
  }
  if (player?.registeredRole === 'outside') return 'outside_1';
  if (player?.registeredRole === 'middle') return 'middle_1';
  return 'custom';
}

function lineupInput(
  workspace: MatchWorkspace,
  teamId: string,
  selection: Selection,
): readonly LineupPositionInput[] {
  const current = workspace.currentLineups.find((lineup) => lineup.teamId === teamId);
  return ROTATION_POSITIONS.map((position) => {
    const playerId = selection[position];
    const player = workspace.players.find((candidate) => candidate.id === playerId);
    const currentSlot = current
      ? Object.values(current.slots).find((slot) => slot.playerId === playerId)
      : undefined;
    return {
      position,
      playerNumber: player?.number ?? 0,
      tacticalRole: currentSlot?.tacticalRole ?? registeredRole(player),
    };
  });
}

export function NextSetLineupEditor({ workspace, busy, onConfirm }: NextSetLineupEditorProps) {
  const [teamA, teamB] = workspace.teams;
  const [teamASelection, setTeamASelection] = useState(() => initialSelection(workspace, teamA.id));
  const [teamBSelection, setTeamBSelection] = useState(() => initialSelection(workspace, teamB.id));
  const [servingTeamId, setServingTeamId] = useState(workspace.state.servingTeamId ?? teamA.id);
  const [error, setError] = useState('');

  function teamEditor(
    teamId: string,
    teamName: string,
    selection: Selection,
    setSelection: (value: Selection) => void,
  ) {
    const players = workspace.players
      .filter((player) => player.teamId === teamId && player.active !== false)
      .slice()
      .sort((left, right) => left.number - right.number);
    return (
      <fieldset>
        <legend>{teamName}</legend>
        <div className="next-set-positions">
          {ROTATION_POSITIONS.map((position) => (
            <label key={position}>
              P{position}
              <select
                aria-label={`${teamName}: atleta em P${position} no próximo set`}
                value={selection[position]}
                onChange={(event) => setSelection({ ...selection, [position]: event.target.value })}
              >
                <option value="">Selecione</option>
                {players.map((player) => (
                  <option
                    key={player.id}
                    value={player.id}
                    disabled={
                      player.id !== selection[position] &&
                      Object.values(selection).includes(player.id)
                    }
                  >
                    #{String(player.number).padStart(2, '0')} {player.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const teamAPlayers = Object.values(teamASelection);
    const teamBPlayers = Object.values(teamBSelection);
    if (
      teamAPlayers.some((playerId) => !playerId) ||
      teamBPlayers.some((playerId) => !playerId) ||
      new Set(teamAPlayers).size !== 6 ||
      new Set(teamBPlayers).size !== 6
    ) {
      setError('Escolha seis atletas diferentes para cada equipe.');
      return;
    }
    setError('');
    await onConfirm({
      servingTeamId,
      teamALineup: lineupInput(workspace, teamA.id, teamASelection),
      teamBLineup: lineupInput(workspace, teamB.id, teamBSelection),
    });
  }

  return (
    <section className="next-set-editor" aria-labelledby="next-set-title">
      <div>
        <p className="eyebrow">Set encerrado</p>
        <h2 id="next-set-title">Confirmar escalação do set {workspace.state.currentSet + 1}</h2>
        <p>
          Reposicione livremente os atletas em P1–P6. Isso cria uma nova escalação, não
          substituições.
        </p>
      </div>
      <form onSubmit={(event) => void submit(event)}>
        <div className="next-set-teams">
          {teamEditor(teamA.id, teamA.name, teamASelection, setTeamASelection)}
          {teamEditor(teamB.id, teamB.name, teamBSelection, setTeamBSelection)}
        </div>
        <div className="next-set-actions">
          <label>
            Primeiro saque
            <select
              value={servingTeamId}
              onChange={(event) => setServingTeamId(event.target.value)}
            >
              <option value={teamA.id}>{teamA.name}</option>
              <option value={teamB.id}>{teamB.name}</option>
            </select>
          </label>
          <button className="button primary" type="submit" disabled={busy}>
            Confirmar escalação e iniciar set
          </button>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}

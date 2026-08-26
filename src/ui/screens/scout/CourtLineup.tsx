import { useState, type FormEvent } from 'react';
import type { MatchWorkspace } from '../../../application/ScoutTrainerService';
import type { CourtRotationPosition } from '../../../domain/match/lineup/SetLineup';

const roleLabels: Readonly<Record<string, string>> = {
  setter: 'levantador',
  opposite: 'oposto',
  outside_1: 'ponteiro 1',
  outside_2: 'ponteiro 2',
  outside: 'ponteiro',
  middle_1: 'central 1',
  middle_2: 'central 2',
  middle: 'central',
  libero: 'líbero',
  defensive_specialist: 'especialista defensivo',
  custom: 'personalizado',
};

interface CourtLineupProps {
  readonly workspace: MatchWorkspace;
  readonly teamId: string;
  readonly side: 'home' | 'away';
  readonly busy: boolean;
  readonly onSubstitute: (teamId: string, slotId: string, playerInId: string) => Promise<void>;
}

export function CourtLineup({ workspace, teamId, side, busy, onSubstitute }: CourtLineupProps) {
  const [slotId, setSlotId] = useState('');
  const [playerInId, setPlayerInId] = useState('');
  const team = workspace.teams.find((candidate) => candidate.id === teamId);
  const lineup = workspace.currentLineups.find((candidate) => candidate.teamId === teamId);
  const tacticalState = workspace.state.tacticalStateByTeamId[teamId];
  const activeSetter = workspace.players.find(
    (player) => player.id === tacticalState?.activeSetterPlayerId,
  );
  const occupiedPlayerIds = new Set(
    lineup ? Object.values(lineup.slots).map((slot) => slot.playerId) : [],
  );
  const bench = workspace.players.filter(
    (player) =>
      player.teamId === teamId && player.active !== false && !occupiedPlayerIds.has(player.id),
  );
  const positions: readonly CourtRotationPosition[] =
    side === 'home' ? [4, 3, 2, 5, 6, 1] : [2, 3, 4, 1, 6, 5];
  const recentSubstitutions = workspace.events
    .filter((event) => event.type === 'substitution_made' && event.teamId === teamId)
    .slice(-2)
    .reverse();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!slotId || !playerInId) return;
    await onSubstitute(teamId, slotId, playerInId);
    setSlotId('');
    setPlayerInId('');
  }

  return (
    <article className={`court-lineup ${side}`} aria-label={`Quadra de ${team?.name ?? 'equipe'}`}>
      <header>
        <div>
          <strong>{team?.name}</strong>
          <small>{teamId === workspace.state.servingTeamId ? 'sacando' : 'recebendo'}</small>
        </div>
        <span className={`formation-state ${tacticalState?.formationState ?? 'unknown'}`}>
          {tacticalState?.formationState === 'five_one_inversion'
            ? 'Inversão 5x1'
            : tacticalState?.formationState === 'unknown'
              ? 'Formação indefinida'
              : 'Formação normal'}
        </span>
      </header>
      <ol className="rotation-court">
        {positions.map((position) => {
          const slot = lineup?.slots[lineup.positions[position]];
          const player = workspace.players.find((candidate) => candidate.id === slot?.playerId);
          const isSetter = player?.id === tacticalState?.activeSetterPlayerId;
          const isServer = teamId === workspace.state.servingTeamId && position === 1;
          const isLibero = player
            ? workspace.state.metadata.liberoPlayerIds?.includes(player.id)
            : false;
          return (
            <li
              key={position}
              data-position={position}
              data-player-number={player?.number}
              className={[
                isSetter ? 'setter' : '',
                isServer ? 'server' : '',
                isLibero ? 'libero' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span>P{position}</span>
              <b>#{player ? String(player.number).padStart(2, '0') : '—'}</b>
              <strong>{player?.name ?? 'Vazio'}</strong>
              <small>
                {slot
                  ? (roleLabels[slot.activeRole ?? slot.tacticalRole] ?? slot.tacticalRole)
                  : 'sem slot'}
              </small>
              <div className="court-player-flags">
                {isSetter && <em>L</em>}
                {isServer && <em>S</em>}
                {isLibero && <em>LI</em>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="active-setter-line" aria-live="polite">
        Levantador ativo:{' '}
        <strong>
          {activeSetter
            ? `#${String(activeSetter.number).padStart(2, '0')} ${activeSetter.name ?? ''}`
            : 'indefinido'}
          {tacticalState?.activeSetterPosition ? ` · P${tacticalState.activeSetterPosition}` : ''}
        </strong>
      </p>
      <details className="court-substitution">
        <summary>Substituição</summary>
        <form onSubmit={(event) => void submit(event)}>
          <label>
            Sai
            <select
              aria-label={`${team?.name}: atleta que sai`}
              value={slotId}
              onChange={(event) => setSlotId(event.target.value)}
            >
              <option value="">Atleta em quadra</option>
              {lineup &&
                Object.values(lineup.slots).map((slot) => {
                  const player = workspace.players.find(
                    (candidate) => candidate.id === slot.playerId,
                  );
                  return (
                    <option key={slot.slotId} value={slot.slotId}>
                      #{player ? String(player.number).padStart(2, '0') : '—'} {player?.name ?? ''}
                    </option>
                  );
                })}
            </select>
          </label>
          <label>
            Entra
            <select
              aria-label={`${team?.name}: atleta que entra`}
              value={playerInId}
              onChange={(event) => setPlayerInId(event.target.value)}
            >
              <option value="">Atleta do banco</option>
              {bench.map((player) => (
                <option key={player.id} value={player.id}>
                  #{String(player.number).padStart(2, '0')} {player.name ?? ''}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={busy || !slotId || !playerInId}>
            Substituir
          </button>
        </form>
      </details>
      {recentSubstitutions.length > 0 && (
        <ul className="recent-substitutions" aria-label={`Substituições recentes de ${team?.name}`}>
          {recentSubstitutions.map((event) => {
            if (event.type !== 'substitution_made') return null;
            const playerOut = workspace.players.find((player) => player.id === event.playerOutId);
            const playerIn = workspace.players.find((player) => player.id === event.playerInId);
            return (
              <li key={event.id}>
                #{playerOut?.number ?? '—'} saiu · #{playerIn?.number ?? '—'} entrou
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

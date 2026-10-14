import { VOLLEYBALL_ZONE_ORDER } from '../../components/volleyballCourtGeometry';
import { useState, type FormEvent } from 'react';
import type { MatchWorkspace } from '../../../application/ScoutTrainerService';
import type { CourtRotationPosition } from '../../../domain/match/lineup/SetLineup';
import { visualCourtPlayers } from './visualCourtPlayers';

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
  const [submitting, setSubmitting] = useState(false);
  const [substitutionError, setSubstitutionError] = useState('');
  const [substitutionStatus, setSubstitutionStatus] = useState('');
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
  const positions: readonly CourtRotationPosition[] = VOLLEYBALL_ZONE_ORDER;
  const recentSubstitutions = workspace.events
    .filter((event) => event.type === 'substitution_made' && event.teamId === teamId)
    .slice(-2)
    .reverse();

  const courtPlayers = visualCourtPlayers(workspace, teamId);

  // Inversão do 5x1 rápida
  const isInverted = tacticalState?.formationState === 'five_one_inversion';
  const setterSlot = Object.values(lineup?.slots ?? {}).find(
    (s) => s.tacticalRole === 'setter' || s.activeRole === 'setter',
  );
  const oppositeSlot = Object.values(lineup?.slots ?? {}).find(
    (s) => s.tacticalRole === 'opposite' || s.activeRole === 'opposite',
  );
  const reserveSetter = bench.find((p) => p.registeredRole === 'setter');
  const reserveOpposite = bench.find(
    (p) => p.registeredRole === 'opposite' || p.registeredRole === 'outside',
  );

  const canInvert5x1 = !isInverted && setterSlot && oppositeSlot && reserveSetter && reserveOpposite;
  const canReturn5x1 = isInverted && setterSlot && oppositeSlot;

  const selectedPosition = positions.find((p) => lineup?.positions[p] === slotId);
  const isFrontRowSelected = selectedPosition && [4, 3, 2].includes(selectedPosition);
  const eligibleBench = bench.filter((p) => {
    if (isFrontRowSelected) {
      return (
        p.registeredRole !== 'libero' &&
        !workspace.state.metadata.liberoPlayerIds?.includes(p.id)
      );
    }
    return true;
  });

  async function applyDirectSubstitution(targetSlotId: string, incomingPlayerId: string) {
    if (busy || submitting || !targetSlotId || !incomingPlayerId) return;
    setSubmitting(true);
    setSubstitutionError('');
    setSubstitutionStatus('Aplicando troca…');
    try {
      await onSubstitute(teamId, targetSlotId, incomingPlayerId);
      setSlotId('');
      setPlayerInId('');
      setSubstitutionStatus('Troca aplicada com sucesso.');
    } catch {
      setSubstitutionStatus('');
      setSubstitutionError('Não foi possível aplicar a troca. A escalação foi preservada.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleInvert5x1() {
    if (!setterSlot || !oppositeSlot || !reserveSetter || !reserveOpposite || busy || submitting)
      return;
    setSubmitting(true);
    setSubstitutionError('');
    setSubstitutionStatus('Aplicando Inversão 5x1…');
    try {
      await onSubstitute(teamId, setterSlot.slotId, reserveOpposite.id);
      await onSubstitute(teamId, oppositeSlot.slotId, reserveSetter.id);
      setSubstitutionStatus('Inversão 5x1 aplicada!');
    } catch {
      setSubstitutionError('Não foi possível concluir a inversão 5x1.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReturn5x1() {
    if (!setterSlot || !oppositeSlot || busy || submitting) return;
    const origSetter = setterSlot.originalPlayerId;
    const origOpposite = oppositeSlot.originalPlayerId;
    if (!origSetter || !origOpposite) return;

    setSubmitting(true);
    setSubstitutionError('');
    setSubstitutionStatus('Retornando 5x1 titular…');
    try {
      await onSubstitute(teamId, setterSlot.slotId, origSetter);
      await onSubstitute(teamId, oppositeSlot.slotId, origOpposite);
      setSubstitutionStatus('5x1 titular restaurado!');
    } catch {
      setSubstitutionError('Não foi possível desfazer a inversão.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!slotId || !playerInId) return;
    await applyDirectSubstitution(slotId, playerInId);
  }

  return (
    <article className={`court-lineup ${side}`} aria-label={`Quadra de ${team?.name ?? 'equipe'}`}>
      <header>
        <div>
          <strong>{team?.name}</strong>
          <small>{teamId === workspace.state.servingTeamId ? 'sacando' : 'recebendo'}</small>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {canInvert5x1 && (
            <button
              type="button"
              className="btn-inversion"
              style={{
                background: 'var(--cyan)',
                color: '#07110e',
                border: 'none',
                borderRadius: '0.35rem',
                padding: '0.2rem 0.5rem',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
              title={`Inverter 5x1: entra #${reserveOpposite?.number} (oposto) e #${reserveSetter?.number} (levantador)`}
              onClick={() => void handleInvert5x1()}
              disabled={busy || submitting}
            >
              ⚡ Inversão 5x1
            </button>
          )}
          {canReturn5x1 && (
            <button
              type="button"
              className="btn-inversion active"
              style={{
                background: 'var(--accent)',
                color: '#07110e',
                border: 'none',
                borderRadius: '0.35rem',
                padding: '0.2rem 0.5rem',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
              title="Desfazer inversão e retornar levantador e oposto titulares"
              onClick={() => void handleReturn5x1()}
              disabled={busy || submitting}
            >
              ↩ Voltar 5x1
            </button>
          )}
          <span className={`formation-state ${tacticalState?.formationState ?? 'unknown'}`}>
            {tacticalState?.formationState === 'five_one_inversion'
              ? 'Inversão 5x1'
              : tacticalState?.formationState === 'unknown'
                ? 'Formação indefinida'
                : 'Formação normal'}
          </span>
        </div>
      </header>
      <div className="lineup-net-label">REDE · vista da equipe</div>
      <ol className="rotation-court">
        {positions.map((position) => {
          const cell = courtPlayers.find((c) => c.position === position);
          const slot = cell?.slot ?? lineup?.slots[lineup?.positions[position] ?? ''];
          const player = cell?.player;
          const isSetter = player?.id === tacticalState?.activeSetterPlayerId;
          const isServer = teamId === workspace.state.servingTeamId && position === 1;
          const isLibero = player
            ? workspace.state.metadata.liberoPlayerIds?.includes(player.id) ||
              player.registeredRole === 'libero'
            : false;
          const isSelected = slot && slot.slotId === slotId;
          return (
            <li
              key={position}
              data-position={position}
              data-player-number={player?.number}
              style={isSelected ? { outline: '2px solid var(--accent)' } : undefined}
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
                  ? roleLabels[slot.activeRole ?? slot.tacticalRole] ?? slot.tacticalRole
                  : 'sem slot'}
              </small>
              <div className="court-player-flags">
                {isSetter && <em>L</em>}
                {isServer && <em>S</em>}
                {isLibero && <em>LI</em>}
              </div>
              {slot && player && (
                <button
                  type="button"
                  className="substitution-trigger"
                  aria-label={`Trocar ${player.name ?? `#${player.number}`}`}
                  onClick={() => {
                    setSlotId(slot.slotId === slotId ? '' : slot.slotId);
                    setPlayerInId('');
                    setSubstitutionError('');
                    setSubstitutionStatus('');
                  }}
                >
                  {isSelected ? 'Cancelar' : 'Trocar'}
                </button>
              )}
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

      {/* Troca Rápida ao clicar em 'Trocar' na quadra */}
      {slotId && (
        <div
          style={{
            margin: '0.5rem 0',
            padding: '0.6rem',
            background: '#132822',
            border: '1px solid var(--cyan)',
            borderRadius: '0.4rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.4rem',
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--cyan)' }}>
              Substituir em P{selectedPosition} ({isFrontRowSelected ? 'Rede' : 'Fundo'}):
            </span>
            <button
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                fontSize: '0.7rem',
              }}
              onClick={() => setSlotId('')}
            >
              ✕ Fechar
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {eligibleBench.map((p) => (
              <button
                key={p.id}
                type="button"
                style={{
                  background: '#091512',
                  border: '1px solid var(--line)',
                  borderRadius: '0.3rem',
                  padding: '0.25rem 0.5rem',
                  color: 'var(--st-text)',
                  fontSize: '0.68rem',
                  cursor: 'pointer',
                }}
                title={`Clique para colocar #${p.number} ${p.name ?? ''} em quadra imediatamente`}
                onClick={() => void applyDirectSubstitution(slotId, p.id)}
                disabled={busy || submitting}
              >
                #{String(p.number).padStart(2, '0')} {p.name ?? ''}{' '}
                <small style={{ color: 'var(--muted)' }}>
                  ({roleLabels[p.registeredRole ?? ''] ?? p.registeredRole ?? 'reserva'})
                </small>
              </button>
            ))}
            {eligibleBench.length === 0 && (
              <small style={{ color: 'var(--muted)', fontSize: '0.65rem' }}>
                Nenhum reserva elegível para esta posição.
              </small>
            )}
          </div>
        </div>
      )}

      <section className="court-substitution">
        <h3>Substituição Completa</h3>
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
          <div className="quick-substitution-bench" aria-label={`${team?.name}: atleta que entra`}>
            <span>Entra</span>
            <div>
              {eligibleBench.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  aria-pressed={playerInId === player.id}
                  onClick={() => setPlayerInId(player.id)}
                >
                  #{String(player.number).padStart(2, '0')} {player.name ?? ''}
                </button>
              ))}
              {eligibleBench.length === 0 && <small>Nenhuma reserva disponível.</small>}
            </div>
          </div>
          {substitutionStatus && (
            <p className="substitution-status" role="status">
              {substitutionStatus}
            </p>
          )}
          {substitutionError && (
            <p className="substitution-status substitution-status-error" role="alert">
              {substitutionError}
            </p>
          )}
          <button type="submit" disabled={busy || submitting || !slotId || !playerInId}>
            Aplicar troca
          </button>
        </form>
      </section>
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


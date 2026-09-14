import { useRef, useState, type FormEvent } from 'react';
import type {
  MatchContextAdjustmentInput,
  MatchWorkspace,
} from '../../../application/ScoutTrainerService';
import { ROTATION_POSITIONS } from '../../../domain/match/lineup/SetLineup';

export function QuickMatchAdjustment({
  workspace,
  busy,
  onApply,
}: {
  readonly workspace: MatchWorkspace;
  readonly busy: boolean;
  readonly onApply: (input: MatchContextAdjustmentInput) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <div className="quick-match-adjustment" data-native-keys>
      <button
        ref={trigger}
        type="button"
        className="button secondary"
        disabled={busy}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Ajustar rotação, saque e placar
      </button>
      {open && (
        <AdjustmentForm
          workspace={workspace}
          busy={busy}
          onApply={onApply}
          onClose={() => {
            setOpen(false);
            requestAnimationFrame(() => trigger.current?.focus());
          }}
        />
      )}
    </div>
  );
}

function AdjustmentForm({
  workspace,
  busy,
  onApply,
  onClose,
}: {
  readonly workspace: MatchWorkspace;
  readonly busy: boolean;
  readonly onApply: (input: MatchContextAdjustmentInput) => Promise<void>;
  readonly onClose: () => void;
}) {
  const [servingTeamId, setServingTeamId] = useState(
    workspace.state.servingTeamId ?? workspace.teams[0].id,
  );
  const [score, setScore] = useState(workspace.state.score);
  const [positionOneByTeam, setPositions] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      workspace.currentLineups.map((lineup) => [
        lineup.teamId,
        lineup.slots[lineup.positions[1]].playerId,
      ]),
    ),
  );
  const [resumeFromServe, setResume] = useState(false);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const closedSet =
    workspace.state.matchCompleted ||
    workspace.state.sets.some(
      (set) => set.setNumber === workspace.state.currentSet && set.completed,
    );
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || lock.current || closedSet) return;
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      await onApply({ servingTeamId, score, positionOneByTeam, resumeFromServe });
      onClose();
    } catch {
      setError('Não foi possível aplicar. Suas escolhas foram mantidas; tente novamente.');
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  return (
    <form
      className="quick-adjustment-form"
      aria-label="Ajuste rápido da partida"
      onSubmit={(event) => void submit(event)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !saving && !busy) {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <p>
        Escolha quem está em P1 para girar a equipe inteira, sem trocar atletas. Aplicar limpa o
        rascunho gestual. Nos demais modos, o rascunho é mantido.
      </p>
      {closedSet && (
        <p role="status">Set encerrado: prepare o próximo set nos controles da partida.</p>
      )}
      <fieldset disabled={busy || saving || closedSet}>
        <legend>Contexto do set atual</legend>
        <label>
          Equipe sacadora
          <select
            autoFocus
            value={servingTeamId}
            onChange={(event) => setServingTeamId(event.target.value)}
          >
            {workspace.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <div className="quick-adjustment-teams">
          {workspace.teams.map((team, index) => {
            const key = index === 0 ? 'teamA' : 'teamB';
            const lineup = workspace.currentLineups.find((item) => item.teamId === team.id);
            return (
              <div key={team.id}>
                <strong>
                  {team.name}
                  {team.id === servingTeamId ? ' · sacando' : ''}
                </strong>
                <label>
                  Placar · {team.name}
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={Number.isNaN(score[key]) ? '' : score[key]}
                    onChange={(event) => setScore({ ...score, [key]: event.target.valueAsNumber })}
                  />
                </label>
                <label>
                  P1 / sacador · {team.name}
                  <select
                    disabled={!lineup}
                    value={positionOneByTeam[team.id] ?? ''}
                    onChange={(event) =>
                      setPositions({ ...positionOneByTeam, [team.id]: event.target.value })
                    }
                  >
                    {!lineup && <option value="">Sem escalação</option>}
                    {lineup &&
                      ROTATION_POSITIONS.map((position) => {
                        const id = lineup.slots[lineup.positions[position]].playerId;
                        const player = workspace.players.find((item) => item.id === id);
                        return (
                          <option key={id} value={id}>
                            #{player?.number} {player?.name ?? 'Atleta sem nome'} · atualmente P
                            {position}
                          </option>
                        );
                      })}
                  </select>
                </label>
              </div>
            );
          })}
        </div>
        <label className="quick-resume">
          <input
            type="checkbox"
            checked={resumeFromServe}
            onChange={(event) => setResume(event.target.checked)}
          />
          Retomar pelo saque — encerra a sequência incompleta sem atribuir ponto
        </label>
        <button type="submit" className="button primary">
          {saving ? 'Aplicando…' : 'Aplicar ajustes'}
        </button>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <button
        type="button"
        className="button secondary"
        disabled={saving || busy}
        onClick={onClose}
      >
        Cancelar · Esc
      </button>
    </form>
  );
}

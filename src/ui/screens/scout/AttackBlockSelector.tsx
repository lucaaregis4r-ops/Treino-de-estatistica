import type { AttackBlockOutcome } from '../../../domain/scout/tactical/TacticalMetadata';

export interface AttackBlockerOption {
  readonly id: string;
  readonly label: string;
  readonly position?: number;
}

const options: readonly { value: AttackBlockOutcome; label: string }[] = [
  { value: 'none', label: 'Sem bloqueio' },
  { value: 'point', label: 'Ponto de bloqueio' },
  { value: 'tool', label: 'Bloqueio explorado' },
  { value: 'soft_touch', label: 'Bloqueio amortecido' },
];

export function AttackBlockSelector({
  value,
  blockerIds,
  blockers,
  onChange,
  onBlockersChange,
}: {
  readonly value: AttackBlockOutcome;
  readonly blockerIds: readonly string[];
  readonly blockers: readonly AttackBlockerOption[];
  readonly onChange: (value: AttackBlockOutcome) => void;
  readonly onBlockersChange: (ids: readonly string[]) => void;
}) {
  return (
    <fieldset className="attack-block-selector" aria-label="Bloqueio do ataque">
      <legend>Bloqueio <small>opcional</small></legend>
      <div className="attack-block-options">
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name="attack-block-outcome"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {value !== 'none' && blockers.length > 0 && (
        <div className="attack-blockers" role="group" aria-label="Bloqueadores">
          <span>Bloqueadores <small>opcional</small></span>
          <div>
            {blockers.map((player) => (
              <label key={player.id}>
                <input
                  type="checkbox"
                  checked={blockerIds.includes(player.id)}
                  onChange={() =>
                    onBlockersChange(
                      blockerIds.includes(player.id)
                        ? blockerIds.filter((id) => id !== player.id)
                        : [...blockerIds, player.id],
                    )
                  }
                />
                {player.label}{player.position ? ` · P${player.position}` : ''}
              </label>
            ))}
          </div>
        </div>
      )}
    </fieldset>
  );
}

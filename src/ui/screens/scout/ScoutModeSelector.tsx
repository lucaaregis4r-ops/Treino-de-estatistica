import type { ScoutInputMode } from '../../../domain/scout/events/ScoutEvent';

interface ScoutModeSelectorProps {
  readonly mode: ScoutInputMode;
  readonly disabled?: boolean;
  readonly onChange: (mode: ScoutInputMode) => void;
}

const MODES: readonly { value: ScoutInputMode; label: string }[] = [
  { value: 'typed', label: 'Digitado' },
  { value: 'visual', label: 'Visual' },
  { value: 'hybrid', label: 'Híbrido' },
];

export function ScoutModeSelector({ mode, disabled, onChange }: ScoutModeSelectorProps) {
  return (
    <div className="scout-mode-selector" role="group" aria-label="Modo de entrada do scout">
      {MODES.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={mode === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

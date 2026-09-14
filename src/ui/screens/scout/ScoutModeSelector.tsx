import type { ScoutInputMode } from '../../../domain/scout/events/ScoutEvent';

export type ScoutCaptureMode = ScoutInputMode | 'gesture';

interface ScoutModeSelectorProps {
  readonly mode: ScoutCaptureMode;
  readonly disabled?: boolean;
  readonly onChange: (mode: ScoutCaptureMode) => void;
}

const MODES: readonly { value: ScoutCaptureMode; label: string }[] = [
  { value: 'typed', label: 'Digitado' },
  { value: 'visual', label: 'Visual' },
  { value: 'hybrid', label: 'Híbrido' },
  { value: 'gesture', label: 'Gestual' },
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

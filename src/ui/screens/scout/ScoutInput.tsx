import type { FormEventHandler, KeyboardEventHandler, Ref, ChangeEventHandler } from 'react';
import type { InputCandidateState } from '../../../domain/scout/input/InputCandidateState';

const candidateLabels: Readonly<Record<InputCandidateState, string>> = {
  empty: 'Pronto',
  prefix: 'Digitando',
  core_complete: 'Código completo',
  enriching: 'Detalhes',
  complete: 'Registrado',
  invalid: 'Código inválido',
};

interface ScoutInputProps {
  readonly inputRef: Ref<HTMLInputElement>;
  readonly value: string;
  readonly editing: boolean;
  readonly candidateState: InputCandidateState;
  readonly placeholder: string;
  readonly onSubmit: FormEventHandler<HTMLFormElement>;
  readonly onChange: ChangeEventHandler<HTMLInputElement>;
  readonly onKeyDown: KeyboardEventHandler<HTMLInputElement>;
}

export function ScoutInput({
  inputRef,
  value,
  editing,
  candidateState,
  placeholder,
  onSubmit,
  onChange,
  onKeyDown,
}: ScoutInputProps) {
  return (
    <form className={editing ? 'scout-input editing' : 'scout-input'} onSubmit={onSubmit}>
      <label htmlFor="scout-code">{editing ? 'Corrigindo evento' : 'Digite o código'}</label>
      <div>
        <span aria-hidden="true">›</span>
        <input
          ref={inputRef}
          id="scout-code"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="characters"
          aria-describedby={editing ? undefined : 'input-candidate-state'}
        />
        <kbd>Enter</kbd>
      </div>
      {!editing && (
        <small id="input-candidate-state" className={`input-candidate-state ${candidateState}`}>
          {candidateLabels[candidateState]}
        </small>
      )}
    </form>
  );
}

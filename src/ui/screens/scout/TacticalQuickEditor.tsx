import type { FormEventHandler, KeyboardEventHandler, Ref } from 'react';

interface TacticalQuickEditorProps {
  readonly open: boolean;
  readonly shortcut: string;
  readonly inputRef: Ref<HTMLInputElement>;
  readonly command: string;
  readonly error: string;
  readonly onOpen: () => void;
  readonly onChange: (value: string) => void;
  readonly onSubmit: FormEventHandler<HTMLFormElement>;
  readonly onKeyDown: KeyboardEventHandler<HTMLInputElement>;
}

export function TacticalQuickEditor({
  open,
  shortcut,
  inputRef,
  command,
  error,
  onOpen,
  onChange,
  onSubmit,
  onKeyDown,
}: TacticalQuickEditorProps) {
  return (
    <div className="quick-tactical-workspace">
      <button type="button" onClick={onOpen}>
        Editor rápido <kbd>{shortcut}</kbd>
      </button>
      {open && (
        <form className="quick-tactical-editor" onSubmit={onSubmit}>
          <label htmlFor="quick-tactical-command">Comando tático</label>
          <input
            ref={inputRef}
            id="quick-tactical-command"
            value={command}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="o4 t1 dd ypower c31 qfast b2"
            autoComplete="off"
          />
          <button type="submit">Aplicar e voltar</button>
          {error && <small role="alert">{error}</small>}
        </form>
      )}
    </div>
  );
}

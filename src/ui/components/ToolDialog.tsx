import { useId, useRef, type ReactNode } from 'react';

/** Native modal: focus stays inside and returns to the opener on close. */
export function ToolDialog({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return <div className="tool-dialog-trigger" data-native-keys>
    <button type="button" aria-haspopup="dialog" onClick={() => ref.current?.showModal()}>{label}</button>
    <dialog ref={ref} className="tool-dialog" aria-labelledby={titleId} onClick={(event) => {
      if (event.target === event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) ref.current?.close();
      }
    }}>
      <header><h2 id={titleId}>{label}</h2><button type="button" aria-label={`Fechar ${label}`} onClick={() => ref.current?.close()}>Fechar ×</button></header>
      {children}
    </dialog>
  </div>;
}

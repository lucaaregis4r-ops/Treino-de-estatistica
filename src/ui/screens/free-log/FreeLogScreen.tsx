import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { FreeLogSession } from '../../../domain/free-log/FreeLogSession';

interface FreeLogScreenProps {
  readonly sessions: readonly FreeLogSession[];
  readonly session?: FreeLogSession;
  readonly busy: boolean;
  readonly onBack: () => void;
  readonly onStart: (name: string) => Promise<void>;
  readonly onOpen: (id: string) => Promise<void>;
  readonly onRegister: (value: string) => Promise<void>;
  readonly onExport: (format: 'csv' | 'txt') => void;
  readonly onCloseSession: () => void;
}

export function FreeLogScreen({
  sessions,
  session,
  busy,
  onBack,
  onStart,
  onOpen,
  onRegister,
  onExport,
  onCloseSession,
}: FreeLogScreenProps) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session) inputRef.current?.focus();
  }, [session, session?.entries.length]);

  async function register(event: FormEvent) {
    event.preventDefault();
    if (!value.trim() || busy) return;
    await onRegister(value);
    setValue('');
  }

  if (!session) {
    return (
      <section className="page-section free-log-setup" aria-labelledby="free-log-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Registro sem regras</p>
            <h1 id="free-log-title">Área livre</h1>
          </div>
          <button className="button ghost" type="button" onClick={onBack}>
            Voltar
          </button>
        </div>
        <p className="free-log-intro">
          Registre códigos, observações ou sequências de treino. Nenhum parser, placar ou regra de
          partida será aplicado.
        </p>
        <div className="free-log-create">
          <label>
            Nome da sessão
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Treino de recepção"
            />
          </label>
          <button className="button primary" type="button" onClick={() => void onStart(name)}>
            Novo registro livre
          </button>
        </div>
        {sessions.length > 0 && (
          <section className="training-history">
            <p className="eyebrow">Histórico local</p>
            <h2>Registros anteriores</h2>
            <ul>
              {sessions.map((item) => (
                <li key={item.id}>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.entries.length} registros</small>
                  </span>
                  <button type="button" onClick={() => void onOpen(item.id)}>
                    Abrir
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>
    );
  }

  return (
    <section className="page-section free-log-screen" aria-labelledby="free-session-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Registro livre ativo</p>
          <h1 id="free-session-title">{session.name}</h1>
        </div>
        <button className="button ghost" type="button" onClick={onCloseSession}>
          Outras sessões
        </button>
      </div>
      <form className="free-log-input" onSubmit={(event) => void register(event)}>
        <label htmlFor="free-log-value">Digite qualquer registro</label>
        <div>
          <span>›</span>
          <input
            ref={inputRef}
            id="free-log-value"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Código ou observação"
            autoComplete="off"
          />
          <kbd>Enter</kbd>
        </div>
      </form>
      <div className="free-log-toolbar">
        <span>{session.entries.length} registros</span>
        <div>
          <button className="button secondary" type="button" onClick={() => onExport('csv')}>
            Exportar CSV
          </button>
          <button className="button secondary" type="button" onClick={() => onExport('txt')}>
            Exportar TXT
          </button>
        </div>
      </div>
      {session.entries.length === 0 ? (
        <p className="history-empty">Os registros aparecerão aqui.</p>
      ) : (
        <ol className="free-log-entries">
          {[...session.entries].reverse().map((entry) => (
            <li key={entry.id}>
              <span>{entry.sequence}</span>
              <code>{entry.value}</code>
              <time>{new Date(entry.createdAt).toLocaleTimeString('pt-BR')}</time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

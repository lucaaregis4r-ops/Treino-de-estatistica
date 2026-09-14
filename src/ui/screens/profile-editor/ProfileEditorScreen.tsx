import { useState, type FormEvent } from 'react';
import type { SerializedCodeProfileInput } from '../../../application/profile-editor/ProfileEditorService';
import type { CodeProfile } from '../../../profiles/types';

interface ProfileEditorScreenProps {
  readonly profiles: readonly CodeProfile[];
  readonly busy: boolean;
  readonly onBack: () => void;
  readonly onSave: (input: SerializedCodeProfileInput) => Promise<void>;
  readonly onExport: (profile: CodeProfile) => void;
}

export function ProfileEditorScreen({
  profiles,
  busy,
  onBack,
  onSave,
  onExport,
}: ProfileEditorScreenProps) {
  const [id, setId] = useState('meu_profile');
  const [version, setVersion] = useState('1.0.0');
  const [name, setName] = useState('Meu perfil');
  const [grammar, setGrammar] = useState('player, skill, evaluation');
  const [skillsJson, setSkillsJson] = useState(
    '{\n  "S": "serve",\n  "R": "reception",\n  "A": "attack",\n  "B": "block"\n}',
  );
  const [evaluationsJson, setEvaluationsJson] = useState(
    '{\n  "#": "excellent",\n  "+": "positive",\n  "!": "neutral",\n  "=": "error"\n}',
  );
  const [aliasesJson, setAliasesJson] = useState('{}');
  const [tacticalInputJson, setTacticalInputJson] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({
      id,
      version,
      name,
      grammar,
      skillsJson,
      evaluationsJson,
      aliasesJson,
      tacticalInputJson,
    });
  }

  return (
    <section className="page-section profile-editor" aria-labelledby="profile-editor-title">
      <div className="section-heading">
        <div>
          <h1 id="profile-editor-title">Editor de perfis</h1>
        </div>
        <button className="button ghost" type="button" onClick={onBack}>
          Voltar
        </button>
      </div>
      <div className="profile-editor-layout">
        <form className="profile-editor-form" onSubmit={(event) => void submit(event)}>
          <div className="profile-editor-basics">
            <label htmlFor="profile-id">
              ID
              <input
                id="profile-id"
                value={id}
                onChange={(event) => setId(event.target.value)}
                pattern="[a-z0-9_-]+"
                required
              />
            </label>
            <label htmlFor="profile-version">
              Versão
              <input
                id="profile-version"
                value={version}
                onChange={(event) => setVersion(event.target.value)}
                placeholder="1.0.0"
                required
              />
            </label>
            <label htmlFor="profile-name">
              Nome
              <input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
          </div>
          <label htmlFor="profile-grammar">
            Campos obrigatórios / gramática
            <input
              id="profile-grammar"
              value={grammar}
              onChange={(event) => setGrammar(event.target.value)}
              aria-describedby="grammar-help"
              required
            />
          </label>
          <small id="grammar-help">
            Use player, skill e evaluation na ordem desejada. O arquivo gerado permanece um
            CodeProfile, sem código TypeScript.
          </small>
          <div className="mapping-editors">
            <label htmlFor="profile-skills">
              Fundamentos (JSON)
              <textarea
                id="profile-skills"
                value={skillsJson}
                onChange={(event) => setSkillsJson(event.target.value)}
                spellCheck={false}
              />
            </label>
            <label htmlFor="profile-evaluations">
              Avaliações (JSON)
              <textarea
                id="profile-evaluations"
                value={evaluationsJson}
                onChange={(event) => setEvaluationsJson(event.target.value)}
                spellCheck={false}
              />
            </label>
            <label htmlFor="profile-aliases">
              Aliases (JSON)
              <textarea
                id="profile-aliases"
                value={aliasesJson}
                onChange={(event) => setAliasesJson(event.target.value)}
                spellCheck={false}
              />
            </label>
            <label htmlFor="profile-tactical-input">
              Entrada tática (JSON opcional)
              <textarea
                id="profile-tactical-input"
                value={tacticalInputJson}
                onChange={(event) => setTacticalInputJson(event.target.value)}
                placeholder='{"fields": { ... }, "zoneSystem": { ... }, "shortcuts": { ... }}'
                spellCheck={false}
              />
            </label>
          </div>
          <button className="button primary" type="submit" disabled={busy}>
            {busy ? 'Salvando…' : 'Validar e salvar perfil'}
          </button>
        </form>
        <aside className="profile-catalog">
          <h2>Perfis de código disponíveis</h2>
          <ul>
            {profiles.map((profile) => (
              <li key={`${profile.id}@${profile.version}`}>
                <span>
                  <strong>{profile.name}</strong>
                  <code>
                    {profile.id}@{profile.version}
                  </code>
                </span>
                <small>{profile.grammar.join(' → ')}</small>
                <button type="button" onClick={() => onExport(profile)}>
                  Baixar configuração
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}

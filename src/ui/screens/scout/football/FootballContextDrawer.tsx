import { useState } from 'react';
import type { FootballTacticalContext } from '../../../../domain/football/StatsBombContract';

export function FootballContextDrawer({ value, onChange }: { readonly value?: FootballTacticalContext; readonly onChange?: (context: FootballTacticalContext) => void }) {
  const [open, setOpen] = useState(false);
  const [localContext, setContext] = useState<FootballTacticalContext>({ provenance: 'operator_observed' });
  const context = value ?? localContext;
  function update(patch: Partial<FootballTacticalContext>) { const next = { ...context, ...patch }; setContext(next); onChange?.(next); }
  return <details className="football-context-drawer" open={open} onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}>
    <summary>Contexto da posse <small>(opcional)</small></summary>
    <div className="football-context-fields">
      <label>Origem<select value={context.origin ?? ''} onChange={(event) => update({ origin: (event.target.value || undefined) as FootballTacticalContext['origin'] })}><option value="">Não observada</option><option value="corner">Escanteio</option><option value="free_kick">Falta</option><option value="throw_in">Lateral</option><option value="goal_kick">Tiro de meta</option><option value="keeper_distribution">Distribuição do goleiro</option><option value="kick_off">Saída de centro</option><option value="recovery">Recuperação</option><option value="other">Outra</option></select></label>
      <label>Saída observada<select value={context.build_structure ?? ''} onChange={(event) => update({ build_structure: (event.target.value || undefined) as FootballTacticalContext['build_structure'] })}><option value="">Não preencher</option><option>2+1</option><option>2+2</option><option>3+1</option><option>3+2</option><option>2+3</option><option>4+1</option><option value="direct">Direta</option><option value="not_observed">Não observada</option></select></label>
      <label>Bloco adversário<select value={context.block ?? 'unknown'} onChange={event => update({ block: event.target.value as FootballTacticalContext['block'] })}><option value="unknown">Não observado</option><option value="high">Alto</option><option value="middle">Médio</option><option value="low">Baixo</option></select></label>
      <label><input type="checkbox" checked={context.line_break_observed ?? false} onChange={(event) => update({ line_break_observed: event.target.checked })} /> Quebra de linha observada</label>
      <label>Observação<textarea value={context.note ?? ''} onChange={(event) => update({ note: event.target.value || undefined })} /></label>
    </div>
  </details>;
}

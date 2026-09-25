import type { FootballShotContext } from '../../../../domain/football/StatsBombContract';

/** Result selection stays in the action panel; this editor captures optional observed context. */
export function FootballShotPanel({ value, onChange }: { readonly value?: FootballShotContext; readonly onChange: (value: FootballShotContext) => void }) {
  function update(patch: Partial<FootballShotContext>) { onChange({ provenance: 'operator_observed', ...value, ...patch }); }
  return <details className="football-shot-panel"><summary>Detalhes da finalização</summary><label>Força percebida<select value={value?.perceived_force ?? ''} onChange={e => update({ perceived_force: (e.target.value || undefined) as FootballShotContext['perceived_force'] })}><option value="">Não observada</option><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></label><label><input type="checkbox" checked={value?.first_touch ?? false} onChange={e => update({ first_touch: e.target.checked })} /> Finalização de primeira observada</label><p>Essas observações não alteram o xG pré-chute.</p></details>;
}

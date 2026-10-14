import { useState } from 'react';
import { analyzeBasketballMarkov, type BasketballActionState } from '../../../domain/basketball/BasketballActionAnalytics';
import type { BasketballFact } from '../../../domain/basketball/BasketballScout';
import { basketballTactics } from '../scout/BasketballLabels';

const labels: Partial<Record<BasketballActionState, string>> = {
  possession_start: 'Início de posse', pass: 'Passe', shot_missed: 'Arremesso errado', shot_blocked: 'Arremesso bloqueado', shot_made_continue: 'Cesta com continuidade', offensive_rebound: 'Rebote ofensivo', defensive_rebound: 'Rebote defensivo', foul: 'Falta', basket_1: '1 ponto', basket_2: '2 pontos', basket_3: '3 pontos', turnover: 'Perda de posse', opponent_rebound: 'Rebote adversário',
};
function stateLabel(state: BasketballActionState): string { return state.startsWith('tactic:') ? basketballTactics[state.slice(7) as keyof typeof basketballTactics] : labels[state] ?? state; }
function percentage(value: number) { return `${Math.round(value * 100)}%`; }

export function BasketballMarkovAnalysis({ facts, teams }: { readonly facts: readonly BasketballFact[]; readonly teams: readonly { id: string; name: string }[] }) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? '');
  const [chosenFrom, setChosenFrom] = useState<BasketballActionState | ''>('');
  const model = analyzeBasketballMarkov(facts, teamId);
  const origins = [...new Set(model.transitions.map(transition => transition.from))];
  const from = chosenFrom && origins.includes(chosenFrom) ? chosenFrom : origins.includes('possession_start') ? 'possession_start' : origins[0];
  const focused = model.transitions.filter(transition => transition.from === from);
  const recent = model.chains.filter(chain => chain.states.length > 1).slice(-5).reverse();
  return <section className="basketball-markov" aria-label="Cadeia de Markov das ações do basquete">
    <div className="basketball-markov-heading"><div><h2>Cadeias de Markov das ações</h2><p>Probabilidade da próxima ação anotada, condicionada ao estado atual. A cadeia usa somente lances consecutivos da mesma posse; etiquetas táticas de um arremesso ou perda entram antes do resultado.</p></div><label>Equipe<select value={teamId} onChange={event => { setTeamId(event.target.value); setChosenFrom(''); }}>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label></div>
    <p className="basketball-markov-coverage">{model.chains.length} cadeias · {model.completeChains} com desfecho observado · {model.transitions.reduce((sum, transition) => sum + transition.count, 0)} transições anotadas.</p>
    {model.transitions.length ? <>
      <div className="basketball-markov-focus"><label>Estado atual<select value={from} onChange={event => setChosenFrom(event.target.value as BasketballActionState)}>{origins.map(state => <option key={state} value={state}>{stateLabel(state)}</option>)}</select></label><div className="basketball-markov-bars" aria-label={`Próxima ação após ${stateLabel(from)}`}>{focused.map(transition => <div key={transition.to}><span>{stateLabel(transition.to)}</span><div className="basketball-markov-track"><span style={{ width: `${transition.probability * 100}%` }} /></div><strong>{transition.count}/{transition.denominator} · {percentage(transition.probability)}</strong></div>)}</div></div>
      <h3>Transições observadas</h3><div className="basketball-table-scroll"><table><thead><tr><th>De</th><th>Para</th><th>Ocorrências</th><th>Saídas do estado</th><th>Probabilidade</th></tr></thead><tbody>{model.transitions.map(transition => <tr key={`${transition.from}-${transition.to}`}><td>{stateLabel(transition.from)}</td><td>{stateLabel(transition.to)}</td><td>{transition.count}</td><td>{transition.denominator}</td><td>{percentage(transition.probability)}{transition.denominator < 5 ? ' · poucos registros' : ''}</td></tr>)}</tbody></table></div>
      <h3>Últimas cadeias observadas</h3><ol className="basketball-chain-list">{recent.map((chain, index) => <li key={`${chain.factIds.join('-')}-${index}`}><b>{chain.period <= 4 ? `${chain.period}º quarto` : `${chain.period - 4}ª prorrogação`}</b> · {chain.states.map(stateLabel).join(' → ')}{!chain.complete ? ' · sem desfecho anotado' : ''}</li>)}</ol>
    </> : <p>Registre ao menos duas ações consecutivas da mesma posse para formar uma transição.</p>}
    <p>Este é um modelo descritivo de primeira ordem: cada percentual usa as saídas observadas do estado como denominador. Passes não anotados, posições ausentes e posses abertas não são completados por inferência. Corrigir ou desfazer um lance recalcula a cadeia.</p>
  </section>;
}

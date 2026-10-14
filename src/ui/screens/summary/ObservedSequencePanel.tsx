import { useMemo, useState } from 'react';
import type { MatchEvent } from '../../../domain/match/events/MatchEvent';
import { analyzeObservedSequences, observedDurationMs } from '../../../domain/analytics/observed-sequence/ObservedSequenceAnalysis';
import { selectObservedSequences, type ObservedSequence, type ObservedSequenceProjection } from '../../../domain/analytics/observed-sequence/ObservedSequence';
import { exportObservedSequencesCsv, exportObservedSequencesJson, renderObservedSequencesPdf } from '../../../infrastructure/export/observed-sequence/ObservedSequenceExport';
import type { SequenceContextModelResult } from '../../../domain/analytics/observed-sequence/SequenceContextModel';
import './ObservedSequencePanel.css';

const SHOW_LIMIT = 30;
const time = (ms: number | undefined) => ms === undefined ? 'não observado' : `${String(Math.floor(ms / 60_000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
const point = (position: { readonly x: number; readonly y: number } | undefined) => position ? `${Math.round(position.x * 100)}%, ${Math.round(position.y * 100)}%` : 'não observada';
const outcomeText = (unit: ObservedSequence) => unit.outcome ?? 'sem encerramento observado';
const modelActionNames: Readonly<Record<string, string>> = { serve: 'saque', reception: 'recepção', set: 'levantamento', attack: 'ataque', block: 'bloqueio', dig: 'defesa', free_ball: 'bola grátis', fault: 'falta/erro', shot: 'finalização', pass: 'passe', carry: 'condução', tackle: 'desarme', foul: 'falta', restart: 'reinício', recovery: 'recuperação', control: 'controle', pressure: 'pressão', clock: 'relógio', other: 'outra ação' };
const modelContextLabel = (token: string) => { const separator = token.lastIndexOf(':'); const action = token.slice(0, separator); const side = token.slice(separator + 1); return `${modelActionNames[action] ?? action} (${side === 'own' ? 'equipe de referência' : side === 'opponent' ? 'adversário' : 'equipe não atribuída'})`; };
const modelOutcomeNames: Readonly<Record<string, string>> = { point_won: 'ponto ganho', point_lost: 'ponto perdido', goal: 'gol (equipe beneficiada não identificada)', goal_for: 'gol a favor', goal_against: 'gol contra', dead_ball: 'bola parada', turnover: 'troca de posse', contested: 'disputa', unknown_control: 'controle desconhecido', period_boundary: 'fim de período', provider_possession_boundary: 'limite de posse do provedor', restart: 'reinício', foul: 'falta', suspended: 'suspenso' };

export function ObservedSequencePanel({ projection, teams, history = [], sportHint, contextModel, modelLoading = false, modelError }: { readonly projection: ObservedSequenceProjection; readonly teams: readonly { readonly id: string; readonly name: string }[]; readonly history?: readonly MatchEvent[]; readonly sportHint?: 'volleyball' | 'football' | 'futsal'; readonly contextModel?: SequenceContextModelResult; readonly modelLoading?: boolean; readonly modelError?: string }) {
  const [team, setTeam] = useState('');
  const [context, setContext] = useState('');
  const [outcome, setOutcome] = useState('');
  const [coverage, setCoverage] = useState('');
  const [action, setAction] = useState('');
  const [length, setLength] = useState('');
  const [shown, setShown] = useState(SHOW_LIMIT);
  const [variantMode, setVariantMode] = useState<'exact' | 'category'>('category');
  const [showVariantCount, setShowVariantCount] = useState(SHOW_LIMIT);
  const [showPatternCount, setShowPatternCount] = useState(SHOW_LIMIT);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [showTechnicalIds, setShowTechnicalIds] = useState(false);
  const sport = projection.units[0]?.sport ?? sportHint;
  const teamName = (id: string | undefined) => teams.find(item => item.id === id)?.name ?? id ?? 'Ambas as equipes';
  const displayPath = (path: string) => teams.reduce((label, item) => label.replaceAll(`(${item.id})`, `(${item.name})`), path);
  const contexts = [...new Set(projection.units.map(unit => `${unit.context.kind}:${unit.context.number}`))];
  const outcomes = [...new Set(projection.units.flatMap(unit => unit.outcome ? [unit.outcome] : []))];
  const actions = [...new Set(projection.units.flatMap(unit => unit.steps.map(step => step.kind)))].sort();
  const filtered = useMemo(() => selectObservedSequences(projection.units, { ...(team ? { teamId: team } : {}), ...(context ? sport === 'volleyball' ? { setNumber: Number(context.split(':')[1]) } : { period: Number(context.split(':')[1]) } : {}), ...(outcome ? { outcome } : {}), ...(coverage ? { coverage: coverage as 'complete' | 'censored' | 'conflict' } : {}), ...(action ? { actionKind: action } : {}) }).filter(unit => !length || (length === '16+' ? unit.steps.length >= 16 : unit.steps.length >= Number(length.split('-')[0]) && unit.steps.length <= Number(length.split('-')[1] ?? length))), [projection.units, team, context, outcome, coverage, action, length, sport]);
  const analysis = useMemo(() => analyzeObservedSequences(filtered), [filtered]);
  const variants = variantMode === 'exact' ? analysis.exactVariants : analysis.categorizedVariants;
  const sourceByHistoryId = new Map(history.map(event => [event.type === 'scout_registered' ? event.event.id : event.id, event]));
  const sourceRefs = [...new Set(filtered.flatMap(unit => unit.steps.map(step => step.effectiveHistoryId ?? step.sourceId)))];
  const unitMap = useMemo(() => new Map(projection.units.map((u, i) => [u.unitId, { unit: u, index: i + 1 }])), [projection.units]);

  function goToUnit(id: string) {
    const index = filtered.findIndex(unit => unit.unitId === id);
    if (index >= shown) setShown(index + 1);
    requestAnimationFrame(() => document.getElementById(`observed-unit-${encodeURIComponent(id)}`)?.scrollIntoView({ block: 'start' }));
  }
  function goToSource(id: string) {
    setSourcesOpen(true);
    requestAnimationFrame(() => document.getElementById(`observed-source-${encodeURIComponent(id)}`)?.scrollIntoView({ block: 'start' }));
  }
  function download(format: 'csv' | 'json' | 'pdf') {
    const data = format === 'csv' ? exportObservedSequencesCsv(filtered) : format === 'json' ? exportObservedSequencesJson(filtered) : renderObservedSequencesPdf(filtered[0]?.matchId ?? 'Partida', filtered);
    const mime = format === 'csv' ? 'text/csv;charset=utf-8' : format === 'json' ? 'application/json;charset=utf-8' : 'application/pdf';
    const url = URL.createObjectURL(new Blob([data], { type: mime }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `trajetorias-${filtered[0]?.matchId ?? 'partida'}.${format}`; anchor.click();
    URL.revokeObjectURL(url);
  }

  function renderEvidence(unitIds: readonly string[]) {
    if (showTechnicalIds) {
      return (
        <div className="observed-evidence-pills">
          {unitIds.map(id => (
            <span key={id} className="observed-chip observed-chip--neutral" style={{ fontSize: '10px' }}>
              {id}
            </span>
          ))}
        </div>
      );
    }
    return (
      <div className="observed-evidence-pills">
        {unitIds.slice(0, 3).map(id => {
          const item = unitMap.get(id);
          const label = item ? `${item.unit.context.kind === 'set' ? 'Set' : 'P'}${item.unit.context.number} · Rali #${item.index}` : id.slice(-8);
          const outcome = item?.unit.outcome;
          const tone = outcome?.includes('won') || outcome?.includes('goal_for') ? 'win' : outcome?.includes('lost') || outcome?.includes('goal_against') ? 'loss' : 'neutral';
          return (
            <a
              key={id}
              href={`#observed-unit-${encodeURIComponent(id)}`}
              className={`observed-chip observed-chip--${tone}`}
              onClick={event => { event.preventDefault(); goToUnit(id); }}
              title={`Ver ${label} (${outcome ?? 'Em andamento'})`}
            >
              {label}
            </a>
          );
        })}
        {unitIds.length > 3 && (
          <span className="observed-chip-more" title={unitIds.slice(3).map(id => unitMap.get(id) ? `Rali #${unitMap.get(id)!.index}` : id).join(', ')}>
            +{unitIds.length - 3} ralis
          </span>
        )}
      </div>
    );
  }

  function renderVisualPath(rawLabel: string) {
    const label = displayPath(rawLabel);
    const parts = label.split(' → ').map(s => s.trim()).filter(Boolean);
    if (!parts.length) return <span className="observed-empty-path">Sem passos</span>;

    return (
      <div className="observed-path-flow" aria-label={label}>
        {parts.map((part, index) => {
          let tone = 'neutral';
          if (part.includes('ataque') || part.includes('finalização')) tone = 'attack';
          else if (part.includes('recepção') || part.includes('defesa')) tone = 'defense';
          else if (part.includes('bloqueio')) tone = 'block';
          else if (part.includes('saque')) tone = 'serve';
          else if (part.includes('ponto') || part.includes('gol')) tone = 'point';

          return (
            <span key={index} className="observed-step-wrap">
              <span className={`observed-step-pill observed-step--${tone}`}>
                {part}
              </span>
              {index < parts.length - 1 && <span className="observed-step-arrow" aria-hidden="true">➔</span>}
            </span>
          );
        })}
      </div>
    );
  }

  return <section className="observed-sequences" aria-label="Trajetórias completas observadas">
    <h2>{sport === 'volleyball' ? 'Rallies completos registrados' : 'Posses completas registradas'}</h2>
    <p>Uma unidade mantém todos os fatos observados em ordem. Contagens e filtros usam rallies ou posses distintos; cobertura incompleta fica fora das taxas de desfecho.</p>
    <div className="observed-mode"><button type="button" onClick={() => download('csv')}>Exportar trajetórias CSV</button><button type="button" onClick={() => download('json')}>Exportar trajetórias JSON</button><button type="button" onClick={() => download('pdf')}>Exportar resumo PDF</button></div>
    <div className="observed-filters">
      <label>Equipe<select aria-label="Filtrar trajetórias por equipe" value={team} onChange={event => { setTeam(event.target.value); setShown(SHOW_LIMIT); }}><option value="">Todas</option>{teams.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>{sport === 'volleyball' ? 'Set' : 'Período'}<select aria-label="Filtrar trajetórias por período ou set" value={context} onChange={event => setContext(event.target.value)}><option value="">Todos</option>{contexts.map(value => <option key={value} value={value}>{value.split(':')[1]}º</option>)}</select></label>
      <label>Desfecho<select aria-label="Filtrar trajetórias por desfecho" value={outcome} onChange={event => setOutcome(event.target.value)}><option value="">Todos</option>{outcomes.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>Cobertura<select aria-label="Filtrar trajetórias por cobertura" value={coverage} onChange={event => setCoverage(event.target.value)}><option value="">Todas</option><option value="complete">Completa</option><option value="censored">Incompleta</option><option value="conflict">Conflitante</option></select></label>
      <label>Ação presente<select aria-label="Filtrar trajetórias por ação" value={action} onChange={event => setAction(event.target.value)}><option value="">Todas</option>{actions.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>Comprimento<select aria-label="Filtrar trajetórias por comprimento" value={length} onChange={event => setLength(event.target.value)}><option value="">Todos</option><option value="1">1</option><option value="2-3">2–3</option><option value="4-7">4–7</option><option value="8-15">8–15</option><option value="16+">16+</option></select></label>
      <label className="observed-tech-toggle"><input type="checkbox" checked={showTechnicalIds} onChange={event => setShowTechnicalIds(event.target.checked)} /> Exibir IDs técnicos de banco</label>
    </div>
    <div className="observed-counts"><strong>{analysis.total} unidade{analysis.total === 1 ? '' : 's'}</strong><span>{analysis.eligible} elegíveis para desfecho</span><span>{analysis.incomplete} incompletas ou conflitantes</span><span>{projection.unassigned.length} fatos sem unidade</span></div>
    <h3>Comprimento e desfecho</h3>
    <div className="observed-table-scroll"><table><thead><tr><th>Comprimento</th><th>Unidades n</th><th>Elegíveis n</th><th>Desfechos elegíveis</th></tr></thead><tbody>{analysis.lengthBands.map(band => <tr key={band.label}><td>{band.label}</td><td>{band.n}</td><td>{band.eligible}</td><td>{Object.entries(band.outcomes).map(([key, count]) => `${key}: ${count}`).join(' · ') || '—'}</td></tr>)}</tbody></table></div>
    <h3>Variantes da trajetória inteira</h3>
    <div className="observed-mode"><button type="button" aria-pressed={variantMode === 'category'} onClick={() => setVariantMode('category')}>Categorias v1</button><button type="button" aria-pressed={variantMode === 'exact'} onClick={() => setVariantMode('exact')}>Ações exatas</button></div>
    <p>n = unidades distintas. As categorias agrupam tipos de ação e preservam a equipe; nenhum passo é removido.</p>
    <div className="observed-table-scroll"><table><thead><tr><th>Trajetória</th><th>n</th><th>Elegíveis</th><th>Incompletas</th><th>Finalização/ataque</th><th>Desfechos elegíveis</th><th>Evidência</th></tr></thead><tbody>{variants.slice(0, showVariantCount).map(row => <tr key={row.key}><td className="observed-path">{renderVisualPath(row.label)}</td><td>{row.n}</td><td>{row.eligible}</td><td>{row.incomplete}</td><td>{row.shotUnits}</td><td>{Object.entries(row.outcomeCounts).map(([key, count]) => `${key}: ${count}`).join(' · ') || '—'}</td><td>{renderEvidence(row.unitIds)}</td></tr>)}</tbody></table></div>
    {variants.length > showVariantCount && <button type="button" onClick={() => setShowVariantCount(value => value + SHOW_LIMIT)}>Mostrar mais variantes</button>}
    <h3>Padrões contíguos recorrentes</h3><p>Complemento às variantes inteiras: ocorrências podem se repetir na mesma unidade, mas o suporte conta cada unidade uma vez. Padrões exibidos têm suporte de pelo menos duas unidades.</p>
    {!analysis.patternsComplete && <p role="status">Análise de padrões incompleta: limite de processamento atingido após {analysis.patternCandidates} candidatos. As variantes inteiras acima permanecem completas.</p>}
    {analysis.patterns.length ? <div className="observed-table-scroll"><table><thead><tr><th>Padrão</th><th>Unidades com padrão</th><th>Ocorrências</th><th>Evidência</th></tr></thead><tbody>{analysis.patterns.slice(0, showPatternCount).map(row => <tr key={row.key}><td className="observed-path">{renderVisualPath(row.label)}</td><td>{row.support}/{analysis.total}</td><td>{row.occurrences}</td><td>{renderEvidence(row.unitIds)}</td></tr>)}</tbody></table></div> : <p>Sem padrão recorrente com suporte suficiente.</p>}
    {analysis.patterns.length > showPatternCount && <button type="button" onClick={() => setShowPatternCount(value => value + SHOW_LIMIT)}>Mostrar mais padrões</button>}
    <section className="sequence-context-model" aria-label="Modelo de contexto variável">
      <h3>Probabilidades por contexto variável</h3>
      <p>Validação deixando uma partida inteira de fora por vez. Contextos são ajustados separadamente para cada modalidade.</p>
      {modelLoading && <p role="status">Avaliando histórico da modalidade…</p>}
      {!modelLoading && modelError && <p role="status">Modelo indisponível: {modelError}</p>}
      {!modelLoading && !modelError && contextModel?.status === 'unavailable' && <><p role="status">Modelo indisponível neste recorte: {({ no_eligible_units: 'não há unidades completas com desfecho observado', too_few_matches: 'há menos de 5 partidas com unidades elegíveis', too_few_units: 'há menos de 100 unidades elegíveis', unsupported_contexts: 'os contextos não atingem suporte independente suficiente', not_better_than_baselines: 'não supera as linhas de base global, por equipe e de primeira ordem em Brier e log loss', not_calibrated: 'a calibração fora da partida ficou acima do limite definido', resource_limit: 'o limite de memória do modelo foi atingido' } as const)[contextModel.reason ?? 'no_eligible_units']}</p><p>{contextModel.matchCount} partidas · {contextModel.unitCount} unidades · {contextModel.eligibleUnitCount} elegíveis · mínimos: 5 partidas, 100 unidades, 20 unidades distintas e 3 partidas por contexto.</p>{contextModel.metrics && <p>Validação diagnóstica — Brier: global {contextModel.metrics.globalBaseline.brier.toFixed(3)}, equipe {contextModel.metrics.teamBaseline.brier.toFixed(3)}, 1ª ordem {contextModel.metrics.firstOrder.brier.toFixed(3)}, variável {contextModel.metrics.variableContext.brier.toFixed(3)}; log loss: global {contextModel.metrics.globalBaseline.logLoss.toFixed(3)}, equipe {contextModel.metrics.teamBaseline.logLoss.toFixed(3)}, 1ª ordem {contextModel.metrics.firstOrder.logLoss.toFixed(3)}, variável {contextModel.metrics.variableContext.logLoss.toFixed(3)}.</p>}</>}
      {!modelLoading && !modelError && contextModel?.status === 'available' && <><p>{contextModel.matchCount} partidas · {contextModel.eligibleUnitCount} unidades elegíveis · método {contextModel.version}. Validação por partida: Brier {contextModel.metrics?.variableContext.brier.toFixed(3)}, log loss {contextModel.metrics?.variableContext.logLoss.toFixed(3)}, erro de calibração {contextModel.metrics?.variableContext.calibrationError.toFixed(3)}.</p><p>Lado relativo à equipe em posse (futebol/futsal) ou à equipe do primeiro contato (vôlei).</p><div className="observed-table-scroll"><table><thead><tr><th>Contexto de ações observado</th><th>Unidades / partidas</th><th>Desfecho</th><th>Probabilidade e IC 95%</th><th>Evidências</th></tr></thead><tbody>{contextModel.states?.slice(0, 30).map((state, index) => <tr key={`${state.context.join('|')}:${index}`}><td className="observed-path">{state.context.map(modelContextLabel).join(' → ')}</td><td>{state.support} / {state.matchSupport}</td><td>{Object.keys(state.probabilities).map(label => <span key={label}>{modelOutcomeNames[label] ?? label}<br /></span>)}</td><td>{Object.entries(state.probabilities).map(([label, value]) => <span key={label}>{(value.probability * 100).toFixed(1)}% [{(value.low * 100).toFixed(1)}–{(value.high * 100).toFixed(1)}%]<br /></span>)}</td><td>{renderEvidence(state.evidenceUnitIds)}</td></tr>)}</tbody></table></div><p>IC 95% por reamostragem de partidas. Associação observada; não é efeito causal nem previsão certa. Probabilidades exibidas somente após superar as linhas de base global, por equipe e de primeira ordem e cumprir o limite de calibração.</p></>}
      {!contextModel && !modelLoading && !modelError && <p>Modelo aguardando o corpus histórico desta modalidade.</p>}
    </section>
    <h3>Unidades registradas</h3>
    <div className="observed-unit-list">{filtered.slice(0, shown).map((unit, idx) => <details key={unit.unitId} id={`observed-unit-${encodeURIComponent(unit.unitId)}`} className="observed-unit"><summary><strong>{teamName(unit.teamId)}</strong> · {unit.context.number}º {unit.context.kind === 'set' ? 'set' : 'período'} · Rali #{idx + 1} · início {time(unit.start.elapsedMs)} · {unit.steps.length} fatos · duração {time(observedDurationMs(unit))} · {outcomeText(unit)} · {unit.coverage}</summary><p className="observed-unit-meta"><span className="unit-badge">Rali #{idx + 1}</span> · Início: {unit.start.reason} · Fim: {unit.end?.reason ?? 'não observado'} · {unit.censorReasons.length ? `Motivos: ${unit.censorReasons.join(', ')}` : 'Cobertura completa'}</p><ol>{unit.steps.map((step, index) => <li key={`${step.sourceId}:${index}`}><strong>{step.kind}</strong> · {teamName(step.teamId)} · {time(step.elapsedMs)} · origem {point(step.position)}{step.destination && <> · destino {point(step.destination)}</>} · <a href={`#observed-source-${encodeURIComponent(step.effectiveHistoryId ?? step.sourceId)}`} onClick={event => { event.preventDefault(); goToSource(step.effectiveHistoryId ?? step.sourceId); }}>registro original #{step.order ?? index + 1}</a></li>)}</ol></details>)}</div>
    {filtered.length > shown && <button type="button" onClick={() => setShown(value => value + SHOW_LIMIT)}>Mostrar mais unidades</button>}
    <details className="observed-sources" open={sourcesOpen} onToggle={event => setSourcesOpen(event.currentTarget.open)}><summary>Registros originais e IDs de revisão</summary>{sourcesOpen && sourceRefs.map(id => <div key={id} id={`observed-source-${encodeURIComponent(id)}`}><h4>{id}</h4><pre>{JSON.stringify(sourceByHistoryId.get(id) ?? { id, note: 'Fonte presente na projeção; registro bruto indisponível neste histórico.' }, null, 2)}</pre></div>)}</details>
  </section>;
}

import { useMemo, useState } from 'react';
import type { MatchWorkspace, SaveFootballAssistedRecordingInput } from '../../../../application/ScoutTrainerService';
import { resolveFootballAssistedRecording, setFootballAssistedCandidateState, upsertFootballAssistedConfirmation, type FootballAssistedCandidate, type FootballAssistedDescribedAction, type FootballAssistedRecording } from '../../../../domain/football/FootballAssistedRecording';
import type { CanonicalFootballEvent } from '../../../../domain/football/StatsBombContract';
import './FootballAssistedReviewScreen.css';

type ReviewItem = { readonly event: CanonicalFootballEvent; readonly recording: FootballAssistedRecording; readonly candidate: FootballAssistedCandidate; readonly effectiveState: ReturnType<typeof resolveFootballAssistedRecording>['candidates'][number]['effectiveState']; readonly invalidSourceIds: readonly string[] };
type DraftKind = FootballAssistedDescribedAction['kind'];

function playerLabel(player: MatchWorkspace['players'][number]) { return `#${player.number}${player.name ? ` ${player.name}` : ''}`; }

export function FootballAssistedReviewScreen({ workspace, busy = false, onSaveAssisted, onBack }: { readonly workspace: MatchWorkspace; readonly busy?: boolean; readonly onSaveAssisted: (eventId: string, input: SaveFootballAssistedRecordingInput, options?: { readonly silent?: boolean }) => Promise<void>; readonly onBack: () => void }) {
  const [selectedKey, setSelectedKey] = useState<string>();
  const [draftKinds, setDraftKinds] = useState<readonly DraftKind[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [spatialPrecision, setSpatialPrecision] = useState<'point' | 'zone' | 'not_observed'>('not_observed');
  const [temporalPrecision, setTemporalPrecision] = useState<'instant' | 'interval' | 'not_observed'>('interval');
  const [feedback, setFeedback] = useState<string>();
  const items = useMemo((): readonly ReviewItem[] => (workspace.football?.events ?? []).flatMap(event => {
    const recording = event.scout_trainer.assisted_recording;
    if (!recording) return [];
    const resolved = resolveFootballAssistedRecording(recording, workspace.football!.events);
    return resolved.candidates.map(candidate => ({ event, recording, candidate, effectiveState: candidate.effectiveState, invalidSourceIds: candidate.invalidSourceIds }));
  }).sort((left, right) => left.event.index - right.event.index), [workspace]);
  const selected = items.find(item => item.candidate.key === selectedKey);

  function open(item: ReviewItem) {
    setSelectedKey(item.candidate.key); setDraftKinds([]); setRoles({}); setSpatialPrecision('not_observed'); setTemporalPrecision('interval'); setFeedback(undefined);
  }
  async function saveState(item: ReviewItem, state: 'ignored' | 'not_observed' | 'pending') {
    try {
      await onSaveAssisted(item.event.id, { recording: setFootballAssistedCandidateState(item.recording, item.candidate.key, state) }, { silent: true });
      setFeedback(state === 'ignored' ? 'Sugestão ignorada; você pode reabrir depois.' : state === 'not_observed' ? 'Marcada como não observada; você pode reabrir depois.' : 'Sugestão reaberta.');
    } catch { setFeedback('Não foi possível salvar a resposta. O rascunho foi preservado.'); }
  }
  async function confirm(item: ReviewItem) {
    if (!draftKinds.length) { setFeedback('Selecione ao menos uma ação observada ou use Não consegui observar/Ignorar.'); return; }
    const sourceEvents = item.candidate.sourceRevisions.map(source => workspace.football?.events.find(event => event.id === source.eventId)).filter((event): event is CanonicalFootballEvent => Boolean(event));
    const describedActions: FootballAssistedDescribedAction[] = draftKinds.map(kind => ({
      id: `review:${item.candidate.key}:${kind}`,
      kind,
      ...(kind === 'pass' && roles.passerId ? { passerId: roles.passerId } : {}),
      ...(kind === 'pass' && roles.receiverId ? { receiverId: roles.receiverId } : {}),
      ...(kind === 'carry' && roles.carrierId ? { carrierId: roles.carrierId } : {}),
      ...(kind === 'receipt' && roles.recipientId ? { recipientId: roles.recipientId } : {}),
      ...(kind === 'loss' ? { lossKind: (roles.lossKind ?? 'not_observed') as NonNullable<FootballAssistedDescribedAction['lossKind']> } : {}),
      ...(kind === 'loss' && roles.responsibleId ? { responsibleId: roles.responsibleId } : {}),
      ...(kind === 'loss' && roles.recovererId ? { recovererId: roles.recovererId } : {}),
    }));
    const confirmation = {
      id: `review:${item.candidate.key}`, candidateKey: item.candidate.key, actions: [], describedActions,
      segmentEventIds: item.candidate.sourceRevisions.map(source => source.eventId),
      observedAt: sourceEvents.map(event => event.timestamp).sort()[0] ?? item.event.timestamp,
      filledAt: new Date().toISOString(), spatialPrecision, temporalPrecision,
      provenance: 'review_confirmed' as const,
    };
    try {
      await onSaveAssisted(item.event.id, { recording: upsertFootballAssistedConfirmation(item.recording, confirmation) }, { silent: true });
      setFeedback('Descrição observada salva; ela não cria uma ação de jogo.');
    } catch { setFeedback('Não foi possível salvar a descrição. O rascunho foi preservado.'); }
  }
  function toggle(kind: DraftKind) { setDraftKinds(current => current.includes(kind) ? current.filter(item => item !== kind) : [...current, kind]); }
  const roster = workspace.players.filter(player => player.active !== false);
  const sources = selected ? selected.candidate.sourceRevisions.map(source => workspace.football?.events.find(event => event.id === source.eventId)).filter((event): event is CanonicalFootballEvent => Boolean(event)) : [];

  return <section className="scout-screen football-assisted-review" aria-labelledby="football-assisted-review-title">
    <header><div><p className="eyebrow">Revisão voluntária</p><h1 id="football-assisted-review-title">Completar trechos observados</h1></div><button type="button" onClick={onBack}>Voltar ao ao vivo</button></header>
    {!selected && <><p>Abra somente o trecho que quiser revisar. A coleta e o relógio continuam fora desta tela.</p><ol className="football-assisted-review-list">{items.map(item => <li key={item.candidate.key}><div><strong>{item.candidate.reasons.join(' · ')}</strong><span>{item.event.timestamp.slice(3, 8)} · posse {item.event.possession ?? 'não observada'} · {item.effectiveState === 'pending' ? 'a revisar' : item.effectiveState === 'ignored' ? 'ignorada' : item.effectiveState === 'not_observed' ? 'não observada' : item.effectiveState === 'confirmed' ? 'descrita' : 'fonte alterada'}</span></div><button type="button" onClick={() => open(item)}>Revisar trecho</button></li>)}</ol>{!items.length && <p>Nenhuma sugestão local disponível para revisão.</p>}</>}
    {selected && <section className="football-assisted-review-detail" aria-label="Trecho em revisão"><button type="button" className="football-review-back" onClick={() => setSelectedKey(undefined)}>← Lista de trechos</button><h2>{selected.candidate.reasons.join(' · ')}</h2><p>Período {selected.event.period} · posse {selected.event.possession ?? 'não observada'} · fontes {sources.map(event => event.timestamp.slice(3, 8)).join(', ') || 'sem horário observável'}.</p>
      {selected.effectiveState === 'invalid' ? <p role="alert">A fonte {selected.invalidSourceIds.join(', ')} foi corrigida ou removida. Esta resposta permanece rastreada, mas não é elegível; não será reaberta automaticamente.</p> : <>
        {selected.effectiveState !== 'pending' && <button type="button" onClick={() => void saveState(selected, 'pending')} disabled={busy}>Reabrir resposta</button>}
        {selected.effectiveState === 'pending' && <div className="football-review-response"><h3>Descrever trecho</h3><p>Selecione somente o que foi observado. Passe, condução e domínio/recepção podem coexistir.</p>{(['pass', 'carry', 'receipt', 'loss'] as const).map(kind => <label key={kind}><input type="checkbox" checked={draftKinds.includes(kind)} onChange={() => toggle(kind)} /> {kind === 'pass' ? 'Passe' : kind === 'carry' ? 'Condução' : kind === 'receipt' ? 'Domínio/recepção' : 'Perda'}</label>)}
          {draftKinds.includes('pass') && <div><label>Passador (opcional)<select value={roles.passerId ?? ''} onChange={event => setRoles({ ...roles, passerId: event.target.value })}><option value="">Desconhecido</option>{roster.map(player => <option key={player.id} value={player.id}>{playerLabel(player)}</option>)}</select></label><label>Receptor (opcional)<select value={roles.receiverId ?? ''} onChange={event => setRoles({ ...roles, receiverId: event.target.value })}><option value="">Desconhecido</option>{roster.map(player => <option key={player.id} value={player.id}>{playerLabel(player)}</option>)}</select></label></div>}
          {draftKinds.includes('carry') && <label>Condutor (opcional)<select value={roles.carrierId ?? ''} onChange={event => setRoles({ ...roles, carrierId: event.target.value })}><option value="">Desconhecido</option>{roster.map(player => <option key={player.id} value={player.id}>{playerLabel(player)}</option>)}</select></label>}
          {draftKinds.includes('receipt') && <label>Recebedor (opcional)<select value={roles.recipientId ?? ''} onChange={event => setRoles({ ...roles, recipientId: event.target.value })}><option value="">Desconhecido</option>{roster.map(player => <option key={player.id} value={player.id}>{playerLabel(player)}</option>)}</select></label>}
          {draftKinds.includes('loss') && <div><label>Causa da perda<select value={roles.lossKind ?? 'not_observed'} onChange={event => setRoles({ ...roles, lossKind: event.target.value })}><option value="not_observed">Não observada</option><option value="pass_incomplete">Passe errado</option><option value="intercepted">Interceptado</option><option value="out">Fora</option><option value="tackle">Desarme</option><option value="miscontrol">Erro de domínio</option><option value="other">Outra</option></select></label><label>Responsável (opcional)<select value={roles.responsibleId ?? ''} onChange={event => setRoles({ ...roles, responsibleId: event.target.value })}><option value="">Desconhecido</option>{roster.map(player => <option key={player.id} value={player.id}>{playerLabel(player)}</option>)}</select></label><label>Recuperador (opcional)<select value={roles.recovererId ?? ''} onChange={event => setRoles({ ...roles, recovererId: event.target.value })}><option value="">Desconhecido</option>{roster.map(player => <option key={player.id} value={player.id}>{playerLabel(player)}</option>)}</select></label></div>}
          <label>Precisão espacial<select value={spatialPrecision} onChange={event => setSpatialPrecision(event.target.value as typeof spatialPrecision)}><option value="not_observed">Não observada</option><option value="zone">Zona</option><option value="point">Ponto</option></select></label><label>Precisão temporal<select value={temporalPrecision} onChange={event => setTemporalPrecision(event.target.value as typeof temporalPrecision)}><option value="interval">Intervalo</option><option value="instant">Instante</option><option value="not_observed">Não observada</option></select></label><button type="button" disabled={busy} onClick={() => void confirm(selected)}>Salvar descrição observada</button><button type="button" onClick={() => void saveState(selected, 'not_observed')} disabled={busy}>Não consegui observar</button><button type="button" className="football-review-quiet" onClick={() => void saveState(selected, 'ignored')} disabled={busy}>Ignorar</button></div>}
        <details><summary>Detalhes existentes e correção</summary><p>Detalhes locais já vinculados: {selected.recording.details.length + selected.recording.pressures.length}. Pressão, saída/estrutura, roubada, atleta e finalização permanecem editáveis no registro, sem criar uma segunda ação no trecho.</p><button type="button" onClick={onBack}>Voltar ao registro</button></details>
      </>}
      {feedback && <p role="status">{feedback}</p>}
    </section>}
  </section>;
}

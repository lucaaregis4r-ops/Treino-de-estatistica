import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { ProjectedScoutEvent } from '../../../domain/match/events/ScoutTimeline';
import type { MatchWorkspace } from '../../../application/ScoutTrainerService';
import type { Skill } from '../../../domain/scout/entities/Skill';
import type { ScoutCoverage } from '../../../domain/scout/events/ScoutEvent';
import type { SpatialMetadata } from '../../../domain/scout/spatial/SpatialMetadata';
import type { VisualScoutDraft } from '../../../domain/scout/mapper/VisualScoutDraft';
import { SpatialCourtInputV2 } from './SpatialCourtInputV2';
import './VolleyballVisualScout.css';
import { visualSuggestion } from './visualSuggestion';
import { visualCourtPlayers } from './visualCourtPlayers';
import { evaluationLabel, SKILL_LABELS } from './presentationLabels';
import { AttackBlockSelector, type AttackBlockerOption } from './AttackBlockSelector';

const labels = SKILL_LABELS;

export function VolleyballVisualScout({
  workspace,
  busy,
  onRegister,
  onEdit,
  onUndo,
  onRedo,
  coverage,
}: {
  workspace: MatchWorkspace;
  busy: boolean;
  onRegister: (draft: VisualScoutDraft) => Promise<void>;
  onEdit?: (entry: ProjectedScoutEvent) => void;
  onUndo?: () => Promise<void>;
  onRedo?: () => Promise<void>;
  coverage?: ScoutCoverage;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);
  useEffect(() => { formRef.current?.focus({ preventScroll: true }); }, []);
  const suggestion = visualSuggestion(workspace);
  const [teamId, setTeamId] = useState(suggestion.teamId);
  const [playerNumber, setPlayerNumber] = useState<number | undefined>(suggestion.playerNumber);
  const [skill, setSkill] = useState<Skill | undefined>(suggestion.skill);
  const [evaluation, setEvaluation] = useState('');
  const [detail, setDetail] = useState('');
  const [blockOutcome, setBlockOutcome] = useState<import('../../../domain/scout/tactical/TacticalMetadata').AttackBlockOutcome>('none');
  const [blockerIds, setBlockerIds] = useState<readonly string[]>([]);
  const [spatial, setSpatial] = useState<SpatialMetadata>();
  const [cycle, setCycle] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const profile = workspace.profiles.codeProfile;
  const players = workspace.players.filter((p) => p.teamId === teamId && p.active !== false);
  const liberos = players.filter(p => workspace.state.metadata?.liberoPlayerIds?.includes(p.id) || p.registeredRole==='libero');
  const [automaticLibero,setAutomaticLibero] = useState(true);
  const [chosenLibero,setChosenLibero] = useState('');
  const liberoId = liberos.some(p=>p.id===chosenLibero) ? chosenLibero : liberos[0]?.id;
  const lineup = workspace.currentLineups?.find(l => l.teamId === teamId);
  const setterId = workspace.state.tacticalStateByTeamId?.[teamId]?.activeSetterPlayerId;
  const courtPlayers = visualCourtPlayers(workspace,teamId,automaticLibero ? liberoId : undefined);
  const bench = lineup ? players.filter(p => !courtPlayers.some(c => c.player?.id === p.id)) : players;
  const opponentTeamId = workspace.teams.find((team) => team.id !== teamId)?.id;
  const opponentLineupPlayers = opponentTeamId
    ? visualCourtPlayers(workspace, opponentTeamId).map(({ position, player }) => ({ position, player }))
    : [];
  const blockerOptions: readonly AttackBlockerOption[] = [
    ...opponentLineupPlayers
      .filter(({ position, player }) => [2, 3, 4].includes(position) && player)
      .map(({ position, player }) => ({
        id: player!.id,
        position,
        label: `#${player!.number} ${player!.name ?? `Jogador ${player!.number}`}`,
      })),
    ...(opponentTeamId
      ? workspace.players
          .filter((player) => player.teamId === opponentTeamId && player.active !== false)
          .filter((player) => !opponentLineupPlayers.some(({ player: current }) => current?.id === player.id))
          .map((player) => ({ id: player.id, label: `#${player.number} ${player.name ?? `Jogador ${player.number}`}` }))
      : []),
  ];
  const recent = (workspace.timeline ?? []).slice(-5).reverse();
  const missing = [
    !skill && 'ação',
    !evaluation && 'qualidade',
    !spatial && 'origem e destino',
  ].filter(Boolean);
  const disabled = busy || submitting;
  const details =
    skill === 'serve' ? ['Flutuante', 'Viagem'] : skill === 'attack' ? ['Potência', 'Largada'] : [];

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled || submittingRef.current || missing.length || !skill || !spatial) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      await onRegister({
        teamId,
        ...(playerNumber !== undefined ? { playerNumber } : {}),
        ...(coverage ? { coverage } : {}),
        skill,
        evaluation,
        spatial,
        ...(detail ? { skillType: detail } : {}),
        ...(skill === 'attack' && blockOutcome !== 'none' ? { blockOutcome, blockerIds } : {}),
      });
    } catch {
      setSubmitError('Não foi possível registrar a ação. O rascunho foi preservado; tente novamente.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function handleQualityShortcut(event: KeyboardEvent<HTMLFormElement>) {
    const target = event.target as HTMLElement;
    if (target.closest('input,select,textarea,[data-native-keys]') || event.nativeEvent.isComposing) return;
    if ((event.key !== '#' && event.key !== '=') || event.repeat) return;
    const nextEvaluation = Object.entries(profile.evaluations).find(([symbol]) => symbol === event.key)?.[1];
    if (!nextEvaluation) return;
    event.preventDefault();
    setEvaluation((current) => current === nextEvaluation ? '' : nextEvaluation);
  }

  return (
    <form ref={formRef} tabIndex={-1} className="volley-visual" onSubmit={(event) => void submit(event)} onKeyDown={event => {
      handleQualityShortcut(event);
      const target = event.target as HTMLElement;
      if (target.closest('input,select,textarea,[data-native-keys]') || event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        if (!event.repeat && !disabled) event.currentTarget.requestSubmit();
      }
      if (event.key === 'Escape' && !disabled) { event.preventDefault(); setSpatial(undefined); setCycle(c => c + 1); }
    }}>
      <header className="volley-heading">
        <div>
          <p className="eyebrow">Scout visual · Voleibol</p>
          <h2>Registro visual</h2>
        </div>
        <span className="volley-live">{suggestion.skill ? `Sugestão: ${SKILL_LABELS[suggestion.skill]}${suggestion.playerNumber !== undefined ? ` · #${suggestion.playerNumber}` : ''}` : `Set ${workspace.state.currentSet}`}</span>
      </header>
      <div className="volley-score" aria-label="Placar da partida" aria-live="polite">
        <strong>{workspace.teams[0].name}</strong>
        <b>{workspace.state.score?.teamA ?? 0} <span>×</span> {workspace.state.score?.teamB ?? 0}</b>
        <strong>{workspace.teams[1].name}</strong>
        <small>Set {workspace.state.currentSet} · Sets {(workspace.state.sets ?? []).filter(s=>s.winnerTeamId===workspace.teams[0].id).length}–{(workspace.state.sets ?? []).filter(s=>s.winnerTeamId===workspace.teams[1].id).length}</small>
      </div>
      <fieldset disabled={disabled}>
        <div className="volley-teams" aria-label="Equipe da ação">
          {workspace.teams.map((team) => (
            <button
              type="button"
              key={team.id}
              aria-pressed={teamId === team.id}
              onClick={() => {
                setTeamId(team.id);
                setPlayerNumber(undefined);
                setSpatial(undefined);
                setCycle((c) => c + 1);
              }}
            >
              {team.name}
            </button>
          ))}
        </div>
        <div className="volley-board">
          <section className="volley-actions" aria-label="Ações">
            <h3>Ação</h3>
            {[...new Set(Object.values(profile.skills))].map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={skill === value}
                onClick={() => {
                  setSkill(value);
                  setDetail('');
                  if (value !== 'attack') {
                    setBlockOutcome('none');
                    setBlockerIds([]);
                  }
                }}
              >
                {SKILL_LABELS[value]}
              </button>
            ))}
          </section>
          <div className="volley-court">
            <div className="volley-court-heading">
              <h3>Trajetória da bola</h3>
              <span>1 Origem → 2 Destino</span>
            </div>
            <SpatialCourtInputV2
              key={cycle}
              isEnabled
              onConfirm={setSpatial}
              onReset={() => setSpatial(undefined)}
              onCancel={() => {
                setSpatial(undefined);
                setPlayerNumber(undefined);
                setSkill(undefined);
                setEvaluation('');
                setDetail('');
              }}
            />
          </div>
          <section className="volley-quality" aria-label="Qualidade">
            <h3>Qualidade</h3>
            {Object.entries(profile.evaluations).map(([symbol, value]) => (
              <button
                type="button"
                key={symbol}
                aria-label={`Qualidade ${symbol} · ${evaluationLabel(skill ?? 'attack', value)}`}
                aria-pressed={evaluation === value}
                onClick={() => setEvaluation((current) => current === value ? '' : value)}
              >
                <strong>{symbol}</strong>
                <span>{evaluationLabel(skill ?? 'attack', value)}</span>
              </button>
            ))}
          </section>
        </div>
        <section className="volley-roster" aria-label="Atletas">
          <h3>
            Atleta <small>{players.length} disponíveis</small>
          </h3>
          <button
            type="button"
            aria-pressed={playerNumber === undefined}
            onClick={() => setPlayerNumber(undefined)}
          >
            Sem atleta identificado
          </button>
          {liberos.length>0 && <div className="volley-libero-controls"><label><input type="checkbox" checked={automaticLibero} onChange={e=>setAutomaticLibero(e.target.checked)}/>Líbero automático</label>{liberos.length>1 && <select aria-label="Líbero em quadra" value={liberoId} onChange={e=>setChosenLibero(e.target.value)}>{liberos.map(p=><option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}</select>}</div>}
          {lineup && <div className="volley-rotation" aria-label="Atletas na rotação atual">{courtPlayers.map(({position,slot,player}) => {
            const setter = player && (setterId ? player.id === setterId : (slot?.activeRole ?? slot?.tacticalRole) === 'setter');
            return <button type="button" key={position} disabled={!player} aria-pressed={playerNumber===player?.number} className={setter ? 'is-setter' : ''} onClick={()=>player && setPlayerNumber(player.number)}>
              <small>P{position}</small><b>{player ? String(player.number).padStart(2,'0') : '—'}</b><span>{player?.name ?? 'Sem atleta'}</span>{setter && <em>Levantador</em>}{player && liberos.some(p=>p.id===player.id) && <em>Líbero</em>}{position===1 && teamId===workspace.state.servingTeamId && <em>Saque</em>}
            </button>;
          })}</div>}
          {lineup && bench.length > 0 && <h3 className="volley-bench-title">Outros atletas</h3>}
          <div>
            {bench.map((player) => (
              <button
                type="button"
                key={player.id}
                aria-pressed={playerNumber === player.number}
                onClick={() => setPlayerNumber(player.number)}
              >
                <b>{String(player.number).padStart(2, '0')}</b>{' '}
                <span>{player.name || `Jogador ${player.number}`}</span>
              </button>
            ))}
          </div>
        </section>
        {details.length > 0 && (
          <div className="volley-details">
            <span>
              Detalhe <small>opcional</small>
            </span>
            {details.map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={detail === value}
                onClick={() => setDetail(detail === value ? '' : value)}
              >
                {value}
              </button>
            ))}
          </div>
        )}
        {skill === 'attack' && (
          <AttackBlockSelector
            value={blockOutcome}
            blockerIds={blockerIds}
            blockers={blockerOptions}
            onChange={(value) => {
              setBlockOutcome(value);
              if (value === 'none') setBlockerIds([]);
            }}
            onBlockersChange={setBlockerIds}
          />
        )}
        <footer className="volley-submit">
          <p aria-live="polite">
            {missing.length
              ? `Selecione: ${missing.join(', ')}.`
              : `${playerNumber === undefined ? 'Sem atleta identificado' : `#${playerNumber}`} · ${SKILL_LABELS[skill!]} · Trajetória pronta`}
          </p>
          <button
            className="button primary"
            type="submit"
            disabled={disabled || missing.length > 0}
          >
            Registrar ação <kbd>Enter</kbd>
          </button>
        </footer>
        {submitError && <p className="capture-status capture-status-error" role="alert">{submitError}</p>}
        <small className="volley-shortcuts">Enter: registrar · Esc: refazer trajetória</small>
        <section className="volley-recent" aria-label="Cinco últimas ações" data-native-keys>
          <header><h3>Últimas 5 ações</h3><div>{onUndo && <button type="button" onClick={()=>void onUndo()}>Desfazer</button>}{onRedo && <button type="button" onClick={()=>void onRedo()}>Refazer</button>}</div></header>
          {recent.length === 0 ? <small>Nenhuma ação registrada.</small> : <ol>{recent.map(entry => {
            const player = workspace.players.find(p=>p.id===entry.event.playerId);
            const team = workspace.teams.find(t=>t.id===entry.event.teamId);
            const quality = Object.entries(profile.evaluations).find(([,value])=>value===entry.event.evaluation)?.[0] ?? entry.event.evaluation;
            return <li key={entry.sourceEventId}><span>{team?.name} · {player ? `#${player.number}` : 'Sem atleta identificado'}</span><strong>{labels[entry.event.skill]} {quality}</strong><small>Set {entry.event.setNumber}</small>{onEdit && <button type="button" title="Abrir correção por código" onClick={()=>onEdit(entry)}>Corrigir</button>}</li>;
          })}</ol>}
        </section>
      </fieldset>
    </form>
  );
}

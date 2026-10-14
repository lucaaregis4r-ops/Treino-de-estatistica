import { useMemo, useState } from 'react';
import type { MatchWorkspace } from '../../../application/ScoutTrainerService';
import { evaluationLabel, SKILL_LABELS } from '../scout/presentationLabels';
import { buildVolleyballReading, type AthleteReading, type ReadingRate, type TeamReading } from './VolleyballReadingModel';
import './VolleyballReading.css';

type Detail = 'fundamentals' | 'rotations' | 'athletes' | 'actions';
type AthleteSkill = 'attack' | 'serve' | 'reception' | 'block';

function percent(value: number | null) {
  return value === null ? '—' : `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function quantity(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function sample(metric: ReadingRate) {
  return metric.denominator ? `${metric.numerator}/${metric.denominator}` : 'sem amostra';
}

function athleteLabel(athlete: AthleteReading) {
  return `#${String(athlete.number).padStart(2, '0')} ${athlete.name}`;
}

function leadingContribution(athlete: AthleteReading) {
  return [
    athlete.attackPoints ? `${athlete.attackPoints} ataque${athlete.attackPoints === 1 ? '' : 's'}` : undefined,
    athlete.aces ? `${athlete.aces} ace${athlete.aces === 1 ? '' : 's'}` : undefined,
    athlete.blockPoints ? `${athlete.blockPoints} bloqueio${athlete.blockPoints === 1 ? '' : 's'}` : undefined,
    athlete.receptionPositive ? `${athlete.receptionPositive} ${athlete.receptionPositive === 1 ? 'recepção positiva' : 'recepções positivas'}` : undefined,
  ].filter(Boolean).join(' · ');
}

function improvement(athlete: AthleteReading) {
  const parts = [
    athlete.attackErrors ? `${athlete.attackErrors} erro${athlete.attackErrors === 1 ? '' : 's'} de ataque em ${athlete.attackAttempts}` : undefined,
    athlete.attackBlocked ? `${athlete.attackBlocked} ataque${athlete.attackBlocked === 1 ? '' : 's'} bloqueado${athlete.attackBlocked === 1 ? '' : 's'} em ${athlete.attackAttempts}` : undefined,
    athlete.serveErrors ? `${athlete.serveErrors} erro${athlete.serveErrors === 1 ? '' : 's'} de saque em ${athlete.serveAttempts}` : undefined,
    athlete.receptionErrors ? `${athlete.receptionErrors} erro${athlete.receptionErrors === 1 ? '' : 's'} de recepção em ${athlete.receptionAttempts}` : undefined,
  ].filter(Boolean);
  return parts.join(' · ');
}

function StatCard({ label, value, detail, fraction, tone }: {
  readonly label: string; readonly value: string; readonly detail: string;
  readonly fraction?: number | null; readonly tone: string;
}) {
  return <article className={`reading-stat reading-stat--${tone}`}>
    <small>{label}</small><strong>{value}</strong><span>{detail}</span>
    {fraction !== undefined && <div className="reading-meter" aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, (fraction ?? 0) * 100))}%` }} /></div>}
  </article>;
}

function TeamOverview({ team }: { readonly team: TeamReading }) {
  const sampledRotations = team.rotations.filter((rotation) => rotation.sideout.denominator >= 4 && rotation.sideout.value !== null)
    .sort((left, right) => (left.sideout.value ?? 0) - (right.sideout.value ?? 0));
  const lowestSideout = sampledRotations.length >= 2 ? sampledRotations[0] : undefined;
  if (!team.actions) return <section className="reading-empty-team" aria-label={`Estatísticas de ${team.name}`}>
    <h3>{team.name}</h3><p>{team.athleteCount ? 'Ainda não há ações observadas neste recorte.' : 'Sem atletas cadastrados e sem ações individuais neste recorte.'}</p>
  </section>;
  return <section className="reading-team" aria-label={`Estatísticas de ${team.name}`}>
    <div className="reading-team-heading"><h3>{team.name}</h3><span>{team.actions} ações · {team.identifiedActions} com atleta</span></div>
    <div className="reading-stat-grid">
      <StatCard label="Ataque" value={quantity(team.attack.points, 'ponto', 'pontos')} detail={`${team.attack.attempts} tentativas · ${team.attack.errors} erros · ${team.attack.blocked} bloqueados · eficiência ${percent(team.attack.efficiency.value)}`} fraction={team.attack.attempts ? team.attack.points / team.attack.attempts : null} tone="attack" />
      <StatCard label="Saque" value={quantity(team.serve.aces, 'ace', 'aces')} detail={`${team.serve.attempts} saques · ${team.serve.errors} erros`} fraction={team.serve.attempts ? team.serve.aces / team.serve.attempts : null} tone="serve" />
      <StatCard label="Recepção positiva" value={percent(team.reception.positiveRate.value)} detail={`${sample(team.reception.positiveRate)} · ${team.reception.excellent} excelentes · ${team.reception.errors} erros`} fraction={team.reception.positiveRate.value} tone="reception" />
      <StatCard label="Bloqueio" value={quantity(team.block.points, 'ponto', 'pontos')} detail={`${team.block.actions} ações registradas`} tone="block" />
    </div>
    <div className="reading-rally-rates">
      <span><b>Sideout</b> {percent(team.sideout.value)} <small>{sample(team.sideout)}</small></span>
      <span><b>Breakpoint</b> {percent(team.breakpoint.value)} <small>{sample(team.breakpoint)}</small></span>
    </div>
    {lowestSideout && <p className="reading-rotation-insight">Menor sideout entre rotações com ao menos 4 oportunidades: <b>R{lowestSideout.rotation} · {percent(lowestSideout.sideout.value)} ({sample(lowestSideout.sideout)})</b></p>}
  </section>;
}

function AthleteHighlights({ team }: { readonly team: TeamReading }) {
  const positives = [...team.athletes].filter((athlete) => athlete.pointContributions + athlete.receptionPositive > 0)
    .sort((left, right) => right.pointContributions + right.receptionPositive - left.pointContributions - left.receptionPositive || left.number - right.number).slice(0, 3);
  const attention = [...team.athletes]
    .filter((athlete) => athlete.improvementCount >= 2 && athlete.attackAttempts + athlete.serveAttempts + athlete.receptionAttempts >= 4)
    .sort((left, right) => right.improvementCount - left.improvementCount || left.number - right.number).slice(0, 3);
  return <section className="reading-highlights" aria-label={`Destaques de ${team.name}`}>
    <h3>Atletas · {team.name}</h3>
    <div className="reading-highlight-columns">
      <div><h4>Contribuições positivas</h4><p className="reading-criteria">Pontos diretos e recepções positivas registradas.</p>{positives.length ? positives.map((athlete) =>
        <article className="reading-athlete reading-athlete--positive" key={athlete.id}>
          <strong>{athleteLabel(athlete)}</strong><b>{athlete.pointContributions} ponto{athlete.pointContributions === 1 ? '' : 's'} direto{athlete.pointContributions === 1 ? '' : 's'} · {athlete.receptionPositive} {athlete.receptionPositive === 1 ? 'recepção positiva' : 'recepções positivas'}</b><small>{leadingContribution(athlete)}</small>
        </article>) : <p className="reading-empty">Ainda não há pontos diretos ou recepções positivas atribuídos a atletas.</p>}</div>
      <div><h4>Pontos para acompanhar</h4><p className="reading-criteria">Ao menos 2 erros ou ataques bloqueados em 4 ações observadas; confira o contexto da jogada.</p>{attention.length ? attention.map((athlete) =>
        <article className="reading-athlete reading-athlete--attention" key={athlete.id}>
          <strong>{athleteLabel(athlete)}</strong><small>{improvement(athlete)}</small>
        </article>) : <p className="reading-empty">Sem padrão de erros com amostra suficiente neste recorte.</p>}</div>
    </div>
  </section>;
}

export function VolleyballReading({ workspace }: { readonly workspace: MatchWorkspace }) {
  const [setNumber, setSetNumber] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState(workspace.timeline[0]?.event.teamId ?? workspace.teams[0]?.id ?? '');
  const [detail, setDetail] = useState<Detail>('fundamentals');
  const [athleteSkill, setAthleteSkill] = useState<AthleteSkill>('attack');
  const model = useMemo(() => buildVolleyballReading(workspace, setNumber), [workspace, setNumber]);
  const compareAvailable = model.teams.every((team) => team.actions >= 4);
  const visibleTeams = selectedTeamId === 'compare' && compareAvailable
    ? model.teams : model.teams.filter((team) => team.id === selectedTeamId);
  const activeTeams = visibleTeams.length ? visibleTeams : model.teams.slice(0, 1);
  const visibleTeamIds = new Set(activeTeams.map((team) => team.id));
  const visibleRecent = model.events.filter((event) => visibleTeamIds.has(event.teamId)).slice(-8).reverse();
  const [teamA, teamB] = workspace.teams;
  const currentScore = setNumber === null ? workspace.state.score : workspace.state.sets.find((set) => set.setNumber === setNumber)?.score ?? workspace.state.score;
  const detailTabs: readonly [Detail, string][] = [
    ['fundamentals', 'Fundamentos'], ['rotations', 'Rotações'], ['athletes', 'Atletas'], ['actions', 'Últimas ações'],
  ];

  return <section className="volleyball-reading" aria-label="Leitura da partida">
    <header className="reading-header">
      <div><p className="eyebrow">Leitura da partida</p><h2>{setNumber === null ? 'Partida inteira' : `Set ${setNumber}`}</h2><p>{teamA?.name} × {teamB?.name}</p></div>
      <div className="reading-score" aria-label={`${setNumber === null ? 'Placar do set atual' : `Placar do set ${setNumber}`} ${currentScore.teamA} a ${currentScore.teamB}`}><small>{setNumber === null ? `Set ${workspace.state.currentSet} · atual` : `Set ${setNumber}`}</small><strong>{currentScore.teamA}</strong><span>×</span><strong>{currentScore.teamB}</strong></div>
    </header>
    <div className="reading-filters">
      <div className="reading-filter-group" aria-label="Período das estatísticas">
        <button type="button" aria-pressed={setNumber === null} onClick={() => setSetNumber(null)}>Partida</button>
        {workspace.state.sets.map((set) => <button key={set.setNumber} type="button" aria-pressed={setNumber === set.setNumber} onClick={() => setSetNumber(set.setNumber)}>Set {set.setNumber} <small>{set.score.teamA} × {set.score.teamB}</small></button>)}
      </div>
      <div className="reading-filter-group" aria-label="Equipe das estatísticas">
        {model.teams.map((team) => <button key={team.id} type="button" aria-pressed={selectedTeamId === team.id} onClick={() => setSelectedTeamId(team.id)}>{team.name}</button>)}
        {compareAvailable && <button type="button" aria-pressed={selectedTeamId === 'compare'} onClick={() => setSelectedTeamId('compare')}>Comparar</button>}
      </div>
    </div>
    <p className="reading-coverage">{model.teams.filter((team) => team.actions > 0).length === 1 ? 'Ações observadas de apenas uma equipe neste recorte. O placar inclui as duas equipes.' : `${model.teams.reduce((sum, team) => sum + team.actions, 0)} ações observadas neste recorte.`} Taxas mostram numerador/denominador; “—” indica falta de amostra.</p>
    <div className="reading-team-list">{activeTeams.map((team) => <TeamOverview key={team.id} team={team} />)}</div>
    {activeTeams.map((team) => <AthleteHighlights key={team.id} team={team} />)}
    <section className="reading-event-preview" aria-label="Ações recentes observadas">
      <div><h3>O que aconteceu agora</h3><button type="button" onClick={() => setDetail('actions')}>Ver ações</button></div>
      {visibleRecent.length ? <ol>{visibleRecent.slice(0, 4).map((event) => {
        const team = workspace.teams.find((candidate) => candidate.id === event.teamId);
        const player = workspace.players.find((candidate) => candidate.id === event.playerId);
        return <li key={event.id} data-result={event.outcome ?? 'continuation'}>
          <small>Set {event.setNumber} · {team?.name ?? 'Equipe'}</small><strong>{SKILL_LABELS[event.skill]}</strong><span>{player ? `#${player.number} ${player.name ?? ''}` : 'Sem atleta identificado'}</span><b>{event.evaluation ? evaluationLabel(event.skill, event.evaluation) : event.outcome ?? 'registrada'}</b>
        </li>;
      })}</ol> : <p>Ainda não há ações observadas para esta equipe.</p>}
    </section>
    <nav className="reading-tabs" aria-label="Detalhes da leitura">{detailTabs.map(([id, label]) => <button key={id} type="button" aria-pressed={detail === id} onClick={() => setDetail(id)}>{label}</button>)}</nav>
    {detail === 'fundamentals' && <div className="reading-detail-grid">{activeTeams.map((team) => <section className="reading-detail-card" key={team.id}><h3>Fundamentos · {team.name}</h3>{team.actions ? <div className="reading-fundamentals">
      <span><b>Ataque</b>{team.attack.points} pontos · {team.attack.errors} erros · {team.attack.blocked} bloqueados <small>{team.attack.attempts} tentativas · eficiência {percent(team.attack.efficiency.value)}</small></span>
      <span><b>Saque</b>{team.serve.aces} aces · {team.serve.errors} erros <small>{team.serve.attempts} saques</small></span>
      <span><b>Recepção</b>{team.reception.positive} positivas · {team.reception.excellent} excelentes <small>{team.reception.attempts} recepções</small></span>
      <span><b>Bloqueio</b>{team.block.points} pontos <small>{team.block.actions} ações</small></span>
    </div> : <p>Sem ações observadas.</p>}</section>)}</div>}
    {detail === 'rotations' && <div className="reading-detail-grid">{activeTeams.map((team) => <section className="reading-detail-card" key={team.id}><h3>Rotações · {team.name}</h3><div className="reading-rotation-list">{team.rotations.map((rotation) => <div key={rotation.rotation} className="reading-rotation"><strong>R{rotation.rotation}</strong><span>Sideout {percent(rotation.sideout.value)} <small>{sample(rotation.sideout)}</small></span><span>Breakpoint {percent(rotation.breakpoint.value)} <small>{sample(rotation.breakpoint)}</small></span><span>Ataque {percent(rotation.attack.value)} <small>{rotation.attacks} tentativas</small></span></div>)}</div></section>)}</div>}
    {detail === 'athletes' && <div className="reading-athletes-detail">
      <div className="reading-filter-group" aria-label="Fundamento dos atletas">{([['attack', 'Ataque'], ['serve', 'Saque'], ['reception', 'Recepção'], ['block', 'Bloqueio']] as const).map(([skill, label]) => <button key={skill} type="button" aria-pressed={athleteSkill === skill} onClick={() => setAthleteSkill(skill)}>{label}</button>)}</div>
      <div className="reading-detail-grid">{activeTeams.map((team) => <section className="reading-detail-card" key={team.id}><h3>Atletas · {team.name}</h3>{team.athletes.length ? <div className="reading-athlete-list">{team.athletes.map((athlete) => <article key={athlete.id}><strong>{athleteLabel(athlete)}</strong>
        {athleteSkill === 'attack' && <span>{athlete.attackPoints} pontos · {athlete.attackErrors} erros · {athlete.attackBlocked} bloqueados <small>em {athlete.attackAttempts} ataques</small></span>}
        {athleteSkill === 'serve' && <span>{athlete.aces} aces · {athlete.serveErrors} erros <small>em {athlete.serveAttempts} saques</small></span>}
        {athleteSkill === 'reception' && <span>{athlete.receptionPositive} positivas · {athlete.receptionErrors} erros <small>em {athlete.receptionAttempts} recepções</small></span>}
        {athleteSkill === 'block' && <span>{athlete.blockPoints} pontos de bloqueio</span>}
      </article>)}</div> : <p>Sem atletas cadastrados.</p>}</section>)}</div>
    </div>}
    {detail === 'actions' && <section className="reading-detail-card"><h3>O que aconteceu por último</h3>{visibleRecent.length ? <ol className="reading-actions">{visibleRecent.map((event) => {
      const team = workspace.teams.find((candidate) => candidate.id === event.teamId);
      const player = workspace.players.find((candidate) => candidate.id === event.playerId);
      const result = event.evaluation ? evaluationLabel(event.skill, event.evaluation) : event.outcome ?? 'registrada';
      return <li key={event.id} data-result={event.outcome ?? 'continuation'}><strong>{SKILL_LABELS[event.skill]}</strong><span>{team?.name ?? 'Equipe'}{player ? ` · #${player.number} ${player.name ?? ''}` : ''}</span><b>{result}</b><small>Set {event.setNumber} · antes: {event.scoreBefore.teamA} × {event.scoreBefore.teamB}</small></li>;
    })}</ol> : <p>Ainda não há ações neste recorte.</p>}</section>}
  </section>;
}

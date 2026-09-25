import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type {
  AthleteRegistration,
  AthleteRegistrationPosition,
  AthleteRegistrationSport,
  TeamRegistration,
} from '../../../domain/match/entities/Registration';
import {
  browserAthleteRegistrations as athletesRepository,
  browserTeamRegistrations as teamsRepository,
} from '../../app/createBrowserService';
import {
  DEFAULT_COLUMN_ORDER,
  emptyAthleteDraftRow,
  normalizeAthleteName,
  parseAthletePaste,
  validateAthleteDraftRows,
  type AthleteDraftColumn,
  type AthleteRosterDraftRow,
} from './AthleteRosterDraft';
import './registrations.css';

const volleyballRoles = {
  setter: 'Levantador', opposite: 'Oposto', outside: 'Ponteiro', middle: 'Central',
  libero: 'Líbero', defensive_specialist: 'Defensivo', custom: 'Outra',
} as const;
const footballPositions = {
  goalkeeper: 'Goleiro', defender: 'Zagueiro', fullback: 'Lateral', midfielder: 'Meio-campista',
  winger: 'Ponta', forward: 'Atacante', custom: 'Outra',
} as const;
const sportLabels: Record<AthleteRegistrationSport, string> = { volleyball: 'Vôlei', football: 'Futebol' };

function positionLabel(position: AthleteRegistration['position']): string {
  if (!position) return 'Não informada';
  return volleyballRoles[position as keyof typeof volleyballRoles]
    ?? footballPositions[position as keyof typeof footballPositions]
    ?? position;
}
function positionOptions(sport: AthleteRegistrationSport | ''): readonly [string, string][] {
  if (sport === 'volleyball') return Object.entries(volleyballRoles);
  if (sport === 'football') return Object.entries(footballPositions);
  return [];
}
function rowHasData(row: AthleteRosterDraftRow): boolean {
  return Boolean(row.number.trim() || row.name.trim() || row.position.trim() || row.issues.length);
}

export function RegistrationsScreen({ onProfiles, onReturnToMatch }: {
  readonly onProfiles: () => void;
  readonly onReturnToMatch?: () => void;
}) {
  const [tab, setTab] = useState<'athletes' | 'teams'>('teams');
  const [athletes, setAthletes] = useState<readonly AthleteRegistration[]>([]);
  const [teams, setTeams] = useState<readonly TeamRegistration[]>([]);
  const [draftRows, setDraftRows] = useState<readonly AthleteRosterDraftRow[]>([emptyAthleteDraftRow()]);
  const [rosterSport, setRosterSport] = useState<AthleteRegistrationSport | ''>('');
  const [pasteText, setPasteText] = useState('');
  const [pasteHasHeader, setPasteHasHeader] = useState(false);
  const [pasteLegacyComma, setPasteLegacyComma] = useState(false);
  const [pasteColumns, setPasteColumns] = useState<readonly AthleteDraftColumn[]>(DEFAULT_COLUMN_ORDER);
  const [team, setTeam] = useState<Partial<TeamRegistration>>({ athleteIds: [] });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const focusRowId = useRef<string | undefined>(undefined);
  const rowNameInputs = useRef(new Map<string, HTMLInputElement>());
  const savingRoster = useRef(false);

  useEffect(() => {
    let active = true;
    void Promise.all([athletesRepository.list(), teamsRepository.list()]).then(([a, t]) => {
      if (!active) return;
      if (a.ok) setAthletes(a.value); else setError(a.error.message);
      if (t.ok) setTeams(t.value); else setError(t.error.message);
      setBusy(false);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!focusRowId.current) return;
    const id = focusRowId.current;
    focusRowId.current = undefined;
    rowNameInputs.current.get(id)?.focus();
  }, [draftRows]);

  function updateRow(clientRowId: string, patch: Partial<AthleteRosterDraftRow>) {
    setDraftRows((rows) => rows.map((row) => row.clientRowId === clientRowId ? { ...row, ...patch, issues: [] } : row));
  }
  function addDraftRow() {
    const next = emptyAthleteDraftRow();
    focusRowId.current = next.clientRowId;
    setDraftRows((rows) => [...rows, next]);
  }
  function removeDraftRow(clientRowId: string) {
    setDraftRows((rows) => rows.length === 1 ? [emptyAthleteDraftRow()] : rows.filter((row) => row.clientRowId !== clientRowId));
  }
  function handleRowKeyDown(event: KeyboardEvent<HTMLElement>, rowIndex: number) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (rowIndex === draftRows.length - 1) addDraftRow();
  }
  function importPastePreview() {
    const preview = parseAthletePaste(pasteText, { legacyComma: pasteLegacyComma, hasHeader: pasteHasHeader, columnOrder: pasteColumns });
    if (!preview.rows.length) { setError('Cole ao menos uma linha para montar a prévia.'); return; }
    setDraftRows((rows) => [...rows.filter(rowHasData), ...preview.rows]);
    setPasteText(''); setError('');
    setNotice(`${preview.rows.length} linha(s) adicionada(s) à prévia editável.${preview.detectedHeader ? ' Cabeçalho reconhecido.' : ''}`);
  }
  async function saveRoster(event: FormEvent) {
    event.preventDefault();
    if (savingRoster.current) return;
    const filledRows = draftRows.filter(rowHasData);
    if (!filledRows.length) { setError('Adicione ao menos um atleta antes de salvar.'); return; }
    const checkedRows = validateAthleteDraftRows(filledRows, rosterSport);
    const validPositions = new Set(positionOptions(rosterSport).map(([value]) => value));
    const rowsWithPositionErrors = checkedRows.map((row) => row.position && !validPositions.has(row.position)
      ? { ...row, issues: [...row.issues, 'Escolha uma posição compatível com a modalidade.'] } : row);
    setDraftRows(rowsWithPositionErrors);
    if (rowsWithPositionErrors.some((row) => row.issues.length)) { setError('Revise os campos destacados. Nenhum atleta foi gravado.'); return; }
    const now = Date.now();
    const saved = rowsWithPositionErrors.map((row) => {
      const current = row.athleteId ? athletes.find((athlete) => athlete.id === row.athleteId) : undefined;
      return {
        id: row.athleteId ?? crypto.randomUUID(), name: normalizeAthleteName(row.name), sport: rosterSport as AthleteRegistrationSport,
        ...(row.number.trim() ? { number: Number(row.number) } : {}),
        ...(row.position ? { position: row.position as AthleteRegistrationPosition } : {}),
        active: current?.active ?? true, createdAt: current?.createdAt ?? now, updatedAt: now,
      } satisfies AthleteRegistration;
    });
    const stableRows = rowsWithPositionErrors.map((row, index) => ({ ...row, athleteId: saved[index].id }));
    savingRoster.current = true;
    setDraftRows(stableRows); setBusy(true); setError(''); setNotice('');
    const result = await athletesRepository.saveMany(saved);
    savingRoster.current = false;
    setBusy(false);
    if (!result.ok) { setError('O lote não foi gravado. As linhas e seus IDs foram preservados para tentar novamente.'); return; }
    setAthletes((current) => [...current.filter((item) => !saved.some((entry) => entry.id === item.id)), ...saved]);
    setDraftRows([emptyAthleteDraftRow()]);
    setNotice(`${saved.length} atleta(s) salvo(s). Pronto para adicionar o próximo.`);
  }
  function editAthlete(value: AthleteRegistration) {
    const next = { clientRowId: crypto.randomUUID(), athleteId: value.id, number: value.number?.toString() ?? '', name: value.name, position: value.position ?? '', issues: [] } satisfies AthleteRosterDraftRow;
    focusRowId.current = next.clientRowId; setRosterSport(value.sport ?? ''); setDraftRows([next]); setTab('athletes');
    setError(value.sport ? '' : 'Este cadastro antigo não tem modalidade. Escolha uma antes de salvar alterações.');
  }
  async function toggleAthleteActive(value: AthleteRegistration) {
    setBusy(true); const saved = { ...value, active: !value.active, updatedAt: Date.now() }; const result = await athletesRepository.save(saved); setBusy(false);
    if (!result.ok) { setError(result.error.message); return; }
    setAthletes((current) => current.map((item) => item.id === saved.id ? saved : item));
  }
  async function saveTeam(event: FormEvent) {
    event.preventDefault();
    if (!team.name?.trim()) { setError('Informe o nome da equipe.'); return; }
    if (!team.sport) { setError('Escolha a modalidade da equipe antes de salvar.'); return; }
    const now = Date.now(); const athleteIds = team.athleteIds ?? [];
    const incompatibleAthlete = athleteIds
      .map((athleteId) => athletes.find((athlete) => athlete.id === athleteId))
      .find((athlete) => athlete?.sport && athlete.sport !== team.sport);
    if (incompatibleAthlete) {
      setError(`${incompatibleAthlete.name} tem cadastro de ${sportLabels[incompatibleAthlete.sport!]}; ajuste o elenco ou a modalidade da equipe.`);
      return;
    }
    const roster = athleteIds.map((athleteId) => {
      const existing = team.roster?.find((member) => member.athleteId === athleteId);
      if (existing) return existing;
      const athlete = athletes.find((item) => item.id === athleteId);
      return {
        athleteId,
        ...(athlete?.number ? { number: athlete.number } : {}),
        ...(athlete?.position ? { position: athlete.position } : {}),
      };
    });
    const repeatedNumber = roster
      .map((member) => member.number)
      .find((number, index, numbers) => number !== undefined && numbers.indexOf(number) !== index);
    if (repeatedNumber !== undefined) {
      setError(`Camisa ${repeatedNumber} repetida neste elenco. Use números distintos antes de salvar.`);
      return;
    }
    const saved: TeamRegistration = { ...team, id: team.id ?? crypto.randomUUID(), name: team.name.trim(), sport: team.sport, athleteIds, roster, createdAt: team.createdAt ?? now, updatedAt: now };
    setBusy(true); setError(''); const result = await teamsRepository.save(saved); setBusy(false);
    if (!result.ok) { setError(result.error.message); return; }
    setTeams((current) => [...current.filter((item) => item.id !== saved.id), saved]); setTeam({ athleteIds: [] });
  }

  return <section className="page-section registrations-screen" aria-labelledby="registrations-title">
    <div className="section-heading"><div><p className="eyebrow">Cadastros reutilizáveis</p><h1 id="registrations-title">Equipes e atletas</h1></div>{onReturnToMatch && <button className="button ghost" type="button" onClick={onReturnToMatch}>Voltar à partida</button>}</div>
    <nav className="hero-actions" aria-label="Cadastros"><button className="button secondary" type="button" aria-pressed={tab === 'athletes'} onClick={() => setTab('athletes')}>Atletas</button><button className="button secondary" type="button" aria-pressed={tab === 'teams'} onClick={() => setTab('teams')}>Equipes</button><button className="button secondary" type="button" onClick={onProfiles}>Configurações de perfis</button></nav>
    {error && <p id="registrations-error" className="form-error" role="alert">{error}</p>}{notice && <p className="form-notice" role="status">{notice}</p>}
    {tab === 'athletes' ? <>
      <h2>Cadastro rápido de atletas</h2><p className="registration-help">Use uma linha por atleta. Camisa e posição são opcionais; a camisa é conferida somente neste elenco, sem bloquear homônimos ou outra equipe.</p>
      <form aria-describedby={error ? 'registrations-error' : undefined} onSubmit={(event) => void saveRoster(event)}><fieldset disabled={busy} className="registration-fields">
        <label htmlFor="roster-sport">Modalidade<select id="roster-sport" value={rosterSport} onChange={(event) => setRosterSport(event.target.value as AthleteRegistrationSport | '')} required><option value="">Escolha a modalidade</option><option value="volleyball">Vôlei</option><option value="football">Futebol</option></select></label>
        <div className="roster-editor" aria-label="Editor de elenco"><div className="roster-header" aria-hidden="true"><span>Camisa</span><span>Nome</span><span>Posição/função</span><span>Remover</span></div>{draftRows.map((row, index) => <div className="roster-row" key={row.clientRowId}><label><span className="sr-only">Camisa do atleta {index + 1}</span><input inputMode="numeric" value={row.number} onKeyDown={(event) => handleRowKeyDown(event, index)} onChange={(event) => updateRow(row.clientRowId, { number: event.target.value })} /></label><label><span className="sr-only">Nome do atleta {index + 1}</span><input ref={(element) => { if (element) rowNameInputs.current.set(row.clientRowId, element); else rowNameInputs.current.delete(row.clientRowId); }} value={row.name} onKeyDown={(event) => handleRowKeyDown(event, index)} onChange={(event) => updateRow(row.clientRowId, { name: event.target.value })} /></label><label><span className="sr-only">Posição ou função do atleta {index + 1}</span><select value={row.position} onKeyDown={(event) => handleRowKeyDown(event, index)} onChange={(event) => updateRow(row.clientRowId, { position: event.target.value })}><option value="">Não informada</option>{row.position && !positionOptions(rosterSport).some(([value]) => value === row.position) && <option value={row.position}>Importada: {row.position} (revise)</option>}{positionOptions(rosterSport).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="button secondary icon-button" type="button" aria-label={`Remover atleta ${index + 1}`} onClick={() => removeDraftRow(row.clientRowId)}>Remover</button>{row.issues.length > 0 && <p className="row-error" role="alert">{row.issues.join(' ')}</p>}</div>)}</div>
        <div className="hero-actions"><button className="button secondary" type="button" onClick={addDraftRow}>Adicionar atleta</button><button className="button primary" type="submit">Salvar e adicionar próximo</button></div>
      </fieldset></form>
      <details className="paste-import"><summary>Colar lista ou planilha</summary><p>Prévia aceita <code>8 Ana Souza</code>, <code>8;Ana Souza</code> e colunas tabuladas. Revise as linhas antes de salvar.</p><label htmlFor="paste-athletes">Texto copiado<textarea id="paste-athletes" value={pasteText} onChange={(event) => setPasteText(event.target.value)} /></label><div className="paste-options"><label><input type="checkbox" checked={pasteHasHeader} onChange={(event) => setPasteHasHeader(event.target.checked)} /> A primeira linha é cabeçalho</label><label><input type="checkbox" checked={pasteLegacyComma} onChange={(event) => setPasteLegacyComma(event.target.checked)} /> Usar formato legado com vírgulas</label>{pasteColumns.map((column, index) => <label key={`${column}-${index}`}>Coluna {index + 1}<select value={column} onChange={(event) => setPasteColumns((columns) => columns.map((value, current) => current === index ? event.target.value as AthleteDraftColumn : value))}><option value="number">Camisa</option><option value="name">Nome</option><option value="position">Posição/função</option></select></label>)}</div><button className="button secondary" type="button" disabled={busy} onClick={importPastePreview}>Importar para prévia editável</button></details>
      <h2>Atletas cadastrados</h2><ul className="registration-list">{athletes.map((item) => <li key={item.id}><span><strong>{item.number ? `${item.number} · ` : ''}{item.name}</strong> · {item.sport ? sportLabels[item.sport] : 'Modalidade não informada'} · {positionLabel(item.position)} · {item.active ? 'Ativo' : 'Inativo'}</span><div className="hero-actions"><button className="button secondary" type="button" disabled={busy} onClick={() => editAthlete(item)}>Editar</button><button className="button secondary" type="button" disabled={busy} onClick={() => void toggleAthleteActive(item)}>{item.active ? 'Desativar' : 'Reativar'}</button></div></li>)}</ul>{!busy && !athletes.length && <p>Nenhum atleta cadastrado.</p>}
    </> : <>
      <h2>{team.id ? 'Editar equipe' : 'Cadastrar equipe'}</h2><form aria-describedby={error ? 'registrations-error' : undefined} onSubmit={(event) => void saveTeam(event)}><fieldset disabled={busy} className="registration-fields"><label htmlFor="team-name">Nome da equipe<input id="team-name" required value={team.name ?? ''} onChange={(event) => setTeam({ ...team, name: event.target.value })} /></label><label htmlFor="team-sport">Modalidade<select id="team-sport" required value={team.sport ?? ''} onChange={(event) => setTeam({ ...team, sport: event.target.value as AthleteRegistrationSport | undefined })}><option value="">Escolha a modalidade</option><option value="volleyball">Vôlei</option><option value="football">Futebol</option></select></label><label htmlFor="team-short-name">Sigla<input id="team-short-name" value={team.shortName ?? ''} onChange={(event) => setTeam({ ...team, shortName: event.target.value })} /></label><label htmlFor="team-category">Categoria<input id="team-category" value={team.category ?? ''} onChange={(event) => setTeam({ ...team, category: event.target.value })} /></label><fieldset><legend>Atletas do elenco</legend>{athletes.filter((item) => team.athleteIds?.includes(item.id) || !team.sport || !item.sport || item.sport === team.sport).map((item) => <label className="athlete-option" key={item.id}><input type="checkbox" checked={team.athleteIds?.includes(item.id) ?? false} onChange={(event) => setTeam({ ...team, athleteIds: event.target.checked ? [...(team.athleteIds ?? []), item.id] : team.athleteIds?.filter((id) => id !== item.id) })} />{item.name}{item.sport ? ` · ${sportLabels[item.sport]}` : ' · modalidade não informada'}{!item.active && ' (inativo)'}</label>)}{!athletes.length && <p>Cadastre atletas na aba Atletas.</p>}</fieldset><button className="button primary" type="submit">Salvar equipe</button>{team.id && <button className="button secondary" type="button" onClick={() => setTeam({ athleteIds: [] })}>Cancelar edição</button>}</fieldset></form>
      <ul className="registration-list">{teams.map((item) => <li key={item.id}><div><strong>{item.name}</strong> {item.shortName} {item.category}<p>Elenco: {item.athleteIds.map((id) => { const athlete = athletes.find((candidate) => candidate.id === id); return athlete ? `${athlete.name}${athlete.active ? '' : ' (inativo)'}` : 'Atleta indisponível'; }).join(', ') || 'Nenhum atleta'}</p></div><button className="button secondary" type="button" disabled={busy} onClick={() => setTeam(item)}>Editar</button></li>)}</ul>{!busy && !teams.length && <p>Nenhuma equipe cadastrada.</p>}
    </>}
  </section>;
}

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type {
  AthleteRegistration,
  AthleteRegistrationPosition,
  AthleteRegistrationSport,
  TeamRegistration,
  TeamRosterMember,
} from '../../../domain/match/entities/Registration';
import {
  browserAthleteRegistrations,
  browserTeamRegistrations,
} from '../../app/createBrowserService';
import type {
  CreateMatchInput,
  LineupPositionInput,
  PlayerRegistrationInput,
} from '../../../application/ScoutTrainerService';
import type { CodeProfile } from '../../../profiles/types';
import type { TacticalRole } from '../../../domain/match/lineup/SetLineup';
import type { PlayerRole } from '../../../domain/match/roles/PlayerRole';
import {
  emptyAthleteDraftRow,
  normalizeAthleteName,
  parseAthletePaste,
  validateAthleteDraftRows,
  type AthleteRosterDraftRow,
} from '../registrations/AthleteRosterDraft';
import './new-match.css';

type Sport = AthleteRegistrationSport;
type Side = 'A' | 'B';

const volleyballRoles = {
  setter: 'Levantador', opposite: 'Oposto', outside: 'Ponteiro', middle: 'Central',
  libero: 'Líbero', defensive_specialist: 'Defensivo', custom: 'Outra',
} as const;
const footballPositions = {
  goalkeeper: 'Goleiro', defender: 'Zagueiro', fullback: 'Lateral', midfielder: 'Meio-campista',
  winger: 'Ponta', forward: 'Atacante', custom: 'Outra',
} as const;
const tacticalRoles: readonly { value: TacticalRole; label: string }[] = [
  { value: 'setter', label: 'Levantador' }, { value: 'outside_1', label: 'Ponteiro 1' },
  { value: 'middle_1', label: 'Central 1' }, { value: 'opposite', label: 'Oposto' },
  { value: 'outside_2', label: 'Ponteiro 2' }, { value: 'middle_2', label: 'Central 2' },
];
const profileOptions: readonly { id: CreateMatchInput['complexityProfileId']; name: string }[] = [
  { id: 'basic', name: 'Básico' }, { id: 'operational', name: 'Operacional' },
  { id: 'tactical', name: 'Tático' }, { id: 'advanced', name: 'Avançado' }, { id: 'cbv', name: 'CBV 2025/26' },
];

function roleOptions(sport: Sport): readonly [string, string][] {
  return sport === 'volleyball' ? Object.entries(volleyballRoles) : Object.entries(footballPositions);
}
function roleIsValid(sport: Sport, position: string): boolean {
  return !position || roleOptions(sport).some(([value]) => value === position);
}
function validRows(
  rows: readonly AthleteRosterDraftRow[],
  sport: Sport,
  requireMatchNumber = false,
): readonly AthleteRosterDraftRow[] {
  return validateAthleteDraftRows(rows.filter((row) => row.number.trim() || row.name.trim() || row.position.trim()), sport)
    .map((row) => {
      const issues = [...row.issues];
      const number = Number(row.number);
      if (requireMatchNumber && !row.number.trim()) {
        issues.push('Informe a camisa para inscrever este atleta na partida.');
      }
      if (row.number && number > 99) issues.push('A camisa da partida deve ser de 1 a 99.');
      if (!roleIsValid(sport, row.position)) issues.push('Posição incompatível com a modalidade.');
      return { ...row, issues: [...new Set(issues)] };
    });
}
function playerInputs(rows: readonly AthleteRosterDraftRow[], sport: Sport): readonly PlayerRegistrationInput[] {
  return rows.map((row) => ({
    number: Number(row.number), name: normalizeAthleteName(row.name),
    ...(sport === 'volleyball' && row.position ? { registeredRole: row.position as PlayerRole } : {}),
  }));
}
function hasValidLineup(players: readonly PlayerRegistrationInput[], lineup: readonly LineupPositionInput[]): boolean {
  const numbers = new Set(players.map((player) => player.number));
  return lineup.length === 6 && new Set(lineup.map((row) => row.position)).size === 6
    && new Set(lineup.map((row) => row.playerNumber)).size === 6
    && lineup.every((row) => numbers.has(row.playerNumber));
}
function makeLineup(rows: readonly AthleteRosterDraftRow[]): readonly LineupPositionInput[] {
  const numbers = rows.map((row) => Number(row.number)).filter(Number.isFinite).slice(0, 6);
  return tacticalRoles.map((role, index) => ({
    position: (index + 1) as LineupPositionInput['position'], tacticalRole: role.value,
    playerNumber: numbers[index] ?? 0,
  }));
}
function teamRows(team: TeamRegistration, athletes: readonly AthleteRegistration[]): readonly AthleteRosterDraftRow[] {
  const members: readonly TeamRosterMember[] = team.roster ?? team.athleteIds.map((athleteId) => ({ athleteId }));
  return members.flatMap((member) => {
    const athlete = athletes.find((item) => item.id === member.athleteId);
    if (!athlete?.active) return [];
    return [{
      clientRowId: crypto.randomUUID(), athleteId: athlete.id, number: String(member.number ?? athlete.number ?? ''),
      name: athlete.name, position: member.position ?? athlete.position ?? '', issues: [],
    }];
  });
}
function rosterName(row: AthleteRosterDraftRow): string { return row.name || 'Atleta sem nome'; }

interface NewMatchScreenProps {
  readonly busy: boolean;
  readonly onCancel: () => void;
  readonly onCreate: (input: CreateMatchInput) => Promise<void>;
  readonly codeProfiles: readonly CodeProfile[];
  readonly onDraftChange?: (dirty: boolean) => void;
}

export function NewMatchScreen({ busy, onCancel, onCreate, codeProfiles, onDraftChange }: NewMatchScreenProps) {
  const [registeredTeams, setRegisteredTeams] = useState<readonly TeamRegistration[]>([]);
  const [registeredAthletes, setRegisteredAthletes] = useState<readonly AthleteRegistration[]>([]);
  const [sport, setSport] = useState<Sport>('volleyball');
  const [teamAName, setTeamAName] = useState('Equipe A');
  const [teamBName, setTeamBName] = useState('Equipe B');
  const [teamARows, setTeamARows] = useState<readonly AthleteRosterDraftRow[]>([]);
  const [teamBRows, setTeamBRows] = useState<readonly AthleteRosterDraftRow[]>([]);
  const [teamAId, setTeamAId] = useState<string>();
  const [teamBId, setTeamBId] = useState<string>();
  const [teamALineup, setTeamALineup] = useState<readonly LineupPositionInput[]>([]);
  const [teamBLineup, setTeamBLineup] = useState<readonly LineupPositionInput[]>([]);
  const [teamALibero, setTeamALibero] = useState<number>();
  const [teamBLibero, setTeamBLibero] = useState<number>();
  const [initialServingTeam, setInitialServingTeam] = useState<'teamA' | 'teamB'>('teamA');
  const [complexityProfileId, setComplexityProfileId] = useState<CreateMatchInput['complexityProfileId']>('basic');
  const [codeProfileId, setCodeProfileId] = useState('data_volley_basic_v1');
  const [teamQuery, setTeamQuery] = useState('');
  const [athleteQuery, setAthleteQuery] = useState('');
  const [pasteSide, setPasteSide] = useState<Side>();
  const [pasteText, setPasteText] = useState('');
  const [pasteLegacyComma, setPasteLegacyComma] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [savingTeam, setSavingTeam] = useState<Side>();
  const focusRow = useRef<{ readonly side: Side; readonly id: string } | undefined>(undefined);
  const rowNameInputs = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    let active = true;
    void Promise.all([browserTeamRegistrations.list(), browserAthleteRegistrations.list()]).then(([teams, athletes]) => {
      if (!active) return;
      if (teams.ok) setRegisteredTeams(teams.value); else setError(teams.error.message);
      if (athletes.ok) setRegisteredAthletes(athletes.value); else setError(athletes.error.message);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!focusRow.current) return;
    const { side, id } = focusRow.current;
    focusRow.current = undefined;
    rowNameInputs.current.get(`${side}:${id}`)?.focus();
  }, [teamARows, teamBRows]);
  useEffect(() => {
    const dirty = sport !== 'volleyball' || teamAName !== 'Equipe A' || teamBName !== 'Equipe B'
      || teamARows.length > 0 || teamBRows.length > 0 || Boolean(pasteText);
    onDraftChange?.(dirty);
    return () => onDraftChange?.(false);
  }, [onDraftChange, pasteText, sport, teamAName, teamARows.length, teamBName, teamBRows.length]);

  const availableTeams = useMemo(() => registeredTeams.filter((team) => team.sport === sport || !team.sport)
    .filter((team) => team.name.toLocaleLowerCase('pt-BR').includes(teamQuery.toLocaleLowerCase('pt-BR'))), [registeredTeams, sport, teamQuery]);
  const availableAthletes = useMemo(() => registeredAthletes
    .filter((athlete) => athlete.active && (athlete.sport === sport || !athlete.sport))
    .filter((athlete) => athlete.name.toLocaleLowerCase('pt-BR').includes(athleteQuery.toLocaleLowerCase('pt-BR'))), [athleteQuery, registeredAthletes, sport]);
  const setRows = (side: Side, rows: readonly AthleteRosterDraftRow[]) => side === 'A' ? setTeamARows(rows) : setTeamBRows(rows);
  const getRows = (side: Side) => side === 'A' ? teamARows : teamBRows;
  const getName = (side: Side) => side === 'A' ? teamAName : teamBName;

  function updateRow(side: Side, id: string, patch: Partial<AthleteRosterDraftRow>) {
    setRows(side, getRows(side).map((row) => row.clientRowId === id ? { ...row, ...patch, issues: [] } : row));
  }
  function addRow(side: Side) {
    const next = emptyAthleteDraftRow();
    focusRow.current = { side, id: next.clientRowId };
    setRows(side, [...getRows(side), next]);
  }
  function removeRow(side: Side, id: string) { setRows(side, getRows(side).filter((row) => row.clientRowId !== id)); }
  function handleRowKeyDown(event: KeyboardEvent<HTMLElement>, side: Side, rowIndex: number) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (event.currentTarget instanceof HTMLSelectElement) return;
    if (rowIndex === getRows(side).length - 1) addRow(side);
  }
  function applyTeam(side: Side, id: string) {
    const team = registeredTeams.find((item) => item.id === id);
    if (!team) return;
    if (!team.sport && !window.confirm(`A equipe ${team.name} é legada e não tem modalidade. Usá-la nesta partida de ${sport === 'volleyball' ? 'vôlei' : 'futebol'} sem alterar seu cadastro?`)) return;
    const rows = teamRows(team, registeredAthletes).map((row) => roleIsValid(sport, row.position) ? row : { ...row, position: '' });
    setRows(side, rows); setError(''); setNotice(`Elenco de ${team.name} carregado como linhas editáveis desta partida.`);
    if (side === 'A') { setTeamAId(team.id); setTeamAName(team.name); setTeamALineup([]); setTeamALibero(undefined); }
    else { setTeamBId(team.id); setTeamBName(team.name); setTeamBLineup([]); setTeamBLibero(undefined); }
  }
  function addExistingAthlete(side: Side, athleteId: string) {
    const athlete = registeredAthletes.find((item) => item.id === athleteId);
    if (!athlete) return;
    if (getRows(side).some((row) => row.athleteId === athlete.id)) {
      setNotice(`${athlete.name} já está no elenco desta partida.`); return;
    }
    setRows(side, [...getRows(side), {
      clientRowId: crypto.randomUUID(), athleteId: athlete.id, number: String(athlete.number ?? ''),
      name: athlete.name, position: roleIsValid(sport, athlete.position ?? '') ? athlete.position ?? '' : '', issues: [],
    }]);
    setNotice(`${athlete.name} foi adicionado como linha editável; a alteração não modifica seu cadastro permanente.`);
  }
  function changeSport(next: Sport) {
    if (next === sport) return;
    const hasIncompatible = [...teamARows, ...teamBRows].some((row) => row.position && !roleIsValid(next, row.position));
    if (hasIncompatible && !window.confirm('As posições desta modalidade não se aplicam à outra. Trocar e limpar apenas essas posições?')) return;
    if (hasIncompatible) {
      setTeamARows((rows) => rows.map((row) => roleIsValid(next, row.position) ? row : { ...row, position: '' }));
      setTeamBRows((rows) => rows.map((row) => roleIsValid(next, row.position) ? row : { ...row, position: '' }));
    }
    setSport(next); setTeamAId(undefined); setTeamBId(undefined); setTeamALineup([]); setTeamBLineup([]); setTeamALibero(undefined); setTeamBLibero(undefined);
    setNotice('Modalidade alterada. Nomes e camisas foram preservados; equipes salvas só aparecem quando têm modalidade compatível.');
  }
  function importPreview() {
    if (!pasteSide) { setError('Escolha a equipe que receberá a prévia.'); return; }
    const preview = parseAthletePaste(pasteText, { legacyComma: pasteLegacyComma });
    if (!preview.rows.length) { setError('Cole ao menos uma linha para importar.'); return; }
    setRows(pasteSide, [...getRows(pasteSide), ...preview.rows]); setPasteText(''); setError('');
    setNotice(`${preview.rows.length} linha(s) adicionada(s) à prévia da equipe ${pasteSide}.`);
  }
  function validateAll(requireMatchNumbers = false): readonly [readonly AthleteRosterDraftRow[], readonly AthleteRosterDraftRow[]] | undefined {
    const a = validRows(teamARows, sport, requireMatchNumbers); const b = validRows(teamBRows, sport, requireMatchNumbers);
    setTeamARows(a); setTeamBRows(b);
    if (a.some((row) => row.issues.length) || b.some((row) => row.issues.length)) {
      setError('Revise as linhas destacadas. Nenhuma alteração foi iniciada.'); return undefined;
    }
    return [a, b];
  }
  async function saveReusableTeam(side: Side) {
    const checked = validateAll(); if (!checked) return;
    const rows = side === 'A' ? checked[0] : checked[1];
    if (!getName(side).trim()) { setError('Informe o nome da equipe antes de salvá-la.'); return; }
    const now = Date.now(); const existing = side === 'A' ? teamAId : teamBId;
    const athletesToSave = rows.map((row) => ({
      id: row.athleteId ?? crypto.randomUUID(), name: normalizeAthleteName(row.name), sport,
      active: registeredAthletes.find((athlete) => athlete.id === row.athleteId)?.active ?? true,
      createdAt: registeredAthletes.find((athlete) => athlete.id === row.athleteId)?.createdAt ?? now, updatedAt: now,
    } satisfies AthleteRegistration));
    const stableRows = rows.map((row, index) => ({ ...row, athleteId: athletesToSave[index].id }));
    setRows(side, stableRows); setSavingTeam(side); setError('');
    const athletesResult = await browserAthleteRegistrations.saveMany(athletesToSave);
    if (!athletesResult.ok) { setSavingTeam(undefined); setError('Não foi possível salvar os atletas da equipe. As linhas foram preservadas para nova tentativa.'); return; }
    const team: TeamRegistration = {
      id: existing ?? crypto.randomUUID(), name: getName(side).trim(), sport,
      athleteIds: athletesToSave.map((athlete) => athlete.id),
      roster: stableRows.map((row) => ({ athleteId: row.athleteId, ...(row.number ? { number: Number(row.number) } : {}), ...(row.position ? { position: row.position as AthleteRegistrationPosition } : {}) })),
      createdAt: registeredTeams.find((item) => item.id === existing)?.createdAt ?? now, updatedAt: now,
    };
    const teamResult = await browserTeamRegistrations.save(team); setSavingTeam(undefined);
    if (!teamResult.ok) { setError('Os atletas foram preservados, mas a equipe não foi salva. Tente novamente; não serão duplicados.'); return; }
    setRegisteredAthletes((current) => [...current.filter((athlete) => !athletesToSave.some((item) => item.id === athlete.id)), ...athletesToSave]);
    setRegisteredTeams((current) => [...current.filter((item) => item.id !== team.id), team]);
    if (side === 'A') setTeamAId(team.id); else setTeamBId(team.id);
    setNotice(`Equipe ${team.name} salva para reutilização. Alterações futuras nesta partida não a alteram sem novo salvamento explícito.`);
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); const checked = validateAll(true); if (!checked) return;
    const [a, b] = checked; const playersA = playerInputs(a, sport); const playersB = playerInputs(b, sport);
    await onCreate({ sport, teamAName, teamBName, teamAPlayers: playersA, teamBPlayers: playersB,
      ...(sport === 'volleyball' && hasValidLineup(playersA, teamALineup) ? { teamALineup } : {}),
      ...(sport === 'volleyball' && hasValidLineup(playersB, teamBLineup) ? { teamBLineup } : {}),
      ...(sport === 'volleyball' ? { initialServingTeam } : {}), complexityProfileId, codeProfileId });
  }
  function updateLineup(side: Side, index: number, patch: Partial<LineupPositionInput>) {
    const current = side === 'A' ? teamALineup : teamBLineup;
    const next = current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row);
    if (side === 'A') setTeamALineup(next); else setTeamBLineup(next);
  }
  function useDemonstrationRoster() {
    const rows = (first: number) => Array.from({ length: 6 }, (_, index) => ({
      clientRowId: crypto.randomUUID(), number: String(first + index), name: `Jogador ${first + index}`,
      position: '', issues: [],
    } satisfies AthleteRosterDraftRow));
    const a = rows(1); const b = rows(7);
    setTeamARows(a); setTeamBRows(b); setTeamALineup(makeLineup(a)); setTeamBLineup(makeLineup(b));
    setNotice('Elenco demonstrativo inserido por ação explícita. Revise-o antes de iniciar a partida.');
  }
  function rosterEditor(side: Side) {
    const rows = getRows(side); const label = side === 'A' ? 'Equipe A' : 'Equipe B';
    return <section className="match-roster" aria-labelledby={`roster-${side}`}>
      <h2 id={`roster-${side}`}>{label}</h2>
      <label htmlFor={`saved-team-${side}`}>Usar equipe salva<select id={`saved-team-${side}`} value={side === 'A' ? teamAId ?? '' : teamBId ?? ''} onChange={(event) => applyTeam(side, event.target.value)}><option value="">Preencher nesta partida</option>{availableTeams.map((team) => <option key={team.id} value={team.id}>{team.name}{team.sport ? '' : ' · modalidade a confirmar'}</option>)}</select></label>
      <label htmlFor={`team-name-${side}`}>Nome da equipe<input id={`team-name-${side}`} required value={side === 'A' ? teamAName : teamBName} onChange={(event) => side === 'A' ? setTeamAName(event.target.value) : setTeamBName(event.target.value)} /></label>
      <label htmlFor={`saved-athlete-${side}`}>Adicionar atleta cadastrado<select id={`saved-athlete-${side}`} defaultValue="" onChange={(event) => { addExistingAthlete(side, event.target.value); event.currentTarget.value = ''; }}><option value="">Buscar: {athleteQuery || 'todos'}</option>{availableAthletes.map((athlete) => <option key={athlete.id} value={athlete.id}>{athlete.name}{athlete.number ? ` · ${athlete.number}` : ''}{athlete.sport ? '' : ' · modalidade a confirmar'}</option>)}</select></label>
      <div className="match-roster-header" aria-hidden="true"><span>Camisa</span><span>Nome</span><span>Posição/função</span><span>Remover</span></div>
      {rows.map((row, index) => <div className="match-roster-row" key={row.clientRowId}><label><span className="sr-only">Camisa {label} {index + 1}</span><input inputMode="numeric" value={row.number} onKeyDown={(event) => handleRowKeyDown(event, side, index)} onChange={(event) => updateRow(side, row.clientRowId, { number: event.target.value })} /></label><label><span className="sr-only">Nome {label} {index + 1}</span><input ref={(element) => { const key = `${side}:${row.clientRowId}`; if (element) rowNameInputs.current.set(key, element); else rowNameInputs.current.delete(key); }} value={row.name} onKeyDown={(event) => handleRowKeyDown(event, side, index)} onChange={(event) => updateRow(side, row.clientRowId, { name: event.target.value })} /></label><label><span className="sr-only">Posição {label} {index + 1}</span><select value={row.position} onKeyDown={(event) => handleRowKeyDown(event, side, index)} onChange={(event) => updateRow(side, row.clientRowId, { position: event.target.value })}><option value="">Não informada</option>{row.position && !roleIsValid(sport, row.position) && <option value={row.position}>Importada: {row.position} (revise)</option>}{roleOptions(sport).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label><button type="button" className="button secondary" onClick={() => removeRow(side, row.clientRowId)}>Remover</button>{row.issues.length > 0 && <p className="row-error" role="alert">{row.issues.join(' ')}</p>}</div>)}
      <div className="hero-actions"><button type="button" className="button secondary" onClick={() => addRow(side)}>Adicionar atleta</button><button type="button" className="button secondary" disabled={savingTeam !== undefined || busy} onClick={() => void saveReusableTeam(side)}>{savingTeam === side ? 'Salvando equipe…' : 'Salvar equipe reutilizável'}</button></div>
      {sport === 'volleyball' && rows.filter((row) => row.number).length >= 6 && <button type="button" className="button ghost" onClick={() => side === 'A' ? setTeamALineup(makeLineup(rows)) : setTeamBLineup(makeLineup(rows))}>Preparar escalação inicial para revisão</button>}
    </section>;
  }
  function lineupEditor(side: Side) {
    const rows = side === 'A' ? teamARows : teamBRows; const lineup = side === 'A' ? teamALineup : teamBLineup;
    const libero = side === 'A' ? teamALibero : teamBLibero; const setLibero = side === 'A' ? setTeamALibero : setTeamBLibero;
    if (!lineup.length) return null;
    return <fieldset className="lineup-card"><legend>Escalação inicial · equipe {side}</legend><p>Revise cada atleta e função; a sugestão nunca é salva automaticamente.</p><label>Líbero (opcional)<select value={libero ?? ''} onChange={(event) => setLibero(event.target.value ? Number(event.target.value) : undefined)}><option value="">Sem líbero definido</option>{rows.filter((row) => row.number).map((row) => <option key={row.clientRowId} value={row.number}>{row.number} {rosterName(row)}</option>)}</select></label>{lineup.map((entry, index) => <div className="lineup-row" key={entry.position}><strong>P{entry.position}</strong><label>Função<select value={entry.tacticalRole} onChange={(event) => updateLineup(side, index, { tacticalRole: event.target.value as TacticalRole })}>{tacticalRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label><label>Atleta<select value={entry.playerNumber} onChange={(event) => updateLineup(side, index, { playerNumber: Number(event.target.value) })}>{rows.filter((row) => row.number).map((row) => <option key={row.clientRowId} value={row.number}>{row.number} {rosterName(row)}</option>)}</select></label></div>)}</fieldset>;
  }

  return <section className="page-section setup-screen" aria-labelledby="setup-title">
    <div className="section-heading"><div><p className="eyebrow">Configuração</p><h1 id="setup-title">Nova partida</h1></div><button className="button ghost" type="button" onClick={onCancel}>Voltar</button></div>
    {error && <p id="new-match-error" role="alert">{error}</p>}{notice && <p className="form-notice" role="status">{notice}</p>}
    <form className="setup-form" onSubmit={(event) => void submit(event)}>
      <label className="match-sport-select" htmlFor="match-sport">Modalidade<select id="match-sport" value={sport} onChange={(event) => changeSport(event.target.value as Sport)}><option value="volleyball">Vôlei</option><option value="football">Futebol</option></select></label>
      <div className="match-searches"><label className="team-search" htmlFor="team-search">Buscar equipe salva<input id="team-search" value={teamQuery} onChange={(event) => setTeamQuery(event.target.value)} /></label><label className="team-search" htmlFor="athlete-search">Buscar atleta cadastrado<input id="athlete-search" value={athleteQuery} onChange={(event) => setAthleteQuery(event.target.value)} /></label></div>
      <div className="match-roster-grid">{rosterEditor('A')}<div className="versus" aria-hidden="true">×</div>{rosterEditor('B')}</div>
      {registeredTeams.some((team) => !team.sport) && <p className="form-help">Equipes legadas sem modalidade exibem confirmação antes do uso e só passam a ter modalidade explícita quando você as salva deliberadamente.</p>}
      <details className="match-paste"><summary>Importar lista para a prévia</summary><label>Equipe<select value={pasteSide ?? ''} onChange={(event) => setPasteSide((event.target.value || undefined) as Side | undefined)}><option value="">Escolha</option><option value="A">Equipe A</option><option value="B">Equipe B</option></select></label><label>Texto copiado<textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder={'8 Ana Souza\n9;Bia Lima'} /></label><label className="paste-legacy-option"><input type="checkbox" checked={pasteLegacyComma} onChange={(event) => setPasteLegacyComma(event.target.checked)} /> Usar formato legado com vírgulas</label><button type="button" className="button secondary" onClick={importPreview}>Importar para prévia editável</button></details>
      {sport === 'football' && <p className="form-help sport-specific-help">Futebol pode iniciar scout coletivo sem elenco, escalação ou posições. Atletas incluídos aqui só existem nesta partida até você escolher salvar a equipe.</p>}
      {sport === 'volleyball' && <><button className="button ghost" type="button" onClick={useDemonstrationRoster}>Usar elenco demonstrativo</button><div className="lineup-setup-grid">{lineupEditor('A')}{lineupEditor('B')}</div><fieldset className="serving-choice"><legend>Quem começa sacando?</legend><label><input type="radio" name="initial-server" checked={initialServingTeam === 'teamA'} onChange={() => setInitialServingTeam('teamA')} />{teamAName}</label><label><input type="radio" name="initial-server" checked={initialServingTeam === 'teamB'} onChange={() => setInitialServingTeam('teamB')} />{teamBName}</label></fieldset><fieldset className="profile-choice"><legend>Perfil de complexidade</legend>{profileOptions.map((profile) => <label key={profile.id} className={complexityProfileId === profile.id ? 'selected' : ''}><input type="radio" name="profile" value={profile.id} checked={complexityProfileId === profile.id} onChange={() => setComplexityProfileId(profile.id)} /><span><strong>{profile.name}</strong></span></label>)}</fieldset><label className="code-profile-select">Linguagem de código<select value={codeProfileId} onChange={(event) => setCodeProfileId(event.target.value)}>{codeProfiles.map((profile) => <option key={`${profile.id}@${profile.version}`} value={profile.id}>{profile.name} · v{profile.version}</option>)}</select></label></>}
      <button className="button primary submit-match" type="submit" disabled={busy || savingTeam !== undefined}>{busy ? 'Criando…' : sport === 'football' ? 'Iniciar partida' : 'Criar e iniciar scout'}</button>
    </form>
  </section>;
}

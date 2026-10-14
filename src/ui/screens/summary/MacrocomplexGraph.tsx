import { useState, useMemo } from 'react';
import type { RallyPathRally, RallyPathContact } from '../../../domain/analytics/markov';
import './MacrocomplexGraph.css';

interface MacrocomplexGraphProps {
  readonly pathRallies: readonly RallyPathRally[];
  readonly teamId: string;
  readonly teams: readonly { readonly id: string; readonly name: string }[];
  readonly setFilter: 'all' | number;
}

type ComplexType = 'complex1' | 'complex2';

interface FlowTransitionItem {
  readonly id: string;
  readonly name: string;
  readonly code?: string;
  readonly count: number;
  readonly winCount: number;
  readonly errorCount: number;
  readonly blockCount: number;
  readonly continuityCount: number;
}

function percentStr(num: number, den: number): string {
  if (den <= 0) return '0%';
  return `${Math.round((num / den) * 100)}%`;
}

function getZoneLane(contact?: RallyPathContact): string {
  if (!contact) return 'geral';
  const z = contact.spatial?.targetRegionId ?? contact.spatial?.originRegionId;
  if (z === '4') return 'p4';
  if (z === '3') return 'p3';
  if (z === '2') return 'p2';
  if (z === '6' || z === '1' || z === '5') return 'p6';
  return 'geral';
}

export function MacrocomplexGraph({
  pathRallies,
  teamId,
  teams,
  setFilter,
}: MacrocomplexGraphProps) {
  const [complexType, setComplexType] = useState<ComplexType>('complex1');
  const [selectedPhase1Id, setSelectedPhase1Id] = useState<string | null>(null);
  const [selectedPhase2Id, setSelectedPhase2Id] = useState<string | null>(null);

  const teamName = teams.find((t) => t.id === teamId)?.name ?? teamId;

  // Filter rallies by set and team relevance
  const eligibleRallies = useMemo(() => {
    return pathRallies.filter((rally) => {
      if (setFilter !== 'all' && rally.setNumber !== setFilter) return false;
      return true;
    });
  }, [pathRallies, setFilter]);

  // Aggregate Complex I (Sideout) data
  const complex1Data = useMemo(() => {
    const p1Map = new Map<string, { count: number; wins: number; errors: number; blocks: number; cont: number }>();
    const p2Map = new Map<string, { count: number; wins: number; errors: number; blocks: number; cont: number }>();
    const links1to2 = new Map<string, { count: number; wins: number }>();
    const links2to3 = new Map<string, { count: number; wins: number }>();

    let totalSideouts = 0;
    let totalKills = 0;
    let perfectPassKills = 0;
    let perfectPassCount = 0;
    let brokenPassKills = 0;
    let brokenPassCount = 0;

    eligibleRallies.forEach((rally) => {
      const contacts = rally.contacts;
      if (!contacts.length) return;

      // Check if teamId received the serve (Sideout opportunity)
      const firstTeamContact = contacts.find((c) => c.teamId === teamId);
      if (!firstTeamContact) return;

      const isSideout =
        firstTeamContact.skill === 'reception' ||
        (contacts[0].teamId !== teamId && contacts[0].skill === 'serve');

      if (!isSideout) return;
      totalSideouts++;

      // Phase 1: Reception Grade
      const rec = contacts.find((c) => c.teamId === teamId && c.skill === 'reception');
      let p1Key = 'outros';
      if (rec) {
        if (rec.quality === '#' || rec.quality === 'perfect' || rec.quality === 'excellent') {
          p1Key = 'rec_a';
          perfectPassCount++;
        } else if (rec.quality === '+' || rec.quality === 'positive') {
          p1Key = 'rec_b';
          perfectPassCount++;
        } else if (rec.quality === '!' || rec.quality === '-' || rec.quality === 'broken') {
          p1Key = 'rec_c';
          brokenPassCount++;
        } else if (rec.quality === '=' || rec.quality === 'error') {
          p1Key = 'rec_err';
        }
      }

      // Check for first attack of teamId in this sideout
      const firstAttack = contacts.find(
        (c) => c.teamId === teamId && c.skill === 'attack',
      );
      const laneKey = firstAttack ? getZoneLane(firstAttack) : (p1Key === 'rec_err' ? 'sem_ataque' : 'outros');

      // Determine outcome
      let outcome = 'continuity';
      const isWinner = rally.terminal?.winnerTeamId === teamId;
      if (p1Key === 'rec_err') {
        outcome = 'error';
      } else if (firstAttack) {
        if (isWinner && rally.terminal?.sourceEventId === firstAttack.sourceEventId) {
          outcome = 'point';
          totalKills++;
          if (p1Key === 'rec_a' || p1Key === 'rec_b') perfectPassKills++;
          if (p1Key === 'rec_c') brokenPassKills++;
        } else if (!isWinner && rally.terminal?.cause === 'block') {
          outcome = 'blocked';
        } else if (!isWinner && firstAttack.quality === '=') {
          outcome = 'error';
        }
      }

      // Accumulate P1
      const p1Curr = p1Map.get(p1Key) ?? { count: 0, wins: 0, errors: 0, blocks: 0, cont: 0 };
      p1Curr.count++;
      if (outcome === 'point') p1Curr.wins++;
      if (outcome === 'error') p1Curr.errors++;
      if (outcome === 'blocked') p1Curr.blocks++;
      if (outcome === 'continuity') p1Curr.cont++;
      p1Map.set(p1Key, p1Curr);

      // Accumulate P2
      const p2Curr = p2Map.get(laneKey) ?? { count: 0, wins: 0, errors: 0, blocks: 0, cont: 0 };
      p2Curr.count++;
      if (outcome === 'point') p2Curr.wins++;
      if (outcome === 'error') p2Curr.errors++;
      if (outcome === 'blocked') p2Curr.blocks++;
      if (outcome === 'continuity') p2Curr.cont++;
      p2Map.set(laneKey, p2Curr);

      // Accumulate Link 1->2
      const l1Key = `${p1Key}->${laneKey}`;
      const l1Curr = links1to2.get(l1Key) ?? { count: 0, wins: 0 };
      l1Curr.count++;
      if (outcome === 'point') l1Curr.wins++;
      links1to2.set(l1Key, l1Curr);

      // Accumulate Link 2->3
      const l2Key = `${laneKey}->${outcome}`;
      const l2Curr = links2to3.get(l2Key) ?? { count: 0, wins: 0 };
      l2Curr.count++;
      if (outcome === 'point') l2Curr.wins++;
      links2to3.set(l2Key, l2Curr);
    });

    return {
      totalSideouts,
      totalKills,
      sideoutRate: totalSideouts > 0 ? totalKills / totalSideouts : 0,
      perfectPassRate: perfectPassCount > 0 ? perfectPassKills / perfectPassCount : 0,
      brokenPassRate: brokenPassCount > 0 ? brokenPassKills / brokenPassCount : 0,
      p1Map,
      p2Map,
      links1to2,
      links2to3,
    };
  }, [eligibleRallies, teamId]);

  // Aggregate Complex II (Transition / Counter-attack) data
  const complex2Data = useMemo(() => {
    const p1Map = new Map<string, { count: number; wins: number; errors: number; blocks: number; cont: number }>();
    const p2Map = new Map<string, { count: number; wins: number; errors: number; blocks: number; cont: number }>();
    const links1to2 = new Map<string, { count: number; wins: number }>();
    const links2to3 = new Map<string, { count: number; wins: number }>();

    let totalTransitions = 0;
    let totalKills = 0;

    eligibleRallies.forEach((rally) => {
      const contacts = rally.contacts;
      // Find defensive contacts of teamId
      contacts.forEach((contact, idx) => {
        if (contact.teamId !== teamId) return;
        if (contact.skill !== 'dig' && contact.skill !== 'block' && contact.skill !== 'free_ball') return;

        totalTransitions++;
        let p1Key = 'def_pos';
        if (contact.quality === '#' || contact.quality === '+') {
          p1Key = 'def_pos';
        } else if (contact.quality === '!' || contact.quality === '-') {
          p1Key = 'def_queb';
        } else if (contact.skill === 'block') {
          p1Key = 'bloq_amort';
        } else {
          p1Key = 'free_ball';
        }

        // Find counter-attack
        const counterAttack = contacts.slice(idx + 1).find(
          (c) => c.teamId === teamId && c.skill === 'attack',
        );
        const laneKey = counterAttack ? getZoneLane(counterAttack) : 'sem_ataque';

        let outcome = 'continuity';
        const isWinner = rally.terminal?.winnerTeamId === teamId;
        if (counterAttack) {
          if (isWinner && rally.terminal?.sourceEventId === counterAttack.sourceEventId) {
            outcome = 'point';
            totalKills++;
          } else if (!isWinner && rally.terminal?.cause === 'block') {
            outcome = 'blocked';
          } else if (!isWinner && counterAttack.quality === '=') {
            outcome = 'error';
          }
        }

        // P1
        const p1Curr = p1Map.get(p1Key) ?? { count: 0, wins: 0, errors: 0, blocks: 0, cont: 0 };
        p1Curr.count++;
        if (outcome === 'point') p1Curr.wins++;
        if (outcome === 'error') p1Curr.errors++;
        if (outcome === 'blocked') p1Curr.blocks++;
        if (outcome === 'continuity') p1Curr.cont++;
        p1Map.set(p1Key, p1Curr);

        // P2
        const p2Curr = p2Map.get(laneKey) ?? { count: 0, wins: 0, errors: 0, blocks: 0, cont: 0 };
        p2Curr.count++;
        if (outcome === 'point') p2Curr.wins++;
        if (outcome === 'error') p2Curr.errors++;
        if (outcome === 'blocked') p2Curr.blocks++;
        if (outcome === 'continuity') p2Curr.cont++;
        p2Map.set(laneKey, p2Curr);

        // Link 1->2
        const l1Key = `${p1Key}->${laneKey}`;
        const l1Curr = links1to2.get(l1Key) ?? { count: 0, wins: 0 };
        l1Curr.count++;
        if (outcome === 'point') l1Curr.wins++;
        links1to2.set(l1Key, l1Curr);

        // Link 2->3
        const l2Key = `${laneKey}->${outcome}`;
        const l2Curr = links2to3.get(l2Key) ?? { count: 0, wins: 0 };
        l2Curr.count++;
        if (outcome === 'point') l2Curr.wins++;
        links2to3.set(l2Key, l2Curr);
      });
    });

    return {
      totalTransitions,
      totalKills,
      transitionRate: totalTransitions > 0 ? totalKills / totalTransitions : 0,
      p1Map,
      p2Map,
      links1to2,
      links2to3,
    };
  }, [eligibleRallies, teamId]);

  const activeData = complexType === 'complex1' ? complex1Data : complex2Data;

  // Phase 1 Definitions
  const phase1Items: FlowTransitionItem[] = useMemo(() => {
    if (complexType === 'complex1') {
      const keys = [
        { id: 'rec_a', name: 'Passe A (Excelente)', code: '#' },
        { id: 'rec_b', name: 'Passe B (Positivo)', code: '+' },
        { id: 'rec_c', name: 'Passe C (Quebrado)', code: '!' },
        { id: 'rec_err', name: 'Erro de Passe', code: '=' },
      ];
      return keys.map((k) => {
        const stats = activeData.p1Map.get(k.id) ?? { count: 0, wins: 0, errors: 0, blocks: 0, cont: 0 };
        return {
          id: k.id,
          name: k.name,
          code: k.code,
          count: stats.count,
          winCount: stats.wins,
          errorCount: stats.errors,
          blockCount: stats.blocks,
          continuityCount: stats.cont,
        };
      });
    } else {
      const keys = [
        { id: 'def_pos', name: 'Defesa Positiva', code: '#' },
        { id: 'def_queb', name: 'Defesa Fora', code: '!' },
        { id: 'bloq_amort', name: 'Bloqueio Amortecido', code: 'T' },
        { id: 'free_ball', name: 'Free Ball', code: 'FB' },
      ];
      return keys.map((k) => {
        const stats = activeData.p1Map.get(k.id) ?? { count: 0, wins: 0, errors: 0, blocks: 0, cont: 0 };
        return {
          id: k.id,
          name: k.name,
          code: k.code,
          count: stats.count,
          winCount: stats.wins,
          errorCount: stats.errors,
          blockCount: stats.blocks,
          continuityCount: stats.cont,
        };
      });
    }
  }, [complexType, activeData]);

  // Phase 2 Definitions (Distribution)
  const phase2Items: FlowTransitionItem[] = useMemo(() => {
    const lanes = [
      { id: 'p4', name: 'Ponta (Entrada P4)' },
      { id: 'p3', name: 'Meio (Central P3)' },
      { id: 'p2', name: 'Saída (Oposto P2)' },
      { id: 'p6', name: 'Pipe (Fundo P6)' },
    ];
    return lanes.map((lane) => {
      let count = 0;
      let wins = 0;
      let errors = 0;
      let blocks = 0;
      let cont = 0;

      if (selectedPhase1Id) {
        const link = activeData.links1to2.get(`${selectedPhase1Id}->${lane.id}`);
        count = link?.count ?? 0;
        wins = link?.wins ?? 0;
      } else {
        const stats = activeData.p2Map.get(lane.id) ?? { count: 0, wins: 0, errors: 0, blocks: 0, cont: 0 };
        count = stats.count;
        wins = stats.wins;
        errors = stats.errors;
        blocks = stats.blocks;
        cont = stats.cont;
      }

      return {
        id: lane.id,
        name: lane.name,
        count,
        winCount: wins,
        errorCount: errors,
        blockCount: blocks,
        continuityCount: cont,
      };
    });
  }, [activeData, selectedPhase1Id]);

  // Phase 3 Definitions (Outcomes)
  const phase3Items: FlowTransitionItem[] = useMemo(() => {
    const outcomes = [
      { id: 'point', name: 'Kill (Ponto Direto)', code: 'KILL' },
      { id: 'continuity', name: 'Continuidade (Rali)', code: 'CONT' },
      { id: 'blocked', name: 'Bloqueio Sofrido', code: 'BLQ' },
      { id: 'error', name: 'Erro de Ataque', code: 'ERR' },
    ];

    let totalSelected = 0;
    const totals: Record<string, number> = { point: 0, continuity: 0, blocked: 0, error: 0 };

    if (selectedPhase2Id) {
      outcomes.forEach((o) => {
        const link = activeData.links2to3.get(`${selectedPhase2Id}->${o.id}`);
        totals[o.id] = link?.count ?? 0;
        totalSelected += totals[o.id];
      });
    } else {
      activeData.p2Map.forEach((stats) => {
        totals.point += stats.wins;
        totals.continuity += stats.cont;
        totals.blocked += stats.blocks;
        totals.error += stats.errors;
        totalSelected += stats.count;
      });
    }

    return outcomes.map((o) => ({
      id: o.id,
      name: o.name,
      code: o.code,
      count: totals[o.id] ?? 0,
      winCount: o.id === 'point' ? totals[o.id] ?? 0 : 0,
      errorCount: o.id === 'error' ? totals[o.id] ?? 0 : 0,
      blockCount: o.id === 'blocked' ? totals[o.id] ?? 0 : 0,
      continuityCount: o.id === 'continuity' ? totals[o.id] ?? 0 : 0,
    }));
  }, [activeData, selectedPhase2Id]);

  return (
    <section className="macrocomplex-container" aria-label="Análise de Macrocomplexos do Voleibol">
      {/* Top Controls & KPI Cards */}
      <div className="macrocomplex-header">
        <div>
          <span className="macrocomplex-badge">Macrocomplexos Táticos</span>
          <h4 className="macrocomplex-title">
            {complexType === 'complex1'
              ? 'Complexo I: Virada de Bola (Sideout)'
              : 'Complexo II: Transição (Contra-ataque)'}
          </h4>
          <p className="macrocomplex-subtitle">
            Cadeia tática em 3 fases: Entrada/Passe ➔ Distribuição do Levantador ➔ Desfecho do Ataque
          </p>
        </div>

        <div className="macrocomplex-type-switch" role="group" aria-label="Tipo de Macrocomplexo">
          <button
            type="button"
            className={complexType === 'complex1' ? 'active' : ''}
            onClick={() => {
              setComplexType('complex1');
              setSelectedPhase1Id(null);
              setSelectedPhase2Id(null);
            }}
          >
            ⚡ Complexo I (Sideout)
          </button>
          <button
            type="button"
            className={complexType === 'complex2' ? 'active' : ''}
            onClick={() => {
              setComplexType('complex2');
              setSelectedPhase1Id(null);
              setSelectedPhase2Id(null);
            }}
          >
            🛡️ Complexo II (Transição)
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="macrocomplex-kpis">
        <div className="macro-kpi-card">
          <small>{complexType === 'complex1' ? 'Taxa de Virada (Sideout)' : 'Taxa de Transição'}</small>
          <strong
            className={`font-mono tabular-nums ${
              (complexType === 'complex1' ? complex1Data.sideoutRate : complex2Data.transitionRate) >= 0.6
                ? 'metric-positive'
                : (complexType === 'complex1' ? complex1Data.sideoutRate : complex2Data.transitionRate) >= 0.45
                  ? 'metric-warning'
                  : 'metric-negative'
            }`}
          >
            {percentStr(
              complexType === 'complex1' ? complex1Data.totalKills : complex2Data.totalKills,
              complexType === 'complex1' ? complex1Data.totalSideouts : complex2Data.totalTransitions,
            )}
          </strong>
          <span>
            {complexType === 'complex1'
              ? `${complex1Data.totalKills} kills em ${complex1Data.totalSideouts} oportunidades`
              : `${complex2Data.totalKills} kills em ${complex2Data.totalTransitions} transições`}
          </span>
        </div>

        {complexType === 'complex1' && (
          <>
            <div className="macro-kpi-card">
              <small>Virada com Passe A/B (#/+)</small>
              <strong className="font-mono tabular-nums metric-positive">
                {percentStr(Math.round(complex1Data.perfectPassRate * 100), 100)}
              </strong>
              <span>Eficácia com passe na mão do levantador</span>
            </div>
            <div className="macro-kpi-card">
              <small>Virada com Passe Quebrado (!)</small>
              <strong className="font-mono tabular-nums metric-warning">
                {percentStr(Math.round(complex1Data.brokenPassRate * 100), 100)}
              </strong>
              <span>Eficácia em bolas de recuperação</span>
            </div>
          </>
        )}

        <div className="macro-kpi-card">
          <small>Total de Rallies Analisados</small>
          <strong className="font-mono tabular-nums">{eligibleRallies.length}</strong>
          <span>{teamName} · Set {setFilter === 'all' ? 'Geral' : setFilter}</span>
        </div>
      </div>

      {/* 3-Phase Interactive Flow Graph */}
      <div className="macro-flow-board">
        {/* Phase 1: Entry / Pass */}
        <div className="macro-column">
          <div className="macro-column-header">
            <span className="phase-number">Fase 1</span>
            <h5>{complexType === 'complex1' ? 'Qualidade do Passe' : 'Origem do Contra-Ataque'}</h5>
          </div>
          <div className="macro-card-list">
            {phase1Items.map((item) => {
              const isSelected = selectedPhase1Id === item.id;
              const killRate = item.count > 0 ? (item.winCount / item.count) * 100 : 0;
              return (
                <div
                  key={item.id}
                  className={`macro-node-card ${isSelected ? 'selected' : ''}`}
                  onClick={() =>
                    setSelectedPhase1Id((curr) => (curr === item.id ? null : item.id))
                  }
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                >
                  <div className="macro-card-top">
                    <span className="macro-card-badge">{item.code}</span>
                    <strong className="macro-card-title">{item.name}</strong>
                  </div>
                  <div className="macro-card-stats font-mono tabular-nums">
                    <span>N = {item.count}</span>
                    <span className={killRate >= 50 ? 'metric-positive' : 'metric-warning'}>
                      Kill: {Math.round(killRate)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Phase 2: Distribution / Attack Lane */}
        <div className="macro-column">
          <div className="macro-column-header">
            <span className="phase-number">Fase 2</span>
            <h5>Distribuição do Levantamento</h5>
          </div>
          <div className="macro-card-list">
            {phase2Items.map((item) => {
              const isSelected = selectedPhase2Id === item.id;
              const killRate = item.count > 0 ? (item.winCount / item.count) * 100 : 0;
              return (
                <div
                  key={item.id}
                  className={`macro-node-card ${isSelected ? 'selected' : ''}`}
                  onClick={() =>
                    setSelectedPhase2Id((curr) => (curr === item.id ? null : item.id))
                  }
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                >
                  <div className="macro-card-top">
                    <span className="macro-card-lane-badge">{item.id.toUpperCase()}</span>
                    <strong className="macro-card-title">{item.name}</strong>
                  </div>
                  <div className="macro-card-stats font-mono tabular-nums">
                    <span>Volume: {item.count}</span>
                    <span className={killRate >= 55 ? 'metric-positive' : 'metric-warning'}>
                      Kill: {Math.round(killRate)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Phase 3: Outcome */}
        <div className="macro-column">
          <div className="macro-column-header">
            <span className="phase-number">Fase 3</span>
            <h5>Desfecho da Jogada</h5>
          </div>
          <div className="macro-card-list">
            {phase3Items.map((item) => {
              return (
                <div
                  key={item.id}
                  className={`macro-node-card outcome-${item.id}`}
                  role="region"
                >
                  <div className="macro-card-top">
                    <span className={`outcome-indicator ${item.id}`} />
                    <strong className="macro-card-title">{item.name}</strong>
                  </div>
                  <div className="macro-card-stats font-mono tabular-nums">
                    <span>Ocorrências: {item.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

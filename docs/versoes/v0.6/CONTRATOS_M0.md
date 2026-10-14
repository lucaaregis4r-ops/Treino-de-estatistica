# Contratos da M0 — Scout Trainer 0.6

**Data da auditoria:** 30/09/2026. **Estado:** M0 concluída por inspeção de código e definição de contratos; nenhum comportamento do aplicativo foi implementado. Estes exemplos são contratos para M1–M8, não JSON que a versão 0.5.0 já aceita.

## 1. Evidência encontrada

| Assunto | Estado verificado | Entrada de implementação |
|---|---|---|
| Modalidades | `MatchSport.ts` e `Registration.ts` só tipam vôlei/futebol. `resolveMatchSport()` mantém sem modalidade como vôlei apenas quando há evidência específica; caso contrário retorna indefinido. | M2: tipos, criação, navegação e cadastro. |
| Substituição do futebol | `FootballMinimalScoutScreen.tsx` é a tela montada; `quickActions` não inclui `substitution`. `FootballActionPanel.tsx` a lista, mas não é usado. `RegisterFootballEventInput.relatedPlayerId` e `FootballRecorder.ts` permitem reposição, porém o serviço não exige os dois atletas e `projectFootball()` não projeta quem está em campo. | M1: fluxo UI→serviço→evento→projeção→backup. Ausência do comando confirmada estaticamente; não houve reprodução em navegador. |
| Substituição do vôlei | `CourtLineup.tsx` oferece escolha do slot e reserva; `ScoutTrainerService.substitute()` valida slot/posição e emite `substitution_made`; `MatchReducer.ts` atualiza o lineup. O evento depende de set/rotação. | M1: reproduzir a queixa no fluxo visual e corrigir só falha comprovada. A auditoria não demonstrou uma falha do vôlei. |
| Relógio | `FootballRecorder.ts` e `ScoutTrainerService.observeFootballControl()` somam 45 minutos no segundo período de futebol. `football_clock_changed` guarda período, decorrido, `running` e referência de parede. | M3: contrato próprio de futsal, acumulado a partir de 20 minutos; manter o futebol intacto. |
| Coordenadas | `StatsBombContract.ts` usa escala virtual 120×80; `FootballCourtSurface.tsx` desenha futebol de campo. | M2: quadra própria e `[0,1]²` como posição canônica. |
| Backup | `MatchJson.ts` está em `1.2.0`, aceita modalidades vôlei/futebol/unknown e enumera tipos de evento; o validador rejeita `sport='futsal'`. | M2/M4/M5: incluir futsal e novos tipos; importação das versões 1.0/1.1/1.2 continua compatível. |
| xG | `reference/football-models/xg.json` contém 1.107 chutes de treino e 301 de validação de futebol de campo, com geometria 105×68 m. Busca no repositório não achou eventos ou dataset de futsal. | M7: estatísticas descritivas; nenhum xG numérico de futsal na 0.6. |

## 2. Modalidade, cadastro e compatibilidade

```ts
type MatchSportV06 = 'volleyball' | 'football' | 'futsal';
type AthleteRegistrationSportV06 = MatchSportV06;

interface FutsalMatchSettings {
  readonly ruleset: 'fifa-2025-26' | 'competition-custom';
  readonly periodDurationMs: number; // padrão 1_200_000; duração reduzida explícita
  readonly courtMeters?: { readonly length: number; readonly width: number };
}
```

- `MatchMetadata.sport='futsal'` é obrigatório nas partidas novas de futsal. `futsalSettings` só existe nelas. Na criação, duração positiva e regra/competição são validadas; a dimensão real da quadra é opcional e nunca inferida do desenho. Separar posições de cadastro (`goalkeeper`, `fixo`, `ala`, `pivo`, `unassigned/custom`) das funções de vôlei e futebol; não gravar função como confirmação de presença em quadra.
- Equipe/atleta legado sem modalidade conserva `sport` ausente. A UI pede escolha explícita ao reutilizar; uma partida antiga sem modalidade e sem evidência continua **ambígua**, nunca vira futsal automaticamente.
- `MatchJson.ts`: a próxima revisão do backup deve ser `1.3.0`, aceitando `1.2.0` como legado além de `1.0.0`/`1.1.0`. Importar backup antigo apenas adapta envelope em memória, sem regravar partidas. `modality` deve coincidir com `match.sport` quando este estiver definido. Manifesto de futsal declara contrato local próprio e `footballEventContract: 'not_applicable'`.
- Eventos de futsal entram na lista explícita de `MATCH_EVENT_TYPES` e num validador específico que confira `matchId`, referências de equipe/atleta, período, tempo, coordenadas, IDs únicos, alvo de correção/desfazer e ordem. Não reaproveitar `validCanonicalFootballEvent()` nem marcar `scout_trainer.modality='football'`. Exportação StatsBomb atual continua exclusiva de partidas `football`.

## 3. Contrato de eventos de futsal

Persistir histórico imutável, com `sequence` como ordem canônica. Tipos propostos em `MatchEvent.ts` e validados em `MatchJson.ts`:

```ts
type FutsalHistoryEvent =
  | { type: 'futsal_fact_registered'; id: string; matchId: string;
      sequence: number; timestamp: number; fact: FutsalFact }
  | { type: 'futsal_fact_corrected'; id: string; matchId: string;
      sequence: number; timestamp: number; targetFactId: string;
      replacementFact: FutsalFact }
  | { type: 'futsal_fact_undone'; id: string; matchId: string;
      sequence: number; timestamp: number; targetHistoryEventId: string };

type FutsalFactBase = { id: string; period: 1 | 2; elapsedMs: number;
  teamId?: string; observation: 'observed' | 'partial' | 'not_observed';
  position?: { x: number; y: number } }; // x,y finitos em [0,1]

type FutsalFact = FutsalFactBase & (
  | { kind: 'control'; state: 'team' | 'contested' | 'dead_ball' | 'unknown';
      controlledTeamId?: string; coverage: 'continuous' | 'suspended' }
  | { kind: 'shot'; shootingTeamId: string; playerId?: string;
      outcome: 'pending' | 'goal' | 'saved' | 'blocked' | 'off_target' | 'post';
      beneficiaryTeamId?: string }
  | { kind: 'restart'; restart: 'kick_in' | 'corner' | 'goal_clearance' |
      'free_kick' | 'ten_meter_kick' | 'penalty' | 'kick_off' | 'other' | 'unknown' }
  | { kind: 'foul'; offendingTeamId: string; accumulated: boolean; playerId?: string }
  | { kind: 'composition'; teamId: string; playerIds: string[];
      certainty: 'complete' | 'partial'; shortHanded?: boolean }
  | { kind: 'substitution'; teamId: string; playerOutId?: string;
      playerInId?: string; certainty: 'complete' | 'partial' }
  | { kind: 'tactical_context'; teamId: string;
      numericalSituation: 'own_flying_goalkeeper' | 'opponent_flying_goalkeeper';
      active: boolean }
  | { kind: 'tactical_annotation'; scope: 'event' | 'interval'; teamId?: string;
      targetFactId?: string; startFactId?: string; endFactId?: string;
      organization?: 'positional' | 'transition' | 'set_piece' | 'other' | 'not_observed';
      restartOrigin?: 'kick_in' | 'corner' | 'goal_clearance' | 'free_kick' |
        'ten_meter_kick' | 'penalty' | 'kick_off' | 'other' | 'unknown';
      numericalSituation?: 'regular' | 'own_flying_goalkeeper' |
        'opponent_flying_goalkeeper' | 'short_handed' | 'other' | 'not_observed';
      defensiveContext?: 'pressure' | 'block_high' | 'block_medium' | 'block_low' |
        'recovery' | 'goalkeeper_save' | 'not_observed';
      attackingStructure?: '3-1' | '4-0' | '2-2' | 'other' | 'not_observed';
      note?: string; removed?: true }
  | { kind: 'score_adjustment'; beneficiaryTeamId: string;
      delta: -1 | 1; reason: string }
  | { kind: 'tactical_context'; organization?: 'positional' | 'transition' |
      'set_piece' | 'other' | 'not_observed';
      numericalSituation?: 'regular' | 'own_flying_goalkeeper' |
      'opponent_flying_goalkeeper' | 'short_handed' | 'other' | 'not_observed' }
);
```

Exemplo de **fragmento de evento**, ainda não aceito pelo importador 0.5.0:

```json
{
  "type": "futsal_fact_registered",
  "id": "h-17",
  "matchId": "m-1",
  "sequence": 17,
  "timestamp": 1790794800000,
  "fact": {
    "id": "f-17",
    "kind": "shot",
    "period": 1,
    "elapsedMs": 195000,
    "teamId": "team-a",
    "observation": "observed",
    "position": { "x": 0.88, "y": 0.47 },
    "shootingTeamId": "team-a",
    "outcome": "goal",
    "beneficiaryTeamId": "team-a"
  }
}
```

**Invariantes:** `fact.id` permanece igual em todas as correções; `replacementFact.id === targetFactId`; desfazer aponta a uma operação de registro/correção ainda efetiva, não apaga a história. `sequence` desempata eventos com mesmo tempo de jogo. Todo ID de atleta informado pertence à equipe do fato e à partida. Ação não observada não fabrica coordenada, jogador ou `teamId` de controle. `control.state='team'` exige `controlledTeamId`; os demais estados não o têm. `shot.outcome='goal'` exige `beneficiaryTeamId` e incrementa **apenas** essa equipe; gol contra usa equipe beneficiada oposta à finalizadora. Chute pendente não incrementa placar. Reinício, falta e substituição não alteram placar ou controle por si.

**Composição observada:** um fato `composition` registra somente IDs vistos em quadra. `complete` significa todos conhecidos; abaixo de cinco exige inferioridade explicitamente observada. `partial` não preenche atletas restantes nem infere titulares. Máximo de cinco IDs distintos, todos da mesma equipe. `Player.active` representa cadastro ativo, não presença em quadra. **Substituição completa:** IDs de saída/entrada presentes e distintos, mesma equipe, saída em quadra e entrada fora quando a composição é conhecida. **Parcial:** IDs podem faltar, inclusive ambos se a troca foi vista e nenhum dos nomes foi reconhecido; atualizar somente as certezas que continuam válidas. O fato de `tactical_context` marca início/fim observado do goleiro-linha, sem inferência a partir de substituição, camisa ou localização. M1 exige os dois IDs para a substituição de futebol quando o operador seleciona o fluxo completo; M5 define a projeção de composição do futsal. O evento `substitution_made` do vôlei continua separado por slot e set.

**Revisão tática:** `tactical_annotation` referencia um fato de jogo por `targetFactId` ou dois limites (`startFactId`, `endFactId`) no mesmo período e em ordem cronológica. Um evento aceita uma ou mais categorias observadas; campo sem anotação permanece ausente. Remoção usa correção tombstone (`removed: true`) auditável e reversível, não apaga a anotação original. Revisões não mudam posse, resultado, faltas, tempo ou fatos-base; formação é rótulo manual da revisão, nunca inferida de pontos esparsos.

## 4. Relógio de tempo efetivo

```ts
type FutsalClockStatus = 'ready' | 'running' | 'paused' |
  'awaiting_final_kick' | 'period_finished' | 'match_finished' |
  'needs_reconciliation';
type FutsalClockCommand = 'start' | 'pause' | 'adjust' |
  'await_final_kick' | 'finish_period' | 'advance_period' |
  'reconcile';
interface FutsalClockChanged {
  readonly type: 'futsal_clock_changed'; readonly id: string;
  readonly matchId: string; readonly sequence: number;
  readonly timestamp: number; readonly command: FutsalClockCommand;
  readonly period: 1 | 2; readonly elapsedMs: number;
  readonly periodDurationMs: number; readonly status: FutsalClockStatus;
  readonly referenceTimestamp: number; readonly reason?: string;
}
```

- `elapsedMs` é tempo jogado **no período**; mostrar `max(0, periodDurationMs − elapsedMs)`. A projeção limita decorrido à duração, salvo estado explícito `awaiting_final_kick`, que mantém o visor em 00:00 enquanto registra a cobrança final e seu resultado. Nenhum tempo negativo. Finalização da cobrança muda para `period_finished`; ela não inicia relógio novo.
- `T` só envia `start` ou `pause` em `ready/paused/running`. Um acionamento persiste uma transição, com idempotência por comando em voo. Parada/posse e pausa de coleta não disparam `FutsalClockChanged` automaticamente.
- Ajuste e reconciliação registram `reason` e valor anterior pode ser reconstituído pelo evento precedente. Ao abrir **novo processo** com último relógio `running`, apresentar `needs_reconciliation`, congelado no último estado persistido até decisão explícita. Navegar dentro da mesma sessão não implica reconciliação. Ajuste posterior não reescreve tempos dos fatos anteriores; ordenar por `sequence`.
- `advance_period` é permitido só após primeiro período encerrado, cria 2º período pronto e reseta `elapsedMs=0`; nunca faz 2→1. O minuto acumulado de um fato é `floor((offsetDoPeriodo + elapsedMs)/60_000)`, com `offset` do 2º período igual à duração configurada do primeiro. Futebol mantém seu offset de 45 minutos.
- Fonte de tempo operacional: `Date.now()` no serviço como no futebol atual, com referência persistida; na sessão ativa, a UI usa relógio monotônico para exibir suavemente e o serviço continua sendo a autoridade do timestamp capturado. Reconciliar diferença de relógio/fechamento explicitamente antes de novos eventos.

## 5. xG: o que os dados permitem

O xG é a probabilidade estimada de gol **por finalização**, construída a partir de chutes com resultado conhecido. O código atual possui localização de chutes de futebol e um artefato de modelo treinado em futebol de campo. Não há amostra de chutes de futsal com rótulos gol/não gol neste checkout, nem estimativa de calibração para baliza/quadra/situação numérica de futsal. Portanto, a 0.6 consegue calcular **contagens, mapas e conversão observada** após coletar partidas, mas **não um xG de futsal calibrado com os dados atuais**. Transformar distância/ângulo em pontuação geométrica seria indicador exploratório sem probabilidade interpretável; não rotular como xG. A [revisão de escopo de 2026](https://sjsp.aearedo.es/index.php/sjsp/article/view/goal-scoring-futsal-scoping-review?articlesBySimilarityPage=12) reforça o caráter majoritariamente observacional da literatura disponível.

Para um modelo futuro: coletar finalizações consecutivas de futsal, inclusive sem gol; origem real e orientação, tipo de reinício/organização, goleiro-linha, pressão/defensores quando observados, resultado e população/competição. Definir elegibilidade, evitar viés de registrar só chances marcantes, separar partidas de treino e teste, comparar com baseline e verificar calibração/Brier/log loss antes de publicar probabilidades. Não fixar amostra mínima arbitrária sem analisar a cobertura e os eventos disponíveis.

## 6. Fixtures de aceite calculáveis à mão

| Caso | Entrada | Resultado esperado |
|---|---|---|
| Legado ambíguo | `sport` ausente, sem `initialServingTeamId`, `scoringRules`, líbero ou perfil volley | `resolveMatchSport` continua indefinido; nenhuma promoção a futsal. |
| Legado vôlei | `sport` ausente + evidência de saque/rotação | Resolve vôlei; backup antigo carrega sem regravação. |
| Relógio parado | 1º período: T em 20:00; 34 s jogados; T pausa; 120 s de parede depois | Decorrido 34 s, visor 19:26, estado paused. |
| Segundo período | 1º com duração 20 min; no 2º, fato a 03:15 | `elapsedMs=195_000`, acumulado 23:15 (`minute=23`, `second=15`), não 48:15. |
| Encerramento | decorrido chega a 20:00; árbitro determina cobrança final | Visor 00:00, `awaiting_final_kick`; resultado pode ser registrado, T não reinicia; depois `period_finished`. |
| Gol contra | chute de A confirmado como gol para B | Placar A 0, B 1, uma única contagem de gol; corrigir para não gol devolve B a 0. |
| Rebote | A chuta, goleiro defende, A mantém controle e chuta de novo | Uma posse observada, dois chutes, nenhum gol até resultado gol; não inferir troca. |
| Sexta falta | A com quatro acumuladas; duas faltas acumuláveis de A; B com zero | A=6, B=0; alerta quinta e sexta; sem tiro/gol automático. Desfazer última devolve A=5. |
| Futebol: troca | A: atleta `a1` sai, `a6` entra | Evento de futebol com IDs, score/posse/relógio iguais; correção/desfazer e reload preservam relação. |
| Vôlei: troca | slot P1 de A com `a1`, reserva `a7` entra | `substitution_made` altera só slot válido; placar/rotação seguem regra do vôlei; testar em UI na M1. |
| Futsal: troca parcial | A: `a1` sai e `a6` entra; outros atletas não observados | Composição parcial atualiza só certeza sobre `a1/a6`, não preenche os outros quatro; T, posse e placar intactos. |

## 7. Verificação e limites desta etapa

- Arquivos alterados na M0: este contrato, o estado da versão, o índice, o plano mestre e o cabeçalho da etapa M0. Nenhum fonte TypeScript, teste, backup, `package.json` ou dado de partida foi modificado.
- Verificações: leitura dos módulos citados na seção 1, busca por arquivos/eventos de futsal, checagem de referências e formatação. **Não foram executados testes de aplicativo, navegador ou piloto humano**, pois esta etapa só definiu contratos.
- Próxima etapa elegível: [`M1 — corrigir substituições existentes`](etapas/M1_CORRIGIR_SUBSTITUICOES.md). O diagnóstico do vôlei continua pendente de reprodução em UI; o futebol tem ausência de ação confirmada por código.

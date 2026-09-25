> **Versão/escopo:** 0.1 — versão declarada no plano original.
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# SCOUT TRAINER — PLANO DE IMPLEMENTAÇÃO PARA CODEX

> **Documento mestre de implementação**
>
> Versão: 0.1  
> Data de referência: 2026-08-09  
> Objetivo: orientar a implementação incremental, modular e testável de uma ferramenta leve de treinamento de scout de voleibol, inspirada no fluxo de digitação contínua utilizado por softwares profissionais de análise, sem depender de formatos proprietários.
>
> **Regra para o Codex:** não implementar o projeto inteiro de uma vez. Trabalhar fase por fase, respeitando os contratos, pipelines, testes e critérios de aceite deste documento.
>
> **Agrupamento operacional:** a execução foi consolidada em 8 macroetapas documentadas em `docs/ROADMAP.md`. As fases 0–22 abaixo permanecem como checklists técnicos e critérios de aceite internos.

---

# 1. CONTEXTO DO PROJETO

O objetivo é criar uma ferramenta de treinamento de scout de voleibol com quatro características centrais:

1. Entrada de dados contínua por teclado, em uma linha, com foco em velocidade operacional.
2. Sistema de códigos configurável dinamicamente.
3. Interface visual simples, rápida e com baixa distração.
4. Salvamento e exportação de partidas em formatos leves.

O produto deve servir principalmente para:

- treinamento de estatísticos/scoutmen;
- prática de codificação rápida;
- compreensão de rallies e fundamentos;
- registro de partidas para treinamento;
- geração de estatísticas;
- criação de perfis de complexidade;
- reprodução de categorias estatísticas usadas em competições;
- criação futura de perfis personalizados.

O software **não deve ser construído como um clone visual ou técnico de um produto comercial específico**.

A inspiração está no fluxo profissional de scout, na linguagem compacta e nas métricas do voleibol.

---

# 2. PRINCÍPIO MAIS IMPORTANTE

O sistema deve separar completamente:

```text
COMO O USUÁRIO DIGITA
        ↓
O QUE O EVENTO SIGNIFICA
        ↓
COMO A PARTIDA FUNCIONA
        ↓
COMO AS ESTATÍSTICAS SÃO CALCULADAS
        ↓
COMO O RESULTADO É EXIBIDO
```

Nunca misturar essas responsabilidades.

Um código como:

```text
08A#
```

não deve ser armazenado apenas como texto.

Ele deve ser convertido para um evento canônico, por exemplo:

```json
{
  "playerId": "team_a_08",
  "skill": "attack",
  "outcome": "point"
}
```

Outro perfil poderia aceitar:

```text
08AT3
```

e produzir exatamente o mesmo evento.

Essa separação é obrigatória.

---

# 3. OBJETIVOS DE ARQUITETURA

O projeto deve ser:

- modular;
- offline-first;
- local-first;
- leve;
- testável;
- determinístico;
- versionável;
- extensível;
- independente da interface;
- independente do mecanismo de armazenamento;
- independente de um único padrão de scout.

O core do sistema não pode depender de:

- React;
- DOM;
- IndexedDB;
- componentes visuais;
- APIs externas;
- formatos proprietários.

---

# 4. STACK RECOMENDADA

## 4.1 Aplicação

Usar preferencialmente:

```text
TypeScript
Vite
React
```

Motivos:

- TypeScript ajuda a proteger os contratos entre módulos;
- Vite fornece ambiente simples e leve;
- React será usado apenas para UI;
- o domínio continuará independente do React;
- a estrutura poderá futuramente ser empacotada com Tauri.

## 4.2 Persistência

Primeira versão:

```text
IndexedDB
```

Pode ser usado um pequeno adapter/repository sobre IndexedDB.

Evitar dependência direta de IndexedDB dentro do domínio.

## 4.3 Testes

Usar:

```text
Vitest
```

Para componentes:

```text
Testing Library
```

Testes E2E podem ser adicionados posteriormente com:

```text
Playwright
```

## 4.4 Formatação e qualidade

Usar:

```text
ESLint
Prettier
TypeScript strict mode
```

---

# 5. REGRAS OBRIGATÓRIAS PARA O CODEX

O Codex deve seguir estas regras durante toda a implementação.

## 5.1 Não criar monólitos

Evitar arquivos gigantes que concentrem:

- parsing;
- estado;
- métricas;
- UI;
- persistência.

Cada módulo deve possuir responsabilidade clara.

## 5.2 O domínio não importa infraestrutura

Proibido:

```text
domain → IndexedDB
domain → React
domain → localStorage
domain → DOM
```

Permitido:

```text
infrastructure → domain
application → domain
ui → application
```

## 5.3 Toda funcionalidade deve responder

Antes de implementar um recurso, registrar:

```text
INPUT
PROCESSAMENTO
OUTPUT
CONSUMIDOR
```

Exemplo:

```text
Recurso:
eficiência de ataque

Input:
ScoutEvent[]

Processamento:
AttackEfficiencyMetric

Output:
MetricResult

Consumidor:
StatisticsView
```

## 5.4 Nenhuma fórmula estatística dentro de componente visual

Proibido:

```tsx
const efficiency = (points - errors) / total;
```

dentro de componente.

A UI recebe somente:

```ts
MetricResult
```

## 5.5 Nenhum parser dentro de evento de teclado

O componente de input apenas captura caracteres.

Pipeline obrigatório:

```text
UI
↓
InputController
↓
RegisterScoutUseCase
↓
Normalizer
↓
Parser
↓
Validator
↓
EventFactory
```

## 5.6 Toda fase deve terminar com testes

Antes de avançar:

```text
npm run test
npm run lint
npm run typecheck
npm run build
```

Tudo deve passar.

## 5.7 Criar e manter

```text
IMPLEMENTATION_STATUS.md
```

Após cada fase atualizar:

```text
fase atual
itens concluídos
testes
decisões arquiteturais
pendências
próximo passo
```

## 5.8 Não antecipar features

Se uma fase não pede:

```text
login
cloud
IA
backend
PDF
Tauri
sincronização
vídeo
```

não implementar.

---

# 6. ARQUITETURA GERAL

```text
                        APP
                         │
                         ↓
                    UI LAYER
                         │
                         ↓
                 APPLICATION LAYER
                         │
                         ↓
                    DOMAIN CORE
                         │
              ┌──────────┼──────────┐
              ↓          ↓          ↓
            SCOUT      MATCH      TRAINING
              │          │          │
              └──────┬───┴────┬─────┘
                     ↓        ↓
                STATISTICS   PROFILES
                     │
                     ↓
                INFRASTRUCTURE
                     │
             ┌───────┴────────┐
             ↓                ↓
          STORAGE           EXPORT
```

---

# 7. CONTEXTOS DO SISTEMA

Criar quatro contextos conceituais.

## 7.1 ProfileContext

```ts
interface ProfileContext {
  codeProfile: CodeProfile;
  complexityProfile: ComplexityProfile;
  competitionProfile?: CompetitionProfile;
}
```

Responsabilidade:

informar como interpretar e validar a sessão.

---

## 7.2 MatchContext

```ts
interface MatchContext {
  matchId: string;
  currentSet: number;
  score: Score;
  servingTeamId: string;
  currentRotation?: RotationState;
  currentLineups?: LineupState;
}
```

---

## 7.3 ScoutContext

```ts
interface ScoutContext {
  currentRallyId: string;
  previousEvent?: ScoutEvent;
  sequence: number;
}
```

---

## 7.4 TrainingContext

```ts
interface TrainingContext {
  sessionId: string;
  profileId: string;
  currentExerciseId?: string;
  startedAt: number;
}
```

---

# 8. OS QUATRO TIPOS DE PROFILE

Estes conceitos não podem ser fundidos.

```text
CodeProfile
ComplexityProfile
CompetitionProfile
TrainingProfile
```

---

# 9. CODE PROFILE

Responde:

> Como o usuário digita?

Exemplo:

```json
{
  "id": "default_compact_v1",
  "version": "1.0.0",
  "grammar": [
    "player",
    "skill",
    "evaluation"
  ]
}
```

Mapeamento:

```json
{
  "skills": {
    "S": "serve",
    "R": "reception",
    "A": "attack",
    "B": "block",
    "D": "dig",
    "E": "set",
    "F": "free_ball"
  }
}
```

Avaliações:

```json
{
  "evaluations": {
    "#": "excellent",
    "+": "positive",
    "!": "neutral",
    "-": "negative",
    "/": "very_negative",
    "=": "error"
  }
}
```

IMPORTANTE:

O significado final pode depender do fundamento.

Exemplo:

```text
A# → attack / point
R# → reception / perfect
S# → serve / ace
```

Essa conversão pertence ao mapper do profile.

---

# 10. COMPLEXITY PROFILE

Responde:

> Quanto preciso registrar?

Criar inicialmente quatro níveis.

---

# 11. NÍVEL 1 — BASIC

Objetivo:

aprender a linguagem e ganhar velocidade.

Campos obrigatórios:

```text
player
skill
evaluation
```

Exemplo:

```text
08S+
12R#
04A=
```

Não exigir:

- rotação;
- tipo;
- zona;
- direção;
- escalação;
- substituição.

---

# 12. NÍVEL 2 — OPERATIONAL

Objetivo:

registrar um rally funcional.

Campos:

```text
team
player
skill
evaluation
rally
set
```

O sistema acompanha:

```text
placar
set
equipe sacando
sequência de rally
```

Exemplo lógico:

```text
Saque
↓
Recepção
↓
Levantamento
↓
Ataque
↓
Fim do rally
```

---

# 13. NÍVEL 3 — TACTICAL

Objetivo:

permitir análise espacial e tática.

Adicionar:

```text
skillType
originZone
targetZone
direction
```

Possíveis dados:

- tipo de saque;
- origem do saque;
- destino do saque;
- tipo de ataque;
- origem do ataque;
- destino do ataque;
- tipo de levantamento;
- situação de bloqueio.

---

# 14. NÍVEL 4 — ADVANCED

Objetivo:

scout detalhado de partida.

Adicionar:

```text
lineup
rotation
setterPosition
substitutions
attackCombination
attackTempo
blockersCount
phase
transition
```

Fases:

```text
sideout
breakpoint
transition
```

Esse modo deve permitir análises avançadas sem alterar o modelo canônico.

---

# 15. COMPETITION PROFILE

Responde:

> Quais dados e métricas um padrão competitivo específico exige?

CompetitionProfile não é nível de dificuldade.

Exemplo:

```text
ComplexityProfile = tactical
CompetitionProfile = cbv_superliga_reference_2025_26
```

---

# 16. PERFIL CBV

## 16.1 Nome

Usar inicialmente:

```text
cbv_superliga_reference_2025_26
```

NÃO chamar de:

```text
CBV Certified
CBV Official Export
Compatible with CBV
```

sem validação formal.

## 16.2 Motivo da versão

Em 2026-08-09, a temporada 2026/27 está em processo de alinhamento institucional e o regulamento final da nova Superliga não deve ser presumido.

Logo:

```text
competition/
  cbv/
    superliga_reference_2025_26/
```

Quando houver documentação nova:

```text
competition/
  cbv/
    superliga_reference_2026_27/
```

Nunca substituir silenciosamente o anterior.

---

# 17. MÉTRICAS DE REFERÊNCIA CBV

As estatísticas oficiais recentes da Superliga trabalham com categorias como:

```text
Ataque
Bloqueio
Saque
Maior pontuador
Ataque mais eficiente
Bloqueio mais eficiente
Saque mais eficiente
Passe mais eficiente
```

O perfil deve conseguir derivá-las.

---

# 18. ATAQUE

O modelo canônico precisa distinguir:

```ts
type AttackOutcome =
  | "point"
  | "continuation"
  | "error"
  | "blocked";
```

Campos:

```ts
interface AttackEventData {
  outcome: AttackOutcome;
  originZone?: number;
  targetZone?: number;
  attackType?: string;
}
```

## 18.1 Ataque

Métrica:

```text
attack_success_pct =
attack_points / total_attacks
```

## 18.2 Ataque mais eficiente

Métrica:

```text
attack_efficiency =
(attack_points - attack_errors - attacks_blocked)
/
total_attacks
```

Guardar os componentes separadamente.

Nunca guardar apenas o percentual.

---

# 19. RECEPÇÃO

O modo CBV deve conseguir representar:

```ts
type ReceptionGrade =
  | "A"
  | "B"
  | "C"
  | "ERROR";
```

Não presumir que:

```text
# = A
+ = B
- = C
```

O mapeamento pertence ao CompetitionProfile + CodeProfile.

## 19.1 Passe mais eficiente

```text
pass_efficiency =
(pass_A + pass_B)
/
total_receptions
```

Guardar:

```text
A
B
C
ERROR
```

separadamente.

---

# 20. SAQUE

O evento canônico deve distinguir:

```ts
type ServeOutcome =
  | "ace"
  | "in_play"
  | "error";
```

Mas a eficiência competitiva também depende da recepção seguinte.

Portanto RallyEngine deve relacionar:

```text
ServeEvent
↓
ReceptionEvent
```

## 20.1 Saque

```text
serve_points = aces
```

## 20.2 Saque mais eficiente

```text
serve_efficiency =
(aces + serves_that_generate_pass_C)
/
total_serves
```

Para isso, cada evento deve conter:

```text
rallyId
sequence
```

---

# 21. BLOQUEIO

Representar:

```ts
type BlockOutcome =
  | "point"
  | "touch"
  | "no_touch";
```

## 21.1 Bloqueio

```text
block_points
```

## 21.2 Bloqueio mais eficiente

```text
block_efficiency =
block_points
/
sets_played
```

Isso exige rastrear participação por set.

Criar:

```ts
PlayerSetParticipation
```

---

# 22. MAIOR PONTUADOR

Derivar:

```text
total_points =
attack_points
+
block_points
+
serve_points
```

Não salvar o valor manualmente.

Ele deve ser calculado.

---

# 23. EVENTO CANÔNICO

Criar uma estrutura base.

```ts
interface ScoutEvent {
  id: string;
  matchId: string;
  rallyId: string;
  sequence: number;

  teamId: string;
  playerId?: string;

  skill: Skill;
  outcome?: string;
  evaluation?: string;

  setNumber: number;
  scoreBefore: ScoreSnapshot;

  timestamp: number;

  rawCode: string;

  codeProfileId: string;
  codeProfileVersion: string;

  complexityProfileId: string;

  competitionProfileId?: string;
  competitionProfileVersion?: string;

  metadata?: ScoutEventMetadata;
}
```

Skill:

```ts
type Skill =
  | "serve"
  | "reception"
  | "set"
  | "attack"
  | "block"
  | "dig"
  | "free_ball";
```

---

# 24. METADATA DO EVENTO

```ts
interface ScoutEventMetadata {
  skillType?: string;

  originZone?: number;
  targetZone?: number;
  direction?: string;

  rotation?: number;
  setterPosition?: number;

  attackTempo?: string;
  attackCombination?: string;

  blockersCount?: number;

  phase?: "sideout" | "breakpoint" | "transition";
}
```

Evitar criar dezenas de propriedades soltas no objeto principal.

---

# 25. RAW INPUT SEMPRE PRESERVADO

Nunca descartar:

```text
rawCode
```

Exemplo:

```json
{
  "rawCode": "08A#"
}
```

Mesmo depois de interpretado.

Isso permite:

- auditoria;
- comparação;
- correção;
- reprocessamento;
- mudança futura de parser;
- análise de erro do usuário.

---

# 26. EVENTOS IMUTÁVEIS

Não editar eventos silenciosamente.

Se:

```text
08A#
```

for corrigido para:

```text
08A+
```

criar:

```ts
CorrectionEvent
```

Estrutura:

```ts
interface CorrectionEvent {
  id: string;
  targetEventId: string;
  previousRawCode: string;
  newRawCode: string;
  correctedAt: number;
}
```

O histórico deve ser preservado.

---

# 27. PIPELINE PRINCIPAL DE SCOUT

Pipeline obrigatório:

```text
USUÁRIO DIGITA
      ↓
InputController
      ↓
RawScoutInput
      ↓
ProfileResolver
      ↓
Normalizer
      ↓
Tokenizer
      ↓
Parser
      ↓
SemanticMapper
      ↓
CanonicalScoutEventCandidate
      ↓
SyntaxValidator
      ↓
ProfileValidator
      ↓
MatchValidator
      ↓
CompetitionValidator
      ↓
EventFactory
      ↓
ScoutEvent
      ↓
EventRepository
      ↓
MatchReducer
      ↓
StatisticsInvalidation
      ↓
UI Update
```

Nenhuma camada pode pular esse pipeline.

---

# 28. NORMALIZER

Responsabilidades:

- trim;
- remoção de espaços permitidos;
- normalização de caixa;
- aliases;
- caracteres equivalentes configurados.

Exemplo:

```text
" 08a# "
↓
"08A#"
```

Normalizer não entende regras de vôlei.

---

# 29. TOKENIZER

Entrada:

```text
08A#
```

Saída:

```json
[
  { "type": "PLAYER", "value": "08" },
  { "type": "SKILL", "value": "A" },
  { "type": "EVALUATION", "value": "#" }
]
```

Tokenizer não valida escalação.

---

# 30. PARSER

Entrada:

```text
Token[]
```

Saída:

```ts
ParsedScoutCode
```

Exemplo:

```ts
{
  playerNumber: 8,
  skillCode: "A",
  evaluationCode: "#"
}
```

Parser não decide se o atleta está em quadra.

---

# 31. SEMANTIC MAPPER

Transforma:

```text
A + #
```

em:

```text
attack + point
```

usando os profiles.

Saída:

```ts
CanonicalScoutEventCandidate
```

---

# 32. VALIDADORES

Criar módulos independentes.

```text
SyntaxValidator
ProfileValidator
RosterValidator
RotationValidator
SequenceValidator
CompetitionValidator
```

Resultado padronizado:

```ts
interface ValidationResult {
  valid: boolean;
  severity: "ok" | "warning" | "error";
  issues: ValidationIssue[];
}
```

---

# 33. WARNING NÃO É ERROR

O software precisa continuar rápido durante scout.

Exemplo:

```text
Jogador 17 não está registrado na escalação.
```

Pode ser:

```text
warning
```

e permitir salvar.

Erros estruturais:

```text
código impossível de interpretar
```

podem bloquear.

Permitir configuração por profile.

---

# 34. MATCH ENGINE

Criar módulos:

```text
ScoreState
SetState
ServeState
RallyState
RotationState
LineupState
SubstitutionState
```

Não criar um gigantesco:

```text
MatchManager.ts
```

com toda a lógica.

---

# 35. REDUCER DE PARTIDA

Estado novo sempre derivado de:

```text
estado anterior
+
evento
=
novo estado
```

Exemplo:

```ts
const nextState = reduceMatch(previousState, event);
```

Isso permite reconstrução.

---

# 36. EVENT SOURCING SIMPLES

O sistema deve conseguir reconstruir a partida a partir de:

```text
MatchMetadata
+
Event[]
```

Ao carregar:

```text
repository
↓
event stream
↓
replay
↓
match state
```

Evitar depender de estado duplicado inconsistente.

Snapshots podem ser adicionados futuramente por desempenho.

---

# 37. RALLY ENGINE

Criar uma máquina de estados.

Exemplo simplificado:

```text
RALLY_START
↓
SERVE
↓
RECEPTION
↓
SET
↓
ATTACK
↓
BLOCK / DIG / POINT
↓
TRANSITION
↓
SET
↓
ATTACK
↓
RALLY_END
```

O engine deve ser tolerante a scouts simplificados.

BasicProfile não precisa registrar todos os eventos intermediários.

---

# 38. IDENTIFICAÇÃO DE RALLY

Cada rally recebe:

```text
rallyId
```

Cada evento recebe:

```text
sequence
```

Exemplo:

```text
rally_001
  1 serve
  2 reception
  3 set
  4 attack
```

Essa relação é essencial para métricas contextuais.

---

# 39. STATISTICS ENGINE

Arquitetura:

```text
EventStore
↓
Query
↓
Filter
↓
Aggregator
↓
Metric
↓
MetricResult
```

Criar:

```ts
interface MetricDefinition {
  id: string;
  name: string;
  requiredFields: string[];
  calculate(context: MetricContext): MetricResult;
}
```

---

# 40. METRIC REGISTRY

Criar:

```text
MetricRegistry
```

Registrar métricas por ID.

Exemplo:

```text
volleyball.attack.success_pct
volleyball.attack.efficiency
volleyball.reception.positive_pct
volleyball.serve.ace_pct

cbv.2025_26.attack
cbv.2025_26.attack_efficiency
cbv.2025_26.pass_efficiency
cbv.2025_26.serve_efficiency
cbv.2025_26.block_efficiency
```

---

# 41. METRIC RESULT

```ts
interface MetricResult {
  metricId: string;
  value: number | null;
  numerator?: number;
  denominator?: number;
  components?: Record<string, number>;
  available: boolean;
  reasonUnavailable?: string;
}
```

Exemplo:

```json
{
  "metricId": "cbv.2025_26.block_efficiency",
  "value": null,
  "available": false,
  "reasonUnavailable": "sets_played_missing"
}
```

Nunca inventar valores quando faltarem dados.

---

# 42. CACHE DE MÉTRICAS

Não otimizar prematuramente.

Primeiro:

```text
events
↓
calculate
```

Posteriormente pode ser implementado:

```text
metric cache
```

Invalidar cache quando:

```text
event added
event corrected
event undone
```

---

# 43. TRAINING ENGINE

Treino é um domínio separado.

Estrutura:

```text
training/
  engine/
  exercises/
  comparator/
  timing/
  metrics/
```

Pipeline:

```text
TrainingProfile
↓
ExerciseGenerator
↓
ExpectedCanonicalEvent
↓
Situação apresentada
↓
Usuário digita
↓
Pipeline normal de scout
↓
CanonicalScoutEvent
↓
TrainingComparator
↓
TrainingAttempt
↓
PerformanceMetrics
```

Reutilizar o parser real.

Nunca criar parser separado de treinamento.

---

# 44. TRAINING PROFILE

Exemplo:

```ts
interface TrainingProfile {
  id: string;
  complexityProfileId: string;

  enabledSkills: Skill[];

  targetAccuracy?: number;
  targetAverageTimeMs?: number;

  exerciseCount?: number;
}
```

---

# 45. MODOS DE TREINO

Criar gradualmente.

## 45.1 Código livre

Usuário assiste um jogo real e registra.

Sem gabarito.

---

## 45.2 Situação → código

Tela mostra:

```text
Jogador 8
Ataque
Ponto
```

Usuário:

```text
08A#
```

---

## 45.3 Código → interpretação

Tela:

```text
12R+
```

Usuário precisa interpretar.

Implementar posteriormente.

---

## 45.4 Rally guiado

Sistema apresenta sequência de acontecimentos.

Usuário scouteia em tempo real.

---

# 46. MÉTRICAS DO OPERADOR

Implementar:

```text
accuracy
averageInputTime
medianInputTime
eventsPerMinute
syntaxErrors
playerErrors
skillErrors
evaluationErrors
corrections
```

Futuramente:

```text
accuracyBySkill
accuracyByComplexity
accuracyByCodeComponent
learningCurve
```

---

# 47. PERFORMANCE DO OPERADOR

Estrutura:

```ts
interface TrainingAttempt {
  exerciseId: string;
  expectedEvent: CanonicalScoutEventCandidate;
  receivedEvent?: CanonicalScoutEventCandidate;

  rawInput: string;

  correct: boolean;

  startedAt: number;
  submittedAt: number;
  durationMs: number;

  errors: TrainingError[];
}
```

---

# 48. PERSISTÊNCIA

Criar repositories.

Interfaces no application/domain:

```text
MatchRepository
EventRepository
ProfileRepository
TrainingSessionRepository
TeamRepository
PlayerRepository
```

Implementação:

```text
IndexedDbMatchRepository
IndexedDbEventRepository
...
```

---

# 49. MODELO DE DADOS LOCAL

Stores sugeridos:

```text
matches
events
teams
players
codeProfiles
complexityProfiles
competitionProfiles
trainingProfiles
trainingSessions
trainingAttempts
```

---

# 50. AUTOSAVE

Cada evento confirmado deve ser persistido imediatamente.

Não depender de botão:

```text
Salvar partida
```

O botão pode existir para:

```text
exportar
duplicar
finalizar
```

O scout não pode ser perdido porque o navegador fechou.

---

# 51. EXPORTAÇÃO

Formato mestre:

```text
JSON
```

Estrutura:

```json
{
  "schemaVersion": "1.0.0",
  "match": {},
  "teams": [],
  "players": [],
  "profiles": {},
  "events": []
}
```

---

# 52. CSV

CSV é formato derivado.

Uma linha por evento.

Colunas iniciais:

```text
event_id
match_id
rally_id
sequence
set
score_home
score_away
team
player
skill
outcome
evaluation
origin_zone
target_zone
timestamp
raw_code
```

---

# 53. TXT

Exportar opcionalmente a sequência bruta:

```text
08S+
12R#
03E#
07A#
...
```

Útil para estudo e auditoria.

---

# 54. IMPORTAÇÃO

Primeira versão:

```text
JSON próprio
```

Não implementar importação de formatos proprietários sem documentação e decisão específica.

---

# 55. VERSIONAMENTO DE SCHEMA

Todo arquivo exportado deve conter:

```json
{
  "schemaVersion": "1.0.0"
}
```

Criar:

```text
migration/
```

mesmo que inicialmente vazio.

---

# 56. UI

A UI deve ser funcional antes de bonita.

Tela principal:

```text
┌───────────────────────────────────────────┐
│ OLYMPICO       17 x 15       MINAS       │
│ SET 2                     RALLY 33        │
│                                           │
│ > 08A# █                                  │
│                                           │
│ 08A#  Ataque ponto                        │
│ 12R+  Recepção positiva                   │
│ 03E#  Levantamento                        │
│ 07S+  Saque positivo                      │
│                                           │
│ Perfil: Operational                       │
└───────────────────────────────────────────┘
```

---

# 57. PRINCÍPIOS DE UX

Durante scout:

- foco sempre no campo;
- operações principais via teclado;
- pouca animação;
- pouca distração;
- feedback rápido;
- sem modais para ações frequentes;
- histórico visível;
- erro corrigível rapidamente.

---

# 58. ATALHOS INICIAIS

```text
Enter
registrar

Escape
limpar buffer

Ctrl+Z
desfazer

Ctrl+Shift+Z
refazer

ArrowUp
selecionar último evento para edição
```

Não capturar atalhos do navegador de forma perigosa.

---

# 59. TELAS INICIAIS

MVP:

```text
Home
Nova Partida
Scout
Resumo
Configurações
```

Depois:

```text
Treinamento
Perfis
Histórico
```

---

# 60. ESTRUTURA DE PASTAS

```text
src/

  core/
    ids/
    types/
    errors/
    result/
    schema/

  profiles/

    code/
      default-compact/
      registry/

    complexity/
      basic/
      operational/
      tactical/
      advanced/
      registry/

    competition/
      cbv/
        superliga-reference-2025-26/
      registry/

    training/
      registry/

  domain/

    scout/
      entities/
      events/
      normalizer/
      tokenizer/
      parser/
      mapper/
      validators/

    rally/
      entities/
      state/
      reducers/
      rules/

    match/
      entities/
      state/
      score/
      sets/
      serve/
      rotation/
      lineup/
      substitutions/
      reducers/

    statistics/
      definitions/
      filters/
      aggregators/
      metrics/
      registry/

    training/
      entities/
      exercises/
      comparator/
      timing/
      metrics/

  application/

    ports/
      repositories/

    use-cases/
      create-match/
      open-match/
      register-scout-event/
      correct-scout-event/
      undo-scout-event/
      redo-scout-event/
      start-training/
      submit-training-attempt/
      export-match/

  infrastructure/

    persistence/
      indexeddb/
      repositories/

    export/
      json/
      csv/
      txt/

    import/
      json/

  ui/

    app/
    routes/

    screens/
      home/
      match-setup/
      scout/
      summary/
      training/
      profiles/
      settings/

    components/
      scout-input/
      event-list/
      scoreboard/
      validation-feedback/

    hooks/
    view-models/

  tests/

    fixtures/
    factories/
    integration/

docs/

  architecture/
  profiles/
  metrics/
  decisions/
```

---

# 61. ARCHITECTURE DECISION RECORDS

Criar:

```text
docs/decisions/
```

Formato:

```text
ADR-001-canonical-event.md
ADR-002-profile-separation.md
ADR-003-event-sourcing.md
ADR-004-local-first.md
```

Cada decisão contém:

```text
Context
Decision
Consequences
Alternatives considered
```

---

# 62. FASE 0 — BOOTSTRAP

## Objetivo

Criar apenas a fundação.

## Implementar

```text
Vite
TypeScript strict
React
Vitest
ESLint
Prettier
estrutura de pastas
```

Criar:

```text
README.md
IMPLEMENTATION_STATUS.md
```

Não implementar scout ainda.

## Aceite

```text
npm run dev
npm run test
npm run lint
npm run typecheck
npm run build
```

todos funcionam.

---

# 63. FASE 1 — CONTRATOS DO DOMÍNIO

## Implementar

```text
Skill
Score
ScoutEvent
ScoutEventMetadata
CodeProfile
ComplexityProfile
CompetitionProfile
TrainingProfile
ValidationResult
MetricResult
```

Criar fixtures.

## Testes

Garantir:

- serialização;
- validações básicas;
- IDs;
- versões.

## Aceite

Nenhuma dependência de UI no domínio.

---

# 64. FASE 2 — PROFILE ENGINE

Implementar:

```text
ProfileRegistry
ProfileResolver
ProfileValidator
```

Criar:

```text
default_compact_v1
basic
operational
tactical
advanced
cbv_superliga_reference_2025_26
```

## Teste arquitetural

Adicionar novo profile de teste sem alterar Parser.

Se exigir alteração estrutural do parser, revisar arquitetura.

---

# 65. FASE 3 — PARSER

Implementar:

```text
Normalizer
Tokenizer
Parser
SemanticMapper
```

Primeiros códigos:

```text
08S+
12R#
04A=
03B#
```

## Testes

Criar bateria de pelo menos:

```text
50 casos válidos
30 inválidos
20 limites
```

Casos:

- jogador 1;
- jogador 99;
- lowercase;
- espaços;
- símbolos inválidos;
- fundamento desconhecido;
- avaliação ausente;
- perfil incompatível.

---

# 66. FASE 4 — VALIDATION ENGINE

Implementar:

```text
SyntaxValidator
ProfileValidator
RosterValidator
SequenceValidator
```

Sem rotação avançada inicialmente.

Testar:

```text
valid
warning
error
```

---

# 67. FASE 5 — EVENT ENGINE

Implementar:

```text
EventFactory
ScoutEvent
CorrectionEvent
Undo
Redo
```

Criar histórico imutável.

## Aceite

Registrar:

```text
08A#
```

corrigir para:

```text
08A+
```

desfazer e refazer sem perder histórico.

---

# 68. FASE 6 — PERSISTÊNCIA

Implementar repositories.

Testar:

```text
criar partida
salvar evento
fechar
abrir
reconstruir
```

## Aceite

Recarregar navegador não perde partida.

---

# 69. FASE 7 — MATCH ENGINE BÁSICO

Implementar:

```text
set
score
servingTeam
rally
```

Ainda sem rotação avançada.

Criar:

```text
MatchReducer
RallyReducer
```

## Aceite

É possível reproduzir um jogo a partir dos eventos.

---

# 70. FASE 8 — MVP VISUAL

Criar:

```text
Home
Nova Partida
Scout
Resumo
```

Implementar input contínuo.

## Aceite

Usuário consegue:

1. criar partida;
2. digitar eventos;
3. ver histórico;
4. desfazer;
5. corrigir;
6. atualizar placar;
7. fechar navegador;
8. abrir novamente;
9. continuar.

Esse é o primeiro MVP utilizável.

---

# 71. FASE 9 — BASIC PROFILE

Ativar fluxo completo.

Exigir:

```text
player
skill
evaluation
```

Adicionar tela simples explicando os códigos.

## Aceite

Uma partida pode ser scouteada inteira no modo básico.

---

# 72. FASE 10 — OPERATIONAL PROFILE

Adicionar:

```text
rally
team
set
sequence
```

RallyEngine passa a entender sequência básica.

Adicionar validações de contexto.

---

# 73. FASE 11 — STATISTICS ENGINE BÁSICO

Implementar primeiro:

```text
attack volume
attack points
attack errors

serve volume
aces
serve errors

reception volume
evaluation distribution

block points
```

Depois:

```text
attack success
attack efficiency
positive reception
perfect reception
serve efficiency
```

## Aceite

Nenhum cálculo dentro da UI.

---

# 74. FASE 12 — TACTICAL PROFILE

Adicionar:

```text
originZone
targetZone
skillType
direction
```

UI pode oferecer representação simples da quadra posteriormente.

Primeiro garantir dados.

---

# 75. FASE 13 — PERFIL CBV DE REFERÊNCIA

Implementar:

```text
cbv_superliga_reference_2025_26
```

Métricas:

```text
attack
attack_efficiency
serve
serve_efficiency
block
block_efficiency
pass_efficiency
top_scorer
```

## Testes

Criar datasets artificiais pequenos com resultado calculável manualmente.

Exemplo:

```text
10 ataques
5 pontos
2 erros
1 bloqueado
2 continuidade
```

Esperado:

```text
attack = 50%

attack_efficiency =
(5 - 2 - 1) / 10
= 20%
```

---

# 76. TESTE DE SAQUE CBV

Dataset:

```text
10 saques

2 aces
3 geraram passe C
4 outros em jogo
1 erro
```

Esperado:

```text
serve points = 2

serve efficiency =
(2 + 3) / 10
= 50%
```

A associação de passe C deve ser encontrada pelo rally.

---

# 77. TESTE DE PASSE CBV

Dataset:

```text
20 recepções

8 A
6 B
4 C
2 erros
```

Esperado:

```text
pass efficiency =
(8 + 6) / 20
= 70%
```

---

# 78. TESTE DE BLOQUEIO CBV

Dataset:

```text
12 pontos de bloqueio
8 sets disputados
```

Esperado:

```text
1.5 pontos/set
```

---

# 79. FASE 14 — ADVANCED PROFILE

Adicionar:

```text
rotation
lineup
setterPosition
substitution
attackTempo
attackCombination
blockersCount
phase
```

Criar validators específicos.

Não bloquear automaticamente situações incomuns sem boa justificativa.

---

# 80. FASE 15 — TRAINING ENGINE

Criar:

```text
TrainingSession
ExerciseGenerator
TrainingAttempt
Comparator
TimingEngine
PerformanceMetrics
```

Primeiro modo:

```text
situação → código
```

Exemplo:

```text
Jogador 8
Saque
Ace
```

Esperado:

```text
08S#
```

dependendo do CodeProfile.

---

# 81. FASE 16 — PROGRESSÃO DE COMPLEXIDADE

Criar seleção:

```text
Básico
Operacional
Tático
Avançado
CBV
Personalizado
```

IMPORTANTE:

CBV aparece visualmente como modo, mas internamente continua sendo:

```text
ComplexityProfile
+
CompetitionProfile
```

Não quebrar a arquitetura para simplificar a UI.

---

# 82. FASE 17 — TRAINING METRICS

Criar:

```text
accuracy
average time
median time
events/min
syntax errors
player errors
skill errors
evaluation errors
```

Resumo:

```text
Precisão: 94.2%
Tempo médio: 1.8 s
Eventos/min: 28
```

---

# 83. FASE 18 — EXPORTAÇÃO

Implementar:

```text
JSON
CSV
TXT
```

Validar export + reimport JSON.

Teste:

```text
partida original
↓
export JSON
↓
import JSON
↓
eventos equivalentes
```

---

# 84. FASE 19 — PROFILE EDITOR

Só implementar agora.

Interface para editar:

```text
skills
evaluations
aliases
grammar
required fields
```

O editor gera:

```text
CodeProfile
```

Não gerar código TypeScript.

Gerar configuração serializável.

---

# 85. FASE 20 — PWA

Adicionar:

```text
manifest
service worker
offline
installability
```

Verificar que o programa consegue funcionar sem internet depois do primeiro carregamento.

---

# 86. FASE 21 — ROBUSTEZ

**Status: concluída na Macroetapa 8.**

Adicionar:

```text
autosave
crash recovery
schema migration
backup
import validation
large match tests
```

Teste com:

```text
5000 eventos
```

Verificar:

- input continua rápido;
- lista pode virtualizar se necessário;
- métricas continuam corretas.

---

# 87. FASE 22 — E2E

**Status: concluída na Macroetapa 8.**

Playwright:

```text
create match
register rally
undo
correct
reload
export
training attempt
```

---

# 88. TESTES OBRIGATÓRIOS POR MÓDULO

## Parser

```text
unit
```

## Validator

```text
unit
```

## Rally Engine

```text
unit + integration
```

## Match Reducer

```text
unit
```

## Statistics

```text
unit
```

## Repositories

```text
integration
```

## UI

```text
component
```

## Fluxos críticos

```text
E2E
```

---

# 89. FIXTURES

Criar:

```text
tests/fixtures/
```

Incluir:

```text
basic-rally.json
operational-rally.json
long-rally.json
attack-metric.json
serve-cbv-metric.json
reception-cbv-metric.json
block-cbv-metric.json
full-set.json
```

---

# 90. PROPRIEDADES IMPORTANTES PARA TESTES

## Determinismo

Mesmo conjunto:

```text
events
```

deve produzir sempre:

```text
mesmo MatchState
mesmas métricas
```

## Rebuild

```text
live state
```

deve ser igual a:

```text
state reconstruído pelo replay
```

---

# 91. DEFINITION OF DONE DE UMA FEATURE

Uma feature só está concluída se:

- contrato definido;
- domínio implementado;
- testes criados;
- typecheck passa;
- lint passa;
- build passa;
- documentação atualizada;
- status atualizado;
- sem regra de negócio duplicada na UI.

---

# 92. DEFINITION OF DONE DE UMA FASE

Antes de avançar:

```text
[ ] todos os itens da fase implementados
[ ] testes passando
[ ] build passando
[ ] IMPLEMENTATION_STATUS atualizado
[ ] dívida técnica registrada
[ ] nenhum TODO crítico escondido
[ ] próximo passo registrado
```

---

# 93. PROTOCOLO DE EXECUÇÃO PARA CODEX

Ao receber este documento:

## Passo 1

Ler:

```text
README.md
IMPLEMENTATION_STATUS.md
este plano
```

## Passo 2

Identificar a próxima fase incompleta.

## Passo 3

Antes de codificar, apresentar:

```text
Objetivo da fase
Arquivos que serão criados/modificados
Contratos envolvidos
Testes previstos
```

## Passo 4

Implementar apenas a fase.

## Passo 5

Executar:

```text
npm run test
npm run lint
npm run typecheck
npm run build
```

## Passo 6

Corrigir falhas.

## Passo 7

Atualizar:

```text
IMPLEMENTATION_STATUS.md
```

## Passo 8

Parar.

Não avançar automaticamente várias fases sem solicitação.

---

# 94. FORMATO DO IMPLEMENTATION_STATUS

```md
# Implementation Status

## Current phase

Phase 3 — Parser

## Completed

- Normalizer
- Tokenizer
- Basic parser

## Tests

- 52 passing
- 0 failing

## Architectural decisions

- Parser consumes tokens rather than raw strings.
- Semantic mapping remains profile-driven.

## Pending

- invalid evaluation diagnostics
- aliases

## Known debt

- none

## Next phase

Phase 4 — Validation Engine
```

---

# 95. README MÍNIMO

README deve explicar:

```text
O que é
Objetivo
Stack
Como rodar
Como testar
Arquitetura resumida
Profiles
Status atual
Limitações
```

Evitar README publicitário antes do produto existir.

---

# 96. REGRAS DE NOMENCLATURA

Preferir termos de domínio em inglês no código:

```text
ScoutEvent
MatchState
Rally
Serve
Reception
Attack
Block
Dig
Set
```

UI pode ser em português.

Não misturar:

```text
AtaqueEvent
ServeEvento
```

---

# 97. ERROS

Criar erros tipados.

Exemplo:

```text
ParseError
ProfileError
ValidationError
RepositoryError
ImportError
```

Evitar:

```ts
throw new Error("deu ruim")
```

---

# 98. RESULT TYPE

Para operações previsivelmente falíveis, considerar:

```ts
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

Especialmente:

```text
parser
import
profile loader
repositories
```

---

# 99. LOGGING

Não espalhar:

```text
console.log
```

Criar pequeno logger abstraído.

Níveis:

```text
debug
info
warn
error
```

Produção pode silenciar debug.

---

# 100. IDs

Não usar índice da lista como ID.

Criar IDs:

```text
match
event
rally
training session
attempt
profile
```

UUID ou solução equivalente.

---

# 101. TEMPO

Usar timestamp em milissegundos:

```text
Date.now()
```

Para treino de precisão temporal pode ser usado:

```text
performance.now()
```

durante a sessão.

Persistir duração, não depender apenas de performance.now após reload.

---

# 102. PLACAR

Score não deve ser inferido exclusivamente de códigos até o RallyEngine estar confiável.

Permitir inicialmente:

```text
score events
```

explícitos.

Depois pode haver inferência.

Prioridade:

```text
correção fácil > automação agressiva
```

---

# 103. ROTAÇÃO

Não implementar rotação na primeira fase.

Quando chegar Advanced:

Criar um domínio separado:

```text
rotation/
```

Representar:

```text
P1
P2
P3
P4
P5
P6
```

e posições em quadra.

---

# 104. JOGADORES E EQUIPES

Team:

```ts
interface Team {
  id: string;
  name: string;
  shortName?: string;
}
```

Player:

```ts
interface Player {
  id: string;
  teamId: string;
  number: number;
  name?: string;
  role?: PlayerRole;
}
```

Role opcional inicialmente.

---

# 105. POSIÇÕES

Futuramente:

```ts
type PlayerRole =
  | "setter"
  | "outside"
  | "opposite"
  | "middle"
  | "libero"
  | "unknown";
```

Não obrigar posição no modo básico.

---

# 106. CONFIGURAÇÕES DINÂMICAS

ProfileEditor nunca deve permitir criar configuração inválida.

Pipeline:

```text
UI Editor
↓
Draft Profile
↓
ProfileValidator
↓
Preview
↓
Save
```

Adicionar botão:

```text
Testar código
```

Exemplo:

```text
08A#
```

mostrar:

```text
Jogador 8
Ataque
Ponto
```

antes de salvar.

---

# 107. PREVIEW DO PROFILE

ProfileEditor deve conseguir rodar parser em sandbox.

Não alterar perfil ativo da partida até o usuário confirmar.

---

# 108. PROFILE SNAPSHOT

Ao iniciar partida, salvar snapshot/version do profile.

Motivo:

Se o usuário alterar o profile amanhã, uma partida antiga não pode mudar de significado.

Exportar:

```text
profileId
profileVersion
profileSnapshot
```

---

# 109. ALTERAÇÃO DE PROFILE DURANTE PARTIDA

Primeira versão:

não permitir.

Se necessário futuramente, criar:

```text
ProfileChangeEvent
```

Nunca alterar silenciosamente.

---

# 110. COMPETITION PROFILE VERSIONADO

Sempre:

```text
id
version
effectiveDate
sourceDescription
```

Exemplo:

```json
{
  "id": "cbv_superliga_reference_2025_26",
  "version": "1.0.0",
  "effectiveDate": "2025-10-01",
  "sourceDescription": "CBV Superliga published statistical definitions"
}
```

---

# 111. FONTES DE REFERÊNCIA DO PERFIL CBV

Registrar no próprio profile, como metadados documentais:

```text
CBV — Estatísticas oficiais da Superliga
CBV — definições de ataque, saque, bloqueio e passe
CBV — regulamentos da competição correspondentes à temporada
```

Não usar esses metadados como dependência de execução.

O programa deve funcionar offline.

---

# 112. ATUALIZAÇÃO FUTURA DA CBV

Quando surgir padrão 2026/27:

1. criar novo diretório;
2. copiar apenas estrutura necessária;
3. atualizar definições;
4. criar novos testes;
5. não alterar 2025/26;
6. documentar diferenças.

Exemplo:

```text
profiles/
  competition/
    cbv/
      superliga-reference-2025-26/
      superliga-reference-2026-27/
```

---

# 113. NÃO IMPLEMENTAR NESTE MOMENTO

Fora do escopo inicial:

```text
IA
reconhecimento automático de vídeo
cloud
login
multiusuário
sincronização em tempo real
integração com APIs esportivas
formato proprietário de terceiros
streaming
edição de vídeo
reconhecimento de jogadores
machine learning
```

---

# 114. BACKLOG FUTURO

Depois do core sólido:

```text
mapa de saque
mapa de ataque
heatmap
rotações
side-out
breakpoint
complexos K1/K2
comparação entre sets
comparação entre atletas
dashboard
vídeo sincronizado
Tauri desktop
atalhos configuráveis
treino com vídeo
```

---

# 115. SIDE-OUT E BREAKPOINT

Quando implementados:

não inferir de forma espalhada.

Criar:

```text
PhaseClassifier
```

Entrada:

```text
RallyContext
```

Saída:

```text
sideout
breakpoint
transition
```

---

# 116. DASHBOARD

Dashboard é consumidor.

Pipeline:

```text
EventStore
↓
StatisticsEngine
↓
MetricResult[]
↓
DashboardViewModel
↓
UI
```

Nunca:

```text
Dashboard
↓
processa eventos diretamente
```

---

# 117. QUADRA VISUAL

Quando adicionar mapa:

Receber somente dados canônicos:

```text
originZone
targetZone
```

A visualização não interpreta códigos.

---

# 118. SEGURANÇA DE DADOS

Inicialmente dados ficam locais.

Não enviar partidas para serviços externos.

Mostrar na interface:

```text
Dados salvos neste dispositivo.
```

quando verdadeiro.

---

# 119. PRIVACIDADE

Não incluir:

- analytics externo;
- trackers;
- telemetria;
- crash reporting remoto;

sem decisão explícita futura.

---

# 120. PERFORMANCE

Objetivo operacional:

input não pode apresentar atraso perceptível.

Evitar:

- recalcular todas as métricas pesadas a cada tecla;
- salvar antes de Enter;
- renderizar milhares de eventos simultaneamente;
- grandes dependências visuais.

Processar após submissão do evento.

---

# 121. EVENT LIST

Se a partida crescer:

usar virtualização somente quando necessário.

Primeira implementação pode mostrar:

```text
últimos 50 eventos
```

com acesso ao histórico completo em tela separada.

---

# 122. ACESSIBILIDADE

Garantir:

- navegação por teclado;
- foco visível;
- labels;
- contraste;
- não depender somente de cor para erro;
- mensagens textuais.

---

# 123. INTERNACIONALIZAÇÃO

Não implementar i18n completo inicialmente.

Mas separar:

```text
domain enum
```

de:

```text
label da UI
```

Exemplo:

```text
attack
```

pode aparecer:

```text
Ataque
```

---

# 124. PWA

O PWA é etapa posterior.

Não deixar Service Worker complicar debugging no início.

Adicionar somente na fase específica.

---

# 125. TAURI

Tauri só deve ser avaliado depois da PWA estável.

O core precisa continuar independente.

Estrutura permitirá:

```text
web
↓
Tauri wrapper
```

sem reescrever domínio.

---

# 126. CRITÉRIO DE MVP 1

MVP 1 está concluído quando:

```text
[ ] criar partida
[ ] cadastrar duas equipes
[ ] cadastrar jogadores
[ ] selecionar Basic Profile
[ ] registrar código contínuo
[ ] interpretar
[ ] validar
[ ] persistir
[ ] listar histórico
[ ] corrigir
[ ] desfazer
[ ] recarregar aplicação
[ ] continuar partida
[ ] exportar JSON
```

Nenhum dashboard sofisticado é necessário.

---

# 127. CRITÉRIO DE MVP 2

```text
[ ] Operational Profile
[ ] rally
[ ] score
[ ] set
[ ] saque
[ ] recepção
[ ] ataque
[ ] bloqueio
[ ] métricas básicas
[ ] CSV
```

---

# 128. CRITÉRIO DE MVP 3

```text
[ ] Training Engine
[ ] Basic Training
[ ] accuracy
[ ] speed
[ ] history
[ ] Tactical Profile
```

---

# 129. CRITÉRIO DE MVP 4

```text
[ ] CBV reference profile
[ ] CBV metrics
[ ] Advanced Profile
[ ] profile editor
[ ] PWA offline
```

---

# 130. ORDEM CORRETA DE IMPLEMENTAÇÃO

Resumo:

```text
0 Bootstrap
↓
1 Contracts
↓
2 Profiles
↓
3 Parser
↓
4 Validators
↓
5 Events
↓
6 Persistence
↓
7 Match Engine
↓
8 MVP UI
↓
9 Basic
↓
10 Operational
↓
11 Statistics
↓
12 Tactical
↓
13 CBV reference
↓
14 Advanced
↓
15 Training
↓
16 Complexity UI
↓
17 Training Metrics
↓
18 Export
↓
19 Profile Editor
↓
20 PWA
↓
21 Robustness
↓
22 E2E
```

---

# 131. PIPELINE FINAL DO PRODUTO

```text
                         PROFILE ENGINE
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
     CodeProfile      ComplexityProfile   CompetitionProfile
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ↓

KEYBOARD
   ↓
INPUT CONTROLLER
   ↓
NORMALIZER
   ↓
TOKENIZER
   ↓
PARSER
   ↓
SEMANTIC MAPPER
   ↓
VALIDATION
   ↓
CANONICAL EVENT
   ↓
EVENT STORE
   ↓
MATCH / RALLY REDUCERS
   ↓
CANONICAL MATCH STATE
   ↓
   ┌────────────────┬────────────────┬────────────────┐
   ↓                ↓                ↓                ↓
STATS            TRAINING          EXPORT             UI
```

---

# 132. REGRA DE OURO

Nenhum recurso novo pode introduzir lógica de domínio diretamente na interface.

Se uma funcionalidade não consegue responder:

```text
qual é o input?
qual módulo processa?
qual é o output?
quem consome?
```

não deve ser implementada até que seu lugar na arquitetura esteja claro.

---

# 133. PRIMEIRO COMANDO RECOMENDADO PARA O CODEX

Após colocar este arquivo na raiz do repositório, usar uma instrução semelhante a:

```text
Leia integralmente SCOUT_TRAINER_IMPLEMENTATION_PLAN.md.

Este arquivo é a especificação arquitetural principal do projeto.

Não tente implementar o projeto inteiro.

Verifique o estado atual do repositório e o arquivo IMPLEMENTATION_STATUS.md.

Implemente somente a próxima fase ainda não concluída.

Antes de alterar arquivos, informe:
1. objetivo da fase;
2. arquitetura envolvida;
3. arquivos que pretende criar ou modificar;
4. testes que serão usados como critério de aceite.

Durante a implementação:
- mantenha o domínio independente de React e IndexedDB;
- não coloque regras de negócio em componentes;
- não pule pipelines definidos no documento;
- não antecipe features de fases futuras;
- priorize código modular e testável.

Ao terminar:
- rode testes;
- rode lint;
- rode typecheck;
- rode build;
- corrija todos os erros;
- atualize IMPLEMENTATION_STATUS.md;
- informe o que foi concluído e pare.

Não avance para a fase seguinte sem nova solicitação.
```

---

# 134. SEGUNDO COMANDO, APÓS CADA FASE

```text
Leia SCOUT_TRAINER_IMPLEMENTATION_PLAN.md e IMPLEMENTATION_STATUS.md.

Revise a fase recém-concluída antes de avançar.

Procure:
- violações das camadas;
- lógica duplicada;
- domínio importando infraestrutura;
- regras de negócio dentro da UI;
- funções excessivamente grandes;
- dependências desnecessárias;
- testes ausentes;
- contratos inconsistentes;
- acoplamento entre profiles e parser.

Se encontrar problemas, corrija-os e execute novamente:
npm run test
npm run lint
npm run typecheck
npm run build

Atualize IMPLEMENTATION_STATUS.md.

Não implemente a próxima fase nesta execução.
```

---

# 135. TERCEIRO COMANDO, PARA AVANÇAR

```text
Leia SCOUT_TRAINER_IMPLEMENTATION_PLAN.md e IMPLEMENTATION_STATUS.md.

Se a fase anterior estiver concluída e validada, implemente somente a próxima fase descrita no plano.

Respeite todos os contratos, pipelines e critérios de aceite.

Ao final, execute todos os checks e atualize IMPLEMENTATION_STATUS.md.

Não avance além dessa fase.
```

---

# 136. NOTA SOBRE REFERÊNCIAS ESPORTIVAS

O sistema deve distinguir três níveis de verdade:

```text
1. Regra do voleibol
2. Regra de uma competição
3. Convenção de scout
```

Essas três coisas não são iguais.

Exemplo:

```text
uma rotação
```

é parte da lógica do jogo.

```text
uma fórmula de ranking estatístico
```

pode pertencer à competição.

```text
A#
```

é apenas uma convenção de código.

Essa separação deve permanecer explícita na arquitetura.

---

# 137. NOTA SOBRE O PERFIL CBV

O perfil CBV deste plano é uma **referência estatística versionada**, baseada nas definições publicadas para a Superliga recente.

Ele não representa:

- certificação;
- homologação;
- integração direta;
- substituição da súmula oficial;
- garantia de aceitação de arquivo pela CBV.

Se futuramente houver necessidade de uso oficial, criar uma tarefa específica para validar:

```text
regulamento vigente
software oficial exigido
formato de transmissão
protocolo
responsabilidades do apontador
regras de envio
```

antes de implementar integração.

---

# 138. RESULTADO ESPERADO

Ao final das fases principais teremos uma aplicação que:

- funciona localmente;
- recebe scout contínuo;
- usa códigos configuráveis;
- possui níveis de complexidade;
- entende rallies;
- calcula estatísticas;
- possui referência CBV versionada;
- treina o operador;
- mede precisão e velocidade;
- salva automaticamente;
- exporta arquivos leves;
- pode crescer sem reescrever o core.

O produto final deve ser entendido como:

```text
VOLLEYBALL SCOUT ENGINE
+
TRAINING PLATFORM
+
CONFIGURABLE CODE SYSTEM
```

e não como:

```text
uma única tela que interpreta códigos fixos
```

Essa distinção deve orientar todas as decisões futuras.

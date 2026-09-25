> **Versão/escopo:** Documento 1.2 / Evolução V2; correspondência de release não declarada.
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# SCOUT TRAINER

# PLANO DE EVOLUÇÃO V2

## Core automático da partida, elenco, input contínuo, captura tolerante e scout tático

**Versão:** 1.2  
**Data de referência:** 2026-08-09  
**Situação de partida:** macroetapas 1 a 8 concluídas.  
**Objetivo:** evoluir o produto existente sem refazer sua arquitetura, corrigindo primeiro o core automático da partida e a gestão de elenco/escalação, separando identidade do atleta, função tática e posição rotacional, e depois avançando para input realmente contínuo e aprofundamento tático.

---

# 1. CONTEXTO

O Scout Trainer já possui Profile Engine, parser, validação, eventos canônicos, persistência local, replay determinístico, Match Engine, UI, estatísticas, treinamento, exportações, editor de profiles, PWA, recovery e E2E.

Este documento começa uma nova evolução.

As macroetapas 1 a 8 continuam concluídas.

Novas entregas:

```text
Macro 9  Core automático da partida, elenco e escalação
Macro 10 Input contínuo
Macro 11 Captura tolerante e completude
Macro 12 Domínio tático V2
Macro 13 Automação contextual do rally
Macro 14 Entrada tática e quadra
Macro 15 Análises táticas
Macro 16 Treinamento avançado e robustez V2
```

---

# 2. PROBLEMAS QUE ESTA EVOLUÇÃO RESOLVE

## 2.1 Enter não pode ser obrigatório

Hoje:

```text
01A#
Enter
```

Novo comportamento:

```text
01A#12S+07R#04A=
```

O sistema deve segmentar os eventos automaticamente.

## 2.2 Evento válido não é igual a evento completo

No Tactical Profile:

```text
01A#
```

já identifica um ataque válido.

Se não houver direção, origem ou destino:

```text
REGISTRAR
+
AVISAR DETALHES AUSENTES
```

Nunca bloquear um ataque válido apenas porque o operador não conseguiu completar todo o scout tático.

## 2.3 O teclado deve comandar o fluxo

Campos visuais continuam úteis para edição e complementação, mas não devem transformar o scout em formulário.

---

# 3. PRINCÍPIO DE CAPTURA

```text
capturar primeiro
enriquecer quando possível
corrigir depois
não perder o contato observado
```

A velocidade do jogo tem prioridade sobre a completude ideal.

---

# 4. REFERÊNCIA FUNCIONAL

A documentação pública oficial da Data Project sobre Data Volley e Data Volley 4 destaca conceitos relevantes para esta evolução:

- entrada em tempo real pelo teclado;
- profundidade de scout configurável;
- redução de digitação por automações entre fundamentos relacionados;
- complementação posterior dos códigos;
- zonas de origem e destino;
- direções de saque e ataque;
- possibilidade de trajetória em quadra;
- setter calls;
- combinações de ataque;
- análise por jogador, fundamento, rotação, zona e direção;
- distribuição de ataque por rotação e qualidade da recepção;
- distribuição do levantador;
- análise de sideout, breakpoint e rally;
- contexto de rotação, escalação e substituição.

O Scout Trainer usa essas ideias como referência funcional, não como formato proprietário.

Não copiar ou declarar compatibilidade com arquivos, códigos internos ou formatos proprietários.

---

# 5. ARQUITETURA QUE NÃO PODE SER QUEBRADA

Pipeline atual:

```text
Keyboard
→ InputController
→ RawScoutInput
→ ProfileResolver
→ Normalizer
→ Tokenizer
→ Parser
→ SemanticMapper
→ CanonicalScoutEventCandidate
→ Validators
→ EventFactory
→ ScoutEvent
→ EventRepository
→ MatchReducer
→ StatisticsInvalidation
→ UI
```

Regras:

```text
UI não faz parsing
UI não calcula estatística
Domain não importa React
Domain não importa IndexedDB
Parser não decide regra de partida
```

---

# 6. NOVA ETAPA: FRAMING DO INPUT

O novo problema é descobrir onde termina um código e começa outro.

Adicionar antes do pipeline existente:

```text
Keyboard
→ ContinuousInputController
→ InputBuffer
→ ScoutCodeFramer
→ RawScoutInput
→ pipeline existente
```

O `ScoutCodeFramer` não interpreta voleibol.

Ele conhece apenas:

- estrutura do CodeProfile;
- estado incremental do buffer;
- fronteira entre códigos;
- possibilidade de continuação.

Não criar um segundo parser.

---

# 7. ESTADOS INCREMENTAIS

Criar contrato equivalente:

```ts
type InputCandidateState =
  'empty' | 'prefix' | 'core_complete' | 'enriching' | 'complete' | 'invalid';
```

### empty

Nenhum código em formação.

### prefix

Ainda incompleto, mas pode se tornar válido.

### core_complete

Já possui os dados mínimos necessários para gerar um evento.

### enriching

O núcleo é válido e o operador está adicionando detalhes.

### complete

O profile não reconhece continuação válida necessária.

### invalid

O buffer não pode mais representar um código válido.

---

# 8. AUTO-COMMIT

Criar:

```ts
interface AutoCommitPolicy {
  idleMs: number;
  commitOnNextEventPrefix: boolean;
  allowManualCommit: boolean;
}
```

Enter pode permanecer como atalho opcional, mas nunca como obrigação.

## Fronteira por próximo evento

Entrada:

```text
01A#12S+
```

Ao reconhecer que `12S` é início inequívoco de outro evento:

```text
1. fechar 01A#
2. registrar o ataque
3. iniciar novo buffer com 12S
```

## Fronteira por ociosidade

Para o último código de uma sequência, usar pequena janela configurável de inatividade.

Auto-commit só pode ocorrer quando o núcleo já for válido.

Nunca criar evento fantasma a partir de prefixo incompleto.

---

# 9. VALIDADE E COMPLETUDE

Criar conceito separado:

```ts
type CaptureRequirement = 'blocking' | 'recommended' | 'optional' | 'derived';
```

### blocking

Sem o campo, o evento não pode ser identificado.

### recommended

Esperado naquele nível de complexidade, mas ausência gera warning, não bloqueio.

### optional

Pode enriquecer a análise sem gerar alerta.

### derived

Deve ser inferido pelo contexto quando possível.

Criar:

```ts
interface CompletenessResult {
  status: 'complete' | 'partial';
  missingRecommendedFields: string[];
}
```

Não misturar com `ValidationResult`.

---

# 10. EXEMPLO CENTRAL DO TACTICAL PROFILE

Entrada:

```text
01A#
```

Resultado:

```text
validation = valid
event = persisted
completeness = partial
```

Warnings possíveis:

```text
zona de origem ausente
zona de destino ausente
direção ausente
```

O próximo código pode começar imediatamente.

---

# 11. COMPLEMENTAÇÃO TARDIA

Se o evento já foi registrado e o operador acrescentar detalhes depois, não mutar silenciosamente o log.

Usar o mecanismo de histórico existente.

Avaliar:

```text
CorrectionEvent
```

ou criar:

```ts
interface ScoutEnrichmentEvent {
  targetEventId: string;
  metadataPatch: TacticalMetadataPatch;
}
```

A decisão deve ser registrada em ADR.

O replay precisa reconstruir o mesmo estado final.

---

# 12. MODELO TÁTICO V2

Evitar inflar `ScoutEvent` com dezenas de campos.

Usar metadata especializada:

```ts
interface TacticalMetadata {
  trajectory?: BallTrajectory;

  serve?: ServeTacticalData;
  reception?: ReceptionTacticalData;
  set?: SetTacticalData;
  attack?: AttackTacticalData;
  block?: BlockTacticalData;

  rotation?: number;
  setterPosition?: number;
  phase?: RallyPhase;
}
```

---

# 13. TRAJETÓRIA

```ts
interface BallTrajectory {
  origin?: CourtLocation;
  target?: CourtLocation;
  direction?: string;
  captureMethod?: 'typed' | 'selected' | 'drawn' | 'derived';
}
```

```ts
interface CourtLocation {
  zoneId?: string;
  x?: number;
  y?: number;
}
```

A primeira versão pode usar zonas.

As coordenadas permitem evolução futura para trajetória desenhada.

---

# 14. SISTEMA DE ZONAS

Não hardcodar definitivamente 1 a 6 dentro do domínio.

Criar:

```ts
interface ZoneSystemProfile {
  id: string;
  zones: ZoneDefinition[];
}
```

O profile define quais zonas existem e quais aliases o teclado aceita.

---

# 15. SAQUE TÁTICO

Suportar:

```text
sacador
resultado
tipo
zona de origem
zona de destino
direção
```

```ts
interface ServeTacticalData {
  serveType?: string;
  trajectory?: BallTrajectory;
}
```

Prioridade desta evolução:

```text
origin
target
direction
```

---

# 16. DIREÇÃO DO SAQUE

Criar:

```text
DirectionResolver
```

Se origem e destino forem suficientes:

```text
direction = derived
```

Se o CodeProfile aceitar uma direção explícita sem zonas:

```text
direction = explicit
```

Não armazenar verdades conflitantes sem regra clara de precedência.

---

# 17. RECEPÇÃO TÁTICA

```ts
interface ReceptionTacticalData {
  contactLocation?: CourtLocation;
  grade?: string;
}
```

Suportar:

```text
recebedor
avaliação
zona de contato
```

O saque anterior é encontrado por:

```text
rallyId
sequence
```

Não duplicar dados desnecessariamente.

---

# 18. QUALIDADE DA RECEPÇÃO COMO CONTEXTO

Criar:

```text
ReceptionContextResolver
```

Fluxo:

```text
ReceptionEvent
→ rally timeline
→ AttackEvent
→ receptionQualityContext
```

O operador não deve redigitar a qualidade da recepção no ataque.

Classificação:

```text
derived
```

---

# 19. LEVANTAMENTO

A referência funcional inclui setter calls e distribuição do levantador.

Criar:

```ts
interface SetTacticalData {
  setterCall?: string;
  targetPlayerId?: string;
  targetLocation?: CourtLocation;
  setType?: string;
}
```

Criar dicionário configurável:

```ts
interface SetterCallDictionary {
  entries: SetterCallDefinition[];
}
```

Não hardcodar nomenclatura universal.

---

# 20. ATAQUE TÁTICO

Suportar:

```text
atacante
resultado
tipo de ataque
origem
destino
direção
combinação
tempo
número de bloqueadores
ponto de contato do bloqueio
fase
```

```ts
interface AttackTacticalData {
  attackType?: string;
  trajectory?: BallTrajectory;
  combination?: string;
  tempo?: string;
  blockersCount?: number;
  blockTouchLocation?: CourtLocation;
}
```

Criar dicionário configurável para combinações.

---

# 21. DIREÇÃO DO ATAQUE

O sistema deve permitir análises por:

```text
jogador
equipe
tipo de ataque
combinação
rotação
qualidade da recepção
fase
número de bloqueadores
```

A direção pode vir de:

```text
origem + destino
```

ou de:

```text
classificação explícita configurada no CodeProfile
```

---

# 22. BLOQUEIO

```ts
interface BlockTacticalData {
  blockersCount?: number;
  touchLocation?: CourtLocation;
}
```

Relacionar ataque e bloqueio pela sequência do rally.

---

# 23. FUNDAMENTOS RELACIONADOS

Adotar o princípio de reduzir digitação usando contexto entre:

```text
saque → recepção
recepção → levantamento → ataque
ataque → bloqueio
```

Automação pode:

```text
inferir contexto
sugerir próximo fundamento
relacionar eventos
pré-preencher dados derivados
```

Automação não pode:

```text
inventar jogador
inventar contato
inventar resultado
```

---

# 24. FASE DA JOGADA

```ts
type RallyPhase = 'sideout' | 'breakpoint' | 'transition';
```

Criar:

```text
RallyPhaseResolver
```

Derivar do estado da partida e da sequência do rally sempre que possível.

---

# 25. PROJEÇÃO TÁTICA DO RALLY

```ts
interface TacticalRallyProjection {
  rallyId: string;
  events: TacticalEventProjection[];
  phase?: RallyPhase;
  receptionQuality?: string;
  rotation?: number;
}
```

Essa projeção alimenta as análises.

---

# 26. QUICK TACTICAL EDITOR

O painel visual atual deve evoluir para editor secundário.

Funções:

```text
complementar último evento
corrigir evento selecionado
editar origem
editar destino
editar direção
adicionar combinação
adicionar setter call
```

Regra:

```text
nunca roubar o foco do scout automaticamente
```

---

# 27. QUADRA INTERATIVA

Primeira versão:

```text
clique origem
clique destino
```

Segunda versão:

```text
desenhar trajetória
```

A quadra produz `BallTrajectory`.

Não produz estatística nem altera regra de negócio.

Toda informação importante também precisa possuir caminho pelo teclado.

---

# 28. ANÁLISES TÁTICAS PRIORITÁRIAS

## Saque

```text
origem
destino
direção
resultado por direção
impacto na recepção seguinte
```

Filtros:

```text
jogador
equipe
set
rotação
```

## Recepção

```text
qualidade por zona
qualidade por rotação
qualidade por sacador
```

## Ataque

```text
origem
destino
direção
eficiência por direção
tipo
combinação
rotação
qualidade da recepção
fase
bloqueadores
```

## Levantamento

```text
distribuição por atacante
distribuição por zona
setter call
rotação
qualidade da recepção
fase
```

## Rally

```text
sideout
breakpoint
transition
win/loss
```

Toda porcentagem deve manter numerador, denominador e componentes auditáveis.

Nenhuma fórmula no React.

---

# 29. MACROCICLO 9

## CORE AUTOMÁTICO DA PARTIDA, ELENCO E ESCALAÇÃO

**Status:** concluído em 2026-08-09.

### Objetivo

Antes de acelerar a digitação, corrigir a fonte de verdade da partida.

O scout não deve depender de botões manuais de `+ ponto` para manter placar, saque e rotação durante o fluxo normal.

O sistema também deve conhecer os atletas inscritos e a escalação inicial de cada set para que um código como:

```text
08A#
```

possa ser associado diretamente ao atleta de camisa 08, validado contra o elenco e contextualizado pela posição/rotação atual.

### Princípio

```text
ScoutEvent terminal
  ↓
RallyOutcomeResolver
  ↓
RallyResultEvent
  ↓
MatchReducer
  ↓
score + servingTeam + rotation + rally
```

A UI não altera placar diretamente como fonte primária de verdade.

Botões manuais podem permanecer apenas como correção operacional controlada.

### 9.1 Elenco inscrito

O cadastro do atleta representa **identidade**, não uma função tática fixa.

Um jogador não é permanentemente `ponteiro`, `oposto`, `central` ou `levantador` no modelo canônico. Ele pode ocupar funções diferentes em partidas, sets ou formações diferentes.

Criar ou consolidar:

```ts
interface TeamRoster {
  teamId: string;
  players: RegisteredPlayer[];
}

interface RegisteredPlayer {
  id: string;
  jerseyNumber: number;
  name: string;
  active: boolean;
}
```

Não criar no atleta uma verdade estrutural como:

```ts
role: 'outside' | 'opposite' | 'setter' | 'middle';
```

Se for útil para a UI, pode existir no futuro uma preferência não canônica, por exemplo:

```ts
preferredRoles?: TacticalRole[];
```

mas ela serve apenas como sugestão de montagem e **não determina como o atleta está jogando naquele set**.

Da mesma forma, a designação de líbero para uma partida deve pertencer à inscrição/contexto da partida, e não ser tratada como essência permanente da identidade do atleta.

Requisitos:

- número da camisa único dentro da equipe no contexto da partida;
- nome recomendado para UI;
- atleta independente de função tática;
- função tática pertence à escalação do set;
- posição P1-P6 pertence ao estado rotacional;
- designações específicas da partida, como líbero, ficam no roster/contexto competitivo;
- limites de quantidade de atletas pertencem ao CompetitionProfile, não ao domínio genérico;
- manter suporte a partidas de treino com elenco simplificado.

### 9.1.1 Três conceitos que nunca devem ser fundidos

```text
ATLETA
≠
FUNÇÃO TÁTICA NA ESCALAÇÃO
≠
POSIÇÃO ROTACIONAL P1-P6
```

Exemplo:

```text
Jogador 14
↓
ocupa o slot tático OPOSTO neste set
↓
no momento está em P4
```

Depois de uma rotação:

```text
Jogador 14
↓
continua ocupando o slot tático OPOSTO
↓
agora está em P3
```

A rotação muda a posição de quadra do slot. Ela não muda automaticamente a função tática daquele slot.

### 9.2 Resolução rápida por número

O CodeProfile pode continuar aceitando:

```text
08A#
```

O número `08` deve resolver para:

```text
playerId
```

através do roster da equipe ativa.

O parser não conhece nomes de atletas.

Criar serviço equivalente a:

```text
RosterPlayerResolver
```

### 9.3 Escalação inicial por set

Antes de iniciar cada set, permitir configurar:

```text
P1
P2
P3
P4
P5
P6
banco
designação de líbero(s), quando aplicável
```

A escalação precisa guardar **slots táticos** separados dos atletas que os ocupam.

Criar estruturas equivalentes a:

```ts
type CourtRotationPosition = 1 | 2 | 3 | 4 | 5 | 6;

type TacticalRole =
  'setter' | 'opposite' | 'outside_1' | 'outside_2' | 'middle_1' | 'middle_2' | 'custom';

interface LineupSlot {
  slotId: string;
  tacticalRole: TacticalRole;
  playerId: string;
}

interface SetLineup {
  setNumber: number;
  teamId: string;

  // Define qual slot ocupa cada posição naquele instante inicial.
  positions: Record<CourtRotationPosition, string>; // slotId

  slots: Record<string, LineupSlot>;
}
```

A função pertence ao `LineupSlot`. O jogador apenas ocupa aquele slot naquele momento.

Exemplo de uma formação:

```text
P1 → slot SETTER     → jogador 03
P2 → slot OUTSIDE_1  → jogador 08
P3 → slot MIDDLE_1   → jogador 11
P4 → slot OPPOSITE   → jogador 14
P5 → slot OUTSIDE_2  → jogador 15
P6 → slot MIDDLE_2   → jogador 04
```

Neste exemplo, o jogador 14 está atuando como oposto **porque ocupa o slot OPPOSITE**, não porque seu cadastro diz que ele é oposto.

Se outro atleta entrar nesse mesmo slot:

```text
14 sai
07 entra
```

o jogador 07 passa a atuar como oposto naquele contexto.

### 9.3.1 Rotação move slots, não papéis entre jogadores

Ao rodar:

```text
P2 → P1
P1 → P6
P6 → P5
P5 → P4
P4 → P3
P3 → P2
```

os `slotId` mudam de posição.

O `tacticalRole` de cada slot permanece o mesmo.

Exemplo:

```text
antes:
P4 → OPPOSITE → jogador 14

depois da rotação:
P3 → OPPOSITE → jogador 14
```

Isso permite analisar separadamente:

```text
jogador 14
oposto naquele set
oposto em P3
atleta 14 quando atuou de ponteiro em outro set
```

### 9.3.2 Formação não deve ser inferida apenas da camisa

O número da camisa resolve identidade.

A função tática é resolvida pelo estado da escalação:

```text
jerseyNumber
→ playerId
→ occupied slot
→ tacticalRole
→ current P1-P6
```

Nunca:

```text
jerseyNumber
→ permanent role
```

### 9.4 Equipe que inicia sacando

Ao iniciar o set, registrar explicitamente:

```text
servingTeamId
```

O sistema precisa saber quem começa sacando para que as próximas rotações sejam determinísticas.

### 9.5 Placar automático

Criar:

```text
RallyOutcomeResolver
```

Ele recebe a sequência canônica do rally e identifica quando existe um resultado terminal confiável.

Exemplos de eventos terminais:

```text
ace
serve error
attack point
attack error
block point
outro resultado terminal já representado canonicamente pelo profile
```

Quando o vencedor do rally estiver definido:

```text
winner score += 1
```

Não alterar placar em contatos não terminais.

### 9.6 Evento explícito de resultado do rally

Não deixar o placar depender apenas de estado transitório da interface.

Criar ou consolidar evento de domínio equivalente a:

```ts
interface RallyResultEvent {
  rallyId: string;
  winnerTeamId: string;
  previousServingTeamId: string;
  reason?: string;
}
```

O replay precisa reconstruir exatamente o mesmo placar e a mesma rotação.

### 9.7 Saque e rotação automáticos

Regra padrão do voleibol indoor:

```text
se a equipe sacadora vence o rally:
  marca 1 ponto
  continua sacando
  não roda

se a equipe receptora vence o rally:
  marca 1 ponto
  passa a sacar
  roda uma posição no sentido horário
```

Transformação da rotação:

```text
P2 → P1
P1 → P6
P6 → P5
P5 → P4
P4 → P3
P3 → P2
```

Implementar em serviço de domínio:

```text
RotationEngine
```

Nunca dentro do React.

### 9.8 Sacador atual

Com lineup e rotação conhecidos:

```text
slot em P1
→ playerId ocupante do slot
→ current server
```

A UI deve mostrar:

```text
Equipe sacando
Número e nome do sacador
Rotação atual
Função tática ocupada pelo atleta naquele set, quando útil
```

A função exibida deve vir do `LineupSlot`, nunca do cadastro permanente do atleta.

### 9.9 Novo rally

Após `RallyResultEvent`:

```text
1. atualizar placar
2. decidir manutenção/troca do saque
3. rotacionar apenas se necessário
4. fechar rally atual
5. criar próximo rally
6. preservar sequência determinística
```

### 9.10 Fim automático do set

Adicionar regra configurável por MatchRulesProfile/CompetitionProfile.

Default indoor de referência:

```text
sets 1-4: alvo 25
set 5: alvo 15
vantagem mínima: 2
melhor de 5
```

Não hardcodar a regra como universal.

Criar estrutura equivalente a:

```ts
interface SetScoringRules {
  regularSetTarget: number;
  decidingSetTarget: number;
  minimumLead: number;
  setsToWin: number;
}
```

Quando o set terminar:

```text
SetFinishedEvent
```

O próximo set exige nova confirmação/escalação inicial antes de começar.

### 9.11 Substituições

Preparar o domínio agora, mesmo que a UX avançada venha depois.

A substituição deve atuar sobre um **slot da escalação**, e não transformar o atleta que entra em uma função permanente.

Criar evento explícito equivalente a:

```ts
interface SubstitutionEvent {
  teamId: string;
  setNumber: number;
  slotId: string;
  playerOutId: string;
  playerInId: string;
  rotationPositionAtSubstitution: CourtRotationPosition;
}
```

Fluxo:

```text
slot OPPOSITE
ocupante atual = jogador 14
posição atual = P4

substituição
14 sai
07 entra

slot OPPOSITE
ocupante atual = jogador 07
posição atual = P4
```

Depois da próxima rotação, o mesmo slot pode estar em P3 e o jogador 07 continua contextualizado como ocupante do slot `OPPOSITE`.

A substituição altera o `playerId` ocupante do slot. Ela não reinicia a ordem de rotação e não altera o `tacticalRole` do slot.

Se for necessário realizar uma mudança tática em que o atleta passe a ocupar outro papel estrutural, isso deve ser representado por uma alteração explícita de formação/lineup, e não inferido silenciosamente de uma substituição simples.

Limites e regras específicas de substituição pertencem ao CompetitionProfile.

### 9.12 Líbero

Nesta macro:

```text
cadastrar o atleta normalmente
designá-lo como líbero no contexto da partida, quando aplicável
permitir representação na lineup/estado efetivo
```

Não gravar `libero` como identidade esportiva permanente do jogador.

A designação pertence ao roster/CompetitionContext da partida.

Não automatizar todas as regras de troca de líbero sem contrato e testes específicos.

A automação completa de líbero pode ser uma evolução interna posterior do Match Engine.

### 9.13 Validação de atleta em quadra

Com lineup conhecida, o sistema pode classificar:

```text
atleta inscrito e ocupando um slot em quadra → valid
atleta inscrito mas no banco → warning/error conforme profile
número inexistente → error
designação de líbero em ação incompatível → CompetitionValidator, quando aplicável
```

O contexto do evento deve conseguir resolver:

```text
playerId
slotId
tacticalRole naquele instante
rotationPosition naquele instante
```

Não colocar essa decisão no parser.

### 9.14 UI de Nova Partida

Evoluir a criação de partida para fluxo simples:

```text
1. nome/equipe A
2. cadastrar/importar atletas A
3. nome/equipe B
4. cadastrar/importar atletas B
5. montar os seis slots táticos de cada equipe
6. posicionar esses slots em P1-P6 para o início do set
7. escolher quem começa sacando
8. iniciar set
```

Exemplo visual desejado:

```text
P1  [ SETTER    ] → 03
P2  [ OUTSIDE 1 ] → 08
P3  [ MIDDLE 1  ] → 11
P4  [ OPPOSITE  ] → 14
P5  [ OUTSIDE 2 ] → 15
P6  [ MIDDLE 2  ] → 04
```

A UI deve permitir trocar o atleta de um slot sem redefinir a função do atleta globalmente.

Facilidades desejáveis:

```text
colar lista de atletas
adicionar jogador rapidamente
reutilizar elenco salvo
ordenar por número
arrastar atleta para slot
trocar ocupante do slot
reutilizar formação do set anterior
```

Não transformar a criação da partida em formulário pesado.

### 9.15 UI durante o scout

Mostrar de forma compacta:

```text
placar
set
quem saca
sacador
rotação A
rotação B
seis atletas em quadra de cada lado
```

O teclado continua sendo a área principal.

### 9.16 Correção manual

Manter ações de correção para situações em que:

```text
o operador perdeu o rally
registrou o vencedor errado
precisa ajustar placar/rotação
```

A correção deve gerar evento auditável.

Proibido:

```text
setScore(newScore)
```

como alteração silenciosa e irreproduzível.

### Testes obrigatórios

```text
Equipe A saca e vence      → A +1, A continua sacando, sem rotação
Equipe A saca e perde      → B +1, B passa a sacar, B rotaciona
B vence novamente sacando  → B +1, sem nova rotação
reload/replay              → mesmo placar, saque e rotações
undo do rally terminal     → estado anterior reconstruído
correction                 → novo estado correto e auditável
jogador 08 cadastrado      → 08A# resolve playerId correto
jogador inexistente        → erro sem evento fantasma
substituição               → ocupante do slot muda sem corromper função nem ordem
jogador 14 no slot OPPOSITE  → contexto registra jogador + função do slot + P atual
mesmo jogador em outro set   → pode ocupar outro slot sem alterar sua identidade
fim 25-23                  → set encerrado
24-24                      → set continua
set decisivo 15 com +2     → encerra segundo regras configuradas
```

### Aceite

O usuário consegue iniciar uma partida com atletas cadastrados, montar slots táticos, posicionar os slots em P1-P6 e definir a equipe sacadora. A partir daí, o fluxo normal de scout atualiza automaticamente:

```text
placar
sacador
servingTeam
rotação
rally
set
```

sem clicar em `+ ponto` a cada rally.

### Não implementar ainda

```text
input contínuo sem Enter
novo metadata tático
quadra tática
novas métricas táticas
```

---

# 30. MACROCICLO 10

## INPUT CONTÍNUO

**Status:** concluído em 2026-08-09.

### Objetivo

Eliminar a obrigatoriedade de Enter sem duplicar parser.

### Implementar

```text
ContinuousInputController
InputBuffer
ScoutCodeFramer
AutoCommitPolicy
incremental candidate status
next-event-prefix detection
idle commit
```

### Testes obrigatórios

```text
01A#              → 1 evento sem Enter
01A#12S+07R#      → 3 eventos sem Enter
01A               → 0 eventos
backspace         → corrige buffer
entrada inválida  → 0 eventos
input rápido      → nenhuma perda
input lento       → nenhum evento duplicado
```

### Aceite

É possível registrar um rally sem usar Enter.

### Não implementar ainda

```text
novo metadata tático
quadra
novas métricas
completude
```

---

# 31. MACROCICLO 11

## CAPTURA TOLERANTE E COMPLETUDE

**Status:** concluído em 2026-08-09.

### Objetivo

Permitir evento válido e parcialmente preenchido.

### Implementar

```text
CaptureRequirement
CompletenessEvaluator
CompletenessResult
partial feedback
late enrichment
```

### Cenário principal

```text
01A#
```

no Tactical:

```text
registrado
warning de origem
warning de destino
warning de direção
```

### Aceite

Campo `recommended` nunca bloqueia evento válido.

Registrar ADR sobre enriquecimento tardio.

---

# 32. MACROCICLO 12

## DOMÍNIO TÁTICO V2

### Implementar

```text
CourtLocation
BallTrajectory
ZoneSystemProfile
DirectionResolver
ServeTacticalData
ReceptionTacticalData
SetTacticalData
AttackTacticalData
BlockTacticalData
SetterCallDictionary
AttackCombinationDictionary
```

### Persistência

Criar migration versionada.

### Compatibilidade

Partidas antigas continuam abrindo.

### Exportação

JSON master preserva novos metadados.

### Aceite

V1 e V2 funcionam no mesmo aplicativo.

---

# 33. MACROCICLO 13

## AUTOMAÇÃO CONTEXTUAL DO RALLY

### Implementar

```text
RallyContextResolver
ReceptionContextResolver
RallyPhaseResolver
ExpectedNextAction
TacticalRallyProjection
```

### Derivar

```text
qualidade da recepção para o ataque
sideout
breakpoint
transition
serving team
rotation
```

### Regra

Não inventar eventos.

### Aceite

Replay e estado ao vivo produzem exatamente os mesmos contextos.

---

# 34. MACROCICLO 14

## ENTRADA TÁTICA E QUADRA

### Parte A

Extensão configurável do CodeProfile para:

```text
origin
target
direction
skill type
setter call
combination
tempo
blockers
```

### Parte B

Quick Tactical Editor.

### Parte C

Quadra com seleção de origem e destino.

### Parte D

Trajetória desenhada em evolução posterior dentro do mesmo macrociclo, somente após seleção por zonas estar estável.

### Parte E

Atalhos configuráveis de teclado.

### Aceite

É possível realizar Tactical scout completo apenas pelo teclado.

A quadra funciona como alternativa e complementação.

---

# 35. MACROCICLO 15

## ANÁLISES TÁTICAS

### Implementar no Statistics Engine

```text
serve origin distribution
serve target distribution
serve direction distribution
serve impact on reception

reception quality by zone
reception quality by rotation

attack origin distribution
attack target distribution
attack direction distribution
attack efficiency by direction
attack efficiency by type
attack efficiency by combination
attack by rotation
attack by reception quality
attack by phase
attack by blockers

setter distribution by attacker
setter distribution by zone
setter distribution by call
setter distribution by rotation
setter distribution by reception quality

sideout
breakpoint
transition
```

### Visualizações

Somente depois das métricas:

```text
matriz de zonas
mapa de direção
tabela de distribuição
filtros
```

### Aceite

Métricas testadas e auditáveis antes de UI.

---

# 36. MACROCICLO 16

## TREINAMENTO AVANÇADO E ROBUSTEZ V2

### Métricas do operador

Separar:

```text
accuracy
speed
completeness
correction rate
tactical detail rate
```

Exemplo:

```text
Eventos corretos: 94%
Eventos/min: 31
Completude tática: 78%
Correções: 6
```

### Exercícios

```text
saque origem/destino
direção do saque
recepção
direção do ataque
setter call
combinação
rotação
rally completo
```

### E2E

```text
continuous typing
idle commit
partial capture
late enrichment
undo
redo
reload
migration
JSON export/import
tactical metrics
```

### Carga

Testar pelo menos uma partida com:

```text
5.000 eventos
```

### Aceite

Nenhuma regressão das macros 1 a 8.

---

# 37. ORDEM OBRIGATÓRIA

```text
9
↓
10
↓
11
↓
12
↓
13
↓
14
↓
15
↓
16
```

Não começar pela quadra.

Não começar pelos gráficos.

Não começar pelas combinações.

Primeiro resolver a fonte de verdade da partida:

```text
PLACAR + SAQUE + ROTAÇÃO + ELENCO + ESCALAÇÃO
```

Depois acelerar a experiência central de captura:

```text
DIGITAÇÃO CONTÍNUA
```

---

# 38. HOT PATH DO TECLADO

A cada tecla:

```text
keypress
→ buffer
→ framing status
→ feedback mínimo
```

Somente no commit:

```text
RawScoutInput
→ pipeline canônico
→ persistência
→ reducers
→ statistics invalidation
```

Não recalcular toda a partida a cada caractere.

---

# 39. PERFORMANCE

Medir localmente:

```text
keypress → buffer update
commit → persistência
commit → histórico visível
```

Sem telemetria externa.

---

# 40. CORREÇÃO RÁPIDA

Criar atalho configurável para editar o último evento.

Fluxo:

```text
atalho
→ último evento
→ alteração
→ CorrectionEvent
→ foco retorna ao scout
```

---

# 41. CENÁRIO E2E PRINCIPAL

Simular:

```text
saque
recepção
levantamento
ataque
defesa
levantamento
ataque
bloqueio
```

Verificar:

```text
nenhum Enter obrigatório
nenhum clique obrigatório
ordem correta
rally correto
placar correto
contexto correto
replay correto
```

---

# 42. MIGRAÇÃO

Nova metadata exige:

```text
schema v1
→ migration
→ schema v2
```

Não alterar silenciosamente registros antigos sem estratégia versionada.

---

# 43. EXPORTAÇÃO

JSON master deve preservar:

```text
event schema version
profile snapshot
tactical metadata
correções
enriquecimentos
```

CSV continua sendo projeção tabular.

---

# 44. PROFILE EDITOR

Somente após contratos estáveis, permitir editar:

```text
requirement level
zone aliases
direction aliases
setter calls
attack combinations
skill types
```

---

# 45. ADRs RECOMENDADOS

```text
ADR-005-continuous-input-framing.md
ADR-006-validity-vs-completeness.md
ADR-007-tactical-metadata-v2.md
ADR-008-late-event-enrichment.md
ADR-009-derived-rally-context.md
ADR-010-rally-result-score-rotation.md
ADR-011-player-lineup-slot-model.md
```

---

# 46. DEFINITION OF DONE

Uma macro só termina quando:

```text
[ ] escopo implementado
[ ] testes unitários passam
[ ] integração passa
[ ] lint passa
[ ] typecheck passa
[ ] build passa
[ ] E2E relevante passa
[ ] migration test passa quando aplicável
[ ] IMPLEMENTATION_STATUS.md atualizado
[ ] ROADMAP.md atualizado
[ ] PIPELINES.md atualizado quando necessário
[ ] ADR criado quando necessário
[ ] nenhuma regra duplicada na UI
[ ] nenhuma regressão das macros 1 a 8
```

---

# 47. ATUALIZAÇÃO DO ROADMAP

Adicionar:

| Macro | Nome                                | Entrega                                                                          |
| ----: | ----------------------------------- | -------------------------------------------------------------------------------- |
|     9 | Core da partida, elenco e escalação | Placar, saque, rotação, roster, slots táticos, P1-P6 e substituições contextuais |
|    10 | Input contínuo                      | Framing, buffer e auto-commit sem Enter                                          |
|    11 | Captura tolerante                   | Validade separada de completude                                                  |
|    12 | Domínio tático V2                   | Trajetórias, zonas e metadata especializada                                      |
|    13 | Automação contextual                | Contexto derivado de rally                                                       |
|    14 | Entrada tática                      | Teclado, editor rápido e quadra                                                  |
|    15 | Análises táticas                    | Direções, zonas e distribuições                                                  |
|    16 | Treinamento e robustez V2           | Métricas do operador e E2E                                                       |

---

# 48. ATUALIZAÇÃO DAS PIPELINES

Após Macro 9:

```text
ScoutEvent terminal
→ RallyOutcomeResolver
→ RallyResultEvent
→ MatchReducer
→ score / servingTeam / RotationEngine
→ next rally
```

Roster/lineup:

```text
TeamRoster
→ RosterPlayerResolver
→ playerId

SetLineup
→ current slot by playerId
→ TacticalRole + P1-P6
→ MatchContext
→ validators / scout UI / statistics
```

Após Macro 10:

```text
Keyboard
→ ContinuousInputController
→ InputBuffer
→ ScoutCodeFramer
→ RawScoutInput
→ ProfileResolver
→ Normalizer
→ Tokenizer
→ Parser
→ ...
```

Após Macro 11:

```text
CanonicalScoutEventCandidate
→ Validation
→ Completeness
→ EventFactory
```

`Completeness` não bloqueia campos recomendados.

Após Macro 13:

```text
ScoutEvent[]
→ TacticalRallyProjection
→ ContextResolvers
→ StatisticsEngine
```

---

# 49. PROTOCOLO PARA CODEX

Antes de cada macro:

1. Ler `PROJECT_CONTEXT.md`.
2. Ler `ROADMAP.md`.
3. Ler `PIPELINES.md`.
4. Ler `IMPLEMENTATION_STATUS.md`.
5. Ler este plano.
6. Inspecionar os consumidores dos contratos que serão alterados.
7. Informar arquivos que serão modificados.
8. Informar testes de aceite.
9. Implementar somente a macro solicitada.
10. Rodar todos os checks e parar.

---

# 50. PRIMEIRO COMANDO RECOMENDADO PARA O CODEX

```text
Leia integralmente:

PROJECT_CONTEXT.md
ROADMAP.md
PIPELINES.md
IMPLEMENTATION_STATUS.md
SCOUT_TRAINER_EVOLUTION_V2_2.md

As macroetapas 1 a 8 estão concluídas.

Implemente SOMENTE o MACROCICLO 9 - CORE AUTOMÁTICO DA PARTIDA, ELENCO E ESCALAÇÃO.

Antes de alterar arquivos:

1. inspecione a implementação atual de MatchEngine, MatchReducer, RallyReducer e placar;
2. identifique por que o scout atual não atualiza automaticamente placar e rotação;
3. inspecione como playerId e jerseyNumber são representados hoje;
4. identifique todos os consumidores de score, servingTeam, rotation e lineup;
5. informe quais arquivos serão alterados;
6. apresente os testes de aceite antes de implementar.

Requisitos obrigatórios:

- cada rally vencido deve gerar um ponto automaticamente;
- a equipe sacadora que vence continua sacando e não gira;
- a equipe receptora que vence passa a sacar e gira uma posição;
- rotação deve ser reproduzível por replay;
- criar cadastro de atletas por equipe sem função tática permanente no Player;
- modelar função tática como propriedade do LineupSlot, não do atleta;
- permitir montar slots como setter, opposite, outside_1, outside_2, middle_1 e middle_2;
- permitir posicionar os slots em P1-P6 no início do set;
- a rotação deve mover slots entre P1-P6 mantendo o tacticalRole do slot;
- substituição simples deve trocar o playerId ocupante do slot, preservando seu tacticalRole;
- o mesmo atleta deve poder ocupar funções diferentes em sets/formações diferentes;
- o número digitado no scout deve resolver para o playerId cadastrado e, depois, para slot/função/P atual;
- mostrar sacador e rotação atuais;
- placar manual deve ser apenas correção auditável, não fluxo normal;
- fim de set deve obedecer regra configurável;
- preparar substituições como eventos explícitos;
- não automatizar regras completas de libero nesta macro;
- não implemente ainda input contínuo;
- não antecipe o Macrociclo 10;
- preserve compatibilidade com partidas existentes;
- preserve event sourcing e replay determinístico.

Ao finalizar:

npm run test
npm run lint
npm run typecheck
npm run build

Rode E2E se o projeto já possuir comando configurado.

Corrija todas as falhas.
Atualize IMPLEMENTATION_STATUS.md.
Atualize ROADMAP.md.
Atualize PIPELINES.md com o fluxo de RallyResult/Rotation se necessário.
Crie ADR para a fonte de verdade do resultado do rally se a decisão ainda não estiver documentada.
Pare ao concluir o Macrociclo 9.
```

# 51. REVISÃO APÓS O MACROCICLO 9

```text
Revise o Macrociclo 9 antes de avançar.

Verifique especialmente:

- se score ainda pode divergir do replay;
- se servingTeam é derivado/atualizado de maneira determinística;
- se a equipe receptora gira somente quando conquista o saque;
- se a equipe sacadora não gira quando vence o rally;
- se a transformação P2→P1, P1→P6, P6→P5, P5→P4, P4→P3, P3→P2 está correta;
- se o sacador atual corresponde ao atleta que ocupa o slot atualmente em P1;
- se jerseyNumber resolve para playerId sem acoplar roster ao parser;
- se Player não possui função tática canônica permanente;
- se TacticalRole pertence ao LineupSlot;
- se rotação move slots entre P1-P6 sem trocar seus papéis táticos;
- se substituição troca o ocupante do slot sem transformar a identidade do atleta;
- se o mesmo atleta pode atuar em papéis diferentes em formações/sets diferentes;
- se atletas do banco/ausentes são validados na camada correta;
- se correções são auditáveis;
- se undo/redo/reload preservam placar e rotação;
- se partidas antigas continuam abrindo;
- se alguma regra de competição foi hardcodada no domínio genérico.

Corrija os problemas encontrados.
Execute todos os checks.
Não implemente o Macrociclo 10 nesta execução.
```

Depois da validação do Macrociclo 9, o próximo passo passa a ser:

```text
MACROCICLO 10 - INPUT CONTÍNUO
```

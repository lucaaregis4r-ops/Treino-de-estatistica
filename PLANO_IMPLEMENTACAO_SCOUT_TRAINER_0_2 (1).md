# Plano de Implementação — Scout Trainer 0.2

Repositório-alvo: `lucaaregis4r-ops/Treino-de-estatistica`

## 1. Objetivo da versão

A versão 0.2 deve transformar o Scout Trainer em um ambiente de registro de partida capaz de:

- registrar ações continuamente pelo teclado;
- reconstruir automaticamente o estado da partida;
- controlar placar, saque, rally, set, rotação e escalação;
- manter histórico corrigível e reprocessável;
- calcular estatísticas por equipe e por atleta;
- produzir análise tática por rotação;
- gerar relatório PDF pós-jogo;
- manter JSON como fonte de exportação completa e auditável.

A versão 0.2 NÃO deve reescrever a aplicação do zero.

A implementação deve preservar e reaproveitar os módulos existentes de:

- `src/domain/match`
- `src/domain/scout`
- `src/domain/statistics`
- `src/application`
- `src/infrastructure`
- `src/ui`

---

# 2. Regra de execução para o Codex

Antes de qualquer alteração:

1. auditar o projeto;
2. mapear dependências;
3. documentar o fluxo atual;
4. identificar código reutilizável;
5. listar riscos;
6. somente depois iniciar implementação.

Não implementar todas as macroetapas em uma única alteração.

Cada macroetapa deve resultar em:

- código compilando;
- testes passando;
- nenhuma regressão conhecida;
- documentação curta da alteração;
- commit lógico independente quando possível.

---

# 3. Arquitetura canônica

A pipeline principal deve ser:

```text
Raw Input
    ↓
Tokenizer / Parser
    ↓
ScoutEvent
    ↓
Rally Resolver
    ↓
Match Event
    ↓
Match Reducer
    ↓
Match State
    ↓
Statistics Engine
    ↓
Match Analytics
    ↓
Report Model
    ↓
UI / PDF / CSV / JSON
```

## Fonte da verdade

A fonte da verdade deve ser o histórico de eventos.

```text
Events
   ↓
Replay
   ↓
MatchReducer
   ↓
MatchState
```

O estado atual nunca deve ser tratado como informação independente dos eventos que o produziram.

---

# 4. Regras canônicas

## 4.1 UI não decide regra de voleibol

Componentes React devem:

- renderizar estado;
- capturar intenção do usuário;
- disparar comandos.

Componentes React NÃO devem:

- decidir quem ganhou rally;
- determinar rotação;
- atualizar placar diretamente;
- decidir troca de saque;
- calcular estatísticas;
- implementar regras de set ou partida.

---

## 4.2 ScoutScreen deve ser progressivamente desmontado

O atual `ScoutScreen.tsx` deve ser refatorado em componentes menores.

Estrutura proposta:

```text
MatchWorkspaceScreen
│
├── ScoreHeader
├── MatchContextBar
├── CourtLineup
├── ScoutInput
├── InputFeedback
├── EventTimeline
├── TacticalQuickEditor
├── EventEditor
└── MatchActions
```

A lógica operacional deve migrar para application/domain.

---

## 4.3 Captura primeiro, enriquecimento depois

O operador deve conseguir registrar rapidamente:

```text
jogador
ação
avaliação
```

e somente quando necessário acrescentar:

```text
origem
destino
direção
tipo
tempo
combinação
bloqueadores
fase
```

O scout nunca pode depender da utilização do mouse para continuar o jogo.

---

# 5. Macroetapa 1 — Auditoria + estabilização do fluxo atual

## Objetivo

Entender completamente o que já existe antes de modificar o funcionamento da partida.

## Auditar

### Match

- criação da partida;
- `MatchState`;
- `MatchEvent`;
- reducers;
- score;
- set;
- rally;
- lineup;
- roster;
- rotação;
- servingTeam;
- substituições;
- regras.

### Scout

- `ContinuousInputController`;
- tokenizer;
- parser;
- normalizer;
- mapper;
- validators;
- `EventFactory`;
- `ScoutEventHistory`;
- undo;
- redo;
- correção.

### Statistics

- `StatisticsEngine`;
- métricas básicas;
- métricas CBV;
- métricas táticas;
- queries.

### UI

- `ScoutScreen`;
- `TacticalCourt`;
- `SummaryScreen`;
- setup da partida.

### Exportação

- JSON;
- CSV;
- TXT;
- bundle;
- persistência local.

## Entregável

Criar:

```text
docs/audit-v0.2.md
```

contendo:

- mapa do fluxo atual;
- responsabilidades por módulo;
- pontos de acoplamento;
- código duplicado;
- responsabilidades incorretas na UI;
- riscos;
- proposta de migração incremental.

## Critério de aceite

Nenhuma mudança funcional importante nesta etapa.

---

# 6. Macroetapa 2 — Motor de partida derivado de eventos

## Objetivo

Fazer o programa reconstruir automaticamente a partida a partir do scout.

## Criar ou consolidar

```text
RallyOutcomeResolver
MatchEventFactory
MatchReducer
MatchReplayService
```

## Fluxo desejado

```text
ScoutEvent
    ↓
RallyOutcomeResolver
    ↓
RallyResult
    ↓
MatchEvent
    ↓
MatchReducer
```

## MatchReducer deve controlar

- placar;
- equipe sacando;
- rally atual;
- fim de rally;
- fim de set;
- início do próximo set;
- sets vencidos;
- fim da partida;
- rotação;
- lineup ativo.

---

## Exemplo

Entrada:

```text
*07S+
a12R#
*04A#
```

O sistema deve inferir:

```text
saque
↓
recepção
↓
ataque ponto
↓
fim do rally
↓
+1 para equipe atacante
↓
definir próximo sacador
↓
abrir novo rally
```

---

## Controles manuais

Manter ações como:

- corrigir +1;
- corrigir saque;
- corrigir rotação;
- corrigir set.

Mas tratá-las como:

```text
CorrectionEvent
```

Nunca alterar estado diretamente.

---

## Undo / Redo

Implementar semanticamente:

```text
eventos válidos
↓
replay
↓
estado
```

Undo não deve fazer:

```text
score--
```

Undo deve invalidar/desfazer o último evento aplicável e reconstruir o estado.

---

## Critérios de aceite

- replay produz sempre o mesmo estado;
- undo + redo retorna exatamente ao estado anterior;
- placar não depende da UI;
- servingTeam é derivado;
- rally é derivado;
- testes unitários cobrem rally e score.

---

# 7. Macroetapa 3 — Lineup, rotação e substituições

## Objetivo

Fazer a partida ter contexto posicional real.

## Modelo canônico

Separar:

```text
Player
Role
RotationPosition
LineupSlot
```

Nunca assumir:

```text
posição do atleta = função do atleta
```

---

## Exemplo

```text
LineupSlot:
  tacticalRole: outside_1
  rotationPosition: P4
  playerId: player-07
```

Na rotação:

```text
outside_1
P4 → P3
```

O atleta continua sendo o mesmo slot tático.

---

## Controlar

- P1;
- P2;
- P3;
- P4;
- P5;
- P6;
- sacador;
- levantador;
- libero;
- reservas;
- substituições.

---

## Substituição

Criar comando ou ação:

```text
SUB 07 14
```

Gerando:

```text
SubstitutionEvent
```

Campos mínimos:

```text
teamId
playerOutId
playerInId
setNumber
score
rotation
timestamp
```

---

## Histórico

Toda substituição deve ser auditável.

O PDF deve conseguir dizer:

```text
Set 2 — 14x12
#14 Pedro entrou no lugar de #07 João
```

---

## Critérios de aceite

- rotação acontece corretamente após mudança de saque;
- atleta permanece associado ao slot tático adequado;
- substituição atualiza lineup;
- eventos posteriores usam o jogador correto;
- replay reconstrói substituições.

---



# 7.1 Detecção automática da inversão do 5x1

A inversão do 5x1 NÃO deve existir como botão, comando especial ou ação manual.

O operador registra apenas substituições normais.

Exemplo:

```text
SUB 03 18
SUB 11 14
```

ou pela interface equivalente de substituição.

A partir dessas trocas, o sistema deve analisar o lineup e identificar automaticamente se ocorreu uma mudança tática compatível com uma inversão do 5x1.

---

## Fonte da verdade

A fonte da verdade continua sendo:

```text
SubstitutionEvent
```

Nunca criar um evento manual obrigatório do tipo:

```text
FiveOneInversionEvent
```

A classificação "inversão do 5x1" deve ser uma informação DERIVADA.

---

## Pipeline

```text
SubstitutionEvent
    ↓
MatchReducer
    ↓
LineupState atualizado
    ↓
ActiveSetterResolver
    ↓
TacticalPatternDetector
    ↓
DerivedTacticalState
```

---

## ActiveSetterResolver

Após qualquer substituição, determinar novamente quem exerce a função de levantador.

Considerar:

```text
playerId
registeredRole
activeRole
lineupSlot
rotationPosition
```

O sistema nunca deve assumir que o levantador titular continua sendo o levantador ativo.

---

## TacticalPatternDetector

Criar serviço de domínio, por exemplo:

```text
TacticalPatternDetector
```

Responsável por reconhecer padrões táticos derivados do histórico recente de substituições e do lineup resultante.

Inicialmente reconhecer:

```text
five_one_inversion
```

Mas a arquitetura deve permitir outros padrões futuramente sem alterar o motor de partida.

---

## Detecção da inversão

O detector deve analisar substituições ocorridas na mesma interrupção de jogo ou em uma pequena janela lógica de substituição.

Exemplo de padrão:

```text
levantador titular sai
↓
jogador de função ofensiva entra

+

oposto sai
↓
segundo levantador entra
```

Após as duas trocas:

```text
segundo levantador = activeSetter
```

e o sistema pode derivar:

```text
tacticalState: five_one_inversion
```

---

## Importante

Não depender apenas do nome cadastrado da posição.

A detecção deve observar:

```text
quem saiu
quem entrou
função cadastrada
função ativa
slots afetados
levantador ativo antes
levantador ativo depois
```

Isso evita classificar incorretamente uma substituição simples como inversão.

---

## Exemplo

Antes:

```text
#03 Lucas
role: setter
activeSetter: true

#11 Pedro
role: opposite
```

Troca 1:

```text
#03 OUT
#18 IN
```

Troca 2:

```text
#11 OUT
#14 IN
```

Cadastro:

```text
#14 role: setter
#18 role: opposite
```

Resultado do lineup:

```text
activeSetter = #14
```

Detector:

```text
setter_before = #03
setter_after = #14

setter_out = true
opposite_out = true
setter_in = true
offensive_player_in = true
```

Resultado derivado:

```text
tacticalState = five_one_inversion
```

O operador não informa nada além das duas substituições.

---

## Substituições relacionadas

As substituições continuam sendo eventos independentes.

O sistema pode criar internamente uma associação derivada:

```text
DerivedSubstitutionGroup
```

Exemplo:

```text
groupId: derived-group-023
pattern: five_one_inversion
events:
  - substitution-event-102
  - substitution-event-103
```

Esse agrupamento NÃO deve substituir os eventos originais.

Serve apenas para:

- interpretação;
- analytics;
- histórico;
- PDF;
- UI.

---

## Janela lógica

O detector deve reconhecer substituições realizadas:

- antes do início do próximo rally;
- com o mesmo score;
- no mesmo set;
- pela mesma equipe.

Assim:

```text
Set 2
18 x 17
SUB A
SUB B
novo rally
```

pode ser interpretado como uma mesma operação tática.

Depois que o rally começa, a janela de agrupamento é encerrada.

---

## Retorno da inversão

O usuário novamente registra apenas as substituições.

Exemplo:

```text
SUB 18 03
SUB 14 11
```

O detector observa:

```text
activeSetter antes = #14
activeSetter depois = #03
```

e conclui que o período de inversão terminou.

Não deve existir botão:

```text
"Encerrar inversão"
```

---

## Estado tático derivado

O MatchState pode expor uma visão derivada:

```text
derivedTacticalState:
  activeSetterPlayerId
  activeSetterPosition
  formationState
```

Exemplo:

```text
activeSetterPlayerId: player-14
activeSetterPosition: P1
formationState: five_one_inversion
```

Mas esse estado deve sempre poder ser reconstruído a partir dos eventos.

---

## Impacto no ScoutEvent

No momento em que uma ação é registrada, anexar o contexto real:

```text
setterPlayerId
setterPosition
formationState
```

Exemplo:

```text
setterPlayerId: player-14
setterPosition: P1
formationState: five_one_inversion
```

Assim os analytics não precisam tentar descobrir posteriormente quem estava levantando.

---

## Analytics

Permitir consultas por:

```text
playerId
setterPlayerId
setterPosition
formationState
```

Exemplos:

```text
#07 João
com #03 Lucas levantando
```

versus:

```text
#07 João
com #14 Rafael levantando
durante inversão
```

Também permitir:

```text
formação normal
vs
five_one_inversion
```

para:

```text
sideout
breakpoint
attack efficiency
distribution
direction
```

---

## Regra de UX

A interface de substituição deve ser genérica.

Exibir apenas algo como:

```text
Sai: #03 Lucas
Entra: #18 Bruno
```

e:

```text
Sai: #11 Pedro
Entra: #14 Rafael
```

Depois da segunda substituição, a UI pode mostrar discretamente:

```text
Inversão do 5x1 identificada
Levantador ativo: #14 Rafael — P1
```

Isso é feedback do sistema, não uma decisão exigida do operador.

---

## Casos ambíguos

Se o padrão não for suficientemente claro:

```text
formationState = unknown / custom
```

Não forçar classificação.

O mais importante é manter corretamente:

```text
lineup
activeSetter
rotation
```

A classificação tática é secundária.

---

## Critérios de aceite

- não existe botão específico de inversão;
- usuário registra apenas substituições;
- sistema recalcula automaticamente o levantador ativo após cada troca;
- duas substituições no mesmo intervalo podem ser agrupadas logicamente;
- inversão do 5x1 é detectada automaticamente quando o padrão for compatível;
- início do próximo rally encerra a janela de agrupamento;
- retorno da inversão também é identificado automaticamente;
- eventos durante a inversão recebem `setterPlayerId` correto;
- `setterPosition` acompanha o levantador ativo real;
- replay reconstrói a detecção;
- undo de uma substituição recalcula o padrão;
- analytics podem comparar formação normal e inversão;
- casos ambíguos não recebem classificação forçada.


# 8. Macroetapa 4 — Novo Match Workspace

## Objetivo

Substituir a experiência atual de registro por uma interface centrada em jogo real.

## Princípio

```text
TECLADO = captura
QUADRA = contexto
```

---

## Layout sugerido

```text
┌─────────────────────────────────────────────────────┐
│ OLYMPICO       18   ×   16       MINAS             │
│ Sets 1 × 0             SET 2                        │
├─────────────────────────────────────────────────────┤
│ Saque: OLY • #07 João       Levantador: P3         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  OLYMPICO                         MINAS             │
│                                                     │
│       P4 P3 P2                    P2 P3 P4          │
│       P5 P6 P1                    P1 P6 P5          │
│                                                     │
├─────────────────────────────────────────────────────┤
│ > *07S+ a12R# *04A# ...                            │
│                                                     │
│ PRONTO                                              │
├─────────────────────────────────────────────────────┤
│ Últimos eventos                                     │
└─────────────────────────────────────────────────────┘
```

---

## Componentes

### ScoreHeader

Mostrar:

- equipes;
- pontos;
- sets;
- set atual.

### MatchContextBar

Mostrar:

- equipe sacando;
- sacador;
- rotação;
- levantador em P1–P6;
- rally atual.

### CourtLineup

Mostrar:

- jogadores em P1–P6;
- levantador;
- libero;
- sacador;
- substituições recentes.

### ScoutInput

Manter input contínuo.

Não obrigar Enter para cada evento quando o parser puder identificar fim do código.

### EventTimeline

Mostrar últimos eventos e permitir:

- editar;
- desfazer;
- refazer.

### TacticalQuickEditor

Abrir somente quando necessário.

---

## Critérios de aceite

- usuário consegue operar partida inteira só no teclado;
- mouse não é obrigatório;
- input continua focado após registro;
- correções não quebram stream;
- lineup muda visualmente com rotação;
- interface não decide regras.

---

# 9. Macroetapa 5 — Analytics por atleta, rotação e posição do levantador

## Objetivo

Transformar os eventos registrados em análise útil para equipe técnica.

---

# 9.1 MatchAnalyticsService

Criar:

```text
MatchAnalyticsService
```

Ele deve consumir:

```text
ScoutEvents
MatchState
Roster
Lineups
StatisticsEngine
TacticalMetrics
```

e produzir:

```text
MatchReportModel
```

---

# 9.2 Estatísticas por atleta

Criar escopo:

```text
team
player
set
rotation
setterPosition
phase
```

---

## Ataque por atleta

Calcular:

```text
volume
pontos
erros
bloqueados
continuidade
ponto %
erro %
bloqueado %
eficiência %
```

Eficiência:

```text
(Pontos - Erros - Bloqueados) / Total
```

---

## Saque por atleta

```text
volume
aces
erros
continuidade
ace %
erro %
eficiência
```

---

## Recepção por atleta

```text
volume
A
B
C
erro
positiva %
excelente %
```

---

## Bloqueio por atleta

```text
pontos
toques
erros
pontos/set
```

---

# 9.3 Sideout e Breakpoint

Calcular por:

```text
equipe
jogador
rotação
set
```

### Sideout

```text
rallies vencidos recebendo saque
/
rallies recebendo saque
```

### Breakpoint

```text
rallies vencidos sacando
/
rallies sacando
```

---

# 9.4 Matriz de direcionamento por atleta e posição do levantador

Esta análise é prioritária.

## Conceito

Para cada atacante:

```text
playerId
```

separar ataques pela posição rotacional do levantador:

```text
setterPosition = P1 ... P6
```

e observar:

```text
origin
target
direction
outcome
```

---

## Matriz principal

Exemplo:

```text
ATLETA: #07 João
LEVANTADOR EM P1

               Destino
Origem      Z1    Z5    Z6
--------------------------------
Z4          12%   58%   30%
Z3           8%   44%   48%
Z2          61%   10%   29%
```

---

## Alternativa por direção

```text
ATLETA: #07 João
LEVANTADOR EM P1

Diagonal       63%
Paralela       24%
Centro         13%
```

com:

```text
volume
pontos
erros
bloqueados
eficiência
```

---

## Comparativo P1–P6

```text
                    Levantador
Atacante         P1   P2   P3   P4   P5   P6

#07 João
Diagonal         63   54   61   47   70   58
Paralela         24   30   22   39   18   28
Centro           13   16   17   14   12   14
```

---

## Matriz de eficiência

Também gerar:

```text
                    Levantador
Atacante         P1   P2   P3   P4   P5   P6

#07 João         41%  33%  48%  21%  52%  39%
#12 Pedro        37%  28%  44%  35%  40%  31%
```

---

## Drill-down

A consulta deve aceitar:

```text
playerId
setterPosition
originZone
targetZone
direction
attackType
attackCombination
phase
receptionGrade
blockersCount
```

---

## Regra importante

`setterPosition` deve representar:

```text
posição do levantador no momento do ataque
```

e não a posição inicial do set.

Essa informação deve ser derivada do lineup/rotação vigente no `scoreBefore` ou no contexto do evento.

---

# 9.5 Estatísticas por rotação

Criar tabela:

```text
Rotação | Sideout | Breakpoint | Atq Ef. | Rec+ | Ace | Erro
```

---

# 9.6 Distribuição do levantador

Por posição P1–P6:

```text
setterPosition
↓
receptionGrade
↓
attacker / zone / combination
```

Exemplo:

```text
Levantador P1 + Recepção A

P4      38%
Meio    34%
P2      28%
```

---

## Critérios de aceite

- todas as métricas podem ser recalculadas dos eventos;
- filtros por atleta e setterPosition funcionam;
- métricas possuem numerador/denominador auditáveis;
- nenhuma métrica depende da UI;
- testes incluem ao menos uma rotação completa.

---

# 10. Macroetapa 6 — Report Model + PDF

## Objetivo

Gerar um relatório pós-jogo útil para comissão técnica.

---

# 10.1 MatchReportModel

Criar modelo independente da UI:

```text
MatchReportModel
│
├── metadata
├── score
├── sets
├── teams
├── players
├── attack
├── serve
├── reception
├── block
├── rotations
├── sideout
├── breakpoint
├── setterDistribution
└── tactical
```

---

## Regra

O PDF NÃO deve ser print da `SummaryScreen`.

Pipeline:

```text
Events
↓
MatchAnalyticsService
↓
MatchReportModel
↓
PdfRenderer
```

---

# 10.2 Estrutura do PDF

## Página 1 — Resumo

- equipes;
- placar final;
- sets;
- competição;
- data;
- duração;
- eventos registrados.

Cards:

```text
Ataque Ef.
Saque Ef.
Recepção +
Recepção #
Sideout
Breakpoint
Bloqueios
Aces
Erros
```

---

## Página 2 — Box score por atleta

Tabela:

```text
Jogador | ATAQUE | SAQUE | RECEPÇÃO | BLOQUEIO
```

Detalhando:

```text
ATT TOT PTS ERR BLK EF%
SRV TOT ACE ERR
REC TOT POS EXC ERR
BLK PTS
```

---

## Página 3 — Ataque

- eficiência por atleta;
- eficiência por posição;
- eficiência por rotação;
- eficiência por posição do levantador;
- direção por atleta;
- matriz origem × destino.

---

## Página 4 — Saque e recepção

### Saque

- origem;
- destino;
- direção;
- ace;
- erro;
- impacto na recepção.

### Recepção

- atleta;
- zona;
- rotação;
- A/B/C/Erro.

---

## Página 5 — Sideout / Breakpoint

```text
          P1   P2   P3   P4   P5   P6
Sideout
Breakpoint
```

---

## Página 6 — Distribuição

Mostrar:

```text
setterPosition
receptionGrade
attacker
attackZone
combination
```

---

# 10.3 Export Bundle

Estrutura final:

```text
match-name/
│
├── partida.json
├── eventos.csv
├── scout.txt
├── estatisticas.csv
└── relatorio.pdf
```

JSON permanece como exportação mestre.

---

# 11. Testes obrigatórios

## Unitários

Testar:

- rally resolver;
- score reducer;
- serving team;
- set completion;
- match completion;
- rotação;
- substituição;
- undo;
- redo;
- replay;
- métricas;
- setterPosition;
- direction matrix.

---

## Integração

Cenário:

```text
criar partida
↓
definir equipes
↓
definir lineup
↓
registrar rallies
↓
virar saque
↓
rotacionar
↓
substituir
↓
corrigir evento
↓
replay
↓
encerrar set
↓
encerrar partida
↓
gerar analytics
↓
gerar PDF
```

---

## E2E

Simular partida com pelo menos:

```text
3 sets
150+ eventos
2 substituições
1 undo
1 redo
1 correção retroativa
1 rotação completa
```

---

# 12. Invariantes obrigatórios

Após replay:

```text
score_recalculado == score_exibido
```

```text
rotation_recalculada == rotation_exibida
```

```text
servingTeam_recalculado == servingTeam_exibido
```

```text
estatistica_eventos == estatistica_pdf
```

```text
exportar_importar_json == partida_original
```

```text
undo + redo == estado_original
```

---

# 13. Ordem recomendada de execução

Não trabalhar em doze grandes fases independentes.

Executar nesta ordem:

```text
1 Auditoria
2 Motor de partida
3 Lineup + rotação
4 Match Workspace
5 Analytics
6 PDF
```

Dentro de cada macroetapa, criar pequenas tarefas.

---

# 14. Estratégia recomendada para uso com Codex

Para cada macroetapa:

## Passo A

Pedir auditoria local dos arquivos envolvidos.

## Passo B

Pedir plano de alteração daquela etapa.

## Passo C

Implementar em pequenas mudanças.

## Passo D

Rodar:

```text
lint
typecheck
unit tests
integration tests
e2e relevante
```

## Passo E

Somente seguir para próxima etapa após estabilizar.

---

# 15. Definição de pronto da versão 0.2

A versão estará pronta quando:

- partida puder ser registrada continuamente pelo teclado;
- placar for derivado dos eventos;
- saque for derivado dos eventos;
- rotação funcionar automaticamente;
- lineup refletir rotação e substituições;
- undo/redo forem determinísticos;
- correções recalcularem a partida;
- estatísticas existirem por equipe e atleta;
- direcionamento puder ser filtrado por atleta, P1–P6 e identidade do levantador ativo;
- inversão do 5x1 e troca de levantador forem reconstruídas corretamente por eventos;
- sideout/breakpoint forem calculados;
- PDF for derivado do `MatchReportModel`;
- JSON continuar sendo exportável/importável;
- E2E completo passar.

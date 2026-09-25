> **Versão/escopo:** 0.4.
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# SCOUT TRAINER V0.4 — PLANO GESTUAL MOBILE-FIRST
## Otimizado para execução econômica pelo GPT-5.6 Luna dentro do VS Code

> Este arquivo deve ficar dentro da pasta do projeto e funcionar como **plano mestre + controle de execução**.
> A V0.4 não reescreve o Scout Trainer: ela adiciona uma nova camada de registro gestual sobre o domínio, rotação, persistência e pipeline canônico já existentes.
>
> Prioridade: **touch primeiro, mouse também; poucas ações visíveis; inferir o que for possível; preservar a V0.3 enquanto a V0.4 é construída.**

---

# 0. ESTADO DA IMPLEMENTAÇÃO

Atualizar esta seção ao final de cada macroetapa.

```text
VERSÃO BASE: 0.3.0
VERSÃO ALVO: 0.4.0

MACROETAPA ATUAL: concluída
STATUS: CONCLUÍDA

ÚLTIMA MACROETAPA CONCLUÍDA: 8 — analytics mínimo + fechamento V0.4

OBSERVAÇÃO DA MACROETAPA 1: implementação concluída; testes e typecheck não puderam ser executados porque o ambiente não possui `npx`/Node disponível.
OBSERVAÇÃO DA MACROETAPA 2: implementação concluída; testes e typecheck não puderam ser executados porque o ambiente não possui `npx`/Node disponível.
OBSERVAÇÃO DA MACROETAPA 3: implementação concluída; testes e typecheck não puderam ser executados porque o ambiente não possui `npx`/Node disponível.
OBSERVAÇÃO DA MACROETAPA 4: implementação concluída; testes e typecheck não puderam ser executados porque o ambiente não possui `npx`/Node disponível.
OBSERVAÇÃO DA MACROETAPA 5: implementação concluída; testes e typecheck não puderam ser executados porque o ambiente não possui `npx`/Node disponível.
OBSERVAÇÃO DA MACROETAPA 6: implementação concluída; testes e typecheck não puderam ser executados porque o ambiente não possui `npx`/Node disponível.
OBSERVAÇÃO DA MACROETAPA 7: implementação concluída; testes e typecheck não puderam ser executados porque o ambiente não possui `npx`/Node disponível.
OBSERVAÇÃO DA MACROETAPA 8: analytics existente continua aceitando `outZone`, enquanto a visualização de quadra ignora endpoints externos; documentação V0.4 atualizada. Verificações finais não puderam ser executadas porque o ambiente não possui `npm`/Node disponível.

MODO GESTUAL: não implementado
MODO VISUAL V0.3: preservar durante a implementação
PIPELINE CANÔNICO: preservar
PWA/INDEXEDDB: reaproveitar
ROTAÇÃO: reaproveitar

DECISÕES FIXAS:
- registro principal por gesto/risco;
- usar Pointer Events para mouse, touch e caneta;
- não exigir levantamento no fluxo gestual;
- não remover a skill `set` do domínio legado;
- saque identifica automaticamente o sacador pela rotação/P1;
- recepção destaca prováveis passadores, mas nunca bloqueia os demais atletas;
- ataque destaca atacantes prováveis, mas nunca bloqueia ataques de fundo ou exceções;
- # encerra o ataque como ponto;
- = encerra o ataque como erro;
- ataque sem # ou = é continuidade/defendido e recebe avaliação neutra interna;
- ação posterior pode qualificar/corrigir o ataque anterior;
- defesa que volta diretamente para o outro lado qualifica o ataque anterior como +;
- botão secundário “Bola de graça” também qualifica o ataque anterior como +;
- ataque terminando fora + = => erro para fora;
- ataque terminando fora + # => ponto com desvio/toque no bloqueio (block-out/tool);
- bloqueio é contexto do ataque quando possível; não exigir um registro separado para todo bloqueio;
- eventos não espaciais ficam em ações rápidas secundárias;
- a quadra deve ocupar a maior parte da atenção;
- nenhum hover pode ser necessário para operar o scout;
- não criar React Native nesta versão;
- manter PWA como alvo mobile instalável e deixar o domínio desacoplado para wrapper nativo futuro.
```

---

# 1. REGRA DE EXECUÇÃO PARA O LUNA

Quando receber:

```text
continue o plano
execute a próxima macroetapa
implemente a macroetapa atual
```

fazer SOMENTE:

1. ler `ESTADO DA IMPLEMENTAÇÃO`;
2. localizar a macroetapa atual;
3. abrir apenas os arquivos listados em `Leitura permitida`;
4. implementar apenas a macroetapa atual;
5. executar apenas as verificações indicadas;
6. atualizar `ESTADO DA IMPLEMENTAÇÃO`;
7. informar os arquivos alterados;
8. PARAR.

**Nunca executar duas macroetapas na mesma sessão.**

Se descobrir dependência grande fora do escopo:

```text
PARAR
→ explicar a dependência em poucas linhas
→ não começar refatoração paralela
```

---

# 2. REGRAS DE ECONOMIA

## 2.1 Leitura

NÃO:

- auditar o repositório inteiro;
- reler todos os planos antigos;
- abrir analytics durante etapa de input;
- abrir persistência durante etapa somente visual;
- procurar refatorações não pedidas;
- ler `ScoutScreen.tsx` inteiro se uma busca por símbolo resolver.

Primeiro buscar o símbolo/componente. Depois abrir somente o trecho necessário.

---

## 2.2 Alterações

Preferir sempre:

```text
menor mudança modular que conclui a macroetapa
```

NÃO:

- reescrever `ScoutTrainerService` inteiro;
- remover o modo digitado;
- remover o registro visual V0.3;
- remover `set` das skills;
- trocar React/Vite;
- adicionar biblioteca de gestos sem necessidade;
- adicionar framework de estado global;
- migrar IndexedDB sem necessidade;
- criar app Android/iOS nativo agora;
- misturar regra de voleibol dentro do componente visual da quadra.

---

## 2.3 Testes

Por macroetapa:

- teste direto do módulo alterado;
- `npm run typecheck` quando houver mudança TypeScript relevante.

NÃO rodar a cada etapa:

```text
npm test
npm run build
npm run test:e2e
lint global
```

Suite maior somente no fechamento.

---

## 2.4 Resposta final de cada macroetapa

Responder somente:

```text
Macroetapa concluída:
Arquivos criados/alterados:
O que ficou funcional:
Testes executados:
Limitações encontradas:
Próxima macroetapa:
```

Depois PARAR.

---

# 3. PRINCÍPIO CENTRAL DA V0.4

O scout não deve perguntar ao usuário o que o contexto já sabe.

Fluxo principal:

```text
GESTO
↓
CONTEXTO DO RALLY
↓
AÇÃO ESPERADA
↓
ROTAÇÃO SUGERE ATLETA
↓
USUÁRIO CONFIRMA ATLETA / RESULTADO SOMENTE SE NECESSÁRIO
↓
EVENTO CANÔNICO
↓
PRÓXIMA AÇÃO
```

A interface acompanha a bola, não um formulário.

---

# 4. FLUXO FUNCIONAL ALVO

## 4.1 Saque

```text
Rally começou
↓
rotação identifica sacador em P1
↓
usuário desenha trajetória do saque
↓
saque é registrado sem perguntar quem sacou
↓
próximo estado: RECEPÇÃO
```

Se houver exceção, permitir trocar o atleta antes de salvar/corrigir sem bloquear o fluxo.

---

## 4.2 Recepção

Usuário desenha:

```text
contato da recepção → destino do passe
```

Depois aparece seletor pequeno de atleta.

Ordem visual:

1. atletas destacados como linha de passe/prováveis receptores;
2. demais atletas continuam selecionáveis.

Após escolher:

```text
próximo estado: ATAQUE
```

**Não exigir levantamento.**

O sistema pode manter `set` no domínio legado e no modo digitado, mas o modo gestual pula essa captura.

---

## 4.3 Ataque

Usuário desenha:

```text
origem do ataque → destino da bola
```

Depois aparece seletor compacto de atacante.

Destacar primeiro:

```text
P4 | P3 | P2
```

Mas permitir qualquer atleta elegível do rally, incluindo ataque de fundo.

Botões de resultado sempre fáceis, mas não dominantes:

```text
[#]   [=]
```

### #

```text
ataque #
→ ponto
→ encerra rally
```

Se o destino estiver fora da quadra:

```text
fora + #
→ inferir toque/desvio do bloqueio
→ outcome: block-out/tool
→ ponto do atacante
```

Não obrigar botão extra de “tocou no bloqueio” neste caso.

### =

```text
ataque =
→ erro
→ encerra rally
```

Se destino estiver fora:

```text
fora + =
→ outcome: attack_out
→ ponto adversário
```

### Sem # ou =

Ao confirmar o atacante sem resultado terminal:

```text
salvar ataque como continuidade/neutro
→ esperar defesa/continuação
```

Usar avaliação neutra já existente no profile, sem expor esse símbolo como passo obrigatório na UI.

---

## 4.4 Ataque defendido

Se depois de um ataque não terminal ocorrer defesa adversária e a bola permanecer no lado defensor:

```text
ataque anterior = defendido/continuidade
```

Nenhum toque extra do usuário.

---

## 4.5 Ataque que força bola de graça

### Caso A — a própria defesa atravessa a rede

```text
ATAQUE A
↓
DEFESA B com trajetória terminando no lado A
```

Inferir:

```text
ataque A = +
outcome derivado = forced_free_ball
```

A defesa continua sendo uma defesa; não duplicar o mesmo contato como dois eventos só para representar a travessia.

### Caso B — devolução controlada posterior

Após defesa/recepção, deve existir ação rápida secundária:

```text
BOLA DE GRAÇA
```

Ao acioná-la:

1. registrar `free_ball` usando a skill já existente;
2. permitir desenhar a trajetória da devolução quando útil;
3. qualificar o último ataque adversário ainda aberto como `+`;
4. próximo time passa a receber a bola.

O botão deve ser acessível sem ocupar o centro da tela.

---

## 4.6 Bloqueio

Bloqueio deve ser **contextual ao ataque** na maior parte dos casos.

Após ataque, permitir box curto:

```text
Bloqueio: [0] [1] [2] [3]
```

Opcional.

Quando necessário, permitir marca rápida:

```text
TOQUE NO BLOQUEIO
```

Mas:

- `fora + #` já infere block-out;
- não exigir registro separado de bloqueio para toda bola;
- manter a skill `block` para ponto de bloqueio ou casos em que um contato de bloqueio precise existir como evento próprio.

Não redesenhar todo o domínio de bloqueio nesta versão.

---

## 4.7 Eventos secundários

Menu/rail discreto:

```text
⋮ Ações rápidas

Bola de graça
Toque na rede
Invasão
Dois toques
Erro de rotação
Outro
```

O menu não pode cobrir a quadra permanentemente.

---

# 5. ARQUITETURA ALVO

A V0.4 deve separar quatro responsabilidades.

```text
[ INPUT DEVICE ]
mouse / touch / caneta
        ↓
[ GESTURE CAPTURE ]
coordenadas e trajetória
        ↓
[ RALLY GESTURE ENGINE ]
qual ação é esperada + inferências
        ↓
[ GESTURE SCOUT CONTROLLER ]
monta VisualScoutDraft / correções
        ↓
[ PIPELINE CANÔNICO EXISTENTE ]
validação → evento → persistência → replay → analytics
```

---

## 5.1 Não colocar regra de rally na UI

O componente da quadra NÃO deve decidir:

- se é saque;
- se é recepção;
- se é ataque;
- quem sacou;
- se o ataque virou +;
- quem ganhou o ponto.

Ele só captura e exibe gesto.

---

## 5.2 Estrutura sugerida

Adaptar nomes somente se houver motivo real.

```text
src/domain/scout/gesture/
  GestureTrajectory.ts
  GestureSpatialMapper.ts

src/domain/rally/gesture/
  GestureRallyState.ts
  GestureRallyEngine.ts
  AttackOutcomeInference.ts
  GestureRallyEngine.test.ts

src/domain/match/lineup/
  RotationCandidateResolver.ts
  RotationCandidateResolver.test.ts

src/application/gesture/
  GestureScoutController.ts
  GestureScoutController.test.ts

src/ui/screens/scout/gesture/
  GestureScout.tsx
  GestureCourtInput.tsx
  GestureCourtInput.css
  PlayerQuickPicker.tsx
  AttackOutcomeBar.tsx
  QuickActionRail.tsx
  GestureScout.css
```

Evitar criar mais arquivos do que o necessário. Se dois módulos forem realmente pequenos e coesos, podem ficar juntos.

---

# 6. CONTRATO ESPACIAL PARA ÁREA FORA

Hoje as coordenadas canônicas devem continuar normalizadas.

**Não salvar x/y negativos nem maiores que 1.**

Estender o contrato espacial de forma explícita para permitir destino fora.

Conceito:

```ts
surface: "court" | "serviceZone" | "outZone"
```

### `court`

Coordenadas continuam exatamente como hoje:

```text
0..1
```

### `serviceZone`

Preservar comportamento atual.

### `outZone`

Usar coordenadas normalizadas `0..1` no frame externo de captura.

O frame externo é a área visual que contém:

```text
margem externa + quadra + margem externa
```

A UI sabe quais limites internos correspondem à quadra e só usa `outZone` quando o endpoint estiver fora dela.

Criar utilitário único para transformar pixel → ponto espacial.

NÃO duplicar a matemática em componentes diferentes.

O analytics antigo pode ignorar `outZone` inicialmente; nenhuma tela existente deve quebrar ao encontrar esse surface.

---

# MACROETAPA 1 — CONTRATOS GESTUAIS + ÁREA FORA

## Objetivo

Criar a fundação sem mexer na tela de scout.

---

## Fazer

1. criar tipo de trajetória gestual independente de React;
2. estender `SpatialPoint.surface` com `outZone`;
3. atualizar validator espacial para aceitar `outZone` com x/y de 0 a 1;
4. criar mapper puro de coordenada do frame visual para:
   - `court`;
   - `serviceZone` quando aplicável;
   - `outZone`;
5. não alterar `SpatialCourtInputV2`;
6. não alterar analytics nesta etapa.

---

## Leitura permitida

Somente:

```text
src/domain/scout/spatial/SpatialMetadata.ts
src/domain/scout/validators/CourtCoordinateValidator.ts
src/domain/scout/tactical/CourtGeometry.ts
src/ui/screens/scout/courtGeometry.ts
```

Abrir `SpatialProjection.ts` somente se um teste direto mostrar dependência real.

---

## Aceitação

- ponto dentro da quadra continua igual à V0.3;
- ponto fora é representável sem coordenada inválida;
- validator aceita `outZone`;
- validator continua rejeitando valores fora de 0..1;
- nenhum componente visual atual foi alterado.

---

## Verificação

- testes diretos de spatial/validator;
- `npm run typecheck`.

PARAR.

---

# MACROETAPA 2 — MOTOR DE RALLY GESTUAL + INFERÊNCIA DO ATAQUE

## Objetivo

Criar uma máquina de estado pura, sem React, para que a UI não precise conhecer as regras.

---

## Política gestual

Fluxo básico:

```text
serve
→ reception
→ attack
→ dig / continuidade
→ attack
→ dig / continuidade
...
```

`set` continua existindo no domínio, mas é implícito no modo gestual.

Não alterar o fluxo do modo digitado.

---

## Estados conceituais

```text
waiting_serve
waiting_reception
waiting_attack
waiting_defense
waiting_free_ball_target
rally_closed
```

Não precisa usar exatamente estes nomes se houver representação mais simples.

---

## Inferências mínimas

### Ataque

```text
#                          => attack point
=                          => attack error
nenhum resultado           => neutral/continuation
outZone + =                => attack_out
outZone + #                => block_out
próxima defesa controlada  => defended
próxima defesa cruza rede  => previous attack + / forced_free_ball
próximo free_ball explícito=> previous attack + / forced_free_ball
```

### Correção tardia

Não mutar o evento anterior em memória.

Usar o mecanismo existente de correção/auditabilidade para enriquecer o ataque anterior quando a ação seguinte revelar `+`.

---

## Importante

Não reescrever `RallyContextResolver` para todos os modos se não for necessário.

Preferir um `GestureRallyEngine`/policy que use o contexto canônico existente e aplique a política simplificada somente ao modo gestual.

---

## Leitura permitida

```text
src/domain/rally/context/RallyContextResolver.ts
src/domain/rally/context/ExpectedNextAction.ts
src/domain/rally/state/RallyState.ts
src/domain/rally/rules/RallyOutcomeResolver.ts
src/domain/scout/entities/Skill.ts
src/domain/scout/events/ScoutEvent.ts
docs/arquitetura/decisoes/ADR-008-late-event-enrichment.md
```

Não abrir UI.

---

## Aceitação

Testes puros comprovam:

1. serve → reception;
2. reception → attack sem exigir set;
3. dig → attack sem exigir set;
4. attack # fecha rally;
5. attack = fecha rally;
6. ataque sem resultado fica aberto;
7. defesa normal mantém ataque como continuidade;
8. defesa cruzando rede qualifica ataque anterior como +;
9. free_ball explícito qualifica ataque anterior como +;
10. outZone + = => attack_out;
11. outZone + # => block_out.

---

## Verificação

- somente teste do `GestureRallyEngine`/inference;
- `npm run typecheck`.

PARAR.

---

# MACROETAPA 3 — SUGESTÕES DE ATLETA PELA ROTAÇÃO

## Objetivo

Usar a rotação atual para reduzir cliques sem proibir situações reais.

---

## Regras

### Saque

```text
P1 = sacador sugerido automaticamente
```

Se a sugestão existir, não abrir picker antes do gesto.

### Recepção

Priorizar visualmente atletas prováveis da linha de passe.

Versão mínima:

```text
P5 / P6 / P1 primeiro
```

Respeitar informação de líbero/função já disponível quando houver suporte pronto.

Não criar um novo motor de líbero nesta etapa.

Todos os atletas em quadra continuam selecionáveis.

### Ataque

Priorizar:

```text
P4 / P3 / P2
```

Mas permitir:

```text
P1 / P6 / P5
```

para pipe, oposto no fundo, segunda bola e outras situações reais.

### Bloqueio

Se o box de bloqueio pedir atletas no futuro, priorizar P4/P3/P2 do defensor.

---

## Saída do resolver

Conceito simples:

```ts
{
  automatic?: playerId,
  highlighted: playerId[],
  others: playerId[]
}
```

Não retornar JSX, labels ou cores no domínio.

---

## Leitura permitida

```text
src/domain/match/lineup/SetLineup.ts
src/domain/match/lineup/RotationEngine.ts
src/ui/screens/scout/visualSuggestion.ts
src/ui/screens/scout/visualCourtPlayers.ts
```

Abrir lógica de líbero somente se já estiver diretamente conectada ao resolver visual atual.

---

## Aceitação

- saque encontra P1;
- recepção destaca fundo/linha de passe;
- ataque destaca frente;
- atleta não destacado continua selecionável;
- nenhuma regra impede ação válida.

---

## Verificação

- teste direto do resolver;
- `npm run typecheck`.

PARAR.

---

# MACROETAPA 4 — NOVA QUADRA POR GESTO (POINTER EVENTS)

## Objetivo

Criar a superfície que funciona igual com:

```text
mouse
 dedo
 caneta/stylus
```

sem alterar a V2 antiga.

---

## Criar

```text
GestureCourtInput.tsx
GestureCourtInput.css
```

Usar:

```text
pointerdown
pointermove
pointerup
pointercancel
setPointerCapture
```

Não criar caminhos separados para mouse/touch.

---

## Gesto

O usuário pressiona e arrasta:

```text
origem ─────────→ destino
```

Durante o gesto:

- mostrar linha/path fino;
- mostrar início e destino de forma discreta;
- atualizar visual em tempo real;
- não persistir nada até `pointerup`.

No final retornar somente trajetória normalizada.

---

## Touch

Na área da quadra:

```css
touch-action: none;
```

Somente na superfície interativa.

Fora da quadra a página continua podendo rolar normalmente.

---

## Área externa

A superfície visual inclui margem clicável ao redor da quadra para capturar bola fora.

Não transformar toda a tela em área de desenho.

---

## Responsividade

### Celular retrato

- quadra ocupa quase toda a largura;
- controles ficam abaixo/bottom sheet;
- nada depende de hover.

### Celular/tablet paisagem

- quadra pode ocupar a maior área central;
- ações rápidas ficam na lateral.

### Desktop

- mesmo componente;
- cursor do mouse substitui o dedo;
- não criar outro layout funcionalmente diferente.

---

## Acessibilidade de toque

Alvos de ação:

```text
mínimo prático ~44–48 px
```

Botões `#`, `=` e desfazer precisam ser fáceis de atingir.

---

## Leitura permitida

```text
src/ui/screens/scout/SpatialCourtInputV2.tsx
src/ui/screens/scout/SpatialCourtInputV2.css
src/domain/scout/spatial/SpatialMetadata.ts
módulos criados na Macro 1
```

Não abrir `ScoutScreen.tsx` nesta etapa.

---

## Aceitação

- arrastar com mouse gera trajetória;
- pointer events são a única API de gesto;
- origem/destino correspondem ao local real;
- endpoint fora gera `outZone`;
- resize não altera coordenadas normalizadas;
- V2 antiga continua intacta.

---

## Verificação

- teste direto do `GestureCourtInput`;
- testar ao menos pointer down/up e normalização;
- `npm run typecheck`.

PARAR.

---

# MACROETAPA 5 — INTERFACE GESTUAL MOBILE-FIRST

## Objetivo

Montar o novo modo de registro sem colocar lógica de rally dentro dos componentes.

---

## Layout conceitual

```text
┌──────────────────────────────────┐
│ TIME A        17 × 16      TIME B│
│ Set 2               Rotação P3   │
├──────────────────────────────────┤
│                                  │
│          QUADRA / GESTO          │
│                                  │
│              ↘                   │
│                                  │
├──────────────────────────────────┤
│ Esperando: ATAQUE                │
│                                  │
│ [atletas sugeridos]              │
│                                  │
│        [ # ]   [ = ]             │
│                                  │
│ ↶ Desfazer        ⋮ Ações rápidas│
└──────────────────────────────────┘
```

---

## Componentes pequenos

### `GestureScout`

Orquestra dados recebidos do controller.

Não implementar regras de inferência nele.

### `PlayerQuickPicker`

- aparece somente quando atleta não é automático;
- destacados primeiro;
- demais disponíveis;
- um toque seleciona e fecha.

### `AttackOutcomeBar`

Mostrar somente quando ação atual for ataque:

```text
#   =
```

Não obrigar resultado se a bola continuar.

### `QuickActionRail`

Secundário:

```text
Bola de graça
Toque na rede
Invasão
Outro
```

### Bloqueio contextual

Box opcional após ataque:

```text
Bloqueio  0 1 2 3
```

Não abrir modal grande.

---

## Comportamento de confirmação

Meta:

```text
GESTO
→ toque no atleta quando necessário
→ próximo gesto
```

Evitar botão geral `REGISTRAR AÇÃO` para toda bola.

O gesto + identificação mínima deve registrar a ação imediatamente.

Para ataque:

- tocar `#` ou `=` encerra imediatamente;
- se não tocar, selecionar atacante/continuar registra como neutral e espera a defesa.

---

## Desfazer

`↶ Desfazer` deve ficar sempre acessível.

Usar undo/replay já existente; não criar histórico paralelo na UI.

---

## Leitura permitida

```text
src/ui/screens/scout/VolleyballVisualScout.tsx
src/ui/screens/scout/VolleyballVisualScout.css
src/ui/screens/scout/ScoreHeader.tsx
src/ui/screens/scout/MatchContextBar.tsx
src/ui/screens/scout/CourtLineup.tsx
src/ui/screens/scout/EventTimeline.tsx
novos módulos gesture
```

Não refatorar ainda `ScoutScreen.tsx` inteiro.

---

## Aceitação

No componente isolado é possível simular:

```text
saque → recepção → ataque → defesa → ataque
```

com:

- quadra como centro;
- seletores compactos;
- # e = acessíveis;
- Bola de graça secundária;
- candidatos destacados pela rotação;
- operação possível em viewport mobile.

---

## Verificação

- testes diretos dos componentes novos;
- `npm run typecheck`.

PARAR.

---

# MACROETAPA 6 — CONTROLLER + PIPELINE CANÔNICO + CORREÇÃO TARDIA

## Objetivo

Ligar o modo gestual ao Scout Trainer real sem criar uma segunda fonte de verdade.

---

## Pipeline obrigatório

```text
GestureCourtInput
↓
GestureRallyEngine
↓
GestureScoutController
↓
VisualScoutDraft
↓
VisualScoutMapper
↓
CanonicalScoutEventCandidate
↓
validação existente
↓
ScoutEvent
↓
EventRepository / IndexedDB
↓
replay / analytics
```

Não passar gesto pelo parser de texto.

Não criar `GestureScoutEvent` persistente paralelo.

---

## Controller

Responsabilidades:

1. receber trajetória final;
2. consultar estado gestual/contexto;
3. aplicar atleta automático/sugerido;
4. montar `VisualScoutDraft`;
5. usar avaliação existente do profile;
6. registrar pelo use case canônico;
7. quando ação posterior revelar `+`, emitir correção tardia do ataque anterior;
8. avançar o estado gestual;
9. expor estado simples para UI.

---

## Avaliação automática

No modo gestual:

```text
# visível → excelente / point
= visível → error
sem resultado terminal → neutral (! internamente)
forced free ball inferido → positive (+ via correção)
```

Usar os valores do profile em vez de hardcode espalhado.

---

## `outcome`

Quando possível guardar resultado semântico claro:

```text
point
error
attack_out
block_out
forced_free_ball
defended
```

Se o modelo canônico atual não comportar uma dessas strings sem alteração estrutural, usar metadata derivada mínima em vez de criar novo evento.

---

## Compatibilidade

Preservar:

- modo digitado;
- modo visual V0.3;
- partidas antigas;
- exportação;
- analytics existente;
- replay;
- undo/redo.

---

## Leitura permitida

```text
src/domain/scout/mapper/VisualScoutDraft.ts
src/domain/scout/mapper/VisualScoutMapper.ts
src/application/use-cases/register-scout-event/
src/domain/match/events/ScoutTimeline.ts
src/domain/match/events/MatchEvent.ts
src/domain/match/replay/MatchReplayService.ts
módulos gesture criados
```

Abrir `ScoutTrainerService.ts` somente nos métodos diretamente chamados pelo registro visual/correção.

---

## Aceitação

- gesto produz um único evento canônico;
- nenhum evento duplicado;
- reload preserva ações;
- ataque neutral pode virar + via correção histórica;
- undo desfaz corretamente;
- modo V0.3 continua funcional.

---

## Verificação

- testes diretos do controller;
- teste de integração mínimo registro → persistência → reload;
- `npm run typecheck`.

PARAR.

---

# MACROETAPA 7 — INTEGRAÇÃO NO WORKSPACE + PWA MOBILE

## Objetivo

Disponibilizar o modo gestual na partida real e fazer o PWA parecer um app durante o scout.

---

## Integração segura

Adicionar o modo gestual sem apagar imediatamente o visual antigo.

Durante V0.4 inicial:

```text
Registro
[ Gestual ] [ Clássico ]
```

ou mecanismo equivalente simples.

Gestual pode ser padrão quando estiver estável.

Não manter três interfaces redundantes visíveis se já houver seletor de modo atual; reaproveitar o seletor existente.

---

## `ScoutScreen.tsx`

O arquivo atual é grande.

Nesta etapa, extrair SOMENTE o necessário para encaixar o novo modo.

Objetivo:

```text
ScoutScreen = shell/orquestração
GestureScout = UI gestual
VolleyballVisualScout = compatibilidade
```

Não aproveitar para fazer limpeza geral do arquivo.

---

## PWA

Reaproveitar manifest e service worker existentes.

Garantir:

- `display: standalone` continua;
- funcionamento offline da tela já carregada;
- assets do modo gestual entram no cache/build normal;
- IndexedDB continua sendo fonte local;
- safe areas mobile não cobrem botões;
- viewport mobile não cria scroll horizontal;
- botões inferiores consideram `env(safe-area-inset-bottom)` quando necessário.

Não adicionar Capacitor nesta macroetapa.

---

## CSS mobile-first

Verificar aproximadamente:

```text
360x800
390x844
768x1024
1024x768
1366x768
```

Não precisa criar snapshots para todas as dimensões.

---

## Leitura permitida

```text
src/ui/screens/scout/ScoutScreen.tsx
src/ui/screens/scout/ScoutModeSelector.tsx
src/ui/app/app.css
public/manifest.webmanifest
src/infrastructure/pwa/registerServiceWorker.ts
public/sw.js
novos componentes gesture
```

---

## Aceitação

- modo gestual abre dentro de uma partida real;
- touch e mouse usam a mesma tela;
- não há dependência de hover;
- PWA continua instalável;
- offline/local-first não é quebrado;
- V0.3 clássica continua acessível durante estabilização.

---

## Verificação

- testes diretos do fluxo de modo;
- `npm run typecheck`;
- `npm run build` uma vez nesta macroetapa.

PARAR.

---

# MACROETAPA 8 — ANALYTICS MÍNIMO + FECHAMENTO V0.4

## Objetivo

Fazer os novos dados serem úteis sem transformar a V0.4 em nova macro de analytics.

---

## Ajustes mínimos

Analytics deve:

1. continuar lendo `court` normalmente;
2. ignorar `outZone` onde a visualização antiga não suportar;
3. não quebrar heatmap com endpoint externo;
4. permitir contabilizar posteriormente:
   - ataques #;
   - ataques =;
   - ataques defendidos;
   - ataques + / forced free ball;
   - ataques para fora;
   - block-out;
5. preservar coordenadas externas para futura visualização específica de erros.

Opcional se simples:

```text
Resumo de ataque:
# pontos
+ forçou free ball
! defendidos
= erros
```

Não construir um novo dashboard nesta versão.

---

## Teste manual obrigatório

Executar uma sequência realista:

```text
1. saque normal
2. recepção por jogador destacado
3. ataque # dentro
4. novo rally
5. ataque = fora
6. novo rally
7. ataque fora + # => block-out
8. novo rally
9. ataque → defesa controlada → novo ataque
10. novo rally
11. ataque → defesa atravessa rede => ataque anterior +
12. novo rally
13. ataque → defesa → botão Bola de graça => ataque anterior +
14. desfazer uma ação
15. recarregar a página
16. continuar a partida
```

Testar com mouse e, quando disponível, touch real ou emulação de touch.

---

## Verificação final

Agora sim executar uma vez:

```text
npm run typecheck
npm test
npm run build
```

E E2E somente para o fluxo crítico do scout, se o ambiente estiver funcional:

```text
npm run test:e2e
```

Se E2E depender de ambiente indisponível, documentar e não ficar tentando repetidamente.

---

## Documentação

Atualizar somente:

```text
README.md
CHANGELOG.md
estado deste plano
```

Documentar V0.4 como:

```text
Registro gestual mobile-first
- touch, mouse e caneta via Pointer Events
- sequência de rally guiada pelo contexto
- rotação sugere atletas
- levantamento implícito
- inferência de ataque defendido / + / erro / block-out
- área espacial para bolas fora
- PWA/local-first preservado
```

---

## Aceitação final V0.4

A versão está pronta quando:

- é possível registrar um rally sem escolher manualmente cada fundamento;
- a maior parte do registro é gesto + identificação mínima;
- saque usa rotação;
- recepção e ataque priorizam atletas prováveis;
- levantamento não é obrigatório;
- # e = encerram ataque corretamente;
- ataque não terminal continua sem confirmação extra;
- free ball qualifica o ataque anterior como +;
- ataques fora guardam localização;
- fora + # distingue block-out;
- fora + = distingue erro direto;
- mouse e touch compartilham o mesmo código de input;
- PWA continua local-first;
- eventos continuam no pipeline canônico;
- modo antigo não perdeu dados nem compatibilidade.

PARAR.

---

# 7. NÃO FAZER NA V0.4

Deixar explicitamente para depois:

```text
React Native
Capacitor / publicação em loja
sincronização em nuvem
multiusuário em tempo real
reconhecimento automático de gestos complexos
IA para classificar jogadas
reconstrução completa do analytics
rastreamento do levantamento como ação obrigatória
tracking de movimento de todos os jogadores
animação cinematográfica do rally
novo motor de líbero
refatoração geral do ScoutTrainerService
```

A V0.4 deve provar primeiro que o **registro gestual contextual é rápido durante uma partida real**.

---

# 8. ARQUITETURA PREPARADA PARA APP NATIVO FUTURO

A regra é simples:

```text
DOMÍNIO NÃO CONHECE BROWSER
CONTROLLER NÃO CONHECE TAMANHO DE TELA
UI NÃO DECIDE REGRA DE VOLEIBOL
PERSISTÊNCIA É PORTA/ADAPTER
```

Se futuramente for necessário empacotar em Android/iOS:

```text
PWA atual
   ↓
mesmo React + domínio
   ↓
wrapper Capacitor ou solução equivalente
```

Essa decisão fica para depois da V0.4, não durante sua implementação.

---

# 9. PROMPT CURTO PARA INICIAR CADA SESSÃO NO LUNA

Usar:

```text
Leia o arquivo SCOUT_TRAINER_V0.4_PLANO_GESTUAL_MOBILE_LUNA.md.
Execute somente a MACROETAPA ATUAL indicada em ESTADO DA IMPLEMENTAÇÃO.
Siga estritamente Leitura permitida, Aceitação e Verificação.
Não antecipe a próxima macroetapa, não faça auditoria geral e não execute suites globais fora do fechamento.
Ao terminar, atualize ESTADO DA IMPLEMENTAÇÃO e pare.
```

---

# 10. RESULTADO DE PRODUTO ESPERADO

O Scout Trainer V0.4 deve parecer menos um formulário e mais uma ferramenta de quadra:

```text
olhar o jogo
↓
desenhar a bola
↓
tocar no atleta quando necessário
↓
continuar olhando o jogo
```

Essa é a métrica principal da versão.

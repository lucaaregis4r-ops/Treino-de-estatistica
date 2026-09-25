> **Versão/escopo:** 0.3.
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# Scout Trainer v0.3 — Correção da Macro 20

## Objetivo

Corrigir a implementação da Macro 20 para que a captura espacial faça parte do fluxo normal de scout sem transformar a interface principal em um gráfico.

A proposta desta correção é separar claramente duas funções:

```text
MINI-QUADRA CONTEXTUAL
→ entrada de dados espaciais durante o scout

QUADRA ANALÍTICA
→ leitura posterior dos dados acumulados
```

A mini-quadra aparece apenas quando:

1. a captura de direção estiver habilitada;
2. a ação digitada aceitar informação espacial.

Exemplo:

```text
usuário digita A=
→ sistema reconhece ataque
→ mini-quadra aparece
→ usuário marca origem
→ usuário marca destino
→ confirma
→ evento é criado normalmente
→ mini-quadra desaparece
→ foco volta para o campo de scout
```

O objetivo principal é preservar a velocidade do modo digitado.

---

# 1. Princípios da correção

## 1.1 A quadra não deve ficar aberta o tempo todo

A captura espacial deve ser contextual.

O usuário continua realizando o scout pela interface principal.

Quando uma ação configurada para direção for reconhecida, aparece uma pequena quadra próxima ao campo de entrada.

Ela deve desaparecer após:

- confirmação;
- cancelamento;
- mudança para uma ação que não usa captura espacial.

---

## 1.2 Direção é opcional

Adicionar uma configuração global:

```text
[ ] Capturar direção das ações
```

Quando desligada:

```text
A=
→ fluxo digitado normal
```

Quando ligada:

```text
A=
→ mini-quadra contextual
→ origem
→ destino
→ confirmação
```

Também pode existir configuração por fundamento, reutilizando a mesma preferência:

```text
Captura espacial

[x] Ataque
[x] Saque
[x] Recepção
[ ] Levantamento
[ ] Bloqueio
```

Não obrigar todas as ações a usar dois pontos.

---

# 2. CORREÇÃO 20.1 — Mini-quadra contextual

## Objetivo

Criar uma pequena quadra que aparece temporariamente após uma ação compatível ser digitada.

Não substituir o campo principal de scout.

Não abrir modal de tela inteira.

Não navegar para outra página.

A captura deve parecer uma continuação natural da digitação.

---

## 2.1 Gatilho

O sistema primeiro interpreta a ação normalmente.

Exemplo conceitual:

```text
entrada:
A=

parser:
Skill = Attack

configuração:
Attack.captureDirection = true

resultado:
abrir mini-quadra
```

A mini-quadra não deve tentar interpretar novamente a sintaxe do scout.

Ela recebe o evento candidato já identificado.

---

## 2.2 Estado da mini-quadra

Estados mínimos:

```text
hidden
↓
awaitingOrigin
↓
awaitingDestination
↓
readyToConfirm
↓
hidden
```

### `hidden`

Nenhuma captura espacial ativa.

### `awaitingOrigin`

Mensagem discreta:

```text
Marque a origem
```

### `awaitingDestination`

Após o primeiro clique:

```text
Marque o destino
```

### `readyToConfirm`

Mostrar os dois pontos e permitir:

```text
Enter = confirmar
Esc = cancelar
R = refazer
```

Se já existirem atalhos equivalentes na aplicação, reutilizá-los.

---

# 3. Interação visual

## Primeiro clique/toque

Registra:

```text
origin.x
origin.y
```

## Segundo clique/toque

Registra:

```text
destination.x
destination.y
```

## Confirmação

Mostrar apenas:

- marcador pequeno de origem;
- marcador pequeno de destino;
- linha ou seta reta ligando os pontos.

Não usar:

- bola gigante;
- animação da bola;
- trajetória curva;
- partículas;
- efeitos 3D;
- heatmap;
- densidade;
- elementos decorativos desnecessários.

A linha indica apenas:

```text
origem registrada → destino registrado
```

Ela não representa a trajetória física real da bola.

---

# 4. Velocidade de scout

A mini-quadra deve interferir o mínimo possível no ritmo de digitação.

Fluxo ideal:

```text
A=
↓
mini-quadra abre
↓
clique
↓
clique
↓
Enter
↓
evento salvo
↓
mini-quadra fecha
↓
foco retorna automaticamente ao campo de entrada
```

Não exigir clique em botão “abrir quadra”.

Não exigir selecionar novamente o fundamento.

Não exigir selecionar zona depois de já marcar a coordenada.

Não exigir fechar manualmente a mini-quadra após confirmar.

---

# 5. Comportamento por fundamento

## 5.1 Ataque

Quando direção estiver habilitada:

```text
ORIGEM
= posição aproximada do contato de ataque

DESTINO
= local onde a bola foi direcionada
```

Exemplo:

```text
A=
→ origem na zona 4
→ destino no fundo da zona 1 adversária
```

O resultado do ataque continua sendo informado pelo sistema de scout existente.

A mini-quadra não substitui:

- kill;
- erro;
- bloqueado;
- continuidade;
- avaliação já existente.

Ela apenas acrescenta localização.

---

## 5.2 Saque

Quando habilitado:

```text
ORIGEM
= posição de saque

DESTINO
= região para onde o saque foi direcionado
```

Se marcar origem do saque for desnecessariamente lento na prática, a implementação deve permitir futuramente configurar:

```text
saque:
[x] destino
[ ] origem + destino
```

Não implementar essa variação agora se exigir complexidade adicional.

Primeiro preservar a arquitetura para permitir isso no futuro.

---

## 5.3 Recepção / passe

Quando habilitado:

```text
ORIGEM
= região onde ocorreu o contato

DESTINO
= região para onde a bola foi direcionada após a recepção
```

Isso permite análises posteriores tanto da posição do contato quanto da direção da recepção.

A análise de sideout deve usar principalmente a posição do contato da recepção.

---

# 6. Coordenadas

A mini-quadra deve converter clique/touch em:

```text
x = 0..1
y = 0..1
```

Exemplo:

```text
canto superior esquerdo:
x ≈ 0
y ≈ 0

canto inferior direito:
x ≈ 1
y ≈ 1
```

As coordenadas persistidas não dependem do tamanho visual da mini-quadra.

Portanto:

```text
mini-quadra 240×120
```

e

```text
mini-quadra 400×200
```

devem produzir a mesma coordenada normalizada para a mesma posição lógica.

Resize não altera eventos já marcados.

---

# 7. Orientação canônica

A interface pode virar a quadra visualmente dependendo de:

- lado;
- equipe;
- rotação;
- orientação de exibição.

Porém a persistência deve usar uma única convenção.

Fluxo:

```text
clique visual
→ coordenada local
→ normalização
→ conversão de orientação
→ coordenada canônica
→ evento
```

Não persistir coordenadas dependentes da orientação da tela.

---

# 8. Zona derivada

A zona não deve ser escolhida manualmente depois da marcação.

Fluxo:

```text
x/y
→ CourtZoneResolver
→ CourtLocation
```

Regra:

```text
coordenada = dado primário
zona = dado derivado
```

Scouts antigos somente com zona continuam válidos.

Não exigir coordenadas retroativamente.

---

# 9. Fluxo canônico

A mini-quadra não cria um tipo novo de scout.

Usar o fluxo já existente:

```text
entrada digitada
→ parser
→ CanonicalScoutEventCandidate
→ enriquecimento espacial
→ ScoutEvent / MatchEvent
```

Conceitualmente:

```text
candidate = {
  skill,
  evaluation,
  ...
}

spatialCapture = {
  origin,
  destination
}

candidate + spatialCapture
→ mesmo evento canônico
```

Preservar:

- digitado;
- visual;
- híbrido;
- correction;
- undo;
- replay;
- timeline efetiva;
- backups existentes.

IndexedDB continua na versão atual da Macro 20.

---

# 10. Quadra analítica

A quadra grande deixa de ser uma ferramenta de captura principal.

Sua função passa a ser:

```text
visualizar os dados espaciais acumulados
```

Ela pode oferecer:

```text
Heatmap
Jogadas
```

como modos de visualização.

---

# 11. Heatmap de ataque

## Pergunta

```text
Para quais regiões da quadra
nossos ataques estão produzindo mais pontos?
```

Usar:

```text
destination.x
destination.y
resultado do ataque
```

Para cada região:

```text
attempts
points
errors
pointRate
```

Fórmula:

```text
pointRate =
ataques que resultaram em ponto
/
ataques válidos enviados à região
```

Reutilizar a classificação de resultado de ataque existente.

Não criar um segundo motor de avaliação de ataque.

---

## Visual

O heatmap deve pintar regiões da quadra.

Não representar volume por bolas gigantes.

Exemplo conceitual:

```text
┌───────────────┐
│ 42%  58%  71% │
│               │
│ 55%  64%  49% │
└───────────────┘
```

As regiões com maior taxa de ponto recebem maior intensidade visual.

---

## Informação da amostra

Sempre preservar:

```text
tentativas
pontos
taxa
```

Exemplo:

```text
Zona/região
Ataques: 18
Pontos: 12
Taxa de ponto: 66,7%
```

Uma região com:

```text
1 ataque
1 ponto
100%
```

não pode parecer tão confiável quanto:

```text
20 ataques
14 pontos
70%
```

Quando a amostra for pequena, mostrar indicação:

```text
Amostra pequena
```

Não inventar ponderação ou modelo estatístico novo nesta correção.

---

# 12. Heatmap de recepção

## Pergunta

```text
De quais regiões da quadra
nossas recepções estão produzindo mais sideout?
```

Usar:

```text
origin/contact.x
origin/contact.y
resultado posterior da posse
```

Para cada região:

```text
receptions
sideouts
sideoutRate
```

Fórmula:

```text
sideoutRate =
sideouts obtidos
/
recepções válidas naquela região
```

A definição de sideout deve vir do analytics existente.

A UI não recalcula sideout.

---

## Tooltip / detalhe

Exemplo:

```text
Recepções: 24
Sideouts: 17
Sideout: 70,8%
```

Quando já existirem no modelo, também mostrar:

```text
Recepção positiva
Recepção excelente
```

como informação complementar.

---

# 13. Trajetórias individuais

Criar um modo:

```text
Jogadas
```

para visualizar eventos individuais.

Cada evento mostra:

```text
origem
→
destino
```

Regras:

- ponto pequeno;
- linha reta;
- nenhuma curva inventada;
- nenhuma animação;
- nenhuma bola gigante;
- não tentar reproduzir física.

Quando houver muitos eventos:

```text
usar Heatmap
```

Quando houver poucos eventos filtrados:

```text
usar Jogadas
```

---

# 14. Filtros

Usar somente filtros que já existam no domínio/modelo.

Exemplos possíveis:

### Ataque

```text
atleta
rotação
posição
origem
avaliação
set
fase
```

### Recepção

```text
atleta
rotação
avaliação
set
```

Não criar novas dimensões apenas para deixar o gráfico mais sofisticado.

---

# 15. Separação de responsabilidades

## MiniCourt

Responsável somente por:

```text
clique/touch
→ coordenada
→ confirmação visual
```

Não calcula analytics.

---

## CourtZoneResolver

Responsável por:

```text
x/y
→ zona
```

---

## Spatial Projection / Analytics

Responsável por:

```text
timeline efetiva
→ selecionar eventos
→ agregar resultados espaciais
```

---

## CourtHeatmap

Responsável somente por:

```text
view model
→ renderização
```

Não deve:

- buscar eventos;
- calcular sideout;
- calcular ponto;
- reinterpretar scout.

---

# 16. CORREÇÃO 20.2 — Persistência

Depois da mini-quadra funcionar:

```text
origin/destination
→ CanonicalScoutEventCandidate
→ evento canônico
```

Preservar:

- zonas antigas;
- scouts antigos;
- modos existentes;
- correction;
- undo.

Não tocar na Macro 21.

---

# 17. CORREÇÃO 20.3 — Heatmap de ataque

Implementar somente depois da captura espacial estar funcional.

Pergunta:

```text
Onde os ataques produzem mais pontos?
```

Entrada:

```text
destination + resultado
```

Saída:

```text
região
attempts
points
pointRate
```

Nenhuma bola gigante.

---

# 18. CORREÇÃO 20.4 — Heatmap de recepção

Pergunta:

```text
De onde as recepções geram mais sideout?
```

Entrada:

```text
contact/origin + sideout
```

Saída:

```text
região
receptions
sideouts
sideoutRate
```

Reutilizar o mesmo componente de heatmap.

---

# 19. CORREÇÃO 20.5 — Jogadas individuais

Adicionar:

```text
Heatmap | Jogadas
```

No modo Jogadas:

```text
origem → destino
```

Mostrar apenas os dados efetivamente marcados.

---

# 20. CORREÇÃO 20.6 — Limpeza do visual antigo

Remover ou rebaixar somente os elementos espaciais atuais que:

- usam bola gigante;
- usam curvas artificiais;
- tentam simular trajetória;
- poluem a quadra;
- repetem informação já presente em outro componente.

Não redesenhar a aplicação inteira.

Não alterar a identidade visual geral entregue na Macro 19.

---

# 21. Testes mínimos

## Captura contextual

Testar:

```text
direção desligada
→ A=
→ nenhum MiniCourt

direção ligada
→ A=
→ MiniCourt abre
```

Depois:

```text
clique origem
clique destino
Enter
→ evento confirmado
→ MiniCourt fecha
→ foco volta ao input
```

---

## Coordenadas

Testar:

```text
posição visual
→ x/y normalizado
→ zona derivada
```

---

## Heatmap de ataque

Fixture:

```text
10 ataques na região A
6 pontos

resultado:
pointRate = 60%
attempts = 10
```

---

## Heatmap de recepção

Fixture:

```text
10 recepções na região B
7 sideouts

resultado:
sideoutRate = 70%
receptions = 10
```

Depois:

```bash
npm run typecheck
```

Não executar:

- suíte completa;
- Playwright completo;
- benchmark;
- lint global;
- format global;
- build completo;

salvo necessidade real para diagnosticar falha.

---

# 22. Definição de concluído

A Correção da Macro 20 termina quando:

- captura de direção pode ser ligada/desligada;
- ações compatíveis abrem a mini-quadra automaticamente;
- mini-quadra não interrompe desnecessariamente o scout;
- origem e destino são marcados com dois cliques/toques;
- Enter confirma;
- cancelamento funciona;
- foco retorna ao campo de scout;
- coordenadas são normalizadas;
- orientação é convertida para convenção canônica;
- zona é derivada;
- evento continua usando o fluxo canônico;
- scouts antigos continuam válidos;
- heatmap de ataque responde onde ataques geram mais pontos;
- heatmap de recepção responde de onde recepções geram mais sideout;
- volume da amostra acompanha as taxas;
- trajetórias individuais representam apenas dados reais;
- visual antigo artificial foi removido/rebaixado;
- IndexedDB permanece na versão prevista;
- checks dirigidos passam;
- typecheck passa.

Depois:

```text
atualizar IMPLEMENTATION_STATUS.md
→ registrar Correção da Macro 20 concluída
→ PARAR
```

A Macro 21 continua posteriormente pelo plano principal.

---

# 23. Prompts independentes para OpenCode

## EXECUÇÃO 1 — Mini-quadra contextual

```text
Implemente somente a primeira parte da CORREÇÃO DA MACRO 20.

Objetivo:
quando a opção de captura de direção estiver habilitada e uma ação compatível for reconhecida no scout digitado, abrir automaticamente uma pequena quadra contextual próxima ao input.

Exemplo:
A=
→ parser reconhece ataque
→ se direção de ataque estiver habilitada
→ MiniCourt aparece
→ primeiro clique = origem
→ segundo clique = destino
→ mostrar marcadores pequenos + linha/seta reta
→ Enter confirma
→ MiniCourt fecha
→ foco retorna ao campo de scout.

Quando direção estiver desligada, o fluxo atual não muda.

Não use:
- bola gigante;
- curva;
- animação;
- heatmap durante captura;
- modal de tela inteira.

Reutilize a quadra/geometria existente sempre que possível.

Nesta execução NÃO mexa em:
- persistência espacial;
- analytics;
- heatmaps;
- MatchReportModel;
- IndexedDB;
- histórico;
- Macro 21.

Leia somente git status, último trecho relevante de IMPLEMENTATION_STATUS.md e arquivos/símbolos diretamente envolvidos.

Faça apenas testes diretamente relacionados à interação e typecheck.

Informe arquivos alterados e PARE.
```

---

## EXECUÇÃO 2 — Persistência espacial

```text
Continue somente a CORREÇÃO DA MACRO 20.

A MiniCourt contextual já funciona.

Agora conecte origem/destino ao evento canônico.

Requisitos:
- converter clique/touch em x/y normalizado 0..1;
- converter orientação visual para convenção canônica;
- reutilizar campos espaciais existentes;
- derivar CourtLocation/zona das coordenadas;
- enriquecer CanonicalScoutEventCandidate existente;
- não criar tipo paralelo de evento;
- preservar digitado, visual e híbrido;
- preservar correction, undo e replay;
- preservar scouts antigos somente com zona;
- manter IndexedDB na versão atual.

Depois da confirmação espacial:
→ salvar evento
→ fechar MiniCourt
→ devolver foco ao input.

Não implemente heatmap ainda.

Teste apenas persistência/conversão e typecheck.

Informe arquivos alterados e PARE.
```

---

## EXECUÇÃO 3 — Heatmap funcional de ataque

```text
Implemente somente o heatmap de ataque da CORREÇÃO DA MACRO 20.

Pergunta:
"Para quais regiões da quadra nossos ataques estão produzindo mais pontos?"

Use apenas os destinos reais dos ataques já registrados.

Para cada região produzir:
- attempts;
- points;
- errors quando já disponível;
- pointRate.

pointRate =
pontos de ataque /
ataques válidos naquela região.

Reutilize a classificação de ataque existente.

O visual deve preencher regiões da quadra por intensidade.

NÃO usar:
- bolas gigantes;
- círculos proporcionais;
- trajetória inventada;
- blur exagerado;
- interpolação sem necessidade.

Tooltip/detalhe deve mostrar volume e taxa.

Amostra pequena deve ser identificável.

O CourtHeatmap apenas renderiza o view model; não calcula analytics.

Faça uma fixture pequena e typecheck.

Não implemente recepção ainda.

PARE.
```

---

## EXECUÇÃO 4 — Heatmap funcional de recepção

```text
Implemente somente o heatmap de recepção da CORREÇÃO DA MACRO 20.

Pergunta:
"De quais regiões da quadra nossas recepções estão originando mais sideouts?"

Use a coordenada real do contato/origem da recepção.

Para cada região produzir:
- receptions;
- sideouts;
- sideoutRate.

sideoutRate =
sideouts /
recepções válidas naquela região.

Reutilize a definição existente de sideout.

Não recalcular sideout na UI.

Quando já disponíveis, mostrar como complemento:
- recepção positiva;
- recepção excelente.

Reutilize o mesmo CourtHeatmap usado no ataque.

Amostra pequena deve ser identificável.

Faça fixture pequena e typecheck.

PARE.
```

---

## EXECUÇÃO 5 — Jogadas individuais e integração

```text
Continue somente a CORREÇÃO DA MACRO 20.

Adicione à visualização espacial:

Heatmap | Jogadas

No modo Jogadas:
- mostrar somente origem/destino realmente registrados;
- marcadores pequenos;
- linha/seta reta;
- nenhuma curva;
- nenhuma animação;
- nenhuma bola gigante.

Ataque:
heatmap por taxa de ponto.

Recepção:
heatmap por sideout.

Saque:
manter apenas visualização suportada pelos dados atuais; não inventar nova métrica.

Reutilize filtros existentes.

Não crie dimensões novas apenas para a UI.

Não mexa na Macro 21.

Faça somente teste dirigido de integração e typecheck.

PARE.
```

---

## EXECUÇÃO 6 — Limpeza e fechamento

```text
Finalize somente a CORREÇÃO DA MACRO 20.

Audite apenas os componentes espaciais alterados.

Remova ou rebaixe:
- bola gigante;
- curvas decorativas;
- animações desnecessárias;
- visualizações redundantes;
- elementos que façam a quadra parecer um gráfico genérico.

Não faça redesign geral.

Confirme:
- configuração de direção on/off;
- MiniCourt contextual;
- origem/destino;
- Enter confirma;
- foco volta ao input;
- x/y normalizado;
- zona derivada;
- evento canônico;
- compatibilidade com scout antigo;
- heatmap de ataque;
- heatmap de recepção;
- amostra visível;
- jogadas reais;
- IndexedDB inalterado.

Rode apenas testes dirigidos e npm run typecheck.

Se tudo estiver verde:
atualize somente IMPLEMENTATION_STATUS.md registrando a Correção da Macro 20 como concluída.

Não comece Macro 21.

PARE.
```

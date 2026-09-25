> **Versão/escopo:** 0.3.
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# SCOUT TRAINER V0.3 — PLANO DE REESTRUTURAÇÃO ENXUTO
## Otimizado para execução pelo Codex dentro do VS Code

> Este arquivo fica dentro da pasta do projeto.
> O Codex deve tratá-lo como **plano mestre + controle de execução**.
> A prioridade é: **alterações pequenas, pouca leitura, poucos testes e nenhuma antecipação de etapas**.

---

# 0. ESTADO DA IMPLEMENTAÇÃO

Atualizar esta seção ao final de cada macroetapa.

```text
VERSÃO ALVO: 0.3

MACROETAPA ATUAL: 5
STATUS: IMPLEMENTADA — CONFERÊNCIA VISUAL PENDENTE

ÚLTIMA MACROETAPA CONCLUÍDA: 4

GEOMETRIA SPATIALCOURTINPUTV2: CONGELADA E VALIDADA
PIPELINE SPATIAL: VALIDADO
ANALYTICS ESPACIAL: MAPA DE PONTOS JÁ EXISTE

OBSERVAÇÕES:
- seleção visual do líbero: ocupa central no fundo, exceto P1 durante o turno de saque; central retorna na frente; controle manual disponível; não cria substituições permanentes no histórico;
- validação destes ajustes: 4 testes diretos passaram (Enter, rotação/levantador, cinco ações recentes, sugestões e central/líbero) e typecheck passou;
- primeiro bloco estatístico/visual: barra contextual corrigida para o tema escuro, com contraste, estados ativo/hover e comportamento responsivo;
- segundo bloco estatístico iniciado: relatório de probabilidade de vitória por estado do placar e gráfico de evolução por eventos na aba Análise;
- variação por ação adicionada: cada evento compara a estimativa do estado atual com o estado anterior e exibe impacto em pontos percentuais;
- maiores variações aparecem no painel e cada ponto do gráfico possui tooltip com placar e impacto;
- etapa analítica refinada: eventos com o mesmo placar são agrupados para representar pontos/rally, evitando inflar o gráfico por contatos internos;
- maiores impactos agora identificam também o fundamento associado;
- modelo explicitamente estimativo, complementar entre equipes e preparado para calibração futura com histórico;
- typecheck e teste direto do motor de probabilidade passaram;
- typecheck da correção visual passou;
- ajustes do registro visual: recepção sugere ataque com levantamento implícito; placar local; Enter registra e Esc refaz trajetória; últimas 5 ações com correção, desfazer/refazer; atletas em P4/P3/P2 e P5/P6/P1 com levantador ativo destacado;
- revisão solicitada em 06/09: registro compacto, sem placar sobreposto, com sugestões editáveis do próximo contato e do sacador da posição 1;
- etapa 4 revisada: aba Análise independente, filtros por P do levantador, qualidades combináveis, tabela filtrada e indicadores recolhíveis;
- etapa 5 implementada: heatmap radial aditivo com raio/intensidade e os mesmos filtros de Pontos/Jogadas;
- typecheck e build de produção passaram; build informa bundle acima de 500 kB;
- 7 testes diretos passaram em 5 arquivos: sugestões, registro visual, captura V2, filtros espaciais e densidade radial;
- conferência visual de filtros, posições conhecidas e resize pendente: nenhum navegador conectado nesta sessão;
- Eficiência espacial permanece para 0.3.x, conforme o escopo opcional do plano;
- macroetapa 1 concluída: Cadastros, Partidas, Home enxuta e menu global reduzido;
- IndexedDB atualizado para versão 6 com stores de cadastros reutilizáveis;
- novas partidas copiam dados dos cadastros para preservar histórico independente;
- verificações da macroetapa 1 passaram: typecheck e testes diretos de IndexedDB/CRUD/migração;
- macroetapa 2 concluída: workspace contextual da partida com Registro, Resumo e Análise próximos;
- entrada e saída de partidas agora passam pela tela Partidas, com cabeçalho contextual e placar;
- typecheck da macroetapa 2 passou;
- macroetapa 3 refeita: alternativa visual ao scout por código, com ações à esquerda, quadra central, qualidade à direita e elenco abaixo;
- seleção por botões, detalhes opcionais de saque/ataque e bloqueio de registro incompleto;
- captura espacial entregue após o segundo clique; Refazer/Cancelar invalidam os dados e ajustes de destino atualizam a trajetória;
- sucesso de registro renova o formulário; falhas preservam a jogada para correção;
- o registro visual mantém apenas Refazer/Cancelar na quadra e usa o botão final de registro;
- revisão da macroetapa 3: typecheck e 2 testes diretos passaram (registro completo, obrigatoriedade, Refazer e precisão da captura); conferência visual em navegador pendente;
- macroetapa 4 concluída: explorador espacial com filtros de ação, atleta, qualidade, set e origem/destino, nos modos Pontos e Jogadas;
- typecheck da macroetapa 4 passou;
- coordenadas são livres;
- não limitar clique por skill;
- origin/destination são persistidos em metadata.spatial;
- evitar mudanças amplas fora da macroetapa atual.
```

## Regra para o Codex

Quando receber comandos como:

```text
continue o plano
execute a próxima etapa
implemente a macroetapa atual
```

fazer:

1. ler esta seção `ESTADO DA IMPLEMENTAÇÃO`;
2. localizar somente a macroetapa indicada;
3. ler apenas os arquivos diretamente necessários;
4. implementar somente aquela macroetapa;
5. executar somente as verificações descritas nela;
6. atualizar esta seção;
7. informar arquivos alterados;
8. PARAR.

**Não executar duas macroetapas na mesma sessão.**

---

# 1. REGRAS DE ECONOMIA PARA O CODEX

## 1.1 Leitura

NÃO:

- auditar o repositório inteiro;
- abrir dezenas de arquivos preventivamente;
- reler planos antigos sem necessidade;
- procurar oportunidades de refatoração;
- analisar analytics se a etapa atual é cadastro;
- analisar persistência se a etapa atual é somente UI.

Primeiro localizar por busca:

- componente;
- hook;
- repository;
- rota;
- tipo;
- teste diretamente relacionado.

Depois abrir somente os resultados relevantes.

---

## 1.2 Alterações

Sempre preferir:

```text
menor alteração capaz de cumprir a etapa
```

Não:

- reorganizar pastas sem necessidade;
- renomear arquivos estáveis;
- trocar biblioteca;
- criar framework interno;
- criar abstração preventiva;
- reescrever domínio inteiro;
- alterar código adjacente só porque parece melhor.

Se uma dependência grande for descoberta:

```text
PARAR
→ informar a dependência
→ não resolver automaticamente
```

---

## 1.3 Testes

Durante cada macroetapa:

- teste direto do código alterado, quando existir;
- `npm run typecheck` quando houver mudança TypeScript relevante.

NÃO executar repetidamente:

```text
npm test
npm run build
E2E completo
suite global
lint global
```

Build e verificação mais ampla ficam para o fechamento da V0.3.

---

## 1.4 Relatório final de cada macroetapa

Responder somente com:

```text
Macroetapa concluída:
Arquivos alterados:
O que ficou funcional:
Testes executados:
Limitações encontradas:
Próxima macroetapa:
```

Depois PARAR.

---

# 2. PRINCÍPIOS FIXOS DA V0.3

## 2.1 Separar administração de partida

Fora da partida:

```text
Início
Partidas
Cadastros
Treino
Manual
```

Dentro da partida:

```text
Registro
Resumo
Análise
```

`Scout`, `Live` e `Resumo` não devem permanecer como áreas globais desconectadas.

---

## 2.2 Quadra espacial já está resolvida

A geometria atual de `SpatialCourtInputV2` está CONGELADA.

Não alterar sem bug reproduzível:

- cálculo de x/y;
- `getBoundingClientRect`;
- proporção 2:1;
- rede;
- linhas de ataque;
- posicionamento dos marcadores;
- linha origem → destino;
- sistema percentual;
- pipeline `metadata.spatial`.

---

## 2.3 Coordenadas são livres

Não limitar marcação conforme:

- ataque;
- saque;
- recepção;
- levantamento;
- defesa;
- lado da quadra.

A quadra registra o que o usuário marcou.

O analytics interpreta depois.

---

## 2.4 Fonte espacial principal

Manter:

```ts
metadata.spatial = {
  origin: {
    surface: "court",
    x,
    y
  },
  destination: {
    surface: "court",
    x,
    y
  }
}
```

Não substituir coordenadas por:

```text
originZone
targetZone
P
zona 1–6
```

Esses valores podem ser derivados.

---

## 2.5 Uma única confirmação no scout

Fluxo alvo:

```text
seleciona atleta
+
seleciona ação
+
seleciona qualidade
+
marca origem
+
marca destino
↓
REGISTRAR AÇÃO
```

Não usar:

```text
Confirmar trajetória
↓
Confirmar ação
```

Uma única confirmação final.

---

# 3. NAVEGAÇÃO ALVO

## Fora da partida

```text
Início | Partidas | Cadastros | Treino | Manual
```

`Nova partida` pode ser botão de destaque.

---

## Dentro da partida

```text
← Partidas     Equipe A x Equipe B     Set 2 | 18–16

Registro | Resumo | Análise
```

A pessoa deve perceber claramente:

```text
"estou dentro desta partida"
```

---

# 4. MODELO LOCAL DE CADASTRO

Usar o armazenamento local já existente no projeto.

Preferir estender IndexedDB atual.

Não criar segundo sistema de persistência.

## Athlete

Estrutura mínima conceitual:

```ts
{
  id,
  name,
  number?,
  position?,
  active,
  createdAt,
  updatedAt
}
```

---

## Team

```ts
{
  id,
  name,
  shortName?,
  category?,
  athleteIds: [],
  createdAt,
  updatedAt
}
```

---

## Match

Manter a estrutura atual e acrescentar somente o necessário.

Conceito:

```ts
{
  id,
  date,
  homeTeamId?,
  awayTeamId?,
  opponentName?,
  profile?,
  status,
  rosterSnapshot,
  createdAt,
  updatedAt
}
```

## Regra de histórico

Partida antiga não pode mudar porque o cadastro atual do atleta mudou.

Usar `rosterSnapshot` ou mecanismo equivalente.

Não apagar histórico local existente.

---

# MACROETAPA 1 — CADASTROS + HISTÓRICO + MENU GLOBAL

## Objetivo

Resolver de uma vez:

- lista de partidas confusa;
- falta de cadastro reutilizável;
- menu global excessivo.

---

## Escopo

### A. Cadastros

Criar área:

```text
Cadastros
```

com:

```text
Atletas | Equipes
```

Se `Perfis` fizer sentido como configuração, pode aparecer como terceira aba sem reescrever sua lógica.

### Atletas

Permitir:

- cadastrar;
- editar;
- desativar;
- consultar.

Evitar exclusão destrutiva se houver histórico.

### Equipes

Permitir:

- cadastrar;
- editar;
- selecionar atletas existentes;
- consultar elenco.

---

### B. Partidas

Criar tela própria:

```text
Partidas
```

Lista compacta com:

- equipes/adversário;
- data;
- perfil;
- status;
- abrir/continuar;
- consultar resumo.

Preservar partidas antigas.

---

### C. Home

A Home atual não deve mostrar lista enorme.

Deixar:

```text
Nova partida
Iniciar treino
3–5 partidas recentes
Ver todas as partidas
```

---

### D. Menu global

Migrar para:

```text
Início | Partidas | Cadastros | Treino | Manual
```

Não mostrar globalmente:

```text
Scout
Live
Resumo
```

Nesta macroetapa não reconstruir ainda o workspace interno da partida.

---

## Leitura permitida

Localizar somente:

- componente do header/menu;
- Home;
- estrutura atual de Match;
- repository IndexedDB;
- origem da lista `Partidas recentes`;
- tela/estrutura atual de Perfis.

Não auditar o restante.

---

## Aceitação

- cadastro de atleta funciona;
- cadastro de equipe funciona;
- equipe usa atletas cadastrados;
- tela Partidas existe;
- partidas antigas continuam disponíveis;
- Home mostra somente poucas partidas recentes;
- menu global ficou menor.

---

## Verificação

Somente:

- testes diretos dos repositories/CRUD novos, se existirem;
- teste de migração somente se schema IndexedDB mudar;
- `npm run typecheck`.

PARAR.

---

# MACROETAPA 2 — WORKSPACE DA PARTIDA

## Objetivo

Entrar em uma partida deve mudar o contexto da aplicação.

---

## Fluxo

Ao:

```text
Nova partida
Abrir partida
Continuar partida
```

entrar em um workspace dedicado.

---

## Header contextual

Exemplo:

```text
← Partidas     Equipe A x Equipe B     Set 2 | 18–16
```

Dentro:

```text
Registro | Resumo | Análise
```

Não duplicar menu global + menu da partida.

---

## Registro

Reaproveitar a lógica funcional atual de scout/live.

Não reescrever motor da partida.

---

## Resumo

Transformar o resumo em aba da própria partida.

Acesso em um clique.

---

## Análise

Colocar o analytics da partida dentro de:

```text
Análise
```

---

## Saída

Sempre existir:

```text
← Voltar para Partidas
```

---

## Leitura permitida

Somente:

- rotas;
- shell/layout atual;
- tela de scout/live;
- resumo;
- analytics;
- estado da partida ativa.

Não tocar em domínio espacial.

---

## Aceitação

- nova partida entra no workspace;
- partida existente abre no workspace;
- Registro/Resumo/Análise ficam próximos;
- voltar para Partidas é claro;
- nenhuma função do motor de partida foi perdida.

---

## Verificação

Priorizar teste manual.

Automatizado somente se houver lógica nova de rota/estado.

Executar:

```text
npm run typecheck
```

PARAR.

---

# MACROETAPA 3 — NOVO REGISTRO VISUAL

## Objetivo

Fazer o registro ser rápido e visual.

A quadra V2 é o centro.

---

## Layout desktop

```text
┌──────────────┬──────────────────────────────┬───────────────┐
│    AÇÕES     │          QUADRA V2           │   QUALIDADE   │
│              │                              │               │
│ Saque        │        ●──────────●          │      #        │
│ Recepção     │                              │      +        │
│ Levant.      │                              │      =        │
│ Ataque       │                              │      -        │
│ Bloqueio     │                              │               │
│ Defesa       │                              │               │
└──────────────┴──────────────────────────────┴───────────────┘

ATLETAS
[1] [2] [3] [4] [5] [6] [7] ...

Detalhe opcional: [ Flutuante ] [ Viagem ]

                                      [ REGISTRAR AÇÃO ]
```

Responsivo sem deformar a quadra.

---

## Ação

Usar skills existentes.

Não criar enum paralela.

Um clique seleciona.

---

## Qualidade

Usar avaliações existentes.

Priorizar botões compactos:

```text
#   +   =   -
```

e demais símbolos já suportados.

---

## Atletas

Usar roster da partida.

Visual:

```text
[número] Nome
```

ou formato compacto equivalente.

Seleção muito visível.

---

## Coordenadas

Fluxo existente:

```text
1º clique = origem
2º clique = destino
```

Depois do segundo clique:

```text
trajetória pronta
```

Remover confirmação específica da trajetória.

Manter somente:

```text
Refazer
Cancelar
```

se necessários.

---

## Registro final

Um único botão:

```text
REGISTRAR AÇÃO
```

Salva:

- atleta;
- skill;
- qualidade;
- origin;
- destination;
- detalhe opcional;
- metadata já necessária.

Se faltar algo obrigatório:

- desabilitar botão;
- indicar discretamente o campo faltante.

---

## Detalhe opcional por ação

Suportar metadata simples, sem mudar domínio inteiro.

Exemplos:

### Saque

```text
Flutuante
Viagem
```

### Ataque

```text
Potência
Largada
```

IMPORTANTE:

- detalhe opcional;
- nunca bloquear o registro;
- mostrar somente quando fizer sentido;
- não criar dezenas de botões.

---

## Após registrar

Após sucesso:

- limpar origem/destino;
- limpar ação;
- limpar qualidade;
- preparar próximo registro;
- sem modal;
- sem navegação.

Não decidir nesta etapa uma lógica complexa de “manter atleta selecionado”.

Preservar comportamento mais simples.

---

## Arquivos

Preferir alterações apenas na UI de registro e integração direta.

Não alterar:

- geometria da V2;
- validator espacial;
- EventFactory;
- analytics;
- IndexedDB,

a menos que seja indispensável para o único registro final.

Se for necessária mudança ampla fora do fluxo:

PARAR e informar.

---

## Aceitação

É possível registrar uma jogada com:

```text
atleta
→ ação
→ qualidade
→ origem
→ destino
→ Registrar ação
```

sem segunda confirmação.

---

## Verificação

Casos mínimos:

- ação completa salva;
- botão não registra se faltar campo obrigatório;
- Refazer limpa trajetória;
- metadata.spatial mantém precisão.

Depois:

```text
npm run typecheck
```

PARAR.

---

# MACROETAPA 4 — EXPLORADOR ANALÍTICO EDITÁVEL

## Objetivo

Transformar a análise em um explorador visual simples.

O mapa de pontos atual é a base.

Não reconstruí-lo do zero.

---

## Organização visual

```text
FILTROS
Ação | Atleta | Qualidade | P | Set | Origem/Destino

                    QUADRA

Pontos | Jogadas

18 ações | 8 # | 5 + | 3 = | 2 -

[ Ver tabela detalhada ]
```

Tabelas extensas ficam secundárias:

- `<details>`;
- botão;
- aba de conferência.

Não remover dados auditáveis.

---

## Pipeline único

```text
eventos
↓
filtros
↓
eventos filtrados
↓
renderer
```

Não duplicar filtro em cada mapa.

---

## Estado conceitual

Adaptar aos nomes reais do projeto:

```ts
analysisConfig = {
  action,
  athletes,
  qualities,
  coordinate,
  p,
  set,
  visualization
}
```

Solução simples.

Não criar framework genérico.

---

## Filtros

### Ação

Uma ação ou todas.

### Atleta

Um ou todos.

Seleção múltipla somente se for simples com os componentes atuais.

### Qualidade

Seleção múltipla:

```text
# + = -
```

Exemplos:

```text
#
# e +
- e =
todas
```

### Coordenada

```text
Origem | Destino
```

### P

Usar o `P` já existente.

Não redefinir seu significado.

Permitir:

```text
Todos | P1 | P2 | ...
```

somente se o evento atual possui esse dado de forma confiável.

### Set

```text
Todos | 1 | 2 | 3 | ...
```

---

## Combinações esperadas

```text
Ataque + atleta 7 + # + destino
```

```text
Saque + -/= + P2
```

```text
Ataque + atleta 4 + P3 + origem
```

---

## Pontos

Aprimorar o mapa atual.

Posição:

```text
left = x * 100%
top = y * 100%
```

Sem:

- snap;
- zona;
- rotação;
- espelhamento;
- arredondamento.

Tooltip curto, se dados existirem:

```text
Jogador 7
Ataque #
Set 2
```

---

## Jogadas

Adicionar modo:

```text
●────────●
```

origem → destino.

Linhas finas.

Não misturar com Pontos.

---

## Métricas pequenas

Exemplo:

```text
18 ações
8 #
5 +
3 =
2 -
```

Não criar dezenas de cards.

---

## Aceitação

O usuário consegue responder visualmente:

- onde atleta X atacou?;
- onde os ataques # terminaram?;
- onde ocorreram saques -?;
- como ficaram ações de atleta X em P2?;
- como mudam origem e destino?;

sem depender da tabela.

---

## Verificação

Testes centrais apenas:

- ação;
- qualidade múltipla;
- atleta;
- P se disponível;
- origem/destino.

Depois:

```text
npm run typecheck
```

PARAR.

---

# MACROETAPA 5 — HEATMAP REAL + FECHAMENTO V0.3

## Objetivo

Adicionar heatmap contínuo reutilizando exatamente os filtros da Macroetapa 4.

---

## Modos

```text
Pontos | Heatmap | Jogadas
```

O heatmap não implementa filtros próprios.

---

## Pipeline

```text
eventos
↓
analysisConfig
↓
eventos filtrados
↓
coordenadas
↓
heatmap
```

---

## Heatmap contínuo

Cada ponto gera um núcleo radial.

Pontos próximos acumulam intensidade.

Não usar:

- zonas retangulares;
- 1–6 como base;
- uma cor inteira por região;
- biblioteca pesada sem necessidade.

Canvas é aceitável.

---

## Coordenadas

Usar exatamente:

```text
x = 0..1
y = 0..1
```

A camada deve ser recortada pelos limites da quadra.

Resize não pode deslocar semanticamente o calor.

---

## Controles

No máximo:

```text
Raio
Intensidade
```

Preferencialmente dentro de:

```text
Ajustes
```

para não poluir a tela.

---

## Qualidade

O heatmap usa o filtro existente.

Exemplo:

```text
Ação: Ataque
Qualidade: #
Coordenada: Destino
```

mostra:

```text
onde se concentram os destinos dos ataques #
```

Trocar para:

```text
- e =
```

mostra outra distribuição.

Não criar mapas separados.

---

## Eficiência

Somente implementar nesta versão se reutilizar a mesma pipeline sem grande complexidade.

Objetivo:

distinguir:

```text
volume
vs.
proporção de ocorrência
```

Exemplo:

```text
Região A
20 ações
8 #
40%

Região B
6 ações
4 #
67%
```

Não inventar pesos para:

```text
# + = -
```

Se houver modo Eficiência:

```text
numerador =
ações com qualidade selecionada

denominador =
ações que atendem aos demais filtros
```

e taxa espacial/local.

Se isso exigir arquitetura nova grande:

**não implementar agora.**

Entregar Heatmap bem feito e deixar Eficiência para 0.3.x.

---

## Conferência manual final

Registrar ou usar ações em posições conhecidas:

- canto superior esquerdo;
- centro;
- fundo direito;
- perto da rede.

Conferir:

- Pontos;
- Jogadas;
- Heatmap;
- filtros;
- origem/destino;
- resize.

---

## Verificação final

Somente nesta macroetapa:

1. testes diretamente relacionados às mudanças V0.3;
2. `npm run typecheck`;
3. build uma vez;
4. suíte existente uma vez somente se houver necessidade real.

Não criar E2E novo apenas para “ter mais testes”.

---

# 5. CRITÉRIOS DA V0.3

## Gestão

- [x] cadastro local de atletas;
- [x] cadastro local de equipes;
- [x] histórico organizado de partidas;
- [x] partidas antigas preservadas;
- [x] Home sem lista infinita.

## Navegação

- [x] menu global simples;
- [x] workspace próprio da partida;
- [x] Registro, Resumo e Análise próximos;
- [x] saída clara para Partidas.

## Registro

- [x] quadra V2 preservada;
- [x] ações à esquerda;
- [x] qualidade à direita;
- [x] atletas abaixo;
- [x] origem → destino;
- [x] apenas um `Registrar ação`;
- [x] detalhe opcional de ação.

## Analytics

- [x] filtros combináveis;
- [x] por ação;
- [x] por atleta;
- [x] por qualidade;
- [x] por P quando disponível;
- [x] por atleta + P;
- [x] origem/destino;
- [x] mapa de pontos;
- [x] mapa de jogadas;
- [x] heatmap contínuo;
- [x] tabela detalhada secundária.

## Estabilidade

- [x] histórico preservado;
- [ ] spatial mantém precisão;
- [ ] nenhum segundo sistema espacial;
- [x] typecheck passa;
- [x] build final passa.

---

# 6. FORA DO ESCOPO DA V0.3

Não adicionar:

- login;
- nuvem;
- backend remoto;
- multiplayer;
- vídeo;
- tracking automático;
- IA;
- 3D;
- editor de dashboards;
- animações complexas;
- biblioteca visual pesada;
- reescrita total de domínio;
- sistema avançado de permissões.

---

# 7. CHANGELOG ALVO

## Gestão local

- atletas;
- equipes;
- histórico de partidas;
- reutilização de elencos.

## Navegação

- Home simplificada;
- menu global menor;
- workspace contextual da partida.

## Registro

- interface centrada na quadra V2;
- atleta + ação + qualidade + trajetória;
- confirmação única;
- detalhes opcionais.

## Analytics

- filtros combináveis;
- ação;
- atleta;
- qualidade;
- P;
- set;
- origem/destino;
- pontos;
- jogadas;
- heatmap contínuo.

---

# 8. ORDEM OBRIGATÓRIA

```text
MACRO 1
Cadastros + Partidas + Menu
        ↓
MACRO 2
Workspace da partida
        ↓
MACRO 3
Registro visual
        ↓
MACRO 4
Explorador editável
        ↓
MACRO 5
Heatmap + fechamento
```

Não antecipar.

---

# 9. COMANDO CURTO PARA USAR NO CODEX

Como este arquivo está dentro do repositório, o usuário não precisa colar a macroetapa inteira no chat.

Usar comandos curtos como:

```text
Leia SCOUT_TRAINER_V0.3_PLANO_REESTRUTURACAO_ENXUTO.md.
Consulte o ESTADO DA IMPLEMENTAÇÃO e execute somente a macroetapa atual.
Siga as regras de economia do próprio arquivo.
Ao terminar, atualize o estado e pare.
```

Para continuar depois:

```text
Continue o plano V0.3.
Leia primeiro apenas o ESTADO DA IMPLEMENTAÇÃO e a próxima macroetapa.
Não reaudite o projeto.
```

Para corrigir algo da etapa atual:

```text
Permaneça na macroetapa atual.
Corrija somente o problema descrito.
Não avance para a próxima macroetapa.
```

---

# 10. REGRA FINAL PARA O CODEX

> Este plano foi escrito para ser executado dentro do VS Code com foco em economia de contexto. Não trate o arquivo como uma solicitação para implementar toda a V0.3. Use o bloco `ESTADO DA IMPLEMENTAÇÃO` para se localizar, leia somente a macroetapa atual, inspecione somente arquivos diretamente relacionados e faça a menor mudança necessária. Não antecipe tarefas. Não execute auditorias ou testes globais durante cada etapa. Ao concluir a macroetapa, atualize o estado deste arquivo, informe o resultado e PARE.

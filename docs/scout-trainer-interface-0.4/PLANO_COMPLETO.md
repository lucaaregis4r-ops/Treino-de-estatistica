# Scout Trainer 0.4 — plano de interface para execução no Codex

Lucas Regis · 12/09/2026 · Direção proposta: ferramenta de análise de voleibol, com verde profundo, quadra de tom mineral e hierarquia clara.

## Como usar

1. Extraia esta pasta dentro de `docs/` do seu projeto. Caminho recomendado: `docs/scout-trainer-interface-0.4/`.
2. Abra `referencia/interface.html` no navegador. É uma referência de composição com dados fictícios e interações demonstrativas; não é uma implementação do Scout Trainer.
3. No Codex, com o repositório local aberto e o modelo escolhido por você, use o comando de `PROMPTS.md`. Comece pela U0.
4. Execute uma etapa por solicitação. Cada etapa deixa o projeto utilizável e atualiza `ESTADO.md`.
5. Para consultar tudo em um documento, use `PLANO_COMPLETO.md`. Para executar, o modelo deve ler apenas os documentos comuns e a etapa atual.

O plano foi escrito para reduzir ambiguidades de execução para o 5.6 Luna. Não depende de uma capacidade exclusiva desse modelo e não promete consumo, duração ou execução sem falhas. Especificação fechada + implementação pequena + verificação visual é a estratégia proposta. Um plano não substitui a inspeção da interface renderizada.

## Base e limite da análise

Foram analisadas as seis capturas enviadas: Início, Partidas, Registro gestual, Registro visual e duas posições da página Análise. Também foram consultados a árvore do repositório, `package.json`, componentes de telas e trechos dos componentes maiores e do CSS.

Referência remota: [Treino-de-estatistica, commit 7960bf4](https://github.com/lucaaregis4r-ops/Treino-de-estatistica/tree/7960bf4fe93f8d731e0ceaece314fabac253f89b), consultada em 12/09/2026. O `package.json` consultado indica 0.3.0. A tela enviada pelo usuário já mostra recursos posteriores, como Gestual e análises salvas. Portanto, o checkout local é a fonte de verdade para a execução. O código da aplicação não foi executado nesta elaboração; verificações do protótipo de referência não equivalem a testes do produto.

Não substituir o projeto local pelo remoto. Não reconstruir funcionalidades a partir de arquivos antigos. A etapa U0 reconcilia os caminhos e registra o que já existe. Os nomes de novos componentes neste pacote são propostas, e não afirmações de que já existem.

## Diagnóstico das capturas

| Evidência visível | Efeito na experiência | Decisão desta proposta |
|---|---|---|
| Nome enorme no Início e amplo vazio vertical | A entrada consome espaço antes de apresentar o trabalho disponível | Cabeçalho de 30 px, uma partida para retomar e lista útil logo abaixo |
| Botão limão repetido em todas as partidas | Muitas linhas parecem ter a mesma prioridade | Uma ação principal de página; ações das linhas com ênfase secundária |
| Rótulos e metadados muito pequenos no registro | Leitura exige atenção que deveria estar na jogada | Corpo de 14–16 px; contexto prioritário visível e demais dados sob comando explícito |
| Quadra castanha em registro e muitas caixas verdes encaixadas | A estrutura da ferramenta compete com a quadra | Uma superfície principal de captura, quadra mineral e agrupamento por espaço e divisórias |
| Seleções com tratamentos diferentes entre modos | Não fica igualmente evidente o que está escolhido | Estado selecionado com preenchimento, contorno e marca textual persistente |
| Placar aparece em mais de uma região e em tamanho pequeno | Contexto da partida fica disperso | Um cabeçalho de partida compartilhado e legível |
| Probabilidade ocupa o início da Análise; quadra fica abaixo | O acesso à distribuição espacial exige navegação vertical | Análise abre em Quadra; os outros grupos têm navegação própria |
| `excellent` e `serve` aparecem entre rótulos em português | Vocabulário interno chega à interface | Tradução centralizada de apresentação, preservando códigos e semântica |

Essas são avaliações de design sobre as capturas. Elas não demonstram como cada interação funciona nem permitem afirmar que a UI foi produzida por IA. O aspecto genérico decorre de decisões repetidas de hierarquia, composição e acabamento.

## Resultado desejado

Em poucos segundos, a pessoa deve reconhecer: qual partida está aberta, qual é o placar, qual ação está preparando, qual atleta ou ausência de identificação está selecionado, e se o registro foi concluído. A identidade vem da organização do trabalho do voleibol: placar, quadra, rotação, trajetória e leitura dos eventos.

Escopo: aparência, organização das telas, clareza de estados, navegação interna e acessibilidade dos fluxos existentes. Manter os quatro modos locais, registro sem atleta, cobertura de equipes, trocas, histórico, filtros, análises salvas, seleção de gráficos e exportações que já estiverem implementados. Aplicar acabamento consistente às telas não mostradas nas imagens depois de inspecioná-las.

Funcionalidades ausentes, mudanças de regras de voleibol, novos cálculos, autenticação, nuvem, sincronização, nova biblioteca visual e nova arquitetura de persistência ficam fora deste redesenho. Registrar uma lacuna encontrada e continuar as partes independentes. Não criar botões de funções que o produto não oferece.

---

# Contrato de design

## 1. Identidade definida

Manter o nome Scout Trainer e os ativos de marca já existentes. Usar superfícies de verde dessaturado, tipografia de sistema, quadra clara de tom mineral no registro e verde neutro na análise de calor. O limão permanece como assinatura pontual. Não criar gradientes decorativos, brilhos, vidro, sombras contínuas, emojis em controles, fundo quadriculado ou cartões de marketing.

Originalidade: placar com números tabulares, título da ação junto à quadra, origem vazada e destino preenchido, sequência de eventos em linhas e posição P1–P6 apresentada como dado tático. Não desenhar um segundo conjunto de zonas para enfeitar a quadra. Não gerar textura, ilustração ou imagem para substituir controles.

### Paleta e papéis

| Token proposto | Valor | Uso |
|---|---|---|
| `--st-bg` | `#101715` | Fundo geral |
| `--st-surface` | `#18211E` | Superfície de trabalho |
| `--st-surface-raised` | `#223029` | Hover, seletores e elementos elevados |
| `--st-text` | `#F2F4EE` | Texto principal |
| `--st-muted` | `#A8B7AC` | Texto secundário legível |
| `--st-border` | `#35483E` | Divisórias estruturais discretas |
| `--st-control-border` | `#799185` | Limite de controles quando necessário para reconhecê-los |
| `--st-accent` | `#D8F36A` | Ação principal e seleção de qualidade/atleta |
| `--st-accent-text` | `#17200E` | Texto sobre limão |
| `--st-team-a` | `#83B6EB` | Identificação de A em dados e marcas |
| `--st-team-b` | `#D3A6D5` | Identificação de B em dados e marcas |
| `--st-danger` | `#FFAA9E` | Erro e ação destrutiva |
| `--st-warning` | `#F2CB80` | Pendência que exige atenção |
| `--st-success` | `#B8DDAD` | Registro concluído |
| `--st-court` | `#D6C9AA` | Piso da quadra no registro |
| `--st-court-line` | `#625B49` | Linhas da quadra clara |
| `--st-court-marker` | `#213B30` | Trajetória e pontos sobre piso claro |

Usar o limão no CTA principal e nos controles selecionados do rascunho. Navegação ativa usa texto claro e sublinhado; não tornar toda aba ativa mais um botão limão. Cores de equipes acompanham seus IDs, não o lado físico da tela, o sacador ou a equipe observada. Distinguir equipe, qualidade e resultado; verde de confirmação não quer dizer Equipe A.

`referencia/tokens.css` é a fonte dos valores desta proposta. Integrar esses valores aos tokens locais; não manter dois temas concorrentes. Os aliases antigos podem apontar temporariamente para os novos tokens durante a migração.

### Tipografia, geometria e componentes

| Elemento | Especificação |
|---|---|
| Fonte | `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`; usar Inter somente se disponível localmente; sem download obrigatório |
| Corpo | 14 px desktop, 16 px em formulário móvel; entrelinha 1,45 |
| Título de página | 30 px / 1,15 / 650; 26 px abaixo de 768 px |
| Título de seção | 18 px / 1,3 / 600 |
| Placar principal | 32 px desktop, 26 px em tela compacta; números tabulares |
| Contexto/legenda | 12 px / 1,4; nada operacional menor que 12 px |
| Espaçamento | 4, 8, 12, 16, 24, 32 e 48 px; evitar valores isolados sem justificativa geométrica |
| Cantos | 6 px controles; 10 px superfícies principais; quadra sem arredondamento geométrico |
| Botão | 40 px de altura padrão; captura 44 px, 48 px para toque; ícone isolado com área 44 × 44 px |
| Borda | 1 px em estrutura; foco de 2 px com afastamento 2 px; seleção de 2 px reservada previamente |
| Movimento | Transição de cor/opacidade de 120 ms; sem deslocamento, escala ou animação de entrada; respeitar movimento reduzido |
| Largura | Páginas gerais até 1200 px; partida até 1440 px; margens 24 px, 16 px em telas menores |

Uma borda deve identificar um controle ou separar regiões úteis. Não colocar uma caixa dentro de outra apenas para criar profundidade. Gráficos, listas e cabeçalhos ficam predominantemente sem moldura. Os estados não podem mudar a medida do botão ou deslocar a quadra.

## 2. Composição das telas

### Início

Cabeçalho global de 56 px com marca à esquerda e Início, Partidas, Cadastros, Treino e Manual. Conteúdo começa 24 px abaixo. Título `Seu espaço de scout`; descrição de uma linha: `Retome uma partida ou comece um novo registro.`; CTA `Nova partida` à direita.

Abaixo: uma faixa de retomada, de aproximadamente 120 px, somente se houver partida em andamento. Exibir nome, data conhecida, estado e `Continuar registro`. Escolher a mais recente pelo campo existente de atualização; se só existir `createdAt`, ordenar por criação e nunca rotular como última atividade. Não carregar todos os históricos de eventos para construir a Home. Não inventar placar se a listagem não o fornece.

Depois: lista de até cinco partidas, com nome, data, perfil traduzido e estado; `Ver todas` no cabeçalho. Ações secundárias `Iniciar treino` e `Importar backup` abaixo. Formato JSON fica na ajuda do seletor, não no título do botão. Se houver retomada, `Nova partida` fica secundário e `Continuar registro` é o CTA principal. Sem dados: um único estado vazio explicativo com `Nova partida`, sem indicadores zerados de enfeite.

### Partidas

Título 30 px e `Nova partida` no mesmo cabeçalho. Filtro por nome e estado (`Todas`, `Em andamento`, `Finalizadas` e `Criadas` se esse estado existir), usando apenas os metadados já carregados. Campos agrupados numa linha de 44 px, com rótulos acessíveis e contagem do resultado.

Linhas com 72–88 px, divisória sutil e colunas: Partida (flexível), Data (112 px), Perfil (120 px), Estado (140 px), Ações (largura do conteúdo). Não fazer a linha inteira um botão contendo outros botões. Nome é link/botão de abertura e ações são controles irmãos. `Continuar`/`Abrir` e `Resumo` são secundários; nenhum botão limão por linha. Não mostrar ID técnico ao usuário.

Em 768–1023 px, perfil e data podem ir na segunda linha da identificação. Em menos de 768 px, usar lista sem tabela apertada: nome, metadados e ações em duas ou três linhas. Nenhuma informação importante desaparece sem acesso alternativo. Busca sem resultado é diferente de não haver partidas.

### Partida: estrutura comum a Registro, Resumo e Análise

Substituir o cabeçalho global durante uma partida por um cabeçalho de 64 px: voltar a Partidas; nome e placar; set e sets vencidos; navegação `Registro / Resumo / Análise`. Consolidar os placares redundantes do cabeçalho e do corpo. Conservar placares históricos por set no Resumo.

Faixa de contexto de 48 px, podendo crescer para duas linhas: equipe da ação/cobertura, sacador e rotação. `Detalhes da partida` revela levantador, posição do levantador, perfil e ajustes. Cobertura permanece acessível e mostra o valor atual; não confundir cobertura com equipe ativa do próximo evento. `Ajustar placar` fica em contexto secundário. Se a partida precisa de correção, exibir texto e ação de correção; não ocultar essa pendência num toast temporário.

Prioridade em 1366 × 640 CSS px: cabeçalho, ação, atleta, qualidade, quadra e conclusão do rascunho ficam visíveis sem rolagem vertical na situação normal. Esse viewport aproxima a área útil do navegador nas capturas de 1366 × 768; as barras do sistema e navegador não são área do aplicativo. Histórico extenso e configurações podem ficar abaixo.

### Registro

Grade desktop com duas regiões: área principal `minmax(0, 1fr)` e escalações de 256 px; gap 20 px. Dentro da principal: controles de ação/atleta de 196 px e quadra flexível; gap 16 px. Na referência de 1366 px há cerca de 806 px para a quadra na largura completa disponível, dependendo dos controles efetivamente presentes. O cálculo real da U3 prevalece sobre esse valor indicativo: a quadra deve caber também na altura disponível, mantendo 2:1. Não usar o limite geral de 1200 px no espaço de partida.

Acima da captura: seletor compacto dos modos existentes e texto `Ação atual: Saque — Equipe A`. Modo ativo é evidente, mas não domina o título da ação. Não mudar o modo escolhido ao redimensionar.

Controles: tipo da ação, atleta e qualidade na mesma sequência entre os modos. O modo pode determinar quantos controles são necessários. No Gestual, manter o encadeamento já implementado; não forçar todos os botões do Visual. Atletas em uma grade de três colunas; usar número destacado e nome acessível. `Sem atleta identificado` é uma opção persistente no mesmo grupo, nunca uma mensagem de erro.

Qualidade: símbolos existentes acompanhados de seus rótulos do perfil e da ação. `#` e `=` não recebem interpretação universal: em ataque podem corresponder a ponto e erro, mas a recepção pode ter outra semântica. Usar o registro de perfis do projeto. Na seleção, mostrar símbolo, rótulo e marca de selecionado. Evitar texto excessivo usando duas linhas dentro do botão quando necessário.

Quadra: retângulo de 18 × 9, razão 2:1, linha central em 50% e linhas de ataque em 33,333% e 66,667% da largura. Identificação explícita das equipes e dos lados reais, derivada do estado da partida. A orientação dos dados e a projeção existentes são preservadas. Não rotacionar fisicamente a superfície por CSS para mudar de lado.

Origem: círculo vazado. Destino: círculo preenchido. Trajetória: linha de 2 px; áreas interativas existentes não encolhem. Linhas e marcadores visuais não interceptam eventos de ponteiro. Rótulos e padding ficam fora do retângulo que normaliza coordenadas. Nenhuma zona proíbe clique por ação, atleta, equipe ou lado. Não adicionar uma área externa de coleta sem suporte já existente no domínio.

Abaixo da quadra: uma mensagem de estado de linha única e controles do rascunho. `Refazer trajetória` limpa somente a captura espacial; `Cancelar rascunho` descarta o rascunho e preserva eventos concluídos; `Desfazer última ação` age no histórico e é visualmente separado. Se os handlers atuais não distinguem as operações, registrar e corrigir a ligação na U4, sem mudar o motor.

Barra de conclusão no fluxo da área principal: resumo como `Ataque · #08 · # Ponto · Trajetória pronta`, `Registrar ação` e dica `Enter`. Só aparece como comando necessário nos modos que exigem confirmação explícita. Se um modo já conclui automaticamente a ação, mostrar seu retorno e não acrescentar uma confirmação. `onConfirm` da quadra pode significar apenas metadado pronto: conferir o caminho até a persistência antes de removê-lo ou adicionar um botão.

Escalações: equipe e estado sacando/recebendo; posições em 3 × 2 na convenção existente. Número do atleta em destaque; P1–P6 como contexto. Sacador e levantador têm etiquetas textuais curtas ou ícones com legenda, sem depender só de cor. `Substituir` abre o fluxo existente; alvo sai e entra ficam claros. Não inferir que jogador da rede não pode defender/passar. Destaques são sugestões, não restrições.

Últimas ações: cinco linhas compactas abaixo da captura, com equipe, ação, atleta ou `Sem atleta`, avaliação e opções existentes. `Ver histórico` acessa a lista completa. Preservar correção, desfazer/refazer e paginação. Não montar um novo histórico paralelo.

### Resumo

Conservar o cabeçalho da partida. Corpo com placares por set, estatísticas por equipe e navegação para análise. Consolidar métricas em uma tabela comparativa ou nos agrupamentos reais já existentes; não criar indicadores artificiais. Um único ponto de entrada `Exportar` apresenta os formatos realmente suportados e respeita `busy`/capacidade do ambiente. Configurações de pasta e pacote de arquivos ficam na região de exportação, mantendo o retorno de sucesso e erro.

### Análise

Navegação local: `Quadra`, `Desempenho`, `Distribuição` e `Evolução`, somente para grupos existentes. Padrão `Quadra`. Desempenho reúne equipe/rotação; Distribuição reúne levantamento, repetição e distribuição de ataque; Evolução contém probabilidade. Preservar acesso às tabelas/indicadores adicionais sem inventar novos cálculos.

Quadra: título `Distribuição em quadra` com contagem; filtros de equipe, ação, avaliação, atleta e set; `Mais filtros` contém posição do levantador e os filtros secundários existentes. `Origem / Destino` permanece visível. Abaixo, seletor `Pontos / Mapa de calor / Trajetórias`. Não chamar a contagem de ações de amostra visível se algumas não têm a coordenada selecionada: exibir `18 ações no recorte · 15 com destino registrado`, com números efetivos.

Em desktop, região da quadra flexível e painel de 256 px à direita para recorte ativo e análises salvas. Em tablet, o painel vai abaixo. Quadra até 840 px de largura, 2:1, legenda de intensidade quando aplicável. Ajustes de raio/intensidade ficam em `Ajustar mapa de calor`; sua configuração e interpretação atuais são preservadas. Não trocar algoritmo, normalização, orientação ou escala para produzir um desenho visualmente mais atraente. Nenhum dado sintético entra nos relatórios reais.

Análises salvas: lista com nome, seleção atual, `Salvar análise` e comandos existentes. Salvar usa o escopo atual de partida/equipe, confirma somente após sucesso e identifica modificações ainda não salvas. Preservar filtros ao navegar entre as seções; manter os componentes montados ou elevar apenas o estado de apresentação necessário. Não criar persistência nova se o recurso estiver ausente localmente.

Inclusão no relatório: onde existir, usar uma caixa de seleção rotulada `Incluir no relatório` em cada gráfico elegível, e mostrar contagem na ação de exportar. Preservar IDs estáveis dos gráficos, vínculo aos filtros e snapshot/comportamento atuais. Não implementar uma segunda seleção só visual. Se a infraestrutura estiver ausente, documentar a lacuna; não entregar controle decorativo.

Gráficos: título claro, recorte, número de observações disponível, eixos/unidades e legenda legível. Percentuais com vírgula e uma casa quando necessário. Probabilidade fica em Evolução, com eixo 0–100% e sequência dos pontos, mantendo a indicação de estimativa baseada no estado do jogo. Não chamar probabilidade de previsão validada. Pontos sem observação não viram zero.

### Cadastros, nova partida, treino e manual

Usar os componentes e tokens compartilhados. Formulários até 720 px; até duas colunas em desktop, uma em celular; labels explícitos, validação perto do campo e ação final clara. Cadastro extenso usa lista/tabela legível com ações existentes. Nova partida mantém passos e valores padrão locais; não transformar o fluxo em wizard novo. Treino preserva correção e feedback. Manual mantém conteúdo e passa a ter largura de leitura de até 76 caracteres e links internos legíveis. Telas não inspecionadas nas capturas recebem acabamento conservador, condicionado à leitura local.

## 3. Estados e responsividade

| Estado | Retorno visual e comportamental |
|---|---|
| Disponível | Fundo neutro, texto legível; ação alcançável por teclado |
| Hover | Superfície elevada, sem deslocamento |
| Foco | Contorno de 2 px, sem esconder texto ou foco sob cabeçalho |
| Selecionado | Preenchimento definido, contorno e marca/label; refletir o estado real com `aria-pressed` ou controle nativo adequado |
| Desabilitado | Atributo nativo e motivo próximo quando não óbvio; não usar só opacidade no wrapper |
| Rascunho incompleto | Dizer o que falta segundo as regras reais do modo, sem erro prematuro |
| Salvando | `Registrando…`, bloqueio de reenvio; manter dados do rascunho até sucesso |
| Sucesso | `Ação registrada`, confirmação discreta via região de status; foco preparado para próxima ação |
| Falha | Mensagem persistente e legível, preservação do rascunho, caminho para tentar novamente |
| Sem dados | Contexto específico e ação existente; sem gráficos fictícios ou percentuais 0 inventados |

Desktop ≥1280: captura e escalações lado a lado. 1024–1279: escalações abaixo, controles da ação compactados em faixa; preservar espaço da quadra. 768–1023: seleção e quadra em fluxo vertical, escalações em duas colunas abaixo. <768: uma coluna, controles de toque de 48 px, escalações em seção expansível; não reduzir todo o desktop por `transform: scale`.

Em viewport baixo, permitir rolagem natural em vez de cortar o registro ou diminuir fonte. Não fixar todo o aplicativo em `height: 100vh; overflow: hidden`. Se uma barra inferior for sticky, reservar sua altura, usar safe area quando disponível e validar que o foco não fique coberto. A quadra deve continuar sendo a mesma instância; evitar duplicar DOM para desktop/mobile e causar eventos dobrados.

Alvo de projeto: ações críticas com pelo menos 44 × 44 CSS px, 48 px em toque. Isso adota o tamanho reforçado de 44 px, não afirma que ele seja o mínimo AA universal. Textos comuns devem ter contraste de pelo menos 4,5:1; textos grandes, 3:1. Fontes: [W3C, contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) e [W3C, alvo reforçado](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html).

Atalhos e botões selecionáveis devem anunciar o estado e operar por teclado. Para toggles, usar semântica consistente com [W3C, Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/). Não afirmar conformidade integral com WCAG apenas por esses critérios. Atalhos de scout não atuam enquanto a pessoa digita em campo, usa IME, ou interage com modal incompatível; preservar as exceções existentes.

---

# Mapa técnico e limites de implementação

## Estrutura remota observada

React + TypeScript + Vite, Recharts, Vitest, Testing Library e Playwright. CSS próprio, persistência local e empacotamento Electron constam da estrutura. Não há motivo demonstrado para instalar outra stack para este redesenho. O navegador das capturas usa `localhost:5173`.

| Responsabilidade | Caminhos verificados no remoto | Como usar na execução |
|---|---|---|
| Navegação e estado superior | `src/ui/app/App.tsx` | Extrair chrome de UI preservando handlers, instâncias de serviços e estado |
| Estilos gerais | `src/ui/app/app.css` | Migrar seletivamente; cerca de 69 KB no remoto consultado; nunca anexar uma nova camada de overrides ao fim a cada etapa |
| Início / histórico | `src/ui/screens/home/HomeScreen.tsx`; `src/ui/screens/matches/MatchesScreen.tsx` | Manter contratos de abertura, importação e `busy` |
| Registro | `src/ui/screens/scout/ScoutScreen.tsx` | Orquestração existente; evitar reescrever o componente inteiro |
| Contexto / modos | `ScoreHeader.tsx`; `MatchContextBar.tsx`; `ScoutModeSelector.tsx`, no mesmo diretório scout | Consolidar cabeçalho e mapear modo Gestual no checkout local |
| Captura visual / espacial | `VolleyballVisualScout.tsx` e `.css`; `VisualScoutForm.tsx`; `SpatialCourtInputV2.tsx` e `.css` | Mudar composição e apresentação sem perder handlers e metadados |
| Geometria auxiliar | `courtGeometry.ts`; `TacticalCourt.tsx`; `MiniCourt.tsx`, no diretório scout | Identificar qual componente é efetivamente usado em cada modo |
| Escalações / histórico | `CourtLineup.tsx`; `NextSetLineupEditor.tsx`; `EventTimeline.tsx` | Reutilizar trocas, evolução do set, desfazer/refazer e correções |
| Resumo / análises | `src/ui/screens/summary/SummaryScreen.tsx`; `MatchAnalyticsPanel.tsx`; `SpatialAnalyticsPanel.tsx` e `.css` | Reorganizar superfícies e preservar recortes e exportação |
| Heatmap | `src/ui/screens/summary/HeatmapLayer.tsx`; `heatmap.ts` | Contrato de projeção/algoritmo protegido |
| Gráficos | `src/ui/screens/summary/charts/` | Reutilizar Recharts e gráficos locais; uniformizar apresentação |
| Telas restantes | `match-setup/NewMatchScreen.tsx`; `registrations/RegistrationsScreen.tsx`; `training/TrainingScreen.tsx`; `manual/ManualScreen.tsx`; `profile-editor/ProfileEditorScreen.tsx`; `free-log/FreeLogScreen.tsx`, sob `src/ui/screens/` | Migrar com leitura local do fluxo |
| Metadados de partida | `src/domain/match/entities/MatchMetadata.ts` | O remoto tem `createdAt`, nome, perfil e status; não tem placar nem `updatedAt` nesse contrato |
| Testes existentes | `src/ui/app/AppFlow.test.tsx`; testes próximos das telas; `e2e/critical-flow.spec.ts` | Selecionar por risco; adaptar expectativas comportamentais legítimas |

Há também um arquivo vazio `src/ui/scout/MiniCourt.tsx` no remoto. Não confundi-lo com `src/ui/screens/scout/MiniCourt.tsx`. A raiz remota contém um arquivo chamado ` AGENTS.md`, com espaço inicial. Ler também esse arquivo, se existir localmente, sem renomeá-lo nesta tarefa. Suas instruções incluem leitura prévia, mudanças precisas, verificação funcional e lint/typecheck.

## Arquitetura de UI proposta

Antes de criar, buscar componente equivalente. Diretórios abaixo são candidatos, sujeitos ao mapa U0:

| Local proposto | Conteúdo limitado |
|---|---|
| `src/ui/styles/tokens.css` | Variáveis de tema e geometria; aliases transitórios |
| `src/ui/components/ui/` | Button, Field, ChoiceGroup, StatusMessage e EmptyState quando houver reutilização real |
| `src/ui/components/layout/` | AppHeader, PageHeader e MatchHeader se ainda não houver equivalentes |
| Estilo de cada tela | Regras com prefixo da tela; sem selecionar globalmente todos os `section`, `button` ou `svg` |
| `src/ui/screens/scout/` | Componentes de apresentação extraídos da captura somente quando simplificam a edição |

Responsabilidade: estado da partida → seletores existentes → propriedades dos componentes → eventos de UI → handlers existentes → serviço existente. Componentes visuais não gravam diretamente em IndexedDB e não calculam pontuação/rotação. Não espelhar o workspace num segundo estado React.

CSS: manter o reset global numa única origem. Carregar tokens uma vez e migrar os seletores da tela em execução. Remover a regra antiga correspondente quando substituir; buscar duplicações antes de finalizar. Evitar `!important`, atributos inline usados como tema e novos hex soltos. Cores científicas do heatmap, dados de séries e assets podem precisar de tratamento próprio documentado.

## Contratos protegidos

Preservar schemas e IDs de partidas, atletas, equipes, eventos, avaliações e análises. Não alterar reducers, cálculo de rally/placar/rotação, regras de substituição, parsers, fórmulas analíticas e semântica dos símbolos. Preservar eventos sem atleta e cobertura parcial. Não converter atleta ausente em jogador fictício, camisa zero ou primeiro nome da lista.

Preservar coordenadas normalizadas: em cada modo, medir o retângulo correto com `getBoundingClientRect`; overlay e área clicável devem se referir ao mesmo retângulo. Uma quadra mais bonita que muda o destino de um clique é regressão. Não alterar x/y existentes por troca visual das equipes. Pontos fora da superfície continuam seguindo o contrato local; não introduzir clamp diferente ou área extra nesta tarefa.

Preservar filtros, salvamento e seleção para relatório onde já existem. O `onConfirm` de um componente pode completar apenas a geometria, enquanto `onRegister` grava a ação; mapear esse encadeamento na U0. Uma intenção de registrar deve produzir exatamente um evento confirmado.

Na captura remota, `SpatialCourtInputV2` chama `onConfirm` após o segundo clique. Isso não prova que a ação inteira foi persistida. Não apagar o botão final antes de conferir o consumidor local. O modo Gestual das capturas não está no seletor remoto de três modos; localizar sua implementação local em vez de recriá-la.

Não mexer em dependências, lockfile, empacotamento, service worker e publicação sem necessidade demonstrada. Manter funcionamento offline sem fontes/CDNs novas. Não executar `npm audit fix`, `npm update`, formatação do repositório inteiro, limpeza de storage, reset destrutivo ou instalação de navegador a cada etapa.

## Protocolo de execução para o Luna

Uma etapa por vez. Ler `ESTADO.md`, a etapa pedida e o contrato de design correspondente ao seu escopo. Consultar este mapa na primeira execução e novamente somente quando precisar de um caminho ou limite técnico. Reusar o inventário U0; pesquisar novamente somente se um caminho mudou ou uma dúvida impedir a implementação. Não ler todos os documentos históricos do projeto a cada solicitação. Não usar subagentes neste plano.

Antes de editar: `git status --short`, ler instruções aplicáveis e os arquivos do escopo. Não sobrescrever alterações do usuário. Usar branch de interface quando a situação de trabalho permitir, sem trocar ou limpar uma árvore que tenha trabalho em andamento. Registrar branch/commit local em U0; nenhum push/merge/deploy faz parte da execução.

Comandos confirmados no `package.json` remoto: `npm run dev`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`. Validar scripts locais antes do uso. Lint e typecheck após mudanças de código, conforme instruções do projeto; testes dirigidos quando afetarem comportamento. Não rodar a suíte completa após cada troca de cor. U7 roda as portas finais uma vez e repete somente falhas corrigidas.

Se dependências faltarem, usar o lockfile e gerenciador existentes. Uma tentativa de instalação com timeout explícito de 5 minutos, resumindo a saída, sem loops automáticos. Se falhar por rede/ambiente, registrar o erro e continuar somente verificações possíveis. Não marcar como validado aquilo que não rodou. Não usar dados reais como fixture de teste nem apagar a base local.

Toda etapa termina com: mudança concreta, arquivos alterados, verificações executadas/resultados, pendências reais, próxima etapa. Atualizar `ESTADO.md` e registrar captura antes/depois das telas alteradas quando o ambiente permitir. Não expandir o trabalho para corrigir bugs antigos sem relação; classificá-los em separados do que a etapa introduziu.

---

# U0 — Inventário do código local

Objetivo: transformar as referências remotas em um mapa confiável do checkout atual, sem modificar a aplicação.

Ler: instruções aplicáveis, `package.json`, scripts, `App.tsx`, imports da captura/analíticas e os contratos citados no mapa. Localizar com `rg` os textos `Gestual`, `Sem atleta`, `Cobertura`, `Salvar análise`, `Incluir no relatório`, `onConfirm` e `onRegister`. Ler somente os componentes e handlers relevantes, não o repositório inteiro.

Executar:
1. Registrar branch, commit, situação da árvore e alterações preexistentes em `MAPA_LOCAL.md`, criado nesta pasta de plano.
2. Preencher uma tabela: função, caminho local, componente, estado proprietário, callback de escrita, teste existente. Cobrir cada modo de entrada; quem calcula coordenadas; quem confirma rascunho; quem grava evento; quem controla substituições; onde os filtros/análises/relatórios são salvos.
3. Inspecionar importação e ordem dos estilos; apontar os seletores que geram header, hero, painéis, quadra e botões selecionados. Identificar estilos globais duplicados antes de acrescentar CSS.
4. Rodar a aplicação com dependências existentes e capturar Início, Partidas, cada modo de Registro e Análise em 1366 × 640. Se não for possível, descrever o bloqueio; não afirmar que o layout local foi visto.
5. Identificar fixture sintética reproduzível: partida vazia, partida em andamento, finalizada, eventos sem atleta, duas equipes, ações espaciais e análise salva. Reusar fixtures existentes. Nunca limpar a base do usuário para criar o cenário.
6. Registrar baseline de lint/typecheck e testes focados de fluxo já existentes. Registrar falhas anteriores por comando, sem tentar saneamento global.
7. Mapear lacunas: recursos vistos na captura mas ausentes neste checkout, rotas extras e limitações de metadados. Usar adaptações do mapa; nenhuma lacuna autoriza remover recurso encontrado.

Saída: `MAPA_LOCAL.md` e `ESTADO.md` atualizados; lista de caminhos confiáveis e forma de validar as próximas etapas. Concluir U0 quando todos os fluxos críticos tiverem fonte identificada ou bloqueio explícito. Nenhuma modificação em `src/`, dependências ou dados nesta etapa.


---

# U1 — Tokens e controles compartilhados

Objetivo: implantar a linguagem visual sem redesenhar as telas inteiras.

Entrada: U0 concluída; contrato de design e mapa local. Escopo: tema central, reset existente, componentes compartilhados e apenas consumidores necessários para demonstrar que funcionam.

Executar:
1. Integrar `referencia/tokens.css` ao sistema local de estilos. Se houver tokens equivalentes, atualizar a origem existente. Criar aliases antigos temporários com comentário e consumo identificado.
2. Definir fonte, escala tipográfica, foco, altura de botões, raios e espaços. Não usar seletor global que imponha altura a botões da quadra ou modais sem avaliar seus consumidores.
3. Padronizar três níveis de botão: principal limão, secundário neutro, discreto textual. Preservar tipo (`button`/`submit`), disabled, nomes acessíveis, refs e eventos.
4. Implementar ou ajustar grupo selecionável controlado. O valor vem do estado real do pai. Definir disponível, hover, foco, pressionado, selecionado e disabled sem mudança de largura/altura. A marca de selecionado acompanha o estado visual e acessível.
5. Unificar mensagens de vazio/erro/status apenas onde haja duplicação real. Não criar uma biblioteca de componentes antecipadamente.
6. Consolidar traduções de apresentação para skills/avaliações a partir dos perfis locais. Não aplicar replace indiscriminado em `serve`, `set`, `excellent` ou símbolos no domínio.

Verificar: contraste dos pares de cores usados; foco visível por Tab; toggles operam por teclado; controles não mudam de tamanho ao selecionar; formulário não submete por botão incidental. Lint/typecheck e um teste de comportamento se o controle reutilizado mudar de semântica. Não testar valores hex em unitários.

Concluída quando: controles reais mostram estado escolhido claramente, não existem duas fontes ativas para o mesmo token e telas existentes continuam navegáveis. Capturar uma tela real com estados, não criar uma rota pública de catálogo de componentes.


---

# U2 — Navegação, Início e Partidas

Objetivo: tornar a entrada uma área útil de trabalho e o histórico uma lista legível.

Entrada: U1 concluída. Escopo principal verificado: `App.tsx`, `HomeScreen.tsx`, `MatchesScreen.tsx` e seus estilos/componentes de apresentação.

Executar:
1. Aplicar o cabeçalho global de 56 px, navegação com texto e sublinhado e limite de 1200 px. Preservar destinos, retorno do Manual e estados de serviço.
2. Remover o hero de título gigante e centralização vertical. Construir cabeçalho, retomada, lista recente e importação segundo o contrato. Componente de retomada não busca todos os eventos de cada partida.
3. Garantir que a partida destacada abre pelo ID correto e que a ordenação usa o campo local efetivamente disponível. Se só houver data de criação, apresentá-la como data da partida/criação.
4. Reorganizar Partidas em linhas sem cartões independentes. Usar status textual e ações secundárias. Implementar busca por nome normalizada e filtro por estado sobre dados já carregados, sem alterar schema ou infraestrutura.
5. Tratar sem partidas, busca sem resultado, nome longo, perfil sem tradução conhecida, importação em andamento e erro de importação. O fallback do perfil deve ser legível sem mudar seu ID.
6. Tornar o input de importação acionável por teclado com botão/label acessível; permitir reimportar o mesmo arquivo quando esse era o contrato existente.

Verificar: abrir/continuar a partida correta; abrir Resumo; criar partida; importar backup sintético válido e apresentar falha de um inválido sem apagar dados; busca/filtro; navegação por teclado. Usar teste de fluxo existente ajustado se mudar o caminho de navegação. Lint/typecheck.

Concluída quando: em 1366 × 640, cabeçalho, retomada e início da lista ficam visíveis; não há título gigante, uma sequência de CTAs limão nas linhas ou elementos cortados em 390 px. Alterações visuais não criam destinos sem função.


---

# U3 — Espaço da partida e quadra

Objetivo: dar prioridade ao contexto e à quadra, sem mudar os eventos de captura.

Entrada: U2 concluída. Ler a composição do cabeçalho em App e ScoutScreen e os consumidores reais de ScoreHeader, MatchContextBar, SpatialCourtInputV2 e do modo Gestual localizado na U0.

Executar:
1. Consolidar MatchHeader, placar e navegação Registro/Resumo/Análise. Remover apenas duplicação visual de placar atual; manter scores históricos por set. Cabeçalho não adiciona listener de registro.
2. Implementar a faixa de contexto com cobertura e sacador legíveis, detalhes secundários e aviso de correção acionável.
3. Montar a grade desktop do contrato; ativar os breakpoints por CSS sem desmontar/remontar controladores de modo. Usar `min-width: 0` e proporção estável na região da quadra.
4. Aplicar piso mineral e linhas proporcionais à captura. Reusar o desenho/geometria que já existe; compartilhar apenas a apresentação se isso não alterar contratos entre input, mini-quadras e análise.
5. Colocar origem, destino e linha no mesmo sistema de coordenadas. Padding/rótulos ficam fora do retângulo medido; overlays não recebem cliques. Evitar arredondar o retângulo da quadra que captura cantos.
6. Posicionar os controles de conclusão no fluxo da captura; não mudar quando cada modo confirma. Reservar espaço para histórico e escalações sem forçar scroll interno duplo.

Verificação de risco obrigatória: com retângulo conhecido, clique/gesto próximo de (0,05;0,05), centro (0,5;0,5) e (0,95;0,95) produz as mesmas coordenadas normalizadas antes/depois, com erro visual ≤2 CSS px; linhas de ataque e centro coincidem entre marca e superfície. Conferir depois de resize e scroll. Esses pontos são fixture de QA, não regiões permitidas. Verificar cada modo espacial local sem acrescentar automação extensa se testes existentes cobrem os handlers.

Validar captura em 1366 × 640, 1024 × 768 e 390 × 844. Lint/typecheck e testes direcionados de projeção/captura existentes. O cenário comum em desktop deve mostrar o núcleo do registro; zoom e nomes extensos podem exigir crescimento natural.

Concluída quando: existe um contexto de partida claro, quadra mantém 2:1 e x/y corretos, não surge confirmação adicional e a navegação preserva o workspace.


---

# U4 — Seleção, retorno do registro e trocas

Objetivo: eliminar ambiguidade de seleção e manter o ritmo da coleta.

Entrada: U3 concluída. Escopo: controles dos modos locais, VolleyballVisualScout/VisualScoutForm ou equivalentes, captura gestual local, CourtLineup, EventTimeline e estilos. Serviços e regras esportivas permanecem intactos.

Executar:
1. Aplicar o mesmo vocabulário visual a ação, atleta, qualidade e modo. Estado selecionado permanece após soltar o mouse/tecla e corresponde ao draft, não a `:active`.
2. Mostrar símbolos com seus significados corretos para ação/perfil. Para tecla válida, atualizar o mesmo valor que o botão correspondente. Tecla repetida não pode gerar dupla gravação.
3. Integrar `Sem atleta identificado` ao grupo de atletas. Seleção explícita sem atleta não é sobrescrita pela sugestão de sacador; manter a política local de preenchimento automático documentada na U0.
4. Ligar estados de rascunho vazio, origem escolhida, trajetória pronta, incompleto, registrando, sucesso e falha aos estados existentes. Separar `Refazer trajetória`, `Cancelar rascunho` e `Desfazer última ação` conforme seu alcance. Não transformar o redesenho numa nova máquina de estados do domínio.
5. Conferir o caminho completo da confirmação em cada modo. Preservar automático onde houver e confirmação explícita onde exigida. Um gesto/Enter/clique de registro produz um evento; busy impede reenvio; erro preserva rascunho.
6. Uniformizar escalações e rótulos de função. `Substituir` abre o editor local com atleta que sai evidente e seleção de quem entra; mostrar resumo e resultado. Troca de líbero e limitações reais continuam no fluxo existente. Não criar regras novas nem simular troca só na interface.
7. Compactar últimas ações em linhas; manter acesso ao histórico completo, correção e desfazer/refazer. Confirmar qual é a última ação antes de exibir o retorno do desfazer.

Verificar com testes dirigidos de comportamento: botão e tecla atualizam a mesma qualidade; sem atleta gera evento com ausência preservada; uma intenção gera um evento; falha não apaga draft; seleção ativa não é perdida por resize; trocar atleta altera a escalação correta; desfazer não confunde rascunho e histórico. Reusar fixtures e contadores existentes. Verificar teclado em input de texto e modal para evitar acionamento indevido.

Concluída quando: todos os modos existentes mostram seleção evidente, retorno de sucesso e erro legível, trocas acessíveis e ausência de regressão no fluxo de registro. Lint/typecheck e somente testes necessários ao comportamento alterado.


---

# U5 — Análises, resumo e relatório

Objetivo: transformar a Análise em um espaço de exploração organizado, preservando resultados e análises já salvas.

Entrada: U4 concluída. Escopo verificado: SummaryScreen, MatchAnalyticsPanel, SpatialAnalyticsPanel, charts e estilos. Completar com componentes locais de análises salvas/seleção de relatório identificados na U0.

Executar:
1. Organizar Análise nas seções do contrato com Quadra inicial. Agrupar gráficos existentes, preservando acesso a todos. Substituir a pilha longa de cartões por uma região principal e controles com rótulos.
2. Reorganizar filtros sem alterar predicados ou enumeradores. Deixar coordenada e visualização acessíveis e ajustes de heatmap recolhidos. Mostrar contagens efetivas, incluindo coordenadas ausentes quando relevantes.
3. Manter estado de filtros ao trocar seção e ao abrir/fechar ajustes. Preferir componentes preservados ou estado de apresentação elevado; não introduzir novo armazenamento. Se trocar equipe exigir reset de atleta por contrato, explicitá-lo e manter esse comportamento.
4. Apresentar análises salvas no painel lateral; nomes reais, estado alterado/não salvo e retorno da persistência. Respeitar isolamento de partida/equipe e formato existente. Não inventar ID de análise para exibir seleção.
5. Aplicar controles reais de inclusão de gráfico no relatório quando houver suporte. UI reflete a seleção persistida/operacional; após exportar, os gráficos selecionados e recortes devem coincidir com o arquivo, conforme contrato local.
6. Uniformizar títulos, eixos, labels, tooltips e formatação pt-BR dos gráficos. Manter o método e as unidades. Probabilidade recebe contexto de estimativa e eixo legível, sem alterar o serviço.
7. Ajustar Resumo com dados por set, leitura comparativa e exportações existentes. Importação/exportação continuam disponíveis offline conforme capacidade local. Não trocar o renderer de PDF neste redesenho.

Verificar com fixture conhecida: mesmos totais/percentuais antes e depois; filtro selecionado fornece o mesmo conjunto de IDs de eventos; origem/destino e heatmap representam as mesmas amostras; análise salva reabre com configuração correta; relatório contém seleção real, se o recurso existir. Exportar amostra e inspecionar legibilidade/recorte, não apenas o sucesso do botão. Confirmar zero observações e observações sem coordenadas.

Concluída quando: Quadra está acessível sem percorrer gráficos prévios, nenhum filtro/análise salva se perde por navegação, todas as análises anteriores seguem acessíveis e não há função de relatório apenas ilustrativa. Lint/typecheck e testes direcionados analíticos/UI pertinentes.


---

# U6 — Demais telas, toque e teclado

Objetivo: completar a coerência do produto e sua adaptação a telas pequenas.

Entrada: U5 concluída. Ler os componentes locais de nova partida, cadastros, treino, manual, editor de perfis e registro livre. Escopo é acabamento e acessibilidade; manter fluxos e validações.

Executar:
1. Migrar campos, botões, títulos, listas, mensagens e espaçamentos para os componentes/tokens compartilhados. Formulários com labels, ajuda e erro associados; ações críticas identificáveis.
2. Aplicar grades responsivas do contrato. Nenhuma horizontal global em 390 px; tabelas que realmente precisarem rolam só em seu contêiner com identificação. Não esconder funções para fazer a captura caber.
3. Conferir navegação compacta, nome longo de equipe, elenco extenso, rótulos grandes e texto ampliado a 200%. Com zoom, aceitar reorganização/scroll vertical, mantendo leitura e comandos acessíveis.
4. Garantir foco previsível em menus/dialogs existentes: entrar no conteúdo, fechar por comando suportado e devolver foco ao acionador. Se usar `dialog` nativo, respeitar o padrão local e suas rotinas de foco. Não instalar biblioteca de modal.
5. Conferir toque na quadra com handlers locais: impedir scroll apenas durante gesto quando necessário; manter scroll fora da quadra. Aplicar `touch-action` apenas ao alvo certo. Tratar cancelamento de gesto sem registrar jogada incompleta.
6. Revisar Manual e ajudas refletindo novos nomes e posições dos controles. Manter conteúdo técnico; remover rótulos internos em inglês somente com mapeamento conhecido.

Verificar manualmente em 1366 × 640, 1024 × 768, 768 × 1024, 390 × 844 e um viewport desktop a 200% de zoom. Na matriz final, registrar qual foi realmente visto. Usar Tab/Shift+Tab, Enter/Espaço, Esc quando aplicável; foco visível, labels e nenhuma operação dependente apenas de hover/cor.

Concluída quando: todas as telas alcançáveis usam o tema, núcleo do registro funciona por toque e mouse, formulários não disparam scout por atalhos e zoom não corta comandos. Lint/typecheck e testes existentes das telas somente se o comportamento mudou.


---

# U7 — Verificação final e entrega

Objetivo: confirmar o redesenho como incremento utilizável e documentar evidências.

Entrada: U0–U6 concluídas ou bloqueios identificados. Não usar esta etapa para inventar novos recursos ou redesenhar a direção proposta.

Executar:
1. Revisar o diff do trabalho de interface. Confirmar ausência de alterações acidentais em regras esportivas, schemas, métricas, dependências, lockfile e dados. Remover CSS obsoleto somente quando seus consumidores foram migrados e identificados.
2. Executar uma vez as portas locais exigidas: lint, build (inclui TypeScript no script remoto) e suíte existente de testes; typecheck isolado somente se o build local não o incluir ou for exigido pela instrução local. Executar os E2E críticos existentes quando o ambiente estiver pronto. Não instalar uma infraestrutura nova de QA para encerrar o redesenho.
3. Percorrer a matriz em `VALIDACAO.md` com fixtures sintéticas, modo por modo. Marcar executado/aprovado, falhou ou não executado. Diferenças frente ao baseline ficam explícitas. Uma falha antiga não deve ser atribuída ao redesenho sem evidência.
4. Capturar antes/depois com o mesmo viewport e o mesmo conjunto de dados. Registrar Início, Partidas, Registro e Análise em desktop e captura em tablet/celular. Não comparar uma tela vazia com outra artificialmente preenchida sem informar essa diferença.
5. Abrir uma partida anterior ao redesenho, conferir atletas/placar/eventos e exportar um relatório. Recarregar e verificar dados/análises de acordo com a persistência existente. Preservar a base real; usar cópia/sandbox de dados para ensaio destrutivo de backup.
6. Atualizar changelog existente com mudanças concretas de interface, sem afirmar melhoria de precisão estatística. Atualizar `ESTADO.md` e `ENTREGA.md` com telas alteradas, evidências, testes e limites. Não alterar a versão do pacote automaticamente só por o plano se chamar 0.4.

Porta de conclusão: nenhum erro novo de build/typecheck, nenhuma regressão crítica de registro/salvamento/rotação/exportação, critérios visuais conferidos e comandos operacionais acessíveis. Se uma verificação essencial não puder ser executada, entregar como parcialmente verificado, com a lacuna explícita; não declarar 100% concluído.

Resposta ao usuário: resumir resultado, apontar evidências e a eventual pendência concreta. Não publicar, fazer push ou merge. O trabalho desta solicitação termina com a implementação local revisável.

---

# Matriz de validação

Preencher ao executar o plano no projeto. Este arquivo começa sem testes da aplicação executados.

| ID | Cenário e observação esperada | Etapa | Resultado/evidência |
|---|---|---|---|
| V01 | Home vazia permite iniciar uma partida; sem métricas fictícias | U2 | Não executado |
| V02 | Retomada abre ID correto e mostra data de origem conhecida | U2 | Não executado |
| V03 | Lista diferencia criada/em andamento/finalizada e busca sem resultado | U2 | Não executado |
| V04 | Importação válida funciona; inválida não apaga dados | U2 | Não executado |
| V05 | Placar atual único e correto nas três áreas da partida | U3 | Não executado |
| V06 | Cobertura, equipe ativa e sacador mantêm significados distintos | U3 | Não executado |
| V07 | Captura espacial conserva x/y em cantos, centro, resize e scroll | U3 | Não executado |
| V08 | Quadra 2:1 e linhas corretas; nome de equipe coincide com lado real | U3 | Não executado |
| V09 | Digitado: tecla/Enter e retorno funcionam conforme contrato local | U4 | Não executado |
| V10 | Visual: seleção e fluxo de confirmação local preservados | U4 | Não executado |
| V11 | Híbrido: código + metadados não são descartados | U4 | Não executado |
| V12 | Gestual: uma intenção produz um registro e trajetória correta | U4 | Não executado |
| V13 | Sem atleta permanece sem atleta; nenhuma sugestão sobrescreve escolha | U4 | Não executado |
| V14 | Avaliações usam significado por ação/perfil; seleção persiste visualmente | U4 | Não executado |
| V15 | Erro de gravação preserva rascunho; busy impede duplo envio | U4 | Não executado |
| V16 | Refazer/cancelar rascunho e desfazer histórico têm alcances distintos | U4 | Não executado |
| V17 | Trocas atualizam equipe/slot corretos e mantêm regras existentes | U4 | Não executado |
| V18 | Encerrar set e preparar próximo set continuam acessíveis | U4 | Não executado |
| V19 | Histórico completo/correção/refazer acessíveis | U4 | Não executado |
| V20 | Filtros retornam o mesmo conjunto de eventos do baseline | U5 | Não executado |
| V21 | Totais, percentuais e heatmap conservam resultados e unidades | U5 | Não executado |
| V22 | Navegação de análise preserva filtros, salvo reset do contrato local | U5 | Não executado |
| V23 | Análise salva reabre correta e respeita escopo de partida/equipe | U5 | Não executado |
| V24 | Seleção real de gráficos aparece corretamente no relatório, se existente | U5 | Não executado |
| V25 | Sem coordenadas/sem eventos mostra ausência, não zeros inventados | U5 | Não executado |
| V26 | Nomes longos, formulários, toque e foco funcionam nos cinco viewports | U6 | Não executado |
| V27 | Atalhos não atuam em campo de texto/IME/modal incompatível | U6 | Não executado |
| V28 | Partida anterior ao redesenho reabre com os mesmos dados | U7 | Não executado |
| V29 | Build/lint/testes requeridos aprovados ou falhas preexistentes discriminadas | U7 | Não executado |
| V30 | Sem novas dependências de rede para usar UI offline | U7 | Não executado |

Não transformar todas as linhas em testes automatizados novos. Usar testes existentes nos fluxos de dados e escrever teste pequeno apenas para mudança comportamental com risco real. Layout, texto e cor normalmente exigem inspeção visual e acessibilidade; teste que só afirma classe CSS não demonstra qualidade.

---

# Comandos para usar no Codex

## Primeira solicitação

```text
Leia docs/scout-trainer-interface-0.4/LEIA_PRIMEIRO.md, CONTRATO_DESIGN.md,
MAPA_TECNICO.md, ESTADO.md e etapas/U0.md nessa mesma pasta.
Execute somente a U0 neste checkout local do Scout Trainer.
O checkout pode estar mais avançado que a referência remota; preserve as mudanças atuais.
Mapeie os arquivos, o fluxo de confirmação de cada modo e as verificações disponíveis.
Não implemente o redesenho nesta etapa. Atualize MAPA_LOCAL.md e ESTADO.md.
Ao terminar, informe o que foi identificado, bloqueios reais e a próxima etapa.
```

## Próxima etapa

```text
Execute somente a próxima etapa pendente indicada em
docs/scout-trainer-interface-0.4/ESTADO.md.
Leia as instruções aplicáveis do projeto, MAPA_LOCAL.md e o arquivo da etapa em etapas/.
Em CONTRATO_DESIGN.md, leia os tokens/estados comuns e as seções da tela desta etapa.
Consulte MAPA_TECNICO.md para os limites técnicos e caminhos ainda necessários.
Use referencia/interface.html como referência visual e os valores do contrato como decisão de design.
Implemente no código existente, preservando regras, persistência e funcionalidades atuais.
Faça as verificações exigidas para esta etapa e atualize ESTADO.md.
Não replaneje tudo, não avance para a etapa seguinte e não instale outra stack visual.
Entregue mudanças, verificações, pendências e a próxima etapa em uma resposta curta.
```

## Retomar depois de interrupção

```text
Retome a etapa em andamento de docs/scout-trainer-interface-0.4/ESTADO.md.
Confira o diff e as anotações existentes para identificar o que já foi implementado.
Conclua apenas o que falta nessa etapa e verifique o resultado.
Preserve alterações preexistentes e não reinicie uma implementação concluída.
```

## Corrigir divergência visual específica

```text
Compare a tela [NOME] renderizada com CONTRATO_DESIGN.md e referencia/interface.html
em docs/scout-trainer-interface-0.4/. A divergência observada é: [DESCREVER].
Corrija apenas essa divergência e os efeitos diretamente relacionados.
Preserve os fluxos, handlers, valores e geometria da captura.
Verifique no mesmo viewport e registre a evidência no ESTADO.md.
```

O uso de uma etapa por solicitação é uma escolha de controle do trabalho. Não constitui garantia de limite de tokens nem exige aprovação intermediária para cada arquivo ou correção rotineira.

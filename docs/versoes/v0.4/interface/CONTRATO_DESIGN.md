> **Versão/escopo:** 0.4 — interface e registros históricos posteriores.
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../../COMECE_AQUI.md).

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

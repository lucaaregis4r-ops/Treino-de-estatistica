> **Versão/escopo:** Release não declarado; relacionado ao registro não lançado de 15/09/2026 no CHANGELOG.
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# Scout Trainer — plano único para o Luna
## Explorador visual da cadeia de Markov

**Entrega:** uma etapa integrada para substituir a apresentação atual das análises de Markov.

**Prioridade:** representar os caminhos do rally, qualificar os estados e tornar os números interpretáveis.

Este documento substitui, para esta tarefa, o plano anterior de análise visual. Ele é autossuficiente: contém decisões de interface, regras matemáticas, tratamento de dados, execução, testes e prompt final. Não é necessário executar os dois planos.

Base: as três capturas fornecidas e a discussão com Lucas. O repositório não foi inspecionado durante a elaboração. Componentes abaixo são responsabilidades sugeridas; o Luna deverá localizar os equivalentes reais antes de editar. Não presumir que o percentual atual já seja uma probabilidade de absorção.

## 1. O que construir

Transformar as tabelas de transições, padrões de dois/três estados e valor espacial em **um explorador da cadeia de Markov**.

A pergunta central é:

> A partir desta ação, desta equipe e com esta qualidade, quais caminhos o rally costuma seguir e qual é a chance estimada de terminarmos com o ponto?

A tela reúne quatro recursos conectados:

| Recurso | Função |
| --- | --- |
| Potencial do rally | Resumir a probabilidade estimada de ponto para a equipe de referência. |
| Gráfico de caminhos | Mostrar as próximas ações registradas e a frequência de cada caminho. É o protagonista. |
| Comparação por qualidade | Comparar os caminhos e o potencial entre avaliações do mesmo fundamento. |
| Quadra vinculada | Selecionar origem/destino para investigar como os caminhos diferem espacialmente. |

As tabelas continuam disponíveis em “Dados completos”, recolhidas. Não abrir a tela com uma matriz de transições nem criar uma rede circular com dezenas de setas.

Não implementar nesta etapa: IA generativa, análise de vídeo, modelo de segunda ordem, ranking causal de atletas, novas formas de registrar ações ou migração de armazenamento.

## 2. Experiência de uso definida

1. Usuário abre a aba Análise e encontra o título **Caminhos do rally**.
2. Seleciona equipe de referência e set. O foco inicial é o ataque dessa equipe, com todas as qualidades.
3. Vê o potencial estimado, a base de dados usada e o fluxo a partir dos ataques selecionados.
4. Seleciona uma qualidade, por exemplo ataque +. O estado inicial, os caminhos e o resumo se atualizam.
5. Alterna entre “1 contato” e “2 contatos” para expandir o horizonte visível.
6. Seleciona uma zona da quadra para restringir a ação inicial. Continua vendo as respostas adversárias e o restante do rally.
7. Clica numa ligação e abre os registros que comprovam aquele caminho.

Se não houver ataques, selecionar o primeiro fundamento disponível e informar o foco. Se não houver dados, apresentar estado vazio com orientação para registrar rallies.

### Vocabulário da interface

| Usar | Evitar |
| --- | --- |
| Chance estimada de ganhar o rally | Chance de vencer a partida |
| Potencial do rally | Nota Markov sem explicação |
| Próxima ação registrada | Próximo contato real quando a coleta é parcial |
| Rallies vencidos nos registros | Probabilidade estimada para uma simples frequência |
| Diferença observada / diferença estimada | Impacto causal / contribuição individual |
| Poucos registros | Confiança alta/baixa baseada somente em n |

## 3. Layout e identidade visual

### Ordem da página

1. Título e uma frase: “Explore o que acontece depois de cada ação”.
2. Barra de contexto: equipe de referência e set.
3. Barra de foco: equipe executora da ação inicial, fundamento, qualidade; atleta/rotação em “Mais filtros”. Por padrão, a executora é a referência.
4. Resumo compacto: potencial do rally, rallies vencidos observados e tamanho da base.
5. Gráfico de caminhos em largura total.
6. Área de investigação: quadra à esquerda e comparação de qualidades à direita.
7. Dados completos e “Como calculamos”, recolhidos.

O gráfico precisa aparecer antes da quadra. A quadra não deve empurrar a cadeia de Markov para o fim da página.

### Especificações

- Largura máxima 1200 px; margens de 24 px no desktop e 16 px no celular.
- Fundo grafite; superfícies discretas; cores saturadas reservadas para dados e seleção. Preservar tokens existentes quando compatíveis.
- Corpo 14–16 px, metadados no mínimo 12 px, títulos de seção 18–20 px, número principal 30–36 px.
- Intervalos de 24 px entre seções e 16 px dentro delas.
- Evitar bordas em todos os elementos, brilhos, gradientes decorativos e cartões em excesso.
- Em 1366 × 768, a abertura deve mostrar filtros, resumo e uma porção útil do fluxo. Não exigir atravessar tabelas.
- Abaixo de 900 px, empilhar quadra e comparação.
- No celular, substituir o fluxo horizontal por uma navegação vertical de caminhos com barras proporcionais. Mostrar o mesmo dado e oferecer avançar/voltar, sem reduzir o texto até ficar ilegível.
- Controles com área de toque mínima de 44 px, foco visível e operação por teclado. Fechar painéis com Escape e devolver foco ao acionador.

## 4. Definição dos estados: qualidade é obrigatória

Estado transitório = **equipe executora + fundamento + qualidade**.

Exemplos de rótulo:

- Olympico · Ataque +
- Sada · Defesa -
- Olympico · Recepção #

Terminais: **Ponto Olympico** e **Ponto Sada**, usando os IDs reais das equipes. A equipe de referência determina qual terminal corresponde à vitória, sem trocar identidades no modelo.

Regras:

1. Usar os símbolos e as descrições reais por fundamento. Não impor um dicionário universal de qualidade.
2. Incluir #, =, +, -, /, ! e códigos personalizados quando suportados pelos registros. Qualidade ausente vira “Sem avaliação”, nunca neutra.
3. Não assumir que # significa ponto direto em todo fundamento. Recepção # pode ser uma recepção excelente sem encerrar o rally.
4. O terminal vem do desfecho real do rally. Não inferir o vencedor pela última qualidade isoladamente.
5. Não fundir equipes ou qualidades para aumentar artificialmente a amostra.
6. Não criar estado para atleta, zona e subtipo nesta versão. Eles filtram a ação inicial, evitando multiplicar demais os estados.
7. Infrações, bola de graça e bloqueios entram conforme o esquema real. Não fabricar um bloqueio separado com base numa avaliação de ataque. Eventos vinculados devem respeitar sua identidade e ordenação.
8. Um rally tem no máximo um desfecho terminal válido. Um ponto não pode ser duplicado por ataque, bloqueio e placar.

## 5. Dados, contexto e filtros: contratos obrigatórios

### Dois níveis diferentes

**Contexto do modelo:** partida e set(s) selecionados. Construir a cadeia com ambas as equipes e as qualidades disponíveis nesse contexto.

**Foco da investigação:** equipe executora, fundamento, qualidade, atleta, rotação e origem/destino da ação inicial. Esses filtros localizam ocorrências iniciais; não apagam as ações que vieram depois.

Exemplo: filtrar o atacante 7 deve encontrar seus ataques e recuperar os sucessores nos rallies originais, inclusive ações de outros atletas e adversários. Filtrar qualidade + não pode fazer a sequência saltar de um + para outro + removendo contatos intermediários.

### Base elegível

- Agrupar por identificação confiável de rally, ordenar pelo índice original e respeitar fronteiras de set/partida.
- Para estimar o modelo nesta etapa, usar rallies encerrados com vencedor conhecido e ordem válida. Informar que a base usa rallies concluídos; isso pode enviesar uma coleta com muitos rallies abandonados.
- Se houver lacuna de integridade conhecida, conflito de desfecho ou impossibilidade de reconstruir fronteiras, excluir o rally do modelo e contabilizar o motivo.
- Rallies incompletos permanecem acessíveis no histórico, mas não entram no gráfico analítico ou na estimativa desta versão. Mostrar quantos foram excluídos.
- Coleta intencionalmente parcial, como scout só de uma equipe, não deve ser completada por inferência. Quando ordenação e desfecho forem válidos, pode modelar **ações registradas**, com indicação de cobertura parcial. Não chamá-las de todos os contatos.
- Se a cobertura for desconhecida, usar sempre “próximas ações registradas”.
- Ausência de atleta ou coordenada não invalida um rally; apenas limita o filtro correspondente.

Preservar IDs das ocorrências e dos rallies ao longo do pipeline para que toda ligação seja auditável.

## 6. Cálculo do potencial do rally

### Modelo de primeira ordem

Contar transições adjacentes, incluindo a transição da última ação ao terminal. Uma ocorrência de estado em uma posição do rally gera uma saída; repetição em outro momento gera outra ocorrência.

Para cada estado s:

`P(s,t) = número de transições s→t / número total de saídas de s`

Usar matriz empírica sem pesos arbitrários ou suavização nesta etapa. As saídas de cada estado elegível devem somar 1 dentro da tolerância numérica. Terminais permanecem absorventes.

Definir:

`V(ponto da referência) = 1`

`V(ponto adversário) = 0`

`V(s) = soma sobre t de P(s,t) × V(t)`

O valor exibido é `100 × V(s)`, com o rótulo **Potencial do rally** e a explicação “Chance estimada de sua equipe terminar com o ponto a partir deste estado”.

Isso considera caminhos futuros, incluindo ciclos. Não é apenas a proporção de pontos na próxima ação nem a frequência de rallies vencidos que contêm s.

### Implementação numérica

Reaproveitar cálculo existente somente após verificar sua definição. Se não houver, usar iteração de ponto fixo para evitar dependência numérica pesada:

1. Inicializar valores transitórios com zero e fixar os terminais.
2. Atualizar todos os transitórios simultaneamente pela equação acima, mantendo vetor anterior separado.
3. Parar quando a maior diferença for menor que `1e-10`, com teto de 10000 iterações.
4. Antes de resolver, verificar se todos os estados alcançáveis usados na estimativa conseguem atingir algum terminal e não contêm classe fechada sem desfecho.
5. Verificar resíduo final menor que `1e-8` e valores no intervalo [0,1], admitindo apenas tolerância de arredondamento.
6. Se a cadeia não for resolúvel, não convergir ou contiver saída indefinida alcançável, retornar status indisponível. Não usar a última iteração como estimativa válida.

A formulação matricial equivalente é `B = (I − Q)^(-1) R`. Referência: [Nick Foti, Princeton — The Fundamental Matrix of a Finite Markov Chain](https://lips.cs.princeton.edu/the-fundamental-matrix-of-a-finite-markov-chain/).

### Foco com várias qualidades ou atributos espaciais

É necessário definir o que acontece ao filtrar atleta ou zona sem reconstruir uma matriz inteira a cada clique.

Usar uma **entrada específica do recorte**: contar as saídas imediatas das ocorrências iniciais selecionadas. Seja `p_foco(t)` essa distribuição. Calcular:

`V_foco = soma sobre t de p_foco(t) × V_contexto(t)`

Os terminais usam 1 e 0. A partir do próximo estado, o modelo usa a cadeia do contexto. Esse estado de entrada é temporário e não modifica linhas da matriz original.

Exibir em “Como calculamos”: “O recorte define a primeira transição. As etapas seguintes usam as transições do contexto selecionado”. Portanto, uma zona afeta a distribuição inicial sem presumir que todas as ações futuras acontecerão nessa zona.

Se o foco contiver todas as ocorrências de um único estado, o resultado deve coincidir com V desse estado dentro da tolerância. Se abranger várias qualidades, é uma mistura ponderada pelas ocorrências reais, nunca média simples dos percentuais.

Não recalcular silenciosamente um modelo usando apenas rallies que contêm determinado caminho: isso condicionaria a base pelo resultado da seleção e mudaria a interpretação.

## 7. Resumo numérico e comparação

Exibir três itens, sem velocímetro:

1. **Potencial do rally:** percentual estimado com barra horizontal discreta de 0 a 100.
2. **Rallies vencidos nos registros:** X/Y e percentual observado, com rallies distintos.
3. **Base:** N ocorrências iniciais em R rallies; contexto com C rallies elegíveis e E excluídos.

Se uma ação inicial se repete três vezes no mesmo rally, conta três ocorrências para transições e um rally para a frequência observada. Não comparar esses denominadores como se fossem idênticos.

### Amostra e precisão

- Abaixo de dez rallies distintos no foco, substituir o percentual principal por “Poucos registros para destacar uma estimativa”. A estimativa calculada, se válida, fica no detalhe com seu n e indicação exploratória.
- Mostrar as contagens e os caminhos mesmo com poucos dados.
- Dez rallies é um limite de apresentação do produto, não garantia estatística. Acima dele, usar “Estimativa exploratória”, sem selo de confiança.
- Exibir percentuais inteiros no resumo e uma casa decimal no detalhe. Nunca produzir 0% para ausência de dados.
- Não criar intervalo de confiança fictício nem ranking de maior potencial com amostras mínimas.

### Qualidades lado a lado

Uma lista de barras horizontais, uma por qualidade do fundamento, mostra potencial, ocorrências e rallies. Manter todos os outros filtros e remover somente qualidade ao construir essa comparação.

Selecionar uma linha aplica a qualidade ao foco. Para cada linha, respeitar a mesma regra de estimativa por entrada específica. Qualidades sem dados mostram ausência, não zero.

Se apresentar diferença, usar `V_foco − V_referência`, em pontos percentuais. A referência mantém os demais filtros e remove apenas qualidade, incluindo o próprio grupo. Explicitar isso. Suprimir diferença quando foco ou referência não alcançar o limite de apresentação. Não chamar essa diferença de efeito causado pela qualidade.

## 8. Gráfico principal: fluxo em colunas, sem confundir modelo e observação

### Decisão de desenho

Usar um fluxo com faixas curvas proporcionais às **ocorrências observadas**, inspirado em Sankey. A visualização desenrola caminhos por posição e não tenta desenhar todos os ciclos da cadeia num único plano.

As ligações mostram frequência observada. O selo do nó mostra o potencial calculado pela cadeia do contexto. A legenda precisa dizer isso.

Colunas:

- Situação inicial.
- Próxima ação registrada.
- Segunda ação registrada, quando “2 contatos” estiver ativo.

Terminais podem aparecer em qualquer passo e encerram o ramo. Resultado terminal não é um contato adicional; usar texto auxiliar “O desfecho aparece assim que o rally termina”. Não desenhar setas de um ponto para outra ação.

### Regras de contagem para preservar caminhos reais

- Construir o fluxo a partir dos sufixos reais de cada ocorrência inicial.
- Identificar nós por caminho/prefixo e profundidade. Dois nós com o mesmo estado mas com históricos diferentes não devem ser fundidos na segunda coluna de expansão, pois isso inventaria combinações.
- Em cada ligação, mostrar `contagem do caminho / contagem do prefixo de origem`, além do percentual local. No detalhe, mostrar rallies distintos.
- A largura usa contagens absolutas na mesma escala em todo o desenho. Não usar percentuais locais como espessura global.
- Um nó transitório com sequência válida deve ter saídas que conservam sua contagem, incluindo caminhos agrupados. Terminais encerram o fluxo.
- Não multiplicar probabilidades da matriz para inventar contagens de sequências observadas.
- Exibir duas ações futuras não muda a ordem do modelo. O potencial continua usando primeira ordem; a expansão mostra sequências empíricas.

### Controle da complexidade

- Inicialmente mostrar até três sucessores por prefixo, ordenados por frequência, e agrupar o restante em “Outros caminhos”.
- Limite inicial total de 12 nós visíveis. Quando necessário, agrupar mais; não reduzir tipografia abaixo de 12 px.
- “Outros” preserva a soma de ocorrências; não é um estado da matriz e não recebe V próprio. Abrir painel com seus componentes.
- Ordenação determinística para o gráfico não saltar entre renders.
- Ciclos reaparecem em colunas diferentes; nunca criar uma seta que volta cruzando o desenho.

### Informação e interação

Cada nó mostra equipe, fundamento, símbolo/descrição curta e potencial do estado no contexto. Em nó de profundidade maior, o tooltip esclarece: “Estimativa pelo estado atual; o modelo não usa todo o caminho anterior”.

Cor do pequeno selo representa qualidade, usando o cadastro e legenda. Faixas de fluxo usam tons neutros; seleção recebe destaque. Terminais têm rótulo inequívoco de vencedor.

- Clique/toque na ligação: painel dos rallies correspondentes.
- Clique/toque no nó: detalhe do estado, seu potencial no contexto e distribuição observada dentro daquele prefixo.
- Ação explícita “Explorar a partir deste estado”: transforma o estado em novo foco; limpa filtros específicos de atleta/posição/rotação e informa a mudança. Preserva partida/set e equipe de referência.
- Oferecer “Voltar ao foco anterior”. Não resetar filtros silenciosamente.
- No celular, cada ramo vira linha com barra proporcional, n e botão de avançar. Breadcrumb curto mostra o caminho escolhido.

## 9. Quadra vinculada ao fluxo

Título: **Onde começa este caminho?**

A quadra representa as posições das ações iniciais, não mistura todas as ações do rally. Selecionar origem ou destino e uma zona modifica o foco, os caminhos e V_foco pela regra da primeira transição.

### Geometria e apresentação

- Preferir SVG responsivo ou componente equivalente existente.
- Retângulo de jogo em proporção 18:9, duas metades de 9:9, rede central contínua e linhas de ataque a três metros da rede em cada metade.
- Margem externa para bolas fora, piso azul acinzentado e linhas claras. Não usar uma matriz de células coloridas como fundo padrão.
- Indicar nomes das equipes e orientação. Reutilizar transformação espacial do registro. Preservar coordenadas originais; não espelhar por suposição.
- Rótulos de zona discretos conforme a convenção do projeto, incluindo “Fora” quando coordenadas reais permitirem.

### Modos

1. **Ações:** padrão, marcadores nas posições reais, com qualidade em cor/símbolo.
2. **Trajetórias:** origem e destino reais, linha fina e direção. Sem inventar um endpoint ausente.

Heatmap contínuo não é obrigatório nesta etapa. O mapa serve primeiro para investigar a cadeia. Se já existir um heatmap aproveitável, manter como modo secundário de frequência, com legenda; não suavizar probabilidades em manchas de eficácia.

Cor representa qualidade. Formato pode representar subtipo quando existir no cadastro, com legenda. Equipe aparece no texto e orientação, não disputa a mesma escala de cores.

Em trajetórias, mostrar inicialmente 30 ocorrências mais recentes e declarar “30 de N trajetórias”; oferecer ver todas. As métricas continuam sobre o recorte completo. Não deslocar pontos para desamontoar; sobreposição abre lista.

Mostrar cobertura: “X de Y ações iniciais têm origem registrada” ou destino, conforme seleção. Ações sem posição continuam no foco geral; são excluídas somente quando se aplica um filtro espacial que não podem satisfazer. Infrações sem posição continuam nos caminhos e terminais.

Chip explícito “Destino: zona 1” e botão de limpar. Se não for possível normalizar lado/coordenadas com segurança, disponibilizar a cadeia e explicar a indisponibilidade espacial.

## 10. Evidência e explicação dos resultados

Painel de rally mostra:

- Set e placar anterior, quando conhecidos.
- Equipes, atletas identificados ou “Sem atleta”, fundamentos e qualidades na ordem registrada.
- Vencedor e causa terminal, quando disponível.
- Destaque da ocorrência selecionada. Repetições no mesmo rally aparecem dentro da mesma entrada, sem duplicar o rally na lista.
- Ligação ao registro original se existir navegação apropriada.

Sem vídeo, usar “Rever ações”, nunca sugerir que existe replay de vídeo.

“Como calculamos” explica: estados, base elegível, Markov de primeira ordem, estimativa de absorção, recorte da primeira transição, diferença entre ocorrência e rally e cobertura parcial. Mostrar a dimensão da matriz e estados sem estimativa apenas na auditoria.

Permitir no máximo uma frase descritiva automática por seleção, por exemplo: “Em X de Y saídas registradas, este ataque foi seguido por defesa adversária -”. Gerar por regras e contagens, sem LLM e sem recomendar uma tática como se tivesse efeito causal comprovado.

## 11. Organização do código e execução econômica

Reutilizar estrutura, bibliotecas e testes existentes. Não colocar cálculos dentro do componente visual.

| Responsabilidade | Contrato |
| --- | --- |
| Normalização | Lê eventos, qualidades, ordem, IDs e terminais sem alterar persistência. |
| Base elegível | Seleciona rallies do contexto e registra exclusões. |
| Modelo Markov | Contagens, matriz, verificação de absorção e V por estado. |
| Foco | Localiza ocorrências iniciais e calcula distribuição de entrada e V_foco. |
| Caminhos | Extrai prefixos reais, contagens e IDs para evidência. |
| Interface | Filtros, resumo, fluxo, comparação, quadra e detalhe. |

Pipeline: eventos originais → rallies válidos → modelo do contexto → seleção de ocorrências iniciais → caminhos/estimativa do foco → visualizações → evidência.

Memoizar o modelo por partida/set e versão dos dados. Mudança de qualidade/atleta/zona não resolve a matriz de novo. Edição ou exclusão de ação precisa invalidar o cache. Não recalcular ao passar o mouse sobre um nó.

Preferir gráficos existentes. Sem equivalente adequado, implementar SVG com layout determinístico de colunas e caminhos cúbicos, respeitando contagens. Não instalar uma suíte de dashboards para desenhar este fluxo.

### Sequência interna — uma entrega única

1. Ler AGENTS.md, contexto/pipeline existentes e scripts do projeto. Localizar aba Análise, cálculo atual de Markov, quadra, esquema de eventos e cadastro de qualidades com buscas focadas.
2. Anotar no documento de contexto existente quais arquivos reais serão usados e se o cálculo atual é frequência, diferença de frequências ou absorção. Não reescrever partes corretas.
3. Implementar normalização, base elegível, modelo e seletores de foco com testes matemáticos focados.
4. Substituir a abertura pela nova composição, com dados reais. Integrar fluxo e evidência.
5. Integrar comparação de qualidade e quadra como filtro. Recolher as tabelas anteriores e corrigir overflow.
6. Verificar cálculos, interação e responsividade. Atualizar os documentos existentes de contexto/pipeline/changelog e relatar limitações reais.

Executar os passos sem checkpoints de aprovação. Não abrir agentes adicionais. Não criar novo planejamento em cascata. Não alterar código fora desse objetivo nem descartar mudanças locais do usuário.

## 12. Testes essenciais e aceite

### Casos matemáticos pequenos e determinísticos

1. Estado com 6 saídas para vitória e 4 para derrota: V = 0,6.
2. A → B com probabilidade 1; B → vitória 0,75 e derrota 0,25: V(A) = V(B) = 0,75.
3. A → A 0,5; A → vitória 0,3; A → derrota 0,2: V(A) = 0,6. Confirma tratamento de ciclos.
4. Classe fechada A → B → A sem terminal: status indisponível, nunca 0% ou 50% inventado.
5. Foco com saídas 50% para estado V=0,8 e 50% para estado V=0,2: V_foco=0,5.
6. Foco com todas as ocorrências de um estado: V_foco coincide com V do estado.
7. Repetição do padrão no mesmo rally aumenta ocorrências, mas não duplica rallies vencidos observados.
8. Filtrar atleta, equipe ou qualidade não apaga ações intermediárias dos caminhos.
9. Qualidades distintas e equipes distintas continuam estados distintos; recepção # sem ponto não vira terminal.
10. Rallies incompletos/conflitantes têm exclusão rastreável; falta de coordenada não invalida o modelo.
11. Nós com mesmo estado e prefixos diferentes não inventam caminhos quando o fluxo se expande. “Outros” conserva contagens e probabilidades locais.
12. Alterar dados invalida cache; filtro espacial altera somente a entrada específica, preservando o modelo do contexto.

### Aceite visual e funcional

- [ ] Fluxo aparece como elemento principal da aba.
- [ ] Potencial estimado e taxa observada estão identificados separadamente.
- [ ] Todas as probabilidades têm definição e base acessível; n de ocorrências e de rallies estão claros.
- [ ] Qualidade aparece em estados, filtros, comparação e detalhes.
- [ ] Controle 1/2 contatos substitui a duplicação das tabelas de padrões.
- [ ] Selecionar nó/ligação permite chegar aos registros correspondentes.
- [ ] Quadra apresenta rede, linhas de ataque, proporção e orientação corretas.
- [ ] Zona selecionada atualiza foco, fluxo e resumo sem apagar contatos posteriores.
- [ ] Poucos dados, ausência de posição e falha de estimação têm estados próprios.
- [ ] Não há tabelas transbordando nem scroll horizontal da página em 390 px.
- [ ] Revisão visual em 1366 × 768, 1024 × 768 e 390 × 844; navegação por teclado e toque funcional.
- [ ] Registro de partida, parser e persistência continuam funcionando.

Rodar os comandos de teste/build existentes e os casos necessários acima. Não fazer testes que apenas repitam classes CSS. Parar a verificação quando os riscos estiverem resolvidos. Se não houver navegador disponível, informar que a revisão visual não foi executada; não afirmar que foi validada.

## 13. Prompt único para colar no Luna

```text
Implemente integralmente o plano em Plano_Unico_Luna_Markov.md no Scout Trainer.

Esta é uma única etapa: substituir a apresentação atual das análises de cadeia de Markov por um explorador visual chamado Caminhos do rally. O gráfico de caminhos é o protagonista; o potencial do rally resume a probabilidade estimada de ponto; a qualidade define estados e comparações; a quadra filtra a ação inicial.

Leia primeiro AGENTS.md e os documentos de contexto/pipeline existentes. Localize os arquivos reais de análise, Markov, eventos, qualidades e quadra. Verifique o que o cálculo atual realmente mede. Os nomes de responsabilidades no plano não são arquivos presumidos. Faça buscas focadas, preserve mudanças locais e reaproveite componentes e dependências.

Siga as definições matemáticas do documento. Separe probabilidade de transição, probabilidade de absorção e frequência observada de rallies vencidos. O estado deve incluir equipe, fundamento e qualidade. O modelo é de primeira ordem; visualizar dois contatos futuros não o torna de segunda ordem. O fluxo usa prefixos observados reais, não contagens inventadas multiplicando probabilidades.

Os filtros de atleta, qualidade e posição selecionam ocorrências iniciais e não apagam contatos intermediários. O modelo do contexto usa ambas as equipes. A estimativa do recorte usa sua distribuição de primeira transição e os valores futuros do contexto, como especificado. Não reestime a cadeia somente com os rallies que contêm um caminho selecionado.

Implemente o resumo, fluxo em colunas com alternativa móvel, comparação por qualidade, quadra proporcional e detalhe dos rallies. Recolha tabelas técnicas. Não use dados simulados como resultado final. Não invente qualidade, coordenada, atleta, bloqueio ou desfecho. Mostre limitações de cobertura e amostra conforme o plano.

Não amplie para IA generativa, vídeo, registro novo, migração de banco ou modelo de segunda ordem. Não use agentes adicionais. Não peça aprovação entre os passos. Organize cálculos em funções puras, mantenha componentes pequenos e evite dependências pesadas.

Execute os testes matemáticos e de integridade definidos, os comandos pertinentes do projeto e a revisão visual nos três tamanhos. Se alguma verificação não puder ser feita, declare isso. Atualize contexto, pipeline e changelog existentes.

Ao terminar, resuma o resultado, arquivos principais alterados, verificações feitas e limitações reais. Entregue a implementação integrada, não outro plano.
```

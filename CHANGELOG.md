# Changelog

Todas as mudanças relevantes do Scout Trainer são registradas neste arquivo.

## [Não lançado] — Caminhos do rally — 2026-09-15

- Substituída a apresentação técnica de Sequências/Markov pelo explorador visual `Caminhos do rally`.
- Adicionados potencial por absorção, frequência observada por rally distinto, fluxo de prefixos reais, comparação por qualidade, quadra proporcional e detalhe auditável dos rallies.
- Filtros de atleta, qualidade, rotação e posição atuam sobre a ocorrência inicial; contatos intermediários permanecem na leitura.
- Exibição responsiva para desktop e móvel, com tabelas técnicas recolhidas e mensagens de cobertura/amostra.
- Sem alteração de registro, schema, persistência ou regras matemáticas existentes; o modelo continua de primeira ordem.

## [Não lançado] — Registro rápido — 2026-09-14

- Números e nomes mais legíveis no Gestual, ação/equipe em destaque e opção explícita de registrar ao soltar a trajetória.
- Bola de graça registra seu próprio contato espacial e prepara a defesa adversária no Gestual, sem corrigir indevidamente o ataque anterior.
- Ajuste conjunto de rotação via P1, equipe sacadora e placar, com escrita atômica usando os eventos existentes; retomada pelo saque somente quando solicitada.
- Falhas de gravação mantêm rascunho/escolhas; ausência de atleta e confirmação manual preservadas. Guia em `docs/REGISTRO_RAPIDO.md`.

## [Não lançado] — Interface local — 2026-09-13

- Navegação Início/Partidas e espaço Registro/Resumo/Análise organizados com tokens compartilhados, seleções explícitas e controles de teclado/toque.
- Registro gestual redimensionado para manter os comandos operacionais visíveis em 1366×640, preservando a quadra 2:1 e as coordenadas capturadas.
- Detalhes da partida e ferramentas de correção com entradas maiores, conteúdo no fluxo da página e fechamento por Escape com retorno de foco.
- Seletor gestual segue a rotação real: Rede P4/P3/P2 e Fundo P5/P6/P1, sugestão distinta da seleção, nome ao passar o cursor e ao selecionar, um botão de líbero e acesso às reservas.
- Análises organizadas em abas, filtros salvos e seleção persistente de gráficos para o relatório, usando a persistência e os exporters existentes.
- Evidências e limites da verificação U7 em `docs/scout-trainer-interface-0.4/ENTREGA.md`; suíte global ainda não está limpa. Sem mudança automática de versão, métricas ou regras esportivas nesta revisão.

## [0.4.0] - 2026-09-10

### Registro gestual mobile-first

- Registro por gesto com Pointer Events para touch, mouse e caneta.
- Rally guiado pelo contexto, sem exigir levantamento explícito.
- Sugestões de atletas baseadas na rotação atual.
- Inferência de ataques defendidos, ataques para fora, free ball e block-out.
- Área `outZone` preservada para futuras visualizações específicas.
- PWA/local-first mantido, com modo gestual disponível dentro da partida.

## [0.3.0] - 2026-09-06

### Gestão e navegação

- Cadastro local reutilizável de atletas e equipes, com edição e desativação sem apagar histórico.
- Tela dedicada de partidas, com abertura, continuidade e consulta de resumos.
- Home reduzida às partidas recentes e ações principais.
- Menu global simplificado para Início, Partidas, Cadastros, Treino e Manual.
- Workspace contextual da partida com Registro, Resumo e Análise.
- Cabeçalho contextual com equipes, set, placar e retorno claro para Partidas.

### Registro visual de voleibol

- Novo modo visual alternativo ao scout por código.
- Ações, qualidade, atletas, trajetória e detalhes opcionais organizados em um único painel.
- Quadra espacial V2 preservada com coordenadas livres e origem → destino.
- Registro com confirmação única, botão Refazer, Cancelar, atalho Enter e limpeza por Esc.
- Placar compacto dentro do registro visual.
- Sugestões automáticas de saque, recepção e ataque, sempre editáveis.
- Levantamento tratado como implícito no fluxo recepção → ataque, sem remover o registro manual.
- Últimas cinco ações com correção, Desfazer e Refazer.
- Atletas exibidos na rotação P1–P6, com destaque do levantador.
- Regra visual do líbero no fundo, mantendo o central em P1 durante seu turno de saque.
- Migração de banco IndexedDB para versão 6, com stores de atletas e equipes.

### Análise espacial e estatística

- Explorador espacial com filtros por ação, atleta, qualidade, set, P do levantador e coordenada.
- Modos Pontos, Jogadas e Heatmap usando a mesma seleção filtrada.
- Heatmap radial contínuo com controles de raio e intensidade.
- Tabela detalhada secundária para conferência auditável.
- Aba Análise separada do Resumo, com indicadores recolhíveis e apresentação mais limpa.
- Probabilidade estimada de vitória da partida e do set com base no estado do placar.
- Gráfico de evolução da probabilidade por ponto/rally.
- Impacto estimado de cada mudança de placar em pontos percentuais e identificação das maiores variações.
- Modelo explicitamente estimativo, preparado para calibração futura com histórico de partidas.

### Qualidade

- Testes diretos para cadastro, migração, registro visual, captura espacial, rotação/líbero, heatmap e probabilidade.
- Typecheck e build de produção validados.

## [0.2.0] - 2026-08-26

### Adicionado

- Ajuda contextual habilitável durante a digitação, cobrindo saque, recepção, levantamento, ataque, bloqueio, defesa e free ball.
- Quadras simultâneas com escalações, posições P1–P6, funções táticas, sacador e levantador ativo.
- Confirmação e reorganização livre das escalações entre sets, sem contabilizar substituições.
- Substituições auditáveis e reconhecimento de inversões 5–1/6–2.
- Replay determinístico da partida a partir do histórico de eventos, incluindo desfazer, refazer e correções.
- Análises por atleta, rotação, posição do levantador, distribuição das bolas e direção dos ataques.
- Exportação de pacote completo com JSON, eventos CSV, scout TXT, estatísticas CSV e relatório PDF.
- Perfis de complexidade básico, operacional, tático e avançado.
- Treinos de codificação com métricas de precisão, tempo e qualidade operacional.

### Alterado

- O scout passou a usar uma linha contínua com enquadramento automático de códigos e preenchimento do próximo saque.
- A linha de entrada acompanha automaticamente o trecho digitado mais recente.
- O cabeçalho da partida acompanha a rolagem e mantém times, sets e placar visíveis.
- Abrir o manual durante uma partida preserva o contexto e retorna ao mesmo scout.
- A origem normal do ataque é inferida pela posição rotacional do atleta; o operador informa apenas exceções.
- O direcionamento do ataque foi simplificado para diagonal (`DD`), paralela (`DP`) e paragonal (`DG`).
- Combinações de ataque são opcionais e possuem descritores para `INV`, `CRZ`, `PIPE`, `F2` e `F4`.
- O relatório PDF recebeu novo design e seções específicas para eficiência, distribuição e direcionamento em P1–P6.

### Corrigido

- Maior estabilidade ao alternar entre scout, manual e resumo.
- Persistência correta de escalações, rotações, substituições e contexto do levantador.
- Correções de eventos preservam a auditoria e recalculam placar e estatísticas.
- Ataque abafado pelo bloqueio é identificado explicitamente pela avaliação `/`.
- A entrada contínua não perde o foco nem oculta o final de sequências longas.


## [0.1.0] - 2026-08-20

- Primeira versão pública do Scout Trainer.

# Changelog

Todas as mudanças relevantes do Scout Trainer são registradas neste arquivo.

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

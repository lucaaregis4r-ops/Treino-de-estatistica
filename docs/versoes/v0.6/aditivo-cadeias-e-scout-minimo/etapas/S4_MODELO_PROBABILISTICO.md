# S4 — Markov com contexto completo e recuo validado

**Estado:** implementação concluída. Consulte o [resultado e limites](../S4_RESULTADO.md); os testes funcionais de aceitação ficam para S5.

**Objetivo:** avaliar se probabilidades condicionadas ao histórico da trajetória acrescentam informação confiável às descrições S3. **Depende de:** S2/S3 e amostra suficiente de partidas; se não houver amostra, a entrega desta etapa é a indisponibilidade honesta do modelo.

1. Implementar sob demanda árvore de prefixos por esporte, com ações categorizadas de forma pequena e estados terminais reais. O estado de prefixo de uma observação conserva todas as ações anteriores da mesma unidade, de qualquer comprimento. A lista da trajetória completa nunca é substituída pela árvore agregada.
2. Contar suporte por **unidade distinta** e checar desfechos; evitar que loops na mesma posse dominem a amostra. Para contextos raros, testar recuo de contexto de comprimento variável, guardando qual contexto foi usado em cada estimativa. O recuo reduz memória **do modelo**, não corta a trilha exibida. Não transportar parâmetros, xG ou xT entre esportes.
3. Definir critérios operacionais antes de olhar resultados (proposta inicial para validação: pelo menos 5 partidas e 100 unidades completas no recorte, 20 unidades distintas por estado publicado, comparação de Brier/log loss e calibração por divisão de partidas; revisar esses limiares apenas com justificativa documentada). Comparar com baseline de desfecho por esporte/equipe e com cadeia de primeira ordem. Separar treino e validação por partida para evitar vazamento de rallys/posses irmãs.
4. Se o modelo não superar baseline, não calibrar ou não atender suporte, UI mostra “modelo indisponível neste recorte”, `n` e motivo; S3 continua mostrando contagens/variantes. Se passar, apresentar probabilidade, intervalo de incerteza apropriado, suporte, versão do codificador/contexto, janela de dados e evidências; não descrever como causalidade ou previsão certa.

**Aceite:** fixtures com dois prefixos que terminam na mesma última ação mas têm desfechos diferentes provam que o contexto anterior foi considerado; teste de sequência longa não usa limite 2/3. Conjuntos pequenos e vazamento entre partidas rejeitam publicação. Markov de pares, prefixos, recuo e trajetórias empíricas têm rótulos distintos. Nenhum xG/xT de futebol aparece na rota do futsal.

**Prompt para o Luna:** “Execute apenas S4. Use as trajetórias S2/S3 para testar Markov por prefixo e recuo com validação por partidas. Publique probabilidade só após cumprir os critérios; caso contrário, implemente e documente a indisponibilidade com n e motivo.”

## Implementação entregue

- Ajuste separado por modalidade, categorias terminais fechadas por esporte e validação leave-one-match-out.
- Comparações com baseline global, baseline por equipe e primeira ordem. Brier multiclasses, log loss e calibração top-1; probabilidades não aparecem se o modelo não superar os critérios definidos.
- Recuo de contexto baseado em suporte de unidades distintas e partidas. A trilha integral da S3 não é truncada.
- Intervalos dos estados publicados por bootstrap de partidas; suporte e IDs de evidência visíveis. A tela de futsal usa a mesma seção, sem xG/xT de futebol.
- A verificação automática de critérios em fixtures, testes de UI, inspeção operacional e corpus real deve ocorrer na [S5](S5_VALIDACAO.md). Nesta rodada não foram criados nem executados testes.

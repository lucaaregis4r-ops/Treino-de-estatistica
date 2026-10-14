# S0 — contratos de sequência e protótipo operacional

**Objetivo:** fechar definições antes de alterar o registro ou calcular taxas. **Dependências:** ler [`../PLANO_IMPLEMENTACAO_LUNA.md`](../PLANO_IMPLEMENTACAO_LUNA.md), [`../REFERENCIAS_E_DECISOES.md`](../REFERENCIAS_E_DECISOES.md), ` AGENTS.md` e o estado M8. **Entrega:** ADR curto no aditivo, fixtures e esboço da tela.

1. Inventariar no código real `RallyPathAnalyzer`, `SequencePatternAnalyzer`, `FootballObservation`, `FootballMarkovAnalyzer`, `FutsalScout`, `FutsalAnalytics`, `DerivedAnalyticsReport`, telas e exportadores. Registrar quais trilhas já contêm todos os eventos e onde a análise/UI corta o contexto. Conferir o possível `sample.n` global duplicado por perspectiva de equipe antes de corrigir.
2. Especificar início, fechamento, duração e desfecho de um rally e de uma posse em cada esporte. Separar evento observado, fechamento por regra (gol/ponto) e lacuna; informar o que acontece com rally incompleto, posse aberta, cobertura suspensa, correção, desfazer, rebote, gol contra, falta e mudança de período/set. Decidir se passe/condução explícitos entram no `FutsalFact` e no backup 1.3; marco espacial isolado nunca vira passe automaticamente. O fato de existir uma sequência de registros não prova cobertura completa do jogo.
3. Resolver a mudança observada de controle A→B com um toque de equipe: registrar o novo controle como observação explícita, fechar A e abrir B sem inventar “disputa” intermediária. Revisar a validação atual do serviço e documentar regressões necessárias. “Disputa”, “parada” e “não observado” continuam escolhas explícitas para incerteza real.
4. Definir campos/versionamento da projeção `ObservedSequence`, identificador estável, perspectiva por equipe, filtros, contagem de unidades únicas e contrato de exportação. Não persistir novos IDs de posse no backup até provar que a derivação não basta.
5. Desenhar um protótipo textual ou visual de 1366×768 e 390×844: topo placar/período/relógio T/faltas → quadra → controle → faixa de ações → detalhes voluntários. Marcar quais ações exigem painel, estado de foco, resultado e erro. Inspecionar com operador se houver; sem operador, registrar como hipótese de UX.

**Casos de contrato:** rally de 1/8/20 contatos e dois lados; posse de 1/9 ações, dois chutes/rebote, A→B direto observado, período no meio, gol, interrupção, posse censurada e correção que muda o limite. Especificar `n` por rally/posse e contar a mesma perspectiva uma vez.

**Aceite:** ADR e protótipo definem semânticas suficientes para S1/S2; fixtures nomeadas; nenhuma “probabilidade da cadeia inteira” declarada a partir de transições em pares. Por pedido posterior do usuário, os ajustes operacionais de atalho, trajetória, desarme e orientação visual foram antecipados nesta etapa; a reorganização completa da tela permanece na S1.

**Entregue:** [contratos](../S0_CONTRATOS.md), [fixtures](../S0_FIXTURES.md) e [protótipo](../S0_PROTOTIPO.md).

**Prompt para o Luna:** “Execute apenas S0 deste aditivo. Leia os arquivos indicados, confira o código atual e entregue ADR, fixtures e protótipo. Preserve as alterações existentes. Explique como a seleção direta de controle A→B fica observacional e como um gol fecha a posse. Informe verificações e questões que continuem abertas.”

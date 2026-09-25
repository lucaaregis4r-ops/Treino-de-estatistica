# Implementação Terra — roteiro consolidado

**Versão de planejamento:** 0.5 proposta. **Base declarada do aplicativo:** 0.4.0. **Data:** 22/09/2026. **Estado:** documentação; esta rodada não implementou funcionalidades.

## Começar aqui

Este é o roteiro vigente para implementar todos os pedidos: futebol minimalista por posse, detalhes opcionais, pressão fixável, sugestões de trechos, revisão voluntária, menus e cadastro fácil nas duas modalidades, análise compatível e validação. Substitui a ordem operacional dispersa M/R/A. Os documentos anteriores ficam como histórico de decisões; não são etapas extras.

O usuário autorizou preparar o plano. **Não iniciar implementação ao receber apenas este pacote.** Quando solicitar implementar, executar a etapa indicada; se pedir iniciar o plano, começar pela T01. Avançar por etapas, respeitando o escopo solicitado pelo usuário. Os prompts estão em [PROMPTS_TERRA.md](PROMPTS_TERRA.md).

Leitura por rodada: ` AGENTS.md` da raiz (há um espaço antes do nome), este README, a seção vigente de [ESTADO.md](../ESTADO.md) e **somente o MD da etapa solicitada**. Cada MD contém o necessário e aponta entradas reais do código. Não ler todos os planos antigos para começar.

## Sequência única

| Ordem | Macroetapa | Dependência técnica | Origem incorporada |
|---|---|---|---|
| 1 | [T01 — Tela mínima](T01_TELA_MINIMA.md) | Base existente M3/M4 | R1 |
| 2 | [T02 — Trocas e finalizações](T02_TROCAS_E_FINALIZACOES.md) | T01 | R2 |
| 3 | [T03 — Contrato do registro assistido](T03_CONTRATO_ASSISTIDO.md) | T02 | A1 |
| 4 | [T04 — Detalhes opcionais](T04_DETALHES_OPCIONAIS.md) | T03 | R4: saída, roubada, jogador, forma da pressão |
| 5 | [T05 — Pressão fixável](T05_PRESSAO_FIXAVEL.md) | T04 | A2: altura/posição da pressão |
| 6 | [T06 — Sugestões de trechos](T06_SUGESTOES_DE_TRECHOS.md) | T03/T05 | A3: geração e destaque |
| 7 | [T07 — Completar e corrigir](T07_REVISAO_VOLUNTARIA.md) | T04/T06 | A3: resposta; parte pontual de M7 |
| 8 | [T08 — Menus nas duas modalidades](T08_MENUS.md) | Base M0; integrar T01–T07 | Pendências de M1 |
| 9 | [T09 — Atletas, elencos e nova partida](T09_ATLETAS_E_ELENCOS.md) | T08; base M2/M3 existente | Concluir M2 e preservar/verificar M3 |
| 10 | [T10 — Validação e piloto](T10_VALIDACAO_E_PILOTO.md) | T01–T09 | A4/R3/M6 |
| 11 | [T11 — Análises por posse](T11_ANALISES_POR_POSSE.md) | T10 com aceite operacional | M8, adaptada aos dados realmente coletados |
| 12 | [T12 — Entrega e documentação](T12_ENTREGA.md) | T10/T11 | M9 e organização final dos documentos |

T08/T09 não refazem entregas existentes. Em todas as etapas: inspecionar antes, reaproveitar o que funciona e completar o que faltar. A ordem acima é a sequência padrão de trabalho, mesmo onde existem dependências técnicas independentes.

## Regras comuns

- Campo, troca e chute são prioritários. Um toque marca a bola; um toque registra controle adversário; chute completo usual requer armar, origem e resultado. Nenhum campo opcional é pré-requisito.
- Fonte canônica de controle/posse nos serviços existentes; a UI não mantém um segundo motor. Histórico e IDs são preservados. Não converter marcos em passes.
- Observação, sugestão e confirmação são dados distintos. Espaço entre marcas não prova passe, condução, domínio, perigo ou autoria. Não observado não é zero nem ausência.
- Pressão fixa é opt-in. Alta/Média/Baixa descrevem altura; Individual/Coletiva descrevem forma. Não inferir intensidade ou duração.
- Sugestão não abre pergunta automaticamente. Passe e domínio podem coexistir com autores diferentes; resposta é voluntária e pode continuar incompleta.
- Vôlei mantém regras/motor e modos funcionais. Somente menus/cadastro compartilhados entram na reformulação; preservar escalação, líbero, rotação, placar e relatórios.
- Reutilizar arquitetura, stack e persistência. Sem dependência nova por conveniência, IA obrigatória, tracking, API externa ou reescrita geral. Episodes contínuos de pressão e modelos avançados ficam fora deste incremento.
- Preservar alterações existentes do checkout. Não executar reset/clean, formatação global, version bump, publicação, instalador ou limpeza de artefatos como parte implícita do plano.
- Rodar testes proporcionais à mudança e typecheck; mudanças visuais exigem inspeção real. Não executar suítes repetidamente sem mudança ou dúvida nova. Registrar falhas preexistentes só com evidência.

## Referências visuais portáveis

- [Composição mínima aprovada](referencias/futebol-registro-minimo.html).
- [Detalhes opcionais aprovados](referencias/futebol-detalhes-opcionais.html).

São cópias dos fragmentos da prévia, com dados fictícios. Não são telas de produção nem prova de persistência, e não incluem a pressão fixável/sugestões posteriores. Servem para composição; não copiar seu motor demonstrativo para o aplicativo. Quando precisar renderizá-las, usar o mecanismo de prévia disponível no ambiente; não assumir que abrir o fragmento cru reproduz o host original.

## Acompanhamento e conclusão

**Único estado vigente:** tabela T01–T12 em [ESTADO.md](../ESTADO.md). Não criar outro checklist de progresso nesta pasta. M/R/A e seus registros permanecem históricos; seus “Concluída” não significam que as novas T estão aprovadas.

Ao terminar uma rodada, atualizar a linha T correspondente e acrescentar: comportamento entregue, arquivos, decisões de contrato, comandos/resultados, evidências visuais quando aplicáveis, limitações e próxima etapa elegível. Estados: Planejada, Em andamento, Parcial, Verificada tecnicamente, Aguardando piloto, Concluída. Não alegar piloto sem observador e trecho reais; falta de piloto não impede relatar entregas técnicas parciais.

A especificação T prevalece sobre a ordem/instruções antigas onde houver conflito documental. Pedido posterior do usuário sempre prevalece. Em ambiguidade de produto, preservar a coleta mínima e registrar a decisão; não inventar obrigatoriedade.

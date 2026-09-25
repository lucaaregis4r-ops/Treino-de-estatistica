# R1 — Tela mínima e deslocamento da bola

> **Roteiro vigente para o Terra (22/09/2026):** [implementacao-terra](../../implementacao-terra/README.md). Este documento preserva a especificação anterior; sua ordem e seus prompts M/R/A foram substituídos pelas etapas T01–T12. Não executar os dois roteiros. Consulte o ESTADO vigente.

**Versão:** 0.5 proposta / reformulação M5. **Estado:** planejada. **Executar apenas quando solicitada.**

## Ler

` AGENTS.md`, [ESTADO](../../ESTADO.md), [direção da M5](../M5_REGISTRO_POR_POSSE.md), `src/ui/screens/scout/football/FootballScoutScreen.tsx`, `FootballActionPanel.css`, `src/ui/screens/scout/FootballCourtSurface.tsx`, integração em `src/ui/app/App.tsx` e contrato de observação existente.

## Fazer

- Criar composição de coleta própria, com cabeçalho, campo dominante e faixa de operação. Não espalhar condicionais para esconder pedaços do formulário antigo; separar a apresentação detalhada da composição mínima, preservando sua disponibilidade e dados.
- Remover do fluxo novo todos os formulários/listas definidos como secundários na M5. Não substituir painel lateral por cinco acordeões.
- Reutilizar campo e serviço de observação. Campo ativo no registro; tocar salva marco, com equipe conhecida ou controle desconhecido conforme o estado, sem inventar posse.
- Conectar uma única fonte de controle e posição; última posição de outra posse deve parecer antiga. Trilha curta não cruza parada, perda, lacuna ou período.
- Desfazer, foco/teclado e estado de salvamento funcionam desde esta rodada. Preparar região contextual estável para R2, sem simular chutes ou anunciar controles incompletos como prontos.
- Eliminar duplicação de cabeçalho com o workspace; não alterar o registro do vôlei.

## Aceite

Não há formulário detalhado, painel tático, histórico extenso ou coordenadas numéricas na coleta. Campo e comandos essenciais cabem em 1366×768 e 1024×768 sem rolagem vertical; móvel não tem overflow nem comandos sobre a bola. Um toque registra uma posição. Abrir/reabrir preserva último estado confirmado. Trilha curta tem posição/orientação corretas.

## Verificar e entregar

Testar integração de marcação/falha/desfazer e regressão da superfície compartilhada; typecheck e inspeção real nos viewports. Atualizar ESTADO, sem declarar experiência operacional validada e sem começar R2. Preservar alterações anteriores do checkout.

## Prompt

```text
Leia docs/versoes/v0.5-proposta/ESTADO.md,
docs/versoes/v0.5-proposta/etapas/M5_REGISTRO_POR_POSSE.md e
docs/versoes/v0.5-proposta/etapas/reformulacao-futebol/R1_TELA_MINIMA.md.
Execute somente R1, preservando o código e os dados existentes.
A tela nova deve substituir a composição detalhada no modo ao vivo.
Verifique o aceite visual, atualize ESTADO.md e pare antes de R2.
```

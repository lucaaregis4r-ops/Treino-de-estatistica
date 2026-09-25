# R2 — Trocas e finalizações rápidas

> **Roteiro vigente para o Terra (22/09/2026):** [implementacao-terra](../../implementacao-terra/README.md). Este documento preserva a especificação anterior; sua ordem e seus prompts M/R/A foram substituídos pelas etapas T01–T12. Não executar os dois roteiros. Consulte o ESTADO vigente.

**Versão:** 0.5 proposta / reformulação M5. **Dependência:** R1. **Estado:** planejada. **Executar apenas quando solicitada.**

## Ler

` AGENTS.md`, [ESTADO](../../ESTADO.md), [direção da M5](../M5_REGISTRO_POR_POSSE.md), composição de R1, entradas de registro/observação/correção em `src/application/ScoutTrainerService.ts`, `src/domain/football/FootballObservation.ts`, `FootballRecorder.ts`, `StatsBombContract.ts` e backup em `src/infrastructure/export/json/MatchJson.ts`.

## Fazer

- Botões das equipes registram a troca imediatamente; posição é opcional e pode vir depois. Um clique no mesmo controlador não cria nova posse, salvo reinício após parada. Não exigir “Salvar controle sem posição”.
- Disputa, parada, reinício e pausa da coleta possuem semânticas distintas, sem depender de formulário “depois da ação”. Encerrar/abrir posses pelo histórico, não por contador na UI.
- Finalizar arma a marcação da origem. O toque captura a ocorrência e apresenta resultados na mesma região contextual; escolher resultado salva, sem outra confirmação.
- Permitir resultado e posição desconhecidos quando não observados, sem perder o chute: revisar o contrato atual, que pode exigir origem/resultado. Fazer somente a extensão mínima necessária, com backup/validação compatíveis; não usar resultado falso para passar na validação.
- Resultado pode ficar pendente enquanto a captura continua. Detalhes vinculados por ID/tempo; outro chute tem ID próprio. Editar resultado antigo não muda o controle corrente. Tratar rebotes e bolas bloqueadas sem posse adversária presumida.
- Gol atualiza placar e parada uma vez; retificação/desfazer reverte coerentemente. Fora encerra segmento quando observado; defendida/trave/bloqueada não determinam quem controla depois.
- Gravações rápidas mantêm ordem, capturam horário na intenção e preservam falhas recuperáveis. Repetição de salvamento não duplica operações. Nunca esconder um registro perdido atrás de botão temporariamente desabilitado.

## Aceite e verificação

Troca em 1 clique; marco em 1 clique; chute em 3 interações principais (armar, origem, resultado), sem modal. Continuar uma posse adversária enquanto existe chute pendente; marcar rebote/segundo chute; revisar resultado anterior; desfazer e reabrir. Testes significativos de persistência, ordem, falha/retry, resultado desconhecido, placar e backup; typecheck e testes da UI. Estatísticas distinguem chute pendente de resultado conhecido.

Atualizar ESTADO com evidências e limitações; não implementar contexto tático ou análises novas.

## Prompt

```text
Leia docs/versoes/v0.5-proposta/ESTADO.md,
docs/versoes/v0.5-proposta/etapas/M5_REGISTRO_POR_POSSE.md e
docs/versoes/v0.5-proposta/etapas/reformulacao-futebol/R2_TROCAS_E_FINALIZACOES.md.
Execute somente R2 após R1. Implemente trocas e chutes na faixa única,
sem reintroduzir formulários nem inventar resultados/posições.
Valide persistência, rebote, pendências e desfazer; atualize ESTADO.md.
```

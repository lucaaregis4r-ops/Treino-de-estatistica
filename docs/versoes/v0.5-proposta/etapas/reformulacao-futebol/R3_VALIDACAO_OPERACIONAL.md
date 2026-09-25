# R3 — Verificação visual e operacional

> **Roteiro vigente para o Terra (22/09/2026):** [implementacao-terra](../../implementacao-terra/README.md). Este documento preserva a especificação anterior; sua ordem e seus prompts M/R/A foram substituídos pelas etapas T01–T12. Não executar os dois roteiros. Consulte o ESTADO vigente.

**Versão:** 0.5 proposta / reformulação M5. **Dependências:** R1/R2/R4 completa, incluindo [A1–A4](../../registro-assistido/README.md). **Estado:** planejada. **Executar apenas quando solicitada.**

## Ler

` AGENTS.md`, [ESTADO](../../ESTADO.md), [direção M5](../M5_REGISTRO_POR_POSSE.md), [piloto M6](../M6_PILOTO_OPERACIONAL.md), testes atuais da tela e `e2e/m5-possession-recording.spec.ts`.

## Fazer

- Verificar R4: ignorar Detalhes mantém fluxo básico idêntico; abrir qualquer categoria não bloqueia campo, troca ou chute, não abre modal e não herda resposta para outro ponto/posse.

- Integrar o aceite A4: pressão fixada somente por escolha, altura distinta de intensidade/forma, sugestões voluntárias sem ação inferida e retorno da revisão preservando o estado ao vivo. Validar em conjunto, sem repetir todos os testes já aprovados sem motivo.

- Atualizar testes antigos que exigiam o formulário detalhado para perda/chute; esses testes descrevem o fluxo rejeitado. Preservar testes úteis de dados, falha e recarga.
- Exercitar em uma sequência contínua: escolher equipe → marcar três pontos → trocar equipe → chute → adiar resultado → marcar nova posse → voltar ao chute pendente → corrigir/desfazer.
- Inspecionar tela inicial, chute, disputa, parada, falha e retomada em 1366×768, 1024×768 e móvel. Nenhum modal obrigatório, campo encoberto, painel lateral permanente ou rolagem desktop para comando principal.
- Medir interações reais: marco 1; troca 1; chute completo 3. Detalhes opcionais não entram como passos obrigatórios. Layout não muda a posição do campo durante o gesto.
- Conferir que o vôlei e o modo detalhado continuam acessíveis e com dados íntegros; não transformar esta rodada em outro redesign.
- Apresentar a composição ao usuário e usar M6 para medir esforço ao acompanhar trecho em velocidade normal. O relato do usuário é evidência de usabilidade; testes automatizados não anulam o relato.

## Critério de conclusão

Separar: software verificado / proposta visual aceita / piloto humano executado. Ausência de overflow comprova apenas layout, não facilidade de uso. Se usuário ainda considera tumultuado, reduzir composição e exigências; não acrescentar tutorial, tooltip e mais painéis como solução principal.

Rodar typecheck, testes direcionados, build e inspeção visual. Registrar screenshots/medidas e pendências em ESTADO e no relatório M6. Não declarar piloto realizado sem operador/trecho real. M7/M8 continuam adiadas até a coleta atender ao objetivo.

## Prompt

```text
Leia docs/versoes/v0.5-proposta/ESTADO.md e
 docs/versoes/v0.5-proposta/etapas/reformulacao-futebol/R3_VALIDACAO_OPERACIONAL.md.
Execute somente R3 após R1/R2/R4. Verifique layout e sequência real de operações,
sem tratar testes automatizados como aprovação humana. Atualize ESTADO.md
com evidências, limites e o que falta para o piloto M6.
```

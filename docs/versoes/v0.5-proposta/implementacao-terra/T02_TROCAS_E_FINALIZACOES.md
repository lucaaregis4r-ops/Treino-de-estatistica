# T02 — Trocas, paradas e finalizações rápidas

**Versão:** 0.5 proposta. **Dependência:** T01. **Resultado:** ciclo completo sem formulário obrigatório.

## Entradas de código

Composição de T01; `src/application/ScoutTrainerService.ts`; `src/domain/football/FootballObservation.ts`, `FootballPossessionService.ts`, `FootballRecorder.ts`, `StatsBombContract.ts`; `src/infrastructure/export/json/MatchJson.ts`.

## Implementar

- Clicar na equipe adversária registra troca imediatamente, com posição opcional. Clicar na mesma equipe não cria outra posse, exceto reinício após parada. Primeiro controle observado não é roubada.
- Disputa interrompe controle conhecido; A → disputa → A não é recuperação adversária. Parada encerra segmento; reinício abre outro. Pausa da coleta registra lacuna sem pausar relógio corrido; retomar exige controle observado.
- Finalizar → marcar origem → escolher Gol/Defendida/Fora/Bloqueada/Trave na faixa. Resultado salva sem botão Confirmar. Escape cancela só intenção não salva.
- Oferecer saída explícita “Origem não observada” quando não der para apontar e “Depois” para resultado pendente. Persistir desconhecidos honestamente, adaptando apenas o mínimo do contrato/backup. Não preencher coordenadas/resultado fictícios.
- Chutes têm IDs/instantes próprios; dois chutes e rebote podem pertencer à mesma posse. Detalhes posteriores editam o chute correspondente; não alteram controle corrente por retrospectiva.
- Gol atualiza placar e desfecho histórico uma vez; desfazer/retificar reprojeta corretamente. Resultado conhecido na hora pode registrar parada; completar resultado de chute antigo não deve parar a coleta atual. Defesa/trave/bloqueio não concedem posse ao adversário automaticamente.
- Sem bloqueio da captura por resultado pendente. Fila de gravação preserva ordem e horário de intenção, retry idempotente e falha visível/recuperável. Não perder cliques por salvamento concorrente.

## Aceite e testes

Marco 1 toque, troca 1 toque, chute usual 3 interações. Exercitar partida sem elenco, disputa, parada/reinício, chute pendente enquanto outra posse ocorre, origem desconhecida, dois chutes, gol corrigido e desfazer. Testes de UI, ordem/falha/retry, backup/recarga, placar e resultado antigo. Typecheck. Estatística existente não deve contar pendente como fora ou gol.

## Limites e passagem

Sem contexto tático ou painel novo. Atualizar T02 e parar antes de T03, salvo escopo maior autorizado.

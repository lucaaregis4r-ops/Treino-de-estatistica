# Ajustes de registro — 14/09/2026

Escopo solicitado: somente registro e visibilidade operacional. Não é uma etapa nova do redesenho nem uma limpeza global das pendências U7.

## Como usar

- No Gestual, os botões mostram número maior e nome da atleta. Rede/fundo seguem a rotação atual, com líbero separado. Nomes longos têm até duas linhas e título completo no hover; o nome acessível continua completo.
- A ação atual e sua equipe aparecem em destaque acima da captura.
- Para reduzir uma confirmação por ação, ative **Registrar ao soltar**. Selecione atleta e qualidade antes de arrastar; ao soltar uma trajetória válida, o contato é gravado e a próxima ação é preparada. O padrão continua sendo confirmação manual. Toque acidental/cancelado não gera contato.
- **Bola de graça** escolhe a ação que está sendo enviada, preservando uma trajetória já desenhada. O botão pode ser desmarcado. Após gravar a bola de graça, o Gestual prepara **Defesa da equipe adversária**. Só selecionar o botão não grava uma trajetória inexistente nem altera um ataque anterior.
- Use **Ajustar rotação, saque e placar** no topo. Escolher a atleta de P1 gira toda a equipe mantendo a ordem dos seis slots; não faz substituição. O sacador é a atleta em P1 da equipe sacadora escolhida. Informe o placar e aplique de uma vez, inclusive por Enter.
- **Retomar pelo saque** é uma escolha explícita: encerra a sequência incompleta sem atribuir ponto. Sem marcar, a sequência é preservada. O ajuste é permitido no set em andamento; sets encerrados continuam com o fluxo de próximo set.
- Aplicar limpa o rascunho gestual; os demais modos mantêm seus rascunhos. Cancelar/Escape não aplica alterações. Em erro, escolhas e rascunho são mantidos para nova tentativa; o botão Registrar continua disponível após falha do modo rápido.

## Implementação e limites

`ScoutScreen` coordena o envio manual/ao soltar pelo mesmo handler e trava de confirmação. A ausência explícita de atleta não volta a ser preenchida pela sugestão. O reinício do draft usa o contexto atualizado após gravação/ajuste, sem deixar o sacador antigo selecionado. Teclas de qualidade só atuam quando essa escolha está disponível na ação.

`GestureExpectedActionResolver` apresenta `free_ball_sent` como defesa no fluxo gestual. O resolvedor canônico dos outros modos permanece inalterado. A bola de graça é um novo contato `free_ball` com coordenadas no pipeline visual existente, não uma correção retrospectiva de ataque.

`QuickMatchAdjustment` chama `ScoutTrainerService.adjustMatchContext`. O serviço valida tudo antes da escrita e usa `appendMany` para os eventos existentes `set_lineup_confirmed`, `score_adjustment`, `serving_team_changed` e, somente se solicitado, `rally_ended`. Sem schema novo, migração, troca de atletas, alteração de regras de pontuação ou dependência adicional. Contatos anteriores e seus dados são preservados; as correções de contexto são prospectivas. O alcance histórico de Desfazer não foi transformado em desfazer agrupado de contexto: para rever o conjunto, reabra o ajuste.

As ações rápidas secundárias preexistentes continuam fora desta correção; não se promete evento próprio para todos esses botões. As pendências antigas de lint/AppFlow e Resumo/Análise não foram tratadas aqui. O modo ao soltar reduz interações, mas sua equivalência de velocidade à digitação **não foi medida com operador em partida real**.

## Verificação

- Cenários dirigidos de resolver, seletor, Gestual, quadra e persistência do ajuste.
- E2E `registro-rapido.spec.ts`: sequência saque → bola de graça → defesa, coordenadas no JSON, ausência explícita, correção de rotação/saque/placar, reabertura, falha real de transação IndexedDB, tentativa seguinte e retorno de foco.
- E2E existentes: confirmação manual com líbero/análise/PDF, Visual/Híbrido e cancelamento de toque aprovados (3 cenários).
- Captura operacional em 1366×640 com confirmação visível; verificação de overflow em 1024, 768 e 390 px. Isso não mede desempenho humano nem substitui teste físico no ginásio.
- Evidências sintéticas em `output/registro-rapido/`; resultado dos comandos finais em `docs/scout-trainer-interface-0.4/ESTADO.md`. Nenhuma base real do usuário foi usada para abortar transações.

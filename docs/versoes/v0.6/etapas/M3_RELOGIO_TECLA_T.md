# M3 — relógio de futsal e tecla T

**Objetivo:** controlar tempo efetivo de futsal com T e botão visível. **Depende de:** M2. **Próxima:** M4.

**Estado desta rodada:** relógio persistido e interface implementados. Typecheck e verificação do diff aprovados; validação interativa e testes específicos ainda pendentes.

## Contrato de operação

- Padrão: dois períodos de 20:00 regressivos; duração diferente somente se configurada e permitida pela competição. Guardar milissegundos decorridos e histórico de transições/ajustes, com horário de parede para auditoria.
- **T** alterna iniciar/pausar apenas na tela de registro ao vivo da partida de futsal aberta. O botão mostra o mesmo estado e `aria-keyshortcuts="T"`. Ignorar `repeat`, Ctrl/Alt/Meta, composição IME, foco em input/select/textarea/contenteditable, diálogo, revisão e atalhos de outras modalidades. Um pressionamento salva uma transição.
- Parada de bola, tempo técnico e **Pausar coleta** não operam o relógio por conta própria. O operador acompanha o cronometrista da partida. Exibir claramente rodando/parado e o horário do último comando.
- Persistência serializada: durante requisição, impedir duplo T e mostrar salvando; em falha, manter estado anterior e oferecer nova tentativa. O tempo de evento é capturado no início do gesto, sem avançar enquanto relógio está parado.
- Em 00:00, persistir fim do período e bloquear reinício normal. Permitir ajuste auditável e exceção de cobrança final prevista na regra, sem tempo negativo. Avanço 1º→2º exige relógio parado, confirmação e nova duração. Nunca alternar 2º→1º ciclicamente.
- Ao reabrir após fechamento inesperado enquanto estava rodando, pedir decisão explícita de retomar/ajustar; não somar toda a ausência do aplicativo. No 2º período, minuto acumulado começa em 20 (ou duração configurada), e cada evento mantém seu tempo original após ajuste posterior.

## Feito nesta rodada

- Criado `futsal_clock_changed` separado do evento de relógio de futebol, com comando, período, decorrido, duração, estado, timestamp de referência e motivo auditável.
- `FutsalClock` projeta o evento mais recente por sequência, limita o tempo ao fim do período e calcula o tempo acumulado do jogo. Partidas novas recebem dois períodos de 20 minutos no ruleset FIFA 2025–26.
- `ScoutTrainerService` valida início, pausa, ajuste, cobrança final, encerramento, avanço e reconciliação. A primeira leitura em cada instância do serviço congela estados persistidos como running para reconciliação.
- A tela ao vivo atualiza a contagem, conclui o período em 00:00, aceita T com as proteções definidas e oferece as transições de fim/reabertura e ajuste justificável. O 2º período só começa com confirmação.
- O importador/exportador reconhece o novo evento e o valida apenas em partidas de futsal.

## Entradas e aceite

Entradas: `FootballRecorder.ts`, `ScoutTrainerService.ts`, `MatchEvent.ts`, nova tela de futsal, repositório de eventos e backup. Separar regra temporal do futebol: não alterar os `+45` usados por suas partidas.

**Verificado:** `npm run typecheck`, `git diff --check` e revisão estática do relógio de domínio, recuperação no serviço, tela e contrato JSON.

**Pendente:** validação interativa de T uma vez/duas vezes, repeat e foco; erro de persistência e concorrência; 19:59→00:00, virada, exceção final, ajuste e reload interrompido; regressão de futebol/vôlei, E2E, lint e inspeção visual. Não foram executados testes nesta rodada.

## Prompt para o Luna

```text
Leia o plano 0.6, a referência e este M3. Implemente somente o relógio
do futsal e o atalho T conforme o contrato acima. Não altere o relógio
do futebol de campo. Teste persistência, concorrência, recuperação e
limites do período. Relate arquivos, verificações e pendências; não
inicie M4.
```

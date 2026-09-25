# T06 — Sugerir trechos para completar

**Versão:** 0.5 proposta. **Dependência:** T03/T05. **Resultado:** candidatos explicáveis, sem ação inventada. Revisão/resposta completa é T07.

## Entradas de código

Contratos T03; `src/domain/football/FootballObservation.ts`, `FootballPossessionService.ts`, `FootballOrientation.ts`; serviço e composição mínima. Criar função local pura para seleção, reutilizando geometria existente.

## Regras iniciais

| Motivo visível | Critério proposto |
|---|---|
| Antes do chute | Até três marcos elegíveis nos 10 segundos anteriores + origem do chute, na mesma posse/controle; resultado pode estar pendente |
| Avanço para o terço ofensivo | Par elegível em até 8 segundos, avanço longitudinal ≥20% do comprimento, chegando ao terço ofensivo ou área |
| Deslocamento para a área | Entrada na área com distância entre marcas ≥20% do comprimento, incluindo movimento lateral; requer dimensões calibradas |

3/10s/8s/20% são hipóteses configuradas internamente para o piloto. Não expor painel de limiares ao scouter. Ausência de dimensões desabilita apenas o critério de distância; ausência de orientação desabilita avanço direcional. Chute sem marco anterior não fabrica deslocamento: continua revisável como chute.

Pontos devem pertencer à mesma posse/controle/período, sem disputa, parada, pausa ou desconhecido entre fontes. Segmento reto não prova trajetória percorrida. Não rotular como passe perigoso, assistência, quebra de linha ou chance confirmada.

## Apresentação e persistência

- **Sugerir trechos para completar**, desligado por padrão e independente de Registrar pressão. Somente após captura salva, executar sugestão sem bloquear próxima entrada.
- No campo, no máximo um destaque discreto da posse atual, com traço pontilhado/marcador. Sem modal, som, pulsação, formulário ou pergunta automática.
- Um acesso discreto à revisão pode indicar quantidade, sem cobrança de pendências. Enquanto T07 não existir, não publicar um botão morto; manter geração/destaque atrás de feature gate interno ou integrar um destino existente funcional. Explicar esse limite no ESTADO.
- Retirar destaque ao sair da posse, manter candidato para revisão. Resultado de chute sempre tem prioridade. Não mostrar trajetória antiga sobre a coleta atual.
- Fundir candidatos sobrepostos da mesma sequência e guardar todos os motivos/IDs de chute; prioridade antes de chute. Dois chutes continuam eventos distintos mesmo se compartilharem trecho.
- Deduplicação estável, estado ignorado preservado, invalidação por alteração da fonte, sem reabrir convite pela simples recarga. Desligar sugestões preserva respostas.

## Aceite e testes

Fixtures determinísticas: avanço, recuo longo, inversão lateral longe da área, entrada na área, chute pendente/rebote, dois chutes, ausência de posição, lacunas e inversão de lados. Testar prioridade/deduplicação/invalidação. Candidato nunca aparece como passe em estatística/StatsBomb. Inspecionar destaque e typecheck. Atualizar T06; próxima T07. Nenhuma API/modelo de IA é necessário.

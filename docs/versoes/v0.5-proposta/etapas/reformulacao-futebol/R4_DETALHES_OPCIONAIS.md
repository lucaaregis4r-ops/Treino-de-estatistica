# R4 — Detalhes opcionais sem mudar o fluxo principal

> **Roteiro vigente para o Terra (22/09/2026):** [implementacao-terra](../../implementacao-terra/README.md). Este documento preserva a especificação anterior; sua ordem e seus prompts M/R/A foram substituídos pelas etapas T01–T12. Não executar os dois roteiros. Consulte o ESTADO vigente.

**Versão:** 0.5 proposta / reformulação M5. **Dependências:** R1/R2. **Estado:** plano e prévia; implementação não autorizada nesta rodada. **Ordem:** R1 → R2 → R4 → R3.

## Direção aprovada pelo usuário

O usuário aprovou a composição minimalista e pediu acrescentar pressão, saída, tipo de roubada e portador, todos opcionais. Preservar a tela aprovada. A autorização é para atualizar plano/prévia; não implementar silenciosamente no aplicativo.

**Atualização de 22/09/2026:** a [pasta registro-assistido](../../registro-assistido/README.md) amplia esta rodada em A1 → A2 → A3 → A4. O usuário pediu botões de pressão fixos quando optar por registrá-la e destaque de trechos para enriquecimento voluntário. Esta ampliação prevalece sobre a regra anterior de que todos os detalhes sempre fecham: a pressão fixada permanece visível. O acesso eventual continua salvando e fechando. A1–A4 incluem os itens originais desta R4; não implementar R4 duas vezes.

## Composição

Um botão discreto **Detalhes** na região contextual já existente. Abre quatro opções: Pressão, Saída, Roubada e Jogador. Escolher uma exibe somente as opções daquela categoria na mesma faixa. Selecionar salva e fecha, sem confirmação adicional. Fechar/Escape abandona a seleção sem fabricar observação.

Nenhum painel abre automaticamente ao trocar posse, marcar ponto ou finalizar. Nenhum campo é obrigatório; o operador pode ignorar Detalhes durante a partida inteira. Campo e comandos principais continuam ativos. Tocar no campo, trocar equipe ou iniciar chute fecha o detalhe e executa a ação principal, sem transferir respostas para outro lance.

Resultado de chute tem prioridade na faixa. Detalhes opcionais não podem ocultar/apagar chute pendente. Não adicionar quatro controles permanentes, novos modais, gavetas ou cartões laterais. A única linha adicional autorizada é a pressão fixada explicitamente pelo scouter, conforme A2; sugestões seguem A3, sem perguntas automáticas.

## Conteúdo e vínculo

| Categoria | Escolhas rápidas | Vínculo obrigatório |
|---|---|---|
| Pressão | Livre, Individual, Coletiva, Não observada | Equipe com bola e instante observado dentro da posse; a outra equipe pressiona |
| Saída | Curta, Direta, Mista, Transição, Não observada | Contexto observado da posse/trecho de construção, com horário da anotação |
| Estrutura, dentro de Saída | 2+2, 3+1, 3+2, Outra, Não observada | Campo opcional separado do tipo de saída; nunca perguntar obrigatoriamente após Curta |
| Roubada | Desarme, Interceptação, Bola solta, Erro adversário, Não observado | ID da troca/recuperação observada, equipe anterior/nova e instante original |
| Jogador | Camisas do elenco da equipe daquele ponto; Não identificado | ID do ponto observado e ID do atleta, sem herança para pontos posteriores |

A2 acrescenta **altura** (Alta/Média/Baixa), distinta da **forma** Individual/Coletiva desta tabela. Ausência e desconhecido permanecem distintos. Nenhuma conversão automática dos valores existentes. A3 permite confirmar ações de um trecho em revisão explícita, sem deduzi-las dos pontos.

“Roubada” é o nome curto do acesso; o dado descreve como o controle foi recuperado. Bola solta não deve contar como desarme. Não afirmar que pressão causou a recuperação apenas por proximidade. Atribuir erro adversário não inventa seu autor.

## Regras para não distorcer os dados

- A pressão é snapshot naquele instante, não classificação automática de toda a posse e não episódio permanente. Anotação anterior não preenche pressão dos marcos futuros. Livre e não observada são distintos. Episódios com duração ficam fora deste incremento.
- Saída e estrutura são independentes. Transição sinaliza que não se está descrevendo uma saída organizada desde trás; não herdar estrutura para ela ou para outra posse. Revisão pode corrigir o contexto sem reescrever eventos não relacionados.
- Roubada só habilita quando existe uma troca elegível, inclusive A → disputa → B. A → disputa → A não gera roubada; primeira equipe escolhida e reinício após parada não são roubadas. Qualificação pode ocorrer alguns marcos depois, ligada ao mesmo ID. Troca nova não deve receber qualificação da anterior por acidente.
- Última posição anterior não vira local da roubada. Jogador do último ponto não vira autor da recuperação nem culpado da perda.
- Jogador habilita somente para ponto elegível da equipe observada. Mostrar “Jogador deste ponto” e equipe. Selecionar camisa identifica esse ponto; no próximo, o portador volta a não identificado até nova escolha. O observador pode nunca preencher esse campo.
- A prévia usa seis camisas fictícias por equipe. A implementação usa o elenco real, IDs estáveis, nomes acessíveis e alvos de toque; não limitar o elenco real a seis nem cadastrar fictícios. Sem elenco, manter opção desconhecida e não bloquear a coleta.
- Abrir o detalhe fixa o ID/instante-alvo. Mudança de posse/pausa/período encerra a edição contextual; não aplicar a resposta antiga ao novo controle. Editar evento antigo pertence à revisão explícita.
- Correção, remoção e desfazer têm semântica auditável; ausência permanece desconhecida. Anotação não cria passe, toque, posse adicional nem dupla recuperação.

## Aceite e verificação

Operar a partida sem abrir Detalhes; conferir que o caminho básico mantém as mesmas interações. Marcar pressão e seguir sem reaplicá-la; escolher saída e estrutura separadamente; marcar jogador e verificar que não permanece no próximo ponto; qualificar recuperação após marcar novo ponto; trocar posse com opção aberta; desfazer só a anotação; salvar/reabrir/backup sem perder vínculo; não misturar recuperação com início/reinício.

Verificar desktop e móvel com cada categoria aberta: nenhum campo coberto, nenhuma opção cortada, nenhuma mudança da posição do campo durante clique, resultado de chute prioritário. Testes direcionados de domínio, persistência e UI; typecheck. Isso não substitui o piloto operacional.

## Prompt para o Luna

```text
Leia docs/versoes/v0.5-proposta/ESTADO.md,
docs/versoes/v0.5-proposta/etapas/M5_REGISTRO_POR_POSSE.md e
docs/versoes/v0.5-proposta/etapas/reformulacao-futebol/R4_DETALHES_OPCIONAIS.md.
Leia também docs/versoes/v0.5-proposta/registro-assistido/README.md.
A R4 foi dividida em A1–A4; execute somente o recorte solicitado após suas
dependências. Se o pedido for iniciar R4, execute somente A1. Preserve a
composição mínima e o acesso Detalhes; fixar pressão é opção explícita.
Atualize ESTADO.md e pare antes do próximo recorte. R3 vem após A4.
```
